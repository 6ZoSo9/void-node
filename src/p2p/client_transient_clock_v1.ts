// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

export const VOID_P2P_CLIENT_TRANSIENT_CLOCK_V1 =
  "VOID_P2P_CLIENT_TRANSIENT_CLOCK_V1";

export type VoidP2pClientTransientClockObservationV1 = Readonly<{
  now_ms: number;
  regressed: boolean;
}>;

export class VoidP2pClientTransientClockV1 {
  private lastClockMs: number | undefined;

  observe(nowMs = Date.now()): VoidP2pClientTransientClockObservationV1 {
    if (!Number.isSafeInteger(nowMs) || nowMs < 0) {
      throw new Error("P2P client transient clock is invalid");
    }
    const regressed =
      this.lastClockMs !== undefined && nowMs < this.lastClockMs;
    this.lastClockMs = nowMs;
    return Object.freeze({
      now_ms: nowMs,
      regressed,
    });
  }
}
