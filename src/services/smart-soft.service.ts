import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Import your SettingService
import { AxiosRequestConfig } from 'axios';
import { Game as GameEntity } from '../entities/game.entity';
import { Provider as ProviderEntity } from '../entities/provider.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class SmartSoftService {
  private publicKey: string;
  private secretKey: string;
  private token: string;
  private baseUrl: string;
  private emailId: string;
  private clientId: string;
  private dialCode: string;
  private requestConfig: AxiosRequestConfig;

  constructor(
    @InjectRepository(GameEntity)
    private gameRepository: Repository<GameEntity>,
    @InjectRepository(ProviderEntity)
    private providerRepository: Repository<ProviderEntity>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly httpClient: HttpService,
  ) {
    this.baseUrl = this.configService.get<string>('SMART_SOFT_BASE_URL');
    this.publicKey = this.configService.get<string>('SMART_SOFT_BASE_URL');
    this.secretKey = this.configService.get<string>('SMART_SOFT_BASE_URL');
    this.clientId = this.configService.get<string>('SMART_SOFT_BASE_URL');
    this.emailId = this.configService.get<string>('SMART_SOFT_BASE_URL');
    this.requestConfig = {
      baseURL: this.baseUrl,
    };
    this.setRequestOptions();
  }

  /**
   * Set options for making the Client request
   */
  private async setRequestOptions() {
    this.requestConfig.headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'CLIENT-ID': this.publicKey,
      'PARTNER-EMAIL': this.emailId,
    };
  }

  private authorizeHeader() {
    this.requestConfig.headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
    };
  }

  async constructGameUrl(data, game: GameEntity) {
    try {
      let gameCategory = game.type;
      if (data.isMobile) {
        if (game.type === 'GamesLobby') {
          gameCategory = 'GamesMobile';
        } else {
          gameCategory = `${game.type}Mobile`;
        }
      }
      const gameName = game.title;
      const token = 'DEMO';
      const portal = 'sportsbookengine';
      const returnUrl = data.returnUrl;

      const stagingUrl =
        'https://eu-staging.ssgportal.com/GameLauncher/Loader.aspx?';
      const sessionUrl = `${stagingUrl}GameCategory=${gameCategory}&GameName=${gameName}&Token=${token}&PortalName=${portal}&ReturnUrl=${returnUrl}`;
      return sessionUrl;
    } catch (e) {
      console.error(e.message);
    }
  }
}
