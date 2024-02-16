import { Controller } from '@nestjs/common';
// import { GrpcMethod } from '@nestjs/microservices';
import { GamesService } from './games.service';
import {
  Game,
  CreateGameDto,
  Games,
  GamingServiceControllerMethods,
  GamingServiceController,
  FindOneGameDto,
  PaginationDto,
  StartGameDto,
  StartGameResponse,
  SyncGameDto,
  UpdateGameDto,
  GAMING_SERVICE_NAME,
  EvolutionCallback,
  EvoplayCallback,
  ShackEvolutionCallback,
  SmartSoftCallback,
  TadaCallback,
  CreateProviderDto,
  Empty,
  Provider,
  Providers,
} from 'src/proto/gaming.pb';
import { Observable } from 'rxjs';
import { GrpcMethod } from '@nestjs/microservices';

@Controller()
@GamingServiceControllerMethods()
export class GamesController implements GamingServiceController {
  constructor(private readonly gamesService: GamesService) {}

  @GrpcMethod(GAMING_SERVICE_NAME, 'createProvider')
  createProvider(
    request: CreateProviderDto,
  ): Provider | Observable<Provider> | Promise<Provider> | Promise<any> {
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
  ): Providers | Observable<Providers> | Promise<Providers> {
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
    const resp = this.gamesService.findAll();
    return resp;
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'syncGames')
  syncGames(
    syncGameDto: SyncGameDto,
  ): Promise<Games> | Observable<Games> | Games | any {
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
  startGame(
    request: StartGameDto,
  ):
    | Promise<StartGameResponse>
    | Observable<StartGameResponse>
    | StartGameResponse
    | any {
    console.log('startGame', request);
    return this.gamesService.start(request);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'queryGames')
  queryGames(request: Observable<PaginationDto>): Observable<Games> | any {
    console.log('queryGames', request);
    return this.gamesService.queryGames(request);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'handleSmartSoftCallback')
  handleSmartSoftCallback(
    request: SmartSoftCallback,
  ):
    | SmartSoftCallback
    | Observable<SmartSoftCallback>
    | Promise<SmartSoftCallback>
    | any {
    console.log('handleSmartSoftCallback', request);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'handleTadaCallback')
  handleTadaCallback(
    request: TadaCallback,
  ): TadaCallback | Observable<TadaCallback> | Promise<TadaCallback> | any {
    console.log('handleTadaCallback', request);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'handleShackEvolutionCallback')
  handleShackEvolutionCallback(
    request: ShackEvolutionCallback,
  ):
    | ShackEvolutionCallback
    | Observable<ShackEvolutionCallback>
    | Promise<ShackEvolutionCallback>
    | any {
    console.log('handleShackEvolutionCallback', request);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'handleEvoplayCallback')
  handleEvoplayCallback(
    request: EvoplayCallback,
  ):
    | EvoplayCallback
    | Observable<EvoplayCallback>
    | Promise<EvoplayCallback>
    | any {
    console.log('handleEvoplayCallback', request);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'handleEvolutionCallback')
  handleEvolutionCallback(
    request: EvolutionCallback,
  ):
    | EvolutionCallback
    | Observable<EvolutionCallback>
    | Promise<EvolutionCallback>
    | any {
    console.log('handleEvolutionCallback', request);
  }
}
