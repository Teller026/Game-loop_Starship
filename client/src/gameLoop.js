export function createGameLoop(update, render) {
  let lastTime = performance.now();
  let animationFrameId = null;
  let running = false;

  const loop = (currentTime) => {
    if (!running) return;
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    update(deltaTime);
    render();

    animationFrameId = requestAnimationFrame(loop);
  };

  return {
    start() {
      if (running) return;
      running = true;
      lastTime = performance.now();
      animationFrameId = requestAnimationFrame(loop);
    },
    stop() {
      running = false;
      cancelAnimationFrame(animationFrameId);
    }
  };
}