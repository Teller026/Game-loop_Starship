import { createInputHandler } from './input.js';
import { updatePhysics } from './physics.js';
import { createRenderer } from './renderer.js';
import { createGameLoop } from './gameLoop.js';
import { World } from './world.js';
import { Ship, Asteroid } from './entity.js';
import { loadAll } from './loader.js';
import { AudioManager } from './audio.js';
import { eventBus } from './eventBus.js';
import { Lobby } from './lobby.js';

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
    startTheGame(detail.playerName, detail.themeColor, resources);
  });

  lobby.addEventListener('abort', () => {
    alert('Lobby session aborted.');
  });

  lobby.render();
}

function startTheGame(playerName, themeColor, resources) {
  document.body.style.margin = '0';
  document.body.style.background = themeColor || '#0b0b16';
  document.body.style.display = 'flex';
  document.body.style.justifyContent = 'center'; // Виправлено двокрапку на рівність
  document.body.style.alignItems = 'center';
  document.body.style.height = '100vh';

  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  canvas.style.display = 'block';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  const world = new World();
  const player = new Ship(400, 500);
  world.spawn(player);

  for (let i = 0; i < 4; i++) {
    world.spawn(new Asteroid(Math.random() * 700 + 50, -Math.random() * 300, 25));
  }

  const input = createInputHandler();
  const renderer = createRenderer(ctx, canvas, resources.images);

  let respawnTimer = 0;
  let fireCooldown = 0;

  const gameLoop = createGameLoop(
    (deltaTime) => {
      if (player.isDead) {
        respawnTimer += deltaTime;
        if (respawnTimer >= 2.0) {
          player.respawn(400, 500);
          world.spawn(player);
          respawnTimer = 0;
        }
      } else {
        updatePhysics(player, input, deltaTime, canvas.width, canvas.height);

        fireCooldown -= deltaTime;
        if (input.isPressed('Space') && fireCooldown <= 0) {
          const projectile = player.fire();
          world.spawn(projectile);
          eventBus.dispatchEvent(new CustomEvent('fired'));
          fireCooldown = 0.2;
        }
      }

      world.step(deltaTime);
    },
    () => {
      renderer.clear();
      for (const entity of world.entities.values()) {
        renderer.drawEntity(entity);
      }
      renderer.drawHUD(player);
    }
  );

  gameLoop.start();
}