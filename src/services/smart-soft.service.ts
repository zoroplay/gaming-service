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
import { AxiosRequestConfig } from 'axios';
import {
  CallbackLog,
  Game as GameEntity,
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
import { Timeout } from '@nestjs/schedule';

const getCellValue = (row:  Excel.Row, cellIndex: number) => {
  const cell = row.getCell(cellIndex);

  return cell.value ? cell.value.toString() : '';
};


@Injectable()
export class SmartSoftService {
  private baseUrl: string;
  private secretKey: string;
  private portal: string;
  private requestConfig: AxiosRequestConfig;

  constructor(
    @InjectRepository(GameEntity)
    private gameRepository: Repository<GameEntity>,
    @InjectRepository(CallbackLog)
    private callbackLogRepository: Repository<CallbackLog>,
    @InjectRepository(ProviderEntity)
    private providerRepo: Repository<ProviderEntity>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly walletService: WalletService,
    private readonly betService: BetService,
    private readonly identityService: IdentityService,
  ) {
    this.baseUrl = this.configService.get<string>('SMART_SOFT_BASE_URL');
    this.secretKey = this.configService.get<string>('SMART_SOFT_SECRET_KEY');
    this.portal = this.configService.get<string>('SMART_SOFT_PORTAL');
  }

  // start game here
  async constructGameUrl(data, game: GameEntity) {
    try {
      let gameCategory = game.type;
      if (data.isMobile) {
        if (game.type === 'GamesLobby') {
          gameCategory = 'GamesMobile';
        } else {
          gameCategory = `${game.type}Mobile`;
        }
      }
      const gameName = game.title;
      const token = data.authCode === 'demo' ? 'DEMO' : data.authCode;
      const portal = data.authCode === 'demo' ? 'demo' : this.portal;;
      const returnUrl = data.homeUrl;
      const sessionUrl = `${this.baseUrl}GameCategory=${gameCategory}&GameName=${gameName}&Token=${token}&PortalName=${portal}&ReturnUrl=${returnUrl}`;
      return {
        url: sessionUrl,
      };
    } catch (e) {
      console.error(e.message);
    }
  }

  // callback handler
  async handleCallback(data: CallbackGameDto) {
    // save callback
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

    if (data.header['x-sessionid']) {
      const res = await this.identityService.validateXpressSession({clientId: data.clientId, sessionId: data.header['x-sessionid']});

      // console.log(res)
      if (!res.success) {
        const response =  {
          success: false,
          message: 'Invalid Session ID',
          status: HttpStatus.NOT_FOUND
        };

        // update callback log response
        await this.callbackLogRepository.update({
          id: callback.id,
        },{
          response: JSON.stringify(response)
        });

        return response;
      }

      player = JSON.parse(res.data);

      if (body['TransactionInfo'])
        game = await this.gameRepository.findOne({
          where: {
            title: body['TransactionInfo']['GameName'],
          },
        });
    }

    switch (data.action) {
      case 'ActivateSession':
        return await this.activateSession(data.clientId, body.Token, callback);
      case 'GetBalance':
        console.log('GetBalance');
        return await this.getBalance(player, callback);
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

        const placeBetPayload: PlaceCasinoBetRequest = {
          userId: player.id,
          clientId: player.clientId,
          roundId: body.TransactionInfo.RoundId,
          transactionId: body.TransactionId,
          gameId: body.TransactionInfo.GameNumber,
          stake: body.Amount,
          gameName: body.TransactionInfo.GameName,
          gameNumber: body.TransactionInfo.GameNumber,
          source: body.TransactionInfo.Source,
          cashierTransactionId: body.TransactionInfo.CashierTransacitonId,
          winnings: 0,
        };

        const place_bet = await this.placeBet(placeBetPayload);
        
        if (!place_bet.success) {
          const response = {
            success: false,
            status: HttpStatus.BAD_REQUEST,
            message: place_bet.message,
          };
          // update callback log response
          await this.callbackLogRepository.update({
            id: callback.id,
          },{
            response: JSON.stringify(response)
          });

          return response;
        }

        const debit = await this.walletService.debit({
          userId: player.id,
          clientId: player.clientId,
          amount: body.Amount,
          source: body.TransactionInfo.Source,
          description: `Casino Bet: (${gameName})`,
          username: player.username,
          wallet: 'main',
          subject: 'Bet Deposit (Casino)',
          channel: gameName,
        });

        if (!debit.success) {
          const response = {
            success: false,
            status: HttpStatus.BAD_REQUEST,
            message: 'Incomplete request',
          };
          // update callback log response
          await this.callbackLogRepository.update({
            id: callback.id,
          },{
            response: JSON.stringify(response)
          });

          return response;
        }
        
        const response = {
          success: true,
          status: HttpStatus.OK,
          message: 'Deposit, successful',
          data: {
            Balance: debit.data.balance,
            TransactionId: place_bet.data.transactionId,
          },
        };
        // update callback log response
        await this.callbackLogRepository.update({
          id: callback.id,
        },{
          response: JSON.stringify(response),
          status: true
        });

        return response;
      case 'Withdraw':
        const transactionType = body.TransactionType;
        const amount = body.Amount;
        const betId = body.TransactionInfo.RoundId;

        const settlePayload: CreditCasinoBetRequest = {
          transactionId: betId,
          winnings: amount,
        };

        const settle_bet = await this.settle(settlePayload);
        // console.log(settle_bet);
        if (!settle_bet.success)  {
          // console.log(settle_bet)
          const response = {success: false, message: 'Unable to complete request', status: HttpStatus.INTERNAL_SERVER_ERROR}
          // update callback log response
          await this.callbackLogRepository.update({
            id: callback.id,
          },{
            response: JSON.stringify(response)
          });

          return response;
        }

        let creditRes = null;

        if (transactionType === 'WinAmount' && amount > 0) {
          creditRes = await this.walletService.credit({
            userId: player.id,
            clientId: player.clientId,
            amount: body.Amount,
            source: body.TransactionInfo.Source,
            description: `Casino Bet: (${body.TransactionInfo.GameName})`,
            username: player.username,
            wallet: 'main',
            subject: 'Bet Win (Casino)',
            channel: body.TransactionInfo.Source,
          });

          const response = {
            success: true,
            status: HttpStatus.OK,
            message: 'Withdraw, successful',
            data: {
              Balance: creditRes.data.balance,
              TransactionId: settle_bet.data.transactionId,
            },
          };
          // update callback log response
          await this.callbackLogRepository.update({
            id: callback.id,
          },{
            response: JSON.stringify(response),
            status: true
          });

          return response;
        } else {
          creditRes = await this.walletService.getWallet({
            userId: player.userId,
            clientId: player.clientId,
          });
          const response = {
            success: true,
            status: HttpStatus.OK,
            message: 'Withdraw, successful',
            data: {
              Balance: creditRes.data.availableBalance,
              TransactionId: settle_bet.data.transactionId,
            },
          };
          // update callback log response
          await this.callbackLogRepository.update({
            id: callback.id,
          },{
            response: JSON.stringify(response)
          });

          return response;
        }
      case 'RollbackTransaction':
        const reversePayload: RollbackCasinoBetRequest = {
          transactionId: body.TransactionId,
        };
        // get callback log
        const callbackLog = await this.callbackLogRepository.findOne({where: {transactionId: reversePayload.transactionId }})

        if (!callbackLog) {
          const response = {success: false, message: 'Transaction not found', status: HttpStatus.NOT_FOUND}
          // update callback log response
          await this.callbackLogRepository.update({
            id: callback.id,
          },{
            response: JSON.stringify(response)
          });

          return response;
        }

        const transactionPayload = JSON.parse(callbackLog.payload);
        // console.log(transactionPayload)
        // const transactionResponse = JSON.parse(callbackLog.response);

        const transaction = await this.rollbackTransaction(reversePayload);

        if (!transaction.success)  {
          const response = {success: false, message: 'Unable to complete request', status: HttpStatus.INTERNAL_SERVER_ERROR}
          // update callback log response
          await this.callbackLogRepository.update({
            id: callback.id,
          },{
            response: JSON.stringify(response)
          });

          return response;
        }

        let rollbackWalletRes = null;

        if (callbackLog.request_type === 'Deposit') {
          rollbackWalletRes = await this.walletService.credit({
            userId: player.id,
            clientId: player.clientId,
            amount: body.Amount,
            source: transactionPayload.TransactionInfo.Source,
            description: `Bet Cancelled: (${transactionPayload.TransactionInfo.GameName})`,
            username: player.username,
            wallet: 'main',
            subject: 'Bet Rollback (Casino)',
            channel: body.TransactionInfo.GameName,
          });

          const response = {
            success: true,
            status: HttpStatus.OK,
            message: 'Rollback, successful',
            data: {
              Balance: rollbackWalletRes.data.balance,
              TransactionId: transaction.data.transactionId,
            },
          };
          // update callback log response
          await this.callbackLogRepository.update({
            id: callback.id,
          },{
            response: JSON.stringify(response),
            status: true
          });

          return response;
         
        } else {
          rollbackWalletRes = await this.walletService.debit({
            userId: player.id,
            clientId: player.clientId,
            amount: body.Amount,
            source: transactionPayload.TransactionInfo.Source,
            description: `Bet Cancelled: (${transactionPayload.TransactionInfo.GameName})`,
            username: player.username,
            wallet: 'main',
            subject: 'Win Rollback (Casino)',
            channel: body.TransactionInfo.GameName,
          });
          // console.log(rollbackWalletRes)
          const response = {
            success: true,
            status: HttpStatus.OK,
            message: 'Rollback, successful',
            data: {
              Balance: rollbackWalletRes.data.balance,
              TransactionId: transaction.data.transactionId,
            },
          };
             // update callback log response
          await this.callbackLogRepository.update({
            id: callback.id,
          },{
            response: JSON.stringify(response),
            status: true
          });

          return response;
        }
      default:
        return {success: false, message: 'Invalid request', status: HttpStatus.BAD_REQUEST};
    }
  }

  // support
  generateMd5(requestMethod: string, payload: string) {
    console.log('encryption start');

    // console.log(this.secretKey);
    // console.log(requestMethod);
    // console.log(JSON.stringify(payload));
    console.log(`${this.secretKey}|${requestMethod}|${payload}`);

    const md5Hash = crypto
      .createHash('md5')
      .update(
        `${this.secretKey}|${requestMethod}|${payload}`,
      )
      .digest('hex');

    console.log('encryption hash');
    console.log(md5Hash);
    console.log('encryption ends');
    return md5Hash;
  }

  // Webhook Section

  // Activate Player Session
  async activateSession(clientId, token, callback) {
    const res = await this.identityService.xpressLogin({clientId, token});

    if (!res.status) {
      const response = {
        success: false,
        status: HttpStatus.NOT_FOUND,
        message: 'Player not found'
      }

      // update callback log response
      await this.callbackLogRepository.update({
        id: callback.id,
      },{
        response: JSON.stringify(response)
      });

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
        PortalName: 'sportsbookengine',
        CurrencyCode: res.data.currency,
      },
    };

    // update callback log response
    await this.callbackLogRepository.update({
      id: callback.id,
    },{
      response: JSON.stringify(response),
      status: true
    });

    return response;
  }

  // Get Player Balance
  async getBalance(player, callback) {
    // console.log('getBalance', data);
    let response, status;

    if (player) {
      //TODO: USE PLAYER UserID AND ClientID to get balance from wallet service;
      const wallet = await this.walletService.getWallet({
        userId: player.id,
        clientId: player.clientId,
      });
      // console.log('wallet', wallet);
      if (wallet.success) {
        response = {
          success: true,
          status: HttpStatus.OK,
          message: 'Wallet',
          data: {
            Amount: wallet.data.availableBalance,
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
    await this.callbackLogRepository.update({
      id: callback.id,
    },{
      response: JSON.stringify(response),
      status
    });

    return response;
  }

  // Place Bet
  async placeBet(data: PlaceCasinoBetRequest) {
    // console.log('place casino bet', data);
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
    // console.log('saving callback logs')
    const action = data.action;
    const body = data.body ? JSON.parse(data.body) : '';

    try{
      const callback = new CallbackLog();
      callback.transactionId = action === 'ActivateSession' ? body.Token : action === 'GetBalance' ? data.header['x-sessionid'] : action === 'RollbackTransaction' ? body.CurrentTransactionId : body.TransactionId;
      callback.request_type = action;
      callback.payload = JSON.stringify(body);

      // console.log(callback)

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
}
