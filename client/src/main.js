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
    
    const socket = new GameSocket('ws://localhost:3000');
    socket.connect(detail.roomName || 'default-room');

    startTheGame(detail.playerName, detail.themeColor, resources, socket, audioManager);
  });

  lobby.addEventListener('abort', () => {
    alert('Lobby session aborted.');
  });

  lobby.render();
}

function startTheGame(playerName, themeColor, resources, socket, audioManager) {
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

  let serverState = { ships: {}, asteroids: [], projectiles: [], explosions: [] };
  let lastSnapshotTime = Date.now();
  let rtt = 0;
  let clientFireCooldown = 0;

  socket.onSnapshot = (snapshot) => {
    const now = Date.now();
    rtt = now - lastSnapshotTime;
    lastSnapshotTime = now;
    serverState = snapshot;

    if (serverState.explosions && serverState.explosions.length > 0) {
      audioManager.play('explosion');
    }
  };

  const gameLoop = createGameLoop(
    (deltaTime) => {
      if (clientFireCooldown > 0) {
        clientFireCooldown -= deltaTime;
      }

      let dx = 0;
      let dy = 0;
      if (input.isPressed('ArrowLeft') || input.isPressed('KeyA')) dx = -1;
      if (input.isPressed('ArrowRight') || input.isPressed('KeyD')) dx = 1;
      if (input.isPressed('ArrowUp') || input.isPressed('KeyW')) dy = -1;
      if (input.isPressed('ArrowDown') || input.isPressed('KeyS')) dy = 1;
      const fireKey = input.isPressed('Space');

      let fire = fireKey;
      if (fireKey && clientFireCooldown <= 0) {
        clientFireCooldown = 0.25;
        audioManager.play('laser');
      }

      socket.sendInput(dx, dy, fire);
    },
    () => {
      renderer.clear();

      if (serverState.asteroids) {
        for (const ast of serverState.asteroids) {
          renderer.drawEntity({
            kind: 'asteroid',
            position: { x: ast.x, y: ast.y },
            radius: ast.radius || 20
          });
        }
      }

      if (serverState.projectiles) {
        for (const p of serverState.projectiles) {
          renderer.drawEntity({
            kind: 'projectile',
            position: { x: p.x, y: p.y }
          });
        }
      }

      for (const id in serverState.ships) {
        const shipData = serverState.ships[id];
        if (!shipData) continue; 

        renderer.drawEntity({
          kind: 'ship',
          position: { 
            x: shipData.x || 0, 
            y: shipData.y || 0 
          },
          width: 30,
          height: 30,
          angle: 0
        });
      }

      netgraph.update(rtt, Date.now() - lastSnapshotTime, 1200);
    }
  );

  gameLoop.start();
}