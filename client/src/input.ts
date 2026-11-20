export interface InputHandler {
  isPressed(code: string): boolean;
}

export function createInputHandler(): InputHandler {
  const keys = new Map<string, boolean>();

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    keys.set(e.code, true);
  });

  window.addEventListener('keyup', (e: KeyboardEvent) => {
    keys.set(e.code, false);
  });

  return {
    isPressed(code: string): boolean {
      return Boolean(keys.get(code));
    }
  };
}