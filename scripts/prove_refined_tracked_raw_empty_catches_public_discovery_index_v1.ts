import fs from "node:fs";
import path from "node:path";

const marker = "VOID_REFINED_TRACKED_RAW_EMPTY_CATCHES_PUBLIC_DISCOVERY_INDEX_V1";
const terminalMarker = "VOID_REFINED_TRACKED_RAW_EMPTY_CATCHES_TERMINAL_FINAL_SEAL_V1";

const mdPath = "docs/public/refined-tracked-raw-empty-catches-public-discovery-index-v1.md";
const jsonPath = "docs/public/refined-tracked-raw-empty-catches-public-discovery-index-v1.json";
const readmePath = "docs/public/README.md";

function read(file: string): string {
  return fs.readFileSync(path.resolve(file), "utf8");
}

const doc = read(mdPath);
const json = JSON.parse(read(jsonPath));
const readme = read(readmePath);

if (json.marker !== marker) throw new Error(`wrong marker: ${json.marker}`);
if (!doc.includes(marker)) throw new Error("markdown missing discovery marker");
if (!doc.includes(terminalMarker)) throw new Error("markdown missing terminal seal marker");
if (!readme.includes("refined-tracked-raw-empty-catches-public-discovery-index-v1.md")) {
  throw new Error("docs/public/README.md missing public discovery link");
}

if (json.repo_wide_refined_tracked_raw_empty_catches !== 0) {
  throw new Error("public discovery index must record repo-wide refined tracked raw empty catches as 0");
}

if (JSON.stringify(json.buckets) !== "{}") {
  throw new Error(`public discovery buckets must be {}, got ${JSON.stringify(json.buckets)}`);
}

const required = [
  "docs/security/refined-tracked-raw-empty-catches-terminal-final-seal-v1.json",
  "docs/security/refined-tracked-raw-empty-catches-terminal-final-seal-v1.md",
  "scripts/prove_refined_tracked_raw_empty_catches_terminal_final_seal_v1.ts",
  ".github/workflows/refined-tracked-raw-empty-catches-terminal-zero.yml",
];

for (const file of required) {
  if (!fs.existsSync(path.resolve(file))) throw new Error(`missing referenced file: ${file}`);
  if (!doc.includes(file) && JSON.stringify(json).indexOf(file) === -1) {
    throw new Error(`discovery index does not reference ${file}`);
  }
}

console.log(marker + "_GREEN", JSON.stringify({
  repoWideRefinedTrackedRawEmptyCatches: json.repo_wide_refined_tracked_raw_empty_catches,
  buckets: json.buckets,
  terminalFinalSealMarker: json.terminal_final_seal_marker,
  readmeLinked: true,
}));
