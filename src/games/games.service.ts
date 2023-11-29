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
import {
  ShackEvolutionService,
  C2GamingService,
  TadaGamingService,
} from 'src/services';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(GameEntity)
    private gameRepository: Repository<GameEntity>,
    @InjectRepository(ProviderEntity)
    private providerRepository: Repository<ProviderEntity>,
    private readonly entityToProtoService: EntityToProtoService,
    private readonly shacksEvolutionService: ShackEvolutionService,
    private readonly c2GamingService: C2GamingService,
    private readonly tadaGamingService: TadaGamingService,
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
    const resp = await this.gameRepository.find({
      relations: {
        provider: true,
      },
    });
    console.log(`entity response`);
    console.log(resp[0]);
    // Convert TypeORM entities to proto-generated types
    const protoResponse: Game[] = resp.map((entity: GameEntity) =>
      this.entityToProtoService.entityToProto(entity),
    );
    console.log(`proto response: ${JSON.stringify(protoResponse)}`);
    const final = {
      games: protoResponse,
    };
    console.log('service line 63');
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

  async sync(syncGameDto: SyncGameDto) {
    switch (syncGameDto.provider) {
      case 'shack-evolution':
        return await this.syncShackGames();
        break;
      case 'c27':
        return await this.syncC2Games();
        break;
      case 'tada-games':
        return await this.syncTadaGames();
        break;
      case 'evo-play':
        return await this.syncEvoPlayGames();
        break;
      default:
        throw new NotFoundException('Unknown provider');
        break;
    }
  }

  async syncShackGames(): Promise<Game[]> {
    // Fetch the game list from your API (adjust the method name and params accordingly)
    const gameList = await this.shacksEvolutionService.getGames();
    // Find or create the 'Shack Evolution' provider
    let provider = await this.providerRepository.findOneBy({
      name: 'Shack Evolution',
    });
    if (!provider) {
      provider = await this.providerRepository.save(
        this.providerRepository.create({
          name: 'Shack Evolution',
          slug: 'shack-evolution',
          description: 'Shack Evolution',
          parentProvider: 'Shack Evolution',
        }),
      );
    }

    // Save the games to the database and return the created/updated records
    const savedGames = await Promise.all(
      gameList.data.data.map(async (game) => {
        const existingGame = await this.gameRepository.findOneBy({
          gameId: game.gameId,
        });
        const gameData = {
          gameId: game.gameId,
          title: game.gameId,
          description: `${game.gameId} Casino Game`,
          url: game.url,
          imagePath: game.assets.logo,
          bannerPath: game.assets.banner,
          type: 'casino',
          provider: provider,
        };

        if (existingGame) {
          // Update the existing game
          this.gameRepository.merge(existingGame, gameData);
          return this.gameRepository.save(existingGame);
        } else {
          // Create a new game
          return this.gameRepository.save(this.gameRepository.create(gameData));
        }
      }),
    );

    return savedGames;
  }

  async syncC2Games(): Promise<Game[] | any> {
    // Fetch the game list from your API (adjust the method name and params accordingly)
    const gameList = await this.c2GamingService.getGames();

    return gameList;
    // Find or create the 'Shack Evolution' provider
    // let provider = await this.providerRepository.findOneBy({
    //   name: 'Shack Evolution',
    // });
    // if (!provider) {
    //   provider = await this.providerRepository.save(
    //     this.providerRepository.create({
    //       name: 'Shack Evolution',
    //       slug: 'shack-evolution',
    //       description: 'Shack Evolution',
    //       parentProvider: 'Shack Evolution',
    //     }),
    //   );
    // }

    // // Save the games to the database and return the created/updated records
    // const savedGames = await Promise.all(
    //   gameList.data.data.map(async (game) => {
    //     const existingGame = await this.gameRepository.findOneBy({
    //       gameId: game.gameId,
    //     });
    //     const gameData = {
    //       gameId: game.gameId,
    //       title: game.gameId,
    //       description: `${game.gameId} Casino Game`,
    //       url: game.url,
    //       imagePath: game.assets.logo,
    //       bannerPath: game.assets.banner,
    //       type: 'casino',
    //       provider: provider,
    //     };

    //     if (existingGame) {
    //       // Update the existing game
    //       this.gameRepository.merge(existingGame, gameData);
    //       return this.gameRepository.save(existingGame);
    //     } else {
    //       // Create a new game
    //       return this.gameRepository.save(this.gameRepository.create(gameData));
    //     }
    //   }),
    // );

    // return savedGames;
  }

  async syncTadaGames(): Promise<Game[] | any> {
    // Fetch the game list from your API (adjust the method name and params accordingly)
    const gameList = await this.c2GamingService.getGames();

    return gameList;
    // Find or create the 'Shack Evolution' provider
    // let provider = await this.providerRepository.findOneBy({
    //   name: 'Shack Evolution',
    // });
    // if (!provider) {
    //   provider = await this.providerRepository.save(
    //     this.providerRepository.create({
    //       name: 'Shack Evolution',
    //       slug: 'shack-evolution',
    //       description: 'Shack Evolution',
    //       parentProvider: 'Shack Evolution',
    //     }),
    //   );
    // }

    // // Save the games to the database and return the created/updated records
    // const savedGames = await Promise.all(
    //   gameList.data.data.map(async (game) => {
    //     const existingGame = await this.gameRepository.findOneBy({
    //       gameId: game.gameId,
    //     });
    //     const gameData = {
    //       gameId: game.gameId,
    //       title: game.gameId,
    //       description: `${game.gameId} Casino Game`,
    //       url: game.url,
    //       imagePath: game.assets.logo,
    //       bannerPath: game.assets.banner,
    //       type: 'casino',
    //       provider: provider,
    //     };

    //     if (existingGame) {
    //       // Update the existing game
    //       this.gameRepository.merge(existingGame, gameData);
    //       return this.gameRepository.save(existingGame);
    //     } else {
    //       // Create a new game
    //       return this.gameRepository.save(this.gameRepository.create(gameData));
    //     }
    //   }),
    // );

    // return savedGames;
  }

  async syncEvoPlayGames(): Promise<Game[] | any> {
    // Fetch the game list from your API (adjust the method name and params accordingly)
    const gameList = await this.c2GamingService.getGames();

    return gameList;
    // Find or create the 'Shack Evolution' provider
    // let provider = await this.providerRepository.findOneBy({
    //   name: 'Shack Evolution',
    // });
    // if (!provider) {
    //   provider = await this.providerRepository.save(
    //     this.providerRepository.create({
    //       name: 'Shack Evolution',
    //       slug: 'shack-evolution',
    //       description: 'Shack Evolution',
    //       parentProvider: 'Shack Evolution',
    //     }),
    //   );
    // }

    // // Save the games to the database and return the created/updated records
    // const savedGames = await Promise.all(
    //   gameList.data.data.map(async (game) => {
    //     const existingGame = await this.gameRepository.findOneBy({
    //       gameId: game.gameId,
    //     });
    //     const gameData = {
    //       gameId: game.gameId,
    //       title: game.gameId,
    //       description: `${game.gameId} Casino Game`,
    //       url: game.url,
    //       imagePath: game.assets.logo,
    //       bannerPath: game.assets.banner,
    //       type: 'casino',
    //       provider: provider,
    //     };

    //     if (existingGame) {
    //       // Update the existing game
    //       this.gameRepository.merge(existingGame, gameData);
    //       return this.gameRepository.save(existingGame);
    //     } else {
    //       // Create a new game
    //       return this.gameRepository.save(this.gameRepository.create(gameData));
    //     }
    //   }),
    // );

    // return savedGames;
  }
}
