export interface RenderPoint {
  readonly x: number;
  readonly y: number;
}

export type RenderableEntity =
  | {
      readonly kind: 'ship';
      readonly position: RenderPoint;
      readonly width: number;
      readonly height: number;
      readonly angle?: number;
    }
  | {
      readonly kind: 'asteroid';
      readonly position: RenderPoint;
      readonly radius: number;
      readonly angle?: number;
    }
  | {
      readonly kind: 'projectile';
      readonly position: RenderPoint;
      readonly angle?: number;
    }
  | {
      readonly kind: 'particle';
      readonly position: RenderPoint;
      readonly angle?: number;
    };

export type ImageCollection =
  | Map<string, HTMLImageElement>
  | Record<string, HTMLImageElement | undefined>
  | null
  | undefined;

export interface Renderer {
  clear(): void;
  drawEntity(entity: RenderableEntity): void;
}

function resolveImage(
  images: ImageCollection,
  keys: readonly string[]
): HTMLImageElement | null {
  if (!images) return null;
  if (images instanceof Map) {
    for (const key of keys) {
      const img = images.get(key);
      if (img) return img;
    }
    return null;
  }
  for (const key of keys) {
    const img = images[key];
    if (img) return img;
  }
  return null;
}

function assertNever(value: never): never {
  throw new Error('Unhandled entity kind: ' + String(value));
}

export function createRenderer(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  images: ImageCollection
): Renderer {
  return {
    clear(): void {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
    drawEntity(entity: RenderableEntity): void {
      ctx.save();
      ctx.translate(entity.position.x, entity.position.y);
      if (entity.angle) {
        ctx.rotate(entity.angle);
      }

      switch (entity.kind) {
        case 'ship': {
          const img = resolveImage(images, ['ship', 'player']);
          if (img) {
            try {
              ctx.drawImage(img, -entity.width / 2, -entity.height / 2, entity.width, entity.height);
            } catch {
              ctx.fillStyle = '#00ffcc';
              ctx.fillRect(-entity.width / 2, -entity.height / 2, entity.width, entity.height);
            }
          } else {
            ctx.fillStyle = '#00ffcc';
            ctx.fillRect(-entity.width / 2, -entity.height / 2, entity.width, entity.height);
          }
          break;
        }
        case 'asteroid': {
          const img = resolveImage(images, ['asteroid', 'meteor', 'rock']);
          const size = (entity.radius || 20) * 2;
          if (img) {
            try {
              ctx.drawImage(img, -size / 2, -size / 2, size, size);
            } catch {
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
          break;
        }
        case 'projectile': {
          ctx.beginPath();
          ctx.arc(0, 0, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#00ffcc';
          ctx.fill();
          break;
        }
        case 'particle': {
          ctx.beginPath();
          ctx.arc(0, 0, 2, 0, Math.PI * 2);
          ctx.fillStyle = '#00ffcc';
          ctx.fill();
          break;
        }
        default: {
          assertNever(entity);
        }
      }

      ctx.restore();
    }
  };
}