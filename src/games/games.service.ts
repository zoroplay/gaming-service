import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable, Subject } from 'rxjs';
import {
  Game,
  CreateGameDto,
  UpdateGameDto,
  SyncGameDto,
  StartGameDto,
  PaginationDto,
  Games,
} from 'src/proto/gaming.pb';

@Injectable()
export class GamesService implements OnModuleInit {
  private readonly games: Game[] = [];

  onModuleInit() {
    for (let i = 0; i <= 100; i++) {
      this.create({
        gameId: randomUUID(),
        title: `Game ${i}`,
        description: `description: ${i}`,
        url: 'https://www.google.com',
        imagePath: 'https://www.google.com',
        bannerPath: 'https://www.google.com',
        status: true,
        type: 'casino',
        provider: {
          id: '1',
          slug: 'net-gaming',
          name: 'netGaming',
          description: '',
          imagePath: '',
          parentProvider: 'c27',
        },
      });
    }
  }

  create(createGameDto: CreateGameDto): Game {
    console.log(createGameDto);
    const game: Game = {
      ...createGameDto,
      id: randomUUID(),
      providerId: createGameDto.provider.name.toString(),
    };
    this.games.push(game);
    return game;
  }

  findAll(): Games {
    return { games: this.games };
  }

  queryGames(
    paginationDtoStream: Observable<PaginationDto>,
  ): Observable<Games> {
    const subject = new Subject<Games>();

    const onNext = (paginationDto: PaginationDto) => {
      const start = paginationDto.page * paginationDto.skip;
      subject.next({
        games: this.games.slice(start, start + paginationDto.skip),
      });
    };
    const onComplete = () => subject.complete();
    paginationDtoStream.subscribe({
      next: onNext,
      complete: onComplete,
    });

    return subject.asObservable();
  }

  findOne(id: number) {
    return `This action returns a #${id} game`;
  }

  update(id: string, updateGameDto: UpdateGameDto): Game {
    const gameIndex = this.games.findIndex((game) => game.id == id);
    if (gameIndex !== -1) {
      this.games[gameIndex] = {
        ...this.games[gameIndex],
        ...updateGameDto,
      };
      return this.games[gameIndex];
    }
    throw new NotFoundException(`Game not Found for ${gameIndex}.`);
  }

  remove(id: string) {
    const gameIndex = this.games.findIndex((game) => game.id == id);
    if (gameIndex !== -1) {
      return this.games.splice(gameIndex)[0];
    }
    throw new NotFoundException(`Game not Found for ${gameIndex}.`);
  }

  start(StartGameDto: StartGameDto) {
    console.log(StartGameDto);
    return `This action starts a game`;
  }

  sync(syncGameDto: SyncGameDto) {
    console.log(syncGameDto);
    return `This action synchronizes games from provider source to database`;
  }
}
