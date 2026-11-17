export function updateGame(state, inputs, dt) {
  for (const id in state.ships) {
    const ship = state.ships[id];
    const input = inputs[id] || { thrust: false, turn: 0 };

    if (input.turn !== 0) {
      ship.angle += input.turn * 3.0 * dt;
    }

    if (input.thrust) {
      ship.vx += Math.cos(ship.angle) * 200 * dt;
      ship.vy += Math.sin(ship.angle) * 200 * dt;
    }

    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;

    ship.vx *= 0.98;
    ship.vy *= 0.98;
  }
}