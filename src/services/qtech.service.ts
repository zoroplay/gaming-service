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
    includeFields: string = 'id,name,currencies,clientTypes',
  ): Promise<any> {
    const accessToken = await this.getAccessToken();

    console.log('QTech accessToken', accessToken);
    try {
      const params = new URLSearchParams({
        size: size.toString(),
        currencies: currencies,
        languages: languages,
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
  
      if (!gamesResponse || !gamesResponse.items || gamesResponse.items.length === 0) {
        throw new Error('No games available for processing');
      }
  
      let provider = await this.providerRepository.findOne({
        where: { name: 'QTech-Games' },
      });
  
      console.log('provider', provider);
  
      if (!provider) {
        const newProvider: ProviderEntity = new ProviderEntity();
        newProvider.name = 'QTech-Games';
        newProvider.slug = 'qtech-games';
        newProvider.description = 'QTech Games';
        newProvider.imagePath = `${this.QTECH_IMAGE_URL}`;
        provider = await this.providerRepository.save(newProvider);
      }
  
      const savedGames = await Promise.all(
        gamesResponse.items.map(async (game: any) => {
          const logoImage = game.images.find((img: any) => img.type === 'logo-square')?.url || '';
          const bannerImage = game.images.find((img: any) => img.type === 'banner')?.url || '';
  
          const gameData = {
            gameId: game.id,
            title: game.name,
           description: game.description || `${game.name} by ${game.provider?.name || 'Unknown Provider'}`,
            type: 'Slots', 
            provider: provider,
            status: true,
            imagePath: logoImage,
            bannerPath: bannerImage,
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
            console.log('updated game');
            this.gameRepository.merge(gameExist, gameData);
            return this.gameRepository.save(gameExist);
          } else {
            console.log('added game');
            return this.gameRepository.save(
              this.gameRepository.create(gameData),
            );
          }
        }),
      );
  
      return {
        games: savedGames,
      };
    } catch (error) {
      console.log('Error saving games:', error.message);
    }
  }
  

  async launchGame(
    playerId: string,
    gameId: string,
    walletSessionId: string,
    currency: string,
    country: string,
    lang: string,
    mode: string, // real || demo
    device: string,
    displayName?: string,
    returnUrl?: string,
  ): Promise<any> {
    try {
      const url = `${this.QTECH_BASEURL}/v1/games/${gameId}/launch-url`;

      // Headers
      const headers = {
        Authorization: `Bearer ${await this.getAccessToken()}`, // Retrieve the Bearer token dynamically
        'Wallet-Session': walletSessionId,
      };

      // Payload
      const payload: any = {
        playerId,
        displayName,
        currency,
        country,
        lang,
        mode,
        device,
        returnUrl,
      };

      // Remove undefined fields from the payload
      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      // Make the POST request
      const { data } = await this.httpService
        .post(url, payload, { headers })
        .toPromise();
      console.log('Launch Game response:', data);
      return data;
    } catch (e) {
      console.error('Error in launchGame:', e.message);
      throw new RpcException(e.response?.data?.message || 'Launch Game failed');
    }
  }



  // async launchGames(
  // payload: StartGameDto
  // ): Promise<any> {
  //   try {
  //     playerId: string,
  //   gameId: string,
  //   walletSessionId: string,
  //   currency: string,
  //   country: string,
  //   lang: string,
  //   mode: string, // real || demo
  //   device: string, // desktop || mobile
  //   displayName?: string,
  //   returnUrl?: string,

  //   const { gameId, language, authCode, userId, mode, balanceType, homeUrl } = payload;
  //   } catch (e) {
  //     console.error('Error in launchGame:', e.message);
  //     throw new RpcException(e.response?.data?.message || 'Launch Game failed');
  //   }
  // }

  async getBalance(
    playerId: string,
    walletSessionId: string,
    gameId?: string,
  ): Promise<any> {
    try {
      const url = `${this.QTECH_BASEURL}/accounts/${playerId}/balance`;
      const headers = {
        'Pass-Key': this.QTECH_PASS_KEY,
        'Wallet-Session': walletSessionId,
      };

      // Prepare query parameters
      const params: any = {};
      if (gameId) {
        params.gameId = gameId;
      }

      const { data } = await this.httpService
        .get(url, { headers, params })
        .toPromise();
      console.log('Get Balance response:', data);
      return data;
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

  async handleCallback(data: CallbackGameDto) {
    console.log('_data', data);
    // save callback
    const callback = await this.saveCallbackLog(data);
    console.log('callback-4', callback);
    let response;
    let body = {};

    // Parse the body based on content type
    if (data.body) {
      try {
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
    1;

    console.log('body', body);

    if (body instanceof URLSearchParams) {
      const parsedBody = Object.fromEntries(body.entries());
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

    let player = null;
    let balanceType = 'main';
    const token = body.get('token');

    console.log('token', token);

    //get game session
    const gameSession = await this.gameSessionRepo.findOne({
      where: { session_id: token },
    });

    console.log('gameSession', gameSession);

    if (gameSession.balance_type === 'bonus') balanceType = 'casino';

    if (token) {
      const res = await this.identityService.validateToken({
        clientId: data.clientId,
        token,
      });

      // const res = {
      //   success: true,
      //   message: "Success",
      //   data: {
      //     playerId: 'Famo',
      //     clientId: 4,
      //     playerNickname: 'Franklyn',
      //     sessionId: '132',
      //     balance: 123,
      //     casinoBalance: 0.0,
      //     virtualBalance: 100.5,
      //     group: null,
      //     currency: 'user.client.currency,'
      //   }

      // };

      console.log('res', res);

      if (!res.success) {
        const response = {
          success: false,
          message: 'Invalid Session ID',
          status: HttpStatus.NOT_FOUND,
        };

        // update callback log response
        await this.callbackLogRepository.update(
          { id: callback.id },
          { response: JSON.stringify(response) },
        );

        return response;
      }

      if (gameSession.balance_type === 'bonus') balanceType = 'casino';

      player = res.data;
    }

    console.log('player', player);

    switch (data.action) {
      case 'Authenticate':
        console.log('using pragmatic-play authenticate');
        return await this.authenticate(
          data.clientId,
          token,
          callback,
          balanceType,
        );
      default:
        return {
          success: false,
          message: 'Invalid request',
          status: HttpStatus.BAD_REQUEST,
        };
    }
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
}
