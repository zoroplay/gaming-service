import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Provider } from './provider.entity';

@Entity({ name: 'games' })
export class Game {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  gameId: string;

  @Column({ length: 255 })
  title: string;

  @Column({ length: 150 })
  description: string;

  @Column({ nullable: true })
  url: string;

  @Column({ type: 'text', nullable: true })
  imagePath: string;

  @Column({ type: 'text', nullable: true })
  bannerPath: string;

  @Column({ default: 1 })
  status: boolean;

  @Column({ type: 'text', nullable: true })
  type: string;

  @ManyToOne(() => Provider, (provider) => provider.games)
  provider: Provider;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
