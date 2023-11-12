import { OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, SubscribeMessage } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io'
import { DiscordBotSocket } from './discord.bot.socket';
import { CustomerChatService } from './customers/customer.chat.service';
import { User } from '../user/entities/user.entity';
import { JwtService } from '../jwt/jwt.service';
import { MessageBody } from '@nestjs/websockets';

@WebSocketGateway({ cors: true })
export class CustomerChatSocket implements OnModuleInit {
    /* Lớp decor này dùng để mở socket server */
    @WebSocketServer()
    server: Server

    /*Lưu tất cả client đang kết nối với server */
    clients: {
        user: User,
        socket: Socket,
        discordChannelId: string
    }[] = []

    constructor(
        @Inject(forwardRef(() => DiscordBotSocket))
        private readonly discordBotSocket: DiscordBotSocket,
        private readonly customerChatService: CustomerChatService,
        private readonly jwt: JwtService
    ) { }

    onModuleInit() {
        console.log("Customer Chat Socket Gateway đã mở!")

        /* Lắng nghe cổng connect đón những client kết nối tới */
        this.server.on("connect", (async (socket: Socket) => {

            /* Xóa người dùng khỏi clients nếu disconnect */
            socket.on("disconnect", () => {
                this.clients = this.clients.filter(client => client.socket.id != socket.id)
            })

            /* Xác thực người dùng */
            let token: string = String(socket.handshake.query.token);
            let user = (this.jwt.verifyToken(token) as User);
            if (token == "undefined" || !user) {
                socket.emit("connectStatus", "Xác thực người dùng thất bại!")
                socket.disconnect();
            } else {
                socket.emit("connectStatus", `${socket.id}`)
                /* Khi vượt qua bước xác thực, tiến hành lưu trữ thông tin về người dùng đang kết nối vào thuộc tính clients */
                /* Follow theo các bước */
                /* Step 1: tìm xem người dùng đã từng truy cập dịch vụ chat hay chưa */
                let listChatHistory = await this.customerChatService.findChatByUserId(user.id);

                let newClient = {
                    discordChannelId: "",
                    socket,
                    user
                }

                if (!listChatHistory) {
                    /* Chưa từng */
                    /* Đăng ký 1 discord text channel cho người dùng này */
                    let channel = await this.discordBotSocket.createTextChannel(`${user.userName}`);
                    /* lưu trữ lại channel id */
                    newClient.discordChannelId = channel.id
                    /* gửi một lời chào tới người dùng */
                    let chat = {
                        content: `Xin chào ${user.userName} chúng tôi có thể giúp gì cho bạn?`,
                        discordChannelId: newClient.discordChannelId,
                        time: String(Date.now()),
                        userId: user.id,
                        adminId: "47b8ecd1-e119-45ec-9c4c-2b02d4ceb244" // tạm thời fix cứng
                    }
                    // console.log("chat", chat)

                    let newChatHisotry = await this.customerChatService.createChat(chat)
                    console.log("newChatHisotry", newChatHisotry)

                    if (newChatHisotry) {
                        /* Nếu thành công thì tiến hành gửi nó qua cổng historyMessage cho client và ghi chép vào discord */
                        newClient.socket.emit("historyMessage", newChatHisotry)
                        let channel = await this.discordBotSocket.getTextChannel(newClient.discordChannelId)
                        channel.send(`**ADMIN: ${chat.content}**`)
                    }
                } else {
                    /* Đã từng */
                    /* ghi lại channel của người dùng */
                    newClient.discordChannelId = listChatHistory[0].discordChannelId;
                    /* trả lại toàn bộ lịch sử chat cho người dùng qua cổng historyMessage */
                    socket.emit("historyMessage", listChatHistory)
                }

                /* Lưu trữ thông tin người dùng vừa kết nối để tương tác về sau */
                this.clients.unshift(newClient)
            }
        }))
    }

    async sendMessageToClient(channelId: string, content: string) {
        let client = this.clients.find(client => client.discordChannelId == channelId);
        if (client) {
            let chat = {
                content,
                discordChannelId: client.discordChannelId,
                time: String(Date.now()),
                userId: client.user.id,
                adminId: "47b8ecd1-e119-45ec-9c4c-2b02d4ceb244" // tạm thời fix cứng
            }
            let listChatHistory = await this.customerChatService.createChat(chat);
            if (listChatHistory) {
                client.socket.emit("historyMessage", listChatHistory)
            } else {
                let channel = await this.discordBotSocket.getTextChannel(channelId)
                channel.send(`**BOT: Gửi tin nhắn thất bại**`)
            }

        } else {
            let channel = await this.discordBotSocket.getTextChannel(channelId)
            const cssCode = "```diff\nBOT: Người dùng đang offline!\n```";
            channel.send(`${cssCode}`)
        }
    }

    /* Lắng nghe cổng createMessage chờ người dùng nhắn tin tới */
    @SubscribeMessage('createMessage')
    async createMessage(@MessageBody() body: {
        socketId: string;
        content: string;
    }) {
        let client = this.clients.find(client => client.socket.id == body.socketId);
        if (client) {
            let chat = {
                content: body.content,
                discordChannelId: client.discordChannelId,
                time: String(Date.now()),
                userId: client.user.id,
                adminId: null
            }
            let listChatHistory = await this.customerChatService.createChat(chat);
            if (listChatHistory) {
                let channel = await this.discordBotSocket.getTextChannel(client.discordChannelId)
                channel.send(`**${client.user.userName}: ${body.content}**`)
                client.socket.emit("historyMessage", listChatHistory)
            }
        }
    }
}