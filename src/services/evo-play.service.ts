/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Import your SettingService
import { InjectRepository } from '@nestjs/typeorm';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Cache } from 'cache-manager';
import * as crypto from 'crypto';
import { firstValueFrom } from 'rxjs';
import { BonusService } from 'src/bonus/bonus.service';
import { IdentityService } from 'src/identity/identity.service';
import {
  CreditCasinoBetRequest,
  PlaceCasinoBetRequest,
  RollbackCasinoBetRequest,
  SettleCasinoBetRequest,
} from 'src/proto/betting.pb';
import { Repository } from 'typeorm';
import { BetService } from '../bet/bet.service';
import {
  CallbackLog,
  Game as GameEntity,
  GameSession,
  // Player as PlayerEntity,
  Provider as ProviderEntity,
} from '../entities';
import { WalletService } from '../wallet/wallet.service';
import * as dayjs from 'dayjs';
import { GetBonusRequest } from 'src/proto/bonus.pb';
import { GameKey } from 'src/entities/game-key.entity';
import { CreateBonusRequest, SyncGameDto } from 'src/proto/gaming.pb';


@Injectable()
export class EvoPlayService {
  private baseUrl: string;
  private project: number;
  private version: number;
  private token: string;
  private requestConfig: AxiosRequestConfig;
  private secretKey: string;

  constructor(
    @InjectRepository(GameEntity)
    private gameRepository: Repository<GameEntity>,
    @InjectRepository(GameSession)
    private gameSessionRepo: Repository<GameSession>,
    @InjectRepository(CallbackLog)
    private callbackLogRepository: Repository<CallbackLog>,
    @InjectRepository(ProviderEntity)
    private providerRepository: Repository<ProviderEntity>,
    @InjectRepository(GameKey)
    private gameKeyRepository: Repository<GameKey>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly httpClient: HttpService,
    private readonly walletService: WalletService,
    private readonly betService: BetService,
    private readonly identityService: IdentityService,
    private readonly bonusService: BonusService,
  ) {
    this.baseUrl = this.configService.get<string>('EVO_PLAY_BASE_URL');
    this.project = this.configService.get<number>('EVO_PLAY_PROJECT');
    this.secretKey = this.configService.get<string>('EVO_PLAY_SECRET_KEY');
    this.version = this.configService.get<number>('EVO_PLAY_VERSION');
    this.token = this.configService.get<string>('EVO_PLAY_TOKEN');
    // this.setRequestOptions(this.baseUrl, this.token);
  }

  /**
   * Set options for making the Client request
   */
  private setRequestOptions(baseUrl, token) {
    this.requestConfig = {
      baseURL: baseUrl,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      data: {},
    };
    // console.log(this.requestConfig);
  }

  async getGames(project, version, token) {
    try {
      const signature = this.getSignature(
        project,
        version,
        {},
        token,
      );
      // $url = $this->project_id."*".$this->version."*".$this->token;
      const url = `Game/getList?project=${project}&version=${version}&signature=${signature}`;
      const response: AxiosResponse = await this.httpClient.axiosRef.get(
        url,
        this.requestConfig,
      );
      // console.log(response.data.data);
      return response.data.data;
    } catch (e) {
      console.error(e.message);
    }
  }

  // @Timeout(100)
  public async syncGames(payload: SyncGameDto) {

    const gameKeys = await this.gameKeyRepository.find({
      where: {
          client_id: payload.clientId,
          provider: 'evo-play',
      },
    });

  // Extract the necessary values
  const project = gameKeys.find(key => key.option === 'EVO_PLAY_PROJECT')?.value;
  const token = gameKeys.find(key => key.option === 'EVO_PLAY_TOKEN')?.value;
  const version = gameKeys.find(key => key.option === 'EVO_PLAY_VERSION')?.value;



    const games: any = await this.getGames(project, version, token);

    let provider = await this.providerRepository.findOne({
      where: { name: 'Evo Play' },
    });

    if (!provider) {
      const newProvider: ProviderEntity = new ProviderEntity();
      newProvider.name = 'Evo Play';
      newProvider.slug = 'evo-play';
      newProvider.description = 'Evo Play';
      newProvider.imagePath =
        'https://images.pexels.com/photos/414612/pexels-photo-414612.jpeg';
      provider = await this.providerRepository.save(newProvider);
    }

    const savedGames = await Promise.all(
      Object.keys(games).map(async (key) => {

        if (Object.prototype.hasOwnProperty.call(games, key)) {

          const gameData = {
            gameId: key,
            title: games[key].name,
            description: games[key].absolute_name,
            type: games[key].game_sub_type,
            provider: provider,
            status: true,
            imagePath:
              'https://images.pexels.com/photos/414612/pexels-photo-414612.jpeg',
            bannerPath:
              'https://images.pexels.com/photos/414612/pexels-photo-414612.jpeg',
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
  }




  addDaysToDate(days: number): string {
    if (typeof days !== 'number' || isNaN(days)) {
      throw new Error('Input must be a valid number');
    }
  
    // Get the current date and add the specified number of days
    const futureDate = dayjs().add(days, 'day');
  
    // Format the date to 'YYYY-MM-DD %HH:MM:SS'
    const formattedDate = `${futureDate.format('YYYY-MM-DD')} ${futureDate.format('HH:mm:ss')}`;
  
    return formattedDate;
  }

  //get games Info
  async getGameInfo(project, version, token, game: GameEntity) {
    try {

      const newData: any = {
        game: parseInt(game.gameId)
      }
      const signature = this.getSignature(
        project,
        version,
        newData,
        token,
      );
      // $url = $this->project_id."*".$this->version."*".$this->token;
      const url = `Game/getList?project=${project}&version=${version}&signature=${signature}&game=${newData.game}`;
      const response: AxiosResponse = await this.httpClient.axiosRef.get(
        url,
        this.requestConfig,
      );
      // console.log(response.data.data);
      return response.data.data;
    } catch (e) {
      console.error(e.message);
    }
  }

  //Register Bonus
  async registerBonus(data: CreateBonusRequest) {
    try {

      const gameKeys = await this.gameKeyRepository.find({
        where: {
            client_id: data.clientId,
            provider: "evo-play",
        },
    });

    // Extract the necessary values
    const token = gameKeys.find(key => key.option === 'EVO_PLAY_TOKEN')?.value;
    const version = gameKeys.find(key => key.option === 'EVO_PLAY_VERSION')?.value;
    const project = gameKeys.find(key => key.option === 'EVO_PLAY_PROJECT')?.value;
    const baseUrl = gameKeys.find(key => key.option === 'EVO_PLAY_BASE_URL')?.value;

      this.setRequestOptions(baseUrl, token);

      const formattedDate = this.addDaysToDate(data.duration).replace(' ', '%20');
      const formattedDateSpace = this.addDaysToDate(data.duration);
      console.log("formattedDate", formattedDate);

      const newData: any = {
        games: Array.isArray(data.gameId) ? data.gameId.join(',') : data.gameId,
        users: Array.isArray(data.userIds) ? data.userIds.join(',') : data.clientId,
        currency: 'NGN',
      };
      
      if (data.bonusType === 'free_rounds') {
        newData.extra_bonuses = {
          bonus_spins: {
            spins_count: data.casinoSpinCount,
            bet_in_money: data.minimumEntryAmount,
          },
        };
      
        newData.settings = {
          expire: formattedDateSpace,
        };
      }

      if (data.bonusType === 'feature_trigger') {
        newData.extra_bonuses = {
          freespins_on_start: {
            freespins_count: data.casinoSpinCount,
            bet_in_money: data.minimumEntryAmount,
          },
        };
      
        newData.settings = {
          expire: formattedDateSpace,
        };
      }

      const signature = this.getSignature(
        parseFloat(project),
        parseFloat(version),
        newData,
        token
      );

      // $url = $this->project_id."*".$this->version."*".$this->token;
      let url = `Game/registerBonusBatch?project=${this.project}&version=${this.version}&signature=${signature}&games=${Array.isArray(data.gameId) ? data.gameId.join(',') : data.gameId}&users=${data.clientId}&currency=${newData.currency}`;

      if (data.bonusType == 'free_rounds')
        url += `&extra_bonuses[bonus_spins][spins_count]=${data.casinoSpinCount}&extra_bonuses[bonus_spins][bet_in_money]=${data.minimumEntryAmount}&settings[expire]=${formattedDate}`;

      if (data.bonusType === 'feature_trigger')
        url += `&extra_bonuses[freespins_on_start][freespins_count]=${data.casinoSpinCount}&extra_bonuses[freespins_on_start][bet_in_money]=${data.minimumEntryAmount}&settings[expire]=${formattedDate}`;

      console.log("url", url);

      const response: AxiosResponse = await this.httpClient.axiosRef.get(
        url,
        this.requestConfig,
      );

      if(!response) {
        return {
          error: 0,
          success: false,
          message: 'Can not register evo-play bonus'
        }
      }

      console.log("response", response);
      console.log("response-data", response.data.data);

      return response.data.data;
    } catch (e) {
      console.error(e.message);
    }
  }



  // start game here
  async constructGameUrl(data, game: GameEntity) {
    try {
      const balanceType = data.balanceType;

       const gameKeys = await this.gameKeyRepository.find({
        where: {
            client_id: data.clientId,
            provider: 'evo-play',
        },
    });

    // Extract the necessary values
    const project = gameKeys.find(key => key.option === 'EVO_PLAY_PROJECT')?.value;
    const token = gameKeys.find(key => key.option === 'EVO_PLAY_TOKEN')?.value;
    const version = gameKeys.find(key => key.option === 'EVO_PLAY_VERSION')?.value;
    const baseUrl = gameKeys.find(key => key.option === 'EVO_PLAY_BASE_URL')?.value;

    this.setRequestOptions(baseUrl, token);
    // Fetch the bonus details globally
    let bonus = [];
    let selectedBonus = null;

    if (data.bonusId) {
      const getBonusPayload: GetBonusRequest = {
        clientId: data.clientId,
      };

      const bonusResponse = await this.bonusService.getBonusDetails(getBonusPayload);


      console.log('bonusResponse', bonusResponse);

      bonus = bonusResponse?.bonus || [];

      // Find the bonus by data.bonusId
      selectedBonus = bonus.find((b) => b.id === data.bonusId);

      if (!selectedBonus) {
        return { message: `No bonus with ID ${data.bonusId}`, url: null }
      }
    }

      // this.token = data.authCode;
      const newData: any = {
        token: data.authCode,
        game: parseInt(game.gameId),
        settings: {
          user_id: data.userId,
          exit_url: data.homeUrl,
          https: 1,
        },
        denomination: 1,
        currency: 'NGN',
        return_url_info: 1,
        callback_version: 2,
      };

      console.log("selectedBonus", selectedBonus);

      

      if (data.isBonus && data.bonusType == 'free_rounds') {
        newData.settings = {
          ...newData.settings, 
          extra_bonuses: {
            bonus_spins: {
              spins_count: selectedBonus.casinoSpinCount,
              bet_in_money: selectedBonus.minimumEntryAmount
            }
          },
          extra_bonuses_settings: {
            registration_id: data.bonusId
          }
        }
      }

      if (data.isBonus && data.bonusType == 'feature_trigger') {
        newData.settings = {
          ...newData.settings, 
          extra_bonuses: {
            freespins_on_start: {
              freespins_count: selectedBonus.casino_spin_count,
              bet_in_money: selectedBonus.minimumEntryAmount
            }
          },
          extra_bonuses_settings: {
            registration_id: data.bonusId
          }
        }
      }

      console.log("newData", newData);

      const signature = this.getSignature(
        parseFloat(project),
        parseFloat(version),
        newData,
        token
      );
      // console.log(signature)
      // $url = $this->project_id."*".$this->version."*".$this->token;
      let url = `Game/getURL?project=${project}&version=${version}&signature=${signature}&token=${newData.token}&game=${newData.game}&settings[user_id]=${newData.settings.user_id}&settings[exit_url]=${newData.settings.exit_url}&settings[https]=${newData.settings.https}`;
      
      if (data.isBonus && data.bonusType === 'free_rounds')
        url += `&settings[extra_bonuses][bonus_spins][spins_count]=${selectedBonus.casinoSpinCount}&settings[extra_bonuses][bonus_spins][bet_in_money]=${selectedBonus.minimumEntryAmount}&settings[extra_bonuses_settings][registration_id]=${data.bonusId}`;

      if (data.isBonus && data.bonusType === 'featured_trigger')
        url += `&settings[extra_bonuses][freespins_on_start][freespins_count]=${selectedBonus.casinoSpinCount}&settings[extra_bonuses][freespins_on_start][bet_in_money]=${selectedBonus.minimumEntryAmount}&settings[extra_bonuses_settings][registration_id]=${data.bonusId}`;

      url += `&denomination=${newData.denomination}&currency=${newData.currency}&return_url_info=${newData.return_url_info}&callback_version=${newData.callback_version}`

      const response: AxiosResponse = await this.httpClient.axiosRef.get(
        url,
        this.requestConfig,
      );

      const gameSession = new GameSession();
      gameSession.balance_type = balanceType;
      gameSession.game_id = game.gameId;
      gameSession.token = data.authCode;
      gameSession.provider = game.provider.slug;

      await this.gameSessionRepo.save(gameSession);

      if(response.data.error) {
        return {success: false, message: response.data.error.message}
      } else {
        return {url: response.data.data.link}
      }
    } catch (e) {
      console.error(e.message);
      return {message: 'error'};
    }
  }

  getSignature(
    project: number,
    version: number,
    args: object,
    token?: string,
  ) {
    const compact = function (arg): string {
      if ('object' === typeof arg) {
        const result = [];
        for (const key of Object.keys(arg)) {
          result.push(compact(arg[key]));
        }
        return result.join(':');
      } else {
        return '' + arg;
      }
    };

    const parts = [compact(project), compact(version)];

    for (const key of Object.keys(args)) {
      if(key !== 'signature')
        parts.push(compact(args[key]));
    }

    parts.push(compact(token));

    const str = parts.join('*')
    // console.log('str', str)
    const md5Hash = crypto
      .createHash('md5')
      .update(str)
      .digest('hex');

      // console.log('encryption hash');
      console.log('md5Hash', md5Hash);
      // console.log('encryption ends');

    return md5Hash;
  }


  async handleCallback(data: any) {
    const body = JSON.parse(data.body);

    const callback = await this.saveCallbackLog(body);

    console.log('_data', body);
    
    const gameKeys = await this.gameKeyRepository.find({
      where: {
          client_id: data.clientId,
          provider: 'evo-play',
      },
    });

    // Extract the necessary values
    const project = gameKeys.find(key => key.option === 'EVO_PLAY_PROJECT')?.value;
    const token = gameKeys.find(key => key.option === 'EVO_PLAY_TOKEN')?.value;

    const hash = this.getSignature(
      parseFloat(project),
      2,
      body,
      token
    );

    if (body.signature !== hash) {
      const response = {
        success: false,
        data: {
          status: "error",
          error: {
            message: 'Invalid Hash Signature',
            scope: "internal",
          }
        },
        message: 'Invalid Hash Signature',
        status: HttpStatus.BAD_REQUEST
      };

      // update callback log response
      await this.callbackLogRepository.update(
        {
          id: callback.id,
        },
        {
          response: JSON.stringify(response),
        },
      );

      return response;
    }

    let game = null;
    let player = null;
    let betParam, gameDetails;
    let balanceType = 'main';

    // get game session
    const gameSession = await this.gameSessionRepo.findOne({where: {token: body.token}});
      
    if (gameSession.balance_type === 'bonus')
      balanceType = 'casino';

    if (body.name === 'BalanceIncrease') {
      return await this.BalanceIncrease(data.clientId, body.data, callback.id, balanceType);

    } else if (body.token && body.name !== 'init') {
      const res = await this.identityService.validateToken({
        clientId: data.clientId,
        token: body.token,
      });

      if (!res.success) {
        const response = {
          success: false,
          message: 'Invalid Session ID',
          data: {
            status: "error",
            error: {
              message: 'Session expired. Please sign in to contiun',
              scope: "user",
              no_refund: "1"
            }
          },
        };

        // update callback log response
        await this.callbackLogRepository.update(
          {
            id: callback.id,
          },
          {
            response: JSON.stringify(response),
          },
        );

        return response;
      }

      player = res.data;

    }

    switch (body.name) {
      case 'init':
        console.log('init');
        const x = await this.activateSession(data.clientId, body.token, callback, balanceType);
        return x;
      case 'bet':
        betParam = body.data;
        gameDetails = JSON.parse(betParam.details);

        game = await this.gameRepository.findOne({
          where: {
            gameId: gameDetails.game.game_id,
          },
          relations: {provider: true}
        });

        if (player.balance < parseFloat(betParam.amount)) {
          const response = {
            success: false,
            message: 'Insufficent balance',
            data: {
              status: "error",
              error: {
                message: 'Insufficent balance',
                scope: "user",
                no_refund: "1",
              }
            },
            status: HttpStatus.BAD_REQUEST,
          };
          // update callback log response
          await this.callbackLogRepository.update(
            {
              id: callback.id,
            },
            {
              response: JSON.stringify(response),
            },
          );

          return response;
        }
        
        // return await this.activateSession();
        const placeBetPayload: PlaceCasinoBetRequest = {
          userId: player.playerId,
          clientId: data.clientId,
          roundId: betParam.round_id,
          transactionId: betParam.round_id,
          gameId: game.gameId,
          stake: parseFloat(betParam.amount),
          gameName: game.title,
          gameNumber: game.gameId,
          source: game.provider.slug,
          cashierTransactionId: data.callback_id,
          winnings: 0,
          username: player.playerNickname
        };
        
        const place_bet = await this.placeBet(placeBetPayload);

        if (!place_bet.success) {
          const response = {
            success: false,
            status: HttpStatus.BAD_REQUEST,
            message: place_bet.message,
            data: {
              status: "error",
              error: {
                message: place_bet.message,
                scope: "internal",
                no_refund: "0",
              }
            },
          };
          // update callback log response
          await this.callbackLogRepository.update(
            {
              id: callback.id,
            },
            {
              response: JSON.stringify(response),
            },
          );

          return response;
        }

        // if(balanceType === 'bonus' || 'casino') {
        //   const updateBonus = await this.bonusService.getBonusDetails()
        // }

        const debit = await this.walletService.debit({
          userId: player.playerId,
          clientId: data.clientId,
          amount: betParam.amount,
          source: game.provider.slug,
          description: `Casino Bet: (${game.title})`,
          username: player.playerNickname,
          wallet: balanceType,
          subject: 'Bet Deposit (Casino)',
          channel: game.type,
        });

        if (!debit.success) {
          const response = {
            success: false,
            status: HttpStatus.BAD_REQUEST,
            message: 'Incomplete request',
            data: {
              status: "error",
              error: {
                message: 'Unable to complete request',
                scope: "internal",
                no_refund: "1",
              }
            },
          };

          // update callback log response
          await this.callbackLogRepository.update(
            {
              id: callback.id,
            },
            {
              response: JSON.stringify(response),
            },
          );

          return response;
        }

        const response = {
          success: true,
          message: 'bet handled successfully',
          status: HttpStatus.OK,
          data: {
            status: "ok",
            data: {
              balance: debit.data.balance.toFixed(2),
              currency: player.currency,
            }
          },
        };
        // update callback log response
        await this.callbackLogRepository.update(
          {
            id: callback.id,
          },
          {
            response: JSON.stringify(response),
            status: true,
          },
        );

        return response;
      case 'win':
        betParam = body.data;
        gameDetails = JSON.parse(betParam.details);
        
        const amount = parseFloat(betParam.amount);
        const betId = betParam.round_id;

        game = await this.gameRepository.findOne({
          where: {
            gameId: gameDetails.game.game_id,
          },
          relations: {provider: true}
        });


        if (amount > 0) {
          const settlePayload: SettleCasinoBetRequest = {
            transactionId: betId,
            winnings: amount,
            provider: 'evo-play',
          };

          const settle_bet = await this.settle(settlePayload);
          // console.log(settle_bet)
          if (!settle_bet.success) {
            const response = {
              success: false,
              message: 'Unable to complete request ' + settle_bet.message,
              status: HttpStatus.INTERNAL_SERVER_ERROR,
              data: {
                status: "error",
                error: {
                  message: 'Unable to complete request',
                  scope: "internal",
                  no_refund: "1",
                }
              },
            };
            // update callback log response
            await this.callbackLogRepository.update(
              {
                id: callback.id,
              },
              {
                response: JSON.stringify(response),
              },
            );

            return response;
          }

          const creditRes = await this.walletService.credit({
            userId: player.playerId,
            clientId: data.clientId,
            amount: amount.toFixed(2),
            source: game.provider.slug,
            description: `Casino Bet: (${game.title})`,
            username: player.playerNickname,
            wallet: balanceType,
            subject: 'Bet Win (Casino)',
            channel: game.type,
          });

          const resp = {
            success: true,
            message: 'win handled successfully',
            status: HttpStatus.OK,
            data: {
              status: "ok",
              data: {
                balance: creditRes.data.balance.toFixed(2),
                currency: player.currency,
              },
            }
          };

          // update callback log response
          await this.callbackLogRepository.update(
            {
              id: callback.id,
            },
            {
              response: JSON.stringify(resp),
              status: true,
            },
          );

          return resp;
        } else {
          const payload: CreditCasinoBetRequest = {
            transactionId: betId,
            winnings: amount,
          };

          // settle won bet
          const settle_bet = await this.betService.closeRound(payload);
        
          if (!settle_bet.success)  {

            const response = {
              success: false, 
              message: settle_bet.message, 
              status: HttpStatus.INTERNAL_SERVER_ERROR
            }
            // update callback log response
            await this.callbackLogRepository.update({
              id: callback.id,
            },{
              response: JSON.stringify(response)
            });

            return response;
          }
          
          // get player wallet
          // const creditRes = await this.walletService.getWallet({
          //   userId: player.playerId,
          //   clientId: player.clientId,
          // });

          const updateBonusWallet = await this.walletService.credit({
            userId: player.playerId,
            clientId: data.clientId,
            amount: amount.toFixed(2),
            source: game.provider.slug,
            description: `Casino Bet: (${game.title})`,
            username: player.playerNickname,
            wallet: balanceType,
            subject: 'Bet Win (Casino)',
            channel: game.type,
          });

          const response = {
            success: true,
            message: 'win handled successfully',  
            status: HttpStatus.OK,
            data: {
              status: "ok",
              data: {
                balance: updateBonusWallet.data.balance.toFixed(2),
                currency: player.currency,
              },
            }
          };
          // update callback log response
          await this.callbackLogRepository.update({
            id: callback.id,
          },{
            response: JSON.stringify(response)
          });

          return response;
        }
      case 'refund':
        betParam = body.data;
        gameDetails = JSON.parse(betParam.details);

        const reversePayload: RollbackCasinoBetRequest = {
          transactionId: betParam.refund_round_id,
        };
        // get callback log
        const callbackLog = await this.callbackLogRepository.findOne({
          where: { transactionId: betParam.refund_callback_id },
        });

        game = await this.gameRepository.findOne({
          where: {
            gameId: gameDetails.game.game_id,
          },
          relations: {provider: true}
        });

        if (!callbackLog) {
          const res = { 
            success: false, 
            message: 'Transaction not found',
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            data: {
              status: "error",
              error: {
                message: 'Unable to complete request: Callback log not found',
                scope: "internal",
                no_refund: "1",
              }
            },
          };
          // update callback log response
          await this.callbackLogRepository.update(
            {
              id: callback.id,
            },
            {
              response: JSON.stringify(res),
            },
          );

          return res;
        }

        const transaction = await this.rollbackTransaction(reversePayload);

        if (!transaction.success) {
          const response = {
            success: false,
            message: 'Unable to complete request',
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            data: {
              status: "error",
              error: {
                message: 'Unable to complete request: ' + transaction.message,
                scope: "internal",
                no_refund: "1",
              }
            },
          };
          // update callback log response
          await this.callbackLogRepository.update(
            {
              id: callback.id,
            },
            {
              response: JSON.stringify(response),
            },
          );

          return response;
        }

        const rollbackWalletRes = await this.walletService.credit({
          userId: player.playerId,
          clientId: data.clientId,
          amount: betParam.amount,
          source: game.provider.slug,
          description: `Bet Cancelled: (${game.title})`,
          username: player.playerNickname,
          wallet: balanceType,
          subject: 'Bet refund (Casino)',
          channel: game.title,
        });

        try {

          const response = {
            success: true,
            message: 'refund handled successfully',
            status: HttpStatus.OK,
            data: {
              status: "ok",
              data: {
                balance: rollbackWalletRes.data.balance.toFixed(2),
                currency: player.currency,
              },
            }
          };
          // update callback log response
          await this.callbackLogRepository.update(
            {
              id: callback.id,
            },
            {
              response: JSON.stringify(response),
              status: true,
            },
          );

          return response;
        } catch (e) {
          // console.log(e.message);
          return {
            success: false,
            message: 'Unable to complete request: ' + e.message,
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            data: {
              status: "error",
              error: {
                message: 'Unable to complete request',
                scope: "internal",
                no_refund: "1",
              }
            }
          }
        }        
        
    }
  }
  // Webhook Section
  // Activate Player Session
  async activateSession(clientId, token, callback, walletType) {
    // console.log('activateSession', data, callback);
    const res: any = await this.identityService.validateToken({
      clientId,
      token,
    });

    if (!res) {
      const response = {
        success: false,
        data: {
          status: "error",
          error: {
            message: 'Invalid auth code, please login to try again',
            scope: "user",
            no_refund: "1"
          }
        },
        message: 'Invalid auth code, please login to try again',
        status: HttpStatus.BAD_REQUEST
      };

      // update callback log response
      await this.callbackLogRepository.update(
        {
          id: callback.id,
        },
        {
          response: JSON.stringify(response),
        },
      );

      return response;
    } else if (!res.status) {
      const response = {
        success: false,
        data: {
          status: "error",
          error: {
            message: 'Invalid auth code, please login to try again',
            scope: "user",
            no_refund: "1"
          }
        },
        message: 'Invalid auth code, please login to try again',
        status: HttpStatus.BAD_REQUEST
      };

      // update callback log response
      await this.callbackLogRepository.update(
        {
          id: callback.id,
        },
        {
          response: JSON.stringify(response),
        },
      );

      return response;
    }

    const player = res.data;

    if (!player) {
      const response = {
        success: false,
        data: {
          status: "error",
          error: {
            message: 'Invalid auth code, please login to try again',
            scope: "user",
            no_refund: "1"
          }
        },
        message: 'Invalid auth code, please login to try again',
        status: HttpStatus.BAD_REQUEST
      };

      // update callback log response
      await this.callbackLogRepository.update(
        {
          id: callback.id,
        },
        {
          response: JSON.stringify(response),
        },
      );

      return response;
    }

    const response = {
      success: true,
      message: 'Activation Successful',
      data: {
        status: "ok",
        data: {
          balance: walletType === 'casino' || walletType === 'bonus' 
            ? parseFloat(player.casinoBalance.toFixed(2)) : parseFloat(player.balance.toFixed(2)),
          currency: player.currency
        }
      },
      status: HttpStatus.OK
    };

    // update callback log response
    await this.callbackLogRepository.update(
      {
        id: callback.id,
      },
      {
        response: JSON.stringify(response),
        status: true,
      },
    );


    return response;
  }

  // Place Bet
  async placeBet(data: PlaceCasinoBetRequest) {
    return firstValueFrom(this.betService.placeCasinoBet(data));
  }

  // Settle Bet
  async settle(data: CreditCasinoBetRequest) {
    return await firstValueFrom(this.betService.settleCasinoBet(data));
  }
  // Reverse Bet

  async rollbackTransaction(data: RollbackCasinoBetRequest) {
    return await firstValueFrom(this.betService.cancelCasinoBet(data));
  }

  async BalanceIncrease (clientId, data, callbackId, wallet) {
    try {
      const {user_id, type, currency, amount, user_message} = data;
      // let wallet = 'main';
      // if (wallet_type === 'bonus')
      //   wallet = 'casino';

      const user = await this.identityService.getDetails({clientId, userId: user_id});

      if (!user) {
        const response = {
          success: false,
          message: 'User not found',
          data: {
            status: "error",
            error: {
              message: `User with ID ${user_id} not found`,
              scope: "internal",
              no_refund: "1"
            }
          },
        };

        // update callback log response
        await this.callbackLogRepository.update(
          {
            id: callbackId,
          },
          {
            response: JSON.stringify(response),
            status: true,
          },
        );

        return response;
      }

      const walletRes = await this.walletService.credit({
        userId: user_id,
        clientId,
        amount,
        source: 'evo-play',
        description: user_message,
        username: user.data.username,
        wallet,
        subject: 'Casino Bonus (EvoPlay)',
        channel: `evo-play-${type}`,
      });

      const response = {
        success: true,
        message: 'Balance increase processed',
        status: HttpStatus.OK,
        data: {
          status: "ok",
          data: {
            balance: walletRes.data.availableBalance.toFixed(2),
            currency,
          },
        }
      };
      // update callback log response
      await this.callbackLogRepository.update(
        {
          id: callbackId,
        },
        {
          response: JSON.stringify(response),
          status: true,
        },
      );

      return response;

    } catch (e) {
      // console.log(e.message)
      return {
        success: false,
        message: 'Unable to complete request: ' + e.message,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        data: {
          status: "error",
          error: {
            message: 'Unable to complete request',
            scope: "internal",
            no_refund: "1",
          }
        }
      }
    }
  }

  // save callback request
  async saveCallbackLog(data) {
    try {
      const callback = new CallbackLog();
      callback.transactionId = (data.name === 'BalanceIncrease') ? data.data.id : data.callback_id
      callback.request_type = data.name;
      callback.payload = JSON.stringify(data);

      return await this.callbackLogRepository.save(callback);
    } catch (e) {
      console.log('Error saving callback log', e.message);
    }
  }
}