import { describe, expect, it, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  updateGame,
  type PhysicsGameState,
  type PhysicsInput
} from './physics.js';
import { toPlayerId } from './types.js';

function createBaseState(): PhysicsGameState {
  return {
    ships: {
      p1: {
        kind: 'ship',
        id: toPlayerId('p1'),
        x: 400,
        y: 300,
        vx: 0,
        vy: 0,
        hp: 100,
        fireCooldown: 0,
        damageCooldown: 0
      }
    },
    asteroids: [],
    projectiles: [],
    explosions: []
  };
}

describe('physics simulation, collisions, determinism, and arena bounds', () => {
  it('initializes default asteroids when missing on first tick', () => {
    const state: PhysicsGameState = { ships: {} };
    updateGame(state, {}, 0.016);
    expect(state.asteroids).toHaveLength(5);
    expect(state.projectiles).toHaveLength(0);
    expect(state.explosions).toHaveLength(0);
  });

  it('accelerates ship along dx and dy and applies damping when released', () => {
    const state = createBaseState();
    updateGame(state, { p1: { dx: 1, dy: -1, fire: false } }, 0.1);
    const ship = state.ships.p1!;
    expect(ship.vx).toBeGreaterThan(0);
    expect(ship.vy).toBeLessThan(0);

    const prevVx = ship.vx;
    const prevVy = ship.vy;
    updateGame(state, { p1: { dx: 0, dy: 0, fire: false } }, 0.1);
    expect(Math.abs(ship.vx)).toBeLessThan(Math.abs(prevVx));
    expect(Math.abs(ship.vy)).toBeLessThan(Math.abs(prevVy));
  });

  it('clamps ship speed to maxSpeed (300)', () => {
    const state = createBaseState();
    state.ships.p1!.x = 100;
    state.ships.p1!.y = 100;
    for (let i = 0; i < 40; i += 1) {
      updateGame(state, { p1: { dx: 1, dy: 1, fire: false } }, 0.05);
    }
    const ship = state.ships.p1!;
    const speed = Math.hypot(ship.vx, ship.vy);
    expect(speed).toBeLessThanOrEqual(300.0001);
    expect(speed).toBeGreaterThan(290);
  });

  it('keeps ship within arena boundaries (x: [15, 785], y: [15, 585])', () => {
    const state = createBaseState();
    state.ships.p1!.x = 0;
    state.ships.p1!.y = 0;
    state.ships.p1!.vx = -200;
    state.ships.p1!.vy = -200;
    updateGame(state, {}, 0.1);
    expect(state.ships.p1!.x).toBe(15);
    expect(state.ships.p1!.y).toBe(15);
    expect(state.ships.p1!.vx).toBe(0);
    expect(state.ships.p1!.vy).toBe(0);

    state.ships.p1!.x = 900;
    state.ships.p1!.y = 700;
    state.ships.p1!.vx = 200;
    state.ships.p1!.vy = 200;
    updateGame(state, {}, 0.1);
    expect(state.ships.p1!.x).toBe(785);
    expect(state.ships.p1!.y).toBe(585);
    expect(state.ships.p1!.vx).toBe(0);
    expect(state.ships.p1!.vy).toBe(0);
  });

  it('enforces fire rate cooldown (0.25s between shots)', () => {
    const state = createBaseState();
    updateGame(state, { p1: { dx: 0, dy: 0, fire: true } }, 0.016);
    expect(state.projectiles).toHaveLength(1);

    updateGame(state, { p1: { dx: 0, dy: 0, fire: true } }, 0.1);
    expect(state.projectiles).toHaveLength(1);

    updateGame(state, { p1: { dx: 0, dy: 0, fire: true } }, 0.2);
    expect(state.projectiles).toHaveLength(2);
  });

  it('removes expired or off-screen projectiles', () => {
    const state = createBaseState();
    state.projectiles = [
      { kind: 'projectile', x: 400, y: 5, vx: 0, vy: -600, radius: 4, life: 2.0 },
      { kind: 'projectile', x: 400, y: 200, vx: 0, vy: 0, radius: 4, life: 0.01 }
    ];
    updateGame(state, {}, 0.05);
    expect(state.projectiles).toHaveLength(0);
  });

  it('wraps asteroids across arena edges', () => {
    const state = createBaseState();
    state.asteroids = [
      { kind: 'asteroid', x: 100, y: 640, vx: 0, vy: 100, radius: 20 },
      { kind: 'asteroid', x: -40, y: 200, vx: -10, vy: 0, radius: 20 },
      { kind: 'asteroid', x: 840, y: 200, vx: 10, vy: 0, radius: 20 }
    ];
    updateGame(state, {}, 0.016);
    expect(state.asteroids[0]!.y).toBe(-30);
    expect(state.asteroids[1]!.x).toBe(830);
    expect(state.asteroids[2]!.x).toBe(-30);
  });

  it('applies damage and explosion on ship-asteroid collision and respects damageCooldown', () => {
    const state = createBaseState();
    state.ships.p1!.x = 200;
    state.ships.p1!.y = 200;
    state.ships.p1!.hp = 100;
    state.ships.p1!.damageCooldown = 0;
    state.asteroids = [{ kind: 'asteroid', x: 210, y: 200, vx: 0, vy: 0, radius: 20 }];

    updateGame(state, {}, 0.016);
    expect(state.ships.p1!.hp).toBe(66);
    expect(state.explosions).toHaveLength(1);
    expect(state.ships.p1!.damageCooldown).toBeGreaterThan(0.9);

    state.asteroids = [{ kind: 'asteroid', x: 210, y: 200, vx: 0, vy: 0, radius: 20 }];
    updateGame(state, {}, 0.016);
    expect(state.ships.p1!.hp).toBe(66);
  });

  it('respawns ship at center with 100 HP when HP drops to 0 or below', () => {
    const state = createBaseState();
    state.ships.p1!.x = 120;
    state.ships.p1!.y = 140;
    state.ships.p1!.hp = 20;
    state.ships.p1!.damageCooldown = 0;
    state.asteroids = [{ kind: 'asteroid', x: 120, y: 140, vx: 0, vy: 0, radius: 20 }];

    updateGame(state, {}, 0.016);
    expect(state.ships.p1!.hp).toBe(100);
    expect(state.ships.p1!.x).toBe(400);
    expect(state.ships.p1!.y).toBe(300);
  });

  it('destroys projectile, creates explosion, and respawns asteroid on projectile hit', () => {
    const state = createBaseState();
    state.asteroids = [{ kind: 'asteroid', x: 300, y: 250, vx: 0, vy: 50, radius: 25 }];
    state.projectiles = [{ kind: 'projectile', x: 300, y: 255, vx: 0, vy: -600, radius: 4, life: 1 }];

    updateGame(state, {}, 0.01);
    expect(state.projectiles).toHaveLength(0);
    expect(state.explosions).toHaveLength(1);
    expect(state.asteroids[0]!.y).toBe(-30);
  });

  it('produces deterministic state across identical input sequences with mocked Math.random', () => {
    const runSimulation = (): PhysicsGameState => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const st = createBaseState();
      const seq: PhysicsInput[] = [
        { dx: 1, dy: 0, fire: true },
        { dx: 1, dy: -1, fire: false },
        { dx: 0, dy: 1, fire: true },
        { dx: -1, dy: 0, fire: false }
      ];
      for (let step = 0; step < 30; step += 1) {
        const inp = seq[step % seq.length]!;
        updateGame(st, { p1: inp }, 1 / 30);
      }
      vi.restoreAllMocks();
      return st;
    };

    const runA = runSimulation();
    const runB = runSimulation();
    expect(runA).toEqual(runB);
  });

  it('fc: ship stays within arena bounds under arbitrary inputs and time steps', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            dx: fc.integer({ min: -1, max: 1 }),
            dy: fc.integer({ min: -1, max: 1 }),
            fire: fc.boolean(),
            dt: fc.float({ min: Math.fround(0.001), max: Math.fround(0.05), noNaN: true })
          }),
          { minLength: 1, maxLength: 60 }
        ),
        steps => {
          const state = createBaseState();
          state.asteroids = [];
          for (const step of steps) {
            updateGame(state, { p1: { dx: step.dx, dy: step.dy, fire: step.fire } }, step.dt);
            const ship = state.ships.p1!;
            expect(ship.x).toBeGreaterThanOrEqual(15);
            expect(ship.x).toBeLessThanOrEqual(785);
            expect(ship.y).toBeGreaterThanOrEqual(15);
            expect(ship.y).toBeLessThanOrEqual(585);
            expect(Number.isFinite(ship.x)).toBe(true);
            expect(Number.isFinite(ship.y)).toBe(true);
          }
        }
      ),
      { numRuns: 75 }
    );
  });
});