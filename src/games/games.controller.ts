import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { GamesService } from './games.service';
import {
  GamingServiceController,
  CreateGameDto,
  UpdateGameDto,
  GamingServiceControllerMethods,
  FindOneGameDto,
  Game,
  Games,
  PaginationDto,
  StartGameDto,
  StartGameResponse,
  SyncGameDto,
} from 'src/common';
import { Observable } from 'rxjs';

@Controller()
@GamingServiceControllerMethods()
export class GamesController implements GamingServiceController {
  constructor(private readonly gamesService: GamesService) {}
  createGame(
    createGameDto: CreateGameDto,
  ): Game | Promise<Game> | Observable<Game> {
    throw new Error('Method not implemented.');
    return this.gamesService.create(createGameDto);
  }
  findAllGames(): Games | Promise<Games> | Observable<Games> {
    return this.gamesService.findAll();
  }
  syncGames(
    syncGameDto: SyncGameDto,
  ): Games | Promise<Games> | Observable<Games> {
    throw new Error('Method not implemented.');
    return this.gamesService.sync(syncGameDto);
  }
  findOneGame(
    findOneGameDto: FindOneGameDto,
  ): Game | Promise<Game> | Observable<Game> {
    throw new Error('Method not implemented.');
    return this.gamesService.findOne(findOneGameDto.id);
  }
  updateGame(
    updateGameDto: UpdateGameDto,
  ): Game | Promise<Game> | Observable<Game> {
    return this.gamesService.update(updateGameDto.id, updateGameDto);
  }
  removeGame(
    updateGameDto: UpdateGameDto,
  ): Game | Promise<Game> | Observable<Game> {
    throw new Error('Method not implemented.');
    return this.gamesService.remove(updateGameDto.id);
  }
  startGame(
    startGameDto: StartGameDto,
    // eslint-disable-next-line prettier/prettier
  ): StartGameResponse | Promise<StartGameResponse> | Observable<StartGameResponse> {
    throw new Error('Method not implemented.');
    return this.gamesService.start(startGameDto);
  }
  queryGames(
    paginationDtoStream: Observable<PaginationDto>,
  ): Observable<Games> {
    return this.gamesService.queryGames(paginationDtoStream);
  }

  @MessagePattern('createGame')
  create(@Payload() createGameDto: CreateGameDto) {
    return this.gamesService.create(createGameDto);
  }

  @MessagePattern('findAllGames')
  findAll() {
    return this.gamesService.findAll();
  }

  @MessagePattern('findOneGame')
  findOne(@Payload() id: number) {
    return this.gamesService.findOne(id);
  }

  @MessagePattern('updateGame')
  update(@Payload() updateGameDto: UpdateGameDto) {
    return this.gamesService.update(updateGameDto.id, updateGameDto);
  }

  @MessagePattern('removeGame')
  remove(@Payload() id: number) {
    return this.gamesService.remove(id);
  }
}
