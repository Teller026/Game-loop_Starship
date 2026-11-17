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
## Lab 03 - Async JavaScript & Asset Pipeline

### Sequential vs Concurrent Loading
- **Sequential await**: Each asset request waits for the previous one to finish sequentially. Total time equals the sum of all individual request latencies ($T = t_1 + t_2 + ... + t_n$).
- **Concurrent (Promise.all)**: All assets are requested in parallel. Total time is determined strictly by the single slowest asset request ($T = \max(t_1, t_2, ..., t_n)$), significantly speeding up startup performance.

### Event Loop Microtask Puzzles
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

### Failure Gallery & Resilience
- **404 Asset Error**: Handled gracefully without crashing by throwing status exceptions and catching them in the UI error boundary with a "Retry" button.
- **Network Timeout & Abort**: Managed via `AbortController` and custom backoff logic to prevent hanging requests.
## Lab 04: Node.js Backend, Streams, and WebSockets

### 1. Архітектура пам'яті (RSS) та Потоки (Streams)
Під час завантаження великих файлів логів матчів через повільний канал зв'язку традиційний підхід із завантаженням усього файлу в оперативну пам'ять (`fs.readFile`) призводить до стрімкого стрибка споживання пам'яті (RSS). 

Використання потоків (`fs.createReadStream` + `.pipe(res)`) забезпечує **пласку лінію споживання пам'яті (RSS)**. Дані передаються чавунками (chunks), буфер залишається фіксованим, а пам'ять процесора Node.js не залежить від розміру файлу логу.

### 2. Теоретичні питання (Reflection)

* **Що станеться з Node.js сервером, якщо синхронний HTTP-обробник заблокує цикл подій (Event Loop) на 300 мс?**
  Оскільки Node.js використовує однопотоковий цикл подій (libuv), будь-який важкий синхронний код повністю блокує цей потік. Протягом цих 300 мс сервер не зможе обробляти нові вхідні HTTP-запити, приймати WebSocket-повідомлення, перевіряти heartbeat (`ping/pong`) чи виконувати інші асинхронні операції — уся система "зависне" на цей час.

* **Чому подія `"error"` без зареєстрованого слухача (listener) валить увесь процес Node.js?**
  У класі `EventEmitter` подія `error` є особливою. За замовчуванням, якщо виникає помилка, але на неї немає жодного слухача, Node.js вважає це неможливістю продовжити безпечне виконання програми (щоб уникнути непередбачуваного стану чи витоків) і аварийно завершує весь процес.
  ## Lab 05: Server-Authoritative Physics, Binary Protocol (DataView), and Client Prediction

### 1. Порівняння JSON проти Бінарного протоколу (DataView)

| Параметр | JSON Protocol | Binary Protocol (ArrayBuffer / DataView) |
| :--- | :--- | :--- |
| **Розмір пакету (Input)** | ~60–90 байт (у текстовому вигляді) | **9 байт** (фіксована структура) |
| **Розмір пакету (Snapshot)**| ~250–500+ байт залежно від кількості сутностей | **6 + N * 19 байт** (компактні числа) |
| **Швидкість серіалізації** | Повільна (парсинг текстових рядків через `JSON.parse` / `JSON.stringify`) | **Миттєва** (прямий запис у пам'ять через `DataView`) |
| **Накладні витрати (Overhead)**| Високі (дублювання ключів об'єктів, лапки, коми) | **Мінімальні** (лише чисті бінарні дані з little-endian) |

### 2. Висновки та відповіді на питання (Reflection)
* **Затримка (Latency) та Інтерполяція:** Обрана затримка інтерполяції становить 100 мс. Це дозволяє ефективно згладжувати мережевий джиттер (jitter) і переміщувати чужі сутності між двома останніми знімками сервера без ривків.
* **Розбіжність стану та передбачення (Reconciliation):** Завдяки клієнтському передбаченню власний корабель реагує на натискання миттєво. Коли надходить авторитетний знімок від сервера, клієнт коригує позицію та виконує повторний прогон непідтверджених інпутів (replay unconfirmed inputs), згладжуючи поправку за кілька кадрів.
* **Захист від чітів:** Оскільки єдиним джерелом правди є сервер (Server-Authoritative), клієнт більше не відправляє власні координати — він передає виключно команди керування (`input`). Це повністю унеможливлює поширені чіти на телепортацію чи модифікацію швидкості на боці клієнта.