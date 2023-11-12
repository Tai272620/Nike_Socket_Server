import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ProductOption } from "src/modules/product_options/entities/product_option.entity";

@Entity()
export class ProductOptionPicture {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ nullable: false })
    productOptionId: number

    @Column({ nullable: false })
    url: string

    @ManyToOne(() => ProductOption, (product_option) => product_option.product_option_images)
    product_option: ProductOption;
}
