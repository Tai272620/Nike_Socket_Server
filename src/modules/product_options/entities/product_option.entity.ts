import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Product } from "src/modules/products/entities/product.entity";
import { ProductOptionPicture } from "src/modules/product_option_pictures/entities/product_option_picture.entity"
import { ReceiptDetail } from "src/modules/receipts/entities/receipt-detail.entity";

@Entity()
export class ProductOption {
    @PrimaryGeneratedColumn()
    id: number
    @Column()
    name: string
    @Column({ nullable: false })
    productId: string

    @ManyToOne(() => Product, (product) => product.product_options)
    product: Product

    @OneToMany(() => ProductOptionPicture, (product_option_image) => product_option_image.product_option)
    product_option_images: ProductOptionPicture[]

    @OneToMany(() => ReceiptDetail, (receiptDetail) => receiptDetail.option)
    sold: ReceiptDetail[];
}
