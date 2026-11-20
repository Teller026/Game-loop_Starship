import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import {
  MSG_TYPE_INPUT,
  MSG_TYPE_SNAPSHOT,
  PROTOCOL_VERSION,
  deserializeInput,
  deserializeSnapshot,
  serializeInput,
  serializeSnapshot
} from './protocol.js';
import { parseClientMessage, toInputSeq, toPlayerId } from './types.js';

describe('shared protocol & message validation', () => {
  it('encodes and decodes valid input frame', () => {
    const buf = serializeInput(toInputSeq(42), -1, 1, true);
    expect(buf.byteLength).toBe(9);
    const decoded = deserializeInput(buf);
    expect(decoded).toEqual({
      seq: 42,
      dx: -1,
      dy: 1,
      fire: true
    });
  });

  it('rejects input with invalid version, type, direction, or fire byte', () => {
    const badVersion = new Uint8Array([99, MSG_TYPE_INPUT, 1, 0, 0, 0, 0, 0, 0]);
    expect(deserializeInput(badVersion.buffer)).toBeNull();

    const badType = new Uint8Array([PROTOCOL_VERSION, MSG_TYPE_SNAPSHOT, 1, 0, 0, 0, 0, 0, 0]);
    expect(deserializeInput(badType.buffer)).toBeNull();

    const badDx = new Uint8Array([PROTOCOL_VERSION, MSG_TYPE_INPUT, 1, 0, 0, 0, 2, 0, 0]);
    expect(deserializeInput(badDx.buffer)).toBeNull();

    const badDy = new Uint8Array([PROTOCOL_VERSION, MSG_TYPE_INPUT, 1, 0, 0, 0, 0, -2, 0]);
    expect(deserializeInput(badDy.buffer)).toBeNull();

    const badFire = new Uint8Array([PROTOCOL_VERSION, MSG_TYPE_INPUT, 1, 0, 0, 0, 0, 0, 2]);
    expect(deserializeInput(badFire.buffer)).toBeNull();
  });

  it('rejects short or non-binary input data without throwing', () => {
    expect(deserializeInput(null)).toBeNull();
    expect(deserializeInput('invalid')).toBeNull();
    expect(deserializeInput(new ArrayBuffer(8))).toBeNull();
  });

  it('encodes and decodes snapshot with ships, asteroids, projectiles, and explosions', () => {
    const snapBuf = serializeSnapshot({
      ships: {
        p1: { x: 120.5, y: 240.25, vx: 10, vy: -5, hp: 80 }
      },
      asteroids: [{ x: 300, y: 150, radius: 24 }],
      projectiles: [{ x: 120, y: 200 }],
      explosions: [{ x: 300, y: 150 }]
    });

    const decoded = deserializeSnapshot(snapBuf);
    expect(decoded).not.toBeNull();
    expect(decoded?.ships.p1?.id).toBe(toPlayerId('p1'));
    expect(decoded?.ships.p1?.pos.x).toBeCloseTo(120.5, 4);
    expect(decoded?.ships.p1?.pos.y).toBeCloseTo(240.25, 4);
    expect(decoded?.ships.p1?.hp).toBeCloseTo(80, 4);
    expect(decoded?.asteroids).toHaveLength(1);
    expect(decoded?.projectiles).toHaveLength(1);
    expect(decoded?.explosions).toHaveLength(1);
  });

  it('parses valid client messages and rejects malformed or unknown payloads', () => {
    expect(parseClientMessage(JSON.stringify({ type: 'join', roomId: 'room-1' }))).toEqual({
      type: 'join',
      roomId: 'room-1'
    });
    expect(parseClientMessage({ type: 'ping', clientTime: 12345 })).toEqual({
      type: 'ping',
      clientTime: 12345
    });
    expect(parseClientMessage('{broken json')).toBeNull();
    expect(parseClientMessage(JSON.stringify({ type: 'join', roomId: '' }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({ type: 'unknown' }))).toBeNull();
    expect(parseClientMessage(new TextEncoder().encode('{"type":"ping","clientTime":1}'))).toEqual({
      type: 'ping',
      clientTime: 1
    });
    expect(parseClientMessage(new Uint8Array([0xff, 0xfe]))).toBeNull();
  });

  it('fc: input round-trip preserves seq, direction, and fire flag', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 0xffffffff }),
        fc.integer({ min: -1, max: 1 }),
        fc.integer({ min: -1, max: 1 }),
        fc.boolean(),
        (seqRaw, dx, dy, fire) => {
          const encoded = serializeInput(toInputSeq(seqRaw), dx, dy, fire);
          const decoded = deserializeInput(encoded);
          expect(decoded).toEqual({
            seq: seqRaw >>> 0,
            dx,
            dy,
            fire
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('fc: snapshot frame byteLength matches header + entity counts layout', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 0, max: 30 }),
        fc.integer({ min: 0, max: 30 }),
        fc.integer({ min: 0, max: 20 }),
        (shipN, astN, projN, expN) => {
          const ships: Record<string, { x: number; y: number; vx: number; vy: number; hp: number }> = {};
          for (let i = 0; i < shipN; i += 1) {
            ships[`s${i}`] = { x: 100 + i, y: 200 + i, vx: 0, vy: 0, hp: 100 };
          }
          const asteroids = Array.from({ length: astN }, (_, i) => ({
            x: 50 + i * 10,
            y: 60 + i * 5,
            radius: 20
          }));
          const projectiles = Array.from({ length: projN }, (_, i) => ({
            x: 10 + i,
            y: 20 + i
          }));
          const explosions = Array.from({ length: expN }, (_, i) => ({
            x: 30 + i,
            y: 40 + i
          }));

          const buf = serializeSnapshot({ ships, asteroids, projectiles, explosions });
          const expectedLength = 8 + shipN * 28 + 1 + astN * 12 + 1 + projN * 8 + 1 + expN * 8;
          expect(buf.byteLength).toBe(expectedLength);
        }
      ),
      { numRuns: 80 }
    );
  });

  it('fc: arbitrary or truncated buffers never throw and return null when invalid', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 0, maxLength: 128 }), bytes => {
        const copy = bytes.slice();
        const inputRes = deserializeInput(copy.buffer);
        if (inputRes !== null) {
          expect(inputRes.dx).toBeGreaterThanOrEqual(-1);
          expect(inputRes.dx).toBeLessThanOrEqual(1);
          expect(inputRes.dy).toBeGreaterThanOrEqual(-1);
          expect(inputRes.dy).toBeLessThanOrEqual(1);
        }
        const snapRes = deserializeSnapshot(copy.buffer);
        if (snapRes !== null) {
          expect(snapRes.asteroids.length).toBeLessThanOrEqual(255);
        }
      }),
      { numRuns: 150 }
    );
  });

  it('fc: parseClientMessage accepts valid join/ping and rejects arbitrary strings', () => {
    fc.assert(
      fc.property(fc.string(), randomStr => {
        const parsed = parseClientMessage(randomStr);
        if (parsed !== null) {
          expect(parsed.type === 'join' || parsed.type === 'ping').toBe(true);
        }
      }),
      { numRuns: 120 }
    );

    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 64 }).filter(s => s.trim().length > 0),
        roomId => {
          expect(parseClientMessage(JSON.stringify({ type: 'join', roomId }))).toEqual({
            type: 'join',
            roomId
          });
        }
      ),
      { numRuns: 80 }
    );
  });

  it('fc: Float32 coordinate/angle quantization stays within expected epsilon', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(-5000), max: Math.fround(5000), noNaN: true }),
        fc.float({ min: Math.fround(1), max: Math.fround(200), noNaN: true }),
        (coord, radius) => {
          const buf = serializeSnapshot({
            ships: {},
            asteroids: [{ x: coord, y: coord, radius }],
            projectiles: [],
            explosions: []
          });
          const decoded = deserializeSnapshot(buf);
          const ast = decoded?.asteroids[0];
          expect(ast).toBeDefined();
          if (ast) {
            expect(Math.abs(ast.pos.x - coord)).toBeLessThan(Math.max(1e-2, Math.abs(coord) * 1e-5));
            expect(Math.abs(ast.radius - radius)).toBeLessThan(1e-2);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});