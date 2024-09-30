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

  @Column({nullable: true})
  callback_id: string;

  @Column({nullable: true})
  session_id: string;

  @Column({ type: 'int', nullable: true})
  bonus_id: number;

  @Column({nullable: true})
  token: string;

  @Column()
  provider: string;

  @Column({nullable: true})
  balance_type: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
