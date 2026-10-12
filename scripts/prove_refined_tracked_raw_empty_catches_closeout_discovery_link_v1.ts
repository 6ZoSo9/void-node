import fs from "node:fs";
import path from "node:path";

const marker = "VOID_REFINED_TRACKED_RAW_EMPTY_CATCHES_CLOSEOUT_DISCOVERY_LINK_V1";
const publicIndexMarker = "VOID_REFINED_TRACKED_RAW_EMPTY_CATCHES_PUBLIC_DISCOVERY_INDEX_V1";
const closeoutMarker = "VOID_REFINED_TRACKED_RAW_EMPTY_CATCHES_ROOT_README_LINK_CLOSEOUT_V1";

const indexJsonPath = "docs/public/refined-tracked-raw-empty-catches-public-discovery-index-v1.json";
const indexMdPath = "docs/public/refined-tracked-raw-empty-catches-public-discovery-index-v1.md";
const closeoutJsonPath = "docs/public/refined-tracked-raw-empty-catches-root-readme-link-closeout-v1.json";
const closeoutMdPath = "docs/public/refined-tracked-raw-empty-catches-root-readme-link-closeout-v1.md";

function read(file: string): string {
  return fs.readFileSync(path.resolve(file), "utf8");
}

for (const file of [indexJsonPath, indexMdPath, closeoutJsonPath, closeoutMdPath]) {
  if (!fs.existsSync(path.resolve(file))) {
    throw new Error(`missing required file: ${file}`);
  }
}

const indexJson = JSON.parse(read(indexJsonPath));
const closeoutJson = JSON.parse(read(closeoutJsonPath));
const indexMd = read(indexMdPath);
const closeoutMd = read(closeoutMdPath);

if (indexJson.marker !== publicIndexMarker) {
  throw new Error(`wrong public index marker: ${indexJson.marker}`);
}

if (closeoutJson.marker !== closeoutMarker) {
  throw new Error(`wrong closeout marker: ${closeoutJson.marker}`);
}

if (!closeoutMd.includes(closeoutMarker)) {
  throw new Error("closeout markdown missing closeout marker");
}

const link = indexJson.root_readme_link_closeout;
if (!link) {
  throw new Error("public discovery index missing root_readme_link_closeout");
}

if (link.marker !== closeoutMarker) {
  throw new Error(`wrong linked closeout marker: ${link.marker}`);
}

if (link.md !== closeoutMdPath) {
  throw new Error(`wrong linked closeout md path: ${link.md}`);
}

if (link.json !== closeoutJsonPath) {
  throw new Error(`wrong linked closeout json path: ${link.json}`);
}

if (link.status !== "linked_from_public_discovery_index") {
  throw new Error(`wrong linked closeout status: ${link.status}`);
}

for (const required of [
  "## Root README link closeout",
  closeoutMarker,
  closeoutMdPath,
  closeoutJsonPath,
]) {
  if (!indexMd.includes(required)) {
    throw new Error(`public discovery markdown missing ${required}`);
  }
}

if (indexJson.repo_wide_refined_tracked_raw_empty_catches !== 0) {
  throw new Error("public discovery index must keep zero raw empty catches");
}

if (closeoutJson.repo_wide_refined_tracked_raw_empty_catches !== 0) {
  throw new Error("closeout must keep zero raw empty catches");
}

console.log(marker + "_GREEN", JSON.stringify({
  publicIndexLinked: true,
  closeoutMarker,
  closeoutMd: closeoutMdPath,
  closeoutJson: closeoutJsonPath,
  repoWideRefinedTrackedRawEmptyCatches: indexJson.repo_wide_refined_tracked_raw_empty_catches,
  closeoutRepoWideRefinedTrackedRawEmptyCatches: closeoutJson.repo_wide_refined_tracked_raw_empty_catches,
}));
