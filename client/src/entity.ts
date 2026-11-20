export type EntityKind = 'ship' | 'asteroid' | 'projectile' | 'particle';

export class Vector2 {
  x: number;
  y: number;

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  distance(other: Vector2): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

let nextId = 1;

export class Entity {
  readonly id: number;
  position: Vector2;
  velocity: Vector2;
  readonly kind: EntityKind;
  radius: number;
  isDead: boolean;

  constructor(x: number, y: number, kind: EntityKind, radius: number) {
    this.id = nextId++;
    this.position = new Vector2(x, y);
    this.velocity = new Vector2(0, 0);
    this.kind = kind;
    this.radius = radius;
    this.isDead = false;
  }

  update(deltaTime: number): void {
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
  }
}

export class Ship extends Entity {
  hp: number;
  width: number;
  height: number;

  constructor(x: number, y: number) {
    super(x, y, 'ship', 20);
    this.hp = 100;
    this.width = 40;
    this.height = 40;
  }

  takeDamage(amount: number): void {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.isDead = true;
    }
  }

  respawn(x: number, y: number): void {
    this.position.x = x;
    this.position.y = y;
    this.hp = 100;
    this.isDead = false;
  }

  fire(): Projectile {
    const p = new Projectile(this.position.x, this.position.y - 20);
    p.velocity.y = -400;
    return p;
  }
}

export class Asteroid extends Entity {
  constructor(x: number, y: number, radius: number) {
    super(x, y, 'asteroid', radius);
    this.velocity.x = (Math.random() - 0.5) * 40;
    this.velocity.y = 80 + Math.random() * 70;
  }

  override update(deltaTime: number): void {
    super.update(deltaTime);
    if (this.position.y > 700) {
      this.position.y = -50;
      this.position.x = Math.random() * 800;
    }
  }
}

export class Projectile extends Entity {
  ttl: number;

  constructor(x: number, y: number) {
    super(x, y, 'projectile', 4);
    this.ttl = 3.0;
  }

  override update(deltaTime: number): void {
    super.update(deltaTime);
    this.ttl -= deltaTime;
    if (this.ttl <= 0) {
      this.isDead = true;
    }
  }
}

export class Particle extends Entity {
  ttl: number;

  constructor(x: number, y: number, velocity: Vector2) {
    super(x, y, 'particle', 2);
    this.velocity = velocity;
    this.ttl = 0.6;
  }

  override update(deltaTime: number): void {
    super.update(deltaTime);
    this.ttl -= deltaTime;
    if (this.ttl <= 0) {
      this.isDead = true;
    }
  }
}