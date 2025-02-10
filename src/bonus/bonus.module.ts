/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import 'dotenv/config'
import { BONUS_PACKAGE_NAME, protobufPackage } from 'src/proto/bonus.pb';
import { BonusService } from './bonus.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: protobufPackage,
        transport: Transport.GRPC,
        options: {
          url: process.env.BONUS_SERVICE_URL,
          package: BONUS_PACKAGE_NAME,
          protoPath: join('node_modules/sbe-service-proto/proto/bonus.proto'),
        },
      },
    ]),
  ],
  providers: [BonusService],
  exports: [BonusService]
})
export class BonusModule {}
