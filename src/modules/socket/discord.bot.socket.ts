import { Inject, Injectable, OnModuleInit, forwardRef } from "@nestjs/common";
import { ChannelType, Client, GatewayIntentBits, Guild, Message, TextChannel } from "discord.js";
import { CustomerChatSocket } from "./customer.chat.socket";

@Injectable()
export class DiscordBotSocket implements OnModuleInit {
    /* thuộc tính client được ép kiểu theo class Client của discord */
    client: Client;
    /* Token dùng để connect tới bot */
    /* Token dùng để connect tới bot */
    botToken: string = "MTE1Mzk4ODI4NTU2NDIwMzAxOA.G0uk0q.tmxgU1V6vFTqFoDzkng-zY_UX0Q2ZwkxsY-kHE";
    /* ID của kênh discord muốn làm việc */
    guildId: string = "1153991209358999602"
    /* Khai báo ra thuộc tính guild được ép kiểu theo Class Guild của discord*/
    guild: Guild

    constructor(
        @Inject(forwardRef(() => CustomerChatSocket))
        private readonly customerChatSocket: CustomerChatSocket
    ) { }

    onModuleInit(): void {
        /* Khởi tạo instance client discord */
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,

            ],
        })
        /* Yêu cầu client đăng nhập vào bot */
        this.client.login(this.botToken)
        /* Lắng nghe sự kiện ready từ server discord, nếu bot đã sẵn sàng sử dụng thì chạy callback function*/
        this.client.on("ready", () => {
            console.log("Discord Bot Socket Đã Mở!")

            /* Các lệnh sau chỉ chạy được sau khi bot sẵn sàng */
            this.connectGuild();

            this.client.on("messageCreate", (message: Message) => {
                //console.log("message", message.content)
                if (!message.author.bot) {
                    // message.reply("Ok thấy rồi!")
                    this.customerChatSocket.sendMessageToClient(message.channelId, message.content)
                }
            })
        })
    }

    connectGuild(): void {
        /* Lấy instance của kênh discord mình muốn làm việc theo ID Kênh và gán nó cho thuộc tính guild  */
        this.guild = this.client.guilds.cache.get(this.guildId);
    }

    async createTextChannel(channelName: string): Promise<TextChannel> {
        return this.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText
        })
    }

    async getTextChannel(channelId: string): Promise<TextChannel> {
        return (this.guild.channels.cache.get(channelId) as TextChannel)
    }
}
