/* eslint-disable prettier/prettier */
import { HttpService } from '@nestjs/axios';
import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { BetService } from 'src/bet/bet.service';
import { IdentityService } from 'src/identity/identity.service';
import { WalletService } from 'src/wallet/wallet.service';
import { Repository } from 'typeorm';

import { firstValueFrom } from 'rxjs';
import { GameKey } from 'src/entities/game-key.entity';
import {
  CreditCasinoBetRequest,
  PlaceCasinoBetRequest,
  RollbackCasinoBetRequest,
} from 'src/proto/betting.pb';
import {
  QtechCallbackRequest,
  StartGameDto
} from 'src/proto/gaming.pb';
import {
  CallbackLog,
  Game as GameEntity,
  GameSession,
  Provider as ProviderEntity,
} from '../entities';

@Injectable()
export class QtechService {
  private QTECH_BASEURL: string;
  private QTECH_PASSWORD: string;
  private QTECH_USERNAME: string;
  private QTECH_IMAGE_URL: string;
  private QTECH_PASS_KEY: string;
  private CLIENT_ID: number;
  private GAME_LINK: string;

  constructor(
    @InjectRepository(ProviderEntity)
    private providerRepository: Repository<ProviderEntity>,
    @InjectRepository(CallbackLog)
    private callbackLogRepository: Repository<CallbackLog>,
    @InjectRepository(GameEntity)
    private gameRepository: Repository<GameEntity>,
    @InjectRepository(GameSession)
    private gameSessionRepo: Repository<GameSession>,
    @InjectRepository(GameKey)
    private gameKeyRepository: Repository<GameKey>,
    private readonly betService: BetService,
    private readonly walletService: WalletService,
    private readonly identityService: IdentityService,
    private readonly httpService: HttpService,
  ) {
    
  }

  async setKeys (clientId) {
    this.CLIENT_ID = clientId;

    const gameKeys = await this.gameKeyRepository.find({
      where: {
          client_id: clientId,
          provider: 'qtech-games',
      },
    });

    // console.log("gameKeys", gameKeys);

    this.QTECH_BASEURL = gameKeys.find(key => key.option === 'QTECH_BASEURL')?.value;
    this.QTECH_PASSWORD = gameKeys.find(key => key.option === 'QTECH_PASSWORD')?.value;
    this.QTECH_USERNAME = gameKeys.find(key => key.option === 'QTECH_USERNAME')?.value;
    this.QTECH_IMAGE_URL = gameKeys.find(key => key.option === 'QTECH_IMAGE_URL')?.value;
    this.QTECH_PASS_KEY = gameKeys.find(key => key.option === 'QTECH_PASS_KEY')?.value;

  }
  // Get Casino Games

  async getAccessToken(): Promise<any> {
    try {
      const { data } = await this.httpService
        .post(
          `${this.QTECH_BASEURL}/v1/auth/token?grant_type=password&response_type=token&username=${this.QTECH_USERNAME}&password=${this.QTECH_PASSWORD}`,
        )
        .toPromise();

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

      return data.access_token;
    } catch (e) {
      return new RpcException(e.message || 'Something went wrong');
    }
  }

  async getCasinoGames(
    size: number = 500,
    currencies: string = 'NGN,SSP,KES',
    languages: string = 'en_US',
    gameTypes: string = 'BINGO,CASUALGAME,ESPORTS,INSTANTWIN,LIVECASINO,SCRATCHCARD,SHOOTING,SLOT,SPORTS,TABLEGAME,VIDEOPOKER,VIRTUAL_SPORTS,LOTTERY,CRASH,GAME_SHOW',
    includeFields: string = 'id,name,currencies,clientTypes,provider,description, images,languages,category',
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

      let url = `${this.QTECH_BASEURL}/v2/games?${params}`;
      if(this.GAME_LINK)
        url = this.GAME_LINK;

      console.log('Fetching games', url);

      const headers = {
        Authorization: `Bearer ${accessToken}`,
        'Time-Zone': 'UTC',
        'Accept-Language': 'en-US',
        Accept: 'application/json',
      };

      const { data } = await this.httpService.get(url, { headers }).toPromise();
      console.log('Get Games response:', JSON.stringify(data.links));
      console.log('Total Games:', data.totalCount);
      return data;
    } catch (e) {
      console.error('Error in getCasinoGames:', e.message);
      throw new RpcException(e.response?.data?.message || 'Get Games failed');
    }
  }

  public async syncGames(client_id) {
    try {

      await this.setKeys(client_id);
      
      // Fetch games from the gRPC service
      const gamesResponse: any = await this.getCasinoGames();

      // Validate response
      if (
        !gamesResponse ||
        !gamesResponse.items ||
        gamesResponse.items.length === 0
      ) {
        console.warn('No games available for processing');
        return {
          success: false,
          message: 'No games available for processing',
          games: [],
        };
      }

      // console.log('Games retrieved:', gamesResponse.items);

      // Process and save each game
      const savedGames = await Promise.all(
        gamesResponse.items.map(async (game: any) => {
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
                slug: providerData.id, //providerName.toLowerCase().replace(/\s+/g, '-'),
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
              gameId: game.id,
              title: game.name,
              description:
                game.description || `Enjoy ${game.title} by ${providerName}`,
              url: game.url,
              imagePath: game?.images?.find(image => image.type === 'logo-square').url,
              bannerPath: game?.images?.find(image => image.type === 'banner').url,
              status: game.status ?? true,
              type: game.category || 'Slots',
              provider: provider,
              // createdAt: game.createdAt || new Date().toISOString(),
              // updatedAt: game.updatedAt || new Date().toISOString(),
            };

            // Check or create the game
            const existingGame = await this.gameRepository.findOne({
              where: { gameId: gameData.gameId },
              relations: { provider: true },
            });

            if (existingGame) {
              console.log('updating game', existingGame.title)
              this.gameRepository.merge(existingGame, gameData);
              return await this.gameRepository.save(existingGame);
            } else {
              console.log('saving new game', gameData.title)
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

      if (gamesResponse.links[0]?.href !== this.GAME_LINK) {
        console.log('fetching new games')
        this.GAME_LINK = `${this.QTECH_BASEURL}${gamesResponse.links[0]?.href}`;
        return this.syncGames(client_id);
      }

      // Filter out unsuccessful saves
      const successfullySavedGames = savedGames.filter((game) => game !== null);

      return {
        success: true,
        message: 'Games synchronized successfully',
        games: [],
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
      console.log('Launch game payload', payload)
      const { gameId, userId, authCode, balanceType, isMobile, homeUrl } =
        payload;
      
      await this.setKeys(payload.clientId);

      // Fetch game details from the repository
      const gameExist = await this.gameRepository.findOne({
        where: { id: gameId },
        relations: { provider: true },
      });

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

      // get user details
      const res = await this.identityService.xpressLogin({ clientId: payload.clientId, token: authCode });

      if (!res.status) {
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'User is not signed in',
          data: {},
        };
      } 
      const user = res.data;
      // Construct the wallet session ID (if applicable)
      const walletSessionId = authCode || `session_${Date.now()}`;

      // Define the return URL
      const returnUrl = homeUrl;

      // Prepare the game session
      const gameSession = new GameSession();
      gameSession.session_id = walletSessionId;
      gameSession.game_id = gameExist.gameId;
      gameSession.provider = gameExist.provider.slug;
      gameSession.balance_type = balanceType || null;
      gameSession.token = authCode;

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

      console.log('Request URL', requestUrl);
      // Set up headers
      const headers = {
        Authorization: `Bearer ${await this.getAccessToken()}`,
      };

      // Prepare the payload
      const requestBody = {
        playerId: userId,
        walletSessionId,
        currency: user.currency || 'NGN',
        country: user.country || 'NG',
        lang: 'en_US',
        mode,
        device,
        returnUrl,
      };

      console.log('REQUEST DATA', requestBody);


      // Make the API request
      const { data } = await this.httpService
        .post(requestUrl, requestBody, { headers })
        .toPromise();

      console.log('RESPONSE DATA', data);
      // Return the game URL
      return { url: data.url };
    } catch (error) {
      console.error('Error in launchGames:', error.message);
      throw new RpcException(
        error.response?.data?.message || 'Launch Game failed',
      );
    }
  }

  async launchLobby(payload: StartGameDto): Promise<any> {
    try {
       const { userId, authCode, isMobile, homeUrl } =
        payload;
      
      await this.setKeys(payload.clientId);

      // Determine mode and device
      let mode = 'real';
      const device = isMobile ? 'mobile' : 'desktop';

      let user;
      // get user details
      const res = await this.identityService.xpressLogin({ clientId: payload.clientId, token: authCode });

      if (res.status) {
        user = res.data;
      }  else {
        mode = 'demo'
      }
      // Construct the wallet session ID (if applicable)
      const walletSessionId = authCode || `session_${Date.now()}`;

      // Define the return URL
      const returnUrl = homeUrl;

      // Prepare the API request URL
      const requestUrl = `${this.QTECH_BASEURL}/v1/games/lobby-url`;

      // Set up headers
      const headers = {
        Authorization: `Bearer ${await this.getAccessToken()}`,
      };

      // Prepare the payload
      const requestBody = {
        playerId: userId,
        walletSessionId,
        currency: user ? user.currency : 'NGN',
        country: user ? user.country : 'NG',
        lang: 'en_US',
        mode,
        device,
        returnUrl,
      };

      // Make the API request
      const { data } = await this.httpService
        .post(requestUrl, requestBody, { headers })
        .toPromise();

      // Return the game URL
      return { url: data.url };

    } catch (e) {
      console.error('Error in launchGames:', e.message);
      throw new RpcException(
        e.response?.data?.message || 'Launch Lobby failed',
      );
    }
  }

  async verifySession(payload: QtechCallbackRequest, callback: CallbackLog): Promise<any> {
    const { walletSessionId, clientId, playerId } = payload;
    try {
      const id = parseInt(playerId);
      if (isNaN(id)) {
        const response = this.createErrorResponse('ACCOUNT_BLOCKED', HttpStatus.FORBIDDEN, 'Invalid account');
        // update callback logs, and gaming session
        await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id})

        return response;
      }

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
      const player = await this.identityService.getDetails({
        clientId,
        userId: parseInt(playerId),
      });

      const currency = player.data.currency;
      const balance = parseFloat(player.data.availableBalance ? player.data.availableBalance.toFixed(2) : "0.00");

      // console.log('Balance:', balance, 'Currency:', currency);

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
      const id = parseInt(playerId);
      if (isNaN(id)) {
        const response = this.createErrorResponse('ACCOUNT_BLOCKED', HttpStatus.FORBIDDEN, 'Invalid account');
        // update callback logs, and gaming session
        await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id})

        return response;
      }
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

      console.log('Auth', auth)

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
        source: 'qtech-games', //game.provider.slug,
        cashierTransactionId: debitData.clientRoundId,
        winnings: 0,
        username: auth.data.playerNickname,
        bonusId: gameSession?.bonus_id || null
      };

      const place_bet = await this.placeBet(placeBetPayload);
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
        source: 'qtech-games',
        description: `Casino Bet: (${gameName}:${debitData.gameId})`,
        username: auth.data.playerNickname,
        wallet: balanceType,
        subject: 'Bet Deposit (Casino)',
        channel: debitData.device,
      });

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
      const id = parseInt(playerId);
      if (isNaN(id)) {
        const response = this.createErrorResponse('ACCOUNT_BLOCKED', HttpStatus.FORBIDDEN, 'Invalid account');
        // update callback logs, and gaming session
        await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id})

        return response;
      }
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
        source: 'qtech-games',
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

  async reward(payload: QtechCallbackRequest, callback: CallbackLog) {
    const { playerId, walletSessionId, gameId, clientId, body } = payload;
    const data: any = JSON.parse(body);
    
    try {

      const id = parseInt(playerId);
      if (!data.rewardType) {
        const response = this.createErrorResponse('REQUEST_DECLINED', HttpStatus.BAD_REQUEST, 'A required field is missing');
        // update callback logs, and gaming session
        await this.updateCallbackGameSession(callback, response, {session_id: walletSessionId}, {callback_id: callback.id})

        return response;
      }

      // get player details
      const player = await this.identityService.getDetails({
        clientId,
        userId: parseInt(playerId),
      });

      const walletRes = await this.walletService.credit({
        userId: playerId,
        clientId,
        amount: data.amount.toFixed(2),
        source: 'qtech-games',
        description: `${data.rewardTitle} (${data.rewardType})`,
        username: player.data.username,
        wallet: 'main',
        subject: 'Casino Reward (QTech)',
        channel: data.device,
      });


      const response = this.createSuccessResponse(HttpStatus.OK, 'Successful', {
        balance: parseFloat(walletRes.data.balance.toFixed(2)),
        referenceId: callback.id,
      });

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

  async handleCallbacks(_data: QtechCallbackRequest): Promise<any> {
    //const balanceType = 'main';
    // console.log('using qtech-games', _data.action);
    // console.log('_data', _data);
    await this.setKeys(_data.clientId);

    if (_data.action !== 'verifySession' && _data.action !== 'getBalance') {
      const data = JSON.parse(_data.body);
      
      const isExist = await this.callbackLogRepository.findOne({where: {transactionId: data.txnId}});

      if (isExist && isExist.status) 
        return JSON.parse(isExist.response);
    }  

    const callback = await this.saveCallbackLog(_data);
    
    // verify pass key, if not valid, return error
    if (_data.passkey !== this.QTECH_PASS_KEY)
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
      case 'BONUS-REWARD':
        return await this.reward(_data, callback);
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

  //Register Bonus
    // async registerBonus(data: CreateBonusRequest) {
    //   console.log('data', data);
    //   try {

    //     await this.setKeys(data.clientId);

    //     const accessToken = await this.getAccessToken();
  
    //     const gameKeys = await this.gameKeyRepository.find({
    //       where: {
    //           client_id: data.clientId,
    //           provider: "evo-play",
    //       },
    //   });
  
    //     const newData: any = {
    //       games: Array.isArray(data.gameId) ? data.gameId.join(',') : data.gameId,
    //       users: Array.isArray(data.userIds) ? data.userIds.join(',') : data.clientId,
    //       currency: 'NGN',
    //     };
        
    //     if (data.bonusType === 'free_rounds') {
    //       newData.extra_bonuses = {
    //         bonus_spins: {
    //           spins_count: data.casinoSpinCount,
    //           bet_in_money: data.minimumEntryAmount,
    //         },
    //       };
        
    //       newData.settings = {
    //         expire: formattedDateSpace,
    //       };
    //     }
  
    //     // if (data.bonusType === 'feature_trigger') {
    //     //   newData.extra_bonuses = {
    //     //     freespins_on_start: {
    //     //       freespins_count: data.casinoSpinCount,
    //     //       bet_in_money: data.minimumEntryAmount,
    //     //     },
    //     //   };
        
    //     //   newData.settings = {
    //     //     expire: formattedDateSpace,
    //     //   };
    //     // }
  
    //     // const signature = this.getSignature(
    //     //   parseFloat(project),
    //     //   parseFloat(version),
    //     //   newData,
    //     //   token
    //     // );
  
    //     const url = `${this.QTECH_BASEURL}/v1/bonus/free-rounds`;

    //     const headers = {
    //       Authorization: `Bearer ${accessToken}`,
    //       'Time-Zone': 'UTC',
    //       'Accept-Language': 'en-US',
    //       Accept: 'application/json',
    //     };

    //     const requestBody = {
    //       txnId: "",
    //       playerId: ""
    //     }

    //     // // Prepare the payload
    //     // const requestBody = {
    //     //   playerId: userId,
    //     //   walletSessionId,
    //     //   currency: user.currency,
    //     //   country: user.country || 'NG',
    //     //   lang: 'en_US',
    //     //   mode,
    //     //   device,
    //     //   returnUrl,
    //     // };
  
    //     const { data } = await this.httpService.get(url, requestBody, { headers }).toPromise();
  
    //     if(!response) {
    //       return {
    //         error: 0,
    //         success: false,
    //         message: 'Can not register evo-play bonus'
    //       }
    //     }
  
    //     console.log("response", response);
    //     console.log("response-data", response.data.data);
  
    //     return response.data.data;
    //   } catch (e) {
    //     console.error(e.message);
    //   }
    // }
}
