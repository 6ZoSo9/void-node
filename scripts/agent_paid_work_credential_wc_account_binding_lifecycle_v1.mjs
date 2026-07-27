#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const MARKER = "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_LIFECYCLE_V1";
const REGISTRY_MARKER = "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_REGISTRY_V1";
const BINDING_MARKER = "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_V1";
const STAGED_MARKER = "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_STAGED_MUTATION_V1";
const RECEIPT_MARKER = "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_APPLY_RECEIPT_V1";
const CONFIRM = "apply-agent-paid-work-credential-wc-account-binding-v1";
const ACCOUNT_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const CREDENTIAL_RE = /^voidapwc1_[0-9a-f]{64}$/;

function die(message) {
  process.stderr.write(`HOLD: ${message}\n`);
  process.exit(2);
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonical(value[key])}`
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256Bytes(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256File(file) {
  return sha256Bytes(fs.readFileSync(file));
}

function contentId(prefix, value) {
  return `${prefix}${sha256Bytes(Buffer.from(canonical(value), "utf8"))}`;
}

function readJson(file, label) {
  let info;
  try {
    info = fs.lstatSync(file);
  } catch {
    die(`${label} missing: ${file}`);
  }
  if (!info.isFile() || info.isSymbolicLink()) {
    die(`${label} must be a regular non-symlink file: ${file}`);
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    die(`${label} is not valid JSON: ${String(error?.message || error)}`);
  }
}

function readOptionalRegistry(file) {
  try {
    const info = fs.lstatSync(file);
    if (!info.isFile() || info.isSymbolicLink()) {
      die(`binding registry must be a regular non-symlink file: ${file}`);
    }
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    if (value?.marker !== REGISTRY_MARKER || value?.version !== 1 || !Array.isArray(value?.bindings)) {
      die("binding registry contract mismatch");
    }
    return {exists: true, value, sha256: sha256File(file)};
  } catch (error) {
    if (error?.code === "ENOENT") {
      return {exists: false, value: null, sha256: null};
    }
    if (String(error?.message || error).includes("binding registry")) throw error;
    die(`binding registry is not valid JSON: ${String(error?.message || error)}`);
  }
}

function walkObjects(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) walkObjects(item, output);
  } else if (value && typeof value === "object") {
    output.push(value);
    for (const item of Object.values(value)) walkObjects(item, output);
  }
  return output;
}

function findCredential(registry, credentialId) {
  const matches = walkObjects(registry).filter((item) => item.credential_id === credentialId);
  if (matches.length !== 1) die(`credential lookup count differs: ${matches.length}`);
  return matches[0];
}

function assertActiveCredential(record, agentId) {
  const state = String(record.status || record.state || "").toLowerCase();
  const revoked = Boolean(
    record.revoked || record.revoked_at ||
    ["revoked", "disabled", "inactive"].includes(state)
  );
  if (revoked || record.enabled === false) die("credential is not active");
  if (record.agent_id !== agentId) die("credential agent_id mismatch");
  if (!CREDENTIAL_RE.test(String(record.credential_id || ""))) die("credential_id format mismatch");
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = {command};
  for (let index = 0; index < rest.length; index += 1) {
    const item = rest[index];
    if (!item.startsWith("--")) die(`unexpected argument: ${item}`);
    const key = item.slice(2).replaceAll("-", "_");
    if (index + 1 >= rest.length) die(`missing value for ${item}`);
    args[key] = rest[++index];
  }
  return args;
}

function requireArg(args, key) {
  const value = args[key];
  if (typeof value !== "string" || !value) die(`missing --${key.replaceAll("_", "-")}`);
  return value;
}

function requireIso(value, label) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) {
    die(`${label} must be canonical ISO-8601`);
  }
  return date;
}

function atomicWriteJson(file, value, mode = 0o600) {
  const parent = path.dirname(file);
  fs.mkdirSync(parent, {recursive: true, mode: 0o700});
  const parentInfo = fs.lstatSync(parent);
  if (!parentInfo.isDirectory() || parentInfo.isSymbolicLink()) {
    die(`output parent invalid: ${parent}`);
  }
  const temp = path.join(parent, `.${path.basename(file)}.tmp-${process.pid}`);
  const fd = fs.openSync(temp, "wx", mode);
  try {
    fs.writeFileSync(fd, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.chmodSync(temp, mode);
  fs.renameSync(temp, file);
}

function materializeRegistry(bindings, updatedAt) {
  const sorted = [...bindings].sort((left, right) =>
    left.credential_id.localeCompare(right.credential_id) ||
    left.binding_id.localeCompare(right.binding_id)
  );
  const core = {
    marker: REGISTRY_MARKER,
    version: 1,
    updated_at: updatedAt,
    bindings: sorted
  };
  return {registry_id: contentId("voidapwcbr1_", core), ...core};
}

function makeReceipt({staged, existingSha, afterSha, writePerformed, duplicate, appliedAt}) {
  const core = {
    marker: RECEIPT_MARKER,
    version: 1,
    operation: "bind",
    staged_mutation_id: staged.staged_mutation_id,
    binding_id: staged.binding.binding_id,
    credential_id: staged.binding.credential_id,
    destination_wc_account: staged.binding.destination_wc_account,
    registry_sha256_before: existingSha,
    registry_sha256_after: afterSha,
    write_performed: writePerformed,
    duplicate,
    applied_at: appliedAt,
    authority: staged.binding.authority,
    raw_token_read: false
  };
  return {receipt_id: contentId("voidapwcbrc1_", core), ...core};
}

function stageBind(args) {
  const credentialRegistryPath = requireArg(args, "credential_registry");
  const bindingRegistryPath = requireArg(args, "binding_registry");
  const output = requireArg(args, "output");
  const credentialId = requireArg(args, "credential_id");
  const agentId = requireArg(args, "agent_id");
  const destination = requireArg(args, "destination_wc_account");
  const validFromText = requireArg(args, "valid_from");
  const validUntilText = requireArg(args, "valid_until");
  const createdAtText = requireArg(args, "created_at");

  if (!CREDENTIAL_RE.test(credentialId)) die("credential_id format mismatch");
  if (!ACCOUNT_RE.test(destination)) die("destination WC account format mismatch");
  const validFrom = requireIso(validFromText, "valid_from");
  const validUntil = requireIso(validUntilText, "valid_until");
  requireIso(createdAtText, "created_at");
  if (validUntil <= validFrom) die("valid_until must be after valid_from");

  const credentialRegistry = readJson(credentialRegistryPath, "credential registry");
  const credential = findCredential(credentialRegistry, credentialId);
  assertActiveCredential(credential, agentId);
  const credentialRegistrySha = sha256File(credentialRegistryPath);
  const existing = readOptionalRegistry(bindingRegistryPath);

  const activeForCredential = (existing.value?.bindings || []).filter(
    (item) => item.status === "active" && item.credential_id === credentialId
  );
  const activeForAccount = (existing.value?.bindings || []).filter(
    (item) => item.status === "active" && item.destination_wc_account === destination
  );
  if (activeForCredential.length > 0) die("credential already has an active WC-account binding");
  if (activeForAccount.length > 0) die("destination WC account already has an active credential binding");

  const authority = {
    paid_work_submission_identity: true,
    wc_award_destination: true,
    payment: false,
    wc_ledger_write: false,
    wc_to_void_settlement: false,
    wallet_or_signer: false
  };
  const bindingCore = {
    marker: BINDING_MARKER,
    credential_id: credentialId,
    agent_id: agentId,
    destination_wc_account: destination,
    status: "active",
    valid_from: validFromText,
    valid_until: validUntilText,
    revoked_at: null,
    uniqueness_key: `paid-work-credential-wc-account:${credentialId}`,
    source: {
      credential_registry_sha256: credentialRegistrySha,
      review_decision_id: args.review_decision_id || null,
      issuance_preparation_id: args.issuance_preparation_id || null
    },
    authority,
    created_at: createdAtText
  };
  const binding = {
    binding_id: contentId("voidapwcb1_", bindingCore),
    ...bindingCore
  };
  const stagedCore = {
    marker: STAGED_MARKER,
    version: 1,
    operation: "bind",
    expected_credential_registry_sha256: credentialRegistrySha,
    expected_binding_registry_sha256: existing.sha256,
    binding,
    live_authority: false
  };
  const staged = {
    staged_mutation_id: contentId("voidapwcbm1_", stagedCore),
    ...stagedCore
  };
  atomicWriteJson(output, staged);
  process.stdout.write(`${JSON.stringify({
    marker: MARKER,
    command: "stage-bind",
    staged_mutation_id: staged.staged_mutation_id,
    binding_id: binding.binding_id,
    credential_id: credentialId,
    agent_id: agentId,
    destination_wc_account: destination,
    raw_token_read: false,
    payment_authorized: false,
    wc_ledger_write_authorized: false,
    wc_to_void_settlement_authorized: false,
    wallet_or_signer_access: false
  })}\n`);
}

function apply(args) {
  const credentialRegistryPath = requireArg(args, "credential_registry");
  const bindingRegistryPath = requireArg(args, "binding_registry");
  const stagedPath = requireArg(args, "staged");
  const receiptPath = requireArg(args, "receipt");
  const confirm = requireArg(args, "confirm");
  const appliedAt = requireArg(args, "applied_at");
  requireIso(appliedAt, "applied_at");
  if (confirm !== CONFIRM) die("confirmation token mismatch");

  const staged = readJson(stagedPath, "staged binding mutation");
  if (
    staged?.marker !== STAGED_MARKER ||
    staged?.version !== 1 ||
    staged?.operation !== "bind"
  ) {
    die("staged mutation contract mismatch");
  }
  const stagedCore = {
    marker: staged.marker,
    version: staged.version,
    operation: staged.operation,
    expected_credential_registry_sha256: staged.expected_credential_registry_sha256,
    expected_binding_registry_sha256: staged.expected_binding_registry_sha256,
    binding: staged.binding,
    live_authority: staged.live_authority
  };
  if (staged.staged_mutation_id !== contentId("voidapwcbm1_", stagedCore)) {
    die("staged mutation ID mismatch");
  }
  if (staged.live_authority !== false) die("staged mutation live authority must be false");

  const credentialRegistry = readJson(credentialRegistryPath, "credential registry");
  const credentialSha = sha256File(credentialRegistryPath);
  if (credentialSha !== staged.expected_credential_registry_sha256) {
    die("credential registry SHA changed after staging");
  }
  const credential = findCredential(credentialRegistry, staged.binding.credential_id);
  assertActiveCredential(credential, staged.binding.agent_id);

  const existing = readOptionalRegistry(bindingRegistryPath);
  const bindings = [...(existing.value?.bindings || [])];
  const exact = bindings.find(
    (item) =>
      item.binding_id === staged.binding.binding_id &&
      canonical(item) === canonical(staged.binding)
  );

  // Exact replay is idempotent even though the registry SHA necessarily changed
  // after the first successful apply. No second registry write occurs.
  if (exact) {
    const receipt = makeReceipt({
      staged,
      existingSha: existing.sha256,
      afterSha: existing.sha256,
      writePerformed: false,
      duplicate: true,
      appliedAt
    });
    atomicWriteJson(receiptPath, receipt);
    process.stdout.write(`${JSON.stringify(receipt)}\n`);
    return;
  }

  // Non-identical mutations remain bound to the exact staged prestate.
  if (existing.sha256 !== staged.expected_binding_registry_sha256) {
    die("binding registry SHA changed after staging");
  }

  const conflictCredential = bindings.find(
    (item) =>
      item.status === "active" &&
      item.credential_id === staged.binding.credential_id
  );
  if (conflictCredential) die("conflicting active binding for credential");
  const conflictAccount = bindings.find(
    (item) =>
      item.status === "active" &&
      item.destination_wc_account === staged.binding.destination_wc_account
  );
  if (conflictAccount) die("conflicting active binding for destination WC account");

  const next = materializeRegistry([...bindings, staged.binding], appliedAt);
  atomicWriteJson(bindingRegistryPath, next);
  const afterSha = sha256File(bindingRegistryPath);
  const receipt = makeReceipt({
    staged,
    existingSha: existing.sha256,
    afterSha,
    writePerformed: true,
    duplicate: false,
    appliedAt
  });
  atomicWriteJson(receiptPath, receipt);
  process.stdout.write(`${JSON.stringify(receipt)}\n`);
}

function inspect(args) {
  const credentialRegistryPath = requireArg(args, "credential_registry");
  const bindingRegistryPath = requireArg(args, "binding_registry");
  const credentialRegistry = readJson(credentialRegistryPath, "credential registry");
  const bindingRegistry = readOptionalRegistry(bindingRegistryPath);
  const credentials = walkObjects(credentialRegistry)
    .filter((item) => typeof item.credential_id === "string")
    .map((item) => ({
      credential_id: item.credential_id,
      agent_id: item.agent_id || null,
      active:
        !Boolean(item.revoked || item.revoked_at) &&
        item.enabled !== false &&
        !["revoked", "disabled", "inactive"].includes(
          String(item.status || item.state || "").toLowerCase()
        )
    }));
  process.stdout.write(`${JSON.stringify({
    marker: MARKER,
    command: "inspect",
    credential_registry_sha256: sha256File(credentialRegistryPath),
    credential_count: credentials.length,
    credentials,
    binding_registry_exists: bindingRegistry.exists,
    binding_registry_sha256: bindingRegistry.sha256,
    binding_count: bindingRegistry.value?.bindings?.length || 0,
    bindings: (bindingRegistry.value?.bindings || []).map((item) => ({
      binding_id: item.binding_id,
      credential_id: item.credential_id,
      agent_id: item.agent_id,
      destination_wc_account: item.destination_wc_account,
      status: item.status,
      valid_until: item.valid_until,
      authority: item.authority
    })),
    raw_token_read: false,
    payment_authorized: false,
    wc_ledger_write_authorized: false,
    wc_to_void_settlement_authorized: false,
    wallet_or_signer_access: false
  })}\n`);
}

const args = parseArgs(process.argv.slice(2));
if (args.command === "inspect") inspect(args);
else if (args.command === "stage-bind") stageBind(args);
else if (args.command === "apply") apply(args);
else die("command must be inspect, stage-bind, or apply");
