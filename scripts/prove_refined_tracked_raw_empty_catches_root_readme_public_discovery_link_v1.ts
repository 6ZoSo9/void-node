import fs from "node:fs";
import path from "node:path";

const marker = "VOID_REFINED_TRACKED_RAW_EMPTY_CATCHES_ROOT_README_PUBLIC_DISCOVERY_LINK_V1";
const rootReadme = "README.md";
const publicIndexMd = "docs/public/refined-tracked-raw-empty-catches-public-discovery-index-v1.md";
const publicIndexJson = "docs/public/refined-tracked-raw-empty-catches-public-discovery-index-v1.json";
const publicIndexProof = "scripts/prove_refined_tracked_raw_empty_catches_public_discovery_index_v1.ts";
const publicMarker = "VOID_REFINED_TRACKED_RAW_EMPTY_CATCHES_PUBLIC_DISCOVERY_INDEX_V1";

function read(file: string): string {
  return fs.readFileSync(path.resolve(file), "utf8");
}

for (const file of [rootReadme, publicIndexMd, publicIndexJson, publicIndexProof]) {
  if (!fs.existsSync(path.resolve(file))) {
    throw new Error(`missing required file: ${file}`);
  }
}

const readme = read(rootReadme);
const publicMd = read(publicIndexMd);
const publicJson = JSON.parse(read(publicIndexJson));

if (!readme.includes(publicIndexMd)) {
  throw new Error(`root README missing public discovery link: ${publicIndexMd}`);
}

if (!publicMd.includes(publicMarker)) {
  throw new Error("public discovery markdown missing marker");
}

if (publicJson.marker !== publicMarker) {
  throw new Error(`public discovery JSON marker mismatch: ${publicJson.marker}`);
}

if (publicJson.repo_wide_refined_tracked_raw_empty_catches !== 0) {
  throw new Error("public discovery JSON must record repo-wide refined tracked raw empty catches as 0");
}

if (JSON.stringify(publicJson.buckets) !== "{}") {
  throw new Error(`public discovery JSON buckets must be {}, got ${JSON.stringify(publicJson.buckets)}`);
}

console.log(marker + "_GREEN", JSON.stringify({
  rootReadmeLinked: true,
  publicIndexMd,
  repoWideRefinedTrackedRawEmptyCatches: publicJson.repo_wide_refined_tracked_raw_empty_catches,
  buckets: publicJson.buckets,
}));
