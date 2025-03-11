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
export class GameCategoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Game, (game) => game.categories)
  @JoinColumn({name: "game_id"})
  game: Game;

  @ManyToOne(() => Category, (category) => category.games)
  @JoinColumn({name: 'category_id'})
  category: Category;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
