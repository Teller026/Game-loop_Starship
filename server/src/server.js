import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { config } from './config.js';
import { Room } from './room.js';
import { createMatchReadStream } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIR = path.resolve(__dirname, '../../client');

const rooms = new Map();

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, 'http://' + req.headers.host);
  const pathname = urlObj.pathname;
  if (pathname.startsWith('/api/matches/') && pathname.endsWith('/replay') && req.method === 'GET') {
    const matchId = pathname.split('/')[3];
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
        const data = JSON.parse(body);
        const roomId = data.roomId || 'default-room';
        if (!rooms.has(roomId)) {
          const room = new Room(roomId);
          room.on('empty', id => {
            rooms.delete(id);
          });
          rooms.set(roomId, room);
        }
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ roomId }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  let safePath = path.normalize(pathname);
  if (safePath.includes('..')) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  let filePath = path.join(CLIENT_DIR, pathname === '/' ? 'index.html' : pathname);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath);
    const map = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.wav': 'audio/wav'
    };

    res.writeHead(200, { 'Content-Type': map[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
});

const wss = new WebSocketServer({ server });

wss.on('connection', ws => {
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', data => {
    if (data.length > config.maxMessageSize) {
      ws.close(1009, 'Message too large');
      return;
    }
    try {
      const message = JSON.parse(data);
      if (!message.type) {
        ws.close(1003, 'Invalid message structure');
        return;
      }
    } catch (e) {
      ws.close(1003, 'Malformed JSON');
    }
  });

  ws.on('close', () => {
    if (ws.currentRoom) {
      ws.currentRoom.removeClient(ws);
    }
  });
});

const interval = setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
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