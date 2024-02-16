import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Import your SettingService
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { DateTime } from 'luxon';
import { Game } from 'src/proto/gaming.pb';
import { firstValueFrom, map } from 'rxjs';
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

  public generateParamsWithKey(queryString: string) {
    const now = DateTime.now().toFormat('yyMMdd');
    const keyG = crypto
      .createHash('md5')
      .update(now + this.agentId + this.agentKey)
      .digest('hex');
    const md5String = crypto
      .createHash('md5')
      .update(queryString + keyG)
      .digest('hex');
    const randomStringPadFront = uuidv4().slice(0, 6);
    const randomStringPadBack = uuidv4().slice(0, 6);
    const key = randomStringPadFront + md5String + randomStringPadBack;
    return key;
  }

  public async getGames() {
    try {
      const params = 'AgentId=' + this.agentId;
      const key = this.generateParamsWithKey(params);
      const url = '/GetGameList';
      this.requestConfig.data = {
        AgentId: this.agentId,
        Key: key,
      };
      const response: AxiosResponse = await firstValueFrom(
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

  public async constructGameUrl(data, game: Game) {
    try {
      //TODO: Create User entity  TO USE AUTH TOKEN FIELD HERE
      const token = `${data.userId}:${data.clientId}`; // You need to replace this with your actual authentication logic to get the token
      const gameId = game.gameId.split('-')[1];
      const params = `Token=${token}&GameId=${gameId}&Lang=en-US&AgentId=${this.agentId}`;
      const key = this.generateParamsWithKey(params);
      const url = '/singleWallet/LoginWithoutRedirect';
      const body = {
        Token: token,
        GameId: gameId,
        Lang: 'en-US',
        HomeUrl: data.HomeUrl,
        AgentId: this.agentId,
        Key: key,
      };
      this.requestConfig.data = body;
      //console.log(this.requestConfig);
      const response: AxiosResponse = await this.httpClient.axiosRef.get(
        url,
        this.requestConfig,
      );
      if (response.data) {
        const session_url = response;
        return {
          ...response,
          session_url: session_url,
        };
      }
      return response.data;
    } catch (e) {
      console.error(e.message);
    }
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
