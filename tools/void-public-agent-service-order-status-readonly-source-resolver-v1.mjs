#!/usr/bin/env node
import crypto from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_SOURCE_RESOLVER_V1";
export const VERSION = 1;
export const DEFAULT_MAX_BYTES = 1_048_576;
export const SUBMISSION_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

const AUTHORITY = Object.freeze({
  source_write: false,
  http_route_registration: false,
  server_mount: false,
  authenticated_submission_post: false,
  token_byte_read: false,
  provider_selection: false,
  provider_authentication: false,
  quote_acceptance: false,
  payment_execution: false,
  work_dispatch: false,
  work_credit_write: false,
  runtime_mutation: false,
  service_restart: false,
  deployment: false,
});

function fail(code, detail = "") {
  const suffix = detail ? `: ${detail}` : "";
  throw new Error(`${code}${suffix}`);
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function sortJson(value) {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortJson(value[key])]),
    );
  }
  return value;
}

export function canonicalJson(value) {
  return `${JSON.stringify(sortJson(value), null, 2)}\n`;
}

export function sha256Hex(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

export function validateSubmissionId(value) {
  if (typeof value !== "string" || !SUBMISSION_ID_PATTERN.test(value)) {
    fail("invalid_submission_id");
  }
  if (value === "." || value === ".." || value.includes("%")) {
    fail("invalid_submission_id");
  }
  return value;
}

function validateMaxBytes(value) {
  if (
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > DEFAULT_MAX_BYTES
  ) {
    fail("invalid_max_bytes");
  }
  return value;
}

function authorityObject() {
  return { ...AUTHORITY };
}

function sourceFilename(submissionId) {
  return `${submissionId}.json`;
}

async function resolveSafeRoot(root) {
  if (typeof root !== "string" || root.length === 0) {
    fail("invalid_source_root");
  }

  const absolute = path.resolve(root);
  let metadata;
  try {
    metadata = await lstat(absolute);
  } catch (error) {
    fail("source_root_unavailable", error?.code ?? String(error));
  }

  if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
    fail("source_root_must_be_real_directory");
  }

  let resolved;
  try {
    resolved = await realpath(absolute);
  } catch (error) {
    fail("source_root_unavailable", error?.code ?? String(error));
  }

  if (resolved !== absolute) {
    fail("source_root_contains_symlink");
  }

  return absolute;
}

function statIdentity(metadata) {
  return [
    metadata.dev,
    metadata.ino,
    metadata.mode,
    metadata.size,
    metadata.mtimeMs,
    metadata.ctimeMs,
  ]
    .map((value) => String(value))
    .join(":");
}

function notFoundResult(submissionId) {
  return {
    marker: MARKER,
    version: VERSION,
    found: false,
    submission_id: submissionId,
    source_filename: sourceFilename(submissionId),
    source_sha256: null,
    source_size_bytes: 0,
    source: null,
    reason: "order_status_source_not_found",
    authority: authorityObject(),
  };
}

export async function resolveOrderStatusSource({
  root,
  submissionId,
  maxBytes = DEFAULT_MAX_BYTES,
}) {
  const validSubmissionId = validateSubmissionId(submissionId);
  const validMaxBytes = validateMaxBytes(maxBytes);
  const safeRoot = await resolveSafeRoot(root);
  const filename = sourceFilename(validSubmissionId);
  const candidate = path.join(safeRoot, filename);
  const relative = path.relative(safeRoot, candidate);

  if (
    relative !== filename ||
    relative.startsWith("..") ||
    path.isAbsolute(relative)
  ) {
    fail("source_path_escape_refused");
  }

  let metadata;
  try {
    metadata = await lstat(candidate, { bigint: true });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return notFoundResult(validSubmissionId);
    }
    fail("source_lstat_failed", error?.code ?? String(error));
  }

  if (metadata.isSymbolicLink()) {
    fail("source_symlink_refused");
  }
  if (!metadata.isFile()) {
    fail("source_not_regular_file");
  }
  if (metadata.nlink !== 1n) {
    fail("source_hardlink_refused");
  }
  if (metadata.size < 1n || metadata.size > BigInt(validMaxBytes)) {
    fail("source_size_refused");
  }

  const flags =
    fsConstants.O_RDONLY |
    (typeof fsConstants.O_NOFOLLOW === "number"
      ? fsConstants.O_NOFOLLOW
      : 0);

  let handle;
  try {
    handle = await open(candidate, flags);
  } catch (error) {
    fail("source_open_failed", error?.code ?? String(error));
  }

  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile()) {
      fail("source_not_regular_file");
    }
    if (before.nlink !== 1n) {
      fail("source_hardlink_refused");
    }
    if (statIdentity(metadata) !== statIdentity(before)) {
      fail("source_changed_before_read");
    }
    if (before.size < 1n || before.size > BigInt(validMaxBytes)) {
      fail("source_size_refused");
    }

    const bytes = await handle.readFile();
    if (bytes.length < 1 || bytes.length > validMaxBytes) {
      fail("source_size_refused");
    }

    const after = await handle.stat({ bigint: true });
    if (statIdentity(before) !== statIdentity(after)) {
      fail("source_changed_during_read");
    }
    if (BigInt(bytes.length) !== after.size) {
      fail("source_changed_during_read");
    }

    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      fail("source_utf8_invalid");
    }

    let source;
    try {
      source = JSON.parse(text);
    } catch {
      fail("source_json_invalid");
    }

    if (!isPlainObject(source)) {
      fail("source_json_must_be_object");
    }
    if (source.submission_id !== validSubmissionId) {
      fail("source_submission_id_mismatch");
    }

    return {
      marker: MARKER,
      version: VERSION,
      found: true,
      submission_id: validSubmissionId,
      source_filename: filename,
      source_sha256: sha256Hex(bytes),
      source_size_bytes: bytes.length,
      source,
      reason: null,
      authority: authorityObject(),
    };
  } finally {
    await handle.close();
  }
}

function parseCli(argv) {
  if (argv.length === 0 || argv[0] !== "resolve") {
    fail(
      "usage",
      "resolve --root <directory> --submission-id <id> [--max-bytes <n>]",
    );
  }

  const values = new Map();
  for (let index = 1; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (
      !["--root", "--submission-id", "--max-bytes"].includes(flag) ||
      value === undefined ||
      values.has(flag)
    ) {
      fail("invalid_cli_arguments");
    }
    values.set(flag, value);
  }

  if (!values.has("--root") || !values.has("--submission-id")) {
    fail("invalid_cli_arguments");
  }

  const maxBytes = values.has("--max-bytes")
    ? Number(values.get("--max-bytes"))
    : DEFAULT_MAX_BYTES;

  return {
    root: values.get("--root"),
    submissionId: values.get("--submission-id"),
    maxBytes,
  };
}

async function main() {
  const options = parseCli(process.argv.slice(2));
  const result = await resolveOrderStatusSource(options);
  process.stdout.write(canonicalJson(result));
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const modulePath = fileURLToPath(import.meta.url);

if (invokedPath === modulePath) {
  main().catch((error) => {
    process.stderr.write(`HOLD: ${error.message}\n`);
    process.exitCode = 1;
  });
}
