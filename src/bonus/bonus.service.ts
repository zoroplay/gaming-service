/* eslint-disable prettier/prettier */
import { Inject, Injectable } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AwardBonusRequest, BONUS_SERVICE_NAME, BonusServiceClient, CreateBonusRequest, DeleteBonusRequest, GetBonusRequest, protobufPackage } from 'src/proto/bonus.pb';


@Injectable()
export class BonusService {
  private svc: BonusServiceClient;

  @Inject(protobufPackage)
  private readonly client: ClientGrpc;

  public onModuleInit(): void {
    this.svc = this.client.getService<BonusServiceClient>(
      BONUS_SERVICE_NAME,
    );
  }

  createBonus(data: CreateBonusRequest) {
    return firstValueFrom(this.svc.createBonus(data));
  }

  getBonusDetails(data: GetBonusRequest) {
    return firstValueFrom(this.svc.getBonus(data));
  }

  awardBonus(data: AwardBonusRequest) {
    return firstValueFrom(this.svc.awardBonus(data));
  }a

  deleteBonus(data: DeleteBonusRequest) {
    return firstValueFrom(this.svc.deleteBonus(data));
  }

}
