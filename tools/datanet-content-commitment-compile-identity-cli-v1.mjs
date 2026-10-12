#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  buildStandardJsonInput,
} from "./datanet-content-commitment-compiler-profile-v1.mjs";
import {
  reviewDatanetContentCommitmentDualCompilerV1,
} from "./datanet-content-commitment-dual-compiler-identity-v1.mjs";

function fail(message) {
  process.stderr.write("REFUSE: " + message + "\n");
  process.exit(1);
}
function args(values) {
  const result = new Map();
  for (let i = 0; i < values.length; i += 1) {
    const key = values[i];
    if (!key.startsWith("--")) fail("unexpected_argument=" + key);
    const value = values[i + 1];
    if (value === undefined || value.startsWith("--")) fail("missing_value=" + key);
    result.set(key.slice(2), value);
    i += 1;
  }
  return result;
}
function required(map, key) {
  const value = String(map.get(key) || "").trim();
  if (!value) fail("missing_argument=--" + key);
  return value;
}
function regularFile(file) {
  const resolved = path.resolve(file);
  const stat = fs.lstatSync(resolved);
  if (!stat.isFile() || stat.isSymbolicLink()) fail("not_regular_file=" + resolved);
  return resolved;
}
function writePrivate(file, bytes) {
  const resolved = path.resolve(file);
  fs.mkdirSync(path.dirname(resolved), { recursive: true, mode: 0o700 });
  const fd = fs.openSync(
    resolved,
    fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY,
    0o600,
  );
  try {
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

const [command, ...rest] = process.argv.slice(2);
const map = args(rest);

if (command === "input") {
  const source = regularFile(required(map, "source"));
  const out = required(map, "out");
  const input = buildStandardJsonInput(fs.readFileSync(source, "utf8"));
  writePrivate(out, Buffer.from(JSON.stringify(input, null, 2) + "\n", "utf8"));
  process.stdout.write(JSON.stringify({
    ok: true,
    command: "input",
    source,
    out: path.resolve(out),
    compiler_execution: false,
    rpc_call: false,
    deployment: false,
    chain2050_write: false,
  }) + "\n");
  process.exit(0);
}

if (command === "review") {
  const source = regularFile(required(map, "source"));
  const input = regularFile(required(map, "input"));
  const outputA = regularFile(required(map, "output-a"));
  const outputB = regularFile(required(map, "output-b"));
  const environmentA = regularFile(required(map, "environment-a"));
  const environmentB = regularFile(required(map, "environment-b"));
  const out = required(map, "out");
  let envA;
  let envB;
  try {
    envA = JSON.parse(fs.readFileSync(environmentA, "utf8"));
    envB = JSON.parse(fs.readFileSync(environmentB, "utf8"));
  } catch (error) {
    fail("environment_json_invalid");
  }
  const identity = reviewDatanetContentCommitmentDualCompilerV1({
    sourceBytes: fs.readFileSync(source),
    inputBytes: fs.readFileSync(input),
    outputABytes: fs.readFileSync(outputA),
    outputBBytes: fs.readFileSync(outputB),
    environmentA: envA,
    environmentB: envB,
    sourceCommit: required(map, "source-commit"),
    sourceRef: required(map, "source-ref"),
    reviewedAt: required(map, "reviewed-at"),
  });
  writePrivate(out, Buffer.from(JSON.stringify(identity, null, 2) + "\n", "utf8"));
  process.stdout.write(JSON.stringify({
    ok: true,
    command: "review",
    identity_id: identity.identity_id,
    decision: identity.decision.status,
    source_commit: identity.source.source_commit,
    creation_bytecode_sha256: identity.artifacts.creation_bytecode_sha256,
    runtime_template_sha256: identity.artifacts.runtime_template_sha256,
    immutable_layout_sha256: identity.artifacts.immutable_layout_sha256,
    out: path.resolve(out),
    identity_committed: false,
    deployment: false,
    transaction_construction: false,
    chain2050_write: false,
  }) + "\n");
  process.exit(0);
}

fail("usage=input|review");
