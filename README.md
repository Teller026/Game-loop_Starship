# Lab 01 - Event Loop and Game Loop

## Architecture Overview
- **main.js**: Entry point, initializes the canvas, creates the game loop instance, and wires together input, physics, and rendering.
- **input.js**: Handles keyboard event listeners using closures to track active keys in a state map.
- **physics.js**: Updates entity positions based on elapsed delta time and movement speed.
- **renderer.js**: Clears the frame and draws game entities onto the 2D canvas context.
- **gameLoop.js**: Implements a fixed-step update loop with variable rendering to ensure consistent physics simulation regardless of monitor refresh rate.

## Experiments & Event Loop Analysis
1. **Fixed Time Step vs Variable Time Step**: Using a fixed accumulator step prevents physics from breaking when frame rates drop or fluctuate, ensuring deterministic movement.
2. **Event Loop Mechanism**: Browser rendering and input events rely on the asynchronous callback queue managed by the JavaScript Event Loop. `requestAnimationFrame` syncs rendering with the display refresh rate.
3. **Performance Impact**: Heavy synchronous computations inside the update loop block the main thread, leading to dropped frames and input lag.
# Lab 02 - Objects, Prototypes, and Classes: Entity Model

## Architecture & Reflection
1. **Fixing the `this` context bug**: When passing a class method (like `ship.fire`) directly as a callback to an event listener, JavaScript loses the object context (`this` becomes undefined or points to the window/event target). We fixed this by wrapping the call inside an arrow function (e.g., `() => ship.fire()`) or by binding the context explicitly using `.bind(ship)`.
2. **Composition over Deep Inheritance**: To implement features like homing projectiles or interactive pickups without building an overly complex or deep class hierarchy, we used flat composition. Behaviours and properties are plugged in as independent components rather than inheriting multi-level abstract classes.
## Composition vs Deep Inheritance
To implement features like **homing** (seeking missiles) and **pickups** (power-ups) without creating a rigid and deep class hierarchy (e.g., `Entity -> MovableEntity -> InteractiveEntity -> Pickup`), we utilized **composition**. 
- Behaviors are injected as components or mixins rather than inherited through multiple abstract levels.
- This approach prevents the fragile base class problem and keeps entities flexible and modular.