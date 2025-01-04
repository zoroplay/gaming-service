/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, Provider } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Observable, Subject } from 'rxjs';
import { slugify } from 'src/common';
import { Category } from 'src/entities/category.entity';
import { GameKey } from 'src/entities/game-key.entity';
import { GameCategory } from 'src/entities/game.category.entity';
import { IdentityService } from 'src/identity/identity.service';
import {
  AddGameToCategoriesDto,
  CallbackGameDto,
  Categories,
  CommonResponse,
  CommonResponseArray,
  CreateGameDto,
  CreatePromotionDto,
  CreateProviderDto,
  CreateTournamentDto,
  FetchGamesRequest,
  FindOneCategoryDto,
  FindOnePromotionDto,
  FindOneTournamentDto,
  Game,
  Games,
  GamingServiceResponse,
  IGame,
  PaginationDto,
  Promotion,
  Promotions,
  SaveCategoryRequest,
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
import { EntityToProtoService } from 'src/services/entity-to-proto.service';
import { EvoPlayService } from 'src/services/evo-play.service';
import { PragmaticService } from 'src/services/pragmatic-play.service';
import { FindManyOptions, ILike, In, Repository } from 'typeorm';
import { Game as GameEntity } from '../entities/game.entity';
import { Provider as ProviderEntity } from '../entities/provider.entity';
import { Promotion as PromotionEntity } from 'src/entities/promotion.entity';
import { Tournament, Tournament as TournamentEntity } from 'src/entities/tournament.entity';
import { QtechService } from 'src/services/qtech.service';
// import { Timestamp } from 'google-protobuf/google/protobuf/timestamp_pb';
// import { Struct } from 'google-protobuf/google/protobuf/struct_pb';



@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(GameEntity)
    private gameRepository: Repository<GameEntity>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(GameCategory)
    private gameCategoryRepository: Repository<GameCategory>,
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
// Make sure to import the interface

async fetchGames({ categoryId, clientId, providerId }: FetchGamesRequest): Promise<Games> {
  // Build the base query to filter games by status
  const query = this.gameRepository
    .createQueryBuilder('games')
    .where('games.status = :status', { status: 1 });

  if (categoryId && categoryId !== 1) {
    query
      .leftJoin(GameCategory, 'gamecat', 'gamecat.gameId = games.id')
      .andWhere('gamecat.categoryId = :category', { category: categoryId });
  }

  if (providerId) {
    query.andWhere('games.providerId = :providerId', { providerId });
  }

  // Fetch the games based on the query
  const games = await query.getMany();

  // Convert TypeORM entities to proto-generated types
  const protoResponse: Game[] = games.map((entity: GameEntity) =>
    this.entityToProtoService.entityToProto(entity),
  );

  // Return the games and totalGames, ensuring that it matches the Games interface
  const final: Games = {
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

  async saveCategory(createCategoryDto: SaveCategoryRequest): Promise<Category> {
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
    console.log("got to this part");
    const game = await this.gameRepository.findOne({ where: { id: dto.gameId } });
    if (!game) {
      throw new NotFoundException('Game not found');
    }

    console.log("game", game);

    const categories = await this.categoryRepository.find({
      where: { id: In(dto.categories) },
    });

    console.log("categories", categories);
    
    if (categories.length !== dto.categories.length) {
      throw new NotFoundException('Some categories not found');
    }

    const gameCategories = categories.map((category) => {
      const gameCategory = new GameCategory();
      gameCategory.game = game;
      gameCategory.category = category;
      return gameCategory;
    });

    console.log("gameCategories", gameCategories);

    const val = await this.gameCategoryRepository.save(gameCategories);
    return val[0];
  }

  async removeGameCategories(dto: AddGameToCategoriesDto) {
    const game = await this.gameRepository.findOne({ where: { id: dto.gameId } });
    if (!game) {
      throw new NotFoundException('Game not found');
    }
  
    const categories = await this.categoryRepository.find({
      where: { id: In(dto.categories) },
    });
  
    if (categories.length !== dto.categories.length) {
      throw new NotFoundException('Some categories not found');
    }
  
    await this.gameCategoryRepository.delete({
      game,
      category: In(categories.map((category) => category.id)),
    });
  
    return { message: 'Categories removed successfully' };
  }

  async fetchCategories(): Promise<Categories> {
    const categories = await this.categoryRepository.find();
    return { data: categories };
  }

  async findOneCategory(request: FindOneCategoryDto): Promise<Category> {
    const { id } = request;
    console.log("id", id);
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['games'], // Eager load related games if needed
    });
  
    if (!category) {
      throw new Error(`Category with ID ${id} not found`);
    }
    return category;
  }

  async updateCategory(createCategoryDto: SaveCategoryRequest): Promise<Category> {
    const { id } = createCategoryDto;
    
    // Find the category by ID
    const category = await this.categoryRepository.findOneBy({ id });
  
    if (!category) {
      throw new Error(`Category with ID ${createCategoryDto.id} not found`);
    }
  
    // Update fields with provided values or retain existing ones
    category.client_id = createCategoryDto.clientId ?? category.client_id;
    category.name = createCategoryDto.name ?? category.name;
    category.slug = createCategoryDto.name ? slugify(createCategoryDto.name) : category.slug;
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
          case 'qtech-games':
          console.log('QTech Games syncing here');
          return await this.qtechService.syncGames();
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

  async createPromotion(createPromotionDto: CreatePromotionDto): Promise<Promotion> {
    console.log("createPromotionDto", createPromotionDto);
    const newPromotion: Promotion = new PromotionEntity();
    
    newPromotion.title = createPromotionDto.title;
    newPromotion.imageUrl = createPromotionDto.imageUrl;
    newPromotion.content = createPromotionDto.content;
    newPromotion.type = createPromotionDto.type;
    newPromotion.endDate = createPromotionDto.endDate;
    newPromotion.startDate = createPromotionDto.startDate;
    newPromotion.targetUrl = createPromotionDto.targetUrl;
  
    const savedPromotion = await this.promotionRepository.save(newPromotion);
    console.log("savedPromotion", savedPromotion);
    return savedPromotion;
  }

  async findOnePromotion(request: FindOnePromotionDto): Promise<Promotion> {
    const { id } = request;
    console.log("id", id);
    const promotion = await this.promotionRepository.findOne({
      where: { id }
    });
  
    if (!promotion) {
      throw new Error(`Category with ID ${id} not found`);
    }
    return promotion;
  }


  async fetchPromotions(): Promise<Promotions> {
    const promotions = await this.promotionRepository.find();
    console.log("promotions", promotions);
    return { data: promotions };
  }

  async updatePromotion(updatePromotionDto: CreatePromotionDto): Promise<Promotion> {
    const { id } = updatePromotionDto;
  
    // Find the promotion by ID
    const promotion = await this.promotionRepository.findOneBy({ id });
  
    if (!promotion) {
      throw new Error(`Promotion with ID ${updatePromotionDto.id} not found`);
    }
  
    // Update fields with provided values or retain existing ones
    // promotion.clientId = updatePromotionDto.clientId ?? promotion.clientId;
    promotion.title = updatePromotionDto.title ?? promotion.title;
    promotion.imageUrl = updatePromotionDto.imageUrl ?? promotion.imageUrl;
    promotion.content = updatePromotionDto.content ?? promotion.content;
    promotion.type = updatePromotionDto.type ?? promotion.type;
    promotion.targetUrl = updatePromotionDto.targetUrl ?? promotion.targetUrl;
    promotion.startDate = updatePromotionDto.startDate;
    promotion.endDate = updatePromotionDto.endDate;
     
  
    // Save the updated promotion
    const updatedPromotion = await this.promotionRepository.save(promotion);
    return updatedPromotion;
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

  async getAllGamesWithCategories() {

    const games = await this.gameRepository.find({
      relations: ['provider', 'categories'], // Ensure the 'categories' relation exists in the Game entity
    });
  
    const response = {
      games: games.map((game) => ({
        id: game.id,
        status: game.status,
        provider_id: game.provider?.id || null,
        provider_name: game.provider?.name || null,
        game_id: game.gameId,
        game_name: game.title,
        image: game.imagePath,
        description: game.description,
        category: []
        // category: game.categories.map((category) => ({
        //   id: category.id,
        //   category_id: category.id, // Map correctly if `category_id` exists in DB
        //   name: category.name,
        //   status: category.status,
        //   priority: category.priority,
        // })),
      })),
    };
  
    console.log('Response:', response) // Log the response in a readable format
    return response;
  }


  async getGamesWithCategories(
  ): Promise<CommonResponseArray> {
    const [games] = await this.gameRepository
      .createQueryBuilder('game')
      .leftJoinAndSelect('game.gameCategories', 'gameCategory')
      .leftJoinAndSelect('gameCategory.category', 'category')
      .leftJoinAndSelect('game.provider', 'provider')
      .getManyAndCount();

    console.log("games", games);

    const gameData = games.map((game) => ({
      id: game.id,
      status: game.status,
      provider_id: game.provider ? game.provider.id : 0,
      provider_name: game.provider ? game.provider.name : '',
      game_id: game.gameId,
      game_name: game.title,
      image: game.imagePath,
      description: game.description,
      priority: game.priority,
      category: game.gameCategories.map((gc) => ({
        id: gc.category.id,
        name: gc.category.name
      }))
    }))

    // const gameDatas = {
    //   total,
    //   per_page: perPage,
    //   current_page: page,
    //   last_page: Math.ceil(total / perPage),
    //   from: skip + 1,
    //   to: skip + gameData.length,
    // }

    return {
      status: 200,
      success: true,
      message: 'Games retrieved successfully',
      data: gameData,
    };
  }
  



  async createTournament(createTournamentDto: CreateTournamentDto): Promise<Tournament> {
    console.log("createTournamentDto", createTournamentDto);
    const newTournament: Tournament = new TournamentEntity();
    
    newTournament.title = createTournamentDto.title;
    newTournament.imageUrl = createTournamentDto.imageUrl;
    newTournament.content = createTournamentDto.content;
    newTournament.type = createTournamentDto.type;
    newTournament.endDate = createTournamentDto.endDate;
    newTournament.startDate = createTournamentDto.startDate;
  
    const savedTournament = await this.tournamenRepository.save(newTournament);
    console.log("savedTournament", savedTournament);
    return savedTournament;
  }

  async findOneTournament(request: FindOneTournamentDto): Promise<Tournament> {
    const { id } = request;
    console.log("id", id);
    const tournament = await this.tournamenRepository.findOne({
      where: { id }
    });
  
    if (!tournament) {
      throw new Error(`tournament with ID ${id} not found`);
    }
    return tournament;
  }


  async fetchTournaments(): Promise<Tournaments> {
    const tournaments = await this.tournamenRepository.find();
    console.log("tournaments", tournaments);
    return { data: tournaments };
  }

  async updateTournament(updateTournamentDto: CreateTournamentDto): Promise<Tournament> {
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
  

}