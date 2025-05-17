import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
} from '@nestjs/websockets'
import { Server } from 'socket.io'

@WebSocketGateway({ cors: true })
export class SignalingGateway {
  @WebSocketServer()
  server: Server

  // シグナリングメッセージをサブスクライブ
  @SubscribeMessage('signal')
  handleSignal(@MessageBody() data: { from: string; to: string; signal: any }) {
    this.server.to(data.to).emit('signal', data)
  }

  // クライアント接続時に参加したユーザーのID情報を取得
  @SubscribeMessage('join')
  handleJoin(@MessageBody() userId: string) {
    this.server.emit('user-joined', userId)
  }
}
