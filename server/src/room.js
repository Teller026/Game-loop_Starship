import { EventEmitter } from 'node:events';

export class Room extends EventEmitter {
  constructor(id) {
    super();
    this.id = id;
    this.clients = new Set();
  }

  addClient(socket) {
    this.clients.add(socket);
    this.emit('join', socket);
  }

  removeClient(socket) {
    this.clients.delete(socket);
    this.emit('leave', socket);
    if (this.clients.size === 0) {
      this.emit('empty', this.id);
    }
  }

  broadcast(data, sender = null) {
    for (const client of this.clients) {
      if (client !== sender) {
        if (client.bufferedAmount === 0) {
          client.send(JSON.stringify(data));
        }
      }
    }
  }
}