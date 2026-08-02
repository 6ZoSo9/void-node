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
import { createHash } from "node:crypto";
import { basename, dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const RETIREMENT_MARKER =
  "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_RETIREMENT_V1";
export const RETIREMENT_STAGED_MARKER =
  "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_RETIREMENT_STAGED_MUTATION_V1";
export const RETIREMENT_RECORD_MARKER =
  "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_RETIREMENT_RECORD_V1";
export const RETIREMENT_REGISTRY_MARKER =
  "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_RETIREMENT_REGISTRY_V1";
export const RETIREMENT_RECEIPT_MARKER =
  "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_RETIREMENT_APPLY_RECEIPT_V1";
export const BINDING_REGISTRY_MARKER =
  "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_REGISTRY_V1";
export const CREDENTIAL_REGISTRY_MARKER =
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REGISTRY_V1";
export const RETIREMENT_REASON = "credential_expired_rotation";
export const RETIREMENT_CONFIRMATION =
  "retire-agent-paid-work-credential-wc-account-binding-v1";
export const RETIREMENT_LOCK_MARKER =
  "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_RETIREMENT_LOCK_V1";
export const RETIREMENT_STALE_LOCK_RECOVERY_CONFIRMATION =
  "recover-stale-agent-paid-work-credential-wc-account-binding-retirement-lock-v1";

const BINDING_ID_RE = /^voidapwcb1_[0-9a-f]{64}$/;
const CREDENTIAL_ID_RE = /^voidapwc1_[0-9a-f]{64}$/;
const BINDING_REGISTRY_ID_RE = /^voidapwcbr1_[0-9a-f]{64}$/;
const CREDENTIAL_REGISTRY_ID_RE = /^voidapwcr1_[0-9a-f]{64}$/;
const RETIREMENT_ID_RE = /^voidapwbr1_[0-9a-f]{64}$/;
const RETIREMENT_REGISTRY_ID_RE = /^voidapwbrr1_[0-9a-f]{64}$/;
const STAGED_ID_RE = /^voidapwbrm1_[0-9a-f]{64}$/;
const RECEIPT_ID_RE = /^voidapwbrc1_[0-9a-f]{64}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const ACCOUNT_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const AGENT_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const MAX_JSON_BYTES = 32 * 1024 * 1024;
const MAX_BINDINGS = 10000;
const MAX_RETIREMENTS = 10000;

const FALSE_AUTHORITY = Object.freeze({
  paid_work_submission: false,
  paid_work_submission_retry: false,
  wc_award_destination_change: false,
  wc_ledger_write: false,
  wc_to_void_settlement: false,
  payment_authorization: false,
  payment_execution: false,
  work_execution_authorization: false,
  work_dispatch: false,
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

function requireString(value, label, pattern = null, min = 1, max = 4096) {
  assertCondition(typeof value === "string", `${label} must be a string`);
  assertCondition(value === value.trim(), `${label} must be trimmed`);
  assertCondition(
    value.length >= min && value.length <= max,
    `${label} length must be ${min}..${max}`,
  );
  if (pattern) assertCondition(pattern.test(value), `${label} format mismatch`);
  return value;
}

function requireBoolean(value, label) {
  assertCondition(typeof value === "boolean", `${label} must be boolean`);
  return value;
}

function requireExactKeys(value, label, keys) {
  const record = requireRecord(value, label);
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  assertCondition(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${label} keys must be exactly: ${expected.join(", ")}`,
  );
  return record;
}

export function canonicalJsonV1(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJsonV1(item)).join(",")}]`;
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
  return `${prefix}${sha256BytesV1(Buffer.from(canonicalJsonV1(value), "utf8"))}`;
}

function parseUtc(value, label) {
  const text = requireString(value, label, null, 20, 24);
  assertCondition(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(text),
    `${label} must be canonical UTC seconds or milliseconds`,
  );
  const milliseconds = Date.parse(text);
  assertCondition(Number.isFinite(milliseconds), `${label} invalid UTC`);
  const canonicalMilliseconds = new Date(milliseconds).toISOString();
  const canonicalSeconds = canonicalMilliseconds.replace(".000Z", "Z");
  assertCondition(
    text === canonicalMilliseconds || text === canonicalSeconds,
    `${label} is not canonical UTC`,
  );
  return new Date(milliseconds);
}

function ensurePrivateParent(file) {
  const parent = dirname(resolve(file));
  if (!existsSync(parent)) {
    mkdirSync(parent, { recursive: true, mode: 0o700 });
  }
  const metadata = lstatSync(parent);
  assertCondition(
    metadata.isDirectory() && !metadata.isSymbolicLink(),
    `output parent must be a direct directory: ${parent}`,
  );
  assertCondition(
    (metadata.mode & 0o777) === 0o700,
    `output parent mode must be 0700: ${parent}`,
  );
  assertCondition(
    metadata.uid === process.getuid(),
    `output parent owner mismatch: ${parent}`,
  );
}

function readJsonFile(file, label, optional = false) {
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
  assertCondition(metadata.size <= MAX_JSON_BYTES, `${label} exceeds size bound`);
  assertCondition(
    metadata.uid === process.getuid(),
    `${label} owner mismatch`,
  );
  assertCondition(
    (metadata.mode & 0o777) === 0o600,
    `${label} mode must be 0600`,
  );
  let value;
  try {
    value = JSON.parse(readFileSync(resolved, "utf8"));
  } catch (error) {
    fail(`${label} invalid JSON: ${error.message}`);
  }
  return {
    path: resolved,
    value,
    sha256: sha256BytesV1(readFileSync(resolved)),
  };
}

function fsyncDirectory(directory) {
  const descriptor = openSync(directory, "r");
  try {
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

function atomicWriteJson(file, value, mode = 0o600) {
  const resolved = resolve(file);
  ensurePrivateParent(resolved);
  const parent = dirname(resolved);
  const temporary = `${resolved}.tmp-${process.pid}-${Date.now()}`;
  const descriptor = openSync(temporary, "wx", mode);
  try {
    writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, "utf8");
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

function writeExclusiveOrVerify(file, value) {
  const resolved = resolve(file);
  if (existsSync(resolved)) {
    const existing = readJsonFile(resolved, "existing output");
    assertCondition(
      canonicalJsonV1(existing.value) === canonicalJsonV1(value),
      `conflicting existing output: ${resolved}`,
    );
    return false;
  }
  atomicWriteJson(resolved, value);
  return true;
}

function walkObjects(value, output = []) {
  if (Array.isArray(value)) {
    for (const child of value) walkObjects(child, output);
  } else if (isRecord(value)) {
    output.push(value);
    for (const child of Object.values(value)) walkObjects(child, output);
  }
  return output;
}

function findCredential(registry, credentialId) {
  const matches = walkObjects(registry).filter(
    (candidate) => candidate.credential_id === credentialId,
  );
  assertCondition(
    matches.length === 1,
    `credential lookup count differs: ${matches.length}`,
  );
  return matches[0];
}

function credentialExpiredOrRevokedAt(credential, retiredAt) {
  const expiresAt = parseUtc(credential.expires_at_utc, "credential.expires_at_utc");
  let revokedAt = null;
  if (credential.revoked_at_utc !== null && credential.revoked_at_utc !== undefined) {
    revokedAt = parseUtc(credential.revoked_at_utc, "credential.revoked_at_utc");
  }
  const inactive =
    expiresAt.getTime() <= retiredAt.getTime()
    || (revokedAt !== null && revokedAt.getTime() <= retiredAt.getTime());
  assertCondition(
    inactive,
    "credential is not expired or revoked at the requested retirement time",
  );
  return {
    expires_at_utc: expiresAt.toISOString(),
    revoked_at_utc: revokedAt ? revokedAt.toISOString() : null,
  };
}

function credentialIdCore(credential) {
  return {
    agent_id: credential.agent_id,
    token_sha256: credential.token_sha256,
    scopes: credential.scopes,
    issued_at_utc: credential.issued_at_utc,
    expires_at_utc: credential.expires_at_utc,
  };
}

function parseCredentialRecord(value) {
  const credential = requireExactKeys(value, "credential record", [
    "credential_id",
    "agent_id",
    "token_sha256",
    "scopes",
    "issued_at_utc",
    "expires_at_utc",
    "revoked_at_utc",
  ]);
  requireString(
    credential.credential_id,
    "credential.credential_id",
    CREDENTIAL_ID_RE,
    74,
    74,
  );
  requireString(credential.agent_id, "credential.agent_id", AGENT_RE, 3, 128);
  requireString(
    credential.token_sha256,
    "credential.token_sha256",
    SHA256_RE,
    64,
    64,
  );
  assertCondition(
    Array.isArray(credential.scopes)
      && credential.scopes.length === 1
      && credential.scopes[0] === "agent_paid_work_submit",
    "credential scopes must contain only agent_paid_work_submit",
  );
  const issuedAt = parseUtc(
    credential.issued_at_utc,
    "credential.issued_at_utc",
  );
  const expiresAt = parseUtc(
    credential.expires_at_utc,
    "credential.expires_at_utc",
  );
  assertCondition(
    expiresAt.getTime() > issuedAt.getTime(),
    "credential expiry must follow issuance",
  );
  if (credential.revoked_at_utc !== null) {
    const revokedAt = parseUtc(
      credential.revoked_at_utc,
      "credential.revoked_at_utc",
    );
    assertCondition(
      revokedAt.getTime() >= issuedAt.getTime(),
      "credential revocation precedes issuance",
    );
  }
  assertCondition(
    credential.credential_id
      === contentIdV1("voidapwc1_", credentialIdCore(credential)),
    "credential_id content mismatch",
  );
  return credential;
}

function parseCredentialRegistry(value) {
  const registry = requireExactKeys(value, "credential registry", [
    "marker",
    "version",
    "registry_id",
    "created_at_utc",
    "credentials",
  ]);
  assertCondition(
    registry.marker === CREDENTIAL_REGISTRY_MARKER && registry.version === 1,
    "credential registry marker/version mismatch",
  );
  requireString(
    registry.registry_id,
    "credential registry.registry_id",
    CREDENTIAL_REGISTRY_ID_RE,
    75,
    75,
  );
  parseUtc(registry.created_at_utc, "credential registry.created_at_utc");
  assertCondition(
    Array.isArray(registry.credentials),
    "credential registry.credentials must be an array",
  );
  assertCondition(
    registry.credentials.length >= 1 && registry.credentials.length <= 1024,
    "credential registry count outside bound",
  );
  const credentials = registry.credentials.map(parseCredentialRecord);
  const ids = new Set();
  const tokenHashes = new Set();
  for (const credential of credentials) {
    assertCondition(
      !ids.has(credential.credential_id),
      "duplicate credential_id",
    );
    assertCondition(
      !tokenHashes.has(credential.token_sha256),
      "duplicate credential token hash",
    );
    ids.add(credential.credential_id);
    tokenHashes.add(credential.token_sha256);
  }
  const core = {
    marker: CREDENTIAL_REGISTRY_MARKER,
    version: 1,
    created_at_utc: registry.created_at_utc,
    credentials,
  };
  assertCondition(
    registry.registry_id === contentIdV1("voidapwcr1_", core),
    "credential registry content ID mismatch",
  );
  return registry;
}

function bindingRegistryCore(bindings, updatedAt) {
  const sorted = [...bindings].sort(
    (left, right) =>
      String(left.credential_id).localeCompare(String(right.credential_id))
      || String(left.binding_id).localeCompare(String(right.binding_id)),
  );
  return {
    marker: BINDING_REGISTRY_MARKER,
    version: 1,
    updated_at: updatedAt,
    bindings: sorted,
  };
}

export function materializeBindingRegistryV1(bindings, updatedAt) {
  assertCondition(Array.isArray(bindings), "bindings must be an array");
  assertCondition(bindings.length <= MAX_BINDINGS, "binding count exceeds bound");
  const core = bindingRegistryCore(bindings, parseUtc(updatedAt, "updated_at").toISOString());
  return {
    registry_id: contentIdV1("voidapwcbr1_", core),
    ...core,
  };
}

function parseBindingRecord(value) {
  const binding = requireExactKeys(value, "binding record", [
    "marker",
    "binding_id",
    "credential_id",
    "agent_id",
    "destination_wc_account",
    "status",
    "valid_from",
    "valid_until",
    "revoked_at",
    "uniqueness_key",
    "source",
    "authority",
    "created_at",
  ]);
  assertCondition(
    binding.marker === "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_V1",
    "binding marker mismatch",
  );
  requireString(binding.binding_id, "binding.binding_id", BINDING_ID_RE, 75, 75);
  requireString(
    binding.credential_id,
    "binding.credential_id",
    CREDENTIAL_ID_RE,
    74,
    74,
  );
  requireString(binding.agent_id, "binding.agent_id", AGENT_RE, 3, 128);
  requireString(
    binding.destination_wc_account,
    "binding.destination_wc_account",
    ACCOUNT_RE,
    3,
    128,
  );
  assertCondition(
    binding.status === "active" || binding.status === "revoked",
    "binding status mismatch",
  );
  const validFrom = parseUtc(binding.valid_from, "binding.valid_from");
  const validUntil = parseUtc(binding.valid_until, "binding.valid_until");
  assertCondition(
    validUntil.getTime() > validFrom.getTime(),
    "binding validity window mismatch",
  );
  parseUtc(binding.created_at, "binding.created_at");
  if (binding.status === "active") {
    assertCondition(binding.revoked_at === null, "active binding is revoked");
  } else {
    assertCondition(binding.revoked_at !== null, "revoked binding lacks revoked_at");
    parseUtc(binding.revoked_at, "binding.revoked_at");
  }
  assertCondition(
    binding.uniqueness_key
      === `paid-work-credential-wc-account:${binding.credential_id}`,
    "binding uniqueness_key mismatch",
  );
  const source = requireExactKeys(binding.source, "binding.source", [
    "credential_registry_sha256",
    "review_decision_id",
    "issuance_preparation_id",
  ]);
  requireString(
    source.credential_registry_sha256,
    "binding.source.credential_registry_sha256",
    SHA256_RE,
    64,
    64,
  );
  for (const key of ["review_decision_id", "issuance_preparation_id"]) {
    assertCondition(
      source[key] === null
        || (typeof source[key] === "string"
          && source[key] === source[key].trim()
          && source[key].length > 0
          && source[key].length <= 256),
      `binding.source.${key} mismatch`,
    );
  }
  const authority = requireExactKeys(binding.authority, "binding.authority", [
    "paid_work_submission_identity",
    "wc_award_destination",
    "payment",
    "wc_ledger_write",
    "wc_to_void_settlement",
    "wallet_or_signer",
  ]);
  assertCondition(
    authority.paid_work_submission_identity === true
      && authority.wc_award_destination === true,
    "binding identity authority mismatch",
  );
  for (const key of [
    "payment",
    "wc_ledger_write",
    "wc_to_void_settlement",
    "wallet_or_signer",
  ]) {
    assertCondition(authority[key] === false, `binding.authority.${key} must be false`);
  }
  const core = { ...binding };
  delete core.binding_id;
  assertCondition(
    binding.binding_id === contentIdV1("voidapwcb1_", core),
    "binding_id content mismatch",
  );
  return binding;
}

function parseBindingRegistry(value) {
  const registry = requireExactKeys(value, "binding registry", [
    "marker",
    "version",
    "registry_id",
    "updated_at",
    "bindings",
  ]);
  assertCondition(
    registry.marker === BINDING_REGISTRY_MARKER && registry.version === 1,
    "binding registry marker/version mismatch",
  );
  requireString(
    registry.registry_id,
    "binding registry.registry_id",
    BINDING_REGISTRY_ID_RE,
    76,
    76,
  );
  parseUtc(registry.updated_at, "binding registry.updated_at");
  assertCondition(Array.isArray(registry.bindings), "binding registry.bindings must be array");
  assertCondition(registry.bindings.length <= MAX_BINDINGS, "binding count exceeds bound");
  const bindings = registry.bindings.map(parseBindingRecord);
  const bindingIds = new Set();
  const activeCredentials = new Set();
  const activeAccounts = new Set();
  for (const binding of bindings) {
    assertCondition(!bindingIds.has(binding.binding_id), "duplicate binding_id");
    bindingIds.add(binding.binding_id);
    if (binding.status === "active") {
      assertCondition(
        !activeCredentials.has(binding.credential_id),
        "multiple active bindings for one credential",
      );
      assertCondition(
        !activeAccounts.has(binding.destination_wc_account),
        "multiple active bindings for one destination account",
      );
      activeCredentials.add(binding.credential_id);
      activeAccounts.add(binding.destination_wc_account);
    }
  }
  const expected = materializeBindingRegistryV1(bindings, registry.updated_at);
  assertCondition(
    canonicalJsonV1(registry) === canonicalJsonV1(expected),
    "binding registry content ID mismatch",
  );
  return registry;
}

function retirementRegistryCore(retirements, updatedAt) {
  const sorted = [...retirements].sort(
    (left, right) =>
      String(left.binding_id).localeCompare(String(right.binding_id))
      || String(left.retirement_id).localeCompare(String(right.retirement_id)),
  );
  return {
    marker: RETIREMENT_REGISTRY_MARKER,
    version: 1,
    updated_at: updatedAt,
    retirements: sorted,
  };
}

export function materializeRetirementRegistryV1(retirements, updatedAt) {
  assertCondition(Array.isArray(retirements), "retirements must be an array");
  assertCondition(
    retirements.length <= MAX_RETIREMENTS,
    "retirement count exceeds bound",
  );
  const core = retirementRegistryCore(
    retirements,
    parseUtc(updatedAt, "retirement registry updated_at").toISOString(),
  );
  return {
    registry_id: contentIdV1("voidapwbrr1_", core),
    ...core,
  };
}

function emptyRetirementRegistry(updatedAt) {
  return materializeRetirementRegistryV1([], updatedAt);
}

function parseRetirementRegistry(value, defaultUpdatedAt) {
  if (value === null) return emptyRetirementRegistry(defaultUpdatedAt);
  const registry = requireRecord(value, "retirement registry");
  assertCondition(
    registry.marker === RETIREMENT_REGISTRY_MARKER && registry.version === 1,
    "retirement registry marker/version mismatch",
  );
  requireString(
    registry.registry_id,
    "retirement registry.registry_id",
    RETIREMENT_REGISTRY_ID_RE,
    76,
    76,
  );
  parseUtc(registry.updated_at, "retirement registry.updated_at");
  assertCondition(
    Array.isArray(registry.retirements),
    "retirement registry.retirements must be array",
  );
  assertCondition(
    registry.retirements.length <= MAX_RETIREMENTS,
    "retirement count exceeds bound",
  );
  const expected = materializeRetirementRegistryV1(
    registry.retirements,
    registry.updated_at,
  );
  assertCondition(
    canonicalJsonV1(registry) === canonicalJsonV1(expected),
    "retirement registry content ID mismatch",
  );
  const retirementIds = new Set();
  const retiredBindings = new Set();
  for (const recordValue of registry.retirements) {
    const record = validateRetirementRecordV1(recordValue);
    assertCondition(
      !retirementIds.has(record.retirement_id),
      "duplicate retirement_id",
    );
    assertCondition(
      !retiredBindings.has(record.binding_id),
      "multiple retirement records for one binding",
    );
    retirementIds.add(record.retirement_id);
    retiredBindings.add(record.binding_id);
  }
  return registry;
}

function findTargetBinding(registry, expected) {
  const matches = registry.bindings.filter(
    (binding) => binding.binding_id === expected.binding_id,
  );
  assertCondition(
    matches.length === 1,
    `binding lookup count differs: ${matches.length}`,
  );
  const binding = requireRecord(matches[0], "target binding");
  requireString(binding.binding_id, "binding_id", BINDING_ID_RE, 75, 75);
  requireString(binding.credential_id, "credential_id", CREDENTIAL_ID_RE, 74, 74);
  requireString(binding.agent_id, "agent_id", AGENT_RE, 3, 128);
  requireString(
    binding.destination_wc_account,
    "destination_wc_account",
    ACCOUNT_RE,
    3,
    128,
  );
  assertCondition(binding.status === "active", "target binding is not active");
  assertCondition(
    binding.credential_id === expected.credential_id,
    "target binding credential mismatch",
  );
  assertCondition(binding.agent_id === expected.agent_id, "target binding agent mismatch");
  assertCondition(
    binding.destination_wc_account === expected.destination_wc_account,
    "target binding destination mismatch",
  );
  if (binding.revoked_at !== null && binding.revoked_at !== undefined) {
    fail("target binding is already revoked");
  }
  parseUtc(binding.valid_from, "binding.valid_from");
  const validUntil = parseUtc(binding.valid_until, "binding.valid_until");
  return { binding, validUntil };
}

function requireNoActiveConflictsBeyondTarget(registry, target) {
  const credentialConflicts = registry.bindings.filter(
    (item) =>
      item.status === "active"
      && item.credential_id === target.credential_id
      && item.binding_id !== target.binding_id,
  );
  const accountConflicts = registry.bindings.filter(
    (item) =>
      item.status === "active"
      && item.destination_wc_account === target.destination_wc_account
      && item.binding_id !== target.binding_id,
  );
  assertCondition(
    credentialConflicts.length === 0,
    "another active binding exists for the credential",
  );
  assertCondition(
    accountConflicts.length === 0,
    "another active binding exists for the destination account",
  );
}

function exactFalseAuthority(value, label) {
  const authority = requireRecord(value, label);
  const expectedKeys = Object.keys(FALSE_AUTHORITY).sort();
  const actualKeys = Object.keys(authority).sort();
  assertCondition(
    JSON.stringify(actualKeys) === JSON.stringify(expectedKeys),
    `${label} keys mismatch`,
  );
  for (const key of expectedKeys) {
    assertCondition(authority[key] === false, `${label}.${key} must be false`);
  }
  return authority;
}

export function validateRetirementRecordV1(value) {
  const record = requireRecord(value, "retirement record");
  const requiredKeys = [
    "marker",
    "version",
    "retirement_id",
    "binding_id",
    "credential_id",
    "agent_id",
    "destination_wc_account",
    "reason",
    "retired_at",
    "credential_expires_at_utc",
    "credential_revoked_at_utc",
    "original_binding_sha256",
    "original_binding",
    "replacement_binding_created",
    "replacement_credential_id",
    "authority",
  ].sort();
  assertCondition(
    JSON.stringify(Object.keys(record).sort()) === JSON.stringify(requiredKeys),
    "retirement record keys mismatch",
  );
  assertCondition(
    record.marker === RETIREMENT_RECORD_MARKER && record.version === 1,
    "retirement record marker/version mismatch",
  );
  requireString(record.retirement_id, "retirement_id", RETIREMENT_ID_RE, 75, 75);
  requireString(record.binding_id, "binding_id", BINDING_ID_RE, 75, 75);
  requireString(record.credential_id, "credential_id", CREDENTIAL_ID_RE, 74, 74);
  requireString(record.agent_id, "agent_id", AGENT_RE, 3, 128);
  requireString(
    record.destination_wc_account,
    "destination_wc_account",
    ACCOUNT_RE,
    3,
    128,
  );
  assertCondition(record.reason === RETIREMENT_REASON, "retirement reason mismatch");
  parseUtc(record.retired_at, "retired_at");
  parseUtc(record.credential_expires_at_utc, "credential_expires_at_utc");
  if (record.credential_revoked_at_utc !== null) {
    parseUtc(record.credential_revoked_at_utc, "credential_revoked_at_utc");
  }
  requireString(
    record.original_binding_sha256,
    "original_binding_sha256",
    SHA256_RE,
    64,
    64,
  );
  const original = requireRecord(record.original_binding, "original_binding");
  assertCondition(
    sha256BytesV1(Buffer.from(canonicalJsonV1(original), "utf8"))
      === record.original_binding_sha256,
    "original binding SHA mismatch",
  );
  assertCondition(
    original.binding_id === record.binding_id
      && original.credential_id === record.credential_id
      && original.agent_id === record.agent_id
      && original.destination_wc_account === record.destination_wc_account,
    "retirement/original binding identity mismatch",
  );
  assertCondition(
    record.replacement_binding_created === false,
    "retirement cannot create a replacement binding",
  );
  assertCondition(
    record.replacement_credential_id === null,
    "retirement cannot choose a replacement credential",
  );
  exactFalseAuthority(record.authority, "retirement authority");
  const core = { ...record };
  delete core.retirement_id;
  assertCondition(
    record.retirement_id === contentIdV1("voidapwbr1_", core),
    "retirement_id mismatch",
  );
  return record;
}

function buildRetirementRecord({
  binding,
  credentialState,
  retiredAt,
  reason,
}) {
  const core = {
    marker: RETIREMENT_RECORD_MARKER,
    version: 1,
    binding_id: binding.binding_id,
    credential_id: binding.credential_id,
    agent_id: binding.agent_id,
    destination_wc_account: binding.destination_wc_account,
    reason,
    retired_at: retiredAt,
    credential_expires_at_utc: credentialState.expires_at_utc,
    credential_revoked_at_utc: credentialState.revoked_at_utc,
    original_binding_sha256: sha256BytesV1(
      Buffer.from(canonicalJsonV1(binding), "utf8"),
    ),
    original_binding: binding,
    replacement_binding_created: false,
    replacement_credential_id: null,
    authority: FALSE_AUTHORITY,
  };
  return {
    ...core,
    retirement_id: contentIdV1("voidapwbr1_", core),
  };
}

function stagedCore(staged) {
  const core = { ...staged };
  delete core.staged_mutation_id;
  return core;
}

function validateStaged(value) {
  const staged = requireRecord(value, "staged mutation");
  assertCondition(
    staged.marker === RETIREMENT_STAGED_MARKER
      && staged.version === 1
      && staged.operation === "retire_expired_binding",
    "staged mutation marker/version/operation mismatch",
  );
  requireString(
    staged.staged_mutation_id,
    "staged_mutation_id",
    STAGED_ID_RE,
    76,
    76,
  );
  requireString(
    staged.expected_credential_registry_sha256,
    "expected_credential_registry_sha256",
    SHA256_RE,
    64,
    64,
  );
  requireString(
    staged.expected_binding_registry_sha256,
    "expected_binding_registry_sha256",
    SHA256_RE,
    64,
    64,
  );
  if (staged.expected_retirement_registry_sha256 !== null) {
    requireString(
      staged.expected_retirement_registry_sha256,
      "expected_retirement_registry_sha256",
      SHA256_RE,
      64,
      64,
    );
  }
  validateRetirementRecordV1(staged.retirement_record);
  parseBindingRegistry(staged.next_binding_registry);
  parseRetirementRegistry(
    staged.next_retirement_registry,
    staged.retirement_record.retired_at,
  );
  requireString(
    staged.next_binding_registry_sha256,
    "next_binding_registry_sha256",
    SHA256_RE,
    64,
    64,
  );
  requireString(
    staged.next_retirement_registry_sha256,
    "next_retirement_registry_sha256",
    SHA256_RE,
    64,
    64,
  );
  assertCondition(
    staged.next_binding_registry_sha256
      === sha256BytesV1(Buffer.from(`${JSON.stringify(staged.next_binding_registry, null, 2)}\n`, "utf8")),
    "next binding registry file SHA mismatch",
  );
  assertCondition(
    staged.next_retirement_registry_sha256
      === sha256BytesV1(Buffer.from(`${JSON.stringify(staged.next_retirement_registry, null, 2)}\n`, "utf8")),
    "next retirement registry file SHA mismatch",
  );
  assertCondition(staged.live_authority === false, "staged live authority must be false");
  exactFalseAuthority(staged.authority, "staged authority");
  assertCondition(
    staged.staged_mutation_id === contentIdV1("voidapwbrm1_", stagedCore(staged)),
    "staged_mutation_id mismatch",
  );
  return staged;
}

function retirementForBinding(registry, bindingId) {
  return registry.retirements.filter((item) => item.binding_id === bindingId);
}

function fileBytesForJson(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function currentBootId() {
  return requireString(
    readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim(),
    "kernel boot_id",
    /^[0-9a-f-]{36}$/,
    36,
    36,
  );
}

function processStartTicks(pid) {
  const text = readFileSync(`/proc/${pid}/stat`, "utf8");
  const close = text.lastIndexOf(")");
  assertCondition(close > 0, "process stat format mismatch");
  const fields = text.slice(close + 1).trim().split(/\s+/);
  assertCondition(fields.length > 19, "process stat field count mismatch");
  return requireString(
    fields[19],
    "process start ticks",
    /^\d+$/,
    1,
    32,
  );
}

function validateLockRecord(value) {
  const lock = requireExactKeys(value, "operation lock", [
    "marker",
    "version",
    "pid",
    "process_start_ticks",
    "boot_id",
    "staged_mutation_id",
    "acquired_at",
  ]);
  assertCondition(
    lock.marker === RETIREMENT_LOCK_MARKER && lock.version === 1,
    "operation lock marker/version mismatch",
  );
  assertCondition(
    Number.isSafeInteger(lock.pid) && lock.pid >= 1,
    "operation lock pid mismatch",
  );
  requireString(
    lock.process_start_ticks,
    "operation lock process_start_ticks",
    /^\d+$/,
    1,
    32,
  );
  requireString(
    lock.boot_id,
    "operation lock boot_id",
    /^[0-9a-f-]{36}$/,
    36,
    36,
  );
  requireString(
    lock.staged_mutation_id,
    "operation lock staged_mutation_id",
    STAGED_ID_RE,
    76,
    76,
  );
  parseUtc(lock.acquired_at, "operation lock acquired_at");
  return lock;
}

function operationLockIsActive(lock) {
  if (lock.boot_id !== currentBootId()) return false;
  try {
    return processStartTicks(lock.pid) === lock.process_start_ticks;
  } catch (error) {
    if (error && ["ENOENT", "ESRCH"].includes(error.code)) return false;
    throw error;
  }
}

function acquireOperationLock({
  lockPath,
  stagedMutationId,
  acquiredAt,
  staleLockRecoveryConfirmation,
}) {
  const resolved = resolve(lockPath);
  ensurePrivateParent(resolved);
  let staleLockRecovered = false;
  if (existsSync(resolved)) {
    const existing = readJsonFile(resolved, "existing operation lock");
    const lock = validateLockRecord(existing.value);
    if (operationLockIsActive(lock)) {
      fail(
        `active retirement operation lock held by pid ${lock.pid}`,
      );
    }
    assertCondition(
      staleLockRecoveryConfirmation
        === RETIREMENT_STALE_LOCK_RECOVERY_CONFIRMATION,
      "stale retirement operation lock requires exact recovery confirmation",
    );
    unlinkSync(resolved);
    fsyncDirectory(dirname(resolved));
    staleLockRecovered = true;
  }

  const record = {
    marker: RETIREMENT_LOCK_MARKER,
    version: 1,
    pid: process.pid,
    process_start_ticks: processStartTicks(process.pid),
    boot_id: currentBootId(),
    staged_mutation_id: stagedMutationId,
    acquired_at: parseUtc(acquiredAt, "lock acquired_at").toISOString(),
  };
  const descriptor = openSync(resolved, "wx", 0o600);
  try {
    writeFileSync(descriptor, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
  fsyncDirectory(dirname(resolved));

  let released = false;
  const release = () => {
    if (released) return;
    const observed = readJsonFile(resolved, "owned operation lock");
    assertCondition(
      canonicalJsonV1(observed.value) === canonicalJsonV1(record),
      "operation lock ownership changed before release",
    );
    unlinkSync(resolved);
    fsyncDirectory(dirname(resolved));
    released = true;
  };
  return {
    release,
    stale_lock_recovered: staleLockRecovered,
    lock_path: resolved,
  };
}

export function inspectBindingRetirementV1({
  credentialRegistryPath,
  bindingRegistryPath,
  retirementRegistryPath,
  bindingId,
  credentialId,
  agentId,
  destinationWcAccount,
  evaluatedAt,
}) {
  const at = parseUtc(evaluatedAt, "evaluated_at");
  const credentialFile = readJsonFile(credentialRegistryPath, "credential registry");
  const bindingFile = readJsonFile(bindingRegistryPath, "binding registry");
  const retirementFile = readJsonFile(
    retirementRegistryPath,
    "retirement registry",
    true,
  );
  const credentialRegistry = parseCredentialRegistry(credentialFile.value);
  const bindingRegistry = parseBindingRegistry(bindingFile.value);
  const retirementRegistry = parseRetirementRegistry(
    retirementFile?.value ?? null,
    at.toISOString(),
  );
  const credential = findCredential(credentialRegistry, credentialId);
  assertCondition(credential.agent_id === agentId, "credential agent mismatch");
  const { binding, validUntil } = findTargetBinding(bindingRegistry, {
    binding_id: bindingId,
    credential_id: credentialId,
    agent_id: agentId,
    destination_wc_account: destinationWcAccount,
  });
  requireNoActiveConflictsBeyondTarget(bindingRegistry, binding);
  const credentialExpiry = parseUtc(
    credential.expires_at_utc,
    "credential.expires_at_utc",
  );
  const credentialRevocation =
    credential.revoked_at_utc === null || credential.revoked_at_utc === undefined
      ? null
      : parseUtc(credential.revoked_at_utc, "credential.revoked_at_utc");
  const inactive =
    credentialExpiry.getTime() <= at.getTime()
    || (credentialRevocation && credentialRevocation.getTime() <= at.getTime());
  const bindingWindowEnded = validUntil.getTime() <= at.getTime();
  const existingRetirement = retirementForBinding(retirementRegistry, bindingId);
  return {
    marker: RETIREMENT_MARKER,
    command: "inspect",
    evaluated_at: at.toISOString(),
    binding_id: bindingId,
    credential_id: credentialId,
    agent_id: agentId,
    destination_wc_account: destinationWcAccount,
    credential_expired_or_revoked: Boolean(inactive),
    binding_valid_window_ended: bindingWindowEnded,
    existing_retirement_count: existingRetirement.length,
    ready_to_stage_retirement:
      Boolean(inactive) && bindingWindowEnded && existingRetirement.length === 0,
    binding_registry_sha256: bindingFile.sha256,
    retirement_registry_sha256: retirementFile?.sha256 ?? null,
    raw_token_read: false,
    replacement_binding_created: false,
    authority: FALSE_AUTHORITY,
  };
}

export function stageBindingRetirementV1({
  credentialRegistryPath,
  bindingRegistryPath,
  retirementRegistryPath,
  bindingId,
  credentialId,
  agentId,
  destinationWcAccount,
  retiredAt,
  reason,
  outputPath,
}) {
  const retired = parseUtc(retiredAt, "retired_at");
  assertCondition(reason === RETIREMENT_REASON, "unsupported retirement reason");
  const credentialFile = readJsonFile(credentialRegistryPath, "credential registry");
  const bindingFile = readJsonFile(bindingRegistryPath, "binding registry");
  const retirementFile = readJsonFile(
    retirementRegistryPath,
    "retirement registry",
    true,
  );
  const credentialRegistry = parseCredentialRegistry(credentialFile.value);
  const bindingRegistry = parseBindingRegistry(bindingFile.value);
  const retirementRegistry = parseRetirementRegistry(
    retirementFile?.value ?? null,
    retired.toISOString(),
  );
  const credential = findCredential(credentialRegistry, credentialId);
  assertCondition(credential.agent_id === agentId, "credential agent mismatch");
  const credentialState = credentialExpiredOrRevokedAt(credential, retired);
  const { binding, validUntil } = findTargetBinding(bindingRegistry, {
    binding_id: bindingId,
    credential_id: credentialId,
    agent_id: agentId,
    destination_wc_account: destinationWcAccount,
  });
  assertCondition(
    validUntil.getTime() <= retired.getTime(),
    "binding validity window has not ended at retirement time",
  );
  requireNoActiveConflictsBeyondTarget(bindingRegistry, binding);
  assertCondition(
    retirementForBinding(retirementRegistry, bindingId).length === 0,
    "binding already has a retirement record",
  );

  const retirementRecord = buildRetirementRecord({
    binding,
    credentialState,
    retiredAt: retired.toISOString(),
    reason,
  });
  validateRetirementRecordV1(retirementRecord);

  const remainingBindings = bindingRegistry.bindings.filter(
    (item) => item.binding_id !== bindingId,
  );
  assertCondition(
    remainingBindings.length === bindingRegistry.bindings.length - 1,
    "target binding removal count mismatch",
  );
  const nextBindingRegistry = materializeBindingRegistryV1(
    remainingBindings,
    retired.toISOString(),
  );
  const nextRetirementRegistry = materializeRetirementRegistryV1(
    [...retirementRegistry.retirements, retirementRecord],
    retired.toISOString(),
  );
  const core = {
    marker: RETIREMENT_STAGED_MARKER,
    version: 1,
    operation: "retire_expired_binding",
    expected_credential_registry_sha256: credentialFile.sha256,
    expected_binding_registry_sha256: bindingFile.sha256,
    expected_retirement_registry_sha256: retirementFile?.sha256 ?? null,
    retirement_record: retirementRecord,
    next_binding_registry: nextBindingRegistry,
    next_binding_registry_sha256: sha256BytesV1(
      fileBytesForJson(nextBindingRegistry),
    ),
    next_retirement_registry: nextRetirementRegistry,
    next_retirement_registry_sha256: sha256BytesV1(
      fileBytesForJson(nextRetirementRegistry),
    ),
    live_authority: false,
    authority: FALSE_AUTHORITY,
  };
  const staged = {
    ...core,
    staged_mutation_id: contentIdV1("voidapwbrm1_", core),
  };
  validateStaged(staged);
  const writePerformed = writeExclusiveOrVerify(outputPath, staged);
  return {
    marker: RETIREMENT_MARKER,
    command: "stage-retire",
    staged_mutation_id: staged.staged_mutation_id,
    retirement_id: retirementRecord.retirement_id,
    binding_id: bindingId,
    credential_id: credentialId,
    destination_wc_account: destinationWcAccount,
    staged_path: resolve(outputPath),
    staged_write_performed: writePerformed,
    binding_registry_write: false,
    retirement_registry_write: false,
    raw_token_read: false,
    replacement_binding_created: false,
    authority: FALSE_AUTHORITY,
  };
}

function receiptCore({
  staged,
  status,
  appliedAt,
  retirementRegistryWrite,
  bindingRegistryWrite,
  exactDuplicate,
  recoveryCompleted,
  bindingRegistryShaBeforeObserved,
  retirementRegistryShaBeforeObserved,
}) {
  return {
    marker: RETIREMENT_RECEIPT_MARKER,
    version: 1,
    operation: "retire_expired_binding",
    status,
    staged_mutation_id: staged.staged_mutation_id,
    retirement_id: staged.retirement_record.retirement_id,
    binding_id: staged.retirement_record.binding_id,
    credential_id: staged.retirement_record.credential_id,
    agent_id: staged.retirement_record.agent_id,
    destination_wc_account: staged.retirement_record.destination_wc_account,
    applied_at: appliedAt,
    binding_registry_sha256_before_observed: bindingRegistryShaBeforeObserved,
    binding_registry_sha256_after: staged.next_binding_registry_sha256,
    retirement_registry_sha256_before_observed:
      retirementRegistryShaBeforeObserved,
    retirement_registry_sha256_after:
      staged.next_retirement_registry_sha256,
    retirement_registry_write_performed: retirementRegistryWrite,
    binding_registry_write_performed: bindingRegistryWrite,
    exact_duplicate: exactDuplicate,
    recovery_completed: recoveryCompleted,
    account_binding_slot_freed: true,
    replacement_binding_created: false,
    replacement_credential_id: null,
    raw_token_read: false,
    authority: FALSE_AUTHORITY,
  };
}

function validateReceipt(value) {
  const receipt = requireRecord(value, "retirement receipt");
  assertCondition(
    receipt.marker === RETIREMENT_RECEIPT_MARKER && receipt.version === 1,
    "retirement receipt marker/version mismatch",
  );
  requireString(receipt.receipt_id, "receipt_id", RECEIPT_ID_RE, 76, 76);
  requireString(receipt.staged_mutation_id, "staged_mutation_id", STAGED_ID_RE, 76, 76);
  requireString(receipt.retirement_id, "retirement_id", RETIREMENT_ID_RE, 75, 75);
  requireString(receipt.binding_id, "binding_id", BINDING_ID_RE, 75, 75);
  requireString(receipt.credential_id, "credential_id", CREDENTIAL_ID_RE, 74, 74);
  parseUtc(receipt.applied_at, "applied_at");
  assertCondition(
    ["applied", "recovered", "duplicate"].includes(receipt.status),
    "retirement receipt status mismatch",
  );
  requireBoolean(
    receipt.retirement_registry_write_performed,
    "retirement_registry_write_performed",
  );
  requireBoolean(
    receipt.binding_registry_write_performed,
    "binding_registry_write_performed",
  );
  assertCondition(receipt.account_binding_slot_freed === true, "slot not freed");
  assertCondition(receipt.replacement_binding_created === false, "replacement created");
  assertCondition(receipt.replacement_credential_id === null, "replacement selected");
  assertCondition(receipt.raw_token_read === false, "raw token read");
  exactFalseAuthority(receipt.authority, "receipt authority");
  const core = { ...receipt };
  delete core.receipt_id;
  assertCondition(
    receipt.receipt_id === contentIdV1("voidapwbrc1_", core),
    "receipt_id mismatch",
  );
  return receipt;
}

function writeReceipt(receiptPath, core) {
  const receipt = {
    ...core,
    receipt_id: contentIdV1("voidapwbrc1_", core),
  };
  validateReceipt(receipt);
  const writePerformed = writeExclusiveOrVerify(receiptPath, receipt);
  return { receipt, writePerformed };
}

export function applyBindingRetirementV1({
  credentialRegistryPath,
  bindingRegistryPath,
  retirementRegistryPath,
  stagedPath,
  receiptPath,
  lockPath,
  confirmation,
  appliedAt,
  staleLockRecoveryConfirmation = "",
}) {
  assertCondition(
    confirmation === RETIREMENT_CONFIRMATION,
    "retirement confirmation mismatch",
  );
  const applied = parseUtc(appliedAt, "applied_at");
  const stagedFile = readJsonFile(stagedPath, "staged mutation");
  const staged = validateStaged(stagedFile.value);
  const retiredAt = parseUtc(
    staged.retirement_record.retired_at,
    "staged retirement retired_at",
  );
  assertCondition(
    applied.getTime() >= retiredAt.getTime(),
    "applied_at precedes retired_at",
  );

  const lock = acquireOperationLock({
    lockPath,
    stagedMutationId: staged.staged_mutation_id,
    acquiredAt: applied.toISOString(),
    staleLockRecoveryConfirmation,
  });

  try {
    const credentialFile = readJsonFile(
      credentialRegistryPath,
      "credential registry",
    );
    assertCondition(
      credentialFile.sha256 === staged.expected_credential_registry_sha256,
      "credential registry SHA changed after staging",
    );
    const credentialRegistry = parseCredentialRegistry(credentialFile.value);
    const credential = findCredential(
      credentialRegistry,
      staged.retirement_record.credential_id,
    );
    assertCondition(
      credential.agent_id === staged.retirement_record.agent_id,
      "credential agent changed after staging",
    );
    credentialExpiredOrRevokedAt(credential, applied);

    const bindingFile = readJsonFile(
      bindingRegistryPath,
      "binding registry",
    );
    const retirementFile = readJsonFile(
      retirementRegistryPath,
      "retirement registry",
      true,
    );
    const bindingSha = bindingFile.sha256;
    const retirementSha = retirementFile?.sha256 ?? null;

    const finalBinding =
      bindingSha === staged.next_binding_registry_sha256;
    const finalRetirement =
      retirementSha === staged.next_retirement_registry_sha256;
    const beforeBinding =
      bindingSha === staged.expected_binding_registry_sha256;
    const beforeRetirement =
      retirementSha === staged.expected_retirement_registry_sha256;

    if (finalBinding && finalRetirement) {
      if (existsSync(resolve(receiptPath))) {
        const existingFile = readJsonFile(
          receiptPath,
          "existing retirement receipt",
        );
        const existing = validateReceipt(existingFile.value);
        assertCondition(
          existing.staged_mutation_id === staged.staged_mutation_id,
          "existing receipt staged mutation mismatch",
        );
        assertCondition(
          existing.retirement_id
            === staged.retirement_record.retirement_id,
          "existing receipt retirement identity mismatch",
        );
        assertCondition(
          existing.binding_registry_sha256_after
            === staged.next_binding_registry_sha256,
          "existing receipt binding final SHA mismatch",
        );
        assertCondition(
          existing.retirement_registry_sha256_after
            === staged.next_retirement_registry_sha256,
          "existing receipt retirement final SHA mismatch",
        );
        return {
          ...existing,
          operation_status: "duplicate",
          exact_replay: true,
          stale_lock_recovered: lock.stale_lock_recovered,
          lock_path: lock.lock_path,
          receipt_path: resolve(receiptPath),
          receipt_write_performed: false,
        };
      }

      const core = receiptCore({
        staged,
        status: "duplicate",
        appliedAt: applied.toISOString(),
        retirementRegistryWrite: false,
        bindingRegistryWrite: false,
        exactDuplicate: true,
        recoveryCompleted: false,
        bindingRegistryShaBeforeObserved: bindingSha,
        retirementRegistryShaBeforeObserved: retirementSha,
      });
      const { receipt, writePerformed } = writeReceipt(
        receiptPath,
        core,
      );
      return {
        ...receipt,
        operation_status: "duplicate",
        exact_replay: true,
        stale_lock_recovered: lock.stale_lock_recovered,
        lock_path: lock.lock_path,
        receipt_path: resolve(receiptPath),
        receipt_write_performed: writePerformed,
      };
    }

    assertCondition(
      beforeBinding,
      "binding registry is neither staged prestate nor exact final state",
    );

    let retirementRegistryWrite = false;
    let recoveryCompleted = false;

    if (!finalRetirement) {
      assertCondition(
        beforeRetirement,
        "retirement registry is neither staged prestate nor exact final state",
      );
      atomicWriteJson(
        retirementRegistryPath,
        staged.next_retirement_registry,
      );
      const observed = readJsonFile(
        retirementRegistryPath,
        "written retirement registry",
      );
      assertCondition(
        observed.sha256 === staged.next_retirement_registry_sha256,
        "retirement registry post-write SHA mismatch",
      );
      retirementRegistryWrite = true;
    } else {
      recoveryCompleted = true;
    }

    // Safety ordering: retirement evidence is durable before the active slot is freed.
    const durableRetirement = readJsonFile(
      retirementRegistryPath,
      "durable retirement registry",
    );
    assertCondition(
      durableRetirement.sha256 === staged.next_retirement_registry_sha256,
      "retirement evidence is not durable before binding removal",
    );

    // Re-read the binding prestate under the exclusive operation lock before
    // replacement. This closes the verify/write race for all cooperating
    // retirement invocations.
    const bindingImmediatelyBeforeWrite = readJsonFile(
      bindingRegistryPath,
      "binding registry immediately before write",
    );
    assertCondition(
      bindingImmediatelyBeforeWrite.sha256
        === staged.expected_binding_registry_sha256,
      "binding registry changed after locked prestate verification",
    );

    atomicWriteJson(bindingRegistryPath, staged.next_binding_registry);
    const finalBindingFile = readJsonFile(
      bindingRegistryPath,
      "written binding registry",
    );
    assertCondition(
      finalBindingFile.sha256 === staged.next_binding_registry_sha256,
      "binding registry post-write SHA mismatch",
    );

    const status = recoveryCompleted ? "recovered" : "applied";
    const core = receiptCore({
      staged,
      status,
      appliedAt: applied.toISOString(),
      retirementRegistryWrite,
      bindingRegistryWrite: true,
      exactDuplicate: false,
      recoveryCompleted,
      bindingRegistryShaBeforeObserved: bindingSha,
      retirementRegistryShaBeforeObserved: retirementSha,
    });
    const { receipt, writePerformed } = writeReceipt(
      receiptPath,
      core,
    );
    return {
      ...receipt,
      operation_status: status,
      exact_replay: false,
      stale_lock_recovered: lock.stale_lock_recovered,
      lock_path: lock.lock_path,
      receipt_path: resolve(receiptPath),
      receipt_write_performed: writePerformed,
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
  if (args.command === "inspect") {
    printJson(
      inspectBindingRetirementV1({
        credentialRegistryPath: required(args, "credential_registry"),
        bindingRegistryPath: required(args, "binding_registry"),
        retirementRegistryPath: required(args, "retirement_registry"),
        bindingId: required(args, "binding_id"),
        credentialId: required(args, "credential_id"),
        agentId: required(args, "agent_id"),
        destinationWcAccount: required(args, "destination_wc_account"),
        evaluatedAt: required(args, "evaluated_at"),
      }),
    );
    return;
  }
  if (args.command === "stage-retire") {
    printJson(
      stageBindingRetirementV1({
        credentialRegistryPath: required(args, "credential_registry"),
        bindingRegistryPath: required(args, "binding_registry"),
        retirementRegistryPath: required(args, "retirement_registry"),
        bindingId: required(args, "binding_id"),
        credentialId: required(args, "credential_id"),
        agentId: required(args, "agent_id"),
        destinationWcAccount: required(args, "destination_wc_account"),
        retiredAt: required(args, "retired_at"),
        reason: required(args, "reason"),
        outputPath: required(args, "output"),
      }),
    );
    return;
  }
  if (args.command === "apply-retire") {
    printJson(
      applyBindingRetirementV1({
        credentialRegistryPath: required(args, "credential_registry"),
        bindingRegistryPath: required(args, "binding_registry"),
        retirementRegistryPath: required(args, "retirement_registry"),
        stagedPath: required(args, "staged"),
        receiptPath: required(args, "receipt"),
        lockPath: required(args, "lock"),
        confirmation: required(args, "confirm"),
        appliedAt: required(args, "applied_at"),
        staleLockRecoveryConfirmation:
          args.recover_stale_lock_confirm ?? "",
      }),
    );
    return;
  }
  fail("command must be inspect, stage-retire, or apply-retire");
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
