import { User } from 'src/modules/user/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';

@Entity()
export class UserAddresses {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @ManyToOne(() => User, (user) => user.userAddresses)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ length: 255 })
    detail: string;

    @Column()
    provinceId: number;

    @Column({ length: 50 })
    provinceName: string;

    @Column()
    districtId: number;

    @Column({ length: 50 })
    districtName: string;

    @Column()
    wardCode: string;

    @Column({ length: 100 })
    wardName: string;
}
