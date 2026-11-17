export function createGameLoop(update, render) {
  let lastTime = 0;
  let accumulatedTime = 0;
  const timeStep = 1000 / 60;
  let animationFrameId = null;

  function loop(timestamp) {
    if (!lastTime) {
      lastTime = timestamp;
    }

    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    accumulatedTime += deltaTime;

    while (accumulatedTime >= timeStep) {
      update(timeStep / 1000);
      accumulatedTime -= timeStep;
    }

    render();
    animationFrameId = requestAnimationFrame(loop);
  }

  return {
    start() {
      animationFrameId = requestAnimationFrame(loop);
    },
    stop() {
      cancelAnimationFrame(animationFrameId);
    }
  };
}