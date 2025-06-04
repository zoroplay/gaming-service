/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, Provider } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Observable, Subject } from 'rxjs';
import { slugify } from 'src/common';
import { FirebaseService } from 'src/common/services/firebaseUpload';
import { Category } from 'src/entities/category.entity';
import { GameKey } from 'src/entities/game-key.entity';
// import { GameCategory } from 'src/entities/game.category.entity';
import { Promotion as PromotionEntity } from 'src/entities/promotion.entity';
import {
  Tournament,
  Tournament as TournamentEntity,
} from 'src/entities/tournament.entity';
import { IdentityService } from 'src/identity/identity.service';
import {
  AddGameToCategoriesDto,
  AddGameToTournamentDto,
  BonusGameRequest,
  CallbackGameDto,
  Categories,
  CommonResponse,
  CreateBonusRequest,
  CreateGameDto,
  CreateGameKeyRequest,
  CreatePromotionRequest,
  CreateProviderDto,
  CreateTournamentDto,
  FetchGamesRequest,
  FindOneCategoryDto,
  FindOneGameDto,
  FindOnePromotionDto,
  FindOneTournamentDto,
  Game,
  Games,
  GetGamesRequest,
  GetKeysRequest,
  GetPromotions,
  PaginationDto,
  Promotion,
  SaveCategoryRequest,
  StartDto,
  StartGameDto,
  SyncGameDto,
  Tournaments,
  UpdateGameDto
} from 'src/proto/gaming.pb';
import {
  C2GamingService,
  ShackEvolutionService,
  SmartSoftService,
  TadaGamingService,
} from 'src/services';

import { TournamentGame } from 'src/entities/tournament-game.entity';
import { EntityToProtoService } from 'src/services/entity-to-proto.service';
import { EvoPlayService } from 'src/services/evo-play.service';
import { PragmaticService } from 'src/services/pragmatic-play.service';
import { QtechService } from 'src/services/qtech.service';
import { SmatVirtualService } from 'src/services/smatvirtual.service';
import { FindManyOptions, ILike, In, Repository } from 'typeorm';
import { Game as GameEntity } from '../entities/game.entity';
import { Provider as ProviderEntity } from '../entities/provider.entity';
import { SpribeService } from 'src/services/spribe.service';
import { BonusService } from 'src/bonus/bonus.service';

// import { GameCategoryEntity } from 'src/entities/game.category.entity';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(GameEntity)
    private gameRepository: Repository<GameEntity>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    // @InjectRepository(GameCategoryEntity)
    // private gameCategoryRepository: Repository<GameCategoryEntity>,
    @InjectRepository(TournamentGame)
    private tournamentGameRepository: Repository<TournamentGame>,
    @InjectRepository(ProviderEntity)
    private providerRepository: Repository<ProviderEntity>,
    @InjectRepository(PromotionEntity)
    private promotionRepository: Repository<PromotionEntity>,
    @InjectRepository(TournamentEntity)
    private tournamenRepository: Repository<TournamentEntity>,
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
    private readonly qtechService: QtechService,
    private readonly firebaseService: FirebaseService,
    private readonly smatVirtualService: SmatVirtualService,
    private readonly spribeService: SpribeService,
    private readonly bonusService: BonusService,
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
    const providers = await this.providerRepository.find({
      where: {
        status: 1
      }
    });
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

  async findAdminProviders(): Promise<CommonResponse> {
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
  
  // Make sure to import the interface

  // async fetchGames({
  //   categoryId,
  //   providerId,
  // }: FetchGamesRequest): Promise<Games> {
  //   // Build the base query to filter games by status
  //   const query = this.gameRepository
  //     .createQueryBuilder('games')
  //     .where('games.status = :status', { status: 1 });

  //   if (categoryId && categoryId !== 1) {
  //     query
  //       .leftJoin(GameCategoryEntity, 'gamecat', 'gamecat.game_id = games.id')
  //       .andWhere('gamecat.category_id = :category', { category: categoryId });
  //   }

  //   if (providerId) {
  //     query.andWhere('games.providerId = :providerId', { providerId });
  //   }

  //   // Fetch the games based on the query
  //   const games = await query.getMany();

  //   // Convert TypeORM entities to proto-generated types
  //   const protoResponse: Game[] = games.map((entity: GameEntity) =>
  //     this.entityToProtoService.entityToProto(entity),
  //   );

  //   // Return the games and totalGames, ensuring that it matches the Games interface
  //   const final: Games = {
  //     games: protoResponse,
  //   };

  //   return final;
  // }

  // async fetchGames(payload?: GetGamesRequest) {
  //   console.log("hereeee")
  //   const filters: any = {};
  
  //   if (payload?.providerId) {
  //     filters.provider = { id: payload.providerId };
  //   }
  
  //   const gameData = await this.gameRepository.find({
  //     where: filters,
  //     relations: ['provider', 'categories'],
  //   });

  //   console.log("gameData", gameData);
  
  //   // If filtering by categoryId, further filter the retrieved games
  //   let filteredGames = gameData;
  //   if (payload?.categoryId) {
  //     filteredGames = gameData.filter(game =>
  //       game.categories.some(category => category.id === payload.categoryId)
  //     );
  //   }
  
  //   return {
  //     status: 200,
  //     success: true,
  //     message: 'Games fetched successfully',
  //     data: filteredGames
  //   };
  // }

  async fetchGames(payload?: GetGamesRequest) {
    const filters: any = { status: 1 }; // Ensure only active games are fetched

    if (payload?.providerId) {
      filters.provider = { id: payload.providerId };
    }

    const gameData = await this.gameRepository.find({
      where: filters,
      relations: ['provider', 'categories'],
    });

    // If filtering by categoryId, further filter the retrieved games
    let filteredGames = gameData;
    if (payload?.categoryId) {
      filteredGames = gameData.filter(game =>
        game.categories.some(category => category.id === payload.categoryId)
      );
    }

    return {
      status: 200,
      success: true,
      message: 'Games fetched successfully',
      data: filteredGames
    };
}

  async adminFetchGamesByName(searchGamesDto: FetchGamesRequest) {
    const { gameName } = searchGamesDto;
  
    const query = this.gameRepository.createQueryBuilder('games')
       // Join with the provider table to check provider status
      .leftJoin('games.provider', 'provider')
      // Join with categories to populate them as well
      .leftJoin('games.categories', 'categories')
      // Add relations to populate provider and categories in the result
      .leftJoinAndSelect('games.provider', 'gameProvider')
      .leftJoinAndSelect('games.categories', 'gameCategories')
      // Only include games where both the game status and provider status are not 0
      // .andWhere('games.status != :gameStatus', { gameStatus: 0 })
      // .andWhere('provider.status != :providerStatus', { providerStatus: 0 });
  
    if (gameName) {
      // Use LIKE to allow partial match (wildcard search) on gameName
      query.andWhere('games.title LIKE :gameName', {
        gameName: `%${gameName}%`,
      });
    }
  
    const games = await query.getMany();

    let filteredGames = games;
    if (searchGamesDto?.categoryId) {
      filteredGames = games.filter(game =>
        game.categories.some(category => category.id === searchGamesDto.categoryId)
      );
    }


    // Convert TypeORM entities to proto-generated types
    // const protoResponse: Game[] = games.map((entity: GameEntity) =>
    //   this.entityToProtoService.entityToProto(entity),
    // );

    const final = {
      games: filteredGames,
    };
  
    return {
      status: 200,
      success: true,
      message: 'Games fetched successfully',
      data: final,
    };
  }

    async fetchGamesByName(searchGamesDto: FetchGamesRequest): Promise<Games> {
    const { gameName } = searchGamesDto;
  
    const query = this.gameRepository.createQueryBuilder('games')
      // Join with the provider table to check provider status
      .leftJoin('games.provider', 'provider')
      // Only include games where both the game status and provider status are not 0
      .andWhere('games.status != :gameStatus', { gameStatus: 0 })
      .andWhere('provider.status != :providerStatus', { providerStatus: 0 });
  
    if (gameName) {
      // Use LIKE to allow partial match (wildcard search) on gameName
      query.andWhere('games.title LIKE :gameName', {
        gameName: `%${gameName}%`,
      });
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

  async saveCategory(
    createCategoryDto: SaveCategoryRequest,
  ): Promise<Category> {
    const newCategory: Category = new Category();
    newCategory.client_id = createCategoryDto.clientId;
    newCategory.name = createCategoryDto.name;
    newCategory.slug = slugify(createCategoryDto.name);
    newCategory.priority = createCategoryDto.priority;
    newCategory.status = createCategoryDto.status;

    const savedCategory = await this.categoryRepository.save(newCategory);
    return savedCategory;
  }

  async addGameToCategories(dto: AddGameToCategoriesDto) {
  
    const game = await this.gameRepository.findOne({
      where: { id: dto.gameId },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }


    const categories = await this.categoryRepository.find({
      where: { id: In(dto.categories) },
    });


    if (categories.length !== dto.categories.length) {
      throw new NotFoundException('Some categories not found');
    }

    game.categories = categories;

    const val = await this.gameRepository.save(game);

    return val;
  }

  async removeGameCategories(dto: AddGameToCategoriesDto) {
    
    const game = await this.gameRepository.findOne({
      where: { id: dto.gameId },
      relations: ['provider', 'categories'],
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    const categories = await this.categoryRepository.find({
      where: { id: In(dto.categories) },
    });

    if (categories.length !== dto.categories.length) {
      throw new NotFoundException('Some categories not found');
    }

    game.categories = game.categories.filter(
      (category) => !categories.some((c) => c.id === category.id)
    );

    const val = await this.gameRepository.save(game);

    return val;
  }

  async fetchCategories(): Promise<Categories> {
    const categories = await this.categoryRepository.find();
    return { data: categories };
  }

  async findOneCategory(request: FindOneCategoryDto): Promise<Category> {
    const { id } = request;
    console.log('id', id);
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['games'], // Eager load related games if needed
    });

    if (!category) {
      throw new Error(`Category with ID ${id} not found`);
    }
    return category;
  }

  async updateCategory(
    createCategoryDto: SaveCategoryRequest,
  ): Promise<Category> {
    const { id } = createCategoryDto;

    // Find the category by ID
    const category = await this.categoryRepository.findOneBy({ id });

    if (!category) {
      throw new Error(`Category with ID ${createCategoryDto.id} not found`);
    }

    // Update fields with provided values or retain existing ones
    category.client_id = createCategoryDto.clientId ?? category.client_id;
    category.name = createCategoryDto.name ?? category.name;
    category.slug = createCategoryDto.name
      ? slugify(createCategoryDto.name)
      : category.slug;
    category.priority = createCategoryDto.priority ?? category.priority;
    category.status = createCategoryDto.status ?? category.status;

    // Save the updated category
    const updatedCategory = await this.categoryRepository.save(category);
    return updatedCategory;
  }

  async deleteCategory(request: FindOneCategoryDto) {
    const { id } = request;
    console.log('Deleting category with ID:', id);

    const category = await this.categoryRepository.findOneBy({ id });
    if (!category) {
      throw new Error(`Category with ID ${id} not found`);
    }

    await this.categoryRepository.remove(category);
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
    console.log("updateProvider", createProviderDto);

    updateProvider.name = createProviderDto.name || updateProvider.name;
    updateProvider.slug = createProviderDto.slug || updateProvider.slug;
    updateProvider.description = createProviderDto.description || updateProvider.description;
    updateProvider.imagePath = createProviderDto.imagePath || updateProvider.imagePath;
    updateProvider.status = createProviderDto.status;

    const savedProvider = await this.providerRepository.save(updateProvider);

    console.log("savedProvider", savedProvider);

    if(!savedProvider) {
      console.log("Error saving provider update");
    }

    return savedProvider as unknown as Provider;
  }

  async update(updateGameDto: UpdateGameDto): Promise<GameEntity> {
    console.log("here", updateGameDto);
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
    updateGame.gameId = updateGameDto.gameId  || updateGame.gameId;
    updateGame.title = updateGameDto.title || updateGame.title;
    updateGame.description = updateGameDto.description || updateGame.description;
    updateGame.url = updateGameDto.url || updateGame.url;
    updateGame.imagePath = updateGameDto.imagePath || updateGame.imagePath;
    updateGame.bannerPath = updateGameDto.bannerPath || updateGame.bannerPath;
    updateGame.status = updateGameDto.status !== undefined ? updateGameDto.status : updateGame.status;
    updateGame.type = updateGameDto.type || updateGame.type;
    updateGame.provider = provider;
    updateGame.priority = updateGameDto.priority || updateGame.priority;
    const savedGame = await this.gameRepository.save(updateGame);
    return savedGame;
  }

  async remove(id: number) {
    return await this.gameRepository.delete(id);
  }

  async start(startGameDto: StartGameDto): Promise<any> {
    console.log('startGameDto', startGameDto);

    const game: GameEntity = await this.gameRepository.findOne({
      where: {
        id: startGameDto.gameId,
      },
      relations: {
        provider: true,
      },
    });

    console.log('game', game);

    switch (game.provider.parentProvider) {
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
        console.log('using evo-play');
        return await this.evoPlayService.constructGameUrl(startGameDto, game);

      case 'pragmatic-play':
        console.log('using pragmatic-play');
        return await this.pragmaticPlayService.constructGameUrl(startGameDto);

      case 'spribe':
        console.log('using spribe');
        return await this.spribeService.constructGameUrl(startGameDto);

      case 'evolution':
        // return await this.smartSoftService.constructGameUrl(
        //   startGameDto,
        //   game,
        // );
        break;
      case 'smart-soft':
        console.log('using smart-soft');
        const privateKeyQuery = await this.gameKeyRepository.findOne({
          where: {
            client_id: startGameDto.clientId,
            option: 'SMART_SOFT_PORTAL',
            provider: 'smart-soft',
          },
        });7

        return await this.smartSoftService.constructGameUrl(
          startGameDto,
          game,
          privateKeyQuery.value,
        );

      case 'qtech-games':
        console.log('using qtech-games');

        return await this.qtechService.launchGames(startGameDto);
        break;
      default:
        throw new NotFoundException('Unknown provider');
        break;
    }
  }

  async startSmatGames(payload: StartDto): Promise<Game[] | any> {
    // Fetch the game list from your API (adjust the method name and params accordingly)
    return await this.smatVirtualService.activateSession(payload);
  }

  async sync(syncGameDto: SyncGameDto): Promise<any> {
    switch (syncGameDto.provider) {
      case 'shack-evolution':
        return await this.syncShackGames();
      case 'c27':
        return await this.syncC2Games();
      case 'tada':
        return await this.tadaGamingService.syncGames();
      case 'evo-play':
        console.log('syncing here');
        return await this.evoPlayService.syncGames(syncGameDto);
      case 'pragmatic-play':
        console.log('pragmatic syncing here');
        return await this.pragmaticPlayService.syncGames(syncGameDto);
      case 'qtech-games':
        console.log('qtech syncing here');
        return await this.qtechService.syncGames(syncGameDto.clientId);
        break;
      case 'spribe':
          console.log('qtech syncing here');
          return await this.spribeService.syncGames();
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
    // const gameList = await this.evoPlayService.getGames();

    // return gameList;
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

  async syncPragmaticPlayGames(clientId: number): Promise<Game[] | any> {
    // Fetch the game list from your API (adjust the method name and params accordingly)
    // const gameList = await this.pragmaticPlayService.getCasinoGames(clientId);

   console.log("clientId"), clientId
  }

  async handleGamesCallback(_data: CallbackGameDto): Promise<any> {
    // console.log('_data', _data);
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
            provider: 'smart-soft',
          },
        });

        console.log('smart-soft callback', _data.action);
        
        const smartRes = await this.smartSoftService.handleCallback(
          _data,
          privateKeyQuery.value,
        );
        console.log(smartRes)
        return smartRes;

      case 'evolution':
        return await this.handleC2Games(_data.body, _data.header);
      case 'evo-play':
        return await this.evoPlayService.handleCallback(_data);
      case 'pragmatic-play':
        console.log('using pragmatic-play');
        return await this.pragmaticPlayService.handleCallback(_data);
      case 'spribe':
        console.log('using spribe');
        return await this.spribeService.handleCallback(_data);
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

  async createPromotion(
    createPromotionDto: CreatePromotionRequest,
  ): Promise<Promotion> {
    console.log('createPromotionDto service', createPromotionDto);

    // Define the folder and file name for the image in Firebase
    const folderName = 'promotions'; // Example: folder to store promotion images
    const fileName = `${Date.now()}_uploaded-file`; // Unique file name

    try {
      // Upload the file to Firebase and get the public URL
      const imageUrl = await this.firebaseService.uploadFileToFirebase(
        folderName,
        fileName,
        createPromotionDto.file,
      );

      console.log('Uploaded image URL:', imageUrl);

      // Create a new promotion entity and assign values
      const newPromotion: any = new PromotionEntity();

      newPromotion.title = createPromotionDto.metadata.title;
      newPromotion.imageUrl = imageUrl || createPromotionDto.metadata.content; // Assign the uploaded image URL
      newPromotion.content = createPromotionDto.metadata.content;
      newPromotion.type = createPromotionDto.metadata.type;
      newPromotion.startDate = createPromotionDto.metadata.startDate;
      newPromotion.endDate = createPromotionDto.metadata.endDate;
      newPromotion.targetUrl = createPromotionDto.metadata.targetUrl;
      newPromotion.clientId = createPromotionDto.metadata.clientId;
  
      // Save the promotion entity to the database
      const savedPromotion = await this.promotionRepository.save(newPromotion);
      // console.log('Saved promotion:', savedPromotion);

      return savedPromotion;
    } catch (error) {
      console.error('Error creating promotion:', error.message);
      throw new Error('Failed to create promotion. Please try again later.');
    }
  }

  async findOnePromotion(request: FindOnePromotionDto): Promise<any> {
    const { id } = request;
    // console.log('id', id);
    const promotion = await this.promotionRepository.findOne({
      where: { id },
    });

    if (!promotion) {
      throw new Error(`Category with ID ${id} not found`);
    }
    return promotion;
  }

  async fetchPromotions(payload: GetPromotions): Promise<any> {

    console.log("payload", payload);
  
    const promotions = await this.promotionRepository.find({
      where: {
        clientId: payload.clientId
      },
    });
  
    return { data: promotions };
  }

  async updatePromotion(
    updatePromotionDto: CreatePromotionRequest,
  ): Promise<any> {
    const { id } = updatePromotionDto;
  
    // Find the promotion by ID
    const promotion = await this.promotionRepository.findOneBy({ id });
  
    if (!promotion) {
      throw new Error(`Promotion with ID ${id} not found`);
    }
  
    try {
      let imageUrl: string | undefined;
  
      if (updatePromotionDto.file) {
        // Define folder and file name for the new image in Firebase
        const folderName = 'promotions';
        const fileName = `${Date.now()}_uploaded-file`;
  
        // Upload the new file to Firebase and get the public URL
        imageUrl = await this.firebaseService.uploadFileToFirebase(
          folderName,
          fileName,
          updatePromotionDto.file,
        );
  
        console.log('Uploaded image URL:', imageUrl);
      }
  
      // Update fields dynamically
      promotion.title = updatePromotionDto.metadata.title ?? promotion.title;
      promotion.imageUrl = imageUrl || promotion.imageUrl;
      promotion.content = updatePromotionDto.metadata.content ?? promotion.content;
      promotion.type = updatePromotionDto.metadata.type ?? promotion.type;
      promotion.targetUrl = updatePromotionDto.metadata.targetUrl ?? promotion.targetUrl;
      promotion.startDate = updatePromotionDto.metadata.startDate ?? promotion.startDate;
      promotion.endDate = updatePromotionDto.metadata.endDate ?? promotion.endDate;
  
      // Save the updated promotion
      const updatedPromotion = await this.promotionRepository.save(promotion);
      console.log('Updated promotion:', updatedPromotion);
  
      return updatedPromotion;
    } catch (error) {
      console.error('Error updating promotion:', error.message);
      throw new Error('Failed to update promotion. Please try again later.');
    }
  }
  
  async removePromotion(request: FindOnePromotionDto) {
    const { id } = request;
    console.log('Deleting promotion with ID:', id);

    const promotion = await this.promotionRepository.findOneBy({ id });
    if (!promotion) {
      throw new Error(`Promotion with ID ${id} not found`);
    }

    await this.promotionRepository.remove(promotion);
  }

  async getGamesWithCategories(payload?: GetGamesRequest) {
    // Pagination setup
    const page = payload?.page && payload.page > 0 ? payload.page : 1;
    const limit = payload?.limit && payload.limit > 0 && payload.limit <= 50 ? payload.limit : 50;
    const skip = (page - 1) * limit;

    const filters: any = {};
    if (payload?.providerId) {
      filters.provider = { id: payload.providerId };
    }

    // Get total count for pagination
    const [gameData, total] = await this.gameRepository.findAndCount({
      where: filters,
      relations: ['provider', 'categories'],
      skip,
      take: limit,
    });

    // If filtering by categoryId, further filter the retrieved games
    let filteredGames = gameData;
    let filteredTotal = total;
    if (payload?.categoryId) {
      filteredGames = gameData.filter(game =>
        game.categories.some(category => category.id === payload.categoryId)
      );
      filteredTotal = filteredGames.length;
    }

    return {
      status: 200,
      success: true,
      message: 'Games fetched successfully',
      data: filteredGames,
      pagination: {
        page,
        limit,
        total: filteredTotal,
        totalPages: Math.ceil(filteredTotal / limit)
      }
    };
  }

  async createTournament(
    createTournamentDto: CreateTournamentDto,
  ): Promise<Tournament> {
    console.log('createTournamentDto', createTournamentDto);
    const newTournament: Tournament = new TournamentEntity();

    newTournament.title = createTournamentDto.title;
    newTournament.imageUrl = createTournamentDto.imageUrl;
    newTournament.content = createTournamentDto.content;
    newTournament.type = createTournamentDto.type;
    newTournament.endDate = createTournamentDto.endDate;
    newTournament.startDate = createTournamentDto.startDate;

    const savedTournament = await this.tournamenRepository.save(newTournament);
    console.log('savedTournament', savedTournament);
    return savedTournament;
  }

  async findOneTournament(request: FindOneTournamentDto): Promise<Tournament> {
    const { id } = request;
    console.log('id', id);
    const tournament = await this.tournamenRepository.findOne({
      where: { id },
    });

    if (!tournament) {
      throw new Error(`tournament with ID ${id} not found`);
    }
    return tournament;
  }

  async fetchTournaments(): Promise<Tournaments> {
    const tournaments = await this.tournamenRepository.find();
    console.log('tournaments', tournaments);
    return { data: tournaments };
  }

  async updateTournament(
    updateTournamentDto: CreateTournamentDto,
  ): Promise<Tournament> {
    const { id } = updateTournamentDto;

    // Find the promotion by ID
    const tournament = await this.tournamenRepository.findOneBy({ id });

    if (!tournament) {
      throw new Error(`Promotion with ID ${updateTournamentDto.id} not found`);
    }

    // Update fields with provided values or retain existing ones
    // promotion.clientId = updatePromotionDto.clientId ?? promotion.clientId;
    tournament.title = updateTournamentDto.title ?? tournament.title;
    tournament.imageUrl = updateTournamentDto.imageUrl ?? tournament.imageUrl;
    tournament.content = updateTournamentDto.content ?? tournament.content;
    tournament.type = updateTournamentDto.type ?? tournament.type;
    tournament.startDate = updateTournamentDto.startDate;
    tournament.endDate = updateTournamentDto.endDate;

    // Save the updated promotion
    const updatedTournament = await this.tournamenRepository.save(tournament);
    return updatedTournament;
  }

  async removeTournament(request: FindOneTournamentDto) {
    const { id } = request;
    console.log('Deleting promotion with ID:', id);

    const tournament = await this.tournamenRepository.findOneBy({ id });
    if (!tournament) {
      throw new Error(`Promotion with ID ${id} not found`);
    }

    await this.tournamenRepository.remove(tournament);
  }

  async addTournamentGame(dto: AddGameToTournamentDto) {
    console.log('got to this part');
    const games = await this.gameRepository.find({
      where: { id: In(dto.gameId) },
    });
    if (!games) {
      throw new NotFoundException('Game not found');
    }

    console.log('games', games);

    const tournament = await this.tournamenRepository.findOne({
      where: { id: dto.tournamentId },
    });

    console.log('tournament', tournament);

    const TournamentGames = games.map((tour) => {
      const tournamentGame = new TournamentGame();
      tournamentGame.game = tour;
      tournamentGame.tournament = tournament;
      return tournament;
    });

    console.log('TournamentGames', TournamentGames);

    const val = await this.tournamentGameRepository.save(TournamentGames);
    return val[0];
  }

  async removeTournamentGames(dto: AddGameToTournamentDto) {
    const games = await this.gameRepository.find({
      where: { id: In(dto.gameId) },
    });
    if (!games) {
      throw new NotFoundException('Game not found');
    }

    const tournament = await this.tournamenRepository.findOne({
      where: { id: dto.tournamentId },
    });

    await this.tournamentGameRepository.delete({
      game: In(games.map((game) => game.id)),
      tournament: tournament,
    });

    return { message: 'Categories removed successfully' };
  }


  async handleCasinoBonus(request: CreateBonusRequest): Promise<any> {
    try {
      console.log('handleCasinoBonus');
      const value = await this.evoPlayService.registerBonus(request);

      console.log("value", value);

      return {
        status: 1,
        description: "Success",
        success: true,
        bonusId: value[0].registry_id
      }

    } catch (error) {
      console.log('error', error);
      return {
        error: error.message,
        success: false
      }
    }
    
}

async handleCasinoJackpot(payload: SyncGameDto): Promise<any> {
  try {
    console.log('HandleCasinoJackpot');
    const value = await this.pragmaticPlayService.getActiveJackpotFeeds(payload);

    console.log("value", value);

    return {
      status: 1,
      message: "Success",
      success: true,
      data: value
    }

  } catch (error) {
    console.log('error', error);
    return {
      error: error.message,
      success: false
    }
  }
  
}

async handleCasinoJackpotWinners(payload: SyncGameDto): Promise<any> {
  try {

    const value = await this.pragmaticPlayService.getJackpotWinners(payload);

    console.log("value", value);

    return {
      status: 1,
      message: "Success",
      success: true,
      data: value
    }

  } catch (error) {
    console.log('error', error);
    return {
      error: error.message,
      success: false
    }
  }
  
}


async addGameKeys(
  createGameKeyDto: CreateGameKeyRequest,
): Promise<any> {
  console.log('addGameKeys', createGameKeyDto);

  const { clientId, keys } = createGameKeyDto;

  const savedKeys = [];

  for (const key of keys) {
    // Check if the key already exists for this clientId + provider + option
    let gameKey = await this.gameKeyRepository.findOne({
      where: {
        client_id: clientId,
        option: key.option,
      },
    });

    if (gameKey) {
      // Update existing record
      gameKey.value = key.value;
    } else {
      // Create new record
      gameKey = new GameKey();
      gameKey.client_id = clientId;
      gameKey.provider = key.provider;
      gameKey.option = key.option;
      gameKey.value = key.value;
    }

    const savedKey = await this.gameKeyRepository.save(gameKey);
    savedKeys.push(savedKey);
  }

  console.log('savedKeys', savedKeys);

  return {
    status: 200,
    success: true,
    message: 'Game keys processed successfully',
    data: savedKeys,
  };
}

async removeGameKey(request: FindOneGameDto) {
    const { id } = request;
    console.log('Deleting promotion with ID:', id);

    const gameKey = await this.gameKeyRepository.findOneBy({ id });
    if (!gameKey) {
      throw new Error(`Game Key with ID ${id} not found`);
    }

    await this.gameKeyRepository.remove(gameKey); 

    return {
    status: 200,
    success: true,
    message: 'Game keys deleted successfully',
    data: {}
  }
}

  async fetchGameKeys(payload: GetKeysRequest): Promise<any> {

    const gameKeys = await this.gameKeyRepository.find({ where: { client_id: payload.clientId } });

    if (!gameKeys || gameKeys.length === 0) {
      return {
        status: 404,
        success: false,
        message: 'No game keys found for the specified client',
        data: [],
      };
    }

    return {
      status: 200,
      success: true,
      message: 'Game keys fetched successfully',
      data: gameKeys,
    };

    

  }

  async getUserBonusGames(payload: BonusGameRequest): Promise<any> {
  try {
    const getBonusGames = await this.bonusService.getUserBnus({
      clientId: payload.clientId,
      userId: payload.userId
    });

    console.log("getBonusGames", getBonusGames);

    if (getBonusGames.data && getBonusGames.data.gameId && Array.isArray(getBonusGames.data.gameId)) {
      const gameIds = getBonusGames.data.gameId;
      
      // Find all games that match the gameIds in the bonus
      const gameList = await this.gameRepository.find({
        where: {
          gameId: In(gameIds) // Using TypeORM's In operator
        }
      });

      return {
        status: getBonusGames.status,
        success: getBonusGames.success,
        message: 'Bonus games fetched',
        data: gameList
      };
    }

    // If no gameId array found, return the original response
    return getBonusGames;

  } catch (error) {
    console.error('Error fetching user bonus games:', error);
    return {
      status: 0,
      success: false,
      message: 'Failed to fetch bonus games',
      data: null
    };
  }
}


}