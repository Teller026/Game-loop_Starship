import { createInputHandler } from './input.js';
import { createRenderer } from './renderer.js';
import { createGameLoop } from './gameLoop.js';
import { loadAll } from './loader.js';
import { AudioManager } from './audio.js';
import { eventBus } from './eventBus.js';
import { Lobby } from './lobby.js';
import { GameSocket } from './net/socket.js';
import { Netgraph } from './netgraph.js';

const loadingContainer = document.createElement('div');
loadingContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#0b0b16;display:flex;flex-direction:column;justify-content:center;align-items:center;color:#fff;font-family:monospace;z-index:100;';
loadingContainer.innerHTML = '<h2>Loading Game Assets...</h2><div style="width:300px;height:20px;border:2px solid #00ffcc;margin-top:10px;"><div id="progress-bar" style="width:0%;height:100%;background:#00ffcc;"></div></div><p id="loading-error" style="color:#ff0055;margin-top:20px;max-width:600px;text-align:center;"></p>';
document.body.appendChild(loadingContainer);

const progressBar = document.getElementById('progress-bar');
const errorParagraph = document.getElementById('loading-error');
let loadedCount = 0;
const totalAssets = 4;

const updateProgress = () => {
  loadedCount++;
  const percent = (loadedCount / totalAssets) * 100;
  progressBar.style.width = percent + '%';
};

const audioManager = new AudioManager();
audioManager.setupListeners();

const controller = new AbortController();

loadAll('/manifest.json', audioManager.audioCtx, updateProgress, controller.signal)
  .then((resources) => {
    loadingContainer.remove();
    audioManager.setBuffers(resources.audio);

    showLobby(resources, audioManager);
  })
  .catch((err) => {
    console.error(err);
    errorParagraph.textContent = 'Error: ' + err.message;
    const retryBtn = document.createElement('button');
    retryBtn.textContent = 'Retry';
    retryBtn.style.cssText = 'padding:10px 20px;background:#00ffcc;border:none;cursor:pointer;margin-top:15px;font-weight:bold;';
    retryBtn.addEventListener('click', () => window.location.reload());
    loadingContainer.appendChild(retryBtn);
  });

function showLobby(resources, audioManager) {
  const lobbyContainer = document.createElement('div');
  document.body.appendChild(lobbyContainer);

  const lobby = new Lobby(lobbyContainer);
  
  lobby.addEventListener('join', (event) => {
    audioManager.resumeContext();
    lobbyContainer.remove();
    const detail = event.detail;
    
    // Підключаємося до сокета та передаємо обрану кімнату на сервер
    const socket = new GameSocket('ws://localhost:3000');
    socket.connect();
    
    // Одразу надсилаємо запит на приєднання до кімнати через JSON
    setTimeout(() => {
      socket.socket.send(JSON.stringify({ type: 'join', roomId: detail.roomName || 'default-room' }));
    }, 200);

    startTheGame(detail.playerName, detail.themeColor, resources, socket);
  });

  lobby.addEventListener('abort', () => {
    alert('Lobby session aborted.');
  });

  lobby.render();
}

function startTheGame(playerName, themeColor, resources, socket) {
  document.body.style.margin = '0';
  document.body.style.background = themeColor || '#0b0b16';
  document.body.style.display = 'flex';
  document.body.style.justifyContent = 'center';
  document.body.style.alignItems = 'center';
  document.body.style.height = '100vh';

  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  canvas.style.display = 'block';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const input = createInputHandler();
  const renderer = createRenderer(ctx, canvas, resources.images);
  const netgraph = new Netgraph();

  let serverState = { ships: {} };
  let lastSnapshotTime = Date.now();
  let rtt = 0;
  let bytesReceived = 0;

  socket.onSnapshot = (snapshot) => {
    const now = Date.now();
    rtt = now - lastSnapshotTime;
    lastSnapshotTime = now;
    serverState = snapshot;
  };

  const gameLoop = createGameLoop(
    (deltaTime) => {
      // Збираємо інпут від гравця
      const thrust = input.isPressed('ArrowUp') || input.isPressed('KeyW');
      let turn = 0;
      if (input.isPressed('ArrowLeft') || input.isPressed('KeyA')) turn = -1;
      if (input.isPressed('ArrowRight') || input.isPressed('KeyD')) turn = 1;

      // Надсилаємо інпут на сервер у бінарному форматі
      socket.sendInput(thrust, turn);
    },
    () => {
      renderer.clear();

      // Рендеримо кораблі згідно зі знімками сервера
      for (const id in serverState.ships) {
        const shipData = serverState.ships[id];
        // Створюємо тимчасовий об'єкт для малювання рендерером
        const proxyShip = {
          x: shipData.x,
          y: shipData.y,
          angle: shipData.angle,
          isDead: false,
          radius: 15
        };
        renderer.drawEntity(proxyShip);
      }

      // Оновлюємо netgraph
      netgraph.update(rtt, Date.now() - lastSnapshotTime, 1200);
    }
  );

  gameLoop.start();
}