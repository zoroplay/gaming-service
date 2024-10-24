/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, Provider } from '@nestjs/common';
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
  CallbackGameDto,
  CreateProviderDto,
  Providers,
  CommonResponse,
  Categories,
  FetchGamesRequest,
} from 'src/proto/gaming.pb';
import { FindManyOptions, ILike, Repository } from 'typeorm';
import { EntityToProtoService } from 'src/services/entity-to-proto.service';
import {
  ShackEvolutionService,
  C2GamingService,
  TadaGamingService,
  SmartSoftService,
} from 'src/services';
import { EvoPlayService } from 'src/services/evo-play.service';
import { IdentityService } from 'src/identity/identity.service';
import { Category } from 'src/entities/category.entity';
import { GameCategory } from 'src/entities/game.category.entity';
import { slugify } from 'src/common';
import { GameKey } from 'src/entities/game-key.entity';
import { PragmaticService } from 'src/services/pragmatic-play.service';


@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(GameEntity)
    private gameRepository: Repository<GameEntity>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(ProviderEntity)
    private providerRepository: Repository<ProviderEntity>,
    @InjectRepository(GameKey)
    private gameKeyRepository: Repository<GameKey>,
    private readonly entityToProtoService: EntityToProtoService,
    private readonly shacksEvolutionService: ShackEvolutionService,
    private readonly c2GamingService: C2GamingService,
    private readonly tadaGamingService: TadaGamingService,
    private readonly smartSoftService: SmartSoftService,
    private readonly evoPlayService: EvoPlayService,
    private readonly pragmaticPlayService: PragmaticService,
    private readonly identityService: IdentityService,
  ) {}

  async createProvider(
    createProviderDto: CreateProviderDto,
  ): Promise<CommonResponse> {
    try {
      const newProvider: ProviderEntity = new ProviderEntity();
      newProvider.name = createProviderDto.name;
      newProvider.slug = slugify(createProviderDto.name);
      newProvider.description = createProviderDto.description;
      newProvider.imagePath = createProviderDto.imagePath;
      const savedProvider = await this.providerRepository.save(newProvider);
      return {
        success: true,
        message: 'Saved succesfully',
        data: savedProvider,
      };
    } catch (err) {
      return { success: false, message: 'Unable to save new provider' };
    }
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

  async findAllProvider(): Promise<CommonResponse> {
    const providers = await this.providerRepository.find({});
    // const protoResponse: Provider[] = resp.map(
    //   (entity: ProviderEntity) => entity as unknown as Provider,
    // );
    // const final = {
    //   providers: protoResponse,
    // };
    return {
      success: true,
      message: 'Providers retrieved successfully',
      data: providers,
    };
  }

  async findAll(filter: string): Promise<Games> {
    let options: FindManyOptions<GameEntity>;
    if (filter) {
      options = {
        where: [
          { gameId: ILike(`%${filter}%`) },
          { title: ILike(`%${filter}%`) },
          { provider: { name: ILike(`%${filter}%`) } },
        ],
        relations: {
          provider: true,
        },
      };
    } else {
      options = {
        relations: {
          provider: true,
        },
      };
    }
    const resp = await this.gameRepository.find(options);
    console.log(`entity response`);
    console.log(resp[0]);
    // Convert TypeORM entities to proto-generated types
    const protoResponse: Game[] = resp.map((entity: GameEntity) =>
      this.entityToProtoService.entityToProto(entity),
    );
    // console.log(`proto response: ${JSON.stringify(protoResponse)}`);
    const final = {
      games: protoResponse,
    };
    console.log('service line 74');
    console.log(final);
    return final;
  }

  async fetchGames({categoryId, clientId, providerId}: FetchGamesRequest): Promise<Games> {
    const query = this.gameRepository
      .createQueryBuilder('games')
      .where('games.status = :status', { status: 1 });

    if (categoryId && categoryId !== 1) {
      query
        .leftJoin(GameCategory, 'gamecat', 'gamecat.gameId = games.id')
        .andWhere('gamecat.categoryId = :category', { category: categoryId });
    }

    if (providerId) 
      query.andWhere('games.providerId = :providerId', { providerId });

    const games = await query.getMany();
    // Convert TypeORM entities to proto-generated types
    const protoResponse: Game[] = games.map((entity: GameEntity) =>
      this.entityToProtoService.entityToProto(entity),
    );

    const final = {
      games: protoResponse,
    };

    return final;
  }

  async fetchGamesByName(searchGamesDto: FetchGamesRequest): Promise<Games> {
    const { gameName } = searchGamesDto;
  
    const query = this.gameRepository.createQueryBuilder('games');
  
    if (gameName) {
      // Use LIKE to allow partial match (wildcard search) on gameName
      query.andWhere('games.title LIKE :gameName', { gameName: `%${gameName}%` });
    }
  
    const games = await query.getMany();
     // Convert TypeORM entities to proto-generated types
     const protoResponse: Game[] = games.map((entity: GameEntity) =>
      this.entityToProtoService.entityToProto(entity),
    );

    const final = {
      games: protoResponse,
    };

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

  async fetchCategories(): Promise<Categories> {
    const categories = await this.categoryRepository.find();
    return { data: categories };
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
    console.log("startGameDto", startGameDto);

    const game: GameEntity = await this.gameRepository.findOne({
      where: {
        id: startGameDto.gameId,
      },
      relations: {
        provider: true,
      },
    });

    console.log("game", game);

    switch (game.provider.slug) {
      case 'shack-evolution':
        // return await this.smartSoftService.constructGameUrl(
        //   startGameDto,
        //   game,
        // );
      case 'c27':
        return await this.c2GamingService.startGameSession(startGameDto, game);
      case 'tada-games':
        return await this.tadaGamingService.constructGameUrl(
          startGameDto,
          game,
        );
      case 'evo-play':
        console.log("using evo-play");
        return await this.evoPlayService.constructGameUrl(
          startGameDto,
          game,
        );

      case 'pragmatic-play':
        console.log("using pragmatic-play");
        return await this.pragmaticPlayService.constructGameUrl(
          startGameDto
        );

      case 'evolution':
        // return await this.smartSoftService.constructGameUrl(
        //   startGameDto,
        //   game,
        // );
        break;
      case 'smart-soft':
        console.log("using smart-soft");
        const privateKeyQuery = await this.gameKeyRepository.findOne({
          where: {
              client_id: startGameDto.clientId,
              option: 'SMART_SOFT_PORTAL',
              provider: 'smart-soft'
          }
        });
        
        return await this.smartSoftService.constructGameUrl(
          startGameDto,
          game,
          privateKeyQuery.value
        );
        break;
      default:
        throw new NotFoundException('Unknown provider');
        break;
    }
  }

  async sync(syncGameDto: SyncGameDto): Promise<any> {
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
        console.log('syncing here');
        return await this.evoPlayService.syncGames();
        break;
        case 'pragmatic-play':
          console.log('pragmatic syncing here');
          return await this.pragmaticPlayService.syncGames();
          break;
      default:
        throw new NotFoundException(
          'Specified provider does not support sync feature',
        );
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
    const gameList = await this.evoPlayService.getGames();

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

  async syncPragmaticPlayGames(): Promise<Game[] | any> {
    // Fetch the game list from your API (adjust the method name and params accordingly)
    const gameList = await this.pragmaticPlayService.getCasinoGames();

    return gameList;
  }

  async handleGamesCallback(_data: CallbackGameDto): Promise<any> {
    console.log("_data", _data);
    switch (_data.provider) {
      case 'shack-evolution':
        return await this.handleC2Games(_data.body, _data.header);
      case 'c27':
        return await this.handleC2Games(_data.body, _data.header);
      case 'tada-games':
        return await this.handleC2Games(_data.body, _data.header);
      case 'smart-soft':
        const privateKeyQuery = await this.gameKeyRepository.findOne({
          where: {
              client_id: _data.clientId,
              option: 'SMART_SOFT_PORTAL',
              provider: 'smart-soft'
          }
        });
        return await this.smartSoftService.handleCallback(_data, privateKeyQuery.value);
      case 'evolution':
        return await this.handleC2Games(_data.body, _data.header);
      case 'evo-play':
        return await this.evoPlayService.handleCallback(_data);
      case 'pragmatic-play':
        console.log("using pragmatic-play");
        return await this.pragmaticPlayService.handleCallback(_data);
      default:
        throw new NotFoundException('Unknown provider');
    }
    // Fetch the game list from your API (adjust the method name and params accordingly)
    // const gameList = await this.c2GamingService.getGames();

    // return gameList;
  }

  async handleC2Games(body: any, headers: any): Promise<any> {
    console.log(body);
    console.log(headers);
    throw new Error('Method not implemented.');
  }

}