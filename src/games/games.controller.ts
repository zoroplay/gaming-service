/* eslint-disable prettier/prettier */
import { Controller } from '@nestjs/common';
// import { GrpcMethod } from '@nestjs/microservices';
import { GrpcMethod } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import {
  AddGameToCategoriesDto,
  AddGameToTournamentDto,
  BonusGameRequest,
  CallbackGameDto,
  CommonResponse,
  CreateBonusRequest,
  CreateGameDto,
  CreateGameKeyRequest,
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
  GetKeysRequest,
  GetPromotions,
  PaginationDto,
  Provider,
  Providers,
  QtechCallbackRequest,
  SaveCategoryRequest,
  SmatVirtualCallbackRequest,
  StartDto,
  StartGameDto,
  SyncGameDto,
  UpdateGameDto
} from 'src/proto/gaming.pb';
import { QtechService } from 'src/services';
import { SmatVirtualService } from 'src/services/smatvirtual.service';
import { SpribeService } from 'src/services/spribe.service';
import { GamesService } from './games.service';

@Controller()
export class GamesController {
  constructor(
    private readonly gamesService: GamesService,
    private readonly qtechService: QtechService,
    private readonly smatVirtualService: SmatVirtualService,
    private readonly spribeService: SpribeService,
  ) {}

  @GrpcMethod(GAMING_SERVICE_NAME, 'createProvider')
  createProvider(request: CreateProviderDto): Promise<CommonResponse> {
    return this.gamesService.createProvider(request);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'updateProvider')
  updateProvider(
    request: CreateProviderDto,
  ): Provider | Observable<Provider> | Promise<Provider> | Promise<any> {
    return this.gamesService.updateProvider(request);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'findOneProvider')
  findOneProvider(request: FindOneGameDto): Promise<any> {
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
    return this.gamesService.findAllProvider();
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'findAdminProviders')
  findAdminProviders(
    request: Empty,
  ): Providers | Observable<Providers> | Promise<CommonResponse> {
    return this.gamesService.findAdminProviders();
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'createGame')
  createGame(createGameDto: CreateGameDto): Promise<any> {
    return this.gamesService.create(createGameDto);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'findAllGames')
  findAllGames(): Promise<any> {
    const resp = this.gamesService.findAll('');
    return resp;
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'FetchGames')
  fetchGames(payload: FetchGamesRequest): Promise<any> {
    return this.gamesService.fetchGames(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'fetchGamesByName')
  fetchGamesByName(payload: FetchGamesRequest): Promise<any> {
    return this.gamesService.fetchGamesByName(payload);
  }

   @GrpcMethod(GAMING_SERVICE_NAME, 'adminFetchGamesByName')
    adminFetchGamesByName(payload: FetchGamesRequest): Promise<any> {
      console.log('fetch gameNames');
      return this.gamesService.adminFetchGamesByName(payload);
    }

  @GrpcMethod(GAMING_SERVICE_NAME, 'addGameToCategories')
  addGameToCategories(payload: AddGameToCategoriesDto): Promise<any> {
    return this.gamesService.addGameToCategories(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'removeGameToCategories')
  removeGameCategories(payload: AddGameToCategoriesDto): Promise<any> {
    return this.gamesService.removeGameCategories(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'saveCategory')
  createCategories(payload: SaveCategoryRequest): Promise<any> {
    return this.gamesService.saveCategory(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'updateCategory')
  updateCategory(payload: SaveCategoryRequest): Promise<any> {
    return this.gamesService.updateCategory(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'findOneCategory')
  findOneCategory(payload: FindOneCategoryDto): Promise<any> {
    return this.gamesService.findOneCategory(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'deleteCategory')
  async deleteCategory(payload: FindOneCategoryDto): Promise<void> {
    const { id } = payload;

    if (!id) {
      throw new Error('Invalid payload: Missing `id` property.');
    }

    return this.gamesService.deleteCategory(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'FetchCategories')
  FetchCategories(): Promise<any> {
    return this.gamesService.fetchCategories();
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'syncGames')
  syncGames(syncGameDto: SyncGameDto) {
    return this.gamesService.sync(syncGameDto);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'findOneGame')
  findOneGame(
    request: FindOneGameDto,
  ): Promise<Game> | Observable<Game> | Game | any {
    return this.gamesService.findOne(request.id);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'updateGame')
  updateGame(
    request: UpdateGameDto,
  ): Promise<Game> | Observable<Game> | Game | any {
    return this.gamesService.update(request);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'removeGame')
  removeGame(
    request: UpdateGameDto,
  ): Promise<Game> | Observable<Game> | Game | any {
    return this.gamesService.remove(request.id);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'startGame')
  async startGame(request: StartGameDto): Promise<any> {
    try {
      const resp = await this.gamesService.start(request);
      return resp;
    } catch (error) {
      console.error('grpc error');
      console.error(error);
    }
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'qtechLobby')
  async qtechLobby(request: StartGameDto): Promise<any> {
    try {
      const resp = await this.qtechService.launchLobby(request);
      return resp;
    } catch (error) {
      console.error('grpc error');
      console.error(error);
    }
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'startSmatGame')
  async startSmatGame(request: StartDto): Promise<any> {
    try {
      const resp = await this.gamesService.startSmatGames(request);
      return resp;
    } catch (error) {
      console.error('grpc error');
      console.error(error);
    }
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'queryGames')
  queryGames(request: Observable<PaginationDto>): Observable<Games> | any {
    return this.gamesService.queryGames(request);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'handleCallback')
  async handleCallback(request: CallbackGameDto): Promise<any> {
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
    // Pass the payload and file to the games service
    const newPromo = await this.gamesService.createPromotion(payload);
    return newPromo;
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'updatePromotion')
  updatePromotion(payload: CreatePromotionRequest): Promise<any> {
    // console.log('fetch gameNames');
    return this.gamesService.updatePromotion(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'findPromotions')
  fetchPromotions(payload: GetPromotions): Promise<any> {
    return this.gamesService.fetchPromotions(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'findOnePromotion')
  findOnePromotion(payload: FindOnePromotionDto): Promise<any> {
    // console.log('fetch category', payload);
    return this.gamesService.findOnePromotion(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'removePromotion')
  async removePromotion(payload: FindOnePromotionDto): Promise<void> {
    // console.log('Payload received by gRPC server for deletion:', payload);
    const { id } = payload;

    if (!id) {
      throw new Error('Invalid payload: Missing `id` property.');
    }

    return this.gamesService.removePromotion(payload);
  }


@GrpcMethod(GAMING_SERVICE_NAME, 'getGames')
async getGames(request?: GetGamesRequest) {
  // Call the service method with the gameIds
  return this.gamesService.getGamesWithCategories(request);
}

  @GrpcMethod(GAMING_SERVICE_NAME, 'createTournament')
  async createTournament(payload: CreateTournamentDto): Promise<any> {
    const newPromo = await this.gamesService.createTournament(payload);
    return newPromo;
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'updateTournament')
  updateTournament(payload: CreateTournamentDto): Promise<any> {
    return this.gamesService.updateTournament(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'findAllTournaments')
  fetchTournaments(): Promise<any> {
    return this.gamesService.fetchTournaments();
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'findOneTournament')
  findOneTournament(payload: FindOneTournamentDto): Promise<any> {
    return this.gamesService.findOneTournament(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'deleteTournament')
  async removeTournament(payload: FindOneTournamentDto): Promise<void> {
    const { id } = payload;

    if (!id) {
      throw new Error('Invalid payload: Missing `id` property.');
    }

    return this.gamesService.removeTournament(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'handleQtechCallback')
  async handleQtechCallback(payload: QtechCallbackRequest): Promise<any> {
    return this.qtechService.handleCallbacks(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'handleSmatVirtualCallback')
  async handleSmatVirtualCallback(payload: SmatVirtualCallbackRequest): Promise<any> {
    return this.smatVirtualService.handleCallback(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'addTournamentGame')
  addTournamentGame(payload: AddGameToTournamentDto): Promise<any> {
    return this.gamesService.addTournamentGame(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'removeTournamentGame')
  removeTournamentGames(payload: AddGameToTournamentDto): Promise<any> {
    return this.gamesService.removeTournamentGames(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'handleCasinoBonus')
  handleCasinoBonus(payload: CreateBonusRequest): Promise<any> {
    return this.gamesService.handleCasinoBonus(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'handleCasinoJackpot')
  HandleCasinoJackpot(payload: SyncGameDto): Promise<any> {
    return this.gamesService.handleCasinoJackpot(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'handleCasinoJackpotWinners')
  HandleCasinoJackpotWinners(payload: SyncGameDto): Promise<any> {
    return this.gamesService.handleCasinoJackpotWinners(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'addGameKeys')
  async createGameKeys(payload: CreateGameKeyRequest): Promise<any> {
    return this.gamesService.addGameKeys(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'fetchGameKeys')
  async fetchGameKeys(payload: GetKeysRequest): Promise<any> {
    return this.gamesService.fetchGameKeys(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'fetchBonusGames')
  async getUserBonusGames(payload: BonusGameRequest): Promise<any> {
    return this.gamesService.getUserBonusGames(payload);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'deleteGameKeys')
  async removeGameKey(payload: FindOneGameDto): Promise<any> {
    return this.gamesService.removeGameKey(payload);
  }

}