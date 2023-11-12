import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, BeforeInsert, BeforeUpdate, OneToMany } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserRole, UserStatus } from '../user.enum';
import { UserAddresses } from './user-address.entity';
import { CustomerChats } from 'src/modules/socket/customers/entities/customer.chat.entity';
import { UserComments } from 'src/modules/socket/users/entities/user.comment.entity';
import { Receipt } from 'src/modules/receipts/entities/receipt.entity';

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    userName: string;

    @Column({ unique: true })
    email: string;

    @Column()
    password: string;
    @BeforeInsert()
    async hashPassword() {
        this.password = await bcrypt.hash(this.password, 10);
    }

    @Column({ default: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSppncfz3iPr0Syrey-ltE4zHLfcGcIAeqf4w&usqp=CAU" })
    avatar: string;

    @Column({ default: false })
    emailAuthentication: boolean;

    @Column({ type: 'enum', enum: UserRole, default: UserRole.MEMBER })
    role: UserRole;

    @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
    status: UserStatus;

    @Column({
        default: String(Date.now())
    })
    createAt: String;

    @Column({
        default: String(Date.now())
    })
    updateAt: String;

    @BeforeUpdate()
    async setUpdateTime() {
        this.updateAt = String(Date.now());
    }

    @OneToMany(() => UserAddresses, (userAddresses) => userAddresses.user)
    userAddresses: UserAddresses[];

    @OneToMany(() => CustomerChats, (customerChats) => customerChats.user)
    customerChats: CustomerChats[];

    @OneToMany(() => CustomerChats, (customerChats) => customerChats.admin)
    adminChats: CustomerChats[];

    @OneToMany(() => UserComments, (userComments) => userComments.user)
    userComments: UserComments[];

    @OneToMany(() => Receipt, (receipt) => receipt.user)
    receipts: Receipt[];
}


