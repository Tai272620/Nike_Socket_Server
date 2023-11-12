import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Receipt } from "./receipt.entity";
import { ProductOption } from "src/modules/product_options/entities/product_option.entity";

@Entity()
export class ReceiptDetail {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    receiptId: string;
    @ManyToOne(() => Receipt, (receipt) => receipt.detail)
    @JoinColumn({ name: 'receiptId' })
    receipt: Receipt;

    @Column()
    optionId: number;
    @ManyToOne(() => ProductOption, (productOption) => productOption.sold)
    @JoinColumn({ name: 'optionId' })
    option: ProductOption;

    @Column()
    quantity: number
}