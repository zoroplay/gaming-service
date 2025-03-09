/* eslint-disable prettier/prettier */
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { GameCategoryEntity } from './game.category.entity';

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

  @ManyToMany(() => GameCategoryEntity, (gameCategory) => gameCategory.category)
  games: GameCategoryEntity[];

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}

