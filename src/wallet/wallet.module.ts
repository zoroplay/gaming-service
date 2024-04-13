import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WALLET_PACKAGE_NAME, protobufPackage } from '../proto/wallet.pb';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import 'dotenv/config';

console.log('wallet service', process.env.WALLET_SERVICE_URL)
@Module({
  imports: [
    ClientsModule.register([
      {
        name: protobufPackage,
        transport: Transport.GRPC,
        options: {
          url: process.env.WALLET_SERVICE_URL,
          package: WALLET_PACKAGE_NAME,
          protoPath: join('node_modules/sbe-service-proto/proto/wallet.proto'),
        },
      },
    ]),
  ],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
