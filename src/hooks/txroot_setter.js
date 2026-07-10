"use strict";
/**
 * Minimal, safe txroot setter/exporter hook.
 * - Single export (no duplicates).
 * - Idempotent attach (won't re-register).
 * - Exposes Prom text at /__void/metrics/txroot4/setter.prom
 * - Does NOT mutate your saveBlock pipeline (non-invasive).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachTxrootSetter = attachTxrootSetter;
var G = globalThis;
G.__void_txroot_setter = G.__void_txroot_setter || {
    set_total: 0,
    mismatch_total: 0,
    errors_total: 0,
    last_set_block: -1,
    heartbeat_total: 0,
};
var __attached = false;
function attachTxrootSetter(p) {
    if (__attached)
        return;
    __attached = true;
    var app = p.app;
    var log = p.log || (function () {
        var _a = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            _a[_i] = arguments[_i];
        }
    });
    // Heartbeat so Prom sees activity even before first seal
    var iv = setInterval(function () { try {
        G.__void_txroot_setter.heartbeat_total++;
    }
    catch (_b) { if(!globalThis.__void_txroot_setter_heartbeat_error_seen){globalThis.__void_txroot_setter_heartbeat_error_seen=true;console.warn("VOID_TXROOT_SETTER_HEARTBEAT_VISIBLE",_b&&_b.message?_b.message:_b);} } }, 2000);
    if (app === null || app === void 0 ? void 0 : app.on)
        app.on("close", function () { return clearInterval(iv); });
    // Prom text endpoint
    app.get("/__void/metrics/txroot4/setter.prom", function (_req, res) {
        var m = G.__void_txroot_setter;
        var lines = [
            "# HELP void_txroot_header_set_total Header txRoot sets performed",
            "# TYPE void_txroot_header_set_total counter",
            "void_txroot_header_set_total ".concat(Number(m.set_total || 0)),
            "# HELP void_txroot_header_mismatch_total Header txRoot mismatches detected (pre-normalization)",
            "# TYPE void_txroot_header_mismatch_total counter",
            "void_txroot_header_mismatch_total ".concat(Number(m.mismatch_total || 0)),
            "# HELP void_txroot_header_errors_total Errors while setting txRoot",
            "# TYPE void_txroot_header_errors_total counter",
            "void_txroot_header_errors_total ".concat(Number(m.errors_total || 0)),
            "# HELP void_txroot_header_last_set_block Last block number where txRoot was set",
            "# TYPE void_txroot_header_last_set_block gauge",
            "void_txroot_header_last_set_block ".concat(Number(m.last_set_block || -1)),
            "# HELP void_txroot_header_heartbeat_total Heartbeat to signal liveness of setter",
            "# TYPE void_txroot_header_heartbeat_total counter",
            "void_txroot_header_heartbeat_total ".concat(Number(m.heartbeat_total || 0)),
        ];
        res.type("text/plain").send(lines.join("\n") + "\n");
    });
    // Optional: if you want to later wire the actual header-set, just increment:
    //   G.__void_txroot_setter.set_total++;
    //   G.__void_txroot_setter.last_set_block = n;
    //   (and mismatch/errors similarly)
    log("[txroot_setter] attached (prom exporter only)");
}
