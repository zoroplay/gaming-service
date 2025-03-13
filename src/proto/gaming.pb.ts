/* eslint-disable */
import { GrpcMethod, GrpcStreamMethod } from "@nestjs/microservices";
import { wrappers } from "protobufjs";
import { Observable } from "rxjs";
import { Struct } from "./google/protobuf/struct.pb";

export const protobufPackage = "gaming";

export interface GetGamesRequest {
  providerId?: number | undefined;
  categoryId?: number | undefined;
}

export interface GetPromotions {
  clientId?: number | undefined;
}

export interface StartDto {
  clientId: number;
  userId: number;
  token: string;
}

export interface SmatVirtualCallbackRequest {
  clientId: number;
  action?: string | undefined;
  body?: string | undefined;
  playerId?: string | undefined;
  sessionId?: string | undefined;
}

export interface CreateBonusRequest {
  clientId: number;
  bonusType: string;
  creditType?: string | undefined;
  duration?: number | undefined;
  minimumSelection?: number | undefined;
  minimumOddsPerEvent?: number | undefined;
  minimumTotalOdds?: number | undefined;
  applicableBetType?: string | undefined;
  maximumWinning?: number | undefined;
  bonusAmount?: number | undefined;
  status?: number | undefined;
  created?: string | undefined;
  updated?: string | undefined;
  id?: number | undefined;
  minimumLostGames?: number | undefined;
  rolloverCount?: number | undefined;
  name?: string | undefined;
  minimumEntryAmount?: number | undefined;
  maxAmount?: number | undefined;
  product?: string | undefined;
  gameId: string[];
  casinoSpinCount?: number | undefined;
  providerId?: number | undefined;
  bonusId?: number | undefined;
  userIds: string[];
}

export interface CreateBonusResponse {
  bonusId: number;
  status: number;
  description: string;
  success: boolean;
}

export interface QtechCallbackRequest {
  clientId: number;
  playerId: string;
  gameId: string;
  passkey: string;
  walletSessionId: string;
  body?: string | undefined;
  action: string;
}

export interface AddGameToCategoriesResponse {
  gameCategories: GameCategory[];
}

export interface RegisterBonusRequest {
  clientId: number;
  gameId: string;
  userId: string;
  betMoney: number;
  freeSpinsCount: number;
  expireDate: string;
  bonusId: number;
  promoCode: string;
}

export interface PaginationDto {
  page: number;
  skip: number;
}

export interface FetchGamesRequest {
  clientId: number;
  categoryId?: number | undefined;
  providerId?: number | undefined;
  gameName?: string | undefined;
}

export interface Empty {
}

export interface SyncGameDto {
  provider: string;
  clientId?: number | undefined;
}

export interface CallbackGameDto {
  clientId: number;
  provider: string;
  action?: string | undefined;
  method?: string | undefined;
  header: { [key: string]: any } | undefined;
  body?: string | undefined;
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
  status?: number | undefined;
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
  bonusType: string;
}

export interface StartGameDto {
  gameId: number;
  clientId: number;
  userId: number;
  username: string;
  email?: string | undefined;
  homeUrl?: string | undefined;
  depositUrl?: string | undefined;
  demo?: boolean | undefined;
  isMobile?: boolean | undefined;
  authCode?: string | undefined;
  balanceType?: string | undefined;
  bonusId?: number | undefined;
  language?: string | undefined;
  isBonus?: boolean | undefined;
  bonusType?: string | undefined;
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
  category: Category[];
}

export interface IGame {
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
  /** Fixed the category type to be a repeated string */
  category: string[];
}

export interface GamingServiceResponse {
  games: IGame[];
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
  status?: number | undefined;
  data: { [key: string]: any } | undefined;
}

export interface CommonResponseArray {
  status?: number | undefined;
  success?: boolean | undefined;
  message: string;
  data: { [key: string]: any }[];
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
  balance: string;
  sessionId: string;
  group: string;
  timestamp: string;
  requestId: string;
  fingerprint: string;
  playerNickname?: string | undefined;
  oldBalance?: string | undefined;
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
  data?: { [key: string]: any } | undefined;
}

export interface SaveCategoryRequest {
  clientId: number;
  id?: number | undefined;
  name: string;
  imagePath?: string | undefined;
  priority?: number | undefined;
  status?: string | undefined;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  priority?: number | undefined;
  status?: string | undefined;
}

export interface Categories {
  data: Category[];
}

export interface FindOneCategoryDto {
  id: number;
}

export interface MetaData {
  page: number;
  perPage: number;
  total: number;
  lastPage: number;
  nextPage: number;
  prevPage: number;
}

export interface Promotion1 {
  /** int32 clientId = 1; */
  title: string;
  imageUrl: string;
  status: string;
  content: string;
  startDate: string;
  endDate: string;
  type: string;
}

export interface Promotion {
  id: number;
  title: string;
  imageUrl: string;
  content: string;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
  targetUrl?: string | undefined;
  clientId: number;
}

export interface CreatePromotionDto {
  id?: number | undefined;
  title: string;
  imageUrl: string;
  content: string;
  startDate: string;
  endDate: string;
  type: string;
  targetUrl?: string | undefined;
  file?: string | undefined;
  clientId: number;
}

export interface CreatePromotionRequest {
  id?: number | undefined;
  metadata: CreatePromotionDto | undefined;
  file?: string | undefined;
}

export interface Promotions {
  data: Promotion[];
}

export interface FindOnePromotionDto {
  id: number;
}

export interface AddGameToCategoriesDto {
  gameId: number;
  categories: number[];
}

export interface AddGameToTournamentDto {
  tournamentId: number;
  gameId: number[];
}

export interface GameCategory {
  gameId: number;
  gameTitle: string;
  categoryId: number;
  categoryName: string;
}

export interface GameTournament {
  gameId: number;
  gameTitle: string;
  tournamentId: number;
  tournamentTitle: string;
}

export interface TournamentResponse {
  gameTournament: GameTournament[];
}

export interface Tournament {
  id: number;
  title: string;
  imageUrl: string;
  content: string;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
  categoryId: number;
}

export interface CreateTournamentDto {
  /** int32 clientId = 1; */
  id?: number | undefined;
  title: string;
  imageUrl: string;
  content: string;
  startDate: string;
  endDate: string;
  type: string;
}

export interface Tournaments {
  data: Tournament[];
}

export interface FindOneTournamentDto {
  id: number;
}

export const GAMING_PACKAGE_NAME = "gaming";

wrappers[".google.protobuf.Struct"] = { fromObject: Struct.wrap, toObject: Struct.unwrap } as any;

export interface GamingServiceClient {
  createGame(request: CreateGameDto): Observable<Game>;

  findAllGames(request: Empty): Observable<Games>;

  fetchGames(request: FetchGamesRequest): Observable<CommonResponseArray>;

  fetchGamesByName(request: FetchGamesRequest): Observable<Games>;

  syncGames(request: SyncGameDto): Observable<Games>;

  findOneGame(request: FindOneGameDto): Observable<Game>;

  updateGame(request: UpdateGameDto): Observable<Game>;

  removeGame(request: UpdateGameDto): Observable<Game>;

  saveCategory(request: SaveCategoryRequest): Observable<Category>;

  fetchCategories(request: Empty): Observable<Categories>;

  addGameToCategories(request: AddGameToCategoriesDto): Observable<Game>;

  removeGameToCategories(request: AddGameToCategoriesDto): Observable<Game>;

  addTournamentGame(request: AddGameToTournamentDto): Observable<TournamentResponse>;

  removeTournamentGame(request: AddGameToTournamentDto): Observable<Empty>;

  findOneCategory(request: FindOneCategoryDto): Observable<Category>;

  updateCategory(request: SaveCategoryRequest): Observable<Category>;

  deleteCategory(request: FindOneCategoryDto): Observable<Empty>;

  registerBonus(request: Empty): Observable<CommonResponse>;

  findOneTournament(request: FindOneTournamentDto): Observable<Tournament>;

  findAllTournaments(request: Empty): Observable<Tournaments>;

  updateTournament(request: CreateTournamentDto): Observable<Tournament>;

  deleteTournament(request: FindOneTournamentDto): Observable<Empty>;

  createTournament(request: CreateTournamentDto): Observable<Tournament>;

  createProvider(request: CreateProviderDto): Observable<CommonResponse>;

  updateProvider(request: CreateProviderDto): Observable<CommonResponse>;

  findOneProvider(request: FindOneGameDto): Observable<CommonResponse>;

  removeProvider(request: CreateProviderDto): Observable<CommonResponse>;

  findAllProviders(request: Empty): Observable<CommonResponse>;

  findAdminProviders(request: Empty): Observable<CommonResponse>;

  getGames(request: GetGamesRequest): Observable<CommonResponseArray>;

  createPromotion(request: CreatePromotionRequest): Observable<Promotion>;

  findPromotions(request: GetPromotions): Observable<Promotions>;

  findOnePromotion(request: FindOnePromotionDto): Observable<Promotion>;

  updatePromotion(request: CreatePromotionRequest): Observable<Promotion>;

  removePromotion(request: FindOnePromotionDto): Observable<Empty>;

  handleCasinoBonus(request: CreateBonusRequest): Observable<CreateBonusResponse>;

  handleCasinoJackpot(request: SyncGameDto): Observable<CommonResponse>;

  handleCasinoJackpotWinners(request: SyncGameDto): Observable<CommonResponse>;

  startGame(request: StartGameDto): Observable<StartGameResponse>;

  queryGames(request: Observable<PaginationDto>): Observable<Games>;

  handleCallback(request: CallbackGameDto): Observable<CallbackResponse>;

  handleQtechCallback(request: QtechCallbackRequest): Observable<CallbackResponse>;

  handleSmatVirtualCallback(request: SmatVirtualCallbackRequest): Observable<CallbackResponse>;

  xpressLogin(request: XpressRequest): Observable<XpressResponse>;

  xpressBalance(request: XpressRequest): Observable<XpressResponse>;

  xpressDebit(request: XpressRequest): Observable<XpressResponse>;

  xpressCredit(request: XpressRequest): Observable<XpressResponse>;

  xpressRollback(request: XpressRequest): Observable<XpressResponse>;

  xpressLogout(request: XpressRequest): Observable<XpressResponse>;

  startSmatGame(request: StartDto): Observable<StartGameResponse>;
}

export interface GamingServiceController {
  createGame(request: CreateGameDto): Promise<Game> | Observable<Game> | Game;

  findAllGames(request: Empty): Promise<Games> | Observable<Games> | Games;

  fetchGames(
    request: FetchGamesRequest,
  ): Promise<CommonResponseArray> | Observable<CommonResponseArray> | CommonResponseArray;

  fetchGamesByName(request: FetchGamesRequest): Promise<Games> | Observable<Games> | Games;

  syncGames(request: SyncGameDto): Promise<Games> | Observable<Games> | Games;

  findOneGame(request: FindOneGameDto): Promise<Game> | Observable<Game> | Game;

  updateGame(request: UpdateGameDto): Promise<Game> | Observable<Game> | Game;

  removeGame(request: UpdateGameDto): Promise<Game> | Observable<Game> | Game;

  saveCategory(request: SaveCategoryRequest): Promise<Category> | Observable<Category> | Category;

  fetchCategories(request: Empty): Promise<Categories> | Observable<Categories> | Categories;

  addGameToCategories(request: AddGameToCategoriesDto): Promise<Game> | Observable<Game> | Game;

  removeGameToCategories(request: AddGameToCategoriesDto): Promise<Game> | Observable<Game> | Game;

  addTournamentGame(
    request: AddGameToTournamentDto,
  ): Promise<TournamentResponse> | Observable<TournamentResponse> | TournamentResponse;

  removeTournamentGame(request: AddGameToTournamentDto): Promise<Empty> | Observable<Empty> | Empty;

  findOneCategory(request: FindOneCategoryDto): Promise<Category> | Observable<Category> | Category;

  updateCategory(request: SaveCategoryRequest): Promise<Category> | Observable<Category> | Category;

  deleteCategory(request: FindOneCategoryDto): Promise<Empty> | Observable<Empty> | Empty;

  registerBonus(request: Empty): Promise<CommonResponse> | Observable<CommonResponse> | CommonResponse;

  findOneTournament(request: FindOneTournamentDto): Promise<Tournament> | Observable<Tournament> | Tournament;

  findAllTournaments(request: Empty): Promise<Tournaments> | Observable<Tournaments> | Tournaments;

  updateTournament(request: CreateTournamentDto): Promise<Tournament> | Observable<Tournament> | Tournament;

  deleteTournament(request: FindOneTournamentDto): Promise<Empty> | Observable<Empty> | Empty;

  createTournament(request: CreateTournamentDto): Promise<Tournament> | Observable<Tournament> | Tournament;

  createProvider(request: CreateProviderDto): Promise<CommonResponse> | Observable<CommonResponse> | CommonResponse;

  updateProvider(request: CreateProviderDto): Promise<CommonResponse> | Observable<CommonResponse> | CommonResponse;

  findOneProvider(request: FindOneGameDto): Promise<CommonResponse> | Observable<CommonResponse> | CommonResponse;

  removeProvider(request: CreateProviderDto): Promise<CommonResponse> | Observable<CommonResponse> | CommonResponse;

  findAllProviders(request: Empty): Promise<CommonResponse> | Observable<CommonResponse> | CommonResponse;

  findAdminProviders(request: Empty): Promise<CommonResponse> | Observable<CommonResponse> | CommonResponse;

  getGames(
    request: GetGamesRequest,
  ): Promise<CommonResponseArray> | Observable<CommonResponseArray> | CommonResponseArray;

  createPromotion(request: CreatePromotionRequest): Promise<Promotion> | Observable<Promotion> | Promotion;

  findPromotions(request: GetPromotions): Promise<Promotions> | Observable<Promotions> | Promotions;

  findOnePromotion(request: FindOnePromotionDto): Promise<Promotion> | Observable<Promotion> | Promotion;

  updatePromotion(request: CreatePromotionRequest): Promise<Promotion> | Observable<Promotion> | Promotion;

  removePromotion(request: FindOnePromotionDto): Promise<Empty> | Observable<Empty> | Empty;

  handleCasinoBonus(
    request: CreateBonusRequest,
  ): Promise<CreateBonusResponse> | Observable<CreateBonusResponse> | CreateBonusResponse;

  handleCasinoJackpot(request: SyncGameDto): Promise<CommonResponse> | Observable<CommonResponse> | CommonResponse;

  handleCasinoJackpotWinners(
    request: SyncGameDto,
  ): Promise<CommonResponse> | Observable<CommonResponse> | CommonResponse;

  startGame(request: StartGameDto): Promise<StartGameResponse> | Observable<StartGameResponse> | StartGameResponse;

  queryGames(request: Observable<PaginationDto>): Observable<Games>;

  handleCallback(request: CallbackGameDto): Promise<CallbackResponse> | Observable<CallbackResponse> | CallbackResponse;

  handleQtechCallback(
    request: QtechCallbackRequest,
  ): Promise<CallbackResponse> | Observable<CallbackResponse> | CallbackResponse;

  handleSmatVirtualCallback(
    request: SmatVirtualCallbackRequest,
  ): Promise<CallbackResponse> | Observable<CallbackResponse> | CallbackResponse;

  xpressLogin(request: XpressRequest): Promise<XpressResponse> | Observable<XpressResponse> | XpressResponse;

  xpressBalance(request: XpressRequest): Promise<XpressResponse> | Observable<XpressResponse> | XpressResponse;

  xpressDebit(request: XpressRequest): Promise<XpressResponse> | Observable<XpressResponse> | XpressResponse;

  xpressCredit(request: XpressRequest): Promise<XpressResponse> | Observable<XpressResponse> | XpressResponse;

  xpressRollback(request: XpressRequest): Promise<XpressResponse> | Observable<XpressResponse> | XpressResponse;

  xpressLogout(request: XpressRequest): Promise<XpressResponse> | Observable<XpressResponse> | XpressResponse;

  startSmatGame(request: StartDto): Promise<StartGameResponse> | Observable<StartGameResponse> | StartGameResponse;
}

export function GamingServiceControllerMethods() {
  return function (constructor: Function) {
    const grpcMethods: string[] = [
      "createGame",
      "findAllGames",
      "fetchGames",
      "fetchGamesByName",
      "syncGames",
      "findOneGame",
      "updateGame",
      "removeGame",
      "saveCategory",
      "fetchCategories",
      "addGameToCategories",
      "removeGameToCategories",
      "addTournamentGame",
      "removeTournamentGame",
      "findOneCategory",
      "updateCategory",
      "deleteCategory",
      "registerBonus",
      "findOneTournament",
      "findAllTournaments",
      "updateTournament",
      "deleteTournament",
      "createTournament",
      "createProvider",
      "updateProvider",
      "findOneProvider",
      "removeProvider",
      "findAllProviders",
      "findAdminProviders",
      "getGames",
      "createPromotion",
      "findPromotions",
      "findOnePromotion",
      "updatePromotion",
      "removePromotion",
      "handleCasinoBonus",
      "handleCasinoJackpot",
      "handleCasinoJackpotWinners",
      "startGame",
      "handleCallback",
      "handleQtechCallback",
      "handleSmatVirtualCallback",
      "xpressLogin",
      "xpressBalance",
      "xpressDebit",
      "xpressCredit",
      "xpressRollback",
      "xpressLogout",
      "startSmatGame",
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
