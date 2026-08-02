#!/usr/bin/env node
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { hostname } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  AGENT_PAID_WORK_SUBMIT_SCOPE,
  authenticateAgentPaidWorkCredentialV1,
  materializeAgentPaidWorkCredentialRegistryV1,
  materializeAgentPaidWorkCredentialV1,
  parseAgentPaidWorkCredentialRegistryV1,
} from "./agent_paid_work_credential_registry_v1.ts";

export const MARKER =
  "VOID_AGENT_PAID_WORK_CANONICAL_REMOTE_CREDENTIAL_ISSUANCE_V1";
export const REQUEST_MARKER =
  "VOID_AGENT_PAID_WORK_CANONICAL_REMOTE_CREDENTIAL_REQUEST_V1";
export const RESPONSE_MARKER =
  "VOID_AGENT_PAID_WORK_CANONICAL_REMOTE_CREDENTIAL_RESPONSE_V1";
export const REVIEW_MARKER =
  "VOID_AGENT_PAID_WORK_CANONICAL_REMOTE_CREDENTIAL_REVIEW_V1";
export const STAGED_MARKER =
  "VOID_AGENT_PAID_WORK_CANONICAL_REMOTE_CREDENTIAL_STAGED_ISSUANCE_V1";
export const RECEIPT_MARKER =
  "VOID_AGENT_PAID_WORK_CANONICAL_REMOTE_CREDENTIAL_APPLY_RECEIPT_V1";
export const NIMO_PRIVATE_REGISTRY_MARKER =
  "VOID_AGENT_PAID_WORK_CANONICAL_REMOTE_CREDENTIAL_NIMO_PRIVATE_REGISTRY_V1";

export const TOKEN_GENERATION_CONFIRMATION =
  "generate-agent-paid-work-canonical-remote-credential-token-v1";
export const REVIEW_CONFIRMATION =
  "approve-agent-paid-work-canonical-remote-credential-v1";
export const APPLY_CONFIRMATION =
  "apply-agent-paid-work-canonical-remote-credential-issuance-v1";

const SHA256_RE = /^[0-9a-f]{64}$/;
const AGENT_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const ACCOUNT_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const PLAN_RE = /^voidapwnlp1_[0-9a-f]{64}$/;
const REQUEST_RE = /^voidapwcir1_[0-9a-f]{64}$/;
const RESPONSE_RE = /^voidapwcires1_[0-9a-f]{64}$/;
const REVIEW_RE = /^voidapwcird1_[0-9a-f]{64}$/;
const PREPARATION_RE = /^voidapwcip1_[0-9a-f]{64}$/;
const CREDENTIAL_RE = /^voidapwc1_[0-9a-f]{64}$/;
const RECEIPT_RE = /^voidapwcirc1_[0-9a-f]{64}$/;
const UTC_SECONDS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const RAW_TOKEN_RE =
  /voidapwc1\.[A-Za-z0-9._:-]{3,180}\.[A-Za-z0-9_-]{20,}/;
const MAX_JSON_BYTES = 32 * 1024 * 1024;
const EXPECTED_NIMO_HOSTNAME = "zoso-N153B";

export const FALSE_AUTHORITY = Object.freeze({
  raw_token_generation: false,
  raw_token_return: false,
  credential_registry_write: false,
  binding_registry_write: false,
  paid_work_submission: false,
  paid_work_submission_retry: false,
  quote_acceptance: false,
  payment_authorization: false,
  payment_execution: false,
  work_execution_authorization: false,
  work_dispatch: false,
  wc_ledger_write: false,
  wc_to_void_settlement: false,
  wallet_or_signer_access: false,
  signing: false,
  transaction_broadcast: false,
  service_restart: false,
  deployment: false,
  money_movement: false,
});

function fail(message) {
  throw new Error(message);
}

function assertCondition(condition, message) {
  if (!condition) fail(message);
}

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function requireRecord(value, label) {
  assertCondition(isRecord(value), `${label} must be an object`);
  return value;
}

function requireString(value, label, pattern = null, minimum = 1, maximum = 4096) {
  assertCondition(typeof value === "string", `${label} must be a string`);
  assertCondition(value === value.trim(), `${label} must be trimmed`);
  assertCondition(
    value.length >= minimum && value.length <= maximum,
    `${label} length outside ${minimum}..${maximum}`,
  );
  if (pattern) {
    assertCondition(pattern.test(value), `${label} format mismatch`);
  }
  return value;
}

function requireExactKeys(value, label, expected) {
  const record = requireRecord(value, label);
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  assertCondition(
    JSON.stringify(actual) === JSON.stringify(wanted),
    `${label} keys must be exactly: ${wanted.join(", ")}`,
  );
  return record;
}

function requireUtcSeconds(value, label) {
  const text = requireString(value, label, UTC_SECONDS_RE, 20, 20);
  const parsed = Date.parse(text);
  assertCondition(Number.isFinite(parsed), `${label} invalid UTC`);
  assertCondition(
    new Date(parsed).toISOString().replace(".000Z", "Z") === text,
    `${label} not canonical UTC seconds`,
  );
  return text;
}

export function canonicalJsonV1(value) {
  if (Array.isArray(value)) {
    return `[${value.map((child) => canonicalJsonV1(child)).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJsonV1(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256BytesV1(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function contentIdV1(prefix, value) {
  return `${prefix}${sha256BytesV1(
    Buffer.from(canonicalJsonV1(value), "utf8"),
  )}`;
}

function fileJsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function currentUtcSeconds() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function fsyncDirectory(directory) {
  const descriptor = openSync(directory, "r");
  try {
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

function ensurePrivateDirectory(directory) {
  const resolved = resolve(directory);
  if (!existsSync(resolved)) {
    mkdirSync(resolved, { recursive: true, mode: 0o700 });
  }
  const metadata = lstatSync(resolved);
  assertCondition(
    metadata.isDirectory() && !metadata.isSymbolicLink(),
    `private directory must be direct: ${resolved}`,
  );
  assertCondition(
    metadata.uid === process.getuid(),
    `private directory owner mismatch: ${resolved}`,
  );
  assertCondition(
    (metadata.mode & 0o777) === 0o700,
    `private directory mode must be 0700: ${resolved}`,
  );
  return resolved;
}

function readPrivateJson(file, label, optional = false) {
  const resolved = resolve(file);
  if (!existsSync(resolved)) {
    if (optional) return null;
    fail(`${label} missing: ${resolved}`);
  }
  const metadata = lstatSync(resolved);
  assertCondition(
    metadata.isFile() && !metadata.isSymbolicLink(),
    `${label} must be a direct regular file`,
  );
  assertCondition(metadata.uid === process.getuid(), `${label} owner mismatch`);
  assertCondition((metadata.mode & 0o777) === 0o600, `${label} mode must be 0600`);
  assertCondition(metadata.size <= MAX_JSON_BYTES, `${label} exceeds size bound`);
  const raw = readFileSync(resolved);
  let value;
  try {
    value = JSON.parse(raw.toString("utf8"));
  } catch (error) {
    fail(`${label} invalid JSON: ${error.message}`);
  }
  return {
    path: resolved,
    raw,
    sha256: sha256BytesV1(raw),
    value,
  };
}

function atomicReplaceJson(file, value) {
  const resolved = resolve(file);
  const parent = ensurePrivateDirectory(dirname(resolved));
  const temporary = `${resolved}.tmp-${process.pid}-${Date.now()}`;
  const descriptor = openSync(temporary, "wx", 0o600);
  try {
    writeFileSync(descriptor, fileJsonBytes(value));
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
  try {
    renameSync(temporary, resolved);
    fsyncDirectory(parent);
  } catch (error) {
    try {
      unlinkSync(temporary);
    } catch {
      // The rename may already have completed.
    }
    throw error;
  }
}

function writeExclusiveText(file, value) {
  const resolved = resolve(file);
  const parent = ensurePrivateDirectory(dirname(resolved));
  const descriptor = openSync(resolved, "wx", 0o600);
  try {
    writeFileSync(descriptor, value, "utf8");
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
  fsyncDirectory(parent);
}

function writeExclusiveOrVerifyJson(file, value) {
  const resolved = resolve(file);
  if (existsSync(resolved)) {
    const existing = readPrivateJson(resolved, "existing output");
    assertCondition(
      canonicalJsonV1(existing.value) === canonicalJsonV1(value),
      `conflicting existing output: ${resolved}`,
    );
    return false;
  }
  const parent = ensurePrivateDirectory(dirname(resolved));
  const descriptor = openSync(resolved, "wx", 0o600);
  try {
    writeFileSync(descriptor, fileJsonBytes(value));
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
  fsyncDirectory(parent);
  return true;
}

function assertSanitized(value, label) {
  const prohibited = new Set([
    "token",
    "raw_token",
    "credential_token",
    "bearer_token",
    "secret",
    "private_key",
    "signing_key",
  ]);
  const normalize = (key) => key.toLowerCase().replace(/[^a-z0-9_]/g, "");
  const walk = (node, path = "$") => {
    if (typeof node === "string") {
      assertCondition(!RAW_TOKEN_RE.test(node), `${label} raw token at ${path}`);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((child, index) => walk(child, `${path}[${index}]`));
      return;
    }
    if (!isRecord(node)) return;
    for (const [key, child] of Object.entries(node)) {
      assertCondition(
        !prohibited.has(normalize(key)),
        `${label} prohibited key at ${path}.${key}`,
      );
      walk(child, `${path}.${key}`);
    }
  };
  walk(value);
}

function exactFalseAuthority(value, label) {
  const authority = requireRecord(value, label);
  const expected = Object.keys(FALSE_AUTHORITY).sort();
  const actual = Object.keys(authority).sort();
  assertCondition(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${label} keys mismatch`,
  );
  for (const key of expected) {
    assertCondition(authority[key] === false, `${label}.${key} must be false`);
  }
  return authority;
}

function requestCore(value) {
  const core = { ...value };
  delete core.request_id;
  return core;
}

export function validateRequestV1(value) {
  const request = requireExactKeys(value, "issuance request", [
    "marker",
    "version",
    "request_id",
    "plan_id",
    "agent_id",
    "destination_wc_account",
    "scopes",
    "expires_at_utc",
    "expected_nimo_hostname",
    "raw_token_generation_authorized",
    "authority",
  ]);
  assertCondition(
    request.marker === REQUEST_MARKER && request.version === 1,
    "issuance request marker/version mismatch",
  );
  requireString(request.request_id, "request_id", REQUEST_RE, 76, 76);
  requireString(request.plan_id, "plan_id", PLAN_RE, 76, 76);
  requireString(request.agent_id, "agent_id", AGENT_RE, 3, 128);
  requireString(
    request.destination_wc_account,
    "destination_wc_account",
    ACCOUNT_RE,
    3,
    128,
  );
  assertCondition(
    Array.isArray(request.scopes)
      && request.scopes.length === 1
      && request.scopes[0] === AGENT_PAID_WORK_SUBMIT_SCOPE,
    "request scopes must contain only agent_paid_work_submit",
  );
  requireUtcSeconds(request.expires_at_utc, "expires_at_utc");
  assertCondition(
    request.expected_nimo_hostname === EXPECTED_NIMO_HOSTNAME,
    "expected Nimo hostname mismatch",
  );
  assertCondition(
    request.raw_token_generation_authorized === false,
    "request cannot authorize raw-token generation",
  );
  exactFalseAuthority(request.authority, "request authority");
  assertCondition(
    request.request_id === contentIdV1("voidapwcir1_", requestCore(request)),
    "request_id content mismatch",
  );
  assertSanitized(request, "issuance request");
  return request;
}

export function prepareRequestV1({
  planId,
  agentId,
  destinationWcAccount,
  expiresAtUtc,
  outputPath,
  evaluatedAtUtc = null,
}) {
  requireString(planId, "plan_id", PLAN_RE, 76, 76);
  requireString(agentId, "agent_id", AGENT_RE, 3, 128);
  requireString(
    destinationWcAccount,
    "destination_wc_account",
    ACCOUNT_RE,
    3,
    128,
  );
  const expires = requireUtcSeconds(expiresAtUtc, "expires_at_utc");
  const evaluated = requireUtcSeconds(
    evaluatedAtUtc ?? currentUtcSeconds(),
    "evaluated_at_utc",
  );
  assertCondition(
    Date.parse(expires) > Date.parse(evaluated),
    "request expiration must be in the future",
  );
  const core = {
    marker: REQUEST_MARKER,
    version: 1,
    plan_id: planId,
    agent_id: agentId,
    destination_wc_account: destinationWcAccount,
    scopes: [AGENT_PAID_WORK_SUBMIT_SCOPE],
    expires_at_utc: expires,
    expected_nimo_hostname: EXPECTED_NIMO_HOSTNAME,
    raw_token_generation_authorized: false,
    authority: FALSE_AUTHORITY,
  };
  const request = {
    ...core,
    request_id: contentIdV1("voidapwcir1_", core),
  };
  validateRequestV1(request);
  const writePerformed = writeExclusiveOrVerifyJson(outputPath, request);
  return {
    marker: MARKER,
    command: "prepare-request",
    request_id: request.request_id,
    request_path: resolve(outputPath),
    request_write_performed: writePerformed,
    raw_token_generation: false,
    credential_id_selected: false,
    credential_registry_write: false,
    authority: FALSE_AUTHORITY,
  };
}

function responseCore(value) {
  const core = { ...value };
  delete core.response_id;
  return core;
}

export function validateResponseV1(value) {
  const response = requireExactKeys(value, "Nimo response", [
    "marker",
    "version",
    "response_id",
    "request_id",
    "credential_id",
    "agent_id",
    "destination_wc_account",
    "token_sha256",
    "issued_at_utc",
    "expires_at_utc",
    "private_token_path_sha256",
    "token_persisted_on_nimo",
    "raw_token_returned",
    "authority",
  ]);
  assertCondition(
    response.marker === RESPONSE_MARKER && response.version === 1,
    "Nimo response marker/version mismatch",
  );
  requireString(response.response_id, "response_id", RESPONSE_RE, 78, 78);
  requireString(response.request_id, "request_id", REQUEST_RE, 76, 76);
  requireString(response.credential_id, "credential_id", CREDENTIAL_RE, 74, 74);
  requireString(response.agent_id, "agent_id", AGENT_RE, 3, 128);
  requireString(
    response.destination_wc_account,
    "destination_wc_account",
    ACCOUNT_RE,
    3,
    128,
  );
  requireString(response.token_sha256, "token_sha256", SHA256_RE, 64, 64);
  const issued = requireUtcSeconds(response.issued_at_utc, "issued_at_utc");
  const expires = requireUtcSeconds(response.expires_at_utc, "expires_at_utc");
  assertCondition(
    Date.parse(expires) > Date.parse(issued),
    "response expiry must follow issuance",
  );
  requireString(
    response.private_token_path_sha256,
    "private_token_path_sha256",
    SHA256_RE,
    64,
    64,
  );
  assertCondition(
    response.token_persisted_on_nimo === true,
    "response must attest Nimo token persistence",
  );
  assertCondition(response.raw_token_returned === false, "raw token returned");
  exactFalseAuthority(response.authority, "response authority");
  const credential = materializeAgentPaidWorkCredentialV1({
    agent_id: response.agent_id,
    token_sha256: response.token_sha256,
    scopes: [AGENT_PAID_WORK_SUBMIT_SCOPE],
    issued_at_utc: issued,
    expires_at_utc: expires,
    revoked_at_utc: null,
  });
  assertCondition(
    response.credential_id === credential.credential_id,
    "response credential_id is not canonical",
  );
  assertCondition(
    response.response_id === contentIdV1("voidapwcires1_", responseCore(response)),
    "response_id content mismatch",
  );
  assertSanitized(response, "Nimo response");
  return response;
}

function privateRegistryCore(records, updatedAtUtc) {
  const sorted = [...records].sort((left, right) =>
    String(left.request_id).localeCompare(String(right.request_id))
  );
  return {
    marker: NIMO_PRIVATE_REGISTRY_MARKER,
    version: 1,
    updated_at_utc: updatedAtUtc,
    records: sorted,
  };
}

function materializePrivateRegistry(records, updatedAtUtc) {
  const core = privateRegistryCore(records, updatedAtUtc);
  return {
    ...core,
    registry_id: contentIdV1("voidapwcnpr1_", core),
  };
}

function parsePrivateRegistry(value) {
  const registry = requireExactKeys(value, "Nimo private registry", [
    "marker",
    "version",
    "updated_at_utc",
    "records",
    "registry_id",
  ]);
  assertCondition(
    registry.marker === NIMO_PRIVATE_REGISTRY_MARKER && registry.version === 1,
    "Nimo private registry marker/version mismatch",
  );
  requireUtcSeconds(registry.updated_at_utc, "private registry.updated_at_utc");
  assertCondition(Array.isArray(registry.records), "private registry records missing");
  const requestIds = new Set();
  const credentialIds = new Set();
  const tokenHashes = new Set();
  for (const recordValue of registry.records) {
    const record = requireExactKeys(recordValue, "private credential record", [
      "request_id",
      "credential_id",
      "agent_id",
      "destination_wc_account",
      "token_sha256",
      "issued_at_utc",
      "expires_at_utc",
      "private_token_path_sha256",
    ]);
    requireString(record.request_id, "private request_id", REQUEST_RE, 76, 76);
    requireString(record.credential_id, "private credential_id", CREDENTIAL_RE, 74, 74);
    requireString(record.agent_id, "private agent_id", AGENT_RE, 3, 128);
    requireString(
      record.destination_wc_account,
      "private destination_wc_account",
      ACCOUNT_RE,
      3,
      128,
    );
    requireString(record.token_sha256, "private token_sha256", SHA256_RE, 64, 64);
    requireUtcSeconds(record.issued_at_utc, "private issued_at_utc");
    requireUtcSeconds(record.expires_at_utc, "private expires_at_utc");
    requireString(
      record.private_token_path_sha256,
      "private path SHA",
      SHA256_RE,
      64,
      64,
    );
    assertCondition(!requestIds.has(record.request_id), "duplicate private request_id");
    assertCondition(
      !credentialIds.has(record.credential_id),
      "duplicate private credential_id",
    );
    assertCondition(
      !tokenHashes.has(record.token_sha256),
      "duplicate private token_sha256",
    );
    requestIds.add(record.request_id);
    credentialIds.add(record.credential_id);
    tokenHashes.add(record.token_sha256);
  }
  const core = privateRegistryCore(
    registry.records,
    registry.updated_at_utc,
  );
  assertCondition(
    registry.registry_id === contentIdV1("voidapwcnpr1_", core),
    "Nimo private registry_id mismatch",
  );
  return registry;
}

function responseFromRecord(request, record) {
  const core = {
    marker: RESPONSE_MARKER,
    version: 1,
    request_id: request.request_id,
    credential_id: record.credential_id,
    agent_id: record.agent_id,
    destination_wc_account: record.destination_wc_account,
    token_sha256: record.token_sha256,
    issued_at_utc: record.issued_at_utc,
    expires_at_utc: record.expires_at_utc,
    private_token_path_sha256: record.private_token_path_sha256,
    token_persisted_on_nimo: true,
    raw_token_returned: false,
    authority: FALSE_AUTHORITY,
  };
  return {
    ...core,
    response_id: contentIdV1("voidapwcires1_", core),
  };
}

function verifyPrivateTokenFileV1({
  tokenPath,
  expectedTokenSha256,
  expectedPathSha256,
}) {
  const resolved = resolve(tokenPath);
  const metadata = lstatSync(resolved);
  assertCondition(
    metadata.isFile()
      && !metadata.isSymbolicLink()
      && metadata.uid === process.getuid()
      && (metadata.mode & 0o777) === 0o600,
    "private token file identity mismatch",
  );
  assertCondition(
    metadata.size >= 17 && metadata.size <= 8193,
    "private token file size outside bound",
  );
  const raw = readFileSync(resolved, "utf8");
  assertCondition(
    raw.endsWith("\n") && raw.indexOf("\n") === raw.length - 1,
    "private token file must contain one newline-terminated token",
  );
  const token = raw.slice(0, -1);
  assertCondition(
    /^[^\s]{16,8192}$/.test(token),
    "private token file format mismatch",
  );
  assertCondition(
    sha256BytesV1(Buffer.from(token, "utf8")) === expectedTokenSha256,
    "private token file hash mismatch",
  );
  assertCondition(
    sha256BytesV1(Buffer.from(resolved, "utf8")) === expectedPathSha256,
    "private token path hash mismatch",
  );
}

function acquireNimoGenerationLock({
  privateRegistryPath,
  requestId,
  acquiredAtUtc,
}) {
  const resolved = `${resolve(privateRegistryPath)}.generation.lock`;
  const parent = ensurePrivateDirectory(dirname(resolved));
  assertCondition(
    !existsSync(resolved),
    "Nimo token generation lock already exists",
  );
  const record = {
    marker:
      "VOID_AGENT_PAID_WORK_CANONICAL_REMOTE_CREDENTIAL_NIMO_GENERATION_LOCK_V1",
    version: 1,
    pid: process.pid,
    request_id: requestId,
    acquired_at_utc: requireUtcSeconds(
      acquiredAtUtc,
      "generation lock acquired_at_utc",
    ),
  };
  const descriptor = openSync(resolved, "wx", 0o600);
  try {
    writeFileSync(descriptor, fileJsonBytes(record));
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
  fsyncDirectory(parent);
  let released = false;
  return {
    path: resolved,
    release() {
      if (released) return;
      const observed = readPrivateJson(
        resolved,
        "owned Nimo generation lock",
      );
      assertCondition(
        canonicalJsonV1(observed.value) === canonicalJsonV1(record),
        "Nimo generation lock ownership changed",
      );
      unlinkSync(resolved);
      fsyncDirectory(parent);
      released = true;
    },
  };
}

export function generateTokenLocalV1({
  requestPath,
  privateTokenRoot,
  privateRegistryPath,
  responsePath,
  confirmation,
  hostIdentityResolver = hostname,
  tokenBytesFactory = () => randomBytes(32),
  issuedAtUtc = null,
}) {
  assertCondition(
    confirmation === TOKEN_GENERATION_CONFIRMATION,
    "token-generation confirmation mismatch",
  );
  const requestFile = readPrivateJson(requestPath, "issuance request");
  const request = validateRequestV1(requestFile.value);
  const actualHost = hostIdentityResolver();
  assertCondition(
    actualHost === request.expected_nimo_hostname,
    `Nimo hostname mismatch: expected ${request.expected_nimo_hostname}, got ${actualHost}`,
  );
  const privateRoot = ensurePrivateDirectory(privateTokenRoot);
  const generationLock = acquireNimoGenerationLock({
    privateRegistryPath,
    requestId: request.request_id,
    acquiredAtUtc: currentUtcSeconds(),
  });
  try {
    const registryFile = readPrivateJson(
      privateRegistryPath,
      "Nimo private registry",
      true,
    );
    const registry = registryFile
      ? parsePrivateRegistry(registryFile.value)
      : materializePrivateRegistry([], currentUtcSeconds());
    const existing = registry.records.find(
      (record) => record.request_id === request.request_id,
    );
    if (existing) {
      assertCondition(
        existing.agent_id === request.agent_id
          && existing.destination_wc_account === request.destination_wc_account
          && existing.expires_at_utc === request.expires_at_utc,
        "existing private credential identity mismatch",
      );
      const tokenPath = join(
        privateRoot,
        request.request_id,
        "credential-token-v1.txt",
      );
      verifyPrivateTokenFileV1({
        tokenPath,
        expectedTokenSha256: existing.token_sha256,
        expectedPathSha256: existing.private_token_path_sha256,
      });
      const response = responseFromRecord(request, existing);
      validateResponseV1(response);
      const responseWrite = writeExclusiveOrVerifyJson(responsePath, response);
      return {
        marker: MARKER,
        command: "generate-token-local",
        request_id: request.request_id,
        response_id: response.response_id,
        credential_id: response.credential_id,
        response_path: resolve(responsePath),
        response_write_performed: responseWrite,
        private_token_persisted_on_nimo: true,
        private_token_integrity_verified: true,
        raw_token_returned: false,
        duplicate: true,
        authority: FALSE_AUTHORITY,
      };
    }

    const issued = requireUtcSeconds(
      issuedAtUtc ?? currentUtcSeconds(),
      "issued_at_utc",
    );
    assertCondition(
      Date.parse(request.expires_at_utc) > Date.parse(issued),
      "credential expires before or at issuance",
    );
    const tokenBytes = tokenBytesFactory();
    assertCondition(
      Buffer.isBuffer(tokenBytes) && tokenBytes.length === 32,
      "token generator must return exactly 32 bytes",
    );
    const rawToken =
      `voidapwc1.${request.request_id}.${tokenBytes.toString("base64url")}`;
    const tokenSha = sha256BytesV1(Buffer.from(rawToken, "utf8"));
    const credential = materializeAgentPaidWorkCredentialV1({
      agent_id: request.agent_id,
      token_sha256: tokenSha,
      scopes: [AGENT_PAID_WORK_SUBMIT_SCOPE],
      issued_at_utc: issued,
      expires_at_utc: request.expires_at_utc,
      revoked_at_utc: null,
    });
    const credentialDirectory = join(privateRoot, request.request_id);
    ensurePrivateDirectory(credentialDirectory);
    const tokenPath = join(credentialDirectory, "credential-token-v1.txt");
    assertCondition(
      !existsSync(tokenPath),
      "private token file exists without matching private registry record",
    );
    writeExclusiveText(tokenPath, `${rawToken}\n`);
    const privatePathSha = sha256BytesV1(
      Buffer.from(resolve(tokenPath), "utf8"),
    );
    verifyPrivateTokenFileV1({
      tokenPath,
      expectedTokenSha256: tokenSha,
      expectedPathSha256: privatePathSha,
    });
    const record = {
      request_id: request.request_id,
      credential_id: credential.credential_id,
      agent_id: request.agent_id,
      destination_wc_account: request.destination_wc_account,
      token_sha256: tokenSha,
      issued_at_utc: issued,
      expires_at_utc: request.expires_at_utc,
      private_token_path_sha256: privatePathSha,
    };
    const nextRegistry = materializePrivateRegistry(
      [...registry.records, record],
      issued,
    );
    try {
      atomicReplaceJson(privateRegistryPath, nextRegistry);
    } catch (error) {
      try {
        unlinkSync(tokenPath);
      } catch {
        // Fail closed if cleanup also fails.
      }
      throw error;
    }
    const response = responseFromRecord(request, record);
    validateResponseV1(response);
    const responseWrite = writeExclusiveOrVerifyJson(responsePath, response);
    return {
      marker: MARKER,
      command: "generate-token-local",
      request_id: request.request_id,
      response_id: response.response_id,
      credential_id: response.credential_id,
      response_path: resolve(responsePath),
      response_write_performed: responseWrite,
      private_token_persisted_on_nimo: true,
      private_token_integrity_verified: true,
      raw_token_returned: false,
      duplicate: false,
      authority: FALSE_AUTHORITY,
    };
  } finally {
    generationLock.release();
  }
}

function reviewCore(value) {
  const core = { ...value };
  delete core.review_decision_id;
  return core;
}

export function validateReviewDecisionV1(value) {
  const review = requireExactKeys(value, "review decision", [
    "marker",
    "version",
    "review_decision_id",
    "request_id",
    "response_id",
    "credential_id",
    "agent_id",
    "destination_wc_account",
    "scope",
    "decision",
    "reviewed_at_utc",
    "authority",
  ]);
  assertCondition(
    review.marker === REVIEW_MARKER && review.version === 1,
    "review marker/version mismatch",
  );
  requireString(
    review.review_decision_id,
    "review_decision_id",
    REVIEW_RE,
    77,
    77,
  );
  requireString(review.request_id, "request_id", REQUEST_RE, 76, 76);
  requireString(review.response_id, "response_id", RESPONSE_RE, 78, 78);
  requireString(review.credential_id, "credential_id", CREDENTIAL_RE, 74, 74);
  requireString(review.agent_id, "agent_id", AGENT_RE, 3, 128);
  requireString(
    review.destination_wc_account,
    "destination_wc_account",
    ACCOUNT_RE,
    3,
    128,
  );
  assertCondition(
    review.scope === AGENT_PAID_WORK_SUBMIT_SCOPE,
    "review scope mismatch",
  );
  assertCondition(review.decision === "approved", "review decision mismatch");
  requireUtcSeconds(review.reviewed_at_utc, "reviewed_at_utc");
  exactFalseAuthority(review.authority, "review authority");
  assertCondition(
    review.review_decision_id
      === contentIdV1("voidapwcird1_", reviewCore(review)),
    "review_decision_id content mismatch",
  );
  assertSanitized(review, "review decision");
  return review;
}

export function prepareReviewDecisionV1({
  requestPath,
  responsePath,
  reviewedAtUtc,
  outputPath,
  confirmation,
}) {
  assertCondition(
    confirmation === REVIEW_CONFIRMATION,
    "review confirmation mismatch",
  );
  const request = validateRequestV1(
    readPrivateJson(requestPath, "issuance request").value,
  );
  const response = validateResponseV1(
    readPrivateJson(responsePath, "Nimo response").value,
  );
  assertCondition(
    response.request_id === request.request_id
      && response.agent_id === request.agent_id
      && response.destination_wc_account === request.destination_wc_account
      && response.expires_at_utc === request.expires_at_utc,
    "request/response identity mismatch",
  );
  const reviewed = requireUtcSeconds(reviewedAtUtc, "reviewed_at_utc");
  assertCondition(
    Date.parse(reviewed) >= Date.parse(response.issued_at_utc)
      && Date.parse(reviewed) < Date.parse(response.expires_at_utc),
    "review time outside credential validity window",
  );
  const core = {
    marker: REVIEW_MARKER,
    version: 1,
    request_id: request.request_id,
    response_id: response.response_id,
    credential_id: response.credential_id,
    agent_id: request.agent_id,
    destination_wc_account: request.destination_wc_account,
    scope: AGENT_PAID_WORK_SUBMIT_SCOPE,
    decision: "approved",
    reviewed_at_utc: reviewed,
    authority: FALSE_AUTHORITY,
  };
  const review = {
    ...core,
    review_decision_id: contentIdV1("voidapwcird1_", core),
  };
  validateReviewDecisionV1(review);
  const writePerformed = writeExclusiveOrVerifyJson(outputPath, review);
  return {
    marker: MARKER,
    command: "prepare-review",
    review_decision_id: review.review_decision_id,
    credential_id: review.credential_id,
    review_path: resolve(outputPath),
    review_write_performed: writePerformed,
    credential_registry_write: false,
    raw_token_read: false,
    authority: FALSE_AUTHORITY,
  };
}

function stageCore(value) {
  const core = { ...value };
  delete core.issuance_preparation_id;
  return core;
}

export function validateStagedIssuanceV1(value) {
  const staged = requireExactKeys(value, "staged issuance", [
    "marker",
    "version",
    "issuance_preparation_id",
    "operation",
    "expected_registry_sha256",
    "request_sha256",
    "response_sha256",
    "review_sha256",
    "request_id",
    "response_id",
    "review_decision_id",
    "credential",
    "candidate_registry",
    "candidate_registry_sha256",
    "receiver_restart_required",
    "live_effect",
    "authority",
  ]);
  assertCondition(
    staged.marker === STAGED_MARKER
      && staged.version === 1
      && staged.operation === "issue_canonical_remote_credential",
    "staged issuance marker/version/operation mismatch",
  );
  requireString(
    staged.issuance_preparation_id,
    "issuance_preparation_id",
    PREPARATION_RE,
    76,
    76,
  );
  for (const key of [
    "expected_registry_sha256",
    "request_sha256",
    "response_sha256",
    "review_sha256",
    "candidate_registry_sha256",
  ]) {
    requireString(staged[key], key, SHA256_RE, 64, 64);
  }
  requireString(staged.request_id, "request_id", REQUEST_RE, 76, 76);
  requireString(staged.response_id, "response_id", RESPONSE_RE, 78, 78);
  requireString(
    staged.review_decision_id,
    "review_decision_id",
    REVIEW_RE,
    77,
    77,
  );
  const candidate = parseAgentPaidWorkCredentialRegistryV1(
    staged.candidate_registry,
  );
  assertCondition(
    sha256BytesV1(fileJsonBytes(candidate)) === staged.candidate_registry_sha256,
    "candidate registry file SHA mismatch",
  );
  const credential = requireRecord(staged.credential, "staged credential");
  const exact = candidate.credentials.filter(
    (item) => item.credential_id === credential.credential_id,
  );
  assertCondition(exact.length === 1, "candidate credential count mismatch");
  assertCondition(
    canonicalJsonV1(exact[0]) === canonicalJsonV1(credential),
    "candidate credential content mismatch",
  );
  assertCondition(
    staged.receiver_restart_required === true,
    "receiver restart boundary missing",
  );
  assertCondition(staged.live_effect === false, "staged live effect must be false");
  exactFalseAuthority(staged.authority, "staged authority");
  assertCondition(
    staged.issuance_preparation_id
      === contentIdV1("voidapwcip1_", stageCore(staged)),
    "issuance_preparation_id content mismatch",
  );
  assertSanitized(staged, "staged issuance");
  return staged;
}

export function stageIssuanceV1({
  registryPath,
  requestPath,
  responsePath,
  reviewPath,
  outputPath,
}) {
  const registryFile = readPrivateJson(registryPath, "credential registry");
  const registry = parseAgentPaidWorkCredentialRegistryV1(registryFile.value);
  const requestFile = readPrivateJson(requestPath, "issuance request");
  const responseFile = readPrivateJson(responsePath, "Nimo response");
  const reviewFile = readPrivateJson(reviewPath, "review decision");
  const request = validateRequestV1(requestFile.value);
  const response = validateResponseV1(responseFile.value);
  const review = validateReviewDecisionV1(reviewFile.value);
  assertCondition(
    response.request_id === request.request_id
      && review.request_id === request.request_id
      && review.response_id === response.response_id
      && review.credential_id === response.credential_id
      && review.agent_id === request.agent_id
      && review.destination_wc_account === request.destination_wc_account,
    "request/response/review lineage mismatch",
  );
  const credential = materializeAgentPaidWorkCredentialV1({
    agent_id: request.agent_id,
    token_sha256: response.token_sha256,
    scopes: [AGENT_PAID_WORK_SUBMIT_SCOPE],
    issued_at_utc: response.issued_at_utc,
    expires_at_utc: response.expires_at_utc,
    revoked_at_utc: null,
  });
  assertCondition(
    credential.credential_id === response.credential_id,
    "canonical credential ID mismatch",
  );
  assertCondition(
    !registry.credentials.some(
      (item) => item.credential_id === credential.credential_id,
    ),
    "credential_id already exists",
  );
  assertCondition(
    !registry.credentials.some(
      (item) => item.token_sha256 === credential.token_sha256,
    ),
    "credential token hash already exists",
  );
  const candidate = materializeAgentPaidWorkCredentialRegistryV1({
    created_at_utc: registry.created_at_utc,
    credentials: [...registry.credentials, credential],
  });
  const core = {
    marker: STAGED_MARKER,
    version: 1,
    operation: "issue_canonical_remote_credential",
    expected_registry_sha256: registryFile.sha256,
    request_sha256: requestFile.sha256,
    response_sha256: responseFile.sha256,
    review_sha256: reviewFile.sha256,
    request_id: request.request_id,
    response_id: response.response_id,
    review_decision_id: review.review_decision_id,
    credential,
    candidate_registry: candidate,
    candidate_registry_sha256: sha256BytesV1(fileJsonBytes(candidate)),
    receiver_restart_required: true,
    live_effect: false,
    authority: FALSE_AUTHORITY,
  };
  const staged = {
    ...core,
    issuance_preparation_id: contentIdV1("voidapwcip1_", core),
  };
  validateStagedIssuanceV1(staged);
  const writePerformed = writeExclusiveOrVerifyJson(outputPath, staged);
  return {
    marker: MARKER,
    command: "stage-issue",
    issuance_preparation_id: staged.issuance_preparation_id,
    review_decision_id: staged.review_decision_id,
    credential_id: credential.credential_id,
    staged_path: resolve(outputPath),
    staged_write_performed: writePerformed,
    credential_registry_write: false,
    raw_token_read: false,
    receiver_restart_required: true,
    live_effect: false,
    authority: FALSE_AUTHORITY,
  };
}

function receiptCore(value) {
  const core = { ...value };
  delete core.receipt_id;
  return core;
}

export function validateApplyReceiptV1(value) {
  const receipt = requireExactKeys(value, "apply receipt", [
    "marker",
    "version",
    "receipt_id",
    "operation",
    "status",
    "issuance_preparation_id",
    "review_decision_id",
    "credential_id",
    "registry_sha256_before",
    "registry_sha256_after",
    "registry_write_performed",
    "duplicate",
    "applied_at_utc",
    "receiver_restart_required",
    "live_effect",
    "raw_token_read",
    "authority",
  ]);
  assertCondition(
    receipt.marker === RECEIPT_MARKER
      && receipt.version === 1
      && receipt.operation === "issue_canonical_remote_credential",
    "apply receipt marker/version/operation mismatch",
  );
  requireString(receipt.receipt_id, "receipt_id", RECEIPT_RE, 77, 77);
  assertCondition(
    ["applied", "duplicate"].includes(receipt.status),
    "apply receipt status mismatch",
  );
  requireString(
    receipt.issuance_preparation_id,
    "issuance_preparation_id",
    PREPARATION_RE,
    76,
    76,
  );
  requireString(
    receipt.review_decision_id,
    "review_decision_id",
    REVIEW_RE,
    77,
    77,
  );
  requireString(receipt.credential_id, "credential_id", CREDENTIAL_RE, 74, 74);
  requireString(
    receipt.registry_sha256_before,
    "registry_sha256_before",
    SHA256_RE,
    64,
    64,
  );
  requireString(
    receipt.registry_sha256_after,
    "registry_sha256_after",
    SHA256_RE,
    64,
    64,
  );
  assertCondition(
    typeof receipt.registry_write_performed === "boolean",
    "receipt registry_write_performed must be boolean",
  );
  assertCondition(typeof receipt.duplicate === "boolean", "duplicate must be boolean");
  requireUtcSeconds(receipt.applied_at_utc, "applied_at_utc");
  assertCondition(
    receipt.receiver_restart_required === true,
    "receipt receiver restart boundary missing",
  );
  assertCondition(receipt.live_effect === false, "receipt live effect must be false");
  assertCondition(receipt.raw_token_read === false, "receipt raw token read");
  exactFalseAuthority(receipt.authority, "receipt authority");
  assertCondition(
    receipt.receipt_id === contentIdV1("voidapwcirc1_", receiptCore(receipt)),
    "receipt_id content mismatch",
  );
  assertSanitized(receipt, "apply receipt");
  return receipt;
}

function acquireLock(lockPath, issuancePreparationId, acquiredAtUtc) {
  const resolved = resolve(lockPath);
  const parent = ensurePrivateDirectory(dirname(resolved));
  assertCondition(!existsSync(resolved), "issuance operation lock already exists");
  const record = {
    marker: "VOID_AGENT_PAID_WORK_CANONICAL_REMOTE_CREDENTIAL_ISSUANCE_LOCK_V1",
    version: 1,
    pid: process.pid,
    issuance_preparation_id: issuancePreparationId,
    acquired_at_utc: acquiredAtUtc,
  };
  const descriptor = openSync(resolved, "wx", 0o600);
  try {
    writeFileSync(descriptor, fileJsonBytes(record));
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
  fsyncDirectory(parent);
  let released = false;
  return {
    path: resolved,
    release() {
      if (released) return;
      const observed = readPrivateJson(resolved, "owned issuance lock");
      assertCondition(
        canonicalJsonV1(observed.value) === canonicalJsonV1(record),
        "issuance lock ownership changed",
      );
      unlinkSync(resolved);
      fsyncDirectory(parent);
      released = true;
    },
  };
}

function buildReceipt({
  staged,
  status,
  registryShaBefore,
  registryWritePerformed,
  appliedAtUtc,
}) {
  const core = {
    marker: RECEIPT_MARKER,
    version: 1,
    operation: "issue_canonical_remote_credential",
    status,
    issuance_preparation_id: staged.issuance_preparation_id,
    review_decision_id: staged.review_decision_id,
    credential_id: staged.credential.credential_id,
    registry_sha256_before: registryShaBefore,
    registry_sha256_after: staged.candidate_registry_sha256,
    registry_write_performed: registryWritePerformed,
    duplicate: status === "duplicate",
    applied_at_utc: appliedAtUtc,
    receiver_restart_required: true,
    live_effect: false,
    raw_token_read: false,
    authority: FALSE_AUTHORITY,
  };
  return {
    ...core,
    receipt_id: contentIdV1("voidapwcirc1_", core),
  };
}

export function applyIssuanceV1({
  registryPath,
  stagedPath,
  receiptPath,
  lockPath,
  confirmation,
  appliedAtUtc,
}) {
  assertCondition(
    confirmation === APPLY_CONFIRMATION,
    "issuance apply confirmation mismatch",
  );
  const applied = requireUtcSeconds(appliedAtUtc, "applied_at_utc");
  const staged = validateStagedIssuanceV1(
    readPrivateJson(stagedPath, "staged issuance").value,
  );
  const lock = acquireLock(
    lockPath,
    staged.issuance_preparation_id,
    applied,
  );
  try {
    const registryFile = readPrivateJson(registryPath, "credential registry");
    const registry = parseAgentPaidWorkCredentialRegistryV1(registryFile.value);
    const exactFinal =
      registryFile.sha256 === staged.candidate_registry_sha256
      && canonicalJsonV1(registry) === canonicalJsonV1(staged.candidate_registry);
    if (exactFinal) {
      if (existsSync(resolve(receiptPath))) {
        const existing = validateApplyReceiptV1(
          readPrivateJson(receiptPath, "existing apply receipt").value,
        );
        assertCondition(
          existing.issuance_preparation_id === staged.issuance_preparation_id
            && existing.credential_id === staged.credential.credential_id
            && existing.registry_sha256_after
              === staged.candidate_registry_sha256,
          "existing apply receipt identity mismatch",
        );
        return {
          ...existing,
          operation_status: "duplicate",
          exact_replay: true,
          receipt_path: resolve(receiptPath),
          receipt_write_performed: false,
          lock_path: lock.path,
        };
      }
      const duplicate = buildReceipt({
        staged,
        status: "duplicate",
        registryShaBefore: registryFile.sha256,
        registryWritePerformed: false,
        appliedAtUtc: applied,
      });
      validateApplyReceiptV1(duplicate);
      const writePerformed = writeExclusiveOrVerifyJson(receiptPath, duplicate);
      return {
        ...duplicate,
        operation_status: "duplicate",
        exact_replay: true,
        receipt_path: resolve(receiptPath),
        receipt_write_performed: writePerformed,
        lock_path: lock.path,
      };
    }
    assertCondition(
      registryFile.sha256 === staged.expected_registry_sha256,
      "credential registry is neither exact staged prestate nor final state",
    );
    assertCondition(
      !registry.credentials.some(
        (item) => item.credential_id === staged.credential.credential_id,
      ),
      "credential already exists in non-final registry state",
    );
    atomicReplaceJson(registryPath, staged.candidate_registry);
    const finalFile = readPrivateJson(registryPath, "written credential registry");
    const finalRegistry = parseAgentPaidWorkCredentialRegistryV1(finalFile.value);
    assertCondition(
      finalFile.sha256 === staged.candidate_registry_sha256
        && canonicalJsonV1(finalRegistry)
          === canonicalJsonV1(staged.candidate_registry),
      "credential registry post-write mismatch",
    );
    const receipt = buildReceipt({
      staged,
      status: "applied",
      registryShaBefore: registryFile.sha256,
      registryWritePerformed: true,
      appliedAtUtc: applied,
    });
    validateApplyReceiptV1(receipt);
    const writePerformed = writeExclusiveOrVerifyJson(receiptPath, receipt);
    return {
      ...receipt,
      operation_status: "applied",
      exact_replay: false,
      receipt_path: resolve(receiptPath),
      receipt_write_performed: writePerformed,
      lock_path: lock.path,
    };
  } finally {
    lock.release();
  }
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = { command };
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    assertCondition(token.startsWith("--"), `unexpected argument: ${token}`);
    const key = token.slice(2).replaceAll("-", "_");
    const value = rest[index + 1];
    assertCondition(
      value !== undefined && !value.startsWith("--"),
      `missing value for ${token}`,
    );
    args[key] = value;
    index += 1;
  }
  return args;
}

function required(args, key) {
  const value = args[key];
  assertCondition(
    typeof value === "string" && value.length > 0,
    `missing --${key.replaceAll("_", "-")}`,
  );
  return value;
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function cli() {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === "prepare-request") {
    printJson(prepareRequestV1({
      planId: required(args, "plan_id"),
      agentId: required(args, "agent_id"),
      destinationWcAccount: required(args, "destination_wc_account"),
      expiresAtUtc: required(args, "expires_at_utc"),
      outputPath: required(args, "output"),
    }));
    return;
  }
  if (args.command === "generate-token-local") {
    printJson(generateTokenLocalV1({
      requestPath: required(args, "request"),
      privateTokenRoot: required(args, "private_token_root"),
      privateRegistryPath: required(args, "private_registry"),
      responsePath: required(args, "response"),
      confirmation: required(args, "confirm"),
    }));
    return;
  }
  if (args.command === "prepare-review") {
    printJson(prepareReviewDecisionV1({
      requestPath: required(args, "request"),
      responsePath: required(args, "response"),
      reviewedAtUtc: required(args, "reviewed_at"),
      outputPath: required(args, "output"),
      confirmation: required(args, "confirm"),
    }));
    return;
  }
  if (args.command === "stage-issue") {
    printJson(stageIssuanceV1({
      registryPath: required(args, "registry"),
      requestPath: required(args, "request"),
      responsePath: required(args, "response"),
      reviewPath: required(args, "review"),
      outputPath: required(args, "output"),
    }));
    return;
  }
  if (args.command === "apply-issue") {
    printJson(applyIssuanceV1({
      registryPath: required(args, "registry"),
      stagedPath: required(args, "staged"),
      receiptPath: required(args, "receipt"),
      lockPath: required(args, "lock"),
      confirmation: required(args, "confirm"),
      appliedAtUtc: required(args, "applied_at"),
    }));
    return;
  }
  fail(
    "command must be prepare-request, generate-token-local, prepare-review, stage-issue, or apply-issue",
  );
}

const invokedUrl = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedUrl) {
  try {
    cli();
  } catch (error) {
    process.stderr.write(
      `HOLD: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 2;
  }
}
