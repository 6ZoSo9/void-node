import crypto from "node:crypto";
import { isIP } from "node:net";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_V1,
  buildBuyVoidAllocationCustodyWitnessTransportReadRequestV1,
  classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1,
  validateBuyVoidAllocationCustodyWitnessTransportResponseV1,
} from "./buy_void_allocation_custody_witness_transport_v1.js";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_QUALIFICATION_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_QUALIFICATION_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    pure_packet_validation: true,
    installation_receipt_binding_required: true,
    client_known_hosts_content_required: true,
    canonical_transport_policy_required: true,
    canonical_transport_read_request_required: true,
    canonical_transport_read_response_required: true,
    challenge_response_binding_required: true,
    bounded_time_order_required: true,
    monotonic_generation_order_required: true,
    installation_network_context_binding_required: true,
    known_hosts_content_qualified: true,
    transport_read_packet_qualified: true,
    live_evidence_origin_proven: false,
    trusted_verification_clock_proven: false,
    evidence_generation_monotonicity_proven: false,
    live_sshd_connection_context_proven: false,
    challenge_freshness_proven: false,
    response_replay_resistance_proven: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    live_remote_read_performed: false,
    live_remote_append_performed: false,
    network_access: false,
    ssh_execution: false,
    credential_read: false,
    filesystem_read: false,
    filesystem_write: false,
    runtime_integration: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    production_gate_ready: false,
    payment_acceptance: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    public_presale_activation: false,
    market_activation: false,
    inventory_mutation: false,
    treasury_or_liquidity_movement: false,
    funds_movement: false,
  });

const INSTALLATION_RECEIPT_SCHEMA =
  "void_buy_void_allocation_custody_witness_installation_evidence_receipt_v2";
const INSTALLATION_RECEIPT_MARKER =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_V2";
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const INSTALLATION_ID = /^voidwiq2_[0-9a-f]{64}$/u;
const BUNDLE_ID = /^voidwfbq1_[0-9a-f]{64}$/u;
const MAX_KNOWN_HOSTS_BYTES = 64 * 1024;
const MAX_CEREMONY_AGE_MS = 38_000;

const INSTALLATION_RECEIPT_KEYS = Object.freeze([
  "schema",
  "marker",
  "version",
  "installation_qualification_id",
  "installation_evidence_sha256",
  "normalized_qualification_sha256",
  "runtime_bundle_manifest_id",
  "runtime_bundle_manifest_sha256",
  "runtime_bundle_qualification_id",
  "runtime_bundle_evidence_sha256",
  "runtime_bundle_normalized_qualification_sha256",
  "runtime_bundle_collector_receipt_sha256",
  "runtime_bundle_qualification_observed",
  "runtime_bundle_evidence_collector_observed",
  "host_identity",
  "witness_storage",
  "witness_identity_path",
  "continuity_attestation_consumed",
  "host_key_observed",
  "authorized_client_key_observed",
  "effective_sshd_policy_observed",
  "sshd_connection_context",
  "sshd_connection_context_bound",
  "live_sshd_connection_context_proven",
  "continuity_attestation_observed",
  "client_known_hosts_content_observed",
  "preexec_runtime_execution_observed",
  "live_evidence_origin_proven",
  "trusted_verification_clock_proven",
  "evidence_generation_monotonicity_proven",
  "filesystem_write_performed",
  "ssh_execution_performed",
  "witness_mutation_performed",
  "host_mutation_performed",
  "external_transport_authenticated",
  "external_witness_storage_proven",
  "protected_high_water_custody_proven",
  "independent_custody_proven",
  "runtime_integration",
  "production_gate_ready",
  "funds_movement",
  "authority",
  "collector_receipt_sha256",
]);

const INSTALLATION_AUTHORITY = Object.freeze({
  source_only_tool: true,
  read_only_host_observation: true,
  descriptor_bound_file_reads: true,
  fixed_security_sensitive_paths: true,
  root_owned_authorization_policy_observed: true,
  effective_sshd_policy_observed: true,
  sshd_connection_context_bound: true,
  live_sshd_connection_context_proven: false,
  preexec_binary_chain_observed: true,
  local_host_key_observed: true,
  authorized_client_key_observed: true,
  witness_storage_observed: true,
  host_identity_observed: true,
  canonical_parent_classifier_required: true,
  v2_qualification_required: true,
  runtime_bundle_qualification_required: true,
  runtime_bundle_qualification_observed: true,
  runtime_bundle_evidence_collector_required: true,
  runtime_bundle_evidence_collector_observed: true,
  continuity_attestation_observed: true,
  content_addressed_receipt: true,
  client_known_hosts_content_observed: false,
  preexec_runtime_execution_observed: true,
  live_evidence_origin_proven: false,
  trusted_verification_clock_proven: false,
  evidence_generation_monotonicity_proven: false,
  filesystem_write: false,
  ssh_execution: false,
  key_generation: false,
  authorized_keys_mutation: false,
  sshd_mutation: false,
  config_mutation: false,
  witness_mutation: false,
  service_start: false,
  service_restart: false,
  mount_mutation: false,
  permission_mutation: false,
  runtime_integration: false,
  payment_acceptance: false,
  wallet_or_signer_access: false,
  private_key_access: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  chain2050_write: false,
  inventory_mutation: false,
  market_activation: false,
  public_presale_activation: false,
  treasury_or_liquidity_movement: false,
  funds_movement: false,
});

function fail(reason: string): never {
  throw new Error(reason);
}

function held(reason: string) {
  return Object.freeze({
    ok: false as const,
    status: "held" as const,
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_QUALIFICATION_V1,
    version: 1 as const,
    reason,
    operation_performed: false as const,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_AUTHORITY_V1,
  });
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(record)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(record[key]))
        .join(",") +
      "}"
    );
  }
  fail("witness_live_read_noncanonical_value");
}

function sha256Id(value: Buffer | string): string {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(value).digest("hex")
  );
}

function exactObject(
  value: unknown,
  keys: readonly string[],
  reason: string,
): Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(reason);
  }
  const record = value as Record<string, any>;
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(reason);
  }
  return record;
}

function integer(
  value: unknown,
  min: number,
  max: number,
  reason: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  ) {
    fail(reason);
  }
  return value;
}

function sha256Field(value: unknown, reason: string): string {
  if (typeof value !== "string" || !SHA256_ID.test(value)) fail(reason);
  return value;
}

function installationReceipt(input: unknown) {
  const receipt = exactObject(
    input,
    INSTALLATION_RECEIPT_KEYS,
    "witness_live_read_installation_receipt_shape_invalid",
  );
  if (
    receipt.schema !== INSTALLATION_RECEIPT_SCHEMA ||
    receipt.marker !== INSTALLATION_RECEIPT_MARKER ||
    receipt.version !== 2 ||
    typeof receipt.installation_qualification_id !== "string" ||
    !INSTALLATION_ID.test(receipt.installation_qualification_id) ||
    typeof receipt.runtime_bundle_qualification_id !== "string" ||
    !BUNDLE_ID.test(receipt.runtime_bundle_qualification_id)
  ) {
    fail("witness_live_read_installation_receipt_identity_invalid");
  }
  for (const key of [
    "installation_evidence_sha256",
    "normalized_qualification_sha256",
    "runtime_bundle_manifest_sha256",
    "runtime_bundle_evidence_sha256",
    "runtime_bundle_normalized_qualification_sha256",
    "runtime_bundle_collector_receipt_sha256",
    "collector_receipt_sha256",
  ]) {
    sha256Field(
      receipt[key],
      "witness_live_read_installation_receipt_digest_invalid",
    );
  }
  if (
    typeof receipt.runtime_bundle_manifest_id !== "string" ||
    receipt.runtime_bundle_manifest_id.length < 1 ||
    receipt.runtime_bundle_qualification_observed !== true ||
    receipt.runtime_bundle_evidence_collector_observed !== true ||
    receipt.host_key_observed !== true ||
    receipt.authorized_client_key_observed !== true ||
    receipt.effective_sshd_policy_observed !== true ||
    receipt.sshd_connection_context_bound !== true ||
    receipt.live_sshd_connection_context_proven !== false ||
    receipt.continuity_attestation_observed !== true ||
    receipt.client_known_hosts_content_observed !== false ||
    receipt.preexec_runtime_execution_observed !== true ||
    receipt.live_evidence_origin_proven !== false ||
    receipt.trusted_verification_clock_proven !== false ||
    receipt.evidence_generation_monotonicity_proven !== false ||
    receipt.filesystem_write_performed !== false ||
    receipt.ssh_execution_performed !== false ||
    receipt.witness_mutation_performed !== false ||
    receipt.host_mutation_performed !== false ||
    receipt.external_transport_authenticated !== false ||
    receipt.external_witness_storage_proven !== false ||
    receipt.protected_high_water_custody_proven !== false ||
    receipt.independent_custody_proven !== false ||
    receipt.runtime_integration !== false ||
    receipt.production_gate_ready !== false ||
    receipt.funds_movement !== false ||
    canonicalJson(receipt.authority) !== canonicalJson(INSTALLATION_AUTHORITY)
  ) {
    fail("witness_live_read_installation_receipt_authority_invalid");
  }
  const context = exactObject(
    receipt.sshd_connection_context,
    ["source_address", "source_host", "local_address", "local_port"],
    "witness_live_read_installation_context_invalid",
  );
  if (
    typeof context.source_address !== "string" ||
    typeof context.local_address !== "string" ||
    typeof context.source_host !== "string" ||
    isIP(context.source_address) === 0 ||
    isIP(context.local_address) === 0 ||
    context.source_address === context.local_address ||
    integer(
      context.local_port,
      1,
      65_535,
      "witness_live_read_installation_context_invalid",
    ) !== context.local_port
  ) {
    fail("witness_live_read_installation_context_invalid");
  }
  const body = { ...receipt };
  delete body.collector_receipt_sha256;
  const expectedReceiptSha = sha256Id(
    Buffer.from(canonicalJson(body), "utf8"),
  );
  if (expectedReceiptSha !== receipt.collector_receipt_sha256) {
    fail("witness_live_read_installation_receipt_digest_mismatch");
  }
  return Object.freeze({
    receipt,
    context: Object.freeze({
      source_address: context.source_address as string,
      source_host: context.source_host as string,
      local_address: context.local_address as string,
      local_port: context.local_port as number,
    }),
  });
}

function canonicalBase64(
  value: unknown,
  maxBytes: number,
  reason: string,
): Buffer {
  if (
    typeof value !== "string" ||
    value.length < 4 ||
    value.length > Math.ceil(maxBytes / 3) * 4 + 4 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(
      value,
    )
  ) {
    fail(reason);
  }
  const bytes = Buffer.from(value, "base64");
  if (
    bytes.length < 1 ||
    bytes.length > maxBytes ||
    bytes.toString("base64") !== value
  ) {
    fail(reason);
  }
  return bytes;
}

function parseEd25519KnownHosts(
  bytes: Buffer,
  remoteHost: string,
  remotePort: number,
  expectedKeySha256: string,
  expectedFileSha256: string,
) {
  if (sha256Id(bytes) !== expectedFileSha256) {
    fail("witness_live_read_known_hosts_digest_mismatch");
  }
  const text = bytes.toString("utf8");
  if (!text.endsWith("\n") || text.slice(0, -1).includes("\n")) {
    fail("witness_live_read_known_hosts_invalid");
  }
  const parts = text.slice(0, -1).split(" ");
  if (parts.length !== 3 || parts[1] !== "ssh-ed25519") {
    fail("witness_live_read_known_hosts_invalid");
  }
  const rawHost =
    remoteHost.startsWith("[") && remoteHost.endsWith("]")
      ? remoteHost.slice(1, -1)
      : remoteHost;
  const expectedHost =
    remotePort === 22
      ? rawHost
      : "[" + rawHost + "]:" + String(remotePort);
  if (parts[0] !== expectedHost) {
    fail("witness_live_read_known_hosts_host_mismatch");
  }
  const blob = canonicalBase64(
    parts[2],
    4096,
    "witness_live_read_known_hosts_key_invalid",
  );
  let offset = 0;
  const readString = (): Buffer => {
    if (offset + 4 > blob.length) {
      fail("witness_live_read_known_hosts_key_invalid");
    }
    const length = blob.readUInt32BE(offset);
    offset += 4;
    if (length < 1 || offset + length > blob.length) {
      fail("witness_live_read_known_hosts_key_invalid");
    }
    const out = blob.subarray(offset, offset + length);
    offset += length;
    return out;
  };
  const algorithm = readString();
  const key = readString();
  if (
    algorithm.toString("utf8") !== "ssh-ed25519" ||
    key.length !== 32 ||
    offset !== blob.length ||
    sha256Id(blob) !== expectedKeySha256
  ) {
    fail("witness_live_read_known_hosts_key_mismatch");
  }
  return Object.freeze({
    sha256: expectedFileSha256,
    host: expectedHost,
    algorithm: "ssh-ed25519" as const,
    host_key_sha256: expectedKeySha256,
  });
}

export function classifyBuyVoidAllocationCustodyWitnessLiveReadQualificationV1(
  input: {
    installation_receipt: unknown;
    transport_policy: unknown;
    client_known_hosts_base64: unknown;
    challenge_sha256: unknown;
    challenge_issued_at_ms: unknown;
    response_observed_at_ms: unknown;
    prior_evidence_generation: unknown;
    evidence_generation: unknown;
    observed_client_address: unknown;
    observed_remote_address: unknown;
    read_request_json: string | Buffer;
    read_response_json: string | Buffer;
  },
) {
  try {
    const installation = installationReceipt(
      input?.installation_receipt,
    );
    const policyDecision =
      classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1(
        input?.transport_policy,
      );
    if (policyDecision.ok === false) {
      fail(
        "witness_live_read_transport_" +
          policyDecision.reason,
      );
    }
    const policy = policyDecision.policy;
    const knownHostsBytes = canonicalBase64(
      input?.client_known_hosts_base64,
      MAX_KNOWN_HOSTS_BYTES,
      "witness_live_read_known_hosts_invalid",
    );
    const knownHosts = parseEd25519KnownHosts(
      knownHostsBytes,
      policy.remote_host,
      policy.remote_port,
      policy.host_key_sha256,
      policy.known_hosts_sha256,
    );

    const issuedAt = integer(
      input?.challenge_issued_at_ms,
      1,
      Number.MAX_SAFE_INTEGER,
      "witness_live_read_challenge_time_invalid",
    );
    const observedAt = integer(
      input?.response_observed_at_ms,
      1,
      Number.MAX_SAFE_INTEGER,
      "witness_live_read_response_time_invalid",
    );
    if (
      observedAt < issuedAt ||
      observedAt - issuedAt > MAX_CEREMONY_AGE_MS
    ) {
      fail("witness_live_read_challenge_window_invalid");
    }
    const priorGeneration = integer(
      input?.prior_evidence_generation,
      0,
      Number.MAX_SAFE_INTEGER - 1,
      "witness_live_read_generation_invalid",
    );
    const generation = integer(
      input?.evidence_generation,
      1,
      Number.MAX_SAFE_INTEGER,
      "witness_live_read_generation_invalid",
    );
    if (generation !== priorGeneration + 1) {
      fail("witness_live_read_generation_not_monotonic");
    }
    const clientAddress = String(
      input?.observed_client_address ?? "",
    );
    const remoteAddress = String(
      input?.observed_remote_address ?? "",
    );
    if (
      isIP(clientAddress) === 0 ||
      isIP(remoteAddress) === 0 ||
      clientAddress !== installation.context.source_address ||
      remoteAddress !== installation.context.local_address ||
      policy.remote_port !== installation.context.local_port
    ) {
      fail("witness_live_read_network_context_mismatch");
    }

    const built =
      buildBuyVoidAllocationCustodyWitnessTransportReadRequestV1({
        policy,
        challenge_sha256: input?.challenge_sha256,
      });
    if (built.ok === false) {
      fail("witness_live_read_request_" + built.reason);
    }
    const suppliedRequest = Buffer.isBuffer(input?.read_request_json)
      ? Buffer.from(input.read_request_json)
      : Buffer.from(String(input?.read_request_json ?? ""), "utf8");
    if (!suppliedRequest.equals(Buffer.from(built.request_json, "utf8"))) {
      fail("witness_live_read_request_bytes_mismatch");
    }

    const validated =
      validateBuyVoidAllocationCustodyWitnessTransportResponseV1({
        policy,
        request_json: built.request_json,
        response_json: input?.read_response_json,
      });
    if (validated.ok === false) {
      fail("witness_live_read_response_" + validated.reason);
    }
    if (
      validated.status !== "read_response_verified" ||
      validated.external_transport_authenticated !== false ||
      validated.external_witness_storage_proven !== false
    ) {
      fail("witness_live_read_response_authority_invalid");
    }

    const normalized = Object.freeze({
      schema:
        "void_buy_void_allocation_custody_witness_live_read_qualification_v1",
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_QUALIFICATION_V1,
      version: 1,
      installation_collector_receipt_sha256:
        installation.receipt.collector_receipt_sha256,
      installation_qualification_id:
        installation.receipt.installation_qualification_id,
      runtime_bundle_collector_receipt_sha256:
        installation.receipt.runtime_bundle_collector_receipt_sha256,
      transport_marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_V1,
      transport_policy_sha256: policyDecision.policy_sha256,
      remote_host: policy.remote_host,
      remote_port: policy.remote_port,
      remote_user: policy.remote_user,
      known_hosts_sha256: knownHosts.sha256,
      host_key_sha256: knownHosts.host_key_sha256,
      client_public_key_sha256: policy.client_public_key_sha256,
      challenge_sha256: built.request.challenge_sha256,
      request_id: built.request_id,
      challenge_issued_at_ms: issuedAt,
      response_observed_at_ms: observedAt,
      challenge_age_ms: observedAt - issuedAt,
      prior_evidence_generation: priorGeneration,
      evidence_generation: generation,
      observed_client_address: clientAddress,
      observed_remote_address: remoteAddress,
      witness_sha256: validated.witness_sha256,
      event_count: validated.event_count,
      tip_event_sha256: validated.tip_event_sha256,
    });
    const qualificationId =
      "voidwlrq1_" +
      crypto
        .createHash("sha256")
        .update(canonicalJson(normalized), "utf8")
        .digest("hex");

    return Object.freeze({
      ok: true as const,
      status: "live_read_packet_qualified" as const,
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_QUALIFICATION_V1,
      version: 1 as const,
      qualification_id: qualificationId,
      normalized,
      operation_performed: false as const,
      known_hosts_content_qualified: true as const,
      transport_read_packet_qualified: true as const,
      bounded_time_order_qualified: true as const,
      monotonic_generation_order_qualified: true as const,
      installation_network_context_qualified: true as const,
      live_evidence_origin_proven: false as const,
      trusted_verification_clock_proven: false as const,
      evidence_generation_monotonicity_proven: false as const,
      live_sshd_connection_context_proven: false as const,
      challenge_freshness_proven: false as const,
      response_replay_resistance_proven: false as const,
      external_transport_authenticated: false as const,
      external_witness_storage_proven: false as const,
      live_remote_read_performed: false as const,
      runtime_integration: false as const,
      protected_high_water_custody_proven: false as const,
      independent_custody_proven: false as const,
      production_gate_ready: false as const,
      funds_movement: false as const,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "witness_live_read_qualification_failed",
    );
  }
}
