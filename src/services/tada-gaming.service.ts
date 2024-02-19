import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Import your SettingService
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import * as crypto from 'crypto';
import { StartGameDto } from 'src/proto/gaming.pb';
import { lastValueFrom, map } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game as GameEntity } from '../entities/game.entity';
import { Provider as ProviderEntity } from '../entities/provider.entity';

@Injectable()
export class TadaGamingService {
  private baseUrl: string;
  private agentId: string;
  private agentKey: string;
  private currency: string;
  private requestConfig: AxiosRequestConfig;

  constructor(
    @InjectRepository(GameEntity)
    private gameRepository: Repository<GameEntity>,
    @InjectRepository(ProviderEntity)
    private providerRepository: Repository<ProviderEntity>,
    private readonly configService: ConfigService,
    private readonly httpClient: HttpService,
  ) {
    this.baseUrl = this.configService.get<string>('TADA_BASE_URL');
    this.agentId = this.configService.get<string>('TADA_AGENT_ID');
    this.agentKey = this.configService.get<string>('TADA_AGENT_KEY');
    this.currency = this.configService.get<string>('CUURRENCY');
    this.setRequestOptions();
  }

  /**
   * Set options for making the Client request
   */
  private async setRequestOptions() {
    this.requestConfig = {
      baseURL: this.baseUrl,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      data: {},
    };
    console.log(this.requestConfig);
  }

  private getCurrentDate(): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(2); // Extract last two digits of the year
    const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Month is zero-based
    const day = now.getDate().toString().padStart(2, '0');
    return year + month + day;
  }

  private generateParamsWithKey(queryString: string) {
    const now = this.getCurrentDate();
    const keyG = crypto
      .createHash('md5')
      .update(now + this.agentId + this.agentKey)
      .digest('hex');
    const md5String = crypto
      .createHash('md5')
      .update(queryString + keyG)
      .digest('hex');
    const randomStringPadFront = Math.random().toString(36).substring(2, 8);
    const randomStringPadBack = Math.random().toString(36).substring(2, 8);
    const key = randomStringPadFront + md5String + randomStringPadBack;
    return key;
  }

  async getGames() {
    try {
      const params = 'AgentId=' + this.agentId;
      const key = this.generateParamsWithKey(params);
      const url = '/GetGameList';
      this.requestConfig.data = {
        AgentId: this.agentId,
        Key: key,
      };
      const response: AxiosResponse = await lastValueFrom(
        this.httpClient
          .post(url, this.requestConfig.data, this.requestConfig)
          .pipe(
            map((response) => {
              return response.data;
            }),
          ),
      );
      console.log(response);
      return response;
    } catch (e) {
      console.error(e.message);
    }
  }

  async constructGameUrl(data: StartGameDto, game: GameEntity) {
    //TODO: Create User entity  TO USE AUTH TOKEN FIELD HERE
    const token = `${data.userId}:${data.clientId}`;
    const gameId: number = parseInt(game.gameId.split('-')[1]);
    const params = `Token=${token}&GameId=${gameId}&Lang=en-US&AgentId=${this.agentId}`;
    const key = this.generateParamsWithKey(params);
    const url = '/singleWallet/LoginWithoutRedirect';
    const body = {
      Token: 'Demo',
      GameId: gameId,
      Lang: 'en-US',
      HomeUrl: data.homeUrl,
      AgentId: this.agentId,
      Key: key,
    };
    // this.requestConfig.params = body;
    //console.log(this.requestConfig);
    const response: AxiosResponse = await lastValueFrom(
      this.httpClient.get(this.baseUrl + url, { params: body }).pipe(
        map((response) => {
          return response;
        }),
      ),
    );
    console.log('construct game url response');
    if (response.data.ErrorCode === 0) {
      return {
        url: response.data.Data,
      };
    }
    console.error('error caught');
    console.error(response.data.Message);
    return {
      url: response.data.Message,
    };
  }

  public async syncGames() {
    const games: any = await this.getGames();
    let provider = await this.providerRepository.findOne({
      where: { name: 'Tada Games' },
    });
    if (!provider) {
      const newProvider: ProviderEntity = new ProviderEntity();
      newProvider.name = 'Tada Games';
      newProvider.slug = 'tada-games';
      newProvider.description = 'Tada Games';
      newProvider.imagePath =
        'https://images.pexels.com/photos/414612/pexels-photo-414612.jpeg';
      provider = await this.providerRepository.save(newProvider);
    }
    const savedGames = await Promise.all(
      games.Data.map(async (game) => {
        let gameData = {
          gameId: `tada-${game.GameId}`,
          title: game.name['en-US'],
          description: `${game.name['en-US']} ( Chinese: ${game.name['zh-CN']} ) ( Taiwan: ${game.name['zh-TW']} )`,
          type: 'casinos',
          provider: provider,
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
          gameData = {
            ...gameData,
            ...{
              status: true,
              imagePath:
                'https://images.pexels.com/photos/414612/pexels-photo-414612.jpeg',
              bannerPath:
                'https://images.pexels.com/photos/414612/pexels-photo-414612.jpeg',
            },
          };
          return this.gameRepository.save(this.gameRepository.create(gameData));
        }
      }),
    );

    return savedGames;
  }
}
