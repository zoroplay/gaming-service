import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Game } from './game.entity';
import { GameCategory } from './game.category.entity';

@Entity({ name: 'categories' })
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  client_id: number;

  @Column({type: 'varchar'})
  name: string;

  @Column({type: 'varchar'})
  slug: string;

  @OneToMany(() => GameCategory, (game) => game.category)
  games: Game[];

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
