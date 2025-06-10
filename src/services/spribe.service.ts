/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-const */
import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GameKey } from 'src/entities/game-key.entity';
import { CallbackGameDto, SpribeCallbackRequest, StartGameDto, SyncGameDto } from 'src/proto/gaming.pb';
import { Raw, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { CallbackLog, Game as GameEntity, GameSession, Provider as ProviderEntity } from '../entities';
import { RpcException } from '@nestjs/microservices';
import { IdentityService } from 'src/identity/identity.service';
import { WalletService } from 'src/wallet/wallet.service';
import { CreditCasinoBetRequest, PlaceCasinoBetRequest, RollbackCasinoBetRequest, SettleCasinoBetRequest } from 'src/proto/betting.pb';
import { BetService } from 'src/bet/bet.service';
import { firstValueFrom, lastValueFrom } from 'rxjs';



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
     private readonly betService: BetService,
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

        //Generate game token
        const res = await this.identityService.xpressLogin({ clientId, token: authCode });

        console.log("res", res);

        // If game doesn't exist, throw an error
        if (!res) {
          console.error(`Coud not validate player with ID ${userId}`);
          return {
            status: HttpStatus.NOT_FOUND,
            message: 'Invalid auth code',
            data: {},
          };
        };

        const user = res.data;

        const currency = 'KES';
    
        // Create query parameters for the URL
        const queryParams = new URLSearchParams({
          user: userId.toString(),
          token: user.sessionId,
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
        gameSession.session_id = user.sessionId || null;
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
    
      const isValid = await this.identityService.validateXpressSession({ clientId, sessionId: token });

      console.log("isValid", isValid);

        // const res = {
      //   success: true,
      //   message: "Success",
      //   data: {
      //     id: 19,
        //   username: '8137048054',
        //   password: '$2a$10$abvFRcypU7Eqk7s6aY7d6OUz6ZE5cYkMyqbEAxTT8ZutzfsnZtjSu',
        //   code: '231469',
        //   roleId: 13,
        //   auth_code: '1JCVJLDAF7OZZT5PQB6GZKXRRS7YAMATVOF0MI4E',
        //   virtualToken: 'NMWBRXZFQLTEHQSOHVZQM982HEGWJDRDUFYCA3E0KIZP3ON05XHJMLQFYYXO',    registrationSource: null,
        //   trackierToken: null,
        //   trackierId: null,
        //   lastLogin: '2025-05-19',    status: 1,
        //   verified: 1,
        //   pin: null,
        //   createdAt: {},
        //   updatedAt: {},
        //   clientId: 4
      //   }
        let response: any;
    
      const dataObject = typeof isValid.data === 'string' ? JSON.parse(isValid.data) : isValid.data;
  
      console.log("dataObject", dataObject);
  
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
              balance: parseFloat(dataObject.data.availableBalance.toFixed(2)) || 0.00,
              currency: 'KES',
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

    // Place Bet
    async placeBet(data: PlaceCasinoBetRequest) {
      return firstValueFrom(this.betService.placeCasinoBet(data));
    }

    // Settle Bet
    async result(data: CreditCasinoBetRequest) {
      return await firstValueFrom(this.betService.settleCasinoBet(data));
    }

    async rollback(data: RollbackCasinoBetRequest) {
        return await firstValueFrom(this.betService.cancelCasinoBet(data));
    }

    async withdraw(clientId, player, callback, body, balanceType) {
        console.log("Got to bet method");
        console.log("bet-callback", callback);
        console.log("player", player, body, balanceType);
        let response: any;
    
        if(player) {
          const gameExist = await this.gameRepository.findOne({ where: { gameId: body.game }, relations: { provider: true }});
          console.log("Game retrieved from DB:", gameExist);
      
          // If game doesn't exist, throw an error
          if (!gameExist) {
            response = {
              success: false,
              status: HttpStatus.BAD_REQUEST,
              message: `Game with id ${body.game}not Found`,
              data: {}
            }
    
            await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
            return response;
          }
    
          const getWallet = await this.walletService.getWallet({
            userId: player.playerId,
            clientId
          });
    
          console.log("getWallet", getWallet);
    
          // const getWallet = {
          //   success: true,
          //   status: HttpStatus.OK,
          //   message: 'Success',
          //   data: {
          //     userId: '1',
          //     clientId: '4',
          //     casinoBonusBalance: 0.0,
          //     sportBonusBalance: 0.00,
          //     balance: 1450.0,
          //     trustBalance: 0.0,
          //     availableBalance: 1450.0,
          //     virtualBonusBalance: 0.0,
          //   }
          // } 
    
          if(!getWallet || !getWallet.status) {
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
        
          const dataObject = typeof getWallet.data === 'string' ? JSON.parse(getWallet.data) : getWallet.data;
    
          console.log("dataObject", dataObject, body.amount);
    
          let { availableBalance, casinoBonusBalance } = dataObject;
          const betAmount = parseFloat(body.amount) / 1000;

          console.log("betAmount", betAmount);
    
          if (availableBalance < betAmount) {
              response = {
                  success: false,
                  status: HttpStatus.BAD_REQUEST,
                  message: 'Insufficient balance to place this bet',
                  data: {}
              };
              await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
              return response;
          }
    
          const placeBetPayload: PlaceCasinoBetRequest = {
            userId: player.playerId,
            clientId,
            username: player.playerNickname,
            roundId: body.action_id,
            transactionId: body.action_id,
            gameId: body.game,
            stake: betAmount,
            gameName: gameExist.title,
            gameNumber: gameExist.gameId,
            source: gameExist.provider.slug,
            winnings: 0,
            roundDetails: body.provider_tx_id
          };
    
    
          console.log("placeBetPayload", placeBetPayload);
    
          const place_bet = await this.placeBet(placeBetPayload);
    
          console.log("place_bet", place_bet);
    
          // const place_bet = {
          //   success: true,
          //   status: HttpStatus.OK,
          //   message: 'Casino Bet Placed',
          //   data: {
          //     transactionId: '123456',
          //     balance: 1450,
          //   },
          // }
    
    
        //   return {
        //     success: false,
        //     bonusId: bonusResult.id,
        //     status: 201,
        //     description: "Bonus created successfully",
        // }
    
          if (!place_bet.success) {
            response = {
              success: false,
              status: HttpStatus.INTERNAL_SERVER_ERROR,
              message: 'Place bet unsuccessful',
            };
    
            const val = await this.callbackLogRepository.update({ id: callback.id}, { response: JSON.stringify(response)});
            console.log("val", val);
      
            return response;
          }
    
          const debit = await this.walletService.debit({
            userId: player.playerId,
            clientId,
            amount: betAmount.toString(),
            source: gameExist.provider.slug,
            description: `Casino Bet: (${gameExist.title}:${body.game})`,
            username: player.playerNickname,
            wallet: balanceType,
            subject: 'Bet Deposit (Casino)',
            channel: 'web',
          });
    
          console.log("debit", debit);
    
          // const debit = {
          //   success: true,
          //   status: HttpStatus.OK,
          //   message: 'Casino Bet Placed',
          //   data: {
          //     balance: 1450.0,
          //   },
          // }
    
          if (!debit.success) {
            response = {
              success: false,
              status: HttpStatus.BAD_REQUEST,
              message: 'Error debiting user wallet',
            };
    
            const val = await this.callbackLogRepository.update({ id: callback.id}, { response: JSON.stringify(response)});
            console.log("val", val);
      
            return response;
          }
    
          const getUpdatedWallet = await this.walletService.getWallet({
            userId: player.playerId,
            clientId
          });
    
          console.log("getWallet", getUpdatedWallet);
    
          // const getUpdatedWallet = {
          //   success: true,
          //   status: HttpStatus.OK,
          //   message: 'Success',
          //   data: {
          //     userId: '1',
          //     clientId: '4',
          //     casinoBonusBalance: 0.0,
          //     sportBonusBalance: 0.00,
          //     balance: 1450.0,
          //     trustBalance: 0.0,
          //     availableBalance: 1450.0,
          //     virtualBonusBalance: 0.0,
          //   }
          // }

    
          response = {
            success: true,
            message: 'Bet Successful',
            status: HttpStatus.OK,
            data: {
              code: 200,
              message: "ok",
              data: {
                operator_tx_id: place_bet.data.transactionId,
                new_balance: parseFloat(getUpdatedWallet.data.availableBalance.toFixed(2)),
                old_balance: parseFloat(getUpdatedWallet.data.availableBalance.toFixed(2)) + betAmount,
                user_id: player.playerId,
                currency: 'KES',
                provider: body.provider,
                provider_tx_id: body.provider_tx_id,
              }
            } 
          };
    
          await this.callbackLogRepository.update({ id: callback.id}, { response: JSON.stringify(response)});
    
          console.log("bet-response", response);
    
          return response;
    
        } else {
          response = {
            success: false,
            status: HttpStatus.BAD_REQUEST,
            message: `Player with userId ${player.playerId} not found`,
            data: {}
          }
    
          await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
          return response;
        }
    }

    async deposit(clientId, player, callback, body, balanceType) {
        console.log('Got to win method');
        console.log('player', player, body, balanceType);
        let response: any;
      
        if (!player) {
          response = {
            success: false,
            status: HttpStatus.BAD_REQUEST,
            message: `Player with userId ${player.playerId} not found`,
            data: {},
          };
      
          await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
          return response;
        }
      
        const gameExist = await this.gameRepository.findOne({
          where: { gameId: body.game },
          relations: { provider: true },
        });
        console.log('Game retrieved from DB:', gameExist);
      
        if (!gameExist) {
          response = {
            success: false,
            status: HttpStatus.BAD_REQUEST,
            message: `Game with id ${body.game} not Found`,
            data: {},
          };
      
          await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
          return response;
        }
      
        let amount = parseFloat(body.amount) / 1000;
      
      
        if (amount > 0) {
          const callbackLog = await this.callbackLogRepository.findOne({
            where: {
              request_type: 'withdraw',
              payload: Raw((alias) => `${alias} LIKE '%"provider_tx_id":"${body.withdraw_provider_tx_id}"%'`),
            },
            order: { createdAt: 'DESC' },
          });
      
          if (!callbackLog) {
            console.log('Callback log not found');
            response = {
              transactionId: 0,
              error: 0,
              description: `Unsuccessful credit`,
            };
      
            await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
            return response;
          }
      
          console.log('callbackLog', callbackLog);
      
          const callbackResponse = JSON.parse(callbackLog.response);
      
          console.log('callbackResponse', callbackResponse);
      
          const settlePayload: SettleCasinoBetRequest = {
            transactionId: callbackResponse.operator_tx_id,
            winnings: amount,
          };
          const settle_bet = await this.result(settlePayload);
      
          console.log('settle_bet', settle_bet);
      
          if (!settle_bet.success) {
            response = {
              error: 120,
              description: `Unsuccessful`,
            };
            await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
            return response;
          }
      
          const creditResponse = await this.walletService.credit({
            userId: player.playerId,
            clientId,
            amount: amount,
            source: gameExist.provider.slug,
            description: `Casino Bet: (${gameExist.title})`,
            username: player.playerNickname,
            wallet: balanceType,
            subject: 'Bet Win (Casino)',
            channel: gameExist.type,
          });
      
          if (!creditResponse.success) {
            response = {
              error: 120,
              description: `Unsuccessful`,
            };
            await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
            return response;
          }
      
          console.log('creditResponse', creditResponse);
      
          const updatedWallet = await this.walletService.getWallet({
            userId: player.playerId,
            clientId,
          });
      
          console.log('updatedWallet', updatedWallet);
      
          if (!updatedWallet.success) {
            response = {
              error: 120,
              description: `Unsuccessful`,
            };
            await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
            return response;
          }
      
          response = {
            success: true,
            message: 'Win Successful',
            status: HttpStatus.OK,
           data: {
              code: 200,
              message: "ok",
              data: {
                operator_tx_id: settle_bet.data.transactionId,
                new_balance: parseFloat(updatedWallet.data.availableBalance.toFixed(2)),
                old_balance: parseFloat(updatedWallet.data.availableBalance.toFixed(2)) + amount,
                user_id: player.playerId,
                currency: 'KES',
                provider: body.provider,
                provider_tx_id: body.provider_tx_id,
              }
            }
          };
      
          await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
          return response;
        } else {
          response = {
            success: false,
            status: HttpStatus.BAD_REQUEST,
            message: `Player with userId ${player.playerId} not found`,
            data: {}
          };
    
          await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
          return response;
        }
    }

    async refund(clientId, player, callback, body, balanceType) {
        console.log("Got to refund method");
        console.log("player", player, body, balanceType);
        let response: any;
    
        if(player) {
    
          const reversePayload: RollbackCasinoBetRequest = {
            transactionId: body.rollback_provider_tx_id,
          };
    
          console.log("reversePayload", reversePayload);
    
          const callbackLog = await this.callbackLogRepository.findOne({where: {transactionId: body.provider_tx_id,}});
    
          if (!callbackLog) {
            console.log('Callback log not found')
    
            response = {
              success: true,
              message: 'Refund Unsuccessful',
              status: HttpStatus.OK,
              data: {
                transactionId: 0,
                error: 0,
                description: `Unsuccessful rollback`,
              },
            };
    
    
            // response = {
            //   transactionId: 0,
            //   error: 0,
            //   description: `Unsuccessful rollback`,
            // }
      
            await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
            return response;
    
          }
    
          const callbackPayload = JSON.parse(callbackLog.payload); 
    
          const gameExist = await this.gameRepository.findOne({ where: { gameId: callbackPayload.gameId }, relations: { provider: true }});
          console.log("Game retrieved from DB:", gameExist);
      
          // // If game doesn't exist, throw an error
          if (!gameExist) {
            response = {
              success: false,
              status: HttpStatus.BAD_REQUEST,
              message: `Game with id ${body.game}not Found`,
              data: {}
            }
    
            await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
            return response;
          }
    
          // console.log('update ticket')
          const transaction = await this.rollback(reversePayload);
    
          // const transaction = {
          //   success: true,
          //   status: HttpStatus.OK,
          //   message: 'Casino Bet Placed',
          //   data: {
          //     transactionId: '123456',
          //     balance: 756,
          //   },
          // }
    
          if (!transaction.success) {
            console.log('transaction error')
            response = {
              success: true,
              message: 'Refund Unsuccessful',
              status: HttpStatus.OK,
              data: {
                transactionId: 0,
                error: 0,
                description: `Unsuccessful rollback`,
              },
            };
      
            await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
            return response;
          }
    
          const rollbackWalletRes = await this.walletService.credit({
            userId: player.playerId,
            clientId,
            amount: callbackPayload.amount,
            source: gameExist.provider.slug,
            description: `Bet Cancelled: (${gameExist.title})`,
            username: player.playerNickname,
            wallet: balanceType,
            subject: 'Bet refund (Casino)',
            channel: gameExist.title,
          });
    
          // const rollbackWalletRes = {
          //   success: true,
          //   status: HttpStatus.OK,
          //   message: 'Casino Bet Placed',
          //   data: {
          //     userId: 11,
          //     balance: 11,
          //     availableBalance: 11,
          //     trustBalance: 11,
          //     sportBonusBalance: 22,
          //     virtualBonusBalance: 11,
          //     casinoBonusBalance: 1
          //   },
          // }
    
          console.log('rollbackWalletRes', rollbackWalletRes);
    
          if (!rollbackWalletRes.success) {
            console.log('transaction error')
            response = {
              success: true,
              message: 'Refund Unsuccessful',
              status: HttpStatus.OK,
              data: {
                transactionId: 0,
                error: 0,
                description: `Unsuccessful rollback`,
              },
            };
      
            await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
            return response;
          }

          const updatedWallet = await this.walletService.getWallet({
            userId: player.playerId,
            clientId,
          });
      
          console.log('updatedWallet', updatedWallet);
      
          if (!updatedWallet.success) {
            response = {
              error: 120,
              description: `Unsuccessful`,
            };
            await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
            return response;
          }

          response = {
            success: true,
            message: 'Refund Successful',
            status: HttpStatus.OK,
           data: {
              code: 200,
              message: "ok",
              data: {
                operator_tx_id: transaction.data.transactionId,
                new_balance: parseFloat(updatedWallet.data.availableBalance.toFixed(2)),
                old_balance: parseFloat(updatedWallet.data.availableBalance.toFixed(2)) + parseFloat(callbackPayload.amount),
                user_id: player.playerId,
                currency: 'KES',
                provider: body.provider,
                provider_tx_id: body.provider_tx_id,
              }
            }
          };
    
          await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
          return response;
    
          
        } else {
          response = {
            success: false,
            status: HttpStatus.BAD_REQUEST,
            message: `Player with userId ${player.playerId} not found`,
            data: {}
          }
    
          await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
          return response;
        }
      
      }

    async handleCallback(data: CallbackGameDto) {
        console.log("handle callback-data", data);

        await this.setKeys(data.clientId);
        
        const callback = await this.saveCallbackLog(data);
        console.log("callback-4", callback);
        let response;
        let body = {};
        const signature = data.signature;
    
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
        let sessionId = null;
    
        // Handle other actions with token validation
        sessionId = newBody.user_token ? newBody.user_token : newBody.session_token;
        console.log("sessionId", sessionId);
    
        if (sessionId) {
            const responseData = await this.identityService.validateXpressSession({ clientId: data.clientId, sessionId: token });
            console.log("res", responseData);

            
      // const res = {
      //   success: true,
      //   message: "Success",
      //   data: {
      //     id: 19,
        //   username: '8137048054',
        //   password: '$2a$10$abvFRcypU7Eqk7s6aY7d6OUz6ZE5cYkMyqbEAxTT8ZutzfsnZtjSu',
        //   code: '231469',
        //   roleId: 13,
        //   auth_code: '1JCVJLDAF7OZZT5PQB6GZKXRRS7YAMATVOF0MI4E',
        //   virtualToken: 'NMWBRXZFQLTEHQSOHVZQM982HEGWJDRDUFYCA3E0KIZP3ON05XHJMLQFYYXO',    registrationSource: null,
        //   trackierToken: null,
        //   trackierId: null,
        //   lastLogin: '2025-05-19',    status: 1,
        //   verified: 1,
        //   pin: null,
        //   createdAt: {},
        //   updatedAt: {},
        //   clientId: 4
      //   }
        

            if (!responseData.success) {
                response = {
                    success: false,
                    message: 'Invalid Session ID',
                    status: HttpStatus.NOT_FOUND
                };

                await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
                return response;
            }

            const res = await this.identityService.validateToken({ clientId: data.clientId, token: responseData.data.auth_code });

            
            if (!res.success) {
                response = {
                    success: false,
                    message: 'Invalid Session ID',
                    status: HttpStatus.NOT_FOUND
                };

                await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
                return response;
            }

            token = res.data.auth_code;
            console.log("token", token);

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
            case 'withdraw':
                return await this.withdraw(data.clientId, player, callback, newBody, balanceType);
            case 'deposit':
                return await this.deposit(data.clientId, player, callback, newBody, balanceType);
            case 'rollback':
                return await this.refund(data.clientId, player, callback, newBody, balanceType);
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
            ? body.provider_tx_id 
            : action === 'deposit' 
            ? body.provider_tx_id 
            : action === 'rollback' 
            ? body.session_token
              : body.transactionId;
  
      try {
        let callback;
        console.log("action", action);

        callback = await this.callbackLogRepository.findOne({
          where: { transactionId },
        });

        console.log("callback-idem", callback);
  
        if (callback) return callback;
        
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

