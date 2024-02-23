/* eslint-disable */
import { GrpcMethod, GrpcStreamMethod } from "@nestjs/microservices";
import { Observable } from "rxjs";

export const protobufPackage = "wallet";

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

export interface WebhookRequest {
  clientId: number;
  transactionRef: string;
  paymentChannel: string;
  paymentStatus: string;
}

export interface WebhookResponse {
  success: boolean;
  status: number;
  message: string;
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
  accountNumber: string;
  bankCode: string;
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

export const WALLET_PACKAGE_NAME = "wallet";

export interface WalletServiceClient {
  createWallet(request: CreateWalletRequest): Observable<WalletResponse>;

  getBalance(request: GetBalanceRequest): Observable<WalletResponse>;

  creditUser(request: CreditUserRequest): Observable<WalletResponse>;

  debitUser(request: DebitUserRequest): Observable<WalletResponse>;

  inititateDeposit(request: InitiateDepositRequest): Observable<InitiateDepositResponse>;

  verifyDeposit(request: VerifyDepositRequest): Observable<VerifyDepositResponse>;

  paymentWebhook(request: WebhookRequest): Observable<WebhookResponse>;

  withdraw(request: WithdrawRequest): Observable<WithdrawResponse>;

  verifyBankAccount(request: VerifyBankAccountRequest): Observable<VerifyBankAccountResponse>;

  getTransactions(request: GetTransactionRequest): Observable<GetTransactionResponse>;

  getPaymentMethods(request: GetPaymentMethodRequest): Observable<GetPaymentMethodResponse>;

  savePaymentMethod(request: PaymentMethodRequest): Observable<PaymentMethodResponse>;
}

export interface WalletServiceController {
  createWallet(request: CreateWalletRequest): Promise<WalletResponse> | Observable<WalletResponse> | WalletResponse;

  getBalance(request: GetBalanceRequest): Promise<WalletResponse> | Observable<WalletResponse> | WalletResponse;

  creditUser(request: CreditUserRequest): Promise<WalletResponse> | Observable<WalletResponse> | WalletResponse;

  debitUser(request: DebitUserRequest): Promise<WalletResponse> | Observable<WalletResponse> | WalletResponse;

  inititateDeposit(
    request: InitiateDepositRequest,
  ): Promise<InitiateDepositResponse> | Observable<InitiateDepositResponse> | InitiateDepositResponse;

  verifyDeposit(
    request: VerifyDepositRequest,
  ): Promise<VerifyDepositResponse> | Observable<VerifyDepositResponse> | VerifyDepositResponse;

  paymentWebhook(request: WebhookRequest): Promise<WebhookResponse> | Observable<WebhookResponse> | WebhookResponse;

  withdraw(request: WithdrawRequest): Promise<WithdrawResponse> | Observable<WithdrawResponse> | WithdrawResponse;

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
}

export function WalletServiceControllerMethods() {
  return function (constructor: Function) {
    const grpcMethods: string[] = [
      "createWallet",
      "getBalance",
      "creditUser",
      "debitUser",
      "inititateDeposit",
      "verifyDeposit",
      "paymentWebhook",
      "withdraw",
      "verifyBankAccount",
      "getTransactions",
      "getPaymentMethods",
      "savePaymentMethod",
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
