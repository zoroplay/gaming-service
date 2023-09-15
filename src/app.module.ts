import { Module } from '@nestjs/common';
import { GamesModule } from './games/games.module';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from '../db/data-source';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule,
    TypeOrmModule.forRoot(dataSourceOptions),
    GamesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
