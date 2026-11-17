export function updateGame(state, inputs, dt) {
  if (!state.asteroids) {
    state.asteroids = [];
    for (let i = 0; i < 5; i++) {
      state.asteroids.push({
        x: Math.random() * 800,
        y: Math.random() * -600,
        vx: (Math.random() - 0.5) * 30,
        vy: Math.random() * 80 + 100,
        radius: 20
      });
    }
  }

  if (!state.projectiles) {
    state.projectiles = [];
  }

  state.explosions = [];

  for (const id in state.ships) {
    const ship = state.ships[id];
    if (ship.hp === undefined) {
      ship.hp = 100;
    }
    if (ship.damageCooldown === undefined) {
      ship.damageCooldown = 0;
    }
    if (ship.damageCooldown > 0) {
      ship.damageCooldown -= dt;
    }

    const input = inputs[id] || { dx: 0, dy: 0, fire: false };

    if (!ship.fireCooldown) {
      ship.fireCooldown = 0;
    }
    if (ship.fireCooldown > 0) {
      ship.fireCooldown -= dt;
    }

    const acceleration = 800;
    if (input.dx !== 0) {
      ship.vx += input.dx * acceleration * dt;
    } else {
      ship.vx *= 0.85;
    }

    if (input.dy !== 0) {
      ship.vy += input.dy * acceleration * dt;
    } else {
      ship.vy *= 0.85;
    }

    const maxSpeed = 300;
    const currentSpeed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
    if (currentSpeed > maxSpeed) {
      ship.vx = (ship.vx / currentSpeed) * maxSpeed;
      ship.vy = (ship.vy / currentSpeed) * maxSpeed;
    }

    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;

    if (ship.x < 15) {
      ship.x = 15;
      ship.vx = 0;
    }
    if (ship.x > 785) {
      ship.x = 785;
      ship.vx = 0;
    }
    if (ship.y < 15) {
      ship.y = 15;
      ship.vy = 0;
    }
    if (ship.y > 585) {
      ship.y = 585;
      ship.vy = 0;
    }

    if (input.fire && ship.fireCooldown <= 0) {
      state.projectiles.push({
        x: ship.x,
        y: ship.y - 15,
        vx: 0,
        vy: -600,
        radius: 4,
        life: 2.0
      });
      ship.fireCooldown = 0.25;
    }
  }

  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0 || p.y < 0) {
      state.projectiles.splice(i, 1);
    }
  }

  for (const ast of state.asteroids) {
    ast.x += ast.vx * dt;
    ast.y += ast.vy * dt;
    if (ast.y > 630) {
      ast.y = -30;
      ast.x = Math.random() * 800;
      ast.vx = (Math.random() - 0.5) * 30;
      ast.vy = Math.random() * 80 + 100;
    }
    if (ast.x < -30) ast.x = 830;
    if (ast.x > 830) ast.x = -30;
  }

  for (const id in state.ships) {
    const ship = state.ships[id];
    for (const ast of state.asteroids) {
      const dx = ship.x - ast.x;
      const dy = ship.y - ast.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = 15 + ast.radius;
      if (dist < minDist) {
        const overlap = minDist - dist;
        if (dist > 0) {
          ship.x += (dx / dist) * overlap;
          ship.y += (dy / dist) * overlap;
        }

        if (ship.damageCooldown <= 0) {
          ship.hp -= 34;
          ship.damageCooldown = 1.0;
          state.explosions.push({ x: ship.x, y: ship.y });
          if (ship.hp <= 0) {
            ship.hp = 100;
            ship.x = 400;
            ship.y = 300;
            ship.vx = 0;
            ship.vy = 0;
          }
        }
      }
    }
  }

  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    let hit = false;
    for (let j = state.asteroids.length - 1; j >= 0; j--) {
      const ast = state.asteroids[j];
      const dx = p.x - ast.x;
      const dy = p.y - ast.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < p.radius + ast.radius) {
        hit = true;
        state.explosions.push({ x: ast.x, y: ast.y });
        ast.y = -30;
        ast.x = Math.random() * 800;
        break;
      }
    }
    if (hit) {
      state.projectiles.splice(i, 1);
    }
  }
}