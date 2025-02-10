/* eslint-disable */
import { GrpcMethod, GrpcStreamMethod } from "@nestjs/microservices";
import { wrappers } from "protobufjs";
import { Observable } from "rxjs";
import { Struct } from "./google/protobuf/struct.pb";

export const protobufPackage = "betting";

export interface GetTicketsRequest {
  userId: number;
  clientId: number;
  from: string;
  to: string;
  status: string;
  page: number;
  perPage: number;
  betslipId: string;
  username: string;
  gameId?: string | undefined;
  ticketType?: string | undefined;
  betType?: string | undefined;
  amountRange?: string | undefined;
  groupType?: string | undefined;
}

export interface GetCommissionsRequest {
  clientId: number;
  provider: string;
  from: string;
  to: string;
  page: number;
}

export interface SalesReportRequest {
  clientId: number;
  userId: number;
  role: string;
  from: string;
  to: string;
  productType: string;
}

export interface NetworkSalesRequest {
  userIds: string;
  from: string;
  to: string;
  product: string;
}

export interface CommonResponseObj {
  status?: number | undefined;
  success?: boolean | undefined;
  message: string;
  data?: { [key: string]: any } | undefined;
  errors?: string | undefined;
}

export interface GetVirtualBetsRequest {
  clientId: number;
  gameId?: string | undefined;
  transactionId?: string | undefined;
  from: string;
  to: string;
  status?: string | undefined;
  page: number;
  perPage?: number | undefined;
  username?: string | undefined;
  userId?: number | undefined;
}

export interface PaginationResponse {
  message: string;
  count: number;
  currentPage: number;
  nextPage: number;
  prevPage: number;
  lastPage: number;
  data: string;
}

export interface SettleCasinoBetRequest {
  transactionId: string;
  winnings: number;
  provider?: string | undefined;
}

export interface SettleVirtualBetRequest {
  userId: number;
  clientId: number;
  amount: number;
  jackpot: number;
  roundId: string;
  category: string;
  gameCycleClosed: number;
}

export interface SettleCasinoBetResponse {
  success: boolean;
  message: string;
}

export interface SettleVirtualBetResponse {
  success: boolean;
  message: string;
}

export interface PlaceVirtualBetRequest {
  userId: number;
  clientId: number;
  roundId: string;
  transactionId: string;
  transactionCategory: string;
  gameId: string;
  stake: number;
  username: string;
}

export interface PlaceVirtualBetResponse {
  success: boolean;
  status: number;
  message: string;
  data?: VirtualBetData | undefined;
}

export interface GetVirtualBetRequest {
  clientId: number;
  gameId: string;
  transactionId: string;
}

export interface GetVirtualBetResponse {
  success: boolean;
  gameId: boolean;
  transactionId: boolean;
  data?: VirtualBetData | undefined;
}

export interface VirtualBetData {
  userId: number;
  clientId: number;
  betId: number;
  roundId: string;
  transactionId: string;
  transactionCategory: string;
  gameId: string;
  stake: number;
  gameCycleClosed: number;
  username: string;
}

export interface PlaceCasinoBetRequest {
  userId: number;
  clientId: number;
  roundId: string;
  transactionId: string;
  gameId: string;
  gameName?: string | undefined;
  stake: number;
  winnings?: number | undefined;
  gameNumber?: string | undefined;
  source?: string | undefined;
  cashierTransactionId?: string | undefined;
  username?: string | undefined;
  betType?: string | undefined;
  bonusId?: number | undefined;
  roundDetails?: number | undefined;
}

export interface CreditCasinoBetRequest {
  transactionId: string;
  winnings: number;
}

export interface RollbackCasinoBetRequest {
  transactionId: string;
}

export interface Settings {
  clientID: number;
  taxOnStake: number;
  taxOnWinning: number;
  minimumStake: number;
  maximumStake: number;
  maximumWinning: number;
  maximumSelections: number;
  mtsLimitID: number;
  currency: string;
  url: string;
}

export interface SettingsResponse {
  clientID: number;
  taxOnStake: number;
  taxOnWinning: number;
  minimumStake: number;
  maximumStake: number;
  maximumWinning: number;
  maximumSelections: number;
  mtsLimitID: number;
  currency: string;
  url: string;
  created: string;
  updated: string;
}

export interface SettingsById {
  clientID: number;
}

export interface GetAll {
}

export interface AllSettingsResponse {
  settings: SettingsResponse[];
}

export interface BetID {
  betID: number;
}

export interface GamingActivityRequest {
  period: string;
  username: string;
  from: string;
  to: string;
  betType: string;
  eventType: string;
  sport: string;
  league: string;
  market: string;
  state: string;
  productType: string;
  source: string;
  groupBy: string;
  clientID: number;
  displayType: string;
  userId?: number | undefined;
}

export interface GamingActivityResponse {
  success: boolean;
  status: number;
  message: string;
  data?: GamingActivity | undefined;
  error: string;
}

export interface UpdateBetRequest {
  betId: number;
  status: string;
  entityType: string;
  clientId: number;
  selectionId?: number | undefined;
}

export interface UpdateBetResponse {
  success: boolean;
  status: number;
  message: string;
}

export interface BookingCode {
  betslipId: string;
  clientId: number;
}

export interface StatusResponse {
  response: string;
}

export interface PlaceBetRequest {
  selections: BetSlip[];
  clientId: number;
  userId?: number | undefined;
  stake: number;
  source: string;
  ipAddress: string;
  betType: string;
  username?: string | undefined;
  minBonus: number;
  maxBonus: number;
  minOdds: number;
  totalOdds: number;
  type: string;
  combos: Combo[];
  isBooking: number;
  bonusId?: number | undefined;
  useBonus?: boolean | undefined;
}

export interface BetSlip {
  eventName: string;
  eventType: string;
  eventId: number;
  producerId: number;
  marketId: number;
  marketName: string;
  specifier: string;
  outcomeId: string;
  outcomeName: string;
  odds: number;
  sportId: number;
  sport: string;
  tournament: string;
  category: string;
  matchId: number;
  awayTeam: string;
  homeTeam: string;
  type: string;
  fixed: boolean;
  selectionId: string;
  eventDate: string;
  eventPrefix: string;
  isBonus?: boolean | undefined;
  id?: number | undefined;
}

export interface Combo {
}

export interface PlaceCasinoBetResponse {
  success: boolean;
  status: number;
  message: string;
  data?: CasinoBetData | undefined;
}

export interface CasinoBetData {
  transactionId: string;
  balance: number;
}

export interface PlaceBetResponse {
  success: boolean;
  status: number;
  message: string;
  data?: BetHistory | undefined;
}

export interface BetHistoryRequest {
  userId: number;
  clientId: number;
  from: string;
  to: string;
  status: string;
  page: number;
  perPage: number;
  betslipId: string;
  username: string;
}

export interface BetSlipHistory {
  eventName: string;
  eventType: string;
  eventId: number;
  producerId: number;
  marketId: number;
  marketName: string;
  specifier: string;
  outcomeId: string;
  outcomeName: string;
  odds: number;
  sportId: number;
  status: string;
  statusDescription: string;
  won: number;
  type: string;
  sport: string;
  tournament: string;
  category: string;
  matchId: string;
  eventDate: string;
  selectionId: string;
  eventPrefix: string;
  score: string;
  htScore: string;
  id: number;
  currentOdds: number;
  eventTime: string;
  matchStatus: string;
  isLive: number;
}

export interface BetHistory {
  selections: BetSlipHistory[];
  stake: number;
  created: string;
  statusCode: number;
  cashOutAmount: number;
  statusDescription: string;
  source: string;
  totalOdd: number;
  possibleWin: number;
  betType: number;
  betslipId: string;
  totalSelections: number;
  betCategory: string;
  id: number;
  userId: number;
  username: string;
  winnings: number;
  eventType: string;
  sports: string;
  tournaments: string;
  events: string;
  markets: string;
  betCategoryDesc: string;
  isBonusBet?: boolean | undefined;
  pendingGames?: number | undefined;
}

export interface BetHistoryResponse {
  bets: BetHistory[];
  /** Last pagination page */
  lastPage: number;
  /** From data index */
  from: number;
  /** to data index */
  to: number;
  /** how many records are remaining */
  remainingRecords: number;
  totalRecords: number;
  totalStake: number;
  currentPage: number;
}

export interface ProbabilityBetSlipSelection {
  eventId: number;
  marketId: number;
  marketName: string;
  specifier: string;
  outcomeId: string;
  outcomeName: string;
  sportId: number;
  currentProbability: number;
  initialProbability: number;
}

export interface Probability {
  probability: number;
  currentProbability: number;
  initialProbability: number;
  selections: ProbabilityBetSlipSelection[];
}

export interface FindBetRequest {
  clientId: number;
  betslipId: string;
}

export interface FindBetResponse {
  bet?: BetHistory | undefined;
  message: string;
  status: boolean;
}

export interface GamingActivity {
  totalStake: number;
  totalWinnings: number;
  totalTickets: number;
  bets: GamingActivityBets[];
}

export interface GamingActivityBets {
  month: string;
  date: string;
  turnover: number;
  total: number;
  average: number;
  winnings: number;
  source: string;
  betType: string;
  marketName: string;
  sportName: string;
  tournamentName: string;
}

export interface ProcessCashoutRequest {
  betId: number;
  amount: number;
}

export interface ProcessCashoutResponse {
  success: boolean;
  message: string;
  balance?: number | undefined;
}

export const BETTING_PACKAGE_NAME = "betting";

wrappers[".google.protobuf.Struct"] = { fromObject: Struct.wrap, toObject: Struct.unwrap } as any;

export interface BettingServiceClient {
  createSetting(request: Settings): Observable<SettingsResponse>;

  updateSetting(request: Settings): Observable<SettingsResponse>;

  getSettingsById(request: SettingsById): Observable<SettingsResponse>;

  getAllSettings(request: GetAll): Observable<AllSettingsResponse>;

  cancelBet(request: BetID): Observable<StatusResponse>;

  placeBet(request: PlaceBetRequest): Observable<PlaceBetResponse>;

  placeCasinoBet(request: PlaceCasinoBetRequest): Observable<PlaceCasinoBetResponse>;

  placeVirtualBet(request: PlaceVirtualBetRequest): Observable<PlaceVirtualBetResponse>;

  settleCasinoBet(request: SettleCasinoBetRequest): Observable<PlaceCasinoBetResponse>;

  closeCasinoRound(request: SettleCasinoBetRequest): Observable<PlaceCasinoBetResponse>;

  settleVirtualBet(request: SettleVirtualBetRequest): Observable<SettleVirtualBetResponse>;

  cancelCasinoBet(request: RollbackCasinoBetRequest): Observable<PlaceCasinoBetResponse>;

  betHistory(request: BetHistoryRequest): Observable<BetHistoryResponse>;

  findBet(request: FindBetRequest): Observable<CommonResponseObj>;

  updateBet(request: UpdateBetRequest): Observable<UpdateBetResponse>;

  getProbabilityFromBetId(request: BetID): Observable<Probability>;

  getCoupon(request: FindBetRequest): Observable<CommonResponseObj>;

  gamingActivity(request: GamingActivityRequest): Observable<GamingActivityResponse>;

  getVirtualBet(request: GetVirtualBetRequest): Observable<GetVirtualBetResponse>;

  getVirtualBets(request: GetVirtualBetsRequest): Observable<CommonResponseObj>;

  cashoutRequest(request: ProcessCashoutRequest): Observable<ProcessCashoutResponse>;

  getRetailBets(request: BetHistoryRequest): Observable<CommonResponseObj>;

  getRetailVBets(request: GetVirtualBetsRequest): Observable<CommonResponseObj>;

  getSalesReport(request: SalesReportRequest): Observable<CommonResponseObj>;

  getShopUserCommissions(request: SalesReportRequest): Observable<CommonResponseObj>;

  getTotalSalesReport(request: NetworkSalesRequest): Observable<CommonResponseObj>;

  deletePlayerData(request: SettingsById): Observable<CommonResponseObj>;

  getCommissions(request: GetCommissionsRequest): Observable<CommonResponseObj>;

  ticketsReport(request: GetTicketsRequest): Observable<CommonResponseObj>;

  getCodeHubTickets(request: GetTicketsRequest): Observable<CommonResponseObj>;
}

export interface BettingServiceController {
  createSetting(request: Settings): Promise<SettingsResponse> | Observable<SettingsResponse> | SettingsResponse;

  updateSetting(request: Settings): Promise<SettingsResponse> | Observable<SettingsResponse> | SettingsResponse;

  getSettingsById(request: SettingsById): Promise<SettingsResponse> | Observable<SettingsResponse> | SettingsResponse;

  getAllSettings(request: GetAll): Promise<AllSettingsResponse> | Observable<AllSettingsResponse> | AllSettingsResponse;

  cancelBet(request: BetID): Promise<StatusResponse> | Observable<StatusResponse> | StatusResponse;

  placeBet(request: PlaceBetRequest): Promise<PlaceBetResponse> | Observable<PlaceBetResponse> | PlaceBetResponse;

  placeCasinoBet(
    request: PlaceCasinoBetRequest,
  ): Promise<PlaceCasinoBetResponse> | Observable<PlaceCasinoBetResponse> | PlaceCasinoBetResponse;

  placeVirtualBet(
    request: PlaceVirtualBetRequest,
  ): Promise<PlaceVirtualBetResponse> | Observable<PlaceVirtualBetResponse> | PlaceVirtualBetResponse;

  settleCasinoBet(
    request: SettleCasinoBetRequest,
  ): Promise<PlaceCasinoBetResponse> | Observable<PlaceCasinoBetResponse> | PlaceCasinoBetResponse;

  closeCasinoRound(
    request: SettleCasinoBetRequest,
  ): Promise<PlaceCasinoBetResponse> | Observable<PlaceCasinoBetResponse> | PlaceCasinoBetResponse;

  settleVirtualBet(
    request: SettleVirtualBetRequest,
  ): Promise<SettleVirtualBetResponse> | Observable<SettleVirtualBetResponse> | SettleVirtualBetResponse;

  cancelCasinoBet(
    request: RollbackCasinoBetRequest,
  ): Promise<PlaceCasinoBetResponse> | Observable<PlaceCasinoBetResponse> | PlaceCasinoBetResponse;

  betHistory(
    request: BetHistoryRequest,
  ): Promise<BetHistoryResponse> | Observable<BetHistoryResponse> | BetHistoryResponse;

  findBet(request: FindBetRequest): Promise<CommonResponseObj> | Observable<CommonResponseObj> | CommonResponseObj;

  updateBet(request: UpdateBetRequest): Promise<UpdateBetResponse> | Observable<UpdateBetResponse> | UpdateBetResponse;

  getProbabilityFromBetId(request: BetID): Promise<Probability> | Observable<Probability> | Probability;

  getCoupon(request: FindBetRequest): Promise<CommonResponseObj> | Observable<CommonResponseObj> | CommonResponseObj;

  gamingActivity(
    request: GamingActivityRequest,
  ): Promise<GamingActivityResponse> | Observable<GamingActivityResponse> | GamingActivityResponse;

  getVirtualBet(
    request: GetVirtualBetRequest,
  ): Promise<GetVirtualBetResponse> | Observable<GetVirtualBetResponse> | GetVirtualBetResponse;

  getVirtualBets(
    request: GetVirtualBetsRequest,
  ): Promise<CommonResponseObj> | Observable<CommonResponseObj> | CommonResponseObj;

  cashoutRequest(
    request: ProcessCashoutRequest,
  ): Promise<ProcessCashoutResponse> | Observable<ProcessCashoutResponse> | ProcessCashoutResponse;

  getRetailBets(
    request: BetHistoryRequest,
  ): Promise<CommonResponseObj> | Observable<CommonResponseObj> | CommonResponseObj;

  getRetailVBets(
    request: GetVirtualBetsRequest,
  ): Promise<CommonResponseObj> | Observable<CommonResponseObj> | CommonResponseObj;

  getSalesReport(
    request: SalesReportRequest,
  ): Promise<CommonResponseObj> | Observable<CommonResponseObj> | CommonResponseObj;

  getShopUserCommissions(
    request: SalesReportRequest,
  ): Promise<CommonResponseObj> | Observable<CommonResponseObj> | CommonResponseObj;

  getTotalSalesReport(
    request: NetworkSalesRequest,
  ): Promise<CommonResponseObj> | Observable<CommonResponseObj> | CommonResponseObj;

  deletePlayerData(
    request: SettingsById,
  ): Promise<CommonResponseObj> | Observable<CommonResponseObj> | CommonResponseObj;

  getCommissions(
    request: GetCommissionsRequest,
  ): Promise<CommonResponseObj> | Observable<CommonResponseObj> | CommonResponseObj;

  ticketsReport(
    request: GetTicketsRequest,
  ): Promise<CommonResponseObj> | Observable<CommonResponseObj> | CommonResponseObj;

  getCodeHubTickets(
    request: GetTicketsRequest,
  ): Promise<CommonResponseObj> | Observable<CommonResponseObj> | CommonResponseObj;
}

export function BettingServiceControllerMethods() {
  return function (constructor: Function) {
    const grpcMethods: string[] = [
      "createSetting",
      "updateSetting",
      "getSettingsById",
      "getAllSettings",
      "cancelBet",
      "placeBet",
      "placeCasinoBet",
      "placeVirtualBet",
      "settleCasinoBet",
      "closeCasinoRound",
      "settleVirtualBet",
      "cancelCasinoBet",
      "betHistory",
      "findBet",
      "updateBet",
      "getProbabilityFromBetId",
      "getCoupon",
      "gamingActivity",
      "getVirtualBet",
      "getVirtualBets",
      "cashoutRequest",
      "getRetailBets",
      "getRetailVBets",
      "getSalesReport",
      "getShopUserCommissions",
      "getTotalSalesReport",
      "deletePlayerData",
      "getCommissions",
      "ticketsReport",
      "getCodeHubTickets",
    ];
    for (const method of grpcMethods) {
      const descriptor: any = Reflect.getOwnPropertyDescriptor(constructor.prototype, method);
      GrpcMethod("BettingService", method)(constructor.prototype[method], method, descriptor);
    }
    const grpcStreamMethods: string[] = [];
    for (const method of grpcStreamMethods) {
      const descriptor: any = Reflect.getOwnPropertyDescriptor(constructor.prototype, method);
      GrpcStreamMethod("BettingService", method)(constructor.prototype[method], method, descriptor);
    }
  };
}

export const BETTING_SERVICE_NAME = "BettingService";
