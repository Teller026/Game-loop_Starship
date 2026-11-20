import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, type RawData } from 'ws';
import { config } from './config.js';
import { Room, type PlayerSocket } from './room.js';
import { createMatchReadStream } from './logger.js';
import { deserializeInput } from '../../shared/dist/protocol.js';
import { parseClientMessage } from '../../shared/dist/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '../..');
const CLIENT_DIR = path.resolve(ROOT_DIR, 'client');
const CLIENT_DIST_DIR = path.resolve(CLIENT_DIR, 'dist');
const CLIENT_PUBLIC_DIR = path.resolve(CLIENT_DIR, 'public');

const rooms = new Map<string, Room>();
rooms.set('default-room', new Room('default-room'));

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url ?? '/', 'http://' + (req.headers.host ?? 'localhost'));
  const pathname = decodeURIComponent(urlObj.pathname);

  if (pathname.startsWith('/api/matches/') && pathname.endsWith('/replay') && req.method === 'GET') {
    const matchId = pathname.split('/')[3] ?? '';
    const readStream = createMatchReadStream(matchId);

    if (!readStream) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Match log not found' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/x-ndjson' });
    readStream.pipe(res);
    return;
  }

  if (pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return;
  }

  if (pathname === '/api/rooms' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ rooms: Array.from(rooms.keys()) }));
    return;
  }

  if (pathname === '/api/rooms' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const parsed: unknown = JSON.parse(body);
        const rawRoomId =
          typeof parsed === 'object' && parsed !== null && 'roomId' in parsed
            ? parsed.roomId
            : undefined;
        const roomId = typeof rawRoomId === 'string' && rawRoomId.length > 0 ? rawRoomId : 'default-room';
        if (!rooms.has(roomId)) {
          const room = new Room(roomId);
          room.on('empty', id => {
            rooms.delete(id);
          });
          rooms.set(roomId, room);
        }
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ roomId }));
      } catch (_err: unknown) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  const safePath = path.normalize(pathname);
  if (safePath.includes('..')) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');

  const possiblePaths = [
    path.join(CLIENT_DIST_DIR, relativePath),
    path.join(CLIENT_PUBLIC_DIR, relativePath),
    path.join(CLIENT_DIR, relativePath),
    path.join(ROOT_DIR, relativePath)
  ];

  findAndSendFirstExisting(possiblePaths, res, pathname);
});

function findAndSendFirstExisting(
  paths: readonly string[],
  res: http.ServerResponse,
  pathname: string
): void {
  if (paths.length === 0) {
    try {
      const filename = path.basename(pathname);
      const prefix = filename.split('_')[0];
      if (prefix && fs.existsSync(CLIENT_PUBLIC_DIR)) {
        const files = fs.readdirSync(CLIENT_PUBLIC_DIR);
        const matchedFile = files.find(f => f.startsWith(prefix));
        if (matchedFile) {
          const resolvedPath = path.join(CLIENT_PUBLIC_DIR, matchedFile);
          sendFile(resolvedPath, res);
          return;
        }
      }
    } catch (_err: unknown) {}

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  const currentPath = paths[0];
  if (!currentPath) {
    findAndSendFirstExisting(paths.slice(1), res, pathname);
    return;
  }

  fs.stat(currentPath, (err, stats) => {
    if (!err && stats.isFile()) {
      sendFile(currentPath, res);
    } else {
      findAndSendFirstExisting(paths.slice(1), res, pathname);
    }
  });
}

function sendFile(filePath: string, res: http.ServerResponse): void {
  const ext = path.extname(filePath);
  const map: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.ts': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav'
  };

  res.writeHead(200, { 'Content-Type': map[ext] ?? 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

function rawDataToArrayBuffer(rawData: RawData): ArrayBuffer {
  if (rawData instanceof ArrayBuffer) {
    return rawData;
  }
  const buf = Array.isArray(rawData) ? Buffer.concat(rawData) : rawData;
  const copy = new Uint8Array(buf.byteLength);
  copy.set(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
  return copy.buffer;
}

const wss = new WebSocketServer({ server });

wss.on('connection', rawWs => {
  const ws = rawWs as PlayerSocket /* ws WebSocket lacks custom player/room fields */;
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (rawData: RawData, isBinaryMessage: boolean) => {
    if (!isBinaryMessage) {
      const text =
        Buffer.isBuffer(rawData)
          ? rawData.toString('utf8')
          : Array.isArray(rawData)
            ? Buffer.concat(rawData).toString('utf8')
            : rawData instanceof ArrayBuffer
              ? Buffer.from(rawData).toString('utf8')
              : '';

      if (text.trim().startsWith('{')) {
        const parsed = parseClientMessage(text);
        if (!parsed) {
          console.warn('Invalid client JSON message, closing socket');
          ws.close(1008, 'Invalid JSON message');
          return;
        }

        if (parsed.type === 'join') {
          const roomId = parsed.roomId || 'default-room';
          let room = rooms.get(roomId);
          if (!room) {
            room = new Room(roomId);
            room.on('empty', id => {
              rooms.delete(id);
            });
            rooms.set(roomId, room);
          }
          ws.currentRoom = room;
          room.addClient(ws);
          console.log('Player joined room: ' + roomId);
        }
        return;
      }
    }

    const input = deserializeInput(rawDataToArrayBuffer(rawData));
    if (input && ws.currentRoom && ws.playerId) {
      ws.currentRoom.handleInput(ws.playerId, input);
    }
  });
});

const interval = setInterval(() => {
  wss.clients.forEach(rawClient => {
    const client = rawClient as PlayerSocket /* ws client set stores generic WebSocket */;
    if (client.isAlive === false) {
      client.terminate();
      return;
    }
    client.isAlive = false;
    client.ping();
  });
}, config.pingInterval);

process.on('SIGINT', () => {
  console.log('Received SIGINT. Shutting down gracefully...');
  wss.close(() => {
    server.close(() => {
      console.log('Server closed. Exiting process.');
      process.exit(0);
    });
  });
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Shutting down gracefully...');
  wss.close(() => {
    server.close(() => {
      console.log('Server closed. Exiting process.');
      process.exit(0);
    });
  });
});

wss.on('close', () => {
  clearInterval(interval);
});

server.listen(config.port, () => {
  console.log('Server is running on port ' + config.port);
});