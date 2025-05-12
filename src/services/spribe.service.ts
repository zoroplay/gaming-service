/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-const */
import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GameKey } from 'src/entities/game-key.entity';
import { CallbackGameDto, SpribeCallbackRequest, StartGameDto, SyncGameDto } from 'src/proto/gaming.pb';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { CallbackLog, Game as GameEntity, GameSession, Provider as ProviderEntity } from '../entities';
import { RpcException } from '@nestjs/microservices';
import { IdentityService } from 'src/identity/identity.service';
import { WalletService } from 'src/wallet/wallet.service';



@Injectable()
export class SpribeService {
  private  SPRIBE_LAUNCH_URL: string;
  private  SPRIBE_GAME_URL: string;
  private  SPRIBE_OPERATOR_KEY: string;
  private  SPRIBE_SECRET_TOKEN: string;
  private  SPRIBE_GAME_INFO_URL: string;
  private  SPRIBE_DEMO_URL: string;
  private CLIENT_ID: number;
  

  constructor(
    @InjectRepository(ProviderEntity)
    private providerRepository: Repository<ProviderEntity>,
    @InjectRepository(GameEntity)
    private gameRepository: Repository<GameEntity>,
    @InjectRepository(GameKey)
    private gameKeyRepository: Repository<GameKey>,
    @InjectRepository(GameSession)
    private gameSessionRepo: Repository<GameSession>,
    @InjectRepository(CallbackLog)
    private callbackLogRepository: Repository<CallbackLog>,
    private readonly identityService: IdentityService,
     private readonly walletService: WalletService,
  ) {}

  async setKeys (clientId) {
    this.CLIENT_ID = clientId;

    const gameKeys = await this.gameKeyRepository.find({
      where: {
          client_id: clientId,
          provider: 'spribe',
      },
    });

    // console.log("gameKeys", gameKeys);

    this.SPRIBE_LAUNCH_URL = gameKeys.find(key => key.option === 'SPRIBE_LAUNCH_URL')?.value;
    this.SPRIBE_GAME_URL = gameKeys.find(key => key.option === 'SPRIBE_GAME_URL')?.value;
    this.SPRIBE_OPERATOR_KEY = gameKeys.find(key => key.option === 'SPRIBE_OPERATOR_KEY')?.value;
    this.SPRIBE_SECRET_TOKEN = gameKeys.find(key => key.option === 'SPRIBE_SECRET_TOKEN')?.value;
    this.SPRIBE_GAME_INFO_URL = gameKeys.find(key => key.option === 'SPRIBE_GAME_INFO_URL')?.value;
    this.SPRIBE_DEMO_URL = gameKeys.find(key => key.option === 'SPRIBE_DEMO_URL')?.value;

  }



  public async syncGames() {
    try {
      const games = [
        {
          "key": "balloon",
          "name": "BALLOON_AIRSHIP",
          "provider": "spribe_crypto",
          "rtp": 97
        },
        {
          "key": "aviator",
          "name": "AVIATOR",
          "provider": "spribe_aviator",
          "rtp": 97
        },
        {
          "key": "dice",
          "name": "DICE",
          "provider": "spribe_crypto",
          "rtp": 97
        },
        {
          "key": "plinko",
          "name": "PLINKO",
          "provider": "spribe_crypto",
          "rtp": 97
        },
        {
          "key": "goal",
          "name": "GOAL",
          "provider": "spribe_crypto",
          "rtp": 97
        },
        {
          "key": "hi-lo",
          "name": "HILO",
          "provider": "spribe_crypto",
          "rtp": 97
        },
        {
          "key": "mines",
          "name": "MINES",
          "provider": "spribe_crypto",
          "rtp": 97
        },
        {
          "key": "keno",
          "name": "KENO",
          "provider": "spribe_crypto",
          "rtp": 97
        },
        {
          "key": "mini-roulette",
          "name": "ROULETTE",
          "provider": "spribe_crypto",
          "rtp": 97
        },
        {
          "key": "hotline",
          "name": "HOTLINE",
          "provider": "spribe_crypto",
          "rtp": 97
        },
        {
          "key": "mini-aviator",
          "name": "MINI AVIATOR",
          "provider": "spribe_crypto",
          "rtp": 97
        },
        {
          "key": "multikeno",
          "name": "KENO 80",
          "provider": "spribe_keno",
          "rtp": 97
        }
      ];
  
      console.log("games", games);
  
      if (!games || games.length === 0) {
        throw new Error('No games available for processing');
      }
  
      let provider = await this.providerRepository.findOne({
        where: { slug: 'spribe' },
      });
  
      console.log("provider", provider);
  
      if (!provider) {
        const newProvider = new ProviderEntity();
        newProvider.name = 'Spribe';
        newProvider.slug = 'spribe';
        newProvider.description = 'Spribe Gaming';
        newProvider.imagePath =
          'https://images.pexels.com/photos/414612/pexels-photo-414612.jpeg';
        provider = await this.providerRepository.save(newProvider);
      }
  
      // Fix: Instead of Object.keys + map, directly map the array
      const savedGames = await Promise.all(
        games.map(async (game) => {
          const gameData = {
            gameId: game.key,
            title: game.name,
            description: game.name,
            type: 'crash',
            provider: provider, // This is now a proper Provider entity
            status: true,
            imagePath: ``,
            bannerPath: ``,
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
        })
      );
  
      return {
        games: savedGames,
      };
  
    } catch (error) {
      console.log("Error saving games:", error.message);
      throw error; // Re-throw to allow caller to handle the error
    }
  }


  // async constructGameUrl(payload: StartGameDto): Promise<any> {
  //     try {
  //       // Log the incoming payload for debugging
  //       // console.log("Payload received:", payload);
    
  //       const { gameId, language, authCode, userId, balanceType, homeUrl, clientId } = payload;
  //       await this.setKeys(clientId);
    
  //       // Fetch the game details from the repository
  //       const gameExist = await this.gameRepository.findOne({ where: { id: gameId }, relations: { provider: true }});
  //       // console.log("Game retrieved from DB:", gameExist);
    
  //       // If game doesn't exist, throw an error
  //       if (!gameExist) {
  //         console.error(`Game with ID ${gameId} not found`);
  //         return {
  //           status: HttpStatus.NOT_FOUND,
  //           message: 'Game not found',
  //           data: {},
  //         };
  //       }
  //       const currency = 'KES';

  //       const payloadData = {
  //         user: userId,
  //         token: authCode,
  //         lang: language,
  //         currency: currency,
  //         operator: this.SPRIBE_OPERATOR_KEY,
  //         return_url: homeUrl
  //       }
  
  //       const requestUrl = `${this.SPRIBE_LAUNCH_URL}/games/launch/${gameExist.gameId}?user=${userId}&token=${authCode}&lang=${language}&currency=${currency}&operator=${this.SPRIBE_OPERATOR_KEY}&return_url=${homeUrl}`;
  
  //       console.log("requestUrl", requestUrl);

  //       const securityheaders = this.generateSecurityHeaders(
  //         this.SPRIBE_OPERATOR_KEY,
  //         this.SPRIBE_SECRET_TOKEN,
  //         requestUrl,
  //         JSON.stringify(payloadData)
  //       );

  //       console.log("securityheaders", securityheaders);
  
  //       // Set up headers
  //       const headers = {
  //         'X-Spribe-Client-ID': securityheaders['X-Spribe-Client-ID'],
  //         'X-Spribe-Client-TS': securityheaders['X-Spribe-Client-TS'],
  //         'X-Spribe-Client-Signature': securityheaders['X-Spribe-Client-Signature'],
  //       };
  
  //       // console.log("val response:", val);
    
  //       // Start creating the game session
  //       const gameSession = new GameSession();
    
  //       // Setting properties of game session
  //       gameSession.balance_type = balanceType || null;
  //       gameSession.game_id = gameExist.gameId;
  //       gameSession.token = authCode || null;
  //       gameSession.session_id = authCode || null;
  //       gameSession.provider = gameExist.provider.slug;
    
  //       // Log game session data before saving
  //       // console.log("Game session data to save:", gameSession);
    
  //       // Check if token is missing or invalid
  //       if (!gameSession.token) {
  //         console.error("Auth token is missing or invalid");
  //         return {
  //           status: HttpStatus.BAD_REQUEST,
  //           message: 'Auth token is missing',
  //           data: {},
  //         };
  //       }
    
  //       // Attempt to save the game session
  //       try {
  //         await this.gameSessionRepo.save(gameSession);
  //         // console.log("Game session saved successfully", gameSession);
  //       } catch (dbError) {
  //         console.error("Error saving game session:", dbError.message);
  //         return {
  //           status: HttpStatus.INTERNAL_SERVER_ERROR,
  //           message: `Failed to save game session: ${dbError.message}`,
  //         };
  //       }
  
  //       const { data } = await this.httpService
  //       .post(requestUrl, payloadData, { headers })
  //       .toPromise();
  //       console.log("data", data);
  //       // console.log("gameUrl", data.gameURL);
    
  //       // Return the game URL from the mocked request object
  //       return { url: data.gameURL };
    
  //     } catch (error) {
  //       // Catch and log any errors that occur
  //       console.error("An error occurred:", error.message);
  //       throw new RpcException(error.message || 'Something went wrong');
  //     }
  //   }

    async constructGameUrl(payload: StartGameDto): Promise<any> {
      try {
        // Log the incoming payload for debugging
        // console.log("Payload received:", payload);
    
        const { gameId, language, authCode, userId, balanceType, homeUrl, clientId } = payload;
        await this.setKeys(clientId);
    
        // Fetch the game details from the repository
        const gameExist = await this.gameRepository.findOne({ where: { id: gameId }, relations: { provider: true }});
        // console.log("Game retrieved from DB:", gameExist);
    
        // If game doesn't exist, throw an error
        if (!gameExist) {
          console.error(`Game with ID ${gameId} not found`);
          return {
            status: HttpStatus.NOT_FOUND,
            message: 'Game not found',
            data: {},
          };
        }
        const currency = 'KES';
    
        // Create query parameters for the URL
        const queryParams = new URLSearchParams({
          user: userId.toString(),
          token: authCode,
          lang: language,
          currency: currency,
          operator: this.SPRIBE_OPERATOR_KEY,
          return_url: homeUrl
        });
    
        // Construct the base URL without query parameters
        const baseUrl = `${this.SPRIBE_LAUNCH_URL}/games/launch/${gameExist.gameId}`;
        
        // Combine to create the full URL
        const requestUrl = `${baseUrl}?${queryParams.toString()}`;
    
        console.log("requestUrl", requestUrl);
    
        // Generate security headers for a GET request (no body)
        // const securityheaders = this.generateSecurityHeaders(
        //   this.SPRIBE_OPERATOR_KEY,
        //   this.SPRIBE_SECRET_TOKEN,
        //   requestUrl,
        //   '' // No payload for GET request
        // );
    
        // console.log("securityheaders", securityheaders);
    
        // // Set up headers
        // const headers = {
        //   'X-Spribe-Client-ID': securityheaders['X-Spribe-Client-ID'],
        //   'X-Spribe-Client-TS': securityheaders['X-Spribe-Client-TS'],
        //   'X-Spribe-Client-Signature': securityheaders['X-Spribe-Client-Signature'],
        // };
    
        // Start creating the game session
        const gameSession = new GameSession();
    
        // Setting properties of game session
        gameSession.balance_type = balanceType || null;
        gameSession.game_id = gameExist.gameId;
        gameSession.token = authCode || null;
        gameSession.session_id = authCode || null;
        gameSession.provider = gameExist.provider.slug;
    
        // Check if token is missing or invalid
        if (!gameSession.token) {
          console.error("Auth token is missing or invalid");
          return {
            status: HttpStatus.BAD_REQUEST,
            message: 'Auth token is missing',
            data: {},
          };
        }
    
        // Attempt to save the game session
        try {
          await this.gameSessionRepo.save(gameSession);
        } catch (dbError) {
          console.error("Error saving game session:", dbError.message);
          return {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            message: `Failed to save game session: ${dbError.message}`,
          };
        }
    
        // Make a GET request instead of POST
        // const { data } = await this.httpService
        //   .get(requestUrl, { headers })
        //   .toPromise();
        
        // console.log("data", data);
    
        // Return the game URL from the response
        return { url: requestUrl };
    
      } catch (error) {
        // Catch and log any errors that occur
        console.error("An error occurred:", error.message);
        throw new RpcException(error.message || 'Something went wrong');
      }
    }

    async authenticate(clientId, token, callback, walletType) {
      console.log("Got to authenticate method");
      const isValid = await this.identityService.validateToken({ clientId, token });
  
      let response: any;
      const dataObject = typeof isValid.data === 'string' ? JSON.parse(isValid.data) : isValid.data;
  
      // console.log("dataObject", dataObject);
  
      if(!isValid || !isValid.status) {
        response = {
          success: false,
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid auth code, please login to try again',
          data: {
            code: 401,
            message: "User token is invalid"
          }
        }
  
        const val = await this.callbackLogRepository.update({ id: callback.id}, { response: JSON.stringify(response)});
        console.log("val", val);
  
        return response;
      } 
  
      response = {
        success: true,
        status: HttpStatus.OK,
        message: "Authentication Successful",
        data: {
          code: 200,
          message: "ok",
          data: {
            user_id: dataObject.playerId,
            username: dataObject.playerNickname || 'Test User',
            balance: parseFloat(dataObject.balance.toFixed(2)) || 0.00,
            currency: 'KES',
          }
        }
      }
  
      await this.callbackLogRepository.update({ id: callback.id}, { response: JSON.stringify(response)});
  
      return response;
  
    }

    async getBalance(clientId, player, callback, walletType) {
    console.log("Got to balance method");
    let response;

    if (player) {
      //TODO: USE PLAYER UserID AND ClientID to get balance from wallet service;
      const wallet = await this.walletService.getWallet({
        userId: player.playerId,
        clientId,
        wallet: walletType
      });

      // const wallet = {
      //   success: true,
      //   status: HttpStatus.OK,
      //   message: 'Success',
      //   data: {
      //     userId: '1',
      //     clientId: '4',
      //     casinoBonusBalance: 0.0,
      //     sportBonusBalance: 0.00,
      //     balance: 100.0,
      //     trustBalance: 0.0,
      //     availableBalance: 100.0,
      //     virtualBonusBalance: 0.0,
      //   }
      // } 

      const dataObject = typeof wallet === 'string' ? JSON.parse(wallet) : wallet;

      console.log("dataObject", dataObject);

      if (dataObject.success) {
        response = {
          success: true,
          status: HttpStatus.OK,
          message: 'Balance Success',
          data: {
            code: 200,
            message: 'ok',
            data: {
              user_id: player.playerId,
              username: player.playerNickname || 'Test User',
              balance: parseFloat(dataObject.data.balance.toFixed(2)) || 0.00,
              currency: player.currency,
            }
          },
        };
       
      } else {
        response = {
          success: false,
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Could not retrieve balance',
          data: {}
        };
      }
    } else {
      response = {
        success: false,
        status: HttpStatus.NOT_FOUND,
        message: 'Player not found',
        data: {}
      };
    }
    // update callback log response
    await this.callbackLogRepository.update({ id: callback.id}, { response: JSON.stringify(response)});

    return response;
  }

      async handleCallback(data: CallbackGameDto) {
        console.log("handle callback-data", data);

        await this.setKeys(data.clientId);
        
        const callback = await this.saveCallbackLog(data);
        console.log("callback-4", callback);
        let response;
        let body = {};
        const signature = data.signature;
    
        // Return response if already logged
        // if (callback?.response != null) {
        //     console.log("Existing callback response found. Processing it.");
    
        //     const existingRequest = JSON.parse(callback.payload);
        //     const existingResponse = JSON.parse(callback.response);
    
        //     console.log("existingRequest", existingRequest);
        //     console.log("existingResponse", existingResponse);
    
        //     return existingResponse;
      
        // } 
        // Parse the body if it exists

        const queryString = data.body.includes('?') 
        ? data.body.substring(data.body.indexOf('?')) 
        : '';
      const path = data.path + queryString;


        if (data.body) {
            try {
                body = JSON.stringify(data.body);
            } catch (error) {
                console.error('Error parsing body:', error);
                response = {
                    success: false,
                    message: 'Invalid body format',
                    status: HttpStatus.BAD_REQUEST,
                    data: { error: 5, description: 'Error' }
                };
    
                await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
                return response;
            }
        }
    
        console.log("body", body);

        const newBody = data.body ? JSON.parse(data.body) : {};

        console.log("newBody", newBody);
    
        let token = null;
    
        // Verify body is a valid URLSearchParams object
    
        // if (this.hashCheck(this.SPRIBE_OPERATOR_KEY, this.SPRIBE_SECRET_TOKEN, path, signature, newBody)) {
        //     response = {
        //         success: false,
        //         message: 'Invalid Hash Signature',
        //         status: HttpStatus.BAD_REQUEST,
        //         data: { error: 5, description: 'Error' }
        //     };

        //     await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
        //     return response;
        // }
    
        let player = null;
        let balanceType;
    
        // Handle other actions with token validation
        token = newBody.user_token ? newBody.user_token : newBody.session_token;
        console.log("user_token", token);
    
        if (token) {
            const res = await this.identityService.validateToken({ clientId: data.clientId, token });
            console.log("res", res);

            
      // const res = {
      //   success: true,
      //   message: "Success",
      //   data: {
      //     playerId: 214993,
      //     clientId: 4,
      //     playerNickname: 'pragmatic-play',
      //     sessionId: '132',
      //     balance: 9996.25,
      //     casinoBalance: 0.0,
      //     virtualBalance: 0.5,
      //     group: null,
      //     currency: 'NGN'
      //   }
        
      // };

            if (!res.success) {
                response = {
                    success: false,
                    message: 'Invalid Session ID',
                    status: HttpStatus.NOT_FOUND
                };

                await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
                return response;
            }

            if (!player) {
                player = res.data;
            }
        } else {
            response = {
                success: false,
                message: 'Token is missing',
                status: HttpStatus.BAD_REQUEST
            };

            await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
            return response;
        }
    
        const gameSession = await this.gameSessionRepo.findOne({ where: { session_id: token } });
        console.log("gameSession", gameSession);

        if (gameSession?.balance_type === 'bonus') {
            balanceType = 'casino';
        }

    
        console.log("player", player);
    
        // Handle game actions
        switch (data.action) {
            case 'auth':
                console.log("using spribe authenticate");
                return await this.authenticate(data.clientId, token, callback, balanceType);
            case 'info':
                return await this.getBalance(data.clientId, player, callback, balanceType);
            // case 'Bet':
            //     return await this.bet(data.clientId, player, callback, body, balanceType);
            // case 'Result':
            //     return await this.win(data.clientId, player, callback, body, balanceType);
            // case 'Refund':
            //     return await this.refund(data.clientId, player, callback, body, balanceType);
            default:
                return { success: false, message: 'Invalid request', status: HttpStatus.BAD_REQUEST };
        }
    }



  generateSecurityHeaders(
    clientId: string,
    clientSecret: string,
    requestUri: string,
    requestBody?: string
  ) {
    // Generate current timestamp in seconds since Unix epoch
    const timestamp = Math.floor(Date.now() / 1000).toString();
    
    // Concatenate values for signature generation
    let dataToSign = timestamp + requestUri;
    
    // Add request body for POST and PUT requests
    if (requestBody) {
      dataToSign += requestBody;
    }
    
    // Generate HMAC SHA256 signature using the client secret
    const signature = crypto
      .createHmac('sha256', clientSecret)
      .update(dataToSign)
      .digest('hex');
    
    // Return all required headers
    return {
      'X-Spribe-Client-ID': clientId,
      'X-Spribe-Client-TS': timestamp,
      'X-Spribe-Client-Signature': signature
    };

  }

  hashCheck = (clientId: string, clientSecret: string, requestUri: string, signature, requestBody?: string,  ) => {
    const hash = this.generateSecurityHeaders(clientId, clientSecret, requestUri, requestBody)['X-Spribe-Client-Signature'];

    return signature !== hash;
  };

    async saveCallbackLog(data) {
      console.log('body-data', data);
      const action = data.action;
      const body = data.body ? JSON.parse(data.body) : {};
  
      console.log('body-Callback', body);
      const transactionId = 
        action === 'auth' 
          ? body.session_token
          : action === 'info' 
            ? body.session_token
            : action === 'withdraw' 
            ? body.session_token 
            : action === 'deposit' 
            ? body.session_token
            : action === 'rollback' 
            ? body.session_token
              : body.get('transactionId');
  
      try {
        let callback;
        console.log("action", action);
        
        callback = new CallbackLog();
        callback.transactionId = transactionId;
        callback.request_type = action;
        callback.payload = JSON.stringify(body); // Convert URLSearchParams back to JSON
  
        console.log("saved-callback", callback)
  
        return await this.callbackLogRepository.save(callback);
  
      } catch(e) {
        console.log('Error saving callback log', e.message);
      }
  }

}

