// src/metrics.ts
export type MetricsSnapshot = {
  counters: {
    tx_submitted: number;
    blocks_sealed: number;
    blocks_imported: number;
    blocks_filled: number;     // NEW
    tx_indexed: number;
    receipts_appended: number;
    follow_ok: number;
    follow_err: number;
  };
  gauges: {
    last_seal_ms: number;
    peers_known: number;
  };
};

export class Metrics {
  counters: MetricsSnapshot["counters"] = {
    tx_submitted: 0,
    blocks_sealed: 0,
    blocks_imported: 0,
    blocks_filled: 0,          // NEW
    tx_indexed: 0,
    receipts_appended: 0,

    // follower lifecycle
    follow_ok: 0,
    follow_err: 0,
  };

  gauges: MetricsSnapshot["gauges"] = {
    last_seal_ms: 0,
    peers_known: 0,
  };

  /** Increment a known counter by v (default 1). */
  inc<K extends keyof MetricsSnapshot["counters"]>(k: K, v = 1) {
    const n = Number.isFinite(v) ? v : 0;
    this.counters[k] += n;
  }

  /** Set a known gauge to value (clamped to >= 0). */
  setGauge<K extends keyof MetricsSnapshot["gauges"]>(k: K, v: number) {
    const n = Number.isFinite(v) ? v : 0;
    this.gauges[k] = n < 0 ? 0 : n;
  }

  /** Back-compat helpers */
  observeSealMs(ms: number) { this.setGauge("last_seal_ms", ms); }
  recordFollower(ok: boolean) { ok ? this.incFollowOk(1) : this.incFollowErrors(1); }
  incFollowOk(v = 1) { this.counters.follow_ok += v; }
  incFollowErrors(v = 1) { this.counters.follow_err += v; }

  /** Take a deep copy snapshot. */
  snapshot(): MetricsSnapshot {
    return {
      counters: { ...this.counters },
      gauges: { ...this.gauges },
    };
  }

  /** Reset counters (not gauges) to zero. */
  resetCounters() {
    (Object.keys(this.counters) as (keyof MetricsSnapshot["counters"])[])
      .forEach((k) => (this.counters[k] = 0));
  }

  /** Merge from partial snapshot (ignores unknown keys). */
  mergeFrom(partial: Partial<MetricsSnapshot>) {
    if (partial?.counters) {
      for (const k of Object.keys(this.counters) as (keyof MetricsSnapshot["counters"])[]) {
        const v = (partial.counters as any)[k];
        if (typeof v === "number" && Number.isFinite(v)) this.counters[k] = v;
      }
    }
    if (partial?.gauges) {
      for (const k of Object.keys(this.gauges) as (keyof MetricsSnapshot["gauges"])[]) {
        const v = (partial.gauges as any)[k];
        if (typeof v === "number" && Number.isFinite(v)) this.gauges[k] = v;
      }
    }
  }

  /**
   * Prometheus exposition format. `extra` provides dynamic gauges that the
   * Metrics class doesn’t track internally (connected peers, mempool size, head).
   */
  renderText(extra: { peers: number; mempool: number; head: number; peers_known: number }) {
    const L: string[] = [];

    // tx submitted
    L.push("# HELP void_tx_submitted Total tx submitted via HTTP");
    L.push("# TYPE void_tx_submitted counter");
    L.push(`void_tx_submitted ${this.counters.tx_submitted}`);

    // sealed blocks
    L.push("# HELP void_blocks_sealed Total blocks sealed by this node");
    L.push("# TYPE void_blocks_sealed counter");
    L.push(`void_blocks_sealed ${this.counters.blocks_sealed}`);

    // imported blocks
    L.push("# HELP void_blocks_imported Total blocks imported by follower");
    L.push("# TYPE void_blocks_imported counter");
    L.push(`void_blocks_imported ${this.counters.blocks_imported}`);

    // NEW: filled blocks
    L.push("# HELP void_blocks_filled Total number of existing blocks filled with missing txs");
    L.push("# TYPE void_blocks_filled counter");
    L.push(`void_blocks_filled ${this.counters.blocks_filled}`);

    // tx indexed
    L.push("# HELP void_tx_indexed Total transactions indexed");
    L.push("# TYPE void_tx_indexed counter");
    L.push(`void_tx_indexed ${this.counters.tx_indexed}`);

    // receipts appended
    L.push("# HELP void_receipts_appended Total receipts appended");
    L.push("# TYPE void_receipts_appended counter");
    L.push(`void_receipts_appended ${this.counters.receipts_appended}`);

    // follower: ok / err
    L.push("# HELP void_follower_ok Successful follower pulls");
    L.push("# TYPE void_follower_ok counter");
    L.push(`void_follower_ok ${this.counters.follow_ok}`);

    L.push("# HELP void_follower_err Failed follower pulls");
    L.push("# TYPE void_follower_err counter");
    L.push(`void_follower_err ${this.counters.follow_err}`);

    // dynamic gauges
    L.push("# HELP void_peers_connected Current connected peers");
    L.push("# TYPE void_peers_connected gauge");
    L.push(`void_peers_connected ${Number(extra.peers) || 0}`);

    L.push("# HELP void_mempool_size Current mempool size");
    L.push("# TYPE void_mempool_size gauge");
    L.push(`void_mempool_size ${Number(extra.mempool) || 0}`);

    L.push("# HELP void_head_number Current head block number");
    L.push("# TYPE void_head_number gauge");
    L.push(`void_head_number ${Number(extra.head) || 0}`);

    // static gauges
    L.push("# HELP void_peers_known Known peers in registry");
    L.push("# TYPE void_peers_known gauge");
    L.push(`void_peers_known ${this.gauges.peers_known}`);

    L.push("# HELP void_last_seal_ms Duration of last sealBlock in ms");
    L.push("# TYPE void_last_seal_ms gauge");
    L.push(`void_last_seal_ms ${this.gauges.last_seal_ms}`);

    return L.join("\n") + "\n";
  }

  /** Aliases */
  render(extra: Parameters<Metrics["renderText"]>[0]) { return this.renderText(extra); }
  getText(extra: Parameters<Metrics["renderText"]>[0]) { return this.renderText(extra); }
}

