import { Module } from "@nestjs/common";
import { CustomerChatService } from "./customers/customer.chat.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CustomerChats } from "./customers/entities/customer.chat.entity";
import { JwtService } from "../jwt/jwt.service";
import { DiscordBotSocket } from "./discord.bot.socket";
import { CustomerChatSocket } from "./customer.chat.socket";
import { UserSocketGateWay } from "./users/user.socket";
import { UserCommentService } from "./users/user.comment.service";
import { UserComments } from "./users/entities/user.comment.entity";
import { Receipt } from "../receipts/entities/receipt.entity";
import { ReceiptDetail } from "../receipts/entities/receipt-detail.entity";

@Module({
    imports: [
        TypeOrmModule.forFeature([CustomerChats, UserComments, Receipt, ReceiptDetail])
    ],
    providers: [DiscordBotSocket, CustomerChatSocket, CustomerChatService, JwtService, UserSocketGateWay, UserCommentService]
})
export class SocketModule { }