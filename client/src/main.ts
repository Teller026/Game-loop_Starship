import { createInputHandler } from './input.js';
import { createRenderer } from './renderer.js';
import { createGameLoop } from './gameLoop.js';
import { loadAll, type LoadedResources } from './loader.js';
import { AudioManager } from './audio.js';
import { Lobby, type LobbyJoinDetail } from './lobby.js';
import { GameSocket, type SnapshotData } from './net/socket.js';
import { Netgraph } from './netgraph.js';

interface SnapshotPoint {
  readonly x: number;
  readonly y: number;
}

interface ShipSnapshot {
  x?: number;
  y?: number;
  pos?: SnapshotPoint;
  hp?: number;
}

interface AsteroidSnapshot {
  x?: number;
  y?: number;
  pos?: SnapshotPoint;
  radius?: number;
}

interface ProjectileSnapshot {
  x?: number;
  y?: number;
  pos?: SnapshotPoint;
}

interface ServerSnapshotState {
  ships?: Record<string, ShipSnapshot | undefined>;
  asteroids?: AsteroidSnapshot[];
  projectiles?: ProjectileSnapshot[];
  explosions?: unknown[];
}

type LobbyJoinDetailWithRoom = LobbyJoinDetail & {
  roomName?: string;
};

function readPoint(
  point: SnapshotPoint | undefined,
  fallbackX: number | undefined,
  fallbackY: number | undefined
): SnapshotPoint {
  if (point) {
    return { x: point.x, y: point.y };
  }
  return {
    x: fallbackX ?? 0,
    y: fallbackY ?? 0
  };
}

const loadingContainer = document.createElement('div');
loadingContainer.style.cssText =
  'position:fixed;top:0;left:0;width:100%;height:100%;background:#0b0b16;display:flex;flex-direction:column;justify-content:center;align-items:center;color:#fff;font-family:monospace;z-index:100;';
loadingContainer.innerHTML =
  '<h2>Loading Game Assets...</h2><div style="width:300px;height:20px;border:2px solid #00ffcc;margin-top:10px;"><div id="progress-bar" style="width:0%;height:100%;background:#00ffcc;"></div></div><p id="loading-error" style="color:#ff0055;margin-top:20px;max-width:600px;text-align:center;"></p>';
document.body.appendChild(loadingContainer);

const progressBar = document.getElementById('progress-bar');
const errorParagraph = document.getElementById('loading-error');
let loadedCount = 0;
const totalAssets = 4;

const updateProgress = (): void => {
  loadedCount++;
  const percent = (loadedCount / totalAssets) * 100;
  if (progressBar instanceof HTMLElement) {
    progressBar.style.width = String(percent) + '%';
  }
};

const audioManager = new AudioManager();
audioManager.setupListeners();

const controller = new AbortController();

loadAll('/manifest.json', audioManager.audioCtx, updateProgress, controller.signal)
  .then((resources) => {
    loadingContainer.remove();
    audioManager.setBuffers(resources.audio as unknown as Map<string, AudioBuffer>);

    showLobby(resources, audioManager);
  })
  .catch((err: unknown) => {
    console.error(err);
    const message = err instanceof Error ? err.message : String(err);
    if (errorParagraph) {
      errorParagraph.textContent = 'Error: ' + message;
    }
    const retryBtn = document.createElement('button');
    retryBtn.textContent = 'Retry';
    retryBtn.style.cssText =
      'padding:10px 20px;background:#00ffcc;border:none;cursor:pointer;margin-top:15px;font-weight:bold;';
    retryBtn.addEventListener('click', () => window.location.reload());
    loadingContainer.appendChild(retryBtn);
  });

function showLobby(resources: LoadedResources, currentAudioManager: AudioManager): void {
  const lobbyContainer = document.createElement('div');
  document.body.appendChild(lobbyContainer);

  const lobby = new Lobby(lobbyContainer);

  lobby.addEventListener('join', (event: Event) => {
    currentAudioManager.resumeContext();
    lobbyContainer.remove();
    const customEvent = event as CustomEvent<LobbyJoinDetailWithRoom>;
    const detail = customEvent.detail;

    const socket = new GameSocket('ws://localhost:3000');
    socket.connect(detail.roomName || 'default-room');

    startTheGame(detail.playerName, detail.themeColor, resources, socket, currentAudioManager);
  });

  lobby.addEventListener('abort', () => {
    alert('Lobby session aborted.');
  });

  lobby.render();
}

function startTheGame(
  _playerName: string,
  themeColor: string,
  resources: LoadedResources,
  socket: GameSocket,
  currentAudioManager: AudioManager
): void {
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
  if (!ctx) {
    throw new Error('2D context is not available');
  }

  const input = createInputHandler();
  const renderer = createRenderer(ctx, canvas, resources.images);
  const netgraph = new Netgraph();

  let serverState: ServerSnapshotState = {
    ships: {},
    asteroids: [],
    projectiles: [],
    explosions: []
  };
  let lastSnapshotTime = Date.now();
  let rtt = 0;
  let clientFireCooldown = 0;

  socket.onSnapshot = (snapshot: SnapshotData): void => {
    const now = Date.now();
    rtt = now - lastSnapshotTime;
    lastSnapshotTime = now;
    serverState = snapshot as unknown as ServerSnapshotState;

    if (serverState.explosions && serverState.explosions.length > 0) {
      currentAudioManager.play('explosion');
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

      const fire = fireKey;
      if (fireKey && clientFireCooldown <= 0) {
        clientFireCooldown = 0.25;
        currentAudioManager.play('laser');
      }

      socket.sendInput(dx, dy, fire);
    },
    () => {
      renderer.clear();

      if (serverState.asteroids) {
        for (const ast of serverState.asteroids) {
          renderer.drawEntity({
            kind: 'asteroid',
            position: readPoint(ast.pos, ast.x, ast.y),
            radius: ast.radius || 20
          });
        }
      }

      if (serverState.projectiles) {
        for (const p of serverState.projectiles) {
          renderer.drawEntity({
            kind: 'projectile',
            position: readPoint(p.pos, p.x, p.y)
          });
        }
      }

      if (serverState.ships) {
        for (const id in serverState.ships) {
          const shipData = serverState.ships[id];
          if (!shipData) continue;

          const point = readPoint(shipData.pos, shipData.x, shipData.y);
          const hp = Math.max(0, Math.round(shipData.hp ?? 100));

          renderer.drawEntity({
            kind: 'ship',
            position: point,
            width: 30,
            height: 30,
            angle: 0
          });

          ctx.fillStyle = 'rgba(11, 11, 22, 0.8)';
          ctx.fillRect(12, 12, 110, 28);
          ctx.strokeStyle = '#00ffcc';
          ctx.strokeRect(12, 12, 110, 28);
          ctx.fillStyle = '#00ffcc';
          ctx.font = 'bold 14px monospace';
          ctx.fillText('HP: ' + String(hp), 20, 31);
        }
      }

      netgraph.update(rtt, Date.now() - lastSnapshotTime, 1200);
    }
  );

  gameLoop.start();
}