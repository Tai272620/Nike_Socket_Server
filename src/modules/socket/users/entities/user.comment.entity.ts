import { User } from "src/modules/user/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Product } from "src/modules/products/entities/product.entity";

@Entity()
export class UserComments {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    userId: string;

    @ManyToOne(() => User, (user) => user.userComments)
    @JoinColumn({ name: 'userId' })
    user: User;

    @ManyToOne(() => Product, (product) => product.userComments)
    @JoinColumn({ name: 'productId' })
    product: Product;

    @Column()
    productId: number;

    @Column()
    content: string;

    @Column()
    time: String;
}