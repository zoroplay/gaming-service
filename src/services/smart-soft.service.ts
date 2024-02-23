import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as crypto from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Import your SettingService
import { AxiosRequestConfig } from 'axios';
import {
  Game as GameEntity,
  Player as PlayerEntity,
  Provider as ProviderEntity,
} from '../entities';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid'; // Import UUID generator
import { InjectRepository } from '@nestjs/typeorm';
import { WalletService } from '../wallet/wallet.service';
import { BetService } from '../bet/bet.service';
import {
  CreditCasinoBetRequest,
  PlaceCasinoBetRequest,
  RollbackCasinoBetRequest,
} from 'src/proto/betting.pb';
import { CallbackGameDto } from 'src/proto/gaming.pb';

@Injectable()
export class SmartSoftService {
  private baseUrl: string;
  private secretKey: string;
  private portal: string;
  private requestConfig: AxiosRequestConfig;

  constructor(
    @InjectRepository(GameEntity)
    private gameRepository: Repository<GameEntity>,
    @InjectRepository(PlayerEntity)
    private playerRepository: Repository<PlayerEntity>,
    @InjectRepository(ProviderEntity)
    private providerRepository: Repository<ProviderEntity>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly httpClient: HttpService,
    private readonly walletService: WalletService,
    private readonly betService: BetService,
  ) {
    this.baseUrl = this.configService.get<string>('SMART_SOFT_BASE_URL');
    this.secretKey = this.configService.get<string>('SMART_SOFT_SECRET_KEY');
    this.portal = this.configService.get<string>('SMART_SOFT_PORTAL');
  }

  async constructGameUrl(data, player: PlayerEntity, game: GameEntity) {
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
      const token = player.authCode;
      const portal = this.portal;
      const returnUrl = data.homeUrl;
      const sessionUrl = `${this.baseUrl}GameCategory=${gameCategory}&GameName=${gameName}&Token=${token}&PortalName=${portal}&ReturnUrl=${returnUrl}`;
      return {
        url: sessionUrl,
      };
    } catch (e) {
      console.error(e.message);
    }
  }

  async handleCallback(resp: CallbackGameDto) {
    if (
      resp.header['x-signature'] !== this.generateMd5(resp.method, resp.body)
    ) {
    }
    switch (resp.action) {
      case 'ActivateSession':
        // return await this.activateSession();
        break;
      case 'GetBalance':
        // return await this.activateSession();
        break;
      case 'Deposit':
        // return await this.activateSession();

        break;
      case 'Withdraw':
        // return await this.activateSession();

        break;
      case 'IssueClientGifts':
        // return await this.activateSession();

        break;
    }
  }

  // support

  async generateMd5(requestMethod: string, payload: any) {
    const md5Hash = crypto
      .createHash('md5')
      .update(this.secretKey + requestMethod + JSON.stringify(payload))
      .digest('hex');
    return md5Hash;
  }

  // Webhook Section
  async activateSession(token) {
    const player = await this.playerRepository.findOne({
      where: {
        authCode: token,
      },
    });
    if (!player) {
      console.log('Could not find player');
    }
    // Generate virtual token using UUID
    player.virtualToken = uuidv4();
    this.playerRepository.save(player);
    return {
      UserName: player.username,
      SessionId: player.virtualToken,
      ClientExternalKey: player.userId,
      PortalName: 'sportsbookengine',
      CurrencyCode: 'NGN',
    };
  }

  async getBalance(token) {
    const player = await this.playerRepository.findOne({
      where: {
        virtualToken: token,
      },
    });
    if (player) {
      //TODO: USE PLAYER UserID AND ClientID to get balance from wallet service;
      const wallet = await this.walletService
        .getWallet({ userId: player.userId, clientId: player.clientId })
        .toPromise();
      if (wallet.success) {
        const user = wallet.data;
        console.log(user);
      }
    }
  }

  async placeBet(data: PlaceCasinoBetRequest) {
    const placeBetPayload: PlaceCasinoBetRequest = {
      userId: data.userId,
      clientId: data.userId,
      roundId: data.roundId,
      transactionId: data.transactionId,
      gameId: data.gameId,
      stake: data.userId,
      winnings: 0,
    };
    return await this.betService.placeCasinoBet(placeBetPayload);
  }

  async settle(data: CreditCasinoBetRequest) {
    const settlePayload: CreditCasinoBetRequest = {
      transactionId: data.transactionId,
      winnings: data.winnings,
    };
    return await this.betService.settleCasinoBet(settlePayload);
  }

  async rollbackTransaction(data: RollbackCasinoBetRequest) {
    const reversePayload: RollbackCasinoBetRequest = {
      transactionId: data.transactionId,
    };
    return await this.betService.cancelCasinoBet(reversePayload);
  }
}
