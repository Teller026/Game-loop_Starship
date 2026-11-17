export function createRenderer(ctx, canvas, images) {
  return {
    clear() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
    drawEntity(entity) {
      ctx.save();
      ctx.translate(entity.position.x, entity.position.y);
      if (entity.angle) {
        ctx.rotate(entity.angle);
      }

      if (entity.kind === 'ship') {
        let img = null;
        if (images) {
          if (typeof images.get === 'function') {
            img = images.get('ship') || images.get('player');
          } else {
            img = images.ship || images.player;
          }
        }

        if (img) {
          try {
            ctx.drawImage(img, -entity.width / 2, -entity.height / 2, entity.width, entity.height);
          } catch (e) {
            ctx.fillStyle = '#00ffcc';
            ctx.fillRect(-entity.width / 2, -entity.height / 2, entity.width, entity.height);
          }
        } else {
          ctx.fillStyle = '#00ffcc';
          ctx.fillRect(-entity.width / 2, -entity.height / 2, entity.width, entity.height);
        }
      } else if (entity.kind === 'asteroid') {
        let img = null;
        if (images) {
          if (typeof images.get === 'function') {
            img = images.get('asteroid') || images.get('meteor') || images.get('rock');
          } else {
            img = images.asteroid || images.meteor || images.rock;
          }
        }

        const size = (entity.radius || 20) * 2;
        if (img) {
          try {
            ctx.drawImage(img, -size / 2, -size / 2, size, size);
          } catch (e) {
            ctx.beginPath();
            ctx.arc(0, 0, entity.radius || 20, 0, Math.PI * 2);
            ctx.fillStyle = '#888888';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, entity.radius || 20, 0, Math.PI * 2);
          ctx.fillStyle = '#888888';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      } else if (entity.kind === 'projectile') {
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#00ffcc';
        ctx.fill();
      }

      ctx.restore();
    }
  };
}