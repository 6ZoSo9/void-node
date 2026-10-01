#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import {
  verifyWcVoidMarketVaultAtUseRevalidationV1,
} from "./void-wc-void-market-vault-at-use-revalidation-v1.mjs";
import {
  classifyVoidWcVoidProductionReadinessV1,
} from "./void-wc-void-production-readiness-v1.mjs";

export const VOID_WC_VOID_MARKET_VAULT_REVIEWED_RUNTIME_BRIDGE_V1 =
  "VOID_WC_VOID_MARKET_VAULT_REVIEWED_RUNTIME_BRIDGE_V1";

const MAX_INPUT_BYTES = 16 * 1024 * 1024;

function fail(code) {
  throw new Error(code);
}

function plain(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (
      Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null
    )
  );
}

function exactObject(value, keys, code) {
  if (!plain(value)) fail(code);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  return value;
}

function directInput(relativePath) {
  if (
    typeof relativePath !== "string" ||
    relativePath.length < 1 ||
    relativePath.length > 512 ||
    path.isAbsolute(relativePath)
  ) {
    fail("MARKET_VAULT_REVIEWED_RUNTIME_INPUT_PATH_INVALID");
  }
  const root = fs.realpathSync.native(process.cwd());
  const candidate = path.resolve(root, relativePath);
  const relative = path.relative(root, candidate);
  if (
    relative === "" ||
    relative === ".." ||
    relative.startsWith(".." + path.sep) ||
    path.isAbsolute(relative)
  ) {
    fail("MARKET_VAULT_REVIEWED_RUNTIME_INPUT_PATH_ESCAPE");
  }
  const stat = fs.lstatSync(candidate);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.nlink !== 1 ||
    stat.size < 2 ||
    stat.size > MAX_INPUT_BYTES
  ) {
    fail("MARKET_VAULT_REVIEWED_RUNTIME_INPUT_FILE_INVALID");
  }
  const real = fs.realpathSync.native(candidate);
  if (real !== candidate) {
    fail("MARKET_VAULT_REVIEWED_RUNTIME_INPUT_ALIAS_FORBIDDEN");
  }
  const bytes = fs.readFileSync(candidate);
  if (bytes.length !== stat.size) {
    fail("MARKET_VAULT_REVIEWED_RUNTIME_INPUT_SIZE_CHANGED");
  }
  let value;
  try {
    value = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
  } catch {
    fail("MARKET_VAULT_REVIEWED_RUNTIME_INPUT_JSON_INVALID");
  }
  return value;
}

function parseCli() {
  const args = process.argv.slice(2);
  if (
    args.length !== 4 ||
    args[0] !== "--operation" ||
    args[2] !== "--input"
  ) {
    fail(
      "usage: --operation <verify_at_use|classify_readiness> " +
      "--input <relative-input.json>",
    );
  }
  return Object.freeze({
    operation: args[1],
    input: args[3],
  });
}

const cli = parseCli();
const input = directInput(cli.input);
let result;

if (cli.operation === "verify_at_use") {
  exactObject(
    input,
    ["artifact", "evaluation_time_utc"],
    "MARKET_VAULT_REVIEWED_RUNTIME_VERIFY_INPUT_INVALID",
  );
  result = verifyWcVoidMarketVaultAtUseRevalidationV1({
    artifact: input.artifact,
    evaluation_time_utc: input.evaluation_time_utc,
  });
} else if (cli.operation === "classify_readiness") {
  exactObject(
    input,
    ["candidate"],
    "MARKET_VAULT_REVIEWED_RUNTIME_CLASSIFY_INPUT_INVALID",
  );
  result = classifyVoidWcVoidProductionReadinessV1(input.candidate);
} else {
  fail("MARKET_VAULT_REVIEWED_RUNTIME_OPERATION_INVALID");
}

const envelope = {
  marker: VOID_WC_VOID_MARKET_VAULT_REVIEWED_RUNTIME_BRIDGE_V1,
  version: 1,
  operation: cli.operation,
  result,
};

process.stdout.write(JSON.stringify(envelope) + "\n");
