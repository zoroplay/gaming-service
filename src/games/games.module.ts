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
import { Bet, Player, Provider, Game } from 'src/entities';
import { WalletModule } from 'src/wallet/wallet.module';
import { BetModule } from 'src/bet/bet.module';
import { EvoPlayService } from 'src/services/evo-play.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bet, Game, Player, Provider]),
    HttpModule,
    WalletModule,
    BetModule,
  ],
  controllers: [GamesController],
  providers: [
    GamesService,
    EntityToProtoService,
    ShackEvolutionService,
    C2GamingService,
    TadaGamingService,
    SmartSoftService,
    EvoPlayService,
  ],
})
export class GamesModule {}
