import process from 'node:process';
import path from 'node:path';
import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  LOG_DIR: z.string().min(1).default(path.resolve(process.cwd(), 'logs')),
  MAX_MESSAGE_SIZE: z.coerce.number().int().positive().default(1024),
  PING_INTERVAL: z.coerce.number().int().positive().default(15000),
  PONG_TIMEOUT: z.coerce.number().int().positive().default(30000)
});

const parsedEnv = EnvSchema.safeParse({
  PORT: process.env.PORT,
  LOG_DIR: process.env.LOG_DIR,
  MAX_MESSAGE_SIZE: process.env.MAX_MESSAGE_SIZE,
  PING_INTERVAL: process.env.PING_INTERVAL,
  PONG_TIMEOUT: process.env.PONG_TIMEOUT
});

if (!parsedEnv.success) {
  throw new Error('Invalid environment configuration');
}

export const config = {
  port: parsedEnv.data.PORT,
  logDir: parsedEnv.data.LOG_DIR,
  maxMessageSize: parsedEnv.data.MAX_MESSAGE_SIZE,
  pingInterval: parsedEnv.data.PING_INTERVAL,
  pongTimeout: parsedEnv.data.PONG_TIMEOUT
};