// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

export const VOID_P2P_CLIENT_TRANSIENT_CLOCK_V1 =
  "VOID_P2P_CLIENT_TRANSIENT_CLOCK_V1";

export type VoidP2pClientTransientClockObservationV1 = Readonly<{
  now_ms: number;
  regressed: boolean;
  generation: number;
}>;

export class VoidP2pClientTransientClockV1 {
  private lastClockMs: number | undefined;
  private generationValue = 0;

  get generation(): number {
    return this.generationValue;
  }

  observe(nowMs = Date.now()): VoidP2pClientTransientClockObservationV1 {
    if (!Number.isSafeInteger(nowMs) || nowMs < 0) {
      throw new Error("P2P client transient clock is invalid");
    }
    const regressed =
      this.lastClockMs !== undefined && nowMs < this.lastClockMs;
    const generation = regressed
      ? this.generationValue + 1
      : this.generationValue;
    if (!Number.isSafeInteger(generation) || generation < 0) {
      throw new Error("P2P client transient clock generation overflow");
    }
    this.lastClockMs = nowMs;
    this.generationValue = generation;
    return Object.freeze({
      now_ms: nowMs,
      regressed,
      generation,
    });
  }
}
