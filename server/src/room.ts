import { EventEmitter } from 'node:events';
import type { WebSocket } from 'ws';
import {
  updateGame,
  type PhysicsGameState,
  type PhysicsInput,
  type PhysicsShip
} from '../../shared/dist/physics.js';
import { serializeSnapshot } from '../../shared/dist/protocol.js';
import { toPlayerId, type PlayerId } from '../../shared/dist/types.js';

export interface PlayerSocket extends WebSocket {
  playerId?: PlayerId;
  currentRoom?: Room;
  isAlive?: boolean;
}

export interface RoomEvents {
  join: [socket: PlayerSocket];
  leave: [socket: PlayerSocket];
  empty: [roomId: string];
}

export class Room extends EventEmitter<RoomEvents> {
  readonly id: string;
  readonly clients: Set<PlayerSocket>;
  state: PhysicsGameState & { ships: Record<string, PhysicsShip & { angle?: number }> };
  inputs: Record<string, PhysicsInput | undefined>;
  readonly tickRate: number;
  readonly intervalMs: number;
  private isRunning: boolean;
  private lastTickTime: number;

  constructor(id: string) {
    super();
    this.id = id;
    this.clients = new Set();
    this.state = {
      ships: {}
    };
    this.inputs = {};
    this.tickRate = 30;
    this.intervalMs = 1000 / this.tickRate;
    this.isRunning = false;
    this.lastTickTime = Date.now();
  }

  addClient(socket: PlayerSocket): void {
    this.clients.add(socket);
    const id = toPlayerId(Math.random().toString(36).substring(7));
    socket.playerId = id;
    this.state.ships[String(id)] = {
      kind: 'ship',
      id,
      x: 400,
      y: 300,
      vx: 0,
      vy: 0,
      angle: 0
    };
    this.emit('join', socket);

    if (!this.isRunning && this.clients.size > 0) {
      this.startLoop();
    }
  }

  removeClient(socket: PlayerSocket): void {
    this.clients.delete(socket);
    if (socket.playerId) {
      const key = String(socket.playerId);
      delete this.state.ships[key];
      delete this.inputs[key];
    }
    this.emit('leave', socket);
    if (this.clients.size === 0) {
      this.stopLoop();
      this.emit('empty', this.id);
    }
  }

  handleInput(playerId: PlayerId, inputData: PhysicsInput): void {
    this.inputs[String(playerId)] = inputData;
  }

  startLoop(): void {
    this.isRunning = true;
    this.lastTickTime = Date.now();

    const tick = (): void => {
      if (!this.isRunning) {
        return;
      }

      const now = Date.now();
      const dt = (now - this.lastTickTime) / 1000;
      this.lastTickTime = now;

      updateGame(this.state, this.inputs, dt);

      const binarySnapshot = serializeSnapshot(this.state);
      for (const client of this.clients) {
        if (client.bufferedAmount === 0) {
          client.send(binarySnapshot);
        }
      }

      const elapsed = Date.now() - now;
      const nextTime = Math.max(0, this.intervalMs - elapsed);
      setTimeout(tick, nextTime);
    };

    setTimeout(tick, this.intervalMs);
  }

  stopLoop(): void {
    this.isRunning = false;
  }
}