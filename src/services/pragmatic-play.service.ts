/* eslint-disable prettier/prettier */
import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { BetService } from 'src/bet/bet.service';
import { IdentityService } from 'src/identity/identity.service';
import { CreditCasinoBetRequest, PlaceCasinoBetRequest, RollbackCasinoBetRequest } from 'src/proto/betting.pb';
import { StartGameDto } from 'src/proto/gaming.pb';
import { WalletService } from 'src/wallet/wallet.service';
import { Repository } from 'typeorm';
import { CallbackLog, Game as GameEntity, GameSession, Provider as ProviderEntity } from '../entities';


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
    @InjectRepository(CallbackLog)
    private callbackLogRepository: Repository<CallbackLog>,
    @InjectRepository(GameEntity)
    private gameRepository: Repository<GameEntity>,
    @InjectRepository(GameSession)
    private gameSessionRepo: Repository<GameSession>,
    private readonly betService: BetService,
    private readonly walletService: WalletService,
    private readonly identityService: IdentityService,
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
      return new RpcException(e.messag || 'Something went wrong')
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
              gameId: games[key].gameID,
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

  async constructGameUrl(payload: StartGameDto): Promise<any> {
    try {
      console.log("payload", payload);
      const balanceType = payload.balanceType;
      const { gameId, language, authCode, userId, demo } = payload;

      const gameExist = await this.gameRepository.findOne({ where: { id: gameId }});

      if(!gameExist) {
        return new NotFoundException('Game not found');
      }

      const hash = this.genHash({
        secureLogin: this.PRAGMATIC_SECURE_LOGIN,
        symbol: gameId,
        language: language,
        token: authCode,
        ...(demo && { playMode: "DEMO" })
      });
  
      const playMode = demo ? 'playMode=DEMO' : '';
  
      const request = this.httpService.post(
        `${this.PRAGMATIC_BASEURL}/game/url?secureLogin=${this.PRAGMATIC_SECURE_LOGIN}&symbol=${gameExist.gameId}&language=${language}&externalPlayerId=${userId}&token=${authCode}&hash=${hash}&${playMode}`,
      );

      const gameSession = new GameSession();
      gameSession.balance_type = balanceType;
      gameSession.game_id = gameExist.gameId;
      gameSession.token = payload.authCode;
      gameSession.provider = gameExist.provider.slug;
      await this.gameSessionRepo.save(gameSession);

      console.log(request);
      const { data } = await lastValueFrom(request);
  
      return { url: data.gameURL };
    } catch (e) {
      return new RpcException(e.message || 'Something went wrong');
    }
  }

  async authenticate(clientId, token, callback, walletType) {
    const isValid = await this.identityService.validateToken({ clientId, token });

    let response;
    const dataObject = typeof isValid.data === 'string' ? JSON.parse(isValid.data) : isValid.data;

    if(!isValid || !isValid.status) {
      response = {
        success: false,
        status: HttpStatus.BAD_REQUEST,
        message: 'Invalid auth code, please login to try again',
        data: {}
      }

      await this.callbackLogRepository.update({ id: callback.id}, { response: JSON.stringify(response)});

      return response;
    } 

    response = {
      success: true,
      status: HttpStatus.OK,
      message: "Authentication Successful",
      data: {
        balance: walletType === 'casino' ? dataObject.casinoBalance.toFixed(2) : dataObject.balance.toFixed(2),
        currency: dataObject.currency
      }
    }

    await this.callbackLogRepository.update({ id: callback.id}, { response: JSON.stringify(response)});

    return response;

  }

  async getBalance(player, callback, walletType) {
    let response, status;

    if (player) {
      //TODO: USE PLAYER UserID AND ClientID to get balance from wallet service;
      const wallet = await this.walletService.getWallet({
        userId: player.id,
        clientId: player.clientId,
        wallet: walletType
      });

      if (wallet.success) {
        response = {
          success: true,
          status: HttpStatus.OK,
          message: 'Balance Success',
          data: {
            Amount: walletType === 'casino' ? wallet.data.casinoBonusBalance.toFixed(2) : wallet.data.availableBalance.toFixed(2),
            CurrencyCode: 'NGN',
          },
        };
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        status = true;
      } else {
        response = {
          success: false,
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Could not retrieve balance',
          data: {}
        };
      }
    } else {
      response = {
        success: false,
        status: HttpStatus.NOT_FOUND,
        message: 'Player not found',
        data: {}
      };
    }
    // update callback log response
    await this.callbackLogRepository.update({ id: callback.id}, { response: JSON.stringify(response)});

    return response;
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

  async handleCallback(data: any) {
    // save callback
    const callback = await this.saveCallbackLog(data);
    let response;

    const body = data.body ? JSON.parse(data.body) : '';

    if (this.hashCheck(body)) {
      response = {
        success: false,
        message: 'Invalid Hash Signature',
        status: HttpStatus.BAD_REQUEST,
        data: {
          error: 5,
          description: 'Error'
        }
      }

      await this.callbackLogRepository.update({ id: callback.id}, { response: JSON.stringify(response)});

      return response;
    }

    let game = null;
    const player = null;
    let balanceType = 'main';
    let betParam, gameDetails;
   
    // get game session
    const gameSession = await this.gameSessionRepo.findOne({where: {session_id: body.token}})
    
    if (gameSession.balance_type === 'bonus')
      balanceType = 'casino';


    switch (data.action) {
      case 'Authenticate':
        return await this.authenticate(data.clientId, body.token, callback, balanceType);
      case 'Balance':
        return await this.getBalance(player, callback, balanceType);
      case 'Deposit':
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
            data: {},
            status: HttpStatus.BAD_REQUEST,
          };
          // update callback log response
          await this.callbackLogRepository.update({ id: callback.id}, { response: JSON.stringify(response)});

          return response;
        }

        const placeBetPayload: PlaceCasinoBetRequest = {
          userId: player.id,
          clientId: player.clientId,
          roundId: body.roundId,
          roundDetails: body.roundDetails,
          transactionId: body.reference,
          gameId: body.gameId,
          stake: parseFloat(body.amount),
          gameName: game.title,
          gameNumber: game.id,
          source: game.provider.slug,
          cashierTransactionId: data.callback_id,
          winnings: 0,
          username: player.username,
          bonusId: gameSession.bonus_id || null
        };

        const place_bet = await this.placeBet(placeBetPayload);
        
        if (!place_bet.success) {
          const response = {
            success: false,
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            message: place_bet.message,
            data: {}
          };
          // update callback log response and game session with callback id
          await this.callbackLogRepository.update({ id: callback.id}, { response: JSON.stringify(response)});

          return response;
        }

        const debit = await this.walletService.debit({
          userId: player.id,
          clientId: player.clientId,
          amount: body.amount.toFixed(2),
          source: game.provider.slug,
          description: `Casino Bet: (${game.title}:${body.gameId})`,
          username: player.username,
          wallet: balanceType,
          subject: 'Bet Deposit (Casino)',
          channel: game.title,
        });

        if (!debit.success) {
          const response = {
            success: false,
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Incomplete request',
          };
          // update callback log response and game session with callback id
          await this.callbackLogRepository.update({ id: callback.id}, { response: JSON.stringify(response)});

          return response;
        }
        
        const response = {
          success: true,
          status: HttpStatus.OK,
          message: 'Deposit, successful',
          data: {
            balance: parseFloat(debit.data.balance.toFixed(2)),
            transactionId: place_bet.data.transactionId,
          },
        };
        // update callback log response
        await this.callbackLogRepository.update({ id: callback.id}, { response: JSON.stringify(response)});

        return response;
      case 'Withdraw':
        const transactionType = body.reference;
        const amount = body.amount;
        const roundId = body.roundId;
        const betId = body.reference;

        // check if transaction ID exist and return user balance
        if (callback.transactionId === body.reference && callback.status === true) {
          console.log('transaction completed')
          const creditRes = await this.walletService.getWallet({
            userId: player.id,
            clientId: player.clientId,
          });

          return {
            success: true,
            status: HttpStatus.OK,
            message: 'Withdraw, successful',
            data: {
              balance: creditRes.data.availableBalance,
              transactionId: callback.id,
            },
          };

        }

        let creditRes = null;

        if (transactionType === 'WinAmount') {
          
          const settlePayload: CreditCasinoBetRequest = {
            transactionId: betId,
            winnings: amount,
          };

          // console.log('prociessing settlement')
  
          // settle won bet
          const settle_bet = await this.result(settlePayload);
          // console.log(settle_bet, 'settlebet response')
          if (!settle_bet.success)  {
            const response = {success: false, message: settle_bet.message, status: HttpStatus.INTERNAL_SERVER_ERROR}
            // update callback log response
            await this.callbackLogRepository.update({ id: callback.id}, { response: JSON.stringify(response)});
  
            return response;
          }

          creditRes = await this.walletService.credit({
            userId: player.id,
            clientId: player.clientId,
            amount: body.Amount.toFixed(2),
            source: body.TransactionInfo.Source,
            description: `Casino Bet: (${body.TransactionInfo.GameName}:${body.TransactionInfo.GameNumber})`,
            username: player.username,
            wallet: balanceType,
            subject: 'Bet Win (Casino)',
            channel: body.TransactionInfo.Source,
          });

          const response = {
            success: true,
            status: HttpStatus.OK,
            message: 'Withdraw, successful',
            data: {
              Balance: parseFloat(creditRes.data.balance.toFixed(2)),
              TransactionId: callback.id,
            },
          };
          // update callback log response
          await this.callbackLogRepository.update({ id: callback.id}, { response: JSON.stringify(response)});

          return response;
        } else { // handle CloseRound transactionType

          const payload: CreditCasinoBetRequest = {
            transactionId: roundId,
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
            await this.callbackLogRepository.update({ id: callback.id}, { response: JSON.stringify(response)});
  
            return response;
          }
          
          // get player wallet
          creditRes = await this.walletService.getWallet({
            userId: player.id,
            clientId: player.clientId,
          });

          const response = {
            success: true,
            status: HttpStatus.OK,
            message: 'Withdraw, successful',
            data: {
              Balance: balanceType === 'casino' ? parseFloat(creditRes.data.casinoBonusBalance.toFixed(2)) : parseFloat(creditRes.data.availableBalance.toFixed(2)),
              TransactionId: callback.id,
            },
          };
          // update callback log response
          await this.callbackLogRepository.update({ id: callback.id}, { response: JSON.stringify(response)});

          return response;
        }
      case 'Refund':
        console.log("refund");
      default:
        return {success: false, message: 'Invalid request', status: HttpStatus.BAD_REQUEST};
    }
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

  hashCheck = (query) => {
    const hash = this.genHash(query);
    return query.hash !== hash;
  };
  

  // save callback request
  async saveCallbackLog(data) {
    const action = data.action;
    const body = data.body ? JSON.parse(data.body) : '';
    const transactionId = 
      action === 'Authenticate' 
        ? body.token 
        : action === 'GetBalance' 
          ? body.token
          : action === 'Bet' 
          ? body.token 
          : action === 'Refund' 
          ? body.token
          : action === 'Result' 
          ? body.token
          : action === 'BonusWin' 
          ? data.header['x-sessionid']
          : action === 'promoWin' 
          ? data.header['x-sessionid'] 
          : action === 'JackpotWin' 
          ? data.header['x-sessionid'] 
            : body.transactionId;

    try{
      let callback = await this.callbackLogRepository.findOne({where: {transactionId}});
      
      if (callback) return callback;
      
      callback = new CallbackLog();
      callback.transactionId = transactionId;
      callback.request_type = action;
      callback.payload = JSON.stringify(body);


      return await this.callbackLogRepository.save(callback);

    } catch(e) {
      console.log('Error saving callback log', e.message)
    }
  }

}
