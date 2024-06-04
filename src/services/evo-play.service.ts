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
      // console.log(signature)
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
      if(key !== 'signature')
        parts.push(compact(args[key]));
    }

    parts.push(compact(integrationKey));

    const str = parts.join('*')
    console.log(str)
    const md5Hash = crypto
      .createHash('md5')
      .update(str)
      .digest('hex');

      console.log('encryption hash');
      console.log(md5Hash);
      console.log('encryption ends');

    return md5Hash;
  }

  // callback handler
  async handleCallback(data: any) {
    const body = JSON.parse(data.body);

    // console.log(body);

    const callback = await this.saveCallbackLog(body);
    
    const hash = this.getSignature(this.project,
      this.version,
      body,
      this.token
    );

    if (body.signature !== hash) {
      const response = {
        success: false,
        data: {
          status: "error",
          error: {
            message: 'Invalid Hash Signature',
            scope: "internal",
          }
        },
        message: 'Invalid Hash Signature',
        status: HttpStatus.BAD_REQUEST
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
    let betParam, gameDetails;

    if (body.token && body.name !== 'init') {
      const res = await this.identityService.validateToken({
        clientId: data.clientId,
        token: body.token,
      });

      if (!res.success) {
        const response = {
          success: false,
          message: 'Invalid Session ID',
          data: {
            status: "error",
            error: {
              message: 'Session expired. Please sign in to contiun',
              scope: "user",
              no_refund: "1"
            }
          },
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

    }
    console.log('first stage passed');

    switch (body.name) {
      case 'init':
        console.log('init');
        const x = await this.activateSession(data.clientId, body.token, callback);
        return x;
      case 'bet':
        betParam = body.data;
        gameDetails = JSON.parse(betParam.details);

        game = await this.gameRepository.findOne({
          where: {
            gameId: gameDetails.game.game_id,
          },
          relations: {provider: true}
        });

        if (player.balance < parseFloat(betParam.amount)) {
          const response = {
            success: false,
            message: 'Insufficent balance',
            data: {
              status: "error",
              error: {
                message: 'Insufficent balance',
                scope: "user",
                no_refund: "1",
              }
            },
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
          userId: player.playerId,
          clientId: data.clientId,
          roundId: betParam.round_id,
          transactionId: betParam.action_id,
          gameId: game.gameId,
          stake: parseFloat(betParam.amount),
          gameName: game.title,
          gameNumber: game.gameId,
          source: game.provider.slug,
          cashierTransactionId: data.callback_id,
          winnings: 0,
          username: player.playerNickname
        };
        
        const place_bet = await this.placeBet(placeBetPayload);

        if (!place_bet.success) {
          const response = {
            success: false,
            status: HttpStatus.BAD_REQUEST,
            message: place_bet.message,
            data: {
              status: "error",
              error: {
                message: place_bet.message,
                scope: "internal",
                no_refund: "0",
              }
            },
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
          userId: player.playerId,
          clientId: data.clientId,
          amount: betParam.amount,
          source: game.provider.slug,
          description: `Casino Bet: (${game.title})`,
          username: player.playerNickname,
          wallet: 'main',
          subject: 'Bet Deposit (Casino)',
          channel: game.type,
        });

        if (!debit.success) {
          const response = {
            success: false,
            status: HttpStatus.BAD_REQUEST,
            message: 'Incomplete request',
            data: {
              status: "error",
              error: {
                message: 'Unable to complete request',
                scope: "internal",
                no_refund: "1",
              }
            },
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
            status: "ok",
            data: {
              balance: debit.data.balance.toFixed(2),
              currency: player.currency,
            }
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
        betParam = body.data;
        gameDetails = JSON.parse(betParam.details);
        
        const amount = parseFloat(betParam.amount);
        const betId = body.action_id;

        game = await this.gameRepository.findOne({
          where: {
            gameId: gameDetails.game.game_id,
          },
          relations: {provider: true}
        });


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
            data: {
              status: "error",
              error: {
                message: 'Unable to complete request',
                scope: "internal",
                no_refund: "1",
              }
            },
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
          userId: player.playerId,
          clientId: data.clientId,
          amount: amount.toFixed(2),
          source: game.provider.slug,
          description: `Casino Bet: (${game.title})`,
          username: player.playerNickname,
          wallet: 'main',
          subject: 'Bet Win (Casino)',
          channel: game.type,
        });

        const resp = {
          success: true,
          message: 'win handled successfully',
          data: {
            status: "ok",
            data: {
              balance: creditRes.data.balance.toFixed(2),
              currency: player.currency,
            },
          }
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
        betParam = body.data;
        gameDetails = JSON.parse(betParam.details);

        const reversePayload: RollbackCasinoBetRequest = {
          transactionId: betParam.refund_action_id,
        };
        // get callback log
        const callbackLog = await this.callbackLogRepository.findOne({
          where: { transactionId: betParam.refund_callback_id },
        });

        game = await this.gameRepository.findOne({
          where: {
            gameId: gameDetails.game.game_id,
          },
          relations: {provider: true}
        });

        if (!callbackLog) {
          const res = { 
            success: false, 
            message: 'Transaction not found',
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            data: {
              status: "error",
              error: {
                message: 'Unable to complete request',
                scope: "internal",
                no_refund: "1",
              }
            },
          };
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
            data: {
              status: "error",
              error: {
                message: 'Unable to complete request',
                scope: "internal",
                no_refund: "1",
              }
            },
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

        const rollbackWalletRes = await this.walletService.credit({
          userId: player.playerId,
          clientId: data.clientId,
          amount: betParam.amount.toFixed(2),
          source: game.provider.slug,
          description: `Bet Cancelled: (${game.title})`,
          username: player.playerNickname,
          wallet: 'main',
          subject: 'Bet refund (Casino)',
          channel: game.title,
        });

        const res = {
          success: true,
          message: 'refund handled successfully',
          status: HttpStatus.OK,
          data: {
            status: "ok",
            data: {
              balance: rollbackWalletRes.data.balance.toFixed(2),
              currency: player.currency,
            },
          }
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

        return res;
        
    }
  }
  // Webhook Section
  // Activate Player Session
  async activateSession(clientId, token, callback) {
    // console.log('activateSession', data, callback);
    const res: any = await this.identityService.validateToken({
      clientId,
      token,
    });

    if (!res.status) {
      const response = {
        success: false,
        data: {
          status: "error",
          error: {
            message: 'Invalid auth code, please login to try agaub',
            scope: "user",
            no_refund: "1"
          }
        },
        message: 'Invalid auth code, please login to try agaub',
        status: HttpStatus.BAD_REQUEST
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

    const player = JSON.parse(res.data);

    const response = {
      success: true,
      message: 'Activation Successful',
      data: {
        status: "ok",
        data: {
          balance: player.balance.toFixed(2),
          currency: player.currency
        }
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
    try {
      const callback = new CallbackLog();
      callback.transactionId = data.callback_id
      callback.request_type = data.name;
      callback.payload = JSON.stringify(data);

      return await this.callbackLogRepository.save(callback);
    } catch (e) {
      console.log('Error saving callback log', e.message);
    }
  }
  
}
