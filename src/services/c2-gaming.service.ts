import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Import your SettingService

import axios, { AxiosRequestConfig, AxiosInstance, AxiosResponse } from 'axios';
import { Game } from 'src/proto/gaming.pb';
import * as fs from 'fs';
import * as https from 'https';
import { join } from 'path';

@Injectable()
export class C2GamingService {
  private operatorId: string;
  private sslKeyPath: string;
  private bankGroupId: string;
  private baseUrl: string;
  private requestConfig: AxiosRequestConfig;
  private client: AxiosInstance;
  private response: AxiosResponse;

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
    const certFile = fs.readFileSync(
      join(__dirname, '../../../', this.sslKeyPath, 'client.crt'),
    );
    const privateKeyFile = fs.readFileSync(
      join(__dirname, '../../../', this.sslKeyPath, 'client.key'),
    );
    const agent = new https.Agent({
      cert: certFile,
      key: privateKeyFile,
    });

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      httpsAgent: agent,
    });
    const res = await this.getGames();
    console.log(res);
  }

  private async setHttpResponse(
    method: string,
    params: any = null,
  ): Promise<C2GamingService> {
    const data = {
      jsonrpc: '2.0',
      id: this.operatorId,
      method: method,
    };
    if (params !== null) {
      data['params'] = params;
    }
    try {
      const res = await this.client.post('', data);
      this.response = res;
      return this;
    } catch (error) {
      // Handle the case where this.response is null or undefined
      throw new Error('No response available');
    }
  }

  private getResponse(): any {
    if (this.response) {
      return this.response.data;
    } else {
      // Handle the case where this.response is null or undefined
      throw new Error('No response available');
    }
  }

  public async getGames() {
    try {
      // this.token = await this.generateToken();
      await this.setHttpResponse('Game.List');
      return this.getResponse();
    } catch (e) {
      console.log('error on c2 gaming service line 99');
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

    this.setHttpResponse('Player.Set', params);
    return this.getResponse();
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
    this.setHttpResponse('Session.Create', params);
    return this.getResponse();
  }

  /**
   * start a demo game Session
   */
  public async constructDemoGameUrl(game: Game) {
    //TODO: get user from identity service
    const user = {
      username: 'ken',
      available_balance: 100,
    };
    //set player on c2 gaming provider
    this.setPlayer(user);
    // create params
    const params = {
      BankGroupId: this.bankGroupId,
      GameId: game.gameId,
      StartBalance: 100000,
    };
    this.setHttpResponse('Session.CreateDemo', params);
    return this.getResponse();
  }

  /**
   * close a game Session
   */
  public async closeSession(sessionId) {
    const params = {
      SessionId: sessionId,
    };
    this.setHttpResponse('Session.Close', params);
    return this.getResponse();
  }

  /**
   *  ===================
   * | Seamless Section |
   *  ===================
   */

  /**
   * get a player Balance
   */
  public async getBalance(data: any): Promise<any> {
    //TODO: GET user from identity service;
    const user = {
      username: data.username,
      available_balance: 10000,
    };
    if (!user) {
      return this.customError('ErrUserNotFound');
    }
    return this.customSucces(user.available_balance);
  }

  private customSucces(available_balance: number): any {
    return {
      jsonrpc: '2.0',
      id: this.operatorId,
      result: {
        balance: (available_balance * 100) as number,
      },
    };
  }

  private customError(_message: string) {
    return {
      jsonrpc: '2.0',
      id: this.operatorId,
      error: {
        code: 7,
        message: _message,
      },
    };
  }
}
