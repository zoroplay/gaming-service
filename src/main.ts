import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport } from '@nestjs/microservices';
import { join } from 'path';
import { INestMicroservice, ValidationPipe } from '@nestjs/common';
import { protobufPackage } from './proto/gaming.pb';
import { HttpExceptionFilter } from './common/filter/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app: INestMicroservice = await NestFactory.createMicroservice(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        url: process.env.GAMING_SERVICE_URL,
        package: protobufPackage,
        protoPath: join('node_modules/sbe-service-proto/proto/gaming.proto'),
      },
    },
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen();
}
bootstrap();
