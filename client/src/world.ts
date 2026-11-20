import { Asteroid, Entity, Particle, Vector2, type EntityKind } from './entity.js';
import { eventBus } from './eventBus.js';

export class World {
  entities: Map<number, Entity>;

  constructor() {
    this.entities = new Map<number, Entity>();
  }

  spawn<T extends Entity>(entity: T): T {
    this.entities.set(entity.id, entity);
    return entity;
  }

  despawn(id: number): void {
    this.entities.delete(id);
  }

  *ofKind(kind: EntityKind): IterableIterator<Entity> {
    for (const entity of this.entities.values()) {
      if (entity.kind === kind) {
        yield entity;
      }
    }
  }

  step(deltaTime: number): void {
    for (const entity of this.entities.values()) {
      entity.update(deltaTime);
    }

    this.checkCollisions();

    for (const [id, entity] of this.entities.entries()) {
      if (entity.isDead) {
        this.despawn(id);
      }
    }

    let asteroidCount = 0;
    for (const entity of this.entities.values()) {
      if (entity.kind === 'asteroid') {
        asteroidCount++;
      }
    }

    if (asteroidCount < 4) {
      this.spawn(new Asteroid(Math.random() * 700 + 50, -30, 25));
    }
  }

  createExplosion(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      const vel = new Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed);
      this.spawn(new Particle(x, y, vel));
    }
  }

  checkCollisions(): void {
    const list = Array.from(this.entities.values());
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (!a || !b) {
          continue;
        }

        if (a.isDead || b.isDead) {
          continue;
        }

        const dist = a.position.distance(b.position);
        if (dist < a.radius + b.radius) {
          if (a.kind === 'projectile' && b.kind === 'asteroid') {
            a.isDead = true;
            b.isDead = true;
            this.createExplosion(b.position.x, b.position.y);
            eventBus.dispatchEvent(new CustomEvent('exploded'));
          } else if (b.kind === 'projectile' && a.kind === 'asteroid') {
            b.isDead = true;
            a.isDead = true;
            this.createExplosion(a.position.x, a.position.y);
            eventBus.dispatchEvent(new CustomEvent('exploded'));
          } else if (a.kind === 'ship' && b.kind === 'asteroid' && 'takeDamage' in a && typeof a.takeDamage === 'function') {
            (a as { takeDamage(amount: number): void }).takeDamage(34);
            b.isDead = true;
            this.createExplosion(b.position.x, b.position.y);
            eventBus.dispatchEvent(new CustomEvent('exploded'));
          } else if (b.kind === 'ship' && a.kind === 'asteroid' && 'takeDamage' in b && typeof b.takeDamage === 'function') {
            (b as { takeDamage(amount: number): void }).takeDamage(34);
            a.isDead = true;
            this.createExplosion(a.position.x, a.position.y);
            eventBus.dispatchEvent(new CustomEvent('exploded'));
          }
        }
      }
    }
  }
}