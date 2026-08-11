#!/usr/bin/env node
import { createHash } from "node:crypto";
import { chmodSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  VOID_NODE_FLEET_PROCESS_RESTART_ROLLOUT_V1,
  assessRolloutStateV1,
  validateFullFreshnessAuditV1,
  validateRolloutStateV1,
} from "./void-node-fleet-process-restart-rollout-v1.mjs";

export const VOID_NODE_FLEET_RUNTIME_STABILITY_VERIFICATION_V1 =
  "VOID_NODE_FLEET_RUNTIME_STABILITY_VERIFICATION_V1";

const SHA40_RE = /^[0-9a-f]{40}$/;
const SHA64_RE = /^[0-9a-f]{64}$/;
const DEFAULT_MIN_STABILITY_SECONDS = 30;
const DEFAULT_MAX_EVIDENCE_AGE_SECONDS = 300;
const MAX_BOUND_SECONDS = 3600;
const AUTHORITY_V1 = {
  evidence_file_create_only: true,
  fleet_audit_invoked: false,
  git_mutation: false,
  package_install: false,
  build: false,
  service_stop: false,
  service_start_or_restart: false,
  deployment: false,
  network_configuration: false,
  credential_read: false,
  wallet_or_signer: false,
  transaction: false,
  funds_moved: false,
};

function fail(message) {
  const error = new Error(message);
  error.name = "VoidFleetRuntimeStabilityVerificationError";
  throw error;
}

function stableJson(value) {
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort()
      .map((key) => JSON.stringify(key) + ":" + stableJson(value[key]))
      .join(",") + "}";
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256")
    .update(typeof value === "string" ? value : stableJson(value))
    .digest("hex");
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      stableJson(Object.keys(value).sort()) !== stableJson([...expected].sort())) {
    fail(label + " keys do not match the exact v1 contract");
  }
}

function exactObject(value, expected, label) {
  if (!value || stableJson(value) !== stableJson(expected)) {
    fail(label + " does not match the exact v1 contract");
  }
}

function assertSha40(value, label) {
  if (!SHA40_RE.test(String(value ?? ""))) fail(label + " must be lowercase 40-hex");
  return String(value);
}

function assertSha64(value, label) {
  if (!SHA64_RE.test(String(value ?? ""))) fail(label + " must be lowercase 64-hex");
  return String(value);
}

function assertBoundedInteger(value, minimum, maximum, label) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    fail(label + " must be an integer in " + minimum + ".." + maximum);
  }
  return value;
}

function assertSafePath(value, label) {
  if (typeof value !== "string" || value.length === 0 || /[^\x20-\x7e]/.test(value)) {
    fail(label + " must be a non-empty printable path");
  }
  if (value !== "~" && !value.startsWith("~/") && !value.startsWith("/")) {
    fail(label + " must be absolute or begin with ~/");
  }
  return value;
}

function expandHome(value) {
  if (value === "~") return homedir();
  if (value.startsWith("~/")) return resolve(homedir(), value.slice(2));
  return value;
}

function assertFreshPath(path, label, maxAgeSeconds) {
  const ageSeconds = (Date.now() - statSync(path).mtimeMs) / 1000;
  if (ageSeconds < -5) fail(label + " file timestamp is in the future");
  if (ageSeconds > maxAgeSeconds) {
    fail(label + " file is stale (" + Math.floor(ageSeconds) + "s old)");
  }
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(label + " is not valid JSON: " + String(error?.message || error));
  }
}

function nodeByName(audit, name, label) {
  const node = audit.nodes.find((entry) => entry.name === name);
  if (!node) fail(label + " is missing node " + name);
  return node;
}

function rolloutAuthority(value) {
  if (typeof value?.rollout_evidence_state_advanced !== "boolean") {
    fail("final rollout authority must declare rollout_evidence_state_advanced");
  }
  return {
    rollout_evidence_state_advanced: value.rollout_evidence_state_advanced,
    git_mutation: false,
    package_install: false,
    build: false,
    service_stop: false,
    service_start_or_restart: false,
    deployment: false,
    network_configuration: false,
    credential_material_exposed: false,
    wallet_or_signer: false,
    transaction: false,
    funds_moved: false,
  };
}

export function validateCompletedRolloutV1(finalRollout, finalAudit, configInput, options = {}) {
  exactKeys(finalRollout, [
    "marker", "version", "outcome", "state", "current_audit_id_sha256", "next_node",
    "reasons", "mutation_attempted", "automatic_retry", "restart_command_invoked", "authority",
  ], "final rollout");
  if (finalRollout.marker !== VOID_NODE_FLEET_PROCESS_RESTART_ROLLOUT_V1 ||
      finalRollout.version !== 1 || finalRollout.outcome !== "FLEET_PROCESS_FRESH" ||
      finalRollout.next_node !== null || !Array.isArray(finalRollout.reasons) ||
      finalRollout.reasons.length !== 0 || finalRollout.mutation_attempted !== false ||
      finalRollout.automatic_retry !== false || finalRollout.restart_command_invoked !== false) {
    fail("final rollout does not prove exact FLEET_PROCESS_FRESH completion");
  }
  exactObject(finalRollout.authority, rolloutAuthority(finalRollout.authority), "final rollout authority");

  const stateValidated = validateRolloutStateV1(finalRollout.state, configInput);
  if (stateValidated.state.completed.length !== stateValidated.state.stale_order.length) {
    fail("final rollout state has incomplete stale-node receipts");
  }
  const finalValidated = validateFullFreshnessAuditV1(finalAudit, configInput, {
    nowMs: options.nowMs,
    maxAgeSeconds: options.maxAgeSeconds,
  });
  if (finalValidated.decision !== "PROCESS_FRESH") {
    fail("final audit must prove PROCESS_FRESH");
  }
  if (finalRollout.current_audit_id_sha256 !== finalValidated.audit_id_sha256) {
    fail("final rollout current audit ID does not match the supplied final audit");
  }
  const assessment = assessRolloutStateV1(stateValidated, finalValidated);
  if (!assessment.ok || !assessment.all_complete || assessment.next_node !== null ||
      assessment.reasons.length !== 0) {
    fail("final rollout state and final audit do not reproduce full completion");
  }
  return {
    final_rollout: finalRollout,
    final_rollout_receipt_sha256: sha256(finalRollout),
    state: stateValidated.state,
    final: finalValidated,
  };
}

function stabilityDigestPayload(receipt) {
  return {
    marker: VOID_NODE_FLEET_RUNTIME_STABILITY_VERIFICATION_V1,
    version: 1,
    outcome: "FLEET_RUNTIME_STABLE",
    final_rollout_receipt_sha256: receipt.final_rollout_receipt_sha256,
    rollout_state_id_sha256: receipt.rollout_state_id_sha256,
    final_audit_id_sha256: receipt.final_audit_id_sha256,
    final_audit_receipt_sha256: receipt.final_audit_receipt_sha256,
    verification_audit_id_sha256: receipt.verification_audit_id_sha256,
    verification_audit_receipt_sha256: receipt.verification_audit_receipt_sha256,
    source_sha: receipt.source_sha,
    source_tree: receipt.source_tree,
    node_order: receipt.node_order,
    minimum_stability_seconds: receipt.minimum_stability_seconds,
    node_evidence: receipt.node_evidence,
    mutation_attempted: false,
    automatic_retry: false,
    audit_command_invoked: false,
    restart_command_invoked: false,
    authority: AUTHORITY_V1,
  };
}

export function validateRuntimeStabilityVerificationV1(receipt) {
  exactKeys(receipt, [
    "marker", "version", "outcome", "stability_id_sha256", "final_rollout_receipt_sha256",
    "rollout_state_id_sha256", "final_audit_id_sha256", "final_audit_receipt_sha256",
    "verification_audit_id_sha256", "verification_audit_receipt_sha256",
    "source_sha", "source_tree", "node_order", "minimum_stability_seconds", "node_evidence",
    "mutation_attempted", "automatic_retry", "audit_command_invoked", "restart_command_invoked",
    "authority",
  ], "stability receipt");
  if (receipt.marker !== VOID_NODE_FLEET_RUNTIME_STABILITY_VERIFICATION_V1 ||
      receipt.version !== 1 || receipt.outcome !== "FLEET_RUNTIME_STABLE" ||
      receipt.mutation_attempted !== false || receipt.automatic_retry !== false ||
      receipt.audit_command_invoked !== false || receipt.restart_command_invoked !== false) {
    fail("stability receipt result flags are invalid");
  }
  for (const [value, label] of [
    [receipt.stability_id_sha256, "stability ID"],
    [receipt.final_rollout_receipt_sha256, "final rollout receipt digest"],
    [receipt.rollout_state_id_sha256, "rollout state ID"],
    [receipt.final_audit_id_sha256, "final audit ID"],
    [receipt.final_audit_receipt_sha256, "final audit receipt digest"],
    [receipt.verification_audit_id_sha256, "verification audit ID"],
    [receipt.verification_audit_receipt_sha256, "verification audit receipt digest"],
  ]) assertSha64(value, label);
  assertSha40(receipt.source_sha, "stability source SHA");
  assertSha40(receipt.source_tree, "stability source tree");
  assertBoundedInteger(
    receipt.minimum_stability_seconds,
    DEFAULT_MIN_STABILITY_SECONDS,
    MAX_BOUND_SECONDS,
    "minimum stability seconds",
  );
  if (!Array.isArray(receipt.node_order) || receipt.node_order.length < 1 ||
      !Array.isArray(receipt.node_evidence) ||
      receipt.node_evidence.length !== receipt.node_order.length) {
    fail("stability receipt node arrays are invalid");
  }
  const seen = new Set();
  for (let index = 0; index < receipt.node_evidence.length; index += 1) {
    const entry = receipt.node_evidence[index];
    exactKeys(entry, [
      "name", "process_start_epoch", "head_transition_epoch", "final_observed_at_epoch",
      "verification_observed_at_epoch", "observed_stability_seconds",
    ], "node evidence[" + index + "]");
    if (typeof entry.name !== "string" || entry.name !== receipt.node_order[index] ||
        seen.has(entry.name)) {
      fail("stability receipt node order is invalid");
    }
    seen.add(entry.name);
    for (const [value, label] of [
      [entry.process_start_epoch, "process start"],
      [entry.head_transition_epoch, "head transition"],
      [entry.final_observed_at_epoch, "final observation"],
      [entry.verification_observed_at_epoch, "verification observation"],
    ]) {
      if (!Number.isSafeInteger(value) || value < 1) {
        fail(entry.name + " " + label + " must be a positive safe integer");
      }
    }
    const observed = entry.verification_observed_at_epoch - entry.final_observed_at_epoch;
    if (entry.observed_stability_seconds !== observed ||
        observed < receipt.minimum_stability_seconds) {
      fail(entry.name + " stability interval is invalid");
    }
  }
  exactObject(receipt.authority, AUTHORITY_V1, "stability authority");
  const expectedId = sha256(stabilityDigestPayload(receipt));
  if (receipt.stability_id_sha256 !== expectedId) {
    fail("stability ID does not match normalized content");
  }
  return receipt;
}

export function buildRuntimeStabilityVerificationV1(input) {
  const minimumStabilitySeconds = assertBoundedInteger(
    input.minimumStabilitySeconds ?? DEFAULT_MIN_STABILITY_SECONDS,
    DEFAULT_MIN_STABILITY_SECONDS,
    MAX_BOUND_SECONDS,
    "minimum stability seconds",
  );
  const maxEvidenceAgeSeconds = assertBoundedInteger(
    input.maxEvidenceAgeSeconds ?? DEFAULT_MAX_EVIDENCE_AGE_SECONDS,
    minimumStabilitySeconds,
    MAX_BOUND_SECONDS,
    "maximum evidence age seconds",
  );
  const completed = validateCompletedRolloutV1(
    input.finalRollout,
    input.finalAudit,
    input.configInput,
    { nowMs: input.nowMs, maxAgeSeconds: maxEvidenceAgeSeconds },
  );
  const verification = validateFullFreshnessAuditV1(
    input.verificationAudit,
    input.configInput,
    { nowMs: input.nowMs, maxAgeSeconds: maxEvidenceAgeSeconds },
  );
  if (verification.decision !== "PROCESS_FRESH") {
    fail("verification audit must prove PROCESS_FRESH");
  }
  const finalAuditReceiptSha256 = sha256(completed.final.audit);
  const verificationAuditReceiptSha256 = sha256(verification.audit);
  if (verificationAuditReceiptSha256 === finalAuditReceiptSha256) {
    fail("verification audit must be a distinct later full receipt");
  }
  if (verification.source_sha !== completed.final.source_sha) {
    fail("verification audit source SHA changed after rollout completion");
  }
  if (verification.source_tree !== completed.final.source_tree) {
    fail("verification audit source tree changed after rollout completion");
  }
  if (stableJson(verification.node_order) !== stableJson(completed.final.node_order)) {
    fail("verification audit node order changed after rollout completion");
  }

  const nodeEvidence = completed.final.node_order.map((name) => {
    const finalNode = nodeByName(completed.final.audit, name, "final audit");
    const verificationNode = nodeByName(verification.audit, name, "verification audit");
    if (finalNode.classification !== "PROCESS_SOURCE_ALIGNED" ||
        verificationNode.classification !== "PROCESS_SOURCE_ALIGNED") {
      fail(name + " is not aligned in both stability observations");
    }
    if (verificationNode.process_start_epoch !== finalNode.process_start_epoch) {
      fail(name + " process identity changed during the stability interval");
    }
    if (verificationNode.head_transition_epoch !== finalNode.head_transition_epoch) {
      fail(name + " source transition epoch changed during the stability interval");
    }
    const observedStabilitySeconds =
      verificationNode.observed_at_epoch - finalNode.observed_at_epoch;
    if (observedStabilitySeconds < minimumStabilitySeconds) {
      fail(name + " stability interval is shorter than the required minimum");
    }
    return {
      name,
      process_start_epoch: finalNode.process_start_epoch,
      head_transition_epoch: finalNode.head_transition_epoch,
      final_observed_at_epoch: finalNode.observed_at_epoch,
      verification_observed_at_epoch: verificationNode.observed_at_epoch,
      observed_stability_seconds: observedStabilitySeconds,
    };
  });

  const payload = stabilityDigestPayload({
    final_rollout_receipt_sha256: completed.final_rollout_receipt_sha256,
    rollout_state_id_sha256: completed.state.state_id_sha256,
    final_audit_id_sha256: completed.final.audit_id_sha256,
    final_audit_receipt_sha256: finalAuditReceiptSha256,
    verification_audit_id_sha256: verification.audit_id_sha256,
    verification_audit_receipt_sha256: verificationAuditReceiptSha256,
    source_sha: verification.source_sha,
    source_tree: verification.source_tree,
    node_order: verification.node_order,
    minimum_stability_seconds: minimumStabilitySeconds,
    node_evidence: nodeEvidence,
  });
  return validateRuntimeStabilityVerificationV1({
    ...payload,
    stability_id_sha256: sha256(payload),
  });
}

function parseInteger(value, label) {
  if (!/^[1-9][0-9]*$/.test(String(value ?? ""))) {
    fail(label + " must be an unpadded positive integer");
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number) || String(number) !== value) {
    fail(label + " must be an unpadded positive safe integer");
  }
  return number;
}

function parseArgs(argv) {
  const values = {
    minimumStabilitySeconds: String(DEFAULT_MIN_STABILITY_SECONDS),
    maxEvidenceAgeSeconds: String(DEFAULT_MAX_EVIDENCE_AGE_SECONDS),
  };
  const options = {
    "--config": "config",
    "--final-rollout": "finalRollout",
    "--final-audit": "finalAudit",
    "--verification-audit": "verificationAudit",
    "--min-stability-seconds": "minimumStabilitySeconds",
    "--max-evidence-age-seconds": "maxEvidenceAgeSeconds",
    "--output": "output",
  };
  const seen = new Set();
  for (let index = 0; index < argv.length; index += 2) {
    const option = argv[index];
    if (!Object.hasOwn(options, option)) fail("unexpected option: " + String(option ?? ""));
    if (seen.has(option)) fail("duplicate option: " + option);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) fail(option + " value is required");
    seen.add(option);
    values[options[option]] = value;
  }
  for (const required of ["config", "finalRollout", "finalAudit", "verificationAudit"]) {
    if (!values[required]) fail("--" + required.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()) + " is required");
  }
  values.minimumStabilitySeconds = parseInteger(
    values.minimumStabilitySeconds,
    "minimum stability seconds",
  );
  values.maxEvidenceAgeSeconds = parseInteger(
    values.maxEvidenceAgeSeconds,
    "maximum evidence age seconds",
  );
  assertBoundedInteger(
    values.minimumStabilitySeconds,
    DEFAULT_MIN_STABILITY_SECONDS,
    MAX_BOUND_SECONDS,
    "minimum stability seconds",
  );
  assertBoundedInteger(
    values.maxEvidenceAgeSeconds,
    values.minimumStabilitySeconds,
    MAX_BOUND_SECONDS,
    "maximum evidence age seconds",
  );
  return values;
}

function emit(output, path = "") {
  const json = JSON.stringify(output, null, 2) + "\n";
  if (path) {
    const outputPath = expandHome(assertSafePath(path, "output path"));
    writeFileSync(outputPath, json, { encoding: "utf8", mode: 0o600, flag: "wx" });
    chmodSync(outputPath, 0o600);
  }
  process.stdout.write(json);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const configPath = expandHome(assertSafePath(args.config, "config path"));
  const finalRolloutPath = expandHome(assertSafePath(args.finalRollout, "final rollout path"));
  const finalAuditPath = expandHome(assertSafePath(args.finalAudit, "final audit path"));
  const verificationAuditPath = expandHome(
    assertSafePath(args.verificationAudit, "verification audit path"),
  );
  if (finalAuditPath === verificationAuditPath) {
    fail("final and verification audits must be distinct files");
  }
  for (const [path, label] of [
    [finalRolloutPath, "final rollout"],
    [finalAuditPath, "final audit"],
    [verificationAuditPath, "verification audit"],
  ]) {
    assertFreshPath(path, label, args.maxEvidenceAgeSeconds);
  }
  const output = buildRuntimeStabilityVerificationV1({
    configInput: readJson(configPath, "config"),
    finalRollout: readJson(finalRolloutPath, "final rollout"),
    finalAudit: readJson(finalAuditPath, "final audit"),
    verificationAudit: readJson(verificationAuditPath, "verification audit"),
    minimumStabilitySeconds: args.minimumStabilitySeconds,
    maxEvidenceAgeSeconds: args.maxEvidenceAgeSeconds,
  });
  emit(output, args.output);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  try {
    main();
  } catch (error) {
    console.error(JSON.stringify({
      marker: VOID_NODE_FLEET_RUNTIME_STABILITY_VERIFICATION_V1,
      outcome: "HOLD",
      error: String(error?.message || error),
      mutation_attempted: false,
      automatic_retry: false,
      audit_command_invoked: false,
      restart_command_invoked: false,
    }));
    process.exitCode = 1;
  }
}
