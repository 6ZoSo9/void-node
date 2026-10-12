// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

// src/util/interval_worker.ts
export class IntervalWorker {
  private t: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private fn: () => Promise<void> | void, private ms: number) {}

  start() {
    if (this.t) return false;
    const tick = async () => {
      if (this.running) return;
      this.running = true;
      try { await this.fn(); } finally { this.running = false; }
    };
    void tick();
    this.t = setInterval(tick, Math.max(100, this.ms));
    (this.t as any).unref?.();
    return true;
  }

  stop() {
    if (!this.t) return false;
    clearInterval(this.t);
    this.t = null;
    return true;
  }

  isRunning() { return !!this.t; }
}

