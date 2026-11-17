export function createInputHandler() {
  const keys = {};
  const pressedKeys = {};

  window.addEventListener('keydown', (event) => {
    if (!keys[event.code]) {
      pressedKeys[event.code] = true;
    }
    keys[event.code] = true;
  });

  window.addEventListener('keyup', (event) => {
    keys[event.code] = false;
  });

  return {
    isDown(code) {
      return keys[code] === true;
    },
    isPressed(code) {
      const res = pressedKeys[code] === true;
      pressedKeys[code] = false;
      return res;
    }
  };
}