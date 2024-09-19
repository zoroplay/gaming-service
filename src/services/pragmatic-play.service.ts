/* eslint-disable prettier/prettier */
import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { firstValueFrom } from 'rxjs';
import { BetService } from 'src/bet/bet.service';
import { CreditCasinoBetRequest, PlaceCasinoBetRequest, RollbackCasinoBetRequest } from 'src/proto/betting.pb';
import { StartGameDto } from 'src/proto/gaming.pb';
import { Repository } from 'typeorm';
import { Game as GameEntity, Provider as ProviderEntity } from '../entities';


@Injectable()
export class PragmaticService {
  private readonly PRAGMATIC_SECURE_LOGIN: string;
  private readonly PRAGMATIC_BASEURL: string;
  private readonly PRAGMATIC_GAMEURL: string;
  private readonly PRAGMATIC_KEY: string;
  private readonly PRAGMATIC_IMAGE_URL: string;

  constructor(
    @InjectRepository(ProviderEntity)
    private providerRepository: Repository<ProviderEntity>,
    @InjectRepository(GameEntity)
    private gameRepository: Repository<GameEntity>,
    private readonly betService: BetService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService, // For accessing environment variables
  ) {
    this.PRAGMATIC_SECURE_LOGIN = this.configService.get<string>('PRAGMATIC_SECURE_LOGIN');
    this.PRAGMATIC_BASEURL = this.configService.get<string>('PRAGMATIC_BASEURL');
    this.PRAGMATIC_GAMEURL = this.configService.get<string>('PRAGMATIC_GAMEURL');
    this.PRAGMATIC_KEY = this.configService.get<string>('PRAGMATIC_KEY');
    this.PRAGMATIC_IMAGE_URL = this.configService.get<string>('PRAGMATIC_IMAGE_URL');
  }

  // Get Casino Games
  async getCasinoGames(): Promise<any> {
    try {
      const hash = this.genHash({ secureLogin: this.PRAGMATIC_SECURE_LOGIN });
      const { data } = await this.httpService
        .post(`${this.PRAGMATIC_BASEURL}/getCasinoGames?secureLogin=${this.PRAGMATIC_SECURE_LOGIN}&hash=${hash}`)
        .toPromise();

        console.log('data', data);

      return data.gameList;
    } catch (e) {
      throw new HttpException(e.response?.data?.message || 'Something went wrong', 500);
    }
  }

  
  public async syncGames() {
    try {
      const games: any = await this.getCasinoGames();
      console.log("games", games);
  
      if (!games || games.length === 0) {
        throw new Error('No games available for processing');
      }
  
      let provider = await this.providerRepository.findOne({
        where: { name: 'Pragmatic Play' },
      });

      console.log("provider", provider);
  
      if (!provider) {
        const newProvider: ProviderEntity = new ProviderEntity();
        newProvider.name = 'Pragmatic Play';
        newProvider.slug = 'pragmatic-play';
        newProvider.description = 'Pragmatic Play';
        newProvider.imagePath =
          'https://images.pexels.com/photos/414612/pexels-photo-414612.jpeg';
        provider = await this.providerRepository.save(newProvider);
      }

      const savedGames = await Promise.all(
        Object.keys(games).map(async (key) => {
  
          if (Object.prototype.hasOwnProperty.call(games, key)) {
  
            const gameData = {
              gameId: key,
              title: games[key].gameName,
              description: games[key].typeDescription,
              type: 'Slots',
              provider: provider,
              status: true,
              imagePath:`${this.PRAGMATIC_IMAGE_URL}/${games[key].gameID}.png`,
              bannerPath: `${this.PRAGMATIC_IMAGE_URL}/${games[key].gameID}.png`,
            };
  
            const gameExist = await this.gameRepository.findOne({
              where: {
                gameId: gameData.gameId,
                title: gameData.title,
              },
              relations: {
                provider: true,
              },
            });
  
            if (gameExist) {
              console.log('updated game')
              this.gameRepository.merge(gameExist, gameData);
              return this.gameRepository.save(gameExist);
            } else {
              console.log('added game')
              return this.gameRepository.save(
                this.gameRepository.create(gameData),
              );
            }
          }
        }),
      );
  
      return {
        games: savedGames,
      };
  
    } catch (error) {
      console.log("Error saving games:", error.message);
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
