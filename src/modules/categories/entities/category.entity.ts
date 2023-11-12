import { Product } from "src/modules/products/entities/product.entity";
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne } from "typeorm";
import { SubCategory } from "src/modules/sub-categories/entities/sub-category.entity";

@Entity()
export class Category {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column(
        "varchar", {
        unique: true,
        length: 50
    }
    )
    title: string;

    @Column({ default: true })
    status: boolean

    @Column({ default: "https://t4.ftcdn.net/jpg/04/73/25/49/360_F_473254957_bxG9yf4ly7OBO5I0O5KABlN930GwaMQz.jpg" })
    avatar: string

    @Column({ nullable: false })
    subCategoryId: number

    @OneToMany(() => Product, (product) => product.category)
    products: Product[]

    @ManyToOne(() => SubCategory, (subCategory) => subCategory.categories)
    subCategory: SubCategory
}
