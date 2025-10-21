// src/metrics.ts
export class Metrics {
  counters = {
    tx_submitted: 0,
    blocks_sealed: 0,
    blocks_imported: 0,
    tx_indexed: 0,
    receipts_appended: 0,
  }

  gauges = {
    last_seal_ms: 0,
  }

  inc<K extends keyof Metrics["counters"]>(k: K, v = 1) {
    this.counters[k] += v
  }

  renderText(extra: { peers: number; mempool: number; head: number }) {
    const lines: string[] = []
    lines.push("# HELP void_tx_submitted Total tx submitted via HTTP")
    lines.push("# TYPE void_tx_submitted counter")
    lines.push(`void_tx_submitted ${this.counters.tx_submitted}`)

    lines.push("# HELP void_blocks_sealed Total blocks sealed by this node")
    lines.push("# TYPE void_blocks_sealed counter")
    lines.push(`void_blocks_sealed ${this.counters.blocks_sealed}`)

    lines.push("# HELP void_blocks_imported Total blocks imported by follower")
    lines.push("# TYPE void_blocks_imported counter")
    lines.push(`void_blocks_imported ${this.counters.blocks_imported}`)

    lines.push("# HELP void_tx_indexed Total transactions indexed")
    lines.push("# TYPE void_tx_indexed counter")
    lines.push(`void_tx_indexed ${this.counters.tx_indexed}`)

    lines.push("# HELP void_receipts_appended Total receipts appended")
    lines.push("# TYPE void_receipts_appended counter")
    lines.push(`void_receipts_appended ${this.counters.receipts_appended}`)

    lines.push("# HELP void_peers_connected Current connected peers")
    lines.push("# TYPE void_peers_connected gauge")
    lines.push(`void_peers_connected ${extra.peers}`)

    lines.push("# HELP void_mempool_size Current mempool size")
    lines.push("# TYPE void_mempool_size gauge")
    lines.push(`void_mempool_size ${extra.mempool}`)

    lines.push("# HELP void_head_number Current head block number")
    lines.push("# TYPE void_head_number gauge")
    lines.push(`void_head_number ${extra.head}`)

    lines.push("# HELP void_last_seal_ms Duration of last sealBlock in ms")
    lines.push("# TYPE void_last_seal_ms gauge")
    lines.push(`void_last_seal_ms ${this.gauges.last_seal_ms}`)

    return lines.join("\n") + "\n"
  }
}

// export a singleton
export const metrics = new Metrics()
