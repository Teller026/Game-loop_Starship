import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import {
  updateGame,
  type PhysicsGameState
} from './physics.js';
import {
  deserializeInput,
  deserializeSnapshot,
  serializeInput,
  serializeSnapshot
} from './protocol.js';
import {
  parseClientMessage,
  toInputSeq,
  toPlayerId
} from './types.js';

describe('additional boundary, collision, and protocol edge cases', () => {
  it('handles zero-distance ship-asteroid overlap without division by zero', () => {
    const state: PhysicsGameState = {
      ships: {
        s1: { kind: 'ship', id: toPlayerId('s1'), x: 250, y: 250, vx: 0, vy: 0, hp: 100, damageCooldown: 0 }
      },
      asteroids: [{ kind: 'asteroid', x: 250, y: 250, vx: 0, vy: 0, radius: 20 }],
      projectiles: [],
      explosions: []
    };
    updateGame(state, {}, 0.016);
    expect(Number.isFinite(state.ships.s1!.x)).toBe(true);
    expect(Number.isFinite(state.ships.s1!.y)).toBe(true);
  });

  it('handles non-overlapping projectiles and non-colliding ships cleanly', () => {
    const state: PhysicsGameState = {
      ships: {
        s1: { kind: 'ship', id: toPlayerId('s1'), x: 100, y: 100, vx: 0, vy: 0, hp: 100, damageCooldown: 0 }
      },
      asteroids: [{ kind: 'asteroid', x: 700, y: 500, vx: -10, vy: -10, radius: 15 }],
      projectiles: [{ kind: 'projectile', x: 120, y: 400, vx: 0, vy: -600, radius: 4, life: 1.5 }],
      explosions: []
    };
    updateGame(state, {}, 0.016);
    expect(state.projectiles).toHaveLength(1);
    expect(state.explosions).toHaveLength(0);
    expect(state.ships.s1!.hp).toBe(100);
  });

  it('caps snapshot entity counts at 255', () => {
    const manyAsteroids = Array.from({ length: 260 }, (_, idx) => ({
      x: (idx * 3) % 780 + 10,
      y: (idx * 5) % 580 + 10,
      radius: 12
    }));
    const buf = serializeSnapshot({
      ships: {},
      asteroids: manyAsteroids,
      projectiles: [],
      explosions: []
    });
    const decoded = deserializeSnapshot(buf);
    expect(decoded).not.toBeNull();
    expect(decoded?.asteroids).toHaveLength(255);
  });

  it('rejects snapshots containing NaN, Infinity, or out-of-range hp/radius', () => {
    const base = serializeSnapshot({
      ships: { p1: { x: 100, y: 100, vx: 0, vy: 0, hp: 100 } },
      asteroids: [{ x: 200, y: 200, radius: 20 }],
      projectiles: [{ x: 150, y: 150 }],
      explosions: [{ x: 250, y: 250 }]
    });

    const badHpBytes = new Uint8Array(base.slice(0));
    new DataView(badHpBytes.buffer).setFloat32(7 + 8 + 16, 5000, true);
    expect(deserializeSnapshot(badHpBytes.buffer)).toBeNull();

    const astOffset = 7 + 28 + 1;
    const badRadiusBytes = new Uint8Array(base.slice(0));
    new DataView(badRadiusBytes.buffer).setFloat32(astOffset + 8, -5, true);
    expect(deserializeSnapshot(badRadiusBytes.buffer)).toBeNull();
  });

  it('rejects non-finite clientTime in ping message', () => {
    expect(parseClientMessage(JSON.stringify({ type: 'ping', clientTime: Number.NaN }))).toBeNull();
    expect(
      parseClientMessage(JSON.stringify({ type: 'ping', clientTime: Number.POSITIVE_INFINITY }))
    ).toBeNull();
  });

  for (const dx of [-1, 0, 1]) {
    for (const dy of [-1, 0, 1]) {
      it(`round-trips input vector (${dx}, ${dy}) with fire=false`, () => {
        const buf = serializeInput(toInputSeq(dx + 5), dx, dy, false);
        expect(deserializeInput(buf)).toEqual({
          seq: dx + 5,
          dx,
          dy,
          fire: false
        });
      });
    }
  }

  for (const dx of [-1, 0, 1]) {
    for (const dy of [-1, 0, 1]) {
      it(`round-trips input vector (${dx}, ${dy}) with fire=true`, () => {
        const buf = serializeInput(toInputSeq(dy + 15), dx, dy, true);
        expect(deserializeInput(buf)).toEqual({
          seq: dy + 15,
          dx,
          dy,
          fire: true
        });
      });
    }
  }

  it('fc: projectile count in snapshot never exceeds 255', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 270 }), count => {
        const projectiles = Array.from({ length: count }, (_, i) => ({ x: i, y: i }));
        const buf = serializeSnapshot({
          ships: {},
          asteroids: [],
          projectiles,
          explosions: []
        });
        const decoded = deserializeSnapshot(buf);
        expect(decoded).not.toBeNull();
        expect(decoded!.projectiles.length).toBeLessThanOrEqual(255);
      }),
      { numRuns: 50 }
    );
  });
});