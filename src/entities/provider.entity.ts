import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Game } from './game.entity';

@Entity({ name: 'providers' })
export class Provider {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    unique: true,
  })
  slug: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column({ type: 'text', nullable: true })
  imagePath: string;

  @OneToMany(() => Game, (game) => game.provider)
  games: Game[];

  @Column({
    nullable: true,
  })
  parentProvider: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
