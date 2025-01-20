/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { IDENTITY_PACKAGE_NAME, protobufPackage } from 'src/proto/identity.pb';
import { join } from 'path';
import 'dotenv/config'

@Module({
  imports: [
    ClientsModule.register([
      {
        name: protobufPackage,
        transport: Transport.GRPC,
        options: {
          url: process.env.IDENTITY_SERVICE_URL,
          package: IDENTITY_PACKAGE_NAME,
          protoPath: join('node_modules/sbe-service-proto/proto/identity.proto'),
        },
      },
    ]),
  ],
  providers: [IdentityService],
  exports: [IdentityService]
})
export class IdentityModule {}
