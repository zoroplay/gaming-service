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
import axios from 'axios';
import {
  CallbackLog,
  Game as GameEntity,
  GameSession,
  Provider as ProviderEntity,
} from '../entities';
import { QtechCallbackRequest, StartGameDto } from 'src/proto/gaming.pb';
import { PlaceCasinoBetRequest } from 'src/proto/betting.pb';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class QtechService {
  private readonly QTECH_BASEURL: string;
  private readonly QTECH_PASSWORD: string;
  private readonly QTECH_USERNAME: string;
  private readonly QTECH_IMAGE_URL: string;
  private readonly QTECH_PASS_KEY: string;
  private readonly OPERATOR_URL: string;

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
    this.OPERATOR_URL = this.configService.get<string>('OPERATOR_URL');
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
      return new RpcException(e.message || 'Something went wrong');
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
      // Fetch games from the gRPC service
      const gamesResponse: any = await this.getCasinoGames();

      // Validate response
      if (
        !gamesResponse ||
        !gamesResponse.games ||
        gamesResponse.games.length === 0
      ) {
        console.warn('No games available for processing');
        return {
          success: false,
          message: 'No games available for processing',
          games: [],
        };
      }

      console.log('Games retrieved:', gamesResponse.games);

      // Process and save each game
      const savedGames = await Promise.all(
        gamesResponse.games.map(async (game: any) => {
          try {
            // Extract provider details
            const providerData = game.provider;
            const providerName = providerData.name;

            // Check or create the provider
            let provider = await this.providerRepository.findOne({
              where: { name: providerName },
            });

            if (!provider) {
              // Create new provider if not found
              const newProvider = this.providerRepository.create({
                name: providerName,
                parentProvider: 'qtech-games',
                slug: providerName.toLowerCase().replace(/\s+/g, '-'),
                description: `Games provided by ${providerName}`,
                imagePath: providerData.imagePath || `${this.QTECH_IMAGE_URL}`,
              });
              provider = await this.providerRepository.save(newProvider);
              console.log('Created new provider:', provider.name);
            } else {
              // Update existing provider
              this.providerRepository.merge(provider, {
                description: `Games provided by ${providerName}`,
                imagePath: providerData.imagePath || `${this.QTECH_IMAGE_URL}`,
              });
              provider = await this.providerRepository.save(provider);
              console.log('Updated provider:', provider.name);
            }

            // Prepare game data
            const gameData = {
              gameId: game.gameId,
              title: game.title,
              description:
                game.description || `Enjoy ${game.title} by ${providerName}`,
              url: game.url,
              imagePath: game.imagePath,
              bannerPath: game.bannerPath,
              status: game.status ?? true,
              type: game.type || 'Slots',
              provider: provider,
              createdAt: game.createdAt || new Date().toISOString(),
              updatedAt: game.updatedAt || new Date().toISOString(),
            };

            // Check or create the game
            const existingGame = await this.gameRepository.findOne({
              where: { gameId: gameData.gameId },
              relations: { provider: true },
            });

            if (existingGame) {
              this.gameRepository.merge(existingGame, gameData);
              return await this.gameRepository.save(existingGame);
            } else {
              return await this.gameRepository.save(
                this.gameRepository.create(gameData),
              );
            }
          } catch (error) {
            console.error(
              `Error processing game: ${game.title}`,
              error.message,
            );
            return null;
          }
        }),
      );

      // Filter out unsuccessful saves
      const successfullySavedGames = savedGames.filter((game) => game !== null);

      return {
        success: true,
        message: 'Games synchronized successfully',
        games: successfullySavedGames,
      };
    } catch (error) {
      console.error('Error saving games:', error.message);
      return {
        success: false,
        message: `Error synchronizing games: ${error.message}`,
        games: [],
      };
    }
  }

  async launchGames(payload: StartGameDto): Promise<any> {
    try {
      const { gameId, userId, authCode, demo, balanceType, isMobile, homeUrl } =
        payload;

      // Fetch game details from the repository
      const gameExist = await this.gameRepository.findOne({
        where: { id: gameId },
        relations: { provider: true },
      });

      console.log('Lunch Game retrieved from DB:', gameExist);

      if (!gameExist) {
        console.error(`Game with ID ${gameId} not found`);
        throw new NotFoundException('Game not found');
      }

      // Determine mode and device
      const mode = demo ? 'demo' : 'real';
      const device = isMobile ? 'mobile' : 'desktop';

      console.log('mode', 'device', mode, device);

      // Construct the wallet session ID (if applicable)
      const walletSessionId = authCode;

      // Log the mode and device selection for debugging
      console.log('Selected mode:', mode, 'Selected device:', device);

      // Define the return URL
      const returnUrl = homeUrl;

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

      // Save the Wallet-Session for future use

      try {
        await this.gameSessionRepo.save(gameSession);
        console.log('Game session saved successfully:', gameSession);
      } catch (dbError) {
        console.error('Error saving game session:', dbError.message);
        throw new Error(`Failed to save game session: ${dbError.message}`);
      }

      const passkey = 'sbestaging';
      const sessionVerification = await this.verifySession(
        userId,
        gameExist.gameId,
        walletSessionId,
        passkey,
      );

      if (!sessionVerification || !sessionVerification.success) {
        console.error('Session verification failed:', sessionVerification);
        return {
          success: false,
          message: 'Session verification failed',
          data: {},
        };
      }

      console.log('I am Verified');
      // Prepare the API request URL
      const requestUrl = `${this.QTECH_BASEURL}/v1/games/${gameId}/launch-url`;

      console.log('requestUrl:', requestUrl);

      // Set up headers
      const headers = {
        Authorization: `Bearer ${await this.getAccessToken()}`,
        // 'Wallet-Session': walletSessionId,
      };

      // Prepare the payload
      const requestBody = {
        playerId: userId,
        walletSessionId,
        currency: 'NGN',
        country: 'NG',
        lang: 'en_US',
        mode,
        device,
        returnUrl,
      };

      console.log('requestBody:', requestBody);
      // Make the API request
      const { data } = await this.httpService
        .post(requestUrl, requestBody, { headers })
        .toPromise();

      console.log('Response data:', data);
      console.log('Response returnUrl:', data.returnUrl);

      // Return the game URL
      return { url: data.url };
    } catch (error) {
      console.error('Error in launchGames:', error.message);
      throw new RpcException(
        error.response?.data?.message || 'Launch Game failed',
      );
    }
  }

  async verifySession(
    playerId,
    gameId,
    walletSessionId,
    passkey,
  ): Promise<any> {
    try {
      // Validate required parameters
      if (!playerId || !gameId || !walletSessionId || !passkey) {
        return {
          success: false,
          message: 'Missing required parameters',
        };
      }

      // Check if the game exists
      // const gameExist = await this.gameRepository.findOne({
      //   where: { id: gameId },
      //   relations: { provider: true },
      // });

      // console.log('Verify Session Game retrieved from DB:', gameExist);

      // if (!gameExist) {
      //   console.error(`Game with ID ${gameId} not found`);
      //   throw new NotFoundException('Game not found');
      // }

      // Construct the URL
      const url = `${this.OPERATOR_URL}/accounts/${playerId}/session?gameId=${gameId}`;

      // Set headers
      const headers = {
        'Pass-Key': passkey,
        'Wallet-Session': walletSessionId,
      };

      console.log('Making GET request to:', url, 'with headers:', headers);

      // Make the GET request
      try {
        const response = await axios.get(url, { headers });
        console.log('Verify Session response:', response.data);
        return response.data; // Return the response data
      } catch (error) {
        console.error('Error verifying session:', error.message);
        throw new RpcException(
          error.response?.data?.message || 'Failed to verify session',
        );
      }
    } catch (e) {
      console.error('Error in verifySession:', e.message, {
        playerId,
        gameId,
        walletSessionId,
      });

      throw new RpcException(
        e.response?.data?.message || 'Verify Session failed',
      );
    }
  }

  async getBalance(clientId, userId, gameId?): Promise<any> {
    try {
      console.log('Got to balance method');

      // Validate input parameters
      if (!userId || !clientId) {
        return {
          success: false,
          status: HttpStatus.BAD_REQUEST,
          message: 'ClientId or UserId is missing',
          data: {},
        };
      }

      // Fetch the wallet balance using wallet service
      const wallet = await this.walletService.getWallet({ userId, clientId });

      // Parse the wallet response
      const walletData =
        typeof wallet === 'string' ? JSON.parse(wallet) : wallet;

      if (!walletData?.success) {
        return {
          success: false,
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Could not retrieve balance from wallet service',
          data: {},
        };
      }

      // Fetch game details if gameId is provided
      let gameExist;
      if (gameId) {
        gameExist = await this.gameRepository.findOne({
          where: { id: gameId },
          relations: { provider: true },
        });

        if (!gameExist) {
          return {
            success: false,
            status: HttpStatus.NOT_FOUND,
            message: 'Game not found',
            data: {},
          };
        }
      }

      // Fetch session information
      const session = await this.gameSessionRepo.findOne({
        where: { game_id: gameId },
      });

      if (!session) {
        return {
          success: false,
          message: 'Session not found',
          data: {},
        };
      }

      const walletSessionId = session.session_id;

      // Validate session ID
      if (!walletSessionId) {
        return {
          success: false,
          message: 'Session ID is missing',
          data: {},
        };
      }

      // External API call to fetch the balance
      const url = `${this.OPERATOR_URL}/accounts/${userId}/balance`;
      const headers = {
        'Pass-Key': this.QTECH_PASS_KEY,
        'Wallet-Session': walletSessionId,
      };

      const params: Record<string, string> = {};
      if (gameId) {
        params.gameId = gameId;
      }

      const externalBalanceResponse = await this.httpService
        .get(url, { headers, params })
        .toPromise();

      const externalBalanceData = externalBalanceResponse?.data;

      // Construct the response
      return {
        success: true,
        status: HttpStatus.OK,
        message: 'Balance retrieved successfully',
        data: {
          cash: parseFloat(walletData.data.availableBalance.toFixed(2)),
          currency: walletData.data.currency || 'NGN',
          externalBalance: {
            balance: parseFloat(externalBalanceData?.balance.toFixed(2)),
            currency: externalBalanceData?.currency || 'NGN',
          },
        },
      };
    } catch (error) {
      console.error('Error in getBalance:', error.message);
      throw new RpcException(
        error.response?.data?.message || 'Get Balance failed',
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

  async bet(clientId, player, callback, body, balanceType) {
    console.log('Got to bet method');
    console.log('bet-callback', callback);
    console.log('player', player, body, balanceType);
    let response: any;

    if (player) {
      const gameExist = await this.gameRepository.findOne({
        where: { gameId: body.get('gameId') },
        relations: { provider: true },
      });
      console.log('Game retrieved from DB:', gameExist);

      // If game doesn't exist, throw an error
      if (!gameExist) {
        response = {
          success: false,
          status: HttpStatus.BAD_REQUEST,
          message: `Game with id ${body.get('gameId')}not Found`,
          data: {},
        };

        await this.callbackLogRepository.update(
          { id: callback.id },
          { response: JSON.stringify(response) },
        );
        return response;
      }

      const getWallet = await this.walletService.getWallet({
        userId: player.playerId,
        clientId,
      });

      console.log('getWallet', getWallet);

      if (!getWallet || !getWallet.status) {
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

      const dataObject =
        typeof getWallet.data === 'string'
          ? JSON.parse(getWallet.data)
          : getWallet.data;

      console.log('dataObject', dataObject, body.get('amount'));

      if (dataObject.availableBalance < body.get('amount')) {
        response = {
          success: false,
          status: HttpStatus.BAD_REQUEST,
          message: 'Insufficient balance to place this bet',
          data: {},
        };

        const val = await this.callbackLogRepository.update(
          { id: callback.id },
          { response: JSON.stringify(response) },
        );
        console.log('val', val);

        return response;
      }

      // Retrieve the Wallet-Session from the database
      const session = await this.gameSessionRepo.findOne({
        where: { game_id: gameExist.gameId },
      });

      if (!session) {
        return {
          success: false,
          message: 'Session not found',
          data: {},
        };
      }

      const walletSessionId = session.session_id;

      // Log game session details
      console.log('Game session created:', walletSessionId);

      if (!walletSessionId) {
        console.error('Session ID is missing or invalid');
        return {
          success: false,
          message: 'Session ID is missing',
          data: {},
        };
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
        roundDetails: body.get('roundDetails'),
      };

      console.log('placeBetPayload', placeBetPayload);

      const place_bet = await this.placeBet(placeBetPayload);

      console.log('place_bet', place_bet);

      if (!place_bet.success) {
        response = {
          success: false,
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Place bet unsuccessful',
        };

        const val = await this.callbackLogRepository.update(
          { id: callback.id },
          { response: JSON.stringify(response) },
        );
        console.log('val', val);

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

      console.log('debit', debit);

      if (!debit.success) {
        response = {
          success: false,
          status: HttpStatus.BAD_REQUEST,
          message: 'Error debiting user wallet',
        };

        const val = await this.callbackLogRepository.update(
          { id: callback.id },
          { response: JSON.stringify(response) },
        );
        console.log('val', val);

        return response;
      }

      const getUpdatedWallet = await this.walletService.getWallet({
        userId: player.playerId,
        clientId,
      });

      console.log('getWallet', getUpdatedWallet);

      response = {
        success: true,
        message: 'Bet Successful',
        status: HttpStatus.OK,
        data: {
          cash: parseFloat(getUpdatedWallet.data.availableBalance.toFixed(2)),
          transactionId: place_bet.data.transactionId,
          currency: player.currency,
          bonus:
            balanceType === 'casino'
              ? parseFloat(getUpdatedWallet.data.casinoBonusBalance.toFixed(2))
              : 0.0,
          usedPromo:
            balanceType === 'casino' ? parseFloat(body.get('amount')) : 0.0,
          error: 0,
          description: 'Successful',
        },
      };

      const url = `${this.OPERATOR_URL}/transactions}`;

      const headers = {
        'Pass-Key': this.QTECH_PASSWORD,
        'Wallet-Session': walletSessionId,
      };

      const payload = {
        playerId: player.playerId,
        transactionId: body.get('reference'),
        roundId: body.get('roundId'),
        gameId: body.get('gameId'),
        amount: parseFloat(body.get('amount')),
        currency: player.currency,
        type: 'bet',
        status: 'success',
        description: `Casino Bet: (${gameExist.title}:${body.get('reference')})`,
      };

      const { data } = await this.httpService
        .post(url, payload, { headers })
        .toPromise();
      console.log(' response:', data);

      await this.callbackLogRepository.update(
        { id: callback.id },
        { response: JSON.stringify(response) },
      );

      console.log('bet-response', response);

      return response;
    } else {
      response = {
        success: false,
        status: HttpStatus.BAD_REQUEST,
        message: `Player with userId ${player.playerId} not found`,
        data: {},
      };

      await this.callbackLogRepository.update(
        { id: callback.id },
        { response: JSON.stringify(response) },
      );
      return response;
    }
  }

  async placeBet(data: PlaceCasinoBetRequest) {
    return firstValueFrom(this.betService.placeCasinoBet(data));
  }

  async handleCallback(data: QtechCallbackRequest) {
    console.log('_data', data);

    const callback = await this.saveCallbackLog(data);
    console.log('callback-4', callback);
    let response;
    let body = {};

    // Return response if already logged
    if (callback?.response != null) {
      console.log('Existing callback response found. Processing it.');

      const existingRequest = JSON.parse(callback.payload);
      const existingResponse = JSON.parse(callback.response);

      console.log('existingRequest', existingRequest);
      console.log('existingResponse', existingResponse);

      if (existingRequest?.userId) {
        console.log('Got to the updated wallet block');
        const userId = existingRequest.userId;

        try {
          const getWallet = await this.walletService.getWallet({
            userId,
            clientId: data.clientId,
          });

          console.log('getWallet', getWallet);

          if (!getWallet || !getWallet.status) {
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

          if (getWallet && getWallet.data.availableBalance !== undefined) {
            existingResponse.data.cash = getWallet.data.availableBalance;

            await this.callbackLogRepository.update(
              { id: callback.id },
              { response: JSON.stringify(existingResponse) },
            );

            console.log(
              'Updated response with wallet balance:',
              existingResponse,
            );
            return existingResponse;
          }
        } catch (error) {
          console.error(
            'Error fetching wallet details or updating response:',
            error,
          );
        }
      } else {
        return JSON.parse(callback.response);
      }
    }

    // Parse the body if it exists
    if (data.body) {
      try {
        // Parse the body as URLSearchParams
        body = new URLSearchParams(data.body);
      } catch (error) {
        console.error('Error parsing body:', error);
        response = {
          success: false,
          message: 'Invalid body format',
          status: HttpStatus.BAD_REQUEST,
          data: { error: 5, description: 'Error' },
        };

        await this.callbackLogRepository.update(
          { id: callback.id },
          { response: JSON.stringify(response) },
        );
        return response;
      }
    }

    console.log('body', body);

    if (body instanceof URLSearchParams) {
      // Retrieve required fields from URLSearchParams
      const playerId = body.get('playerId');
      const gameId = body.get('gameId');
      const walletSessionId = body.get('walletSessionId');
      const passKey = body.get('passKey');

      if (!playerId || !gameId || !walletSessionId || !passKey) {
        response = {
          success: false,
          message: 'Missing required parameters',
          status: HttpStatus.BAD_REQUEST,
          data: { error: 5, description: 'Missing data' },
        };

        await this.callbackLogRepository.update(
          { id: callback.id },
          { response: JSON.stringify(response) },
        );
        return response;
      }

      console.log('Parsed parameters:', {
        playerId,
        gameId,
        walletSessionId,
        passKey,
      });

      // Call verifySession with parsed parameters
      return await this.verifySession(
        playerId,
        gameId,
        walletSessionId,
        passKey,
      );
    } else {
      response = {
        success: false,
        message: 'Invalid body format',
        status: HttpStatus.BAD_REQUEST,
        data: { error: 5, description: 'Error' },
      };

      await this.callbackLogRepository.update(
        { id: callback.id },
        { response: JSON.stringify(response) },
      );
      return response;
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
  //       return await this.getBalance(data.clientId, player, callback);
  //     case 'Bet':
  //       return await this.bet(
  //         data.clientId,
  //         player,
  //         callback,
  //         body,
  //         balanceType,
  //       );

  //     case 'Session':
  //       console.log('USING SESSION');
  //       return await this.verifySession(playerId, player, callback, body);
  //     // case 'Result':
  //     //   return await this.win(
  //     //     data.clientId,
  //     //     player,
  //     //     callback,
  //     //     body,
  //     //     balanceType,
  //     //   );
  //     // case 'Refund':
  //     //   return await this.refund(
  //     //     data.clientId,
  //     //     player,
  //     //     callback,
  //     //     body,
  //     //     balanceType,
  //     //   );
  //     // case 'BonusWin':
  //     //   return await this.bonusWin(
  //     //     data.clientId,
  //     //     player,
  //     //     callback,
  //     //     body,
  //     //     balanceType,
  //     //   );
  //     // case 'JackpotWin':
  //     //   return await this.jackpotWin(
  //     //     data.clientId,
  //     //     player,
  //     //     callback,
  //     //     body,
  //     //     balanceType,
  //     //   );
  //     // case 'PromoWin':
  //     //   return await this.promoWin(
  //     //     data.clientId,
  //     //     player,
  //     //     callback,
  //     //     body,
  //     //     balanceType,
  //     //   );
  //     default:
  //       return {
  //         success: false,
  //         message: 'Invalid request',
  //         status: HttpStatus.BAD_REQUEST,
  //       };
  //   }
  // }
}
