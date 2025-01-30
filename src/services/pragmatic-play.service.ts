/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-const */
import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { BetService } from 'src/bet/bet.service';
import { generateTrxNo } from 'src/common';
import { CasinoGame } from 'src/entities/casino-game.entity';
import { IdentityService } from 'src/identity/identity.service';
import { CreditCasinoBetRequest, PlaceCasinoBetRequest, RollbackCasinoBetRequest, SettleCasinoBetRequest } from 'src/proto/betting.pb';
import { CallbackGameDto, StartGameDto } from 'src/proto/gaming.pb';
import { WalletService } from 'src/wallet/wallet.service';
import { Raw, Repository } from 'typeorm';
import { CallbackLog, Game as GameEntity, GameSession, Provider as ProviderEntity } from '../entities';


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
    @InjectRepository(GameSession)
    private gameSessionRepo: Repository<GameSession>,
    @InjectRepository(CasinoGame)
    private casinoGameRepository: Repository<CasinoGame>,
    private readonly betService: BetService,
    private readonly walletService: WalletService,
    private readonly identityService: IdentityService,
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

  async getActiveJackpotFeeds(): Promise<any> {
    try {
      const hash = this.genHash({ secureLogin: this.PRAGMATIC_SECURE_LOGIN });
      const { data } = await this.httpService
        .post(`${this.PRAGMATIC_BASEURL}/JackpotFeeds/extended/jackpots?login=${this.PRAGMATIC_SECURE_LOGIN}&hash=${hash}`)
        .toPromise();

        console.log('data', data);

      return data;
    } catch (e) {
      return new RpcException(e.messag || 'Something went wrong')
    }
  }

  async getJackpotWinners(): Promise<any> {
    try {
      const hash = this.genHash({ secureLogin: this.PRAGMATIC_SECURE_LOGIN });
      const { data } = await this.httpService
        .post(`${this.PRAGMATIC_BASEURL}/JackpotFeeds/extended/jackpots?login=${this.PRAGMATIC_SECURE_LOGIN}&hash=${hash}`)
        .toPromise();

        console.log('data', data);

      return data;
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


  async constructGameUrl(payload: StartGameDto): Promise<any> {
    try {
      // Log the incoming payload for debugging
      console.log("Payload received:", payload);
  
      const { gameId, language, authCode, userId, demo, balanceType, homeUrl } = payload;
  
      // Fetch the game details from the repository
      const gameExist = await this.gameRepository.findOne({ where: { id: gameId }, relations: { provider: true }});
      console.log("Game retrieved from DB:", gameExist);
  
      // If game doesn't exist, throw an error
      if (!gameExist) {
        console.error(`Game with ID ${gameId} not found`);
        throw new NotFoundException('Game not found');
      }
  
      // Generate the hash for the game session
      const hash = this.genHash({
        secureLogin: this.PRAGMATIC_SECURE_LOGIN,
        symbol: gameExist.gameId,
        lobbyUrl: homeUrl,
        language: language,
        externalPlayerId: userId,
        token: authCode,
        ...(demo && { playMode: "DEMO" })
      });

      console.log("Generated hash:", hash);

      const playMode = demo ? 'playMode=DEMO' : '';

      const request = this.httpService.post(
        `${this.PRAGMATIC_BASEURL}/game/url?secureLogin=${this.PRAGMATIC_SECURE_LOGIN}&symbol=${gameExist.gameId}&language=${language}&externalPlayerId=${userId}&token=${authCode}&hash=${hash}&${playMode}&lobbyUrl=${homeUrl}`,
      );

      console.log("Request response:", request);

      const val = await lastValueFrom(request);

      console.log("val response:", val);
  
      // Start creating the game session
      const gameSession = new GameSession();
  
      // Setting properties of game session
      gameSession.balance_type = balanceType || null;
      gameSession.game_id = gameExist.gameId;
      gameSession.token = authCode || null;
      gameSession.session_id = authCode || null;
      gameSession.provider = gameExist.provider.slug;
  
      // Log game session data before saving
      console.log("Game session data to save:", gameSession);
  
      // Check if token is missing or invalid
      if (!gameSession.token) {
        console.error("Auth token is missing or invalid");
        throw new Error('Auth token is missing');
      }
  
      // Attempt to save the game session
      try {
        await this.gameSessionRepo.save(gameSession);
        console.log("Game session saved successfully", gameSession);
      } catch (dbError) {
        console.error("Error saving game session:", dbError.message);
        throw new Error(`Failed to save game session: ${dbError.message}`);
      }

      const { data } = await lastValueFrom(request);
      console.log("data", data);
      console.log("gameUrl", data.gameURL);
  
      // Return the game URL from the mocked request object
      return { url: data.gameURL };
  
    } catch (error) {
      // Catch and log any errors that occur
      console.error("An error occurred:", error.message);
      throw new RpcException(error.message || 'Something went wrong');
    }
  }
  
  async authenticate(clientId, token, callback, walletType) {
    console.log("Got to authenticate method");
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
      message: "Authentication Successful",
      data: {
        userId: dataObject.playerId,
        cash: walletType === 'casino' ? dataObject.casinoBalance.toFixed(2) : dataObject.balance.toFixed(2),
        currency: dataObject.currency,
        bonus: dataObject.casinoBalance,
        token: token,
        error: 0,
        description: 'Success',
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
            cash:  parseFloat(dataObject.data.availableBalance.toFixed(2)),
            bonus: parseFloat(dataObject.data.casinoBonusBalance.toFixed(2)),
            currency: player.currency,
            error: 0,
            description: 'Success',
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

  async bet(clientId, player, callback, body, balanceType) {
    console.log("Got to bet method");
    console.log("bet-callback", callback);
    console.log("player", player, body, balanceType);
    let response: any;

    if(player) {
      const gameExist = await this.gameRepository.findOne({ where: { gameId: body.get('gameId') }, relations: { provider: true }});
      console.log("Game retrieved from DB:", gameExist);
  
      // If game doesn't exist, throw an error
      if (!gameExist) {
        response = {
          success: false,
          status: HttpStatus.BAD_REQUEST,
          message: `Game with id ${body.get('gameId')}not Found`,
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

      console.log("dataObject", dataObject, body.get('amount'));

      // let {availableBalance, casinoBonusBalance } = dataObject;

      // if(dataObject.availableBalance < body.get('amount')) {
      //   response = {
      //     success: false,
      //     status: HttpStatus.BAD_REQUEST,
      //     message: 'Insufficient balance to place this bet',
      //     data: {}
      //   }
  
      //   const val = await this.callbackLogRepository.update({ id: callback.id}, { response: JSON.stringify(response)});
      //   console.log("val", val);
  
      //   return response;
      // }

      let { availableBalance, casinoBonusBalance } = dataObject;
      const betAmount = parseFloat(body.get('amount'));
      let usedPromo = 0;
      let cashUsed = 0;

      if (balanceType === 'bonus') {
          if (casinoBonusBalance >= betAmount) {
              usedPromo = betAmount;
          } else if (casinoBonusBalance > 0 && casinoBonusBalance < betAmount && availableBalance >= (betAmount - casinoBonusBalance)) {
              usedPromo = casinoBonusBalance;
              cashUsed = betAmount - casinoBonusBalance;
          } else if (availableBalance >= betAmount) {
              cashUsed = betAmount;
          } else {
              response = {
                  success: false,
                  status: HttpStatus.BAD_REQUEST,
                  message: 'Insufficient balance to place this bet',
                  data: {}
              };
              await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
              return response;
          }
      } else {
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
          cashUsed = betAmount;
      }

      const placeBetPayload: PlaceCasinoBetRequest = {
        userId: player.playerId,
        clientId,
        username: player.playerNickname,
        roundId: body.get('roundId'),
        transactionId: body.get('reference'),
        gameId: body.get('gameId'),
        stake: parseFloat(body.get('amount')),
        gameName: gameExist.title,
        gameNumber: gameExist.gameId,
        source: gameExist.provider.slug,
        winnings: 0,
        roundDetails: body.get('roundDetails')
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
        amount: body.get('amount'),
        source: gameExist.provider.slug,
        description: `Casino Bet: (${gameExist.title}:${body.get('reference')})`,
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
          cash: parseFloat(getUpdatedWallet.data.availableBalance.toFixed(2)),
          transactionId: place_bet.data.transactionId,
          currency: player.currency,
          bonus: balanceType === 'bonus' ? parseFloat(getUpdatedWallet.data.casinoBonusBalance.toFixed(2)) : 0.00,
          usedPromo: balanceType === 'bonus' ? parseFloat(body.get('amount')) : 0.00,
          error: 0,
          description: 'Successful',
          },
      };

      // response = {
      //     cash: parseFloat(getUpdatedWallet.data.availableBalance.toFixed(2)),
      //     transactionId: place_bet.data.transactionId,
      //     currency: player.currency,
      //     bonus: parseFloat(getUpdatedWallet.data.casinoBonusBalance.toFixed(2)) || 0.00,
      //     usedPromo: balanceType === 'casino' ? parseFloat(body.get('amount')) : 0.00,
      //     error: 0,
      //     description: 'Successful',
      // };

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

  // async win(clientId, player, callback, body, balanceType) {
  //   console.log("Got to win method");
  //   console.log("player", player, body, balanceType);
  //   let response: any;

  //   if(player) {
  //     const gameExist = await this.gameRepository.findOne({ where: { gameId: body.get('gameId') }, relations: { provider: true }});
  //     console.log("Game retrieved from DB:", gameExist);
  
  //     // If game doesn't exist, throw an error
  //     if (!gameExist) {
  //       response = {
  //         success: false,
  //         status: HttpStatus.BAD_REQUEST,
  //         message: `Game with id ${body.get('gameId')}not Found`,
  //         data: {}
  //       }

  //       await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //       return response;
  //     }

  //     if (parseFloat(body.get('amount')) > 0) {
  //       // const callbackLog = await this.callbackLogRepository.findOne({where: {transactionId: body.get('roundId'), request_type: 'Bet' }});

  //       const callbackLog = await this.callbackLogRepository.findOne({
  //         where: {
  //           request_type: 'Bet',
  //           payload: Raw((alias) => `${alias} LIKE '%"roundId":"${body.get('roundId')}"%'`),
  //         },
  //       });

  //       if (!callbackLog) {
  //         console.log('Callback log not found')
  //         response = {
  //           transactionId: 0,
  //           error: 0,
  //           description: `Unsuccessful credit`,
  //         }
    
  //         await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //         return response;
  
  //       }

  //       console.log('callbackLog', callbackLog);

  //       const callbackPayload = JSON.parse(callbackLog.payload); 

  //       console.log("callbackResponse", callbackPayload);

  //       const settlePayload: SettleCasinoBetRequest = {
  //         transactionId: callbackPayload.reference,
  //         winnings: parseFloat(body.get('amount')),
  //       };
  //       const settle_bet = await this.result(settlePayload);

  //       console.log("settle_bet", settle_bet);

  //       // console.log(settle_bet)
  //       if (!settle_bet.success) {
  //         response =  {
  //         error: 120,
  //         description: `Unsuccessful`,
  //       };
  //         // update callback log response
  //         await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //         return response;
  //       }

  //       const creditResponse = await this.walletService.credit({
  //         userId: player.playerId,
  //         clientId,
  //         amount: parseFloat(body.get('amount')),
  //         source: gameExist.provider.slug,
  //         description: `Casino Bet: (${gameExist.title})`,
  //         username: player.playerNickname,
  //         wallet: balanceType,
  //         subject: 'Bet Win (Casino)',
  //         channel: gameExist.type,
  //       });

  //       if(!creditResponse.success) {
  //         response =  {
  //           error: 120,
  //           description: `Unsuccessful`,
  //         };
  //         // update callback log response
  //         await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //         return response;

  //       }

  //       console.log("creditResponse", creditResponse);

  //       const geUpdatedtWallet = await this.walletService.getWallet({
  //         userId: player.playerId,
  //         clientId,
  //       });

  //       console.log("geUpdatedtWallet", geUpdatedtWallet);

  //       if (!geUpdatedtWallet.success) {
  //         response =  {
  //           error: 120,
  //           description: `Unsuccessful`,
  //         };
  //         // update callback log response
  //         await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //         return response;
  //        }

  //       response = {
  //         success: true,
  //         message: 'Win Successful',
  //         status: HttpStatus.OK,
  //         data: {
  //             cash: parseFloat(creditResponse.data.balance.toFixed(2)),
  //             transactionId: settle_bet.data.transactionId,
  //             currency: player.currency,
  //             bonus: parseFloat(geUpdatedtWallet.data.casinoBonusBalance.toFixed(2)),
  //             error: 0,
  //             description: 'Successful',
  //           },
  //       };

  //       await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //       return response;
  //     } else {
  //       const payload: SettleCasinoBetRequest = {
  //         transactionId: body.get('reference'),
  //         winnings: parseFloat(body.get('amount')),
  //       };

  //        // settle won bet
  //        const close_bet = await this.betService.closeRound(payload);

  //        console.log("close_bet", close_bet);

  //        if (!close_bet.success) {
  //         response = {
  //           error: 120,
  //           description: `Unsuccessful`,
  //         };
  //         // update callback log response
  //         await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //         return response;
  //        }

  //        const getWallet = await this.walletService.getWallet({
  //         userId: player.playerId,
  //         clientId,
  //       });

  //       console.log("getWallet", getWallet);

  //       if (!getWallet.success) {
  //         response = {
  //           error: 120,
  //           description: `Unsuccessful`,
  //         };
  //         // update callback log response
  //         await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //         return response;
  //        }

  //       response = {
  //         success: true,
  //         message: 'Win Successful',
  //         status: HttpStatus.OK,
  //         data: {
  //             cash: getWallet.data.balance.toFixed(2),
  //             transactionId: close_bet.data.transactionId,
  //             currency: player.currency,
  //             bonus: getWallet.data.casinoBonusBalance.toFixed(2),
  //             error: 0,
  //             description: 'Successful',
  //           },
  //       };

  //       await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //       return response;
      
  //     }
  //   } else {
  //     response = {
  //       success: false,
  //       status: HttpStatus.BAD_REQUEST,
  //       message: `Player with userId ${player.playerId} not found`,
  //       data: {}
  //     }

  //     await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //     return response;
  //   }
  
  // }

  // async bonusWin(clientId, player, callback, body, balanceType) {
  //   console.log("Got to bonus win method");
  //   console.log("player", player, body, balanceType);
  //   let response: any;

  //   if(player) {
  //     if (parseFloat(body.get('amount')) > 0) {

  //       const callbackLog = await this.callbackLogRepository.findOne({
  //         where: {
  //           request_type: 'Result',
  //           payload: Raw((alias) => `${alias} LIKE '%"bonusCode":"${body.get('bonusCode')}"%'`),
  //         },
  //       });

  //       const creditResponse = await this.walletService.credit({
  //         userId: player.playerId,
  //         clientId,
  //         amount: parseFloat(body.get('amount')),
  //         source: 'pragmatic-play',
  //         description: `Bonus Win: ()`,
  //         username: player.playerNickname,
  //         wallet: balanceType,
  //         subject: 'Bonus Win (Pragmatic-play)',
  //         channel: 'pragmatic-play',
  //       });

  //       if(!creditResponse.success) {
  //         response = {
  //           success: false,
  //           message: 'Unable to complete request ' + creditResponse.message,
  //           status: HttpStatus.INTERNAL_SERVER_ERROR,
  //           data: {
  //             status: "error",
  //             error: {
  //               message: 'Unable to complete request',
  //               scope: "internal",
  //               no_refund: "1",
  //             }
  //           },
  //         };
  //         // update callback log response
  //         await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //         return response;

  //       }

  //       const transactionNo = generateTrxNo();

  //       console.log("creditResponse", creditResponse);

  //       const geUpdatedtWallet = await this.walletService.getWallet({
  //         userId: player.playerId,
  //         clientId,
  //       });

  //       console.log("geUpdatedtWallet", geUpdatedtWallet);

  //       if (!geUpdatedtWallet.success) {
  //         response = {
  //           success: false,
  //           message: 'Unable to complete request ' + geUpdatedtWallet.message,
  //           status: HttpStatus.INTERNAL_SERVER_ERROR,
  //           data: {
  //             status: "error",
  //             error: {
  //               message: 'Unable to complete request',
  //               scope: "internal",
  //               no_refund: "1",
  //             }
  //           },
  //         };
  //         // update callback log response
  //         await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //         return response;
  //        }

  //       response = {
  //         success: true,
  //         message: 'Bonus Win Successful',
  //         status: HttpStatus.OK,
  //         data: {
  //             cash: parseFloat(geUpdatedtWallet.data.availableBalance.toFixed(2)),
  //             transactionId: transactionNo,
  //             currency: player.currency,
  //             bonus: parseFloat(geUpdatedtWallet.data.casinoBonusBalance.toFixed(2)),
  //             error: 0,
  //             description: 'Successful',
  //           },
  //       };

  //       await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //       return response;
  //     }
  //   } else {
  //     response = {
  //       success: false,
  //       status: HttpStatus.BAD_REQUEST,
  //       message: `Player with userId ${player.playerId} not found`,
  //       data: {}
  //     }

  //     await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //     return response;
  //   }
  
  // }

  // async win(clientId, player, callback, body, balanceType) {
  //   console.log("Got to win method");
  //   console.log("player", player, body, balanceType);
  //   let response: any;

  //   if (player) {
  //     const gameExist = await this.gameRepository.findOne({ where: { gameId: body.get('gameId') }, relations: { provider: true }});
  //     console.log("Game retrieved from DB:", gameExist);

  //     // If game doesn't exist, throw an error
  //     if (!gameExist) {
  //       response = {
  //         success: false,
  //         status: HttpStatus.BAD_REQUEST,
  //         message: `Game with id ${body.get('gameId')} not Found`,
  //         data: {}
  //       };

  //       await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //       return response;
  //     }

  //     let amount = parseFloat(body.get('amount'));

  //     // Check if promoWin exists and is greater than 0, add it to the amount if so
  //     const promoWin = parseFloat(body.get('promoWinAmount') || '0');
  //     if (promoWin > 0) {
  //       amount += promoWin;  // Add promoWin to the amount
  //     }

  //     if (amount > 0) {
  //       const callbackLog = await this.callbackLogRepository.findOne({
  //         where: {
  //           request_type: 'Bet',
  //           payload: Raw((alias) => `${alias} LIKE '%"roundId":"${body.get('roundId')}"%'`),
  //         },
  //       });

  //       if (!callbackLog) {
  //         console.log('Callback log not found');
  //         response = {
  //           transactionId: 0,
  //           error: 0,
  //           description: `Unsuccessful credit`,
  //         };

  //         await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //         return response;
  //       }

  //       console.log('callbackLog', callbackLog);

  //       const callbackPayload = JSON.parse(callbackLog.payload);

  //       console.log("callbackResponse", callbackPayload);

  //       const settlePayload: SettleCasinoBetRequest = {
  //         transactionId: callbackPayload.reference,
  //         winnings: amount,
  //       };
  //       const settle_bet = await this.result(settlePayload);

  //       console.log("settle_bet", settle_bet);

  //       if (!settle_bet.success) {
  //         response = {
  //           error: 120,
  //           description: `Unsuccessful`,
  //         };
  //         await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //         return response;
  //       }

  //       const creditResponse = await this.walletService.credit({
  //         userId: player.playerId,
  //         clientId,
  //         amount: amount,
  //         source: gameExist.provider.slug,
  //         description: `Casino Bet: (${gameExist.title})`,
  //         username: player.playerNickname,
  //         wallet: balanceType,
  //         subject: 'Bet Win (Casino)',
  //         channel: gameExist.type,
  //       });

  //       if (!creditResponse.success) {
  //         response = {
  //           error: 120,
  //           description: `Unsuccessful`,
  //         };
  //         await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //         return response;
  //       }

  //       console.log("creditResponse", creditResponse);

  //       const geUpdatedtWallet = await this.walletService.getWallet({
  //         userId: player.playerId,
  //         clientId,
  //       });

  //       console.log("geUpdatedtWallet", geUpdatedtWallet);

  //       if (!geUpdatedtWallet.success) {
  //         response = {
  //           error: 120,
  //           description: `Unsuccessful`,
  //         };
  //         await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //         return response;
  //       }

  //       response = {
  //         success: true,
  //         message: 'Win Successful',
  //         status: HttpStatus.OK,
  //         data: {
  //           cash: parseFloat(creditResponse.data.balance.toFixed(2)),
  //           transactionId: settle_bet.data.transactionId,
  //           currency: player.currency,
  //           bonus: parseFloat(geUpdatedtWallet.data.casinoBonusBalance.toFixed(2)),
  //           error: 0,
  //           description: 'Successful',
  //         },
  //       };

  //       await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //       return response;
  //     } else {
  //       const payload: SettleCasinoBetRequest = {
  //         transactionId: body.get('reference'),
  //         winnings: amount,
  //       };

  //       // settle won bet
  //       const close_bet = await this.betService.closeRound(payload);

  //       console.log("close_bet", close_bet);

  //       if (!close_bet.success) {
  //         response = {
  //           error: 120,
  //           description: `Unsuccessful`,
  //         };
  //         await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //         return response;
  //       }

  //       const getWallet = await this.walletService.getWallet({
  //         userId: player.playerId,
  //         clientId,
  //       });

  //       console.log("getWallet", getWallet);

  //       if (!getWallet.success) {
  //         response = {
  //           error: 120,
  //           description: `Unsuccessful`,
  //         };
  //         await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //         return response;
  //       }

  //       response = {
  //         success: true,
  //         message: 'Win Successful',
  //         status: HttpStatus.OK,
  //         data: {
  //           cash: getWallet.data.balance.toFixed(2),
  //           transactionId: close_bet.data.transactionId,
  //           currency: player.currency,
  //           bonus: getWallet.data.casinoBonusBalance.toFixed(2),
  //           error: 0,
  //           description: 'Successful',
  //         },
  //       };

  //       await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //       return response;
  //     }
  //   } else {
  //     response = {
  //       success: false,
  //       status: HttpStatus.BAD_REQUEST,
  //       message: `Player with userId ${player.playerId} not found`,
  //       data: {}
  //     };

  //     await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //     return response;
  //   }
  // }

  async win(clientId, player, callback, body, balanceType) {
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
      where: { gameId: body.get('gameId') },
      relations: { provider: true },
    });
    console.log('Game retrieved from DB:', gameExist);
  
    if (!gameExist) {
      response = {
        success: false,
        status: HttpStatus.BAD_REQUEST,
        message: `Game with id ${body.get('gameId')} not Found`,
        data: {},
      };
  
      await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
      return response;
    }
  
    let amount = parseFloat(body.get('amount'));
  
    const promoWin = parseFloat(body.get('promoWinAmount') || '0');
    if (promoWin > 0) {
      amount += promoWin;
    }
  
    if (amount > 0) {
      const callbackLog = await this.callbackLogRepository.findOne({
        where: {
          request_type: 'Bet',
          payload: Raw((alias) => `${alias} LIKE '%"roundId":"${body.get('roundId')}"%'`),
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
  
      const callbackPayload = JSON.parse(callbackLog.payload);
  
      console.log('callbackResponse', callbackPayload);
  
      const settlePayload: SettleCasinoBetRequest = {
        transactionId: callbackPayload.reference,
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
          cash: parseFloat(creditResponse.data.balance.toFixed(2)),
          transactionId: settle_bet.data.transactionId,
          currency: player.currency,
          bonus: parseFloat(updatedWallet.data.casinoBonusBalance.toFixed(2)),
          error: 0,
          description: 'Successful',
        },
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
  

  async bonusWin(clientId, player, callback, body, balanceType) {
    console.log("Got to bonus win method");
    console.log("player", player, body, balanceType);

    let response: any;

    if (player) {
      // Retrieve callback logs with matching bonusCode
      const callbackLogs = await this.callbackLogRepository.find({
        where: {
          request_type: 'Result',
          payload: Raw(
            (alias) => `${alias} LIKE '%"bonusCode":"${body.get('bonusCode')}"%'`
          ),
        },
        order: { createdAt: 'DESC' }, // Order by latest
      });

      if (callbackLogs.length > 0) {
        // Return the response of the last matched callback log
        const lastCallback = callbackLogs[0];
        if (lastCallback.response) {
          return JSON.parse(lastCallback.response);
        }
      }

      // Proceed to credit the user's wallet if no match is found
      const creditResponse = await this.walletService.credit({
        userId: player.playerId,
        clientId,
        amount: parseFloat(body.get('amount')),
        source: 'pragmatic-play',
        description: `Bonus Win: ()`,
        username: player.playerNickname,
        wallet: balanceType,
        subject: 'Bonus Win (Pragmatic-play)',
        channel: 'pragmatic-play',
      });

      if (!creditResponse.success) {
        response = {
          success: true,
          message: 'Unable to complete request ' + creditResponse.message,
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          data: {
            status: 'error',
            error: {
              message: 'Unable to complete request',
              scope: 'internal',
              no_refund: '1',
            },
          },
        };
        await this.callbackLogRepository.update(
          { id: callback.id },
          { response: JSON.stringify(response) }
        );
        return response;
      }

      const transactionNo = generateTrxNo();

      console.log("creditResponse", creditResponse);

      const geUpdatedWallet = await this.walletService.getWallet({
        userId: player.playerId,
        clientId,
      });

      console.log("geUpdatedWallet", geUpdatedWallet);

      if (!geUpdatedWallet.success) {
        response = {
          success: true,
          message: 'Unable to complete request ' + geUpdatedWallet.message,
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          data: {
            status: 'error',
            error: {
              message: 'Unable to complete request',
              scope: 'internal',
              no_refund: '1',
            },
          },
        };
        await this.callbackLogRepository.update(
          { id: callback.id },
          { response: JSON.stringify(response) }
        );
        return response;
      }

      response = {
        success: true,
        message: 'Bonus Win Successful',
        status: HttpStatus.OK,
        data: {
          cash: parseFloat(geUpdatedWallet.data.availableBalance.toFixed(2)),
          transactionId: transactionNo,
          currency: player.currency,
          bonus: parseFloat(geUpdatedWallet.data.casinoBonusBalance.toFixed(2)),
          error: 0,
          description: 'Successful',
        },
      };

      await this.callbackLogRepository.update(
        { id: callback.id },
        { response: JSON.stringify(response) }
      );
      return response;
    } else {
      response = {
        success: true,
        status: HttpStatus.BAD_REQUEST,
        message: `Player with userId ${player.playerId} not found`,
        data: {},
      };

      await this.callbackLogRepository.update(
        { id: callback.id },
        { response: JSON.stringify(response) }
      );
      return response;
    }
}

  async promoWin(clientId, player, callback, body, balanceType) {
    console.log("Got to promo win method");
    console.log("player", player, body, balanceType);
    let response: any;

    if(player) {
        const creditResponse = await this.walletService.credit({
          userId: player.playerId,
          clientId,
          amount: parseFloat(body.get('amount')),
          source: 'pragmatic-play',
          description: `Promo Win`,
          username: player.playerNickname,
          wallet: 'main',
          subject: 'Promo Win (Pragmatic-play)',
          channel: 'pragmatic-play',
        });

        console.log("creditResponse", creditResponse);

        if(!creditResponse.success) {
          response = {
            success: true,
            message: 'Unable to complete request ' + creditResponse.message,
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            data: {
                message: 'Unable to complete request',
                scope: "internal",
                no_refund: "1",
              }
          };
          // update callback log response
          await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
          return response;

        }

        const transactionNo = generateTrxNo();

        const geUpdatedtWallet = await this.walletService.getWallet({
          userId: player.playerId,
          clientId,
        });

        console.log("geUpdatedtWallet", geUpdatedtWallet);

        if (!geUpdatedtWallet.success) {
          response = {
            success: true,
            message: 'Unable to complete request ' + geUpdatedtWallet.message,
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            data: {
                message: 'Unable to complete request',
                scope: "internal",
                no_refund: "1",
              }
          };
          // update callback log response
          await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
          return response;
         }

        response = {
          success: true,
          message: 'Promo Win Successful',
          status: HttpStatus.OK,
          data: {
              cash: parseFloat(geUpdatedtWallet.data.availableBalance.toFixed(2)),
              transactionId: transactionNo,
              currency: player.currency,
              bonus: parseFloat(geUpdatedtWallet.data.casinoBonusBalance.toFixed(2)),
              error: 0,
              description: 'Successful',
            },
        };

        await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
        return response;
    } else {
      response = {
        success: true,
        status: HttpStatus.BAD_REQUEST,
        message: `Player with userId ${player.playerId} not found`,
        data: {}
      }

      await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
      return response;
    }
  
  }

  // async jackpotWin(clientId, player, callback, body, balanceType) {
  //   console.log("Got to jackpot win method");
  //   console.log("player", player, body, balanceType);
  //   let response: any;

  //   if(player) {
  //     if (parseFloat(body.get('amount')) > 0) {

  //       const creditResponse = await this.walletService.credit({
  //         userId: player.playerId,
  //         clientId,
  //         amount: parseFloat(body.get('amount')),
  //         source: 'pragmatic-play',
  //         description: `Jackpot Win: ()`,
  //         username: player.playerNickname,
  //         wallet: balanceType,
  //         subject: 'Jackpot Win (Pragmatic-play)',
  //         channel: 'pragmatic-play',
  //       });

  //       console.log("creditResponse", creditResponse);

  //       if(!creditResponse.success) {
  //         response = {
  //           success: true,
  //           message: 'Unable to complete request ' + creditResponse.message,
  //           status: HttpStatus.INTERNAL_SERVER_ERROR,
  //           data: {
  //             status: "error",
  //             error: {
  //               message: 'Unable to complete request',
  //               scope: "internal",
  //               no_refund: "1",
  //             }
  //           },
  //         };
  //         // update callback log response
  //         await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //         return response;

  //       }

  //       const transactionNo = generateTrxNo();

  //       const geUpdatedtWallet = await this.walletService.getWallet({
  //         userId: player.playerId,
  //         clientId,
  //       });

  //       console.log("geUpdatedtWallet", geUpdatedtWallet);

  //       if (!geUpdatedtWallet.success) {
  //         response = {
  //           success: true,
  //           message: 'Unable to complete request ' + geUpdatedtWallet.message,
  //           status: HttpStatus.INTERNAL_SERVER_ERROR,
  //           data: {
  //             status: "error",
  //             error: {
  //               message: 'Unable to complete request',
  //               scope: "internal",
  //               no_refund: "1",
  //             }
  //           },
  //         };
  //         // update callback log response
  //         await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //         return response;
  //        }

  //       response = {
  //         success: true,
  //         message: 'Jackpot Win Successful',
  //         status: HttpStatus.OK,
  //         data: {
  //             cash: parseFloat(geUpdatedtWallet.data.availableBalance.toFixed(2)),
  //             transactionId: transactionNo,
  //             currency: player.currency,
  //             bonus: parseFloat(geUpdatedtWallet.data.casinoBonusBalance.toFixed(2)),
  //             error: 0,
  //             description: 'Successful',
  //           },
  //       };

  //       await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //       return response;
  //     }
  //   } else {
  //     response = {
  //       success: false,
  //       status: HttpStatus.BAD_REQUEST,
  //       message: `Player with userId ${player.playerId} not found`,
  //       data: {}
  //     }

  //     await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //     return response;
  //   }
  
  // }

  // async jackpotWin(clientId, player, callback, body, balanceType) {
  //   console.log("Got to jackpot win method");
  //   console.log("player", player, body, balanceType);
  //   let response: any;
  
  //   if (player) {
  //     // Retrieve the progWin from jackpotDetails in the body
  //     const jackpotDetails = body.get('jackpotDetails');
  //     const progWin = parseFloat(jackpotDetails?.progressive || '0');
  
  //     // Credit the user's wallet with the progWin amount
  //     const creditResponse = await this.walletService.credit({
  //       userId: player.playerId,
  //       clientId,
  //       amount: progWin,
  //       source: 'pragmatic-play',
  //       description: `Jackpot Win`,
  //       username: player.playerNickname,
  //       wallet: balanceType,
  //       subject: 'Jackpot Win (Pragmatic-play)',
  //       channel: 'pragmatic-play',
  //     });
  
  //     console.log("creditResponse", creditResponse);
  
  //     if (!creditResponse.success) {
  //       response = {
  //         success: true,
  //         message: 'Unable to complete request ' + creditResponse.message,
  //         status: HttpStatus.INTERNAL_SERVER_ERROR,
  //         data: {
  //           status: "error",
  //           error: {
  //             message: 'Unable to complete request',
  //             scope: "internal",
  //             no_refund: "1",
  //           }
  //         },
  //       };
  //       // update callback log response
  //       await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //       return response;
  //     }
  
  //     const transactionNo = generateTrxNo();
  
  //     const geUpdatedtWallet = await this.walletService.getWallet({
  //       userId: player.playerId,
  //       clientId,
  //     });
  
  //     console.log("geUpdatedtWallet", geUpdatedtWallet);
  
  //     if (!geUpdatedtWallet.success) {
  //       response = {
  //         success: true,
  //         message: 'Unable to complete request ' + geUpdatedtWallet.message,
  //         status: HttpStatus.INTERNAL_SERVER_ERROR,
  //         data: {
  //           status: "error",
  //           error: {
  //             message: 'Unable to complete request',
  //             scope: "internal",
  //             no_refund: "1",
  //           }
  //         },
  //       };
  //       // update callback log response
  //       await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //       return response;
  //     }
  
  //     response = {
  //       success: true,
  //       message: 'Jackpot Win Successful',
  //       status: HttpStatus.OK,
  //       data: {
  //         cash: parseFloat(geUpdatedtWallet.data.availableBalance.toFixed(2)),
  //         transactionId: transactionNo,
  //         currency: player.currency,
  //         bonus: parseFloat(geUpdatedtWallet.data.casinoBonusBalance.toFixed(2)),
  //         error: 0,
  //         description: 'Successful',
  //       },
  //     };
  
  //     await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //     return response;
  //   } else {
  //     response = {
  //       success: true,
  //       status: HttpStatus.BAD_REQUEST,
  //       message: `Player with userId ${player.playerId} not found`,
  //       data: {}
  //     };
  
  //     await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
  //     return response;
  //   }
  // }

  async jackpotWin(clientId, player, callback, body, balanceType) {
    console.log("Got to jackpot win method");
    console.log("player", player, body, balanceType, callback);
  
    let response: any;
  
    if (player) {
      try {
        // Retrieve the jackpotDetails and parse the progressive win amount
        const jackpotDetails = JSON.parse(body.get('jackpotDetails') || '{}');
        const progWin = parseFloat(jackpotDetails.progressive || '0');
        console.log("progWin", progWin);
  
        if (progWin <= 0) {
          response = {
            success: true,
            message: 'No progressive win amount found',
            status: HttpStatus.BAD_REQUEST,
            data: {
              error: 'Invalid jackpot details',
              description: 'Progressive win amount must be greater than zero',
            },
          };
          await this.callbackLogRepository.update(
            { id: callback.id },
            { response: JSON.stringify(response) }
          );
          return response;
        }
  
        // Credit the user's wallet with the progWin amount
        const creditResponse = await this.walletService.credit({
          userId: player.playerId,
          clientId,
          amount: progWin,
          source: 'pragmatic-play',
          description: `Jackpot Win`,
          username: player.playerNickname,
          wallet: balanceType,
          subject: 'Jackpot Win (Pragmatic-play)',
          channel: 'pragmatic-play',
        });
  
        console.log("creditResponse", creditResponse);
  
        if (!creditResponse.success) {
          response = {
            success: false,
            message: 'Unable to complete request ' + creditResponse.message,
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            data: {
              error: {
                message: 'Unable to complete request',
                scope: 'internal',
                no_refund: '1',
              },
            },
          };
          await this.callbackLogRepository.update(
            { id: callback.id },
            { response: JSON.stringify(response) }
          );
          return response;
        }
  
        // Generate transaction number and fetch updated wallet balances
        const transactionNo = generateTrxNo();
        const updatedWallet = await this.walletService.getWallet({
          userId: player.playerId,
          clientId,
        });
  
        console.log("updatedWallet", updatedWallet);
  
        if (!updatedWallet.success) {
          response = {
            success: false,
            message: 'Unable to fetch updated wallet details',
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            data: {
              error: {
                message: 'Unable to complete request',
                scope: 'internal',
                no_refund: '1',
              },
            },
          };
          await this.callbackLogRepository.update(
            { id: callback.id },
            { response: JSON.stringify(response) }
          );
          return response;
        }
  
        // Construct success response
        response = {
          success: true,
          message: 'Jackpot Win Successful',
          status: HttpStatus.OK,
          data: {
            cash: parseFloat(updatedWallet.data.availableBalance.toFixed(2)),
            transactionId: transactionNo,
            currency: player.currency,
            bonus: parseFloat(updatedWallet.data.casinoBonusBalance.toFixed(2)),
            error: 0,
            description: 'Successful',
          },
        };
  
        await this.callbackLogRepository.update(
          { id: callback.id },
          { response: JSON.stringify(response) }
        );
        return response;
  
      } catch (error) {
        console.error("Error in jackpotWin method:", error);
        response = {
          success: false,
          message: 'Internal server error',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          data: {
            error: {
              message: 'An error occurred during processing',
              scope: 'internal',
            },
          },
        };
        await this.callbackLogRepository.update(
          { id: callback.id },
          { response: JSON.stringify(response) }
        );
        return response;
      }
    } else {
      response = {
        success: false,
        status: HttpStatus.BAD_REQUEST,
        message: 'Player not found',
        data: {
          error: 'Player not available for jackpot win',
        },
      };
  
      await this.callbackLogRepository.update(
        { id: callback.id },
        { response: JSON.stringify(response) }
      );
      return response;
    }
  }
  
  


  async refund(clientId, player, callback, body, balanceType) {
    console.log("Got to refund method");
    console.log("player", player, body, balanceType);
    let response: any;

    if(player) {

      const reversePayload: RollbackCasinoBetRequest = {
        transactionId: body.get('reference'),
      };

      console.log("reversePayload", reversePayload);

      const callbackLog = await this.callbackLogRepository.findOne({where: {transactionId: body.get('reference'), request_type: 'Bet' }});

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
          message: `Game with id ${body.get('gameId')}not Found`,
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

      response = {
        success: true,
        message: 'Refund Successful',
        status: HttpStatus.OK,
        data: {
            transactionId: transaction.data.transactionId,
            error: 0,
            description: 'Successful',
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

  // Place Bet
  async placeBet(data: PlaceCasinoBetRequest) {
    return firstValueFrom(this.betService.placeCasinoBet(data));
  }

  async rollback(data: RollbackCasinoBetRequest) {
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

  async handleCallback(data: CallbackGameDto) {
    console.log("_data", data);

    const callback = await this.saveCallbackLog(data);
    console.log("callback-4", callback);
    let response;
    let body = {};

    // Return response if already logged
    if (callback?.response != null) {
        console.log("Existing callback response found. Processing it.");

        const existingRequest = JSON.parse(callback.payload);
        const existingResponse = JSON.parse(callback.response);

        console.log("existingRequest", existingRequest);
        console.log("existingResponse", existingResponse);

        if (existingRequest?.userId) {
          // Get userId from the response

          console.log("Got to the updated wallet block");
          const userId = existingRequest.userId;
    
          try {
              // Fetch the wallet details for the user
              const getWallet = await this.walletService.getWallet({
                userId,
                clientId: data.clientId
              });

              console.log("getWallet", getWallet);


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
    
              if (getWallet && getWallet.data.availableBalance !== undefined) {
                  // Update the cash field with the updated balance
                  existingResponse.data.cash = getWallet.data.availableBalance;
    
                  // Save the updated response back to the log
                  await this.callbackLogRepository.update(
                      { id: callback.id },
                      { response: JSON.stringify(existingResponse) }
                  );
    
                  console.log("Updated response with wallet balance:", existingResponse);
                  return existingResponse;
              }
          } catch (error) {
              console.error("Error fetching wallet details or updating response:", error);
              // Handle errors if needed, e.g., log or return the original response
          }
      }  else {
        return JSON.parse(callback.response);
      }
  
    } 
    // Parse the body if it exists
    if (data.body) {
        try {
            body = new URLSearchParams(data.body);
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

    let token = null;

    // Verify body is a valid URLSearchParams object
    if (body instanceof URLSearchParams) {
        const parsedBody = Object.fromEntries(body.entries());

        if (this.hashCheck(parsedBody)) {
            response = {
                success: false,
                message: 'Invalid Hash Signature',
                status: HttpStatus.BAD_REQUEST,
                data: { error: 5, description: 'Error' }
            };

            await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
            return response;
        }
    } else {
        response = {
            success: false,
            message: 'Invalid body format',
            status: HttpStatus.BAD_REQUEST,
            data: { error: 5, description: 'Error' }
        };

        await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
        return response;
    }

    let player = null;
    let balanceType = 'main';

    // Handle PromoWin without token
    if (data.action === 'PromoWin') {
        console.log("Got to handle-callback promoWin");

        const getUser = await this.identityService.getDetails({
            clientId: data.clientId,
            userId: parseFloat(body.get("userId"))
        });

        console.log("getUser", getUser);

        if (!getUser.success) {
            response = {
                success: false,
                message: 'Invalid User ID',
                status: HttpStatus.NOT_FOUND
            };

            await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
            return response;
        }

        const res = await this.identityService.validateToken({ clientId: data.clientId, token: getUser.data.authCode });

        if (!res.success) {
          response = {
              success: false,
              message: 'Invalid Session ID',
              status: HttpStatus.NOT_FOUND
          };

          await this.callbackLogRepository.update({ id: callback.id }, { response: JSON.stringify(response) });
          return response;
        }

        player = res.data;
    } else {
        // Handle other actions with token validation
        token = body.get("token");
        console.log("token", token);

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
    }

    console.log("player", player);

    // Handle game actions
    switch (data.action) {
        case 'Authenticate':
            console.log("using pragmatic-play authenticate");
            return await this.authenticate(data.clientId, token, callback, balanceType);
        case 'Balance':
            return await this.getBalance(data.clientId, player, callback, balanceType);
        case 'Bet':
            return await this.bet(data.clientId, player, callback, body, balanceType);
        case 'Result':
            return await this.win(data.clientId, player, callback, body, balanceType);
        case 'Refund':
            return await this.refund(data.clientId, player, callback, body, balanceType);
        case 'BonusWin':
            return await this.bonusWin(data.clientId, player, callback, body, balanceType);
        case 'JackpotWin':
            return await this.jackpotWin(data.clientId, player, callback, body, balanceType);
        case 'PromoWin':
            return await this.promoWin(data.clientId, player, callback, body, balanceType);
        default:
            return { success: false, message: 'Invalid request', status: HttpStatus.BAD_REQUEST };
    }
}

  md5Algo = (hash) => {
    return crypto.createHash("md5").update(hash).digest("hex");
  };

  genHash = (query) => {
    const queries = Object.keys(query);
    const unhash = queries.filter((item) => item !== "hash");
    unhash.sort();
    const queryParams = unhash.map((key) => `${key}=${query[key]}`).join("&");
    console.log("queryParams", queryParams);

    const hash = this.md5Algo(`${queryParams}${this.PRAGMATIC_KEY}`);
    return hash;
  };

  hashCheck = (query) => {
    const hash = this.genHash(query);
    return query.hash !== hash;
  };

  convertToObject = (queryString) => {
    const obj = {};
    const pairs = queryString.split('&'); // Split the string by '&'

    pairs.forEach(pair => {
        const [key, value] = pair.split('='); // Split each pair by '='
        obj[decodeURIComponent(key)] = decodeURIComponent(value); // Decode and assign to object
    });

    return obj;
  }

  async saveCallbackLog(data) {
    console.log('body-data', data);
    const action = data.action;
    const body = data.body ? new URLSearchParams(data.body) : new URLSearchParams();

    console.log('body-Callback', body);
    const transactionId = 
      action === 'Authenticate' 
        ? body.get('hash') 
        : action === 'Balance' 
          ? body.get('hash')
          : action === 'Bet' 
          ? body.get('reference') 
          : action === 'Refund' 
          ? body.get('reference')
          : action === 'Result' 
          ? body.get('reference') 
          : action === 'BonusWin' 
          ? body.get('reference') 
          : action === 'PromoWin' 
          ? body.get('reference') 
          : action === 'JackpotWin' 
          ? body.get('reference') 
            : body.get('transactionId');

    try {
      let callback;
      console.log("action", action);
      if (action !== 'Balance' && action !== 'Authenticate') {
        console.log("Got in this box");
        // Check for an existing callback for actions other than Authenticate
        callback = await this.callbackLogRepository.findOne({
          where: { transactionId, request_type: action },
        });
  
        if (callback) return callback;
      }


      // let callback = await this.callbackLogRepository.findOne({
      //   where: { transactionId, request_type: action },
      // });
      
      // if (callback) return callback;
      
      callback = new CallbackLog();
      callback.transactionId = transactionId;
      callback.request_type = action;
      callback.payload = JSON.stringify(Object.fromEntries(body)); // Convert URLSearchParams back to JSON

      console.log("saved-callback", callback)

      return await this.callbackLogRepository.save(callback);

    } catch(e) {
      console.log('Error saving callback log', e.message);
    }
}

}

