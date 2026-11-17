import { serializeInput, deserializeSnapshot, PROTOCOL_VERSION, MSG_TYPE_SNAPSHOT } from '../../shared/src/protocol.js';

export class GameSocket {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.queue = [];
    this.seq = 0;
    this.onSnapshot = null;
  }

  connect(roomId = 'default-room') {
    this.socket = new WebSocket(this.url);
    this.socket.binaryType = 'arraybuffer';

    this.socket.onopen = () => {
      this.socket.send(JSON.stringify({ type: 'join', roomId }));
      while (this.queue.length > 0 && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(this.queue.shift());
      }
    };

    this.socket.onclose = () => {
      setTimeout(() => this.connect(roomId), 2000);
    };

    this.socket.onerror = () => {
      this.socket.close();
    };

    this.socket.onmessage = event => {
      if (event.data instanceof ArrayBuffer) {
        const view = new DataView(event.data);
        const version = view.getUint8(0);
        const type = view.getUint8(1);
        if (version === PROTOCOL_VERSION && type === MSG_TYPE_SNAPSHOT) {
          const snapshot = deserializeSnapshot(event.data);
          if (this.onSnapshot) {
            this.onSnapshot(snapshot);
          }
        }
      }
    };
  }

  sendInput(dx, dy, fire) {
    this.seq += 1;
    const buffer = serializeInput(this.seq, dx, dy, fire);
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(buffer);
    } else {
      this.queue.push(buffer);
    }
  }
}