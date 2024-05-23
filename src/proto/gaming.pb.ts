/* eslint-disable */
import { GrpcMethod, GrpcStreamMethod } from "@nestjs/microservices";
import { wrappers } from "protobufjs";
import { Observable } from "rxjs";
import { Struct } from "./google/protobuf/struct.pb";

export const protobufPackage = "gaming";

export interface PaginationDto {
  page: number;
  skip: number;
}

export interface FetchGamesRequest {
  categoryId?: number | undefined;
}

export interface Empty {
}

export interface SyncGameDto {
  provider: string;
}

export interface CallbackGameDto {
  clientId: number;
  provider: string;
  action?: string | undefined;
  method?: string | undefined;
  header: { [key: string]: any } | undefined;
  body: { [key: string]: any } | undefined;
}

export interface FindOneGameDto {
  id: number;
}

export interface Games {
  games: Game[];
}

export interface Providers {
  providers: Provider[];
}

export interface UpdateGameDto {
  id: number;
  gameId: string;
  title: string;
  description: string;
  url: string;
  imagePath: string;
  bannerPath: string;
  status: boolean;
  type: string;
  providerId: number;
}

export interface CreateProviderDto {
  id?: number | undefined;
  slug: string;
  name: string;
  description: string;
  imagePath: string;
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
  providerId: number;
}

export interface StartGameDto {
  gameId: number;
  clientId: number;
  userId: number;
  username: string;
  email: string;
  homeUrl?: string | undefined;
  depositUrl?: string | undefined;
  demo?: boolean | undefined;
  isMobile?: boolean | undefined;
}

export interface StartGameResponse {
  url: string;
}

export interface Game {
  id: number;
  gameId: string;
  title: string;
  description: string;
  url: string;
  imagePath: string;
  bannerPath: string;
  status: boolean;
  type: string;
  provider: Provider | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface Provider {
  id: number;
  slug: string;
  name: string;
  description: string;
  imagePath: string;
  games?: Games | undefined;
  parentProvider?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

/** Smart Soft TransactionInfo */
export interface SmartSoftTransactionInfo {
  Source: string;
  GiftKey?: string | undefined;
  RoundId: string;
  GameName: string;
  Jackpots?: string | undefined;
  JetXBets?: string | undefined;
  TotalWon?: number | undefined;
  RoundDate: string;
  RoundLong: number;
  GameNumber: string;
  GiftAmount?: number | undefined;
  RakeAmount?: number | undefined;
  RakeFromBet?: string | undefined;
  RakePercent?: string | undefined;
  GiftQuantity?: string | undefined;
  TournamentId?: string | undefined;
  RoundingDelta?: string | undefined;
  RakeBackAmount?: number | undefined;
  TotalPlacedBet?: string | undefined;
  TournamentType?: string | undefined;
  TransactionKey: string;
  JetXCoefficient?: string | undefined;
  TransactionDate: string;
  BetTransactionId?: string | undefined;
  TournamentNumber?: string | undefined;
  JetX3Coefficients?: string | undefined;
  OriginalSessionId: string;
  TournamentGameType?: string | undefined;
  IsTournamentSpecial?: string | undefined;
  CashierTransacitonId: number;
  TournamentPlayerRank?: number | undefined;
  TournamentEnterAmount?: number | undefined;
  JetXCashoutCoefficients?: number | undefined;
  TournamentRegistrationTyp?: string | undefined;
}

/** SmartSoftCallback */
export interface SmartSoftCallback {
  Amount: number;
  CurrencyCode: string;
  TransactionId: string;
  TransactionInfo: SmartSoftTransactionInfo | undefined;
  TransactionType: string;
}

/** Tada Games Callback */
export interface TadaCallback {
  id: string;
  game: number;
  reqId: string;
  round: number;
  token: string;
  currency: string;
  betAmount: number;
  wagersTime: number;
  winloseAmount: number;
}

/** Shack Evolution Callback */
export interface ShackEvolutionCallback {
  type: string;
  amount: number;
  freebet: string;
  roundId: string;
  gameType: string;
  playerId: string;
  signature: string;
  gameOutcome?: string | undefined;
  gameRoundEnded: boolean;
}

/** Evoplay Data */
export interface EvoplayData {
  id?: string | undefined;
  userId?: string | undefined;
  roundId?: string | undefined;
  actionId?: string | undefined;
  refundRoundId?: string | undefined;
  refundActionId?: string | undefined;
  refundCallbackId?: string | undefined;
  finalAction?: string | undefined;
  type?: string | undefined;
  eventId?: string | undefined;
  currency: string;
  amount: string;
  details?: string | undefined;
  userMessage?: string | undefined;
  walletType?: string | undefined;
}

/** Evoplay Callback */
export interface EvoplayCallback {
  token: string;
  callbackId: string;
  name: string;
  data?: EvoplayData | undefined;
  signature: string;
}

/** EVOLUTION CALLBACK */
export interface EvolutionCallback {
  operatorId: number;
  uid?: string | undefined;
  transactionId?: string | undefined;
  gameId?: number | undefined;
  token: string;
  debitAmount?: number | undefined;
  betTypeID?: number | undefined;
  serverId?: number | undefined;
  roundId?: number | undefined;
  currency?: string | undefined;
  seatId?: string | undefined;
  platformId: number;
  tableId?: number | undefined;
  timestamp: number;
}

export interface CallbackResponse {
  success: boolean;
  message: string;
  data: { [key: string]: any } | undefined;
}

export interface XpressRequest {
  clientId: number;
  action: string;
  token?: string | undefined;
  gameId: string;
  clientPlatform: string;
  clientIp: string;
  timestamp: string;
  requestId: string;
  siteId: string;
  fingerprint: string;
  sessionId?: string | undefined;
  currency?: string | undefined;
  group?: string | undefined;
  playerId?: string | undefined;
  gameCycle?: string | undefined;
  transactionId?: string | undefined;
  transactionAmount?: number | undefined;
  transactionCategory?: string | undefined;
  gameCycleClosed?: boolean | undefined;
  transactionType?: string | undefined;
}

export interface XpressResponse {
  status: boolean;
  code: number;
  message: string;
  data?: XpressData | undefined;
}

export interface XpressData {
  playerId: string;
  currency: string;
  balance: number;
  sessionId: string;
  group: string;
  timestamp: string;
  requestId: string;
  fingerprint: string;
  playerNickname?: string | undefined;
  oldBalance?: number | undefined;
  gameCycle?: string | undefined;
  transactionId?: string | undefined;
  transactionAmount?: number | undefined;
  transactionCategory?: string | undefined;
  transactionType?: string | undefined;
}

export interface CommonResponse {
  status?: number | undefined;
  success?: boolean | undefined;
  message: string;
  data?: string | undefined;
}

export interface SaveCategoryRequest {
  clientId: number;
  id?: number | undefined;
  name: string;
  imagePath?: string | undefined;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
}

export interface Categories {
  data: Category[];
}

export const GAMING_PACKAGE_NAME = "gaming";

wrappers[".google.protobuf.Struct"] = { fromObject: Struct.wrap, toObject: Struct.unwrap } as any;

export interface GamingServiceClient {
  createGame(request: CreateGameDto): Observable<Game>;

  findAllGames(request: Empty): Observable<Games>;

  fetchGames(request: FetchGamesRequest): Observable<Games>;

  syncGames(request: SyncGameDto): Observable<Games>;

  findOneGame(request: FindOneGameDto): Observable<Game>;

  updateGame(request: UpdateGameDto): Observable<Game>;

  removeGame(request: UpdateGameDto): Observable<Game>;

  saveCategory(request: SaveCategoryRequest): Observable<CommonResponse>;

  fetchCategories(request: Empty): Observable<Categories>;

  createProvider(request: CreateProviderDto): Observable<CommonResponse>;

  updateProvider(request: CreateProviderDto): Observable<CommonResponse>;

  findOneProvider(request: FindOneGameDto): Observable<CommonResponse>;

  removeProvider(request: CreateProviderDto): Observable<CommonResponse>;

  findAllProviders(request: Empty): Observable<CommonResponse>;

  startGame(request: StartGameDto): Observable<StartGameResponse>;

  queryGames(request: Observable<PaginationDto>): Observable<Games>;

  handleCallback(request: CallbackGameDto): Observable<CallbackResponse>;

  xpressLogin(request: XpressRequest): Observable<XpressResponse>;

  xpressBalance(request: XpressRequest): Observable<XpressResponse>;

  xpressDebit(request: XpressRequest): Observable<XpressResponse>;

  xpressCredit(request: XpressRequest): Observable<XpressResponse>;

  xpressRollback(request: XpressRequest): Observable<XpressResponse>;

  xpressLogout(request: XpressRequest): Observable<XpressResponse>;
}

export interface GamingServiceController {
  createGame(request: CreateGameDto): Promise<Game> | Observable<Game> | Game;

  findAllGames(request: Empty): Promise<Games> | Observable<Games> | Games;

  fetchGames(request: FetchGamesRequest): Promise<Games> | Observable<Games> | Games;

  syncGames(request: SyncGameDto): Promise<Games> | Observable<Games> | Games;

  findOneGame(request: FindOneGameDto): Promise<Game> | Observable<Game> | Game;

  updateGame(request: UpdateGameDto): Promise<Game> | Observable<Game> | Game;

  removeGame(request: UpdateGameDto): Promise<Game> | Observable<Game> | Game;

  saveCategory(request: SaveCategoryRequest): Promise<CommonResponse> | Observable<CommonResponse> | CommonResponse;

  fetchCategories(request: Empty): Promise<Categories> | Observable<Categories> | Categories;

  createProvider(request: CreateProviderDto): Promise<CommonResponse> | Observable<CommonResponse> | CommonResponse;

  updateProvider(request: CreateProviderDto): Promise<CommonResponse> | Observable<CommonResponse> | CommonResponse;

  findOneProvider(request: FindOneGameDto): Promise<CommonResponse> | Observable<CommonResponse> | CommonResponse;

  removeProvider(request: CreateProviderDto): Promise<CommonResponse> | Observable<CommonResponse> | CommonResponse;

  findAllProviders(request: Empty): Promise<CommonResponse> | Observable<CommonResponse> | CommonResponse;

  startGame(request: StartGameDto): Promise<StartGameResponse> | Observable<StartGameResponse> | StartGameResponse;

  queryGames(request: Observable<PaginationDto>): Observable<Games>;

  handleCallback(request: CallbackGameDto): Promise<CallbackResponse> | Observable<CallbackResponse> | CallbackResponse;

  xpressLogin(request: XpressRequest): Promise<XpressResponse> | Observable<XpressResponse> | XpressResponse;

  xpressBalance(request: XpressRequest): Promise<XpressResponse> | Observable<XpressResponse> | XpressResponse;

  xpressDebit(request: XpressRequest): Promise<XpressResponse> | Observable<XpressResponse> | XpressResponse;

  xpressCredit(request: XpressRequest): Promise<XpressResponse> | Observable<XpressResponse> | XpressResponse;

  xpressRollback(request: XpressRequest): Promise<XpressResponse> | Observable<XpressResponse> | XpressResponse;

  xpressLogout(request: XpressRequest): Promise<XpressResponse> | Observable<XpressResponse> | XpressResponse;
}

export function GamingServiceControllerMethods() {
  return function (constructor: Function) {
    const grpcMethods: string[] = [
      "createGame",
      "findAllGames",
      "fetchGames",
      "syncGames",
      "findOneGame",
      "updateGame",
      "removeGame",
      "saveCategory",
      "fetchCategories",
      "createProvider",
      "updateProvider",
      "findOneProvider",
      "removeProvider",
      "findAllProviders",
      "startGame",
      "handleCallback",
      "xpressLogin",
      "xpressBalance",
      "xpressDebit",
      "xpressCredit",
      "xpressRollback",
      "xpressLogout",
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
