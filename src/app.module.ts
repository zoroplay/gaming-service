import { Module } from '@nestjs/common';
import { GamesModule } from './games/games.module';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from '../db/data-source';
import { Game } from './entities/game.entity';
import { Provider } from './entities/provider.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule,
    TypeOrmModule.forRoot(dataSourceOptions),
    TypeOrmModule.forFeature([Game, Provider]),
  ],
  controllers: [],
  providers: [GamesModule],
})
export class AppModule {}
