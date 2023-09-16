import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from 'src/entities/game.entity';
import { Provider } from 'src/entities/provider.entity';
import { EntityToProtoService } from 'src/services/entity-to-proto.service';
import { ShackEvolutionService } from 'src/services';

@Module({
  imports: [TypeOrmModule.forFeature([Game, Provider]), HttpModule],
  controllers: [GamesController],
  providers: [GamesService, EntityToProtoService, ShackEvolutionService],
})
export class GamesModule {}
