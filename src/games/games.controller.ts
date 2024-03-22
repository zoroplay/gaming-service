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
  SyncGameDto,
  UpdateGameDto,
  GAMING_SERVICE_NAME,
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
    console.log('here');
    console.log('startGame');
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
  async handleCallback(request: any): Promise<any> {
    console.log('handleCallback start');
    console.log(request);
    console.log('handleCallback finish');
    try {
      return await this.gamesService.handleGamesCallback(request);
    } catch (error) {
      console.error('handleCallback error');
      console.error(error.message);
    }
  }
}
