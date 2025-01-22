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
import { Repository } from 'typeorm';

import {
  CallbackLog,
  Game as GameEntity,
  GameSession,
  Provider as ProviderEntity,
} from '../entities';
import {
  QtechCallbackRequest,
  StartGameDto,
} from 'src/proto/gaming.pb';
import {
  CreditCasinoBetRequest,
  PlaceCasinoBetRequest,
  RollbackCasinoBetRequest,
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
      const { gameId, userId, authCode, balanceType, isMobile, homeUrl } =
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
      const mode = 'real';
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
      console.log('Response returnUrl:', data.url);

      // Return the game URL
      return { url: data.url };
    } catch (error) {
      console.error('Error in launchGames:', error.message);
      throw new RpcException(
        error.response?.data?.message || 'Launch Game failed',
      );
    }
  }

  async verifySession(payload: QtechCallbackRequest, callback: CallbackLog): Promise<any> {
    const { walletSessionId, clientId } = payload;
    try {
      // Validate token
      const auth = await this.identityService.validateToken({
        clientId,
        token: walletSessionId,
      });
      
      // console.log('Validation Result:', auth);

      if (!auth || !auth.success) {
        const response = this.createErrorResponse('INVALID_TOKEN', HttpStatus.BAD_REQUEST, 'Missing, invalid or expired player (wallet) session token.');
        // update callback logs, and gaming session
        await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id})

        return response;
      }

      const currency = auth.data.currency;
      const balance = auth.data.balance;

      console.log('Currency:', currency, 'Balance:', balance);

      // Construct success response
      const response = this.createSuccessResponse(HttpStatus.OK, 'Success', { balance, currency });
       // update callback logs, and gaming session
      await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id})

      return response;
      
    } catch (error) {
      console.error('Error in verifySession:', error.message);
      const response = this.createErrorResponse('UNKNOWN_ERROR', HttpStatus.INTERNAL_SERVER_ERROR, 'Unexpected error.');
      // update callback logs, and gaming session
      await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id})
      return response;
    }
  }

  async getBalance(payload: QtechCallbackRequest, callback: CallbackLog): Promise<any> {
    const { walletSessionId, clientId, playerId } = payload;

    try {

      // Validate token and get user balance
      const isValid = await this.identityService.validateToken({
        clientId,
        token: walletSessionId,
      });

      // console.log('Validation Result:', isValid);

      if (!isValid || !isValid.success) {
        // format error response
        const response = this.createErrorResponse('REQUEST_DECLINED', HttpStatus.BAD_REQUEST, 'Invalid player ID');
        // update callback logs, and gaming session
        await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id});

        return response;
      }

      const currency = isValid.data.currency;
      const balance = isValid.data.balance;

      console.log('Balance:', balance, 'Currency:', currency);

      // Construct success response
      const response = this.createSuccessResponse(HttpStatus.OK, 'Balance retrieved', { balance, currency });
      // update callback logs, and gaming session
      await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id});

      return response;

    } catch (error) {
      console.error('Error in getBalance:', error.message);
      const response = this.createErrorResponse('UNKNOWN_ERROR', HttpStatus.INTERNAL_SERVER_ERROR, 'Unexpected error.');
      // update callback logs, and gaming session
      await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id})
      return response;
    }
  }


  async saveCallbackLog(data) {
    const action = data.action;
    const body = data.body ? JSON.parse(data.body) : '';
    const transactionId = action === 'verifySession' ? data.walletSessionId : action === 'getBalance' ? `${data.walletSessionId}-${data.playerId}` : body.txnId;
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

  async bet(payload: QtechCallbackRequest, callback: CallbackLog): Promise<any> {
    const { clientId, playerId, walletSessionId, gameId, body } = payload;
    const debitData: any = JSON.parse(body);
    // console.log('Debit request', debitData)
    try {
      let game = null;
      let amount = debitData.amount;
      let balanceType = 'main';
      let gameSession;
      // get game session
      gameSession = await this.gameSessionRepo.findOne({where: {session_id: walletSessionId}})
      
      if (gameSession && gameSession.balance_type === 'bonus')
        balanceType = 'casino';
      
      // Check if the game exists
      game = await this.gameRepository.findOne({
        where: { gameId },
        relations: { provider: true },
      });

      if (!game) {
        // format error response
        const response = this.createErrorResponse('REQUEST_DECLINED', HttpStatus.BAD_REQUEST, 'Game does not exist.');
        // update callback logs, and gaming session
        await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id});

        return response;
      }

      const gameName = game.title;
        
      // Validate token
      const auth = await this.identityService.validateToken({
        clientId,
        token: walletSessionId,
      });

      if (!auth || !auth.success) {
        const response = this.createErrorResponse('INVALID_TOKEN', HttpStatus.BAD_REQUEST, 'Missing, invalid or expired player (wallet) session token.');
        // update callback logs, and gaming session
        await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id})

        return response;
      }
    
      if(auth.data.balance < debitData.amount) {
        const response = this.createErrorResponse('INSUFFICIENT_FUNDS', HttpStatus.BAD_REQUEST, 'Insufficient balance');
        // update callback log response and game session with callback id
        await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id})

        return response;
      }

      const placeBetPayload: PlaceCasinoBetRequest = {
        userId: parseInt(playerId),
        clientId,
        roundId: debitData.roundId,
        transactionId: debitData.txnId,
        gameId: debitData.gameId,
        stake: debitData.amount,
        gameName: game.title,
        gameNumber: gameId,
        source: game.provider.slug,
        cashierTransactionId: debitData.clientRoundId,
        winnings: 0,
        username: auth.data.playerNickname,
        bonusId: gameSession?.bonus_id || null
      };

      const place_bet = await this.placeBet(placeBetPayload);
      // console.log(place_bet)
      if (!place_bet.success) {
        const response = this.createErrorResponse('REQUEST_DECLINED', HttpStatus.BAD_REQUEST, 'Unable to place bet.');

        // update callback log response and game session with callback id
        await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id})

        return response;
      }

      const debit = await this.walletService.debit({
        userId: parseInt(playerId),
        clientId,
        amount: debitData.amount.toFixed(2),
        source: game.provider.slug,
        description: `Casino Bet: (${gameName}:${debitData.gameId})`,
        username: auth.data.playerNickname,
        wallet: balanceType,
        subject: 'Bet Deposit (Casino)',
        channel: gameName,
      });

      console.log(debit)

      if (!debit.success) {
        const response = this.createErrorResponse('REQUEST_DECLINED', HttpStatus.BAD_REQUEST, 'Unable to place bet. Something went wrong');
        // update callback log response and game session with callback id
        await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id})

        return response;
      }
      
      const response = this.createSuccessResponse(HttpStatus.OK, 'Debit, Successful', { 
        balance: parseFloat(debit.data.balance.toFixed(2)),
        referenceId: place_bet.data.transactionId,        
      });

      // update callback log response
      await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id}, true)

      return response;
    } catch (error) {
      console.error('Error placing bet:', error.message);
      const response = this.createErrorResponse('UNKNOWN_ERROR', HttpStatus.INTERNAL_SERVER_ERROR, 'Unexpected error.');
      // update callback logs, and gaming session
      await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id})
      return response;
    }
  }

  async win(payload: QtechCallbackRequest, callback: CallbackLog): Promise<any> {
    console.log('Processing win method...');

    const { walletSessionId, gameId, clientId, body, playerId } = payload;

    try {
      const creditData: any = JSON.parse(body);

      // Validate gameId
      let game = null;
      let balanceType = 'main';
      let amount = creditData.amount;
      let gameSession;

      // Check if the game exists
      game = await this.gameRepository.findOne({
        where: { gameId },
        relations: { provider: true },
      });

      // get game session
      gameSession = await this.gameSessionRepo.findOne({where: {session_id: walletSessionId}})
      
      if ((gameSession && gameSession.balance_type === 'bonus') || creditData.bonusType)
        balanceType = 'casino';
      
      // Validate token
      const player = await this.identityService.getDetails({
        clientId,
        userId: parseInt(playerId),
      });

      // check if transaction ID exist and return user balance
      if (callback.transactionId === creditData.txnId && callback.status === true) {
        console.log('transaction completed')
        const walletRes = await this.walletService.getWallet({
          userId: parseInt(playerId), 
          clientId
        });

        const response = this.createSuccessResponse(HttpStatus.OK, 'Successful', {
          balance: walletRes.data.availableBalance,
          referenceId: callback.id,
        })

        return response;
      }

      let creditRes = null;
          
      const settlePayload: CreditCasinoBetRequest = {
        transactionId: creditData.betId,
        winnings: creditData.amount,
      };

      // settle won bet
      const settle_bet = await this.result(settlePayload);

      if (!settle_bet.success)  {
        const response = this.createErrorResponse('REQUEST_DECLINED', HttpStatus.BAD_GATEWAY, 'Unable  to process request')
        // update callback log response
        await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id})

        return response;
      }
      // close round if completed is true
      if (creditData.completed === "true") {
        const payload: CreditCasinoBetRequest = {
          transactionId: creditData.roundId,
          winnings: creditData.amount,
        };
        // settle won bet
        await this.betService.closeRound(payload);
      }

      // console.log(settle_bet, 'settlebet response')
      creditRes = await this.walletService.credit({
        userId: playerId,
        clientId,
        amount: creditData.amount.toFixed(2),
        source: game.provider.slug,
        description: `Casino Bet: (${game.title}:${gameId})`,
        username: player.data.username,
        wallet: balanceType,
        subject: 'Bet Win (Casino)',
        channel: creditData.device,
      });

      const response = this.createSuccessResponse(HttpStatus.OK, 'Credit, Successful', { 
        balance: parseFloat(creditRes.data.balance.toFixed(2)),
        referenceId: callback.id,        
      });      
      // update callback log response
      await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id}, true)

      return response;
        
    } catch (error) {
      console.error('Error processing win:', error.message);
      const response = this.createErrorResponse('UNKNOWN_ERROR', HttpStatus.INTERNAL_SERVER_ERROR, 'Unexpected error.');
      // update callback logs, and gaming session
      await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id})
      return response;
    }
  }

  async refund(payload: QtechCallbackRequest, callback: CallbackLog) {
    const { playerId, walletSessionId, gameId, clientId, body } = payload;
    const data: any = JSON.parse(body);
    
    try {
      // Validate gameId
      let game = null;
      let balanceType = 'main';
      let gameSession;

      // Check if the game exists
      game = await this.gameRepository.findOne({
        where: { gameId },
        relations: { provider: true },
      });

      const reversePayload: RollbackCasinoBetRequest = {
        transactionId: data.betId,
      };

      console.log('Processing Rollback')
      // get callback log
      const callbackLog = await this.callbackLogRepository.findOne({where: {transactionId: reversePayload.transactionId }})

      // get player details
      const player = await this.identityService.getDetails({
        clientId,
        userId: parseInt(playerId),
      });

      if (!callbackLog) {
        console.log('Callback log found')

        const response = this.createSuccessResponse(HttpStatus.OK, 'Transaction not found', {balance: player.data.availableBalance});
        
        await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id})

        return response;
      }

      // const transactionPayload = JSON.parse(callbackLog.payload);
      // console.log(transactionPayload)
      // const transactionResponse = JSON.parse(callbackLog.response);
      const transaction = await this.rollback(reversePayload);

      if (!transaction.success)  {
        console.log('ticket update not successful')
        const response = this.createErrorResponse('REQUEST_DECLINED', HttpStatus.BAD_REQUEST, 'Unable to process request.')
        // update callback log response
        await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id})

        return response;
      }

      const rollbackWalletRes = await this.walletService.credit({
        userId: playerId,
        clientId,
        amount: data.amount.toFixed(2),
        source: gameId,
        description: `Bet Cancelled: (${game.title}:${data.gameId})`,
        username: player.data.username,
        wallet: balanceType,
        subject: 'Bet Rollback (Casino)',
        channel: data.device,
      });

      console.log('credit wallet respons', rollbackWalletRes)

      const response = this.createSuccessResponse(HttpStatus.OK, 'Successful', {
        balance: parseFloat(rollbackWalletRes.data.balance.toFixed(2)),
        referenceId: callback.id,
      })
      // update callback log response
      await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id}, true)

      return response;
    } catch (e) {
      console.error('Error processing win:', e.message);
      const response = this.createErrorResponse('UNKNOWN_ERROR', HttpStatus.INTERNAL_SERVER_ERROR, 'Unexpected error.');
      // update callback logs, and gaming session
      await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id});

      return response;
    }
  }

  // Helper to create error responses
  private createErrorResponse(code: string, status: number, message: string): any {
    return {
      success: false,
      status,
      data: {
        code,
        message,
      },
    };
  }

  // Helper to create success responses
  private createSuccessResponse(status, message, data): any {
    return {
      success: true,
      status,
      message,
      data,
    };
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

  async handlCallbacks(_data: QtechCallbackRequest): Promise<any> {
    // console.log('_data', _data);
    //const balanceType = 'main';
    // console.log('using qtech-games');

    const callback = await this.saveCallbackLog(_data);
    
    // verify pass key, if not valid, return error
    if (_data.passkey !== process.env.QTECH_PASS_KEY)
      return this.createErrorResponse('LOGIN_FAILED', HttpStatus.UNAUTHORIZED, 'The given pass-key is incorrect.');

    // console.log('callback-4', callback);

    switch (_data.action) {
      case 'verifySession':
        return await this.verifySession(_data, callback);
      case 'getBalance':
        return await this.getBalance(
         _data,
         callback
        );
      case 'DEBIT':
        return await this.bet(_data, callback);
      case 'CREDIT':
        return await this.win(_data, callback);
      case 'ROLLBACK':
        return await this.refund(_data, callback);

      default:
        return this.createErrorResponse('REQUEST_DECLINED', HttpStatus.BAD_REQUEST, 'Something went wrong. Could not be process request.')
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
}
