import type { PhysicsGameState, PhysicsInput } from '../../shared/src/physics.js';

export interface WorkerDecision {
  readonly useWorker: boolean;
  readonly reason: string;
  readonly stepBudgetMs: number;
}

export function evaluateSimulationWorker(
  entityCount: number,
  observedMaxStepMs: number,
  hasWorkerSupport: boolean
): WorkerDecision {
  const stepBudgetMs = 33.3;
  if (!hasWorkerSupport) {
    return {
      useWorker: false,
      reason: 'Web Worker API is unavailable in current runtime',
      stepBudgetMs
    };
  }
  if (observedMaxStepMs > stepBudgetMs || entityCount >= 128) {
    return {
      useWorker: true,
      reason: 'Step time approaches/exceeds 33ms budget or high entity load requires off-thread physics',
      stepBudgetMs
    };
  }
  return {
    useWorker: false,
    reason: 'Main-thread step stays well within 33ms budget; postMessage clone cost outweighs offload benefit',
    stepBudgetMs
  };
}

export type WorkerStepInputMap = Record<string, PhysicsInput | undefined>;
export type WorkerStateSnapshot = PhysicsGameState;