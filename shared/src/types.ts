import { z } from 'zod';

declare const brandSymbol: unique symbol;

type Brand<TValue, TBrand extends string> = TValue & {
  readonly [brandSymbol]: Record<TBrand, true>;
};

export type PlayerId = Brand<string, 'PlayerId'>;
export type TickId = Brand<number, 'TickId'>;
export type InputSeq = Brand<number, 'InputSeq'>;

export function toPlayerId(value: string): PlayerId {
  return value as PlayerId;
}

export function toTickId(value: number): TickId {
  return value as TickId;
}

export function toInputSeq(value: number): InputSeq {
  return value as InputSeq;
}

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface DecodedInput {
  readonly seq: InputSeq;
  readonly dx: number;
  readonly dy: number;
  readonly fire: boolean;
}

export interface SnapshotShip {
  readonly kind: 'ship';
  readonly id: PlayerId;
  readonly pos: Vec2;
  readonly vel: Vec2;
  readonly hp: number;
}

export interface SnapshotAsteroid {
  readonly kind: 'asteroid';
  readonly pos: Vec2;
  readonly radius: number;
}

export interface SnapshotProjectile {
  readonly kind: 'projectile';
  readonly pos: Vec2;
}

export interface SnapshotExplosion {
  readonly kind: 'explosion';
  readonly pos: Vec2;
}

export type SnapshotEntity =
  | SnapshotAsteroid
  | SnapshotExplosion
  | SnapshotProjectile
  | SnapshotShip;

export interface DecodedSnapshot {
  readonly timestamp: TickId;
  readonly ships: Record<string, SnapshotShip>;
  readonly asteroids: readonly SnapshotAsteroid[];
  readonly projectiles: readonly SnapshotProjectile[];
  readonly explosions: readonly SnapshotExplosion[];
}

export interface SnapshotInputShape {
  readonly ships?: Record<
    string,
    {
      readonly x: number;
      readonly y: number;
      readonly vx: number;
      readonly vy: number;
      readonly hp?: number;
    }
  >;
  readonly asteroids?: readonly {
    readonly x: number;
    readonly y: number;
    readonly radius: number;
  }[];
  readonly projectiles?: readonly {
    readonly x: number;
    readonly y: number;
  }[];
  readonly explosions?: readonly {
    readonly x: number;
    readonly y: number;
  }[];
}

export const JoinMessageSchema = z.object({
  type: z.literal('join'),
  roomId: z.string().min(1).max(64)
});

export const PingMessageSchema = z.object({
  type: z.literal('ping'),
  clientTime: z.number().finite()
});

export const ClientMessageSchema = z.discriminatedUnion('type', [
  JoinMessageSchema,
  PingMessageSchema
]);

export type ClientMessage = z.infer<typeof ClientMessageSchema>;

export function parseClientMessage(raw: unknown): ClientMessage | null {
  let parsedJson: unknown = raw;

  if (typeof raw === 'string') {
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      return null;
    }
  } else if (raw instanceof Uint8Array) {
    try {
      parsedJson = JSON.parse(new TextDecoder().decode(raw));
    } catch {
      return null;
    }
  } else if (raw instanceof ArrayBuffer) {
    try {
      parsedJson = JSON.parse(new TextDecoder().decode(new Uint8Array(raw)));
    } catch {
      return null;
    }
  }

  const result = ClientMessageSchema.safeParse(parsedJson);
  if (!result.success) {
    return null;
  }

  const msg: ClientMessage = result.data;
  switch (msg.type) {
    case 'join':
      return msg;
    case 'ping':
      return msg;
    default: {
      const exhaustiveCheck: never = msg;
      return exhaustiveCheck;
    }
  }
}

export function assertNever(value: never, context: string): never {
  throw new Error('Unhandled union member in ' + context + ': ' + String(value));
}