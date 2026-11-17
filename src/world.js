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
          if (a.kind === 'projectile' && b.kind === 'ship') {
            b.takeDamage(25);
            a.isDead = true;
          } else if (b.kind === 'projectile' && a.kind === 'ship') {
            a.takeDamage(25);
            b.isDead = true;
          }
        }
      }
    }
  }
}