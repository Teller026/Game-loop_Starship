export function updatePhysics(player, input, deltaTime, canvasWidth, canvasHeight) {
  const speed = 250;
  player.velocity.x = 0;
  player.velocity.y = 0;

  if (input.isDown('ArrowLeft') || input.isDown('KeyA')) {
    player.velocity.x = -speed;
  }
  if (input.isDown('ArrowRight') || input.isDown('KeyD')) {
    player.velocity.x = speed;
  }
  if (input.isDown('ArrowUp') || input.isDown('KeyW')) {
    player.velocity.y = -speed;
  }
  if (input.isDown('ArrowDown') || input.isDown('KeyS')) {
    player.velocity.y = speed;
  }

  // Оновлення позиції
  player.position = player.position.add(player.velocity.scale(deltaTime));

  // Обмежуємо межі екрану (canvas boundaries)
  if (player.position.x < player.width / 2) {
    player.position.x = player.width / 2;
  }
  if (player.position.x > canvasWidth - player.width / 2) {
    player.position.x = canvasWidth - player.width / 2;
  }
  if (player.position.y < player.height / 2) {
    player.position.y = player.height / 2;
  }
  if (player.position.y > canvasHeight - player.height / 2) {
    player.position.y = canvasHeight - player.height / 2;
  }
}