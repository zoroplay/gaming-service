import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { TadaService, ShackEvolutionService } from '../services';

@Module({
  controllers: [GamesController],
  providers: [GamesService, TadaService, ShackEvolutionService],
})
export class GamesModule {}
