import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Import your SettingService
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { firstValueFrom, map } from 'rxjs';
import { CallbackGameDto } from 'src/proto/gaming.pb';
import { BetService } from 'src/bet/bet.service';
import * as crypto from 'crypto';
import {
  PlaceCasinoBetRequest,
  CreditCasinoBetRequest,
  RollbackCasinoBetRequest,
} from 'src/proto/betting.pb';
import { Game as GameEntity, Provider as ProviderEntity } from '../entities';
import { WalletService } from 'src/wallet/wallet.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdentityService } from 'src/identity/identity.service';

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
    @InjectRepository(GameEntity)
    private gameRepository: Repository<GameEntity>,
    @InjectRepository(ProviderEntity)
    private providerRepository: Repository<ProviderEntity>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly httpClient: HttpService,
    private readonly walletService: WalletService,
    private readonly betService: BetService,
    private readonly identityService: IdentityService,
  ) {
    this.baseUrl = this.configService.get<string>('SHACK_BASE_URL');
    this.publicKey = this.configService.get<string>('SHACK_PUBLIC_KEY');
    this.secretKey = this.configService.get<string>('SHACK_SECRET_KEY');
    this.clientId = this.configService.get<string>('SHACK_CLIENT_ID');
    this.emailId = this.configService.get<string>('SHACK_PARTNER_EMAIL');
    this.requestConfig = {
      baseURL: this.baseUrl,
    };
    // this.setRequestOptions();
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
    // console.log(this.requestConfig);
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
      // console.log(this.requestConfig);
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

  // start game here
  async constructGameUrl(data, player, game: GameEntity) {
    try {
      const url = '/v2/partner/cl/tokenize';
      this.token = await this.generateToken();
      this.authorizeHeader();
      const newData = {
        playerId: player.authCode,
        playerEmail: player.email,
        gameType: game.gameId,
        email: this.emailId,
        publicKey: this.publicKey,
      };
      const response: AxiosResponse = await firstValueFrom(
        this.httpClient.post(url, newData, this.requestConfig).pipe(
          map((response) => {
            return response.data;
          }),
        ),
      );
      if (response.data.status === true) {
        const session_url = `${game.url}?clientId=${response.data.data}`;
        return {
          success: true,
          message: 'Url returned successfully',
          url: session_url,
        };
      }
      return {
        success: false,
        message: 'Url not returned',
        url: '',
      };
    } catch (e) {
      console.error(e.message);
    }
  }

  // callback handler
  async handleCallback(resp: CallbackGameDto) {
    const body: any = JSON.parse(resp.body);
    if (body.signature !== this.generateMD5Hash()) {
      return {
        success: false,
        message: 'Invalid Signature',
      };
    }
    const res = await this.identityService.validateXpressSession({
      clientId: resp.clientId,
      sessionId: body.token,
    });

    if (!res.success)
      return { success: false, message: 'Invalid player token' };
    const player: any = res.data;

    const game = await this.gameRepository.findOne({
      where: {
        title: resp.body['gameType'],
      },
    });

    if (body.type) {
      switch (body.type) {
        case 'debit':
          if (!game)
            return {
              success: false,
              message: 'Game not in system',
            };
          // return await this.activateSession();
          const placeBetPayload: PlaceCasinoBetRequest = {
            userId: player.userId,
            clientId: player.clientId,
            roundId: body.data.roundId,
            transactionId: body.roundId,
            gameId: game.gameId,
            stake: body.amount,
            winnings: 0,
          };
          return await this.placeBet(placeBetPayload);
          break;
        case 'credit':
          const settlePayload: CreditCasinoBetRequest = {
            transactionId: body.roundId,
            winnings: body.amount,
          };
          return await this.settle(settlePayload);
          break;
      }
    } else {
      return await this.activateSession(body.token);
    }
  }
  generateMD5Hash() {
    const md5Hash = crypto
      .createHash('md5')
      .update(`${this.publicKey}${this.secretKey}`)
      .digest('hex');
    return md5Hash;
  }
  // Webhook Section
  // Activate Player Session
  async activateSession(data) {
    const res = await this.identityService.xpressLogin({
      clientId: data.clientId,
      token: data.body.token,
    });

    if (!res.status) {
      return {
        success: false,
        message: 'Player not found',
      };
    }
    return {
      success: true,
      message: 'Wallet',
      data: {
        balance: res.data.balance,
        username: res.data.playerNickname,
        userId: res.data.playerId,
        currency: 'NGN',
      },
    };
  }

  // Place Bet
  async placeBet(data: PlaceCasinoBetRequest) {
    return await this.betService.placeCasinoBet(data).toPromise();
  }

  // Settle Bet
  async settle(data: CreditCasinoBetRequest) {
    return await this.betService.settleCasinoBet(data).toPromise();
  }

  // Reverse Bet
  async rollbackTransaction(data: RollbackCasinoBetRequest) {
    return await this.betService.cancelCasinoBet(data).toPromise();
  }
}
