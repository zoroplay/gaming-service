import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { ShackEvolutionService } from '../services';

@Module({
  controllers: [GamesController],
  providers: [GamesService, ShackEvolutionService],
})
export class GamesModule {}
