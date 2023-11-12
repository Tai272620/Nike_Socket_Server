import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne } from "typeorm";
import { Category } from "src/modules/categories/entities/category.entity";
import { ProductOption } from "src/modules/product_options/entities/product_option.entity";
import { UserComments } from "src/modules/socket/users/entities/user.comment.entity";

@Entity()
export class Product {
    @PrimaryGeneratedColumn()
    id: number;

    @Column(
        "varchar", {
        unique: true,
        length: 50
    }
    )
    name: string;

    @Column({ default: true })
    status: boolean

    // @Column({ default: "https://t4.ftcdn.net/jpg/04/73/25/49/360_F_473254957_bxG9yf4ly7OBO5I0O5KABlN930GwaMQz.jpg" })
    // avatar: string

    @Column()
    price: number

    @Column("varchar", {
        length: 500
    })
    desc: string

    @Column({ nullable: false })
    categoryId: string

    @ManyToOne(() => Category, (category) => category.products)
    category: Category

    @OneToMany(() => ProductOption, (product_option) => product_option.product)
    product_options: ProductOption[]

    @OneToMany(() => UserComments, (userComment) => userComment.product)
    userComments: UserComments[]
}
