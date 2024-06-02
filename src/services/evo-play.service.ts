/* eslint-disable prettier/prettier */
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as crypto from 'crypto';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Import your SettingService
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  CallbackLog,
  Game as GameEntity,
  // Player as PlayerEntity,
  Provider as ProviderEntity,
} from '../entities';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { WalletService } from '../wallet/wallet.service';
import { BetService } from '../bet/bet.service';
import {
  CreditCasinoBetRequest,
  PlaceCasinoBetRequest,
  RollbackCasinoBetRequest,
  SettleCasinoBetRequest,
} from 'src/proto/betting.pb';
import { IdentityService } from 'src/identity/identity.service';
import { firstValueFrom } from 'rxjs';
import { slugify } from 'src/common';
import { Timeout } from '@nestjs/schedule';

@Injectable()
export class EvoPlayService {
  private baseUrl: string;
  private project: number;
  private version: number;
  private token: string;
  private requestConfig: AxiosRequestConfig;
  private secretKey: string;
  private portal: string;

  constructor(
    @InjectRepository(GameEntity)
    private gameRepository: Repository<GameEntity>,
    // @InjectRepository(PlayerEntity)
    // private playerRepository: Repository<PlayerEntity>,
    @InjectRepository(CallbackLog)
    private callbackLogRepository: Repository<CallbackLog>,
    @InjectRepository(ProviderEntity)
    private providerRepository: Repository<ProviderEntity>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly httpClient: HttpService,
    private readonly walletService: WalletService,
    private readonly betService: BetService,
    private readonly identityService: IdentityService,
  ) {
    this.baseUrl = this.configService.get<string>('EVO_PLAY_BASE_URL');
    this.project = this.configService.get<number>('EVO_PLAY_PROJECT');
    this.secretKey = this.configService.get<string>('EVO_PLAY_SECRET_KEY');
    this.portal = this.configService.get<string>('SMART_SOFT_PORTAL');
    this.version = this.configService.get<number>('EVO_PLAY_VERSION');
    this.token = this.configService.get<string>('EVO_PLAY_TOKEN');
    this.setRequestOptions();
  }

  /**
   * Set options for making the Client request
   */
  private async setRequestOptions() {
    this.requestConfig = {
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      data: {},
    };
    // console.log(this.requestConfig);
  }

  async getGames() {
    try {
      const signature = this.getSignature(
        this.project,
        this.version,
        {},
        this.token,
      );
      // $url = $this->project_id."*".$this->version."*".$this->token;
      const url = `Game/getList?project=${this.project}&version=${this.version}&signature=${signature}`;
      const response: AxiosResponse = await this.httpClient.axiosRef.get(
        url,
        this.requestConfig,
      );
      // console.log(response.data.data);
      return response.data.data;
    } catch (e) {
      console.error(e.message);
    }
  }

  // @Timeout(100)
  public async syncGames() {
    const games: any = await this.getGames();

    let provider = await this.providerRepository.findOne({
      where: { name: 'Evo Play' },
    });

    if (!provider) {
      const newProvider: ProviderEntity = new ProviderEntity();
      newProvider.name = 'Evo Play';
      newProvider.slug = 'evo-play';
      newProvider.description = 'Evo Play';
      newProvider.imagePath =
        'https://images.pexels.com/photos/414612/pexels-photo-414612.jpeg';
      provider = await this.providerRepository.save(newProvider);
    }

    const savedGames = await Promise.all(
      Object.keys(games).map(async (key) => {

        if (Object.prototype.hasOwnProperty.call(games, key)) {

          const gameData = {
            gameId: key,
            title: games[key].name,
            description: games[key].absolute_name,
            type: games[key].game_sub_type,
            provider: provider,
            status: true,
            imagePath:
              'https://images.pexels.com/photos/414612/pexels-photo-414612.jpeg',
            bannerPath:
              'https://images.pexels.com/photos/414612/pexels-photo-414612.jpeg',
          };

          const gameExist = await this.gameRepository.findOne({
            where: {
              gameId: gameData.gameId,
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
  }

  // start game here
  async constructGameUrl(data, game: GameEntity) {
    try {
      // this.token = data.authCode;
      const newData = {
        token: data.authCode,
        game: parseInt(game.gameId),
        settings: {
          user_id: data.userId,
          exit_url: data.homeUrl,
          https: 1,
        },
        denomination: 1,
        currency: 'NGN',
        return_url_info: 1,
        callback_version: 2,
      };
      const signature = this.getSignature(
        this.project,
        this.version,
        newData,
        this.token,
      );
      console.log(signature)
      // $url = $this->project_id."*".$this->version."*".$this->token;
      const url = `Game/getURL?project=${this.project}&version=${this.version}&signature=${signature}&token=${newData.token}&game=${newData.game}&settings[user_id]=${newData.settings.user_id}&settings[exit_url]=${newData.settings.exit_url}&settings[https]=${newData.settings.https}&denomination=${newData.denomination}&currency=${newData.currency}&return_url_info=${newData.return_url_info}&callback_version=${newData.callback_version}`;
      const response: AxiosResponse = await this.httpClient.axiosRef.get(
        url,
        this.requestConfig,
      );
      if(response.data.error) {
        return {success: false, message: response.data.error.message}
      } else {
        return {url: response.data.data.link}
      }
    } catch (e) {
      console.error(e.message);
      return {message: 'error'};
    }
  }

  getSignature(
    integrationId: number,
    apiVersion: number,
    args: object,
    integrationKey: string,
  ) {
    console.log(args)

    const compact = function (arg): string {
      if ('object' === typeof arg) {
        const result = [];
        for (const key of Object.keys(arg)) {
          result.push(compact(arg[key]));
        }
        return result.join(':');
      } else {
        return '' + arg;
      }
    };

    const parts = [compact(integrationId), compact(apiVersion)];

    for (const key of Object.keys(args)) {
      parts.push(compact(args[key]));
    }

    parts.push(compact(integrationKey));

    const str = parts.join('*')
    console.log(str)
    const md5Hash = crypto
      .createHash('md5')
      .update(str)
      .digest('hex');

    return md5Hash;
  }

  // callback handler
  async handleCallback(data: any) {
    const callback = await this.saveCallbackLog(data);
    const hash = await this.generateMd5(data.method, {
      token: data.token,
      name: data.name,
      callback_id: data.callback_id,
      data: data.data,
    });
    if (data.signature !== hash) {
      const response = {
        success: false,
        message: 'Invalid Hash Signature',
      };

      // update callback log response
      await this.callbackLogRepository.update(
        {
          id: callback.id,
        },
        {
          response: JSON.stringify(response),
        },
      );

      return response;
    }

    let game = null;
    let player = null;

    if (data.token) {
      const res = await this.identityService.validateXpressSession({
        clientId: data.clientId,
        sessionId: data.token,
      });

      if (!res.success) {
        const response = {
          success: false,
          message: 'Invalid Session ID',
        };

        // update callback log response
        await this.callbackLogRepository.update(
          {
            id: callback.id,
          },
          {
            response: JSON.stringify(response),
          },
        );

        return response;
      }

      player = JSON.parse(res.data);

      if (data.details['game'])
        game = await this.gameRepository.findOne({
          where: {
            id: data.details['game']['game_id'],
          },
        });
    }
    console.log('first stage passed');
    switch (data.name) {
      case 'init':
        console.log('init');
        const x = await this.activateSession(data, callback);
        return x;
        break;
      case 'bet':
        const walletRes = await this.walletService.getWallet({
          userId: player.id,
          clientId: player.clientId,
        });

        if (walletRes.data.availableBalance < data.amount) {
          const response = {
            success: false,
            message: 'Insufficent balance',
            status: HttpStatus.BAD_REQUEST,
          };
          // update callback log response
          await this.callbackLogRepository.update(
            {
              id: callback.id,
            },
            {
              response: JSON.stringify(response),
            },
          );

          return response;
        }
        // return await this.activateSession();
        const placeBetPayload: PlaceCasinoBetRequest = {
          userId: player.id,
          clientId: player.clientId,
          roundId: data.round_id,
          transactionId: data.callback_id,
          gameId: game.gameId,
          stake: data.amount,
          gameName: game.title,
          gameNumber: game.id,
          source: game.type,
          cashierTransactionId: data.callback_id,
          winnings: 0,
        };
        const place_bet = await this.placeBet(placeBetPayload);

        if (!place_bet.success) {
          const response = {
            success: false,
            status: HttpStatus.BAD_REQUEST,
            message: place_bet.message,
          };
          // update callback log response
          await this.callbackLogRepository.update(
            {
              id: callback.id,
            },
            {
              response: JSON.stringify(response),
            },
          );

          return response;
        }

        const debit = await this.walletService.debit({
          userId: player.id,
          clientId: player.clientId,
          amount: data.amount,
          source: game.type,
          description: `Casino Bet: (${game.title})`,
          username: player.username,
          wallet: 'main',
          subject: 'Bet Deposit (Casino)',
          channel: game.type,
        });

        if (!debit.success) {
          const response = {
            success: false,
            status: HttpStatus.BAD_REQUEST,
            message: 'Incomplete request',
          };
          // update callback log response
          await this.callbackLogRepository.update(
            {
              id: callback.id,
            },
            {
              response: JSON.stringify(response),
            },
          );

          return response;
        }

        let response = {
          success: true,
          message: 'bet handled successfully',
          data: {
            balance: debit.data.balance,
            currency: data.currency,
          },
        };
        // update callback log response
        await this.callbackLogRepository.update(
          {
            id: callback.id,
          },
          {
            response: JSON.stringify(response),
            status: true,
          },
        );

        return response;
      case 'win':
        // const transactionType = data.body.TransactionType;
        const amount = data.amount;
        const betId = data.callback_id;

        const settlePayload: SettleCasinoBetRequest = {
          transactionId: betId,
          winnings: amount,
          provider: 'evo-play',
        };

        const settle_bet = await this.settle(settlePayload);
        if (!settle_bet.success) {
          const response = {
            success: false,
            message: 'Unable to complete request',
            status: HttpStatus.INTERNAL_SERVER_ERROR,
          };
          // update callback log response
          await this.callbackLogRepository.update(
            {
              id: callback.id,
            },
            {
              response: JSON.stringify(response),
            },
          );

          return response;
        }

        let creditRes = null;

        creditRes = await this.walletService.credit({
          userId: player.id,
          clientId: player.clientId,
          amount: data.amount,
          source: game.type,
          description: `Casino Bet: (${game.title})`,
          username: player.username,
          wallet: 'main',
          subject: 'Bet Win (Casino)',
          channel: game.type,
        });
        const resp = {
          success: true,
          message: 'win handled successfully',
          data: {
            balance: creditRes.data.balance,
            currency: data.currency,
          },
        };

        // update callback log response
        await this.callbackLogRepository.update(
          {
            id: callback.id,
          },
          {
            response: JSON.stringify(resp),
            status: true,
          },
        );

        return resp;

      case 'refund':
        const reversePayload: RollbackCasinoBetRequest = {
          transactionId: data.callback_id,
        };
        // get callback log
        const callbackLog = await this.callbackLogRepository.findOne({
          where: { transactionId: reversePayload.transactionId },
        });

        if (!callbackLog) {
          const res = { success: false, message: 'Transaction not found' };
          // update callback log response
          await this.callbackLogRepository.update(
            {
              id: callback.id,
            },
            {
              response: JSON.stringify(res),
            },
          );

          return res;
        }

        const transaction = await this.rollbackTransaction(reversePayload);
        if (!transaction.success) {
          const response = {
            success: false,
            message: 'Unable to complete request',
            status: HttpStatus.INTERNAL_SERVER_ERROR,
          };
          // update callback log response
          await this.callbackLogRepository.update(
            {
              id: callback.id,
            },
            {
              response: JSON.stringify(response),
            },
          );

          return response;
        }

        let rollbackWalletRes = null;

        if (callbackLog.request_type === 'win') {
          rollbackWalletRes = await this.walletService.credit({
            userId: player.id,
            clientId: player.clientId,
            amount: data.amount,
            source: game.type,
            description: `Bet Cancelled: (${game.title})`,
            username: player.username,
            wallet: 'main',
            subject: 'Bet refund (Casino)',
            channel: game.title,
          });

          const response = {
            success: true,
            message: 'refund handled successfully',
            data: {
              balance: rollbackWalletRes.data.balance,
              currency: data.currency,
            },
          };
          // update callback log response
          await this.callbackLogRepository.update(
            {
              id: callback.id,
            },
            {
              response: JSON.stringify(response),
              status: true,
            },
          );

          return response;
        } else {
          rollbackWalletRes = await this.walletService.debit({
            userId: player.id,
            clientId: player.clientId,
            amount: data.amount,
            source: game.type,
            description: `Bet Cancelled: (${game.title})`,
            username: player.username,
            wallet: 'main',
            subject: 'Win refund (Casino)',
            channel: game.title,
          });
          const response = {
            success: true,
            message: 'refund, successful',
            data: {
              balance: rollbackWalletRes.data.balance,
              currency: data.currency,
            },
          };
          // update callback log response
          await this.callbackLogRepository.update(
            {
              id: callback.id,
            },
            {
              response: JSON.stringify(response),
              status: true,
            },
          );

          return response;
        }
        break;
    }
  }
  // Webhook Section
  // Activate Player Session
  async activateSession(data, callback) {
    console.log('activateSession', data, callback);
    const res = await this.identityService.evoGameLogin({
      clientId: data.clientId,
      token: data.token,
    });

    if (!res.status) {
      const response = {
        success: false,
        message: 'Player not found',
      };

      // update callback log response
      await this.callbackLogRepository.update(
        {
          id: callback.id,
        },
        {
          response: JSON.stringify(response),
        },
      );

      return response;
    }

    const response = {
      success: true,
      message: 'Activation Successful',
      data: {
        UserName: res.data.playerNickname,
        SessionId: res.data.sessionId,
        ClientExternalKey: res.data.playerId,
        PortalName: 'sportsbookengine',
        CurrencyCode: res.data.currency,
      },
    };
    // update callback log response
    await this.callbackLogRepository.update(
      {
        id: callback.id,
      },
      {
        response: JSON.stringify(response),
        status: true,
      },
    );

    return response;
  }

  // Place Bet
  async placeBet(data: PlaceCasinoBetRequest) {
    // console.log('place casino bet', data);
    return firstValueFrom(this.betService.placeCasinoBet(data));
  }

  // Settle Bet
  // Settle Bet
  async settle(data: CreditCasinoBetRequest) {
    return await firstValueFrom(this.betService.settleCasinoBet(data));
  }
  // Reverse Bet

  async rollbackTransaction(data: RollbackCasinoBetRequest) {
    return await firstValueFrom(this.betService.cancelCasinoBet(data));
  }

  // save callback request
  async saveCallbackLog(data) {
    console.log('saving callback logs');
    const { action, body } = data;
    try {
      const callback = new CallbackLog();
      callback.transactionId =
        action === 'init' || data.name === 'init'
          ? data.token
          : action === 'refund' || data.name === 'refund'
            ? data.callback_id
            : data.callback_id;
      // ? body.CurrentTransactionId
      // : body.TransactionId;
      callback.request_type = action || data.name;
      callback.payload = JSON.stringify(body);

      return await this.callbackLogRepository.save(callback);
    } catch (e) {
      console.log('Error saving callback log', e.message);
    }
  }
  
  generateMd5(requestMethod: string, payload) {
    console.log('payload start');

    // console.log(this.secretKey);
    // console.log(requestMethod);
    // console.log(JSON.stringify(payload));
    // console.log(
    //   this.secretKey + '|' + requestMethod + '|' + JSON.stringify(payload),
    // );
    const md5Hash = crypto
      .createHash('md5')
      .update(
        requestMethod + '|' + JSON.stringify(payload) + '|' + this.secretKey,
      )
      .digest('hex');

    console.log('payload hash');
    console.log(md5Hash);
    console.log('payload ends');
    return md5Hash;
  }
}
