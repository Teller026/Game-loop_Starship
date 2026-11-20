export interface PoolResettable {
  reset(): void;
}

export class ObjectPool<T extends PoolResettable> {
  private readonly items: T[] = [];
  private readonly factory: () => T;
  private readonly maxSize: number;

  constructor(factory: () => T, initialSize = 64, maxSize = 512) {
    this.factory = factory;
    this.maxSize = maxSize;
    const warmCount = Math.min(initialSize, maxSize);
    for (let i = 0; i < warmCount; i += 1) {
      this.items.push(this.factory());
    }
  }

  acquire(): T {
    const item = this.items.pop() ?? this.factory();
    item.reset();
    return item;
  }

  release(item: T): void {
    if (this.items.length < this.maxSize) {
      item.reset();
      this.items.push(item);
    }
  }

  get available(): number {
    return this.items.length;
  }
}

export class PooledProjectile implements PoolResettable {
  readonly kind = 'projectile' as const;
  x = 0;
  y = 0;
  vx = 0;
  vy = -600;
  radius = 4;
  life = 2.0;

  reset(): void {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = -600;
    this.radius = 4;
    this.life = 2.0;
  }
}

export class PooledExplosion implements PoolResettable {
  readonly kind = 'explosion' as const;
  x = 0;
  y = 0;
  pos = { x: 0, y: 0 };

  reset(): void {
    this.x = 0;
    this.y = 0;
    this.pos.x = 0;
    this.pos.y = 0;
  }
}