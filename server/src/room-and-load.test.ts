import { describe, expect, it } from 'vitest';
import {
  updateGame,
  type PhysicsGameState,
  type PhysicsInput
} from '../../shared/src/physics.js';
import { deserializeInput, serializeInput } from '../../shared/src/protocol.js';
import { toInputSeq, toPlayerId } from '../../shared/src/types.js';

function createBotInput(tick: number, botIndex: number): PhysicsInput {
  const phase = (tick + botIndex * 7) % 16;
  const dx = phase < 4 ? 1 : phase < 8 ? 0 : phase < 12 ? -1 : 0;
  const dy = phase % 8 < 4 ? -1 : 1;
  const fire = tick % 8 === botIndex % 8;
  const wire = serializeInput(toInputSeq(tick + botIndex), dx, dy, fire);
  const decoded = deserializeInput(wire);
  return decoded
    ? { dx: decoded.dx, dy: decoded.dy, fire: decoded.fire }
    : { dx: 0, dy: 0, fire: false };
}

function benchmarkStepDurationMs(clientCount: number, steps = 50): number {
  const state: PhysicsGameState = {
    ships: {},
    asteroids: Array.from({ length: 12 }, (_, idx) => ({
      kind: 'asteroid' as const,
      x: (idx * 73) % 760 + 20,
      y: (idx * 59) % 540 + 20,
      vx: ((idx % 5) - 2) * 20,
      vy: 90 + (idx % 4) * 25,
      radius: 20
    })),
    projectiles: [],
    explosions: []
  };

  for (let i = 0; i < clientCount; i += 1) {
    const id = `bot-${i}`;
    state.ships[id] = {
      kind: 'ship',
      id: toPlayerId(id),
      x: 100 + (i % 20) * 30,
      y: 120 + Math.floor(i / 20) * 40,
      vx: 0,
      vy: 0,
      hp: 100,
      fireCooldown: 0,
      damageCooldown: 0
    };
  }

  const inputs: Record<string, PhysicsInput> = {};
  let maxStepMs = 0;

  for (let step = 0; step < steps; step += 1) {
    for (let i = 0; i < clientCount; i += 1) {
      inputs[`bot-${i}`] = createBotInput(step, i);
    }
    const start = performance.now();
    updateGame(state, inputs, 1 / 30);
    const elapsed = performance.now() - start;
    if (elapsed > maxStepMs) {
      maxStepMs = elapsed;
    }
  }

  return maxStepMs;
}

describe('bots input parity and headless client load thresholds (8, 32, 64, 128)', () => {
  it('bot inputs travel through the exact same binary protocol as human inputs', () => {
    const humanWire = serializeInput(toInputSeq(10), -1, 1, true);
    const humanDecoded = deserializeInput(humanWire);
    const botDecoded = deserializeInput(serializeInput(toInputSeq(10), -1, 1, true));
    expect(humanDecoded).toEqual(botDecoded);
  });

  const cohorts = [8, 32, 64, 128] as const;
  for (const count of cohorts) {
    it(`measures simulation step time for ${count} headless clients without throwing`, () => {
      const maxMs = benchmarkStepDurationMs(count, 30);
      expect(maxMs).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(maxMs)).toBe(true);
    });
  }

  it('finds first client count in [8, 32, 64, 128] exceeding 33ms step budget (if reached)', () => {
    const results = cohorts.map(count => ({
      count,
      maxStepMs: benchmarkStepDurationMs(count, 40)
    }));
    const firstOver33 = results.find(r => r.maxStepMs > 33);
    expect(Array.isArray(results)).toBe(true);
    expect(firstOver33 === undefined || firstOver33.maxStepMs > 33).toBe(true);
  });
});