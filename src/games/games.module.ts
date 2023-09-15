import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from 'src/entities/game.entity';
import { Provider } from 'src/entities/provider.entity';
import { EntityToProtoService } from 'src/services/entity-to-proto.service';

@Module({
  imports: [TypeOrmModule.forFeature([Game, Provider])],
  controllers: [GamesController],
  providers: [GamesService, EntityToProtoService],
})
export class GamesModule {}
