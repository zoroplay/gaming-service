import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Import your SettingService
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { firstValueFrom, map } from 'rxjs';
import { Game } from 'src/proto/gaming.pb';

@Injectable()
export class ShackEvolutionService {
  private publicKey: string;
  private secretKey: string;
  private token: string;
  private baseUrl: string;
  private emailId: string;
  private clientId: string;
  private dialCode: string;
  private requestConfig: AxiosRequestConfig;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly httpClient: HttpService,
  ) {
    this.baseUrl = this.configService.get<string>('SHACK_BASE_URL');
    this.publicKey = this.configService.get<string>('SHACK_PUBLIC_KEY');
    this.secretKey = this.configService.get<string>('SHACK_SECRET_KEY');
    this.clientId = this.configService.get<string>('SHACK_CLIENT_ID');
    this.emailId = this.configService.get<string>('SHACK_PARTNER_EMAIL');
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
    console.log(this.requestConfig);
    // try {
    //   const expiredAt: any = await this.cacheManager.get(
    //     'shack_token_expires_at',
    //   );
    //   const token = await this.cacheManager.get('shack_token');
    //   console.log(expiredAt);
    //   console.log(token);
    //   if (token && expiredAt && new Date(JSON.parse(expiredAt)) >= new Date()) {
    //     // Token exists and has not expired
    //     this.token = token as string;
    //     console.log(`Cached Token: ${this.token}`);
    //   } else {
    //     // error, token expired or does not exist
    //     this.token = await this.generateToken();
    //     console.log(`API Token: ${this.token}`);
    //     const now = new Date();
    //     now.setHours(now.getHours() + 2); // Add 2 hours to the current date and time
    //     const expiryDate = now.toISOString().slice(0, 19).replace('T', ' '); // Format as 'Y-m-d H:i:s'
    //     await this.cacheManager.set(
    //       'shack_token_expires_at',
    //       JSON.stringify(expiryDate),
    //       7200000,
    //     ); // expires in 7200000 milliseconds (2 hours)
    //     await this.cacheManager.set(
    //       'shack_token',
    //       JSON.stringify(this.token),
    //       7200000,
    //     ); // expires in 7200000 milliseconds (2 hours)
    //   }
    // } catch (error) {}
  }

  private authorizeHeader() {
    this.requestConfig.headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
    };
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
      const url = '/v2/games';
      this.token = await this.generateToken();
      this.authorizeHeader();
      console.log(this.requestConfig);
      const response: AxiosResponse = await this.httpClient.axiosRef.get(
        url,
        this.requestConfig,
      );
      return response;
    } catch (e) {
      console.log('error on shacks service line 116');
      console.error(e.message);
    }
  }

  public async getReconciliation(data) {
    try {
      const url = '/v1/bet-placed/reconciliation';
      this.token = await this.generateToken();
      this.authorizeHeader();
      const response: AxiosResponse = await firstValueFrom(
        this.httpClient.post(url, data, this.requestConfig).pipe(
          map((response) => {
            return response.data;
          }),
        ),
      );
      return response.data;
    } catch (e) {
      console.error(e.message);
    }
  }

  public async constructGameUrl(data, game: Game) {
    try {
      const url = '/v2/partner/cl/tokenize';
      this.token = await this.generateToken();
      this.authorizeHeader();
      data = {
        ...data,
        publicKey: this.publicKey,
      };
      const response: AxiosResponse = await firstValueFrom(
        this.httpClient.post(url, data, this.requestConfig).pipe(
          map((response) => {
            return response.data;
          }),
        ),
      );
      if (response.data.status === true) {
        const session_url = `${game.url}?clientId=${response.data.data}`;
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
}
