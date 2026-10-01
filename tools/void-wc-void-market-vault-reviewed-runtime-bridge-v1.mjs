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
  const pathStat = fs.lstatSync(candidate);
  if (
    !pathStat.isFile() ||
    pathStat.isSymbolicLink() ||
    pathStat.nlink !== 1 ||
    pathStat.size < 2 ||
    pathStat.size > MAX_INPUT_BYTES
  ) {
    fail("MARKET_VAULT_REVIEWED_RUNTIME_INPUT_FILE_INVALID");
  }
  const real = fs.realpathSync.native(candidate);
  if (real !== candidate) {
    fail("MARKET_VAULT_REVIEWED_RUNTIME_INPUT_ALIAS_FORBIDDEN");
  }

  let fd;
  let before;
  let bytes;
  let after;
  try {
    fd = fs.openSync(
      candidate,
      fs.constants.O_RDONLY | Number(fs.constants.O_NOFOLLOW || 0),
    );
    before = fs.fstatSync(fd);
    if (
      !before.isFile() ||
      before.nlink !== 1 ||
      before.dev !== pathStat.dev ||
      before.ino !== pathStat.ino ||
      before.size !== pathStat.size
    ) {
      fail("MARKET_VAULT_REVIEWED_RUNTIME_INPUT_DESCRIPTOR_MISMATCH");
    }
    bytes = fs.readFileSync(fd);
    after = fs.fstatSync(fd);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }

  const post = fs.lstatSync(candidate);
  if (
    bytes.length !== before.size ||
    before.dev !== after.dev ||
    before.ino !== after.ino ||
    before.size !== after.size ||
    before.mtimeMs !== after.mtimeMs ||
    before.ctimeMs !== after.ctimeMs ||
    post.dev !== before.dev ||
    post.ino !== before.ino ||
    post.size !== before.size ||
    post.mtimeMs !== before.mtimeMs ||
    post.ctimeMs !== before.ctimeMs
  ) {
    fail("MARKET_VAULT_REVIEWED_RUNTIME_INPUT_CHANGED_DURING_READ");
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
let envelope;

try {
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

  envelope = {
    marker: VOID_WC_VOID_MARKET_VAULT_REVIEWED_RUNTIME_BRIDGE_V1,
    version: 1,
    operation: cli.operation,
    ok: true,
    result,
    error: null,
  };
} catch (error) {
  const message =
    error instanceof Error ? error.message : String(error);
  envelope = {
    marker: VOID_WC_VOID_MARKET_VAULT_REVIEWED_RUNTIME_BRIDGE_V1,
    version: 1,
    operation: cli.operation,
    ok: false,
    result: null,
    error: message.slice(0, 512),
  };
}

process.stdout.write(JSON.stringify(envelope) + "\n");
