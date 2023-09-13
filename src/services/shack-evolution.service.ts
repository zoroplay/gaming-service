import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Import your SettingService
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { lastValueFrom, map } from 'rxjs';

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
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'CLIENT-ID': this.publicKey,
        'PARTNER-EMAIL': this.emailId,
      },
    };
  }

  public async generateToken() {
    try {
      const url = '/v1/partner/fe/token';
      const response: AxiosResponse = await lastValueFrom(
        this.httpClient.post(url, null, this.requestConfig).pipe(
          map((response) => {
            return response.data;
          }),
        ),
      );
      console.log(response);
    } catch (e) {
      console.error(e.message);
    }
  }

  public async getGames() {
    try {
      const url = '/v1/partner/fe/token';
      const response: AxiosResponse = await lastValueFrom(
        this.httpClient.post(url, null, this.requestConfig).pipe(
          map((response) => {
            return response.data;
          }),
        ),
      );
      console.log(response);
    } catch (e) {
      console.error(e.message);
    }
  }
}
