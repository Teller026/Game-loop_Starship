export function createInputHandler() {
  const keys = {};

  window.addEventListener('keydown', (event) => {
    keys[event.code] = true;
  });

  window.addEventListener('keyup', (event) => {
    keys[event.code] = false;
  });

  return {
    isDown(code) {
      return keys[code] === true;
    }
  };
}