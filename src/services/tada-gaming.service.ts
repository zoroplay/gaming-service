import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Import your SettingService
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { firstValueFrom, map } from 'rxjs';
import { Game } from 'src/proto/gaming.pb';

@Injectable()
export class TadaGamingService {
  private publicKey: string;
  private secretKey: string;
  private token: string;
  private baseUrl: string;
  private emailId: string;
  private clientId: string;
  private dialCode: string;
  private requestConfig: AxiosRequestConfig;

  constructor(
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
    //console.log(this.requestConfig);
  }

  public async getGames() {
    try {
      const url = '/v2/games';
      //console.log(this.requestConfig);
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

  public async constructGameUrl(data, game: Game) {
    try {
      const url = '/v2/partner/cl/tokenize';
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
