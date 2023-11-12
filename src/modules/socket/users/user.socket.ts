import { OnModuleInit } from "@nestjs/common";
import { MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { User } from "src/modules/user/entities/user.entity";
import { JwtService } from '../../jwt/jwt.service';
import { UserCommentService } from "./user.comment.service";
import { InjectRepository } from "@nestjs/typeorm";
import { PayMode, Receipt, ReceiptStatus } from "src/modules/receipts/entities/receipt.entity";
import { ReceiptDetail } from "src/modules/receipts/entities/receipt-detail.entity";
import { Not, Repository } from "typeorm";
import * as moment from "moment";
import * as CryptoJS from "crypto-js";
import axios from "axios";
import * as qs from "qs";

interface ClientType {
    user: User,
    socket: Socket,
}

@WebSocketGateway({ cors: true })
export class UserSocketGateWay implements OnModuleInit {
    @WebSocketServer()
    server: Server

    clients: ClientType[] = [];


    constructor(private readonly jwt: JwtService,
        private readonly userCommentService: UserCommentService,
        @InjectRepository(Receipt) private readonly receipts: Repository<Receipt>,
        @InjectRepository(ReceiptDetail) private readonly receiptDetail: Repository<ReceiptDetail>) { }

    onModuleInit() {
        this.server.on("connect", (async (socket: Socket) => {
            console.log("Da co user connect")
            /* Xóa người dùng khỏi clients nếu disconnect */
            socket.on("disconnect", () => {
                this.clients = this.clients.filter(client => client.socket.id != socket.id)
            })
            /* Xác thực người dùng */
            let token: string = String(socket.handshake.query.token);
            let user = (this.jwt.verifyToken(token) as User);
            // console.log("user", user)
            if (token == "undefined" || !user) {
                socket.emit("connectStatus", {
                    message: "Sign In fail",
                    status: false
                })
                socket.disconnect();
            } else {
                // if (this.clients.find(client => client.user.id == user.id)) {
                //     socket.emit("connectStatus", {
                //         message: "Đã đăng nhập ở 1 thiết bị khác!",
                //         status: false
                //     })
                //     socket.disconnect()
                //     return
                // }


                /* Lưu trữ thông tin người dùng vừa kết nối để tương tác về sau */
                this.clients.push({
                    socket,
                    user
                })
                let listCommentHistory = await this.userCommentService.findAll();

                if (listCommentHistory) {
                    socket.emit("receiveComment", listCommentHistory)
                }

                socket.on("createComment", async (body: {
                    socketId: string;
                    content: string;
                    productId: number
                }) => {
                    let listCommentHistory = await this.createMessage(body);
                    if (listCommentHistory) {
                        for (let i in this.clients) {
                            if (this.clients[i].user.id == user.id) {
                                this.clients[i].socket.emit("receiveComment", listCommentHistory)
                            }
                        }
                        socket.emit("receiveComment", listCommentHistory)
                    }
                })

                socket.emit("connectStatus", {
                    message: "Sign In successfully",
                    status: true,
                    socketId: socket.id
                });
                socket.emit("receiveUserData", user);

                let receipt = await this.findReceiptByAuthId({
                    userId: user.id,
                    guestId: null
                });

                // console.log("receipt", receipt)

                socket.emit("receiveReceipt", receipt ? receipt : [])

                let cart = await this.getCartByUserId(user.id);

                if (cart) {
                    socket.emit("receiveCart", cart)
                }

                socket.on("addToCart", async (newItem: { receiptId: string, optionId: number, quantity: number }) => {
                    let cart = await this.addToCart(newItem)
                    if (cart) {
                        for (let i in this.clients) {
                            if (this.clients[i].user.id == user.id) {
                                this.clients[i].socket.emit("receiveCart", cart)
                            }
                        }
                    }
                })

                socket.on("deleteItemFromCart", async (newItem: { receiptId: string, optionId: number }) => {
                    let cart = await this.deleteItemFromCart(newItem);
                    if (cart) {
                        socket.emit("receiveCart", cart)
                    }
                })

                socket.on("payCash", async (data: {
                    receiptId: string,
                    userId: string,
                    address: string
                }) => {
                    let cashInfor = await this.cash(data.receiptId, data.userId, {
                        payMode: PayMode.CASH
                    }, data.address)
                    if (cashInfor) {
                        for (let i in this.clients) {
                            if (this.clients[i].user.id == user.id) {
                                this.clients[i].socket.emit("receiveCart", cashInfor[0])
                                this.clients[i].socket.emit("receiveReceipt", cashInfor[1])
                                this.clients[i].socket.emit("cash-status", true)
                            }
                        }
                    }
                })

                socket.on("payZalo", async (data: {
                    receiptId: string,
                    address: string
                }) => {
                    let zaloCash = await this.zaloCash(data.receiptId, user, socket, data.address);
                    if (zaloCash) {
                        for (let i in this.clients) {
                            if (this.clients[i].user.id == user.id) {
                                this.clients[i].socket.emit("receiveCart", zaloCash[0])
                                this.clients[i].socket.emit("receiveReceipt", zaloCash[1])
                                this.clients[i].socket.emit("cash-status", true)
                            }
                        }
                    }
                })
            }
        }))
    }

    async findReceiptByAuthId(data: {
        userId: string | null,
        guestId: string | null
    }) {
        try {
            if (data.userId == null && data.guestId == null) return false
            let receipts = await this.receipts.find({
                where: data.userId ? {
                    userId: data.userId,
                    status: Not(ReceiptStatus.SHOPPING)
                } : {
                    guestId: data.guestId
                },
                relations: {
                    detail: {
                        option: {
                            product: true,
                            product_option_images: true
                        }
                    },
                    user: true
                }
            })

            if (!receipts) return false

            if (receipts.length == 0) return false

            return receipts
        } catch (err) {
            return false
        }
    }

    async getCartByUserId(userId: string) {
        try {
            let oldCart = await this.receipts.find({
                where: {
                    userId,
                    status: ReceiptStatus.SHOPPING
                },
                relations: {
                    detail: {
                        option: {
                            product: true,
                            product_option_images: true
                        }
                    }
                }
            })
            if (!oldCart || oldCart.length == 0) { // nếu tìm giỏ hàng cũ bị lỗi
                // tạo giỏ hàng
                let newCartChema = this.receipts.create({
                    userId,
                })
                let newCart = await this.receipts.save(newCartChema);

                if (!newCart) return false

                let newCartRelation = await this.receipts.findOne({
                    where: {
                        id: newCart.id,
                    },
                    relations: {
                        detail: {
                            option: {
                                product: true,
                                product_option_images: true
                            }
                        }
                    }
                })
                if (!newCartRelation) return false
                return newCartRelation
            }
            return oldCart[0]
        } catch (err) {
            console.log("err", err)
            return false
        }
    }

    async addToCart(newItem: { receiptId: string, optionId: number, quantity: number }) {
        try {
            let items = await this.receiptDetail.find({
                where: {
                    receiptId: newItem.receiptId
                }
            })
            if (!items) return false
            if (items.length == 0) {
                await this.receiptDetail.save(newItem)
            } else {
                let check = items.find(item => item.optionId == newItem.optionId);
                if (check) {
                    let itemUpdate = this.receiptDetail.merge(items.find(item => item.optionId == newItem.optionId), {
                        quantity: newItem.quantity
                    })
                    await this.receiptDetail.save(itemUpdate)
                } else {
                    await this.receiptDetail.save(newItem)
                }
            }

            let cart = await this.receipts.findOne({
                where: {
                    id: newItem.receiptId
                },
                relations: {
                    detail: {
                        option: {
                            product: true,
                            product_option_images: true
                        }
                    }
                }
            })

            if (!cart) return false
            return cart
        } catch (err) {
            return false
        }
    }

    async deleteItemFromCart(newItem: { receiptId: string, optionId: number }) {
        try {
            const { receiptId, optionId } = newItem;

            // Xóa mục từ giỏ hàng
            await this.receiptDetail.delete({
                receiptId,
                optionId
            });

            // Lấy lại thông tin giỏ hàng sau khi xóa
            let cart = await this.receipts.findOne({
                where: {
                    id: receiptId
                },
                relations: {
                    detail: {
                        option: {
                            product: true,
                            product_option_images: true
                        }
                    }
                }
            });

            if (!cart) return false;
            return cart;
        } catch (err) {
            return false;
        }
    }

    async createMessage(body: {
        socketId: string;
        content: string;
        productId: number
    }) {
        let client = this.clients.find(client => client.socket.id == body.socketId);
        if (client) {
            let comment = {
                content: body.content,
                time: String(Date.now()),
                userId: client.user.id,
                productId: body.productId
            }
            let newComment = await this.userCommentService.createComment(comment);
            let listCommentHistory = await this.userCommentService.findAll();

            if (!newComment) return false
            return listCommentHistory
        }
    }

    async cash(receiptId: string, userId: string, options: {
        payMode: PayMode,
        paid?: boolean,
        paidAt?: string,
        zaloTranId?: string,
    }, address: string | null = null): Promise<[Receipt, Receipt[]] | null> {
        try {
            let nowCart = await this.receipts.findOne({
                where: {
                    id: receiptId
                },
                relations: {
                    detail: {
                        option: {
                            product: true,
                            product_option_images: true
                        }
                    }
                }
            })
            if (!nowCart) return null
            let cartUpdate = this.receipts.merge(nowCart, {
                status: ReceiptStatus.PENDING,
                total: nowCart.detail?.reduce((value, cur) => {
                    return value += cur.quantity * cur.option.product.price
                }, 0),
                ...options,
                address
            })
            let cartResult = await this.receipts.save(cartUpdate);
            if (!cartResult) return null

            // Tạo Cart Mới
            let newCart = await this.getCartByUserId(userId);
            if (!newCart) return null

            let receipts = await this.receipts.find({
                where: {
                    userId,
                    status: Not(ReceiptStatus.SHOPPING)
                },
                relations: {
                    detail: {
                        option: {
                            product: true,
                            product_option_images: true
                        }
                    }
                }
            })
            if (!receipts) return null

            return [newCart, receipts]
        } catch (err) {
            return null
        }
    }

    async zaloCash(receiptId: string, user: User, socket: Socket, address: string) {
        let finish: boolean = false;
        let result: [Receipt, Receipt[]] | null = null;
        /* Bước 1: Lấy dữ liệu dơn hàng và đăng ký giao dịch trên Zalo*/
        let nowCart = await this.receipts.findOne({
            where: {
                id: receiptId
            },
            relations: {
                detail: {
                    option: {
                        product: true,
                        product_option_images: true
                    }
                }
            }
        })
        if (!nowCart) return false

        let zaloRes = await this.zaloCreateReceipt(user, nowCart);

        if (!zaloRes) return false
        /* Bước 2: Gửi thông tin thanh toán về cho client*/
        socket.emit("payQr", zaloRes.payUrl)
        /* Bước 3: Kiểm tra thanh toán*/
        let payInterval: NodeJS.Timeout | null = null;
        let payTimeout: NodeJS.Timeout | null = null;

        /* Sau bao lâu thì hủy giao dịch! */
        payTimeout = setTimeout(() => {
            socket.emit("payQr", null)
            clearInterval(payInterval)
            finish = true;
        }, 1000 * 60 * 2)

        payInterval = setInterval(async () => {
            let payStatus = await this.zaloCheckPaid(zaloRes.orderId)
            if (payStatus) {
                result = await this.cash(receiptId, user.id, {
                    paid: true,
                    paidAt: String(Date.now()),
                    payMode: PayMode.ZALO,
                    zaloTranId: zaloRes.orderId
                }, address)
                finish = true;
                clearInterval(payInterval)
                clearInterval(payTimeout)
            }
        }, 1000)

        return new Promise((resolve, reject) => {
            setInterval(() => {
                if (finish) {
                    resolve(result)
                }
            }, 1000)
        })
    }

    async zaloCreateReceipt(user: User, receipt: Receipt) {
        let result: {
            payUrl: string;
            orderId: string;
        } | null = null;
        const config = {
            appid: process.env.ZALO_APPID,
            key1: process.env.ZALO_KEY1,
            key2: process.env.ZALO_KEY2,
            create: process.env.ZALO_CREATE_URL,
            confirm: process.env.ZALO_COFIRM_URL,
        };

        const orderInfo = {
            appid: config.appid,
            apptransid: `${moment().format('YYMMDD')}_${Date.now() * Math.random()}_${receipt.id}`,
            appuser: user.userName,
            apptime: Date.now(),
            item: JSON.stringify([]),
            embeddata: JSON.stringify({
                merchantinfo: "Nike Store" // key require merchantinfo
            }),
            amount: Number(receipt.detail?.reduce((value, cur) => {
                return value += cur.quantity * cur.option.product.price * 100
            }, 0)),
            description: "Thanh Toán Cho Shop Nike",
            bankcode: "zalopayapp",
            mac: ""
        };

        const data = config.appid + "|" + orderInfo.apptransid + "|" + orderInfo.appuser + "|" + orderInfo.amount + "|" + orderInfo.apptime + "|" + orderInfo.embeddata + "|" + orderInfo.item;
        orderInfo.mac = CryptoJS.HmacSHA256(data, String(config.key1)).toString();

        await axios.post(String(config.create), null, { params: orderInfo })
            .then(zaloRes => {
                if (zaloRes.data.returncode == 1) {
                    result = {
                        payUrl: zaloRes.data.orderurl,
                        orderId: orderInfo.apptransid
                    }
                }
            })
        return result
    }

    async zaloCheckPaid(zaloTransid: string) {
        const config = {
            appid: process.env.ZALO_APPID,
            key1: process.env.ZALO_KEY1,
            key2: process.env.ZALO_KEY2,
            create: process.env.ZALO_CREATE_URL,
            confirm: process.env.ZALO_COFIRM_URL,
        };

        let postData = {
            appid: config.appid,
            apptransid: zaloTransid,
            mac: ""
        }

        let data = config.appid + "|" + postData.apptransid + "|" + config.key1; // appid|apptransid|key1
        postData.mac = CryptoJS.HmacSHA256(data, String(config.key1)).toString();


        let postConfig = {
            method: 'post',
            url: String(config.confirm),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: String(qs.stringify(postData))
        };

        return await axios.post(postConfig.url, postConfig.data)
            .then(function (resZalo) {
                if (resZalo.data.returncode == 1) return true
                return false
            })
            .catch(function (error) {
                return false
            });
    }

}

