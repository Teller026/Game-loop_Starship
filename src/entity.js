import { Vector2 } from './vector2.js';

export class Entity {
  static #counter = 0;

  constructor(x, y, radius, kind) {
    this.id = ++Entity.#counter;
    this.position = new Vector2(x, y);
    this.velocity = new Vector2(0, 0);
    this.radius = radius;
    this.kind = kind;
    this.isDead = false;
  }

  update(deltaTime) {
    this.position = this.position.add(this.velocity.scale(deltaTime));
  }
}

export class Ship extends Entity {
  #hp;

  constructor(x, y) {
    super(x, y, 20, 'ship');
    this.#hp = 100;
    this.angle = 0;
  }

  get hp() {
    return this.#hp;
  }

  takeDamage(amount) {
    this.#hp -= amount;
    if (this.#hp <= 0) {
      this.#hp = 0;
      this.isDead = true;
    }
  }

  fire() {
    const dir = new Vector2(Math.cos(this.angle), Math.sin(this.angle));
    const spawnPos = this.position.add(dir.scale(25));
    const projectile = new Projectile(spawnPos.x, spawnPos.y, dir);
    return projectile;
  }
}

export class Projectile extends Entity {
  constructor(x, y, direction) {
    super(x, y, 4, 'projectile');
    this.velocity = direction.scale(400);
    this.ttl = 2.0;
  }

  update(deltaTime) {
    super.update(deltaTime);
    this.ttl -= deltaTime;
    if (this.ttl <= 0) {
      this.isDead = true;
    }
  }
}