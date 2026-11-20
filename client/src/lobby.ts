export interface LobbyJoinDetail {
  playerName: string;
  themeColor: string;
}

export class Lobby extends EventTarget {
  container: HTMLElement;
  abortController: AbortController | null;

  constructor(container: HTMLElement) {
    super();
    this.container = container;
    this.abortController = null;
  }

  render(): void {
    this.container.innerHTML =
      '<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #0b0b16; color: #fff; font-family: monospace;" id="lobby-wrapper">' +
        '<h2>Game Lobby</h2>' +
        '<div style="margin-bottom: 15px;">' +
          '<label>Player Name: </label>' +
          '<input type="text" id="player-name" value="Pilot" style="padding: 5px; background: #112233; border: 1px solid #00ffcc; color: #fff;" />' +
        '</div>' +
        '<div style="margin-bottom: 15px;">' +
          '<label>Theme Color: </label>' +
          '<select id="theme-select" style="padding: 5px; background: #112233; border: 1px solid #00ffcc; color: #fff;">' +
            '<option value="#0b0b16">Dark Blue</option>' +
            '<option value="#000000">Black</option>' +
            '<option value="#ffb6c1">Soft Pink</option>' +
          '</select>' +
        '</div>' +
        '<div>' +
          '<button id="join-btn" style="padding: 10px 20px; background: #00ffcc; border: none; cursor: pointer; font-weight: bold;">Join Game</button>' +
          '<button id="abort-btn" style="padding: 10px 20px; background: #ff0055; color: #fff; border: none; cursor: pointer; margin-left: 10px;">Leave</button>' +
        '</div>' +
      '</div>';

    this.abortController = new AbortController();

    const themeSelect = this.container.querySelector('#theme-select');
    const lobbyWrapper = this.container.querySelector('#lobby-wrapper');
    const nameInput = this.container.querySelector('#player-name');
    const joinBtn = this.container.querySelector('#join-btn');
    const abortBtn = this.container.querySelector('#abort-btn');

    if (
      !(themeSelect instanceof HTMLSelectElement) ||
      !(lobbyWrapper instanceof HTMLElement) ||
      !(nameInput instanceof HTMLInputElement) ||
      !(joinBtn instanceof HTMLElement) ||
      !(abortBtn instanceof HTMLElement)
    ) {
      return;
    }

    themeSelect.addEventListener('change', () => {
      const selectedColor = themeSelect.value;
      lobbyWrapper.style.background = selectedColor;
      if (selectedColor === '#ffb6c1') {
        lobbyWrapper.style.color = '#000000';
      } else {
        lobbyWrapper.style.color = '#ffffff';
      }
    });

    joinBtn.addEventListener('click', () => {
      const playerName = nameInput.value;
      const themeColor = themeSelect.value;
      this.stop();
      const detail: LobbyJoinDetail = { playerName, themeColor };
      this.dispatchEvent(new CustomEvent<LobbyJoinDetail>('join', { detail }));
    });

    abortBtn.addEventListener('click', () => {
      this.stop();
      this.dispatchEvent(new CustomEvent('abort'));
    });
  }

  stop(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.container.innerHTML = '';
  }
}