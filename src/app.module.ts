import { Module } from '@nestjs/common';
import { GamesModule } from './games/games.module';
import { TadaService } from './services/tada.service';
import { ShackEvolutionService } from './services/shack-evolution.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GamesModule,
    HttpModule,
  ],
  controllers: [],
  providers: [TadaService, ShackEvolutionService],
})
export class AppModule {}
