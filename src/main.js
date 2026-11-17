import { createInputHandler } from './input.js';
import { updatePhysics } from './physics.js';
import { createRenderer } from './renderer.js';
import { createGameLoop } from './gameLoop.js';
import { World } from './world.js';
import { Ship } from './entity.js';

const canvas = document.createElement('canvas');
canvas.width = 800;
canvas.height = 600;
document.body.appendChild(canvas);

const ctx = canvas.getContext('2d');

const world = new World();
const player = new Ship(400, 300);
world.spawn(player);

const input = createInputHandler();
const renderer = createRenderer(ctx, canvas);

const gameLoop = createGameLoop(
  (deltaTime) => {
    updatePhysics(player, input, deltaTime, canvas.width, canvas.height);

    if (input.isPressed('Space')) {
      const projectile = player.fire();
      world.spawn(projectile);
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