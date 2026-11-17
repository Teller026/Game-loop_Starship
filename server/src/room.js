import { EventEmitter } from 'node:events';
import { updateGame } from '../../shared/src/physics.js';
import { serializeSnapshot } from '../../shared/src/protocol.js';

export class Room extends EventEmitter {
  constructor(id) {
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

  addClient(socket) {
    this.clients.add(socket);
    const id = Math.random().toString(36).substring(7);
    socket.playerId = id;
    this.state.ships[id] = { x: 400, y: 300, vx: 0, vy: 0, angle: 0 };
    this.emit('join', socket);

    if (!this.isRunning && this.clients.size > 0) {
      this.startLoop();
    }
  }

  removeClient(socket) {
    this.clients.delete(socket);
    if (socket.playerId) {
      delete this.state.ships[socket.playerId];
      delete this.inputs[socket.playerId];
    }
    this.emit('leave', socket);
    if (this.clients.size === 0) {
      this.stopLoop();
      this.emit('empty', this.id);
    }
  }

  handleInput(playerId, inputData) {
    this.inputs[playerId] = inputData;
  }

  startLoop() {
    this.isRunning = true;
    this.lastTickTime = Date.now();
    
    const tick = () => {
      if (!this.isRunning) return;

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

  stopLoop() {
    this.isRunning = false;
  }
}