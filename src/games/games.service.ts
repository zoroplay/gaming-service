import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Observable, Subject } from 'rxjs';
import { Game as GameEntity } from '../entities/game.entity';
import { Provider as ProviderEntity } from '../entities/provider.entity';
import {
  CreateGameDto,
  UpdateGameDto,
  SyncGameDto,
  StartGameDto,
  PaginationDto,
  Games,
  Game,
} from 'src/proto/gaming.pb';
import { Repository } from 'typeorm';
import { EntityToProtoService } from 'src/services/entity-to-proto.service';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(GameEntity)
    private gameRepository: Repository<GameEntity>,
    @InjectRepository(ProviderEntity)
    private providerRepository: Repository<ProviderEntity>,
    private readonly entityToProtoService: EntityToProtoService,
  ) {}

  async create(createGameDto: CreateGameDto): Promise<Game> {
    const provider: ProviderEntity = await this.providerRepository.findOneBy({
      id: createGameDto.providerId,
    });
    if (!provider) {
      throw new Error(`Provider ${createGameDto.providerId} not found`);
    }
    const newGame: GameEntity = new GameEntity();
    newGame.gameId = createGameDto.gameId;
    newGame.title = createGameDto.title;
    newGame.description = createGameDto.description;
    newGame.url = createGameDto.url;
    newGame.imagePath = createGameDto.imagePath;
    newGame.bannerPath = createGameDto.bannerPath;
    newGame.type = createGameDto.type;
    newGame.provider = provider;
    const savedGame = await this.gameRepository.save(newGame);
    const final = this.entityToProtoService.entityToProto(savedGame);
    return final;
  }

  async findAll(): Promise<Games> {
    const resp = await this.gameRepository.find();
    // Convert TypeORM entities to proto-generated types
    const protoResponse: any = resp.map((entity: GameEntity) =>
      this.entityToProtoService.entityToProto(entity),
    );
    const final = {
      games: protoResponse,
    };
    console.log('service line 58');
    console.log(final);
    return final;
  }

  async queryGames(
    paginationDtoStream: Observable<PaginationDto>,
  ): Promise<Observable<GameEntity[]>> {
    const subject = new Subject<GameEntity[]>();

    const onNext = async (paginationDto: PaginationDto) => {
      const start = paginationDto.page * paginationDto.skip;
      const games: GameEntity[] = await this.gameRepository
        .createQueryBuilder('game')
        .skip(start)
        .take(start + paginationDto.skip)
        .getMany();
      subject.next(games);
    };
    const onComplete = () => subject.complete();
    paginationDtoStream.subscribe({
      next: onNext,
      complete: onComplete,
    });

    return subject.asObservable();
  }

  async findOne(id: number): Promise<GameEntity | null> {
    return await this.gameRepository.findOneBy({ id });
  }

  async update(id: number, updateGameDto: UpdateGameDto): Promise<GameEntity> {
    const provider: ProviderEntity = await this.providerRepository.findOneBy({
      id: updateGameDto.providerId,
    });
    if (!provider) {
      throw new NotFoundException(
        `Provider ${updateGameDto.providerId} not found`,
      );
    }
    const updateGame: GameEntity = await this.gameRepository.findOneBy({
      id,
    });
    if (!updateGame) {
      throw new NotFoundException(`Game ${id} not found`);
    }
    updateGame.gameId = updateGameDto.gameId;
    updateGame.title = updateGameDto.title;
    updateGame.description = updateGameDto.description;
    updateGame.url = updateGameDto.url;
    updateGame.imagePath = updateGameDto.imagePath;
    updateGame.bannerPath = updateGameDto.bannerPath;
    updateGame.status = updateGameDto.status;
    updateGame.type = updateGameDto.type;
    updateGame.provider = provider;
    const savedGame = await this.gameRepository.save(updateGame);
    return savedGame;
  }

  async remove(id: string) {
    return await this.gameRepository.delete(id);
  }

  start(StartGameDto: StartGameDto) {
    console.log(StartGameDto);
    return `This action starts a game`;
  }

  sync(syncGameDto: SyncGameDto) {
    console.log(syncGameDto);
    return `This action synchronizes games from provider source to database`;
  }

  private syncShackGames() {
    return true;
  }
}
