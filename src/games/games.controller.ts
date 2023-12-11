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
  CallbackGameDto,
} from 'src/proto/gaming.pb';
import { Observable } from 'rxjs';

@Controller()
@GamingServiceControllerMethods()
export class GamesController implements GamingServiceController {
  constructor(private readonly gamesService: GamesService) {}
  createGame(
    createGameDto: CreateGameDto,
  ): Promise<Game> | Observable<Game> | Game | any {
    return this.gamesService.create(createGameDto);
  }

  async findAllGames(): Promise<any> {
    const resp = await this.gamesService.findAll();
    return resp;
  }

  syncGames(
    syncGameDto: SyncGameDto,
  ): Promise<Games> | Observable<Games> | Games | any {
    return this.gamesService.sync(syncGameDto);
  }

  findOneGame(
    request: FindOneGameDto,
  ): Promise<Game> | Observable<Game> | Game | any {
    console.log(request);
    throw new Error('Method not implemented.');
  }

  updateGame(
    request: UpdateGameDto,
  ): Promise<Game> | Observable<Game> | Game | any {
    console.log(request);
    throw new Error('Method not implemented.');
  }

  removeGame(
    request: UpdateGameDto,
  ): Promise<Game> | Observable<Game> | Game | any {
    console.log(request);
    throw new Error('Method not implemented.');
  }

  startGame(
    request: StartGameDto,
  ):
    | Promise<StartGameResponse>
    | Observable<StartGameResponse>
    | StartGameResponse
    | any {
    console.log(request);
    throw new Error('Method not implemented.');
  }

  queryGames(request: Observable<PaginationDto>): Observable<Games> | any {
    console.log(request);
    throw new Error('Method not implemented.');
  }

  handleGamesCallback(
    request: CallbackGameDto,
  ): Games | Promise<Games> | Observable<Games> {
    console.log(request);
    throw new Error('Method not implemented.');
  }

  // @GrpcMethod(GAMING_SERVICE_NAME, 'SyncGames')
  // syncGames(
  //   syncGameDto: SyncGameDto,
  // ): Games | Promise<Games> | Observable<Games> {
  //   throw new Error('Method not implemented.');
  //   return this.gamesService.sync(syncGameDto);
  // }

  // findOneGame(
  //   findOneGameDto: FindOneGameDto,
  // ): Game | Promise<Game> | Observable<Game> {
  //   throw new Error('Method not implemented.');
  //   return this.gamesService.findOne(findOneGameDto.id);
  // }
  // updateGame(
  //   updateGameDto: UpdateGameDto,
  // ): Game | Promise<Game> | Observable<Game> {
  //   return this.gamesService.update(updateGameDto.id, updateGameDto);
  // }

  // removeGame(
  //   updateGameDto: UpdateGameDto,
  // ): Game | Promise<Game> | Observable<Game> {
  //   throw new Error('Method not implemented.');
  //   return this.gamesService.remove(updateGameDto.id);
  // }
  // startGame(
  //   startGameDto: StartGameDto,
  //   // eslint-disable-next-line prettier/prettier
  // ): StartGameResponse | Promise<StartGameResponse> | Observable<StartGameResponse> {
  //   throw new Error('Method not implemented.');
  //   return this.gamesService.start(startGameDto);
  // }
  // queryGames(
  //   paginationDtoStream: Observable<PaginationDto>,
  // ): Observable<Games> {
  //   return this.gamesService.queryGames(paginationDtoStream);
  // }

  // @MessagePattern('createGame')
  // create(@Payload() createGameDto: CreateGameDto) {
  //   return this.gamesService.create(createGameDto);
  // }

  // @MessagePattern('findAllGames')
  // findAll() {
  //   return this.gamesService.findAll();
  // }

  // @MessagePattern('findOneGame')
  // findOne(@Payload() id: number) {
  //   return this.gamesService.findOne(id);
  // }

  // @MessagePattern('updateGame')
  // update(@Payload() updateGameDto: UpdateGameDto) {
  //   return this.gamesService.update(updateGameDto.id, updateGameDto);
  // }

  // @MessagePattern('removeGame')
  // remove(@Payload() id: number) {
  //   return this.gamesService.remove(id);
  // }
}
