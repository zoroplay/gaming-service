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

  @Column({ default: 0 })
  priority: number;

  @Column({ default: 'active' })
  status: string;

  @OneToMany(() => Game, (game) => game.categories)
  games: Game[];

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}

