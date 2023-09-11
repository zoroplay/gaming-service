/* eslint-disable */
import { GrpcMethod, GrpcStreamMethod } from "@nestjs/microservices";
import { Observable } from "rxjs";

export const protobufPackage = "gaming";

export interface PaginationDto {
  page: number;
  skip: number;
}

export interface Empty {
}

export interface SyncGameDto {
  provider: string;
}

export interface FindOneGameDto {
  id: string;
}

export interface Games {
  games: Game[];
}

export interface UpdateGameDto {
  id: string;
  provider: Provider | undefined;
}

export interface CreateGameDto {
  gameId: string;
  title: string;
  description: string;
  url: string;
  imagePath: string;
  bannerPath: string;
  status: boolean;
  type: string;
  provider: Provider | undefined;
}

export interface StartGameDto {
  gameId: string;
  providerSlug: string;
  demo?: string | undefined;
}

export interface StartGameResponse {
  url: string;
}

export interface Game {
  id: string;
  gameId: string;
  title: string;
  description: string;
  url: string;
  imagePath: string;
  bannerPath: string;
  status: boolean;
  type: string;
  provider: Provider | undefined;
  providerId: string;
}

export interface Provider {
  id: string;
  slug: string;
  name: string;
  description: string;
  imagePath: string;
  parentProvider?: string | undefined;
}

export const GAMING_PACKAGE_NAME = "gaming";

export interface GamingServiceClient {
  createGame(request: CreateGameDto): Observable<Game>;

  findAllGames(request: Empty): Observable<Games>;

  syncGames(request: SyncGameDto): Observable<Games>;

  findOneGame(request: FindOneGameDto): Observable<Game>;

  updateGame(request: UpdateGameDto): Observable<Game>;

  removeGame(request: UpdateGameDto): Observable<Game>;

  startGame(request: StartGameDto): Observable<StartGameResponse>;

  queryGames(request: Observable<PaginationDto>): Observable<Games>;
}

export interface GamingServiceController {
  createGame(request: CreateGameDto): Promise<Game> | Observable<Game> | Game;

  findAllGames(request: Empty): Promise<Games> | Observable<Games> | Games;

  syncGames(request: SyncGameDto): Promise<Games> | Observable<Games> | Games;

  findOneGame(request: FindOneGameDto): Promise<Game> | Observable<Game> | Game;

  updateGame(request: UpdateGameDto): Promise<Game> | Observable<Game> | Game;

  removeGame(request: UpdateGameDto): Promise<Game> | Observable<Game> | Game;

  startGame(request: StartGameDto): Promise<StartGameResponse> | Observable<StartGameResponse> | StartGameResponse;

  queryGames(request: Observable<PaginationDto>): Observable<Games>;
}

export function GamingServiceControllerMethods() {
  return function (constructor: Function) {
    const grpcMethods: string[] = [
      "createGame",
      "findAllGames",
      "syncGames",
      "findOneGame",
      "updateGame",
      "removeGame",
      "startGame",
    ];
    for (const method of grpcMethods) {
      const descriptor: any = Reflect.getOwnPropertyDescriptor(constructor.prototype, method);
      GrpcMethod("GamingService", method)(constructor.prototype[method], method, descriptor);
    }
    const grpcStreamMethods: string[] = ["queryGames"];
    for (const method of grpcStreamMethods) {
      const descriptor: any = Reflect.getOwnPropertyDescriptor(constructor.prototype, method);
      GrpcStreamMethod("GamingService", method)(constructor.prototype[method], method, descriptor);
    }
  };
}

export const GAMING_SERVICE_NAME = "GamingService";
