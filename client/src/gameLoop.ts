export interface GameLoop {
  start(): void;
  stop(): void;
}

export function createGameLoop(
  update: (deltaTime: number) => void,
  render: () => void
): GameLoop {
  let lastTime = performance.now();
  let animationFrameId: number | null = null;
  let running = false;

  const loop = (currentTime: number): void => {
    if (!running) return;
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    update(deltaTime);
    render();

    animationFrameId = requestAnimationFrame(loop);
  };

  return {
    start(): void {
      if (running) return;
      running = true;
      lastTime = performance.now();
      animationFrameId = requestAnimationFrame(loop);
    },
    stop(): void {
      running = false;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    }
  };
}