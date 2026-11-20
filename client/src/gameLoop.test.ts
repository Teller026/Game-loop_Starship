import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGameLoop } from './gameLoop.js';
import type { Vec2 } from '../../shared/src/types.js';

interface PredictedState {
  pos: Vec2;
  unacknowledgedInputs: readonly { readonly seq: number; readonly dx: number; readonly dy: number }[];
}

function reconcileWithServer(
  current: PredictedState,
  serverPos: Vec2,
  lastAckSeq: number,
  speedPerSec: number,
  stepDt: number
): PredictedState {
  const remaining = current.unacknowledgedInputs.filter(item => item.seq > lastAckSeq);
  let x = serverPos.x;
  let y = serverPos.y;
  for (const inp of remaining) {
    x = Math.max(15, Math.min(785, x + inp.dx * speedPerSec * stepDt));
    y = Math.max(15, Math.min(585, y + inp.dy * speedPerSec * stepDt));
  }
  return {
    pos: { x, y },
    unacknowledgedInputs: remaining
  };
}

describe('gameLoop with fake timers and client-server reconciliation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    let nowMs = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => nowMs);
    vi.stubGlobal('requestAnimationFrame', (cb: (ts: number) => void) => {
      return setTimeout(() => {
        nowMs += 16;
        cb(nowMs);
      }, 16) as unknown as number;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      clearTimeout(id as unknown as ReturnType<typeof setTimeout>);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('runs update and render callbacks on fake timer frames and stops cleanly', () => {
    const update = vi.fn();
    const render = vi.fn();
    const loop = createGameLoop(update, render);

    loop.start();
    vi.advanceTimersByTime(16);
    expect(update).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0]?.[0]).toBeCloseTo(0.016, 4);

    vi.advanceTimersByTime(32);
    expect(update).toHaveBeenCalledTimes(3);
    expect(render).toHaveBeenCalledTimes(3);

    loop.stop();
    vi.advanceTimersByTime(64);
    expect(update).toHaveBeenCalledTimes(3);
    expect(render).toHaveBeenCalledTimes(3);
  });

  it('ignores duplicate start calls while already running', () => {
    const update = vi.fn();
    const render = vi.fn();
    const loop = createGameLoop(update, render);

    loop.start();
    loop.start();
    vi.advanceTimersByTime(16);
    expect(update).toHaveBeenCalledTimes(1);
    loop.stop();
  });

  it('reconciles predicted client position with authoritative server snapshot and replays unacked inputs', () => {
    const predicted: PredictedState = {
      pos: { x: 460, y: 300 },
      unacknowledgedInputs: [
        { seq: 1, dx: 1, dy: 0 },
        { seq: 2, dx: 1, dy: 0 },
        { seq: 3, dx: 0, dy: -1 }
      ]
    };

    const reconciled = reconcileWithServer(predicted, { x: 410, y: 300 }, 1, 200, 0.1);
    expect(reconciled.unacknowledgedInputs).toHaveLength(2);
    expect(reconciled.pos.x).toBeCloseTo(430, 5);
    expect(reconciled.pos.y).toBeCloseTo(280, 5);
  });

  it('converges to exact server position when all inputs are acknowledged', () => {
    const predicted: PredictedState = {
      pos: { x: 500, y: 350 },
      unacknowledgedInputs: [{ seq: 1, dx: 1, dy: 0 }]
    };

    const reconciled = reconcileWithServer(predicted, { x: 420, y: 310 }, 5, 200, 0.1);
    expect(reconciled.unacknowledgedInputs).toHaveLength(0);
    expect(reconciled.pos).toEqual({ x: 420, y: 310 });
  });
});