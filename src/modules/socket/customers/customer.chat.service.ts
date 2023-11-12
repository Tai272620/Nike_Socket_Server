import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CustomerChats } from "./entities/customer.chat.entity";
import { Repository } from "typeorm";
import { CustomerChat } from "./customer.chat.interface";

@Injectable()
export class CustomerChatService {
    constructor(@InjectRepository(CustomerChats) private readonly customerChats: Repository<CustomerChats>) { }

    async findChatByUserId(userId: string) {
        try {
            let chats = await this.customerChats.find({
                where: {
                    replyToId: null,
                    userId
                },
                relations: {
                    user: true
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

    async createChat(chatRecord: CustomerChat) {
        try {
            let chat = await this.customerChats.save(chatRecord);
            if (!chat) {
                return false
            }
            let chatList = await this.customerChats.find({
                where: {
                    replyToId: null,
                    userId: chatRecord.userId
                },
                relations: {
                    user: true
                }
            })

            if (chatList.length == 0) {
                return false
            }

            return chatList
        } catch (err) {
            return false
        }
    }
}