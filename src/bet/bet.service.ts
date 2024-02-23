import { Inject, Injectable } from '@nestjs/common';
import {
  BETTING_SERVICE_NAME,
  BettingServiceClient,
  CreditCasinoBetRequest,
  PlaceCasinoBetRequest,
  RollbackCasinoBetRequest,
  protobufPackage,
} from '../proto/betting.pb';
import { ClientGrpc } from '@nestjs/microservices';

@Injectable()
export class BetService {
  private bettingService: BettingServiceClient;

  @Inject(protobufPackage)
  private readonly client: ClientGrpc;

  public onModuleInit(): void {
    this.bettingService =
      this.client.getService<BettingServiceClient>(BETTING_SERVICE_NAME);
  }

  public placeCasinoBet(param: PlaceCasinoBetRequest) {
    return this.bettingService.placeCasinoBet(param);
  }

  public settleCasinoBet(data: CreditCasinoBetRequest) {
    return this.bettingService.settleCasinoBet(data);
  }

  public cancelCasinoBet(data: RollbackCasinoBetRequest) {
    return this.bettingService.cancelCasinoBet(data);
  }
}
