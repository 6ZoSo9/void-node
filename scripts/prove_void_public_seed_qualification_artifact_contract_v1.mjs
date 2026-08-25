#!/usr/bin/env node
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { ARTIFACT_FILES } from "./lib/void_public_bootstrap_manifest_publication_contract_v1.mjs";

const MARKER = "VOID_PUBLIC_SEED_QUALIFICATION_ARTIFACT_CONTRACT_V1_PROOF_GREEN";
const ROOT = fs.realpathSync(process.cwd());
const WORKFLOW = path.join(
  ROOT,
  ".github/workflows/void-public-seed-live-qualification-v1.yml",
);
const PARSER = path.join(
  ROOT,
  "scripts/lib/void_public_bootstrap_manifest_publication_state_v1.mjs",
);
const EXPECTED_FILES = [
  "qualification.json",
  "public-bootstrap-v1.json",
  "source.txt",
];
const SUM_LINE = /^([0-9a-f]{64})  ([A-Za-z0-9._-]+)$/;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function writeFixture(dir, name, bytes) {
  fs.writeFileSync(path.join(dir, name), bytes, { mode: 0o600 });
}

const workflow = fs.readFileSync(WORKFLOW, "utf8");
const parser = fs.readFileSync(PARSER, "utf8");

assert(
  JSON.stringify(ARTIFACT_FILES) === JSON.stringify(EXPECTED_FILES),
  "publication artifact file contract changed unexpectedly",
);
assert(
  workflow.includes(
    "cd qualification-output\n            sha256sum qualification.json \\\n              public-bootstrap-v1.json \\\n              source.txt \\\n              > SHA256SUMS",
  ),
  "qualification workflow does not checksum from inside qualification-output",
);
assert(
  !workflow.includes("sha256sum qualification-output/qualification.json"),
  "qualification workflow still emits path-prefixed checksum entries",
);
assert(
  parser.includes(
    "const match = /^([0-9a-f]{64})  ([A-Za-z0-9._-]+)$/.exec(line);",
  ),
  "publication parser checksum grammar changed; review this integration proof",
);

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-public-seed-qualification-artifact-contract-v1-"),
);

try {
  const fixtures = new Map([
    ["qualification.json", Buffer.from('{"fixture":"qualification"}\n')],
    ["public-bootstrap-v1.json", Buffer.from('{"fixture":"manifest"}\n')],
    ["source.txt", Buffer.from(`source_sha=${"a".repeat(40)}\n`)],
  ]);

  for (const [name, bytes] of fixtures) writeFixture(temp, name, bytes);

  const result = childProcess.spawnSync("sha256sum", EXPECTED_FILES, {
    cwd: temp,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  assert(result.status === 0, `sha256sum fixture failed: ${result.stderr || "unknown error"}`);
  assert(result.stdout.endsWith("\n"), "generated checksum output lacks final newline");

  const lines = result.stdout.trimEnd().split("\n");
  assert(lines.length === EXPECTED_FILES.length, "generated checksum entry count mismatch");

  const seen = new Set();
  for (const line of lines) {
    const match = SUM_LINE.exec(line);
    assert(match, `generated checksum entry is parser-incompatible: ${line}`);
    const [, digest, name] = match;
    assert(EXPECTED_FILES.includes(name), `generated checksum contains unexpected file ${name}`);
    assert(!seen.has(name), `generated checksum duplicates ${name}`);
    assert(digest === sha256(fixtures.get(name)), `generated checksum digest mismatch for ${name}`);
    seen.add(name);
  }
  assert(seen.size === EXPECTED_FILES.length, "generated checksum omitted an artifact file");

  const legacyPrefixed = lines.map((line) => {
    const match = SUM_LINE.exec(line);
    return `${match[1]}  qualification-output/${match[2]}`;
  });
  assert(
    legacyPrefixed.every((line) => !SUM_LINE.test(line)),
    "legacy path-prefixed checksum unexpectedly satisfies basename-only parser grammar",
  );

  console.log(MARKER);
  console.log("workflow_checksum_cwd=qualification-output");
  console.log(`workflow_checksum_files=${EXPECTED_FILES.join(",")}`);
  console.log("publication_parser_basename_only=true");
  console.log("legacy_prefixed_entries_rejected=true");
  console.log("workflow_generated_entries_parser_compatible=true");
  console.log("repository_mutated=false");
  console.log("publication_authorized=false");
  console.log("services_changed=false");
  console.log("money_movement_authority=false");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
