import { updateGame, type PhysicsGameState, type PhysicsInput } from '../../shared/src/physics.js';

export interface WorkerStepRequest {
  readonly id: number;
  readonly state: PhysicsGameState;
  readonly inputs: Record<string, PhysicsInput | undefined>;
  readonly dt: number;
}

export interface WorkerStepResponse {
  readonly id: number;
  readonly state: PhysicsGameState;
  readonly computeMs: number;
}

self.addEventListener('message', (event: MessageEvent<WorkerStepRequest>) => {
  const { id, state, inputs, dt } = event.data;
  const t0 = performance.now();
  updateGame(state, inputs, dt);
  const computeMs = performance.now() - t0;

  const response: WorkerStepResponse = { id, state, computeMs };
  self.postMessage(response);
});