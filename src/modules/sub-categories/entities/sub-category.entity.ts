import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Category } from "src/modules/categories/entities/category.entity";

@Entity()
export class SubCategory {
    @PrimaryGeneratedColumn()
    id: number;

    @Column(
        "varchar", {
        unique: true,
        length: 50
    }
    )
    title: string;

    @OneToMany(() => Category, (category) => category.subCategory)
    categories: Category[]
}
