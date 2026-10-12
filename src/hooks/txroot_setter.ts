/**
 * Minimal, safe txroot setter/exporter hook.
 * - Single export (no duplicates).
 * - Idempotent attach (won't re-register).
 * - Exposes Prom text at /__void/metrics/txroot4/setter.prom
 * - Does NOT mutate your saveBlock pipeline (non-invasive).
 */

const G: any = (globalThis as any);
G.__void_txroot_setter = G.__void_txroot_setter || {
  set_total: 0,
  mismatch_total: 0,
  errors_total: 0,
  last_set_block: -1,
  heartbeat_total: 0,
};

function recordTxrootSetterHeartbeatFailure(scope: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn("VOID_HOOKS_TXROOT_SETTER_HEARTBEAT_EMPTY_CATCH_VISIBILITY_FAILURE_VISIBLE", {
    scope,
    message,
  });
}

let __attached = false;

export function attachTxrootSetter(p: { app: any; store?: any; log?: (...a: any[]) => void }) {
  if (__attached) return; __attached = true;
  const app = p.app;
  const log = p.log || ((..._a:any[])=>{});

  // Heartbeat so Prom sees activity even before first seal
  const iv = setInterval(() => {
    try {
      G.__void_txroot_setter.heartbeat_total++;
    } catch (err) {
      recordTxrootSetterHeartbeatFailure("heartbeat-increment", err);
    }
  }, 2000);
  if (app?.on) app.on("close", () => clearInterval(iv));

  // Prom text endpoint
  app.get("/__void/metrics/txroot4/setter.prom", (_req: any, res: any) => {
    const m = G.__void_txroot_setter;
    const lines = [
      "# HELP void_txroot_header_set_total Header txRoot sets performed",
      "# TYPE void_txroot_header_set_total counter",
      `void_txroot_header_set_total ${Number(m.set_total||0)}`,
      "# HELP void_txroot_header_mismatch_total Header txRoot mismatches detected (pre-normalization)",
      "# TYPE void_txroot_header_mismatch_total counter",
      `void_txroot_header_mismatch_total ${Number(m.mismatch_total||0)}`,
      "# HELP void_txroot_header_errors_total Errors while setting txRoot",
      "# TYPE void_txroot_header_errors_total counter",
      `void_txroot_header_errors_total ${Number(m.errors_total||0)}`,
      "# HELP void_txroot_header_last_set_block Last block number where txRoot was set",
      "# TYPE void_txroot_header_last_set_block gauge",
      `void_txroot_header_last_set_block ${Number(m.last_set_block||-1)}`,
      "# HELP void_txroot_header_heartbeat_total Heartbeat to signal liveness of setter",
      "# TYPE void_txroot_header_heartbeat_total counter",
      `void_txroot_header_heartbeat_total ${Number(m.heartbeat_total||0)}`,
    ];
    res.type("text/plain").send(lines.join("\n") + "\n");
  });

  // Optional: if you want to later wire the actual header-set, just increment:
  //   G.__void_txroot_setter.set_total++;
  //   G.__void_txroot_setter.last_set_block = n;
  //   (and mismatch/errors similarly)
  log("[txroot_setter] attached (prom exporter only)");
}
