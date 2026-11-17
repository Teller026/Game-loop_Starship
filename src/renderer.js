export function createRenderer(ctx, canvas) {
  return {
    clear() {
      ctx.fillStyle = '#0b0b16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    },
    drawEntity(entity) {
      ctx.save();
      ctx.translate(entity.position.x, entity.position.y);

      if (entity.kind === 'ship') {
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 2;
        ctx.fillStyle = '#112233';

        ctx.beginPath();
        ctx.moveTo(0, -entity.height / 2);
        ctx.lineTo(entity.width / 2, entity.height / 2);
        ctx.lineTo(0, entity.height / 4);
        ctx.lineTo(-entity.width / 2, entity.height / 2);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();
      } else if (entity.kind === 'projectile') {
        ctx.fillStyle = '#ff0055';
        ctx.beginPath();
        ctx.arc(0, 0, entity.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (entity.kind === 'asteroid') {
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 2;
        ctx.fillStyle = '#333333';
        ctx.beginPath();
        ctx.arc(0, 0, entity.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (entity.kind === 'particle') {
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(-1, -1, 2, 2);
      }

      ctx.restore();
    },
    drawHUD(ship) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px monospace';
      ctx.fillText(`HP: ${ship.hp}`, 20, 30);
    }
  };
}