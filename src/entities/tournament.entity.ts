import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { TournamentGame } from "./tournament-game.entity";

@Entity({ name: 'tournaments' })
export class Tournament {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'varchar' })
  imageUrl: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  startDate: string | null;

  @Column({ nullable: true })
  categoryId: number | null;

  @Column({ type: 'text', nullable: true })
  endDate: string | null;

  @Column({ type: 'varchar', nullable: true })
  type: string;

  @OneToMany(() => TournamentGame, (tournamentGame) => tournamentGame.tournament)
  tournamentGames: TournamentGame[];

  @Column({ default: 'active' })
  status: string;

  @CreateDateColumn({ type: 'timestamp', nullable: true })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updated_at: Date;
}
