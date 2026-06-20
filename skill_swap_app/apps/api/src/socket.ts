import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'

export function initSocket(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    },
  })

  // Auth middleware — verify Clerk JWT on socket connection
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) {
      return next(new Error('Unauthorized'))
    }
    // JWT verification added in M5 when chat is built
    next()
  })

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`)

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`)
    })
  })

  return io
}
