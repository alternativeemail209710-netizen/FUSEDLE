import { io } from 'socket.io-client';

// Same origin in production (Express serves the build); Vite proxies /socket.io in dev.
export const socket = io({ transports: ['websocket', 'polling'] });
