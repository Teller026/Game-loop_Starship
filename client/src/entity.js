export class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  distance(other) {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

let nextId = 1;

export class Entity {
  constructor(x, y, kind, radius) {
    this.id = nextId++;
    this.position = new Vector2(x, y);
    this.velocity = new Vector2(0, 0);
    this.kind = kind;
    this.radius = radius;
    this.isDead = false;
  }

  update(deltaTime) {
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
  }
}

export class Ship extends Entity {
  constructor(x, y) {
    super(x, y, 'ship', 20);
    this.hp = 100;
    this.width = 40;
    this.height = 40;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.isDead = true;
    }
  }

  respawn(x, y) {
    this.position.x = x;
    this.position.y = y;
    this.hp = 100;
    this.isDead = false;
  }

  fire() {
    const p = new Projectile(this.position.x, this.position.y - 20);
    p.velocity.y = -400;
    return p;
  }
}

export class Asteroid extends Entity {
  constructor(x, y, radius) {
    super(x, y, 'asteroid', radius);
    this.velocity.x = (Math.random() - 0.5) * 40;
    this.velocity.y = 80 + Math.random() * 70;
  }

  update(deltaTime) {
    super.update(deltaTime);
    if (this.position.y > 700) {
      this.position.y = -50;
      this.position.x = Math.random() * 800;
    }
  }
}

export class Projectile extends Entity {
  constructor(x, y) {
    super(x, y, 'projectile', 4);
    this.ttl = 3.0;
  }

  update(deltaTime) {
    super.update(deltaTime);
    this.ttl -= deltaTime;
    if (this.ttl <= 0) {
      this.isDead = true;
    }
  }
}

export class Particle extends Entity {
  constructor(x, y, velocity) {
    super(x, y, 'particle', 2);
    this.velocity = velocity;
    this.ttl = 0.6;
  }

  update(deltaTime) {
    super.update(deltaTime);
    this.ttl -= deltaTime;
    if (this.ttl <= 0) {
      this.isDead = true;
    }
  }
}