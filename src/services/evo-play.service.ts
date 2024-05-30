import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as crypto from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Import your SettingService
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  Game as GameEntity,
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
} from 'src/proto/betting.pb';
import { CallbackGameDto } from 'src/proto/gaming.pb';
import { IdentityService } from 'src/identity/identity.service';

@Injectable()
export class EvoPlayService {
  private baseUrl: string;
  private project: number;
  private version: number;
  private token: string;
  private requestConfig: AxiosRequestConfig;

  constructor(
    @InjectRepository(GameEntity)
    private gameRepository: Repository<GameEntity>,
    @InjectRepository(ProviderEntity)
    private providerRepository: Repository<ProviderEntity>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly httpClient: HttpService,
    private readonly walletService: WalletService,
    private readonly betService: BetService,
    private readonly identityService: IdentityService
  ) {
    this.baseUrl = this.configService.get<string>('EVO_PLAY_BASE_URL');
    this.project = this.configService.get<number>('EVO_PLAY_PROJECT');
    this.version = this.configService.get<number>('EVO_PLAY_VERSION');
    this.token = this.configService.get<string>('EVO_PLAY_TOKEN');
    // this.setRequestOptions();
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

  slugify(str) {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

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
            gameId: `${key}-${this.slugify(games[key].name)}`,
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
            this.gameRepository.merge(gameExist, gameData);
            return this.gameRepository.save(gameExist);
          } else {
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
  async constructGameUrl(data, player, game: GameEntity) {
    try {
      this.token = player.authCode;
      const newData = {
        token: this.token,
        game: game.gameId.split('-')[0],
        settings: {
          user_id: player.userId,
          https: 1,
          exit_url: data.exitUrl,
          cash_url: data.depositUrl,
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
      // $url = $this->project_id."*".$this->version."*".$this->token;
      const url = `Game/getURL?project=${this.project}&version=${this.version}&signature=${signature}&token=${newData.token}&game=${newData.game}&settings[user_id]=${newData.settings.user_id}&settings[https]=${newData.settings.https}."&settings[exit_url]=${newData.settings.exit_url}&settings[cash_url]=${newData.settings.cash_url}&denomination=${newData.denomination}&currency=${newData.currency}&return_url_info=${newData.return_url_info}&callback_version=${newData.callback_version}`;
      const response: AxiosResponse = await this.httpClient.axiosRef.get(
        url,
        this.requestConfig,
      );
      return {
        url: response.data,
      };
    } catch (e) {
      console.error(e.message);
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
        for (const val of arg) {
          result.push(compact(val));
        }
        return result.join(':');
      } else {
        return '' + arg;
      }
    };

    const parts = [compact(integrationId), compact(apiVersion)];
    for (const val in args) {
      parts.push(compact(val));
    }
    parts.push(compact(integrationKey));

    const md5Hash = crypto
      .createHash('md5')
      .update(parts.join('*'))
      .digest('hex');
    return md5Hash;
  }

  // callback handler
  async handleCallback(resp: CallbackGameDto) {
    const body = JSON.parse(resp.body);

    const res = await this.identityService.validateXpressSession({clientId: resp.clientId, sessionId: body.token});

    if (!res.success) return {success: false, message: 'Invalid player token'}
    const player = JSON.parse(res.data);
 

    const game = await this.gameRepository.findOne({
      where: {
        title: resp.body['data']['details']['game']['game_id'],
      },
    });

    switch (body.name) {
      case 'init':
        return await this.activateSession(resp);
        break;
      case 'bet':
        if (!game)
          return {
            success: false,
            message: 'Game not in system',
          };
        // return await this.activateSession();
        const placeBetPayload: PlaceCasinoBetRequest = {
          userId: player.id,
          clientId: player.clientId,
          roundId: body.data.round_id,
          transactionId: body.action_id,
          gameId: game.gameId,
          stake: body.amount,
          winnings: 0,
        };
        return await this.placeBet(placeBetPayload);
        break;
      case 'win':
        const settlePayload: CreditCasinoBetRequest = {
          transactionId: body.action_id,
          winnings: body.amount,
        };
        return await this.settle(settlePayload);
        break;
      case 'refund':
        const reversePayload: RollbackCasinoBetRequest = {
          transactionId: body.action_id,
        };
        return await this.rollbackTransaction(reversePayload);
        break;
    }
  }
  // Webhook Section
  // Activate Player Session
  async activateSession(data) {
    const res = await this.identityService.xpressLogin({clientId: data.clientId, token: data.body.token});

    if (!res.status) {
      return {
        success: false,
        message: 'Player not found'
      }
    }
    
    return {
      success: true,
      message: 'Wallet',
      data: {
        balance: res.data.balance,
        currency: res.data.currency,
      },
    };
  }

  // Place Bet
  async placeBet(data: PlaceCasinoBetRequest) {
    const resp = await this.betService.placeCasinoBet(data).toPromise();
    if (resp.success) {
      return resp.data;
    }
  }

  // Settle Bet
  async settle(data: CreditCasinoBetRequest) {
    const resp = await this.betService.settleCasinoBet(data).toPromise();
    if (resp.success) {
      return resp.data;
    }
  }
  // Reverse Bet
  async rollbackTransaction(data: RollbackCasinoBetRequest) {
    const resp = await this.betService.cancelCasinoBet(data).toPromise();
    if (resp.success) {
      return resp.data;
    }
  }
}
