import { io, type Socket } from 'socket.io-client'

// .trim() guards against a stray trailing space in the env value, which would
// otherwise make the WebSocket URL invalid and silently fail to connect.
const SOCKET_URL = (process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000').trim()

/**
 * Create an authenticated chat socket. `auth` is a function so socket.io calls it
 * on every (re)connect — that hands the server a *fresh* Clerk token, which
 * matters because Clerk session tokens are short-lived and reconnects happen.
 */
export function createChatSocket(getToken: () => Promise<string | null>): Socket {
  return io(SOCKET_URL, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 4000,
    auth: (cb) => {
      getToken()
        .then((token) => cb({ token: token ?? '' }))
        .catch(() => cb({ token: '' }))
    },
  })
}
