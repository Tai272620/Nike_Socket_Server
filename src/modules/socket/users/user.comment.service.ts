import { Injectable } from "@nestjs/common";
import { UserComments } from "./entities/user.comment.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserComment } from "./user.comment.interface";

@Injectable()
export class UserCommentService {
    constructor(@InjectRepository(UserComments) private readonly userComments: Repository<UserComments>) { }

    async findCommentByUserId(userId: string) {
        try {
            let chats = await this.userComments.find({
                where: {
                    userId
                },
                relations: {
                    user: true,
                    product: true
                }
            })
            if (chats.length == 0) {
                return false
            }
            return chats
        } catch (err) {
            return false
        }
    }

    async findAll() {
        try {
            let comments = await this.userComments.find({
                relations: {
                    user: true,
                    product: true
                }
            })
            if (comments.length == 0) {
                return false
            }
            return comments
        } catch (err) {
            return false
        }
    }

    async createComment(commentRecord: UserComment) {
        try {
            let comment = await this.userComments.save(commentRecord);
            return comment
        } catch (err) {
            return false
        }
    }
}