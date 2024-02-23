import { Module } from '@nestjs/common';
import { BetService } from './bet.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { BETTING_PACKAGE_NAME, protobufPackage } from '../proto/betting.pb';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: protobufPackage,
        transport: Transport.GRPC,
        options: {
          url: process.env.BETTING_SERVICE_URI,
          package: BETTING_PACKAGE_NAME,
          protoPath: join('node_modules/sbe-service-proto/proto/betting.proto'),
        },
      },
    ]),
  ],
  providers: [BetService],
  exports: [BetService],
})
export class BetModule {}
