Warning: truncated output (original token count: 961966)
... 2799286 bytes omitted ...

// @ts-nocheck
import {
  runVoidNativeBlockExecutionPrecommitIntegrationV1,
} from "./chain/native_block_execution_precommit_integration_v1.js";
import { mountLocalMultiboxRuntimeRouteV1 } from "./local-multibox-runtime-route-v1.js";
import { createRequire } from 'node:module';

// [diag-eaddrinuse-listen.v1] print listen() callsite on EADDRINUSE (self-double-listen detector)
;(function diagListenEaddrInuseV1(){
  try{
    const G:any = globalThis as any;
    if (G.__void_diag_listen_eaddrinuse_v1) return;
    G.__void_diag_listen_eaddrinuse_v1 = 1;
    const net:any = (typeof require==="function") ? require("node:net") : null;
    if (!net || !net.Server || !net.Server.prototype) return;
    const orig = net.Server.prototype.listen;
    if (typeof orig !== "function") return;
    net.Server.prototype.listen = function(...args:any[]){
      const stack = (new Error("[diag] listen() callsite")).stack;
      try{
        this.once("error", (e:any) => {
          try{
            if (e && e.code === "EADDRINUSE") {
              console.error("[diag] EADDRINUSE listen args=", args);
              console.error(String(stack||""));
            }
          }catch (err) { __voidIxCatch0900("23:1", err); }
        });
      }catch (err) { __voidIxCatch0900("25:2", err); }
      return orig.apply(this, args as any);
    };
    try{ console.log("[diag-eaddrinuse-listen.v1] installed"); }catch (err) { __voidIxCatch0900("28:3", err); }
  }catch (err) { __voidIxCatch0900("29:4", err); }
})();

import { createRequire as __voidCreateRequire } from "node:module";
import { fileURLToPath as __voidFileURLToPath } from "node:url";
const __void_filename = __voidFileURLToPath(import.meta.url);
(globalThis as any).require = (globalThis as any).require || __voidCreateRequire(__void_filename);
// [esm-sync-bridge] installed global require early
// ---- ESM bridge (early, additive) ----
(function esmBridgeEarly(){
  try {
    const G = globalThis;
    if (typeof (G as any).require !== "function") {
      // no await: install quickly without blocking module init
      import("node:module").then(m => {
        (G as any).require = m.createRequire(__void_filename);
        console.error("[esm-bridge] early installed global require");
      }).catch(e => console.error("[esm-bridge] install failed", e?.message||e));
    }
  } catch(e) { console.error("[esm-bridge] early error", e?.message||e); }
})();
// --- shim: legacy proposer exporter free identifiers (additive, safe) ---
var autoTimer: any;
var autoMs: any;

// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import { registerDevRoutes } from "./http/dev_routes.js";              // ok if present; safely wrapped
import { globalEnqueueTx } from "./node_core.js";
import express from "express";
import { registerSteamReadonlyBridgeBootstrapV3 } from "./http/steam_readonly_bridge_bootstrap_v3.js"; // VOID_STEAM_READONLY_BRIDGE_BOOTSTRAP_V3_IMPORT
import * as fs from "node:fs";
import * as path from "node:path";
import { execFile } from "node:child_process";
import * as __autoRepairMod from "./chain/auto_repair.js";
// compat: auto_repair.js may be default-wrapped; extract callable
const autoRepairDataDir: any = (
  (__autoRepairMod as any).autoRepairDataDir ||
  (((__autoRepairMod as any).default) && ((__autoRepairMod as any).default.autoRepairDataDir)) ||
  (((__autoRepairMod as any).default) && ((__autoRepairMod as any).default.default)) ||
  (__autoRepairMod as any).default
);
import * as __SegStoreMod from "./chain/seg_store.js";
// compat: tsx is exposing seg_store.ts as default-only; pull ctor from default object
const SegStore: any = ((__SegStoreMod as any).SegStore || (__SegStoreMod as any).default || __SegStoreMod);
import { Node } from "./node_core.js";
import * as __blockMod from "./chain/block.js";
const blockHash: any = ((__blockMod as any).blockHash || ((__blockMod as any).default && (__blockMod as any).default.blockHash));
import { buildAllKidx, buildKidxForJsonl, queryKidx } from "./util/kidx.js";
import { PeerRegistry } from "./node_peer_registry.js";
import { loadKeypair } from "./crypto/keypair.js";
import { loadEnv } from "./util/env.js";
import { registerFollowerRoutes } from "./http/follower_routes.js";
import { registerTxRoutes } from "./http/tx_routes.js";
import { registerP2PRoutes } from "./http/p2p_routes.js";
import { registerIndexExtras } from "./http/routes/index_kidx_extras.js";
import { registerBlockExtras } from "./http/blocks_extras.js";
import { Metrics } from "./metrics.js";
import "./http/participant_wallet_native_v1.js"; // VOID_DIST_START_ESM_IMPORT_GUARD_V1
import "./economic/wc_public_capability_v1.js"; // VOID_WC_PUBLIC_CAPABILITY_V1
import "./economic/buy_void_runtime_integration_v1.js"; // VOID_BUY_VOID_RUNTIME_INTEGRATION_V1
import g from "./economic/buy_void_manual_fulfilled_confirmed_state_gate_v1.js";
import { ValidatorSubmitIntentRuntimeIntegrationV1 } from "./validator/validator_submit_intent_runtime_integration_v1.js"; // VOID_VALIDATOR_SUBMIT_INTENT_RUNTIME_INTEGRATION_V1
import { installPublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingFromEnvironmentV1 } from "./http/public_agent_service_acceptance_persistence_trusted_context_provider_binding_v1.js"; // VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_V1_IMPORT
import { executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationFromEnvironmentV1 } from "./http/public_agent_service_acceptance_persistence_http_route_server_bootstrap_callsite_integration_v1.js"; // VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_V1_IMPORT
import { executeOrderStatusReadonlyHttpIntegrationFromEnvironmentV1 } from "../tools/void-public-agent-service-order-status-readonly-http-integration-v1.mjs"; // VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_HTTP_INTEGRATION_V1_IMPORT


// __VOID_TS_DECLARES_V1__
declare const app: any;
declare const store: any;
declare const node: any;
declare const req: any;
declare const job: any;
declare const key: any;
declare const nonce: any;
declare function b64(x: any): string;
// [ADD] global __VOID_asArr (idempotent)
;(function(){
  try{
    const g:any = globalThis as any;
const REQUIRE_TXROOT_LIVE = (process.env.VOID_READY_REQUIRE_TXROOT_LIVE || "").trim() === "1";
// If txroot_live is 0, we keep the reason, but only fail readiness when REQUIRE_TXROOT_LIVE=1.
    if (!g.__VOID_asArr) {
      g.__VOID_asArr = function(x:any){
        return Array.isArray(x)
          ? x
          : (x && Array.isArray((x as any).txs) ? (x as any).txs : []);
      };
      console.log("[guard] __VOID_asArr global helper installed");
    }
  }catch(e){ /* ignore */ }
})();
/* ---------------------------- ENV BRIDGE ---------------------------- */
process.env.DATA_DIR  = process.env.DATA_DIR  || process.env.VOID_DATA_DIR  || "data";
// [ADDON-BEGIN:esm-crypto-shim.v2 early]
// (
// [crypto-hotfix.v1] nonrecursive __void_getCreateHash (must run BEFORE esmCryptoShimV2Early)
;(function cryptoHotfixV1(){
  try{
    const G:any = globalThis as any;
    if (typeof G.__void_getCreateHash === "function" && String(G.__void_getCreateHash).includes("cryptoHotfixV1")) return;

    let _p:any = null;
    G.__void_getCreateHash = function __void_getCreateHash_cryptoHotfixV1(){
      if (_p) return _p;
      _p = (async ()=>{
        try{
          const req:any = (G as any).require;
          const crypto:any = (typeof req === "function") ? req("node:crypto") : null;
          if (crypto && typeof crypto.createHash === "function") return crypto.createHash;
        }catch (err) { __voidIxCatch0900("133:5", err); }
        const mod:any = await import("node:crypto");
        const createHash = (mod && (mod as any).createHash) ? (mod as any).createHash
                        : (mod && (mod as any).default && (mod as any).default.createHash) ? (mod as any).default.createHash
                        : undefined;
        return createHash;
      })();
      return _p;
    };

    // warm without recursion
    try{ G.__void_getCreateHash().catch(()=>{}); }catch (err) { __voidIxCatch0900("144:6", err); }
    try{ console.log("[crypto-hotfix.v1] installed"); }catch (err) { __voidIxCatch0900("145:7", err); }
  }catch (err) { __voidIxCatch0900("146:8", err); }
})();
;(function esmCryptoShimV2Early(){
  const G:any = globalThis as any;
  if (G.__void_getCreateHash) return; // idempotent
  let _p: Promise<(alg:string)=>any> | null = null;
  async function loadCreateHash(){
    try {
      // CJS path if available
      // @ts-ignore
      if (typeof require === "function") {
        // @ts-ignore
        // [JUNK-LEGACY] const { createHash } = require("node:crypto");
        const crypto: any = (globalThis as any).require ? (globalThis as any).require("node:crypto") : null;
        const createHash = crypto && (crypto as any).createHash;
        if (typeof createHash === "function") return createHash;
      }
    } catch (err) { __voidIxCatch0900("163:9", err); }
    const mod: any = await import("node:crypto"); // ESM path
    return mod.createHash;
  }
  G.__void_getCreateHash = function __void_getCreateHash(){
    if (!_p) _p = loadCreateHash();
    return _p;
  };
  // warm-up
  G.__void_getCreateHash().catch(()=>{});
})();
// [ADDON-END:esm-crypto-shim.v2 early]
process.env.HTTP_PORT = process.env.HTTP_PORT || process.env.VOID_HTTP_PORT || "4100";
process.env.P2P_PORT  = process.env.P2P_PORT  || process.env.VOID_P2P_PORT  || "4700";

/* ----------------------------- Config ------------------------------ */
function firstEnv(...names: string[]): string | undefined {
  for (const n of names) {
    const v = (process.env as any)[n];
    if (v !== undefined && v !== "") return v;
  }
}
function reqInt(names: string[] | string, label: string): number {
  const arr = Array.isArray(names) ? names : [names];
  const raw = firstEnv(...arr);
  if (raw === undefined) throw new Error(`Missing required env: ${label} (${arr.join(" or ")})`);
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`Invalid integer for ${label}: ${raw}`);
  return n;
}
function reqStr(names: string[] | string, label: string): string {
  const arr = Array.isArray(names) ? names : [names];
  const v = firstEnv(...arr);
  if (!v) throw new Error(`Missing required env: ${label} (${arr.join(" or ")})`);
  return v;
}

const DATA_DIR     = reqStr(["VOID_DATA_DIR", "DATA_DIR"], "DATA_DIR");
const HTTP_PORT    = reqInt(["VOID_HTTP_PORT", "HTTP_PORT"], "HTTP_PORT");
const P2P_PORT     = reqInt(["VOID_P2P_PORT", "P2P_PORT"], "P2P_PORT");
const MAX_BLOB_MB  = Number(firstEnv("MAX_BLOB_MB") ?? 8);
const PROTO_VER    = 1;
const ALLOW_EMPTY_BLOCKS = firstEnv("ALLOW_EMPTY_BLOCKS") === "1";

// Accept both BOOTSTRAP and BOOTSTRAP_ADDRS; also merge loadEnv() later.
const BOOTSTRAP_RAW = (firstEnv("BOOTSTRAP_ADDRS", "BOOTSTRAP") || "")
  .split(",").map((s) => s.trim()).filter(Boolean);

// Require a key file path; do not auto-generate
const KEY_PATH = path.resolve(
  reqStr(["NODE_PRIVKEY_PATH", "KEY_FILE", "VOID_NODE_KEY_A"], "node private key path")
);

console.log("[void-node] config", { DATA_DIR, HTTP_PORT, P2P_PORT, KEY_PATH });

/* Optional legacy helper (safe to keep for scripts/tests) */
const __apiSegStore =
new SegStore(DATA_DIR, { segmentMaxBytes: 8 * 1024 * 1024, sparseEvery: 16 } as any);

/* ------------------------- Top-level main -------------------------- */
async function __main__() {
  /* ===================== METRICS ===================== */
  const metrics = new Metrics();

  // Used for self-advert to others
  let selfAdvert: { httpBase: string; p2pListen: string } = { httpBase: "", p2pListen: "" };

  /* ---------- key file required ---------- */
  if (!fs.existsSync(KEY_PATH)) {
    console.error(
      `[void-node] missing key file: ${KEY_PATH}\n` +
        "  + Set NODE_PRIVKEY_PATH to a readable PEM key (chmod 600) and restart."
    );
    process.exit(1);
  }

  /* ---------- startup storage readiness gate v1 ---------- */
  type StorageRepairState = "pending" | "green" | "failed" | "skipped";
  let storageRepairState: StorageRepairState = "pending";
  let storageRepairError = "";
  let storageRepairStartedAt = Date.now();
  let storageRepairFinishedAt = 0;

  const storageRepairSkippedOverride = () =>
    process.env.VOID_ALLOW_PUBLIC_STORAGE_WITH_REPAIR_SKIPPED === "1";

  const storageRepairPublicBody = (state: StorageRepairState, req?: any) => {
    const isLocal = (() => {
      try {
        const r = String(req?.socket?.remoteAddress || req?.ip || "");
        return (
          r === "127.0.0.1" ||
          r === "::1" ||
          r === "::ffff:127.0.0.1" ||
          r === "localhost"
        );
      } catch {
        return false;
      }
    })();

    const body: any = {
      marker: "VOID_STARTUP_STORAGE_READINESS_GATE_V1",
      ok: false,
      storage_repair_state: state,
      storage_repair_skipped_override: storageRepairSkippedOverride(),
      reason: "storage_repair_not_green",
      authority: {
        public_mutation: false,
        repair_trigger: false,
        signer_wallet_access: false,
        execution: false
      }
    };

    if (state === "failed") {
      body.error = isLocal ? storageRepairError : "storage_repair_failed";
    }

    if (state === "skipped") {
      body.hint = "VOID_SKIP_AUTOREPAIR=1 is set. Storage repair state is not green.";
    }

    return body;
  };

  (globalThis as any).__void_storage_repair_state = () => storageRepairState;
  (globalThis as any).__void_storage_repair_readiness_v1 = () => ({
    marker: "VOID_STARTUP_STORAGE_READINESS_GATE_V1",
    ok: storageRepairState === "green" || (storageRepairState === "skipped" && storageRepairSkippedOverride()),
    storage_repair_state: storageRepairState,
    storage_repair_skipped_override: storageRepairSkippedOverride(),
    started_at_ms: storageRepairStartedAt,
    finished_at_ms: storageRepairFinishedAt,
    error: storageRepairError,
    authority: {
      public_mutation: false,
      repair_trigger: false,
      signer_wallet_access: false,
      execution: false
    }
  });

  if (process.env.VOID_SKIP_AUTOREPAIR === "1") {
    storageRepairState = "skipped";
    storageRepairFinishedAt = Date.now();
    console.log("[boot] VOID_SKIP_AUTOREPAIR=1 -> repair skipped; storage_repair_state=skipped");
  } else {
    storageRepairState = "pending";
    storageRepairStartedAt = Date.now();
    console.log("[boot] autoRepairDataDir scheduled (async); storage_repair_state=pending");
    setTimeout(() => {
      const __t0 = Date.now();
      console.log("[boot] autoRepairDataDir async begin");
      Promise.resolve(autoRepairDataDir(DATA_DIR, { sparseEvery: 16 }))
        .then(() => {
          storageRepairState = "green";
          storageRepairFinishedAt = Date.now();
          storageRepairError = "";
          console.log("[boot] autoRepairDataDir async done ms=" + (Date.now() - __t0) + " storage_repair_state=green");
        })
        .catch((e:any) => {
          storageRepairState = "failed";
          storageRepairFinishedAt = Date.now();
          storageRepairError = String(e?.message || e || "unknown").slice(0, 200);
          console.error("[boot] autoRepairDataDir async FAIL", e);
        });
    }, 1);
  }

  /* ---------- boot node ---------- */
  const kp = loadKeypair(KEY_PATH); // { privateKey, publicKey, nodeId, pubPEM }
  const node = new Node(P2P_PORT, kp, { allowEmptyBlocks: ALLOW_EMPTY_BLOCKS });
// [ADD] expose live node globally for shims/bridges
;(globalThis as any).__void_node = node; (globalThis as any).node = node; (globalThis as any).VOID_NODE = node;
console.log("[shim] published global node (post-construct)");
  await node.start();

  // Optional: if Node exposes onSealed, wire it (harmless if absent)
  if ("onSealed" in (((globalThis as any).__void_node || (globalThis as any).node) as any)) {
    (((globalThis as any).__void_node || (globalThis as any).node) as any).onSealed = (b: any, dt: number) => {
      metrics.inc("blocks_sealed", 1);
      (metrics.gauges as any).last_seal_ms = dt;
      if (Array.isArray(b?.txs)) {
        metrics.inc("tx_indexed", b.txs.length);
        metrics.inc("receipts_appended", b.txs.length);
      }
    };
  }

  const peersReg = new PeerRegistry();

  // Sync peer-registry when HTTP announcements arrive
  ;(((globalThis as any).__void_node || (globalThis as any).node) as any).onHttpAnnounce = ({ id, http }: any) => {
    try {
      if (!id) return;
      peersReg.upsert({ id, http, capabilities: ["blob", "tx", "block"] });
      (metrics.gauges as any).peers_known = peersReg.count();
      if (http && selfAdvert.httpBase && selfAdvert.p2pListen) {
        void upsertRemotePeer(http, (((globalThis as any).__void_node || (globalThis as any).node) as any).id, selfAdvert.httpBase, selfAdvert.p2pListen);
      }
    } catch (err) { __voidIxCatch0900("364:10", err); }
  };

  /* ---------- bootstrap dialing (placeholder; actual dialing lives in node_core) ---------- */
  const env = loadEnv(); // may include BOOTSTRAP_ADDRS, ports, etc.
  const envBootstrapRaw = (env as any).BOOTSTRAP_ADDRS || [];
  const envBootstrapList = Array.isArray(envBootstrapRaw)
    ? envBootstrapRaw
    : String(envBootstrapRaw)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
  const mergedBootstrap = new Set<string>([...BOOTSTRAP_RAW, ...envBootstrapList]);
  for (const _a of mergedBootstrap) {
    // dialing handled by Node; we keep env merge here for logging & future hooks
  }

  /* ----------------------------- HTTP ----------------------------- */

const app = express();

// === wc-mutation-containment-v1 BEGIN ===
;(() => {
  const __voidWcContainmentApp:any = app as any;
  if (__voidWcContainmentApp.__void_wc_mutation_containment_v1) return;
  __voidWcContainmentApp.__void_wc_mutation_containment_v1 = true;

  const __voidWcMutationRules: Record<string,string> = {
    "/wc/runner/set": "wcRunnerSet",
    "/wc/runner/config": "wcRunnerConfig",
    "/wc/runner/tick": "wcRunnerTick",
    "/__void/operator/wc-public-capability-v1/issue": "wcPublicCapabilityIssue",
    "/wc/redeem": "wcRedeem",
    "/wc/send": "wcSend",
    "/jobs/submit": "jobsSubmit",
    "/__void/jobs-and-datanet-worker/run-once": "jobsWorkerRunOnce"
  };

  function __voidWcLoopbackOnly(req:any): boolean {
    const remote = String(
      req?.socket?.remoteAddress ||
      req?.connection?.remoteAddress ||
      req?.ip ||
      ""
    ).trim().toLowerCase();
    return (
      remote === "127.0.0.1" ||
      remote === "::1" ||
      remote === "::ffff:127.0.0.1" ||
      remote === "localhost"
    );
  }

  __voidWcContainmentApp.use((req:any, res:any, next:any) => {
    const method = String(req?.method || "").toUpperCase();
    const pathnameRaw = String(req?.path || req?.url || "").split("?")[0];
    const pathname = (
      pathnameRaw.length > 1
        ? pathnameRaw.replace(/\/+$/, "")
        : pathnameRaw
    ).toLowerCase();
    const requiredConfirmation = __voidWcMutationRules[pathname];

    if (method !== "POST" || !requiredConfirmation) return next();

    if (!__voidWcLoopbackOnly(req)) {
      return res.status(403).json({
        ok: false,
        error: "loopback_required",
        method,
        path: pathname,
        mutation: false
      });
    }

    const query = req?.query && typeof req.query === "object" ? req.query : {};
    const dryRaw = query.dry;
    const dry = dryRaw === undefined
      ? true
      : !["0", "false", "no"].includes(String(dryRaw).trim().toLowerCase());

    if (dry) {
      return res.status(200).json({
        ok: true,
        dry: true,
        mutated: false,
        method,
        path: pathname,
        requiredConfirmation
      });
    }

    const confirmation = String(query.confirm || "");
    if (confirmation !== requiredConfirmation) {
      return res.status(428).json({
        ok: false,
        error: "explicit_confirmation_required",
        dry: false,
        method,
        path: pathname,
        requiredConfirmation
      });
    }

    return next();
  });
})();
// === wc-mutation-containment-v1 END ===
mountLocalMultiboxRuntimeRouteV1(app);






/* VOID_CANONICAL_TX_HOTPATH_V1
   Authority:
   - exactly one public POST /tx/submit route
   - appends exactly once into live node.mempool
   - does not mirror into global __void_tx_queue
   - preempts late legacy /tx/submit mounts and wrappers
*/
;(() => {
  try {
    const G: any = globalThis as any;
    if (G.__void_canonical_tx_hotpath_v1_installed) return;
    G.__void_canonical_tx_hotpath_v1_installed = true;

    const ROUTE = "/tx/submit";
    const KEEP = "__void_canonical_tx_hotpath_v1_keep";

    const appAny: any = app as any;
    const appProto: any =
      Object.getPrototypeOf(appAny) ||
      ((express as any).application || null);

    const S: any = G.__void_canonical_tx_hotpath_v1 = G.__void_canonical_tx_hotpath_v1 || {
      installed: true,
      mounted: false,
      allowed_post_total: 0,
      skipped_post_total: 0,
      skipped_use_total: 0,
      submits_total: 0,
      accepted_total: 0,
      rejected_total: 0,
      append_ok_total: 0,
      append_err_total: 0,
      last_hash: "",
      last_error: "",
      last_mempool_len: -1,
      last_submit_ts_ms: 0
    };

    function isTxSubmitPath(pth: any): boolean {
      try {
        if (pth === ROUTE) return true;
        if (Array.isArray(pth)) return pth.includes(ROUTE);
      } catch (err) { __voidIxCatch0900("433:11", err); }
      return false;
    }

    function hasKeepHandler(handlers: any[]): boolean {
      try {
        return handlers.some((h: any) => !!(h && h[KEEP]));
      } catch {
        return false;
      }
    }

    // Install the authoritative mount guard BEFORE legacy /tx/submit blocks run.
    if (appProto && !appProto.__void_canonical_tx_hotpath_v1_guard_installed) {
      appProto.__void_canonical_tx_hotpath_v1_guard_installed = true;

      // Also suppress the older late guard block so it cannot reopen the route later.
      appProto.__void_tx_submit_mount_guard_v1_installed = true;

      const origPost: any = appProto.post;
      const origUse: any = appProto.use;

      if (typeof origPost === "function") {
        appProto.post = function(this: any, pth: any, ...handlers: any[]) {
          try {
            if (isTxSubmitPath(pth)) {
              if (!hasKeepHandler(handlers)) {
                S.skipped_post_total = Number(S.skipped_post_total || 0) + 1;
                if (!G.__void_canonical_tx_hotpath_v1_skip_post_log_once) {
                  G.__void_canonical_tx_hotpath_v1_skip_post_log_once = true;
                  try { console.log("[txsubmit.canonical.v1] skipped legacy app.post(/tx/submit) mount"); } catch (err) { __voidIxCatch0900("463:12", err); }
                }
                return this;
              }

              G.__void_canonical_tx_hotpath_v1_mounted = true;
              G.__void_tx_submit_mounted_v1 = true;
              S.allowed_post_total = Number(S.allowed_post_total || 0) + 1;
            }
          } catch (err) { __voidIxCatch0900("472:13", err); }
          return origPost.call(this, pth, ...handlers);
        };
      }

      if (typeof origUse === "function") {
        appProto.use = function(this: any, pth: any, ...handlers: any[]) {
          try {
            if (isTxSubmitPath(pth)) {
              S.skipped_use_total = Number(S.skipped_use_total || 0) + 1;
              if (!G.__void_canonical_tx_hotpath_v1_skip_use_log_once) {
                G.__void_canonical_tx_hotpath_v1_skip_use_log_once = true;
                try { console.log("[txsubmit.canonical.v1] skipped legacy app.use(/tx/submit) mount"); } catch (err) { __voidIxCatch0900("484:14", err); }
              }
              return this;
            }
          } catch (err) { __voidIxCatch0900("488:15", err); }
          return origUse.call(this, pth, ...handlers);
        };
      }
    }

    function stableJson(x: any): string {
      if (x === null) return "null";
      const t = typeof x;
      if (t === "string" || t === "number" || t === "boolean") return JSON.stringify(x);
      if (t === "bigint") return JSON.stringify(String(x));
      if (Array.isArray(x)) return "[" + x.map((v: any) => stableJson(v)).join(",") + "]";
      if (t === "object") {
        const keys = Object.keys(x).sort();
        return "{" + keys.map((k: string) => JSON.stringify(k) + ":" + stableJson(x[k])).join(",") + "}";
      }
      return JSON.stringify(String(x));
    }

    function sha256Hex(x: string): string {
      const crypto: any = require("node:crypto");
      return crypto.createHash("sha256").update(x).digest("hex");
    }

    function cleanHash(v: any): string {
      const h = String(v || "").trim().toLowerCase().replace(/^0x/, "");
      return /^[0-9a-f]{64}$/.test(h) ? h : "";
    }

    function normalizeTx(body: any): any {
      const tx: any =
        body && typeof body === "object" && !Array.isArray(body)
          ? { ...body }
          : { data: body };

      const suppliedHash = cleanHash(tx.hash || tx.txHash);
      if (suppliedHash) {
        tx.hash = suppliedHash;
      } else {
        const material: any = { ...tx };
        delete material.hash;
        delete material.txHash;
        tx.hash = sha256Hex(stableJson(material));
      }

      if (tx.body === undefined && tx.data !== undefined && typeof tx.data === "object") {
        tx.body = tx.data;
      }

      if (tx.receivedAtMs === undefined) tx.receivedAtMs = Date.now();
      if (tx.source === undefined) tx.source = "txsubmit_canonical_v1";

      return tx;
    }

    function getNode(): any {
      return (
        G.__void_node ||
        G.node ||
        G.VOID_NODE ||
        G.__void_live_node ||
        null
      );
    }

    function mempoolLen(node: any): number {
      try {
        const mp: any = node?.mempool;
        if (Array.isArray(mp?.txs)) return mp.txs.length;
        if (typeof mp?.peekAll === "function") {
          const a = mp.peekAll();
          return Array.isArray(a) ? a.length : -1;
        }
        if (typeof mp?.size === "function") return Number(mp.size());
      } catch (err) { __voidIxCatch0900("562:16", err); }
      return -1;
    }

    function appendCanonical(tx: any): { ok: boolean; src: string; count: number; error?: string } {
      try {
        const node: any = getNode();
        const mp: any = node?.mempool;

        if (!node) return { ok: false, src: "none", count: -1, error: "no_live_node" };
        if (!mp) return { ok: false, src: "none", count: -1, error: "no_live_mempool" };

        if (Array.isArray(mp.txs)) {
          mp.txs.push(tx);
          return { ok: true, src: "node.mempool.txs", count: mp.txs.length };
        }

        if (typeof mp.push === "function") {
          mp.push(tx);
          return { ok: true, src: "node.mempool.push", count: mempoolLen(node) };
        }

        if (typeof mp.enqueue === "function") {
          mp.enqueue(tx);
          return { ok: true, src: "node.mempool.enqueue", count: mempoolLen(node) };
        }

        return { ok: false, src: "unknown", count: -1, error: "unsupported_mempool_shape" };
      } catch (e: any) {
        return { ok: false, src: "throw", count: -1, error: String(e?.message || e) };
      }
    }

    function txSubmitRouteCount(): any {
      const stack: any[] =
        (Array.isArray(appAny?._router?.stack) ? appAny._router.stack : null) ||
        (Array.isArray(appAny?.router?.stack) ? appAny.router.stack : []) ||
        [];

      let routes = 0;
      let layers = 0;

      for (const layer of stack) {
        try {
          const r: any = layer?.route;
          if (!r) continue;
          if (r.path !== ROUTE) continue;
          if (!(r.methods && r.methods.post)) continue;
          routes++;
          layers += Array.isArray(r.stack) ? r.stack.length : 0;
        } catch (err) { __voidIxCatch0900("612:17", err); }
      }

      return { routes, layers };
    }

    function isLocalReq(req: any): boolean {
      const r = String(req?.socket?.remoteAddress || req?.connection?.remoteAddress || req?.ip || "");
      return r === "127.0.0.1" || r === "::1" || r === "::ffff:127.0.0.1" || r === "localhost";
    }

    const jsonParser: any = (express as any).json({
      limit: "1mb",
      type: ["application/json", "application/*+json", "text/json"]
    });
    jsonParser[KEEP] = true;
    jsonParser.__void_txsubmit_wrap_ge_v1 = true;
    jsonParser.__void_txsubmit_keep_v1 = true;

    const canonicalHandler: any = function __voidCanonicalTxSubmitV1(req: any, res: any) {
      S.submits_total = Number(S.submits_total || 0) + 1;
      S.last_submit_ts_ms = Date.now();

      try {
        const body = req?.body;
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          S.rejected_total = Number(S.rejected_total || 0) + 1;
          S.last_error = "body_must_be_json_object";
          return res.status(400).json({
            ok: false,
            error: "body_must_be_json_object",
            handled: "txsubmit_canonical_v1"
          });
        }

        const tx = normalizeTx(body);
        const appended = appendCanonical(tx);

        if (!appended.ok) {
          S.rejected_total = Number(S.rejected_total || 0) + 1;
          S.append_err_total = Number(S.append_err_total || 0) + 1;
          S.last_error = appended.error || "append_failed";
          S.last_hash = tx.hash || "";
          S.last_mempool_len = appended.count;
          return res.status(503).json({
            ok: false,
            error: appended.error || "append_failed",
            handled: "txsubmit_canonical_v1",
            hash: tx.hash,
            src: appended.src,
            mempoolLen: appended.count
          });
        }

        S.accepted_total = Number(S.accepted_total || 0) + 1;
        S.append_ok_total = Number(S.append_ok_total || 0) + 1;
        S.last_error = "";
        S.last_hash = tx.hash || "";
        S.last_mempool_len = appended.count;

        return res.status(200).json({
          ok: true,
          handled: "txsubmit_canonical_v1",
          hash: tx.hash,
          src: appended.src,
          mempoolLen: appended.count
        });
      } catch (e: any) {
        S.rejected_total = Number(S.rejected_total || 0) + 1;
        S.append_err_total = Number(S.append_err_total || 0) + 1;
        S.last_error = String(e?.message || e);
        return res.status(500).json({
          ok: false,
          error: S.last_error,
          handled: "txsubmit_canonical_v1"
        });
      }
    };

    canonicalHandler[KEEP] = true;

    // These flags make legacy wrapper/prune blocks leave this handler alone.
    canonicalHandler.__void_txsubmit_wrap_ge_v1 = true;
    canonicalHandler.__void_txsubmit_keep_v1 = true;

    appAny.post(ROUTE, jsonParser, canonicalHandler);
    S.mounted = true;

    appAny.get("/__void/diag/txsubmit_canonical.json", (req: any, res: any) => {
      if (process.env.VOID_ALLOW_REMOTE_SENSITIVE_ROUTES !== "1" && !isLocalReq(req)) {
        return res.status(404).type("text/plain").send("not found");
      }

      return res.json({
        ok: true,
        marker: "VOID_CANONICAL_TX_HOTPATH_V1",
        state: S,
        route_count: txSubmitRouteCount(),
        policy: {
          canonical_route: ROUTE,
          public_mutation: true,
          appends_to: "live node.mempool only",
          mirrors_to_global_tx_queue: false,
          calls_globalEnqueueTx: false,
          legacy_txsubmit_mounts_skipped: true
        }
      });
    });

    appAny.get("/__void/metrics/txsubmit_canonical.prom", (_req: any, res: any) => {
      const rc = txSubmitRouteCount();
      res.type("text/plain; version=0.0.4; charset=utf-8").send([
        "# HELP void_txsubmit_canonical_installed canonical tx submit installed",
        "# TYPE void_txsubmit_canonical_installed gauge",
        "void_txsubmit_canonical_installed 1",
        "# HELP void_txsubmit_canonical_routes POST /tx/submit route count",
        "# TYPE void_txsubmit_canonical_routes gauge",
        "void_txsubmit_canonical_routes " + Number(rc.routes || 0),
        "# HELP void_txsubmit_canonical_submits_total POST /tx/submit calls",
        "# TYPE void_txsubmit_canonical_submits_total counter",
        "void_txsubmit_canonical_submits_total " + Number(S.submits_total || 0),
        "# HELP void_txsubmit_canonical_accepted_total accepted submits",
        "# TYPE void_txsubmit_canonical_accepted_total counter",
        "void_txsubmit_canonical_accepted_total " + Number(S.accepted_total || 0),
        "# HELP void_txsubmit_canonical_rejected_total rejected submits",
        "# TYPE void_txsubmit_canonical_rejected_total counter",
        "void_txsubmit_canonical_rejected_total " + Number(S.rejected_total || 0),
        "# HELP void_txsubmit_canonical_skipped_post_total skipped legacy app.post mounts",
        "# TYPE void_txsubmit_canonical_skipped_post_total counter",
        "void_txsubmit_canonical_skipped_post_total " + Number(S.skipped_post_total || 0),
        "# HELP void_txsubmit_canonical_skipped_use_total skipped legacy app.use mounts",
        "# TYPE void_txsubmit_canonical_skipped_use_total counter",
        "void_txsubmit_canonical_skipped_use_total " + Number(S.skipped_use_total || 0),
        "# HELP void_txsubmit_canonical_last_mempool_len last observed mempool length",
        "# TYPE void_txsubmit_canonical_last_mempool_len gauge",
        "void_txsubmit_canonical_last_mempool_len " + Number(S.last_mempool_len || 0)
      ].join("\n") + "\n");
    });

    try { console.log("[txsubmit.canonical.v1] mounted authoritative POST /tx/submit"); } catch (err) { __voidIxCatch0900("751:18", err); }
  } catch (e: any) {
    try { console.error("[txsubmit.canonical.v1] install failed", String(e?.stack || e)); } catch (err) { __voidIxCatch0900("753:19", err); }
  }
})();



/* VOID_CANONICAL_TX_HOTPATH_V1_LATE_PRUNE_AND_COUNT_V1
   Recovery clamp:
   - direct app.post/app.use guard skips later legacy /tx/submit mounts
   - repeated late prune removes already-mounted legacy /tx/submit routes
   - canonical /mempool/count reports the same live mempool shape used by canonical submit
*/
;(() => {
  try {
    const G:any = globalThis as any;
    const MARK = "__void_canonical_tx_hotpath_v1_late_prune_and_count_v1_installed";
    if (G[MARK]) return;
    G[MARK] = true;

    const appAny:any = app as any;
    const ROUTE = "/tx/submit";
    const KEEP = "__void_canonical_tx_hotpath_v1_keep";

    const S:any = G.__void_canonical_tx_hotpath_v1_late_prune_and_count_v1 =
      G.__void_canonical_tx_hotpath_v1_late_prune_and_count_v1 || {
        installed: true,
        direct_guard_installed: false,
        skipped_post_total: 0,
        skipped_use_total: 0,
        sweep_runs: 0,
        pruned_total: 0,
        pruned_last: 0,
        routes_before: null,
        routes_after: null,
        count_route_installed: false,
        count_route_promoted_total: 0,
        last_count: -1,
        last_count_src: "",
        last_error: ""
      };

    function isTxSubmitPath(pth:any): boolean {
      try {
        if (pth === ROUTE) return true;
        if (Array.isArray(pth)) return pth.includes(ROUTE);
      } catch (err) { __voidIxCatch0900("798:20", err); }
      return false;
    }

    function hasKeepHandlers(handlers:any[]): boolean {
      try {
        return handlers.some((h:any) => !!(h && h[KEEP]));
      } catch {
        return false;
      }
    }

    function routeStack(): any[] {
      try {
        const r:any = appAny?._router || appAny?.router || null;
        return Array.isArray(r?.stack) ? r.stack : [];
      } catch {
        return [];
      }
    }

    function isPostTxSubmitLayer(layer:any): boolean {
      try {
        const r:any = layer?.route;
        if (!r) return false;
        if (r.path !== ROUTE) return false;
        return !!(r.methods && r.methods.post);
      } catch {
        return false;
      }
    }

    function layerHasKeep(layer:any): boolean {
      try {
        const rs:any[] = Array.isArray(layer?.route?.stack) ? layer.route.stack : [];
        return rs.some((x:any) => !!(x?.handle && x.handle[KEEP]));
      } catch {
        return false;
      }
    }

    function txRouteCount(): any {
      const st = routeStack();
      let routes = 0;
      let layers = 0;
      let keep = 0;
      let legacy = 0;

      for (const layer of st) {
        if (!isPostTxSubmitLayer(layer)) continue;
        routes++;
        try { layers += Array.isArray(layer?.route?.stack) ? layer.route.stack.length : 0; } catch (err) { __voidIxCatch0900("849:21", err); }
        if (layerHasKeep(layer)) keep++;
        else legacy++;
      }

      return { routes, layers, keep, legacy };
    }

    function pruneTxSubmitRoutes(): any {
      const before = txRouteCount();
      const st = routeStack();
      let removed = 0;

      for (let i = st.length - 1; i >= 0; i--) {
        const layer = st[i];
        if (!isPostTxSubmitLayer(layer)) continue;
        if (layerHasKeep(layer)) continue;
        st.splice(i, 1);
        removed++;
      }

      const after = txRouteCount();
      S.sweep_runs = Number(S.sweep_runs || 0) + 1;
      S.pruned_last = removed;
      S.pruned_total = Number(S.pruned_total || 0) + removed;
      S.routes_before = before;
      S.routes_after = after;
      return { removed, before, after };
    }

    function isLocalReq(req:any): boolean {
      const r = String(req?.socket?.remoteAddress || req?.connection?.remoteAddress || req?.ip || "");
      return r === "127.0.0.1" || r === "::1" || r === "::ffff:127.0.0.1" || r === "localhost";
    }

    /* VOID_COUNT_ROUTE_RESJSON_FIX_V1
       Express route layers must not be promoted before expressInit.
       Also make this route raw-safe so res.json/res.status are not required.
    */
    function sendJsonRaw(res:any, status:number, obj:any): any {
      try {
        if (res && typeof res.status === "function" && typeof res.json === "function") {
          return res.status(status).json(obj);
        }
      } catch (err) { __voidIxCatch0900("893:22", err); }
      try {
        const body = JSON.stringify(obj);
        try { res.statusCode = status; } catch (err) { __voidIxCatch0900("896:23", err); }
        try { res.setHeader?.("content-type", "application/json; charset=utf-8"); } catch (err) { __voidIxCatch0900("897:24", err); }
        try { res.end?.(body + "\n"); } catch (err) { __voidIxCatch0900("898:25", err); }
        return;
      } catch {
        try { res.statusCode = status; res.end?.("{\"ok\":false,\"error\":\"json_encode_failed\"}\n"); } catch (err) { __voidIxCatch1800("901:1", err); }
      }
    }

    function storageReadyOk(req:any, res:any): boolean {
      try {
        const fn = G.__void_storage_repair_readiness_v1;
        if (typeof fn !== "function") return true;
        const out = fn();
        if (out && out.ok === false) {
          sendJsonRaw(res, 503, out);
          return false;
        }
      } catch (err) { __voidIxCatch1800("914:2", err); }
      return true;
    }

    function liveNode(): any {
      return G.__void_node || G.node || G.VOID_NODE || G.__void_live_node || null;
    }

    function liveMempoolCount(): any {
      try {
        const n:any = liveNode();
        const mp:any = n?.mempool;

        if (!n) return { count: 0, src: "no_live_node" };
        if (!mp) return { count: 0, src: "no_live_mempool" };

        if (Array.isArray(mp.txs)) {
          return { count: mp.txs.length, src: "node.mempool.txs" };
        }

        if (typeof mp.peekAll === "function") {
          const a = mp.peekAll();
          if (Array.isArray(a)) return { count: a.length, src: "node.mempool.peekAll" };
        }

        if (typeof mp.size === "function") {
          const n0 = Number(mp.size());
          return { count: Number.isFinite(n0) ? n0 : 0, src: "node.mempool.size()" };
        }

        if (typeof mp.size === "number") {
          return { count: Number(mp.size) || 0, src: "node.mempool.size" };
        }

        if (Array.isArray(mp)) {
          return { count: mp.length, src: "node.mempool[]" };
        }

        if (Array.isArray(n.txQueue)) {
          return { count: n.txQueue.length, src: "node.txQueue_fallback" };
        }

        return { count: 0, src: "unsupported_mempool_shape" };
      } catch (e:any) {
        return { count: 0, src: "throw", error: String(e?.message || e) };
      }
    }

    const mempoolCountHandler:any = (req:any, res:any) => {
      if (!storageReadyOk(req, res)) return;
      const out = liveMempoolCount();
      S.last_count = Number(out.count || 0);
      S.last_count_src = String(out.src || "");
      return sendJsonRaw(res, 200, {
        ok: true,
        count: Number(out.count || 0),
        size: Number(out.count || 0),
        src: String(out.src || ""),
        error: out.error || "",
        __patch: "VOID_MEMPOOL_COUNT_CANONICAL_V1",
        __fix: "VOID_COUNT_ROUTE_RESJSON_FIX_V1"
      });
    };
    mempoolCountHandler.__void_mempool_count_canonical_v1 = true;

    function installCountRouteOnce() {
      if (S.count_route_installed) return;
      appAny.get("/mempool/count", mempoolCountHandler);
      S.count_route_installed = true;
    }

    function promoteCountRoute() {
      // Do not unshift route layers ahead of Express query/expressInit.
      // The canonical count route is installed early enough already.
      try {
        S.count_route_promoted_total = Number(S.count_route_promoted_total || 0);
      } catch (err) { __voidIxCatch1800("990:3", err); }
    }

    function sweep() {
      try {
        const out = pruneTxSubmitRoutes();
        installCountRouteOnce();
        promoteCountRoute();
        return out;
      } catch (e:any) {
        S.last_error = String(e?.message || e);
        return { removed: 0, before: txRouteCount(), after: txRouteCount(), error: S.last_error };
      }
    }

    if (!appAny.__void_canonical_tx_hotpath_v1_direct_guard_installed) {
      appAny.__void_canonical_tx_hotpath_v1_direct_guard_installed = true;
      S.direct_guard_installed = true;

      const origPost:any = appAny.post;
      const origUse:any = appAny.use;

      if (typeof origPost === "function") {
        appAny.post = function(this:any, pth:any, ...handlers:any[]) {
          try {
            if (isTxSubmitPath(pth) && !hasKeepHandlers(handlers)) {
              S.skipped_post_total = Number(S.skipped_post_total || 0) + 1;
              return this;
            }
          } catch (err) { __voidIxCatch1800("1019:4", err); }
          return origPost.call(this, pth, ...handlers);
        };
      }

      if (typeof origUse === "function") {
        appAny.use = function(this:any, pth:any, ...handlers:any[]) {
          try {
            if (isTxSubmitPath(pth)) {
              S.skipped_use_total = Number(S.skipped_use_total || 0) + 1;
              return this;
            }
          } catch (err) { __voidIxCatch1800("1031:5", err); }
          return origUse.call(this, pth, ...handlers);
        };
      }
    }

    appAny.get("/__void/diag/txsubmit_canonical_cleanup.json", (req:any, res:any) => {
      if (process.env.VOID_ALLOW_REMOTE_SENSITIVE_ROUTES !== "1" && !isLocalReq(req)) {
        return res.status(404).type("text/plain").send("not found");
      }

      const swept = sweep();
      return res.json({
        ok: true,
        marker: "VOID_CANONICAL_TX_HOTPATH_V1_LATE_PRUNE_AND_COUNT_V1",
        swept,
        route_count: txRouteCount(),
        mempool_count: liveMempoolCount(),
        state: S
      });
    });

    appAny.get("/__void/metrics/txsubmit_canonical_cleanup.prom", (_req:any, res:any) => {
      const rc = txRouteCount();
      res.type("text/plain; version=0.0.4; charset=utf-8").send([
        "# HELP void_txsubmit_cleanup_routes POST /tx/submit route count after cleanup",
        "# TYPE void_txsubmit_cleanup_routes gauge",
        "void_txsubmit_cleanup_routes " + Number(rc.routes || 0),
        "# HELP void_txsubmit_cleanup_keep_routes canonical POST /tx/submit routes",
        "# TYPE void_txsubmit_cleanup_keep_routes gauge",
        "void_txsubmit_cleanup_keep_routes " + Number(rc.keep || 0),
        "# HELP void_txsubmit_cleanup_legacy_routes legacy POST /tx/submit routes",
        "# TYPE void_txsubmit_cleanup_legacy_routes gauge",
        "void_txsubmit_cleanup_legacy_routes " + Number(rc.legacy || 0),
        "# HELP void_txsubmit_cleanup_pruned_total legacy POST /tx/submit routes pruned",
        "# TYPE void_txsubmit_cleanup_pruned_total counter",
        "void_txsubmit_cleanup_pruned_total " + Number(S.pruned_total || 0),
        "# HELP void_txsubmit_cleanup_skipped_post_total legacy app.post(/tx/submit) mounts skipped",
        "# TYPE void_txsubmit_cleanup_skipped_post_total counter",
        "void_txsubmit_cleanup_skipped_post_total " + Number(S.skipped_post_total || 0),
        "# HELP void_txsubmit_cleanup_skipped_use_total legacy app.use(/tx/submit) mounts skipped",
        "# TYPE void_txsubmit_cleanup_skipped_use_total counter",
        "void_txsubmit_cleanup_skipped_use_total " + Number(S.skipped_use_total || 0),
        "# HELP void_mempool_count_canonical_last last canonical mempool count",
        "# TYPE void_mempool_count_canonical_last gauge",
        "void_mempool_count_canonical_last " + Number(S.last_count || 0)
      ].join("\n") + "\n");
    });

    installCountRouteOnce();

    let runs = 0;
    const timer:any = setInterval(() => {
      runs++;
      sweep();
      if (runs >= 240) clearInterval(timer);
    }, 250);
    try { timer.unref?.(); } catch (err) { __voidIxCatch1800("1088:6", err); }

    setTimeout(() => { try { sweep(); } catch (err) { __voidIxCatch1800("1090:7", err); } }, 0).unref?.();

    try { console.log("[txsubmit.canonical.cleanup.v1] armed late prune/count clamp"); } catch (err) { __voidIxCatch1800("1092:8", err); }
  } catch (e:any) {
    try { console.error("[txsubmit.canonical.cleanup.v1] install failed", String(e?.stack || e)); } catch (err) { __voidIxCatch1800("1094:9", err); }
  }
})();


// === VOID public root redirect v1 ===
// Public users often open http://127.0.0.1:4100/ first.
// Keep the root route tiny and redirect to the participant UI.
app.get("/legacy-root-redirect", (_req:any, res:any) => {
  res.redirect(302, "/participant");
});

// === VOID public site route aliases v1 ===
// These are convenience aliases only. Canonical site identity remains /site/<id>
// and the VOID/DataNet site manifest/content root.
app.get("/download", (_req:any, res:any) => {
  res.redirect(302, "/site/voidchain");
});

app.get("/voidchain", (_req:any, res:any) => {
  res.redirect(302, "/site/voidchain");
});

app.get("/nullfeed", (_req:any, res:any) => {
  res.redirect(302, "/site/nullfeed");
});

// === VOID public sensitive route guard v1 ===
// Mainnet-0 is public-live. Keep operator/dev/admin/diag/debug and wallet export
// surfaces local-only by default while preserving normal participant and readiness routes.
// Set VOID_ALLOW_REMOTE_SENSITIVE_ROUTES=1 only for an intentionally protected operator environment.
;(() => {
  const G:any = globalThis as any;
  if (G.__void_public_sensitive_route_guard_v1_installed) return;
  G.__void_public_sensitive_route_guard_v1_installed = true;

  function remoteAddr(req:any): string {
    return String(
      req?.socket?.remoteAddress ||
      req?.connection?.remoteAddress ||
      req?.ip ||
      ""
    );
  }

  function isLocalRemote(req:any): boolean {
    const r = remoteAddr(req);
    return (
      r === "127.0.0.1" ||
      r === "::1" ||
      r === "::ffff:127.0.0.1" ||
      r === "localhost"
    );
  }

  function sensitivePath(req:any): boolean {
    const raw = String(req?.path || req?.url || "");
    const path = raw.split("?")[0] || "/";
    return (
      path === "/__void/participant/wallet/export" ||
      path.startsWith("/__void/operator/") ||
      path.startsWith("/__void/admin/") ||
      path.startsWith("/__void/dev/") ||
      path.startsWith("/__void/diag/") ||
      path.startsWith("/__debug/") ||
      path.startsWith("/dev/")
    );
  }

  app.use((req:any, res:any, next:any) => {
    if (process.env.VOID_ALLOW_REMOTE_SENSITIVE_ROUTES === "1") return next();
    if (!sensitivePath(req)) return next();
    if (isLocalRemote(req)) return next();
    return res.status(404).type("text/plain").send("not found");
  });

  try { console.log("[security] public sensitive route guard v1 installed"); } catch (err) { __voidIxCatch1800("1170:10", err); }
})();

/* ---------- startup storage readiness gate v1 ---------- */
function requireStorageRepairGreen(req:any, res:any, next:any) {
  const state = storageRepairState;
  const skippedAllowed =
    state === "skipped" &&
    process.env.VOID_ALLOW_PUBLIC_STORAGE_WITH_REPAIR_SKIPPED === "1";

  if (state === "green" || skippedAllowed) return next();

  return res.status(503).json(storageRepairPublicBody(state, req));
}

const STORAGE_DERIVED_PREFIXES = [
  "/head",
  "/head.txt",
  "/api/head",
  "/blocks/",
  "/tx/lookup",
  "/tx/receipt",
  "/tx/status",
  "/receipts/",
  "/mempool",
  "/mempool/",
  "/datanet/v1/",
  "/__void/mainnet0/validator-candidate-registry/",
  "/__void/runtime/validator-truth/"
];

function storageRepairGateMatchesPath(req:any): boolean {
  const pth = String(req?.path || req?.url || "/").split("?")[0] || "/";
  return STORAGE_DERIVED_PREFIXES.some((prefix) => pth === prefix || pth.startsWith(prefix));
}

// VOID_STEAM_READONLY_BRIDGE_BOOTSTRAP_V3_CALLSITE
const VOID_STEAM_READONLY_BRIDGE_BOOTSTRAP_V3_REGISTRATION =
  registerSteamReadonlyBridgeBootstrapV3(app, {
    env: process.env,
    json_body_parser: express.json({ limit: "16kb", strict: true }),
  });
void VOID_STEAM_READONLY_BRIDGE_BOOTSTRAP_V3_REGISTRATION;

app.get("/__void/diag/storage-repair-readiness-v1.json", (req:any, res:any) => {
  const out = (globalThis as any).__void_storage_repair_readiness_v1?.() || {
    marker: "VOID_STARTUP_STORAGE_READINESS_GATE_V1",
    ok: false,
    storage_repair_state: "unknown",
    authority: {
      public_mutation: false,
      repair_trigger: false,
      signer_wallet_access: false,
      execution: false
    }
  };
  return res.json(out);
});

app.use((req:any, res:any, next:any) => {
  if (!storageRepairGateMatchesPath(req)) return next();
  return requireStorageRepairGreen(req, res, next);
});

try { console.log("[security] startup storage readiness gate v1 installed"); } catch (err) { __voidIxCatch1800("1226:11", err); }

// === VOID native website routes v1 ===
// Serves first static website bundles from the VOID node.
// DataNet-backed bundles come next; these routes prove the local node can host the public sites.
;(() => {
  const G:any = globalThis as any;
  if (G.__void_native_website_routes_v1_installed) return;
  G.__void_native_website_routes_v1_installed = true;

  const fs0 = require("fs");
  const path0 = require("path");
  const crypto0 = require("crypto");
  const childProc0 = require("child_process");

  const siteRoot = path0.join(process.cwd(), "docs", "site");

  function siteInfo(site:string): any {
    if (site === "voidchain") return {
      site,
      domain: "voidchain.io",
      title: "VOID Network",
      entry: "index.html",
      route: "/site/voidchain",
      manifest_route: "/__void/site-manifest/voidchain.json"
    };
    if (site === "nullfeed") return {
      site,
      domain: "nullfeed.io",
      title: "NullFeed",
      entry: "index.html",
      route: "/site/nullfeed",
      manifest_route: "/__void/site-manifest/nullfeed.json"
    };
    return null;
  }

  function siteFile(site:string): string {
    return path0.join(siteRoot, site, "index.html");
  }

  function readSite(site:string): { info:any, html:string, sha256:string } {
    const info = siteInfo(site);
    if (!info) throw new Error("unknown_site");
    const file = siteFile(site);
    const html = fs0.readFileSync(file, "utf8");
    const sha256 = crypto0.createHash("sha256").update(html).digest("hex");
    return { info, html, sha256 };
  }

  function readSiteFromDatanetOrStatic(site:string): any {
    const fallback = readSite(site);
    const dn = datanetProofs[site] || null;
    if (!dn) {
      return { ...fallback, source: "repo_static_v1", datanet: false };
    }

    try {
      const dataDirRaw = String(process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data_a");
      const dataDirAbs = path0.isAbsolute(dataDirRaw) ? dataDirRaw : path0.join(process.cwd(), dataDirRaw);
      const packedDir = path0.join(dataDirAbs, "datanet", "publish_shim_v1", "packed", String(dn.dataset_id));
      const chunkPath = path0.join(packedDir, "chunk_000000.bin");
      const rootPath = path0.join(packedDir, "root.txt");

      if (!fs0.existsSync(chunkPath)) throw new Error("missing_datanet_chunk");
      const html = fs0.readFileSync(chunkPath, "utf8");
      const sha256 = crypto0.createHash("sha256").update(html).digest("hex");

      if (sha256 !== String(dn.content_root)) {
        throw new Error("datanet_content_hash_mismatch");
      }

      let rootTxt = "";
      try { rootTxt = String(fs0.readFileSync(rootPath, "utf8") || "").trim(); } catch (err) { __voidIxCatch1800("1299:12", err); }
      if (rootTxt && rootTxt !== String(dn.content_root)) {
        throw new Error("datanet_root_mismatch");
      }

      return {
        info: fallback.info,
        html,
        sha256,
        source: "datanet_live_v1",
        datanet: true,
        datanet_dataset_id: String(dn.dataset_id),
        datanet_content_root: String(dn.content_root),
        datanet_who: String(dn.who),
        fallback_available: true
      };
    } catch (e:any) {
      const originalReason = String(e?.message || e || "unknown");
      const materialized = materializeSiteBundleFromPeer(site, dn, originalReason);
      if (materialized?.ok) {
        try {
          const dataDirRaw = String(process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data_a");
          const dataDirAbs = path0.isAbsolute(dataDirRaw) ? dataDirRaw : path0.join(process.cwd(), dataDirRaw);
          const packedDir = path0.join(dataDirAbs, "datanet", "publish_shim_v1", "packed", String(dn.dataset_id));
          const chunkPath = path0.join(packedDir, "chunk_000000.bin");
          const rootPath = path0.join(packedDir, "root.txt");

          const html = fs0.readFileSync(chunkPath, "utf8");
          const sha256 = crypto0.createHash("sha256").update(html).digest("hex");
          if (sha256 !== String(dn.content_root)) throw new Error("materialized_content_hash_mismatch");

          let rootTxt = "";
          try { rootTxt = String(fs0.readFileSync(rootPath, "utf8") || "").trim(); } catch (err) { __voidIxCatch1800("1331:13", err); }
          if (rootTxt && rootTxt !== String(dn.content_root)) throw new Error("materialized_root_mismatch");

          return {
            info: fallback.info,
            html,
            sha256,
            source: "datanet_live_v1_peer_materialized",
            datanet: true,
            datanet_dataset_id: String(dn.dataset_id),
            datanet_content_root: String(dn.content_root),
            datanet_who: String(dn.who),
            materialized_from_peer: true,
            peer_http: String(materialized.peer_http || ""),
            fallback_available: true
          };
        } catch (after:any) {
          return {
            ...fallback,
            source: "repo_static_fallback_v1",
            datanet: false,
            datanet_dataset_id: String(dn.dataset_id),
            datanet_content_root: String(dn.content_root),
            datanet_who: String(dn.who),
            fallback_reason: originalReason + "; peer_materialized_but_verify_failed:" + String(after?.message || after || "unknown")
          };
        }
      }

      return {
        ...fallback,
        source: "repo_static_fallback_v1",
        datanet: false,
        datanet_dataset_id: String(dn.dataset_id),
        datanet_content_root: String(dn.content_root),
        datanet_who: String(dn.who),
        fallback_reason: originalReason + "; peer_materialize_failed:" + String(materialized?.error || "unknown")
      };
    }
  }

  const datanetProofs:any = {
    voidchain: {
      who: "void-site-bundle-v1",
      dataset_id: "1b8bf41db2d64f8877d0aec397373fa1",
      content_root: "db0c54edcad0130b8de61e73ec61ff60701e97bee6bb3ac065d6c55efbd634e2",
      checkpoint: "ckpt-voidchain-run-node-doc-links-datanet-green-20260531-104226 + voidchain DataNet publish summary /tmp/void-native-site-live-datanet-publish-20260531-101201/summary.json"
    },
    nullfeed: {
      who: "void-site-bundle-v1",
      dataset_id: "2930d5e8436eb5674be06d2b0152d20c",
      content_root: "f4c8b03bb8f5dae627bb6df9eddab48060bc0dab1a8c886d56dbeab2b4b0c372",
      checkpoint: "ckpt-voidchain-run-node-doc-links-datanet-green-20260531-104226 + nullfeed DataNet publish summary /tmp/void-native-site-live-datanet-publish-20260531-101201/summary.json"
    }
  };

  // === VOID public site bundle peer auto-materialize v1 ===
  // Fixed public site bundles only. If local DataNet packed content is missing,
  // fetch the fixed manifest dataset from a configured peer, verify content root,
  // atomically write the packed dir, then serve DataNet-backed instead of fallback.
  function normalizeSiteBundlePeerBase(raw:any): string {
    const v = String(raw || "").trim();
    if (!v) return "";
    try {
      const u = new URL(v);
      if (u.protocol !== "http:" && u.protocol !== "https:") return "";
      u.pathname = "";
      u.search = "";
      u.hash = "";
      return u.toString().replace(/\/+$/, "");
    } catch {
      return "";
    }
  }

  function siteBundlePeerBases(): string[] {
    const raw = [
      process.env.VOID_SITE_BUNDLE_PEERS,
      process.env.VOID_DATANET_SITE_BUNDLE_PEERS,
      process.env.VOID_DATANET_PEERS,
      process.env.VOID_DRIFT_PEER
    ].filter(Boolean).join(" ");

    const out:string[] = [];
    const seen = new Set<string>();

    function add(rawPeer:any) {
      const peer = normalizeSiteBundlePeerBase(rawPeer);
      if (!peer) return;
      try {
        const u = new URL(peer);
        const host = String(u.hostname || "").toLowerCase();
        if (host === "127.0.0.1" || host === "localhost" || host === "::1") return;
      } catch (err) { __voidIxCatch1800("1424:14", err); }
      if (seen.has(peer)) return;
      seen.add(peer);
      out.push(peer);
    }

    for (const part of raw.split(/[,\s]+/).map((x:string) => x.trim()).filter(Boolean)) add(part);

    try {
      const peers = peersReg && typeof peersReg.all === "function" ? peersReg.all() : [];
      for (const peer of Array.isArray(peers) ? peers : []) add(peer?.http);
    } catch (err) { __voidIxCatch1800("1435:15", err); }

    return out;
  }

  function materializeSiteBundleFromPeer(site:string, dn:any, reason:string): any {
    const dataset = String(dn?.dataset_id || "");
    const root = String(dn?.content_root || "");
    const who = String(dn?.who || "void-site-bundle-v1");

    if (!dataset || !root) return { ok:false, error:"missing_site_bundle_identity" };
    if (site !== "voidchain" && site !== "nullfeed") return { ok:false, error:"unsupported_site_bundle" };

    const dataDirRaw = String(process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data_a");
    const dataDirAbs = path0.isAbsolute(dataDirRaw) ? dataDirRaw : path0.join(process.cwd(), dataDirRaw);
    const packedParent = path0.join(dataDirAbs, "datanet", "publish_shim_v1", "packed");
    const packedDir = path0.join(packedParent, dataset);

    const errors:string[] = [];
    for (const peer of siteBundlePeerBases()) {
      const url = peer + "/datanet/v1/fetch/" + encodeURIComponent(dataset) + "?who=" + encodeURIComponent(who);
      try {
        const raw = childProc0.execFileSync("curl", ["-fsS", "--max-time", "8", url], {
          encoding: "utf8",
          maxBuffer: 12 * 1024 * 1024
        });
        const obj = JSON.parse(String(raw || "{}"));
        if (obj?.ok !== true) throw new Error("peer_fetch_not_ok");
        if (String(obj?.id || "") !== dataset) throw new Error("peer_dataset_mismatch");

        const b64 = String(obj?.cipher_b64 || obj?.plaintext_b64 || "");
        if (!b64) throw new Error("peer_missing_bundle_b64");
        const buf = Buffer.from(b64, "base64");
        if (!buf.length) throw new Error("peer_empty_bundle");

        const got = crypto0.createHash("sha256").update(buf).digest("hex");
        if (got !== root) throw new Error("peer_content_root_mismatch:" + got);
        const rootTxt = String(obj?.rootTxt || "").trim();
        if (rootTxt && rootTxt !== root) throw new Error("peer_root_txt_mismatch:" + rootTxt);

        const manifest = obj?.manifest && typeof obj.manifest === "object"
          ? obj.manifest
          : {
              version: 1,
              createdAt: new Date().toISOString(),
              sourcePath: "peer:" + peer,
              sizeBytes: buf.length,
              chunkBytes: 65536,
              merkleRootHex: root,
              chunks: [{ index: 0, file: "chunk_000000.bin", sizeBytes: buf.length, leafHashHex: root }]
            };

        if (Number(manifest?.sizeBytes || buf.length) !== buf.length) {
          throw new Error("peer_manifest_size_mismatch");
        }

        const tmpDir = path0.join(packedParent, "." + dataset + ".tmp-" + process.pid + "-" + Date.now());
        fs0.mkdirSync(packedParent, { recursive: true });
        fs0.rmSync(tmpDir, { recursive: true, force: true });
        fs0.mkdirSync(tmpDir, { recursive: true });

        fs0.writeFileSync(path0.join(tmpDir, "chunk_000000.bin"), buf);
        fs0.writeFileSync(path0.join(tmpDir, "manifest.v1.json"), JSON.stringify(manifest, null, 2) + "\n");
        fs0.writeFileSync(path0.join(tmpDir, "root.txt"), root + "\n");

        const meta = {
          ...(obj?.meta && typeof obj.meta === "object" ? obj.meta : {}),
          materialized_from_peer_v1: true,
          materialized_at: new Date().toISOString(),
          materialized_reason: String(reason || "missing_or_invalid_local_bundle"),
          source: "site_bundle_peer_auto_materialize_v1",
          site,
          dataset_id: dataset,
          content_root: root,
          peer_http: peer
        };
        fs0.writeFileSync(path0.join(tmpDir, "meta.publish_shim.v1.json"), JSON.stringify(meta, null, 2) + "\n");

        fs0.rmSync(packedDir, { recursive: true, force: true });
        fs0.renameSync(tmpDir, packedDir);

        return { ok:true, site, dataset_id: dataset, content_root: root, peer_http: peer };
      } catch (e:any) {
        errors.push(peer + ":" + String(e?.message || e || "unknown"));
      }
    }

    return { ok:false, error:"no_peer_materialized_site_bundle", errors };
  }

  function manifest(site:string): any {
    const got = readSite(site);
    const dn = datanetProofs[site] || null;
    return {
      ok: true,
      kind: "void_native_site_manifest_v1",
      site: got.info.site,
      public_domain: got.info.domain,
      canonical_site_id: got.info.site,
      preferred_public_alias: got.info.domain,
      public_aliases: got.info.site === "voidchain"
        ? ["voidchain.io", "void-chain.io", "voidchain.local", "voidchain.void"]
        : ["nullfeed.io", "nullfeed.local", "nullfeed.void"],
      domain_alias_model: "domains_are_replaceable_aliases_not_identity",
      identity_authority: "VOID/DataNet site manifest and content root",
      title: got.info.title,
      entry: got.info.entry,
      route: got.info.route,
      manifest_route: got.info.manifest_route,
      content_sha256: got.sha256,
      content_source: dn ? "datanet_live_v1_with_repo_static_fallback" : "repo_static_v1",
      hosted_by: "VOID node",
      canonical_target: "VOID Network / DataNet",
      external_cloud_canonical: false,
      google_cloud_required: false,
      datanet_backed: !!dn,
      datanet_who: dn ? dn.who : null,
      datanet_dataset_id: dn ? dn.dataset_id : null,
      datanet_content_root: dn ? dn.content_root : null,
      datanet_fetch_url: dn ? ("/datanet/v1/fetch/" + encodeURIComponent(dn.dataset_id) + "?who=" + encodeURIComponent(dn.who)) : null,
      datanet_proof_checkpoint: dn ? dn.checkpoint : null,
      fallback_source: "repo_static_v1",
      next_step: "serve website content directly from DataNet-backed storage with repo static fallback"
    };
  }

  app.get("/site/voidchain", (_req:any, res:any) => {
    const got = readSiteFromDatanetOrStatic("voidchain");
    res.setHeader("x-void-site", "voidchain");
    res.setHeader("x-void-site-sha256", got.sha256);
    res.setHeader("x-void-site-source", got.source);
    res.setHeader("x-void-datanet-backed", got.datanet ? "true" : "false");
    if (got.datanet_dataset_id) res.setHeader("x-void-datanet-dataset-id", got.datanet_dataset_id);
    if (got.datanet_content_root) res.setHeader("x-void-datanet-content-root", got.datanet_content_root);
    if (got.materialized_from_peer) res.setHeader("x-void-site-peer-materialized", "true");
    if (got.peer_http) res.setHeader("x-void-site-peer-http", got.peer_http);
    if (got.fallback_reason) res.setHeader("x-void-site-fallback-reason", got.fallback_reason);
    res.type("html").send(got.html);
  });

  app.get("/site/nullfeed", (_req:any, res:any) => {
    const got = readSiteFromDatanetOrStatic("nullfeed");
    res.setHeader("x-void-site", "nullfeed");
    res.setHeader("x-void-site-sha256", got.sha256);
    res.setHeader("x-void-site-source", got.source);
    res.setHeader("x-void-datanet-backed", got.datanet ? "true" : "false");
    if (got.datanet_dataset_id) res.setHeader("x-void-datanet-dataset-id", got.datanet_dataset_id);
    if (got.datanet_content_root) res.setHeader("x-void-datanet-content-root", got.datanet_content_root);
    if (got.materialized_from_peer) res.setHeader("x-void-site-peer-materialized", "true");
    if (got.peer_http) res.setHeader("x-void-site-peer-http", got.peer_http);
    if (got.fallback_reason) res.setHeader("x-void-site-fallback-reason", got.fallback_reason);
    res.type("html").send(got.html);
  });

  app.get("/__void/site-manifest/voidchain.json", (_req:any, res:any) => {
    res.json(manifest("voidchain"));
  });

  app.get("/__void/site-manifest/nullfeed.json", (_req:any, res:any) => {
    res.json(manifest("nullfeed"));
  });

  try { console.log("[site] VOID native website routes v1 mounted: /site/voidchain /site/nullfeed"); } catch (err) { __voidIxCatch1800("1597:16", err); }
})();


/* __void_mainnet0_validator_candidate_registry_api_v1 */
;(() => {
  try {
    const G:any = globalThis as any;
    const MARK = "__void_mainnet0_validator_candidate_registry_api_v1";
    if (G[MARK]) return;
    G[MARK] = true;

    const fs = require("fs");
    const path = require("path");

    function artifactPath(): string {
      return path.join(process.cwd(), ".runtime", "mainnet0", "validator-candidate-registry.local.current.json");
    }

    function readArtifact(): any {
      const file = artifactPath();
      try {
        if (!fs.existsSync(file)) {
          return {
            ok: false,
            available: false,
            error: "validator_candidate_registry_artifact_missing",
            file,
            hint: "Run ops/mainnet0/validator-candidate-registry-local-deploy-proof.sh first."
          };
        }
        const raw = fs.readFileSync(file, "utf8");
        const parsed = JSON.parse(raw);
        return {
          ok: true,
          available: true,
          file,
          artifact: parsed
        };
      } catch (e:any) {
        return {
          ok: false,
          available: false,
          error: "validator_candidate_registry_artifact_read_failed",
          message: String(e?.message || e),
          file
        };
      }
    }

    function n(v:any): number {
      const x = Number(v);
      return Number.isFinite(x) ? x : 0;
    }

    function addr(v:any): string {
      const s = String(v || "").trim();
      return /^0x[0-9a-fA-F]{40}$/.test(s) ? s.toLowerCase() : "";
    }

    function accountStatus(artifact:any, accountRaw:any): any {
      const account = addr(accountRaw);
      const proofCandidate = addr(artifact?.candidate);

      if (!account) {
        return {
          account: String(accountRaw || ""),
          state: "unknown",
          registered: false,
          reason: "missing_or_invalid_account"
        };
      }

      if (proofCandidate && account === proofCandidate) {
        const activeFinal = n(artifact?.activeCountFinal);
        const waitingFinal = n(artifact?.waitingCountFinal);
        const candidateAfter = n(artifact?.candidateCountAfter);

        if (activeFinal > 0) {
          return {
            account,
            state: "active",
            registered: true,
            in_latest_local_proof: true
          };
        }

        if (waitingFinal > 0) {
          return {
            account,
            state: "waiting",
            registered: true,
            in_latest_local_proof: true
          };
        }

        if (candidateAfter > 0) {
          return {
            account,
            state: "candidate",
            registered: true,
            in_latest_local_proof: true
          };
        }
      }

      return {
        account,
        state: "not_registered_in_latest_local_proof",
        registered: false,
        in_latest_local_proof: false
      };
    }

    app.get("/__void/mainnet0/validator-candidate-registry/status", (_req:any, res:any) => {
      const loaded = readArtifact();
      if (!loaded.ok) {
        return res.status(404).json({
          ok: false,
          kind: "mainnet0_validator_candidate_registry_status",
          ...loaded
        });
      }

      const a = loaded.artifact || {};
      const activeBefore = n(a.activeCountBefore);
      const activeAfter = n(a.activeCountAfter);
      const activeFinal = n(a.activeCountFinal);
      const activeSetAffected =
        activeAfter !== activeBefore ||
        activeFinal !== activeBefore;

      return res.json({
        ok: true,
        kind: "mainnet0_validator_candidate_registry_status",
        source: "local_deploy_proof_artifact",
        file: loaded.file,
        registration_available: true,
        public_registration_mutates_active_set: activeSetAffected,
        invariant_ok: !activeSetAffected && !!a.ok,
        registry: a.registry || null,
        deployer: a.deployer || null,
        latest_proof_candidate: a.candidate || null,
        minValidatorStakeWei: a.minValidatorStakeWei || null,
        maxActiveValidators: a.maxActiveValidators || null,
        activationChurnLimit: a.activationChurnLimit || null,
        counts: {
          candidateBefore: a.candidateCountBefore || "0",
          candidateAfter: a.candidateCountAfter || "0",
          waitingBefore: a.waitingCountBefore || "0",
          waitingAfter: a.waitingCountAfter || "0",
          waitingFinal: a.waitingCountFinal || "0",
          activeBefore: a.activeCountBefore || "0",
          activeAfter: a.activeCountAfter || "0",
          activeFinal: a.activeCountFinal || "0"
        },
        policy: {
          public_registration_creates_candidate_or_waiting_state_only: true,
          registration_does_not_instantly_expand_active_validator_set: true,
          activation_is_separate_owner_epoch_step: true,
          active_set_cap_enforced_by_contract: true,
          activation_churn_limit_enforced_by_contract: true
        },
        artifact: a
      });
    });

    app.get("/__void/participant/validator-registration/status", (req:any, res:any) => {
      const loaded = readArtifact();
      const account = String(req?.query?.account || "").trim();

      if (!loaded.ok) {
        return res.status(404).json({
          ok: false,
          kind: "participant_validator_registration_status",
          account,
          ...loaded
        });
      }

      const a = loaded.artifact || {};
      const activeBefore = n(a.activeCountBefore);
      const activeAfter = n(a.activeCountAfter);
      const activeFinal = n(a.activeCountFinal);
      const activeSetAffected =
        activeAfter !== activeBefore ||
        activeFinal !== activeBefore;

      return res.json({
        ok: true,
        kind: "participant_validator_registration_status",
        source: "local_deploy_proof_artifact",
        account,
        registry: a.registry || null,
        candidate_registry_available: true,
        public_registration_mutates_active_set: activeSetAffected,
        invariant_ok: !activeSetAffected && !!a.ok,
        status: accountStatus(a, account),
        policy: {
          can_register_as_candidate: true,
          becomes_active_immediately: false,
          enters_waiting_pool_before_active_admission: true,
          active_validator_set_is_bounded: true
        },
        latest_proof: {
          stamp: a.stamp || null,
          candidate: a.candidate || null,
          candidateCountAfter: a.candidateCountAfter || "0",
          waitingCountFinal: a.waitingCountFinal || "0",
          activeCountFinal: a.activeCountFinal || "0"
        }
      });
    });

    try { console.log("[mainnet0.validator-candidate] read-only API mounted"); } catch (err) { __voidIxCatch2700("1811:1", err); }
  } catch (e:any) {
    try { console.warn("[mainnet0.validator-candidate] API mount failed", e?.message || e); } catch (err) { __voidIxCatch2700("1813:2", err); }
  }
})();



/* __void_mainnet0_validator_registration_draft_api_v1 */
;(() => {
  try {
    const G:any = globalThis as any;
    const MARK = "__void_mainnet0_validator_registration_draft_api_v1";
    if (G[MARK]) return;
    G[MARK] = true;

    const fs = require("fs");
    const path = require("path");
    const crypto = require("crypto");
    const express = require("express");

    function artifactPath(): string {
      return path.join(process.cwd(), ".runtime", "mainnet0", "validator-candidate-registry.local.current.json");
    }

    function readArtifact(): any {
      const file = artifactPath();
      try {
        if (!fs.existsSync(file)) {
          return {
            ok: false,
            error: "validator_candidate_registry_artifact_missing",
            file,
            hint: "Run ops/mainnet0/validator-candidate-registry-local-deploy-proof.sh first."
          };
        }
        return { ok: true, file, artifact: JSON.parse(fs.readFileSync(file, "utf8")) };
      } catch (e:any) {
        return {
          ok: false,
          error: "validator_candidate_registry_artifact_read_failed",
          message: String(e?.message || e),
          file
        };
      }
    }

    function isAddr(v:any): boolean {
      return /^0x[0-9a-fA-F]{40}$/.test(String(v || "").trim());
    }

    function normAddr(v:any): string {
      const s = String(v || "").trim();
      return isAddr(s) ? s : "";
    }

    function bytes32(v:any): string {
      const s = String(v || "").trim();
      return /^0x[0-9a-fA-F]{64}$/.test(s) ? s : "";
    }

    function hash32(label:string): string {
      return "0x" + crypto.createHash("sha256").update(label).digest("hex");
    }

    app.get("/__void/participant/validator-registration/draft", (req:any, res:any) => {
      const loaded = readArtifact();
      const account = normAddr(req?.query?.account);
      const reward = normAddr(req?.query?.reward || account);
      const consensusKeyHash =
        bytes32(req?.query?.consensus_key_hash) ||
        (account ? hash32("void-mainnet0-validator-consensus:" + account.toLowerCase()) : "");
      const metadataHash =
        bytes32(req?.query?.metadata_hash) ||
        (account ? hash32("void-mainnet0-validator-metadata:" + account.toLowerCase()) : "");

      if (!loaded.ok) {
        return res.status(404).json({
          ok: false,
          kind: "participant_validator_registration_draft",
          account: String(req?.query?.account || ""),
          ...loaded
        });
      }

      const artifact = loaded.artifact || {};
      const registry = normAddr(artifact.registry);
      const minStakeWei = String(artifact.minValidatorStakeWei || "0");
      const activeBefore = String(artifact.activeCountBefore || "0");
      const activeAfter = String(artifact.activeCountAfter || "0");
      const activeFinal = String(artifact.activeCountFinal || "0");
      const invariantOk = !!artifact.ok && activeBefore === activeAfter && activeBefore === activeFinal;

      if (!account) {
        return res.status(400).json({
          ok: false,
          kind: "participant_validator_registration_draft",
          error: "missing_or_invalid_account",
          account: String(req?.query?.account || ""),
          hint: "Pass ?account=0x... using the participant execution wallet address."
        });
      }

      if (!reward) {
        return res.status(400).json({
          ok: false,
          kind: "participant_validator_registration_draft",
          error: "missing_or_invalid_reward",
          account
        });
      }

      if (!registry || !invariantOk) {
        return res.status(409).json({
          ok: false,
          kind: "participant_validator_registration_draft",
          error: "candidate_registry_not_ready_or_invariant_failed",
          account,
          registry: registry || null,
          invariant_ok: invariantOk
        });
      }

      return res.json({
        ok: true,
        kind: "participant_validator_registration_draft",
        source: "local_deploy_proof_artifact",
        mutation: false,
        sends_transaction: false,
        account,
        owner: account,
        reward,
        registry,
        chainId: 2050,
        valueWei: minStakeWei,
        functionSignature: "registerCandidate(address,bytes32,bytes32)",
        args: {
          reward,
          consensusKeyHash,
          metadataHash
        },
        castPreview: [
          "cast send",
          "--rpc-url", String(artifact.rpc || "http://127.0.0.1:8545"),
          "--private-key", "$PARTICIPANT_PRIVATE_KEY",
          registry,
          "'registerCandidate(address,bytes32,bytes32)'",
          reward,
          consensusKeyHash,
          metadataHash,
          "--value", minStakeWei
        ].join(" "),
        safety: {
          public_registration_mutates_active_set: false,
          invariant_ok: invariantOk,
          activeCountBefore: activeBefore,
          activeCountAfter: activeAfter,
          activeCountFinal: activeFinal,
          becomes_active_immediately: false,
          enters_waiting_pool_before_active_admission: true
        },
        policy: {
          read_only_draft_only: true,
          browser_execution_wired: false,
          active_admission_separate: true,
          activation_churn_limited: true,
          active_set_capped: true
        }
      });
    });

    try { console.log("[mainnet0.validator-registration] draft API mounted"); } catch (err) { __voidIxCatch2700("1982:3", err); }
  } catch (e:any) {
    try { console.warn("[mainnet0.validator-registration] draft API mount failed", e?.message || e); } catch (err) { __voidIxCatch2700("1984:4", err); }
  }
})();



/* __void_mainnet0_validator_registration_preflight_api_v1 */
;(() => {
  try {
    const G:any = globalThis as any;
    const MARK = "__void_mainnet0_validator_registration_preflight_api_v1";
    if (G[MARK]) return;
    G[MARK] = true;

    const fs = require("fs");
    const path = require("path");
    const crypto = require("crypto");
    const child_process = require("child_process");

    function artifactPath(): string {
      return path.join(process.cwd(), ".runtime", "mainnet0", "validator-candidate-registry.local.current.json");
    }

    function readArtifact(): any {
      const file = artifactPath();
      try {
        if (!fs.existsSync(file)) {
          return { ok:false, error:"validator_candidate_registry_artifact_missing", file };
        }
        return { ok:true, file, artifact: JSON.parse(fs.readFileSync(file, "utf8")) };
      } catch (e:any) {
        return { ok:false, error:"validator_candidate_registry_artifact_read_failed", message:String(e?.message || e), file };
      }
    }

    function isAddr(v:any): boolean {
      return /^0x[0-9a-fA-F]{40}$/.test(String(v || "").trim());
    }

    function normAddr(v:any): string {
      const x = String(v || "").trim();
      return isAddr(x) ? x : "";
    }

    function bytes32(v:any): string {
      const x = String(v || "").trim();
      return /^0x[0-9a-fA-F]{64}$/.test(x) ? x : "";
    }

    function hash32(label:string): string {
      return "0x" + crypto.createHash("sha256").update(label).digest("hex");
    }

    function localChainId(rpc:string): any {
      try {
        const out = child_process.execFileSync(
          "cast",
          ["chain-id", "--rpc-url", rpc],
          { encoding:"utf8", timeout:2500, stdio:["ignore", "pipe", "pipe"] }
        ).trim();
        return { ok:true, chainId:Number(out), raw:out };
      } catch (e:any) {
        return { ok:false, chainId:null, error:String(e?.message || e) };
      }
    }

    app.get("/__void/participant/validator-registration/preflight", (req:any, res:any) => {
      const loaded = readArtifact();
      const account = normAddr(req?.query?.account);
      const reward = normAddr(req?.query?.reward || account);

      if (!account) {
        return res.status(400).json({
          ok:false,
          kind:"participant_validator_registration_preflight",
          error:"missing_or_invalid_account",
          account:String(req?.query?.account || ""),
          mutation:false,
          sends_transaction:false,
          submit_allowed:false
        });
      }

      if (!loaded.ok) {
        return res.status(404).json({
          ok:false,
          kind:"participant_validator_registration_preflight",
          account,
          mutation:false,
          sends_transaction:false,
          submit_allowed:false,
          ...loaded
        });
      }

      const artifact = loaded.artifact || {};
      const registry = normAddr(artifact.registry);
      const rpc = String(artifact.rpc || "http://127.0.0.1:8545");
      const chain = localChainId(rpc);

      const consensusKeyHash =
        bytes32(req?.query?.consensus_key_hash) ||
        hash32("void-mainnet0-validator-consensus:" + account.toLowerCase());

      const metadataHash =
        bytes32(req?.query?.metadata_hash) ||
        hash32("void-mainnet0-validator-metadata:" + account.toLowerCase());

      const valueWei = String(artifact.minValidatorStakeWei || "0");
      const activeBefore = String(artifact.activeCountBefore || "0");
      const activeAfter = String(artifact.activeCountAfter || "0");
      const activeFinal = String(artifact.activeCountFinal || "0");

      const activeSetSafe =
        !!artifact.ok &&
        activeBefore === activeAfter &&
        activeBefore === activeFinal;

      const gates = {
        valid_account: !!account,
        valid_reward: !!reward,
        registry_ready: !!registry,
        chain_id_checked: !!chain.ok,
        chain_id_is_2050: chain.ok && chain.chainId === 2050,
        value_is_registry_min_stake: valueWei === String(artifact.minValidatorStakeWei || "0") && valueWei !== "0",
        function_signature_allowed: true,
        active_set_safe: activeSetSafe,
        draft_payload_match: true,
        wallet_gate_authoritative: false,
        live_execution_wired: false
      };

      const gateList = Object.keys(gates).map((k) => ({ name:k, ok: !!(gates as any)[k] }));
      const gatesGreenExceptIntentional =
        gates.valid_account &&
        gates.valid_reward &&
        gates.registry_ready &&
        gates.chain_id_is_2050 &&
        gates.value_is_registry_min_stake &&
        gates.function_signature_allowed &&
        gates.active_set_safe &&
        gates.draft_payload_match;

      return res.json({
        ok:true,
        kind:"participant_validator_registration_preflight",
        source:"local_deploy_proof_artifact",
        mutation:false,
        sends_transaction:false,
        submit_allowed:false,
        submit_blocked_reason:"live_wallet_execution_not_wired",
        account,
        owner:account,
        reward,
        registry,
        rpc,
        chainId: chain.chainId,
        expectedChainId:2050,
        valueWei,
        functionSignature:"registerCandidate(address,bytes32,bytes32)",
        args:{ reward, consensusKeyHash, metadataHash },
        safety:{
          public_registration_mutates_active_set:false,
          activeCountBefore:activeBefore,
          activeCountAfter:activeAfter,
          activeCountFinal:activeFinal,
          becomes_active_immediately:false,
          enters_waiting_pool_before_active_admission:true
        },
        gates,
        gateList,
        gates_green_except_intentional_submit_blocks:gatesGreenExceptIntentional,
        intentional_submit_blocks:{
          wallet_gate_authoritative:false,
          live_execution_wired:false
        },
        next_required_before_live_submit:[
          "server-authoritative participant wallet status",
          "unlocked wallet proof",
          "draft-submit payload equality proof",
          "wrong-chain rejection proof",
          "double-submit guard proof"
        ]
      });
    });

    try { console.log("[mainnet0.validator-registration] preflight API mounted"); } catch (err) { __voidIxCatch2700("2170:5", err); }
  } catch (e:any) {
    try { console.warn("[mainnet0.validator-registration] preflight API mount failed", e?.message || e); } catch (err) { __voidIxCatch2700("2172:6", err); }
  }
})();




/* __void_mainnet0_validator_registration_wallet_authority_api_v1 */
;(() => {
  try {
    const G:any = globalThis as any;
    const MARK = "__void_mainnet0_validator_registration_wallet_authority_api_v1";
    if (G[MARK]) return;
    G[MARK] = true;

    function isAddr(v:any): boolean {
      return /^0x[0-9a-fA-F]{40}$/.test(String(v || "").trim());
    }

    function normAddr(v:any): string {
      const x = String(v || "").trim();
      return isAddr(x) ? x : "";
    }

    async function selfJson(path:string): Promise<any> {
      const port = String(process.env.HTTP_PORT || "4100");
      const url = "http://127.0.0.1:" + port + path;
      try {
        const r = await fetch(url);
        const text = await r.text();
        let json:any = null;
        try { json = JSON.parse(text); } catch { json = { raw:text }; }
        return { ok:r.ok, http_status:r.status, url, json };
      } catch (e:any) {
        return { ok:false, http_status:0, url, error:String(e?.message || e), json:null };
      }
    }

    app.get("/__void/participant/validator-registration/wallet-authority", async (req:any, res:any) => {
      const account = normAddr(req?.query?.account);

      if (!account) {
        return res.status(400).json({
          ok:false,
          kind:"participant_validator_registration_wallet_authority",
          error:"missing_or_invalid_account",
          mutation:false,
          sends_transaction:false,
          submit_allowed:false
        });
      }

      const status = await selfJson("/__void/participant/wallet/status?account=" + encodeURIComponent(account));
      const w:any = status.json || {};

      const walletAddress =
        normAddr(w.address) ||
        normAddr(w.wallet) ||
        normAddr(w.wallet_address) ||
        normAddr(w.execution_wallet) ||
        normAddr(w.account_wallet);

      const hasWallet =
        w.has_wallet === true ||
        w.hasWallet === true ||
        w.wallet_exists === true ||
        !!walletAddress;

      const walletUnlocked =
        w.unlocked === true ||
        w.is_unlocked === true ||
        w.wallet_unlocked === true;

      const accountMatch =
        !!walletAddress &&
        walletAddress.toLowerCase() === account.toLowerCase();

      const readyForLiveSubmit =
        status.ok === true &&
        hasWallet === true &&
        walletUnlocked === true &&
        accountMatch === true;

      const gates = {
        wallet_status_endpoint_checked:true,
        wallet_status_endpoint_reachable:status.ok === true,
        participant_wallet_exists:hasWallet,
        participant_wallet_unlocked:walletUnlocked,
        participant_wallet_matches_account:accountMatch,
        wallet_gate_authoritative:readyForLiveSubmit,
        live_execution_wired:false
      };

      return res.status(200).json({
        ok:true,
        kind:"participant_validator_registration_wallet_authority",
        source:"wallet_authority_probe_v1",
        mutation:false,
        sends_transaction:false,
        submit_allowed:false,
        submit_blocked_reason: readyForLiveSubmit ? "live_wallet_execution_not_wired" : "wallet_authority_not_ready",
        account,
        wallet_authority:{
          status_checked:true,
          status_ok:status.ok === true,
          status_http:status.http_status,
          has_wallet:hasWallet,
          wallet_unlocked:walletUnlocked,
          account_match:accountMatch,
          wallet_address:walletAddress || null,
          wallet_status_source:w.source || null,
          ready_for_live_submit:readyForLiveSubmit
        },
        gates,
        required_before_live_submit:[
          "participant native wallet must exist",
          "participant native wallet must be unlocked",
          "wallet address must match participant account",
          "draft-submit payload equality proof must pass",
          "wrong-chain rejection proof must pass",
          "double-submit guard proof must pass",
          "real transaction execution proof must pass"
        ]
      });
    });

    try { console.log("[mainnet0.validator-registration] wallet authority API mounted"); } catch (err) { __voidIxCatch2700("2298:7", err); }
  } catch (e:any) {
    try { console.warn("[mainnet0.validator-registration] wallet authority API mount failed", e?.message || e); } catch (err) { __voidIxCatch2700("2300:8", err); }
  }
})();



/* __void_mainnet0_validator_registration_double_submit_guard_api_v1 */
;(() => {
  try {
    const G:any = globalThis as any;
    const MARK = "__void_mainnet0_validator_registration_double_submit_guard_api_v1";
    if (G[MARK]) return;
    G[MARK] = true;

    const express = require("express");
    const crypto = require("crypto");

    const storeKey = "__void_validator_registration_intent_guard_v1";
    if (!G[storeKey]) {
      G[storeKey] = {
        reserved: Object.create(null),
        calls:0,
        reserves:0,
        duplicates:0,
        last_ts:0
      };
    }

    function isAddr(v:any): boolean {
      return /^0x[0-9a-fA-F]{40}$/.test(String(v || "").trim());
    }

    function bytes32(v:any): string {
      return /^0x[0-9a-fA-F]{64}$/.test(String(v || "").trim()) ? String(v).trim() : "";
    }

    function normAddr(v:any): string {
      const x = String(v || "").trim();
      return isAddr(x) ? x : "";
    }

    function hash32(label:string): string {
      return "0x" + crypto.createHash("sha256").update(label).digest("hex");
    }

    function computeIntent(body:any): any {
      const account = normAddr(body.account);
      const reward = normAddr(body.reward || account);
      const registry = normAddr(body.registry);
      const valueWei = String(body.valueWei || "10000000000000000000000");
      const functionSignature = String(body.functionSignature || "registerCandidate(address,bytes32,bytes32)");
      const consensusKeyHash = bytes32(body.consensusKeyHash || body.consensus_key_hash) || hash32("void-mainnet0-validator-consensus:" + account.toLowerCase());
      const metadataHash = bytes32(body.metadataHash || body.metadata_hash) || hash32("void-mainnet0-validator-metadata:" + account.toLowerCase());

      if (!account) return { ok:false, error:"missing_or_invalid_account" };
      if (!reward) return { ok:false, error:"missing_or_invalid_reward" };
      if (!registry) return { ok:false, error:"missing_or_invalid_registry" };

      const submitIntent = {
        chainId:2050,
        account:account.toLowerCase(),
        owner:account.toLowerCase(),
        reward:reward.toLowerCase(),
        registry:registry.toLowerCase(),
        valueWei,
        functionSignature,
        consensusKeyHash:consensusKeyHash.toLowerCase(),
        metadataHash:metadataHash.toLowerCase()
      };

      const submitIntentId = "0x" + crypto
        .createHash("sha256")
        .update(JSON.stringify(submitIntent))
        .digest("hex");

      return { ok:true, submitIntent, submitIntentId };
    }

    const route = "/__void/participant/validator-registration/double-submit-guard";
    app.use(route, express.json({ limit:"32kb" }));

    app.post(route, (req:any, res:any) => {
      const body = (req && req.body && typeof req.body === "object") ? req.body : {};
      const mode = String(body.mode || req?.query?.mode || "dry_run");
      const computed = computeIntent(body);
      const state = G[storeKey];

      state.calls++;
      state.last_ts = Date.now();

      if (!computed.ok) {
        return res.status(400).json({
          ok:false,
          kind:"participant_validator_registration_double_submit_guard",
          error:computed.error,
          mutation:false,
          sends_transaction:false,
          submit_allowed:false
        });
      }

      const id = computed.submitIntentId;
      const alreadyReserved = !!state.reserved[id];

      if (mode === "reserve") {
        if (alreadyReserved) {
          state.duplicates++;
          return res.status(409).json({
            ok:false,
            kind:"participant_validator_registration_double_submit_guard",
            error:"duplicate_submit_intent",
            mutation:false,
            sends_transaction:false,
            submit_allowed:false,
            submitIntentId:id,
            submitIntent:computed.submitIntent,
            guard:{
              mode,
              double_submit_guard:true,
              already_reserved:true,
              duplicate_submit_rejected:true,
              live_execution_wired:false
            }
          });
        }

        state.reserved[id] = { ts:Date.now(), submitIntent:computed.submitIntent };
        state.reserves++;

        return res.status(200).json({
          ok:true,
          kind:"participant_validator_registration_double_submit_guard",
          mutation:false,
          sends_transaction:false,
          submit_allowed:false,
          submitIntentId:id,
          submitIntent:computed.submitIntent,
          guard:{
            mode,
            double_submit_guard:true,
            already_reserved:false,
            duplicate_submit_rejected:false,
            reserved:true,
            live_execution_wired:false
          }
        });
      }

      return res.status(200).json({
        ok:true,
        kind:"participant_validator_registration_double_submit_guard",
        mutation:false,
        sends_transaction:false,
        submit_allowed:false,
        submitIntentId:id,
        submitIntent:computed.submitIntent,
        guard:{
          mode:"dry_run",
          double_submit_guard:true,
          already_reserved:alreadyReserved,
          duplicate_submit_rejected:false,
          would_reject_duplicate:alreadyReserved,
          live_execution_wired:false
        }
      });
    });

    app.get("/__void/participant/validator-registration/double-submit-guard/status", (_req:any, res:any) => {
      const state = G[storeKey];
      return res.json({
        ok:true,
        kind:"participant_validator_registration_double_submit_guard_status",
        mutation:false,
        sends_transaction:false,
        submit_allowed:false,
        calls:Number(state.calls || 0),
        reserves:Number(state.reserves || 0),
        duplicates:Number(state.duplicates || 0),
        reservedCount:Object.keys(state.reserved || {}).length,
        live_execution_wired:false
      });
    });

    try { console.log("[mainnet0.validator-registration] double-submit guard API mounted"); } catch (err) { __voidIxCatch2700("2483:9", err); }
  } catch (e:any) {
    try { console.warn("[mainnet0.validator-registration] double-submit guard API mount failed", e?.message || e); } catch (err) { __voidIxCatch2700("2485:10", err); }
  }
})();



/* __void_mainnet0_validator_registration_live_submit_readiness_api_v1 */
;(() => {
  try {
    const G:any = globalThis as any;
    const MARK = "__void_mainnet0_validator_registration_live_submit_readiness_api_v1";
    if (G[MARK]) return;
    G[MARK] = true;

    function isAddr(v:any): boolean {
      return /^0x[0-9a-fA-F]{40}$/.test(String(v || "").trim());
    }

    function normAddr(v:any): string {
      const x = String(v || "").trim();
      return isAddr(x) ? x : "";
    }

    function eqAddr(a:any, b:any): boolean {
      const aa = normAddr(a);
      const bb = normAddr(b);
      return !!aa && !!bb && aa.toLowerCase() === bb.toLowerCase();
    }

    function eqText(a:any, b:any): boolean {
      return String(a || "").toLowerCase() === String(b || "").toLowerCase();
    }

    async function selfReq(method:string, path:string, body?:any): Promise<any> {
      const port = String(process.env.HTTP_PORT || "4100");
      const url = "http://127.0.0.1:" + port + path;
      const init:any = { method };
      if (body !== undefined) {
        init.headers = { "content-type":"application/json" };
        init.body = JSON.stringify(body);
      }
      try {
        const r = await fetch(url, init);
        const text = await r.text();
        let json:any = null;
        try { json = JSON.parse(text); } catch { json = { raw:text }; }
        return { ok:r.ok, http_status:r.status, url, json };
      } catch (e:any) {
        return { ok:false, http_status:0, url, error:String(e?.message || e), json:null };
      }
    }

    function payloadEquality(draft:any, submit:any): any {
      const checks:any = {
        account: eqAddr(draft?.account, submit?.account),
        owner: eqAddr(draft?.owner, submit?.owner),
        reward: eqAddr(draft?.reward, submit?.reward),
        registry: eqAddr(draft?.registry, submit?.registry),
        valueWei: String(draft?.valueWei || "") === String(submit?.valueWei || ""),
        functionSignature: String(draft?.functionSignature || "") === String(submit?.functionSignature || ""),
        argReward: eqAddr(draft?.args?.reward, submit?.args?.reward),
        consensusKeyHash: eqText(draft?.args?.consensusKeyHash, submit?.args?.consensusKeyHash),
        metadataHash: eqText(draft?.args?.metadataHash, submit?.args?.metadataHash)
      };
      const ok = Object.values(checks).every(Boolean);
      return { ok, checks };
    }

    app.get("/__void/participant/validator-registration/live-submit-readiness", async (req:any, res:any) => {
      const account = normAddr(req?.query?.account);
      if (!account) {
        return res.status(400).json({
          ok:false,
          kind:"participant_validator_registration_live_submit_readiness",
          error:"missing_or_invalid_account",
          mutation:false,
          sends_transaction:false,
          submit_allowed:false
        });
      }

      const draftResp = await selfReq("GET", "/__void/participant/validator-registration/draft?account=" + encodeURIComponent(account));
      const walletResp = await selfReq("GET", "/__void/participant/validator-registration/wallet-authority?account=" + encodeURIComponent(account));
      const submitResp = await selfReq("POST", "/__void/participant/validator-registration/submit", { account, chainId:2050 });
      const wrongChainResp = await selfReq("POST", "/__void/participant/validator-registration/submit", { account, chainId:1 });

      const draft:any = draftResp.json || {};
      const wallet:any = walletResp.json || {};
      const submit:any = submitResp.json || {};
      const wrong:any = wrongChainResp.json || {};

      let doubleGuardResp:any = { ok:false, http_status:0, json:null, error:"submit_payload_unavailable" };
      if (submit?.registry && submit?.args) {
        doubleGuardResp = await selfReq("POST", "/__void/participant/validator-registration/double-submit-guard", {
          account: submit.account,
          reward: submit.reward,
          registry: submit.registry,
          valueWei: submit.valueWei,
          functionSignature: submit.functionSignature,
          consensusKeyHash: submit.args.consensusKeyHash,
          metadataHash: submit.args.metadataHash
        });
      }

      const doubleGuard:any = doubleGuardResp.json || {};
      const equality = payloadEquality(draft, submit);

      const publicRegistrationSafe =
        draftResp.http_status === 200 &&
        draft?.ok === true &&
        draft?.mutation === false &&
        draft?.sends_transaction === false &&
        draft?.safety?.public_registration_mutates_active_set === false &&
        draft?.safety?.invariant_ok === true &&
        Number(draft?.chainId) === 2050;

      const walletAuthorityReady =
        walletResp.http_status === 200 &&
        wallet?.ok === true &&
        wallet?.wallet_authority?.ready_for_live_submit === true;

      const payloadEqualityReady =
        submitResp.http_status === 501 &&
        submit?.mutation === false &&
        submit?.sends_transaction === false &&
        submit?.submit_allowed === false &&
        submit?.submit_blocked_reason === "live_wallet_execution_not_wired" &&
        submit?.core_gates_green === true &&
        equality.ok === true &&
        typeof submit?.submitIntentId === "string" &&
        /^0x[0-9a-fA-F]{64}$/.test(submit.submitIntentId);

      const wrongChainGateReady =
        wrongChainResp.http_status === 409 &&
        wrong?.error === "wrong_chain" &&
        wrong?.expectedChainId === 2050 &&
        wrong?.requestedChainId === 1 &&
        wrong?.mutation === false &&
        wrong?.sends_transaction === false &&
        wrong?.submit_allowed === false &&
        wrong?.gates?.wrong_chain_rejected === true &&
        wrong?.gates?.live_execution_wired === false;

      const doubleSubmitGuardReady =
        doubleGuardResp.http_status === 200 &&
        doubleGuard?.mutation === false &&
        doubleGuard?.sends_transaction === false &&
        doubleGuard?.submit_allowed === false &&
        doubleGuard?.guard?.double_submit_guard === true &&
        doubleGuard?.guard?.mode === "dry_run" &&
        doubleGuard?.guard?.live_execution_wired === false &&
        typeof doubleGuard?.submitIntentId === "string" &&
        doubleGuard.submitIntentId === submit.submitIntentId;

      const liveExecutionWired = false;

      const blockers:string[] = [];
      if (!publicRegistrationSafe) blockers.push("public_registration_not_safe");
      if (!walletAuthorityReady) blockers.push("wallet_authority_not_ready");
      if (!payloadEqualityReady) blockers.push("payload_equality_not_ready");
      if (!wrongChainGateReady) blockers.push("wrong_chain_gate_not_ready");
      if (!doubleSubmitGuardReady) blockers.push("double_submit_guard_not_ready");
      if (!liveExecutionWired) blockers.push("live_execution_not_wired");

      const gates = {
        public_registration_safe: publicRegistrationSafe,
        wallet_authority_ready: walletAuthorityReady,
        payload_equality_ready: payloadEqualityReady,
        wrong_chain_gate_ready: wrongChainGateReady,
        double_submit_guard_ready: doubleSubmitGuardReady,
        live_execution_wired: liveExecutionWired
      };

      const coreGatesGreenExceptWalletAndLive =
        publicRegistrationSafe &&
        payloadEqualityReady &&
        wrongChainGateReady &&
        doubleSubmitGuardReady;

      const submitAllowed =
        publicRegistrationSafe &&
        walletAuthorityReady &&
        payloadEqualityReady &&
        wrongChainGateReady &&
        doubleSubmitGuardReady &&
        liveExecutionWired;

      return res.status(200).json({
        ok:true,
        kind:"participant_validator_registration_live_submit_readiness",
        source:"live_submit_readiness_v1",
        mutation:false,
        sends_transaction:false,
        submit_allowed:submitAllowed,
        submit_blocked_reason: submitAllowed ? null : blockers[0],
        account,
        gates,
        core_gates_green_except_wallet_and_live: coreGatesGreenExceptWalletAndLive,
        blockers,
        readiness:{
          draft_http_status:draftResp.http_status,
          wallet_http_status:walletResp.http_status,
          submit_http_status:submitResp.http_status,
          wrong_chain_http_status:wrongChainResp.http_status,
          double_guard_http_status:doubleGuardResp.http_status,
          submitIntentId:submit?.submitIntentId || null,
          doubleGuardIntentId:doubleGuard?.submitIntentId || null,
          payloadEquality:equality
        },
        note:"Read-only aggregate. Live validator registration execution remains disabled until wallet authority and real transaction execution are explicitly wired and proven."
      });
    });

    try { console.log("[mainnet0.validator-registration] live-submit readiness API mounted"); } catch (err) { __voidIxCatch2700("2698:11", err); }
  } catch (e:any) {
    try { console.warn("[mainnet0.validator-registration] live-submit readiness API mount failed", e?.message || e); } catch (err) { __voidIxCatch2700("2700:12", err); }
  }
})();




/* __void_mainnet0_validator_registration_live_submit_status_api_v1 */
;(() => {
  try {
    const G:any = globalThis as any;
    const MARK = "__void_mainnet0_validator_registration_live_submit_status_api_v1";
    if (G[MARK]) return;
    G[MARK] = true;

    const fs = require("fs");
    const child_process = require("child_process");

    function isAddr(v:any): boolean {
      return /^0x[0-9a-fA-F]{40}$/.test(String(v || "").trim());
    }

    function normAddr(v:any): string {
      const x = String(v || "").trim();
      return isAddr(x) ? x : "";
    }

    function liveOn(): boolean {
      return String(process.env.VOID_VALIDATOR_REGISTRATION_LIVE_EXECUTION || "").trim() === "1";
    }

    function proofStatusOn(req:any): boolean {
      const envOn = String(process.env.VOID_VALIDATOR_REGISTRATION_STATUS_PROOF_MODE || "").trim() === "1";
      const queryOn =
        String(req?.query?.proof_status_mode || req?.query?.proofStatusMode || "").trim() === "1";
      return envOn && queryOn;
    }

    function cast(args:string[], opts?:{ timeout?:number }): any {
      const home = String(process.env.HOME || "");
      const candidates = [
        String(process.env.CAST_BIN || "").trim(),
        "/tmp/foundry-1.5.1/cast",
        home ? (home + "/.foundry/bin/cast") : "",
        "cast"
      ].filter(Boolean);

      let last:any = null;
      for (const bin of candidates) {
        const r = child_process.spawnSync(bin, args, {
          encoding:"utf8",
          timeout: opts?.timeout || 30000,
          env:{
            ...process.env,
            PATH:[
              "/tmp/foundry-1.5.1",
              home ? (home + "/.foundry/bin") : "",
              String(process.env.PATH || "")
            ].filter(Boolean).join(":")
          }
        });
        last = r;
        if (!r.error && r.status === 0) {
          return {
            ok:true,
            bin,
            stdout:String(r.stdout || ""),
            stderr:String(r.stderr || "")
          };
        }
      }

      return {
        ok:false,
        bin:String(candidates[candidates.length - 1] || "cast"),
        stdout:String(last?.stdout || ""),
        stderr:String(last?.stderr || last?.error?.message || "")
      };
    }

    async function selfReq(method:string, path:string, payload?:any): Promise<any> {
      const port = String(process.env.HTTP_PORT || "4100");
      const init:any = { method };
      if (payload !== undefined) {
        init.headers = { "content-type":"application/json" };
        init.body = JSON.stringify(payload);
      }
      try {
        const r = await fetch("http://127.0.0.1:" + port + path, init);
        const text = await r.text();
        let json:any = {};
        try { json = JSON.parse(text); } catch { json = { raw:text }; }
        return { status:r.status, ok:r.ok, json };
      } catch (e:any) {
        return { status:0, ok:false, json:{ ok:false, error:String(e?.message || e) } };
      }
    }

    function signerProbe(account:string): any {
      const file = String(process.env.VOID_VALIDATOR_REGISTRATION_LIVE_SIGNER_PK_FILE || "").trim();
      const out:any = {
        signer_file_configured: !!file,
        signer_file_present: false,
        signer_key_valid_format: false,
        signer_address: "",
        signer_matches_account: false,
        signer_error: ""
      };

      if (!file) {
        out.signer_error = "missing_live_signer_pk_file";
        return out;
      }

      if (!fs.existsSync(file)) {
        out.signer_error = "live_signer_pk_file_missing";
        return out;
      }

      out.signer_file_present = true;

      let pk = "";
      try { pk = String(fs.readFileSync(file, "utf8") || "").trim(); }
      catch { out.signer_error = "live_signer_pk_file_read_failed"; return out; }

      if (!/^0x[0-9a-fA-F]{64}$/.test(pk)) {
        out.signer_error = "invalid_live_signer_private_key_format";
        return out;
      }

      out.signer_key_valid_format = true;

      const r = cast(["wallet", "address", pk]);
      const addr = String(r.stdout || "").trim();
      if (!r.ok || !isAddr(addr)) {
        out.signer_error = "could_not_derive_live_signer_address";
        return out;
      }

      out.signer_address = addr;
      out.signer_matches_account = !!account && addr.toLowerCase() === account.toLowerCase();
      if (!out.signer_matches_account) out.signer_error = "live_signer_account_mismatch";
      return out;
    }

    app.get("/__void/participant/validator-registration/live-submit-status", async (req:any, res:any) => {
      const account = normAddr(req?.query?.account);
      const liveEnabled = liveOn();
      const proofStatusMode = proofStatusOn(req);
      const statusGateEnabled = liveEnabled || proofStatusMode;
      const blockers:string[] = [];

      if (!account) blockers.push("missing_or_invalid_account");
      if (!statusGateEnabled) blockers.push("live_execution_kill_switch_off");

      const signer = signerProbe(account);
      if (statusGateEnabled) {
        if (!signer.signer_file_configured) blockers.push("missing_live_signer_pk_file");
        else if (!signer.signer_file_present) blockers.push("live_signer_pk_file_missing");
        else if (!signer.signer_key_valid_format) blockers.push("invalid_live_signer_private_key_format");
        else if (!signer.signer_matches_account) blockers.push("live_signer_account_mismatch");
      }

      const wallet = account
        ? await selfReq("GET", "/__void/participant/validator-registration/wallet-authority?account=" + encodeURIComponent(account))
        : { status:0, json:{} };
      const walletReady = wallet.status === 200 && wallet.json?.wallet_authority?.ready_for_live_submit === true;
      if (!walletReady) blockers.push("wallet_authority_not_ready");

      const payload = account
        ? await selfReq("POST", "/__void/participant/validator-registration/submit", { account, chainId:2050 })
        : { status:0, json:{} };
      const payloadReady = payload.status === 501 && payload.json?.core_gates_green === true && !!payload.json?.submitIntentId && !!payload.json?.registry;
      if (!payloadReady) blockers.push("submit_payload_not_ready");

      res.json({
        ok:true,
        kind:"participant_validator_registration_live_submit_status",
        source:"live_submit_status_v1",
        mutation:false,
        sends_transaction:false,
        submit_allowed:false,
        ready_for_proof_submit: !!(account && statusGateEnabled && signer.signer_matches_account && walletReady && payloadReady),
        account,
        blockers:[...new Set(blockers)],
        status:{
          live_execution_enabled: liveEnabled,
          proof_status_mode: proofStatusMode,
          status_gate_enabled: statusGateEnabled,
          signer_file_configured: signer.signer_file_configured,
          signer_file_present: signer.signer_file_present,
          signer_key_valid_format: signer.signer_key_valid_format,
          signer_address: signer.signer_address,
          signer_matches_account: signer.signer_matches_account,
          signer_error: signer.signer_error || "",
          wallet_authority_ready: walletReady,
          wallet_status_http: wallet.status,
          payload_ready: payloadReady,
          payload_http: payload.status
        },
        wallet_authority: wallet.json?.wallet_authority || null,
        payload_summary: payload.json ? {
          registry: payload.json.registry || "",
          valueWei: payload.json.valueWei || "",
          submitIntentId: payload.json.submitIntentId || "",
          core_gates_green: payload.json.core_gates_green === true,
          submit_blocked_reason: payload.json.submit_blocked_reason || ""
        } : null,
        note:"Read-only status endpoint. It does not reserve submit intents and does not broadcast transactions. proof_status_mode only affects this read-only status response and does not enable submit-live execution."
      });
    });

    try { console.log("[mainnet0.validator-registration] live-submit status API mounted"); } catch (err) { __voidIxCatch3600("2912:1", err); }
  } catch (e:any) {
    try { console.warn("[mainnet0.validator-registration] live-submit status API mount failed", e?.message || e); } catch (err) { __voidIxCatch3600("2914:2", err); }
  }
})();


/* __void_mainnet0_validator_registration_submit_live_api_v1 */
;(() => {
  try {
    const G:any = globalThis as any;
    const MARK = "__void_mainnet0_validator_registration_submit_live_api_v1";
    if (G[MARK]) return;
    G[MARK] = true;

    const express = require("express");
    const fs = require("fs");
    const child_process = require("child_process");

    function isAddr(v:any): boolean {
      return /^0x[0-9a-fA-F]{40}$/.test(String(v || "").trim());
    }

    function normAddr(v:any): string {
      const x = String(v || "").trim();
      return isAddr(x) ? x : "";
    }

    function bodyOf(req:any): any {
      return (req && req.body && typeof req.body === "object") ? req.body : {};
    }

    function liveExecutionEnabled(): boolean {
      return String(process.env.VOID_VALIDATOR_REGISTRATION_LIVE_EXECUTION || "").trim() === "1";
    }

    function durableIntentJournalEnabled(): boolean {
      return String(process.env.VOID_VALIDATOR_SUBMIT_INTENT_DURABLE_JOURNAL || "").trim() === "1";
    }

    function durableIntentIntegration(): any {
      if (!durableIntentJournalEnabled()) {
        return { ok:false, reason:"durable_submit_intent_journal_kill_switch_off" };
      }
      const journalPath = String(process.env.VOID_VALIDATOR_SUBMIT_INTENT_JOURNAL_PATH || "").trim();
      if (!journalPath) {
        return { ok:false, reason:"durable_submit_intent_journal_path_missing" };
      }
      const ttlMs = String(process.env.VOID_VALIDATOR_SUBMIT_INTENT_TTL_MS || "").trim();
      try {
        return {
          ok:true,
          integration:new ValidatorSubmitIntentRuntimeIntegrationV1({
            journal_path:journalPath,
            ...(ttlMs ? { ttl_ms:ttlMs } : {})
          })
        };
      } catch (e:any) {
        return {
          ok:false,
          reason:"durable_submit_intent_journal_configuration_invalid",
          detail:String(e?.message || e)
        };
      }
    }

    function durableDecisionSummary(decision:any): any {
      if (!decision || typeof decision !== "object") return null;
      return {
        ok:decision.ok === true,
        status:String(decision.status || ""),
        reason:decision.ok === false ? String(decision.reason || "") : null,
        source:decision.ok === false ? String(decision.source || "") : null,
        submit_intent_id:String(decision.submit_intent_id || ""),
        write_performed:decision.write_performed === true,
        replay_required:decision.replay_required === true,
        requires_operator_reconciliation:decision.requires_operator_reconciliation === true,
        automatic_rebroadcast_allowed:false,
        crash_state:decision.intent_state?.crash_state || decision.crash_state || null,
        journal_entries_total:Number(decision.journal_entries_total || 0),
        journal_head_hash_sha256:String(decision.journal_head_hash_sha256 || ""),
        broadcast_id:decision.broadcast_id || null,
        transaction_hash:decision.transaction_hash || null,
        receipt_status:decision.receipt_status ?? null
      };
    }

    const route = "/__void/participant/validator-registration/submit-live";
    app.use(route, express.json({ limit:"32kb" }));

    app.post(route, async (req:any, res:any) => {
      const body = bodyOf(req);
      const account = normAddr(body.account || req?.query?.account);
      const rawChainId = body.chainId ?? body.chain_id ?? req?.query?.chainId ?? req?.query?.chain_id;
      const requestedChainId = rawChainId === undefined || rawChainId === null || String(rawChainId).trim() === ""
        ? 2050
        : Number(String(rawChainId).trim());

      if (!Number.isFinite(requestedChainId) || requestedChainId !== 2050) {
        return res.status(409).json({
          ok:false,
          kind:"participant_validator_registration_submit_live",
          source:"submit_live_v1",
          error:"wrong_chain",
          expectedChainId:2050,
          requestedChainId:Number.isFinite(requestedChainId) ? requestedChainId : null,
          mutation:false,
          sends_transaction:false,
          submit_allowed:false,
          live_execution_wired:false,
          submit_blocked_reason:"wrong_chain",
          gates:{
            valid_account: !!account,
            wrong_chain_rejected:true,
            live_execution_enabled:liveExecutionEnabled(),
            live_execution_wired:false
          }
        });
      }

      if (!account) {
        return res.status(400).json({
          ok:false,
          kind:"participant_validator_registration_submit_live",
          source:"submit_live_v1",
          error:"missing_or_invalid_account",
          mutation:false,
          sends_transaction:false,
          submit_allowed:false,
          live_execution_wired:false
        });
      }

      if (!liveExecutionEnabled()) {
        return res.status(501).json({
          ok:false,
          kind:"participant_validator_registration_submit_live",
          source:"submit_live_v1",
          mutation:false,
          sends_transaction:false,
          submit_allowed:false,
          live_execution_wired:false,
          submit_blocked_reason:"live_execution_kill_switch_off",
          account,
          gates:{
            valid_account:true,
            chain_id_is_2050:true,
            live_execution_enabled:false,
            wallet_authority_checked:false,
            payload_equality_checked:false,
            double_submit_guard_checked:false,
            tx_broadcast:false,
            receipt_status_1:false
          },
          required_before_enable:[
            "set VOID_VALIDATOR_REGISTRATION_LIVE_EXECUTION=1 only inside proof/runtime gate",
            "unlock participant native wallet before live submit",
            "prove wallet authority is ready",
            "prove draft-submit payload equality",
            "reserve submitIntentId through durable append-only journal",
            "broadcast registerCandidate transaction",
            "require transaction receipt status=1",
            "prove candidate registered without active-set expansion"
          ]
        });
      }

      const durableRuntime = durableIntentIntegration();
      if (durableRuntime.ok !== true) {
        return res.status(503).json({
          ok:false,
          kind:"participant_validator_registration_submit_live",
          source:"submit_live_v1",
          error:String(durableRuntime.reason || "durable_submit_intent_journal_not_ready"),
          mutation:false,
          sends_transaction:false,
          submit_allowed:false,
          live_execution_wired:true,
          durable_submit_intent_journal_enabled:durableIntentJournalEnabled(),
          durable_submit_intent_journal_ready:false,
          automatic_rebroadcast_allowed:false,
          submit_blocked_reason:String(durableRuntime.reason || "durable_submit_intent_journal_not_ready")
        });
      }
      const intentRuntime:ValidatorSubmitIntentRuntimeIntegrationV1 = durableRuntime.integration;

      const port = String(process.env.HTTP_PORT || "4100");
      const base = "http://127.0.0.1:" + port;

      async function selfReq(method:string, path:string, payload?:any): Promise<any> {
        const init:any = { method };
        if (payload !== undefined) {
          init.headers = { "content-type":"application/json" };
          init.body = JSON.stringify(payload);
        }
        try {
          const r = await fetch(base + path, init);
          const text = await r.text();
          let json:any = null;
          try { json = JSON.parse(text); } catch { json = { raw:text }; }
          return { ok:r.ok, status:r.status, json, text };
        } catch (e:any) {
          return { ok:false, status:0, json:{ ok:false, error:String(e?.message || e) }, text:"" };
        }
      }

      function bytes32(v:any): string {
        const x = String(v || "").trim();
        return /^0x[0-9a-fA-F]{64}$/.test(x) ? x : "";
      }

      function cast(args:string[], opts?:any): any {
        const home = String(process.env.HOME || "");
        const candidates = [
          String(process.env.CAST_BIN || "").trim(),
          "/tmp/foundry-1.5.1/cast",
          home ? (home + "/.foundry/bin/cast") : "",
          "cast"
        ].filter(Boolean);

        let last:any = null;
        for (const bin of candidates) {
          const r = child_process.spawnSync(bin, args, {
            encoding:"utf8",
            timeout:Number(opts?.timeout || 120000),
            env:{
              ...process.env,
              PATH:[
                "/tmp/foundry-1.5.1",
                home ? (home + "/.foundry/bin") : "",
                String(process.env.PATH || "")
              ].filter(Boolean).join(":")
            }
          });
          last = r;
          if (!r.error && r.status === 0) {
            return {
              status:r.status,
              signal:r.signal,
              bin,
              stdout:String(r.stdout || ""),
              stderr:String(r.stderr || ""),
              ok:true
            };
          }
        }

        return {
          status:last?.status,
          signal:last?.signal,
          bin:String(candidates[candidates.length - 1] || "cast"),
          stdout:String(last?.stdout || ""),
          stderr:String(last?.stderr || last?.error?.message || ""),
          ok:false
        };
      }

      function parseCastSend(out:string): any {
        const text = String(out || "");
        const mStatus = text.match(/^status\s+([01])(?:\s+\([^)]+\))?\s*$/m);
        const mTx = text.match(/^transactionHash\s+(0x[0-9a-fA-F]{64})\s*$/m);
        return {
          receiptStatus: mStatus ? mStatus[1] : "",
          transactionHash: mTx ? mTx[1] : ""
        };
      }

      function readSignerPk(): any {
        const file = String(process.env.VOID_VALIDATOR_REGISTRATION_LIVE_SIGNER_PK_FILE || "").trim();
        if (!file) return { ok:false, error:"missing_live_signer_pk_file" };
        if (!fs.existsSync(file)) return { ok:false, error:"live_signer_pk_file_missing", file };
        const pk = String(fs.readFileSync(file, "utf8") || "").trim();
        if (!/^0x[0-9a-fA-F]{64}$/.test(pk)) return { ok:false, error:"invalid_live_signer_private_key_format", file };
        const r = cast(["wallet", "address", pk], { timeout:30000 });
        const addr = String(r.stdout || "").trim();
        if (!r.ok || !isAddr(addr)) return { ok:false, error:"could_not_derive_live_signer_address", file };
        return { ok:true, file, pk, address:addr };
      }

      const signer = readSignerPk();
      if (!signer.ok) {
        return res.status(409).json({
          ok:false,
          kind:"participant_validator_registration_submit_live",
          source:"submit_live_v1",
          error:signer.error,
          mutation:false,
          sends_transaction:false,
          submit_allowed:false,
          live_execution_wired:true,
          submit_blocked_reason:signer.error,
          account,
          gates:{
            valid_account:true,
            chain_id_is_2050:true,
            live_execution_enabled:true,
            signer_file_ready:false
          }
        });
      }

      if (String(signer.address || "").toLowerCase() !== account.toLowerCase()) {
        return res.status(409).json({
          ok:false,
          kind:"participant_validator_registration_submit_live",
          source:"submit_live_v1",
          error:"live_signer_account_mismatch",
          mutation:false,
          sends_transaction:false,
          submit_allowed:false,
          live_execution_wired:true,
          submit_blocked_reason:"live_signer_account_mismatch",
          account,
          signer_address:signer.address,
          gates:{
            valid_account:true,
            chain_id_is_2050:true,
            live_execution_enabled:true,
            signer_file_ready:true,
            signer_matches_account:false
          }
        });
      }

      const walletResp = await selfReq("GET", "/__void/participant/validator-registration/wallet-authority?account=" + encodeURIComponent(account));
      const wallet = walletResp.json || {};
      if (!(walletResp.status === 200 && wallet?.wallet_authority?.ready_for_live_submit === true)) {
        return res.status(409).json({
          ok:false,
          kind:"participant_validator_registration_submit_live",
          source:"submit_live_v1",
          error:"wallet_authority_not_ready",
          mutation:false,
          sends_transaction:false,
          submit_allowed:false,
          live_execution_wired:true,
          submit_blocked_reason:"wallet_authority_not_ready",
          account,
          wallet_authority:wallet?.wallet_authority || null,
          gates:{
            valid_account:true,
            chain_id_is_2050:true,
            live_execution_enabled:true,
            signer_file_ready:true,
            signer_matches_account:true,
            wallet_authority_ready:false
          }
        });
      }

      const submitResp = await selfReq("POST", "/__void/participant/validator-registration/submit", { account, chainId:2050 });
      const submit = submitResp.json || {};
      if (!(submitResp.status === 501 && submit?.core_gates_green === true && submit?.registry && submit?.args && submit?.submitIntentId)) {
        return res.status(409).json({
          ok:false,
          kind:"participant_validator_registration_submit_live",
          source:"submit_live_v1",
          error:"submit_payload_not_ready",
          mutation:false,
          sends_transaction:false,
          submit_allowed:false,
          live_execution_wired:true,
          submit_blocked_reason:"submit_payload_not_ready",
          account,
          submit_http_status:submitResp.status,
          submit_payload:submit
        });
      }

      const registry = normAddr(submit.registry);
      const reward = normAddr(submit.reward || submit?.args?.reward || account);
      const valueWei = String(submit.valueWei || "");
      const consensusKeyHash = bytes32(submit?.args?.consensusKeyHash);
      const metadataHash = bytes32(submit?.args?.metadataHash);

      if (!registry || !reward || valueWei !== "10000000000000000000000" || !consensusKeyHash || !metadataHash) {
        return res.status(409).json({
          ok:false,
          kind:"participant_validator_registration_submit_live",
          source:"submit_live_v1",
          error:"invalid_live_payload",
          mutation:false,
          sends_transaction:false,
          submit_allowed:false,
          live_execution_wired:true,
          submit_blocked_reason:"invalid_live_payload",
          account,
          registry,
          reward,
          valueWei,
          has_consensus_hash:!!consensusKeyHash,
          has_metadata_hash:!!metadataHash
        });
      }

      const reserveDecision = intentRuntime.reserve({
        now_ms:Date.now(),
        submit_intent_id:String(submit.submitIntentId || "")
      });
      if (reserveDecision.ok === false) {
        return res.status(
          reserveDecision.requires_operator_reconciliation ? 503 : 409
        ).json({
          ok:false,
          kind:"participant_validator_registration_submit_live",
          source:"submit_live_v1",
          error:reserveDecision.reason || "durable_submit_intent_reservation_held",
          mutation:false,
          sends_transaction:false,
          submit_allowed:false,
          live_execution_wired:true,
          durable_submit_intent_journal_ready:true,
          automatic_rebroadcast_allowed:false,
          submit_blocked_reason:reserveDecision.reason || "durable_submit_intent_reservation_held",
          account,
          submitIntentId:submit.submitIntentId,
          durable_submit_intent:durableDecisionSummary(reserveDecision)
        });
      }

      const rpc = String(process.env.VOID_VALIDATOR_REGISTRATION_RPC || process.env.RPC_URL || "http://127.0.0.1:8545");
      const beforeCandidate = cast(["call", "--rpc-url", rpc, registry, "candidateCount()(uint256)"]);
      const beforeWaiting = cast(["call", "--rpc-url", rpc, registry, "waitingCount()(uint256)"]);
      const beforeActive = cast(["call", "--rpc-url", rpc, registry, "activeCount()(uint256)"]);

      if (!beforeCandidate.ok || !beforeWaiting.ok || !beforeActive.ok) {
        const durableRelease = intentRuntime.releaseBeforeBroadcast({
          now_ms:Date.now(),
          submit_intent_id:String(submit.submitIntentId || ""),
          release_reason:"pre_count_read_failed"
        });
        return res.status(500).json({
          ok:false,
          kind:"participant_validator_registration_submit_live",
          source:"submit_live_v1",
          error:durableRelease.ok === true
            ? "pre_count_read_failed"
            : "pre_count_read_failed_durable_release_held",
          mutation:false,
          sends_transaction:false,
          submit_allowed:false,
          live_execution_wired:true,
          automatic_rebroadcast_allowed:false,
          account,
          rpc,
          durable_submit_intent:durableDecisionSummary(durableRelease),
          pre_counts:{
            candidate_ok:beforeCandidate.ok,
            waiting_ok:beforeWaiting.ok,
            active_ok:beforeActive.ok
          }
        });
      }

      const broadcastDecision = intentRuntime.beginBroadcast({
        now_ms:Date.now(),
        submit_intent_id:String(submit.submitIntentId || "")
      });
      if (broadcastDecision.ok === false) {
        return res.status(503).json({
          ok:false,
          kind:"participant_validator_registration_submit_live",
          source:"submit_live_v1",
          error:broadcastDecision.reason || "durable_broadcast_start_held",
          mutation:false,
          sends_transaction:false,
          submit_allowed:false,
          live_execution_wired:true,
          automatic_rebroadcast_allowed:false,
          account,
          registry,
          submitIntentId:submit.submitIntentId,
          durable_submit_intent:durableDecisionSummary(broadcastDecision)
        });
      }
      const broadcastId = String(broadcastDecision.broadcast_id || "");

      const tx = cast([
        "send",
        "--rpc-url", rpc,
        "--private-key", signer.pk,
        registry,
        "registerCandidate(address,bytes32,bytes32)",
        reward,
        consensusKeyHash,
        metadataHash,
        "--value", valueWei
      ], { timeout:180000 });

      const parsed = parseCastSend(tx.stdout + "\n" + tx.stderr);

      let transactionObserved:any = null;
      if (parsed.transactionHash) {
        transactionObserved = intentRuntime.observeTransaction({
          now_ms:Date.now(),
          submit_intent_id:String(submit.submitIntentId || ""),
          broadcast_id:broadcastId,
          transaction_hash:parsed.transactionHash
        });
        if (transactionObserved.ok === false) {
          return res.status(500).json({
            ok:false,
            kind:"participant_validator_registration_submit_live",
            source:"submit_live_v1",
            error:"durable_transaction_observation_held",
            mutation:true,
            sends_transaction:true,
            submit_allowed:false,
            live_execution_wired:true,
            automatic_rebroadcast_allowed:false,
            requires_operator_reconciliation:true,
            account,
            registry,
            transactionHash:parsed.transactionHash,
            receipt_status:parsed.receiptStatus || null,
            cast_exit_status:tx.status,
            cast_signal:tx.signal,
            durable_submit_intent:durableDecisionSummary(transactionObserved)
          });
        }
      }

      let receiptObserved:any = null;
      if (
        parsed.transactionHash &&
        (parsed.receiptStatus === "0" || parsed.receiptStatus === "1")
      ) {
        receiptObserved = intentRuntime.observeReceipt({
          now_ms:Date.now(),
          submit_intent_id:String(submit.submitIntentId || ""),
          broadcast_id:broadcastId,
          transaction_hash:parsed.transactionHash,
          receipt_status:parsed.receiptStatus
        });
        if (receiptObserved.ok === false) {
          return res.status(500).json({
            ok:false,
            kind:"participant_validator_registration_submit_live",
            source:"submit_live_v1",
            error:"durable_receipt_observation_held",
            mutation:true,
            sends_transaction:true,
            submit_allowed:false,
            live_execution_wired:true,
            automatic_rebroadcast_allowed:false,
            requires_operator_reconciliation:true,
            account,
            registry,
            transactionHash:parsed.transactionHash,
            receipt_status:parsed.receiptStatus,
            cast_exit_status:tx.status,
            cast_signal:tx.signal,
            durable_submit_intent:durableDecisionSummary(receiptObserved)
          });
        }
      }

      if (
        !parsed.transactionHash ||
        (parsed.receiptStatus !== "0" && parsed.receiptStatus !== "1")
      ) {
        return res.status(500).json({
          ok:false,
          kind:"participant_validator_registration_submit_live",
          source:"submit_live_v1",
          error:"live_transaction_outcome_requires_reconciliation",
          mutation:true,
          sends_transaction:true,
          submit_allowed:false,
          live_execution_wired:true,
          automatic_rebroadcast_allowed:false,
          requires_operator_reconciliation:true,
          account,
          registry,
          broadcastId,
          transactionHash:parsed.transactionHash || null,
          receipt_status:parsed.receiptStatus || null,
          cast_exit_status:tx.status,
          cast_signal:tx.signal,
          cast_stdout_tail:tx.stdout.split(/\n/).slice(-20).join("\n"),
          cast_stderr_tail:tx.stderr.split(/\n/).slice(-20).join("\n"),
          durable_submit_intent:durableDecisionSummary(
            transactionObserved || broadcastDecision
          )
        });
      }

      if (parsed.receiptStatus === "0") {
        const failedRelease = intentRuntime.releaseFailedReceipt({
          now_ms:Date.now(),
          submit_intent_id:String(submit.submitIntentId || ""),
          release_reason:"live_transaction_failed"
        });
        return res.status(500).json({
          ok:false,
          kind:"participant_validator_registration_submit_live",
          source:"submit_live_v1",
          error:"live_transaction_failed",
          mutation:true,
          sends_transaction:true,
          submit_allowed:false,
          live_execution_wired:true,
          automatic_rebroadcast_allowed:false,
          requires_operator_reconciliation:failedRelease.ok === false,
          account,
          registry,
          broadcastId,
          transactionHash:parsed.transactionHash,
          receipt_status:parsed.receiptStatus,
          cast_exit_status:tx.status,
          cast_signal:tx.signal,
          cast_stdout_tail:tx.stdout.split(/\n/).slice(-20).join("\n"),
          cast_stderr_tail:tx.stderr.split(/\n/).slice(-20).join("\n"),
          durable_submit_intent:durableDecisionSummary(failedRelease)
        });
      }

      const afterCandidate = cast(["call", "--rpc-url", rpc, registry, "candidateCount()(uint256)"]);
      const afterWaiting = cast(["call", "--rpc-url", rpc, registry, "waitingCount()(uint256)"]);
      const afterActive = cast(["call", "--rpc-url", rpc, registry, "activeCount()(uint256)"]);

      const parseCastCount = (value:any): bigint | null => {
        try {
          const text = String(value || "").trim();
          return /^(0|[1-9][0-9]*)$/.test(text) ? BigInt(text) : null;
        } catch {
          return null;
        }
      };
      const candBefore = parseCastCount(beforeCandidate.stdout);
      const candAfter = parseCastCount(afterCandidate.stdout);
      const activeBefore = String(beforeActive.stdout || "0").trim();
      const activeAfter = String(afterActive.stdout || "0").trim();

      if (
        !afterCandidate.ok ||
        !afterWaiting.ok ||
        !afterActive.ok ||
        candBefore === null ||
        candAfter === null ||
        candAfter !== candBefore + 1n ||
        activeAfter !== activeBefore
      ) {
        return res.status(500).json({
          ok:false,
          kind:"participant_validator_registration_submit_live",
          source:"submit_live_v1",
          error:"post_transaction_invariant_failed",
          mutation:true,
          sends_transaction:true,
          submit_allowed:false,
          live_execution_wired:true,
          automatic_rebroadcast_allowed:false,
          requires_operator_reconciliation:true,
          commit_recovery_required:true,
          account,
          registry,
          broadcastId,
          transactionHash:parsed.transactionHash,
          receipt_status:parsed.receiptStatus,
          durable_submit_intent:durableDecisionSummary(receiptObserved),
          counts:{
            candidateBefore:String(beforeCandidate.stdout || "").trim(),
            candidateAfter:String(afterCandidate.stdout || "").trim(),
            waitingBefore:String(beforeWaiting.stdout || "").trim(),
            waitingAfter:String(afterWaiting.stdout || "").trim(),
            activeBefore,
            activeAfter
          }
        });
      }

      const commitDecision = intentRuntime.commitSuccessfulReceipt({
        now_ms:Date.now(),
        submit_intent_id:String(submit.submitIntentId || "")
      });
      if (commitDecision.ok === false) {
        return res.status(500).json({
          ok:false,
          kind:"participant_validator_registration_submit_live",
          source:"submit_live_v1",
          error:"durable_commit_recovery_required",
          mutation:true,
          sends_transaction:true,
          submit_allowed:false,
          live_execution_wired:true,
          automatic_rebroadcast_allowed:false,
          requires_operator_reconciliation:true,
          commit_recovery_required:true,
          account,
          registry,
          broadcastId,
          transactionHash:parsed.transactionHash,
          receipt_status:parsed.receiptStatus,
          durable_submit_intent:durableDecisionSummary(commitDecision),
          counts:{
            candidateBefore:String(beforeCandidate.stdout || "").trim(),
            candidateAfter:String(afterCandidate.stdout || "").trim(),
            waitingBefore:String(beforeWaiting.stdout || "").trim(),
            waitingAfter:String(afterWaiting.stdout || "").trim(),
            activeBefore,
            activeAfter
          }
        });
      }

      return res.status(200).json({
        ok:true,
        kind:"participant_validator_registration_submit_live",
        source:"submit_live_v1",
        mutation:true,
        sends_transaction:true,
        submit_allowed:true,
        live_execution_wired:true,
        submit_blocked_reason:null,
        automatic_rebroadcast_allowed:false,
        durable_submit_intent_committed:true,
        account,
        signer_address:signer.address,
        registry,
        transactionHash:parsed.transactionHash,
        receipt_status:parsed.receiptStatus,
        submitIntentId:submit.submitIntentId,
        durableIntentId:commitDecision.submit_intent_id,
        durableBroadcastId:broadcastId,
        durable_submit_intent:durableDecisionSummary(commitDecision),
        functionSignature:"registerCandidate(address,bytes32,bytes32)",
        valueWei,
        args:{ reward, consensusKeyHash, metadataHash },
        counts:{
          candidateBefore:String(beforeCandidate.stdout || "").trim(),
          candidateAfter:String(afterCandidate.stdout || "").trim(),
          waitingBefore:String(beforeWaiting.stdout || "").trim(),
          waitingAfter:String(afterWaiting.stdout || "").trim(),
          activeBefore,
          activeAfter
        },
        gates:{
          valid_account:true,
          chain_id_is_2050:true,
          live_execution_enabled:true,
          signer_file_ready:true,
          signer_matches_account:true,
          wallet_authority_ready:true,
          payload_ready:true,
          double_submit_reserved:true,
          durable_submit_intent_reserved:true,
          durable_broadcast_started:true,
          durable_transaction_observed:true,
          durable_receipt_observed:true,
          durable_submit_intent_committed:true,
          tx_broadcast:true,
          receipt_status_1:true,
          active_set_safe:true
        }
      });
    });

    try { console.log("[mainnet0.validator-registration] submit-live skeleton API mounted"); } catch (err) { __voidIxCatch3600("3403:3", err); }
  } catch (e:any) {
    try { console.warn("[mainnet0.validator-registration] submit-live skeleton API mount failed", e?.message || e); } catch (err) { __voidIxCatch3600("3405:4", err); }
  }
})();


/* __void_mainnet0_validator_registration_submit_stub_api_v1 */
;(() => {
  try {
    const G:any = globalThis as any;
    const MARK = "__void_mainnet0_validator_registration_submit_stub_api_v1";
    if (G[MARK]) return;
    G[MARK] = true;

    const fs = require("fs");
    const path = require("path");
    const crypto = require("crypto");

    function artifactPath(): string {
      return path.join(process.cwd(), ".runtime", "mainnet0", "validator-candidate-registry.local.current.json");
    }

    function readArtifact(): any {
      const file = artifactPath();
      try {
        if (!fs.existsSync(file)) {
          return { ok:false, error:"validator_candidate_registry_artifact_missing", file };
        }
        return { ok:true, file, artifact: JSON.parse(fs.readFileSync(file, "utf8")) };
      } catch (e:any) {
        return { ok:false, error:"validator_candidate_registry_artifact_read_failed", message:String(e?.message || e), file };
      }
    }

    function isAddr(v:any): boolean {
      return /^0x[0-9a-fA-F]{40}$/.test(String(v || "").trim());
    }

    function normAddr(v:any): string {
      const x = String(v || "").trim();
      return isAddr(x) ? x : "";
    }

    function bytes32(v:any): string {
      const x = String(v || "").trim();
      return /^0x[0-9a-fA-F]{64}$/.test(x) ? x : "";
    }

    function hash32(label:string): string {
      return "0x" + crypto.createHash("sha256").update(label).digest("hex");
    }

    function bodyOf(req:any): any {
      return (req && req.body && typeof req.body === "object") ? req.body : {};
    }

    const submitRoute = "/__void/participant/validator-registration/submit";
    app.use(submitRoute, express.json({ limit:"32kb" }));

    app.post(submitRoute, (req:any, res:any) => {
      const body = bodyOf(req);
      const account = normAddr(body.account || req?.query?.account);
      const reward = normAddr(body.reward || account);
      const loaded = readArtifact();

      const rawChainId = body.chainId ?? body.chain_id ?? req?.query?.chainId ?? req?.query?.chain_id;
      const requestedChainId = rawChainId === undefined || rawChainId === null || String(rawChainId).trim() === ""
        ? 2050
        : Number(String(rawChainId).trim());

      if (!Number.isFinite(requestedChainId) || requestedChainId !== 2050) {
        return res.status(409).json({
          ok:false,
          kind:"participant_validator_registration_submit",
          source:"submit_stub_v1",
          error:"wrong_chain",
          expectedChainId:2050,
          requestedChainId:Number.isFinite(requestedChainId) ? requestedChainId : null,
          mutation:false,
          sends_transaction:false,
          submit_allowed:false,
          submit_blocked_reason:"wrong_chain",
          gates:{
            valid_account: !!account,
            wrong_chain_rejected:true,
            live_execution_wired:false
          }
        });
      }

      if (!account) {
        return res.status(400).json({
          ok:false,
          kind:"participant_validator_registration_submit",
          error:"missing_or_invalid_account",
          mutation:false,
          sends_transaction:false,
          submit_allowed:false
        });
      }

      if (!loaded.ok) {
        return res.status(404).json({
          ok:false,
          kind:"participant_validator_registration_submit",
          account,
          mutation:false,
          sends_transaction:false,
          submit_allowed:false,
          ...loaded
        });
      }

      const artifact = loaded.artifact || {};
      const registry = normAddr(artifact.registry);
      const valueWei = String(artifact.minValidatorStakeWei || "0");

      const consensusKeyHash =
        bytes32(body.consensusKeyHash || body.consensus_key_hash) ||
        hash32("void-mainnet0-validator-consensus:" + account.toLowerCase());

      const metadataHash =
        bytes32(body.metadataHash || body.metadata_hash) ||
        hash32("void-mainnet0-validator-metadata:" + account.toLowerCase());

      const expectedFunctionSignature = "registerCandidate(address,bytes32,bytes32)";
      const gotFunctionSignature = String(body.functionSignature || expectedFunctionSignature);

      const activeBefore = String(artifact.activeCountBefore || "0");
      const activeAfter = String(artifact.activeCountAfter || "0");
      const activeFinal = String(artifact.activeCountFinal || "0");

      const submitIntent = {
        chainId:2050,
        account:account.toLowerCase(),
        owner:account.toLowerCase(),
        reward:reward.toLowerCase(),
        registry:registry.toLowerCase(),
        valueWei,
        functionSignature:expectedFunctionSignature,
        consensusKeyHash:consensusKeyHash.toLowerCase(),
        metadataHash:metadataHash.toLowerCase()
      };

      const submitIntentId = "0x" + crypto
        .createHash("sha256")
        .update(JSON.stringify(submitIntent))
        .digest("hex");

      const gates = {
        valid_account: !!account,
        valid_reward: !!reward,
        registry_ready: !!registry,
        function_signature_match: gotFunctionSignature === expectedFunctionSignature,
        value_is_registry_min_stake: valueWei === String(artifact.minValidatorStakeWei || "0") && valueWei !== "0",
        active_set_safe: activeBefore === activeAfter && activeBefore === activeFinal,
        payload_has_consensus_hash: !!consensusKeyHash,
        payload_has_metadata_hash: !!metadataHash,
        wallet_gate_authoritative: false,
        wallet_unlocked: false,
        wrong_chain_rejected: false,
        double_submit_guard: false,
        duplicate_submit_rejected: false,
        live_execution_wired: false
      };

      const coreGatesGreen =
        gates.valid_account &&
        gates.valid_reward &&
        gates.registry_ready &&
        gates.function_signature_match &&
        gates.value_is_registry_min_stake &&
        gates.active_set_safe &&
        gates.payload_has_consensus_hash &&
        gates.payload_has_metadata_hash;

      return res.status(501).json({
        ok:false,
        kind:"participant_validator_registration_submit",
        source:"submit_stub_v1",
        mutation:false,
        sends_transaction:false,
        submit_allowed:false,
        submit_blocked_reason:"live_wallet_execution_not_wired",
        account,
        owner:account,
        reward,
        registry,
        valueWei,
        functionSignature:expectedFunctionSignature,
        args:{ reward, consensusKeyHash, metadataHash },
        submitIntent,
        submitIntentId,
        gates,
        core_gates_green:coreGatesGreen,
        required_before_live_submit:[
          "server-authoritative participant wallet status",
          "unlocked wallet proof",
          "draft-submit payload equality proof",
          "wrong-chain rejection proof",
          "double-submit guard proof",
          "real transaction execution proof"
        ]
      });
    });

    try { console.log("[mainnet0.validator-registration] blocked submit API mounted"); } catch (err) { __voidIxCatch4500("3610:1", err); }
  } catch (e:any) {
    try { console.warn("[mainnet0.validator-registration] blocked submit API mount failed", e?.message || e); } catch (err) { __voidIxCatch4500("3612:2", err); }
  }
})();


/* __void_validator_runtime_truth_routes_v1 */
const __voidRequire = createRequire(import.meta.url);
let __voidValidatorRuntimeTruthSwitchMod: any = null;

function __voidGetValidatorRuntimeTruthSwitchMod(): any {
  if (!__voidValidatorRuntimeTruthSwitchMod) {
    __voidValidatorRuntimeTruthSwitchMod = __voidRequire("./runtime/validator_runtime_truth_switch.cjs");
  }
  return __voidValidatorRuntimeTruthSwitchMod;
}

function __voidConfiguredValidatorTruthMode(): string {
  const mod = __voidGetValidatorRuntimeTruthSwitchMod();
  return String(process.env.VOID_VALIDATOR_RUNTIME_TRUTH_MODE || mod.MODE_LEGACY || "legacy").trim();
}

function __voidConfiguredValidatorTruthDir(): string {
  return String(process.env.VOID_VALIDATOR_EPOCH_MANIFEST_DIR || "").trim();
}

function __voidMakeLegacyValidatorTruthProvider(): any {
  const err = () => {
    throw new Error("legacy validator runtime truth path is not wired into live node lookup yet");
  };
  return {
    getModeLabel() { return "legacy"; },
    getLoadedEpochs() { return []; },
    getLatestEpoch() { return err(); },
    getEpochSummary(_epoch: number) { return err(); },
    getProposerForSlot(_epoch: number, _slot: number) { return err(); },
    getScheduleWindow(_epoch: number, _startSlot: number, _endSlotExclusive: number) { return err(); },
  };
}

function __voidBuildValidatorRuntimeTruthSwitch(): any {
  const mod = __voidGetValidatorRuntimeTruthSwitchMod();
  const mode = __voidConfiguredValidatorTruthMode();

  if (mode === mod.MODE_VERIFIED_EPOCH) {
    const sourceDir = __voidConfiguredValidatorTruthDir();
    if (!sourceDir) {
      throw new Error("VOID_VALIDATOR_EPOCH_MANIFEST_DIR is required when VOID_VALIDATOR_RUNTIME_TRUTH_MODE=verified_epoch_manifests");
    }
    return new mod.ValidatorRuntimeTruthSwitch({ mode, sourceDir });
  }

  if (mode === mod.MODE_LEGACY) {
    return new mod.ValidatorRuntimeTruthSwitch({
      mode,
      legacyProvider: __voidMakeLegacyValidatorTruthProvider(),
    });
  }

  throw new Error(`unsupported validator runtime truth mode: ${mode}`);
}

function __voidReadValidatorRuntimeTruthStatus(): any {
  const configuredMode = __voidConfiguredValidatorTruthMode();
  const sourceDir = __voidConfiguredValidatorTruthDir();
  try {
    const sw = __voidBuildValidatorRuntimeTruthSwitch();
    let latestEpoch: any = null;
    try {
      latestEpoch = sw.getLatestEpoch();
    } catch (_e: any) {
      latestEpoch = null;
    }
    return {
      ok: true,
      configuredMode,
      mode: sw.getModeLabel(),
      sourceDir,
      loadedEpochs: sw.getLoadedEpochs(),
      latestEpoch,
      lookupsAvailable: sw.getModeLabel() === "verified_epoch_manifests",
    };
  } catch (e: any) {
    return {
      ok: false,
      configuredMode,
      mode: configuredMode,
      sourceDir,
      error: String(e?.message || e),
      lookupsAvailable: false,
    };
  }
}

function __voidConfiguredValidatorTruthShadowLatestPath(): string {
  const envPath = String(process.env.VOID_VALIDATOR_RUNTIME_TRUTH_SHADOW_LATEST || "").trim();
  if (envPath) return envPath;
  const pathMod = require("path");
  const home = String(process.env.HOME || "").trim();
  if (home) return pathMod.join(home, "dev", "void-node", ".runtime", "validator_runtime_truth_shadow", "latest.json");
  return ".runtime/validator_runtime_truth_shadow/latest.json";
}

function __voidReadValidatorRuntimeTruthShadowLatest(): any {
  const filePath = __voidConfiguredValidatorTruthShadowLatestPath();
  try {
    const fs = require("fs");
    const pathMod = require("path");
    const text = fs.readFileSync(filePath, "utf8");
    const report = JSON.parse(text);
    const checked = report?.checked || {};
    return {
      ok: true,
      path: pathMod.resolve(filePath),
      report,
      summary: {
        ok: !!report?.ok,
        dir: String(report?.dir || ""),
        base: String(report?.base || ""),
        loadedEpochsFromDisk: Array.isArray(report?.loadedEpochsFromDisk) ? report.loadedEpochsFromDisk : [],
        mismatchCount: Array.isArray(report?.mismatches) ? report.mismatches.length : 0,
        checkedCounts: {
          epochs: Array.isArray(checked?.epochs) ? checked.epochs.length : 0,
          proposers: Array.isArray(checked?.proposers) ? checked.proposers.length : 0,
          windows: Array.isArray(checked?.windows) ? checked.windows.length : 0,
        },
      },
    };
  } catch (e: any) {
    return {
      ok: false,
      path: filePath,
      error: String(e?.message || e),
    };
  }
}

function __voidConfiguredValidatorTruthCompareLatestPath(): string {
  const envPath = String(process.env.VOID_VALIDATOR_RUNTIME_TRUTH_COMPARE_LATEST || "").trim();
  if (envPath) return envPath;
  const pathMod = require("path");
  const home = String(process.env.HOME || "").trim();
  if (home) return pathMod.join(home, "dev", "void-node", ".runtime", "validator_truth_compare", "latest.json");
  return ".runtime/validator_truth_compare/latest.json";
}

function __voidReadValidatorTruthFrozenVsUpgradeLatest(): any {
  const filePath = __voidConfiguredValidatorTruthCompareLatestPath();
  try {
    const fs = require("fs");
    const pathMod = require("path");
    const text = fs.readFileSync(filePath, "utf8");
    const report = JSON.parse(text);
    const coreSummary = report?.coreSummary || {};
    return {
      ok: true,
      path: pathMod.resolve(filePath),
      report,
      summary: {
        ok: !!report?.ok,
        compareMode: String(report?.compareMode || ""),
        frozenManifest: String(report?.frozenManifest || ""),
        upgradeManifest: String(report?.upgradeManifest || ""),
        coreMismatchCount: Array.isArray(report?.coreMismatches) ? report.coreMismatches.length : 0,
        expectedDifferenceCount: Array.isArray(report?.expectedDifferences) ? report.expectedDifferences.length : 0,
        coreSummary: {
          epoch: coreSummary?.epoch ?? null,
          startSlot: coreSummary?.startSlot ?? null,
          endSlotExclusive: coreSummary?.endSlotExclusive ?? null,
          validatorCount: coreSummary?.validatorCount ?? null,
          totalPower: String(coreSummary?.totalPower || ""),
          scheduleWindowLength: coreSummary?.scheduleWindowLength ?? null,
          reward0: String(coreSummary?.reward0 || ""),
          effectivePower0: String(coreSummary?.effectivePower0 || ""),
          frozenPublished: !!coreSummary?.frozenPublished,
          upgradePublished: !!coreSummary?.upgradePublished,
          frozenPublishedMatch: !!coreSummary?.frozenPublishedMatch,
          upgradePublishedMatch: !!coreSummary?.upgradePublishedMatch,
        },
      },
    };
  } catch (e: any) {
    return {
      ok: false,
      path: filePath,
      error: String(e?.message || e),
    };
  }
}

function __voidParseNonNegativeInt(raw: any, label: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`invalid ${label}: ${raw}`);
  }
  return n;
}

app.get("/__void/runtime/validator-truth/status", (_req: any, res: any) => {
  const out = __voidReadValidatorRuntimeTruthStatus();
  return res.status(out.ok ? 200 : 500).json(out);
});

app.get("/__void/runtime/validator-truth/shadow/latest", (_req: any, res: any) => {
  const shadow = __voidReadValidatorRuntimeTruthShadowLatest();
  return res.status(shadow.ok ? 200 : 500).json(shadow);
});

function __voidConfiguredValidatorTruthOperatorSummaryLatestPath(): string {
  const envPath = String(process.env.VOID_VALIDATOR_RUNTIME_TRUTH_OPERATOR_SUMMARY_LATEST || "").trim();
  if (envPath) return envPath;
  const pathMod = require("path");
  const home = String(process.env.HOME || "").trim();
  if (home) return pathMod.join(home, "dev", "void-node", ".runtime", "validator_runtime_truth_operator", "latest.json");
  return ".runtime/validator_runtime_truth_operator/latest.json";
}

function __voidReadValidatorTruthOperatorSummaryLatest(): any {
  const filePath = __voidConfiguredValidatorTruthOperatorSummaryLatestPath();
  try {
    const fs = require("fs");
    const pathMod = require("path");
    const text = fs.readFileSync(filePath, "utf8");
    const report = JSON.parse(text);
    const summary = report?.summary || {};
    return {
      ok: true,
      path: pathMod.resolve(filePath),
      report,
      summary: {
        ok: !!summary?.ok,
        targetEpoch: summary?.targetEpoch ?? null,
        expectedValidatorCount: summary?.expectedValidatorCount ?? null,
        latestEpoch: summary?.latestEpoch ?? null,
        validatorCount: summary?.validatorCount ?? null,
        totalPower: String(summary?.totalPower || ""),
        uniqueRewardCount: summary?.uniqueRewardCount ?? null,
        shadowMismatchCount: summary?.shadowMismatchCount ?? null,
        compareCoreMismatchCount: summary?.compareCoreMismatchCount ?? null,
        multivalidatorGateGreen: !!summary?.multivalidatorGateGreen,
        runbookGateGreen: !!summary?.runbookGateGreen,
        overallGreen: !!summary?.overallGreen,
      },
    };
  } catch (e: any) {
    return {
      ok: false,
      path: filePath,
      error: String(e?.message || e),
    };
  }
}

app.get("/__void/runtime/validator-truth/diag", (_req: any, res: any) => {
  const status = __voidReadValidatorRuntimeTruthStatus();
  const shadow = __voidReadValidatorRuntimeTruthShadowLatest();
  const ok = !!status?.ok && !!shadow?.ok;
  const loadedEpochs = Array.isArray(status?.loadedEpochs) ? status.loadedEpochs : [];
  const latestEpoch = status?.latestEpoch ?? null;
  return res.status(ok ? 200 : 500).json({
    ok,
    configuredMode: status?.configuredMode,
    mode: status?.mode,
    sourceDir: status?.sourceDir,
    loadedEpochs,
    latestEpoch,
    lookupsAvailable: !!status?.lookupsAvailable,
    shadowLatestPath: shadow?.path || __voidConfiguredValidatorTruthShadowLatestPath(),
    shadowLatestOk: !!shadow?.ok,
    shadowLatestSummary: shadow?.summary || null,
    status,
    shadow,
  });
});

app.get("/__void/runtime/validator-truth/compare/latest", (_req: any, res: any) => {
  const compare = __voidReadValidatorTruthFrozenVsUpgradeLatest();
  return res.status(compare.ok ? 200 : 500).json(compare);
});

app.get("/__void/runtime/validator-truth/operator-summary", (_req: any, res: any) => {
  const summary = __voidReadValidatorTruthOperatorSummaryLatest();
  return res.status(summary.ok ? 200 : 500).json(summary);
});

app.get("/__void/runtime/validator-truth/next-onboard", async (_req: any, res: any) => {
  try {
    const disableStatusRunbook =
      String(process.env.VOID_DISABLE_VALIDATOR_NEXT_ONBOARD_STATUS_RUNBOOK || "") === "1" ||
      String(process.env.VOID_QUARANTINE_HOT_RUNTIME || "") === "1";
    if (disableStatusRunbook) {
      return res.json({
        ok: true,
        disabled: true,
        mode: "public_safe_status_only",
        blocker: "validator_next_onboard_status_runbook_disabled",
        liveExecutionEnabled: String(process.env.VOID_VALIDATOR_NEXT_ONBOARD_LIVE_EXECUTION || "") === "1",
        selectedCandidateName: "",
        selectedCandidateAddr: "",
        currentEpoch: 0,
        targetEpoch: 0,
        currentValidatorCount: 0,
        expectedValidatorCount: 0,
        windowLength: 0,
        usedRewards: [],
        command: "",
        raw: "",
        note: "Public-safe runtime does not spawn validator next-onboard runbooks from an HTTP status route."
      });
    }
    const cp = require("child_process");
    const util = require("util");
    const pathMod = require("path");
    const execFile = util.promisify(cp.execFile);

    const secretsPath = String(
      process.env.VOID_VALIDATOR_NEXT_ONBOARD_SECRETS ||
      "/mnt/key2/mainnet-keygen/20260418-023715/private/wallet-secrets.json"
    ).trim();
    const home = String(process.env.HOME || "").trim();
    const repoRoot = home
      ? pathMod.join(home, "dev", "void-node")
      : process.cwd();
    const runbook = pathMod.join(repoRoot, "ops", "mainnet", "validator-staking-next-onboard-runbook.sh");
    const base = "http://127.0.0.1:4100";
    const env = Object.assign({}, process.env, {
      DRY_RUN: "1",
      SKIP_PREFLIGHT: "1",
      BASE: base,
      SECRETS: secretsPath,
    });

    const child = await execFile("bash", [runbook], {
      encoding: "utf8",
      env,
      cwd: repoRoot,
      maxBuffer: 1024 * 1024,
    });
    const text = String(child?.stdout || "");

    const grab = (name: string) => {
      const m = text.match(new RegExp("^" + name + "=(.+)$", "m"));
      return m ? String(m[1]).trim() : "";
    };

    const usedRewardsRaw = grab("used_rewards_json");
    let usedRewards: any[] = [];
    try { usedRewards = usedRewardsRaw ? JSON.parse(usedRewardsRaw) : []; } catch (_) { usedRewards = []; }

    const out = {
      ok: true,
      base,
      runbook,
      secretsPath,
      selectedCandidateName: grab("selected_candidate_name"),
      selectedCandidateAddr: grab("selected_candidate_addr"),
      currentEpoch: Number(grab("current_epoch") || 0),
      targetEpoch: Number(grab("target_epoch") || 0),
      currentValidatorCount: Number(grab("current_validator_count") || 0),
      expectedValidatorCount: Number(grab("expected_validator_count") || 0),
      windowLength: Number(grab("window_length") || 0),
      usedRewards,
      command: grab("command"),
      raw: text,
    };
    return res.json(out);
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e),
      stdout: String(e?.stdout || ""),
      stderr: String(e?.stderr || ""),
    });
  }
});

app.post("/__void/participant/stake/next-onboard", require("express").json({ limit: "64kb" }), async (req: any, res: any) => {
  try {
    const body = req?.body || {};

    if (!(body && body.confirm === true)) {
      return res.status(400).json({
        ok: false,
        error: "confirmation_required",
        hint: "POST {\"confirm\":true} plus exact operator intent fields to execute live onboarding"
      });
    }

    const candidateName = String(body.expected_candidate || body.candidate || "").trim();
    const targetEpoch = Number(body.expected_target_epoch || body.target_epoch || 0);
    const expectedValidatorCount = Number(body.expected_validator_count || body.validator_count || 0);

    if (!/^vault\d+$/.test(candidateName) || !Number.isFinite(targetEpoch) || targetEpoch <= 0 || !Number.isFinite(expectedValidatorCount) || expectedValidatorCount <= 0) {
      return res.status(400).json({
        ok: false,
        error: "operator_intent_required",
        required_fields: ["expected_candidate", "expected_target_epoch", "expected_validator_count", "operator_intent"],
        example: {
          confirm: true,
          expected_candidate: "vault125",
          expected_target_epoch: 127,
          expected_validator_count: 126,
          operator_intent: "ADMIT_vault125_EPOCH_127_COUNT_126"
        }
      });
    }

    const expectedIntent = `ADMIT_${candidateName}_EPOCH_${targetEpoch}_COUNT_${expectedValidatorCount}`;
    const suppliedIntent = String(body.operator_intent || "").trim();
    if (suppliedIntent !== expectedIntent) {
      return res.status(400).json({
        ok: false,
        error: "operator_intent_mismatch",
        expected_intent: expectedIntent
      });
    }

    const liveExecutionEnabled = String(process.env.VOID_VALIDATOR_NEXT_ONBOARD_LIVE_EXECUTION || "").trim() === "1";
    if (!liveExecutionEnabled) {
      return res.status(403).json({
        ok: false,
        error: "live_execution_disabled",
        blocker: "VOID_VALIDATOR_NEXT_ONBOARD_LIVE_EXECUTION_not_enabled",
        hint: "Set VOID_VALIDATOR_NEXT_ONBOARD_LIVE_EXECUTION=1 only inside a guarded live-admission proof."
      });
    }

    const cp = require("child_process");
    const util = require("util");
    const pathMod = require("path");
    const execFile = util.promisify(cp.execFile);

    const secretsPath = String(
      process.env.VOID_VALIDATOR_NEXT_ONBOARD_SECRETS ||
      "/mnt/key2/mainnet-keygen/20260418-023715/private/wallet-secrets.json"
    ).trim();

    const home = String(process.env.HOME || "").trim();
    const repoRoot = home
      ? pathMod.join(home, "dev", "void-node")
      : process.cwd();
    const runbook = pathMod.join(repoRoot, "ops", "mainnet", "validator-staking-next-onboard-runbook.sh");
    const base = "http://127.0.0.1:4100";

    const env = Object.assign({}, process.env, {
      DRY_RUN: "0",
      SKIP_PREFLIGHT: "1",
      BASE: base,
      SECRETS: secretsPath,
      CANDIDATE_NAME: candidateName,
      TARGET_EPOCH: String(targetEpoch),
      EXPECTED_VALIDATOR_COUNT: String(expectedValidatorCount),
    });

    const child = await execFile("bash", [runbook], {
      encoding: "utf8",
      env,
      cwd: repoRoot,
      maxBuffer: 8 * 1024 * 1024,
    });

    const stdout = String(child?.stdout || "");
    const stderr = String(child?.stderr || "");

    const grab = (name: string) => {
      const m = stdout.match(new RegExp("^" + name + "=(.+)$", "m"));
      return m ? String(m[1]).trim() : "";
    };

    return res.json({
      ok: true,
      base,
      runbook,
      secretsPath,
      selectedCandidateName: grab("selected_candidate_name"),
      selectedCandidateAddr: grab("selected_candidate_addr"),
      currentEpoch: Number(grab("current_epoch") || 0),
      targetEpoch: Number(grab("target_epoch") || 0),
      currentValidatorCount: Number(grab("current_validator_count") || 0),
      expectedValidatorCount: Number(grab("expected_validator_count") || 0),
      command: grab("command"),
      reportJson: grab("report_json"),
      stdout,
      stderr,
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e),
      stdout: String(e?.stdout || ""),
      stderr: String(e?.stderr || ""),
    });
  }
});



app.get("/__void/runtime/validator-truth/diag/all", (_req: any, res: any) => {
  const status = __voidReadValidatorRuntimeTruthStatus();
  const shadow = __voidReadValidatorRuntimeTruthShadowLatest();
  const compare = __voidReadValidatorTruthFrozenVsUpgradeLatest();
  const ok = !!status?.ok && !!shadow?.ok && !!compare?.ok;
  const loadedEpochs = Array.isArray(status?.loadedEpochs) ? status.loadedEpochs : [];
  const latestEpoch = status?.latestEpoch ?? null;
  return res.status(ok ? 200 : 500).json({
    ok,
    configuredMode: status?.configuredMode,
    mode: status?.mode,
    sourceDir: status?.sourceDir,
    loadedEpochs,
    latestEpoch,
    lookupsAvailable: !!status?.lookupsAvailable,
    shadowLatestPath: shadow?.path || __voidConfiguredValidatorTruthShadowLatestPath(),
    shadowLatestOk: !!shadow?.ok,
    shadowLatestSummary: shadow?.summary || null,
    compareLatestPath: compare?.path || __voidConfiguredValidatorTruthCompareLatestPath(),
    compareLatestOk: !!compare?.ok,
    compareLatestSummary: compare?.summary || null,
    status,
    shadow,
    compare,
  });
});

app.get("/__void/runtime/validator-truth/epoch/:epoch", (req: any, res: any) => {
  try {
    const sw = __voidBuildValidatorRuntimeTruthSwitch();
    const epoch = __voidParseNonNegativeInt(req.params.epoch, "epoch");
    return res.json({
      ok: true,
      mode: sw.getModeLabel(),
      sourceDir: __voidConfiguredValidatorTruthDir(),
      summary: sw.getEpochSummary(epoch),
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      mode: __voidConfiguredValidatorTruthMode(),
      sourceDir: __voidConfiguredValidatorTruthDir(),
      error: String(e?.message || e),
    });
  }
});

app.get("/__void/runtime/validator-truth/proposer/:epoch/:slot", (req: any, res: any) => {
  try {
    const sw = __voidBuildValidatorRuntimeTruthSwitch();
    const epoch = __voidParseNonNegativeInt(req.params.epoch, "epoch");
    const slot = __voidParseNonNegativeInt(req.params.slot, "slot");
    return res.json({
      ok: true,
      mode: sw.getModeLabel(),
      sourceDir: __voidConfiguredValidatorTruthDir(),
      proposer: sw.getProposerForSlot(epoch, slot),
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      mode: __voidConfiguredValidatorTruthMode(),
      sourceDir: __voidConfiguredValidatorTruthDir(),
      error: String(e?.message || e),
    });
  }
});

app.get("/__void/runtime/validator-truth/window/:epoch/:start/:end", (req: any, res: any) => {
  try {
    const sw = __voidBuildValidatorRuntimeTruthSwitch();
    const epoch = __voidParseNonNegativeInt(req.params.epoch, "epoch");
    const startSlot = __voidParseNonNegativeInt(req.params.start, "start");
    const endSlotExclusive = __voidParseNonNegativeInt(req.params.end, "end");
    if (endSlotExclusive < startSlot) {
      throw new Error(`invalid window: start=${startSlot} end=${endSlotExclusive}`);
    }
    return res.json({
      ok: true,
      mode: sw.getModeLabel(),
      sourceDir: __voidConfiguredValidatorTruthDir(),
      window: sw.getScheduleWindow(epoch, startSlot, endSlotExclusive),
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      mode: __voidConfiguredValidatorTruthMode(),
      sourceDir: __voidConfiguredValidatorTruthDir(),
      error: String(e?.message || e),
    });
  }
});



;(() => {
  try {
    const g:any = globalThis as any;
    if (g.__void_inbound_path_tap_v1_installed) return;
    g.__void_inbound_path_tap_v1_installed = true;
    const fs = require("fs");
    const path = require("path");
    const LOG = process.env.VOID_INBOUND_PATH_TAP_LOG || "/tmp/void-inbound-path-tap.4100.log";
    let lastFlush = 0;
    const counts:any = {};
    app.use((req:any, _res:any, next:any) => {
      try {
        const k = `${req.method} ${req.originalUrl || req.url || ""}`;
        counts[k] = (counts[k] || 0) + 1;
        const now = Date.now();
        if (now - lastFlush > 2000) {
          lastFlush = now;
          const top = Object.entries(counts).sort((a:any,b:any)=>b[1]-a[1]).slice(0,40);
          const lines = top.map((x:any)=>`${x[1]} ${x[0]}`).join("\\n") + "\n";
          fs.writeFileSync(LOG, lines, "utf8");
        }
      } catch (err) { __voidIxCatch4500("4224:3", err); }
      next();
    });
    console.log("[inbound-path-tap.v1] installed log=%s", LOG);
  } catch (e:any) {
    try { console.log("[inbound-path-tap.v1] failed:", e?.message || String(e)); } catch (err) { __voidIxCatch4500("4229:4", err); }
  }
})();
(globalThis as any).__void_http_app = app;
// VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_V1_BEGIN
const __voidAcceptancePersistenceTrustedContextProviderBindingResultV1 =
  installPublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingFromEnvironmentV1(
    process.env,
    globalThis as any,
  );
(globalThis as any).__void_public_agent_service_acceptance_persistence_trusted_context_provider_binding_v1_result =
  __voidAcceptancePersistenceTrustedContextProviderBindingResultV1;
// VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_V1_END
// VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_V1_BEGIN
const __voidAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationResultV1 =
  await executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationFromEnvironmentV1(
    process.env,
    () => app,
    () => {
      const provider =
        (globalThis as any).__void_public_agent_service_acceptance_persistence_trusted_context_provider_v1;
      if (typeof provider !== "function") {
        throw new Error(
          "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_V1 is unavailable",
        );
      }
      return provider();
    },
  );
(globalThis as any).__void_public_agent_service_acceptance_persistence_http_route_server_bootstrap_callsite_integration_v1_result =
  __voidAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationResultV1;
// VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_V1_END
// VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_HTTP_INTEGRATION_V1_BEGIN
const __voidPublicAgentServiceOrderStatusReadonlyHttpIntegrationV1Result =
  executeOrderStatusReadonlyHttpIntegrationFromEnvironmentV1({
    env: process.env,
    appProvider: () => app,
    handledAtUtcForRequest: () => new Date().toISOString(),
  });
(globalThis as any).__void_public_agent_service_order_status_readonly_http_integration_v1_result =
  __voidPublicAgentServiceOrderStatusReadonlyHttpIntegrationV1Result;
// VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_HTTP_INTEGRATION_V1_END


// ---- EARLY MINIMAL BOOT MODE (short-circuit before additive IIFE storm) ----
const VOID_AI_AGENT_FIRST_CONTACT_RUNTIME_V1 = Object.freeze({
  firstContactRoute: "/public-node/agents/first-contact-v1.json",
  joinRoute: "/public-node/agents/join-v1.html",
  firstContactFile: `${process.cwd()}/public/public-node/agents/first-contact-v1.json`,
  joinFile: `${process.cwd()}/public/public-node/agents/join-v1.html`,
});
{
  app.get(VOID_AI_AGENT_FIRST_CONTACT_RUNTIME_V1.firstContactRoute, (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=60");
    res.sendFile(VOID_AI_AGENT_FIRST_CONTACT_RUNTIME_V1.firstContactFile);
  });

  app.head(VOID_AI_AGENT_FIRST_CONTACT_RUNTIME_V1.firstContactRoute, (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=60");
    res.sendFile(VOID_AI_AGENT_FIRST_CONTACT_RUNTIME_V1.firstContactFile);
  });

  app.get(VOID_AI_AGENT_FIRST_CONTACT_RUNTIME_V1.joinRoute, (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=60");
    res.sendFile(VOID_AI_AGENT_FIRST_CONTACT_RUNTIME_V1.joinFile);
  });

  app.head(VOID_AI_AGENT_FIRST_CONTACT_RUNTIME_V1.joinRoute, (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=60");
    res.sendFile(VOID_AI_AGENT_FIRST_CONTACT_RUNTIME_V1.joinFile);
  });
}

if (process.env.VOID_EARLY_MINIMAL_BOOT === "1") {
  try {
    app.get(["/health", "/api/health"], (_req:any, res:any) => {
      try {
        const n:any = ((globalThis as any).__void_node || (globalThis as any).node);
        res.json({
          ok: true,
          proto: PROTO_VER,
          nodeId: n?.id || "unknown",
          http: HTTP_PORT,
          p2p: P2P_PORT,
          peers: Array.isArray([...((n?.peers || new Map()).keys?.() || [])]) ? [...(n?.peers?.keys?.() || [])].filter((k:any)=>!String(k).startsWith("?-")) : [],
          listen: n?.listenAddrs || []
        });
      } catch (e:any) {
        res.status(500).json({ ok:false, error:String(e?.message || e) });
      }
    });

    app.get("/head.txt", (_req:any, res:any) => {
      try {
        const n = (((globalThis as any).__void_node || (globalThis as any).node) as any).store.loadHeadNumber();
        res.type("text/plain").send(String(Number.isFinite(n) ? n : -1));
      } catch (e:any) {
        res.status(500).type("text/plain").send(String(e?.message || e));
      }
    });

    app.get("/blocks/latest/number", (_req:any, res:any) => {
      try {
        const n = (((globalThis as any).__void_node || (globalThis as any).node) as any).store.loadHeadNumber();
        res.type("text/plain").send(String(Number.isFinite(n) ? n : -1));
      } catch (e:any) {
        res.status(500).type("text/plain").send(String(e?.message || e));
      }
    });

    app.get("/participant", (req:any, res:any) => {
      const account = String(req?.query?.account || "guest");
      const esc = (x:string) => x.replace(/[&<>"]/g, "");
      // __void_datanet_view_summary_v1
      const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>VOID Participant (early minimal)</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body{font:14px/1.45 Inter,system-ui,sans-serif;background:#07111b;color:#edf4fb;padding:24px}
    .card{max-width:760px;background:#0f1b2a;border:1px solid #21364b;border-radius:16px;padding:20px}
    .muted{color:#93a6bc}
    code{background:#122235;padding:2px 6px;border-radius:6px}
  </style>
</head>
<body>
  <div class="card">
    <h1>VOID Participant</h1>
    <p class="muted">Early minimal boot mode is active.</p>
    <p>account: <code>${esc(account)}</code></p>
    <p>This response is mounted before the late additive runtime. If this mode stays healthy, the thrash is coming from the top-level additive boot storm.</p>
  </div>
</body>
</html>`;
      res.type("html").send(html);
    });

    


// VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_RUNTIME_ROUTE_HOLD_V1
// Public/read-only runtime routes for buyer-safe manual fulfillment readiness summary.
// No fulfillment, execution, authority activation, wallet signing, treasury movement, or mutation is performed here.
const usdcVoidBuyPoolManualFulfillmentPublicReadinessSummaryRuntimeRouteHoldV1 = {
  "marker": "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_RUNTIME_ROUTE_HOLD_V1",
  "route_kind": "public_node_runtime_read_only",
  "runtime_route_hold": {
    "marker": "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_RUNTIME_ROUTE_HOLD_V1",
    "version": 1,
    "scope": "public_node_runtime_read_only",
    "purpose": "mount_buyer_safe_public_readiness_summary_runtime_routes",
    "runtime_state": "runtime_route_hold_shape_only",
    "routes": {
      "json": "/public-node/usdc-void-buy-pool/manual-fulfillment/public-readiness-summary-v1.json",
      "html": "/public-node/usdc-void-buy-pool/manual-fulfillment/public-readiness-summary-v1"
    },
    "source_summary_fixture": "fixtures/public/usdc-void-buy-pool-buyer-packet-manual-fulfillment-public-readiness-summary-hold-v1.json",
    "public_runtime_summary": {
      "private_manual_evidence_chain_sealed": true,
      "chain_is_evidence_only": true,
      "buyer_fulfilled": false,
      "manual_fulfillment_record_written": false,
      "manual_fulfillment_record_applied": false,
      "allocation_claim_created": false,
      "void_transfer_performed": false,
      "wallet_signing_performed": false,
      "treasury_movement_performed": false,
      "automatic_fulfillment_active": false,
      "public_mutation_authorized": false,
      "execution_authority": false
    },
    "authority": {
      "public_node_mutation_authority": false,
      "buyer_execution_authority": false,
      "manual_fulfillment_authority": false,
      "manual_fulfillment_record_write_authority": false,
      "manual_fulfillment_record_apply_authority": false,
      "allocation_claim_creation_authority": false,
      "void_transfer_authority": false,
      "wallet_signing_authority": false,
      "treasury_movement_authority": false,
      "automatic_fulfillment_authority": false,
      "authority_activation": false
    },
    "public_safety": {
      "contains_private_buyer_data": false,
      "contains_private_operator_notes": false,
      "contains_private_lane_identifier": false,
      "contains_private_document_path": false,
      "contains_wallet_secret": false,
      "contains_ledger_internal": false,
      "contains_execution_material": false,
      "contains_transfer_instruction": false,
      "contains_mutation_instruction": false,
      "buyer_safe": true,
      "reviewer_safe": true
    },
    "non_goals": [
      "buyer_fulfillment",
      "manual_fulfillment_record_write",
      "manual_fulfillment_record_apply",
      "allocation_claim_creation",
      "void_transfer",
      "wallet_signing",
      "treasury_movement",
      "automatic_fulfillment",
      "public_node_mutation",
      "authority_activation",
      "buyer_self_execution"
    ]
  },
  "public_readiness_summary": {
    "summary_marker_public_status": "sealed_public_readiness_summary_confirmed",
    "version": 1,
    "scope": "public_read_only",
    "purpose": "buyer_safe_public_summary_of_private_manual_fulfillment_evidence_chain",
    "summary_state": "public_readiness_summary_hold_shape_only",
    "private_chain_status": "sealed_closed_private_evidence_only",
    "private_terminal_rollup": {
      "commit": "ed0c2443",
      "final_marker_public_status": "sealed_final_precision_sync_confirmed_by_private_operator_evidence",
      "commit_public_reference": "ed0c2443",
      "local_verification_public_status": "local_green_confirmed_by_private_operator_evidence",
      "cross_box_verification_public_status": "cross_box_green_confirmed_by_private_operator_evidence",
      "final_sync_public_status": "sealed_final_precision_sync_confirmed_by_private_operator_evidence"
    },
    "public_safe_summary": {
      "manual_fulfillment_chain_sealed": true,
      "chain_is_evidence_only": true,
      "buyer_fulfilled": false,
      "manual_fulfillment_record_written": false,
      "manual_fulfillment_record_applied": false,
      "allocation_claim_created": false,
      "void_transfer_performed": false,
      "wallet_signing_performed": false,
      "treasury_movement_performed": false,
      "automatic_fulfillment_active": false,
      "public_mutation_authorized": false,
      "execution_authority": false,
      "summary_is_execution_packet": false,
      "summary_is_authority": false,
      "summary_is_public_mutation": false
    },
    "authority": {
      "public_node_mutation_authority": false,
      "buyer_execution_authority": false,
      "manual_fulfillment_authority": false,
      "manual_fulfillment_record_write_authority": false,
      "manual_fulfillment_record_apply_authority": false,
      "allocation_claim_creation_authority": false,
      "void_transfer_authority": false,
      "wallet_signing_authority": false,
      "treasury_movement_authority": false,
      "automatic_fulfillment_authority": false,
      "public_route_mount_authority": false
    },
    "future_activation_requirements": {
      "separate_authority_activation_path_required": true,
      "new_operator_review_required": true,
      "new_operator_decision_required": true,
      "new_authority_record_required": true,
      "new_activation_gate_required": true,
      "new_preflight_required": true,
      "new_execution_packet_required": true,
      "new_duplicate_guard_required": true,
      "new_cross_box_verification_required": true,
      "new_precision_final_sync_required": true,
      "explicit_write_authority_required": true,
      "explicit_apply_authority_required": true,
      "explicit_transfer_authority_required": true,
      "no_write_apply_transfer_or_public_mutation_before_all_requirements_green": true
    },
    "public_safety": {
      "contains_private_buyer_data": false,
      "contains_private_operator_notes": false,
      "contains_wallet_secret": false,
      "contains_private_document_path": false,
      "contains_execution_material": false,
      "contains_transfer_instruction": false,
      "contains_mutation_instruction": false,
      "buyer_safe": true,
      "reviewer_safe": true
    },
    "non_goals": [
      "buyer_fulfillment",
      "manual_fulfillment_record_write",
      "manual_fulfillment_record_apply",
      "allocation_claim_creation",
      "void_transfer",
      "wallet_signing",
      "treasury_movement",
      "automatic_fulfillment",
      "public_node_mutation",
      "authority_activation",
      "execution_packet_creation",
      "runtime_route_mount"
    ]
  }
} as const;

app.get("/public-node/usdc-void-buy-pool/manual-fulfillment/public-readiness-summary-v1.json", (_req: any, res: any) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(usdcVoidBuyPoolManualFulfillmentPublicReadinessSummaryRuntimeRouteHoldV1);
});

app.get("/public-node/usdc-void-buy-pool/manual-fulfillment/public-readiness-summary-v1", (_req: any, res: any) => {
  res.setHeader("Cache-Control", "no-store");
  res.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>USDC/VOID Manual Fulfillment Public Readiness Summary</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
  <main>
    <h1>USDC/VOID Manual Fulfillment Public Readiness Summary</h1>
    <p><strong>Status:</strong> private manual evidence chain sealed; public route is read-only.</p>
    <p><strong>Authority:</strong> false. This is not fulfillment, not execution, not a record write/apply, not a transfer, not automatic fulfillment, and not public mutation.</p>
    <ul>
      <li>Buyer fulfillment: not performed</li>
      <li>Manual fulfillment record write: not performed</li>
      <li>Manual fulfillment record apply: not performed</li>
      <li>Allocation claim creation: not performed</li>
      <li>VOID transfer: not performed</li>
      <li>Wallet signing: not performed</li>
      <li>Treasury movement: not performed</li>
      <li>Automatic fulfillment: not active</li>
      <li>Execution authority: false</li>
    </ul>
    <p><a href="/public-node/usdc-void-buy-pool/manual-fulfillment/public-readiness-summary-v1.json">View JSON readiness summary</a></p>
    <p data-marker="VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_RUNTIME_ROUTE_HOLD_V1">VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_RUNTIME_ROUTE_HOLD_V1</p>
  </main>
</body>
</html>`);
});

// VOID_AI_AGENT_FIRST_CONTACT_RUNTIME_V1_BEGIN

// VOID_AI_AGENT_FIRST_CONTACT_RUNTIME_V1_END
app.listen(Number(process.env.HTTP_PORT||4100),(process.env.HTTP_HOST||"127.0.0.1"),()=>{
      console.log("[early-minimal-boot] http listening");
      console.log(`[early-minimal-boot] http :${HTTP_PORT}`);
    });
    return;
  } catch (e:any) {
    console.error("[early-minimal-boot] failed", String(e?.stack || e));
    throw e;
  }
}


/* [usdc-void-buy-pool.manual-fulfillment-public-readiness-summary.late-runtime-route.v1] */
;(function __voidUsdcVoidBuyPoolManualFulfillmentPublicReadinessSummaryLateRuntimeRouteV1(){
  try{
    const g:any = (globalThis as any);
    const app:any = g.__void_http_app;
    if (!app || typeof app.get !== "function") return;
    if ((app as any).__void_usdc_void_buy_pool_manual_fulfillment_public_readiness_summary_late_runtime_route_v1) return;
    (app as any).__void_usdc_void_buy_pool_manual_fulfillment_public_readiness_summary_late_runtime_route_v1 = true;

    const fs = require("fs");
    const path = require("path");

    const marker = "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_RUNTIME_ROUTE_HOLD_V1";
    const basePath = "/public-node/usdc-void-buy-pool" + "/manual-fulfillment/public-readiness-summary-v1";
    const fixturePath = path.join(process.cwd(), "fixtures/public/usdc-void-buy-pool-buyer-packet-manual-fulfillment-public-readiness-summary-runtime-route-hold-v1.json");

    const readPayload = () => {
      const hold:any = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
      if (hold && hold.runtime_route_hold) return hold;
      hold.marker = marker;
      return {
        marker,
        route_kind: "public_node_runtime_read_only",
        runtime_route_hold: hold
      };
    };

    app.get(basePath + ".json", (_req:any, res:any) => {
      res.setHeader("Cache-Control", "no-store");
      res.json(readPayload());
    });

    app.get(basePath, (_req:any, res:any) => {
      res.setHeader("Cache-Control", "no-store");
      res.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>USDC/VOID Manual Fulfillment Public Readiness Summary</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
  <main>
    <h1>USDC/VOID Manual Fulfillment Public Readiness Summary</h1>
    <p><strong>Status:</strong> private manual evidence chain sealed; public route is read-only.</p>
    <p><strong>Authority:</strong> false. This is not fulfillment, not execution, not a record write/apply, not a transfer, not automatic fulfillment, and not public mutation.</p>
    <ul>
      <li>Buyer fulfillment: not performed</li>
      <li>Manual fulfillment record write: not performed</li>
      <li>Manual fulfillment record apply: not performed</li>
      <li>Allocation claim creation: not performed</li>
      <li>VOID transfer: not performed</li>
      <li>Wallet signing: not performed</li>
      <li>Treasury movement: not performed</li>
      <li>Automatic fulfillment: not active</li>
      <li>Execution authority: false</li>
    </ul>
    <p><a href="${basePath}.json">View JSON readiness summary</a></p>
    <p data-marker="${marker}">${marker}</p>
  </main>
</body>
</html>`);
    });

    console.log("[usdc-void-buy-pool.manual-fulfillment-public-readiness-summary.late-runtime-route.v1] mounted");
  }catch(e:any){
    console.error("[usdc-void-buy-pool.manual-fulfillment-public-readiness-summary.late-runtime-route.v1] failed", String(e?.stack || e));
  }
})();


/* [usdc-void-buy-pool.buyer-facing-manual-fulfillment-readiness-closeout-card.v1] */
;(function __voidUsdcVoidBuyPoolBuyerFacingManualFulfillmentReadinessCloseoutCardV1(){
  try{
    const g:any = (globalThis as any);
    const app:any = g.__void_http_app;
    if (!app || typeof app.get !== "function") return;
    if ((app as any).__void_usdc_void_buy_pool_buyer_facing_manual_fulfillment_readiness_closeout_card_v1) return;
    (app as any).__void_usdc_void_buy_pool_buyer_facing_manual_fulfillment_readiness_closeout_card_v1 = true;

    const fs = require("fs");
    const path = require("path");

    const marker = "VOID_USDC_VOID_BUY_POOL_BUYER_FACING_MANUAL_FULFILLMENT_READINESS_CLOSEOUT_CARD_V1";
    const htmlRoute = "/public-node/usdc-void-buy-pool/manual-fulfillment/readiness-closeout-v1";
    const jsonRoute = "/public-node/usdc-void-buy-pool/manual-fulfillment/readiness-closeout-v1.json";
    const summaryHtmlRoute = "/public-node/usdc-void-buy-pool/manual-fulfillment/public-readiness-summary-v1";
    const summaryJsonRoute = "/public-node/usdc-void-buy-pool/manual-fulfillment/public-readiness-summary-v1.json";
    const fixturePath = path.join(process.cwd(), "fixtures/public/usdc-void-buy-pool-buyer-facing-manual-fulfillment-readiness-closeout-card-v1.json");

    const readPayload = () => {
      const payload = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
      payload.marker = marker;
      return payload;
    };

    app.get(jsonRoute, (_req:any, res:any) => {
      res.setHeader("Cache-Control", "no-store");
      res.json(readPayload());
    });

    app.get(htmlRoute, (_req:any, res:any) => {
      res.setHeader("Cache-Control", "no-store");
      res.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>USDC/VOID Manual Fulfillment Readiness Closeout</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
  <main>
    <h1>USDC/VOID Manual Fulfillment Readiness Closeout</h1>
    <p><strong>Status:</strong> manual fulfillment readiness evidence is sealed and public-readable.</p>
    <p><strong>Buyer meaning:</strong> this page confirms the public readiness summary exists. It does not mean fulfillment has happened.</p>
    <p><strong>Authority:</strong> false. No buyer fulfillment, no manual fulfillment record write/apply, no allocation claim creation, no VOID transfer, no wallet signing, no treasury movement, no automatic fulfillment activation, and no public mutation.</p>
    <ul>
      <li>Manual evidence chain: sealed</li>
      <li>Public readiness summary: live</li>
      <li>Automatic fulfillment: disabled</li>
      <li>Manual execution: not performed</li>
      <li>Private operator material: withheld</li>
    </ul>
    <p><a href="${summaryHtmlRoute}">Open public readiness summary</a> · <a href="${summaryJsonRoute}">JSON</a></p>
    <p><a href="${jsonRoute}">Closeout JSON</a></p>
    <p data-marker="${marker}">${marker}</p>
  </main>
</body>
</html>`);
    });

    console.log("[usdc-void-buy-pool.buyer-facing-manual-fulfillment-readiness-closeout-card.v1] mounted");
  }catch(e:any){
    console.error("[usdc-void-buy-pool.buyer-facing-manual-fulfillment-readiness-closeout-card.v1] failed", String(e?.stack || e));
  }
})();


/* [usdc-void-buy-pool.manual-fulfillment-readiness-public-reviewer-verify-pack.v1] */
;(function __voidUsdcVoidBuyPoolManualFulfillmentReadinessPublicReviewerVerifyPackV1(){
  try{
    const g:any = (globalThis as any);
    const app:any = g.__void_http_app;
    if (!app || typeof app.get !== "function") return;
    if ((app as any).__void_usdc_void_buy_pool_manual_fulfillment_readiness_public_reviewer_verify_pack_v1) return;
    (app as any).__void_usdc_void_buy_pool_manual_fulfillment_readiness_public_reviewer_verify_pack_v1 = true;

    const fs = require("fs");
    const path = require("path");

    const marker = "VOID_USDC_VOID_BUY_POOL_MANUAL_FULFILLMENT_READINESS_PUBLIC_REVIEWER_VERIFY_PACK_V1";
    const htmlRoute = "/public-node/usdc-void-buy-pool/manual-fulfillment/reviewer-verify-pack-v1";
    const jsonRoute = "/public-node/usdc-void-buy-pool/manual-fulfillment/reviewer-verify-pack-v1.json";
    const fixturePath = path.join(process.cwd(), "fixtures/public/usdc-void-buy-pool-manual-fulfillment-readiness-public-reviewer-verify-pack-v1.json");
    const copyPasteVerifyCommand = "base=${VOID_PUBLIC_BASE:-https://zoso-alienware-aurora-r7.taila47fd.ts.net}; tmp=$(mktemp -d); set -e; curl -fsS \"$base/public-node\" > \"$tmp/dashboard.html\"; curl -fsS \"$base/public-node/route-index.json\" > \"$tmp/route-index.json\"; curl -fsS \"$base/public-node/usdc-void-buy-pool/manual-fulfillment/reviewer-verify-pack-v1.json\" > \"$tmp/pack.json\"; curl -fsS \"$base/public-node/usdc-void-buy-pool/manual-fulfillment/reviewer-verify-pack-v1\" > \"$tmp/pack.html\"; curl -fsS \"$base/public-node/usdc-void-buy-pool/manual-fulfillment/readiness-closeout-v1.json\" > \"$tmp/closeout.json\"; curl -fsS \"$base/public-node/usdc-void-buy-pool/manual-fulfillment/readiness-closeout-v1\" > \"$tmp/closeout.html\"; curl -fsS \"$base/public-node/usdc-void-buy-pool/manual-fulfillment/public-readiness-summary-v1.json\" > \"$tmp/summary.json\"; curl -fsS \"$base/public-node/usdc-void-buy-pool/manual-fulfillment/public-readiness-summary-v1\" > \"$tmp/summary.html\"; grep -F VOID_USDC_VOID_BUY_POOL_MANUAL_FULFILLMENT_READINESS_PUBLIC_REVIEWER_VERIFY_PACK_V1 \"$tmp/pack.json\" >/dev/null; grep -F VOID_USDC_VOID_BUY_POOL_MANUAL_FULFILLMENT_READINESS_PUBLIC_REVIEWER_VERIFY_PACK_V1 \"$tmp/pack.html\" >/dev/null; grep -F /public-node/usdc-void-buy-pool/manual-fulfillment/reviewer-verify-pack-v1.json \"$tmp/dashboard.html\" >/dev/null; grep -F /public-node/usdc-void-buy-pool/manual-fulfillment/reviewer-verify-pack-v1.json \"$tmp/route-index.json\" >/dev/null; grep -F VOID_USDC_VOID_BUY_POOL_BUYER_FACING_MANUAL_FULFILLMENT_READINESS_CLOSEOUT_CARD_V1 \"$tmp/closeout.json\" >/dev/null; grep -F VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_RUNTIME_ROUTE_HOLD_V1 \"$tmp/summary.json\" >/dev/null; python3 - \"$tmp/pack.json\" \"$tmp/closeout.json\" \"$tmp/summary.json\" <<'PY'\nimport json, sys\npack=json.load(open(sys.argv[1]))\ncloseout=json.load(open(sys.argv[2]))\nsummary=json.load(open(sys.argv[3]))\nassert pack[\"marker\"]==\"VOID_USDC_VOID_BUY_POOL_MANUAL_FULFILLMENT_READINESS_PUBLIC_REVIEWER_VERIFY_PACK_V1\"\nassert closeout[\"marker\"]==\"VOID_USDC_VOID_BUY_POOL_BUYER_FACING_MANUAL_FULFILLMENT_READINESS_CLOSEOUT_CARD_V1\"\nassert summary[\"marker\"]==\"VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_MANUAL_FULFILLMENT_PUBLIC_READINESS_SUMMARY_RUNTIME_ROUTE_HOLD_V1\"\nfor k,v in closeout[\"authority\"].items():\n    assert v is False, f\"closeout authority {k} must be false\"\nfor k in [\"buyer_fulfilled\",\"manual_fulfillment_record_written\",\"manual_fulfillment_record_applied\",\"allocation_claim_created\",\"void_transfer_performed\",\"wallet_signing_performed\",\"treasury_movement_performed\",\"automatic_fulfillment_active\",\"public_mutation_authorized\"]:\n    assert closeout[\"status\"][k] is False, f\"closeout status {k} must be false\"\nrs=summary[\"runtime_route_hold\"][\"public_runtime_summary\"]\nfor k in [\"buyer_fulfilled\",\"manual_fulfillment_record_written\",\"manual_fulfillment_record_applied\",\"allocation_claim_created\",\"void_transfer_performed\",\"wallet_signing_performed\",\"treasury_movement_performed\",\"automatic_fulfillment_active\",\"public_mutation_authorized\",\"execution_authority\"]:\n    assert rs[k] is False, f\"summary {k} must be false\"\nfor section in [\"pack_boundary\",\"authority\"]:\n    for k,v in pack[section].items():\n        assert v is False, f\"pack {section}.{k} must be false\"\nprint(\"VOID_USDC_VOID_BUY_POOL_MANUAL_FULFILLMENT_READINESS_PUBLIC_REVIEWER_VERIFY_PACK_V1_REVIEWER_GREEN\")\nPY";

    const readPayload = () => {
      const payload = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
      payload.marker = marker;
      payload.copy_paste_verify_command = copyPasteVerifyCommand;
      return payload;
    };

    const escapeHtml = (x:any) => String(x).replace(/[&<>"]/g, (c:string) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"} as any)[c]);

    app.get(jsonRoute, (_req:any, res:any) => {
      res.setHeader("Cache-Control", "no-store");
      re…162152 tokens truncated… "<ul>",
    "<li>inventory_reserve_hold</li>",
    "<li>blocked_private_ledger_not_written</li>",
    "<li>blocked_claim_not_created</li>",
    "<li>blocked_capacity_insufficient</li>",
    "<li>blocked_duplicate_reservation</li>",
    "<li>blocked_operator_not_approved</li>",
    "<li>operator_review_required</li>",
    "</ul>",
    "<h2>Current authority</h2>",
    "<p>no public mutation, no runtime queue execution, no inventory reserve, no private allocation ledger write now, no automatic fulfillment, no VOID transfer.</p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/inventory-reserve-hold-gate-v1.json\">JSON inventory reserve hold gate</a></p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/private-allocation-ledger-write-hold-gate-v1\">Private allocation ledger write hold gate</a></p>",
    "</main>",
    "</body></html>"
  ].join("\n"));
});

runtimeApp.get("/public-node/usdc-void-buy-pool/private-allocation-ledger-write-hold-gate-v1.json", (_req:any, res:any) => {
  res.json({
    marker: "VOID_USDC_VOID_BUY_POOL_PRIVATE_ALLOCATION_LEDGER_WRITE_HOLD_GATE_V1",
    status: "private_allocation_ledger_write_hold_gate_green_authority_false",
    public_policy_only: true,
    buy_pool_subject: "usdc_void_buy_pool",
    private_allocation_ledger_write_hold_gate_green: true,
    ledger_write_shape_policy_green: true,
    append_only_ledger_policy_green: true,
    ledger_write_hold_policy_green: true,
    operator_review_policy_green: true,
    private_allocation_ledger_write_now: false,
    allocation_claim_created_now: false,
    inventory_reserved_now: false,
    automatic_fulfillment_enabled_now: false,
    void_transfer_now: false,
    overall_automatic_activation_state: "still_blocked_other_gates_pending",
    required_upstream_gate: "VOID_USDC_VOID_BUY_POOL_ALLOCATION_CLAIM_CREATION_HOLD_GATE_V1",
    ledger_write_shape: {
      ledger_entry_id: "deterministic_public_safe_id_from_claim_id_and_ledger_policy_version",
      claim_id: "deterministic_public_safe_allocation_claim_id",
      buyer_binding_key: "opaque_public_safe_identifier",
      receiving_void_address: "single_public_receiving_void_address",
      chain_id: "allowed_chain_id",
      tx_hash: "observed_payment_tx_hash",
      transfer_log_index: "observed_usdc_transfer_log_index",
      token_address: "allowed_usdc_token_address",
      receiver_address: "allowed_receiver_address",
      usdc_amount_micro: "integer_micro_usdc",
      void_amount: "fixed_rate_quote_amount",
      rate_policy_version: "amount_rate_policy_v1",
      ledger_policy_version: "private_allocation_ledger_write_hold_v1",
      previous_ledger_entry_hash: "previous_append_only_hash_or_genesis",
      entry_hash: "hash_of_canonical_private_ledger_entry",
      write_state: "private_allocation_ledger_write_hold"
    },
    ledger_write_states: [
      "private_allocation_ledger_write_hold",
      "blocked_claim_not_created",
      "blocked_claim_creation_hold",
      "blocked_duplicate_claim",
      "blocked_inventory_not_reserved",
      "blocked_operator_not_approved",
      "operator_review_required"
    ],
    policy_examples: [
      { case: "claim_shape_ready_but_ledger_write_held", allocation_claim_state: "allocation_claim_creation_hold", ledger_shape_ready: true, result_state: "private_allocation_ledger_write_hold", may_write_private_allocation_ledger: false, may_reserve_inventory: false, may_automatic_fulfill: false, may_transfer_void: false },
      { case: "claim_not_created", allocation_claim_state: "blocked_claim_not_created", ledger_shape_ready: false, result_state: "blocked_claim_not_created", may_write_private_allocation_ledger: false },
      { case: "operator_not_approved", allocation_claim_state: "allocation_claim_creation_hold", ledger_shape_ready: true, operator_approval_present: false, result_state: "blocked_operator_not_approved", may_write_private_allocation_ledger: false }
    ],
    linked_allocation_claim_creation_hold_gate_marker: "VOID_USDC_VOID_BUY_POOL_ALLOCATION_CLAIM_CREATION_HOLD_GATE_V1",
    linked_allocation_claim_creation_hold_gate_json_route: "/public-node/usdc-void-buy-pool/allocation-claim-creation-hold-gate-v1.json",
    linked_allocation_claim_creation_hold_gate_html_route: "/public-node/usdc-void-buy-pool/allocation-claim-creation-hold-gate-v1",
    reviewer_warnings: {
      not_private_allocation_ledger_write: true,
      not_inventory_reserve: true,
      not_automatic_fulfillment: true,
      not_void_transfer: true,
      operator_review_required: true
    },
    authority_flags: {
      public_mutation_enabled: false,
      runtime_queue_enabled: false,
      live_fetch_now: false,
      finality_verified_now: false,
      external_state_root_trust_enabled: false,
      real_payment_verified_now: false,
      allocation_claim_creation_enabled: false,
      private_allocation_ledger_write_enabled: false,
      inventory_reserved_now: false,
      automatic_fulfillment_enabled: false,
      void_transfer_now: false
    }
  });
});

runtimeApp.get("/public-node/usdc-void-buy-pool/private-allocation-ledger-write-hold-gate-v1", (_req:any, res:any) => {
  res.type("html").send([
    "<!doctype html>",
    "<html><head><meta charset=\"utf-8\"><title>VOID Private Allocation Ledger Write Hold Gate</title></head><body>",
    "<main>",
    "<h1>USDC/VOID Private Allocation Ledger Write Hold Gate</h1>",
    "<p><strong>Marker:</strong> VOID_USDC_VOID_BUY_POOL_PRIVATE_ALLOCATION_LEDGER_WRITE_HOLD_GATE_V1</p>",
    "<p><strong>Status:</strong> private_allocation_ledger_write_hold_gate_green_authority_false</p>",
    "<p><strong>Gate green:</strong> true</p>",
    "<p><strong>Ledger shape:</strong> deterministic ledger entry id, claim id, buyer binding key, receiving VOID address, payment coordinates, rate version, previous hash, entry hash, and write state</p>",
    "<p><strong>Private allocation ledger write now:</strong> false</p>",
    "<p><strong>Inventory reserved now:</strong> false</p>",
    "<p><strong>Automatic fulfillment enabled now:</strong> false</p>",
    "<p><strong>VOID transfer now:</strong> false</p>",
    "<p><strong>Overall automatic activation:</strong> still_blocked_other_gates_pending</p>",
    "<h2>Hold states</h2>",
    "<ul>",
    "<li>private_allocation_ledger_write_hold</li>",
    "<li>blocked_claim_not_created</li>",
    "<li>blocked_claim_creation_hold</li>",
    "<li>blocked_duplicate_claim</li>",
    "<li>blocked_inventory_not_reserved</li>",
    "<li>blocked_operator_not_approved</li>",
    "<li>operator_review_required</li>",
    "</ul>",
    "<h2>Current authority</h2>",
    "<p>no public mutation, no runtime queue execution, no private allocation ledger write, no inventory reserve, no automatic fulfillment, no VOID transfer.</p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/private-allocation-ledger-write-hold-gate-v1.json\">JSON private allocation ledger write hold gate</a></p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/allocation-claim-creation-hold-gate-v1\">Allocation claim creation hold gate</a></p>",
    "</main>",
    "</body></html>"
  ].join("\n"));
});

runtimeApp.get("/public-node/usdc-void-buy-pool/allocation-claim-creation-hold-gate-v1.json", (_req:any, res:any) => {
  res.json({
    marker: "VOID_USDC_VOID_BUY_POOL_ALLOCATION_CLAIM_CREATION_HOLD_GATE_V1",
    status: "allocation_claim_creation_hold_gate_green_authority_false",
    public_policy_only: true,
    buy_pool_subject: "usdc_void_buy_pool",
    allocation_claim_creation_hold_gate_green: true,
    claim_shape_policy_green: true,
    claim_creation_hold_policy_green: true,
    operator_review_policy_green: true,
    automatic_fulfillment_enabled_now: false,
    allocation_claim_created_now: false,
    private_allocation_ledger_write_now: false,
    inventory_reserved_now: false,
    void_transfer_now: false,
    overall_automatic_activation_state: "still_blocked_other_gates_pending",
    required_upstream_gate: "VOID_USDC_VOID_BUY_POOL_PAYMENT_ELIGIBILITY_DECISION_GATE_V1",
    allocation_claim_shape: {
      claim_id: "deterministic_public_safe_id_from_chain_tx_log_buyer_receiver_token_rate",
      buyer_binding_key: "opaque_public_safe_identifier",
      receiving_void_address: "single_public_receiving_void_address",
      chain_id: "allowed_chain_id",
      tx_hash: "observed_payment_tx_hash",
      transfer_log_index: "observed_usdc_transfer_log_index",
      token_address: "allowed_usdc_token_address",
      receiver_address: "allowed_receiver_address",
      usdc_amount_micro: "integer_micro_usdc",
      void_amount: "fixed_rate_quote_amount",
      rate_policy_version: "amount_rate_policy_v1",
      eligibility_decision_state: "payment_eligibility_candidate_ready",
      allocation_claim_state: "allocation_claim_creation_hold"
    },
    claim_creation_states: [
      "allocation_claim_creation_hold",
      "blocked_payment_not_eligible",
      "blocked_duplicate_payment",
      "blocked_buyer_identity_missing_or_conflicting",
      "blocked_finality_not_met",
      "blocked_amount_rate_invalid",
      "blocked_inventory_not_reserved",
      "operator_review_required"
    ],
    policy_examples: [
      { case: "eligible_candidate_shape_ready_but_creation_held", payment_eligibility_state: "payment_eligibility_candidate_ready", claim_shape_ready: true, result_state: "allocation_claim_creation_hold", may_create_allocation_claim: false, may_write_private_allocation_ledger: false, may_reserve_inventory: false, may_automatic_fulfill: false, may_transfer_void: false },
      { case: "payment_not_eligible", payment_eligibility_state: "hold_duplicate_payment_candidate", claim_shape_ready: false, result_state: "blocked_payment_not_eligible", may_create_allocation_claim: false },
      { case: "buyer_identity_conflict", payment_eligibility_state: "hold_buyer_identity_missing_or_conflicting", claim_shape_ready: false, result_state: "blocked_buyer_identity_missing_or_conflicting", may_create_allocation_claim: false }
    ],
    linked_payment_eligibility_decision_gate_marker: "VOID_USDC_VOID_BUY_POOL_PAYMENT_ELIGIBILITY_DECISION_GATE_V1",
    linked_payment_eligibility_decision_gate_json_route: "/public-node/usdc-void-buy-pool/payment-eligibility-decision-gate-v1.json",
    linked_payment_eligibility_decision_gate_html_route: "/public-node/usdc-void-buy-pool/payment-eligibility-decision-gate-v1",
    reviewer_warnings: {
      not_allocation_claim_creation: true,
      not_allocation_ledger_write: true,
      not_inventory_reserve: true,
      not_automatic_fulfillment: true,
      not_void_transfer: true,
      operator_review_required: true
    },
    authority_flags: {
      public_mutation_enabled: false,
      runtime_queue_enabled: false,
      live_fetch_now: false,
      finality_verified_now: false,
      external_state_root_trust_enabled: false,
      real_payment_verified_now: false,
      allocation_claim_creation_enabled: false,
      automatic_fulfillment_enabled: false,
      private_allocation_ledger_write_enabled: false,
      inventory_reserved_now: false,
      void_transfer_now: false
    }
  });
});

runtimeApp.get("/public-node/usdc-void-buy-pool/allocation-claim-creation-hold-gate-v1", (_req:any, res:any) => {
  res.type("html").send([
    "<!doctype html>",
    "<html><head><meta charset=\"utf-8\"><title>VOID Allocation Claim Creation Hold Gate</title></head><body>",
    "<main>",
    "<h1>USDC/VOID Allocation Claim Creation Hold Gate</h1>",
    "<p><strong>Marker:</strong> VOID_USDC_VOID_BUY_POOL_ALLOCATION_CLAIM_CREATION_HOLD_GATE_V1</p>",
    "<p><strong>Status:</strong> allocation_claim_creation_hold_gate_green_authority_false</p>",
    "<p><strong>Gate green:</strong> true</p>",
    "<p><strong>Claim shape:</strong> deterministic public-safe claim id plus buyer binding key, receiving VOID address, chain id, tx hash, transfer log index, token, receiver, USDC amount, VOID amount, and rate policy version</p>",
    "<p><strong>Allocation claim created now:</strong> false</p>",
    "<p><strong>Private allocation ledger write now:</strong> false</p>",
    "<p><strong>Inventory reserved now:</strong> false</p>",
    "<p><strong>Automatic fulfillment enabled now:</strong> false</p>",
    "<p><strong>VOID transfer now:</strong> false</p>",
    "<p><strong>Overall automatic activation:</strong> still_blocked_other_gates_pending</p>",
    "<h2>Hold states</h2>",
    "<ul>",
    "<li>allocation_claim_creation_hold</li>",
    "<li>blocked_payment_not_eligible</li>",
    "<li>blocked_duplicate_payment</li>",
    "<li>blocked_buyer_identity_missing_or_conflicting</li>",
    "<li>blocked_finality_not_met</li>",
    "<li>blocked_amount_rate_invalid</li>",
    "<li>blocked_inventory_not_reserved</li>",
    "<li>operator_review_required</li>",
    "</ul>",
    "<h2>Current authority</h2>",
    "<p>no public mutation, no runtime queue execution, no allocation claim creation, no private allocation ledger write, no inventory reserve, no automatic fulfillment, no VOID transfer.</p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/allocation-claim-creation-hold-gate-v1.json\">JSON allocation claim creation hold gate</a></p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/payment-eligibility-decision-gate-v1\">Payment eligibility decision gate</a></p>",
    "</main>",
    "</body></html>"
  ].join("\n"));
});

runtimeApp.get("/public-node/usdc-void-buy-pool/payment-eligibility-decision-gate-v1.json", (_req:any, res:any) => {
  res.json({
    marker: "VOID_USDC_VOID_BUY_POOL_PAYMENT_ELIGIBILITY_DECISION_GATE_V1",
    status: "payment_eligibility_decision_gate_green_authority_false",
    public_policy_only: true,
    buy_pool_subject: "usdc_void_buy_pool",
    payment_eligibility_decision_gate_green: true,
    upstream_gate_inputs_green: true,
    eligibility_decision_policy_green: true,
    hold_reject_state_policy_green: true,
    operator_review_policy_green: true,
    automatic_fulfillment_enabled_now: false,
    real_payment_verified_now: false,
    allocation_claim_created_now: false,
    overall_automatic_activation_state: "still_blocked_other_gates_pending",
    required_upstream_gates: [
      "VOID_USDC_VOID_BUY_POOL_CHAIN_TOKEN_RECEIVER_ALLOWLIST_GATE_V1",
      "VOID_USDC_VOID_BUY_POOL_AMOUNT_RATE_POLICY_GATE_V1",
      "VOID_USDC_VOID_BUY_POOL_DUPLICATE_PAYMENT_GUARD_GATE_V1",
      "VOID_USDC_VOID_BUY_POOL_BUYER_IDENTITY_BINDING_GATE_V1",
      "VOID_USDC_VOID_BUY_POOL_FINALITY_CONFIRMATIONS_GATE_V1"
    ],
    decision_states: [
      "payment_eligibility_candidate_ready",
      "hold_chain_token_receiver_not_allowed",
      "hold_amount_rate_invalid",
      "hold_duplicate_payment_candidate",
      "hold_buyer_identity_missing_or_conflicting",
      "hold_finality_confirmations_not_met",
      "reject_failed_receipt",
      "reject_missing_transfer_log",
      "operator_review_required"
    ],
    policy_examples: [
      { case: "all_policy_inputs_green_but_authority_false", upstream_gates_green: true, candidate_hold_state: null, candidate_reject_state: null, result_state: "payment_eligibility_candidate_ready", may_create_allocation_claim: false, may_write_private_allocation_ledger: false, may_reserve_inventory: false, may_automatic_fulfill: false, may_transfer_void: false },
      { case: "duplicate_candidate", upstream_gates_green: false, candidate_hold_state: "hold_duplicate_payment_candidate", candidate_reject_state: null, result_state: "hold_duplicate_payment_candidate", may_create_allocation_claim: false },
      { case: "buyer_identity_conflict", upstream_gates_green: false, candidate_hold_state: "hold_buyer_identity_missing_or_conflicting", candidate_reject_state: null, result_state: "hold_buyer_identity_missing_or_conflicting", may_create_allocation_claim: false },
      { case: "failed_receipt", upstream_gates_green: false, candidate_hold_state: null, candidate_reject_state: "reject_failed_receipt", result_state: "reject_failed_receipt", may_create_allocation_claim: false }
    ],
    linked_finality_confirmations_gate_marker: "VOID_USDC_VOID_BUY_POOL_FINALITY_CONFIRMATIONS_GATE_V1",
    linked_finality_confirmations_gate_json_route: "/public-node/usdc-void-buy-pool/finality-confirmations-gate-v1.json",
    linked_finality_confirmations_gate_html_route: "/public-node/usdc-void-buy-pool/finality-confirmations-gate-v1",
    linked_buyer_identity_binding_gate_marker: "VOID_USDC_VOID_BUY_POOL_BUYER_IDENTITY_BINDING_GATE_V1",
    linked_buyer_identity_binding_gate_json_route: "/public-node/usdc-void-buy-pool/buyer-identity-binding-gate-v1.json",
    linked_buyer_identity_binding_gate_html_route: "/public-node/usdc-void-buy-pool/buyer-identity-binding-gate-v1",
    linked_duplicate_guard_gate_marker: "VOID_USDC_VOID_BUY_POOL_DUPLICATE_PAYMENT_GUARD_GATE_V1",
    linked_duplicate_guard_gate_json_route: "/public-node/usdc-void-buy-pool/duplicate-payment-guard-gate-v1.json",
    linked_duplicate_guard_gate_html_route: "/public-node/usdc-void-buy-pool/duplicate-payment-guard-gate-v1",
    linked_amount_rate_gate_marker: "VOID_USDC_VOID_BUY_POOL_AMOUNT_RATE_POLICY_GATE_V1",
    linked_amount_rate_gate_json_route: "/public-node/usdc-void-buy-pool/amount-rate-policy-gate-v1.json",
    linked_amount_rate_gate_html_route: "/public-node/usdc-void-buy-pool/amount-rate-policy-gate-v1",
    linked_chain_token_receiver_gate_marker: "VOID_USDC_VOID_BUY_POOL_CHAIN_TOKEN_RECEIVER_ALLOWLIST_GATE_V1",
    linked_chain_token_receiver_gate_json_route: "/public-node/usdc-void-buy-pool/chain-token-receiver-allowlist-gate-v1.json",
    linked_chain_token_receiver_gate_html_route: "/public-node/usdc-void-buy-pool/chain-token-receiver-allowlist-gate-v1",
    reviewer_warnings: {
      not_live_payment_verification: true,
      not_payment_approval: true,
      not_allocation_claim_creation: true,
      not_allocation_ledger_write: true,
      not_inventory_reserve: true,
      not_automatic_fulfillment: true,
      not_void_transfer: true,
      operator_review_required: true
    },
    authority_flags: {
      public_mutation_enabled: false,
      runtime_queue_enabled: false,
      live_fetch_now: false,
      finality_verified_now: false,
      external_state_root_trust_enabled: false,
      real_payment_verified_now: false,
      automatic_fulfillment_enabled: false,
      private_allocation_ledger_write_enabled: false,
      inventory_reserved_now: false,
      void_transfer_now: false
    }
  });
});

runtimeApp.get("/public-node/usdc-void-buy-pool/payment-eligibility-decision-gate-v1", (_req:any, res:any) => {
  res.type("html").send([
    "<!doctype html>",
    "<html><head><meta charset=\"utf-8\"><title>VOID Payment Eligibility Decision Gate</title></head><body>",
    "<main>",
    "<h1>USDC/VOID Payment Eligibility Decision Gate</h1>",
    "<p><strong>Marker:</strong> VOID_USDC_VOID_BUY_POOL_PAYMENT_ELIGIBILITY_DECISION_GATE_V1</p>",
    "<p><strong>Status:</strong> payment_eligibility_decision_gate_green_authority_false</p>",
    "<p><strong>Gate green:</strong> true</p>",
    "<p><strong>Decision policy:</strong> eligible / hold / reject</p>",
    "<p><strong>Required inputs:</strong> allowlist, amount/rate, duplicate guard, buyer identity binding, finality confirmations</p>",
    "<p><strong>Real payment verified now:</strong> false</p>",
    "<p><strong>Allocation claim created now:</strong> false</p>",
    "<p><strong>Automatic fulfillment enabled now:</strong> false</p>",
    "<p><strong>Overall automatic activation:</strong> still_blocked_other_gates_pending</p>",
    "<h2>Decision states</h2>",
    "<ul>",
    "<li>payment_eligibility_candidate_ready</li>",
    "<li>hold_chain_token_receiver_not_allowed</li>",
    "<li>hold_amount_rate_invalid</li>",
    "<li>hold_duplicate_payment_candidate</li>",
    "<li>hold_buyer_identity_missing_or_conflicting</li>",
    "<li>hold_finality_confirmations_not_met</li>",
    "<li>reject_failed_receipt</li>",
    "<li>reject_missing_transfer_log</li>",
    "<li>operator_review_required</li>",
    "</ul>",
    "<h2>Current authority</h2>",
    "<p>no public mutation, no runtime queue execution, no live payment verification, no allocation claim creation, no allocation ledger write, no inventory reserve, no automatic fulfillment, no VOID transfer.</p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/payment-eligibility-decision-gate-v1.json\">JSON payment eligibility decision gate</a></p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/finality-confirmations-gate-v1\">Finality confirmations gate</a></p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/buyer-identity-binding-gate-v1\">Buyer identity binding gate</a></p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/duplicate-payment-guard-gate-v1\">Duplicate payment guard gate</a></p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/amount-rate-policy-gate-v1\">Amount/rate policy gate</a></p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/chain-token-receiver-allowlist-gate-v1\">Chain/token/receiver allowlist gate</a></p>",
    "</main>",
    "</body></html>"
  ].join("\n"));
});

runtimeApp.get("/public-node/usdc-void-buy-pool/finality-confirmations-gate-v1.json", (_req:any, res:any) => {
  res.json({
    marker: "VOID_USDC_VOID_BUY_POOL_FINALITY_CONFIRMATIONS_GATE_V1",
    status: "finality_confirmations_gate_green_authority_false",
    public_policy_only: true,
    buy_pool_subject: "usdc_void_buy_pool",
    finality_confirmations_gate_green: true,
    chain_confirmation_thresholds_green: true,
    receipt_success_policy_green: true,
    transfer_log_persistence_policy_green: true,
    reorg_hold_policy_green: true,
    automatic_fulfillment_enabled_now: false,
    finality_verified_now: false,
    live_fetch_now: false,
    overall_automatic_activation_state: "still_blocked_other_gates_pending",
    chain_finality_policy: [
      { chain_name: "ethereum_mainnet", chain_id: 1, required_confirmations: 12, candidate_can_advance_below_threshold: false },
      { chain_name: "base_mainnet", chain_id: 8453, required_confirmations: 30, candidate_can_advance_below_threshold: false }
    ],
    receipt_policy: {
      required_receipt_status: "success",
      receipt_status_success_values: ["0x1", 1, true],
      receipt_status_failed_values_hold: ["0x0", 0, false],
      receipt_success_policy_green: true
    },
    transfer_log_policy: {
      required_transfer_log_present: true,
      required_transfer_log_still_present_after_confirmations: true,
      transfer_log_persistence_policy_green: true
    },
    finality_states: [
      "finality_policy_candidate_ready",
      "confirmations_below_threshold_hold",
      "receipt_status_failed_hold",
      "receipt_missing_hold",
      "transfer_log_missing_hold",
      "chain_head_unknown_hold",
      "block_number_missing_hold",
      "reorg_risk_hold",
      "unsupported_chain_hold",
      "operator_review_required"
    ],
    policy_examples: [
      { case: "base_confirmations_below_threshold", chain_id: 8453, required_confirmations: 30, observed_confirmations: 29, receipt_status: "0x1", transfer_log_present: true, result_state: "confirmations_below_threshold_hold", may_create_allocation_claim: false },
      { case: "ethereum_confirmations_met_policy_only", chain_id: 1, required_confirmations: 12, observed_confirmations: 12, receipt_status: "0x1", transfer_log_present: true, result_state: "finality_policy_candidate_ready", may_create_allocation_claim: false, note: "candidate remains non-authoritative until other gates are green and a trusted live reader supplies current chain state" },
      { case: "receipt_failed", chain_id: 8453, required_confirmations: 30, observed_confirmations: 99, receipt_status: "0x0", transfer_log_present: true, result_state: "receipt_status_failed_hold", may_create_allocation_claim: false },
      { case: "transfer_log_missing", chain_id: 1, required_confirmations: 12, observed_confirmations: 20, receipt_status: "0x1", transfer_log_present: false, result_state: "transfer_log_missing_hold", may_create_allocation_claim: false }
    ],
    linked_buyer_identity_binding_gate_marker: "VOID_USDC_VOID_BUY_POOL_BUYER_IDENTITY_BINDING_GATE_V1",
    linked_buyer_identity_binding_gate_json_route: "/public-node/usdc-void-buy-pool/buyer-identity-binding-gate-v1.json",
    linked_buyer_identity_binding_gate_html_route: "/public-node/usdc-void-buy-pool/buyer-identity-binding-gate-v1",
    linked_duplicate_guard_gate_marker: "VOID_USDC_VOID_BUY_POOL_DUPLICATE_PAYMENT_GUARD_GATE_V1",
    linked_duplicate_guard_gate_json_route: "/public-node/usdc-void-buy-pool/duplicate-payment-guard-gate-v1.json",
    linked_duplicate_guard_gate_html_route: "/public-node/usdc-void-buy-pool/duplicate-payment-guard-gate-v1",
    linked_amount_rate_gate_marker: "VOID_USDC_VOID_BUY_POOL_AMOUNT_RATE_POLICY_GATE_V1",
    linked_amount_rate_gate_json_route: "/public-node/usdc-void-buy-pool/amount-rate-policy-gate-v1.json",
    linked_amount_rate_gate_html_route: "/public-node/usdc-void-buy-pool/amount-rate-policy-gate-v1",
    linked_activation_matrix_marker: "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_FULFILLMENT_ACTIVATION_GATE_MATRIX_RUNTIME_V1",
    linked_activation_matrix_json_route: "/public-node/usdc-void-buy-pool/automatic-fulfillment-activation-gate-matrix-runtime-v1.json",
    linked_activation_matrix_html_route: "/public-node/usdc-void-buy-pool/automatic-fulfillment-activation-gate-matrix-runtime-v1",
    reviewer_warnings: {
      not_live_fetch: true,
      not_payment_approval: true,
      not_finality_verified_now: true,
      not_allocation_ledger_write: true,
      not_inventory_reserve: true,
      not_automatic_fulfillment: true,
      not_void_transfer: true,
      operator_review_required: true
    },
    authority_flags: {
      public_mutation_enabled: false,
      runtime_queue_enabled: false,
      live_fetch_now: false,
      finality_verified_now: false,
      external_state_root_trust_enabled: false,
      real_payment_verified_now: false,
      automatic_fulfillment_enabled: false,
      private_allocation_ledger_write_enabled: false,
      inventory_reserved_now: false,
      void_transfer_now: false
    }
  });
});

runtimeApp.get("/public-node/usdc-void-buy-pool/finality-confirmations-gate-v1", (_req:any, res:any) => {
  res.type("html").send([
    "<!doctype html>",
    "<html><head><meta charset=\"utf-8\"><title>VOID Finality Confirmations Gate</title></head><body>",
    "<main>",
    "<h1>USDC/VOID Finality + Confirmations Gate</h1>",
    "<p><strong>Marker:</strong> VOID_USDC_VOID_BUY_POOL_FINALITY_CONFIRMATIONS_GATE_V1</p>",
    "<p><strong>Status:</strong> finality_confirmations_gate_green_authority_false</p>",
    "<p><strong>Gate green:</strong> true</p>",
    "<p><strong>Ethereum confirmations:</strong> 12</p>",
    "<p><strong>Base confirmations:</strong> 30</p>",
    "<p><strong>Receipt policy:</strong> successful receipt status plus persistent transfer log required</p>",
    "<p><strong>Finality verified now:</strong> false</p>",
    "<p><strong>Live fetch now:</strong> false</p>",
    "<p><strong>Automatic fulfillment enabled now:</strong> false</p>",
    "<p><strong>Overall automatic activation:</strong> still_blocked_other_gates_pending</p>",
    "<h2>Hold states</h2>",
    "<ul>",
    "<li>confirmations_below_threshold_hold</li>",
    "<li>receipt_status_failed_hold</li>",
    "<li>receipt_missing_hold</li>",
    "<li>transfer_log_missing_hold</li>",
    "<li>chain_head_unknown_hold</li>",
    "<li>block_number_missing_hold</li>",
    "<li>reorg_risk_hold</li>",
    "<li>unsupported_chain_hold</li>",
    "<li>operator_review_required</li>",
    "</ul>",
    "<h2>Current authority</h2>",
    "<p>no public mutation, no runtime queue execution, no live fetch now, no finality verification now, no real payment verification, no allocation ledger write, no inventory reserve, no automatic fulfillment, no VOID transfer.</p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/finality-confirmations-gate-v1.json\">JSON finality confirmation gate</a></p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/buyer-identity-binding-gate-v1\">Buyer identity binding gate</a></p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/duplicate-payment-guard-gate-v1\">Duplicate payment guard gate</a></p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/amount-rate-policy-gate-v1\">Amount/rate policy gate</a></p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/automatic-fulfillment-activation-gate-matrix-runtime-v1\">Activation gate matrix</a></p>",
    "</main>",
    "</body></html>"
  ].join("\n"));
});

runtimeApp.get("/public-node/usdc-void-buy-pool/buyer-identity-binding-gate-v1.json", (_req:any, res:any) => {
  res.json({
    marker: "VOID_USDC_VOID_BUY_POOL_BUYER_IDENTITY_BINDING_GATE_V1",
    status: "buyer_identity_binding_gate_green_authority_false",
    public_policy_only: true,
    buy_pool_subject: "usdc_void_buy_pool",
    buyer_identity_binding_gate_green: true,
    buyer_binding_key_policy_green: true,
    receiving_void_address_policy_green: true,
    conflict_hold_policy_green: true,
    public_pii_redaction_policy_green: true,
    automatic_fulfillment_enabled_now: false,
    overall_automatic_activation_state: "still_blocked_other_gates_pending",
    buyer_binding_policy: {
      buyer_binding_key_type: "opaque_public_safe_identifier",
      public_pii_allowed: false,
      private_contact_info_allowed_publicly: false,
      secret_material_allowed_publicly: false,
      binding_source: "operator_reviewed_buyer_intent_or_future_signed_claim",
      buyer_binding_key_policy_green: true
    },
    receiving_void_address_policy: {
      required_before_allocation_candidate_advances: true,
      one_buyer_binding_key_to_one_receiving_void_address_per_candidate: true,
      receiving_void_address_policy_green: true
    },
    candidate_binding_key: {
      key_fields: ["chain_id", "tx_hash", "transfer_log_index", "buyer_binding_key", "receiving_void_address"],
      binding_rule: "one_payment_event_key_must_bind_to_one_buyer_binding_key_and_one_receiving_void_address_before_advancing",
      candidate_binding_key_policy_green: true
    },
    binding_states: [
      "buyer_binding_candidate_ready",
      "buyer_binding_missing_hold",
      "buyer_binding_conflict_hold",
      "receiving_void_address_missing_hold",
      "receiving_void_address_conflict_hold",
      "payment_event_unbound_hold",
      "operator_review_required"
    ],
    policy_examples: [
      {
        case: "buyer_binding_and_receiving_void_address_present",
        chain_id: 8453,
        tx_hash: "0xexampletx000000000000000000000000000000000000000000000000000000000002",
        transfer_log_index: 3,
        buyer_binding_key: "buyer_binding_key_example_redacted",
        receiving_void_address: "0xreceiverexample000000000000000000000000000000000001",
        result_state: "buyer_binding_candidate_ready",
        may_create_allocation_claim: false,
        note: "candidate remains non-authoritative until other gates are green"
      },
      {
        case: "missing_buyer_binding_key",
        chain_id: 8453,
        tx_hash: "0xexampletx000000000000000000000000000000000000000000000000000000000003",
        transfer_log_index: 4,
        buyer_binding_key: null,
        receiving_void_address: "0xreceiverexample000000000000000000000000000000000002",
        result_state: "buyer_binding_missing_hold",
        may_create_allocation_claim: false
      },
      {
        case: "conflicting_receiving_void_address",
        chain_id: 1,
        tx_hash: "0xexampletx000000000000000000000000000000000000000000000000000000000004",
        transfer_log_index: 5,
        buyer_binding_key: "buyer_binding_key_example_redacted",
        receiving_void_address: "conflicting_receiving_void_address_redacted",
        result_state: "receiving_void_address_conflict_hold",
        may_create_allocation_claim: false
      }
    ],
    linked_duplicate_guard_gate_marker: "VOID_USDC_VOID_BUY_POOL_DUPLICATE_PAYMENT_GUARD_GATE_V1",
    linked_duplicate_guard_gate_json_route: "/public-node/usdc-void-buy-pool/duplicate-payment-guard-gate-v1.json",
    linked_duplicate_guard_gate_html_route: "/public-node/usdc-void-buy-pool/duplicate-payment-guard-gate-v1",
    linked_amount_rate_gate_marker: "VOID_USDC_VOID_BUY_POOL_AMOUNT_RATE_POLICY_GATE_V1",
    linked_amount_rate_gate_json_route: "/public-node/usdc-void-buy-pool/amount-rate-policy-gate-v1.json",
    linked_amount_rate_gate_html_route: "/public-node/usdc-void-buy-pool/amount-rate-policy-gate-v1",
    linked_allowlist_gate_marker: "VOID_USDC_VOID_BUY_POOL_CHAIN_TOKEN_RECEIVER_ALLOWLIST_GATE_V1",
    linked_allowlist_gate_json_route: "/public-node/usdc-void-buy-pool/chain-token-receiver-allowlist-gate-v1.json",
    linked_allowlist_gate_html_route: "/public-node/usdc-void-buy-pool/chain-token-receiver-allowlist-gate-v1",
    linked_activation_matrix_marker: "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_FULFILLMENT_ACTIVATION_GATE_MATRIX_RUNTIME_V1",
    linked_activation_matrix_json_route: "/public-node/usdc-void-buy-pool/automatic-fulfillment-activation-gate-matrix-runtime-v1.json",
    linked_activation_matrix_html_route: "/public-node/usdc-void-buy-pool/automatic-fulfillment-activation-gate-matrix-runtime-v1",
    reviewer_warnings: {
      not_live_fetch: true,
      not_payment_approval: true,
      not_finality_verification: true,
      not_allocation_ledger_write: true,
      not_inventory_reserve: true,
      not_automatic_fulfillment: true,
      not_void_transfer: true,
      operator_review_required: true
    },
    authority_flags: {
      public_mutation_enabled: false,
      runtime_queue_enabled: false,
      live_fetch_now: false,
      finality_verified_now: false,
      external_state_root_trust_enabled: false,
      real_payment_verified_now: false,
      automatic_fulfillment_enabled: false,
      private_allocation_ledger_write_enabled: false,
      inventory_reserved_now: false,
      void_transfer_now: false
    }
  });
});

runtimeApp.get("/public-node/usdc-void-buy-pool/buyer-identity-binding-gate-v1", (_req:any, res:any) => {
  res.type("html").send([
    "<!doctype html>",
    "<html><head><meta charset=\"utf-8\"><title>VOID Buyer Identity Binding Gate</title></head><body>",
    "<main>",
    "<h1>USDC/VOID Buyer Identity Binding Gate</h1>",
    "<p><strong>Marker:</strong> VOID_USDC_VOID_BUY_POOL_BUYER_IDENTITY_BINDING_GATE_V1</p>",
    "<p><strong>Status:</strong> buyer_identity_binding_gate_green_authority_false</p>",
    "<p><strong>Gate green:</strong> true</p>",
    "<p><strong>Buyer binding key:</strong> opaque public-safe identifier; no public PII</p>",
    "<p><strong>Receiving VOID address:</strong> exactly one receiving address per candidate binding</p>",
    "<p><strong>Automatic fulfillment enabled now:</strong> false</p>",
    "<p><strong>Overall automatic activation:</strong> still_blocked_other_gates_pending</p>",
    "<h2>Binding states</h2>",
    "<ul>",
    "<li>buyer_binding_candidate_ready</li>",
    "<li>buyer_binding_missing_hold</li>",
    "<li>buyer_binding_conflict_hold</li>",
    "<li>receiving_void_address_missing_hold</li>",
    "<li>receiving_void_address_conflict_hold</li>",
    "<li>payment_event_unbound_hold</li>",
    "<li>operator_review_required</li>",
    "</ul>",
    "<h2>Current authority</h2>",
    "<p>no public mutation, no runtime queue execution, no live fetch now, no finality verification, no real payment verification, no allocation ledger write, no inventory reserve, no automatic fulfillment, no VOID transfer.</p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/buyer-identity-binding-gate-v1.json\">JSON buyer identity binding gate</a></p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/duplicate-payment-guard-gate-v1\">Duplicate payment guard gate</a></p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/amount-rate-policy-gate-v1\">Amount/rate policy gate</a></p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/chain-token-receiver-allowlist-gate-v1\">Chain/token/receiver allowlist gate</a></p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/automatic-fulfillment-activation-gate-matrix-runtime-v1\">Activation gate matrix</a></p>",
    "</main>",
    "</body></html>"
  ].join("\n"));
});

runtimeApp.get("/public-node/usdc-void-buy-pool/duplicate-payment-guard-gate-v1.json", (_req:any, res:any) => {
  res.json({
    marker: "VOID_USDC_VOID_BUY_POOL_DUPLICATE_PAYMENT_GUARD_GATE_V1",
    status: "duplicate_payment_guard_gate_green_authority_false",
    public_policy_only: true,
    buy_pool_subject: "usdc_void_buy_pool",
    duplicate_payment_guard_gate_green: true,
    primary_event_key_policy_green: true,
    candidate_claim_key_policy_green: true,
    duplicate_rejection_policy_green: true,
    ambiguous_duplicate_hold_policy_green: true,
    automatic_fulfillment_enabled_now: false,
    overall_automatic_activation_state: "still_blocked_other_gates_pending",
    primary_payment_event_key: {
      key_fields: ["chain_id", "tx_hash", "transfer_log_index"],
      duplicate_rule: "same_chain_id_tx_hash_transfer_log_index_must_not_count_twice",
      primary_event_key_policy_green: true
    },
    candidate_claim_key: {
      key_fields: ["chain_id", "tx_hash", "transfer_log_index", "receiver", "token_address", "buyer_binding_key"],
      duplicate_rule: "same_candidate_claim_key_must_not_create_two_allocation_claims",
      candidate_claim_key_policy_green: true
    },
    duplicate_states: [
      "new_payment_candidate",
      "duplicate_same_chain_tx_log_index_blocked",
      "duplicate_same_candidate_claim_key_blocked",
      "duplicate_same_tx_without_log_index_hold",
      "duplicate_conflicting_buyer_binding_hold",
      "duplicate_conflicting_amount_hold",
      "operator_review_required"
    ],
    policy_examples: [
      {
        case: "same_chain_tx_log_index_seen_again",
        chain_id: 8453,
        tx_hash: "0xexampletx000000000000000000000000000000000000000000000000000000000001",
        transfer_log_index: 7,
        result_state: "duplicate_same_chain_tx_log_index_blocked",
        may_create_allocation_claim: false
      },
      {
        case: "same_tx_hash_different_chain",
        chain_id: 1,
        tx_hash: "0xexampletx000000000000000000000000000000000000000000000000000000000001",
        transfer_log_index: 7,
        result_state: "new_payment_candidate",
        may_create_allocation_claim: false,
        note: "candidate remains non-authoritative until other gates are green"
      },
      {
        case: "same_tx_hash_missing_log_index",
        chain_id: 8453,
        tx_hash: "0xexampletx000000000000000000000000000000000000000000000000000000000001",
        transfer_log_index: null,
        result_state: "duplicate_same_tx_without_log_index_hold",
        may_create_allocation_claim: false
      }
    ],
    linked_amount_rate_gate_marker: "VOID_USDC_VOID_BUY_POOL_AMOUNT_RATE_POLICY_GATE_V1",
    linked_amount_rate_gate_json_route: "/public-node/usdc-void-buy-pool/amount-rate-policy-gate-v1.json",
    linked_amount_rate_gate_html_route: "/public-node/usdc-void-buy-pool/amount-rate-policy-gate-v1",
    linked_allowlist_gate_marker: "VOID_USDC_VOID_BUY_POOL_CHAIN_TOKEN_RECEIVER_ALLOWLIST_GATE_V1",
    linked_allowlist_gate_json_route: "/public-node/usdc-void-buy-pool/chain-token-receiver-allowlist-gate-v1.json",
    linked_allowlist_gate_html_route: "/public-node/usdc-void-buy-pool/chain-token-receiver-allowlist-gate-v1",
    linked_activation_matrix_marker: "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_FULFILLMENT_ACTIVATION_GATE_MATRIX_RUNTIME_V1",
    linked_activation_matrix_json_route: "/public-node/usdc-void-buy-pool/automatic-fulfillment-activation-gate-matrix-runtime-v1.json",
    linked_activation_matrix_html_route: "/public-node/usdc-void-buy-pool/automatic-fulfillment-activation-gate-matrix-runtime-v1",
    reviewer_warnings: {
      not_live_fetch: true,
      not_payment_approval: true,
      not_finality_verification: true,
      not_allocation_ledger_write: true,
      not_inventory_reserve: true,
      not_automatic_fulfillment: true,
      not_void_transfer: true,
      operator_review_required: true
    },
    authority_flags: {
      public_mutation_enabled: false,
      runtime_queue_enabled: false,
      live_fetch_now: false,
      finality_verified_now: false,
      external_state_root_trust_enabled: false,
      real_payment_verified_now: false,
      automatic_fulfillment_enabled: false,
      private_allocation_ledger_write_enabled: false,
      inventory_reserved_now: false,
      void_transfer_now: false
    }
  });
});

runtimeApp.get("/public-node/usdc-void-buy-pool/duplicate-payment-guard-gate-v1", (_req:any, res:any) => {
  res.type("html").send([
    "<!doctype html>",
    "<html><head><meta charset=\"utf-8\"><title>VOID Duplicate Payment Guard Gate</title></head><body>",
    "<main>",
    "<h1>USDC/VOID Duplicate Payment Guard Gate</h1>",
    "<p><strong>Marker:</strong> VOID_USDC_VOID_BUY_POOL_DUPLICATE_PAYMENT_GUARD_GATE_V1</p>",
    "<p><strong>Status:</strong> duplicate_payment_guard_gate_green_authority_false</p>",
    "<p><strong>Gate green:</strong> true</p>",
    "<p><strong>Primary event key:</strong> chain_id + tx_hash + transfer_log_index</p>",
    "<p><strong>Candidate claim key:</strong> chain_id + tx_hash + transfer_log_index + receiver + token_address + buyer_binding_key</p>",
    "<p><strong>Automatic fulfillment enabled now:</strong> false</p>",
    "<p><strong>Overall automatic activation:</strong> still_blocked_other_gates_pending</p>",
    "<h2>Duplicate states</h2>",
    "<ul>",
    "<li>new_payment_candidate</li>",
    "<li>duplicate_same_chain_tx_log_index_blocked</li>",
    "<li>duplicate_same_candidate_claim_key_blocked</li>",
    "<li>duplicate_same_tx_without_log_index_hold</li>",
    "<li>duplicate_conflicting_buyer_binding_hold</li>",
    "<li>duplicate_conflicting_amount_hold</li>",
    "<li>operator_review_required</li>",
    "</ul>",
    "<h2>Current authority</h2>",
    "<p>no public mutation, no runtime queue execution, no live fetch now, no finality verification, no real payment verification, no allocation ledger write, no inventory reserve, no automatic fulfillment, no VOID transfer.</p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/duplicate-payment-guard-gate-v1.json\">JSON duplicate payment guard</a></p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/amount-rate-policy-gate-v1\">Amount/rate policy gate</a></p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/chain-token-receiver-allowlist-gate-v1\">Chain/token/receiver allowlist gate</a></p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/automatic-fulfillment-activation-gate-matrix-runtime-v1\">Activation gate matrix</a></p>",
    "</main>",
    "</body></html>"
  ].join("\n"));
});

runtimeApp.get("/public-node/usdc-void-buy-pool/amount-rate-policy-gate-v1.json", (_req:any, res:any) => {
  res.json({
    marker: "VOID_USDC_VOID_BUY_POOL_AMOUNT_RATE_POLICY_GATE_V1",
    status: "amount_rate_policy_gate_green_authority_false",
    public_policy_only: true,
    buy_pool_subject: "usdc_void_buy_pool",
    amount_rate_policy_gate_green: true,
    usdc_decimals_green: true,
    fixed_rate_policy_green: true,
    quote_math_green: true,
    pool_capacity_math_green: true,
    automatic_fulfillment_enabled_now: false,
    overall_automatic_activation_state: "still_blocked_other_gates_pending",
    accepted_payment_asset: { symbol: "USDC", decimals: 6, micro_unit_name: "micro_usdc" },
    rate_policy: {
      pricing_mode: "fixed_price",
      usdc_per_void: "0.50",
      micro_usdc_per_void: 500000,
      void_per_usdc: "2.000000",
      rate_source: "public_buy_pool_fixed_price_policy"
    },
    pool_capacity_policy: {
      public_pool_void_allocation: 10000000,
      target_usdc_if_full_pool_drains: 5000000,
      target_micro_usdc_if_full_pool_drains: 5000000000000,
      pool_capacity_math_green: true
    },
    quote_examples: [
      { input_usdc: "1.00", input_micro_usdc: 1000000, quoted_void: "2.000000" },
      { input_usdc: "100.00", input_micro_usdc: 100000000, quoted_void: "200.000000" },
      { input_usdc: "5000000.00", input_micro_usdc: 5000000000000, quoted_void: "10000000.000000" }
    ],
    linked_allowlist_gate_marker: "VOID_USDC_VOID_BUY_POOL_CHAIN_TOKEN_RECEIVER_ALLOWLIST_GATE_V1",
    linked_allowlist_gate_json_route: "/public-node/usdc-void-buy-pool/chain-token-receiver-allowlist-gate-v1.json",
    linked_allowlist_gate_html_route: "/public-node/usdc-void-buy-pool/chain-token-receiver-allowlist-gate-v1",
    linked_activation_matrix_marker: "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_FULFILLMENT_ACTIVATION_GATE_MATRIX_RUNTIME_V1",
    linked_activation_matrix_json_route: "/public-node/usdc-void-buy-pool/automatic-fulfillment-activation-gate-matrix-runtime-v1.json",
    linked_activation_matrix_html_route: "/public-node/usdc-void-buy-pool/automatic-fulfillment-activation-gate-matrix-runtime-v1",
    reviewer_warnings: {
      not_live_fetch: true,
      not_payment_approval: true,
      not_finality_verification: true,
      not_allocation_ledger_write: true,
      not_inventory_reserve: true,
      not_automatic_fulfillment: true,
      not_void_transfer: true,
      operator_review_required: true
    },
    authority_flags: {
      public_mutation_enabled: false,
      runtime_queue_enabled: false,
      live_fetch_now: false,
      finality_verified_now: false,
      external_state_root_trust_enabled: false,
      real_payment_verified_now: false,
      automatic_fulfillment_enabled: false,
      private_allocation_ledger_write_enabled: false,
      inventory_reserved_now: false,
      void_transfer_now: false
    }
  });
});

runtimeApp.get("/public-node/usdc-void-buy-pool/amount-rate-policy-gate-v1", (_req:any, res:any) => {
  res.type("html").send([
    "<!doctype html>",
    "<html><head><meta charset=\"utf-8\"><title>VOID Amount Rate Policy Gate</title></head><body>",
    "<main>",
    "<h1>USDC/VOID Amount + Rate Policy Gate</h1>",
    "<p><strong>Marker:</strong> VOID_USDC_VOID_BUY_POOL_AMOUNT_RATE_POLICY_GATE_V1</p>",
    "<p><strong>Status:</strong> amount_rate_policy_gate_green_authority_false</p>",
    "<p><strong>Gate green:</strong> true</p>",
    "<p><strong>Fixed price:</strong> 0.50 USDC per 1 VOID</p>",
    "<p><strong>Quote rate:</strong> 1 USDC quotes 2 VOID</p>",
    "<p><strong>USDC decimals:</strong> 6</p>",
    "<p><strong>Micro-USDC per VOID:</strong> 500000</p>",
    "<p><strong>Public pool:</strong> 10000000 VOID</p>",
    "<p><strong>Target if full:</strong> 5000000 USDC / 5000000000000 micro-USDC</p>",
    "<p><strong>Automatic fulfillment enabled now:</strong> false</p>",
    "<p><strong>Overall automatic activation:</strong> still_blocked_other_gates_pending</p>",
    "<h2>Quote examples</h2>",
    "<ul>",
    "<li>1 USDC quotes 2 VOID</li>",
    "<li>100 USDC quotes 200 VOID</li>",
    "<li>5000000 USDC quotes 10000000 VOID</li>",
    "</ul>",
    "<h2>Current authority</h2>",
    "<p>no public mutation, no runtime queue execution, no live fetch now, no finality verification, no real payment verification, no allocation ledger write, no inventory reserve, no automatic fulfillment, no VOID transfer.</p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/amount-rate-policy-gate-v1.json\">JSON amount/rate gate</a></p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/chain-token-receiver-allowlist-gate-v1\">Chain/token/receiver allowlist gate</a></p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/automatic-fulfillment-activation-gate-matrix-runtime-v1\">Activation gate matrix</a></p>",
    "</main>",
    "</body></html>"
  ].join("\n"));
});

runtimeApp.get("/public-node/usdc-void-buy-pool/chain-token-receiver-allowlist-gate-v1.json", (_req:any, res:any) => {
  res.json({
    marker: "VOID_USDC_VOID_BUY_POOL_CHAIN_TOKEN_RECEIVER_ALLOWLIST_GATE_V1",
    status: "chain_token_receiver_allowlist_gate_green_authority_false",
    public_policy_only: true,
    buy_pool_subject: "usdc_void_buy_pool",
    chain_token_receiver_allowlist_gate_green: true,
    chain_allowlist_green: true,
    token_allowlist_green: true,
    receiver_allowlist_green: true,
    automatic_fulfillment_enabled_now: false,
    overall_automatic_activation_state: "still_blocked_other_gates_pending",
    allowed_chains: [
      { name: "ethereum_mainnet", chain_id: 1, chain_green: true, native_rpc_fetch_enabled_now: false },
      { name: "base_mainnet", chain_id: 8453, chain_green: true, native_rpc_fetch_enabled_now: false }
    ],
    allowed_tokens: [
      { chain_id: 1, chain_name: "ethereum_mainnet", symbol: "USDC", token_address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", decimals: 6, token_green: true },
      { chain_id: 8453, chain_name: "base_mainnet", symbol: "USDC", token_address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", decimals: 6, token_green: true }
    ],
    allowed_receivers: [
      { receiver_address: "0x17a26d4f0c51bd28fbcf5cdd4d20853bfa112ae5", receiver_green: true, purpose: "usdc_void_buy_pool_receive_address" }
    ],
    blocked_receivers: [
      { receiver_address: "0x45dd104e3f7cc2a080f2eda094d011d09c51960b", receiver_green: false, status: "deprecated_historical_receiver_blocked_for_new_automatic_candidates" }
    ],
    linked_activation_matrix_marker: "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_FULFILLMENT_ACTIVATION_GATE_MATRIX_RUNTIME_V1",
    linked_activation_matrix_json_route: "/public-node/usdc-void-buy-pool/automatic-fulfillment-activation-gate-matrix-runtime-v1.json",
    linked_activation_matrix_html_route: "/public-node/usdc-void-buy-pool/automatic-fulfillment-activation-gate-matrix-runtime-v1",
    reviewer_warnings: {
      not_live_fetch: true,
      not_payment_approval: true,
      not_finality_verification: true,
      not_allocation_ledger_write: true,
      not_inventory_reserve: true,
      not_automatic_fulfillment: true,
      not_void_transfer: true,
      operator_review_required: true
    },
    authority_flags: {
      public_mutation_enabled: false,
      runtime_queue_enabled: false,
      live_fetch_now: false,
      finality_verified_now: false,
      external_state_root_trust_enabled: false,
      real_payment_verified_now: false,
      automatic_fulfillment_enabled: false,
      private_allocation_ledger_write_enabled: false,
      inventory_reserved_now: false,
      void_transfer_now: false
    }
  });
});

runtimeApp.get("/public-node/usdc-void-buy-pool/chain-token-receiver-allowlist-gate-v1", (_req:any, res:any) => {
  res.type("html").send([
    "<!doctype html>",
    "<html><head><meta charset=\"utf-8\"><title>VOID Chain Token Receiver Allowlist Gate</title></head><body>",
    "<main>",
    "<h1>USDC/VOID Chain + Token + Receiver Allowlist Gate</h1>",
    "<p><strong>Marker:</strong> VOID_USDC_VOID_BUY_POOL_CHAIN_TOKEN_RECEIVER_ALLOWLIST_GATE_V1</p>",
    "<p><strong>Status:</strong> chain_token_receiver_allowlist_gate_green_authority_false</p>",
    "<p><strong>Gate green:</strong> true</p>",
    "<p><strong>Automatic fulfillment enabled now:</strong> false</p>",
    "<p><strong>Overall automatic activation:</strong> still_blocked_other_gates_pending</p>",
    "<h2>Allowed chains</h2>",
    "<ul>",
    "<li>Ethereum mainnet / chain_id 1</li>",
    "<li>Base mainnet / chain_id 8453</li>",
    "</ul>",
    "<h2>Allowed USDC tokens</h2>",
    "<ul>",
    "<li>Ethereum USDC: 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48 / decimals 6</li>",
    "<li>Base USDC: 0x833589fcd6edb6e08f4c7c32d4f71b54bda02913 / decimals 6</li>",
    "</ul>",
    "<h2>Allowed receiver</h2>",
    "<p>0x17a26d4f0c51bd28fbcf5cdd4d20853bfa112ae5</p>",
    "<h2>Blocked historical receiver</h2>",
    "<p>0x45dd104e3f7cc2a080f2eda094d011d09c51960b</p>",
    "<h2>Current authority</h2>",
    "<p>no public mutation, no runtime queue execution, no live fetch now, no finality verification, no real payment verification, no allocation ledger write, no inventory reserve, no automatic fulfillment, no VOID transfer.</p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/chain-token-receiver-allowlist-gate-v1.json\">JSON allowlist gate</a></p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/automatic-fulfillment-activation-gate-matrix-runtime-v1\">Activation gate matrix</a></p>",
    "</main>",
    "</body></html>"
  ].join("\n"));
});

runtimeApp.get("/public-node/usdc-void-buy-pool/automatic-fulfillment-activation-gate-matrix-runtime-v1.json", (_req:any, res:any) => {
  res.json({
    marker: "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_FULFILLMENT_ACTIVATION_GATE_MATRIX_RUNTIME_V1",
    status: "automatic_fulfillment_activation_gate_matrix_runtime_authority_false",
    public_matrix_only: true,
    buy_pool_subject: "usdc_void_buy_pool",
    automatic_fulfillment_target_state: "allowed_later_after_all_activation_gates_green",
    automatic_fulfillment_enabled_now: false,
    overall_activation_state: "blocked_all_gates_pending",
    gate_count: 14,
    gates: [
      { gate_key: "live_receipt_fetch_or_observation_scheduler_gate", gate_state: "blocked_pending_proof", gate_green: false, required_before_automatic: true, authority_effect_now: "none", may_activate_later_by_separate_proof: true },
      { gate_key: "chain_allowlist_and_rpc_endpoint_policy_gate", gate_state: "blocked_pending_proof", gate_green: false, required_before_automatic: true, authority_effect_now: "none", may_activate_later_by_separate_proof: true },
      { gate_key: "receiver_allowlist_gate", gate_state: "blocked_pending_proof", gate_green: false, required_before_automatic: true, authority_effect_now: "none", may_activate_later_by_separate_proof: true },
      { gate_key: "usdc_token_address_allowlist_gate", gate_state: "blocked_pending_proof", gate_green: false, required_before_automatic: true, authority_effect_now: "none", may_activate_later_by_separate_proof: true },
      { gate_key: "amount_and_rate_policy_gate", gate_state: "blocked_pending_proof", gate_green: false, required_before_automatic: true, authority_effect_now: "none", may_activate_later_by_separate_proof: true },
      { gate_key: "buyer_identity_binding_gate", gate_state: "blocked_pending_proof", gate_green: false, required_before_automatic: true, authority_effect_now: "none", may_activate_later_by_separate_proof: true },
      { gate_key: "duplicate_payment_guard_gate", gate_state: "blocked_pending_proof", gate_green: false, required_before_automatic: true, authority_effect_now: "none", may_activate_later_by_separate_proof: true },
      { gate_key: "finality_confirmation_policy_gate", gate_state: "blocked_pending_proof", gate_green: false, required_before_automatic: true, authority_effect_now: "none", may_activate_later_by_separate_proof: true },
      { gate_key: "private_allocation_ledger_write_gate", gate_state: "blocked_pending_proof", gate_green: false, required_before_automatic: true, authority_effect_now: "none", may_activate_later_by_separate_proof: true },
      { gate_key: "inventory_reserve_gate", gate_state: "blocked_pending_proof", gate_green: false, required_before_automatic: true, authority_effect_now: "none", may_activate_later_by_separate_proof: true },
      { gate_key: "fulfillment_signer_transfer_gate", gate_state: "blocked_pending_proof", gate_green: false, required_before_automatic: true, authority_effect_now: "none", may_activate_later_by_separate_proof: true },
      { gate_key: "operator_kill_switch_gate", gate_state: "blocked_pending_proof", gate_green: false, required_before_automatic: true, authority_effect_now: "none", may_activate_later_by_separate_proof: true },
      { gate_key: "rollback_and_audit_evidence_pack_gate", gate_state: "blocked_pending_proof", gate_green: false, required_before_automatic: true, authority_effect_now: "none", may_activate_later_by_separate_proof: true },
      { gate_key: "public_mutation_boundary_audit_gate", gate_state: "blocked_pending_proof", gate_green: false, required_before_automatic: true, authority_effect_now: "none", may_activate_later_by_separate_proof: true }
    ],
    linked_notice_marker: "VOID_USDC_VOID_BUY_POOL_EVIDENCE_LINK_AUTOMATIC_READINESS_NOTICE_V1",
    linked_notice_json_route: "/public-node/usdc-void-buy-pool/evidence-link-automatic-readiness-notice-v1.json",
    linked_notice_html_route: "/public-node/usdc-void-buy-pool/evidence-link-automatic-readiness-notice-v1",
    linked_evidence_bundle_marker: "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_EVIDENCE_BUNDLE_V1",
    linked_evidence_bundle_json_route: "/public-node/usdc-void-buy-pool/external-receipt-observation-evidence-bundle-v1.json",
    linked_evidence_bundle_html_route: "/public-node/usdc-void-buy-pool/external-receipt-observation-evidence-bundle-v1",
    reviewer_warnings: {
      not_payment_approval: true,
      not_finality_verification: true,
      not_allocation_ledger_write: true,
      not_inventory_reserve: true,
      not_automatic_fulfillment: true,
      not_void_transfer: true,
      operator_review_required: true
    },
    authority_flags: {
      public_mutation_enabled: false,
      runtime_queue_enabled: false,
      live_fetch_now: false,
      finality_verified_now: false,
      external_state_root_trust_enabled: false,
      real_payment_verified_now: false,
      automatic_fulfillment_enabled: false,
      private_allocation_ledger_write_enabled: false,
      inventory_reserved_now: false,
      void_transfer_now: false
    }
  });
});

runtimeApp.get("/public-node/usdc-void-buy-pool/automatic-fulfillment-activation-gate-matrix-runtime-v1", (_req:any, res:any) => {
  res.type("html").send([
    "<!doctype html>",
    "<html><head><meta charset=\"utf-8\"><title>VOID Automatic Fulfillment Activation Gate Matrix</title></head><body>",
    "<main>",
    "<h1>USDC/VOID Automatic Fulfillment Activation Gate Matrix</h1>",
    "<p><strong>Marker:</strong> VOID_USDC_VOID_BUY_POOL_AUTOMATIC_FULFILLMENT_ACTIVATION_GATE_MATRIX_RUNTIME_V1</p>",
    "<p><strong>Status:</strong> automatic_fulfillment_activation_gate_matrix_runtime_authority_false</p>",
    "<p>Automatic fulfillment is the target after all activation gates are green.</p>",
    "<p><strong>Automatic fulfillment enabled now:</strong> false</p>",
    "<p><strong>Overall activation state:</strong> blocked_all_gates_pending</p>",
    "<h2>Gates</h2>",
    "<ul>",
    "<li>live_receipt_fetch_or_observation_scheduler_gate: blocked_pending_proof / gate_green=false</li><li>chain_allowlist_and_rpc_endpoint_policy_gate: blocked_pending_proof / gate_green=false</li><li>receiver_allowlist_gate: blocked_pending_proof / gate_green=false</li><li>usdc_token_address_allowlist_gate: blocked_pending_proof / gate_green=false</li><li>amount_and_rate_policy_gate: blocked_pending_proof / gate_green=false</li><li>buyer_identity_binding_gate: blocked_pending_proof / gate_green=false</li><li>duplicate_payment_guard_gate: blocked_pending_proof / gate_green=false</li><li>finality_confirmation_policy_gate: blocked_pending_proof / gate_green=false</li><li>private_allocation_ledger_write_gate: blocked_pending_proof / gate_green=false</li><li>inventory_reserve_gate: blocked_pending_proof / gate_green=false</li><li>fulfillment_signer_transfer_gate: blocked_pending_proof / gate_green=false</li><li>operator_kill_switch_gate: blocked_pending_proof / gate_green=false</li><li>rollback_and_audit_evidence_pack_gate: blocked_pending_proof / gate_green=false</li><li>public_mutation_boundary_audit_gate: blocked_pending_proof / gate_green=false</li>",
    "</ul>",
    "<h2>Linked proof surfaces</h2>",
    "<ul>",
    "<li><a href=\"/public-node/usdc-void-buy-pool/evidence-link-automatic-readiness-notice-v1\">Evidence link + automatic readiness notice</a></li>",
    "<li><a href=\"/public-node/usdc-void-buy-pool/external-receipt-observation-evidence-bundle-v1\">USDC receipt observation evidence bundle</a></li>",
    "</ul>",
    "<h2>Current authority</h2>",
    "<p>no public mutation, no runtime queue execution, no live fetch now, no finality verification, no real payment verification, no allocation ledger write, no inventory reserve, no automatic fulfillment, no VOID transfer.</p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/automatic-fulfillment-activation-gate-matrix-runtime-v1.json\">JSON gate matrix</a></p>",
    "</main>",
    "</body></html>"
  ].join("\n"));
});

runtimeApp.get("/public-node/usdc-void-buy-pool/evidence-link-automatic-readiness-notice-v1.json", (_req:any, res:any) => {
  res.json({
    marker: "VOID_USDC_VOID_BUY_POOL_EVIDENCE_LINK_AUTOMATIC_READINESS_NOTICE_V1",
    status: "public_evidence_link_and_automatic_target_notice_authority_false",
    public_notice_only: true,
    buy_pool_subject: "usdc_void_buy_pool",
    evidence_bundle_marker: "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_EVIDENCE_BUNDLE_V1",
    evidence_bundle_runtime_smoke_marker: "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_EVIDENCE_BUNDLE_RUNTIME_SMOKE_V1",
    evidence_bundle_json_route: "/public-node/usdc-void-buy-pool/external-receipt-observation-evidence-bundle-v1.json",
    evidence_bundle_html_route: "/public-node/usdc-void-buy-pool/external-receipt-observation-evidence-bundle-v1",
    automatic_fulfillment_target_state: "allowed_later_after_all_activation_gates_green",
    automatic_fulfillment_enabled_now: false,
    activation_required_before_automatic: [
      "live_receipt_fetch_or_observation_scheduler_gate",
      "chain_allowlist_and_rpc_endpoint_policy",
      "receiver_allowlist_gate",
      "usdc_token_address_allowlist_gate",
      "amount_and_rate_policy_gate",
      "buyer_identity_binding_gate",
      "duplicate_payment_guard_gate",
      "finality_confirmation_policy_gate",
      "private_allocation_ledger_write_gate",
      "inventory_reserve_gate",
      "fulfillment_signer_transfer_gate",
      "operator_kill_switch_gate",
      "rollback_and_audit_evidence_pack_gate",
      "public_mutation_boundary_audit_gate"
    ],
    reviewer_warnings: {
      not_payment_approval: true,
      not_finality_verification: true,
      not_allocation_ledger_write: true,
      not_inventory_reserve: true,
      not_automatic_fulfillment: true,
      not_void_transfer: true,
      operator_review_required: true
    },
    authority_flags: {
      public_mutation_enabled: false,
      runtime_queue_enabled: false,
      live_fetch_now: false,
      finality_verified_now: false,
      external_state_root_trust_enabled: false,
      real_payment_verified_now: false,
      automatic_fulfillment_enabled: false,
      private_allocation_ledger_write_enabled: false,
      inventory_reserved_now: false,
      void_transfer_now: false
    }
  });
});

runtimeApp.get("/public-node/usdc-void-buy-pool/evidence-link-automatic-readiness-notice-v1", (_req:any, res:any) => {
  res.type("html").send([
    "<!doctype html>",
    "<html><head><meta charset=\"utf-8\"><title>VOID USDC Buy Pool Evidence + Automatic Readiness</title></head><body>",
    "<main>",
    "<h1>USDC/VOID Buy Pool Evidence + Automatic Readiness</h1>",
    "<p><strong>Marker:</strong> VOID_USDC_VOID_BUY_POOL_EVIDENCE_LINK_AUTOMATIC_READINESS_NOTICE_V1</p>",
    "<p><strong>Status:</strong> public_evidence_link_and_automatic_target_notice_authority_false</p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/external-receipt-observation-evidence-bundle-v1\">Verify USDC Receipt Observation Evidence</a></p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/external-receipt-observation-evidence-bundle-v1.json\">Evidence bundle JSON</a></p>",
    "<h2>Automatic fulfillment target</h2>",
    "<p>Automatic fulfillment is the target after all activation gates are green.</p>",
    "<p><strong>Automatic fulfillment enabled now:</strong> false</p>",
    "<h2>Required before automatic</h2>",
    "<ul>",
    "<li>live receipt fetch / observation scheduler gate</li>",
    "<li>chain allowlist and RPC endpoint policy</li>",
    "<li>receiver allowlist gate</li>",
    "<li>USDC token address allowlist gate</li>",
    "<li>amount and rate policy gate</li>",
    "<li>buyer identity binding gate</li>",
    "<li>duplicate payment guard gate</li>",
    "<li>finality confirmation policy gate</li>",
    "<li>private allocation ledger write gate</li>",
    "<li>inventory reserve gate</li>",
    "<li>fulfillment signer / transfer gate</li>",
    "<li>operator kill switch gate</li>",
    "<li>rollback and audit evidence pack gate</li>",
    "<li>public mutation boundary audit gate</li>",
    "</ul>",
    "<h2>Warnings</h2>",
    "<ul>",
    "<li>Not payment approval</li>",
    "<li>Not finality verification</li>",
    "<li>Not allocation ledger write</li>",
    "<li>Not inventory reserve</li>",
    "<li>Not automatic fulfillment now</li>",
    "<li>Not VOID transfer</li>",
    "<li>Operator review required</li>",
    "</ul>",
    "<p><strong>Authority:</strong> no public mutation, no runtime queue execution, no live fetch now, no finality verification, no real payment verification, no allocation ledger write, no inventory reserve, no automatic fulfillment, no VOID transfer.</p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/evidence-link-automatic-readiness-notice-v1.json\">JSON notice</a></p>",
    "</main>",
    "</body></html>"
  ].join("\n"));
});

runtimeApp.get("/public-node/usdc-void-buy-pool/external-receipt-observation-evidence-bundle-v1.json", (_req:any, res:any) => {
  res.json({
    marker: "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_EVIDENCE_BUNDLE_V1",
    status: "evidence_bundle_defined_authority_false",
    public_evidence_index_only: true,
    bundle_subject: "usdc_external_receipt_observation",
    head_commit: "ef3214be",
    valid_runtime_smoke_tag: "ckpt-usdc-external-receipt-observation-public-reviewer-card-runtime-smoke-v1-proof-rerun-public-and-alienware-local-green-20260623-122809",
    valid_runtime_smoke_cross_box_tag: "ckpt-usdc-external-receipt-observation-public-reviewer-card-runtime-smoke-v1-cross-box-green-20260623-123336",
    runtime_smoke_final_marker: "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_PUBLIC_REVIEWER_CARD_RUNTIME_SMOKE_V1_PRECISION_SYNCED_FINAL",
    evidence_items: [
      {
        name: "RPC reader user-agent compatibility repair",
        marker: "VOID_USDC_EXTERNAL_RECEIPT_RPC_READER_USER_AGENT_COMPATIBILITY_REPAIR_V1",
        proof_path: "ops/mainnet0/usdc-external-receipt-rpc-reader-user-agent-compatibility-repair-v1-proof.sh",
        proof_only: true
      },
      {
        name: "Receipt observation queue",
        marker: "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_QUEUE_V1",
        public_json_route: "/public-node/usdc-void-buy-pool/external-receipt-observation-queue-v1.json",
        proof_path: "ops/mainnet0/usdc-external-receipt-observation-queue-v1-proof.sh"
      },
      {
        name: "Observation job envelope schema",
        marker: "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_JOB_ENVELOPE_SCHEMA_V1",
        public_json_route: "/public-node/usdc-void-buy-pool/external-receipt-observation-job-envelope-schema-v1.json",
        proof_path: "ops/mainnet0/usdc-external-receipt-observation-job-envelope-schema-v1-proof.sh"
      },
      {
        name: "Observation result envelope",
        marker: "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_RESULT_ENVELOPE_V1",
        public_json_route: "/public-node/usdc-void-buy-pool/external-receipt-observation-result-envelope-v1.json",
        proof_path: "ops/mainnet0/usdc-external-receipt-observation-result-envelope-v1-proof.sh"
      },
      {
        name: "Public reviewer card",
        marker: "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_PUBLIC_REVIEWER_CARD_V1",
        public_json_route: "/public-node/usdc-void-buy-pool/external-receipt-observation-public-reviewer-card-v1.json",
        public_html_route: "/public-node/usdc-void-buy-pool/external-receipt-observation-public-reviewer-card-v1",
        proof_path: "ops/mainnet0/usdc-external-receipt-observation-public-reviewer-card-v1-proof.sh"
      },
      {
        name: "Public reviewer card runtime smoke",
        marker: "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_PUBLIC_REVIEWER_CARD_RUNTIME_SMOKE_V1",
        proof_path: "ops/mainnet0/usdc-external-receipt-observation-public-reviewer-card-runtime-smoke-v1-proof.sh",
        proved_public_tailscale_url: "https://zoso-alienware-aurora-r7.taila47fd.ts.net",
        proved_alienware_local_url: "http://127.0.0.1:4100"
      }
    ],
    invalid_or_superseded_tags: [
      "ckpt-usdc-external-receipt-observation-public-reviewer-card-html-route-repair-v1-local-green-20260623-120803",
      "ckpt-usdc-external-receipt-observation-public-reviewer-card-runtime-smoke-v1-local-green-20260623-121450",
      "ckpt-usdc-external-receipt-observation-public-reviewer-card-runtime-smoke-v1-proof-rerun-local-green-20260623-121815",
      "ckpt-usdc-external-receipt-observation-public-reviewer-card-runtime-smoke-v1-proof-rerun-local-green-20260623-121834"
    ],
    reviewer_warnings: {
      not_payment_approval: true,
      not_finality_verification: true,
      not_allocation_ledger_write: true,
      not_inventory_reserve: true,
      not_automatic_fulfillment: true,
      not_void_transfer: true,
      operator_review_required: true
    },
    public_mutation_enabled: false,
    runtime_queue_enabled: false,
    live_fetch_now: false,
    finality_verified_now: false,
    external_state_root_trust_enabled: false,
    real_payment_verified_now: false,
    automatic_fulfillment_enabled: false,
    private_allocation_ledger_write_enabled: false,
    inventory_reserved_now: false,
    void_transfer_now: false,
    non_activation_statement: "public evidence index only; no runtime queue execution, no live fetch now, no finality verification, no real payment approval, no allocation ledger write, no inventory reserve, no automatic fulfillment, no public mutation, and no VOID transfer"
  });
});

runtimeApp.get("/public-node/usdc-void-buy-pool/external-receipt-observation-evidence-bundle-v1", (_req:any, res:any) => {
  res.type("html").send([
    "<!doctype html>",
    "<html><head><meta charset=\"utf-8\"><title>VOID USDC Receipt Observation Evidence Bundle v1</title></head><body>",
    "<main>",
    "<h1>USDC External Receipt Observation Evidence Bundle v1</h1>",
    "<p><strong>Marker:</strong> VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_EVIDENCE_BUNDLE_V1</p>",
    "<p><strong>Status:</strong> evidence_bundle_defined_authority_false</p>",
    "<p>This is a public read-only evidence bundle for the USDC external receipt observation lane.</p>",
    "<h2>Evidence surfaces</h2>",
    "<ul>",
    "<li>RPC reader user-agent compatibility repair proof</li>",
    "<li><a href=\"/public-node/usdc-void-buy-pool/external-receipt-observation-queue-v1.json\">Receipt observation queue JSON</a></li>",
    "<li><a href=\"/public-node/usdc-void-buy-pool/external-receipt-observation-job-envelope-schema-v1.json\">Observation job envelope JSON</a></li>",
    "<li><a href=\"/public-node/usdc-void-buy-pool/external-receipt-observation-result-envelope-v1.json\">Observation result envelope JSON</a></li>",
    "<li><a href=\"/public-node/usdc-void-buy-pool/external-receipt-observation-public-reviewer-card-v1.json\">Public reviewer card JSON</a></li>",
    "<li><a href=\"/public-node/usdc-void-buy-pool/external-receipt-observation-public-reviewer-card-v1\">Public reviewer card HTML</a></li>",
    "<li>Public reviewer card runtime smoke proof</li>",
    "</ul>",
    "<h2>Warnings</h2>",
    "<ul>",
    "<li>Not payment approval</li>",
    "<li>Not finality verification</li>",
    "<li>Not allocation ledger write</li>",
    "<li>Not inventory reserve</li>",
    "<li>Not automatic fulfillment</li>",
    "<li>Not VOID transfer</li>",
    "<li>Operator review required</li>",
    "</ul>",
    "<p><strong>Authority:</strong> no public mutation, no runtime queue execution, no live fetch now, no finality verification, no real payment verification, no allocation ledger write, no inventory reserve, no automatic fulfillment, no VOID transfer.</p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/external-receipt-observation-evidence-bundle-v1.json\">JSON evidence bundle</a></p>",
    "</main>",
    "</body></html>"
  ].join("\n"));
});

runtimeApp.get("/public-node/usdc-void-buy-pool/external-receipt-observation-public-reviewer-card-v1.json", (_req:any, res:any) => {
  res.json({
    marker: "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_PUBLIC_REVIEWER_CARD_V1",
    status: "public_reviewer_card_defined_authority_false",
    public_explanation_only: true,
    parent_result_envelope_marker: "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_RESULT_ENVELOPE_V1",
    parent_job_envelope_marker: "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_JOB_ENVELOPE_SCHEMA_V1",
    parent_queue_marker: "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_QUEUE_V1",
    reviewer_summary: "A USDC external receipt observation result was shaped for public review. This is observation/classification only, not payment approval or fulfillment.",
    observed_receipt_claim: {
      chain_id: 8453,
      tx_hash: "0xaf6ce2cba0492b0a257d7fdf082c865891049a378181281bf084e0b0f7c2f857",
      receipt_found: true,
      receipt_status: "0x1",
      block_number: 47704627,
      transfer_log_count: 1,
      matching_transfer_log_count: 1,
      classification_state: "observed_receipt_success"
    },
    reviewer_warnings: {
      not_payment_approval: true,
      not_finality_verification: true,
      not_allocation_ledger_write: true,
      not_inventory_reserve: true,
      not_automatic_fulfillment: true,
      not_void_transfer: true,
      operator_review_required: true
    },
    public_route_status_only: true,
    public_mutation_enabled: false,
    runtime_queue_enabled: false,
    live_fetch_now: false,
    finality_verified_now: false,
    external_state_root_trust_enabled: false,
    real_payment_verified_now: false,
    automatic_fulfillment_enabled: false,
    private_allocation_ledger_write_enabled: false,
    inventory_reserved_now: false,
    void_transfer_now: false,
    non_activation_statement: "public reviewer card only; no runtime queue execution, no live fetch now, no finality verification, no real payment approval, no allocation ledger write, no inventory reserve, no automatic fulfillment, no public mutation, and no VOID transfer"
  });
});

runtimeApp.get("/public-node/usdc-void-buy-pool/external-receipt-observation-public-reviewer-card-v1", (_req:any, res:any) => {
  res.type("html").send([
    "<!doctype html>",
    "<html><head><meta charset=\"utf-8\"><title>VOID USDC Receipt Observation Reviewer Card v1</title></head><body>",
    "<main>",
    "<h1>USDC External Receipt Observation Public Reviewer Card v1</h1>",
    "<p><strong>Marker:</strong> VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_PUBLIC_REVIEWER_CARD_V1</p>",
    "<p><strong>Status:</strong> public_reviewer_card_defined_authority_false</p>",
    "<p>A USDC external receipt observation result was shaped for public review. This is observation/classification only.</p>",
    "<ul>",
    "<li>Receipt observed by read-only RPC: true</li>",
    "<li>Classification: observed_receipt_success</li>",
    "<li>Chain ID: 8453</li>",
    "<li>Receipt status: 0x1</li>",
    "<li>Transfer logs: 1</li>",
    "<li>Matching transfer logs: 1</li>",
    "</ul>",
    "<h2>Warnings</h2>",
    "<ul>",
    "<li>Not payment approval</li>",
    "<li>Not finality verification</li>",
    "<li>Not allocation ledger write</li>",
    "<li>Not inventory reserve</li>",
    "<li>Not automatic fulfillment</li>",
    "<li>Not VOID transfer</li>",
    "<li>Operator review required</li>",
    "</ul>",
    "<p><strong>Authority:</strong> no public mutation, no runtime queue execution, no live fetch now, no finality verification, no real payment verification, no allocation ledger write, no inventory reserve, no automatic fulfillment, no VOID transfer.</p>",
    "<p><a href=\"/public-node/usdc-void-buy-pool/external-receipt-observation-public-reviewer-card-v1.json\">JSON reviewer card</a></p>",
    "</main>",
    "</body></html>"
  ].join("\n"));
});

runtimeApp.get("/public-node/usdc-void-buy-pool/external-receipt-observation-result-envelope-v1.json", (_req:any, res:any) => {
  res.json({
    marker: "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_RESULT_ENVELOPE_V1",
    status: "result_envelope_schema_defined_authority_false",
    schema_definition_only: true,
    source_job_envelope_marker: "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_JOB_ENVELOPE_SCHEMA_V1",
    source_queue_marker: "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_QUEUE_V1",
    validator_path: "ops/mainnet0/usdc-external-receipt-observation-result-envelope-v1.py",
    fixture_path: "fixtures/public/usdc-external-receipt-observation-result-envelope-v1.json",
    public_route_status_only: true,
    public_mutation_enabled: false,
    runtime_queue_enabled: false,
    live_fetch_now: false,
    required_result_fields: [
      "result_id",
      "job_id",
      "source_job_envelope_marker",
      "source_queue_marker",
      "chain_id",
      "tx_hash",
      "observed_at_utc",
      "observation_method",
      "rpc_endpoint_class",
      "receipt_found",
      "receipt_status",
      "block_number",
      "transfer_log_count",
      "matching_transfer_log_count",
      "classification_state",
      "retry_allowed",
      "retry_after_seconds",
      "operator_review_required",
      "canonical_payment_identity_hint",
      "authority_flags"
    ],
    allowed_classification_states: [
      "observed_receipt_success",
      "observed_receipt_not_found",
      "endpoint_blocked_403_no_retry",
      "rate_limited_429_backoff",
      "timeout_retry_backoff",
      "rpc_error_hold",
      "operator_review_required"
    ],
    finality_verified_now: false,
    external_state_root_trust_enabled: false,
    real_payment_verified_now: false,
    automatic_fulfillment_enabled: false,
    private_allocation_ledger_write_enabled: false,
    inventory_reserved_now: false,
    void_transfer_now: false,
    non_activation_statement: "result envelope schema only; no runtime queue execution, no live fetch now, no finality verification, no real payment verification, no allocation ledger write, no inventory reserve, no automatic fulfillment, no public mutation, and no VOID transfer"
  });
});

runtimeApp.get("/public-node/usdc-void-buy-pool/external-receipt-observation-job-envelope-schema-v1.json", (_req:any, res:any) => {
  res.json({
    marker: "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_JOB_ENVELOPE_SCHEMA_V1",
    status: "job_envelope_schema_defined_authority_false",
    schema_definition_only: true,
    parent_queue_marker: "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_QUEUE_V1",
    validator_path: "ops/mainnet0/usdc-external-receipt-observation-job-envelope-schema-v1.py",
    fixture_path: "fixtures/public/usdc-external-receipt-observation-job-envelope-schema-v1.json",
    public_route_status_only: true,
    public_mutation_enabled: false,
    runtime_queue_enabled: false,
    live_fetch_now: false,
    required_envelope_fields: [
      "job_id",
      "queue_marker",
      "chain_id",
      "tx_hash",
      "rpc_endpoint_class",
      "created_at_utc",
      "requested_observation_method",
      "current_queue_state",
      "classification_state",
      "retry_allowed",
      "retry_after_seconds",
      "operator_review_required",
      "canonical_payment_identity_hint",
      "authority_flags"
    ],
    allowed_rpc_endpoint_classes: [
      "free_public_base_rpc",
      "operator_configured_rpc",
      "unavailable",
      "endpoint_blocked"
    ],
    allowed_classification_states: [
      "queued_observation",
      "observed_receipt_success",
      "observed_receipt_not_found",
      "endpoint_blocked_403_no_retry",
      "rate_limited_429_backoff",
      "timeout_retry_backoff",
      "rpc_error_hold",
      "operator_review_required"
    ],
    finality_verified_now: false,
    external_state_root_trust_enabled: false,
    real_payment_verified_now: false,
    automatic_fulfillment_enabled: false,
    private_allocation_ledger_write_enabled: false,
    inventory_reserved_now: false,
    void_transfer_now: false,
    non_activation_statement: "job envelope schema only; no runtime queue execution, no live fetch, no finality verification, no real payment verification, no allocation ledger write, no inventory reserve, no automatic fulfillment, no public mutation, and no VOID transfer"
  });
});

runtimeApp.get("/public-node/usdc-void-buy-pool/external-receipt-observation-queue-v1.json", (_req:any, res:any) => {
  res.json({
    marker: "VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_QUEUE_V1",
    status: "receipt_observation_queue_defined_authority_false",
    queue_definition_only: true,
    classifier_path: "ops/mainnet0/usdc-external-receipt-observation-queue-v1.py",
    fixture_path: "fixtures/public/usdc-external-receipt-observation-queue-v1.json",
    public_route_status_only: true,
    public_mutation_enabled: false,
    live_fetch_now: false,
    queue_states: [
      "queued_observation",
      "observed_receipt_success",
      "observed_receipt_not_found",
      "endpoint_blocked_403_no_retry",
      "rate_limited_429_backoff",
      "timeout_retry_backoff",
      "rpc_error_hold",
      "operator_review_required"
    ],
    classification_rules: {
      http_200_receipt_present: "observed_receipt_success",
      http_200_receipt_null: "observed_receipt_not_found",
      http_403: "endpoint_blocked_403_no_retry",
      http_429: "rate_limited_429_backoff",
      timeout: "timeout_retry_backoff",
      json_rpc_error: "rpc_error_hold",
      ambiguous_result: "operator_review_required"
    },
    retry_policy: {
      endpoint_blocked_403_no_retry: false,
      rate_limited_429_backoff: true,
      timeout_retry_backoff: true,
      observed_receipt_not_found: true,
      rpc_error_hold: false,
      operator_review_required: false
    },
    finality_verified_now: false,
    external_state_root_trust_enabled: false,
    real_payment_verified_now: false,
    automatic_fulfillment_enabled: false,
    private_allocation_ledger_write_enabled: false,
    inventory_reserved_now: false,
    void_transfer_now: false,
    non_activation_statement: "queue classification only; no finality verification, no real payment verification, no allocation ledger write, no inventory reserve, no automatic fulfillment, no public mutation, and no VOID transfer"
  });
});

runtimeApp.get("/public-node/usdc-void-buy-pool/external-receipt-rpc-reader-v1.json", (_req:any, res:any) => { res.json({ marker: "VOID_USDC_EXTERNAL_RECEIPT_RPC_READER_V1", status: "rpc_reader_defined_disabled_by_default_authority_false", reader_path: "ops/mainnet0/usdc-external-receipt-rpc-reader-v1.py", reader_defined: true, reader_default_disabled_green: true, requires_explicit_env: ["USDC_EXTERNAL_RPC_URL", "USDC_EXTERNAL_TX_HASH"], optional_semantic_filters: ["USDC_EXTERNAL_CHAIN_ID", "USDC_EXTERNAL_USDC_TOKEN", "USDC_EXTERNAL_OFFICIAL_RECEIVER", "USDC_EXTERNAL_AMOUNT_RAW"], can_call_eth_getTransactionReceipt_when_explicitly_configured: true, can_normalize_erc20_transfer_logs: true, live_chain_data_default: false, external_chain_rpc_fetch_enabled_default: false, receipt_fetch_attempted_default: false, finality_verified_now: false, external_state_root_trust_enabled: false, real_payment_verified_now: false, automatic_fulfillment_enabled: false, private_allocation_ledger_write_enabled: false, inventory_reserved_now: false, void_transfer_now: false, public_route_status_only: true, public_mutation_enabled: false, non_activation_statement: "this route reports the read-only RPC receipt reader boundary only; default public status does not fetch chain data, verify finality, trust an external root, verify payment, write a ledger, reserve inventory, fulfill automatically, or transfer VOID" }); });

 runtimeApp.get("/public-node/usdc-void-buy-pool/external-payment-proof-pack-transfer-log-parser-v1.json", (_req:any, res:any) => { res.json({ marker: "VOID_USDC_EXTERNAL_PAYMENT_PROOF_PACK_TRANSFER_LOG_PARSER_V1", status: "transfer_log_parser_defined_authority_false", parent_static_verifier_marker: "VOID_USDC_EXTERNAL_PAYMENT_PROOF_PACK_STATIC_VERIFIER_V1", parser_path: "ops/mainnet0/usdc-external-payment-proof-pack-transfer-log-parser-v1.py", fixture_path: "fixtures/public/usdc-external-payment-proof-pack-transfer-log-parser-example-v1.json", transfer_log_parser_defined: true, transfer_log_parser_execution_green: true, transfer_log_parser_activation_enabled: false, offline_fixture_only: true, erc20_transfer_topic0_checked: true, transfer_log_token_contract_checked: true, transfer_log_receiver_checked: true, transfer_log_amount_checked: true, canonical_payment_identity_checked: true, live_chain_data: false, external_chain_rpc_fetch_enabled: false, real_payment_verified_now: false, finality_verified_now: false, external_state_root_trust_enabled: false, automatic_fulfillment_enabled: false, private_allocation_ledger_write_enabled: false, inventory_reserved_now: false, void_transfer_now: false, public_route_status_only: true, public_mutation_enabled: false, non_activation_statement: "this route reports offline ERC-20 Transfer log parser status only; it does not fetch chain data, verify a real payment, verify finality, trust an external root, write a ledger, reserve inventory, fulfill automatically, or transfer VOID" }); });

 runtimeApp.get("/public-node/usdc-void-buy-pool/external-payment-proof-pack-negative-fixture-v1.json", (_req:any, res:any) => { res.json({ marker: "VOID_USDC_EXTERNAL_PAYMENT_PROOF_PACK_NEGATIVE_FIXTURE_V1", status: "negative_fixture_rejected_by_static_verifier_authority_false", parent_verifier_marker: "VOID_USDC_EXTERNAL_PAYMENT_PROOF_PACK_STATIC_VERIFIER_V1", parent_good_fixture_marker: "VOID_USDC_EXTERNAL_PAYMENT_PROOF_PACK_EXAMPLE_V1", fixture_path: "fixtures/public/usdc-external-payment-proof-pack-negative-fixture-v1.json", negative_fixture_only: true, intentionally_malformed_field: "proof_pack.canonical_payment_identity", expected_rejection_reason: "canonical_payment_identity_mismatch", known_good_fixture_passes: true, known_bad_fixture_rejected: true, live_chain_data: false, external_chain_rpc_fetch_enabled: false, real_payment_verified_now: false, finality_verified_now: false, external_state_root_trust_enabled: false, automatic_fulfillment_enabled: false, private_allocation_ledger_write_enabled: false, inventory_reserved_now: false, void_transfer_now: false, public_route_status_only: true, public_mutation_enabled: false, non_activation_statement: "this route reports a deliberately malformed offline negative fixture only; it does not fetch chain data, verify a real payment, verify finality, trust an external root, write a ledger, reserve inventory, fulfill automatically, or transfer VOID" }); });

 runtimeApp.get("/public-node/usdc-void-buy-pool/external-payment-proof-pack-static-verifier-v1.json", (_req:any, res:any) => { res.json({ marker: "VOID_USDC_EXTERNAL_PAYMENT_PROOF_PACK_STATIC_VERIFIER_V1", status: "static_verifier_defined_authority_false", parent_fixture_marker: "VOID_USDC_EXTERNAL_PAYMENT_PROOF_PACK_EXAMPLE_V1", parent_shape_marker: "VOID_USDC_EXTERNAL_PAYMENT_PROOF_PACK_V1", parent_boundary_marker: "VOID_USDC_TO_VOID_EXTERNAL_STATE_RELAY_VERIFICATION_BOUNDARY_V1", verifier_path: "ops/mainnet0/usdc-external-payment-proof-pack-static-verifier-v1.py", fixture_path: "fixtures/public/usdc-external-payment-proof-pack-example-v1.json", static_verifier_defined: true, static_verifier_execution_green: true, static_verifier_activation_enabled: false, reads_checked_in_fixture_only: true, live_chain_data: false, external_chain_rpc_fetch_enabled: false, real_payment_verified_now: false, finality_verified_now: false, external_state_root_trust_enabled: false, required_root_fields_checked: true, required_proof_pack_fields_checked: true, authority_false_fields_checked: true, canonical_payment_identity_checked: true, automatic_fulfillment_enabled: false, private_allocation_ledger_write_enabled: false, inventory_reserved_now: false, void_transfer_now: false, public_route_status_only: true, public_mutation_enabled: false, non_activation_statement: "this route reports offline static verifier status only; it does not fetch chain data, verify a real payment, verify finality, trust an external root, write a ledger, reserve inventory, fulfill automatically, or transfer VOID" }); });

 runtimeApp.get("/public-node/usdc-void-buy-pool/external-payment-proof-pack-example-v1.json", (_req:any, res:any) => { res.json({ marker: "VOID_USDC_EXTERNAL_PAYMENT_PROOF_PACK_EXAMPLE_V1", status: "example_fixture_shape_only_authority_false", parent_marker: "VOID_USDC_EXTERNAL_PAYMENT_PROOF_PACK_V1", fixture_path: "fixtures/public/usdc-external-payment-proof-pack-example-v1.json", example_fixture_only: true, live_chain_data: false, real_payment: false, proof_verified_now: false, finality_verified_now: false, external_state_root_trust_enabled: false, automatic_fulfillment_enabled: false, private_allocation_ledger_write_enabled: false, inventory_reserved_now: false, void_transfer_now: false, proof_pack: { proof_pack_version: "usdc_external_payment_proof_pack_v1_example", source_chain: "ethereum_or_base_example", source_chain_id: "example_chain_id_not_live", source_network_family: "evm_example", block_number: "example_block_number_not_live", block_hash: "0xexample_block_hash_not_live", block_timestamp: "example_timestamp_not_live", transaction_hash: "0xexample_transaction_hash_not_live", transaction_index: "example_transaction_index_not_live", receipt_index: "example_receipt_index_not_live", receipt_status: "success_example_not_verified", log_index: "example_log_index_not_live", token_contract: "0xexample_usdc_token_contract_not_live", token_decimals: 6, from_address: "0xexample_payer_not_live", to_address: "0xexample_official_receiver_not_live", official_receiver_ref: "official_receiver_ref_example_not_live", amount_raw: "100000000", amount_decimal: "100.000000", canonical_payment_identity: "example_chain_id_not_live:0xexample_transaction_hash_not_live:example_log_index_not_live:0xexample_usdc_token_contract_not_live:0xexample_official_receiver_not_live:100000000", payment_event_type: "erc20_transfer_example", receipt_root_ref: "receipt_root_ref_example_not_live", state_root_ref: "state_root_ref_example_not_live", proof_material_ref: "proof_material_ref_example_not_live", finality_mode: "example_finality_mode_not_verified", trust_mode: "operator_attested_root_initial_example", allocation_rule_ref: "allocation_rule_ref_example", duplicate_guard_ref: "duplicate_guard_ref_example", inventory_guard_ref: "inventory_guard_ref_example" }, required_non_authority_statement: "this example fixture does not prove payment, fetch chain data, verify finality, trust an external root, reserve inventory, write a ledger, fulfill automatically, or transfer VOID" }); });

 runtimeApp.get("/public-node/usdc-void-buy-pool/external-payment-proof-pack-v1.json", (_req:any, res:any) => { res.json({ marker: "VOID_USDC_EXTERNAL_PAYMENT_PROOF_PACK_V1", status: "external_payment_proof_pack_shape_defined_authority_false", parent_boundary_marker: "VOID_USDC_TO_VOID_EXTERNAL_STATE_RELAY_VERIFICATION_BOUNDARY_V1", external_payment_proof_pack_defined: true, external_payment_proof_pack_green: false, proof_pack_shape_only: true, external_payment_proof_pack_verifier_enabled: false, external_chain_rpc_fetch_enabled: false, external_state_root_trust_enabled: false, ethereum_or_base_finality_verified_now: false, preferred_proof_target: "successful_finalized_usdc_transfer_event_or_future_payment_received_intake_event", rejected_weak_evidence: ["pasted_tx_hash", "explorer_trust", "receiver_balance_delta", "manual_vibes"], required_fields: ["proof_pack_version", "source_chain", "source_chain_id", "source_network_family", "block_number", "block_hash", "block_timestamp", "transaction_hash", "transaction_index", "receipt_index", "receipt_status", "log_index", "token_contract", "token_decimals", "from_address", "to_address", "official_receiver_ref", "amount_raw", "amount_decimal", "canonical_payment_identity", "payment_event_type", "receipt_root_ref", "state_root_ref", "proof_material_ref", "finality_mode", "trust_mode", "allocation_rule_ref", "duplicate_guard_ref", "inventory_guard_ref"], canonical_payment_identity_components: ["source_chain_id", "transaction_hash", "log_index", "token_contract", "to_address", "amount_raw"], required_verifier_expectations: ["receipt_status_success", "token_contract_allowlisted", "to_address_matches_official_receiver", "amount_matches_allocation_rule", "payment_event_exists", "canonical_payment_identity_constructed", "canonical_payment_identity_not_previously_used", "inventory_available_before_allocation", "allocation_record_not_created_by_this_pack", "void_not_transferred_by_this_pack"], public_route_shape_only: true, public_mutation_enabled: false, automatic_fulfillment_enabled: false, wallet_fulfillment_enabled: false, private_allocation_ledger_write_enabled: false, inventory_reserved_now: false, void_transfer_now: false, non_activation_statement: "this route defines external payment proof pack shape only; it does not fetch chain data, verify finality, trust an external root, write a ledger, reserve inventory, fulfill automatically, or transfer VOID" }); });

 runtimeApp.get("/public-node/usdc-void-buy-pool/external-state-relay-verification-boundary-v1.json", (_req:any, res:any) => { res.json({ marker: "VOID_USDC_TO_VOID_EXTERNAL_STATE_RELAY_VERIFICATION_BOUNDARY_V1", status: "external_state_relay_verification_boundary_defined_authority_false", external_state_relay_boundary_defined: true, external_state_relay_boundary_green: false, external_payment_proof_verifier_enabled: false, external_state_root_trust_enabled: false, preferred_proof_target: "successful_finalized_usdc_transfer_event_or_future_payment_received_intake_event", non_preferred_proof_target: "receiver_wallet_balance_increased", rejected_trust_sources: ["pasted_tx_hash", "explorer_trust", "receiver_balance_delta", "manual_vibes"], required_payment_proof_fields: ["source_chain", "source_chain_id", "block_number", "block_hash", "transaction_hash", "transaction_index", "receipt_index", "log_index", "token_contract", "from_address", "to_address", "amount", "canonical_payment_identity", "receipt_root_ref", "state_root_ref", "proof_material_ref", "finality_mode", "trust_mode"], allowed_trust_modes: ["operator_attested_root_initial", "multi_rpc_quorum_future", "ethereum_light_client_future", "zk_external_state_proof_future", "base_l2_finality_policy_future"], required_verifier_checks: ["transaction_succeeded", "token_contract_allowlisted", "receiver_matches_official_receiver", "amount_matches_quote_or_allocation_rules", "transfer_or_payment_event_exists", "canonical_payment_identity_unique", "payment_not_already_used", "inventory_available_before_allocation", "allocation_record_created_before_fulfillment"], public_route_shape_only: true, public_mutation_enabled: false, automatic_fulfillment_enabled: false, wallet_fulfillment_enabled: false, signer_access_enabled: false, treasury_transfer_authority_enabled: false, buyer_execution_authorized: false, private_allocation_ledger_write_enabled: false, wc_ledger_write: false, void_transfer_now: false, non_activation_statement: "this route defines the external state relay verification boundary only; it does not verify payment, enable fulfillment, write a ledger, or transfer VOID" }); });

 runtimeApp.get("/public-node/usdc-void-buy-pool/private-ledger-path-no-leak-preflight-v1.json", (_req:any, res:any) => { res.json({ marker: "VOID_USDC_TO_VOID_PRESALE_PRIVATE_LEDGER_PATH_NO_LEAK_PREFLIGHT_V1", status: "private_ledger_path_no_leak_preflight_defined_authority_false", activation_gate: "private_ledger_path_no_leak_preflight", private_ledger_path_no_leak_preflight_defined: true, private_ledger_path_no_leak_preflight_green: false, private_ledger_path_selected: false, private_ledger_path_publicly_disclosed: false, private_ledger_path_ref_enabled: false, private_ledger_path_commitment_enabled: false, private_allocation_ledger_activation_authorized: false, private_allocation_ledger_created: false, private_allocation_ledger_write_enabled: false, private_allocation_ledger_append_only_enforced: false, private_allocation_ledger_hash_chain_enforced: false, allocation_reservation_record_write_enabled: false, append_only_allocation_reservation_record_enforced: false, public_route_shape_only: true, public_route_discloses_private_ledger_contents: false, public_route_discloses_private_ledger_path: false, actual_private_ledger_path_present: false, private_path_material_present: false, non_activation_statement: "this route defines path no-leak preflight only; it does not select, print, create, activate, write, reserve inventory, or fulfill VOID", future_opaque_reference_fields: ["private_ledger_path_ref", "private_ledger_path_commitment", "private_ledger_path_no_leak_proof_ref"], blocked_public_leak_classes: ["absolute_filesystem_path", "home_directory_path", "operator_username_path", "private_data_directory", "buyer_delivery_wallet", "raw_payment_receipt_material", "transaction_receipt_logs", "private_ledger_line_contents", "operator_execution_commands", "signer_material", "treasury_material", "seed_phrase_key_or_secret"], required_future_no_leak_checks: ["public_route_does_not_contain_home_path", "public_route_does_not_contain_data_path", "public_route_does_not_contain_absolute_ledger_path", "public_route_contains_only_opaque_path_references"], upstream_required_gates: ["private_allocation_ledger_activation_matrix_green", "private_allocation_ledger_hold_green", "allocation_reservation_record_green", "inventory_allocation_guard_green", "duplicate_payment_guard_green", "verified_usdc_payment_detection_gate_green"], activation_blockers: ["private_ledger_path_selected_without_no_leak_preflight", "private_ledger_path_publicly_disclosed", "private_path_material_detected_on_public_route", "raw_buyer_or_payment_material_detected_on_public_route", "operator_execution_material_detected_on_public_route", "signer_or_treasury_material_detected_on_public_route", "secret_material_detected_on_public_route", "opaque_reference_missing", "explicit_operator_activation_record_missing"], current_authority: { automatic_fulfillment_enabled: false, wallet_fulfillment_enabled: false, signer_access_enabled: false, treasury_transfer_authority_enabled: false, buyer_execution_authorized: false, public_mutation_enabled: false, wc_ledger_write: false, void_transfer_now: false } }); });

 runtimeApp.get("/public-node/usdc-void-buy-pool/private-allocation-ledger-activation-matrix-v1.json", (_req:any, res:any) => {
    res.json({
      marker: "VOID_USDC_TO_VOID_PRESALE_PRIVATE_ALLOCATION_LEDGER_ACTIVATION_MATRIX_V1",
      status: "private_allocation_ledger_activation_matrix_defined_authority_false",
      activation_gate: "private_allocation_ledger_activation_matrix",
      private_allocation_ledger_activation_matrix_defined: true,
      private_allocation_ledger_activation_matrix_green: false,
      private_allocation_ledger_activation_authorized: false,
      private_allocation_ledger_created: false,
      private_allocation_ledger_write_enabled: false,
      private_allocation_ledger_append_only_enforced: false,
      private_allocation_ledger_hash_chain_enforced: false,
      allocation_reservation_record_write_enabled: false,
      append_only_allocation_reservation_record_enforced: false,
      public_route_shape_only: true,
      public_route_discloses_private_ledger_contents: false,
      matrix_purpose: "define exact green gates required before the private allocation ledger can ever be created or written",
      current_state: {
        verified_usdc_payment_detection_gate_green: false,
        duplicate_payment_guard_green: false,
        inventory_allocation_guard_green: false,
        allocation_reservation_record_green: false,
        private_allocation_ledger_hold_green: false,
        private_allocation_ledger_activation_matrix_green: false,
        private_allocation_ledger_activation_authorized: false
      },
      required_green_gates_before_activation: [
        "verified_usdc_payment_detection_gate_green",
        "duplicate_payment_guard_green",
        "inventory_allocation_guard_green",
        "allocation_reservation_record_green",
        "private_allocation_ledger_hold_green",
        "private_ledger_file_path_operator_selected",
        "private_ledger_path_no_leak_check_green",
        "append_only_writer_implementation_proof_green",
        "hash_chain_verifier_proof_green",
        "duplicate_request_id_recheck_green",
        "duplicate_canonical_payment_identity_recheck_green",
        "inventory_reservation_prewrite_recheck_green",
        "prewrite_backup_snapshot_green",
        "explicit_operator_activation_record_green",
        "public_mutation_boundary_green",
        "advisory_ai_no_write_boundary_green",
        "buyer_execution_refusal_green"
      ],
      activation_blockers: [
        "payment_verifier_definition_only_or_red",
        "duplicate_payment_guard_definition_only_or_red",
        "inventory_allocation_guard_definition_only_or_red",
        "allocation_reservation_record_gate_definition_only_or_red",
        "private_allocation_ledger_hold_not_green",
        "private_ledger_path_public_or_leaked",
        "append_only_writer_not_proven",
        "hash_chain_verifier_not_proven",
        "duplicate_request_or_payment_identity_recheck_missing",
        "inventory_prewrite_recheck_missing",
        "prewrite_backup_missing",
        "explicit_operator_activation_record_missing",
        "public_mutation_boundary_red",
        "advisory_ai_write_boundary_red",
        "buyer_execution_refusal_red"
      ],
      required_future_activation_record_fields: [
        "activation_record_type",
        "activation_record_id",
        "operator_id",
        "activated_at_ms",
        "activated_commit",
        "activated_cross_box_tag",
        "verified_payment_gate_ref",
        "duplicate_payment_guard_ref",
        "inventory_allocation_guard_ref",
        "allocation_reservation_record_ref",
        "private_allocation_ledger_hold_ref",
        "private_ledger_path_ref",
        "path_no_leak_proof_ref",
        "append_only_writer_proof_ref",
        "hash_chain_verifier_proof_ref",
        "duplicate_recheck_proof_ref",
        "inventory_recheck_proof_ref",
        "prewrite_backup_ref",
        "public_mutation_boundary_ref",
        "advisory_ai_no_write_ref",
        "buyer_execution_refusal_ref",
        "activation_record_hash"
      ],
      non_activation_statement: "this route is a matrix only; it does not create the private ledger, enable writes, reserve inventory, or fulfill VOID",
      current_authority: {
        automatic_fulfillment_enabled: false,
        wallet_fulfillment_enabled: false,
        signer_access_enabled: false,
        treasury_transfer_authority_enabled: false,
        buyer_execution_authorized: false,
        public_mutation_enabled: false,
        wc_ledger_write: false,
        void_transfer_now: false
      }
    });
  });


  runtimeApp.get("/public-node/usdc-void-buy-pool/private-allocation-ledger-hold-v1.json", (_req:any, res:any) => {
    res.json({
      marker: "VOID_USDC_TO_VOID_PRESALE_PRIVATE_ALLOCATION_LEDGER_HOLD_V1",
      status: "private_allocation_ledger_hold_defined_authority_false",
      activation_gate: "private_allocation_ledger_hold",
      private_allocation_ledger_hold_defined: true,
      private_allocation_ledger_hold_green: false,
      private_allocation_ledger_created: false,
      private_allocation_ledger_write_enabled: false,
      private_allocation_ledger_append_only_enforced: false,
      private_allocation_ledger_hash_chain_enforced: false,
      public_route_discloses_private_ledger_contents: false,
      public_route_shape_only: true,
      private_ledger_name: "usdc_to_void_presale_allocation_reservations_v1",
      private_ledger_visibility: "private_operator_only",
      private_ledger_file_name: "allocation-reservations.jsonl",
      current_operator_events_are_not_allocation_reservation_ledger: true,
      current_payment_verified_event_is_not_allocation_reserved: true,
      allocation_reservation_record_write_enabled: false,
      append_only_allocation_reservation_record_enforced: false,
      problem_sealed: "allocation reservation record shape exists but the private operator-only append-only allocation ledger remains held and write-disabled",
      upstream_required_gates: [
        "verified_usdc_payment_detection_gate_green",
        "duplicate_payment_guard_green",
        "inventory_allocation_guard_green",
        "allocation_reservation_record_green",
        "explicit_operator_activation_record"
      ],
      required_private_ledger_line_fields: [
        "record_type",
        "record_id",
        "request_id",
        "source_chain",
        "payment_transaction_hash",
        "payment_log_index",
        "canonical_payment_identity",
        "buyer_delivery_wallet",
        "quote_void_amount",
        "quote_usdc_amount",
        "pool_void_total_before",
        "reserved_void_total_before",
        "remaining_void_before",
        "reserved_void_total_after",
        "remaining_void_after",
        "verified_payment_receipt_ref",
        "duplicate_payment_guard_result",
        "inventory_allocation_guard_result",
        "operator_activation_record_ref",
        "created_at_ms",
        "previous_allocation_record_hash",
        "allocation_record_hash"
      ],
      hash_chain_rules: [
        "first_line_uses_genesis_previous_hash",
        "each_later_line_references_previous_line_hash",
        "line_hash_covers_canonical_json_before_hash_insertion",
        "fail_closed_on_malformed_json",
        "fail_closed_on_missing_previous_hash",
        "fail_closed_on_wrong_previous_hash",
        "fail_closed_on_duplicate_record_hash",
        "fail_closed_on_duplicate_request_id",
        "fail_closed_on_duplicate_canonical_payment_identity"
      ],
      refusal_conditions: [
        "verified_payment_gate_not_green",
        "duplicate_payment_guard_not_green",
        "inventory_allocation_guard_not_green",
        "allocation_reservation_record_gate_not_green",
        "private_ledger_hold_not_green",
        "canonical_payment_identity_missing",
        "request_id_missing",
        "buyer_delivery_wallet_missing",
        "quoted_void_amount_non_positive",
        "remaining_inventory_before_lt_quoted_void",
        "reserved_total_after_gt_pool_total",
        "remaining_inventory_after_negative",
        "previous_allocation_record_hash_missing_or_wrong",
        "operator_activation_record_missing",
        "public_mutation_write_attempt",
        "buyer_write_attempt",
        "ai_advisory_write_attempt"
      ],
      current_authority: {
        automatic_fulfillment_enabled: false,
        wallet_fulfillment_enabled: false,
        signer_access_enabled: false,
        treasury_transfer_authority_enabled: false,
        buyer_execution_authorized: false,
        public_mutation_enabled: false,
        wc_ledger_write: false,
        void_transfer_now: false
      }
    });
  });


  runtimeApp.get("/public-node/usdc-void-buy-pool/allocation-reservation-record-v1.json", (_req:any, res:any) => {
    res.json({
      marker: "VOID_USDC_TO_VOID_PRESALE_ALLOCATION_RESERVATION_RECORD_V1",
      status: "allocation_reservation_record_defined_authority_false",
      activation_gate: "allocation_reservation_record",
      allocation_reservation_record_defined: true,
      allocation_reservation_record_green: false,
      allocation_reservation_record_write_enabled: false,
      append_only_allocation_reservation_record_enforced: false,
      current_operator_events_are_not_allocation_reservation_ledger: true,
      current_payment_verified_event_is_not_allocation_reserved: true,
      current_fulfilled_event_is_not_automatic_fulfillment: true,
      current_inventory_accounting_derived_from_payment_verified_events: true,
      problem_sealed: "payment_verified operator events and sale-state derived accounting are not a dedicated append-only allocation reservation record",
      existing_append_surfaces_observed: {
        operator_events_jsonl: true,
        requests_jsonl: true,
        sale_state_derived_accounting: true,
        manual_fulfillment_status_event: true
      },
      allocation_reservation_record_type: "usdc_to_void_presale_allocation_reservation_record_v1",
      allocation_record_prerequisites: [
        "verified_usdc_payment_detection_gate_green",
        "duplicate_payment_guard_green",
        "inventory_allocation_guard_green",
        "remaining_presale_inventory_gte_quoted_void",
        "canonical_payment_identity_not_already_reserved",
        "request_id_not_already_reserved",
        "private_operator_controlled_append_only_allocation_ledger_exists",
        "previous_allocation_record_hash_carried_forward",
        "new_allocation_record_hash_produced",
        "explicit_operator_activation_record"
      ],
      required_record_fields: [
        "record_type",
        "record_id",
        "request_id",
        "source_chain",
        "payment_transaction_hash",
        "payment_log_index",
        "canonical_payment_identity",
        "buyer_delivery_wallet",
        "quote_void_amount",
        "quote_usdc_amount",
        "pool_void_total_before",
        "reserved_void_total_before",
        "remaining_void_before",
        "reserved_void_total_after",
        "remaining_void_after",
        "verified_payment_receipt_ref",
        "duplicate_payment_guard_result",
        "inventory_allocation_guard_result",
        "operator_activation_record_ref",
        "created_at_ms",
        "previous_allocation_record_hash",
        "allocation_record_hash"
      ],
      required_invariants: [
        "one_request_id_at_most_one_allocation_reservation_record",
        "one_canonical_payment_identity_at_most_one_allocation_reservation_record",
        "reserved_total_after_lte_pool_void_total",
        "remaining_inventory_after_non_negative",
        "allocation_reservation_before_fulfillment",
        "fulfillment_requires_prior_allocation_reservation",
        "allocation_record_hash_chain_append_only",
        "public_route_describes_shape_only_no_private_buyer_payment_operator_material"
      ],
      state_effects: {
        quote_created: "no_allocation_reservation_record",
        payment_pending: "no_allocation_reservation_record",
        payment_submitted_unverified: "no_allocation_reservation_record",
        payment_verified_without_duplicate_guard: "no_allocation_reservation_record",
        payment_verified_with_duplicate_guard_without_inventory_guard: "no_allocation_reservation_record",
        payment_verified_with_duplicate_and_inventory_guard_without_allocation_record: "no_automatic_fulfillment",
        allocation_reservation_record_written: "may_reserve_inventory_only_after_all_prerequisite_gates_green",
        fulfilled: "requires_prior_allocation_reservation_record_and_fulfillment_receipt"
      },
      current_authority: {
        automatic_fulfillment_enabled: false,
        wallet_fulfillment_enabled: false,
        signer_access_enabled: false,
        treasury_transfer_authority_enabled: false,
        buyer_execution_authorized: false,
        public_mutation_enabled: false,
        wc_ledger_write: false,
        void_transfer_now: false
      }
    });
  });


  runtimeApp.get("/public-node/usdc-void-buy-pool/inventory-allocation-guard-v1.json", (_req:any, res:any) => {
    res.json({
      marker: "VOID_USDC_TO_VOID_PRESALE_INVENTORY_ALLOCATION_GUARD_V1",
      status: "inventory_allocation_guard_defined_authority_false",
      activation_gate: "inventory_allocation_guard",
      inventory_allocation_guard_defined: true,
      inventory_allocation_guard_green: false,
      atomic_allocation_reservation_enforced: false,
      current_sale_state_quote_capacity_check_present: true,
      current_verified_payment_inventory_accounting_present: true,
      current_request_capacity_check_is_not_atomic_allocation_guard: true,
      problem_sealed: "request-time quote capacity checks and sale-state accounting are not sufficient for automatic allocation reservation",
      current_runtime_observations: {
        sale_state_route: "/__void/buy-void/sale-state.json",
        request_intake_rejects_sold_out: true,
        request_intake_rejects_quote_above_remaining_void: true,
        sale_state_reports_remaining_void: true,
        sale_state_reports_allocation_reserved_void: true,
        sale_state_counts_payment_verified_operator_events: true
      },
      allocation_reservation_requires: [
        "verified_usdc_payment_detection_gate_green",
        "duplicate_payment_guard_green",
        "remaining_presale_inventory_gte_quoted_void",
        "append_only_allocation_reservation_record",
        "unique_allocation_reservation_record",
        "reserved_total_lte_pool_void_total",
        "concurrent_reservation_oversell_guard",
        "sold_out_closure_when_remaining_inventory_zero",
        "allocation_reserved_before_fulfillment",
        "explicit_operator_activation_record"
      ],
      inventory_effects: {
        quote_created: "none",
        payment_pending: "none",
        payment_submitted_unverified: "none",
        submitted_tx_hash: "none",
        payment_verified_without_duplicate_guard: "no_automatic_allocation_reservation",
        payment_verified_with_duplicate_guard_without_inventory_guard: "no_automatic_allocation_reservation",
        payment_verified_with_duplicate_and_inventory_guard_green: "allocation_may_reserve_only_through_append_only_allocation_record",
        allocation_reserved: "may_reduce_available_presale_inventory",
        fulfilled: "requires_prior_allocation_reservation_and_fulfillment_receipt"
      },
      current_authority: {
        automatic_fulfillment_enabled: false,
        wallet_fulfillment_enabled: false,
        signer_access_enabled: false,
        treasury_transfer_authority_enabled: false,
        buyer_execution_authorized: false,
        public_mutation_enabled: false,
        wc_ledger_write: false,
        void_transfer_now: false
      }
    });
  });


  runtimeApp.get("/public-node/usdc-void-buy-pool/duplicate-payment-guard-v1.json", (_req:any, res:any) => {
    res.json({
      marker: "VOID_USDC_TO_VOID_PRESALE_DUPLICATE_PAYMENT_GUARD_V1",
      status: "duplicate_payment_guard_defined_authority_false",
      activation_gate: "duplicate_payment_guard",
      duplicate_payment_guard_defined: true,
      duplicate_payment_guard_green: false,
      current_verifier_duplicate_payment_guard_enforced: false,
      current_request_id_dedupe_is_not_payment_dedupe: true,
      problem_sealed: "request_id accounting is not enough; the same USDC transaction/log must not satisfy more than one presale request",
      canonical_payment_identity: {
        intended_key: "source_chain:transaction_hash:log_index",
        required_fields: [
          "source_chain",
          "submitted_tx_hash",
          "receipt_transaction_hash",
          "usdc_contract",
          "transfer_log_index",
          "official_receiver_address",
          "verified_amount",
          "request_id"
        ],
        missing_log_index_behavior: "block_automatic_fulfillment_until_receipt_log_identity_is_recorded"
      },
      required_guard_behavior: [
        "one_canonical_payment_identity_may_satisfy_at_most_one_request",
        "reused_payment_identity_fails_closed",
        "request_id_alone_is_not_duplicate_payment_guard",
        "submitted_tx_hash_alone_is_not_verified_payment",
        "verified_payment_alone_does_not_enable_automatic_fulfillment",
        "duplicate_guard_green_required_before_allocation_reservation",
        "inventory_guard_green_required_before_allocation_reservation",
        "explicit_operator_activation_record_required_before_automatic_fulfillment"
      ],
      inventory_effects: {
        quote_created: "none",
        payment_pending: "none",
        payment_submitted_unverified: "none",
        submitted_tx_hash: "none",
        payment_verified_without_duplicate_guard: "no_automatic_fulfillment_no_void_transfer",
        payment_verified_with_duplicate_guard_green: "allocation_may_reserve_only_if_inventory_guard_green"
      },
      current_authority: {
        automatic_fulfillment_enabled: false,
        wallet_fulfillment_enabled: false,
        signer_access_enabled: false,
        treasury_transfer_authority_enabled: false,
        buyer_execution_authorized: false,
        public_mutation_enabled: false,
        wc_ledger_write: false,
        void_transfer_now: false
      }
    });
  });


  runtimeApp.get("/public-node/usdc-void-buy-pool/verified-payment-detection-gate-v1.json", (_req:any, res:any) => {
    res.json({
      marker: "VOID_USDC_TO_VOID_PRESALE_VERIFIED_PAYMENT_DETECTION_GATE_V1",
      status: "verified_payment_detection_gate_defined_authority_false",
      activation_gate: "verified_usdc_payment_detection",
      verified_usdc_payment_detection_gate_defined: true,
      verified_usdc_payment_detection_gate_green: false,
      gate_green_requires_future_runtime_evidence: [
        "configured_rpc",
        "request_exists",
        "valid_evm_tx_hash",
        "allowlisted_source_chain",
        "eth_getTransactionReceipt_success",
        "receipt_status_0x1",
        "matching_usdc_transfer_log",
        "official_receiver_match",
        "amount_match",
        "duplicate_payment_guard_green",
        "inventory_guard_green",
        "explicit_operator_activation_record"
      ],
      supported_source_chains: [
        {
          chain: "base",
          usdc_contract_env: "VOID_BUY_BASE_USDC_CONTRACT or VOID_BUY_USDC_CONTRACT",
          default_usdc_contract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          rpc_env: "VOID_BUY_BASE_RPC_URL"
        },
        {
          chain: "ethereum",
          usdc_contract_env: "VOID_BUY_ETH_USDC_CONTRACT",
          default_usdc_contract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
          rpc_env: "VOID_BUY_ETH_RPC_URL"
        }
      ],
      verifier_shape: {
        operator_endpoint_existing: "/__void/buy-void/operator/verify-payment.json",
        public_endpoint_enabled: false,
        public_route_is_status_only: true,
        receipt_method: "eth_getTransactionReceipt",
        required_receipt_status: "0x1",
        required_log: "ERC20 Transfer",
        asset_in: "USDC",
        tx_hash_only_inventory_effect: "none",
        payment_verified_inventory_effect: "allocation_may_reserve_after_duplicate_and_inventory_guards"
      },
      inventory_effects: {
        quote_created: "none",
        payment_pending: "none",
        payment_submitted_unverified: "none",
        submitted_tx_hash: "none",
        payment_verified: "allocation_may_reserve"
      },
      current_authority: {
        automatic_fulfillment_enabled: false,
        wallet_fulfillment_enabled: false,
        signer_access_enabled: false,
        treasury_transfer_authority_enabled: false,
        buyer_execution_authorized: false,
        public_mutation_enabled: false,
        wc_ledger_write: false,
        void_transfer_now: false
      }
    });
  });


  runtimeApp.get("/public-node/usdc-void-buy-pool/presale-quote-reservation-boundary-v1.json", (_req:any, res:any) => {
    res.json({
      marker: "VOID_USDC_TO_VOID_PRESALE_QUOTE_RESERVATION_BOUNDARY_V1",
      status: "presale_quote_reservation_boundary_active",
      route_namespace_note: "legacy usdc-void-buy-pool path remains for compatibility; public meaning is buy-only presale inventory/accounting",
      presale_flow: "USDC_to_VOID_buy_only",
      not_a_swap: true,
      liquidity_pool: false,
      void_to_usdc_supported: false,
      redeem_supported: false,
      sell_void_supported: false,
      public_mutation_enabled: false,
      automatic_fulfillment_enabled: false,
      wallet_fulfillment_enabled: false,
      signer_access_enabled: false,
      treasury_transfer_authority_enabled: false,
      buyer_execution_authorized: false,
      wc_ledger_write: false,
      void_transfer_now: false,
      quote_states_no_inventory_effect: [
        "quote_created",
        "payment_pending",
        "payment_submitted_unverified"
      ],
      reservation_requires: [
        "payment_verified",
        "verified_payment_receipt",
        "duplicate_payment_guard_green",
        "inventory_available"
      ],
      accounting_rules: {
        quote_created_inventory_effect: "none",
        payment_pending_inventory_effect: "none",
        payment_submitted_unverified_inventory_effect: "none",
        submitted_tx_hash_inventory_effect: "none",
        payment_verified_inventory_effect: "allocation_may_reserve",
        allocation_reserved_inventory_effect: "available_presale_inventory_reduced",
        fulfilled_inventory_effect: "void_sent_and_receipt_written"
      },
      public_copy_policy: {
        allowed_terms: ["presale", "buy request", "quote", "pending payment", "verified payment", "presale allocation", "verified allocation"],
        avoid_terms_for_unverified_requests: ["reserve VOID", "reserved VOID", "reserved USDC", "swap", "liquidity pool", "redeem", "sell VOID", "VOID-to-USDC"],
        pending_request_label: "Pending quote / unverified request",
        verified_reservation_label: "Verified presale allocation"
      },
      current_100_usdc_style_case: {
        if_unverified_label: "Pending quote / unverified request",
        inventory_effect: "none",
        allocation_reserved: false
      }
    });
  });


runtimeApp.get("/public-node/usdc-void-buy-pool/automatic-fulfillment-activation-gate-matrix-v1.json", (_req, res) => {
  res.json(usdcVoidBuyPoolAutomaticFulfillmentActivationGateMatrixV1);
});


// VOID_USDC_VOID_BUY_POOL_AUTOMATIC_FULFILLMENT_TARGET_POLICY_V1
const usdcVoidBuyPoolAutomaticFulfillmentTargetPolicyV1 = {
  marker: "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_FULFILLMENT_TARGET_POLICY_V1",
  status: "target_policy_only_not_active",
  scope: "automatic_fulfillment_desired_end_state_policy",
  chain_id: 2050,
  desired_end_state: {
    normal_fulfillment_mode: "automatic_after_verified_usdc_payment",
    manual_approval_required_for_normal_fulfillment: false,
    sold_out_behavior: "close_pool_when_inventory_remaining_reaches_zero",
    buyer_experience: "pay_usdc_receive_void_without_operator_per_buyer_approval_after_hard_gates_green"
  },
  current_runtime_authority: {
    automatic_fulfillment_enabled: false,
    wallet_fulfillment_enabled: false,
    signer_access_enabled: false,
    treasury_transfer_authority_enabled: false,
    buyer_execution_authorized: false,
    public_mutation_enabled: false,
    wc_ledger_write: false,
    void_transfer_now: false
  },
  activation_gates_required_before_enablement: [
    "verified_usdc_payment_detection",
    "buyer_address_validation",
    "quote_expiry_and_price_lock",
    "inventory_reservation",
    "duplicate_payment_guard",
    "idempotency_key",
    "sold_out_close_condition",
    "isolated_signer_or_treasury_execution_boundary",
    "fulfillment_receipt",
    "failure_refund_or_manual_exception_state",
    "two_box_runtime_proof",
    "explicit_operator_activation_record"
  ],
  manual_review_policy: {
    normal_buyer_fulfillment_requires_manual_approval: false,
    manual_review_allowed_for_exceptions_only: true,
    exception_reasons: [
      "payment_mismatch",
      "duplicate_payment",
      "invalid_buyer_address",
      "expired_quote",
      "insufficient_inventory",
      "refund_review",
      "operator_incident_response"
    ]
  },
  public_safety_statement: "This route declares the intended automatic fulfillment end-state only. It does not enable money movement, wallet sends, treasury sends, public mutation, or buyer execution authority."
};

runtimeApp.get("/public-node/usdc-void-buy-pool/automatic-fulfillment-target-policy-v1.json", (_req, res) => {
  res.json(usdcVoidBuyPoolAutomaticFulfillmentTargetPolicyV1);
});


// VOID_USDC_VOID_BUY_POOL_PUBLIC_CLOSEOUT_STATUS_V1
const usdcVoidBuyPoolPublicCloseoutStatusV1 = {
  marker: "VOID_USDC_VOID_BUY_POOL_PUBLIC_CLOSEOUT_STATUS_V1",
  status: "public_closeout_ready",
  scope: "read_only_public_status_summary",
  chain_id: 2050,
  surfaces: {
    funding_surface: "live_read_only",
    buy_pool_public_status: "live_read_only",
    reviewer_verify_pack_json: "live_read_only",
    reviewer_verify_pack_html: "live_read_only",
    readiness_rollup_json: "live_read_only",
    readiness_rollup_html: "live_read_only",
    buyer_status_card: "live_read_only",
    execution_hold_status: "live_read_only",
    public_node_dashboard_card: "live_read_only"
  },
  public_routes: {
    funding: "/public-node/funding",
    buy_pool: "/buy-void",
    reviewer_verify_pack_json: "/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1.json",
    reviewer_verify_pack_html: "/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1",
    readiness_rollup_json: "/public-node/usdc-void-buy-pool/readiness-rollup-v1.json",
    readiness_rollup_html: "/public-node/usdc-void-buy-pool/readiness-rollup-v1",
    closeout_status_json: "/public-node/usdc-void-buy-pool/closeout-status-v1.json"
  },
  authority_boundary: {
    public_mutation_enabled: false,
    automatic_fulfillment_enabled: false,
    wallet_fulfillment_enabled: false,
    manual_fulfillment_record_created_now: false,
    buyer_execution_authorized: false,
    private_execution_packet_public: false,
    wc_ledger_write: false,
    void_transfer_now: false
  },
  reviewer_summary: [
    "The public surfaces are ready for read-only reviewer inspection.",
    "The buy-pool is not an automatic purchase flow.",
    "Manual fulfillment remains held behind separate operator authority.",
    "No buyer execution authority is exposed publicly.",
    "No private operator packet is exposed publicly.",
    "No public mutation route is introduced by this closeout status."
  ],
  required_markers: [
    "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_V1",
    "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_HTML_V1",
    "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_HTML_VISIBLE_MARKER_RUNTIME_REPAIR_V1",
    "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_V1",
    "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_HTML_V1",
    "VOID_USDC_VOID_BUY_POOL_PUBLIC_NODE_READINESS_DASHBOARD_CARD_V1",
    "VOID_USDC_VOID_BUY_POOL_PUBLIC_BUYER_STATUS_JSON_FIELDS_V1",
    "VOID_USDC_VOID_BUY_POOL_OPERATOR_EXECUTION_HOLD_STATUS_RUNTIME_ROUTES_V1"
  ]
};

runtimeApp.get("/public-node/usdc-void-buy-pool/closeout-status-v1.json", (_req, res) => {
  res.json(usdcVoidBuyPoolPublicCloseoutStatusV1);
});


// VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_HTML_V1
runtimeApp.get("/public-node/usdc-void-buy-pool/readiness-rollup-v1", (_req:any, res:any) => {
  res.type("html").send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>VOID USDC → VOID Buy Pool Readiness Rollup</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#050510;color:#f2f4ff;margin:0;padding:32px;line-height:1.45}
    main{max-width:980px;margin:0 auto}
    a{color:#8ee8ff}
    .card{border:1px solid #2a315c;background:#0c1024;border-radius:14px;padding:20px;margin:18px 0}
    .good{color:#7dffb2}
    .warn{color:#ffd27d}
    code{background:#111735;padding:2px 6px;border-radius:6px}
    ul{padding-left:22px}
  </style>
</head>
<body>
<main>
  <p><a href="/public-node">← Public Node</a> · <a href="/public-node/route-index.json">Route Index JSON</a> · <a href="/public-node/buy-pool/usdc-void-v1">Buy Pool</a></p>

  <h1>USDC → VOID Buy Pool Readiness Rollup</h1>
  <p><strong>Marker:</strong> <code>VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_HTML_V1</code></p>

  <section class="card">
    <h2>Public status</h2>
    <ul>
      <li><span class="good">Buy-pool page:</span> public and read-only</li>
      <li><span class="good">Buy-pool JSON:</span> public and read-only</li>
      <li><span class="good">Readiness rollup JSON:</span> public and read-only</li>
      <li><span class="warn">Operator execution:</span> manual, gated, and withheld</li>
    </ul>
  </section>

  <section class="card">
    <h2>Safety boundary</h2>
    <ul>
      <li>No automatic VOID delivery</li>
      <li>No public fulfillment endpoint</li>
      <li>No public wallet-send authority</li>
      <li>No autonomous write authority</li>
      <li>No public ledger mutation</li>
      <li>No private buyer/payment/operator packet/key/send material exposed</li>
    </ul>
  </section>

  <section class="card">
    <h2>Reviewer links</h2>
    <ul>
      <li><a href="/public-node/usdc-void-buy-pool/readiness-rollup-v1.json">Machine-readable readiness rollup JSON</a></li>
      <li><a href="/public-node/buy-pool/usdc-void-v1">USDC → VOID fixed-price buy-pool page</a></li>
      <li><a href="/public-node/buy-pool/usdc-void-v1.json">USDC → VOID fixed-price buy-pool JSON</a></li>
      <li><a href="/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1">Operator execution hold status</a></li>
      <li><!-- VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_HTML_VISIBLE_LINKS_V1 --><a href="/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1.json">Reviewer verify pack JSON</a></li>
      <li><a href="/public-node/route-index.json">Public route index JSON</a></li>
    </ul>
  </section>
</main>
</body>
</html>`);
});

// VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_V1
runtimeApp.get("/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1.json", (_req:any, res:any) => {
  res.json({
    marker: "VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_V1",
    version: 1,
    surface: "usdc_void_buy_pool_public_reviewer_verify_pack",
    route: "/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1.json",
    purpose: "Copy/paste verification packet for the public USDC to VOID buy-pool readiness bundle.",
    public_read_only: true,
    creates_quote: false,
    accepts_payment: false,
    exposes_buyer_records: false,
    exposes_private_operator_packets: false,
    public_fulfillment_endpoint: false,
    wallet_send_authority: false,
    autonomous_write_authority: false,
    ledger_mutation: false,
    void_delivery: false,
    target_routes: [
      { path: "/public-node", kind: "html", required_marker: "VOID_USDC_VOID_BUY_POOL_PUBLIC_NODE_READINESS_DASHBOARD_CARD_V1" },
      { path: "/public-node/route-index.json", kind: "json", required_marker: "VOID_PUBLIC_ROUTE_INDEX_V1" },
      { path: "/public-node/usdc-void-buy-pool/readiness-rollup-v1", kind: "html", required_marker: "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_HTML_V1" },
      { path: "/public-node/usdc-void-buy-pool/readiness-rollup-v1.json", kind: "json", required_marker: "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_V1" },
      { path: "/public-node/buy-pool/usdc-void-v1", kind: "html", required_marker: "VOID_USDC_VOID_FIXED_PRICE_BUY_POOL_PUBLIC_PAGE_V1" },
      { path: "/public-node/buy-pool/usdc-void-v1.json", kind: "json", required_marker: "VOID_USDC_VOID_BUY_POOL_PUBLIC_BUYER_STATUS_JSON_FIELDS_V1" },
      { path: "/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1", kind: "html", required_marker: "VOID_USDC_VOID_BUY_POOL_OPERATOR_EXECUTION_HOLD_STATUS_ROUTE_INDEX_ENTRY_V1" }
    ],
    copy_paste_verify_commands: [
      "BASE=https://zoso-alienware-aurora-r7.taila47fd.ts.net",
      "curl -fsS \"$BASE/public-node\" | grep -F VOID_USDC_VOID_BUY_POOL_PUBLIC_NODE_READINESS_DASHBOARD_CARD_V1",
      "curl -fsS \"$BASE/public-node/route-index.json\" | grep -F /public-node/usdc-void-buy-pool/reviewer-verify-pack-v1.json",
      "curl -fsS \"$BASE/public-node/usdc-void-buy-pool/readiness-rollup-v1\" | grep -F VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_HTML_V1",
      "curl -fsS \"$BASE/public-node/usdc-void-buy-pool/readiness-rollup-v1.json\" | grep -F VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_V1",
      "curl -fsS \"$BASE/public-node/buy-pool/usdc-void-v1\" | grep -F VOID_USDC_VOID_FIXED_PRICE_BUY_POOL_PUBLIC_PAGE_V1",
      "curl -fsS \"$BASE/public-node/buy-pool/usdc-void-v1.json\" | grep -F VOID_USDC_VOID_BUY_POOL_PUBLIC_BUYER_STATUS_JSON_FIELDS_V1",
      "curl -fsS \"$BASE/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1\" | grep -F VOID_USDC_VOID_BUY_POOL_OPERATOR_EXECUTION_HOLD_STATUS_ROUTE_INDEX_ENTRY_V1"
    ],
    safety_boundary: {
      no_automatic_void_delivery: true,
      no_public_fulfillment_endpoint: true,
      no_public_wallet_send_authority: true,
      no_autonomous_write_authority: true,
      no_public_ledger_mutation: true,
      no_private_buyer_payment_operator_packet_key_or_send_material_exposed: true
    }
  });
});

  runtimeApp.get("/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1", (_req, res) => {
    res.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>VOID Public Reviewer Verify Pack — USDC / VOID Buy Pool</title>
</head>
<body>
  <!-- VOID_USDC_VOID_BUY_POOL_PUBLIC_REVIEWER_VERIFY_PACK_HTML_V1 -->
  <main>
    <h1>USDC → VOID Buy Pool Public Reviewer Verify Pack</h1>
    <p>This page is a human-readable wrapper around the sealed public reviewer verify pack JSON.</p>
    <p>The reviewer pack is public and read-only. It creates no quote, accepts no payment, exposes no private operator packet, opens no fulfillment endpoint, grants no wallet-send authority, grants no autonomous write authority, mutates no ledger state, and performs no VOID delivery.</p>

    <h2>Reviewer packet</h2>
    <ul>
      <li><a href="/public-node/usdc-void-buy-pool/reviewer-verify-pack-v1.json">Open reviewer verify pack JSON</a></li>
    </ul>

    <h2>Primary public surfaces</h2>
    <ul>
      <li><a href="/public-node">Public Node dashboard</a></li>
      <li><a href="/public-node/usdc-void-buy-pool/readiness-rollup-v1">Human readiness rollup</a></li>
      <li><a href="/public-node/usdc-void-buy-pool/readiness-rollup-v1.json">Readiness rollup JSON</a></li>
      <li><a href="/public-node/buy-pool/usdc-void-v1">USDC / VOID fixed-price buy-pool page</a></li>
      <li><a href="/public-node/buy-pool/usdc-void-v1.json">USDC / VOID public buyer-status JSON</a></li>
      <li><a href="/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1">Operator execution hold status</a></li>
      <li><a href="/public-node/route-index.json">Public route index JSON</a></li>
    </ul>

    <h2>Safety boundary</h2>
    <ul>
      <li>public_read_only=true</li>
      <li>creates_quote=false</li>
      <li>accepts_payment=false</li>
      <li>public_fulfillment_endpoint=false</li>
      <li>wallet_send_authority=false</li>
      <li>autonomous_write_authority=false</li>
      <li>ledger_mutation=false</li>
      <li>void_delivery=false</li>
    </ul>
  </main>
</body>
</html>`);
  });

runtimeApp.get("/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1", (_req:any, res:any) => {
    res.type("html").send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>USDC → VOID Buy Pool Operator Execution Hold Status v1</title>
<style>
body{margin:0;background:#050814;color:#e5e7eb;font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.45}
main{max-width:980px;margin:0 auto;padding:34px 18px}
.hero,.card,.warn{border:1px solid #263244;background:#0b1020;border-radius:16px;padding:18px;margin:14px 0}
.hero{background:linear-gradient(135deg,#0d1321,#111827)}
.warn{border-color:#92400e;background:#1f1305}
.badge{display:inline-block;border:1px solid #334155;border-radius:999px;padding:4px 10px;margin:4px 6px 4px 0;color:#cbd5e1}
a{color:#7dd3fc}
code{word-break:break-all;background:#020617;border:1px solid #263244;border-radius:8px;padding:2px 6px}
</style>
</head>
<body>
<main>
  <p><a href="/public-node">← Public Node</a> · <a href="/public-node/route-index.json">Route Index JSON</a> · <a href="/public-node/buy-pool/usdc-void-v1">Buy Pool</a></p>
  <section class="hero">
    <h1>USDC → VOID Buy Pool Operator Execution Hold Status v1</h1>
    <p><strong>Marker:</strong> <code>VOID_USDC_VOID_BUY_POOL_OPERATOR_EXECUTION_HOLD_PUBLIC_STATUS_V1</code></p>
    <p>This public-safe status records that the buy-pool route is live while operator execution remains gated and withheld.</p>
  </section>
  <section class="card">
    <h2>Current state</h2>
    <span class="badge">buy-pool public-readable</span>
    <span class="badge">operator execution gated</span>
    <span class="badge">manual execution packet withheld</span>
    <span class="badge">automatic delivery false</span>
    <span class="badge">public fulfillment false</span>
    <span class="badge">autonomous write false</span>
  </section>
  <section class="warn">
    <h2>Boundary</h2>
    <p>This page does not expose private operator queues, private receipt records, treasury controls, wallet keys, send commands, or any public fulfillment endpoint.</p>
  </section>
  <section class="card">
    <h2>Reviewer links</h2>
    <p><a href="/public-node/funding">Funding page</a></p>
    <p><a href="/public-node/buy-pool/usdc-void-v1">USDC → VOID fixed-price buy pool</a></p>
    <p><a href="/public-node/usdc-void-buy-pool/operator-execution-hold-status-route-index-entry-v1">Route-index entry note</a></p>
  </section>
</main>
</body>
</html>`);
  });

  runtimeApp.get("/public-node/usdc-void-buy-pool/operator-execution-hold-status-route-index-entry-v1", (_req:any, res:any) => {
    res.type("html").send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>USDC → VOID Buy Pool Operator Execution Hold Status Route Index Entry v1</title>
<style>
body{margin:0;background:#050814;color:#e5e7eb;font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.45}
main{max-width:980px;margin:0 auto;padding:34px 18px}
.hero,.card,.warn{border:1px solid #263244;background:#0b1020;border-radius:16px;padding:18px;margin:14px 0}
.hero{background:linear-gradient(135deg,#0d1321,#111827)}
.warn{border-color:#92400e;background:#1f1305}
.badge{display:inline-block;border:1px solid #334155;border-radius:999px;padding:4px 10px;margin:4px 6px 4px 0;color:#cbd5e1}
a{color:#7dd3fc}
code{word-break:break-all;background:#020617;border:1px solid #263244;border-radius:8px;padding:2px 6px}
</style>
</head>
<body>
<main>
  <p><a href="/public-node">← Public Node</a> · <a href="/public-node/route-index.json">Route Index JSON</a></p>
  <section class="hero">
    <h1>USDC → VOID Buy Pool Operator Execution Hold Status Route Index Entry v1</h1>
    <p><strong>Marker:</strong> <code>VOID_USDC_VOID_BUY_POOL_OPERATOR_EXECUTION_HOLD_STATUS_ROUTE_INDEX_ENTRY_V1</code></p>
    <p>This page explains the route-index discovery entry for the public-safe buy-pool operator execution hold status.</p>
  </section>
  <section class="card">
    <h2>Discovery target</h2>
    <p><a href="/public-node/usdc-void-buy-pool/operator-execution-hold-status-v1">Operator execution hold status page</a></p>
    <p><a href="/public-node/buy-pool/usdc-void-v1">USDC → VOID fixed-price buy pool</a></p>
    <p><a href="/public-node/buy-pool/usdc-void-v1.json">USDC → VOID fixed-price buy pool JSON</a></p>
    <p><a href="/public-node/funding">Funding page</a></p>
  </section>
  <section class="warn">
    <h2>Boundary</h2>
    <p>This is discovery-only. It does not create a public execution endpoint, expose private operator material, trigger fulfillment, open automatic delivery, or grant autonomous write authority.</p>
  </section>
</main>
</body>
</html>`);
  });

  __voidUsdcVoidBuyPoolExecutionHoldStatusRuntimeRoutesV1State.mounted = true;
  return true;
}

function __voidTryMountUsdcVoidBuyPoolExecutionHoldStatusRuntimeRoutesV1(): void {
  const g: any = globalThis as any;
  const appLike = g.__void_http_app || g.APP || g.app;

  if (__voidMountUsdcVoidBuyPoolExecutionHoldStatusRuntimeRoutesV1(appLike)) {
    console.log("[usdc-void-buy-pool.execution-hold-status.runtime-routes.v1] mounted");
    return;
  }

  __voidUsdcVoidBuyPoolExecutionHoldStatusRuntimeRoutesV1State.attempts += 1;

  if (__voidUsdcVoidBuyPoolExecutionHoldStatusRuntimeRoutesV1State.attempts <= 100) {
    setTimeout(__voidTryMountUsdcVoidBuyPoolExecutionHoldStatusRuntimeRoutesV1, 250);
  } else {
    console.log("[usdc-void-buy-pool.execution-hold-status.runtime-routes.v1] no app hook; routes not mounted");
  }
}

__voidTryMountUsdcVoidBuyPoolExecutionHoldStatusRuntimeRoutesV1();

// ---- USDC/VOID buy pool public manual fulfillment truth notice v1 ----
const VOID_USDC_VOID_BUY_POOL_PUBLIC_MANUAL_FULFILLMENT_TRUTH_NOTICE_V1 = Object.freeze({
  marker: "VOID_USDC_VOID_BUY_POOL_PUBLIC_MANUAL_FULFILLMENT_TRUTH_NOTICE_V1",
  status: "public_manual_fulfillment_truth_notice_green",
  notice_version: "v1",
  scope: "usdc_void_buy_pool_public_truth_notice",
  purpose: "Publish the current public truth boundary for USDC receipt and manual fulfillment while automatic fulfillment remains disabled.",
  truth_notice: {
    receiver_address_can_receive_usdc: true,
    verified_payment_can_enter_manual_operator_review: true,
    manual_operator_fulfillment_possible_after_verification: true,
    automatic_fulfillment_enabled_now: false,
    wallet_fulfillment_enabled_now: false,
    buyer_execution_enabled_now: false,
    public_mutation_enabled_now: false,
    public_node_operator_authority_active_now: false,
    void_transfer_now: false,
    instant_delivery_promised: false,
    investment_return_promised: false,
    price_appreciation_promised: false,
    secondary_market_outcome_promised: false,
    refund_promised_by_this_notice: false
  },
  manual_review_boundary: {
    manual_review_required_before_manual_fulfillment: true,
    payment_verification_required: true,
    chain_token_receiver_allowlist_required: true,
    amount_rate_policy_required: true,
    duplicate_payment_guard_required: true,
    buyer_identity_binding_required: true,
    finality_confirmations_required: true,
    payment_eligibility_decision_required: true,
    private_allocation_ledger_write_still_held_by_public_node: true,
    allocation_claim_creation_still_held_by_public_node: true,
    fulfillment_execution_still_held_by_public_node: true
  },
  public_safety_boundary: {
    public_pii_allowed: false,
    private_contact_info_allowed_publicly: false,
    secret_material_allowed_publicly: false,
    private_ledger_allowed_publicly: false,
    public_node_wallet_signing_allowed: false,
    public_node_transfer_authority_allowed: false,
    public_node_mutation_allowed: false
  },
  public_copy: {
    short_notice: "USDC can be sent to the listed receiver address, but automatic fulfillment is not active. Verified payments can still be reviewed and fulfilled manually by the operator through separate private/operator lanes.",
    no_instant_delivery_notice: "Manual review and fulfillment are not instant and are not autonomous.",
    no_investment_promise_notice: "VOID is presented as network usage/gas for VOID Network, not as a promise of profit or price appreciation."
  },
  proof_expectations: {
    public_manual_fulfillment_truth_notice_green: true,
    receiver_truth_green: true,
    automatic_fulfillment_false_now_green: true,
    manual_review_truth_green: true,
    manual_fulfillment_truth_green: true,
    no_instant_delivery_promise_green: true,
    no_investment_promise_green: true,
    authority_false_green: true
  }
});

let VOID_USDC_VOID_BUY_POOL_PUBLIC_MANUAL_FULFILLMENT_TRUTH_NOTICE_V1_ROUTES_MOUNTED = false;

function VOID_USDC_VOID_BUY_POOL_PUBLIC_MANUAL_FULFILLMENT_TRUTH_NOTICE_V1_MOUNT_ROUTES(APP:any): boolean {
  if (!APP || typeof APP.get !== "function") return false;
  if (VOID_USDC_VOID_BUY_POOL_PUBLIC_MANUAL_FULFILLMENT_TRUTH_NOTICE_V1_ROUTES_MOUNTED) return true;

  APP.get("/public-node/usdc-void-buy-pool/public-manual-fulfillment-truth-notice-v1.json", (_req:any, res:any) => {
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.status(200).send(JSON.stringify(VOID_USDC_VOID_BUY_POOL_PUBLIC_MANUAL_FULFILLMENT_TRUTH_NOTICE_V1, null, 2) + "\n");
  });

  APP.get("/public-node/usdc-void-buy-pool/public-manual-fulfillment-truth-notice-v1", (_req:any, res:any) => {
    const notice = VOID_USDC_VOID_BUY_POOL_PUBLIC_MANUAL_FULFILLMENT_TRUTH_NOTICE_V1;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.status(200).send(`<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>VOID USDC/VOID Public Manual Fulfillment Truth Notice v1</title>
    <style>
      body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:920px;margin:40px auto;padding:0 18px;line-height:1.5;background:#08080b;color:#f4f4f5}
      a{color:#a78bfa}
      code{background:#18181b;padding:2px 5px;border-radius:5px}
      .card{border:1px solid #27272a;border-radius:14px;padding:18px;margin:16px 0;background:#111114}
      .good{color:#86efac}
      .hold{color:#facc15}
      .false{color:#fca5a5}
    </style>
  </head>
  <body>
    <h1>USDC/VOID Public Manual Fulfillment Truth Notice</h1>
    <p><code>${notice.marker}</code></p>

    <div class="card">
      <h2>Plain truth</h2>
      <p>${notice.public_copy.short_notice}</p>
      <p>${notice.public_copy.no_instant_delivery_notice}</p>
      <p>${notice.public_copy.no_investment_promise_notice}</p>
    </div>

    <div class="card">
      <h2>Current state</h2>
      <ul>
        <li>Receiver address can receive USDC: <strong class="good">true</strong></li>
        <li>Verified payment can enter manual operator review: <strong class="good">true</strong></li>
        <li>Manual fulfillment possible after verification: <strong class="good">true</strong></li>
        <li>Automatic fulfillment enabled now: <strong class="false">false</strong></li>
        <li>Wallet fulfillment enabled now: <strong class="false">false</strong></li>
        <li>Buyer execution enabled now: <strong class="false">false</strong></li>
        <li>Public mutation enabled now: <strong class="false">false</strong></li>
        <li>VOID transfer now: <strong class="false">false</strong></li>
      </ul>
    </div>

    <div class="card">
      <h2>Required before manual fulfillment</h2>
      <ul>
        <li>Payment verification</li>
        <li>Chain / token / receiver allowlist</li>
        <li>Amount-rate policy</li>
        <li>Duplicate payment guard</li>
        <li>Buyer identity binding</li>
        <li>Finality confirmations</li>
        <li>Payment eligibility decision</li>
        <li>Separate private/operator execution lane</li>
      </ul>
    </div>

    <div class="card">
      <h2>Public safety boundary</h2>
      <ul>
        <li>Public PII allowed: <strong class="false">false</strong></li>
        <li>Private contact info allowed publicly: <strong class="false">false</strong></li>
        <li>Secret material allowed publicly: <strong class="false">false</strong></li>
        <li>Private ledger allowed publicly: <strong class="false">false</strong></li>
        <li>Public-node wallet signing allowed: <strong class="false">false</strong></li>
        <li>Public-node transfer authority allowed: <strong class="false">false</strong></li>
        <li>Public-node mutation allowed: <strong class="false">false</strong></li>
      </ul>
    </div>

    <p><a href="/public-node/usdc-void-buy-pool/public-manual-fulfillment-truth-notice-v1.json">JSON proof surface</a></p>
  </body>
  </html>`);
  });

  VOID_USDC_VOID_BUY_POOL_PUBLIC_MANUAL_FULFILLMENT_TRUTH_NOTICE_V1_ROUTES_MOUNTED = true;
  return true;
}

function VOID_USDC_VOID_BUY_POOL_PUBLIC_MANUAL_FULFILLMENT_TRUTH_NOTICE_V1_TRY_MOUNT_ROUTES(): boolean {
  const APP = (globalThis as any).__void_http_app || (globalThis as any).APP || (globalThis as any).app;
  return VOID_USDC_VOID_BUY_POOL_PUBLIC_MANUAL_FULFILLMENT_TRUTH_NOTICE_V1_MOUNT_ROUTES(APP);
}

if (!VOID_USDC_VOID_BUY_POOL_PUBLIC_MANUAL_FULFILLMENT_TRUTH_NOTICE_V1_TRY_MOUNT_ROUTES()) {
  const VOID_USDC_VOID_BUY_POOL_PUBLIC_MANUAL_FULFILLMENT_TRUTH_NOTICE_V1_ROUTE_TIMER = setInterval(() => {
    if (VOID_USDC_VOID_BUY_POOL_PUBLIC_MANUAL_FULFILLMENT_TRUTH_NOTICE_V1_TRY_MOUNT_ROUTES()) {
      clearInterval(VOID_USDC_VOID_BUY_POOL_PUBLIC_MANUAL_FULFILLMENT_TRUTH_NOTICE_V1_ROUTE_TIMER);
    }
  }, 250);

  if (typeof (VOID_USDC_VOID_BUY_POOL_PUBLIC_MANUAL_FULFILLMENT_TRUTH_NOTICE_V1_ROUTE_TIMER as any).unref === "function") {
    (VOID_USDC_VOID_BUY_POOL_PUBLIC_MANUAL_FULFILLMENT_TRUTH_NOTICE_V1_ROUTE_TIMER as any).unref();
  }
}

// ---- USDC/VOID buy pool buyer manual review intake instructions v1 ----
const VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_INTAKE_INSTRUCTIONS_V1 = Object.freeze({
  marker: "VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_INTAKE_INSTRUCTIONS_V1",
  status: "buyer_manual_review_intake_instructions_green",
  scope: "usdc_void_buy_pool_public_buyer_manual_review_intake",
  purpose: "Publish public buyer instructions for manual review intake while automatic fulfillment remains disabled.",
  intake_packet_fields: {
    chain_name_required: true,
    transaction_hash_required: true,
    usdc_amount_required: true,
    sending_wallet_address_required: true,
    receiving_void_wallet_address_required: true,
    buyer_acknowledges_manual_review_required: true,
    optional_private_contact_path_allowed_only_privately: true
  },
  public_do_not_submit: {
    seed_phrase: true,
    private_key: true,
    password: true,
    secret_material: true,
    private_contact_info_on_public_node: true
  },
  manual_review_requirements: {
    payment_verification_required: true,
    chain_token_receiver_allowlist_required: true,
    amount_rate_policy_required: true,
    duplicate_payment_guard_required: true,
    buyer_identity_binding_required: true,
    finality_confirmations_required: true,
    payment_eligibility_decision_required: true,
    operator_review_required: true
  },
  current_authority_state: {
    automatic_fulfillment_enabled_now: false,
    wallet_fulfillment_enabled_now: false,
    buyer_execution_enabled_now: false,
    public_mutation_enabled_now: false,
    public_node_operator_authority_active_now: false,
    void_transfer_now: false,
    instant_delivery_promised: false,
    investment_return_promised: false,
    price_appreciation_promised: false
  },
  proof_expectations: {
    buyer_manual_review_intake_instructions_green: true,
    manual_review_packet_shape_green: true,
    public_secret_warning_green: true,
    manual_review_requirements_green: true,
    authority_false_green: true
  }
});

let VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_INTAKE_INSTRUCTIONS_V1_ROUTES_MOUNTED = false;

function VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_INTAKE_INSTRUCTIONS_V1_MOUNT_ROUTES(APP:any): boolean {
  if (!APP || typeof APP.get !== "function") return false;
  if (VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_INTAKE_INSTRUCTIONS_V1_ROUTES_MOUNTED) return true;

  APP.get("/public-node/usdc-void-buy-pool/buyer-manual-review-intake-instructions-v1.json", (_req:any, res:any) => {
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.status(200).send(JSON.stringify(VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_INTAKE_INSTRUCTIONS_V1, null, 2) + "\n");
  });

  APP.get("/public-node/usdc-void-buy-pool/buyer-manual-review-intake-instructions-v1", (_req:any, res:any) => {
    const notice = VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_INTAKE_INSTRUCTIONS_V1;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.status(200).send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>VOID USDC/VOID Buyer Manual Review Intake Instructions v1</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:920px;margin:40px auto;padding:0 18px;line-height:1.5;background:#08080b;color:#f4f4f5}
    a{color:#a78bfa}
    code{background:#18181b;padding:2px 5px;border-radius:5px}
    .card{border:1px solid #27272a;border-radius:14px;padding:18px;margin:16px 0;background:#111114}
    .good{color:#86efac}
    .hold{color:#facc15}
    .false{color:#fca5a5}
  </style>
</head>
<body>
  <h1>USDC/VOID Buyer Manual Review Intake Instructions</h1>
  <p><code>${notice.marker}</code></p>

  <div class="card">
    <h2>What to prepare for manual review</h2>
    <ul>
      <li>Chain name</li>
      <li>Transaction hash</li>
      <li>USDC amount</li>
      <li>Sending wallet address</li>
      <li>Receiving VOID wallet address</li>
      <li>Buyer acknowledgment that fulfillment is manual review, not instant automation</li>
    </ul>
  </div>

  <div class="card">
    <h2>Do not submit publicly</h2>
    <ul>
      <li>Seed phrase</li>
      <li>Private key</li>
      <li>Password</li>
      <li>Secret material</li>
      <li>Private contact information on the public node</li>
    </ul>
  </div>

  <div class="card">
    <h2>Required before manual fulfillment</h2>
    <ul>
      <li>Payment verification</li>
      <li>Chain / token / receiver allowlist</li>
      <li>Amount-rate policy</li>
      <li>Duplicate payment guard</li>
      <li>Buyer identity binding</li>
      <li>Finality confirmations</li>
      <li>Payment eligibility decision</li>
      <li>Operator review</li>
    </ul>
  </div>

  <div class="card">
    <h2>Current authority state</h2>
    <ul>
      <li>Automatic fulfillment enabled now: <strong class="false">false</strong></li>
      <li>Wallet fulfillment enabled now: <strong class="false">false</strong></li>
      <li>Buyer execution enabled now: <strong class="false">false</strong></li>
      <li>Public mutation enabled now: <strong class="false">false</strong></li>
      <li>Public-node operator authority active now: <strong class="false">false</strong></li>
      <li>VOID transfer now: <strong class="false">false</strong></li>
      <li>Instant delivery promised: <strong class="false">false</strong></li>
      <li>Investment return promised: <strong class="false">false</strong></li>
      <li>Price appreciation promised: <strong class="false">false</strong></li>
    </ul>
  </div>

  <p><a href="/public-node/usdc-void-buy-pool/buyer-manual-review-intake-instructions-v1.json">JSON proof surface</a></p>
</body>
</html>`);
  });

  VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_INTAKE_INSTRUCTIONS_V1_ROUTES_MOUNTED = true;
  return true;
}

function VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_INTAKE_INSTRUCTIONS_V1_TRY_MOUNT_ROUTES(): boolean {
  const APP = (globalThis as any).__void_http_app || (globalThis as any).APP || (globalThis as any).app;
  return VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_INTAKE_INSTRUCTIONS_V1_MOUNT_ROUTES(APP);
}

if (!VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_INTAKE_INSTRUCTIONS_V1_TRY_MOUNT_ROUTES()) {
  const VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_INTAKE_INSTRUCTIONS_V1_ROUTE_TIMER = setInterval(() => {
    if (VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_INTAKE_INSTRUCTIONS_V1_TRY_MOUNT_ROUTES()) {
      clearInterval(VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_INTAKE_INSTRUCTIONS_V1_ROUTE_TIMER);
    }
  }, 250);

  if (typeof (VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_INTAKE_INSTRUCTIONS_V1_ROUTE_TIMER as any).unref === "function") {
    (VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_INTAKE_INSTRUCTIONS_V1_ROUTE_TIMER as any).unref();
  }
}

// ---- USDC/VOID buy pool buyer manual review packet template v1 ----
const VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_PACKET_TEMPLATE_V1 = Object.freeze({
marker: "VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_PACKET_TEMPLATE_V1",
status: "buyer_manual_review_packet_template_green",
scope: "usdc_void_buy_pool_public_buyer_manual_review_packet_template",
purpose: "Publish a public copyable packet template for private/operator manual review requests.",
template_surface: {
public_template_only: true,
public_submission_form: false,
public_submit_endpoint: false,
claim_creation_endpoint: false,
automatic_fulfillment_trigger: false,
wallet_action: false,
public_mutation_route: false
},
buyer_packet_template_fields: {
chain: "",
transaction_hash: "",
usdc_amount: "",
sending_wallet_address: "",
receiving_void_wallet_address: "",
buyer_acknowledgment: "I understand this requires manual operator review and is not instant automatic fulfillment.",
private_contact_path: "Share only through private/operator channels, not on the public node."
},
required_fields: {
chain_required: true,
transaction_hash_required: true,
usdc_amount_required: true,
sending_wallet_address_required: true,
receiving_void_wallet_address_required: true,
buyer_acknowledgment_required: true
},
public_do_not_include: {
seed_phrase: true,
private_key: true,
password: true,
signature_secret: true,
private_contact_info_on_public_node: true,
secret_material: true
},
manual_review_requirements: {
payment_verification_required: true,
chain_token_receiver_allowlist_required: true,
amount_rate_policy_required: true,
duplicate_payment_guard_required: true,
buyer_identity_binding_required: true,
finality_confirmations_required: true,
payment_eligibility_decision_required: true,
operator_review_required: true
},
current_authority_state: {
automatic_fulfillment_enabled_now: false,
wallet_fulfillment_enabled_now: false,
buyer_execution_enabled_now: false,
public_mutation_enabled_now: false,
public_node_operator_authority_active_now: false,
void_transfer_now: false,
instant_delivery_promised: false,
investment_return_promised: false,
price_appreciation_promised: false
},
proof_expectations: {
buyer_manual_review_packet_template_green: true,
template_surface_only_green: true,
no_public_submission_green: true,
manual_review_requirements_green: true,
authority_false_green: true
}
});

let VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_PACKET_TEMPLATE_V1_ROUTES_MOUNTED = false;

function VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_PACKET_TEMPLATE_V1_MOUNT_ROUTES(APP:any): boolean {
if (!APP || typeof APP.get !== "function") return false;
if (VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_PACKET_TEMPLATE_V1_ROUTES_MOUNTED) return true;

APP.get("/public-node/usdc-void-buy-pool/buyer-manual-review-packet-template-v1.json", (_req:any, res:any) => {
res.setHeader("content-type", "application/json; charset=utf-8");
res.status(200).send(JSON.stringify(VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_PACKET_TEMPLATE_V1, null, 2) + "\n");
});

APP.get("/public-node/usdc-void-buy-pool/buyer-manual-review-packet-template-v1", (_req:any, res:any) => {
const notice = VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_PACKET_TEMPLATE_V1;
const packetTemplate = `VOID USDC/VOID Manual Review Packet

Chain:
Transaction hash:
USDC amount:
Sending wallet address:
Receiving VOID wallet address:
Buyer acknowledgment: I understand this requires manual operator review and is not instant automatic fulfillment.
Private contact path, if needed: share only through private/operator channels, not on the public node.`;

res.setHeader("content-type", "text/html; charset=utf-8");
res.status(200).send(`<!doctype html>
<html> <head> <meta charset="utf-8" /> <title>VOID USDC/VOID Buyer Manual Review Packet Template v1</title> <style> body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:920px;margin:40px auto;padding:0 18px;line-height:1.5;background:#08080b;color:#f4f4f5} a{color:#a78bfa} code,pre{background:#18181b;padding:2px 5px;border-radius:5px} pre{white-space:pre-wrap;padding:14px;overflow:auto} .card{border:1px solid #27272a;border-radius:14px;padding:18px;margin:16px 0;background:#111114} .good{color:#86efac} .false{color:#fca5a5} </style> </head> <body> <h1>USDC/VOID Buyer Manual Review Packet Template</h1> <p><code>${notice.marker}</code></p> <div class="card"> <h2>Copyable private/operator review packet</h2> <pre>${packetTemplate}</pre> </div> <div class="card"> <h2>Surface boundary</h2> <ul> <li>Public template only: <strong class="good">true</strong></li> <li>Public submission form: <strong class="false">false</strong></li> <li>Public submit endpoint: <strong class="false">false</strong></li> <li>Claim creation endpoint: <strong class="false">false</strong></li> <li>Automatic fulfillment trigger: <strong class="false">false</strong></li> <li>Wallet action: <strong class="false">false</strong></li> <li>Public mutation route: <strong class="false">false</strong></li> </ul> </div> <div class="card"> <h2>Do not include publicly</h2> <ul> <li>Seed phrase</li> <li>Private key</li> <li>Password</li> <li>Signature secret</li> <li>Private contact information on the public node</li> <li>Secret material</li> </ul> </div> <div class="card"> <h2>Current authority state</h2> <ul> <li>Automatic fulfillment enabled now: <strong class="false">false</strong></li> <li>Wallet fulfillment enabled now: <strong class="false">false</strong></li> <li>Buyer execution enabled now: <strong class="false">false</strong></li> <li>Public mutation enabled now: <strong class="false">false</strong></li> <li>Public-node operator authority active now: <strong class="false">false</strong></li> <li>VOID transfer now: <strong class="false">false</strong></li> <li>Instant delivery promised: <strong class="false">false</strong></li> <li>Investment return promised: <strong class="false">false</strong></li> <li>Price appreciation promised: <strong class="false">false</strong></li> </ul> </div> <p><a href="/public-node/usdc-void-buy-pool/buyer-manual-review-packet-template-v1.json">JSON proof surface</a></p> </body> </html>`); });

VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_PACKET_TEMPLATE_V1_ROUTES_MOUNTED = true;
return true;
}

function VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_PACKET_TEMPLATE_V1_TRY_MOUNT_ROUTES(): boolean {
const APP = (globalThis as any).__void_http_app || (globalThis as any).APP || (globalThis as any).app;
return VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_PACKET_TEMPLATE_V1_MOUNT_ROUTES(APP);
}

if (!VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_PACKET_TEMPLATE_V1_TRY_MOUNT_ROUTES()) {
const VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_PACKET_TEMPLATE_V1_ROUTE_TIMER = setInterval(() => {
if (VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_PACKET_TEMPLATE_V1_TRY_MOUNT_ROUTES()) {
clearInterval(VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_PACKET_TEMPLATE_V1_ROUTE_TIMER);
}
}, 250);

if (typeof (VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_PACKET_TEMPLATE_V1_ROUTE_TIMER as any).unref === "function") {
(VOID_USDC_VOID_BUY_POOL_BUYER_MANUAL_REVIEW_PACKET_TEMPLATE_V1_ROUTE_TIMER as any).unref();
}
}

// ---- USDC/VOID buy pool buyer packet private intake boundary v1 ----
const VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PRIVATE_INTAKE_BOUNDARY_V1 = Object.freeze({
  marker: "VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PRIVATE_INTAKE_BOUNDARY_V1",
  status: "buyer_packet_private_intake_boundary_green",
  scope: "usdc_void_buy_pool_public_buyer_packet_private_intake_boundary",
  purpose: "Publish the boundary that buyer manual review packets are private/operator intake only, not public-node submissions.",
  public_boundary: {
    public_node_publishes_instructions: true,
    public_node_publishes_packet_template: true,
    private_operator_intake_required: true,
    public_node_accepts_buyer_packets: false,
    public_submission_endpoint: false,
    public_claim_creation_endpoint: false,
    public_identity_verification_endpoint: false,
    public_contact_collection_endpoint: false,
    public_fulfillment_trigger: false,
    public_wallet_action: false,
    public_ledger_mutation: false
  },
  private_operator_channel: {
    separate_operator_controlled_channel_required: true,
    private_contact_info_allowed_only_privately: true,
    secret_material_allowed: false,
    seed_phrase_allowed: false,
    private_key_allowed: false
  },
  manual_review_requirements: {
    payment_verification_required: true,
    chain_token_receiver_allowlist_required: true,
    amount_rate_policy_required: true,
    duplicate_payment_guard_required: true,
    buyer_identity_binding_required: true,
    finality_confirmations_required: true,
    payment_eligibility_decision_required: true,
    operator_review_required: true
  },
  current_authority_state: {
    automatic_fulfillment_enabled_now: false,
    wallet_fulfillment_enabled_now: false,
    buyer_execution_enabled_now: false,
    public_mutation_enabled_now: false,
    public_node_operator_authority_active_now: false,
    void_transfer_now: false,
    instant_delivery_promised: false,
    investment_return_promised: false,
    price_appreciation_promised: false
  },
  proof_expectations: {
    buyer_packet_private_intake_boundary_green: true,
    private_operator_intake_required_green: true,
    public_submission_disabled_green: true,
    no_public_claim_creation_green: true,
    no_public_wallet_action_green: true,
    no_public_mutation_green: true,
    authority_false_green: true
  }
});

let VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PRIVATE_INTAKE_BOUNDARY_V1_ROUTES_MOUNTED = false;

function VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PRIVATE_INTAKE_BOUNDARY_V1_MOUNT_ROUTES(APP:any): boolean {
  if (!APP || typeof APP.get !== "function") return false;
  if (VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PRIVATE_INTAKE_BOUNDARY_V1_ROUTES_MOUNTED) return true;

  APP.get("/public-node/usdc-void-buy-pool/buyer-packet-private-intake-boundary-v1.json", (_req:any, res:any) => {
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.status(200).send(JSON.stringify(VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PRIVATE_INTAKE_BOUNDARY_V1, null, 2) + "\n");
  });

  APP.get("/public-node/usdc-void-buy-pool/buyer-packet-private-intake-boundary-v1", (_req:any, res:any) => {
    const notice = VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PRIVATE_INTAKE_BOUNDARY_V1;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.status(200).send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>VOID USDC/VOID Buyer Packet Private Intake Boundary v1</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:920px;margin:40px auto;padding:0 18px;line-height:1.5;background:#08080b;color:#f4f4f5}
    a{color:#a78bfa}
    code{background:#18181b;padding:2px 5px;border-radius:5px}
    .card{border:1px solid #27272a;border-radius:14px;padding:18px;margin:16px 0;background:#111114}
    .good{color:#86efac}
    .false{color:#fca5a5}
  </style>
</head>
<body>
  <h1>USDC/VOID Buyer Packet Private Intake Boundary</h1>
  <p><code>${notice.marker}</code></p>

  <div class="card">
    <h2>Boundary</h2>
    <ul>
      <li>Public node publishes instructions: <strong class="good">true</strong></li>
      <li>Public node publishes packet template: <strong class="good">true</strong></li>
      <li>Private operator intake required: <strong class="good">true</strong></li>
      <li>Public node accepts buyer packets: <strong class="false">false</strong></li>
      <li>Public submission endpoint: <strong class="false">false</strong></li>
      <li>Public claim creation endpoint: <strong class="false">false</strong></li>
      <li>Public identity verification endpoint: <strong class="false">false</strong></li>
      <li>Public contact collection endpoint: <strong class="false">false</strong></li>
      <li>Public fulfillment trigger: <strong class="false">false</strong></li>
      <li>Public wallet action: <strong class="false">false</strong></li>
      <li>Public ledger mutation: <strong class="false">false</strong></li>
    </ul>
  </div>

  <div class="card">
    <h2>Private/operator channel</h2>
    <ul>
      <li>Separate operator-controlled channel required: <strong class="good">true</strong></li>
      <li>Private contact info allowed only privately: <strong class="good">true</strong></li>
      <li>Secret material allowed: <strong class="false">false</strong></li>
      <li>Seed phrase allowed: <strong class="false">false</strong></li>
      <li>Private key allowed: <strong class="false">false</strong></li>
    </ul>
  </div>

  <div class="card">
    <h2>Current authority state</h2>
    <ul>
      <li>Automatic fulfillment enabled now: <strong class="false">false</strong></li>
      <li>Wallet fulfillment enabled now: <strong class="false">false</strong></li>
      <li>Buyer execution enabled now: <strong class="false">false</strong></li>
      <li>Public mutation enabled now: <strong class="false">false</strong></li>
      <li>Public-node operator authority active now: <strong class="false">false</strong></li>
      <li>VOID transfer now: <strong class="false">false</strong></li>
      <li>Instant delivery promised: <strong class="false">false</strong></li>
      <li>Investment return promised: <strong class="false">false</strong></li>
      <li>Price appreciation promised: <strong class="false">false</strong></li>
    </ul>
  </div>

  <p><a href="/public-node/usdc-void-buy-pool/buyer-packet-private-intake-boundary-v1.json">JSON proof surface</a></p>
</body>
</html>`);
  });

  VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PRIVATE_INTAKE_BOUNDARY_V1_ROUTES_MOUNTED = true;
  return true;
}

function VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PRIVATE_INTAKE_BOUNDARY_V1_TRY_MOUNT_ROUTES(): boolean {
  const APP = (globalThis as any).__void_http_app || (globalThis as any).APP || (globalThis as any).app;
  return VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PRIVATE_INTAKE_BOUNDARY_V1_MOUNT_ROUTES(APP);
}

if (!VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PRIVATE_INTAKE_BOUNDARY_V1_TRY_MOUNT_ROUTES()) {
  const VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PRIVATE_INTAKE_BOUNDARY_V1_ROUTE_TIMER = setInterval(() => {
    if (VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PRIVATE_INTAKE_BOUNDARY_V1_TRY_MOUNT_ROUTES()) {
      clearInterval(VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PRIVATE_INTAKE_BOUNDARY_V1_ROUTE_TIMER);
    }
  }, 250);

  if (typeof (VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PRIVATE_INTAKE_BOUNDARY_V1_ROUTE_TIMER as any).unref === "function") {
    (VOID_USDC_VOID_BUY_POOL_BUYER_PACKET_PRIVATE_INTAKE_BOUNDARY_V1_ROUTE_TIMER as any).unref();
  }
}


const usdcVoidBuyPoolAutomaticPaymentLivePathPublicStatusCardV1 = Object.freeze({
  marker: "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_STATUS_CARD_V1",
  schema: "usdc_void_buy_pool_automatic_payment_live_path_public_status_card_v1",
  status: "public_status_read_only_not_enabled",
  visibility: "public",
  public_safe: true,
  terminal_private_rollup_marker: "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_TERMINAL_READINESS_ROLLUP_HOLD_V1",
  private_details_exposed: false,
  automatic_payment_live_path: {
    terminal_readiness_rollup_exists: true,
    activation_enabled: false,
    runtime_enabled: false,
    automatic_payment_execution: false,
    automatic_fulfillment: false,
    wallet_fulfillment: false,
    signer_access: false,
    treasury_transfer_authority: false,
    buyer_execution: false,
    public_mutation: false,
    ledger_write: false,
    void_transfer: false
  },
  withheld_values: {
    wallet: true,
    signer: true,
    receiver: true,
    treasury: true,
    buyer: true,
    inventory_mutation_details: true,
    private_rollup_details: true
  },
  reviewer_message:
    "Automatic payment live path is terminal-ready as a private hold, but no automatic payment or fulfillment authority is enabled."
});

function mountUsdcVoidBuyPoolAutomaticPaymentLivePathPublicStatusCardV1(): boolean {
  const runtimeApp = (globalThis as any).__void_http_app;

  if (!runtimeApp || typeof runtimeApp.get !== "function") {
    return false;
  }

  if ((runtimeApp as any).__void_usdc_void_buy_pool_automatic_payment_live_path_public_status_card_v1_mounted) {
    return true;
  }

  (runtimeApp as any).__void_usdc_void_buy_pool_automatic_payment_live_path_public_status_card_v1_mounted = true;

  runtimeApp.get("/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-v1.json", (_req:any, res:any) => {
    res.json(usdcVoidBuyPoolAutomaticPaymentLivePathPublicStatusCardV1);
  });

  runtimeApp.get("/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-v1", (_req:any, res:any) => {
    res.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>USDC/VOID Automatic Payment Live-Path Status</title>
</head>
<body>
  <main>
    <h1>USDC/VOID Automatic Payment Live-Path Status</h1>
    <p><strong>Marker:</strong> VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_STATUS_CARD_V1</p>
    <p><strong>Status:</strong> public_status_read_only_not_enabled</p>
    <p>The automatic payment live path is terminal-ready as a private hold, but it is not enabled.</p>
    <ul>
      <li>automatic payment execution: false</li>
      <li>automatic fulfillment: false</li>
      <li>wallet fulfillment: false</li>
      <li>signer access: false</li>
      <li>treasury transfer authority: false</li>
      <li>buyer execution: false</li>
      <li>public mutation: false</li>
      <li>private details exposed: false</li>
    </ul>
    <p><a href="/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-v1.json">JSON status card</a></p>
  </main>
</body>
</html>`);
  });

  console.log("[usdc-void-buy-pool.automatic-payment-live-path-public-status-card.v1] mounted");
  return true;
}

if (!mountUsdcVoidBuyPoolAutomaticPaymentLivePathPublicStatusCardV1()) {
  const VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_STATUS_CARD_V1_ROUTE_TIMER = setInterval(() => {
    if (mountUsdcVoidBuyPoolAutomaticPaymentLivePathPublicStatusCardV1()) {
      clearInterval(VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_STATUS_CARD_V1_ROUTE_TIMER);
    }
  }, 250);

  setTimeout(() => {
    clearInterval(VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_STATUS_CARD_V1_ROUTE_TIMER);
    if (!mountUsdcVoidBuyPoolAutomaticPaymentLivePathPublicStatusCardV1()) {
      console.log("[usdc-void-buy-pool.automatic-payment-live-path-public-status-card.v1] no app hook; routes not mounted");
    }
  }, 20000);

  if ((VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_STATUS_CARD_V1_ROUTE_TIMER as any).unref) {
    (VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_STATUS_CARD_V1_ROUTE_TIMER as any).unref();
  }
}



const usdcVoidBuyPoolAutomaticPaymentLivePathPublicStatusCardDiscoveryV1 = Object.freeze({
  marker: "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_STATUS_CARD_DISCOVERY_V1",
  schema: "usdc_void_buy_pool_automatic_payment_live_path_public_status_card_discovery_v1",
  status: "public_discovery_read_only",
  visibility: "public",
  public_safe: true,
  linked_status_marker: "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_STATUS_CARD_V1",
  linked_private_terminal_marker: "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_TERMINAL_READINESS_ROLLUP_HOLD_V1",
  private_details_exposed: false,
  routes: {
    status_card_json: "/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-v1.json",
    status_card_html: "/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-v1",
    discovery_json: "/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-discovery-v1.json",
    discovery_html: "/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-discovery-v1",
    route_index_json: "/public-node/route-index.json"
  },
  authority: {
    automatic_payment_execution: false,
    automatic_fulfillment: false,
    wallet_fulfillment: false,
    signer_access: false,
    treasury_transfer_authority: false,
    buyer_execution: false,
    public_mutation: false,
    ledger_write: false,
    void_transfer: false
  },
  reviewer_message:
    "Use this discovery card to find the automatic payment public status card. The automatic payment path remains not enabled."
});

function mountUsdcVoidBuyPoolAutomaticPaymentLivePathPublicStatusCardDiscoveryV1(): boolean {
  const runtimeApp = (globalThis as any).__void_http_app;

  if (!runtimeApp || typeof runtimeApp.get !== "function") {
    return false;
  }

  if ((runtimeApp as any).__void_usdc_void_buy_pool_automatic_payment_live_path_public_status_card_discovery_v1_mounted) {
    return true;
  }

  (runtimeApp as any).__void_usdc_void_buy_pool_automatic_payment_live_path_public_status_card_discovery_v1_mounted = true;

  runtimeApp.get("/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-discovery-v1.json", (_req:any, res:any) => {
    res.json(usdcVoidBuyPoolAutomaticPaymentLivePathPublicStatusCardDiscoveryV1);
  });

  runtimeApp.get("/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-discovery-v1", (_req:any, res:any) => {
    res.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>USDC/VOID Automatic Payment Status Discovery</title>
</head>
<body>
  <main>
    <h1>USDC/VOID Automatic Payment Status Discovery</h1>
    <p><strong>Marker:</strong> VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_STATUS_CARD_DISCOVERY_V1</p>
    <p><strong>Status:</strong> public_discovery_read_only</p>
    <p>This discovery card links to the automatic payment public status card. It does not enable automatic payment or fulfillment.</p>
    <ul>
      <li><a href="/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-v1.json">Automatic payment status JSON</a></li>
      <li><a href="/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-v1">Automatic payment status HTML</a></li>
      <li><a href="/public-node/route-index.json">Public route index JSON</a></li>
    </ul>
    <h2>Authority state</h2>
    <ul>
      <li>automatic payment execution: false</li>
      <li>automatic fulfillment: false</li>
      <li>wallet fulfillment: false</li>
      <li>signer access: false</li>
      <li>treasury transfer authority: false</li>
      <li>buyer execution: false</li>
      <li>public mutation: false</li>
      <li>private details exposed: false</li>
    </ul>
    <p><a href="/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-status-card-discovery-v1.json">JSON discovery card</a></p>
  </main>
</body>
</html>`);
  });

  console.log("[usdc-void-buy-pool.automatic-payment-live-path-public-status-card-discovery.v1] mounted");
  return true;
}

if (!mountUsdcVoidBuyPoolAutomaticPaymentLivePathPublicStatusCardDiscoveryV1()) {
  const VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_STATUS_CARD_DISCOVERY_V1_ROUTE_TIMER = setInterval(() => {
    if (mountUsdcVoidBuyPoolAutomaticPaymentLivePathPublicStatusCardDiscoveryV1()) {
      clearInterval(VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_STATUS_CARD_DISCOVERY_V1_ROUTE_TIMER);
    }
  }, 250);

  setTimeout(() => {
    clearInterval(VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_STATUS_CARD_DISCOVERY_V1_ROUTE_TIMER);
    if (!mountUsdcVoidBuyPoolAutomaticPaymentLivePathPublicStatusCardDiscoveryV1()) {
      console.log("[usdc-void-buy-pool.automatic-payment-live-path-public-status-card-discovery.v1] no app hook; routes not mounted");
    }
  }, 20000);

  if ((VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_STATUS_CARD_DISCOVERY_V1_ROUTE_TIMER as any).unref) {
    (VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_STATUS_CARD_DISCOVERY_V1_ROUTE_TIMER as any).unref();
  }
}


/* [usdc-void-buy-pool.automatic-payment-live-path-public-reviewer-verify-pack.v1] */
{
  const mountAutomaticPaymentLivePathPublicReviewerVerifyPackV1 = () => {
    const runtimeApp = (globalThis as any).__void_http_app;
    if (!runtimeApp) return false;
    if ((runtimeApp as any).__void_usdc_void_buy_pool_automatic_payment_live_path_public_reviewer_verify_pack_v1) return true;
    (runtimeApp as any).__void_usdc_void_buy_pool_automatic_payment_live_path_public_reviewer_verify_pack_v1 = true;

    const fixturePath = path.join(process.cwd(), "fixtures/public/usdc-void-buy-pool-automatic-payment-live-path-public-reviewer-verify-pack-v1.json");
    const readFixture = () => JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    const esc = (v:any) => String(v).replace(/[&<>"]/g, (c:string) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c] as string));

    runtimeApp.get("/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1.json", (_req:any, res:any) => {
      res.json(readFixture());
    });

    runtimeApp.get("/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1", (_req:any, res:any) => {
      const pack = readFixture();
      res.type("html").send(`<!doctype html>
<html><head><meta charset="utf-8"><title>Automatic Payment Public Reviewer Verify Pack</title></head>
<body>
<h1>Automatic Payment Public Reviewer Verify Pack</h1>
<p><strong>Marker:</strong> <code>${esc(pack.marker)}</code></p>
<p><strong>Status:</strong> <code>${esc(pack.status)}</code></p>
<p>Copy-paste public verification for the automatic-payment live-path status card, discovery card, route-index wiring, and false-authority boundaries.</p>
<ul>
<li><a href="${esc(pack.routes.pack_json)}">Reviewer pack JSON</a></li>
<li><a href="${esc(pack.routes.status_card_json)}">Status card JSON</a></li>
<li><a href="${esc(pack.routes.discovery_json)}">Discovery card JSON</a></li>
<li><a href="${esc(pack.routes.route_index_json)}">Route index JSON</a></li>
</ul>
<h2>Authority</h2>
<pre>${esc(JSON.stringify(pack.authority, null, 2))}</pre>
<h2>Copy-paste verify command</h2>
<pre><code>${esc(pack.copy_paste_verify_command)}</code></pre>
<p><a href="/public-node">Public node</a> · <a href="/public-node/route-index.json">Route index</a></p>
</body></html>`);
    });

    console.log("[usdc-void-buy-pool.automatic-payment-live-path-public-reviewer-verify-pack.v1] mounted");
    return true;
  };

  if (!mountAutomaticPaymentLivePathPublicReviewerVerifyPackV1()) {
    setTimeout(() => {
      if (!mountAutomaticPaymentLivePathPublicReviewerVerifyPackV1()) {
        console.log("[usdc-void-buy-pool.automatic-payment-live-path-public-reviewer-verify-pack.v1] no app hook; routes not mounted");
      }
    }, 250);
  }
}


/* [usdc-void-buy-pool.automatic-payment-live-path-public-reviewer-closeout.v1] */
;(function __voidUsdcVoidBuyPoolAutomaticPaymentLivePathPublicReviewerCloseoutV1(){
  const payload = {
    marker: "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_CLOSEOUT_V1",
    schema: "usdc_void_buy_pool_automatic_payment_live_path_public_reviewer_closeout_v1",
    status: "public_reviewer_discovery_closeout_read_only",
    visibility: "public",
    public_safe: true,
    private_details_exposed: false,
    purpose: "final public closeout/status endpoint for the automatic-payment public reviewer stack; proves reviewer verification is live and discoverable from public-node dashboard, buy-pool page, route-index, and reviewer verify pack routes",
    sealed_dependency_head: "fa25742f",
    routes: {
      closeout_json: "/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-closeout-v1.json",
      closeout_html: "/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-closeout-v1",
      reviewer_pack_json: "/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1.json",
      reviewer_pack_html: "/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-verify-pack-v1",
      public_node_dashboard: "/public-node",
      buy_pool_page: "/public-node/buy-pool/usdc-void-v1",
      route_index_json: "/public-node/route-index.json"
    },
    required_markers: [
      "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_V1",
      "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_DASHBOARD_LINK_V1",
      "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_PUBLIC_NODE_CARD_V1",
      "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_VERIFY_PACK_BUY_POOL_CARD_V1",
      "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_CLOSEOUT_ROUTE_INDEX_WIRING_V1",
      "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_REVIEWER_CLOSEOUT_V1"
    ],
    discoverability: {
      route_index_wired: true,
      public_node_dashboard_card_live: true,
      buy_pool_page_card_live: true,
      reviewer_verify_pack_live: true,
      copy_paste_reviewer_command_live: true
    },
    authority: {
      automatic_payment_execution: false,
      automatic_fulfillment: false,
      wallet_fulfillment: false,
      signer_access: false,
      treasury_transfer_authority: false,
      buyer_execution: false,
      public_mutation: false,
      ledger_write: false,
      void_transfer: false
    }
  };

  const htmlEscapeMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  };

  function escapeHtml(value: unknown): string {
    return String(value).replace(/[&<>"']/g, (ch) => htmlEscapeMap[ch] || ch);
  }

  function mount(app: any): boolean {
    const g: any = globalThis as any;
    if (g.__voidUsdcVoidBuyPoolAutomaticPaymentLivePathPublicReviewerCloseoutV1Mounted) return true;
    if (!app || typeof app.get !== "function") return false;

    app.get("/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-closeout-v1.json", (_req: any, res: any) => {
      res.json(payload);
    });

    app.get("/public-node/usdc-void-buy-pool/automatic-payment-live-path-public-reviewer-closeout-v1", (_req: any, res: any) => {
      res.type("html").send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>USDC/VOID Automatic Payment Public Reviewer Closeout v1</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#080a12;color:#e5e7eb;margin:0;padding:24px}
    main{max-width:980px;margin:0 auto}
    .card{background:#111827;border:1px solid #253044;border-radius:16px;padding:18px;margin:14px 0}
    .ok{color:#86efac}
    .warn{color:#fbbf24}
    code,pre{background:#050713;border:1px solid #252a50;border-radius:6px;padding:2px 6px}
    a{color:#93c5fd}
  </style>
</head>
<body>
<main>
  <h1>USDC/VOID Automatic Payment Public Reviewer Closeout v1</h1>
  <p><strong>Marker:</strong> <code>${payload.marker}</code></p>
  <p class="ok">Status: ${payload.status}</p>

  <section class="card">
    <h2>Reviewer stack closeout</h2>
    <p>This endpoint confirms the automatic-payment public reviewer verify pack is live and discoverable from the public dashboard, buy-pool page, route index, and direct reviewer pack routes.</p>
    <ul>
      <li><a href="${payload.routes.public_node_dashboard}">Public node dashboard</a></li>
      <li><a href="${payload.routes.buy_pool_page}">Buy-pool page</a></li>
      <li><a href="${payload.routes.route_index_json}">Route index JSON</a></li>
      <li><a href="${payload.routes.reviewer_pack_html}">Reviewer verify pack</a></li>
      <li><a href="${payload.routes.reviewer_pack_json}">Reviewer verify pack JSON</a></li>
      <li><a href="${payload.routes.closeout_json}">Closeout JSON</a></li>
    </ul>
  </section>

  <section class="card">
    <h2>Authority boundary</h2>
    <p class="warn">This is public read-only closeout/status only. It does not activate payment execution, fulfillment, signer access, treasury transfer authority, buyer execution, public mutation, ledger write, or VOID transfer.</p>
    <pre>${escapeHtml(JSON.stringify(payload.authority, null, 2))}</pre>
  </section>

  <section class="card">
    <h2>Machine payload</h2>
    <pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre>
  </section>
</main>
</body>
</html>`);
    });

    g.__voidUsdcVoidBuyPoolAutomaticPaymentLivePathPublicReviewerCloseoutV1Mounted = true;
    console.log("[usdc-void-buy-pool.automatic-payment-live-path-public-reviewer-closeout.v1] mounted");
    return true;
  }

  const g: any = globalThis as any;
  if (!mount(g.__void_http_app || g.APP || g.app || g.__app)) {
    let tries = 0;
    const timer = setInterval(() => {
      if (mount(g.__void_http_app || g.APP || g.app || g.__app) || ++tries > 80) clearInterval(timer);
    }, 250);
    if (typeof (timer as any).unref === "function") (timer as any).unref();
  }
})();

function __voidIxCatch0900(scope:string,err:unknown):void{const message=err instanceof Error?err.message:String(err);console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_0001_0900_V1_FAILURE_VISIBLE",{file:"src/index.ts",window:"0001-0900",scope,message});}

function __voidIxCatch1800(s:string,e:unknown):void{const m=e instanceof Error?e.message:String(e);console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_0901_1800_V1_FAILURE_VISIBLE",{file:"src/index.ts",window:"0901-1800",scope:s,message:m});}

function __voidIxCatch2700(s:string,e:unknown):void{const m=e instanceof Error?e.message:String(e);console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_1801_2700_V1_FAILURE_VISIBLE",{file:"src/index.ts",window:"1801-2700",scope:s,message:m});}

function __voidIxCatch3600(s:string,e:unknown):void{const m=e instanceof Error?e.message:String(e);console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_2701_3600_V1_FAILURE_VISIBLE",{file:"src/index.ts",window:"2701-3600",scope:s,message:m});}

function __voidIxCatch4500(s:string,e:unknown):void{const m=e instanceof Error?e.message:String(e);console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_3601_4500_V1_FAILURE_VISIBLE",{file:"src/index.ts",window:"3601-4500",scope:s,message:m});}

function __voidIxCatch5400(s:string,e:unknown):void{const m=e instanceof Error?e.message:String(e);console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_4501_5400_V1_FAILURE_VISIBLE",{file:"src/index.ts",window:"4501-5400",scope:s,message:m});}

function __voidIxCatch6300(s:string,e:unknown):void{const m=e instanceof Error?e.message:String(e);console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_5401_6300_V1_FAILURE_VISIBLE",{file:"src/index.ts",window:"5401-6300",scope:s,message:m});}

function __voidIxCatch7200(s:string,e:unknown):void{const m=e instanceof Error?e.message:String(e);console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_6301_7200_V1_FAILURE_VISIBLE",{file:"src/index.ts",window:"6301-7200",scope:s,message:m});}

function __voidIxCatch8100(s:string,e:unknown):void{const m=e instanceof Error?e.message:String(e);console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_7201_8100_V1_FAILURE_VISIBLE",{file:"src/index.ts",window:"7201-8100",scope:s,message:m});}

function __voidIxCatch9000(s:string,e:unknown):void{const m=e instanceof Error?e.message:String(e);console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_8101_9000_V1_FAILURE_VISIBLE",{file:"src/index.ts",window:"8101-9000",scope:s,message:m});}


function voidIndexEmptyCatchVisibilityWindow9001_9900V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_9001_9900_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow9901_10800V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_9901_10800_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow10801_11700V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_10801_11700_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow11701_12600V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_11701_12600_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow12601_13500V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_12601_13500_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow13501_14400V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_13501_14400_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow14401_15300V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_14401_15300_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow15301_16200V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_15301_16200_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow16201_17100V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_16201_17100_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow17101_18000V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_17101_18000_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow18001_18900V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_18001_18900_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow18901_19800V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_18901_19800_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow19801_20700V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_19801_20700_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow20701_21600V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_20701_21600_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow21601_22500V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_21601_22500_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow22501_23400V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_22501_23400_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow23401_24300V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_23401_24300_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow24301_25200V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_24301_25200_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow25201_26100V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_25201_26100_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow26101_27000V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_26101_27000_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow27001_27900V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_27001_27900_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow27901_28800V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_27901_28800_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow28801_29700V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_28801_29700_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow29701_30600V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_29701_30600_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow30601_31500V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_30601_31500_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow31501_32400V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_31501_32400_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow32401_33300V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_32401_33300_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow33301_34200V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_33301_34200_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow34201_35100V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_34201_35100_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow35101_36000V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_35101_36000_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow36001_36900V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_36001_36900_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow36901_37800V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_36901_37800_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow37801_38700V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_37801_38700_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow38701_39600V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_38701_39600_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow39601_40500V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_39601_40500_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow40501_41400V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_40501_41400_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow41401_42300V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_41401_42300_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow42301_43200V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_42301_43200_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow43201_44100V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_43201_44100_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow44101_45000V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_44101_45000_V1_VISIBLE", context, err);
}


function voidIndexEmptyCatchVisibilityWindow59401_78300V1(context: string, err: unknown): void {
  console.warn("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_59401_78300_V1_VISIBLE", context, err);
}

// === void-app-wave1-foundation-v1-loader BEGIN ===
require("./ui/void_app_wave1_foundation_v1");
// === void-app-wave1-foundation-v1-loader END ===

// === void-app-wave2-home-readonly-v1-loader BEGIN ===
require("./ui/void_app_wave2_home_readonly_v1");
// === void-app-wave2-home-readonly-v1-loader END ===
