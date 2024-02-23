import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'players' })
export class Player {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  clientId: number;

  @Column({ nullable: true })
  username: string;

  @Column({ length: 255 })
  email: string;

  @Column({ length: 255, nullable: true })
  authCode: string;

  @Column({ type: 'timestamp' })
  authCodeExpiresAt: string;

  @Column({ length: 255, nullable: true })
  virtualToken: string;

  @Column({ type: 'timestamp' })
  virtualTokenExpiresAt: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
