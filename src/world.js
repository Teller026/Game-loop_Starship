import { Particle } from './entity.js';

export class World {
  constructor() {
    this.entities = new Map();
  }

  spawn(entity) {
    this.entities.set(entity.id, entity);
    return entity;
  }

  despawn(id) {
    this.entities.delete(id);
  }

  *ofKind(kind) {
    for (const entity of this.entities.values()) {
      if (entity.kind === kind) {
        yield entity;
      }
    }
  }

  step(deltaTime) {
    for (const entity of this.entities.values()) {
      entity.update(deltaTime);
    }

    this.checkCollisions();

    for (const [id, entity] of this.entities.entries()) {
      if (entity.isDead) {
        this.despawn(id);
      }
    }
  }

  createExplosion(x, y) {
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;
      const vel = new Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed);
      this.spawn(new Particle(x, y, vel));
    }
  }

  checkCollisions() {
    const list = Array.from(this.entities.values());
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];

        if (a.isDead || b.isDead) {
          continue;
        }

        const dist = a.position.distance(b.position);
        if (dist < a.radius + b.radius) {
          // Projectile hits Asteroid
          if (a.kind === 'projectile' && b.kind === 'asteroid') {
            a.isDead = true;
            b.isDead = true;
            this.createExplosion(b.position.x, b.position.y);
          } else if (b.kind === 'projectile' && a.kind === 'asteroid') {
            b.isDead = true;
            a.isDead = true;
            this.createExplosion(a.position.x, a.position.y);
          }
          // Projectile hits Ship
          else if (a.kind === 'projectile' && b.kind === 'ship') {
            b.takeDamage(25);
            a.isDead = true;
            this.createExplosion(b.position.x, b.position.y);
          } else if (b.kind === 'projectile' && a.kind === 'ship') {
            a.takeDamage(25);
            b.isDead = true;
            this.createExplosion(a.position.x, a.position.y);
          }
        }
      }
    }
  }
}