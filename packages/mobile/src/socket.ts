import type { Socket } from 'socket.io-client';

let _socket: Socket | null = null;

export function getGlobalSocket(): Socket | null {
  return _socket;
}

export function setGlobalSocket(s: Socket | null): void {
  _socket = s;
}
