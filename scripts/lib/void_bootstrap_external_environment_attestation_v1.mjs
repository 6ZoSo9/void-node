import crypto from "node:crypto";

export const VOID_BOOTSTRAP_EXTERNAL_ENVIRONMENT_ATTESTATION_V1 =
  "void_bootstrap_external_environment_attestation_v1";
export const VOID_NETWORK = "VOID Network";
export const VOID_CHAIN_ID = 2050;

const ATTESTATION_KEYS = Object.freeze([
  "schema",
  "network",
  "chain_id",
  "repository",
  "evidence_mode",
  "observed_at",
  "machine",
  "launcher",
  "dependencies",
  "authority",
  "evidence",
  "attestation_id",
]);

const REPOSITORY_KEYS = Object.freeze(["owner_repo", "commit"]);

const MACHINE_KEYS = Object.freeze([
  "machine_label",
  "os_family",
  "fresh_checkout",
  "outside_operator_tailnet",
  "operator_managed_machine",
]);

const LAUNCHER_KEYS = Object.freeze([
  "executable",
  "arguments",
  "manual_bootstrap_addresses_supplied",
  "private_address_supplied",
  "tailscale_address_supplied",
  "ssh_tunnel_supplied",
  "manual_environment_edit_required",
]);

const DEPENDENCY_KEYS = Object.freeze([
  "tailscale_required",
  "tailscale_path_used",
  "vpn_required",
  "ssh_required",
  "router_configuration_required",
  "port_forward_required",
  "operator_contact_required",
  "commercial_cloud_provider_required",
  "dns_provider_required",
  "tunnel_provider_required",
]);

const AUTHORITY_KEYS = Object.freeze([
  "private_routes_exposed",
  "wallet_authority",
  "signer_authority",
  "validator_authority",
  "treasury_authority",
  "work_credit_authority",
  "money_movement_authority",
]);

const EVIDENCE_KEYS = Object.freeze([
  "repository_state_sha256",
  "launcher_invocation_sha256",
  "sanitized_network_posture_sha256",
  "sanitized_environment_scan_sha256",
]);

const MODES = new Set([
  "synthetic_test_fixture",
  "external_machine_observation",
]);

const COMMIT_RE = /^[0-9a-f]{40}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const LABEL_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const ATTESTATION_ID_RE = /^voidbea1_[0-9a-f]{64}$/;

function plainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

function exactKeys(value, expected, label) {
  const object = plainObject(value, label);
  const actual = Object.keys(object).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label} keys mismatch`);
  }
  return object;
}

function canonicalize(value) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("canonical JSON cannot contain non-finite numbers");
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
    );
  }
  throw new Error(`canonical JSON cannot contain ${typeof value}`);
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function contentId(value) {
  const body = structuredClone(value);
  delete body.attestation_id;
  return `voidbea1_${crypto
    .createHash("sha256")
    .update(canonicalJson(body))
    .digest("hex")}`;
}

function canonicalIso(value, label) {
  const text = String(value || "");
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== text) {
    throw new Error(`${label} must be canonical ISO-8601 UTC`);
  }
  return text;
}

function safeLabel(value, label) {
  const text = String(value || "");
  if (!LABEL_RE.test(text)) {
    throw new Error(`${label} is invalid`);
  }
  return text;
}

function validateRepository(raw) {
  const repo = exactKeys(
    structuredClone(raw),
    REPOSITORY_KEYS,
    "external environment repository",
  );
  if (repo.owner_repo !== "6ZoSo9/void-node") {
    throw new Error("external environment repository must be 6ZoSo9/void-node");
  }
  if (!COMMIT_RE.test(String(repo.commit || ""))) {
    throw new Error(
      "external environment repository commit must be exact 40-hex SHA",
    );
  }
  return Object.freeze({ ...repo });
}

function validateMachine(raw) {
  const machine = exactKeys(
    structuredClone(raw),
    MACHINE_KEYS,
    "external acceptance machine",
  );

  const machineLabel = safeLabel(
    machine.machine_label,
    "external acceptance machine label",
  );

  if (machine.os_family !== "linux") {
    throw new Error("external acceptance machine os_family must be linux");
  }
  if (machine.fresh_checkout !== true) {
    throw new Error("external acceptance machine must use a fresh checkout");
  }
  if (machine.outside_operator_tailnet !== true) {
    throw new Error(
      "external acceptance machine must be outside operator Tailnet",
    );
  }
  if (machine.operator_managed_machine !== false) {
    throw new Error(
      "external acceptance machine must not be an operator-managed machine",
    );
  }

  return Object.freeze({
    machine_label: machineLabel,
    os_family: "linux",
    fresh_checkout: true,
    outside_operator_tailnet: true,
    operator_managed_machine: false,
  });
}

function validateLauncher(raw) {
  const launcher = exactKeys(
    structuredClone(raw),
    LAUNCHER_KEYS,
    "external acceptance launcher",
  );

  if (launcher.executable !== "./run-void-node.sh") {
    throw new Error(
      "external acceptance launcher must be ./run-void-node.sh",
    );
  }
  if (!Array.isArray(launcher.arguments) || launcher.arguments.length !== 0) {
    throw new Error(
      "external acceptance launcher must use no positional arguments",
    );
  }

  for (const key of [
    "manual_bootstrap_addresses_supplied",
    "private_address_supplied",
    "tailscale_address_supplied",
    "ssh_tunnel_supplied",
    "manual_environment_edit_required",
  ]) {
    if (launcher[key] !== false) {
      throw new Error(`external acceptance launcher ${key} must be false`);
    }
  }

  return Object.freeze({
    executable: "./run-void-node.sh",
    arguments: Object.freeze([]),
    manual_bootstrap_addresses_supplied: false,
    private_address_supplied: false,
    tailscale_address_supplied: false,
    ssh_tunnel_supplied: false,
    manual_environment_edit_required: false,
  });
}

function validateFalseMap(raw, expectedKeys, label) {
  const value = exactKeys(structuredClone(raw), expectedKeys, label);
  for (const key of expectedKeys) {
    if (value[key] !== false) {
      throw new Error(`${label} ${key} must be false`);
    }
  }
  return Object.freeze({ ...value });
}

function validateEvidence(raw) {
  const evidence = exactKeys(
    structuredClone(raw),
    EVIDENCE_KEYS,
    "external environment evidence",
  );
  for (const key of EVIDENCE_KEYS) {
    if (!SHA256_RE.test(String(evidence[key] || ""))) {
      throw new Error(`external environment evidence ${key} must be SHA-256`);
    }
  }
  return Object.freeze({ ...evidence });
}

export function buildVoidBootstrapExternalEnvironmentAttestationV1(rawBody) {
  const body = structuredClone(rawBody);
  const attestation = Object.freeze({
    ...body,
    attestation_id: contentId(body),
  });
  validateVoidBootstrapExternalEnvironmentAttestationV1(attestation);
  return attestation;
}

export function validateVoidBootstrapExternalEnvironmentAttestationV1(raw) {
  const attestation = exactKeys(
    structuredClone(raw),
    ATTESTATION_KEYS,
    "external bootstrap environment attestation",
  );

  if (
    attestation.schema !== VOID_BOOTSTRAP_EXTERNAL_ENVIRONMENT_ATTESTATION_V1 ||
    attestation.network !== VOID_NETWORK ||
    attestation.chain_id !== VOID_CHAIN_ID
  ) {
    throw new Error(
      "external bootstrap environment network contract mismatch",
    );
  }

  validateRepository(attestation.repository);

  if (!MODES.has(attestation.evidence_mode)) {
    throw new Error(
      "external bootstrap environment evidence mode is invalid",
    );
  }

  canonicalIso(attestation.observed_at, "external environment observed_at");
  validateMachine(attestation.machine);
  validateLauncher(attestation.launcher);
  validateFalseMap(
    attestation.dependencies,
    DEPENDENCY_KEYS,
    "external acceptance dependency",
  );
  validateFalseMap(
    attestation.authority,
    AUTHORITY_KEYS,
    "external acceptance authority",
  );
  validateEvidence(attestation.evidence);

  if (!ATTESTATION_ID_RE.test(String(attestation.attestation_id || ""))) {
    throw new Error(
      "external bootstrap environment attestation ID is malformed",
    );
  }
  if (attestation.attestation_id !== contentId(attestation)) {
    throw new Error(
      "external bootstrap environment attestation ID does not match content",
    );
  }

  return Object.freeze(structuredClone(attestation));
}
