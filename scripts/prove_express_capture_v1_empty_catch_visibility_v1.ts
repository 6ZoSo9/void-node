import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const target = "src/diag/patch_express_capture_v1.cjs";
const source = readFileSync(target, "utf8");

const sha256 = createHash("sha256").update(source).digest("hex");
const realEmptyCatchMatches = source.match(/(^|[^\w.])catch[ \t]*(?:\([^)]*\))?[ \t]*\{[ \t]*\}/gm) ?? [];
const siteMarkers = source.match(/VOID_EXPRESS_CAPTURE_V1_EMPTY_CATCH_VISIBILITY_V1_SITE_[A-Z_]+/g) ?? [];
const recordCalls = source.match(/recordVoidExpressCaptureV1EmptyCatchVisibilityV1\([\"']VOID_EXPRESS_CAPTURE_V1_EMPTY_CATCH_VISIBILITY_V1_SITE_/g) ?? [];
const baseMarkers = source.match(/VOID_EXPRESS_CAPTURE_V1_EMPTY_CATCH_VISIBILITY_V1/g) ?? [];

console.log(`VOID_EXPRESS_CAPTURE_V1_EMPTY_CATCH_VISIBILITY_V1_SHA256=${sha256}`);
console.log(`VOID_EXPRESS_CAPTURE_V1_EMPTY_CATCH_VISIBILITY_V1_REAL_EMPTY_CATCH_COUNT=${realEmptyCatchMatches.length}`);
console.log(`VOID_EXPRESS_CAPTURE_V1_EMPTY_CATCH_VISIBILITY_V1_SITE_MARKER_COUNT=${siteMarkers.length}`);
console.log(`VOID_EXPRESS_CAPTURE_V1_EMPTY_CATCH_VISIBILITY_V1_RECORD_CALL_COUNT=${recordCalls.length}`);

if (!source.includes("function recordVoidExpressCaptureV1EmptyCatchVisibilityV1(site, err)")) {
  throw new Error("missing visibility helper");
}

if (realEmptyCatchMatches.length !== 0) {
  throw new Error(`expected 0 real same-line empty catches in ${target}, found ${realEmptyCatchMatches.length}`);
}

if (siteMarkers.length !== 5) {
  throw new Error(`expected 5 site markers, found ${siteMarkers.length}`);
}

if (recordCalls.length !== 5) {
  throw new Error(`expected 5 visibility record calls, found ${recordCalls.length}`);
}

if (baseMarkers.length < 5) {
  throw new Error(`expected base visibility markers to be present, found ${baseMarkers.length}`);
}

console.log(`[PASS] sha256-stable: sha256=${sha256}`);
console.log("[PASS] real-empty-catches-closed: count=0, expected=0");
console.log("[PASS] site-marker-count: count=5, expected=5");
console.log("[PASS] record-call-count: count=5, expected=5");
console.log("VOID_EXPRESS_CAPTURE_V1_EMPTY_CATCH_VISIBILITY_V1_GREEN");
