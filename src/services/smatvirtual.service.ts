/* eslint-disable prettier/prettier */
import { HttpService } from '@nestjs/axios';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import * as CryptoJS from 'crypto-js';
import { BetService } from 'src/bet/bet.service';
import { CasinoGame } from 'src/entities/casino-game.entity';
import { IdentityService } from 'src/identity/identity.service';
import { WalletService } from 'src/wallet/wallet.service';
import { Repository } from 'typeorm';

import { firstValueFrom } from 'rxjs';
import {
  PlaceCasinoBetRequest,
  RollbackCasinoBetRequest
} from 'src/proto/betting.pb';
import {
  SmatVirtualCallbackRequest,
  StartDto
} from 'src/proto/gaming.pb';
import {
  CallbackLog,
  GameSession,
} from '../entities';

@Injectable()
export class SmatVirtualService {
  private readonly SMATVIRTUAL_BASEURL: string;
  private readonly SMATVIRTUAL_ENCRYPTION_KEY: string;
  private readonly SMATVIRTUAL_PUBLIC_KEY: string;

  constructor(
    @InjectRepository(CallbackLog)
    private callbackLogRepository: Repository<CallbackLog>,
    @InjectRepository(GameSession)
    private gameSessionRepo: Repository<GameSession>,
    @InjectRepository(CasinoGame)

    private readonly betService: BetService,
    private readonly walletService: WalletService,
    private readonly identityService: IdentityService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService, // For accessing environment variables
  ) {
    this.SMATVIRTUAL_BASEURL = this.configService.get<string>('SMATVIRTUAL_BASEURL');
    this.SMATVIRTUAL_ENCRYPTION_KEY = this.configService.get<string>('SMATVIRTUAL_ENCRYPTION_KEY');
    this.SMATVIRTUAL_PUBLIC_KEY = this.configService.get<string>('SMATVIRTUAL_PUBLIC_KEY');

  }



  async activateSession(payload: StartDto): Promise<any> {
    try {
      const { userId, token } = payload;
      const ClientExternalId = 'AITvERsv';

      // const res = await this.identityService.validateToken({ clientId, token });
      // console.log("res", res);
      // let response;

      // if (!res.success) {
      //   response = {
      //       success: false,
      //       message: 'Invalid Session ID',
      //       status: HttpStatus.NOT_FOUND
      //   };

      //   // await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
      //   return response;
      // }

      const hash = await this.encrypt(
        JSON.stringify({
          clientId: ClientExternalId,
          userId: userId.toString(),
          publicKey: this.SMATVIRTUAL_PUBLIC_KEY,
          sessionId: token
        }),
        this.SMATVIRTUAL_ENCRYPTION_KEY
      );

      return { url: `${this.SMATVIRTUAL_BASEURL}?clientId=${ClientExternalId}&cesLoad=${hash}` };



        

      // // Prepare the game session
      // // const gameSession = new GameSession();
      // // gameSession.session_id = walletSessionId;
      // // gameSession.game_id = gameExist.gameId;
      // // gameSession.provider = gameExist.provider.slug;
      // // gameSession.balance_type = balanceType || null;
      // // gameSession.token = authCode;

      // // console.log('Game session data to save:', gameSession);

      // // // Validate and save the game session
      // // if (!gameSession.token) {
      // //   console.error('Auth token is missing or invalid');
      // //   return {
      // //     status: HttpStatus.BAD_REQUEST,
      // //     message: 'Auth token is missing',
      // //     data: {},
      // //   };
      // // }

      // // Save the Wallet-Session for future use

      // try {
      //   await this.gameSessionRepo.save(gameSession);
      //   console.log('Game session saved successfully:', gameSession);
      // } catch (dbError) {
      //   console.error('Error saving game session:', dbError.message);
      //   return {
      //     status: HttpStatus.INTERNAL_SERVER_ERROR,
      //     message: `Failed to save game session: ${dbError.message}`,
      //   };
      // }

      // // Prepare the API request URL
      // const requestUrl = `${this.QTECH_BASEURL}/v1/games/${gameExist.gameId}/launch-url`;

      // console.log('requestUrl:', requestUrl);

      // // Set up headers
      // const headers = {
      //   Authorization: `Bearer ${await this.getAccessToken()}`,
      // };

      // // Prepare the payload
      // const requestBody = {
      //   playerId: userId,
      //   walletSessionId,
      //   currency: 'NGN',
      //   country: 'NG',
      //   lang: 'en_US',
      //   mode,
      //   device,
      //   returnUrl,
      // };

      // console.log('requestBody:', requestBody);
      // // Make the API request
      // const { data } = await this.httpService
      //   .post(requestUrl, requestBody, { headers })
      //   .toPromise();

      // console.log('Response data:', data);
      // console.log('Response returnUrl:', data.url);

      // // Return the game URL
      // return { url: data.url };
    } catch (error) {
      console.error('Error in launchGames:', error.message);
      throw new RpcException(
        error.response?.data?.message || 'Launch Game failed',
      );
    }
  }

  async authenticate(clientId, token, callback) {
    console.log("Got to authenticate method");
    console.log("Auth", clientId, token, callback);
    const isValid = await this.identityService.validateToken({ clientId, token });

    //  const isValid = {
    //     success: true,
    //     status: HttpStatus.OK,
    //     message: 'Success',
    //     data: {
    //       playerId: '1',
    //       clientId: '4',
    //       playerNickname: 'frank',
    //       casinoBalance: 0.0,
    //       sessionId: '123',
    //       balance: 100.0,
    //       virtualBalance: 0.0,
    //       currency: 'NGN',
    //       group: null,
    //     }
    //   }
    
    console.log("isValid", isValid);
    let response: any;
    const dataObject = typeof isValid.data === 'string' ? JSON.parse(isValid.data) : isValid.data;

    console.log("dataObject", dataObject);

    if(!isValid || !isValid.status) {
      response = {
        success: false,
        status: HttpStatus.BAD_REQUEST,
        message: 'Invalid auth code, please login to try again',
        data: {}
      }

      const val = await this.callbackLogRepository.update({ id: callback.id}, { response: JSON.stringify(response)});
      console.log("val", val);

      return response;
    } 

    response = {
      success: true,
      status: HttpStatus.OK,
      data: {
        playerId: dataObject.playerId.toString(),
        balance: parseFloat(dataObject.balance.toFixed(2)) || 0.00,
        sessionId: token,
        currency: dataObject.currency,
      }
    }

    await this.callbackLogRepository.update({ id: callback.id}, { response: JSON.stringify(response)});

    return response;

  }

  // async getBalance(payload: QtechCallbackRequest, callback: CallbackLog): Promise<any> {
  //   const { walletSessionId, clientId, playerId } = payload;

  //   try {

  //     // Validate token and get user balance
  //     const player = await this.identityService.getDetails({
  //       clientId,
  //       userId: parseInt(playerId),
  //     });

  //     const currency = player.data.currency;
  //     const balance = parseFloat(player.data.availableBalance.toFixed(2));

  //     // console.log('Balance:', balance, 'Currency:', currency);

  //     // Construct success response
  //     const response = this.createSuccessResponse(HttpStatus.OK, 'Balance retrieved', { balance, currency });
  //     // update callback logs, and gaming session
  //     await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id});

  //     return response;

  //   } catch (error) {
  //     console.error('Error in getBalance:', error.message);
  //     const response = this.createErrorResponse('UNKNOWN_ERROR', HttpStatus.INTERNAL_SERVER_ERROR, 'Unexpected error.');
  //     // update callback logs, and gaming session
  //     await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id})
  //     return response;
  //   }
  // }

  // async bet(payload: SmatVirtualCallbackRequest, callback: CallbackLog): Promise<any> {
  //   const { clientId, playerId, sessionId, body } = payload;
  //   const debitData: any = JSON.parse(body);
  //   let response;
  //   // console.log('Debit request', debitData)
  //   try {
  //     let balanceType = 'main';

  //     // get game session
  //     const gameSession = await this.gameSessionRepo.findOne({where: {session_id: sessionId}})
      
  //     if (gameSession && gameSession.balance_type === 'bonus')
  //       balanceType = 'casino';
        
  //     // Validate token
  //     const auth = await this.identityService.validateToken({
  //       clientId,
  //       token: sessionId,
  //     });

  //     if (!auth || !auth.success) {
  //       response = {
  //         success: false,
  //         message: 'Invalid Session ID',
  //         status: HttpStatus.NOT_FOUND
  //     };

  //     await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //     return response;
  //     }
    
  //     if(auth.data.balance < debitData.amount) {
  //       response = {
  //         success: false,
  //         status: HttpStatus.BAD_REQUEST,
  //         message: 'Insufficient balance to place this bet',
  //         data: {}
  //     };
  //     await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //     return response;
  //     }

  //     const placeBetPayload: PlaceCasinoBetRequest = {
  //       userId: parseInt(playerId),
  //       clientId,
  //       roundId: debitData.roundId,
  //       transactionId: debitData.roundId,
  //       gameId: debitData.gameId,
  //       stake: debitData.stakeAmount,
  //       gameName: debitData.gameName,
  //       source: 'smat-virtual',
  //       cashierTransactionId: debitData.roundId,
  //       winnings: 0,
  //       username: auth.data.playerNickname,
  //       bonusId: gameSession?.bonus_id || null
  //     };

  //     const place_bet = await this.placeBet(placeBetPayload);
  //     // console.log(place_bet)
  //     if (!place_bet.success) {
  //       response = {
  //         success: false,
  //         status: HttpStatus.INTERNAL_SERVER_ERROR,
  //         message: 'Place bet unsuccessful',
  //       };

  //       const val = await this.callbackLogRepository.update({ id: callback.id}, { response: JSON.stringify(response)});
  //       console.log("val", val);
  
  //       return response;
  //     }

  //     const debit = await this.walletService.debit({
  //       userId: parseInt(playerId),
  //       clientId,
  //       amount: debitData.amount.toFixed(2),
  //       source: 'smat-virtual',
  //       description: `Virtual Bet: (${debitData.gameName})`,
  //       username: auth.data.playerNickname,
  //       wallet: balanceType,
  //       subject: 'Bet Deposit (Casino)',
  //       channel: debitData.gameName,
  //     });

  //     console.log(debit)

  //     if (!debit.success) {
  //       response = {
  //         success: false,
  //         status: HttpStatus.BAD_REQUEST,
  //         message: 'Error debiting user wallet',
  //       };

  //       const val = await this.callbackLogRepository.update({ id: callback.id}, { response: JSON.stringify(response)});
  //       console.log("val", val);
  
  //       return response;
  //     }
      
  //     response = {
  //       success: true,
  //       message: 'Bet Successful',
  //       status: HttpStatus.OK,
  //       data: {
  //         balance: parseFloat(debit.data.balance.toFixed(2))
  //         },
  //     };

  //     // update callback log response
  //     await this.callbackLogRepository.update({ id: callback.id}, { response: JSON.stringify(response)});

  //     console.log("bet-response", response);

  //     return response;
  //   } catch (error) {
  //     console.error('Error placing bet:', error.message);

  //     response = {
  //       success: true,
  //       message: 'Unknown Error',
  //       status: HttpStatus.INTERNAL_SERVER_ERROR,
  //       data: {},
  //     };

  //     // update callback log response
  //     await this.callbackLogRepository.update({ id: callback.id}, { response: JSON.stringify(response)});

  //     return response;
  //   }
  // }

  // async win(payload: SmatVirtualCallbackRequest, callback: CallbackLog): Promise<any> {
  //   const { clientId, playerId, sessionId, body } = payload;
  //   const creditData: any = JSON.parse(body);
  //   let response;
  //   // console.log('Debit request', debitData)
  //   try {
  //     let balanceType = 'main';

  //     // get game session
  //     const gameSession = await this.gameSessionRepo.findOne({where: {session_id: sessionId}})
      
  //     if (gameSession && gameSession.balance_type === 'bonus')
  //       balanceType = 'casino';
        
  //     // Validate token
  //     const auth = await this.identityService.getDetails({
  //       clientId,
  //       userId: parseInt(playerId),
  //     });

  //     if (callback.transactionId === creditData.txnId && callback.status === true) {
  //       response = {
  //         success: false,
  //         message: 'Invalid Session ID',
  //         status: HttpStatus.NOT_FOUND
  //     };

  //     await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //     return response;
  //     }

  //     let creditRes = null;
    

  //     const settlePayload: CreditCasinoBetRequest = {
  //       transactionId: creditData.betId,
  //       winnings: creditData.amount,
  //     };

  //     const place_bet = await this.placeBet(placeBetPayload);
  //     // console.log(place_bet)
  //     if (!place_bet.success) {
  //       response = {
  //         success: false,
  //         status: HttpStatus.INTERNAL_SERVER_ERROR,
  //         message: 'Place bet unsuccessful',
  //       };

  //       const val = await this.callbackLogRepository.update({ id: callback.id}, { response: JSON.stringify(response)});
  //       console.log("val", val);
  
  //       return response;
  //     }

  //     const debit = await this.walletService.debit({
  //       userId: parseInt(playerId),
  //       clientId,
  //       amount: debitData.amount.toFixed(2),
  //       source: 'smat-virtual',
  //       description: `Virtual Bet: (${debitData.gameName})`,
  //       username: auth.data.playerNickname,
  //       wallet: balanceType,
  //       subject: 'Bet Deposit (Casino)',
  //       channel: debitData.gameName,
  //     });

  //     console.log(debit)

  //     if (!debit.success) {
  //       response = {
  //         success: false,
  //         status: HttpStatus.BAD_REQUEST,
  //         message: 'Error debiting user wallet',
  //       };

  //       const val = await this.callbackLogRepository.update({ id: callback.id}, { response: JSON.stringify(response)});
  //       console.log("val", val);
  
  //       return response;
  //     }
      
  //     response = {
  //       success: true,
  //       message: 'Bet Successful',
  //       status: HttpStatus.OK,
  //       data: {
  //         balance: parseFloat(debit.data.balance.toFixed(2))
  //         },
  //     };

  //     // update callback log response
  //     await this.callbackLogRepository.update({ id: callback.id}, { response: JSON.stringify(response)});

  //     console.log("bet-response", response);

  //     return response;
  //   } catch (error) {
  //     console.error('Error placing bet:', error.message);

  //     response = {
  //       success: true,
  //       message: 'Unknown Error',
  //       status: HttpStatus.INTERNAL_SERVER_ERROR,
  //       data: {},
  //     };

  //     // update callback log response
  //     await this.callbackLogRepository.update({ id: callback.id}, { response: JSON.stringify(response)});

  //     return response;
  //   }
  // }

  // async win(payload: QtechCallbackRequest, callback: CallbackLog): Promise<any> {
  //   console.log('Processing win method...');

  //   const { walletSessionId, gameId, clientId, body, playerId } = payload;

  //   try {
  //     const creditData: any = JSON.parse(body);

  //     // Validate gameId
  //     let game = null;
  //     let balanceType = 'main';
  //     let amount = creditData.amount;
  //     let gameSession;

  //     // Check if the game exists
  //     game = await this.gameRepository.findOne({
  //       where: { gameId },
  //       relations: { provider: true },
  //     });

  //     // get game session
  //     gameSession = await this.gameSessionRepo.findOne({where: {session_id: walletSessionId}})
      
  //     if ((gameSession && gameSession.balance_type === 'bonus') || creditData.bonusType)
  //       balanceType = 'casino';
      
  //     // Validate token
  //     const player = await this.identityService.getDetails({
  //       clientId,
  //       userId: parseInt(playerId),
  //     });

  //     // check if transaction ID exist and return user balance
  //     if (callback.transactionId === creditData.txnId && callback.status === true) {
  //       console.log('transaction completed')
  //       const walletRes = await this.walletService.getWallet({
  //         userId: parseInt(playerId), 
  //         clientId
  //       });

  //       const response = this.createSuccessResponse(HttpStatus.OK, 'Successful', {
  //         balance: walletRes.data.availableBalance,
  //         referenceId: callback.id,
  //       })

  //       return response;
  //     }

  //     let creditRes = null;
          
  //     const settlePayload: CreditCasinoBetRequest = {
  //       transactionId: creditData.betId,
  //       winnings: creditData.amount,
  //     };

  //     // settle won bet
  //     const settle_bet = await this.result(settlePayload);

  //     if (!settle_bet.success)  {
  //       const response = this.createErrorResponse('REQUEST_DECLINED', HttpStatus.BAD_GATEWAY, 'Unable  to process request')
  //       // update callback log response
  //       await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id})

  //       return response;
  //     }
  //     // close round if completed is true
  //     if (creditData.completed === "true") {
  //       const payload: CreditCasinoBetRequest = {
  //         transactionId: creditData.roundId,
  //         winnings: creditData.amount,
  //       };
  //       // settle won bet
  //       await this.betService.closeRound(payload);
  //     }

  //     // console.log(settle_bet, 'settlebet response')
  //     creditRes = await this.walletService.credit({
  //       userId: playerId,
  //       clientId,
  //       amount: creditData.amount.toFixed(2),
  //       source: game.provider.slug,
  //       description: `Casino Bet: (${game.title}:${gameId})`,
  //       username: player.data.username,
  //       wallet: balanceType,
  //       subject: 'Bet Win (Casino)',
  //       channel: creditData.device,
  //     });

  //     const response = this.createSuccessResponse(HttpStatus.OK, 'Credit, Successful', { 
  //       balance: parseFloat(creditRes.data.balance.toFixed(2)),
  //       referenceId: callback.id,        
  //     });      
  //     // update callback log response
  //     await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id}, true)

  //     return response;
        
  //   } catch (error) {
  //     console.error('Error processing win:', error.message);
  //     const response = this.createErrorResponse('UNKNOWN_ERROR', HttpStatus.INTERNAL_SERVER_ERROR, 'Unexpected error.');
  //     // update callback logs, and gaming session
  //     await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id})
  //     return response;
  //   }
  // }

  // async refund(payload: QtechCallbackRequest, callback: CallbackLog) {
  //   const { playerId, walletSessionId, gameId, clientId, body } = payload;
  //   const data: any = JSON.parse(body);
    
  //   try {
  //     // Validate gameId
  //     let game = null;
  //     let balanceType = 'main';
  //     let gameSession;

  //     // Check if the game exists
  //     game = await this.gameRepository.findOne({
  //       where: { gameId },
  //       relations: { provider: true },
  //     });

  //     const reversePayload: RollbackCasinoBetRequest = {
  //       transactionId: data.betId,
  //     };

  //     console.log('Processing Rollback')
  //     // get callback log
  //     const callbackLog = await this.callbackLogRepository.findOne({where: {transactionId: reversePayload.transactionId }})

  //     // get player details
  //     const player = await this.identityService.getDetails({
  //       clientId,
  //       userId: parseInt(playerId),
  //     });

  //     if (!callbackLog) {
  //       console.log('Callback log found')

  //       const response = this.createSuccessResponse(HttpStatus.OK, 'Transaction not found', {balance: player.data.availableBalance});
        
  //       await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id})

  //       return response;
  //     }

  //     // const transactionPayload = JSON.parse(callbackLog.payload);
  //     // console.log(transactionPayload)
  //     // const transactionResponse = JSON.parse(callbackLog.response);
  //     const transaction = await this.rollback(reversePayload);

  //     if (!transaction.success)  {
  //       console.log('ticket update not successful')
  //       const response = this.createErrorResponse('REQUEST_DECLINED', HttpStatus.BAD_REQUEST, 'Unable to process request.')
  //       // update callback log response
  //       await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id})

  //       return response;
  //     }

  //     const rollbackWalletRes = await this.walletService.credit({
  //       userId: playerId,
  //       clientId,
  //       amount: data.amount.toFixed(2),
  //       source: gameId,
  //       description: `Bet Cancelled: (${game.title}:${data.gameId})`,
  //       username: player.data.username,
  //       wallet: balanceType,
  //       subject: 'Bet Rollback (Casino)',
  //       channel: data.device,
  //     });

  //     console.log('credit wallet respons', rollbackWalletRes)

  //     const response = this.createSuccessResponse(HttpStatus.OK, 'Successful', {
  //       balance: parseFloat(rollbackWalletRes.data.balance.toFixed(2)),
  //       referenceId: callback.id,
  //     })
  //     // update callback log response
  //     await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id}, true)

  //     return response;
  //   } catch (e) {
  //     console.error('Error processing win:', e.message);
  //     const response = this.createErrorResponse('UNKNOWN_ERROR', HttpStatus.INTERNAL_SERVER_ERROR, 'Unexpected error.');
  //     // update callback logs, and gaming session
  //     await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id});

  //     return response;
  //   }
  // }

  async placeBet(data: PlaceCasinoBetRequest) {
    return firstValueFrom(this.betService.placeCasinoBet(data));
  }

  // async result(data: CreditCasinoBetRequest) {
  //   return await firstValueFrom(this.betService.settleCasinoBet(data));
  // }

  async rollback(data: RollbackCasinoBetRequest) {
    return await firstValueFrom(this.betService.cancelCasinoBet(data));
  }

  
  async handleCallback(data: SmatVirtualCallbackRequest) {
    console.log("_data", data);

    const callback = await this.saveCallbackLog(data);
    console.log("callback-4", callback);

    // Handle game actions
    switch (data.action) {
        case 'player-information':
            console.log("using smat virtual authenticate");
            return await this.authenticate(data.clientId, data.sessionId, callback);
        // case 'bet':
        //     return await this.bet(data, callback);
        // // case 'Bet':
        // //     return await this.bet(data.clientId, player, callback, body, balanceType);
        // case 'win':
        //     return await this.win(data, callback);
        default:
            return { success: false, message: 'Invalid request', status: HttpStatus.BAD_REQUEST };
    }
}


async saveCallbackLog(data) {
  const action = data.action;
  const body = data.body ? JSON.parse(data.body) : '';
  const transactionId = 
    action === 'player-information' ? data.sessionId
    : action === 'bet' ? data.roundId
    : action === 'win' ? data.roundId
    : data.roundId

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

  private encrypt(message: string, key: string): string {
    try {
      const cipher = CryptoJS.AES.encrypt(
        message,
        key
      ).toString();

      return encodeURIComponent(cipher);
    } catch (error) {
      console.log("error", error);
      throw error;
    }
  }

  private decrypt(hash: string, key?: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(
        decodeURIComponent(hash),
        key
      );
      const originalText = bytes.toString(CryptoJS.enc.Utf8);

      return originalText;
    } catch (error) {
      console.log("error", error);
      throw error;
    }
  }


}
