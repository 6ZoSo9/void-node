import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const jsTarget = "src/http/tx_routes.js";
const tsTarget = "src/http/tx_routes.ts";
const source = readFileSync(jsTarget, "utf8");
const tsSource = readFileSync(tsTarget, "utf8");

const sha256 = createHash("sha256").update(source).digest("hex");
const tsSha256 = createHash("sha256").update(tsSource).digest("hex");
const realEmptyCatchMatches = source.match(/(^|[^\w.])catch[ \t]*(?:\([^)]*\))?[ \t]*\{[ \t]*\}/gm) ?? [];
const siteMarkers = source.match(/VOID_HTTP_TX_ROUTES_EMPTY_CATCH_VISIBILITY_V1_SITE_[0-9]+/g) ?? [];
const helperMarkers = source.match(/VOID_HTTP_TX_ROUTES_EMPTY_CATCH_VISIBILITY_V1/g) ?? [];
const recordCalls = source.match(/recordVoidHttpTxRoutesEmptyCatchVisibilityV1\('VOID_HTTP_TX_ROUTES_EMPTY_CATCH_VISIBILITY_V1_SITE_/g) ?? [];
const jsCanonicalMounts = source.match(/app\.post\(["']\/tx\/submit["']/g) ?? [];
const tsCanonicalMounts = tsSource.match(/app\.post\(["']\/tx\/submit["']/g) ?? [];
const jsRetiredMounts = source.match(/app\.post\(["']\/mempool\/submit["']/g) ?? [];
const tsRetiredMounts = tsSource.match(/app\.post\(["']\/mempool\/submit["']/g) ?? [];

console.log(`VOID_HTTP_TX_ROUTES_EMPTY_CATCH_VISIBILITY_V1_SHA256=${sha256}`);
console.log(`VOID_HTTP_TX_ROUTES_EMPTY_CATCH_VISIBILITY_V1_TS_SHA256=${tsSha256}`);
console.log(`VOID_HTTP_TX_ROUTES_EMPTY_CATCH_VISIBILITY_V1_REAL_EMPTY_CATCH_COUNT=${realEmptyCatchMatches.length}`);
console.log(`VOID_HTTP_TX_ROUTES_EMPTY_CATCH_VISIBILITY_V1_SITE_MARKER_COUNT=${siteMarkers.length}`);
console.log(`VOID_HTTP_TX_ROUTES_EMPTY_CATCH_VISIBILITY_V1_RECORD_CALL_COUNT=${recordCalls.length}`);
console.log(`VOID_NONCANONICAL_MEMPOOL_SUBMIT_RETIRED_V1_JS_MOUNT_COUNT=${jsRetiredMounts.length}`);
console.log(`VOID_NONCANONICAL_MEMPOOL_SUBMIT_RETIRED_V1_TS_MOUNT_COUNT=${tsRetiredMounts.length}`);
console.log(`VOID_NONCANONICAL_MEMPOOL_SUBMIT_RETIRED_V1_JS_CANONICAL_MOUNT_COUNT=${jsCanonicalMounts.length}`);
console.log(`VOID_NONCANONICAL_MEMPOOL_SUBMIT_RETIRED_V1_TS_CANONICAL_MOUNT_COUNT=${tsCanonicalMounts.length}`);

if (!source.includes("function recordVoidHttpTxRoutesEmptyCatchVisibilityV1(site, err)")) {
  throw new Error("missing visibility helper");
}

if (realEmptyCatchMatches.length !== 0) {
  throw new Error(`expected 0 real same-line empty catches in ${jsTarget}, found ${realEmptyCatchMatches.length}`);
}

if (siteMarkers.length !== 2) {
  throw new Error(`expected 2 remaining site markers after legacy alias retirement, found ${siteMarkers.length}`);
}

if (recordCalls.length !== 2) {
  throw new Error(`expected 2 remaining visibility record calls after legacy alias retirement, found ${recordCalls.length}`);
}

if (helperMarkers.length < 4) {
  throw new Error(`expected helper/base markers to be present, found ${helperMarkers.length}`);
}

if (jsRetiredMounts.length !== 0 || tsRetiredMounts.length !== 0) {
  throw new Error(`noncanonical /mempool/submit mount remains: js=${jsRetiredMounts.length} ts=${tsRetiredMounts.length}`);
}

if (source.includes("empty-catch-3") || source.includes("SITE_62") || tsSource.includes("empty-catch-3")) {
  throw new Error("retired /mempool/submit enqueue/catch residue remains");
}

if (jsCanonicalMounts.length !== 1 || tsCanonicalMounts.length !== 1) {
  throw new Error(`expected one preserved /tx/submit registration in each tracked twin: js=${jsCanonicalMounts.length} ts=${tsCanonicalMounts.length}`);
}

console.log(`[PASS] sha256-stable: sha256=${sha256}`);
console.log("[PASS] real-empty-catches-closed: count=0, expected=0");
console.log("[PASS] site-marker-count: count=2, expected=2");
console.log("[PASS] record-call-count: count=2, expected=2");
console.log("[PASS] noncanonical-mempool-submit-mounts: js=0 ts=0");
console.log("[PASS] canonical-tx-submit-registration-preserved: js=1 ts=1");
console.log("VOID_NONCANONICAL_MEMPOOL_SUBMIT_RETIRED_V1_GREEN");
console.log("VOID_HTTP_TX_ROUTES_EMPTY_CATCH_VISIBILITY_V1_GREEN");
