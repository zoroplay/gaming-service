import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  OneToMany
} from 'typeorm';
import { Provider } from './provider.entity';
import { Category } from './category.entity';
import { GameCategory } from './game.category.entity';

@Entity({ name: 'games' })
export class Game {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  gameId: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
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

  @Column({ type: 'text', nullable: true })
  game_category_w: string;

  @Column({ type: 'text', nullable: true })
  game_category_m: string;

  @Column({ default: 0 })
  priority: number;

  // @ManyToMany(() => Category, (category) => category.games)
  // @JoinTable()
  // categories: Category[];

  @OneToMany(() => GameCategory, (gameCategory) => gameCategory.game)
  gameCategories: GameCategory[];

  @ManyToOne(() => Provider, (provider) => provider.games)
  provider: Provider;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
