/* eslint-disable prettier/prettier */
import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { BetService } from 'src/bet/bet.service';
import { CreditCasinoBetRequest, PlaceCasinoBetRequest, RollbackCasinoBetRequest } from 'src/proto/betting.pb';
import { CallbackGameDto, StartGameDto } from 'src/proto/gaming.pb';
import { Repository } from 'typeorm';
import { CallbackLog, Game as GameEntity, Provider as ProviderEntity } from '../entities';
import { RpcException } from '@nestjs/microservices';


@Injectable()
export class PragmaticService {
  private readonly PRAGMATIC_SECURE_LOGIN: string;
  private readonly PRAGMATIC_BASEURL: string;
  private readonly PRAGMATIC_GAMEURL: string;
  private readonly PRAGMATIC_KEY: string;
  private readonly PRAGMATIC_IMAGE_URL: string;

  constructor(
    @InjectRepository(ProviderEntity)
    private providerRepository: Repository<ProviderEntity>,
    @InjectRepository(CallbackLog)
    private callbackLogRepository: Repository<CallbackLog>,
    @InjectRepository(GameEntity)
    private gameRepository: Repository<GameEntity>,
    private readonly betService: BetService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService, // For accessing environment variables
  ) {
    this.PRAGMATIC_SECURE_LOGIN = this.configService.get<string>('PRAGMATIC_SECURE_LOGIN');
    this.PRAGMATIC_BASEURL = this.configService.get<string>('PRAGMATIC_BASEURL');
    this.PRAGMATIC_GAMEURL = this.configService.get<string>('PRAGMATIC_GAMEURL');
    this.PRAGMATIC_KEY = this.configService.get<string>('PRAGMATIC_KEY');
    this.PRAGMATIC_IMAGE_URL = this.configService.get<string>('PRAGMATIC_IMAGE_URL');
  }

  // Get Casino Games
  async getCasinoGames(): Promise<any> {
    try {
      const hash = this.genHash({ secureLogin: this.PRAGMATIC_SECURE_LOGIN });
      const { data } = await this.httpService
        .post(`${this.PRAGMATIC_BASEURL}/getCasinoGames?secureLogin=${this.PRAGMATIC_SECURE_LOGIN}&hash=${hash}`)
        .toPromise();

        console.log('data', data);

      return data.gameList;
    } catch (e) {
      return new RpcException(e.messag || 'Something went wrong')
    }
  }

  
  public async syncGames() {
    try {
      const games: any = await this.getCasinoGames();
      console.log("games", games);
  
      if (!games || games.length === 0) {
        throw new Error('No games available for processing');
      }
  
      let provider = await this.providerRepository.findOne({
        where: { name: 'Pragmatic Play' },
      });

      console.log("provider", provider);
  
      if (!provider) {
        const newProvider: ProviderEntity = new ProviderEntity();
        newProvider.name = 'Pragmatic Play';
        newProvider.slug = 'pragmatic-play';
        newProvider.description = 'Pragmatic Play';
        newProvider.imagePath =
          'https://images.pexels.com/photos/414612/pexels-photo-414612.jpeg';
        provider = await this.providerRepository.save(newProvider);
      }

      const savedGames = await Promise.all(
        Object.keys(games).map(async (key) => {
  
          if (Object.prototype.hasOwnProperty.call(games, key)) {
  
            const gameData = {
              gameId: games[key].gameID,
              title: games[key].gameName,
              description: games[key].typeDescription,
              type: 'Slots',
              provider: provider,
              status: true,
              imagePath:`${this.PRAGMATIC_IMAGE_URL}/${games[key].gameID}.png`,
              bannerPath: `${this.PRAGMATIC_IMAGE_URL}/${games[key].gameID}.png`,
            };
  
            const gameExist = await this.gameRepository.findOne({
              where: {
                title: gameData.title,
              },
              relations: {
                provider: true,
              },
            });
  
            if (gameExist) {
              console.log('updated game')
              this.gameRepository.merge(gameExist, gameData);
              return this.gameRepository.save(gameExist);
            } else {
              console.log('added game')
              return this.gameRepository.save(
                this.gameRepository.create(gameData),
              );
            }
          }
        }),
      );
  
      return {
        games: savedGames,
      };
  
    } catch (error) {
      console.log("Error saving games:", error.message);
    }
  }
  

  // API Health Check
  async apiHealthCheck(): Promise<any> {
    try {
      const { data } = await this.httpService
        .get(`${this.PRAGMATIC_BASEURL}/health/heartbeatCheck`)
        .toPromise();

      return data;
    } catch (e) {
      throw new HttpException(e.message || 'Something went wrong', 500);
    }
  }

  // Game Health Check
  async gameHealthCheck(): Promise<any> {
    try {
      const { data } = await this.httpService
        .get(`${this.PRAGMATIC_GAMEURL}/gs2c/livetest`)
        .toPromise();

      return data;
    } catch (e) {
      throw new HttpException(e.message || 'Something went wrong', 500);
    }
  }

  // Get Game URL
  // async constructGameUrl(payload: StartGameDto): Promise<any> {
  //   try {
  //        const { gameId, language, authCode, userId, demo } = payload;
  //         const hash = this.genHash({
  //           secureLogin: this.PRAGMATIC_SECURE_LOGIN,
  //           symbol: gameId,
  //           language: language,
  //           token: authCode, 
  //         });

  //         const playMode = demo ? 'playMode=DEMO&' : '';

  //     const { data } = await this.httpService
  //       .post(
  //         `${this.PRAGMATIC_BASEURL}/game/url?secureLogin=${this.PRAGMATIC_SECURE_LOGIN}&symbol=${gameId}&language=${language}&externalPlayerId=${userId}&token=${authCode}&hash=${hash}&${playMode}`,
  //       )
  //       .toPromise();

  //     return data;
  //   } catch (e) {
  //     throw new HttpException(e.message || 'Something went wrong', 500);
  //   }
  // }

  async constructGameUrl(payload: StartGameDto): Promise<any> {
    try {
      const { gameId, language, authCode, userId, demo } = payload;
      const hash = this.genHash({
        secureLogin: this.PRAGMATIC_SECURE_LOGIN,
        symbol: gameId,
        language: language,
        token: authCode,
      });
  
      const playMode = demo ? 'playMode=DEMO' : '';
  
      const request = this.httpService.post(
        `${this.PRAGMATIC_BASEURL}/game/url?secureLogin=${this.PRAGMATIC_SECURE_LOGIN}&symbol=${gameId}&language=${language}&externalPlayerId=${userId}&token=${authCode}&hash=${hash}&${playMode}`,
      );

      console.log(request);
      const { data } = await lastValueFrom(request);
  
      return { url: data.gameURL };
    } catch (e) {
      return new RpcException(e.message || 'Something went wrong');
    }
  }

  // Place Bet
  async placeBet(data: PlaceCasinoBetRequest) {
    return firstValueFrom(this.betService.placeCasinoBet(data));
  }

  async refund(data: RollbackCasinoBetRequest) {
    return await firstValueFrom(this.betService.cancelCasinoBet(data));
  }

  //Bonum Win
  // async bonusWin(data: SettleVirtualBetRequest) {
  //   return await firstValueFrom(this.betService.settleVirtualBet(data))
  // }

  // Settle Bet
  async result(data: CreditCasinoBetRequest) {
    return await firstValueFrom(this.betService.settleCasinoBet(data));
  }

  // async handleCallback(data: any) {
  //   // save callback
  //   const callback = await this.saveCallbackLog(data);

  //   const body = data.body ? JSON.parse(data.body) : '';
  //   const hashStr = data.body ? data.body : '';

  //   const hash =  this.genHash(data.method, hashStr);

  //   if (data.header['x-signature'] !== hash) {
  //     const response = {
  //       success: false,
  //       message: 'Invalid Hash Signature',
  //       status: HttpStatus.BAD_REQUEST
  //     }

  //     // update callback log response
  //     await this.callbackLogRepository.update({
  //       id: callback.id,
  //     },{
  //       response: JSON.stringify(response)
  //     });

  //     return response;
  //   }

  //   let game = null;
  //   let player = null;
  //   let balanceType = 'main';
  //   let sessionId = data.header['x-sessionid'];
  //   let gameSession;

  //   if (sessionId) {
  //     const res = await this.identityService.validateXpressSession({clientId: data.clientId, sessionId});

  //     // console.log(res)
  //     if (!res.success) {
  //       const response =  {
  //         success: false,
  //         message: 'Invalid Session ID',
  //         status: HttpStatus.NOT_FOUND
  //       };

  //       // update callback log response
  //       await this.updateCallbackGameSession(callback, response, {session_id: sessionId}, {callback_id: callback.id})

  //       return response;
  //     }
  //     // get game session
  //     gameSession = await this.gameSessionRepo.findOne({where: {session_id: sessionId}})
      
  //     if (gameSession.balance_type === 'bonus')
  //       balanceType = 'casino';

  //     player = res.data;

  //     if (body['TransactionInfo'])
  //       game = await this.gameRepository.findOne({
  //         where: {
  //           title: body['TransactionInfo']['GameName'],
  //         },
  //         relations: {provider: true}
  //       });
  //   }

  //   switch (data.action) {
  //     case 'ActivateSession':
  //       return await this.activateSession(data.clientId, body.Token, callback, portal);
  //     case 'GetBalance':
  //       console.log('GetBalance');
  //       return await this.getBalance(player, callback, balanceType, sessionId);
  //     case 'Deposit':
  //       console.log('Deposit');
  //       const gameName = body.TransactionInfo.GameName;
        
  //       const walletRes = await this.walletService.getWallet({
  //         userId: player.id,
  //         clientId: player.clientId,
  //       });

  //       if(walletRes.data.availableBalance < body.Amount) {
  //         const response = {
  //           success: false, 
  //           message: 'Insufficent balance', 
  //           status: HttpStatus.INTERNAL_SERVER_ERROR
  //         }
  //         // update callback log response and game session with callback id
  //         await this.updateCallbackGameSession(callback, response, {session_id: sessionId}, {callback_id: callback.id})

  //         return response;
  //       }

  //       // console.log(player)

  //       const placeBetPayload: PlaceCasinoBetRequest = {
  //         userId: player.id,
  //         clientId: player.clientId,
  //         roundId: body.TransactionInfo.RoundId,
  //         transactionId: body.TransactionId,
  //         gameId: body.TransactionInfo.GameNumber,
  //         stake: body.Amount,
  //         gameName: body.TransactionInfo.GameName,
  //         gameNumber: body.TransactionInfo.GameNumber,
  //         source: game.provider.slug,
  //         cashierTransactionId: body.TransactionInfo.CashierTransacitonId,
  //         winnings: 0,
  //         username: player.username,
  //         bonusId: gameSession.bonus_id || null
  //       };

  //       const place_bet = await this.placeBet(placeBetPayload);
        
  //       if (!place_bet.success) {
  //         const response = {
  //           success: false,
  //           status: HttpStatus.INTERNAL_SERVER_ERROR,
  //           message: place_bet.message,
  //         };
  //         // update callback log response and game session with callback id
  //         await this.updateCallbackGameSession(callback, response, {session_id: sessionId}, {callback_id: callback.id})

  //         return response;
  //       }

  //       const debit = await this.walletService.debit({
  //         userId: player.id,
  //         clientId: player.clientId,
  //         amount: body.Amount.toFixed(2),
  //         source: game.provider.slug,
  //         description: `Casino Bet: (${gameName}:${body.TransactionInfo.GameNumber})`,
  //         username: player.username,
  //         wallet: balanceType,
  //         subject: 'Bet Deposit (Casino)',
  //         channel: gameName,
  //       });

  //       if (!debit.success) {
  //         const response = {
  //           success: false,
  //           status: HttpStatus.INTERNAL_SERVER_ERROR,
  //           message: 'Incomplete request',
  //         };
  //         // update callback log response and game session with callback id
  //         await this.updateCallbackGameSession(callback, response, {session_id: sessionId}, {callback_id: callback.id})

  //         return response;
  //       }
        
  //       const response = {
  //         success: true,
  //         status: HttpStatus.OK,
  //         message: 'Deposit, successful',
  //         data: {
  //           Balance: parseFloat(debit.data.balance.toFixed(2)),
  //           TransactionId: place_bet.data.transactionId,
  //         },
  //       };
  //       // update callback log response
  //       await this.updateCallbackGameSession(callback, response, {session_id: sessionId}, {callback_id: callback.id}, true)

  //       return response;
  //     case 'Withdraw':
  //       const transactionType = body.TransactionType;
  //       const amount = body.Amount;
  //       const betId = body.TransactionInfo.BetTransactionId;
  //       const roundId = body.TransactionInfo.RoundId;

  //       // check if transaction ID exist and return user balance
  //       if (callback.transactionId === body.TransactionId && callback.status === true) {
  //         console.log('transaction completed')
  //         const creditRes = await this.walletService.getWallet({
  //           userId: player.id,
  //           clientId: player.clientId,
  //         });

  //         return {
  //           success: true,
  //           status: HttpStatus.OK,
  //           message: 'Withdraw, successful',
  //           data: {
  //             Balance: creditRes.data.availableBalance,
  //             TransactionId: callback.id,
  //           },
  //         };

  //       }

  //       let creditRes = null;

  //       if (transactionType === 'WinAmount') {
          
  //         const settlePayload: CreditCasinoBetRequest = {
  //           transactionId: betId,
  //           winnings: amount,
  //         };

  //         // console.log('prociessing settlement')
  
  //         // settle won bet
  //         const settle_bet = await this.settle(settlePayload);
  //         // console.log(settle_bet, 'settlebet response')
  //         if (!settle_bet.success)  {
  //           const response = {success: false, message: settle_bet.message, status: HttpStatus.INTERNAL_SERVER_ERROR}
  //           // update callback log response
  //           await this.updateCallbackGameSession(callback, response, {session_id: sessionId}, {callback_id: callback.id})
  
  //           return response;
  //         }

  //         creditRes = await this.walletService.credit({
  //           userId: player.id,
  //           clientId: player.clientId,
  //           amount: body.Amount.toFixed(2),
  //           source: body.TransactionInfo.Source,
  //           description: `Casino Bet: (${body.TransactionInfo.GameName}:${body.TransactionInfo.GameNumber})`,
  //           username: player.username,
  //           wallet: balanceType,
  //           subject: 'Bet Win (Casino)',
  //           channel: body.TransactionInfo.Source,
  //         });

  //         const response = {
  //           success: true,
  //           status: HttpStatus.OK,
  //           message: 'Withdraw, successful',
  //           data: {
  //             Balance: parseFloat(creditRes.data.balance.toFixed(2)),
  //             TransactionId: callback.id,
  //           },
  //         };
  //         // update callback log response
  //         await this.updateCallbackGameSession(callback, response, {session_id: sessionId}, {callback_id: callback.id}, true)

  //         return response;
  //       } else { // handle CloseRound transactionType

  //         const payload: CreditCasinoBetRequest = {
  //           transactionId: roundId,
  //           winnings: amount,
  //         };
  
  //         // settle won bet
  //         const settle_bet = await this.betService.closeRound(payload);
        
  //         if (!settle_bet.success)  {

  //           const response = {
  //             success: false, 
  //             message: settle_bet.message, 
  //             status: HttpStatus.INTERNAL_SERVER_ERROR
  //           }
  //           await this.updateCallbackGameSession(callback, response, {session_id: sessionId}, {callback_id: callback.id})
  
  //           return response;
  //         }
          
  //         // get player wallet
  //         creditRes = await this.walletService.getWallet({
  //           userId: player.id,
  //           clientId: player.clientId,
  //         });

  //         const response = {
  //           success: true,
  //           status: HttpStatus.OK,
  //           message: 'Withdraw, successful',
  //           data: {
  //             Balance: balanceType === 'casino' ? parseFloat(creditRes.data.casinoBonusBalance.toFixed(2)) : parseFloat(creditRes.data.availableBalance.toFixed(2)),
  //             TransactionId: callback.id,
  //           },
  //         };
  //         // update callback log response
  //         await this.updateCallbackGameSession(callback, response, {session_id: sessionId}, {callback_id: callback.id}, true)

  //         return response;
  //       }
  //     case 'RollbackTransaction':
  //       const reversePayload: RollbackCasinoBetRequest = {
  //         transactionId: body.TransactionId,
  //       };
  //       console.log('Processing Rollback')
  //       // get callback log
  //       const callbackLog = await this.callbackLogRepository.findOne({where: {transactionId: reversePayload.transactionId }})

  //       if (!callbackLog) {
  //         console.log('Callback log found')

  //         const response = {success: false, message: 'Transaction not found', status: HttpStatus.INTERNAL_SERVER_ERROR}
  //         await this.updateCallbackGameSession(callback, response, {session_id: sessionId}, {callback_id: callback.id})

  //         return response;
  //       }

  //       const transactionPayload = JSON.parse(callbackLog.payload);
  //       // console.log(transactionPayload)
  //       // const transactionResponse = JSON.parse(callbackLog.response);
  //       console.log('update ticket')
  //       const transaction = await this.rollbackTransaction(reversePayload);

  //       if (transaction.status === HttpStatus.CREATED) {
  //         const response = await this.getBalance(player, callback, balanceType, sessionId);
          
  //         if (response.success) {
  //           return {
  //             success: true,
  //             status: HttpStatus.OK,
  //             message: 'Rollback, successful',
  //             data: {
  //               Balance: response.data.Amount,
  //               TransactionId: callback.id,
  //             },
  //           }
  //         } else {
  //           return {
  //             success: false,
  //             message: 'Unable to complete request', 
  //             status: HttpStatus.INTERNAL_SERVER_ERROR
  //           }
  //         }
  //       }

  //       if (!transaction.success)  {
  //         console.log('ticket update not successful')
  //         const response = {
  //           success: false,
  //           message: 'Unable to complete request', 
  //           status: HttpStatus.INTERNAL_SERVER_ERROR}
  //         // update callback log response
  //         await this.updateCallbackGameSession(callback, response, {session_id: sessionId}, {callback_id: callback.id})


  //         return response;
  //       }

  //       console.log('updated ticket, now implementing wallet transaction ', callbackLog.request_type)

  //       let rollbackWalletRes = null;

  //       if (callbackLog.request_type === 'Deposit') {
  //         rollbackWalletRes = await this.walletService.credit({
  //           userId: player.id,
  //           clientId: player.clientId,
  //           amount: body.Amount.toFixed(2),
  //           source: transactionPayload.TransactionInfo.Source,
  //           description: `Bet Cancelled: (${transactionPayload.TransactionInfo.GameName}:${body.TransactionInfo.GameNumber})`,
  //           username: player.username,
  //           wallet: balanceType,
  //           subject: 'Bet Rollback (Casino)',
  //           channel: body.TransactionInfo.GameName,
  //         });

  //         console.log('credit wallet respons', rollbackWalletRes)

  //         const response = {
  //           success: true,
  //           status: HttpStatus.OK,
  //           message: 'Rollback, successful',
  //           data: {
  //             Balance: parseFloat(rollbackWalletRes.data.balance.toFixed(2)),
  //             TransactionId: callback.id,
  //           },
  //         };
  //         // update callback log response
  //         await this.updateCallbackGameSession(callback, response, {session_id: sessionId}, {callback_id: callback.id}, true)

  //         return response;
         
  //       } else {
  //         rollbackWalletRes = await this.walletService.debit({
  //           userId: player.id,
  //           clientId: player.clientId,
  //           amount: body.Amount.toFixed(2),
  //           source: transactionPayload.TransactionInfo.Source,
  //           description: `Bet Cancelled: (${transactionPayload.TransactionInfo.GameName}:${body.TransactionInfo.GameNumber})`,
  //           username: player.username,
  //           wallet: balanceType,
  //           subject: 'Win Rollback (Casino)',
  //           channel: body.TransactionInfo.GameName,
  //         });
  //         console.log('debit wallet respons', rollbackWalletRes)
          
  //         const response = {
  //           success: true,
  //           status: HttpStatus.OK,
  //           message: 'Rollback, successful',
  //           data: {
  //             Balance: parseFloat(rollbackWalletRes.data.balance.toFixed(2)),
  //             TransactionId: callback.id,
  //           },
  //         };
  //        // update callback log response
  //         await this.updateCallbackGameSession(callback, response, {session_id: sessionId}, {callback_id: callback.id}, true)

  //         return response;
  //       }
  //     default:
  //       return {success: false, message: 'Invalid request', status: HttpStatus.BAD_REQUEST};
  //   }
  // }

  md5Algo = (hash) => {
    return crypto.createHash("md5").update(hash).digest("hex");
  };

  genHash = (query) => {
    const queries = Object.keys(query);
    const unhash = queries.filter((item) => item !== "hash");
    unhash.sort();
    const queryParams = unhash.map((key) => `${key}=${query[key]}`).join("&");
  
    const hash = this.md5Algo(`${queryParams}${this.PRAGMATIC_KEY}`);
    return hash;
  };

  // save callback request
  async saveCallbackLog(data) {
    const action = data.action;
    const body = data.body ? JSON.parse(data.body) : '';
    const transactionId = 
      action === 'Authenticate' 
        ? body.Token 
        : action === 'GetBalance' 
          ? data.header['x-sessionid']
          : action === 'Bet' 
          ? data.header['x-sessionid'] 
          : action === 'Refund' 
          ? data.header['x-sessionid'] 
          : action === 'Result' 
          ? data.header['x-sessionid'] 
          : action === 'BonusWin' 
          ? data.header['x-sessionid']
          : action === 'promoWin' 
          ? data.header['x-sessionid'] 
          : action === 'JackpotWin' 
            ? body.CurrentTransactionId 
            : body.TransactionId;

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

}
