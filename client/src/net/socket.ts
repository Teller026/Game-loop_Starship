import {
  serializeInput,
  deserializeSnapshot,
  PROTOCOL_VERSION,
  MSG_TYPE_SNAPSHOT
} from '../../../shared/dist/protocol.js';
import { toInputSeq, type InputSeq } from '../../../shared/dist/types.js';

export type SnapshotData = ReturnType<typeof deserializeSnapshot>;

type QueuedPayload = string | Blob | ArrayBuffer | ArrayBufferView<ArrayBuffer>;

export class GameSocket {
  url: string;
  socket: WebSocket | null;
  queue: QueuedPayload[];
  seq: InputSeq;
  onSnapshot: ((snapshot: SnapshotData) => void) | null;

  constructor(url: string) {
    this.url = url;
    this.socket = null;
    this.queue = [];
    this.seq = toInputSeq(0);
    this.onSnapshot = null;
  }

  connect(roomId = 'default-room'): void {
    this.socket = new WebSocket(this.url);
    this.socket.binaryType = 'arraybuffer';

    this.socket.onopen = (): void => {
      if (!this.socket) return;
      this.socket.send(JSON.stringify({ type: 'join', roomId }));
      while (this.queue.length > 0 && this.socket.readyState === WebSocket.OPEN) {
        const item = this.queue.shift();
        if (item !== undefined) {
          this.socket.send(item);
        }
      }
    };

    this.socket.onclose = (): void => {
      setTimeout(() => this.connect(roomId), 2000);
    };

    this.socket.onerror = (): void => {
      this.socket?.close();
    };

    this.socket.onmessage = (event: MessageEvent<unknown>): void => {
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

  sendInput(dx: number, dy: number, fire: boolean): void {
    this.seq = toInputSeq(Number(this.seq) + 1);
    const buffer = serializeInput(this.seq, dx, dy, fire);
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(buffer);
    } else {
      this.queue.push(buffer);
    }
  }
}