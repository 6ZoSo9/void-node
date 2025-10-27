// src/http/api_autoboot.ts
import * as http from "node:http";
import { SegStore } from "../chain/seg_store.js";
import { attachApi } from "./api_attach.js";
import { registerHelloRoute } from "./routes/hello.js";

/* ---------------------------- ENV BRIDGE ---------------------------- */
function firstEnv(...names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (v !== undefined && v !== "") return v;
  }
}
function reqInt(names: string[], label: string): number {
  const raw = firstEnv(...names);
  if (raw === undefined) throw new Error(`Missing required env: ${label} (${names.join(" or ")})`);
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`Invalid integer for ${label}: ${raw}`);
  return n;
}
function optInt(names: string[], def: number): number {
  const raw = firstEnv(...names);
  const n = raw !== undefined ? Number(raw) : def;
  return Number.isFinite(n) && n > 0 ? n : def;
}
function optStr(names: string[], def: string): string {
  const raw = firstEnv(...names);
  return raw !== undefined && raw !== "" ? raw : def;
}

/* ----------------------------- Config ------------------------------ */
// Keep env names aligned with the main node for easy ops.
const DATA_DIR = optStr(["VOID_DATA_DIR", "DATA_DIR"], "data");
const HELPER_PORT = optInt(["VOID_HELPER_PORT", "HELPER_PORT"], 4315);

// Use conservative defaults for the helper store (tiny footprint).
const SEG_MAX_BYTES = optInt(["HELPER_SEGMENT_MAX_BYTES"], 8 * 1024 * 1024);
const SPARSE_EVERY = optInt(["HELPER_SPARSE_EVERY"], 16);

console.log("[helper] config", {
  DATA_DIR,
  HELPER_PORT,
  SEG_MAX_BYTES,
  SPARSE_EVERY,
});

/* ----------------------------- Boot -------------------------------- */
const store = new SegStore(DATA_DIR, {
  segmentMaxBytes: SEG_MAX_BYTES,
  sparseEvery: SPARSE_EVERY,
});
const server = http.createServer();

// Core APIs (no Node instance here → no /follow endpoints)
attachApi(server, store, DATA_DIR);

// Signed /hello handshake route (public-key resolver optional)
registerHelloRoute(server, {
  // resolvePeerPubKey: (nodeId: string) => undefined,
});

/* --------------------------- Error hooks --------------------------- */
server.on("error", (e: any) => {
  const code = e?.code || "";
  if (code === "EADDRINUSE") {
    console.error(`[helper] port ${HELPER_PORT} already in use`);
  } else {
    console.error("[helper] server error:", code || e);
  }
  process.exit(1);
});

process.on("uncaughtException", (e) => {
  console.error("[helper] uncaughtException:", e?.stack || String(e));
});
process.on("unhandledRejection", (e) => {
  console.error("[helper] unhandledRejection:", (e as any)?.stack || String(e));
});

/* ------------------------- Graceful shutdown ------------------------ */
let shuttingDown = false;
function shutdown(sig: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[helper] received ${sig}, closing...`);
  try {
    server.close(() => {
      console.log("[helper] closed");
      process.exit(0);
    });
    // Failsafe: if close does not call back, exit anyway.
    setTimeout(() => process.exit(0), 2000).unref?.();
  } catch {
    process.exit(0);
  }
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

/* ----------------------------- Listen ------------------------------ */
// Bind to loopback by default to avoid accidental exposure.
server.listen(HELPER_PORT, "127.0.0.1", () => {
  console.log(
    `[helper] listening on http://127.0.0.1:${HELPER_PORT} (DATA_DIR=${DATA_DIR}) head=${store.loadHeadNumber()}`
  );
});

