/* eslint-disable prettier/prettier */
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';


@Entity({ name: 'promotions' })
export class Promotion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text', nullable: true })
  imageUrl: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  clientId: string;

  @Column({ type: 'text', nullable: true })
  startDate: string | null;

  @Column({ type: 'text', nullable: true })
  endDate: string | null;

  @Column({ type: 'varchar', nullable: true })
  type: string;

  @Column({ type: 'text', nullable: true })
  targetUrl: string;

  @Column({ default: 'active' })
  status: string;

  @CreateDateColumn({ type: 'timestamp', nullable: true })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updated_at: Date;
}
