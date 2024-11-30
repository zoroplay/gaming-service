/* eslint-disable prettier/prettier */
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as crypto from 'crypto';
import * as Excel from 'exceljs';

import {
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Import your SettingService
import {
  CallbackLog,
  Game as GameEntity,
  GameSession,
  Provider as ProviderEntity,
} from '../entities';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { WalletService } from '../wallet/wallet.service';
import { BetService } from '../bet/bet.service';
import {
  CreditCasinoBetRequest,
  PlaceCasinoBetRequest,
  RollbackCasinoBetRequest,
} from 'src/proto/betting.pb';
import { CallbackGameDto } from 'src/proto/gaming.pb';
import { IdentityService } from 'src/identity/identity.service';
import { firstValueFrom } from 'rxjs';

const getCellValue = (row:  Excel.Row, cellIndex: number) => {
  const cell = row.getCell(cellIndex);

  return cell.value ? cell.value.toString() : '';
};


@Injectable()
export class SmartSoftService {
  private baseUrl: string;
  private secretKey: string;

  constructor(
    @InjectRepository(GameEntity)
    private gameRepository: Repository<GameEntity>,
    @InjectRepository(CallbackLog)
    private callbackLogRepository: Repository<CallbackLog>,
    @InjectRepository(ProviderEntity)
    private providerRepo: Repository<ProviderEntity>,
    @InjectRepository(GameSession)
    private gameSessionRepo: Repository<GameSession>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly walletService: WalletService,
    private readonly betService: BetService,
    private readonly identityService: IdentityService,
  ) {
    this.baseUrl = this.configService.get<string>('SMART_SOFT_BASE_URL');
    this.secretKey = this.configService.get<string>('SMART_SOFT_SECRET_KEY');

    // this.portal = this.configService.get<string>('SMART_SOFT_PORTAL');
  }

  // start game here
  async constructGameUrl(data, game: GameEntity, portalName) {
    try {

      let gameCategory = game.type;
      let balanceType = data.balanceType;

      if (data.isMobile) {
        if (game.type === 'GamesLobby') {
          gameCategory = 'GamesMobile';
        } else {
          gameCategory = `${game.type}Mobile`;
        }
      }

      const gameName = game.gameId;
      const token = balanceType === 'demo' ? 'DEMO' : data.authCode;
      const portal = balanceType === 'demo' ? 'demo' : portalName;
      const returnUrl = data.homeUrl;
      const GameCategory = data.isMobile ? game.game_category_m : game.game_category_w;

      const sessionUrl = `${this.baseUrl}GameCategory=${GameCategory}&GameName=${gameName}&Token=${token}&PortalName=${portal}&ReturnUrl=${returnUrl}`;
      
      const gameSession = new GameSession();
      gameSession.balance_type = balanceType;
      gameSession.game_id = game.gameId;
      gameSession.token = token;
      gameSession.provider = 'smart-soft';
      if (data.bonusId)
        gameSession.bonus_id = data.bonusId;

      await this.gameSessionRepo.save(gameSession);

      return {
        url: sessionUrl,
      };
    } catch (e) {
      console.error(`Error generating game link: ${e.message}`);
    }
  }

  // callback handler
  async handleCallback(data: CallbackGameDto, portal: string) {
    // save callback
    try {
      const callback = await this.saveCallbackLog(data);

      const body = data.body ? JSON.parse(data.body) : '';
      const hashStr = data.body ? data.body : '';

      const hash =  this.generateMd5(data.method, hashStr);

      if (data.header['x-signature'] !== hash) {
        const response = {
          success: false,
          message: 'Invalid Hash Signature',
          status: HttpStatus.BAD_REQUEST
        }

        // update callback log response
        await this.callbackLogRepository.update({
          id: callback.id,
        },{
          response: JSON.stringify(response)
        });

        return response;
      }

      let game = null;
      let player = null;
      let balanceType = 'main';
      let sessionId = data.header['x-sessionid'];
      let gameSession;

      if (sessionId) {
        const res = await this.identityService.validateXpressSession({clientId: data.clientId, sessionId});

        // console.log(res)
        if (!res.success) {
          const response =  {
            success: false,
            message: 'Invalid Session ID',
            status: HttpStatus.NOT_FOUND
          };

          // update callback log response
          await this.updateCallbackGameSession(callback, response, {session_id: sessionId}, {callback_id: callback.id})

          return response;
        }
        // get game session
        gameSession = await this.gameSessionRepo.findOne({where: {session_id: sessionId}})
        
        if (gameSession.balance_type === 'bonus')
          balanceType = 'casino';

        player = res.data;

        if (body['TransactionInfo'])
          game = await this.gameRepository.findOne({
            where: {
              title: body['TransactionInfo']['GameName'],
            },
            relations: {provider: true}
          });
      }

      switch (data.action) {
        case 'ActivateSession':
          console.log('SMARTSOFT: Activate Session', data, body.Token);
          return await this.activateSession(data.clientId, body.Token, callback, portal);
        case 'GetBalance':
          console.log('GetBalance');
          return await this.getBalance(player, callback, balanceType, sessionId);
        case 'Deposit':
          console.log('Deposit');
          const gameName = body.TransactionInfo.GameName;
          
          const walletRes = await this.walletService.getWallet({
            userId: player.id,
            clientId: player.clientId,
          });

          if(walletRes.data.availableBalance < body.Amount) {
            const response = {
              success: false, 
              message: 'Insufficent balance', 
              status: HttpStatus.INTERNAL_SERVER_ERROR
            }
            // update callback log response and game session with callback id
            await this.updateCallbackGameSession(callback, response, {session_id: sessionId}, {callback_id: callback.id})

            return response;
          }

          // console.log(player)

          const placeBetPayload: PlaceCasinoBetRequest = {
            userId: player.id,
            clientId: player.clientId,
            roundId: body.TransactionInfo.RoundId,
            transactionId: body.TransactionId,
            gameId: body.TransactionInfo.GameNumber,
            stake: body.Amount,
            gameName: body.TransactionInfo.GameName,
            gameNumber: body.TransactionInfo.GameNumber,
            source: 'smart-soft',
            cashierTransactionId: body.TransactionInfo.CashierTransacitonId,
            winnings: 0,
            username: player.username,
            bonusId: gameSession.bonus_id || null
          };

          const place_bet = await this.placeBet(placeBetPayload);
          
          if (!place_bet.success) {
            const response = {
              success: false,
              status: HttpStatus.INTERNAL_SERVER_ERROR,
              message: place_bet.message,
            };
            // update callback log response and game session with callback id
            await this.updateCallbackGameSession(callback, response, {session_id: sessionId}, {callback_id: callback.id})

            return response;
          }

          const debit = await this.walletService.debit({
            userId: player.id,
            clientId: player.clientId,
            amount: body.Amount.toFixed(2),
            source: 'smart-soft',
            description: `Casino Bet: (${gameName}:${body.TransactionInfo.GameNumber})`,
            username: player.username,
            wallet: balanceType,
            subject: 'Bet Deposit (Casino)',
            channel: gameName,
          });

          if (!debit.success) {
            const response = {
              success: false,
              status: HttpStatus.INTERNAL_SERVER_ERROR,
              message: 'Incomplete request',
            };
            // update callback log response and game session with callback id
            await this.updateCallbackGameSession(callback, response, {session_id: sessionId}, {callback_id: callback.id})

            return response;
          }
          
          const response = {
            success: true,
            status: HttpStatus.OK,
            message: 'Deposit, successful',
            data: {
              Balance: parseFloat(debit.data.balance.toFixed(2)),
              TransactionId: place_bet.data.transactionId,
            },
          };
          // update callback log response
          await this.updateCallbackGameSession(callback, response, {session_id: sessionId}, {callback_id: callback.id}, true)

          return response;
        case 'Withdraw':
          const transactionType = body.TransactionType;
          const amount = body.Amount;
          const betId = body.TransactionInfo.BetTransactionId;
          const roundId = body.TransactionInfo.RoundId;

          // check if transaction ID exist and return user balance
          if (callback.transactionId === body.TransactionId && callback.status === true) {
            console.log('transaction completed')
            const creditRes = await this.walletService.getWallet({
              userId: player.id,
              clientId: player.clientId,
            });

            return {
              success: true,
              status: HttpStatus.OK,
              message: 'Withdraw, successful',
              data: {
                Balance: creditRes.data.availableBalance,
                TransactionId: callback.id,
              },
            };

          }

          let creditRes = null;

          if (transactionType === 'WinAmount') {
            
            const settlePayload: CreditCasinoBetRequest = {
              transactionId: betId,
              winnings: amount,
            };

            // console.log('prociessing settlement')
    
            // settle won bet
            const settle_bet = await this.settle(settlePayload);
            // console.log(settle_bet, 'settlebet response')
            if (!settle_bet.success)  {
              const response = {success: false, message: settle_bet.message, status: HttpStatus.INTERNAL_SERVER_ERROR}
              // update callback log response
              await this.updateCallbackGameSession(callback, response, {session_id: sessionId}, {callback_id: callback.id})
    
              return response;
            }

            creditRes = await this.walletService.credit({
              userId: player.id,
              clientId: player.clientId,
              amount: body.Amount.toFixed(2),
              source: body.TransactionInfo.Source,
              description: `Casino Bet: (${body.TransactionInfo.GameName}:${body.TransactionInfo.GameNumber})`,
              username: player.username,
              wallet: balanceType,
              subject: 'Bet Win (Casino)',
              channel: body.TransactionInfo.Source,
            });

            const response = {
              success: true,
              status: HttpStatus.OK,
              message: 'Withdraw, successful',
              data: {
                Balance: parseFloat(creditRes.data.balance.toFixed(2)),
                TransactionId: callback.id,
              },
            };
            // update callback log response
            await this.updateCallbackGameSession(callback, response, {session_id: sessionId}, {callback_id: callback.id}, true)

            return response;
          } else { // handle CloseRound transactionType

            const payload: CreditCasinoBetRequest = {
              transactionId: roundId,
              winnings: amount,
            };
    
            // settle won bet
            const settle_bet = await this.betService.closeRound(payload);
          
            if (!settle_bet.success)  {

              const response = {
                success: false, 
                message: settle_bet.message, 
                status: HttpStatus.INTERNAL_SERVER_ERROR
              }
              await this.updateCallbackGameSession(callback, response, {session_id: sessionId}, {callback_id: callback.id})
    
              return response;
            }
            
            // get player wallet
            creditRes = await this.walletService.getWallet({
              userId: player.id,
              clientId: player.clientId,
            });

            const response = {
              success: true,
              status: HttpStatus.OK,
              message: 'Withdraw, successful',
              data: {
                Balance: balanceType === 'casino' ? parseFloat(creditRes.data.casinoBonusBalance.toFixed(2)) : parseFloat(creditRes.data.availableBalance.toFixed(2)),
                TransactionId: callback.id,
              },
            };
            // update callback log response
            await this.updateCallbackGameSession(callback, response, {session_id: sessionId}, {callback_id: callback.id}, true)

            return response;
          }
        case 'RollbackTransaction':
          const reversePayload: RollbackCasinoBetRequest = {
            transactionId: body.TransactionId,
          };
          console.log('Processing Rollback')
          // get callback log
          const callbackLog = await this.callbackLogRepository.findOne({where: {transactionId: reversePayload.transactionId }})

          if (!callbackLog) {
            console.log('Callback log found')

            const response = {success: false, message: 'Transaction not found', status: HttpStatus.INTERNAL_SERVER_ERROR}
            await this.updateCallbackGameSession(callback, response, {session_id: sessionId}, {callback_id: callback.id})

            return response;
          }

          const transactionPayload = JSON.parse(callbackLog.payload);
          // console.log(transactionPayload)
          // const transactionResponse = JSON.parse(callbackLog.response);
          console.log('update ticket')
          const transaction = await this.rollbackTransaction(reversePayload);

          if (transaction.status === HttpStatus.CREATED) {
            const response = await this.getBalance(player, callback, balanceType, sessionId);
            
            if (response.success) {
              return {
                success: true,
                status: HttpStatus.OK,
                message: 'Rollback, successful',
                data: {
                  Balance: response.data.Amount,
                  TransactionId: callback.id,
                },
              }
            } else {
              return {
                success: false,
                message: 'Unable to complete request', 
                status: HttpStatus.INTERNAL_SERVER_ERROR
              }
            }
          }

          if (!transaction.success)  {
            console.log('ticket update not successful')
            const response = {
              success: false,
              message: 'Unable to complete request', 
              status: HttpStatus.INTERNAL_SERVER_ERROR}
            // update callback log response
            await this.updateCallbackGameSession(callback, response, {session_id: sessionId}, {callback_id: callback.id})


            return response;
          }

          // console.log('updated ticket, now implementing wallet transaction ', callbackLog.request_type)

          let rollbackWalletRes = null;

          if (callbackLog.request_type === 'Deposit') {
            rollbackWalletRes = await this.walletService.credit({
              userId: player.id,
              clientId: player.clientId,
              amount: body.Amount.toFixed(2),
              source: transactionPayload.TransactionInfo.Source,
              description: `Bet Cancelled: (${transactionPayload.TransactionInfo.GameName}:${body.TransactionInfo.GameNumber})`,
              username: player.username,
              wallet: balanceType,
              subject: 'Bet Rollback (Casino)',
              channel: body.TransactionInfo.GameName,
            });

            console.log('credit wallet respons', rollbackWalletRes)

            const response = {
              success: true,
              status: HttpStatus.OK,
              message: 'Rollback, successful',
              data: {
                Balance: parseFloat(rollbackWalletRes.data.balance.toFixed(2)),
                TransactionId: callback.id,
              },
            };
            // update callback log response
            await this.updateCallbackGameSession(callback, response, {session_id: sessionId}, {callback_id: callback.id}, true)

            return response;
          
          } else {
            rollbackWalletRes = await this.walletService.debit({
              userId: player.id,
              clientId: player.clientId,
              amount: body.Amount.toFixed(2),
              source: transactionPayload.TransactionInfo.Source,
              description: `Bet Cancelled: (${transactionPayload.TransactionInfo.GameName}:${body.TransactionInfo.GameNumber})`,
              username: player.username,
              wallet: balanceType,
              subject: 'Win Rollback (Casino)',
              channel: body.TransactionInfo.GameName,
            });
            console.log('debit wallet respons', rollbackWalletRes)
            
            const response = {
              success: true,
              status: HttpStatus.OK,
              message: 'Rollback, successful',
              data: {
                Balance: parseFloat(rollbackWalletRes.data.balance.toFixed(2)),
                TransactionId: callback.id,
              },
            };
          // update callback log response
            await this.updateCallbackGameSession(callback, response, {session_id: sessionId}, {callback_id: callback.id}, true)

            return response;
          }
        default:
          return {success: false, message: 'Invalid request', status: HttpStatus.BAD_REQUEST};
      }
    } catch (e) {
      console.log('smart soft error', e.message)
      return {success: false, message: 'Invalid request', status: HttpStatus.BAD_REQUEST};
    }
  }

  // support
  generateMd5(requestMethod: string, payload: string) {
    console.log('encryption start');

    // console.log(`${this.secretKey}|${requestMethod}|${payload}`);

    const md5Hash = crypto
      .createHash('md5')
      .update(
        `${this.secretKey}|${requestMethod}|${payload}`,
      )
      .digest('hex');

    // console.log('encryption hash');
    console.log(md5Hash);
    // console.log('encryption ends');
    return md5Hash;
  }

  // Webhook Section

  // Activate Player Session
  async activateSession(clientId, token, callback, portal) {
    const res = await this.identityService.xpressLogin({clientId, token});

    if (!res.status) {
      const response = {
        success: false,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Player not found'
      }

      // update callback log response and game session
      await this.updateCallbackGameSession(callback, response, {token}, {callback_id: callback.id})

      return response;
    }
   
    const response = {
      success: true,
      status: HttpStatus.OK,
      message: 'Activation Successful',
      data: {
        UserName: res.data.playerNickname,
        SessionId: res.data.sessionId,
        ClientExternalKey: res.data.playerId,
        PortalName: portal,
        CurrencyCode: res.data.currency,
      },
    };

    // update callback log response
    await this.updateCallbackGameSession(callback, response, {token}, {
      callback_id: callback.id,
      session_id: res.data.sessionId
    })


    return response;
  }

  // Get Player Balance
  async getBalance(player, callback, walletType, sessionId) {
    let response, status;

    if (player) {
      //TODO: USE PLAYER UserID AND ClientID to get balance from wallet service;
      const wallet = await this.walletService.getWallet({
        userId: player.id,
        clientId: player.clientId,
        wallet: walletType
      });

      if (wallet.success) {
        response = {
          success: true,
          status: HttpStatus.OK,
          message: 'Wallet',
          data: {
            Amount: walletType === 'casino' ? wallet.data.casinoBonusBalance.toFixed(2) : wallet.data.availableBalance.toFixed(2),
            CurrencyCode: 'NGN',
          },
        };
        status = true;
      } else {
        response = {
          success: false,
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Could not retrieve balance',
        };
      }
    } else {
      response = {
        success: false,
        status: HttpStatus.NOT_FOUND,
        message: 'Player not found',
      };
    }
    // update callback log response
    await this.updateCallbackGameSession(callback, response, {session_id: sessionId}, {callback_id: callback.id})

    return response;
  }

  // Place Bet
  async placeBet(data: PlaceCasinoBetRequest) {
    return firstValueFrom(this.betService.placeCasinoBet(data));
  }

  // Settle Bet
  async settle(data: CreditCasinoBetRequest) {
    return await firstValueFrom(this.betService.settleCasinoBet(data));
  }
  // Reverse Bet
  async rollbackTransaction(data: RollbackCasinoBetRequest) {
    return await firstValueFrom(this.betService.cancelCasinoBet(data));
  }

  // save callback request
  async saveCallbackLog(data) {
    const action = data.action;
    const body = data.body ? JSON.parse(data.body) : '';
    const transactionId = action === 'ActivateSession' ? body.Token : action === 'GetBalance' ? data.header['x-sessionid'] : action === 'RollbackTransaction' ? body.CurrentTransactionId : body.TransactionId;
    try{
      let callback = await this.callbackLogRepository.findOne({where: {transactionId}});
      
      if (callback) return callback;
      
      callback = new CallbackLog();
      callback.transactionId = transactionId;
      callback.request_type = action;
      callback.payload = JSON.stringify(body);


      return await this.callbackLogRepository.save(callback);

    } catch(e) {
      console.log('Error saving callback log', e.message)
    }
  }

  // @Timeout(10000)
  async loadGames() {
    try {
      console.log('fetching smart soft games')

      const workbook = new Excel.Workbook();
        const content = await workbook.xlsx.readFile(`smart-soft-games.xlsx`);

        const worksheet = content.worksheets[0];
        const rowStartIndex = 2;
        const numberOfRows = worksheet.rowCount - 1;

        const rows = worksheet.getRows(rowStartIndex, numberOfRows) ?? [];

        for (const row of rows) {
          const type = getCellValue(row, 1);
          const title = getCellValue(row, 2);
          const description = getCellValue(row, 5);
          const gameId = getCellValue(row, 6);
          if (type) {
            const provider = await this.providerRepo.findOne({where: {slug: 'smart-soft'}});
            if (provider) {
              // check if game exists
              let game = await this.gameRepository.findOne({where: {gameId}})
              if (!game) {
                game = new GameEntity();
                game.gameId = gameId;
                game.title = title;
                game.type = type;
                game.description = description;
                game.provider = provider;

                await this.gameRepository.save(game)
              }
            }
          }
        }

    } catch (e) {
      console.log("Error saving games", e.message)

    }
  }

  async updateCallbackGameSession(callback, response, where, data, status = false) {
    // update callback log response and game session with callback id
    await Promise.all([
      this.callbackLogRepository.update({
      id: callback.id,
      },{
        response: JSON.stringify(response),
        status
      }),
      await this.gameSessionRepo.update(where, data)
    ]);
  }

  // @Timeout(15000)
  // async updateWinnings() {
  //   console.log('fetching callbacks')
  //   // fetch callback logs
  //   try {
  //     const callbacks = await this.callbackLogRepository.createQueryBuilder('c')
  //     .where('DATE(createdAt) >= :date', {date: '2024-07-08'})
  //     .andWhere('request_type = :type', {type: 'Withdraw'})
  //     .getMany();

  //     console.log(callbacks.length, ' found')

  //     // console.log(callbacks)
  //     for (const callback of callbacks) {
  //       const payload = JSON.parse(callback.payload);
  //       if(payload.Amount > 0) {
  //         console.log('processing ticket', payload.TransactionInfo.BetTransactionId, payload.Amount)
  //         const settlePayload: CreditCasinoBetRequest = {
  //           transactionId: payload.TransactionInfo.BetTransactionId,
  //           winnings: payload.Amount,
  //         };

  //         // console.log('prociessing settlement')

  //         // settle won bet
  //         const settle_bet = await this.settle(settlePayload);
  //       }
  //     }
  //   } catch (e) {
  //     console.log('error running cron', e.message);
  //   }
  // }
}
