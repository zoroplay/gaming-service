import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
  } from 'typeorm';
  
  @Entity({ name: 'casino_game' })
  
  export class CasinoGame {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column()
    game_id: string;
  
    @Column()
    subject: string;
  
    @Column()
    user_id: string;
  
    @Column()
    provider: string;
  
    @Column()
    amount: string;

    @Column({nullable: true})
    reference: string;
  
    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;
  
    @UpdateDateColumn({ type: 'timestamp' })
    updated_at: Date;
  }
  