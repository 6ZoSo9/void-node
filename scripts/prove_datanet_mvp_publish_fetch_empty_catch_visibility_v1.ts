import fs from "node:fs";
import crypto from "node:crypto";

const baselinePath = "docs/security/datanet-mvp-publish-fetch-empty-catch-visibility-v1-baseline.json";
const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
const file = baseline.file;
const marker = baseline.marker;

const text = fs.readFileSync(file, "utf8");
const sha = crypto.createHash("sha256").update(text).digest("hex");

function stripStrings(line: string): string {
  let out = "";
  let quote: string | null = null;
  let esc = false;
  for (const ch of line) {
    if (quote) {
      if (esc) { esc = false; out += " "; }
      else if (ch === "\\") { esc = true; out += " "; }
      else if (ch === quote) { quote = null; out += " "; }
      else out += " ";
    } else {
      if (ch === "'" || ch === '"' || ch === "`") { quote = ch; out += " "; }
      else out += ch;
    }
  }
  return out;
}

const emptyCatchPattern = /\bcatch\s*\{\s*\}/;
const realEmptyCatchCount = text.split(/\r?\n/).filter((line) => emptyCatchPattern.test(stripStrings(line))).length;
const markerCount = (text.match(new RegExp(marker, "g")) || []).length;

function pass(name: string, ok: boolean, detail: string): void {
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name}: ${detail}`);
  if (!ok) process.exitCode = 1;
}

console.log(`VOID_DATANET_MVP_PUBLISH_FETCH_EMPTY_CATCH_VISIBILITY_V1_SHA256=${sha}`);
console.log(`VOID_DATANET_MVP_PUBLISH_FETCH_EMPTY_CATCH_VISIBILITY_V1_REAL_EMPTY_CATCH_COUNT=${realEmptyCatchCount}`);
console.log(`VOID_DATANET_MVP_PUBLISH_FETCH_EMPTY_CATCH_VISIBILITY_V1_MARKER_COUNT=${markerCount}`);

pass("sha256-stable", sha === baseline.sha256, `sha256=${sha}`);
pass("real-empty-catches-closed", realEmptyCatchCount === 0, `count=${realEmptyCatchCount}, expected=0`);
pass("marker-count", markerCount === baseline.closed_count, `markerCount=${markerCount}, expected=${baseline.closed_count}`);

if (process.exitCode) process.exit(process.exitCode);
console.log("VOID_DATANET_MVP_PUBLISH_FETCH_EMPTY_CATCH_VISIBILITY_V1_GREEN");
