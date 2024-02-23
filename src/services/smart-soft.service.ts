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

  // start game here
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

  // callback handler
  async handleCallback(resp: CallbackGameDto) {
    const hash = await this.generateMd5(resp.method, resp.body);
    if (resp.header['x-signature'] !== hash) {
      return {
        success: false,
        message: 'Invalid Hash Signature',
      };
    }
    const player = await this.playerRepository.findOne({
      where: {
        virtualToken: resp.header['x-sessionid'],
      },
    });
    if (!player)
      return {
        success: false,
        message: 'Invalid Hash Signature',
      };
    const game = await this.gameRepository.findOne({
      where: {
        title: resp.body['TransactionInfo']['GameName'],
      },
    });
    switch (resp.action) {
      case 'ActivateSession':
        return await this.activateSession(resp.body['Token']);
        break;
      case 'GetBalance':
        return await this.getBalance(resp.header['x-sessionid']);
        break;
      case 'Deposit':
        if (!game)
          return {
            success: false,
            message: 'Game not in system',
          };
        // return await this.activateSession();
        const placeBetPayload: PlaceCasinoBetRequest = {
          userId: player.userId,
          clientId: player.clientId,
          roundId: resp.body.TransactionId,
          transactionId: resp.body.TransactionId,
          gameId: game.gameId,
          stake: resp.body.Amount,
          winnings: 0,
        };
        return await this.placeBet(placeBetPayload);
        break;
      case 'Withdraw':
        const settlePayload: CreditCasinoBetRequest = {
          transactionId: resp.body.TransactionId,
          winnings: resp.body.Amount,
        };
        return await this.settle(settlePayload);
        break;
      case 'IssueClientGifts':
        const reversePayload: RollbackCasinoBetRequest = {
          transactionId: resp.body.TransactionId,
        };
        return await this.rollbackTransaction(reversePayload);
        break;
    }
  }

  // support
  generateMd5(requestMethod: string, payload) {
    console.log('payload start');

    console.log(this.secretKey);
    console.log(requestMethod);
    console.log(JSON.stringify(payload));
    console.log(this.secretKey + requestMethod + JSON.stringify(payload));
    const md5Hash = crypto
      .createHash('md5')
      .update(this.secretKey + requestMethod + JSON.stringify(payload))
      .digest('hex');

    console.log('payload hash');
    console.log(md5Hash);
    console.log('payload ends');
    return md5Hash;
  }

  // Webhook Section

  // Activate Player Session
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
      success: true,
      message: 'Activation Successful',
      data: {
        UserName: player.username,
        SessionId: player.virtualToken,
        ClientExternalKey: player.userId,
        PortalName: 'sportsbookengine',
        CurrencyCode: 'NGN',
      },
    };
  }

  // Get Player Balance
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
        return {
          success: true,
          message: 'Wallet',
          data: {
            Amount: wallet.data.availableBalance,
            CurrencyCode: 'NGN',
          },
        };
      } else {
        return {
          success: false,
          message: 'Could not retrieve balance',
        };
      }
    }
  }

  // Place Bet
  async placeBet(data: PlaceCasinoBetRequest) {
    const resp = await this.betService.placeCasinoBet(data).toPromise();
    if (resp.success) {
      return resp.data;
    }
  }

  // Settle Bet
  async settle(data: CreditCasinoBetRequest) {
    const resp = await this.betService.settleCasinoBet(data).toPromise();
    if (resp.success) {
      return resp.data;
    }
  }
  // Reverse Bet
  async rollbackTransaction(data: RollbackCasinoBetRequest) {
    const resp = await this.betService.cancelCasinoBet(data).toPromise();
    if (resp.success) {
      return resp.data;
    }
  }
}
