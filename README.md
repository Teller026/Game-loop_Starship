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

# Lab 03 - Async JavaScript & Asset Pipeline

## Sequential vs Concurrent Loading
- **Sequential await**: Each asset request waits for the previous one to finish sequentially. Total time equals the sum of all individual request latencies ($T = t_1 + t_2 + ... + t_n$).
- **Concurrent (Promise.all)**: All assets are requested in parallel. Total time is determined strictly by the single slowest asset request ($T = \max(t_1, t_2, ..., t_n)$), significantly speeding up startup performance.

## Event Loop Microtask Puzzles
1. `Promise.resolve().then(() => console.log('A')); setTimeout(() => console.log('B'), 0);`
   - *Output*: A, B. *Reason*: Microtasks (`.then`) execute immediately after the current call stack before macrotasks (`setTimeout`).
2. `setTimeout(() => { Promise.resolve().then(() => console.log('C')); console.log('D'); }, 0);`
   - *Output*: D, C. *Reason*: Inside the macrotask, synchronous code `D` runs first, then the newly queued microtask `C` is flushed.
3. `async function foo() { console.log('1'); await Promise.resolve(); console.log('2'); } foo(); console.log('3');`
   - *Output*: 1, 3, 2. *Reason*: `await` pauses the async function, yielding execution back to the synchronous flow (`3`), then resumes `2` as a microtask.
4. `requestAnimationFrame(() => console.log('RAF')); Promise.resolve().then(() => console.log('Micro'));`
   - *Output*: Micro, RAF. *Reason*: Microtasks run prior to rendering/animation frame callbacks.
5. `setTimeout(() => console.log('Timeout'), 0); Promise.resolve().then(() => console.log('Micro')); console.log('Sync');`
   - *Output*: Sync, Micro, Timeout. *Reason*: Synchronous execution finishes, microtasks run next, and macrotasks (`setTimeout`) run last.

## Failure Gallery & Resilience
- **404 Asset Error**: Handled gracefully without crashing by throwing status exceptions and catching them in the UI error boundary with a "Retry" button.
- **Network Timeout & Abort**: Managed via `AbortController` and custom backoff logic to prevent hanging requests.

# Lab 04 - Node.js Backend, Streams, and WebSockets

## Memory Architecture (RSS) and Streams
When serving large match log files over a slow connection, loading the entire file into memory (`fs.readFile`) causes a sharp spike in Resident Set Size (RSS).

Using streams (`fs.createReadStream` + `.pipe(res)`) keeps memory usage (**RSS**) flat. Data is transferred in chunks through a fixed-size buffer, so Node.js memory consumption does not scale with log file size.

## Reflection
- **What happens to the Node.js server if a synchronous HTTP handler blocks the Event Loop for 300 ms?**
  Because Node.js runs on a single-threaded event loop (libuv), heavy synchronous code blocks the thread completely. During those 300 ms, the server cannot process new HTTP requests, handle WebSocket messages, run heartbeat (`ping/pong`) checks, or execute other async callbacks—the entire server stalls for that duration.
- **Why does an unhandled `"error"` event crash the entire Node.js process?**
  In `EventEmitter`, `error` is a special event. If an `error` event is emitted without any registered listener, Node.js treats it as an unrecoverable fault to avoid undefined state or resource leaks and terminates the process.

# Lab 05 - Server-Authoritative Physics, Binary Protocol (DataView), and Client Prediction

## JSON vs Binary Protocol (DataView)

| Parameter | JSON Protocol | Binary Protocol (ArrayBuffer / DataView) |
| :--- | :--- | :--- |
| **Packet Size (Input)** | ~60–90 bytes (text-based) | **9 bytes** (fixed layout) |
| **Packet Size (Snapshot)** | ~250–500+ bytes depending on entity count | **Compact binary layout** (version, type, timestamp, counts, entities) |
| **Serialization Speed** | Slower (`JSON.parse` / `JSON.stringify`) | **Fast** (direct `DataView` reads/writes) |
| **Overhead** | High (repeated keys, quotes, commas) | **Minimal** (raw binary fields in little-endian) |

## Reflection
- **Latency and Interpolation**: Interpolation smoothing hides network jitter and moves remote entities smoothly between server snapshots without snapping.
- **State Divergence and Reconciliation**: Client-side prediction gives immediate local movement response. When a server snapshot arrives, the client reconciles state and replays unconfirmed inputs, smoothing out corrections over frames.
- **Cheat Prevention**: Because the server is authoritative, the client sends control inputs rather than raw coordinates, preventing client-side position or speed spoofing.

# Lab 06 - TypeScript for Protocol and Simulation

## Errors Caught by TypeScript
- **Snapshot coordinate shape mismatch**: Decoded snapshots store entity coordinates under `pos.x` and `pos.y`, whereas client rendering initially read top-level `x` and `y` fields.
- **Strict null/undefined and index checks**: Enabling `strict` and `noUncheckedIndexedAccess` surfaced potential `undefined` values when indexing arrays, ship/input maps, and optional fields prior to runtime.
- **Cross-package protocol and event mismatches**: TypeScript caught mismatches between shared protocol types, room/lobby events, and `unknown` error/network inputs at compile time.

## Three Concepts in Plain Terms
- **Branded types (`PlayerId`, `TickId`, `InputSeq`)**: Primitives tagged with a type brand so values like a player ID, tick number, and input sequence number cannot be accidentally swapped even though they share the same underlying runtime representation.
- **Runtime Zod validation at boundaries**: Because TypeScript types are erased at build time, incoming network JSON messages and environment config are validated at runtime with Zod schemas—malformed JSON is logged and closes the socket instead of crashing unhandled.
- **Exhaustive `switch` with `never`**: A `default` branch typed as `never` ensures that adding a new `kind` or `type` variant without handling it produces a `tsc` compile error before running the code.

## Why No Frontend Framework Was Used
The lobby and HUD are lightweight and already implemented directly against the DOM and Canvas with `EventTarget` and simple state updates, so adding React, Vue, or Svelte would introduce unnecessary overhead. The Canvas and game loop remain framework-free to keep direct control over rendering and frame timing.