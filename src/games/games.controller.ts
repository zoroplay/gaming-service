/* eslint-disable prettier/prettier */
import { Controller } from '@nestjs/common';
// import { GrpcMethod } from '@nestjs/microservices';
import { GrpcMethod } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import {
  AddGameToCategoriesDto,
  AddGameToTournamentDto,
  CallbackGameDto,
  CommonResponse,
  CreateBonusRequest,
  CreateGameDto,
  CreatePromotionRequest,
  CreateProviderDto,
  CreateTournamentDto,
  Empty,
  FetchGamesRequest,
  FindOneCategoryDto,
  FindOneGameDto,
  FindOnePromotionDto,
  FindOneTournamentDto,
  Game,
  Games,
  GAMING_SERVICE_NAME,
  GetGamesRequest,
  PaginationDto,
  Provider,
  Providers,
  QtechCallbackRequest,
  SaveCategoryRequest,
  StartGameDto,
  SyncGameDto,
  UpdateGameDto
} from 'src/proto/gaming.pb';
import { GamesService } from './games.service';
import { QtechService } from 'src/services';

@Controller()
export class GamesController {
  constructor(
    private readonly gamesService: GamesService,
    private readonly qtechService: QtechService
  ) {}

  @GrpcMethod(GAMING_SERVICE_NAME, 'createProvider')
  createProvider(request: CreateProviderDto): Promise<CommonResponse> {
    console.log('createProvider', request);
    return this.gamesService.createProvider(request);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'updateProvider')
  updateProvider(
    request: CreateProviderDto,
  ): Provider | Observable<Provider> | Promise<Provider> | Promise<any> {
    console.log('updateProvider', request);
    return this.gamesService.updateProvider(request);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'findOneProvider')
  findOneProvider(request: FindOneGameDto): Promise<any> {
    console.log('findOneProvider', request);
    return this.gamesService.findOneProvider(request.id);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'removeProvider')
  removeProvider(
    request: CreateProviderDto,
  ): Provider | Observable<Provider> | Promise<Provider> | any {
    console.log('removeProvider', request);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'findAllProviders')
  findAllProviders(
    request: Empty,
  ): Providers | Observable<Providers> | Promise<CommonResponse> {
    console.log('findAllProviders', request);
    return this.gamesService.findAllProvider();
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'createGame')
  createGame(createGameDto: CreateGameDto): Promise<any> {
    console.log('createGame', createGameDto);
    return this.gamesService.create(createGameDto);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'findAllGames')
  findAllGames(): Promise<any> {
    console.log('findAllGames');
    const resp = this.gamesService.findAll('');
    return resp;
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'FetchGames')
  fetchGames(payload: FetchGamesRequest): Promise<any> {
    console.log('fetch games');
    return this.gamesService.fetchGames(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'fetchGamesByName')
  fetchGamesByName(payload: FetchGamesRequest): Promise<any> {
    console.log('fetch gameNames');
    return this.gamesService.fetchGamesByName(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'addGameToCategories')
  addGameToCategories(payload: AddGameToCategoriesDto): Promise<any> {
    console.log('addGameToCategories');
    return this.gamesService.addGameToCategories(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'removeGameToCategories')
  removeGameCategories(payload: AddGameToCategoriesDto): Promise<any> {
    console.log('removeGameToCategories');
    return this.gamesService.removeGameCategories(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'saveCategory')
  createCategories(payload: SaveCategoryRequest): Promise<any> {
    console.log('fetch gameNames');
    return this.gamesService.saveCategory(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'updateCategory')
  updateCategory(payload: SaveCategoryRequest): Promise<any> {
    console.log('fetch gameNames');
    return this.gamesService.updateCategory(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'findOneCategory')
  findOneCategory(payload: FindOneCategoryDto): Promise<any> {
    console.log('fetch category', payload);
    return this.gamesService.findOneCategory(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'deleteCategory')
  async deleteCategory(payload: FindOneCategoryDto): Promise<void> {
    console.log('Payload received by gRPC server for deletion:', payload);
    const { id } = payload;

    if (!id) {
      throw new Error('Invalid payload: Missing `id` property.');
    }

    return this.gamesService.deleteCategory(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'FetchCategories')
  FetchCategories(): Promise<any> {
    console.log('fetch categories');
    return this.gamesService.fetchCategories();
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'syncGames')
  syncGames(syncGameDto: SyncGameDto) {
    console.log('syncGames', syncGameDto);
    return this.gamesService.sync(syncGameDto);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'findOneGame')
  findOneGame(
    request: FindOneGameDto,
  ): Promise<Game> | Observable<Game> | Game | any {
    console.log(request);
    console.log('findOneGame', request);
    return this.gamesService.findOne(request.id);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'updateGame')
  updateGame(
    request: UpdateGameDto,
  ): Promise<Game> | Observable<Game> | Game | any {
    console.log('updateGame', request);
    return this.gamesService.update(request);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'removeGame')
  removeGame(
    request: UpdateGameDto,
  ): Promise<Game> | Observable<Game> | Game | any {
    console.log('removeGame', request);
    return this.gamesService.remove(request.id);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'startGame')
  async startGame(request: StartGameDto): Promise<any> {
    console.log('startGame', request);
    try {
      const resp = await this.gamesService.start(request);
      return resp;
    } catch (error) {
      console.error('grpc error');
      console.error(error);
    }
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'queryGames')
  queryGames(request: Observable<PaginationDto>): Observable<Games> | any {
    console.log('queryGames', request);
    return this.gamesService.queryGames(request);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'handleCallback')
  async handleCallback(request: CallbackGameDto): Promise<any> {
    console.log('request', request);
    try {
      return await this.gamesService.handleGamesCallback(request);
    } catch (error) {
      console.error('handleCallback error', error.message);
      console.error(error.message);
    }
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'createPromotion')
  async createPromotion(
    payload: CreatePromotionRequest, 
  ): Promise<any> {
    console.log('Received payload', payload);
    // Pass the payload and file to the games service
    const newPromo = await this.gamesService.createPromotion(payload);
    return newPromo;
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'updatePromotion')
  updatePromotion(payload: CreatePromotionRequest): Promise<any> {
    console.log('fetch gameNames');
    return this.gamesService.updatePromotion(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'findPromotions')
  fetchPromotions(): Promise<any> {
    console.log('find Promotions');
    return this.gamesService.fetchPromotions();
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'findOnePromotion')
  findOnePromotion(payload: FindOnePromotionDto): Promise<any> {
    console.log('fetch category', payload);
    return this.gamesService.findOnePromotion(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'removePromotion')
  async removePromotion(payload: FindOnePromotionDto): Promise<void> {
    console.log('Payload received by gRPC server for deletion:', payload);
    const { id } = payload;

    if (!id) {
      throw new Error('Invalid payload: Missing `id` property.');
    }

    return this.gamesService.removePromotion(payload);
  }

  // @GrpcMethod(GAMING_SERVICE_NAME, 'getGames')
  // async getGames() {
  //   return this.gamesService.getGamesWithCategories();
  // }

@GrpcMethod(GAMING_SERVICE_NAME, 'getGames')
async getGames(request?: GetGamesRequest) {
  // Call the service method with the gameIds
  return this.gamesService.getGamesWithCategories(request);
}

  @GrpcMethod(GAMING_SERVICE_NAME, 'createTournament')
  async createTournament(payload: CreateTournamentDto): Promise<any> {
    console.log('tournament', payload);
    const newPromo = await this.gamesService.createTournament(payload);
    return newPromo;
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'updateTournament')
  updateTournament(payload: CreateTournamentDto): Promise<any> {
    console.log('tournament');
    return this.gamesService.updateTournament(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'findAllTournaments')
  fetchTournaments(): Promise<any> {
    console.log('find Promotions');
    return this.gamesService.fetchTournaments();
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'findOneTournament')
  findOneTournament(payload: FindOneTournamentDto): Promise<any> {
    console.log('fetch tournament', payload);
    return this.gamesService.findOneTournament(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'deleteTournament')
  async removeTournament(payload: FindOneTournamentDto): Promise<void> {
    console.log('Payload received by gRPC server for deletion:', payload);
    const { id } = payload;

    if (!id) {
      throw new Error('Invalid payload: Missing `id` property.');
    }

    return this.gamesService.removeTournament(payload);
  }

  // @GrpcMethod(GAMING_SERVICE_NAME, 'uploadImage')
  // uploadImage(payload: FileChunk): Promise<any> {
  //   return this.gamesService.uploadImage(payload)
    
  // }

  @GrpcMethod(GAMING_SERVICE_NAME, 'handleQtechCallback')
  async handleQtechCallback(payload: QtechCallbackRequest): Promise<any> {
    return this.qtechService.handlCallbacks(payload);
  }

  // @GrpcMethod(GAMING_SERVICE_NAME, 'handleQtechGetBalance')
  // async handleQtechGetBalance(payload: QtechCallbackRequest): Promise<any> {
  //   return this.gamesService.handleQtechGetBalance(payload);
  // }

  // @GrpcMethod(GAMING_SERVICE_NAME, 'handleQtechTransactionBet')
  // async handleQtechBet(payload: QtechtransactionRequest): Promise<any> {
  //   return this.gamesService.handleQtechBet(payload);
  // }

  @GrpcMethod(GAMING_SERVICE_NAME, 'addTournamentGame')
  addTournamentGame(payload: AddGameToTournamentDto): Promise<any> {
    console.log('addGameToCategories');
    return this.gamesService.addTournamentGame(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'removeTournamentGame')
  removeTournamentGames(payload: AddGameToTournamentDto): Promise<any> {
    console.log('removeGameToCategories');
    return this.gamesService.removeTournamentGames(payload);
  }

  // @GrpcMethod(GAMING_SERVICE_NAME, 'handleQtechRollback')
  // async handleQtechRollback(payload: QtechRollbackRequest): Promise<any> {
  //   return this.gamesService.handleQtechRollback(payload);
  // }

  // @GrpcMethod(GAMING_SERVICE_NAME, 'handleQtechTransactionWin')
  // async handleQtechWin(payload: QtechtransactionRequest): Promise<any> {
  //   return this.gamesService.handleQtechWin(payload);
  // }

  @GrpcMethod(GAMING_SERVICE_NAME, 'handleCasinoBonus')
  handleCasinoBonus(payload: CreateBonusRequest): Promise<any> {
    console.log('handleCasinoBonus');
    return this.gamesService.handleCasinoBonus(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'handleCasinoJackpot')
  HandleCasinoJackpot(): Promise<any> {
    console.log('HandleCasinoJackpot');
    return this.gamesService.handleCasinoJackpot();
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'handleCasinoJackpotWinners')
  HandleCasinoJackpotWinners(): Promise<any> {
    console.log('handleCasinoJackpotWinners');
    return this.gamesService.handleCasinoJackpotWinners();
  }
}
