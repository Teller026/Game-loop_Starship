import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import {
  assertNever,
  parseClientMessage,
  toInputSeq,
  toPlayerId,
  toTickId
} from './types.js';
import {
  deserializeInput,
  deserializeSnapshot,
  serializeInput,
  serializeSnapshot
} from './protocol.js';

describe('branded types, prng, and boundary validation cases', () => {
  it('creates branded IDs, ticks, and input sequence numbers', () => {
    const pid = toPlayerId('player-7');
    const tick = toTickId(120);
    const seq = toInputSeq(999);
    expect(String(pid)).toBe('player-7');
    expect(Number(tick)).toBe(120);
    expect(Number(seq)).toBe(999);
  });

  it('assertNever throws descriptive error when invoked', () => {
    expect(() => assertNever('unexpected' as never, 'test-switch')).toThrow(
      /Unhandled union member in test-switch/
    );
  });

  it('handles Uint8Array and ArrayBuffer inputs in parseClientMessage', () => {
    const validBuf = new TextEncoder().encode(JSON.stringify({ type: 'join', roomId: 'alpha' }));
    expect(parseClientMessage(validBuf)).toEqual({ type: 'join', roomId: 'alpha' });

    const arrayBuf = new TextEncoder().encode(JSON.stringify({ type: 'ping', clientTime: 42 })).buffer;
    expect(parseClientMessage(arrayBuf)).toEqual({ type: 'ping', clientTime: 42 });

    expect(parseClientMessage(123 as unknown)).toBeNull();
    expect(parseClientMessage(null)).toBeNull();
    expect(parseClientMessage(undefined)).toBeNull();
  });

  it('rejects snapshot with bad version, bad type, truncated payload, or out-of-range values', () => {
    expect(deserializeSnapshot(null)).toBeNull();
    expect(deserializeSnapshot('not-a-buffer')).toBeNull();
    expect(deserializeSnapshot(new ArrayBuffer(4))).toBeNull();

    const wrongVersion = new Uint8Array(serializeSnapshot({ ships: {} }));
    wrongVersion[0] = 99;
    expect(deserializeSnapshot(wrongVersion.buffer)).toBeNull();

    const wrongType = new Uint8Array(serializeSnapshot({ ships: {} }));
    wrongType[1] = 1;
    expect(deserializeSnapshot(wrongType.buffer)).toBeNull();

    const claimedTooManyShips = new Uint8Array(serializeSnapshot({ ships: {} }));
    claimedTooManyShips[6] = 5;
    expect(deserializeSnapshot(claimedTooManyShips.buffer)).toBeNull();

    const fullSnap = serializeSnapshot({
      ships: { p1: { x: 100, y: 100, vx: 0, vy: 0, hp: 100 } },
      asteroids: [{ x: 200, y: 200, radius: 20 }],
      projectiles: [{ x: 150, y: 150 }],
      explosions: [{ x: 250, y: 250 }]
    });
    expect(deserializeSnapshot(fullSnap.slice(0, fullSnap.byteLength - 5))).toBeNull();
    expect(deserializeSnapshot(fullSnap.slice(0, 10))).toBeNull();
  });

  it('handles multiple ships, asteroids, projectiles, and explosions in round-trip', () => {
    const snap = serializeSnapshot({
      ships: {
        a1: { x: 10, y: 20, vx: 1, vy: 2, hp: 90 },
        b2: { x: 30, y: 40, vx: -1, vy: -2 }
      },
      asteroids: [
        { x: 50, y: 60, radius: 15 },
        { x: 70, y: 80, radius: 25 }
      ],
      projectiles: [
        { x: 11, y: 22 },
        { x: 33, y: 44 }
      ],
      explosions: [
        { x: 55, y: 65 },
        { x: 75, y: 85 }
      ]
    });

    const decoded = deserializeSnapshot(snap);
    expect(decoded).not.toBeNull();
    expect(Object.keys(decoded?.ships ?? {})).toHaveLength(2);
    expect(decoded?.ships.b2?.hp).toBeCloseTo(100, 4);
    expect(decoded?.asteroids).toHaveLength(2);
    expect(decoded?.projectiles).toHaveLength(2);
    expect(decoded?.explosions).toHaveLength(2);
  });

  it('fc: ping messages with finite numbers always parse cleanly', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(-1e6), max: Math.fround(1e6), noNaN: true }),
        clientTime => {
          const normalized = Object.is(clientTime, -0) ? 0 : clientTime;
          const parsed = parseClientMessage(JSON.stringify({ type: 'ping', clientTime: normalized }));
          expect(parsed).toEqual({ type: 'ping', clientTime: normalized });
        }
      ),
      { numRuns: 60 }
    );
  });

  it('exercises SeededRNG deterministically', async () => {
    const { SeededRNG } = (await import('./prng.js')) as {
      SeededRNG: new (seed: number) => {
        next?: () => number;
        nextFloat?: () => number;
        nextInt?: (min: number, max: number) => number;
      };
    };
    const rngA = new SeededRNG(12345);
    const rngB = new SeededRNG(12345);
    const method = (['next', 'nextFloat', 'nextInt'] as const).find(
      name => typeof rngA[name] === 'function'
    );
    expect(method).toBeDefined();
    if (method) {
      const a = method === 'nextInt' ? rngA[method]!(0, 100) : rngA[method]!();
      const b = method === 'nextInt' ? rngB[method]!(0, 100) : rngB[method]!();
      expect(a).toEqual(b);
    }
  });

  it('fc: truncated or bit-flipped input frames never crash process', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        fc.integer({ min: -1, max: 1 }),
        fc.integer({ min: -1, max: 1 }),
        fc.boolean(),
        fc.integer({ min: 0, max: 8 }),
        (seq, dx, dy, fire, corruptIdx) => {
          const buf = new Uint8Array(serializeInput(toInputSeq(seq), dx, dy, fire));
          buf[corruptIdx] = (buf[corruptIdx]! + 7) & 0xff;
          const res = deserializeInput(buf.buffer);
          if (res !== null) {
            expect(res.dx).toBeGreaterThanOrEqual(-1);
            expect(res.dx).toBeLessThanOrEqual(1);
          }
        }
      ),
      { numRuns: 90 }
    );
  });
});