import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
@Index('IDX_user_email', ['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  email!: string;

  @Column({ type: 'varchar', nullable: true })
  password!: string | null;

  @Column()
  firstName!: string;

  @Column({ nullable: true })
  lastName!: string;

  @Column({ nullable: true })
  twoFactorSecret?: string;

  @Column({ default: false })
  isTwoFAEnabled?: boolean;
}
