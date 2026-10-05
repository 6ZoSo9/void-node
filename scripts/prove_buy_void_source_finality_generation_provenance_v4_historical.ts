import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

import {
  VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_AUTHORITY_V4,
  VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V4,
  VOID_BUY_VOID_SOURCE_FINALITY_REVIEWED_RUNTIME_SOURCES_V4,
} from "../src/economic/buy_void_source_finality_generation_provenance_v4.js";

function git(args: string[]): string {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

assert.equal(
  VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V4,
  "VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V4",
);
assert.equal(
  VOID_BUY_VOID_SOURCE_FINALITY_REVIEWED_RUNTIME_SOURCES_V4.length,
  5,
);
for (const record of VOID_BUY_VOID_SOURCE_FINALITY_REVIEWED_RUNTIME_SOURCES_V4) {
  assert.match(record.source_commit_sha, /^[0-9a-f]{40}$/u);
  assert.match(record.git_blob_sha1, /^[0-9a-f]{40}$/u);
  git(["cat-file", "-e", record.source_commit_sha + "^{commit}"]);
  const listing = git(["ls-tree", record.source_commit_sha, "--", record.path]);
  const match = listing.match(/^\d+\s+blob\s+([0-9a-f]{40})\t/mu);
  assert.ok(match, record.path);
  assert.equal(match[1], record.git_blob_sha1, record.path);
}
assert.equal(
  VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_AUTHORITY_V4
    .production_source_finality_authority_ready,
  false,
);
assert.equal(
  VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_AUTHORITY_V4.signing,
  false,
);
assert.equal(
  VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_AUTHORITY_V4
    .transaction_broadcast,
  false,
);
assert.equal(
  VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_AUTHORITY_V4
    .money_movement,
  false,
);
console.log("VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V4_HISTORICAL_GREEN");
console.log("current_runtime_authority=false");
console.log("historical_commit_blob_mapping_verified=true");
console.log("funds_movement=false");
