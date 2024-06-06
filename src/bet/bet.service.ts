import { Inject, Injectable } from '@nestjs/common';
import {
  BETTING_SERVICE_NAME,
  BettingServiceClient,
  CreditCasinoBetRequest,
  GetVirtualBetRequest,
  PlaceCasinoBetRequest,
  PlaceVirtualBetRequest,
  RollbackCasinoBetRequest,
  SettleVirtualBetRequest,
  protobufPackage,
} from '../proto/betting.pb';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

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

  public closeRound(data: CreditCasinoBetRequest) {
    return firstValueFrom(this.bettingService.closeCasinoRound(data));
  }

  public cancelCasinoBet(data: RollbackCasinoBetRequest) {
    return this.bettingService.cancelCasinoBet(data);
  }

  public placeVirtualBet(param: PlaceVirtualBetRequest) {
    // console.log('place virtual bet', param)
    return firstValueFrom(this.bettingService.placeVirtualBet(param));
  }

  public settleVirtualBet(param: SettleVirtualBetRequest) {
    return firstValueFrom(this.bettingService.settleVirtualBet(param));
  }

  public validateVirtualBet(param: GetVirtualBetRequest) {
    // console.log('check virtual bet', param)
    return firstValueFrom(this.bettingService.getVirtualBet(param));
  }
}
