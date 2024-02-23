import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum BetStatus {
  PENDING = 'pending',
  WON = 'won',
  LOST = 'lost',
  CANCELLED = 'cancelled',
}

@Entity({ name: 'bets' })
export class Bet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  clientId: number;

  @Column()
  roundId: string;

  @Column()
  transactionId: string;

  @Column()
  gameId: string;

  @Column({
    type: 'enum',
    enum: BetStatus,
    default: BetStatus.PENDING,
  })
  status: string;

  @Column({ length: 255, nullable: true })
  stake: string;

  @Column({ type: 'timestamp' })
  winnings: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
