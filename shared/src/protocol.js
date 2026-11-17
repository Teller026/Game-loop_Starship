export const MSG_TYPE_INPUT = 1;
export const MSG_TYPE_SNAPSHOT = 2;
export const PROTOCOL_VERSION = 1;

export function serializeInput(seq, dx, dy, fire) {
  const buffer = new ArrayBuffer(9);
  const view = new DataView(buffer);
  view.setUint8(0, PROTOCOL_VERSION);
  view.setUint8(1, MSG_TYPE_INPUT);
  view.setUint32(2, seq, true);
  view.setInt8(6, dx);
  view.setInt8(7, dy);
  view.setUint8(8, fire ? 1 : 0);
  return buffer;
}

export function deserializeInput(data) {
  let buf = data;
  if (typeof Buffer !== 'undefined' && data instanceof Buffer) {
    buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  }
  const view = new DataView(buf);
  const version = view.getUint8(0);
  const type = view.getUint8(1);
  if (version !== PROTOCOL_VERSION || type !== MSG_TYPE_INPUT) {
    return null;
  }
  return {
    seq: view.getUint32(2, true),
    dx: view.getInt8(6),
    dy: view.getInt8(7),
    fire: view.getUint8(8) === 1
  };
}

export function serializeSnapshot(state) {
  const shipEntries = Object.entries(state.ships || {});
  const shipCount = shipEntries.length;
  const asteroids = state.asteroids || [];
  const asteroidCount = asteroids.length;
  const projectiles = state.projectiles || [];
  const projectileCount = projectiles.length;
  const explosions = state.explosions || [];
  const explosionCount = explosions.length;

  const totalSize = 7 + 1 + shipCount * 28 + 1 + asteroidCount * 12 + 1 + projectileCount * 8 + 1 + explosionCount * 8;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  view.setUint8(0, PROTOCOL_VERSION);
  view.setUint8(1, MSG_TYPE_SNAPSHOT);
  view.setUint32(2, Math.floor(Date.now() / 1000) % 4294967295, true);
  view.setUint8(6, shipCount);

  let offset = 7;
  for (let i = 0; i < shipCount; i++) {
    const [id, ship] = shipEntries[i];
    for (let b = 0; b < 8; b++) {
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
  for (let i = 0; i < asteroidCount; i++) {
    const ast = asteroids[i];
    view.setFloat32(offset, ast.x, true);
    view.setFloat32(offset + 4, ast.y, true);
    view.setFloat32(offset + 8, ast.radius, true);
    offset += 12;
  }

  view.setUint8(offset, projectileCount);
  offset += 1;
  for (let i = 0; i < projectileCount; i++) {
    const p = projectiles[i];
    view.setFloat32(offset, p.x, true);
    view.setFloat32(offset + 4, p.y, true);
    offset += 8;
  }

  view.setUint8(offset, explosionCount);
  offset += 1;
  for (let i = 0; i < explosionCount; i++) {
    const ex = explosions[i];
    view.setFloat32(offset, ex.x, true);
    view.setFloat32(offset + 4, ex.y, true);
    offset += 8;
  }

  return buffer;
}

export function deserializeSnapshot(data) {
  let buf = data;
  if (typeof Buffer !== 'undefined' && data instanceof Buffer) {
    buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  }
  const view = new DataView(buf);
  const version = view.getUint8(0);
  const type = view.getUint8(1);
  if (version !== PROTOCOL_VERSION || type !== MSG_TYPE_SNAPSHOT) {
    return null;
  }

  const timestamp = view.getUint32(2, true);
  const shipCount = view.getUint8(6);
  const ships = {};

  let offset = 7;
  for (let i = 0; i < shipCount; i++) {
    let idChars = [];
    for (let b = 0; b < 8; b++) {
      const code = view.getUint8(offset + b);
      if (code !== 0) idChars.push(String.fromCharCode(code));
    }
    const id = idChars.join('');
    
    const x = view.getFloat32(offset + 8, true);
    const y = view.getFloat32(offset + 12, true);
    const vx = view.getFloat32(offset + 16, true);
    const vy = view.getFloat32(offset + 20, true);
    const hp = view.getFloat32(offset + 24, true);

    ships[id] = { x, y, vx, vy, hp };
    offset += 28;
  }

  const asteroids = [];
  if (offset < view.byteLength) {
    const asteroidCount = view.getUint8(offset);
    offset += 1;
    for (let i = 0; i < asteroidCount; i++) {
      const x = view.getFloat32(offset, true);
      const y = view.getFloat32(offset + 4, true);
      const radius = view.getFloat32(offset + 8, true);
      asteroids.push({ x, y, radius });
      offset += 12;
    }
  }

  const projectiles = [];
  if (offset < view.byteLength) {
    const projectileCount = view.getUint8(offset);
    offset += 1;
    for (let i = 0; i < projectileCount; i++) {
      const x = view.getFloat32(offset, true);
      const y = view.getFloat32(offset + 4, true);
      projectiles.push({ x, y });
      offset += 8;
    }
  }

  const explosions = [];
  if (offset < view.byteLength) {
    const explosionCount = view.getUint8(offset);
    offset += 1;
    for (let i = 0; i < explosionCount; i++) {
      const x = view.getFloat32(offset, true);
      const y = view.getFloat32(offset + 4, true);
      explosions.push({ x, y });
      offset += 8;
    }
  }

  return { timestamp, ships, asteroids, projectiles, explosions };
}