import { Module } from '@nestjs/common';
import { GamesModule } from './games/games.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from '../db/data-source';
import { CacheModule } from '@nestjs/cache-manager';
import { BetModule } from './bet/bet.module';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    GamesModule,
    BetModule,
    // WalletModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
