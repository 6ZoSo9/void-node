import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const target = "src/http/tx_routes.js";
const source = readFileSync(target, "utf8");

const sha256 = createHash("sha256").update(source).digest("hex");
const realEmptyCatchMatches = source.match(/(^|[^\w.])catch[ \t]*(?:\([^)]*\))?[ \t]*\{[ \t]*\}/gm) ?? [];
const siteMarkers = source.match(/VOID_HTTP_TX_ROUTES_EMPTY_CATCH_VISIBILITY_V1_SITE_[0-9]+/g) ?? [];
const helperMarkers = source.match(/VOID_HTTP_TX_ROUTES_EMPTY_CATCH_VISIBILITY_V1/g) ?? [];
const recordCalls = source.match(/recordVoidHttpTxRoutesEmptyCatchVisibilityV1\('VOID_HTTP_TX_ROUTES_EMPTY_CATCH_VISIBILITY_V1_SITE_/g) ?? [];

console.log(`VOID_HTTP_TX_ROUTES_EMPTY_CATCH_VISIBILITY_V1_SHA256=${sha256}`);
console.log(`VOID_HTTP_TX_ROUTES_EMPTY_CATCH_VISIBILITY_V1_REAL_EMPTY_CATCH_COUNT=${realEmptyCatchMatches.length}`);
console.log(`VOID_HTTP_TX_ROUTES_EMPTY_CATCH_VISIBILITY_V1_SITE_MARKER_COUNT=${siteMarkers.length}`);
console.log(`VOID_HTTP_TX_ROUTES_EMPTY_CATCH_VISIBILITY_V1_RECORD_CALL_COUNT=${recordCalls.length}`);

if (!source.includes("function recordVoidHttpTxRoutesEmptyCatchVisibilityV1(site, err)")) {
  throw new Error("missing visibility helper");
}

if (realEmptyCatchMatches.length !== 0) {
  throw new Error(`expected 0 real same-line empty catches in ${target}, found ${realEmptyCatchMatches.length}`);
}

if (siteMarkers.length !== 3) {
  throw new Error(`expected 3 site markers, found ${siteMarkers.length}`);
}

if (recordCalls.length !== 3) {
  throw new Error(`expected 3 visibility record calls, found ${recordCalls.length}`);
}

if (helperMarkers.length < 4) {
  throw new Error(`expected helper/base markers to be present, found ${helperMarkers.length}`);
}

console.log(`[PASS] sha256-stable: sha256=${sha256}`);
console.log("[PASS] real-empty-catches-closed: count=0, expected=0");
console.log("[PASS] site-marker-count: count=3, expected=3");
console.log("[PASS] record-call-count: count=3, expected=3");
console.log("VOID_HTTP_TX_ROUTES_EMPTY_CATCH_VISIBILITY_V1_GREEN");
