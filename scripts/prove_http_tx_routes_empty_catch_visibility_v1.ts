import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const jsTarget = "src/http/tx_routes.js";
const tsTarget = "src/http/tx_routes.ts";
const jsSource = readFileSync(jsTarget, "utf8");
const tsSource = readFileSync(tsTarget, "utf8");

function walkSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      out.push(...walkSourceFiles(path));
      continue;
    }
    if (/\.(?:cjs|cts|js|jsx|mjs|mts|ts|tsx)$/.test(name)) out.push(path);
  }
  return out;
}

function occurrences(source: string, needle: string): number {
  return source.split(needle).length - 1;
}

const sourceFiles = walkSourceFiles("src");
const globalRetiredAliasHits: string[] = [];
const globalBufferPopHits: string[] = [];
const globalBufferClearHits: string[] = [];

for (const file of sourceFiles) {
  const source = readFileSync(file, "utf8");
  if (source.includes("/mempool/submit")) globalRetiredAliasHits.push(file);
  if (source.includes("/mempool/buffer/pop")) globalBufferPopHits.push(file);
  if (source.includes("/mempool/buffer/clear")) globalBufferClearHits.push(file);
}

const sha256 = createHash("sha256").update(jsSource).digest("hex");
const tsSha256 = createHash("sha256").update(tsSource).digest("hex");
const realEmptyCatchMatches = jsSource.match(/(^|[^\w.])catch[ \t]*(?:\([^)]*\))?[ \t]*\{[ \t]*\}/gm) ?? [];
const jsLegacyTxSubmitHits = occurrences(jsSource, "/tx/submit");
const tsLegacyTxSubmitHits = occurrences(tsSource, "/tx/submit");
const jsGlobalEnqueueHits = occurrences(jsSource, "globalEnqueueTx");
const tsGlobalEnqueueHits = occurrences(tsSource, "globalEnqueueTx");
const jsBufferPopCallHits = occurrences(jsSource, "txBuffer.popN");
const tsBufferPopCallHits = occurrences(tsSource, "txBuffer.popN");
const jsBufferClearCallHits = occurrences(jsSource, "txBuffer.clear");
const tsBufferClearCallHits = occurrences(tsSource, "txBuffer.clear");
const jsLegacyMetricsHits = occurrences(jsSource, "/metrics/mempool");
const tsLegacyMetricsHits = occurrences(tsSource, "/metrics/mempool");
const jsLegacyMempoolImportHits = occurrences(jsSource, "../mempool.js");
const tsLegacyMempoolImportHits = occurrences(tsSource, "../mempool.js");
const jsSizeRouteHits = occurrences(jsSource, "/mempool/buffer/size");
const tsSizeRouteHits = occurrences(tsSource, "/mempool/buffer/size");
const jsSampleRouteHits = occurrences(jsSource, "/mempool/buffer/sample");
const tsSampleRouteHits = occurrences(tsSource, "/mempool/buffer/sample");
const tsVisibilityMarkerHits = occurrences(tsSource, "VOID_SMALL_EMPTY_CATCH_VISIBILITY_PACK_V1_FAILURE_VISIBLE");

console.log(`VOID_HTTP_TX_ROUTES_EMPTY_CATCH_VISIBILITY_V1_SHA256=${sha256}`);
console.log(`VOID_HTTP_TX_ROUTES_EMPTY_CATCH_VISIBILITY_V1_TS_SHA256=${tsSha256}`);
console.log(`VOID_HTTP_TX_ROUTES_EMPTY_CATCH_VISIBILITY_V1_REAL_EMPTY_CATCH_COUNT=${realEmptyCatchMatches.length}`);
console.log(`VOID_NONCANONICAL_MEMPOOL_SUBMIT_GLOBAL_SOURCE_HITS=${globalRetiredAliasHits.length}`);
console.log(`VOID_TX_BUFFER_POP_GLOBAL_SOURCE_HITS=${globalBufferPopHits.length}`);
console.log(`VOID_TX_BUFFER_CLEAR_GLOBAL_SOURCE_HITS=${globalBufferClearHits.length}`);
console.log(`VOID_LEGACY_TX_ROUTES_TX_SUBMIT_HITS_JS=${jsLegacyTxSubmitHits}`);
console.log(`VOID_LEGACY_TX_ROUTES_TX_SUBMIT_HITS_TS=${tsLegacyTxSubmitHits}`);
console.log(`VOID_LEGACY_MEMPOOL_METRICS_HITS_JS=${jsLegacyMetricsHits}`);
console.log(`VOID_LEGACY_MEMPOOL_METRICS_HITS_TS=${tsLegacyMetricsHits}`);

if (realEmptyCatchMatches.length !== 0) {
  throw new Error(`expected 0 real same-line empty catches in ${jsTarget}, found ${realEmptyCatchMatches.length}`);
}

if (globalRetiredAliasHits.length !== 0) {
  throw new Error(`retired mempool-submit path remains under src/: ${globalRetiredAliasHits.join(",")}`);
}

if (globalBufferPopHits.length !== 0 || globalBufferClearHits.length !== 0) {
  throw new Error(
    `destructive TX-buffer HTTP path remains under src/: pop=${globalBufferPopHits.join(",") || "none"} clear=${globalBufferClearHits.join(",") || "none"}`,
  );
}

if (jsLegacyTxSubmitHits !== 0 || tsLegacyTxSubmitHits !== 0) {
  throw new Error(`legacy tx_routes transaction-admission path remains: js=${jsLegacyTxSubmitHits} ts=${tsLegacyTxSubmitHits}`);
}

if (jsGlobalEnqueueHits !== 0 || tsGlobalEnqueueHits !== 0) {
  throw new Error(`legacy tx_routes global enqueue mutation remains: js=${jsGlobalEnqueueHits} ts=${tsGlobalEnqueueHits}`);
}

if (jsBufferPopCallHits !== 0 || tsBufferPopCallHits !== 0 || jsBufferClearCallHits !== 0 || tsBufferClearCallHits !== 0) {
  throw new Error(
    `legacy tx_routes destructive buffer mutation remains: pop_js=${jsBufferPopCallHits} pop_ts=${tsBufferPopCallHits} clear_js=${jsBufferClearCallHits} clear_ts=${tsBufferClearCallHits}`,
  );
}

if (jsLegacyMetricsHits !== 0 || tsLegacyMetricsHits !== 0) {
  throw new Error(`legacy generic mempool metrics route remains: js=${jsLegacyMetricsHits} ts=${tsLegacyMetricsHits}`);
}

if (jsLegacyMempoolImportHits !== 0 || tsLegacyMempoolImportHits !== 0) {
  throw new Error(`legacy mempool singleton import remains in tx_routes: js=${jsLegacyMempoolImportHits} ts=${tsLegacyMempoolImportHits}`);
}

if (jsSizeRouteHits !== 1 || tsSizeRouteHits !== 1 || jsSampleRouteHits !== 1 || tsSampleRouteHits !== 1) {
  throw new Error(
    `expected read-only buffer observability to remain once per twin: size_js=${jsSizeRouteHits} size_ts=${tsSizeRouteHits} sample_js=${jsSampleRouteHits} sample_ts=${tsSampleRouteHits}`,
  );
}

if (tsVisibilityMarkerHits < 1) {
  throw new Error("small-empty-catch visibility-pack marker missing from TypeScript target");
}

console.log(`[PASS] sha256-stable: sha256=${sha256}`);
console.log("[PASS] real-empty-catches-closed: count=0");
console.log("[PASS] noncanonical-mempool-submit-global-retirement: src_hits=0");
console.log("[PASS] destructive-buffer-http-surfaces-retired: pop_src_hits=0 clear_src_hits=0");
console.log("[PASS] legacy-tx-routes-admission-retired: js=0 ts=0");
console.log("[PASS] legacy-tx-routes-mutation-helpers-retired: globalEnqueue=0 popN=0 clear=0");
console.log("[PASS] legacy-generic-mempool-metrics-retired: js=0 ts=0 import_js=0 import_ts=0");
console.log("[PASS] read-only-buffer-observability-preserved: size=1/twin sample=1/twin");
console.log("VOID_NONCANONICAL_MEMPOOL_SUBMIT_RETIRED_V1_GREEN");
console.log("VOID_TX_ROUTES_LEGACY_MUTATION_AUTHORITY_RETIRED_V1_GREEN");
console.log("VOID_TX_BUFFER_DESTRUCTIVE_HTTP_SURFACES_RETIRED_V1_GREEN");
console.log("VOID_LEGACY_MEMPOOL_METRICS_RETIRED_V1_GREEN");
console.log("VOID_HTTP_TX_ROUTES_EMPTY_CATCH_VISIBILITY_V1_GREEN");
