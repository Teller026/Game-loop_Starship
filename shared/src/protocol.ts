import {
  toInputSeq,
  toPlayerId,
  toTickId,
  type DecodedInput,
  type DecodedSnapshot,
  type InputSeq,
  type SnapshotAsteroid,
  type SnapshotExplosion,
  type SnapshotInputShape,
  type SnapshotProjectile,
  type SnapshotShip
} from './types.js';

export const MSG_TYPE_INPUT = 1;
export const MSG_TYPE_SNAPSHOT = 2;
export const PROTOCOL_VERSION = 1;

function extractDataView(data: unknown): DataView | null {
  if (data instanceof ArrayBuffer) {
    return new DataView(data);
  }
  if (ArrayBuffer.isView(data)) {
    return new DataView(data.buffer, data.byteOffset, data.byteLength);
  }
  return null;
}

export function serializeInput(
  seq: InputSeq,
  dx: number,
  dy: number,
  fire: boolean
): ArrayBuffer {
  const buffer = new ArrayBuffer(9);
  const view = new DataView(buffer);
  view.setUint8(0, PROTOCOL_VERSION);
  view.setUint8(1, MSG_TYPE_INPUT);
  view.setUint32(2, seq >>> 0, true);
  view.setInt8(6, dx);
  view.setInt8(7, dy);
  view.setUint8(8, fire ? 1 : 0);
  return buffer;
}

export function deserializeInput(data: unknown): DecodedInput | null {
  const view = extractDataView(data);
  if (!view || view.byteLength < 9) {
    return null;
  }

  const version = view.getUint8(0);
  const type = view.getUint8(1);
  if (version !== PROTOCOL_VERSION || type !== MSG_TYPE_INPUT) {
    return null;
  }

  const seq = toInputSeq(view.getUint32(2, true));
  const dx = view.getInt8(6);
  const dy = view.getInt8(7);
  const fireByte = view.getUint8(8);

  if (dx < -1 || dx > 1 || dy < -1 || dy > 1) {
    return null;
  }
  if (fireByte !== 0 && fireByte !== 1) {
    return null;
  }

  return {
    seq,
    dx,
    dy,
    fire: fireByte === 1
  };
}

export function serializeSnapshot(state: SnapshotInputShape): ArrayBuffer {
  const shipEntries = Object.entries(state.ships ?? {});
  const shipCount = Math.min(shipEntries.length, 255);
  const asteroids = state.asteroids ?? [];
  const asteroidCount = Math.min(asteroids.length, 255);
  const projectiles = state.projectiles ?? [];
  const projectileCount = Math.min(projectiles.length, 255);
  const explosions = state.explosions ?? [];
  const explosionCount = Math.min(explosions.length, 255);

  const totalSize =
    7 +
    1 +
    shipCount * 28 +
    1 +
    asteroidCount * 12 +
    1 +
    projectileCount * 8 +
    1 +
    explosionCount * 8;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  view.setUint8(0, PROTOCOL_VERSION);
  view.setUint8(1, MSG_TYPE_SNAPSHOT);
  view.setUint32(2, Math.floor(Date.now() / 1000) % 4294967295, true);
  view.setUint8(6, shipCount);

  let offset = 7;
  for (let i = 0; i < shipCount; i += 1) {
    const entry = shipEntries[i];
    if (!entry) {
      continue;
    }
    const [id, ship] = entry;
    for (let b = 0; b < 8; b += 1) {
      view.setUint8(offset + b, b < id.length ? id.charCodeAt(b) : 0);
    }
    view.setFloat32(offset + 8, ship.x, true);
    view.setFloat32(offset + 12, ship.y, true);
    view.setFloat32(offset + 16, ship.vx, true);
    view.setFloat32(offset + 20, ship.vy, true);
    view.setFloat32(offset + 24, ship.hp !== undefined ? ship.hp : 100, true);
    offset += 28;
  }

  view.setUint8(offset, asteroidCount);
  offset += 1;
  for (let i = 0; i < asteroidCount; i += 1) {
    const ast = asteroids[i];
    if (!ast) {
      continue;
    }
    view.setFloat32(offset, ast.x, true);
    view.setFloat32(offset + 4, ast.y, true);
    view.setFloat32(offset + 8, ast.radius, true);
    offset += 12;
  }

  view.setUint8(offset, projectileCount);
  offset += 1;
  for (let i = 0; i < projectileCount; i += 1) {
    const p = projectiles[i];
    if (!p) {
      continue;
    }
    view.setFloat32(offset, p.x, true);
    view.setFloat32(offset + 4, p.y, true);
    offset += 8;
  }

  view.setUint8(offset, explosionCount);
  offset += 1;
  for (let i = 0; i < explosionCount; i += 1) {
    const ex = explosions[i];
    if (!ex) {
      continue;
    }
    view.setFloat32(offset, ex.x, true);
    view.setFloat32(offset + 4, ex.y, true);
    offset += 8;
  }

  return buffer;
}

export function deserializeSnapshot(data: unknown): DecodedSnapshot | null {
  const view = extractDataView(data);
  if (!view || view.byteLength < 8) {
    return null;
  }

  const version = view.getUint8(0);
  const type = view.getUint8(1);
  if (version !== PROTOCOL_VERSION || type !== MSG_TYPE_SNAPSHOT) {
    return null;
  }

  const timestamp = toTickId(view.getUint32(2, true));
  const shipCount = view.getUint8(6);

  if (view.byteLength < 8 + shipCount * 28 + 1) {
    return null;
  }

  const ships: Record<string, SnapshotShip> = {};
  let offset = 7;

  for (let i = 0; i < shipCount; i += 1) {
    const idChars: string[] = [];
    for (let b = 0; b < 8; b += 1) {
      const code = view.getUint8(offset + b);
      if (code !== 0) {
        idChars.push(String.fromCharCode(code));
      }
    }
    const rawId = idChars.join('');
    const x = view.getFloat32(offset + 8, true);
    const y = view.getFloat32(offset + 12, true);
    const vx = view.getFloat32(offset + 16, true);
    const vy = view.getFloat32(offset + 20, true);
    const hp = view.getFloat32(offset + 24, true);

    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(vx) ||
      !Number.isFinite(vy) ||
      !Number.isFinite(hp) ||
      hp < 0 ||
      hp > 1000
    ) {
      return null;
    }

    ships[rawId] = {
      kind: 'ship',
      id: toPlayerId(rawId),
      pos: { x, y },
      vel: { x: vx, y: vy },
      hp
    };
    offset += 28;
  }

  if (offset >= view.byteLength) {
    return null;
  }
  const asteroidCount = view.getUint8(offset);
  offset += 1;
  if (view.byteLength < offset + asteroidCount * 12 + 1) {
    return null;
  }

  const asteroids: SnapshotAsteroid[] = [];
  for (let i = 0; i < asteroidCount; i += 1) {
    const x = view.getFloat32(offset, true);
    const y = view.getFloat32(offset + 4, true);
    const radius = view.getFloat32(offset + 8, true);

    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(radius) ||
      radius <= 0 ||
      radius > 500
    ) {
      return null;
    }

    asteroids.push({
      kind: 'asteroid',
      pos: { x, y },
      radius
    });
    offset += 12;
  }

  if (offset >= view.byteLength) {
    return null;
  }
  const projectileCount = view.getUint8(offset);
  offset += 1;
  if (view.byteLength < offset + projectileCount * 8 + 1) {
    return null;
  }

  const projectiles: SnapshotProjectile[] = [];
  for (let i = 0; i < projectileCount; i += 1) {
    const x = view.getFloat32(offset, true);
    const y = view.getFloat32(offset + 4, true);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }

    projectiles.push({
      kind: 'projectile',
      pos: { x, y }
    });
    offset += 8;
  }

  if (offset >= view.byteLength) {
    return null;
  }
  const explosionCount = view.getUint8(offset);
  offset += 1;
  if (view.byteLength < offset + explosionCount * 8) {
    return null;
  }

  const explosions: SnapshotExplosion[] = [];
  for (let i = 0; i < explosionCount; i += 1) {
    const x = view.getFloat32(offset, true);
    const y = view.getFloat32(offset + 4, true);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }

    explosions.push({
      kind: 'explosion',
      pos: { x, y }
    });
    offset += 8;
  }

  return {
    timestamp,
    ships,
    asteroids,
    projectiles,
    explosions
  };
}