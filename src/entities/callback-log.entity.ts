import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'callback_logs' })
export class CallbackLog {
  @PrimaryGeneratedColumn('uuid')
  id: number;

  @Column()
  transactionId: string;

  @Column({ nullable: true })
  request_type: string;

  @Column({type: 'text'})
  payload: string;

  @Column({ type: 'text', nullable: true})
  response: string;

  @Column({ default: 0 })
  status: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
