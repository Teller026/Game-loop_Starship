import { describe, expect, it } from 'vitest';
import { ObjectPool, PooledExplosion, PooledProjectile } from './objectPool.js';

describe('ObjectPool', () => {
  it('warms up, acquires, resets, releases, and caps at maxSize', () => {
    const projPool = new ObjectPool(() => new PooledProjectile(), 2, 3);
    expect(projPool.available).toBe(2);

    const p1 = projPool.acquire();
    p1.x = 120;
    p1.y = 240;
    p1.life = 0.2;
    expect(projPool.available).toBe(1);

    projPool.release(p1);
    expect(p1.x).toBe(0);
    expect(p1.y).toBe(0);
    expect(p1.life).toBe(2.0);
    expect(projPool.available).toBe(2);

    const p2 = projPool.acquire();
    const p3 = projPool.acquire();
    const p4 = projPool.acquire(); // beyond initial warmup, uses factory
    expect(p4.kind).toBe('projectile');

    projPool.release(p1);
    projPool.release(p2);
    projPool.release(p3);
    projPool.release(p4); // maxSize = 3, 4th is dropped
    expect(projPool.available).toBe(3);

    const expPool = new ObjectPool(() => new PooledExplosion(), 1, 2);
    const exp = expPool.acquire();
    exp.x = 50;
    exp.y = 75;
    exp.pos.x = 50;
    exp.pos.y = 75;
    expPool.release(exp);
    expect(exp.x).toBe(0);
    expect(exp.pos.x).toBe(0);
    expect(expPool.available).toBe(1);
  });
});