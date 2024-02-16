import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from 'src/entities/game.entity';
import { Provider } from 'src/entities/provider.entity';
import { EntityToProtoService } from 'src/services/entity-to-proto.service';
import {
  C2GamingService,
  ShackEvolutionService,
  SmartSoftService,
  TadaGamingService,
} from 'src/services';

@Module({
  imports: [TypeOrmModule.forFeature([Game, Provider]), HttpModule],
  controllers: [GamesController],
  providers: [
    GamesService,
    EntityToProtoService,
    ShackEvolutionService,
    C2GamingService,
    TadaGamingService,
    SmartSoftService,
  ],
})
export class GamesModule {}
