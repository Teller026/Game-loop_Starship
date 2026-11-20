import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { WebSocket } from 'ws';
import { createMatchWriteStream } from './logger.js';
import { serializeInput } from '../../shared/dist/protocol.js';
import { toInputSeq } from '../../shared/dist/types.js';

const BOT_COUNT = 8;
const DURATION_MS = 30_000;
const INPUT_INTERVAL_MS = 50;
const WS_URL = process.env.WS_URL ?? 'ws://localhost:3000';
const ROOM_ID = process.env.ROOM_ID ?? 'bot-30s-room';
const MATCH_ID = process.env.MATCH_ID ?? `bot-30s-${Date.now()}`;

async function run30sBotSession(): Promise<void> {
  const logStream = createMatchWriteStream(MATCH_ID);
  const sockets: WebSocket[] = [];
  let seqCounter = 1;
  let sentInputs = 0;
  let receivedSnapshots = 0;
  let errors = 0;

  for (let i = 0; i < BOT_COUNT; i += 1) {
    const ws = new WebSocket(WS_URL);
    ws.binaryType = 'arraybuffer';

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Bot ${i} connect timeout`)), 5000);
      ws.once('open', () => {
        clearTimeout(timer);
        ws.send(JSON.stringify({ type: 'join', roomId: ROOM_ID }));
        resolve();
      });
      ws.once('error', err => {
        clearTimeout(timer);
        reject(err);
      });
    });

    ws.on('message', (_data, isBinary) => {
      if (isBinary) {
        receivedSnapshots += 1;
      }
    });

    ws.on('error', () => {
      errors += 1;
    });

    sockets.push(ws);
  }

  const startTime = Date.now();
  let tick = 0;

  await new Promise<void>(resolve => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= DURATION_MS) {
        clearInterval(interval);
        resolve();
        return;
      }

      for (let i = 0; i < sockets.length; i += 1) {
        const ws = sockets[i];
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          continue;
        }
        const phase = (tick + i * 5) % 16;
        const dx = phase < 4 ? 1 : phase < 8 ? 0 : phase < 12 ? -1 : 0;
        const dy = phase % 8 < 4 ? -1 : 1;
        const fire = tick % 6 === i % 6;

        const frame = serializeInput(toInputSeq(seqCounter++), dx, dy, fire);
        ws.send(frame);
        sentInputs += 1;
      }

      logStream.write({
        elapsedMs: elapsed,
        tick,
        sentInputs,
        receivedSnapshots,
        errors
      });

      tick += 1;
    }, INPUT_INTERVAL_MS);
  });

  for (const ws of sockets) {
    ws.close(1000, '30s bot run completed');
  }

  logStream.end();

  const summary = {
    matchId: MATCH_ID,
    roomId: ROOM_ID,
    bots: BOT_COUNT,
    durationMs: Date.now() - startTime,
    ticks: tick,
    sentInputs,
    receivedSnapshots,
    errors,
    logFile: path.resolve('logs', `${MATCH_ID}.ndjson`)
  };

  console.log(JSON.stringify(summary, null, 2));
}

run30sBotSession().catch(err => {
  console.error(err);
  process.exit(1);
});