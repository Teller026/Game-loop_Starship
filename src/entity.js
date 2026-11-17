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
    this.width = 30;
    this.height = 40;
    this.angle = 0;
    this.respawnTimer = 0;
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

  respawn(x, y) {
    this.position = new Vector2(x, y);
    this.#hp = 100;
    this.isDead = false;
  }

  fire() {
    const spawnPos = new Vector2(this.position.x, this.position.y - this.height / 2);
    const direction = new Vector2(0, -1);
    return new Projectile(spawnPos.x, spawnPos.y, direction);
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

export class Asteroid extends Entity {
  constructor(x, y, radius) {
    super(x, y, radius, 'asteroid');
    this.velocity = new Vector2((Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100);
  }
}

export class Particle extends Entity {
  constructor(x, y, velocity) {
    super(x, y, 2, 'particle');
    this.velocity = velocity;
    this.ttl = 0.5;
  }

  update(deltaTime) {
    super.update(deltaTime);
    this.ttl -= deltaTime;
    if (this.ttl <= 0) {
      this.isDead = true;
    }
  }
}