import { createInputHandler } from './input.js';
import { updatePhysics } from './physics.js';
import { createRenderer } from './renderer.js';
import { createGameLoop } from './gameLoop.js';

const canvas = document.createElement('canvas');
canvas.width = 800;
canvas.height = 600;
document.body.appendChild(canvas);

const ctx = canvas.getContext('2d');

const player = {
  x: 400,
  y: 300,
  width: 30,
  height: 40
};

const input = createInputHandler();
const renderer = createRenderer(ctx, canvas);

const gameLoop = createGameLoop(
  (deltaTime) => {
    updatePhysics(player, input, deltaTime);
  },
  () => {
    renderer.clear();
    renderer.drawPlayer(player);
  }
);

gameLoop.start();