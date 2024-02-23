import { Injectable, NotFoundException, Provider } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Observable, Subject } from 'rxjs';
import { Player as PlayerEntity } from '../entities/player.entity';
import { Game as GameEntity } from '../entities/game.entity';
import { Provider as ProviderEntity } from '../entities/provider.entity';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateGameDto,
  UpdateGameDto,
  SyncGameDto,
  StartGameDto,
  PaginationDto,
  Games,
  Game,
  CallbackGameDto,
  CreateProviderDto,
  Providers,
} from 'src/proto/gaming.pb';
import { Repository } from 'typeorm';
import { EntityToProtoService } from 'src/services/entity-to-proto.service';
import {
  ShackEvolutionService,
  C2GamingService,
  TadaGamingService,
  SmartSoftService,
} from 'src/services';
import dayjs from 'dayjs';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(GameEntity)
    private gameRepository: Repository<GameEntity>,
    @InjectRepository(PlayerEntity)
    private playerRepository: Repository<PlayerEntity>,
    @InjectRepository(ProviderEntity)
    private providerRepository: Repository<ProviderEntity>,
    private readonly entityToProtoService: EntityToProtoService,
    private readonly shacksEvolutionService: ShackEvolutionService,
    private readonly c2GamingService: C2GamingService,
    private readonly tadaGamingService: TadaGamingService,
    private readonly smartSoftService: SmartSoftService,
  ) {}

  async createProvider(
    createProviderDto: CreateProviderDto,
  ): Promise<Provider> {
    const newProvider: ProviderEntity = new ProviderEntity();
    newProvider.name = createProviderDto.name;
    newProvider.slug = createProviderDto.slug;
    newProvider.description = createProviderDto.description;
    newProvider.imagePath = createProviderDto.imagePath;
    const savedProvider = await this.providerRepository.save(newProvider);
    return savedProvider as unknown as Provider;
  }

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

  async findAllProvider(): Promise<Providers> {
    const resp = await this.providerRepository.find({});
    const protoResponse: Provider[] = resp.map(
      (entity: ProviderEntity) => entity as unknown as Provider,
    );
    const final = {
      providers: protoResponse,
    };
    return final as unknown as Providers;
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
    console.log('service line 74');
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
  async findOneProvider(id: number): Promise<ProviderEntity | null> {
    return await this.providerRepository.findOneBy({ id });
  }
  async findOne(id: number): Promise<GameEntity | null> {
    return await this.gameRepository.findOneBy({ id });
  }

  async updateProvider(
    createProviderDto: CreateProviderDto,
  ): Promise<Provider> {
    const updateProvider: ProviderEntity =
      await this.providerRepository.findOneBy({
        id: createProviderDto.id,
      });
    if (!updateProvider) {
      throw new NotFoundException(`Provider ${createProviderDto.id} not found`);
    }
    updateProvider.name = createProviderDto.name;
    updateProvider.slug = createProviderDto.slug;
    updateProvider.description = createProviderDto.description;
    updateProvider.imagePath = createProviderDto.imagePath;
    const savedProvider = await this.providerRepository.save(updateProvider);
    return savedProvider as unknown as Provider;
  }

  async update(updateGameDto: UpdateGameDto): Promise<GameEntity> {
    const provider: ProviderEntity = await this.providerRepository.findOneBy({
      id: updateGameDto.providerId,
    });
    if (!provider) {
      throw new NotFoundException(
        `Provider ${updateGameDto.providerId} not found`,
      );
    }
    const updateGame: GameEntity = await this.gameRepository.findOneBy({
      id: updateGameDto.id,
    });
    if (!updateGame) {
      throw new NotFoundException(`Game ${updateGameDto.id} not found`);
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

  async remove(id: number) {
    return await this.gameRepository.delete(id);
  }

  async start(startGameDto: StartGameDto): Promise<any> {
    const game: GameEntity = await this.gameRepository.findOne({
      where: {
        id: startGameDto.gameId,
      },
      relations: {
        provider: true,
      },
    });
    let player = await this.playerRepository.findOne({
      where: {
        userId: startGameDto.userId,
        clientId: startGameDto.clientId,
      },
    });
    if (!player) {
      player = await this.createPlayer(startGameDto);
    }
    switch (game.provider.slug) {
      case 'shack-evolution':
        return await this.smartSoftService.constructGameUrl(
          startGameDto,
          player,
          game,
        );
        break;
      case 'c27':
        return await this.c2GamingService.startGameSession(startGameDto, game);
        break;
      case 'tada-games':
        return await this.tadaGamingService.constructGameUrl(
          startGameDto,
          game,
        );
        break;
      case 'evo-play':
        return await this.smartSoftService.constructGameUrl(
          startGameDto,
          player,
          game,
        );
        break;
      case 'evolution':
        return await this.smartSoftService.constructGameUrl(
          startGameDto,
          player,
          game,
        );
        break;
      case 'smart-soft':
        return await this.smartSoftService.constructGameUrl(
          startGameDto,
          player,
          game,
        );
        break;
      default:
        throw new NotFoundException('Unknown provider');
        break;
    }
  }

  async sync(syncGameDto: SyncGameDto) {
    switch (syncGameDto.provider) {
      case 'shack-evolution':
        return await this.syncShackGames();
        break;
      case 'c27':
        return await this.syncC2Games();
        break;
      case 'tada':
        return await this.tadaGamingService.syncGames();
        break;
      case 'evo-play':
        return await this.syncEvoPlayGames();
        break;
      default:
        throw new NotFoundException(
          'Specified provider does not support sync feature',
        );
        break;
    }
  }

  private async createPlayer(startGameDto: StartGameDto) {
    const player = new PlayerEntity();
    player.userId = startGameDto.userId;
    player.clientId = startGameDto.clientId;
    player.username = startGameDto.username;
    player.email = startGameDto.email;
    player.authCode = uuidv4();
    player.authCodeExpiresAt = dayjs().add(1, 'day').format('YYYY-MM-DD');
    player.virtualToken = uuidv4();
    player.virtualTokenExpiresAt = dayjs().add(1, 'day').format('YYYY-MM-DD');
    await this.playerRepository.save(player);
    return player;
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

  async handleGamesCallback(_data: CallbackGameDto): Promise<any> {
    switch (_data.provider) {
      case 'shack-evolution':
        return await this.handleC2Games(_data.body, _data.header);
        break;
      case 'c27':
        return await this.handleC2Games(_data.body, _data.header);
        break;
      case 'tada-games':
        return await this.handleC2Games(_data.body, _data.header);
        break;
      case 'smart-soft':
        return await this.smartSoftService.handleCallback(_data);
        break;
      case 'evolution':
        return await this.handleC2Games(_data.body, _data.header);
        break;
      case 'evo-play':
        return await this.handleC2Games(_data.body, _data.header);
        break;
      default:
        throw new NotFoundException('Unknown provider');
        break;
    }
    // Fetch the game list from your API (adjust the method name and params accordingly)
    const gameList = await this.c2GamingService.getGames();

    return gameList;
  }
  async handleC2Games(body: any, headers: any): Promise<any> {
    console.log(body);
    console.log(headers);
    throw new Error('Method not implemented.');
  }

  async getPlayerBalance(clientId: string, userId: string) {
    console.log(clientId);
    console.log(userId);
    return 1000;
  }
}
