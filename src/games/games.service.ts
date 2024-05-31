/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, Provider } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Observable, Subject } from 'rxjs';
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
  CommonResponse,
  Categories,
} from 'src/proto/gaming.pb';
import { FindManyOptions, ILike, Repository } from 'typeorm';
import { EntityToProtoService } from 'src/services/entity-to-proto.service';
import {
  ShackEvolutionService,
  C2GamingService,
  TadaGamingService,
  SmartSoftService,
} from 'src/services';
import * as dayjs from 'dayjs';
import { EvoPlayService } from 'src/services/evo-play.service';
import { IdentityService } from 'src/identity/identity.service';
import { Category } from 'src/entities/category.entity';
import { GameCategory } from 'src/entities/game.category.entity';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(GameEntity)
    private gameRepository: Repository<GameEntity>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(ProviderEntity)
    private providerRepository: Repository<ProviderEntity>,
    private readonly entityToProtoService: EntityToProtoService,
    private readonly shacksEvolutionService: ShackEvolutionService,
    private readonly c2GamingService: C2GamingService,
    private readonly tadaGamingService: TadaGamingService,
    private readonly smartSoftService: SmartSoftService,
    private readonly evoPlayService: EvoPlayService,
    private readonly identityService: IdentityService,
  ) {}

  async createProvider(
    createProviderDto: CreateProviderDto,
  ): Promise<CommonResponse> {
    try {
      const newProvider: ProviderEntity = new ProviderEntity();
      newProvider.name = createProviderDto.name;
      newProvider.slug = this.slugify(createProviderDto.name);
      newProvider.description = createProviderDto.description;
      newProvider.imagePath = createProviderDto.imagePath;
      const savedProvider = await this.providerRepository.save(newProvider);
      return {
        success: true,
        message: 'Saved succesfully',
        data: JSON.stringify(savedProvider),
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
      data: JSON.stringify(providers),
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
    console.log(`proto response: ${JSON.stringify(protoResponse)}`);
    const final = {
      games: protoResponse,
    };
    console.log('service line 74');
    console.log(final);
    return final;
  }

  async fetchGames(category): Promise<Games> {
    const query = this.gameRepository
      .createQueryBuilder('games')
      .where('games.status = :status', { status: 1 });

    if (category && category !== 1) {
      query
        .leftJoin(GameCategory, 'gamecat', 'gamecat.gameId = games.id')
        .andWhere('gamecat.categoryId = :category', { category });
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
    const game: GameEntity = await this.gameRepository.findOne({
      where: {
        id: startGameDto.gameId,
      },
      relations: {
        provider: true,
      },
    });
    console.log('start', startGameDto, game);
    const res = await this.identityService.getDetails({
      clientId: startGameDto.clientId,
      userId: startGameDto.userId,
    });
    console.log('res', res);

    if (!res.success) return { success: false, message: 'Player not found' };
    const player = res.data;

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
          player,
          game,
        );
        break;
      case 'evo-play':
        return await this.evoPlayService.constructGameUrl(
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
        const x = await Promise.all(
          _data.body.data.map(async (data) => {
            return await this.evoPlayService.handleCallback({
              clientId: _data.clientId,
              action: _data.action,
              method: _data.method,
              body: _data.body,
              name: _data.body.name,
              token: _data.body.token,
              callback_id: _data.body.callback_id,
              ...data,
            });
          }),
        );
        return x[0];
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

  private slugify(text: string) {
    if (!text) {
      return;
    }
    // Convert to lowercase and replace spaces with hyphens.
    text = text?.toLowerCase().replace(/\s+/g, '-');

    // Remove punctuation and other special characters.
    text = text?.replace(/[^a-z0-9-]+/g, '');

    // Remove trailing hyphens.
    text = text?.replace(/^-+|-+$/g, '');

    console.log(text);
    return text;
  }
}
