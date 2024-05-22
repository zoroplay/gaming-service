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
import { Bet, CallbackLog, Provider, Game } from 'src/entities';
import { WalletModule } from 'src/wallet/wallet.module';
import { BetModule } from 'src/bet/bet.module';
import { EvoPlayService } from 'src/services/evo-play.service';
import { VirtualController } from './virtual.controller';
import { VirtualService } from 'src/services/virtual.service';
import { IdentityModule } from 'src/identity/identity.module';
import { GameKey } from 'src/entities/game-key.entity';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register({
      ttl: 30 * 100000,
      max: 1000,
      isGlobal: true,
    }),
    TypeOrmModule.forFeature([Bet, Game, GameKey, CallbackLog, Provider]),
    HttpModule,
    IdentityModule,
    WalletModule,
    BetModule,
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
  ],
})
export class GamesModule {}
