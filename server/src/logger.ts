import fs from 'node:fs';
import path from 'node:path';
import { Transform, pipeline, type Readable, type Writable } from 'node:stream';
import { config } from './config.js';

if (!fs.existsSync(config.logDir)) {
  fs.mkdirSync(config.logDir, { recursive: true });
}

export function createMatchWriteStream(matchId: string): Writable {
  const filePath = path.join(config.logDir, matchId + '.ndjson');
  const fileStream = fs.createWriteStream(filePath, { flags: 'a' });

  const transformStream = new Transform({
    writableObjectMode: true,
    transform(chunk: unknown, _encoding, callback) {
      const line = JSON.stringify(chunk) + '\n';
      callback(null, line);
    }
  });

  pipeline(transformStream, fileStream, err => {
    if (err) {
      console.error('Match log pipeline failed:', err);
    }
  });

  return transformStream;
}

export function createMatchReadStream(matchId: string): Readable | null {
  const filePath = path.join(config.logDir, matchId + '.ndjson');
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.createReadStream(filePath);
}