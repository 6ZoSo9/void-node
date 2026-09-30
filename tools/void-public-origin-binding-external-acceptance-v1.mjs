#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import {
  VOID_NODE_PUBLIC_ORIGIN_BINDING_PATHS,
} from "./lib/void-node-public-origin-binding-v1.mjs";
import {
  VOID_PUBLIC_NODE_IDENTITY_TRUST_REGISTRY_SHA256,
  verifyReviewedVoidNodePublicOriginBindingV1,
} from "./lib/void-public-node-identity-trust-v1.mjs";

export const VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_ACCEPTANCE_V1 =
  "VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_ACCEPTANCE_V1";

export const VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_BASE_V1 =
  "https://seed.nullfeed.org";
export const VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_NODE_ID_V1 =
  "9d89483769e469e0473b489dc50dba96";
export const VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_FINGERPRINT_V1 =
  "2f52b928cb00bf309510d1edef299554277fba6d52bfd1ddb52b9b015397c50b";
export const VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_ACCOUNT_V1 =
  "void-public-origin-acceptance-v1";

const DIRECTORY_MARKER =
  "VOID_WC_PUBLIC_OPPORTUNITY_DIRECTORY_V1";
const HANDOFF_MARKER =
  "VOID_WC_PUBLIC_OPPORTUNITY_HANDOFF_V1";
const MAX_ALIAS_BYTES = 128 * 1024;
const MAX_CHILD_STDOUT_BYTES = 512 * 1024;
const MAX_CHILD_STDERR_BYTES = 128 * 1024;
const CHILD_TERMINATION_GRACE_MS = 250;

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");
const COLLECTOR_TOOL = fileURLToPath(import.meta.url);
const DIRECTORY_TOOL = resolve(
  HERE,
  "wc-public-opportunity-directory-v1.mjs",
);
const HANDOFF_TOOL = resolve(
  HERE,
  "wc-public-opportunity-handoff-v1.mjs",
);
const NO_NODE_CLIENT_TOOL = resolve(
  HERE,
  "void_public_earn_no_node_client_v1.mjs",
);
const COLLECTOR_REPO_PATH =
  "tools/void-public-origin-binding-external-acceptance-v1.mjs";
const DIRECTORY_REPO_PATH =
  "tools/wc-public-opportunity-directory-v1.mjs";
const HANDOFF_REPO_PATH =
  "tools/wc-public-opportunity-handoff-v1.mjs";

function fail(message) {
  throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

const EXTERNAL_ACCEPTANCE_RECEIPT_ID_V1 =
  /^voidpora1_[0-9a-f]{64}$/u;
const HEX64_V1 = /^[0-9a-f]{64}$/u;
const HEX40_V1 = /^[0-9a-f]{40}$/u;

function plainObjectV1(value) {
  return (
    value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype
  );
}

function exactKeysV1(value, expected, label) {
  if (!plainObjectV1(value)) {
    fail(`${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length
    || actual.some((key, index) => key !== wanted[index])
  ) {
    fail(`${label} shape mismatch`);
  }
}

function canonicalizeV1(value) {
  if (
    value === null
    || typeof value === "string"
    || typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalizeV1);
  }
  if (!plainObjectV1(value)) {
    fail("external acceptance canonical JSON value is invalid");
  }
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalizeV1(value[key])]),
  );
}

function canonicalJsonV1(value) {
  return JSON.stringify(canonicalizeV1(value));
}

function canonicalTimestampV1(value, label) {
  if (typeof value !== "string") {
    fail(`${label} timestamp is invalid`);
  }
  const parsed = new Date(value);
  if (
    !Number.isFinite(parsed.getTime())
    || parsed.toISOString() !== value
  ) {
    fail(`${label} timestamp is invalid`);
  }
  return parsed.getTime();
}

function gitV1(args) {
  return execFileSync(
    "git",
    args,
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        PATH: "/usr/bin:/bin",
      },
    },
  ).trim();
}

function gitBytesV1(args) {
  return execFileSync(
    "git",
    args,
    {
      cwd: REPO_ROOT,
      encoding: null,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        PATH: "/usr/bin:/bin",
      },
      maxBuffer: 8 * 1024 * 1024,
    },
  );
}

function gitSucceedsV1(args) {
  try {
    execFileSync(
      "git",
      args,
      {
        cwd: REPO_ROOT,
        stdio: ["ignore", "ignore", "ignore"],
        env: {
          PATH: "/usr/bin:/bin",
        },
      },
    );
    return true;
  } catch {
    return false;
  }
}

function regularSourceSha256V1(file, label) {
  const stat = fs.lstatSync(file);
  if (
    stat.isSymbolicLink()
    || !stat.isFile()
    || fs.realpathSync.native(file) !== file
    || stat.size < 1
    || stat.size > 4 * 1024 * 1024
  ) {
    fail(`${label} source file is invalid`);
  }
  return sha256(fs.readFileSync(file));
}

function liveCollectorProvenanceV1() {
  if (gitV1(["branch", "--show-current"]) !== "main") {
    fail("external acceptance collector requires main branch");
  }
  if (
    gitV1([
      "status",
      "--porcelain=v1",
      "--untracked-files=all",
    ]) !== ""
  ) {
    fail("external acceptance collector requires clean worktree");
  }
  const repositoryHead = gitV1(["rev-parse", "HEAD"]);
  if (!/^[0-9a-f]{40}$/u.test(repositoryHead)) {
    fail("external acceptance repository head is invalid");
  }
  return Object.freeze({
    repository_head: repositoryHead,
    clean_main: true,
    collector_sha256:
      regularSourceSha256V1(COLLECTOR_TOOL, "collector"),
    directory_tool_sha256:
      regularSourceSha256V1(DIRECTORY_TOOL, "directory"),
    handoff_tool_sha256:
      regularSourceSha256V1(HANDOFF_TOOL, "handoff"),
  });
}

export function verifyVoidPublicOriginBindingExternalAcceptanceSourceV1(
  source,
  {
    requireMainAncestor = true,
  } = {},
) {
  exactKeysV1(
    source,
    [
      "repository_head",
      "clean_main",
      "collector_sha256",
      "directory_tool_sha256",
      "handoff_tool_sha256",
    ],
    "external acceptance source",
  );
  if (
    source.clean_main !== true
    || !HEX40_V1.test(source.repository_head)
    || !HEX64_V1.test(source.collector_sha256)
    || !HEX64_V1.test(source.directory_tool_sha256)
    || !HEX64_V1.test(source.handoff_tool_sha256)
  ) {
    fail("external acceptance source contract invalid");
  }
  if (
    !gitSucceedsV1([
      "cat-file",
      "-e",
      `${source.repository_head}^{commit}`,
    ])
  ) {
    fail("external acceptance source commit unavailable");
  }
  if (
    requireMainAncestor
    && !gitSucceedsV1([
      "merge-base",
      "--is-ancestor",
      source.repository_head,
      "main",
    ])
  ) {
    fail("external acceptance source commit is not on main");
  }
  const expected = {
    collector_sha256: sha256(
      gitBytesV1([
        "show",
        `${source.repository_head}:${COLLECTOR_REPO_PATH}`,
      ]),
    ),
    directory_tool_sha256: sha256(
      gitBytesV1([
        "show",
        `${source.repository_head}:${DIRECTORY_REPO_PATH}`,
      ]),
    ),
    handoff_tool_sha256: sha256(
      gitBytesV1([
        "show",
        `${source.repository_head}:${HANDOFF_REPO_PATH}`,
      ]),
    ),
  };
  for (const [key, value] of Object.entries(expected)) {
    if (source[key] !== value) {
      fail(`external acceptance source hash mismatch: ${key}`);
    }
  }
  return Object.freeze({
    repository_head: source.repository_head,
    clean_main: true,
    ...expected,
  });
}

function assertCollectorProvenanceStableV1(expected) {
  const observed = liveCollectorProvenanceV1();
  for (const key of [
    "repository_head",
    "clean_main",
    "collector_sha256",
    "directory_tool_sha256",
    "handoff_tool_sha256",
  ]) {
    if (observed[key] !== expected[key]) {
      fail("external acceptance source generation changed during collection");
    }
  }
}

function canonicalInteger(raw, label, minimum, maximum) {
  if (
    typeof raw !== "string"
    || !/^(?:0|[1-9][0-9]*)$/u.test(raw)
  ) {
    fail(
      `${label} must be a canonical decimal integer from ${minimum} to ${maximum}`,
    );
  }
  const value = Number(raw);
  if (
    !Number.isSafeInteger(value)
    || value < minimum
    || value > maximum
  ) {
    fail(
      `${label} must be a canonical decimal integer from ${minimum} to ${maximum}`,
    );
  }
  return value;
}

function strictUtf8Json(bytes, label) {
  let text;
  try {
    text = new TextDecoder(
      "utf-8",
      { fatal: true },
    ).decode(bytes);
  } catch {
    fail(`${label} returned invalid UTF-8`);
  }
  try {
    return JSON.parse(text);
  } catch {
    fail(`${label} returned invalid JSON`);
  }
}

function canonicalOutputPath(file) {
  if (
    typeof file !== "string"
    || !path.isAbsolute(file)
    || path.resolve(file) !== file
  ) {
    fail("output path must be an absolute canonical path");
  }
  const parent = path.dirname(file);
  let realParent;
  try {
    realParent = fs.realpathSync.native(parent);
  } catch (error) {
    fail(
      `output parent could not be canonicalized: ${error.message}`,
    );
  }
  if (realParent !== parent) {
    fail(
      "output parent must not traverse symlinks or path aliases",
    );
  }
  try {
    fs.lstatSync(file);
    fail("refusing to overwrite existing output");
  } catch (error) {
    if (
      error?.message
        === "refusing to overwrite existing output"
    ) {
      throw error;
    }
    if (error?.code !== "ENOENT") throw error;
  }
  return file;
}

export function readVoidPublicOriginBindingExternalAcceptanceReceiptFileV1(
  rawFile,
  {
    requireMainAncestor = true,
  } = {},
) {
  if (
    typeof rawFile !== "string"
    || !path.isAbsolute(rawFile)
    || path.resolve(rawFile) !== rawFile
  ) {
    fail("receipt input path must be an absolute canonical path");
  }
  const stat = fs.lstatSync(rawFile);
  if (
    stat.isSymbolicLink()
    || !stat.isFile()
    || fs.realpathSync.native(rawFile) !== rawFile
    || stat.size < 2
    || stat.size > 512 * 1024
  ) {
    fail("receipt input file is invalid");
  }
  const value = strictUtf8Json(
    fs.readFileSync(rawFile),
    "external acceptance receipt",
  );
  const receipt =
    validateVoidPublicOriginBindingExternalAcceptanceReceiptV1(
      value,
    );
  const verifiedSource =
    verifyVoidPublicOriginBindingExternalAcceptanceSourceV1(
      receipt.source,
      {
        requireMainAncestor,
      },
    );
  if (
    canonicalJsonV1(verifiedSource)
      !== canonicalJsonV1(receipt.source)
  ) {
    fail("external acceptance source provenance mismatch");
  }
  return receipt;
}

function writePrivateJson(file, value) {
  const fd = fs.openSync(
    file,
    fs.constants.O_WRONLY
      | fs.constants.O_CREAT
      | fs.constants.O_EXCL
      | Number(fs.constants.O_NOFOLLOW || 0),
    0o600,
  );
  try {
    const bytes = Buffer.from(
      JSON.stringify(value, null, 2) + "\n",
      "utf8",
    );
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
    fs.fchmodSync(fd, 0o600);
    return Object.freeze({
      bytes,
      sha256: sha256(bytes),
    });
  } finally {
    fs.closeSync(fd);
  }
}

function childWallClockMs(requestTimeoutMs, multiplier) {
  return Math.min(
    (requestTimeoutMs * multiplier) + 5_000,
    120_000,
  );
}

function runJsonChildV1({
  tool,
  args,
  requestTimeoutMs,
  wallMultiplier,
}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(
      process.execPath,
      [tool, ...args],
      {
        cwd: REPO_ROOT,
        stdio: ["ignore", "pipe", "pipe"],
        env: {},
      },
    );
    const stdoutChunks = [];
    const stderrChunks = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let terminalReason = null;
    let settled = false;
    let killTimer = null;

    const wallTimer = setTimeout(
      () => beginTermination("child_total_deadline_exceeded"),
      childWallClockMs(
        requestTimeoutMs,
        wallMultiplier,
      ),
    );
    wallTimer.unref?.();

    function bounded(chunk) {
      return Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk);
    }

    function cleanup() {
      clearTimeout(wallTimer);
      if (killTimer) clearTimeout(killTimer);
      child.stdout?.off("data", onStdout);
      child.stderr?.off("data", onStderr);
      child.off("error", onError);
      child.off("close", onClose);
    }

    function settleError(message) {
      if (settled) return;
      settled = true;
      cleanup();
      rejectRun(new Error(message));
    }

    function beginTermination(reason) {
      if (terminalReason !== null) return;
      terminalReason = reason;
      try {
        child.kill("SIGTERM");
      } catch (error) {
        void error;
      }
      killTimer = setTimeout(() => {
        try {
          child.kill("SIGKILL");
        } catch (error) {
          void error;
        }
      }, CHILD_TERMINATION_GRACE_MS);
      killTimer.unref?.();
    }

    function onStdout(chunk) {
      const value = bounded(chunk);
      stdoutBytes += value.length;
      if (stdoutBytes > MAX_CHILD_STDOUT_BYTES) {
        beginTermination("child_stdout_above_bound");
        return;
      }
      stdoutChunks.push(value);
    }

    function onStderr(chunk) {
      const value = bounded(chunk);
      stderrBytes += value.length;
      if (stderrBytes > MAX_CHILD_STDERR_BYTES) {
        beginTermination("child_stderr_above_bound");
        return;
      }
      stderrChunks.push(value);
    }

    function onError(error) {
      settleError(
        `child process error: ${error.message}`,
      );
    }

    function onClose(code, signal) {
      if (settled) return;
      if (terminalReason !== null) {
        settleError(terminalReason);
        return;
      }
      if (code !== 0) {
        const stderr = Buffer.concat(
          stderrChunks,
          stderrBytes,
        ).toString("utf8").trim();
        settleError(
          `child exited ${code ?? "null"}`
            + (signal ? ` signal=${signal}` : "")
            + (stderr
              ? `: ${stderr.slice(0, 4096)}`
              : ""),
        );
        return;
      }
      let value;
      try {
        value = JSON.parse(
          Buffer.concat(
            stdoutChunks,
            stdoutBytes,
          ).toString("utf8"),
        );
      } catch {
        settleError("child returned invalid JSON");
        return;
      }
      settled = true;
      cleanup();
      resolveRun(value);
    }

    child.stdout?.on("data", onStdout);
    child.stderr?.on("data", onStderr);
    child.on("error", onError);
    child.on("close", onClose);
  });
}

function fetchAliasV1(
  pathname,
  {
    inactivityTimeoutMs,
    totalTimeoutMs,
  },
) {
  return new Promise((resolveFetch, rejectFetch) => {
    const url = new URL(
      pathname,
      VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_BASE_V1,
    );
    let settled = false;
    let response = null;

    const totalTimer = setTimeout(() => {
      terminateAliasV1(
        new Error("alias_total_deadline_exceeded"),
      );
    }, totalTimeoutMs);

    function settle(error, value) {
      if (settled) return;
      settled = true;
      clearTimeout(totalTimer);
      if (error) rejectFetch(error);
      else resolveFetch(value);
    }

    function terminateAliasV1(error) {
      try {
        response?.destroy(error);
      } catch (cleanupError) {
        void cleanupError;
      }
      try {
        request.destroy(error);
      } catch (cleanupError) {
        void cleanupError;
      }
      settle(error);
    }

    const request = https.request(
      url,
      {
        method: "GET",
        headers: {
          accept: "application/json",
          "user-agent":
            "void-public-origin-binding-external-acceptance-v1",
        },
      },
      (incoming) => {
        response = incoming;

        incoming.setTimeout(
          inactivityTimeoutMs,
          () => terminateAliasV1(
            new Error(
              "alias_response_inactivity_timeout",
            ),
          ),
        );

        const status = Number(
          incoming.statusCode || 0,
        );
        const declared = String(
          incoming.headers["content-length"] || "",
        ).trim();

        if (
          status >= 300
          && status < 400
        ) {
          terminateAliasV1(
            new Error(
              "alias_redirect_not_allowed",
            ),
          );
          return;
        }
        if (status !== 200) {
          terminateAliasV1(
            new Error(
              `alias_http_status_${status}`,
            ),
          );
          return;
        }
        if (declared) {
          if (!/^\d+$/u.test(declared)) {
            terminateAliasV1(
              new Error(
                "alias_content_length_invalid",
              ),
            );
            return;
          }
          if (
            BigInt(declared)
              > BigInt(MAX_ALIAS_BYTES)
          ) {
            terminateAliasV1(
              new Error(
                "alias_response_above_bound",
              ),
            );
            return;
          }
        }

        const chunks = [];
        let bytes = 0;

        incoming.on("data", (chunk) => {
          const value = Buffer.isBuffer(chunk)
            ? chunk
            : Buffer.from(chunk);
          bytes += value.length;
          if (bytes > MAX_ALIAS_BYTES) {
            terminateAliasV1(
              new Error(
                "alias_response_above_bound",
              ),
            );
            return;
          }
          chunks.push(value);
        });
        incoming.on("aborted", () => {
          settle(
            new Error(
              "alias_response_aborted",
            ),
          );
        });
        incoming.on("error", (error) => {
          settle(error);
        });
        incoming.on("end", () => {
          if (!incoming.complete) {
            settle(
              new Error(
                "alias_response_incomplete",
              ),
            );
            return;
          }
          if (
            declared
            && Number(declared) !== bytes
          ) {
            settle(
              new Error(
                "alias_content_length_mismatch",
              ),
            );
            return;
          }
          const body = Buffer.concat(
            chunks,
            bytes,
          );
          settle(null, Object.freeze({
            path: pathname,
            url: url.href,
            http_status: status,
            body,
            bytes: body.length,
            artifact_sha256: sha256(body),
          }));
        });
      },
    );

    request.setTimeout(
      inactivityTimeoutMs,
      () => terminateAliasV1(
        new Error(
          "alias_request_inactivity_timeout",
        ),
      ),
    );
    request.on("error", (error) => {
      settle(error);
    });
    request.end();
  });
}

function validateDirectoryV1(directory) {
  if (
    !directory
    || typeof directory !== "object"
    || Array.isArray(directory)
  ) {
    fail("directory result must be an object");
  }
  if (
    directory.marker !== DIRECTORY_MARKER
    || directory.status !== "green"
    || directory.directory_state !== "available"
  ) {
    fail("directory result is not available/green");
  }
  if (
    directory.summary?.total !== 1
    || directory.summary?.available !== 1
    || directory.summary?.invalid_result !== 0
  ) {
    fail("directory summary is not exactly one trusted available origin");
  }
  if (
    !Array.isArray(directory.results)
    || directory.results.length !== 1
  ) {
    fail("directory results must contain exactly one origin");
  }
  const result = directory.results[0];
  if (
    result?.base
      !== VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_BASE_V1
    || result?.state !== "available"
    || result?.trusted !== true
    || result?.pilot?.coordinator_enabled !== true
    || result?.pilot?.fixed_award_wc !== 3
    || result?.pilot?.fixed_award_matches !== true
    || result?.public_claim?.configured !== true
    || result?.public_claim?.enabled !== true
    || result?.safety?.read_only !== true
    || result?.safety?.get_only !== true
    || result?.safety?.mutation_attempted !== false
  ) {
    fail("directory available entry contract failed");
  }
  const safety = directory.safety || {};
  if (
    safety.read_only !== true
    || safety.child_results_safety_validated !== true
    || safety.mutation_attempted !== false
    || safety.ticket_issuance_attempted !== false
    || safety.receipt_submission_attempted !== false
    || safety.wc_award_attempted !== false
    || safety.wallet_access_attempted !== false
    || safety.settlement_attempted !== false
  ) {
    fail("directory safety contract failed");
  }
  return result;
}

function shellQuoteV1(value) {
  return /^[A-Za-z0-9_./:@%+=,-]+$/u.test(value) ? value : `'${value.replaceAll("'", `'\"'\"'`)}'`;
}

function validateHandoffCommandV1(command, kind) {
  if (
    !command
    || typeof command !== "object"
    || Array.isArray(command)
    || !Array.isArray(command.argv)
  ) {
    fail("handoff command contract failed");
  }
  const expected = [
    "node",
    NO_NODE_CLIENT_TOOL,
    kind,
    "--account",
    VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_ACCOUNT_V1,
    "--coordinator-base",
    VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_BASE_V1,
    "--coordinator-node-id",
    VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_NODE_ID_V1,
  ];
  const expectedShell = expected
    .map(shellQuoteV1)
    .join(" ");
  if (
    command.argv.length !== expected.length
    || command.argv.some(
      (value, index) => value !== expected[index],
    )
    || command.shell !== expectedShell
  ) {
    fail("handoff command contract failed");
  }
}

function validateHandoffV1(
  handoff,
  expectedBindingSha256,
  expectedTrustRegistrySha256,
  expectedFingerprint,
) {
  if (
    !handoff
    || typeof handoff !== "object"
    || Array.isArray(handoff)
  ) {
    fail("handoff result must be an object");
  }
  if (
    handoff.marker !== HANDOFF_MARKER
    || handoff.status !== "green"
    || handoff.handoff_state !== "ready"
  ) {
    fail("handoff result is not green/ready");
  }
  if (
    handoff.account
      !== VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_ACCOUNT_V1
    || handoff.selected?.base
      !== VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_BASE_V1
    || handoff.selected?.fixed_award_wc !== 3
  ) {
    fail("handoff selected coordinator contract failed");
  }

  const identity = handoff.coordinator_identity || {};
  if (
    identity.node_id
      !== VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_NODE_ID_V1
    || identity.trust_mode
      !== "signed_public_origin_binding"
    || identity.public_copy_ready !== true
    || identity.trust_registry_sha256
      !== expectedTrustRegistrySha256
    || identity.trusted_public_key_fingerprint_sha256
      !== expectedFingerprint
    || identity.binding?.path
      !== VOID_NODE_PUBLIC_ORIGIN_BINDING_PATHS[0]
    || identity.binding?.http_status !== 200
    || identity.binding?.binding_sha256
      !== expectedBindingSha256
    || identity.binding?.public_key_fingerprint_sha256
      !== expectedFingerprint
  ) {
    fail("handoff signed public-origin identity contract failed");
  }

  const safety = handoff.safety || {};
  if (
    safety.read_only !== true
    || safety.cryptographic_public_origin_binding_verified !== true
    || safety.public_copy_ready !== true
    || safety.directory_marker_validated !== true
    || safety.directory_safety_validated !== true
    || safety.selected_child_safety_validated !== true
    || safety.client_executed !== false
    || safety.identity_created !== false
    || safety.mutation_attempted !== false
    || safety.ticket_issuance_attempted !== false
    || safety.receipt_submission_attempted !== false
    || safety.wc_award_attempted !== false
    || safety.wallet_access_attempted !== false
    || safety.settlement_attempted !== false
  ) {
    fail("handoff safety contract failed");
  }

  validateHandoffCommandV1(
    handoff.commands?.status,
    "status",
  );
  validateHandoffCommandV1(
    handoff.commands?.run,
    "run",
  );

  return identity;
}

export function buildVoidPublicOriginBindingExternalAcceptanceV1({
  aliasResults,
  directory,
  handoff,
  sourceProvenance,
  nowMs = Date.now(),
  verifyBinding =
    verifyReviewedVoidNodePublicOriginBindingV1,
  expectedFingerprint =
    VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_FINGERPRINT_V1,
  expectedTrustRegistrySha256 =
    VOID_PUBLIC_NODE_IDENTITY_TRUST_REGISTRY_SHA256,
} = {}) {
  if (
    !Array.isArray(aliasResults)
    || aliasResults.length
      !== VOID_NODE_PUBLIC_ORIGIN_BINDING_PATHS.length
  ) {
    fail("both canonical binding aliases are required");
  }
  if (!Number.isFinite(nowMs)) {
    fail("verification time is invalid");
  }
  if (typeof verifyBinding !== "function") {
    fail("binding verifier is unavailable");
  }
  if (
    typeof expectedFingerprint !== "string"
    || !/^[0-9a-f]{64}$/u.test(expectedFingerprint)
  ) {
    fail("expected fingerprint is invalid");
  }
  if (
    typeof expectedTrustRegistrySha256 !== "string"
    || !/^[0-9a-f]{64}$/u.test(
      expectedTrustRegistrySha256,
    )
  ) {
    fail("expected trust-registry SHA-256 is invalid");
  }

  if (
    !sourceProvenance
    || typeof sourceProvenance !== "object"
    || Array.isArray(sourceProvenance)
    || sourceProvenance.clean_main !== true
    || typeof sourceProvenance.repository_head !== "string"
    || !/^[0-9a-f]{40}$/u.test(sourceProvenance.repository_head)
    || typeof sourceProvenance.collector_sha256 !== "string"
    || !/^[0-9a-f]{64}$/u.test(sourceProvenance.collector_sha256)
    || typeof sourceProvenance.directory_tool_sha256 !== "string"
    || !/^[0-9a-f]{64}$/u.test(sourceProvenance.directory_tool_sha256)
    || typeof sourceProvenance.handoff_tool_sha256 !== "string"
    || !/^[0-9a-f]{64}$/u.test(sourceProvenance.handoff_tool_sha256)
  ) {
    fail("collector source provenance is invalid");
  }

  const verifiedAliases = aliasResults.map(
    (result, index) => {
      const expectedPath =
        VOID_NODE_PUBLIC_ORIGIN_BINDING_PATHS[index];
      const expectedUrl = new URL(
        expectedPath,
        VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_BASE_V1,
      ).href;
      if (
        result?.path !== expectedPath
        || result?.url !== expectedUrl
        || result?.http_status !== 200
        || !Buffer.isBuffer(result?.body)
        || result.body.length < 2
        || result.body.length > MAX_ALIAS_BYTES
      ) {
        fail("external binding alias transport contract failed");
      }
      const value = strictUtf8Json(
        result.body,
        `binding alias ${expectedPath}`,
      );
      const verified = verifyBinding(
        value,
        {
          expectedOrigin:
            VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_BASE_V1,
          expectedNodeId:
            VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_NODE_ID_V1,
          nowMs,
        },
      );
      if (
        verified?.origin
          !== VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_BASE_V1
        || verified?.node_id
          !== VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_NODE_ID_V1
        || verified?.public_key_fingerprint_sha256
          !== expectedFingerprint
        || verified?.trust_registry_sha256
          !== expectedTrustRegistrySha256
        || typeof verified?.binding_sha256 !== "string"
        || !/^[0-9a-f]{64}$/u.test(
          verified.binding_sha256,
        )
      ) {
        fail("external binding alias identity verification failed");
      }
      return Object.freeze({
        path: expectedPath,
        url: expectedUrl,
        http_status: 200,
        bytes: result.body.length,
        artifact_sha256: sha256(result.body),
        binding_sha256: verified.binding_sha256,
        issued_at: verified.issued_at,
        expires_at: verified.expires_at,
        public_key_fingerprint_sha256:
          verified.public_key_fingerprint_sha256,
        trust_registry_sha256:
          verified.trust_registry_sha256 || null,
      });
    },
  );

  if (
    !aliasResults[0].body.equals(
      aliasResults[1].body,
    )
  ) {
    fail("external binding aliases are not byte-identical");
  }
  if (
    verifiedAliases[0].binding_sha256
      !== verifiedAliases[1].binding_sha256
  ) {
    fail("external binding aliases do not identify one binding");
  }

  const directoryEntry =
    validateDirectoryV1(directory);
  const identity = validateHandoffV1(
    handoff,
    verifiedAliases[0].binding_sha256,
    expectedTrustRegistrySha256,
    expectedFingerprint,
  );

  const material={
    marker:
      VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_ACCEPTANCE_V1,
    version: 1,
    status: "green",
    external_acceptance: true,
    collected_at: new Date(nowMs).toISOString(),
    source: Object.freeze({
      repository_head: sourceProvenance.repository_head,
      clean_main: true,
      collector_sha256: sourceProvenance.collector_sha256,
      directory_tool_sha256:
        sourceProvenance.directory_tool_sha256,
      handoff_tool_sha256:
        sourceProvenance.handoff_tool_sha256,
    }),
    coordinator: Object.freeze({
      base:
        VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_BASE_V1,
      node_id:
        VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_NODE_ID_V1,
      public_key_fingerprint_sha256:
        expectedFingerprint,
      trust_registry_sha256:
        expectedTrustRegistrySha256,
    }),
    binding: Object.freeze({
      artifact_sha256:
        verifiedAliases[0].artifact_sha256,
      binding_sha256:
        verifiedAliases[0].binding_sha256,
      issued_at: verifiedAliases[0].issued_at,
      expires_at: verifiedAliases[0].expires_at,
      aliases: Object.freeze(
        verifiedAliases.map((entry) =>
          Object.freeze({ ...entry }),
        ),
      ),
      byte_identical_aliases: true,
    }),
    directory: Object.freeze({
      marker: directory.marker,
      state: directory.directory_state,
      total: directory.summary.total,
      available: directory.summary.available,
      base: directoryEntry.base,
      trusted: directoryEntry.trusted,
      fixed_award_wc:
        directoryEntry.pilot.fixed_award_wc,
    }),
    handoff: Object.freeze({
      marker: handoff.marker,
      state: handoff.handoff_state,
      account: handoff.account,
      public_copy_ready: true,
      trust_mode: identity.trust_mode,
      trust_registry_sha256:
        identity.trust_registry_sha256,
      binding_sha256:
        identity.binding.binding_sha256,
      health_node_id: identity.node_id,
    }),
    safety: Object.freeze({
      read_only: true,
      https_get_only: true,
      directory_executed: true,
      handoff_executed: true,
      no_node_client_executed: true,
      mutation_attempted: false,
      ticket_issuance_attempted: false,
      receipt_submission_attempted: false,
      wc_award_attempted: false,
      wallet_access_attempted: false,
      settlement_attempted: false,
      private_key_access: false,
      signature_creation: false,
      systemd_mutation: false,
      service_restart: false,
      transaction_submission: false,
      validator_mutation: false,
      funds_movement: false,
    }),
  };
  const receipt=Object.freeze({
    ...material,
    receipt_id:
      "voidpora1_"+
      sha256(Buffer.from(canonicalJsonV1(material),"utf8")),
  });
  return validateVoidPublicOriginBindingExternalAcceptanceReceiptV1(
    receipt,
    {
      expectedSourceProvenance: sourceProvenance,
    },
  );
}


export function validateVoidPublicOriginBindingExternalAcceptanceReceiptV1(
  receipt,
  {
    expectedSourceProvenance = null,
  } = {},
) {
  exactKeysV1(
    receipt,
    [
      "marker",
      "version",
      "status",
      "external_acceptance",
      "collected_at",
      "source",
      "coordinator",
      "binding",
      "directory",
      "handoff",
      "safety",
      "receipt_id",
    ],
    "external acceptance receipt",
  );
  if (
    receipt.marker !==
      VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_ACCEPTANCE_V1
    || receipt.version !== 1
    || receipt.status !== "green"
    || receipt.external_acceptance !== true
    || !EXTERNAL_ACCEPTANCE_RECEIPT_ID_V1.test(
      String(receipt.receipt_id || ""),
    )
  ) {
    fail("external acceptance receipt contract invalid");
  }

  const collectedMs = canonicalTimestampV1(
    receipt.collected_at,
    "collected_at",
  );

  exactKeysV1(
    receipt.source,
    [
      "repository_head",
      "clean_main",
      "collector_sha256",
      "directory_tool_sha256",
      "handoff_tool_sha256",
    ],
    "external acceptance source",
  );
  if (
    receipt.source.clean_main !== true
    || !HEX40_V1.test(receipt.source.repository_head)
    || !HEX64_V1.test(receipt.source.collector_sha256)
    || !HEX64_V1.test(receipt.source.directory_tool_sha256)
    || !HEX64_V1.test(receipt.source.handoff_tool_sha256)
  ) {
    fail("external acceptance source contract invalid");
  }
  if (
    expectedSourceProvenance !== null
    && canonicalJsonV1(receipt.source)
      !== canonicalJsonV1(expectedSourceProvenance)
  ) {
    fail("external acceptance source provenance mismatch");
  }

  exactKeysV1(
    receipt.coordinator,
    [
      "base",
      "node_id",
      "public_key_fingerprint_sha256",
      "trust_registry_sha256",
    ],
    "external acceptance coordinator",
  );
  if (
    receipt.coordinator.base !==
      VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_BASE_V1
    || receipt.coordinator.node_id !==
      VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_NODE_ID_V1
    || receipt.coordinator.public_key_fingerprint_sha256 !==
      VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_FINGERPRINT_V1
    || receipt.coordinator.trust_registry_sha256 !==
      VOID_PUBLIC_NODE_IDENTITY_TRUST_REGISTRY_SHA256
  ) {
    fail("external acceptance coordinator contract invalid");
  }

  exactKeysV1(
    receipt.binding,
    [
      "artifact_sha256",
      "binding_sha256",
      "issued_at",
      "expires_at",
      "aliases",
      "byte_identical_aliases",
    ],
    "external acceptance binding",
  );
  if (
    !HEX64_V1.test(receipt.binding.artifact_sha256)
    || !HEX64_V1.test(receipt.binding.binding_sha256)
    || receipt.binding.byte_identical_aliases !== true
    || !Array.isArray(receipt.binding.aliases)
    || receipt.binding.aliases.length !==
      VOID_NODE_PUBLIC_ORIGIN_BINDING_PATHS.length
  ) {
    fail("external acceptance binding contract invalid");
  }
  const issuedMs = canonicalTimestampV1(
    receipt.binding.issued_at,
    "binding issued_at",
  );
  const expiresMs = canonicalTimestampV1(
    receipt.binding.expires_at,
    "binding expires_at",
  );
  if (
    expiresMs <= issuedMs
    || collectedMs < issuedMs
    || collectedMs >= expiresMs
  ) {
    fail("external acceptance binding time contract invalid");
  }

  for (
    let index = 0;
    index < VOID_NODE_PUBLIC_ORIGIN_BINDING_PATHS.length;
    index += 1
  ) {
    const alias = receipt.binding.aliases[index];
    const expectedPath =
      VOID_NODE_PUBLIC_ORIGIN_BINDING_PATHS[index];
    const expectedUrl = new URL(
      expectedPath,
      VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_BASE_V1,
    ).href;
    exactKeysV1(
      alias,
      [
        "path",
        "url",
        "http_status",
        "bytes",
        "artifact_sha256",
        "binding_sha256",
        "issued_at",
        "expires_at",
        "public_key_fingerprint_sha256",
        "trust_registry_sha256",
      ],
      `external acceptance binding alias ${index}`,
    );
    if (
      alias.path !== expectedPath
      || alias.url !== expectedUrl
      || alias.http_status !== 200
      || !Number.isSafeInteger(alias.bytes)
      || alias.bytes < 2
      || alias.bytes > MAX_ALIAS_BYTES
      || alias.artifact_sha256 !==
        receipt.binding.artifact_sha256
      || alias.binding_sha256 !==
        receipt.binding.binding_sha256
      || alias.issued_at !== receipt.binding.issued_at
      || alias.expires_at !== receipt.binding.expires_at
      || alias.public_key_fingerprint_sha256 !==
        VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_FINGERPRINT_V1
      || alias.trust_registry_sha256 !==
        VOID_PUBLIC_NODE_IDENTITY_TRUST_REGISTRY_SHA256
    ) {
      fail("external acceptance binding alias contract invalid");
    }
  }

  exactKeysV1(
    receipt.directory,
    [
      "marker",
      "state",
      "total",
      "available",
      "base",
      "trusted",
      "fixed_award_wc",
    ],
    "external acceptance directory",
  );
  if (
    receipt.directory.marker !== DIRECTORY_MARKER
    || receipt.directory.state !== "available"
    || receipt.directory.total !== 1
    || receipt.directory.available !== 1
    || receipt.directory.base !==
      VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_BASE_V1
    || receipt.directory.trusted !== true
    || receipt.directory.fixed_award_wc !== 3
  ) {
    fail("external acceptance directory contract invalid");
  }

  exactKeysV1(
    receipt.handoff,
    [
      "marker",
      "state",
      "account",
      "public_copy_ready",
      "trust_mode",
      "trust_registry_sha256",
      "binding_sha256",
      "health_node_id",
    ],
    "external acceptance handoff",
  );
  if (
    receipt.handoff.marker !== HANDOFF_MARKER
    || receipt.handoff.state !== "ready"
    || receipt.handoff.account !==
      VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_ACCOUNT_V1
    || receipt.handoff.public_copy_ready !== true
    || receipt.handoff.trust_mode !==
      "signed_public_origin_binding"
    || receipt.handoff.trust_registry_sha256 !==
      VOID_PUBLIC_NODE_IDENTITY_TRUST_REGISTRY_SHA256
    || receipt.handoff.binding_sha256 !==
      receipt.binding.binding_sha256
    || receipt.handoff.health_node_id !==
      VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_NODE_ID_V1
  ) {
    fail("external acceptance handoff contract invalid");
  }

  const expectedSafety = Object.freeze({
    read_only: true,
    https_get_only: true,
    directory_executed: true,
    handoff_executed: true,
    no_node_client_executed: true,
    mutation_attempted: false,
    ticket_issuance_attempted: false,
    receipt_submission_attempted: false,
    wc_award_attempted: false,
    wallet_access_attempted: false,
    settlement_attempted: false,
    private_key_access: false,
    signature_creation: false,
    systemd_mutation: false,
    service_restart: false,
    transaction_submission: false,
    validator_mutation: false,
    funds_movement: false,
  });
  exactKeysV1(
    receipt.safety,
    Object.keys(expectedSafety),
    "external acceptance safety",
  );
  for (const [key, expected] of Object.entries(expectedSafety)) {
    if (receipt.safety[key] !== expected) {
      fail(`external acceptance safety mismatch: ${key}`);
    }
  }

  const material = structuredClone(receipt);
  const receiptId = material.receipt_id;
  delete material.receipt_id;
  const expectedReceiptId =
    "voidpora1_"+
    sha256(
      Buffer.from(
        canonicalJsonV1(material),
        "utf8",
      ),
    );
  if (
    receiptId !== expectedReceiptId
    || !EXTERNAL_ACCEPTANCE_RECEIPT_ID_V1.test(
      expectedReceiptId,
    )
  ) {
    fail("external acceptance receipt ID mismatch");
  }

  return Object.freeze(structuredClone(receipt));
}


async function collectLiveV1({
  requestTimeoutMs,
  aliasInactivityTimeoutMs,
  aliasTotalTimeoutMs,
}) {
  const sourceProvenance = liveCollectorProvenanceV1();
  const aliasResults = await Promise.all(
    VOID_NODE_PUBLIC_ORIGIN_BINDING_PATHS.map(
      (pathname) => fetchAliasV1(
        pathname,
        {
          inactivityTimeoutMs:
            aliasInactivityTimeoutMs,
          totalTimeoutMs:
            aliasTotalTimeoutMs,
        },
      ),
    ),
  );

  const directory = await runJsonChildV1({
    tool: DIRECTORY_TOOL,
    args: [
      "--base",
      VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_BASE_V1,
      "--concurrency",
      "1",
      "--timeout-ms",
      String(requestTimeoutMs),
      "--expected-award-wc",
      "3",
      "--require-available",
    ],
    requestTimeoutMs,
    wallMultiplier: 12,
  });

  const work = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      "void-public-origin-external-acceptance-v1-",
    ),
  );
  fs.chmodSync(work, 0o700);
  try {
    const directoryFile = path.join(
      work,
      "directory.json",
    );
    fs.writeFileSync(
      directoryFile,
      JSON.stringify(directory, null, 2) + "\n",
      { mode: 0o600 },
    );

    const handoff = await runJsonChildV1({
      tool: HANDOFF_TOOL,
      args: [
        "--directory-json",
        directoryFile,
        "--account",
        VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_ACCOUNT_V1,
        "--select-base",
        VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_BASE_V1,
        "--health-timeout-ms",
        String(requestTimeoutMs),
      ],
      requestTimeoutMs,
      wallMultiplier: 4,
    });

    assertCollectorProvenanceStableV1(
      sourceProvenance,
    );
    return buildVoidPublicOriginBindingExternalAcceptanceV1({
      aliasResults,
      directory,
      handoff,
      sourceProvenance,
      nowMs: Date.now(),
    });
  } finally {
    fs.rmSync(
      work,
      { recursive: true, force: true },
    );
  }
}

function parseCli(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      output: { type: "string" },
      input: { type: "string" },
      "request-timeout-ms": {
        type: "string",
        default: "5000",
      },
      "alias-inactivity-timeout-ms": {
        type: "string",
        default: "5000",
      },
      "alias-total-timeout-ms": {
        type: "string",
        default: "15000",
      },
      help: {
        type: "boolean",
        short: "h",
        default: false,
      },
    },
    allowPositionals: true,
    strict: true,
  });
  return {
    command: positionals[0] || "",
    values,
  };
}

function usage() {
  console.log(
    "usage: node tools/void-public-origin-binding-external-acceptance-v1.mjs "
      + "collect --output /absolute/evidence.json "
      + "[--request-timeout-ms 5000] "
      + "[--alias-inactivity-timeout-ms 5000] "
      + "[--alias-total-timeout-ms 15000]\n"
      + "   or: node tools/void-public-origin-binding-external-acceptance-v1.mjs "
      + "verify --input /absolute/evidence.json",
  );
}

const direct = process.argv[1]
  && import.meta.url
    === pathToFileURL(process.argv[1]).href;

if (direct) {
  try {
    const { command, values } = parseCli(
      process.argv.slice(2),
    );
    if (
      values.help
      || command === "help"
      || command === "--help"
      || command === "-h"
    ) {
      usage();
    } else if (command === "collect") {
      if (!values.output) {
        fail("collect requires --output");
      }
      const output = canonicalOutputPath(
        values.output,
      );
      const requestTimeoutMs = canonicalInteger(
        values["request-timeout-ms"],
        "--request-timeout-ms",
        250,
        30_000,
      );
      const aliasInactivityTimeoutMs =
        canonicalInteger(
          values[
            "alias-inactivity-timeout-ms"
          ],
          "--alias-inactivity-timeout-ms",
          250,
          30_000,
        );
      const aliasTotalTimeoutMs =
        canonicalInteger(
          values["alias-total-timeout-ms"],
          "--alias-total-timeout-ms",
          aliasInactivityTimeoutMs,
          120_000,
        );

      const evidence = await collectLiveV1({
        requestTimeoutMs,
        aliasInactivityTimeoutMs,
        aliasTotalTimeoutMs,
      });
      const written = writePrivateJson(
        output,
        evidence,
      );
      console.log(
        VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_ACCEPTANCE_V1,
      );
      console.log(`receipt_id=${evidence.receipt_id}`);
      console.log("status=green");
      console.log("external_acceptance=true");
      console.log(
        `base=${evidence.coordinator.base}`,
      );
      console.log(
        `node_id=${evidence.coordinator.node_id}`,
      );
      console.log(
        `binding_sha256=${evidence.binding.binding_sha256}`,
      );
      console.log(
        `artifact_sha256=${written.sha256}`,
      );
      console.log("aliases_byte_identical=true");
      console.log("public_copy_ready=true");
      console.log("no_node_client_executed=true");
      console.log("mutation_attempted=false");
      console.log("ticket_issuance_attempted=false");
      console.log("private_key_access=false");
      console.log("service_restart=false");
      console.log("funds_movement=false");
    } else if (command === "verify") {
      if (!values.input) {
        fail("verify requires --input");
      }
      if (values.output) {
        fail("verify does not accept --output");
      }
      const input = path.resolve(values.input);
      if (input !== values.input) {
        fail("receipt input path must be an absolute canonical path");
      }
      const receipt =
        readVoidPublicOriginBindingExternalAcceptanceReceiptFileV1(
          input,
        );
      console.log(
        VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_ACCEPTANCE_V1,
      );
      console.log("status=green");
      console.log(`receipt_id=${receipt.receipt_id}`);
      console.log("offline_verification=true");
      console.log("external_request=false");
      console.log("child_process_execution=false");
      console.log("runtime_mutation=false");
      console.log("private_key_access=false");
      console.log("funds_movement=false");
    } else {
      usage();
      fail("unknown command");
    }
  } catch (error) {
    console.error(
      "VOID_PUBLIC_ORIGIN_BINDING_EXTERNAL_ACCEPTANCE_V1_HOLD",
    );
    console.error(
      error instanceof Error
        ? error.message
        : String(error),
    );
    process.exitCode = 1;
  }
}
