import { Inject, Injectable } from '@nestjs/common';
import {
  DebitUserRequest,
  GetBalanceRequest,
  WALLET_SERVICE_NAME,
  WalletServiceClient,
  protobufPackage,
} from '../proto/wallet.pb';
import { ClientGrpc } from '@nestjs/microservices';

@Injectable()
export class WalletService {
  private svc: WalletServiceClient;

  @Inject(protobufPackage)
  private readonly client: ClientGrpc;

  public onModuleInit(): void {
    this.svc = this.client.getService<WalletServiceClient>(WALLET_SERVICE_NAME);
  }

  public getWallet(param: GetBalanceRequest) {
    return this.svc.getBalance(param);
  }

  public debit(data: DebitUserRequest) {
    return this.svc.debitUser(data);
  }

  public credit(data) {
    return this.svc.creditUser(data);
  }
}
