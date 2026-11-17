export function updatePhysics(player, input, deltaTime) {
  const speed = 250;

  if (input.isDown('ArrowLeft') || input.isDown('KeyA')) {
    player.x -= speed * deltaTime;
  }
  if (input.isDown('ArrowRight') || input.isDown('KeyD')) {
    player.x += speed * deltaTime;
  }
  if (input.isDown('ArrowUp') || input.isDown('KeyW')) {
    player.y -= speed * deltaTime;
  }
  if (input.isDown('ArrowDown') || input.isDown('KeyS')) {
    player.y += speed * deltaTime;
  }
}