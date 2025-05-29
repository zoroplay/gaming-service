/* eslint-disable */
import { GrpcMethod, GrpcStreamMethod } from "@nestjs/microservices";
import { wrappers } from "protobufjs";
import { Observable } from "rxjs";
import { Struct } from "./google/protobuf/struct.pb";

export const protobufPackage = "bonus";

export interface CommonResponseObj {
  status?: number | undefined;
  success?: boolean | undefined;
  message: string;
  data?: { [key: string]: any } | undefined;
}

export interface CheckDepositBonusRequest {
  clientId: number;
  userId: number;
}

export interface CheckDepositBonusResponse {
  success: boolean;
  value: number;
  data?: FirstDepositBonus | undefined;
}

export interface FirstDepositBonus {
  bonusId: number;
  value: number;
  type: string;
  name: string;
  gameId?: string | undefined;
}

export interface CreateReferralBonusRequest {
  clientId: number;
  expiryInHours: number;
  minimumEvents: number;
  minimumOddsPerEvent: number;
  minimumTotalOdds: number;
  applicableBetType: string;
  maximumWinning: number;
  minimumEntryAmount: number;
  bonusAmount: number;
  bonusAmountMultiplier: number;
  rolloverCount: number;
  name: string;
  minimumBettingStake: number;
  product: string;
}

export interface CreateShareBetBonusRequest {
  clientId: number;
  expiryInHours: number;
  minimumEvents: number;
  minimumOddsPerEvent: number;
  minimumTotalOdds: number;
  applicableBetType: string;
  maximumWinning: number;
  minimumEntryAmount: number;
  bonusAmount: number;
  bonusAmountMultiplier: number;
  rolloverCount: number;
  name: string;
  minimumBettingStake: number;
  product: string;
}

export interface CreateBonusRequest {
  clientId: number;
  bonusType: string;
  creditType: string;
  duration: number;
  minimumSelection: number;
  minimumOddsPerEvent: number;
  minimumTotalOdds: number;
  applicableBetType: string;
  maximumWinning: number;
  bonusAmount: number;
  status?: number | undefined;
  created?: string | undefined;
  updated?: string | undefined;
  id?: number | undefined;
  minimumLostGames: number;
  rolloverCount: number;
  name: string;
  minimumEntryAmount: number;
  maxAmount: number;
  product: string;
  gameId: string[];
  casinoSpinCount?: number | undefined;
  providerId?: number | undefined;
  bonusId?: number | undefined;
  userIds: string[];
  provider?: string | undefined;
}

export interface CreateBonusResponse {
  bonusId: number;
  status: number;
  description: string;
  success: boolean;
}

export interface GetBonusRequest {
  clientId: number;
}

export interface DeleteBonusRequest {
  clientId: number;
  id: number;
}

export interface GetBonusResponse {
  bonus: CreateBonusRequest[];
}

export interface BonusResponse {
  status: number;
  description: string;
  success: boolean;
}

export interface GetUserBonusRequest {
  clientId: number;
  userId: number;
  bonusType: string;
  id: number;
  status: number;
}

export interface UserBetData {
  betId: number;
  stake: number;
  rolloverCount: number;
  status: number;
  rolledAmount: number;
  pendingAmount: number;
  created: string;
}

export interface Transaction {
  amount: number;
  balance: number;
  createdAt: string;
  desc: string;
}

export interface GetUserBonusResponse {
  bonus: UserBonus[];
}

export interface UserBonus {
  bonusType: string;
  amount: number;
  expiryDateInTimestamp: number;
  created: string;
  id: number;
  name: string;
  rolledAmount: number;
  pendingAmount: number;
  totalRolloverCount: number;
  completedRolloverCount: number;
  status: number;
  transactions: Transaction[];
}

export interface UserBonusResponse {
  description: string;
  status: number;
  bonus: UserBonus | undefined;
}

export interface AwardBonusRequest {
  clientId: number;
  bonusId: number;
  userId: string;
  username?: string | undefined;
  amount?: number | undefined;
  baseValue?: number | undefined;
  promoCode?: string | undefined;
  status?: number | undefined;
}

export interface UserBet {
  selections: BetSlip[];
  clientId: number;
  userId: number;
  stake: number;
  totalOdds: number;
  bonusId: number;
  betId?: string | undefined;
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
  matchId: number;
}

export interface DebitBonusRequest {
  clientId: number;
  userId: number;
  amount: number;
  bonusType: string;
}

export interface HasBonusBetResponse {
  status: number;
  description: string;
  bonus: UserBonus | undefined;
}

export interface BonusStatusRequest {
  bonusId: number;
  status: number;
}

export interface CreateCampaignBonusDto {
  clientId: number;
  name: string;
  bonusCode: string;
  bonusId: number;
  startDate: string;
  endDate: string;
  affiliateIds?: string | undefined;
  trackierCampaignId?: string | undefined;
}

export interface UpdateCampaignBonusDto {
  clientId: number;
  name: string;
  bonusCode: string;
  bonusId: number;
  startDate: string;
  id: number;
  affiliateIds?: string | undefined;
  trackierCampaignId?: string | undefined;
  endDate: string;
}

export interface RedeemCampaignBonusDto {
  clientId: number;
  bonusCode: string;
  userId: number;
}

export interface CampaignBonusData {
  id: number;
  clientId: number;
  name: string;
  bonusCode: string;
  bonus: CreateBonusRequest | undefined;
  startDate: string;
  endDate: string;
}

export interface AllCampaignBonus {
  bonus: CampaignBonusData[];
}

export interface GetBonusByClientID {
  clientId: number;
  searchKey?: string | undefined;
}

export interface GetCampaignRequest {
  clientId: number;
  promoCode: string;
}

export interface GetCampaignResponse {
  success: boolean;
  message: string;
  data: CampaignBonusData | undefined;
}

export interface PlaceBetResponse {
  success: boolean;
  betId: string;
  status: number;
  statusDescription: string;
}

export interface ValidateBetResponse {
  success: boolean;
  id: number;
  message: string;
}

export interface FetchReportRequest {
  bonusType: string;
  from: string;
  to: string;
  clientId: number;
}

export interface PlayerBonusData {
  id: number;
  userId: number;
  clientId: number;
  username: string;
  wageringRequirement: number;
  bonusId: string;
  bonusType: string;
  name: string;
  expiryDate: string;
  status: number;
  amount: number;
  balance: number;
  usedAmount: number;
  rolledAmount: number;
  wageringRequirementRemaining: number;
  wageringRequirementAchieved: number;
  promoCode: string;
  created: string;
  updated: string;
}

export interface FetchReportResponse {
  message: string;
  status: boolean;
  data: PlayerBonusData[];
}

export interface SettleBetRequest {
  clientId: number;
  betId: string;
  status: number;
  amount?: number | undefined;
}

export interface SearchBonusResponse {
  data: SearchBonusResponse_Bonus[];
}

export interface SearchBonusResponse_Bonus {
  id: number;
  name: string;
}

export interface EmptyResponse {
}

export const BONUS_PACKAGE_NAME = "bonus";

wrappers[".google.protobuf.Struct"] = { fromObject: Struct.wrap, toObject: Struct.unwrap } as any;

export interface BonusServiceClient {
  fetchBonusReport(request: FetchReportRequest): Observable<FetchReportResponse>;

  createBonus(request: CreateBonusRequest): Observable<CreateBonusResponse>;

  updateBonus(request: CreateBonusRequest): Observable<CreateBonusResponse>;

  getCampaign(request: GetCampaignRequest): Observable<GetCampaignResponse>;

  validateBetSelections(request: UserBet): Observable<ValidateBetResponse>;

  checkDepositBonus(request: CheckDepositBonusRequest): Observable<CheckDepositBonusResponse>;

  settleBet(request: SettleBetRequest): Observable<CommonResponseObj>;

  searchBonus(request: GetBonusByClientID): Observable<SearchBonusResponse>;

  getActiveUserBonus(request: CheckDepositBonusRequest): Observable<CommonResponseObj>;

  getBonus(request: GetBonusRequest): Observable<GetBonusResponse>;

  deleteBonus(request: DeleteBonusRequest): Observable<BonusResponse>;

  getUserBonus(request: GetUserBonusRequest): Observable<GetUserBonusResponse>;

  awardBonus(request: AwardBonusRequest): Observable<UserBonusResponse>;

  placeBonusBet(request: UserBet): Observable<PlaceBetResponse>;

  updateBonusStatus(request: BonusStatusRequest): Observable<CreateBonusResponse>;

  createCampaignBonus(request: CreateCampaignBonusDto): Observable<CreateBonusResponse>;

  updateCampaignBonus(request: UpdateCampaignBonusDto): Observable<CreateBonusResponse>;

  deleteCampaignBonus(request: DeleteBonusRequest): Observable<CreateBonusResponse>;

  redeemCampaignBonus(request: RedeemCampaignBonusDto): Observable<CreateBonusResponse>;

  getCampaignBonus(request: GetBonusByClientID): Observable<AllCampaignBonus>;

  deletePlayerData(request: GetBonusRequest): Observable<EmptyResponse>;
}

export interface BonusServiceController {
  fetchBonusReport(
    request: FetchReportRequest,
  ): Promise<FetchReportResponse> | Observable<FetchReportResponse> | FetchReportResponse;

  createBonus(
    request: CreateBonusRequest,
  ): Promise<CreateBonusResponse> | Observable<CreateBonusResponse> | CreateBonusResponse;

  updateBonus(
    request: CreateBonusRequest,
  ): Promise<CreateBonusResponse> | Observable<CreateBonusResponse> | CreateBonusResponse;

  getCampaign(
    request: GetCampaignRequest,
  ): Promise<GetCampaignResponse> | Observable<GetCampaignResponse> | GetCampaignResponse;

  validateBetSelections(
    request: UserBet,
  ): Promise<ValidateBetResponse> | Observable<ValidateBetResponse> | ValidateBetResponse;

  checkDepositBonus(
    request: CheckDepositBonusRequest,
  ): Promise<CheckDepositBonusResponse> | Observable<CheckDepositBonusResponse> | CheckDepositBonusResponse;

  settleBet(request: SettleBetRequest): Promise<CommonResponseObj> | Observable<CommonResponseObj> | CommonResponseObj;

  searchBonus(
    request: GetBonusByClientID,
  ): Promise<SearchBonusResponse> | Observable<SearchBonusResponse> | SearchBonusResponse;

  getActiveUserBonus(
    request: CheckDepositBonusRequest,
  ): Promise<CommonResponseObj> | Observable<CommonResponseObj> | CommonResponseObj;

  getBonus(request: GetBonusRequest): Promise<GetBonusResponse> | Observable<GetBonusResponse> | GetBonusResponse;

  deleteBonus(request: DeleteBonusRequest): Promise<BonusResponse> | Observable<BonusResponse> | BonusResponse;

  getUserBonus(
    request: GetUserBonusRequest,
  ): Promise<GetUserBonusResponse> | Observable<GetUserBonusResponse> | GetUserBonusResponse;

  awardBonus(
    request: AwardBonusRequest,
  ): Promise<UserBonusResponse> | Observable<UserBonusResponse> | UserBonusResponse;

  placeBonusBet(request: UserBet): Promise<PlaceBetResponse> | Observable<PlaceBetResponse> | PlaceBetResponse;

  updateBonusStatus(
    request: BonusStatusRequest,
  ): Promise<CreateBonusResponse> | Observable<CreateBonusResponse> | CreateBonusResponse;

  createCampaignBonus(
    request: CreateCampaignBonusDto,
  ): Promise<CreateBonusResponse> | Observable<CreateBonusResponse> | CreateBonusResponse;

  updateCampaignBonus(
    request: UpdateCampaignBonusDto,
  ): Promise<CreateBonusResponse> | Observable<CreateBonusResponse> | CreateBonusResponse;

  deleteCampaignBonus(
    request: DeleteBonusRequest,
  ): Promise<CreateBonusResponse> | Observable<CreateBonusResponse> | CreateBonusResponse;

  redeemCampaignBonus(
    request: RedeemCampaignBonusDto,
  ): Promise<CreateBonusResponse> | Observable<CreateBonusResponse> | CreateBonusResponse;

  getCampaignBonus(
    request: GetBonusByClientID,
  ): Promise<AllCampaignBonus> | Observable<AllCampaignBonus> | AllCampaignBonus;

  deletePlayerData(request: GetBonusRequest): Promise<EmptyResponse> | Observable<EmptyResponse> | EmptyResponse;
}

export function BonusServiceControllerMethods() {
  return function (constructor: Function) {
    const grpcMethods: string[] = [
      "fetchBonusReport",
      "createBonus",
      "updateBonus",
      "getCampaign",
      "validateBetSelections",
      "checkDepositBonus",
      "settleBet",
      "searchBonus",
      "getActiveUserBonus",
      "getBonus",
      "deleteBonus",
      "getUserBonus",
      "awardBonus",
      "placeBonusBet",
      "updateBonusStatus",
      "createCampaignBonus",
      "updateCampaignBonus",
      "deleteCampaignBonus",
      "redeemCampaignBonus",
      "getCampaignBonus",
      "deletePlayerData",
    ];
    for (const method of grpcMethods) {
      const descriptor: any = Reflect.getOwnPropertyDescriptor(constructor.prototype, method);
      GrpcMethod("BonusService", method)(constructor.prototype[method], method, descriptor);
    }
    const grpcStreamMethods: string[] = [];
    for (const method of grpcStreamMethods) {
      const descriptor: any = Reflect.getOwnPropertyDescriptor(constructor.prototype, method);
      GrpcStreamMethod("BonusService", method)(constructor.prototype[method], method, descriptor);
    }
  };
}

export const BONUS_SERVICE_NAME = "BonusService";
