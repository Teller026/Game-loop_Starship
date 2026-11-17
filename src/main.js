import { createInputHandler } from './input.js';
import { updatePhysics } from './physics.js';
import { createRenderer } from './renderer.js';
import { createGameLoop } from './gameLoop.js';
import { World } from './world.js';
import { Ship, Asteroid } from './entity.js';

const canvas = document.createElement('canvas');
canvas.width = 800;
canvas.height = 600;
document.body.appendChild(canvas);

const ctx = canvas.getContext('2d');

const world = new World();
const player = new Ship(400, 300);
world.spawn(player);

for (let i = 0; i < 4; i++) {
  world.spawn(new Asteroid(Math.random() * 700 + 50, Math.random() * 500 + 50, 25));
}

const input = createInputHandler();
const renderer = createRenderer(ctx, canvas);

let respawnTimer = 0;

const gameLoop = createGameLoop(
  (deltaTime) => {
    if (player.isDead) {
      respawnTimer += deltaTime;
      if (respawnTimer >= 2.0) {
        player.respawn(400, 300);
        world.spawn(player);
        respawnTimer = 0;
      }
    } else {
      updatePhysics(player, input, deltaTime, canvas.width, canvas.height);

      if (input.isPressed('Space')) {
        const projectile = player.fire();
        world.spawn(projectile);
      }
    }

    world.step(deltaTime);
  },
  () => {
    renderer.clear();
    for (const entity of world.entities.values()) {
      renderer.drawEntity(entity);
    }
    renderer.drawHUD(player);
  }
);

gameLoop.start();