import {
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';
import { Game } from './game.entity';
import { Tournament } from './tournament.entity';

@Entity({ name: 'games_categories' })
export class TournamentGame {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Game, (game) => game.tournamentGames)
  @JoinColumn()
  game: Game;

  @ManyToOne(() => Tournament, (tournament) => tournament.tournamentGames)
  @JoinColumn()
  tournament: Tournament;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
