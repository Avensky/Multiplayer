import { io, Socket } from 'socket.io-client'

// "undefined" means the URL will be computed from the `window.location` object
const URL = process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:4000'// Replace with your server URL if different

export const socket: Socket = io(URL)
export default socket
