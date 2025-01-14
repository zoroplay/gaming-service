/* eslint-disable prettier/prettier */
import { HttpService } from '@nestjs/axios';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { BetService } from 'src/bet/bet.service';
import { CasinoGame } from 'src/entities/casino-game.entity';
import { IdentityService } from 'src/identity/identity.service';
import { WalletService } from 'src/wallet/wallet.service';
import { Raw, Repository } from 'typeorm';

import {
  CallbackLog,
  Game as GameEntity,
  GameSession,
  Provider as ProviderEntity,
} from '../entities';
import { QtechCallbackRequest, StartGameDto } from 'src/proto/gaming.pb';
import {
  CreditCasinoBetRequest,
  PlaceCasinoBetRequest,
  RollbackCasinoBetRequest,
  SettleCasinoBetRequest,
} from 'src/proto/betting.pb';
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

      console.log('Game retrieved from DB:', gameExist);

      if (!gameExist) {
        console.error(`Game with ID ${gameId} not found`);
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Game not found',
          data: {},
        };
      }

      // Determine mode and device
      const mode = demo ? 'demo' : 'real';
      const device = isMobile ? 'mobile' : 'desktop';

      console.log('mode', 'device', mode, device);

      // Construct the wallet session ID (if applicable)
      const walletSessionId = authCode || `session_${Date.now()}`;

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
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Auth token is missing',
          data: {},
        };
      }

      // Save the Wallet-Session for future use

      try {
        await this.gameSessionRepo.save(gameSession);
        console.log('Game session saved successfully:', gameSession);
      } catch (dbError) {
        console.error('Error saving game session:', dbError.message);
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: `Failed to save game session: ${dbError.message}`,
        };
      }

      // Prepare the API request URL
      const requestUrl = `${this.QTECH_BASEURL}/v1/games/${gameExist.gameId}/launch-url`;

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

  async verifySession(payload: QtechCallbackRequest): Promise<any> {
    try {
      const { walletSessionId, clientId } = payload;

      // Validate token
      const isValid = await this.identityService.validateToken({
        clientId,
        token: walletSessionId,
      });
      console.log('Validation Result:', isValid);

      if (!isValid || !isValid.status) {
        const response = this.createErrorResponse('Invalid session', 5);
        return response;
      }

      // Parse validation data
      const dataObject =
        typeof isValid.data === 'string'
          ? JSON.parse(isValid.data)
          : isValid.data;

      console.log('Parsed Data Object:', dataObject);

      // Construct success response
      const response = this.createSuccessResponse(
        dataObject,
        // walletType,
        // walletSessionId,
      );
      return response;
    } catch (error) {
      console.error('Error in verifySession:', error);
      throw new RpcException(
        (error.response && error.response.data) || 'Error verifying session',
      );
    }
  }

  // Helper to create error responses
  private createErrorResponse(message: string, errorCode: number): any {
    return {
      success: false,
      message,
      status: HttpStatus.BAD_REQUEST,
      data: {
        error: errorCode,
        description: message,
      },
    };
  }

  // Helper to create success responses
  private createSuccessResponse(
    data: any,
    //walletType: string,
    // walletSessionId: string,
  ): any {
    return {
      success: true,
      status: HttpStatus.OK,
      message: 'Authentication Successful',
      data: {
        currency: data.currency,
        balance: data.casinoBalance,

        error: 0,
        description: 'Success',
      },
    };
  }

  async getBalance(clientId, playerId, gameId?): Promise<any> {
    try {
      console.log('Got to balance method');

      // Validate input parameters
      if (!playerId || !clientId) {
        return {
          success: false,
          status: HttpStatus.BAD_REQUEST,
          message: 'ClientId or UserId is missing',
          data: {},
        };
      }

      // Fetch the wallet balance using wallet service
      const wallet = await this.walletService.getWallet({
        userId: playerId,
        clientId,
      });

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

      const params: Record<string, string> = {};
      if (gameId) {
        params.gameId = gameId;
      }

      // Construct the response
      return {
        success: true,
        status: HttpStatus.OK,
        message: 'Balance retrieved successfully',
        data: {
          cash: parseFloat(walletData.data.availableBalance.toFixed(2)),
          currency: walletData.data.currency || 'NGN',
        },
      };
    } catch (error) {
      console.error('Error in getBalance:', error.message);
      throw new RpcException(
        error.response?.data?.message || 'Get Balance failed',
      );
    }
  }

  // async authenticate(clientId, token, callback, walletType) {
  //   console.log('Got to authenticate method');
  //   const isValid = await this.identityService.validateToken({
  //     clientId,
  //     token,
  //   });

  //   console.log('isValid', isValid);
  //   let response: any;
  //   const dataObject =
  //     typeof isValid.data === 'string'
  //       ? JSON.parse(isValid.data)
  //       : isValid.data;

  //   console.log('dataObject', dataObject);

  //   if (!isValid || !isValid.status) {
  //     response = {
  //       success: false,
  //       status: HttpStatus.BAD_REQUEST,
  //       message: 'Invalid auth code, please login to try again',
  //       data: {},
  //     };

  //     const val = await this.callbackLogRepository.update(
  //       { id: callback.id },
  //       { response: JSON.stringify(response) },
  //     );
  //     console.log('val', val);

  //     return response;
  //   }

  //   response = {
  //     success: true,
  //     status: HttpStatus.OK,
  //     message: 'Authentication Successful',
  //     data: {
  //       userId: dataObject.playerId,
  //       currency: dataObject.currency,
  //       bonus: dataObject.casinoBalance,
  //       token: token,
  //       error: 0,
  //       description: 'Success',
  //     },
  //   };

  //   await this.callbackLogRepository.update(
  //     { id: callback.id },
  //     { response: JSON.stringify(response) },
  //   );

  //   return response;
  // }

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

      await this.callbackLogRepository.update(
        { id: callback.id },
        { response: JSON.stringify(response) },
      );
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

      await this.callbackLogRepository.update(
        { id: callback.id },
        { response: JSON.stringify(response) },
      );
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
          payload: Raw(
            (alias) => `${alias} LIKE '%"roundId":"${body.get('roundId')}"%'`,
          ),
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

        await this.callbackLogRepository.update(
          { id: callback.id },
          { response: JSON.stringify(response) },
        );
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
        await this.callbackLogRepository.update(
          { id: callback.id },
          { response: JSON.stringify(response) },
        );
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
        await this.callbackLogRepository.update(
          { id: callback.id },
          { response: JSON.stringify(response) },
        );
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
        await this.callbackLogRepository.update(
          { id: callback.id },
          { response: JSON.stringify(response) },
        );
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

      await this.callbackLogRepository.update(
        { id: callback.id },
        { response: JSON.stringify(response) },
      );
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

  async result(data: CreditCasinoBetRequest) {
    return await firstValueFrom(this.betService.settleCasinoBet(data));
  }

  async rollback(data: RollbackCasinoBetRequest) {
    return await firstValueFrom(this.betService.cancelCasinoBet(data));
  }

  async refund(clientId, player, callback, body, balanceType) {
    console.log('Got to refund method');
    console.log('player', player, body, balanceType);
    let response: any;

    if (player) {
      const reversePayload: RollbackCasinoBetRequest = {
        transactionId: body.get('reference'),
      };

      console.log('reversePayload', reversePayload);

      const callbackLog = await this.callbackLogRepository.findOne({
        where: { transactionId: body.get('reference'), request_type: 'Bet' },
      });

      if (!callbackLog) {
        console.log('Callback log not found');

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

        await this.callbackLogRepository.update(
          { id: callback.id },
          { response: JSON.stringify(response) },
        );
        return response;
      }

      const callbackPayload = JSON.parse(callbackLog.payload);

      const gameExist = await this.gameRepository.findOne({
        where: { gameId: callbackPayload.gameId },
        relations: { provider: true },
      });
      console.log('Game retrieved from DB:', gameExist);

      // // If game doesn't exist, throw an error
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
        console.log('transaction error');
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

        await this.callbackLogRepository.update(
          { id: callback.id },
          { response: JSON.stringify(response) },
        );
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
        console.log('transaction error');
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

        await this.callbackLogRepository.update(
          { id: callback.id },
          { response: JSON.stringify(response) },
        );
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
        },
      };

      await this.callbackLogRepository.update(
        { id: callback.id },
        { response: JSON.stringify(response) },
      );
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

  async handleQTGamesCallback(_data: QtechCallbackRequest): Promise<any> {
    console.log('_data', _data);
    const balanceType = 'main';
    console.log('using qtech-games');

    const callback = await this.saveCallbackLog(_data);
    console.log('callback-4', callback);

    const body = {};

    switch (_data.action) {
      case 'verifySession':
        const result = await this.verifySession(_data);
        return result;

      case 'getBalance':
        const balance = await this.getBalance(_data.clientId, _data.playerId);

        return balance;

      case 'transaction':
        const transaction = await this.bet(
          _data.clientId,
          _data.gameId,
          balanceType,
          callback,
          body,
        );
        return transaction;

      case 'win':
        const win = await this.win(
          _data.clientId,
          _data.gameId,
          balanceType,
          callback,
          body,
        );
        return win;

      default:
        return {
          success: false,
          message: 'Invalid request',
          status: HttpStatus.BAD_REQUEST,
        };
    }
  }
}
