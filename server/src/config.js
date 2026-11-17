import process from 'node:process';
import path from 'node:path';

export const config = {
  port: Number(process.env.PORT) || 3000,
  logDir: process.env.LOG_DIR || path.resolve(process.cwd(), 'logs'),
  maxMessageSize: 1024,
  pingInterval: 15000,
  pongTimeout: 30000
};

if (Number.isNaN(config.port) || config.port <= 0) {
  throw new Error('Invalid port configuration');
}