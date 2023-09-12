import { Controller } from '@nestjs/common';
import { GrpcMethod, MessagePattern, Payload } from '@nestjs/microservices';
import { GamesService } from './games.service';
import {
  CreateGameDto,
  UpdateGameDto,
  FindOneGameDto,
  Game,
  Games,
  PaginationDto,
  StartGameDto,
  StartGameResponse,
  SyncGameDto,
} from 'src/proto/gaming.pb';
import { Observable } from 'rxjs';
import { GAMING_SERVICE_NAME } from 'src/common';

@Controller()
export class GamesController {

  constructor(private readonly gamesService: GamesService) {}

  @GrpcMethod(GAMING_SERVICE_NAME, 'CreateGame')
  private createGame(
    createGameDto: CreateGameDto,
  ): Game | Promise<Game> | Promise<Game> {
    throw new Error('Method not implemented.');
    return this.gamesService.create(createGameDto);
  }

  @GrpcMethod(GAMING_SERVICE_NAME, 'FindAllGames')
  private findAllGames(): Games | Promise<Games> | Promise<Games> {
    return this.gamesService.findAll();
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
