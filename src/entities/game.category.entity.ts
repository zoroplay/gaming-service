import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { Game } from './game.entity';

@Entity({ name: 'games_categories' })
export class GameCategory {
  @PrimaryGeneratedColumn()
  id: number;

  // @ManyToOne(() => Category, (category) => category.games)
  // category: Category;

  // @ManyToOne(() => Game)
  // @JoinColumn()
  // game: Game;

  @ManyToOne(() => Game, (game) => game.gameCategories)
  @JoinColumn()
  game: Game;

  @ManyToOne(() => Category, (category) => category.gameCategories)
  @JoinColumn()
  category: Category;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
