import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Import your SettingService
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Game } from 'src/proto/gaming.pb';
import * as fs from 'fs';
import { join } from 'path';

@Injectable()
export class C2GamingService {
  private operatorId: string;
  private sslKeyPath: string;
  private bankGroupId: string;
  private token: string;
  private baseUrl: string;
  private emailId: string;
  private dialCode: string;
  private requestConfig: AxiosRequestConfig;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly httpClient: HttpService,
  ) {
    this.baseUrl = this.configService.get<string>('C27_BASE_URL');
    this.sslKeyPath = this.configService.get<string>('C27_KEY_PATH');
    this.operatorId = this.configService.get<string>('C27_OPERATOR_ID');
    this.bankGroupId = this.configService.get<string>('APP_INITIAL');
    this.setRequestOptions();
  }

  /**
   * Set options for making the Client request
   */
  private async setRequestOptions() {
    this.requestConfig = {
      baseURL: this.baseUrl,
      timeout: 10.0,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      httpsAgent: {
        cert: fs.readFileSync(join(this.sslKeyPath)),
      },
    };
    console.log(this.requestConfig);
  }

  private async generateToken() {
    try {
      const url = '/v1/partner/fe/token';
      const response: AxiosResponse = await this.httpClient.axiosRef.get(
        url,
        this.requestConfig,
      );
      return response.data['meta']['token'];
    } catch (e) {
      console.log('error on shacks service line 97');
      console.error(e);
    }
  }

  public async getGames() {
    try {
      this.token = await this.generateToken();
      const body = {
        json: {
          jsonrpc: '2.0',
          id: this.operatorId,
          method: 'Game.List',
        },
      };
      console.log(this.requestConfig);
      const response: AxiosResponse = await this.httpClient.axiosRef.post(
        '',
        body,
        this.requestConfig,
      );
      return response;
    } catch (e) {
      console.log('error on c2 gaming service line 86');
      console.error(e.message);
    }
  }

  /**
   * Set the Player
   */
  private async setPlayer(user) {
    const params = {
      Id: user.username,
      Nick: user.username,
      BankGroupId: this.bankGroupId,
    };
    const body = {
      json: {
        jsonrpc: '2.0',
        id: this.operatorId,
        method: 'Player.Set',
        params: params,
      },
    };
    console.log(this.requestConfig);
    const response: AxiosResponse = await this.httpClient.axiosRef.post(
      '',
      body,
      this.requestConfig,
    );
    return response;
  }

  public async getReconciliation(data) {
    console.log(data);
  }

  public async constructGameUrl(game: Game) {
    //TODO: get user from identity service
    const user = {
      username: 'ken',
      available_balance: 100,
    };
    //set player on c2 gaming provider
    this.setPlayer(user);
    // create params
    const params = {
      playerId: user.username,
      GameId: game.gameId,
      Params: {
        freeround_bet: 0,
        freeround_denomination: 0.3,
      },
    };
    const body = {
      json: {
        jsonrpc: '2.0',
        id: this.operatorId,
        method: 'Session.Create',
        params: params,
      },
    };
    console.log(this.requestConfig);
    const response: AxiosResponse = await this.httpClient.axiosRef.post(
      '',
      body,
      this.requestConfig,
    );
    return response;
  }
}
