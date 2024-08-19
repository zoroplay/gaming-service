/* eslint-disable */
import { GrpcMethod, GrpcStreamMethod } from "@nestjs/microservices";
import { wrappers } from "protobufjs";
import { Observable } from "rxjs";
import { Struct } from "./google/protobuf/struct.pb";

export const protobufPackage = "wallet";

export interface PawapayToolkitRequest {
  action: string;
}

export interface PawapayPredCorrRequest {
  phoneNumber: string;
}

export interface CreatePawapayRequest {
  userId: number;
  clientId: number;
  source: string;
  amount: number;
  action: string;
  depositId?: string | undefined;
}

export interface CreateBulkPawapayRequest {
  userId: number;
  clientId: number;
  source: string;
  amount: number[];
}

export interface FetchPawapayRequest {
  action: string;
  actionId: string;
}

export interface PawapayCountryRequest {
  country: string;
}

export interface FetchLastApprovedRequest {
  branchId: number;
  clientId: number;
}

export interface FetchSalesReportRequest {
  branchId: number;
  clientId: number;
  status: number;
}

export interface LastApprovedResponse {
  success: boolean;
  status: number;
  message: string;
  data?: LastApproved | undefined;
}

export interface SalesReportResponseArray {
  success: boolean;
  status: number;
  message: string;
  data: LastApproved[];
}

export interface LastApprovedResponseObj {
  success: boolean;
  status: number;
  message: string;
  data?: LastApproved | undefined;
}

export interface LastApproved {
  id: number;
  branchId: number;
  openingBalance: number;
  closingBalance: number;
  onlinePayouts: number;
  onlineSales: number;
  normalSales: number;
  normalPayouts: number;
  otherSales: number;
  otherPayouts: number;
  cashin: number;
  cashout: number;
  expenses: number;
  status: number;
  date: string;
  createdAt: string;
  clientId: number;
}

export interface FetchReportRequest {
  clientId: number;
  userId: number;
  date: string;
}

export interface HandleReportRequest {
  branchId: number;
  openingBalance: number;
  closingBalance: number;
  onlinePayouts: number;
  onlineSales: number;
  normalSales: number;
  normalPayouts: number;
  otherPayouts: number;
  otherSales: number;
  cashin: number;
  cashout: number;
  expenses: number;
  date: string;
  clientId: number;
}

export interface FetchReportResponse {
  success: boolean;
  status: number;
  message: string;
  data?: { [key: string]: any } | undefined;
}

export interface GetTransactionsRequest {
  clientId: number;
  from: string;
  to: string;
  transactionType?: string | undefined;
  referenceNo?: string | undefined;
  username?: string | undefined;
  keyword?: string | undefined;
  limit?: number | undefined;
  page: number;
}

export interface ProcessRetailTransaction {
  id: number;
  clientId: number;
  userId: number;
  username?: string | undefined;
  amount?: number | undefined;
  withdrawalCharge?: number | undefined;
  userRole?: string | undefined;
}

export interface WalletTransferRequest {
  clientId: number;
  toUserId: number;
  toUsername: string;
  fromUsername: string;
  fromUserId: number;
  amount: number;
  description?: string | undefined;
  action: string;
}

export interface ValidateTransactionRequest {
  clientId: number;
  userId: number;
  code: string;
  userRole?: string | undefined;
}

export interface EmptyRequest {
}

export interface BranchRequest {
  clientId: number;
  branchId: number;
  date?: string | undefined;
}

export interface CashbookIdRequest {
  id: number;
  clientId: number;
}

export interface IdRequest {
  id: number;
}

export interface CashbookApproveExpenseRequest {
  status: number;
  verifiedBy: number;
  amount: number;
  expenseId: number;
  comment: string;
}

export interface CashbookCreateExpenseRequest {
  amount: number;
  expenseTypeId: number;
  branchId: number;
  comment: string;
  id?: number | undefined;
  clientId: number;
}

export interface ExpenseSingleResponse {
  success: boolean;
  status: number;
  message: string;
  data?: Expense | undefined;
}

export interface ExpenseRepeatedResponse {
  success: boolean;
  status: number;
  message: string;
  data: Expense[];
}

export interface Expense {
  id: number;
  userId: number;
  expenseTypeId: number;
  requestedAmount: number;
  amount: number;
  status: number;
  branchComment: string;
  adminComment: string;
  verifiedAt: string;
  verifiedBy: number;
  createdAt: string;
  balance?: number | undefined;
  expenseType?: string | undefined;
}

export interface CashbookApproveCashInOutRequest {
  status: number;
  id: number;
  verifiedBy: number;
}

export interface CashbookCreateCashInOutRequest {
  userId: number;
  branchId: number;
  amount: number;
  comment: string;
  id?: number | undefined;
  clientId: number;
}

export interface CashInOutSingleResponse {
  success: boolean;
  status: number;
  message: string;
  data?: CashInOut | undefined;
}

export interface CashInOutRepeatedResponse {
  success: boolean;
  status: number;
  message: string;
  data: CashInOut[];
}

export interface CashInOut {
  id: number;
  userId: number;
  approvedBy: number;
  branchId: number;
  amount: number;
  comment: string;
  status: number;
  createdAt: string;
  balance?: number | undefined;
}

export interface CashbookCreateExpenseTypeRequest {
  title: string;
  fixed: number;
  amount: number;
}

export interface ExpenseTypeSingleResponse {
  success: boolean;
  status: number;
  message: string;
  data?: ExpenseType | undefined;
}

export interface ExpenseTypeRepeatedResponse {
  success: boolean;
  status: number;
  message: string;
  data: ExpenseType[];
}

export interface ExpenseType {
  id: number;
  title: string;
  amount: number;
  createdAt: string;
  status: number;
  fixed: number;
}

export interface GetUserAccountsResponse {
  data: GetUserAccountsResponse_BankAccount[];
}

export interface GetUserAccountsResponse_BankAccount {
  bankCode: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
}

export interface GetNetworkBalanceRequest {
  agentId: number;
  userIds: string;
  clientId: number;
}

export interface GetNetworkBalanceResponse {
  success: boolean;
  message: string;
  networkBalance: number;
  networkTrustBalance: number;
  trustBalance?: number | undefined;
  availableBalance?: number | undefined;
  balance?: number | undefined;
}

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
  wallet?: string | undefined;
}

/** credit user request payload */
export interface CreditUserRequest {
  userId: number;
  clientId: number;
  amount: string;
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
  amount: string;
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
  data: { [key: string]: any }[];
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
  page?: number | undefined;
  limit?: number | undefined;
}

export interface UserTransactionResponse {
  success: boolean;
  message: string;
  data: TransactionData[];
  meta?: MetaData | undefined;
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
  wallet: string;
}

export interface UpdateWithdrawalRequest {
  clientId: number;
  withdrawalId: number;
  action: string;
  comment: string;
  updatedBy: string;
}

export interface CommonResponseObj {
  success: boolean;
  message: string;
  status: number;
  data?: { [key: string]: any } | undefined;
}

export interface CommonResponseArray {
  success: boolean;
  message: string;
  status: number;
  data: { [key: string]: any }[];
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
  data: { [key: string]: any }[];
}

export interface MetaData {
  page: number;
  perPage: number;
  total: number;
  lastPage: number;
  nextPage: number;
  prevPage: number;
}

export const WALLET_PACKAGE_NAME = "wallet";

wrappers[".google.protobuf.Struct"] = { fromObject: Struct.wrap, toObject: Struct.unwrap } as any;

export interface WalletServiceClient {
  cashbookVerifyFinalTransaction(request: FetchLastApprovedRequest): Observable<CommonResponseObj>;

  cashbookFetchLastApproved(request: FetchLastApprovedRequest): Observable<LastApprovedResponse>;

  cashbookFetchSalesReport(request: FetchSalesReportRequest): Observable<SalesReportResponseArray>;

  cashbookFetchReport(request: FetchReportRequest): Observable<FetchReportResponse>;

  cashbookHandleReport(request: HandleReportRequest): Observable<LastApprovedResponseObj>;

  cashbookApproveExpense(request: CashbookApproveExpenseRequest): Observable<ExpenseSingleResponse>;

  cashbookCreateExpense(request: CashbookCreateExpenseRequest): Observable<ExpenseSingleResponse>;

  cashbookFindAllExpense(request: EmptyRequest): Observable<ExpenseRepeatedResponse>;

  cashbookFindOneExpense(request: CashbookIdRequest): Observable<ExpenseSingleResponse>;

  cashbookDeleteOneExpense(request: CashbookIdRequest): Observable<ExpenseSingleResponse>;

  cashbookUpdateOneExpense(request: CashbookCreateExpenseRequest): Observable<ExpenseSingleResponse>;

  cashbookFindAllBranchExpense(request: BranchRequest): Observable<ExpenseRepeatedResponse>;

  cashbookCreateExpenseType(request: CashbookCreateExpenseTypeRequest): Observable<ExpenseTypeSingleResponse>;

  cashbookFindAllExpenseType(request: EmptyRequest): Observable<ExpenseTypeRepeatedResponse>;

  cashbookApproveCashIn(request: CashbookApproveCashInOutRequest): Observable<CashInOutSingleResponse>;

  cashbookCreateCashIn(request: CashbookCreateCashInOutRequest): Observable<CashInOutSingleResponse>;

  cashbookUpdateCashIn(request: CashbookCreateCashInOutRequest): Observable<CashInOutSingleResponse>;

  cashbookDeleteOneCashIn(request: CashbookIdRequest): Observable<CashInOutSingleResponse>;

  cashbookFindOneCashIn(request: CashbookIdRequest): Observable<CashInOutSingleResponse>;

  cashbookFindAllCashIn(request: EmptyRequest): Observable<CashInOutRepeatedResponse>;

  cashbookFindAllBranchCashIn(request: BranchRequest): Observable<CashInOutRepeatedResponse>;

  findAllBranchApprovedCashinWDate(request: BranchRequest): Observable<CashInOutRepeatedResponse>;

  findAllBranchPendingCashinWDate(request: BranchRequest): Observable<CashInOutRepeatedResponse>;

  cashbookApproveCashOut(request: CashbookApproveCashInOutRequest): Observable<CashInOutSingleResponse>;

  cashbookCreateCashOut(request: CashbookCreateCashInOutRequest): Observable<CashInOutSingleResponse>;

  cashbookUpdateCashOut(request: CashbookCreateCashInOutRequest): Observable<CashInOutSingleResponse>;

  cashbookDeleteOneCashOut(request: CashbookIdRequest): Observable<CashInOutSingleResponse>;

  cashbookFindOneCashOut(request: CashbookIdRequest): Observable<CashInOutSingleResponse>;

  cashbookFindAllCashOut(request: EmptyRequest): Observable<CashInOutRepeatedResponse>;

  cashbookFindAllBranchCashOut(request: BranchRequest): Observable<CashInOutRepeatedResponse>;

  handleCreatePawaPay(request: CreatePawapayRequest): Observable<CommonResponseObj>;

  handleCreateBulkPawaPay(request: CreateBulkPawapayRequest): Observable<CommonResponseArray>;

  handleFetchPawaPay(request: FetchPawapayRequest): Observable<CommonResponseArray>;

  handlePawaPayResendCallback(request: FetchPawapayRequest): Observable<CommonResponseObj>;

  handlePawaPayBalances(request: EmptyRequest): Observable<CommonResponseArray>;

  handlePawaPayCountryBalances(request: PawapayCountryRequest): Observable<CommonResponseArray>;

  handlePawaPayPredCorr(request: PawapayPredCorrRequest): Observable<CommonResponseObj>;

  handlePawaPayToolkit(request: PawapayToolkitRequest): Observable<CommonResponseArray>;

  handlePawaPayActiveConf(request: EmptyRequest): Observable<CommonResponseObj>;

  getBalance(request: GetBalanceRequest): Observable<WalletResponse>;

  createWallet(request: CreateWalletRequest): Observable<WalletResponse>;

  fetchBetRange(request: FetchBetRangeRequest): Observable<FetchBetRangeResponse>;

  fetchPlayerDeposit(request: FetchPlayerDepositRequest): Observable<WalletResponse>;

  fetchDepositRange(request: FetchDepositRangeRequest): Observable<FetchDepositRangeResponse>;

  fetchDepositCount(request: FetchDepositCountRequest): Observable<FetchDepositCountResponse>;

  creditUser(request: CreditUserRequest): Observable<WalletResponse>;

  awardBonusWinning(request: CreditUserRequest): Observable<WalletResponse>;

  debitUser(request: DebitUserRequest): Observable<WalletResponse>;

  inititateDeposit(request: InitiateDepositRequest): Observable<InitiateDepositResponse>;

  verifyDeposit(request: VerifyDepositRequest): Observable<VerifyDepositResponse>;

  requestWithdrawal(request: WithdrawRequest): Observable<WithdrawResponse>;

  verifyBankAccount(request: VerifyBankAccountRequest): Observable<VerifyBankAccountResponse>;

  listBanks(request: EmptyRequest): Observable<CommonResponseArray>;

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

  updateWithdrawal(request: UpdateWithdrawalRequest): Observable<CommonResponseObj>;

  getPlayerWalletData(request: GetBalanceRequest): Observable<PlayerWalletData>;

  deletePlayerData(request: IdRequest): Observable<CommonResponseObj>;

  getUserAccounts(request: GetBalanceRequest): Observable<GetUserAccountsResponse>;

  getNetworkBalance(request: GetNetworkBalanceRequest): Observable<GetNetworkBalanceResponse>;

  getMoneyTransaction(request: GetTransactionsRequest): Observable<CommonResponseObj>;

  getSystemTransaction(request: GetTransactionsRequest): Observable<CommonResponseObj>;

  /** RETAIL SERVICES */

  walletTransfer(request: WalletTransferRequest): Observable<CommonResponseObj>;

  validateDepositCode(request: ValidateTransactionRequest): Observable<CommonResponseObj>;

  processShopDeposit(request: ProcessRetailTransaction): Observable<CommonResponseObj>;

  validateWithdrawalCode(request: ValidateTransactionRequest): Observable<CommonResponseObj>;

  processShopWithdrawal(request: ProcessRetailTransaction): Observable<CommonResponseObj>;

  debitAgentBalance(request: DebitUserRequest): Observable<CommonResponseObj>;
}

export interface WalletServiceController {
  cashbookVerifyFinalTransaction(
    request: FetchLastApprovedRequest,
  ): Promise<CommonResponseObj> | Observable<CommonResponseObj> | CommonResponseObj;

  cashbookFetchLastApproved(
    request: FetchLastApprovedRequest,
  ): Promise<LastApprovedResponse> | Observable<LastApprovedResponse> | LastApprovedResponse;

  cashbookFetchSalesReport(
    request: FetchSalesReportRequest,
  ): Promise<SalesReportResponseArray> | Observable<SalesReportResponseArray> | SalesReportResponseArray;

  cashbookFetchReport(
    request: FetchReportRequest,
  ): Promise<FetchReportResponse> | Observable<FetchReportResponse> | FetchReportResponse;

  cashbookHandleReport(
    request: HandleReportRequest,
  ): Promise<LastApprovedResponseObj> | Observable<LastApprovedResponseObj> | LastApprovedResponseObj;

  cashbookApproveExpense(
    request: CashbookApproveExpenseRequest,
  ): Promise<ExpenseSingleResponse> | Observable<ExpenseSingleResponse> | ExpenseSingleResponse;

  cashbookCreateExpense(
    request: CashbookCreateExpenseRequest,
  ): Promise<ExpenseSingleResponse> | Observable<ExpenseSingleResponse> | ExpenseSingleResponse;

  cashbookFindAllExpense(
    request: EmptyRequest,
  ): Promise<ExpenseRepeatedResponse> | Observable<ExpenseRepeatedResponse> | ExpenseRepeatedResponse;

  cashbookFindOneExpense(
    request: CashbookIdRequest,
  ): Promise<ExpenseSingleResponse> | Observable<ExpenseSingleResponse> | ExpenseSingleResponse;

  cashbookDeleteOneExpense(
    request: CashbookIdRequest,
  ): Promise<ExpenseSingleResponse> | Observable<ExpenseSingleResponse> | ExpenseSingleResponse;

  cashbookUpdateOneExpense(
    request: CashbookCreateExpenseRequest,
  ): Promise<ExpenseSingleResponse> | Observable<ExpenseSingleResponse> | ExpenseSingleResponse;

  cashbookFindAllBranchExpense(
    request: BranchRequest,
  ): Promise<ExpenseRepeatedResponse> | Observable<ExpenseRepeatedResponse> | ExpenseRepeatedResponse;

  cashbookCreateExpenseType(
    request: CashbookCreateExpenseTypeRequest,
  ): Promise<ExpenseTypeSingleResponse> | Observable<ExpenseTypeSingleResponse> | ExpenseTypeSingleResponse;

  cashbookFindAllExpenseType(
    request: EmptyRequest,
  ): Promise<ExpenseTypeRepeatedResponse> | Observable<ExpenseTypeRepeatedResponse> | ExpenseTypeRepeatedResponse;

  cashbookApproveCashIn(
    request: CashbookApproveCashInOutRequest,
  ): Promise<CashInOutSingleResponse> | Observable<CashInOutSingleResponse> | CashInOutSingleResponse;

  cashbookCreateCashIn(
    request: CashbookCreateCashInOutRequest,
  ): Promise<CashInOutSingleResponse> | Observable<CashInOutSingleResponse> | CashInOutSingleResponse;

  cashbookUpdateCashIn(
    request: CashbookCreateCashInOutRequest,
  ): Promise<CashInOutSingleResponse> | Observable<CashInOutSingleResponse> | CashInOutSingleResponse;

  cashbookDeleteOneCashIn(
    request: CashbookIdRequest,
  ): Promise<CashInOutSingleResponse> | Observable<CashInOutSingleResponse> | CashInOutSingleResponse;

  cashbookFindOneCashIn(
    request: CashbookIdRequest,
  ): Promise<CashInOutSingleResponse> | Observable<CashInOutSingleResponse> | CashInOutSingleResponse;

  cashbookFindAllCashIn(
    request: EmptyRequest,
  ): Promise<CashInOutRepeatedResponse> | Observable<CashInOutRepeatedResponse> | CashInOutRepeatedResponse;

  cashbookFindAllBranchCashIn(
    request: BranchRequest,
  ): Promise<CashInOutRepeatedResponse> | Observable<CashInOutRepeatedResponse> | CashInOutRepeatedResponse;

  findAllBranchApprovedCashinWDate(
    request: BranchRequest,
  ): Promise<CashInOutRepeatedResponse> | Observable<CashInOutRepeatedResponse> | CashInOutRepeatedResponse;

  findAllBranchPendingCashinWDate(
    request: BranchRequest,
  ): Promise<CashInOutRepeatedResponse> | Observable<CashInOutRepeatedResponse> | CashInOutRepeatedResponse;

  cashbookApproveCashOut(
    request: CashbookApproveCashInOutRequest,
  ): Promise<CashInOutSingleResponse> | Observable<CashInOutSingleResponse> | CashInOutSingleResponse;

  cashbookCreateCashOut(
    request: CashbookCreateCashInOutRequest,
  ): Promise<CashInOutSingleResponse> | Observable<CashInOutSingleResponse> | CashInOutSingleResponse;

  cashbookUpdateCashOut(
    request: CashbookCreateCashInOutRequest,
  ): Promise<CashInOutSingleResponse> | Observable<CashInOutSingleResponse> | CashInOutSingleResponse;

  cashbookDeleteOneCashOut(
    request: CashbookIdRequest,
  ): Promise<CashInOutSingleResponse> | Observable<CashInOutSingleResponse> | CashInOutSingleResponse;

  cashbookFindOneCashOut(
    request: CashbookIdRequest,
  ): Promise<CashInOutSingleResponse> | Observable<CashInOutSingleResponse> | CashInOutSingleResponse;

  cashbookFindAllCashOut(
    request: EmptyRequest,
  ): Promise<CashInOutRepeatedResponse> | Observable<CashInOutRepeatedResponse> | CashInOutRepeatedResponse;

  cashbookFindAllBranchCashOut(
    request: BranchRequest,
  ): Promise<CashInOutRepeatedResponse> | Observable<CashInOutRepeatedResponse> | CashInOutRepeatedResponse;

  handleCreatePawaPay(
    request: CreatePawapayRequest,
  ): Promise<CommonResponseObj> | Observable<CommonResponseObj> | CommonResponseObj;

  handleCreateBulkPawaPay(
    request: CreateBulkPawapayRequest,
  ): Promise<CommonResponseArray> | Observable<CommonResponseArray> | CommonResponseArray;

  handleFetchPawaPay(
    request: FetchPawapayRequest,
  ): Promise<CommonResponseArray> | Observable<CommonResponseArray> | CommonResponseArray;

  handlePawaPayResendCallback(
    request: FetchPawapayRequest,
  ): Promise<CommonResponseObj> | Observable<CommonResponseObj> | CommonResponseObj;

  handlePawaPayBalances(
    request: EmptyRequest,
  ): Promise<CommonResponseArray> | Observable<CommonResponseArray> | CommonResponseArray;

  handlePawaPayCountryBalances(
    request: PawapayCountryRequest,
  ): Promise<CommonResponseArray> | Observable<CommonResponseArray> | CommonResponseArray;

  handlePawaPayPredCorr(
    request: PawapayPredCorrRequest,
  ): Promise<CommonResponseObj> | Observable<CommonResponseObj> | CommonResponseObj;

  handlePawaPayToolkit(
    request: PawapayToolkitRequest,
  ): Promise<CommonResponseArray> | Observable<CommonResponseArray> | CommonResponseArray;

  handlePawaPayActiveConf(
    request: EmptyRequest,
  ): Promise<CommonResponseObj> | Observable<CommonResponseObj> | CommonResponseObj;

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

  awardBonusWinning(request: CreditUserRequest): Promise<WalletResponse> | Observable<WalletResponse> | WalletResponse;

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

  listBanks(
    request: EmptyRequest,
  ): Promise<CommonResponseArray> | Observable<CommonResponseArray> | CommonResponseArray;

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
  ): Promise<CommonResponseObj> | Observable<CommonResponseObj> | CommonResponseObj;

  getPlayerWalletData(
    request: GetBalanceRequest,
  ): Promise<PlayerWalletData> | Observable<PlayerWalletData> | PlayerWalletData;

  deletePlayerData(request: IdRequest): Promise<CommonResponseObj> | Observable<CommonResponseObj> | CommonResponseObj;

  getUserAccounts(
    request: GetBalanceRequest,
  ): Promise<GetUserAccountsResponse> | Observable<GetUserAccountsResponse> | GetUserAccountsResponse;

  getNetworkBalance(
    request: GetNetworkBalanceRequest,
  ): Promise<GetNetworkBalanceResponse> | Observable<GetNetworkBalanceResponse> | GetNetworkBalanceResponse;

  getMoneyTransaction(
    request: GetTransactionsRequest,
  ): Promise<CommonResponseObj> | Observable<CommonResponseObj> | CommonResponseObj;

  getSystemTransaction(
    request: GetTransactionsRequest,
  ): Promise<CommonResponseObj> | Observable<CommonResponseObj> | CommonResponseObj;

  /** RETAIL SERVICES */

  walletTransfer(
    request: WalletTransferRequest,
  ): Promise<CommonResponseObj> | Observable<CommonResponseObj> | CommonResponseObj;

  validateDepositCode(
    request: ValidateTransactionRequest,
  ): Promise<CommonResponseObj> | Observable<CommonResponseObj> | CommonResponseObj;

  processShopDeposit(
    request: ProcessRetailTransaction,
  ): Promise<CommonResponseObj> | Observable<CommonResponseObj> | CommonResponseObj;

  validateWithdrawalCode(
    request: ValidateTransactionRequest,
  ): Promise<CommonResponseObj> | Observable<CommonResponseObj> | CommonResponseObj;

  processShopWithdrawal(
    request: ProcessRetailTransaction,
  ): Promise<CommonResponseObj> | Observable<CommonResponseObj> | CommonResponseObj;

  debitAgentBalance(
    request: DebitUserRequest,
  ): Promise<CommonResponseObj> | Observable<CommonResponseObj> | CommonResponseObj;
}

export function WalletServiceControllerMethods() {
  return function (constructor: Function) {
    const grpcMethods: string[] = [
      "cashbookVerifyFinalTransaction",
      "cashbookFetchLastApproved",
      "cashbookFetchSalesReport",
      "cashbookFetchReport",
      "cashbookHandleReport",
      "cashbookApproveExpense",
      "cashbookCreateExpense",
      "cashbookFindAllExpense",
      "cashbookFindOneExpense",
      "cashbookDeleteOneExpense",
      "cashbookUpdateOneExpense",
      "cashbookFindAllBranchExpense",
      "cashbookCreateExpenseType",
      "cashbookFindAllExpenseType",
      "cashbookApproveCashIn",
      "cashbookCreateCashIn",
      "cashbookUpdateCashIn",
      "cashbookDeleteOneCashIn",
      "cashbookFindOneCashIn",
      "cashbookFindAllCashIn",
      "cashbookFindAllBranchCashIn",
      "findAllBranchApprovedCashinWDate",
      "findAllBranchPendingCashinWDate",
      "cashbookApproveCashOut",
      "cashbookCreateCashOut",
      "cashbookUpdateCashOut",
      "cashbookDeleteOneCashOut",
      "cashbookFindOneCashOut",
      "cashbookFindAllCashOut",
      "cashbookFindAllBranchCashOut",
      "handleCreatePawaPay",
      "handleCreateBulkPawaPay",
      "handleFetchPawaPay",
      "handlePawaPayResendCallback",
      "handlePawaPayBalances",
      "handlePawaPayCountryBalances",
      "handlePawaPayPredCorr",
      "handlePawaPayToolkit",
      "handlePawaPayActiveConf",
      "getBalance",
      "createWallet",
      "fetchBetRange",
      "fetchPlayerDeposit",
      "fetchDepositRange",
      "fetchDepositCount",
      "creditUser",
      "awardBonusWinning",
      "debitUser",
      "inititateDeposit",
      "verifyDeposit",
      "requestWithdrawal",
      "verifyBankAccount",
      "listBanks",
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
      "deletePlayerData",
      "getUserAccounts",
      "getNetworkBalance",
      "getMoneyTransaction",
      "getSystemTransaction",
      "walletTransfer",
      "validateDepositCode",
      "processShopDeposit",
      "validateWithdrawalCode",
      "processShopWithdrawal",
      "debitAgentBalance",
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
