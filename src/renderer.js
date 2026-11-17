export function createRenderer(ctx, canvas) {
  return {
    clear() {
      ctx.fillStyle = '#0b0b16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    },
    drawPlayer(player) {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.angle || 0);

      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 2;
      ctx.fillStyle = '#112233';

      ctx.beginPath();
      ctx.moveTo(0, -player.height / 2);
      ctx.lineTo(player.width / 2, player.height / 2);
      ctx.lineTo(0, player.height / 4);
      ctx.lineTo(-player.width / 2, player.height / 2);
      ctx.closePath();

      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  };
}