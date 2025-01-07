/* eslint-disable prettier/prettier */
import { HttpService } from '@nestjs/axios';
import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { BetService } from 'src/bet/bet.service';
import { CasinoGame } from 'src/entities/casino-game.entity';
import { IdentityService } from 'src/identity/identity.service';
import { WalletService } from 'src/wallet/wallet.service';
import { Repository } from 'typeorm';
import {
  CallbackLog,
  Game as GameEntity,
  GameSession,
  Provider as ProviderEntity,
} from '../entities';
import { CallbackGameDto, StartGameDto } from 'src/proto/gaming.pb';

@Injectable()
export class QtechService {
  private readonly QTECH_BASEURL: string;
  private readonly QTECH_PASSWORD: string;
  private readonly QTECH_USERNAME: string;
  private readonly QTECH_IMAGE_URL: string;
  private readonly QTECH_PASS_KEY: string;

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
    this.QTECH_BASEURL = this.configService.get<string>('QTECH_BASEURL');
    this.QTECH_PASSWORD = this.configService.get<string>('QTECH_PASSWORD');
    this.QTECH_USERNAME = this.configService.get<string>('QTECH_USERNAME');
    this.QTECH_IMAGE_URL = this.configService.get<string>('QTECH_IMAGE_URL');
    this.QTECH_PASS_KEY = this.configService.get<string>('QTECH_PASS_KEY');
  }

  // Get Casino Games

  async getAccessToken(): Promise<any> {
    try {
      const { data } = await this.httpService
        .post(
          `${this.QTECH_BASEURL}/v1/auth/token?grant_type=password&response_type=token&username=${this.QTECH_USERNAME}&password=${this.QTECH_PASSWORD}`,
        )
        .toPromise();
      console.log('data', data);

      return data.access_token;
    } catch (e) {
      return new RpcException(e.messag || 'Something went wrong');
    }
  }

  async revokeAccessToken(): Promise<any> {
    try {
      const { data } = await this.httpService
        .delete(`${this.QTECH_BASEURL}/v1/auth/token`)
        .toPromise();
      console.log('data', data);

      return data.access_token;
    } catch (e) {
      return new RpcException(e.messag || 'Something went wrong');
    }
  }

  async getCasinoGames(
    size: number = 100,
    currencies: string = 'USD,CNY',
    languages: string = 'en_US',
    gameTypes: string = 'BINGO,CASUALGAME,ESPORTS,INSTANTWIN,LIVECASINO,SCRATCHCARD,SHOOTING,SLOT,SPORTS,TABLEGAME,VIDEOPOKER,VIRTUAL_SPORTS,LOTTERY,CRASH,GAME_SHOW',
    includeFields: string = 'id,name,currencies,clientTypes,provider,description, images, languages',
  ): Promise<any> {
    const accessToken = await this.getAccessToken();

    console.log('QTech accessToken', accessToken);
    try {
      const params = new URLSearchParams({
        size: size.toString(),
        currencies: currencies,
        languages: languages,
        gameTypes: gameTypes,
        includeFields: includeFields,
      }).toString();

      const url = `${this.QTECH_BASEURL}/v2/games?${params}`;
      const headers = {
        Authorization: `Bearer ${accessToken}`,
        'Time-Zone': 'UTC',
        'Accept-Language': 'en-US',
        Accept: 'application/json',
      };

      const { data } = await this.httpService.get(url, { headers }).toPromise();
      console.log('Get Games response:', data);
      return data;
    } catch (e) {
      console.error('Error in getCasinoGames:', e.message);
      throw new RpcException(e.response?.data?.message || 'Get Games failed');
    }
  }
  public async syncGames() {
    try {
      const gamesResponse: any = await this.getCasinoGames();
      console.log('gamesResponse', gamesResponse);
  
      // Validate response
      if (
        !gamesResponse ||
        !gamesResponse.items ||
        gamesResponse.items.length === 0
      ) {
        throw new Error('No games available for processing');
      }
  
      const savedGames = await Promise.all(
        gamesResponse.items.map(async (game: any) => {
          try {
            // Fetch or create the game's provider
            let provider = await this.providerRepository.findOne({
              where: { name: game.provider?.name },
            });
  
            if (provider) {
              // Update provider details if needed
              this.providerRepository.merge(provider, {
                description: `Games provided by ${game.provider?.name || 'Unknown Provider'}`,
                imagePath: `${this.QTECH_IMAGE_URL}`,
              });
              provider = await this.providerRepository.save(provider);
              console.log('Updated provider:', provider);
            } else {
              // Create new provider
              const newProvider: ProviderEntity = new ProviderEntity();
              newProvider.name = game.provider?.name || 'Unknown Provider';
              newProvider.slug = (game.provider?.name || 'Unknown Provider')
                .toLowerCase()
                .replace(/\s+/g, '-');
              newProvider.description = `Games provided by ${game.provider?.name || 'Unknown Provider'}`;
              newProvider.imagePath = `${this.QTECH_IMAGE_URL}`;
              provider = await this.providerRepository.save(newProvider);
              console.log('New provider created:', provider);
            }
  
            // Validate provider
            if (!provider) {
              throw new Error(
                `Failed to fetch or create provider for game: ${game.name}`,
              );
            }
  
            // Extract game category and images
            const gameType = game.category?.split('/')?.[1] || 'Unknown Type';
  
            const imagePath = Array.isArray(game.images)
              ? game.images.find((img: any) => img.type === 'logo-square')?.url || ''
              : '';
  
            const bannerPath = Array.isArray(game.images)
              ? game.images.find((img: any) => img.type === 'banner')?.url || ''
              : '';
  
            const gameData = {
              gameId: game.id,
              title: game.name,
              description:
                game.description ||
                `${game.name} by ${game.provider?.name || 'Unknown Provider'}`,
              type: gameType,
              provider: provider,
              status: true,
              imagePath: imagePath,
              bannerPath: bannerPath,
            };
  
            // Check if the game already exists
            // eslint-disable-next-line prefer-const
            let existingGame = await this.gameRepository.findOne({
              where: {
                gameId: gameData.gameId,
              },
              relations: {
                provider: true,
              },
            });
  
            if (existingGame) {
              console.log('Updating existing game:', gameData.title);
              this.gameRepository.merge(existingGame, gameData);
              return await this.gameRepository.save(existingGame);
            } else {
              console.log('Adding new game:', gameData.title);
              return await this.gameRepository.save(
                this.gameRepository.create(gameData),
              );
            }
          } catch (error) {
            console.error(`Error processing game: ${game.name}`, error.message);
            // Returning null for failed game processing to avoid breaking the loop
            return null;
          }
        }),
      );
  
      // Filter out null responses (games that failed to save)
      const successfullySavedGames = savedGames.filter((game) => game !== null);
  
      return {
        message: 'Games synchronized successfully',
        games: successfullySavedGames,
      };
    } catch (error) {
      console.error('Error saving games:', error.message);
      throw new Error(`Error synchronizing games: ${error.message}`);
    }
  }
  

  // public async syncGames() {
  //   try {
  //     const gamesResponse: any = await this.getCasinoGames();
  //     console.log('gamesResponse', gamesResponse);

  //     if (
  //       !gamesResponse ||
  //       !gamesResponse.items ||
  //       gamesResponse.items.length === 0
  //     ) {
  //       throw new Error('No games available for processing');
  //     }

  //     let provider = await this.providerRepository.findOne({
  //       where: { name: 'QTech Games' },
  //     });

  //     console.log('provider', provider);

  //     if (!provider) {
  //       try {
  //         const newProvider: ProviderEntity = new ProviderEntity();
  //         newProvider.name = 'QTech Games';
  //         newProvider.slug = 'qtech-games';
  //         newProvider.description = 'QTech Games';
  //         newProvider.imagePath = `${this.QTECH_IMAGE_URL}`;
  //         provider = await this.providerRepository.save(newProvider);
  //         console.log('New provider created:', provider);
  //       } catch (error) {
  //         // Handle duplicate entry error gracefully
  //         if (error.code === 'ER_DUP_ENTRY') {
  //           console.log(
  //             'Duplicate provider found. Fetching existing provider...',
  //           );
  //           provider = await this.providerRepository.findOne({
  //             where: { slug: 'qtech-games' },
  //           });
  //         } else {
  //           console.error('Provider ERROR', error);
  //           throw error; // Rethrow other errors
  //         }
  //       }
  //     }

  //     if (!provider) {
  //       throw new Error('Failed to fetch or create provider');
  //     }
  //     const savedGames = await Promise.all(
  //       gamesResponse.items.map(async (game: any) => {
  //         const imagePath = Array.isArray(game.images)
  //           ? game.images.find((img: any) => img.type === 'logo-square')?.url ||
  //             ''
  //           : '';

  //         const bannerPath = Array.isArray(game.images)
  //           ? game.images.find((img: any) => img.type === 'banner')?.url || ''
  //           : '';
  //         const gameData = {
  //           gameId: game.id,
  //           title: game.name,
  //           description:
  //             game.description ||
  //             `${game.name} by ${game.provider?.name || 'Unknown Provider'}`,
  //           type: 'Slots',
  //           provider: provider,
  //           status: true,
  //           imagePath: imagePath,
  //           bannerPath: bannerPath,
  //         };

  //         const gameExist = await this.gameRepository.findOne({
  //           where: {
  //             title: gameData.title,
  //           },
  //           relations: {
  //             provider: true,
  //           },
  //         });

  //         if (gameExist) {
  //           console.log('updated game');
  //           this.gameRepository.merge(gameExist, gameData);
  //           return this.gameRepository.save(gameExist);
  //         } else {
  //           console.log('added game');
  //           return this.gameRepository.save(
  //             this.gameRepository.create(gameData),
  //           );
  //         }
  //       }),
  //     );

  //     return {
  //       games: savedGames,
  //     };
  //   } catch (error) {
  //     console.log('Error saving games:', error.message);
  //   }
  // }

  async launchGames(payload: StartGameDto): Promise<any> {
    try {
      const {
        gameId,
        language,
        clientId,
        authCode,
        demo,
        balanceType,
        isMobile,
      } = payload;

      // Convert gameId to string if necessary
      const covGameId = gameId.toString();
      const playerId = clientId.toString();

      // Fetch game details from the repository
      const gameExist = await this.gameRepository.findOne({
        where: { gameId: covGameId },
        relations: { provider: true },
      });
      console.log('Game retrieved from DB:', gameExist);

      if (!gameExist) {
        console.error(`Game with ID ${gameId} not found`);
        throw new NotFoundException('Game not found');
      }

      // Determine mode and device
      const mode = demo ? 'demo' : 'real';
      const device = isMobile ? 'mobile' : 'desktop';

      // Construct the wallet session ID (if applicable)
      const walletSessionId = authCode || `session_${Date.now()}`;

      // Log the mode and device selection for debugging
      console.log('Selected mode:', mode, 'Selected device:', device);

      // Define the return URL
      const returnUrl = 'https://your-operator-site.com/games';

      // Prepare the game session
      const gameSession = new GameSession();
      gameSession.session_id = walletSessionId;
      gameSession.game_id = gameExist.gameId;
      gameSession.provider = gameExist.provider.slug;
      gameSession.balance_type = balanceType || null;
      gameSession.token = authCode;

      console.log('Game session data to save:', gameSession);

      // Validate and save the game session
      if (!gameSession.token) {
        console.error('Auth token is missing or invalid');
        throw new Error('Auth token is missing');
      }

      try {
        await this.gameSessionRepo.save(gameSession);
        console.log('Game session saved successfully:', gameSession);
      } catch (dbError) {
        console.error('Error saving game session:', dbError.message);
        throw new Error(`Failed to save game session: ${dbError.message}`);
      }

      // Prepare the API request URL
      const requestUrl = `${this.QTECH_BASEURL}/v1/games/${covGameId}/launch-url`;

      // Set up headers
      const headers = {
        Authorization: `Bearer ${await this.getAccessToken()}`,
        'Wallet-Session': walletSessionId,
      };

      // Prepare the payload
      const requestBody = {
        playerId,
        currency: 'NGN',
        country: 'EN',
        lang: language || 'en_US',
        mode,
        device,
        returnUrl,
      };

      // Make the API request
      const { data } = await this.httpService
        .post(requestUrl, requestBody, { headers })
        .toPromise();

      console.log('Response data:', data);

      // Return the game URL
      return { url: data.gameURL };
    } catch (error) {
      console.error('Error in launchGames:', error.message);
      throw new RpcException(
        error.response?.data?.message || 'Launch Game failed',
      );
    }
  }
  async getBalance(clientId, player, callback: any, walletType): Promise<any> {
    try {
      console.log('Got to balance method');

      let response;

      if (player) {
        // Fetch balance from wallet service using Player UserID and ClientID
        const wallet = await this.walletService.getWallet({
          userId: player.playerId,
          clientId,
          wallet: walletType,
        });

        const dataObject =
          typeof wallet === 'string' ? JSON.parse(wallet) : wallet;

        console.log('Wallet Service Data Object:', dataObject);

        if (dataObject.success) {
          response = {
            success: true,
            status: HttpStatus.OK,
            message: 'Balance retrieved successfully',
            data: {
              cash: parseFloat(dataObject.data.availableBalance.toFixed(2)),
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
            message: 'Could not retrieve balance from wallet service',
            data: {},
          };
        }

        // Fetch balance from external wallet API
        const url = `https://wallet.operator.com/accounts/${player.playerId}/balance`;
        const headers = {
          'Pass-Key': this.QTECH_PASS_KEY,
          'Wallet-Session': callback.walletSession || '',
        };

        // Add optional query parameter
        const params: any = {};
        if (callback.gameId) {
          params.gameId = callback.gameId;
        }

        try {
          const { data } = await this.httpService
            .get(url, { headers, params })
            .toPromise();
          console.log('External API Balance Response:', data);

          response.data.externalBalance = {
            balance: parseFloat(data.balance.toFixed(2)),
            currency: data.currency,
          };
        } catch (apiError) {
          console.error(
            'Error fetching balance from external API:',
            apiError.message,
          );
          response.data.externalBalance = {
            error: true,
            description: 'Failed to retrieve external balance',
          };
        }
      } else {
        response = {
          success: false,
          status: HttpStatus.NOT_FOUND,
          message: 'Player not found',
          data: {},
        };
      }

      // Update callback log response
      await this.callbackLogRepository.update(
        { id: callback.id },
        { response: JSON.stringify(response) },
      );

      return response;
    } catch (e) {
      console.error('Error in getBalance:', e.message);
      throw new RpcException(e.response?.data?.message || 'Get Balance failed');
    }
  }

  async verifySession(
    playerId: string,
    gameId: string,
    walletSessionId: string,
  ): Promise<any> {
    try {
      // Construct the URL with the required path and query parameters
      const url = `${this.QTECH_BASEURL}/accounts/${playerId}/session?gameId=${gameId}`;

      // Set the required headers
      const headers = {
        'Pass-Key': this.QTECH_PASSWORD, // Shared secret pass-key
        'Wallet-Session': walletSessionId, // Player session token
      };

      // Make the GET request
      const { data } = await this.httpService.get(url, { headers }).toPromise();
      console.log('Verify Session response:', data);

      // Return the response data
      return data;
    } catch (e) {
      // Log the error for debugging
      console.error('Error in verifySession:', e.message);

      // Throw a meaningful exception with the error message or a default message
      throw new RpcException(
        e.response?.data?.message || 'Verify Session failed',
      );
    }
  }

  async authenticate(clientId, token, callback, walletType) {
    console.log('Got to authenticate method');
    const isValid = await this.identityService.validateToken({
      clientId,
      token,
    });

    console.log('isValid', isValid);
    let response: any;
    const dataObject =
      typeof isValid.data === 'string'
        ? JSON.parse(isValid.data)
        : isValid.data;

    console.log('dataObject', dataObject);

    if (!isValid || !isValid.status) {
      response = {
        success: false,
        status: HttpStatus.BAD_REQUEST,
        message: 'Invalid auth code, please login to try again',
        data: {},
      };

      const val = await this.callbackLogRepository.update(
        { id: callback.id },
        { response: JSON.stringify(response) },
      );
      console.log('val', val);

      return response;
    }

    response = {
      success: true,
      status: HttpStatus.OK,
      message: 'Authentication Successful',
      data: {
        userId: dataObject.playerId,
        cash:
          walletType === 'casino'
            ? dataObject.casinoBalance.toFixed(2)
            : dataObject.balance.toFixed(2),
        currency: dataObject.currency,
        bonus: dataObject.casinoBalance,
        token: token,
        error: 0,
        description: 'Success',
      },
    };

    await this.callbackLogRepository.update(
      { id: callback.id },
      { response: JSON.stringify(response) },
    );

    return response;
  }

  async saveCallbackLog(data) {
    console.log('body-data', data);
    const action = data.action;
    const body = data.body
      ? new URLSearchParams(data.body)
      : new URLSearchParams();

    console.log('body-Callback', body);
    const transactionId =
      action === 'Authenticate'
        ? body.get('hash')
        : action === 'Balance'
          ? body.get('hash')
          : action === 'Bet'
            ? body.get('roundId')
            : action === 'Refund'
              ? body.get('roundId')
              : action === 'Result'
                ? body.get('roundId')
                : action === 'BonusWin'
                  ? body.get('hash')
                  : action === 'promoWin'
                    ? body.get('hash')
                    : action === 'JackpotWin'
                      ? body.get('hash')
                      : body.get('transactionId');

    try {
      let callback = await this.callbackLogRepository.findOne({
        where: { transactionId },
      });

      if (callback) return callback;

      callback = new CallbackLog();
      callback.transactionId = transactionId;
      callback.request_type = action;
      callback.payload = JSON.stringify(Object.fromEntries(body)); // Convert URLSearchParams back to JSON

      return await this.callbackLogRepository.save(callback);
    } catch (e) {
      console.log('Error saving callback log', e.message);
    }
  }

  // async handleCallback(data: CallbackGameDto) {
  //   console.log('_data', data);

  //   const callback = await this.saveCallbackLog(data);
  //   console.log('callback-4', callback);
  //   let response;
  //   let body = {};

  //   // Return response if already logged
  //   if (callback?.response != null) {
  //     console.log('Existing callback response found. Processing it.');

  //     const existingRequest = JSON.parse(callback.payload);
  //     const existingResponse = JSON.parse(callback.response);

  //     console.log('existingRequest', existingRequest);
  //     console.log('existingResponse', existingResponse);

  //     if (existingRequest?.userId) {
  //       // Get userId from the response

  //       console.log('Got to the updated wallet block');
  //       const userId = existingRequest.userId;

  //       try {
  //         // Fetch the wallet details for the user
  //         const getWallet = await this.walletService.getWallet({
  //           userId,
  //           clientId: data.clientId,
  //         });

  //         console.log('getWallet', getWallet);

  //         if (!getWallet || !getWallet.status) {
  //           response = {
  //             success: false,
  //             status: HttpStatus.BAD_REQUEST,
  //             message: 'Invalid auth code, please login to try again',
  //             data: {},
  //           };

  //           const val = await this.callbackLogRepository.update(
  //             { id: callback.id },
  //             { response: JSON.stringify(response) },
  //           );
  //           console.log('val', val);

  //           return response;
  //         }

  //         if (getWallet && getWallet.data.availableBalance !== undefined) {
  //           // Update the cash field with the updated balance
  //           existingResponse.data.cash = getWallet.data.availableBalance;

  //           // Save the updated response back to the log
  //           await this.callbackLogRepository.update(
  //             { id: callback.id },
  //             { response: JSON.stringify(existingResponse) },
  //           );

  //           console.log(
  //             'Updated response with wallet balance:',
  //             existingResponse,
  //           );
  //           return existingResponse;
  //         }
  //       } catch (error) {
  //         console.error(
  //           'Error fetching wallet details or updating response:',
  //           error,
  //         );
  //         // Handle errors if needed, e.g., log or return the original response
  //       }
  //     } else {
  //       return JSON.parse(callback.response);
  //     }
  //   }
  //   // Parse the body if it exists
  //   if (data.body) {
  //     try {
  //       body = new URLSearchParams(data.body);
  //     } catch (error) {
  //       console.error('Error parsing body:', error);
  //       response = {
  //         success: false,
  //         message: 'Invalid body format',
  //         status: HttpStatus.BAD_REQUEST,
  //         data: { error: 5, description: 'Error' },
  //       };

  //       await this.callbackLogRepository.update(
  //         { id: callback.id },
  //         { response: JSON.stringify(response) },
  //       );
  //       return response;
  //     }
  //   }

  //   console.log('body', body);

  //   let token = null;

  //   // Verify body is a valid URLSearchParams object
  //   if (body instanceof URLSearchParams) {
  //     const parsedBody = Object.fromEntries(body.entries());

  //     if (this.hashCheck(parsedBody)) {
  //       response = {
  //         success: false,
  //         message: 'Invalid Hash Signature',
  //         status: HttpStatus.BAD_REQUEST,
  //         data: { error: 5, description: 'Error' },
  //       };

  //       await this.callbackLogRepository.update(
  //         { id: callback.id },
  //         { response: JSON.stringify(response) },
  //       );
  //       return response;
  //     }
  //   } else {
  //     response = {
  //       success: false,
  //       message: 'Invalid body format',
  //       status: HttpStatus.BAD_REQUEST,
  //       data: { error: 5, description: 'Error' },
  //     };

  //     await this.callbackLogRepository.update(
  //       { id: callback.id },
  //       { response: JSON.stringify(response) },
  //     );
  //     return response;
  //   }

  //   let player = null;
  //   let balanceType = 'main';

  //   // Handle PromoWin without token
  //   if (data.action === 'PromoWin') {
  //     console.log('Got to handle-callback promoWin');

  //     const getUser = await this.identityService.getDetails({
  //       clientId: data.clientId,
  //       userId: parseFloat(body.get('userId')),
  //     });

  //     console.log('getUser', getUser);

  //     if (!getUser.success) {
  //       response = {
  //         success: false,
  //         message: 'Invalid User ID',
  //         status: HttpStatus.NOT_FOUND,
  //       };

  //       await this.callbackLogRepository.update(
  //         { id: callback.id },
  //         { response: JSON.stringify(response) },
  //       );
  //       return response;
  //     }

  //     const res = await this.identityService.validateToken({
  //       clientId: data.clientId,
  //       token: getUser.data.authCode,
  //     });

  //     if (!res.success) {
  //       response = {
  //         success: false,
  //         message: 'Invalid Session ID',
  //         status: HttpStatus.NOT_FOUND,
  //       };

  //       await this.callbackLogRepository.update(
  //         { id: callback.id },
  //         { response: JSON.stringify(response) },
  //       );
  //       return response;
  //     }

  //     player = res.data;
  //   } else {
  //     // Handle other actions with token validation
  //     token = body.get('token');
  //     console.log('token', token);

  //     if (token) {
  //       const res = await this.identityService.validateToken({
  //         clientId: data.clientId,
  //         token,
  //       });
  //       console.log('res', res);

  //       // const res = {
  //       //   success: true,
  //       //   message: "Success",
  //       //   data: {
  //       //     playerId: 214993,
  //       //     clientId: 4,
  //       //     playerNickname: 'pragmatic-play',
  //       //     sessionId: '132',
  //       //     balance: 9996.25,
  //       //     casinoBalance: 0.0,
  //       //     virtualBalance: 0.5,
  //       //     group: null,
  //       //     currency: 'NGN'
  //       //   }

  //       // };

  //       if (!res.success) {
  //         response = {
  //           success: false,
  //           message: 'Invalid Session ID',
  //           status: HttpStatus.NOT_FOUND,
  //         };

  //         await this.callbackLogRepository.update(
  //           { id: callback.id },
  //           { response: JSON.stringify(response) },
  //         );
  //         return response;
  //       }

  //       if (!player) {
  //         player = res.data;
  //       }
  //     } else {
  //       response = {
  //         success: false,
  //         message: 'Token is missing',
  //         status: HttpStatus.BAD_REQUEST,
  //       };

  //       await this.callbackLogRepository.update(
  //         { id: callback.id },
  //         { response: JSON.stringify(response) },
  //       );
  //       return response;
  //     }

  //     const gameSession = await this.gameSessionRepo.findOne({
  //       where: { session_id: token },
  //     });
  //     console.log('gameSession', gameSession);

  //     if (gameSession?.balance_type === 'bonus') {
  //       balanceType = 'casino';
  //     }
  //   }

  //   console.log('player', player);

  //   // Handle game actions
  //   switch (data.action) {
  //     case 'Authenticate':
  //       console.log('using pragmatic-play authenticate');
  //       return await this.authenticate(
  //         data.clientId,
  //         token,
  //         callback,
  //         balanceType,
  //       );
  //     case 'Balance':
  //       return await this.getBalance(
  //         data.clientId,
  //         player,
  //         callback,
  //         balanceType,
  //       );
  //     case 'Bet':
  //       return await this.bet(
  //         data.clientId,
  //         player,
  //         callback,
  //         body,
  //         balanceType,
  //       );
  //     case 'Result':
  //       return await this.win(
  //         data.clientId,
  //         player,
  //         callback,
  //         body,
  //         balanceType,
  //       );
  //     case 'Refund':
  //       return await this.refund(
  //         data.clientId,
  //         player,
  //         callback,
  //         body,
  //         balanceType,
  //       );
  //     case 'BonusWin':
  //       return await this.bonusWin(
  //         data.clientId,
  //         player,
  //         callback,
  //         body,
  //         balanceType,
  //       );
  //     case 'JackpotWin':
  //       return await this.jackpotWin(
  //         data.clientId,
  //         player,
  //         callback,
  //         body,
  //         balanceType,
  //       );
  //     case 'PromoWin':
  //       return await this.promoWin(
  //         data.clientId,
  //         player,
  //         callback,
  //         body,
  //         balanceType,
  //       );
  //     default:
  //       return {
  //         success: false,
  //         message: 'Invalid request',
  //         status: HttpStatus.BAD_REQUEST,
  //       };
  //   }
  // }
}
