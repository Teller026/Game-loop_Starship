export class Lobby extends EventTarget {
  constructor(container) {
    super();
    this.container = container;
    this.abortController = null;
  }

  render() {
    this.container.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #0b0b16; color: #fff; font-family: monospace;" id="lobby-wrapper">
        <h2>Game Lobby</h2>
        <div style="margin-bottom: 15px;">
          <label>Player Name: </label>
          <input type="text" id="player-name" value="Pilot" style="padding: 5px; background: #112233; border: 1px solid #00ffcc; color: #fff;" />
        </div>
        <div style="margin-bottom: 15px;">
          <label>Theme Color: </label>
          <select id="theme-select" style="padding: 5px; background: #112233; border: 1px solid #00ffcc; color: #fff;">
            <option value="#0b0b16">Dark Blue</option>
            <option value="#000000">Black</option>
            <option value="#ffb6c1">Soft Pink</option>
          </select>
        </div>
        <div>
          <button id="join-btn" style="padding: 10px 20px; background: #00ffcc; border: none; cursor: pointer; font-weight: bold;">Join Game</button>
          <button id="abort-btn" style="padding: 10px 20px; background: #ff0055; color: #fff; border: none; cursor: pointer; margin-left: 10px;">Leave</button>
        </div>
      </div>
    `;

    this.abortController = new AbortController();

    const themeSelect = this.container.querySelector('#theme-select');
    const lobbyWrapper = this.container.querySelector('#lobby-wrapper');

    themeSelect.addEventListener('change', () => {
      const selectedColor = themeSelect.value;
      lobbyWrapper.style.background = selectedColor;
      if (selectedColor === '#ffb6c1') {
        lobbyWrapper.style.color = '#000000';
      } else {
        lobbyWrapper.style.color = '#ffffff';
      }
    });

    this.container.querySelector('#join-btn').addEventListener('click', () => {
      const playerName = this.container.querySelector('#player-name').value;
      const themeColor = themeSelect.value;
      this.stop();
      this.dispatchEvent(new CustomEvent('join', {
        detail: { playerName, themeColor }
      }));
    });

    this.container.querySelector('#abort-btn').addEventListener('click', () => {
      this.stop();
      this.dispatchEvent(new CustomEvent('abort'));
    });
  }

  stop() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.container.innerHTML = '';
  }
}