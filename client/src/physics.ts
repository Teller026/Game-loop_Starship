import type { Ship } from './entity.js';
import type { InputHandler } from './input.js';

export function updatePhysics(
  player: Ship,
  input: InputHandler,
  deltaTime: number,
  canvasWidth: number,
  canvasHeight: number
): void {
  const speed = 300;

  if (input.isPressed('ArrowLeft') || input.isPressed('KeyA')) {
    player.position.x -= speed * deltaTime;
  }
  if (input.isPressed('ArrowRight') || input.isPressed('KeyD')) {
    player.position.x += speed * deltaTime;
  }
  if (input.isPressed('ArrowUp') || input.isPressed('KeyW')) {
    player.position.y -= speed * deltaTime;
  }
  if (input.isPressed('ArrowDown') || input.isPressed('KeyS')) {
    player.position.y += speed * deltaTime;
  }

  if (player.position.x < player.width / 2) player.position.x = player.width / 2;
  if (player.position.x > canvasWidth - player.width / 2) {
    player.position.x = canvasWidth - player.width / 2;
  }
  if (player.position.y < player.height / 2) player.position.y = player.height / 2;
  if (player.position.y > canvasHeight - player.height / 2) {
    player.position.y = canvasHeight - player.height / 2;
  }
}