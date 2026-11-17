export const MSG_TYPE_INPUT = 1;
export const MSG_TYPE_SNAPSHOT = 2;
export const PROTOCOL_VERSION = 1;

export function serializeInput(seq, thrust, turn) {
  const buffer = new ArrayBuffer(9);
  const view = new DataView(buffer);
  view.setUint8(0, PROTOCOL_VERSION);
  view.setUint8(1, MSG_TYPE_INPUT);
  view.setUint32(2, seq, true);
  view.setUint8(6, thrust ? 1 : 0);
  view.setInt16(7, Math.round(turn * 100), true);
  return buffer;
}

export function deserializeInput(data) {
  const view = new DataView(data);
  const version = view.getUint8(0);
  const type = view.getUint8(1);
  if (version !== PROTOCOL_VERSION || type !== MSG_TYPE_INPUT) {
    return null;
  }
  return {
    seq: view.getUint32(2, true),
    thrust: view.getUint8(6) === 1,
    turn: view.getInt16(7, true) / 100
  };
}

export function serializeSnapshot(state) {
  const shipEntries = Object.entries(state.ships);
  const count = shipEntries.length;
  const buffer = new ArrayBuffer(6 + count * 21);
  const view = new DataView(buffer);

  view.setUint8(0, PROTOCOL_VERSION);
  view.setUint8(1, MSG_TYPE_SNAPSHOT);
  view.setUint32(2, Date.now() % 4294967295, true);
  view.setUint8(6, count);

  let offset = 7;
  for (const [id, ship] of shipEntries) {
    const idCode = id.charCodeAt(0) || 0;
    view.setUint8(offset, idCode);
    view.setFloat32(offset + 1, ship.x, true);
    view.setFloat32(offset + 5, ship.y, true);
    view.setFloat32(offset + 9, ship.vx, true);
    view.setFloat32(offset + 13, ship.vy, true);
    view.setInt16(offset + 17, Math.round(ship.angle * 100), true);
    offset += 19;
  }

  return buffer;
}

export function deserializeSnapshot(data) {
  const view = new DataView(data);
  const version = view.getUint8(0);
  const type = view.getUint8(1);
  if (version !== PROTOCOL_VERSION || type !== MSG_TYPE_SNAPSHOT) {
    return null;
  }

  const timestamp = view.getUint32(2, true);
  const count = view.getUint8(6);
  const ships = {};

  let offset = 7;
  for (let i = 0; i < count; i += 1) {
    const idCode = view.getUint8(offset);
    const id = String.fromCharCode(idCode);
    const x = view.getFloat32(offset + 1, true);
    const y = view.getFloat32(offset + 5, true);
    const vx = view.getFloat32(offset + 9, true);
    const vy = view.getFloat32(offset + 13, true);
    const angle = view.getInt16(offset + 17, true) / 100;

    ships[id] = { x, y, vx, vy, angle };
    offset += 19;
  }

  return { timestamp, ships };
}