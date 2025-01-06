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



// Game/getURL?project=5555&version=2&signature=98f6b8021f16bcc4c3bc0805cd802a18&token=FE6RHKUBOQSZLFKEBQV4I1ZBMUFBD5Z3KSBZCAGU&game=229&settings[user_id]=214986&settings[exit_url]=https://example.com&settings[https]=1&settings[extra_bonuses][bonus_spins][spins_count]=undefined&settings[extra_bonuses][bonus_spins][bet_in_money]=undefined&settings[extra_bonuses_settings][registration_id]=undefined&denomination=1&currency=NGN&return_url_info=1&callback_version=2

// settings[extra_bonuses][bonus_spins][spins_count],
// settings[extra_bonuses][bonus_spins][bet_in_money] and
// settings[extra_bonuses][freespins_on_start][freespins_count],
// settings[extra_bonuses][freespins_on_start][bet_in_money].