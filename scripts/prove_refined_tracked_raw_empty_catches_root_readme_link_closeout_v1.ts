import fs from "node:fs";
import path from "node:path";

const marker = "VOID_REFINED_TRACKED_RAW_EMPTY_CATCHES_ROOT_README_LINK_CLOSEOUT_V1";

const jsonPath = "docs/public/refined-tracked-raw-empty-catches-root-readme-link-closeout-v1.json";
const mdPath = "docs/public/refined-tracked-raw-empty-catches-root-readme-link-closeout-v1.md";

const exactMain = "0f6bf86848f8ba9b6f9a3f375a21ba95c63d29e1";
const tag = "ckpt-refined-tracked-raw-empty-catches-root-readme-link-zero-guard-v1-post-merge-exact-green-20260711-135527";
const receipt = "/home/zoso/void-precision-smoke/three-box-pr587-root-readme-link-zero-guard-exact-main-p2p-strict-runtime-clean-watch-20260711-141529.txt";
const receiptSha = "6b9bd70fbbee4710c495a52b44cee83226ef4558abd082646bd90d86f5d29fae";

function read(file: string): string {
  return fs.readFileSync(path.resolve(file), "utf8");
}

for (const file of [
  jsonPath,
  mdPath,
  "README.md",
  "docs/public/README.md",
  "docs/public/refined-tracked-raw-empty-catches-public-discovery-index-v1.md",
  ".github/workflows/refined-tracked-raw-empty-catches-terminal-zero.yml",
]) {
  if (!fs.existsSync(path.resolve(file))) {
    throw new Error(`missing required file: ${file}`);
  }
}

const json = JSON.parse(read(jsonPath));
const md = read(mdPath);
const rootReadme = read("README.md");
const publicReadme = read("docs/public/README.md");
const workflow = read(".github/workflows/refined-tracked-raw-empty-catches-terminal-zero.yml");

if (json.marker !== marker) throw new Error(`wrong marker: ${json.marker}`);
if (!md.includes(marker)) throw new Error("markdown missing marker");

if (json.exact_main !== exactMain) throw new Error("wrong exact_main");
if (json.tag !== tag) throw new Error("wrong tag");
if (json.receipt !== receipt) throw new Error("wrong receipt");
if (json.receipt_sha256 !== receiptSha) throw new Error("wrong receipt_sha256");

if (json.repo_wide_refined_tracked_raw_empty_catches !== 0) throw new Error("closeout must record zero raw empty catches");
if (JSON.stringify(json.buckets) !== "{}") throw new Error(`closeout buckets must be {}, got ${JSON.stringify(json.buckets)}`);

if (!rootReadme.includes("docs/public/refined-tracked-raw-empty-catches-public-discovery-index-v1.md")) {
  throw new Error("root README missing public discovery link");
}

if (!publicReadme.includes("refined-tracked-raw-empty-catches-public-discovery-index-v1.md")) {
  throw new Error("docs/public README missing public discovery link");
}

if (!workflow.includes("Prove root README public discovery link remains green")) {
  throw new Error("zero guard workflow missing root README proof step");
}

if (!workflow.includes("fetch-depth: 0")) {
  throw new Error("zero guard workflow missing fetch-depth: 0");
}

console.log(marker + "_GREEN", JSON.stringify({
  exactMain,
  tag,
  receiptSha256: receiptSha,
  repoWideRefinedTrackedRawEmptyCatches: json.repo_wide_refined_tracked_raw_empty_catches,
  buckets: json.buckets,
  rootReadmeLinked: true,
  publicReadmeLinked: true,
  workflowProtected: true,
}));
