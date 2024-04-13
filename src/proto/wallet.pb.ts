/* eslint-disable */
import { GrpcMethod, GrpcStreamMethod } from "@nestjs/microservices";
import { Observable } from "rxjs";

export const protobufPackage = "wallet";

export interface FetchBetRangeRequest {
  minAmount: number;
  maxAmount: number;
  startDate: string;
  endDate: string;
  clientId: number;
}

export interface FetchBetRangeResponse {
  status: number;
  success: boolean;
  data: FetchBetRangeResponse_Data[];
  error?: string | undefined;
}

export interface FetchBetRangeResponse_Data {
  userId: number;
  total: number;
  count: number;
  balance: number;
}

export interface FetchDepositRangeRequest {
  minAmount: number;
  maxAmount: number;
  startDate: string;
  endDate: string;
  clientId: number;
}

export interface FetchDepositCountRequest {
  clientId: number;
  startDate: string;
  endDate: string;
  count: number;
}

export interface FetchDepositCountResponse {
  status: number;
  success: boolean;
  data: FetchDepositCountResponse_Data[];
  error?: string | undefined;
}

export interface FetchDepositCountResponse_Data {
  userId: number;
  total: number;
  balance: number;
}

export interface FetchDepositRangeResponse {
  status: number;
  success: boolean;
  data: FetchDepositRangeResponse_Data[];
  error?: string | undefined;
}

export interface FetchDepositRangeResponse_Data {
  userId: number;
  total: number;
  balance: number;
}

export interface FetchPlayerDepositRequest {
  userId: number;
  startDate: string;
  endDate: string;
}

export interface TransactionEntity {
  id: number;
  clientId: number;
  userId: number;
  username: string;
  transactionNo: string;
  amount: number;
  transactionType: string;
  subject: string;
  description: string;
  source: string;
  channel: string;
  balance: number;
  status: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethodRequest {
  clientId: number;
  title: string;
  provider: string;
  secretKey: string;
  publicKey: string;
  merchantId: string;
  baseUrl: string;
  status: number;
  forDisbursement: number;
  id: number;
}

export interface VerifyDepositRequest {
  clientId: number;
  transactionRef: string;
  paymentChannel: string;
}

export interface VerifyDepositResponse {
  success: boolean;
  status: number;
  message: string;
}

export interface PaystackWebhookRequest {
  clientId: number;
  reference: string;
  event: string;
  body: string;
  paystackKey: string;
}

export interface MonnifyWebhookRequest {
  clientId: number;
  reference: string;
  event: string;
  body: string;
}

export interface WebhookResponse {
  success: boolean;
}

export interface GetPaymentMethodRequest {
  clientId: number;
  status?: number | undefined;
}

export interface GetPaymentMethodResponse {
  success: boolean;
  status: number;
  message: string;
  data: PaymentMethod[];
}

export interface PaymentMethodResponse {
  success: boolean;
  status: number;
  message: string;
  data?: PaymentMethod | undefined;
}

export interface PaymentMethod {
  title: string;
  provider: string;
  secretKey: string;
  publicKey: string;
  merchantId: string;
  baseUrl: string;
  status: number;
  forDisbursement: number;
  id: number;
}

export interface CreateWalletRequest {
  userId: number;
  clientId: number;
  username: string;
  amount?: number | undefined;
  bonus?: number | undefined;
}

export interface WalletResponse {
  success: boolean;
  status: number;
  message: string;
  data?: Wallet | undefined;
}

/** get user balance */
export interface GetBalanceRequest {
  userId: number;
  clientId: number;
}

/** credit user request payload */
export interface CreditUserRequest {
  userId: number;
  clientId: number;
  amount: number;
  source: string;
  description: string;
  username: string;
  wallet: string;
  subject: string;
  channel: string;
}

/** credit user request payload */
export interface DebitUserRequest {
  userId: number;
  clientId: number;
  amount: number;
  source: string;
  description: string;
  username: string;
  wallet: string;
  subject: string;
  channel: string;
}

export interface Wallet {
  userId: number;
  balance: number;
  availableBalance: number;
  trustBalance: number;
  sportBonusBalance: number;
  virtualBonusBalance: number;
  casinoBonusBalance: number;
}

export interface InitiateDepositRequest {
  userId: number;
  clientId: number;
  amount: number;
  paymentMethod: string;
  source: string;
  username: string;
}

export interface InitiateDepositResponse {
  success: boolean;
  message: string;
  data?: InitiateDepositResponse_Data | undefined;
}

export interface InitiateDepositResponse_Data {
  link?: string | undefined;
  transactionRef?: string | undefined;
}

export interface Transaction {
  username: string;
  transactionNo: string;
  amount: number;
  transactionType: string;
  subject: string;
  description: string;
  source: string;
  balance: number;
  status: number;
  createdAt: string;
  link?: string | undefined;
}

export interface VerifyBankAccountRequest {
  clientId: number;
  userId: number;
  accountNumber: string;
  bankCode: string;
  source: string;
}

export interface VerifyBankAccountResponse {
  success: boolean;
  status: number;
  message: string;
  accountName?: string | undefined;
}

export interface WithdrawRequest {
  userId: number;
  clientId: number;
  amount: number;
  accountName: string;
  accountNumber: string;
  bankCode?: string | undefined;
  bankName?: string | undefined;
  type?: string | undefined;
  source?: string | undefined;
  username: string;
}

export interface WithdrawResponse {
  success: boolean;
  status: number;
  message: string;
  data?: Withdraw | undefined;
}

export interface Withdraw {
  balance: number;
  code: string;
}

export interface GetTransactionRequest {
  userId: number;
  clientId: number;
  from: string;
  to: string;
  type: string;
  tranxType: string;
  page: number;
  limit: number;
}

export interface GetTransactionResponse {
  success: boolean;
  status: number;
  message: string;
  data: Transaction[];
}

export interface OpayWebhookRequest {
  clientId: number;
  username?: string | undefined;
  orderNo: string;
  amount: string;
}

export interface OpayWebhookResponse {
  responseCode: string;
  responseMessage: string;
  data?: OpayWebhookResponse_Data | undefined;
}

export interface OpayWebhookResponse_Data {
  UserID: string;
  OrderNo: string;
  TransAmount: string;
  PaymentReference: string;
  Status: string;
  TransDate: string;
}

export interface ListWithdrawalRequests {
  clientId: number;
  from: string;
  to: string;
  status: number;
  userId: number;
}

export interface ListWithdrawalRequestResponse {
  success: boolean;
  status: number;
  message: string;
  data: WithdrawalRequest[];
}

export interface WithdrawalRequest {
  id: number;
  userId: number;
  username: string;
  amount: number;
  accountNumber: string;
  accountName: string;
  bankName: string;
  updatedBy: string;
  status: number;
  created: string;
}

export interface UserTransactionRequest {
  clientId: number;
  userId: number;
  startDate: string;
  endDate: string;
}

export interface UserTransactionResponse {
  success: boolean;
  message: string;
  data: TransactionData[];
}

export interface TransactionData {
  id: number;
  referenceNo: string;
  amount: number;
  balance: number;
  subject: string;
  type: string;
  description: string;
  transactionDate: string;
  channel: string;
  status: number;
}

export interface UpdateWithdrawalRequest {
  clientId: number;
  withdrawalId: number;
  action: string;
  comment: string;
  updatedBy: string;
}

export interface UpdateWithdrawalResponse {
  success: boolean;
  message: string;
  status: number;
}

export interface PlayerWalletData {
  sportBalance: number;
  totalDeposits: number;
  sportBonusBalance: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
  avgWithdrawals: number;
  lastDepositDate: string;
  lastWithdrawalDate: string;
  lastDepositAmount: number;
  lastWithdrawalAmount: number;
  firstActivityDate: string;
  lastActivityDate: string;
  noOfDeposits: number;
  noOfWithdrawals: number;
}

export interface ListDepositRequests {
  clientId: number;
  startDate: string;
  endDate: string;
  paymentMethod: string;
  status: number;
  username: string;
  transactionId: string;
  page: number;
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

export const WALLET_PACKAGE_NAME = "wallet";

export interface WalletServiceClient {
  getBalance(request: GetBalanceRequest): Observable<WalletResponse>;

  createWallet(request: CreateWalletRequest): Observable<WalletResponse>;

  fetchBetRange(request: FetchBetRangeRequest): Observable<FetchBetRangeResponse>;

  fetchPlayerDeposit(request: FetchPlayerDepositRequest): Observable<WalletResponse>;

  fetchDepositRange(request: FetchDepositRangeRequest): Observable<FetchDepositRangeResponse>;

  fetchDepositCount(request: FetchDepositCountRequest): Observable<FetchDepositCountResponse>;

  creditUser(request: CreditUserRequest): Observable<WalletResponse>;

  debitUser(request: DebitUserRequest): Observable<WalletResponse>;

  inititateDeposit(request: InitiateDepositRequest): Observable<InitiateDepositResponse>;

  verifyDeposit(request: VerifyDepositRequest): Observable<VerifyDepositResponse>;

  requestWithdrawal(request: WithdrawRequest): Observable<WithdrawResponse>;

  verifyBankAccount(request: VerifyBankAccountRequest): Observable<VerifyBankAccountResponse>;

  getTransactions(request: GetTransactionRequest): Observable<GetTransactionResponse>;

  getPaymentMethods(request: GetPaymentMethodRequest): Observable<GetPaymentMethodResponse>;

  savePaymentMethod(request: PaymentMethodRequest): Observable<PaymentMethodResponse>;

  paystackWebhook(request: PaystackWebhookRequest): Observable<WebhookResponse>;

  monnifyWebhook(request: MonnifyWebhookRequest): Observable<WebhookResponse>;

  opayDepositWebhook(request: OpayWebhookRequest): Observable<OpayWebhookResponse>;

  opayLookUpWebhook(request: OpayWebhookRequest): Observable<OpayWebhookResponse>;

  listWithdrawals(request: ListWithdrawalRequests): Observable<ListWithdrawalRequestResponse>;

  listDeposits(request: ListDepositRequests): Observable<PaginationResponse>;

  userTransactions(request: UserTransactionRequest): Observable<UserTransactionResponse>;

  updateWithdrawal(request: UpdateWithdrawalRequest): Observable<UpdateWithdrawalResponse>;

  getPlayerWalletData(request: GetBalanceRequest): Observable<PlayerWalletData>;
}

export interface WalletServiceController {
  getBalance(request: GetBalanceRequest): Promise<WalletResponse> | Observable<WalletResponse> | WalletResponse;

  createWallet(request: CreateWalletRequest): Promise<WalletResponse> | Observable<WalletResponse> | WalletResponse;

  fetchBetRange(
    request: FetchBetRangeRequest,
  ): Promise<FetchBetRangeResponse> | Observable<FetchBetRangeResponse> | FetchBetRangeResponse;

  fetchPlayerDeposit(
    request: FetchPlayerDepositRequest,
  ): Promise<WalletResponse> | Observable<WalletResponse> | WalletResponse;

  fetchDepositRange(
    request: FetchDepositRangeRequest,
  ): Promise<FetchDepositRangeResponse> | Observable<FetchDepositRangeResponse> | FetchDepositRangeResponse;

  fetchDepositCount(
    request: FetchDepositCountRequest,
  ): Promise<FetchDepositCountResponse> | Observable<FetchDepositCountResponse> | FetchDepositCountResponse;

  creditUser(request: CreditUserRequest): Promise<WalletResponse> | Observable<WalletResponse> | WalletResponse;

  debitUser(request: DebitUserRequest): Promise<WalletResponse> | Observable<WalletResponse> | WalletResponse;

  inititateDeposit(
    request: InitiateDepositRequest,
  ): Promise<InitiateDepositResponse> | Observable<InitiateDepositResponse> | InitiateDepositResponse;

  verifyDeposit(
    request: VerifyDepositRequest,
  ): Promise<VerifyDepositResponse> | Observable<VerifyDepositResponse> | VerifyDepositResponse;

  requestWithdrawal(
    request: WithdrawRequest,
  ): Promise<WithdrawResponse> | Observable<WithdrawResponse> | WithdrawResponse;

  verifyBankAccount(
    request: VerifyBankAccountRequest,
  ): Promise<VerifyBankAccountResponse> | Observable<VerifyBankAccountResponse> | VerifyBankAccountResponse;

  getTransactions(
    request: GetTransactionRequest,
  ): Promise<GetTransactionResponse> | Observable<GetTransactionResponse> | GetTransactionResponse;

  getPaymentMethods(
    request: GetPaymentMethodRequest,
  ): Promise<GetPaymentMethodResponse> | Observable<GetPaymentMethodResponse> | GetPaymentMethodResponse;

  savePaymentMethod(
    request: PaymentMethodRequest,
  ): Promise<PaymentMethodResponse> | Observable<PaymentMethodResponse> | PaymentMethodResponse;

  paystackWebhook(
    request: PaystackWebhookRequest,
  ): Promise<WebhookResponse> | Observable<WebhookResponse> | WebhookResponse;

  monnifyWebhook(
    request: MonnifyWebhookRequest,
  ): Promise<WebhookResponse> | Observable<WebhookResponse> | WebhookResponse;

  opayDepositWebhook(
    request: OpayWebhookRequest,
  ): Promise<OpayWebhookResponse> | Observable<OpayWebhookResponse> | OpayWebhookResponse;

  opayLookUpWebhook(
    request: OpayWebhookRequest,
  ): Promise<OpayWebhookResponse> | Observable<OpayWebhookResponse> | OpayWebhookResponse;

  listWithdrawals(
    request: ListWithdrawalRequests,
  ): Promise<ListWithdrawalRequestResponse> | Observable<ListWithdrawalRequestResponse> | ListWithdrawalRequestResponse;

  listDeposits(
    request: ListDepositRequests,
  ): Promise<PaginationResponse> | Observable<PaginationResponse> | PaginationResponse;

  userTransactions(
    request: UserTransactionRequest,
  ): Promise<UserTransactionResponse> | Observable<UserTransactionResponse> | UserTransactionResponse;

  updateWithdrawal(
    request: UpdateWithdrawalRequest,
  ): Promise<UpdateWithdrawalResponse> | Observable<UpdateWithdrawalResponse> | UpdateWithdrawalResponse;

  getPlayerWalletData(
    request: GetBalanceRequest,
  ): Promise<PlayerWalletData> | Observable<PlayerWalletData> | PlayerWalletData;
}

export function WalletServiceControllerMethods() {
  return function (constructor: Function) {
    const grpcMethods: string[] = [
      "getBalance",
      "createWallet",
      "fetchBetRange",
      "fetchPlayerDeposit",
      "fetchDepositRange",
      "fetchDepositCount",
      "creditUser",
      "debitUser",
      "inititateDeposit",
      "verifyDeposit",
      "requestWithdrawal",
      "verifyBankAccount",
      "getTransactions",
      "getPaymentMethods",
      "savePaymentMethod",
      "paystackWebhook",
      "monnifyWebhook",
      "opayDepositWebhook",
      "opayLookUpWebhook",
      "listWithdrawals",
      "listDeposits",
      "userTransactions",
      "updateWithdrawal",
      "getPlayerWalletData",
    ];
    for (const method of grpcMethods) {
      const descriptor: any = Reflect.getOwnPropertyDescriptor(constructor.prototype, method);
      GrpcMethod("WalletService", method)(constructor.prototype[method], method, descriptor);
    }
    const grpcStreamMethods: string[] = [];
    for (const method of grpcStreamMethods) {
      const descriptor: any = Reflect.getOwnPropertyDescriptor(constructor.prototype, method);
      GrpcStreamMethod("WalletService", method)(constructor.prototype[method], method, descriptor);
    }
  };
}

export const WALLET_SERVICE_NAME = "WalletService";
