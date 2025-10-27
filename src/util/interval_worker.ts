// src/util/interval_worker.ts

export type IntervalWorkerOptions = {
  /** Run the first tick immediately (default true). If false, waits one interval. */
  leading?: boolean;
  /** Add +/- jitter percentage to each interval (e.g. 0.1 = ±10%). Default 0. */
  jitterPct?: number;
  /** If true, timers are unref()'d so they don't keep the process alive. */
  unref?: boolean;
  /** Called when the task throws/rejects. Swallows the error by default. */
  onError?: (err: unknown) => void;
};

export class IntervalWorker {
  private timer: NodeJS.Timeout | null = null;
  private fn: (() => Promise<void> | void) | null = null;
  private ms = 0;
  private running = false;

  // re-entrancy & stats
  private inFlight = false;
  private lastError: unknown = null;
  private lastRunAt = 0;
  private lastDurationMs = 0;
  private ticks = 0;

  // opts
  private leading: boolean;
  private jitterPct: number;
  private unrefTimers: boolean;
  private onError?: (err: unknown) => void;

  constructor(opts: IntervalWorkerOptions = {}) {
    this.leading = opts.leading ?? true;
    this.jitterPct = Math.max(0, Number(opts.jitterPct ?? 0));
    this.unrefTimers = !!opts.unref;
    this.onError = opts.onError;
  }

  /** Start the worker with a task and base interval (ms). */
  start(fn: () => Promise<void> | void, ms: number) {
    if (this.running) throw new Error("IntervalWorker: already running");
    if (!Number.isFinite(ms) || ms <= 0) throw new Error("IntervalWorker: invalid interval");
    this.fn = fn;
    this.ms = Math.floor(ms);
    this.running = true;
    this.scheduleNext(this.leading ? 0 : this.nextDelay());
  }

  /** Stop the worker; cancels any pending tick. */
  stop() {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    // keep fn for potential restart? Clear it to be explicit.
    this.fn = null;
  }

  /** Force a tick ASAP (queued). Safe even if one is running; it runs after. */
  triggerSoon() {
    if (!this.running) return;
    this.scheduleNext(0, /*replace*/ true);
  }

  /** Update the base interval on the fly. Takes effect next scheduling. */
  setIntervalMs(ms: number) {
    if (!Number.isFinite(ms) || ms <= 0) throw new Error("IntervalWorker: invalid interval");
    this.ms = Math.floor(ms);
  }

  isRunning() { return this.running; }
  getIntervalMs() { return this.ms; }

  /** Simple introspection for metrics/logging. */
  stats() {
    return {
      running: this.running,
      inFlight: this.inFlight,
      ticks: this.ticks,
      lastRunAt: this.lastRunAt,          // epoch ms
      lastDurationMs: this.lastDurationMs,
      hadError: this.lastError != null,
    };
  }

  // ---------- internals ----------

  private scheduleNext(delayMs: number, replace = false) {
    if (!this.running) return;

    if (replace && this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.timer) return; // already scheduled

    const run = async () => {
      this.timer = null; // we're consuming this schedule

      // Prevent overlapping runs; if still in flight, reschedule soon.
      if (this.inFlight) {
        this.scheduleNext(5); // small backoff to avoid hot loop
        return;
      }

      if (!this.fn) {
        // Nothing to do, stop cleanly
        this.stop();
        return;
      }

      this.inFlight = true;
      const t0 = Date.now();
      this.lastRunAt = t0;
      try {
        await this.fn();
        this.lastError = null;
      } catch (e) {
        this.lastError = e;
        try { this.onError?.(e); } catch { /* ignore onError errors */ }
      } finally {
        this.lastDurationMs = Math.max(0, Date.now() - t0);
        this.inFlight = false;
        this.ticks++;
      }

      // Schedule next tick considering jitter
      if (this.running) {
        this.scheduleNext(this.nextDelay());
      }
    };

    this.timer = setTimeout(run, Math.max(0, delayMs));
    if (this.unrefTimers && typeof this.timer.unref === "function") this.timer.unref();
  }

  private nextDelay(): number {
    if (this.jitterPct <= 0) return this.ms;
    const jitterAbs = this.ms * this.jitterPct;
    // random in [-jitterAbs, +jitterAbs]
    const delta = (Math.random() * 2 - 1) * jitterAbs;
    return Math.max(1, Math.floor(this.ms + delta));
  }
}

