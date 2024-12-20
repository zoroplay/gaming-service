import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntityToProtoService } from 'src/services/entity-to-proto.service';
import {
  C2GamingService,
  ShackEvolutionService,
  SmartSoftService,
  TadaGamingService,
} from 'src/services';
import { GameSession, CallbackLog, Provider, Game } from 'src/entities';
import { WalletModule } from 'src/wallet/wallet.module';
import { BetModule } from 'src/bet/bet.module';
import { EvoPlayService } from 'src/services/evo-play.service';
import { VirtualController } from './virtual.controller';
import { VirtualService } from 'src/services/virtual.service';
import { IdentityModule } from 'src/identity/identity.module';
import { GameKey } from 'src/entities/game-key.entity';
import { CacheModule } from '@nestjs/cache-manager';
import { Category } from 'src/entities/category.entity';
import { GameCategory } from 'src/entities/game.category.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { PragmaticService } from 'src/services/pragmatic-play.service';
import { CasinoGame } from 'src/entities/casino-game.entity';
import { Promotion } from 'src/entities/promotion.entity';

@Module({
  imports: [
    CacheModule.register({
      ttl: 30 * 100000,
      max: 1000,
      isGlobal: true,
    }),
    TypeOrmModule.forFeature([GameSession, CallbackLog, Category, Game, Promotion, GameCategory, GameKey, Provider, CasinoGame]),
    HttpModule,
    IdentityModule,
    WalletModule,
    BetModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [GamesController, VirtualController],
  providers: [
    GamesService,
    EntityToProtoService,
    ShackEvolutionService,
    C2GamingService,
    TadaGamingService,
    SmartSoftService,
    EvoPlayService,
    VirtualService,
    PragmaticService
  ],
})
export class GamesModule {}
