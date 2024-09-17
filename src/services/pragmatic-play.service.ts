/* eslint-disable prettier/prettier */
import { Injectable, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { StartGameDto } from 'src/proto/gaming.pb';
import { CreditCasinoBetRequest, PlaceCasinoBetRequest, RollbackCasinoBetRequest, SettleVirtualBetRequest } from 'src/proto/betting.pb';
import { firstValueFrom } from 'rxjs';
import { BetService } from 'src/bet/bet.service';
import { IdentityService } from 'src/identity/identity.service';


@Injectable()
export class PragmaticService {
  private readonly PRAGMATIC_SECURE_LOGIN: string;
  private readonly PRAGMATIC_BASEURL: string;
  private readonly PRAGMATIC_GAMEURL: string;
  private readonly PRAGMATIC_KEY: string;

  constructor(
    private readonly betService: BetService,
    private readonly identityService: IdentityService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService, // For accessing environment variables
  ) {
    this.PRAGMATIC_SECURE_LOGIN = this.configService.get<string>('PRAGMATIC_SECURE_LOGIN');
    this.PRAGMATIC_BASEURL = this.configService.get<string>('PRAGMATIC_BASEURL');
    this.PRAGMATIC_GAMEURL = this.configService.get<string>('PRAGMATIC_GAMEURL');
    this.PRAGMATIC_KEY = this.configService.get<string>('PRAGMATIC_KEY');
  }

  // Get Casino Games
  async getCasinoGames(): Promise<any> {
    try {
      const hash = this.genHash({ secureLogin: this.PRAGMATIC_SECURE_LOGIN });
      const { data } = await this.httpService
        .post(`${this.PRAGMATIC_BASEURL}/getCasinoGames?secureLogin=${this.PRAGMATIC_SECURE_LOGIN}&hash=${hash}`)
        .toPromise();

      return data.gameList;
    } catch (e) {
      throw new HttpException(e.response?.data?.message || 'Something went wrong', 500);
    }
  }

  // API Health Check
  async apiHealthCheck(): Promise<any> {
    try {
      const { data } = await this.httpService
        .get(`${this.PRAGMATIC_BASEURL}/health/heartbeatCheck`)
        .toPromise();

      return data;
    } catch (e) {
      throw new HttpException(e.message || 'Something went wrong', 500);
    }
  }

  // Game Health Check
  async gameHealthCheck(): Promise<any> {
    try {
      const { data } = await this.httpService
        .get(`${this.PRAGMATIC_GAMEURL}/gs2c/livetest`)
        .toPromise();

      return data;
    } catch (e) {
      throw new HttpException(e.message || 'Something went wrong', 500);
    }
  }

  // Get Game URL
  async constructGameUrl(payload: StartGameDto): Promise<any> {
    try {
         const { gameId, language, authCode} = payload;
      const hash = this.genHash({
        secureLogin: this.PRAGMATIC_SECURE_LOGIN,
        symbol: gameId,
        language: language,
        token: authCode,
        
      });

      const { data } = await this.httpService
        .post(
          `${this.PRAGMATIC_BASEURL}/game/url?secureLogin=${this.PRAGMATIC_SECURE_LOGIN}&symbol=${gameId}&language=${language}&token=${authCode}&hash=${hash}${
            payload.demo ? `&playMode=DEMO` : ``
          }`,
        )
        .toPromise();

      return data;
    } catch (e) {
      throw new HttpException(e.message || 'Something went wrong', 500);
    }
  }

  // Place Bet
  async placeBet(data: PlaceCasinoBetRequest) {
    return firstValueFrom(this.betService.placeCasinoBet(data));
  }

  async refund(data: RollbackCasinoBetRequest) {
    return await firstValueFrom(this.betService.cancelCasinoBet(data));
  }

  //Bonum Win
  // async bonusWin(data: SettleVirtualBetRequest) {
  //   return await firstValueFrom(this.betService.settleVirtualBet(data))
  // }

  // Settle Bet
  async result(data: CreditCasinoBetRequest) {
    return await firstValueFrom(this.betService.settleCasinoBet(data));
  }

  md5Algo = (hash) => {
    return crypto.createHash("md5").update(hash).digest("hex");
  };

  genHash = (query) => {
    const queries = Object.keys(query);
    const unhash = queries.filter((item) => item !== "hash");
    unhash.sort();
    const queryParams = unhash.map((key) => `${key}=${query[key]}`).join("&");
  
    const hash = this.md5Algo(`${queryParams}${this.PRAGMATIC_KEY}`);
    return hash;
  };
}
