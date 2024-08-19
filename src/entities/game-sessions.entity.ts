import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'game_sessions' })
export class GameSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  game_id: string;

  @Column({nullable: true, default: ''})
  session_id: string;

  @Column()
  token: string;

  @Column()
  provider: string;

  @Column()
  balance_type: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
