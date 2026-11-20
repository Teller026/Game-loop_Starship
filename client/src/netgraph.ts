export class Netgraph {
  element: HTMLDivElement;
  rtt: number;
  snapshotAge: number;
  bytesPerSec: number;

  constructor() {
    this.element = document.createElement('div');
    this.element.style.position = 'absolute';
    this.element.style.top = '10px';
    this.element.style.left = '10px';
    this.element.style.color = '#00ffcc';
    this.element.style.fontFamily = 'monospace';
    this.element.style.fontSize = '12px';
    this.element.style.background = 'rgba(0, 0, 0, 0.7)';
    this.element.style.padding = '8px';
    this.element.style.pointerEvents = 'none';
    document.body.appendChild(this.element);

    this.rtt = 0;
    this.snapshotAge = 0;
    this.bytesPerSec = 0;
  }

  update(rtt: number, snapshotAge: number, bytesPerSec: number): void {
    this.rtt = rtt;
    this.snapshotAge = snapshotAge;
    this.bytesPerSec = bytesPerSec;
    this.element.textContent =
      'RTT: ' +
      String(Math.round(this.rtt)) +
      'ms | Snapshot Age: ' +
      String(Math.round(this.snapshotAge)) +
      'ms | Net: ' +
      String(Math.round(this.bytesPerSec)) +
      ' B/s';
  }
}