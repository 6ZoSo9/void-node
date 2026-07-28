import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  type ProviderKeyBindingV1,
  type PublicAgentServiceProviderQuoteResponseAuthenticationPacketV1,
  type PublicAgentServiceProviderQuoteResponseAuthenticationV1,
  materializePublicAgentServiceProviderQuoteResponseAuthenticationV1,
  validatePublicAgentServiceProviderQuoteResponseAuthenticationV1,
} from "./public_agent_service_provider_quote_response_authentication_v1.js";
import {
  type PublicAgentServiceProviderTrustRegistrySnapshotPacketV1,
  type PublicAgentServiceProviderTrustRegistrySnapshotV1,
  materializePublicAgentServiceProviderTrustRegistrySnapshotV1,
  resolveProviderKeyBindingFromTrustRegistrySnapshotV1,
} from "./public_agent_service_provider_trust_registry_snapshot_v1.js";

export const PUBLIC_AGENT_SERVICE_TRUSTED_PROVIDER_QUOTE_RESPONSE_VERIFICATION_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_PROVIDER_QUOTE_RESPONSE_VERIFICATION_V1";
export const PUBLIC_AGENT_SERVICE_TRUSTED_PROVIDER_QUOTE_RESPONSE_VERIFICATION_PACKET_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_PROVIDER_QUOTE_RESPONSE_VERIFICATION_PACKET_V1";
export const PUBLIC_AGENT_SERVICE_TRUSTED_PROVIDER_QUOTE_RESPONSE_VERIFICATION_VERSION =
  1 as const;

const ROOT_ID_PATTERN = /^voidaptr1_[0-9a-f]{64}$/;
const MAX_JSON_BYTES = 16 * 1024 * 1024;

export type PublicAgentServiceTrustedProviderQuoteResponseVerificationV1 = {
  marker:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_PROVIDER_QUOTE_RESPONSE_VERIFICATION_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_PROVIDER_QUOTE_RESPONSE_VERIFICATION_VERSION;
  evidence_mode:
    | "example_fixture"
    | "external_provider_evidence";
  expected_trust_root_id: string;
  provider_trust_registry_snapshot_input:
    PublicAgentServiceProviderTrustRegistrySnapshotV1;
  provider_quote_response_authentication_input:
    PublicAgentServiceProviderQuoteResponseAuthenticationV1;
  catalog_value: unknown;
};

export type PublicAgentServiceTrustedProviderQuoteResponseVerificationPacketV1 = {
  marker:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_PROVIDER_QUOTE_RESPONSE_VERIFICATION_PACKET_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_PROVIDER_QUOTE_RESPONSE_VERIFICATION_VERSION;
  status:
    | "example_only"
    | "trusted_provider_quote_response_verified";
  source: {
    expected_trust_root_id: string;
    snapshot_id: string;
    snapshot_authentication_id: string;
    registry_id: string;
    registry_sequence: number;
    provider_id: string;
    provider_key_binding_id: string;
    provider_key_id: string;
    response_id: string;
    quote_id: string;
    provider_authentication_id: string;
    provider_authentication_created_at_utc: string;
  };
  resolved_provider_key_binding: ProviderKeyBindingV1;
  trust_snapshot_packet:
    PublicAgentServiceProviderTrustRegistrySnapshotPacketV1;
  provider_authentication_packet:
    PublicAgentServiceProviderQuoteResponseAuthenticationPacketV1;
  verification: {
    expected_trust_root_id_verified: true;
    trust_snapshot_signature_verified: true;
    trust_snapshot_provenance_verified: true;
    provider_binding_resolved_at_authentication_time: true;
    resolved_binding_exact_match_verified: true;
    provider_authentication_signature_verified: true;
    provider_response_binding_verified: true;
    composed_trust_chain_verified: true;
  };
  separate_acceptance_gate: {
    eligible_for_separate_requester_acceptance: boolean;
    reason:
      | "example_fixture_not_live_trust"
      | "trusted_provider_quote_response_verified";
    requester_authentication_required: true;
    quote_acceptance_not_performed: true;
    authentication_replay_protection_required: true;
    provider_authentication_id_consumption_required: true;
    single_active_acceptance_per_quote_required: true;
  };
  authority: {
    trust_root_creation: false;
    trust_root_rotation: false;
    trust_root_revocation: false;
    provider_key_binding_creation: false;
    provider_key_registry_write: false;
    provider_approval: false;
    provider_key_rotation: false;
    provider_key_revocation: false;
    provider_selection: false;
    quote_generation: false;
    quote_submission: false;
    quote_publication: false;
    quote_acceptance: false;
    payment_rail_resolution: false;
    payment_destination_resolution: false;
    payment_authorization: false;
    payment_execution: false;
    work_execution_authorization: false;
    work_dispatch: false;
    work_credit_write: false;
    work_credit_settlement: false;
    wallet_access: false;
    production_signing: false;
    transaction_broadcast: false;
    http_submission: false;
    credential_change: false;
    runtime_mutation: false;
    service_restart: false;
    deployment: false;
    money_movement: false;
  };
};

function fail(message: string): never {
  throw new Error(message);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    fail(message);
  }
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object"
    && value !== null
    && !Array.isArray(value)
  );
}

function requireRecord(
  value: unknown,
  label: string,
): Record<string, unknown> {
  assertCondition(isRecord(value), `${label} must be an object`);
  return value;
}

function requireExactKeys(
  value: Record<string, unknown>,
  label: string,
  keys: readonly string[],
): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  assertCondition(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${label} keys mismatch`,
  );
}

function requireString(
  value: unknown,
  label: string,
  pattern?: RegExp,
): string {
  assertCondition(
    typeof value === "string" && value.length > 0,
    `${label} must be a non-empty string`,
  );
  if (pattern !== undefined) {
    assertCondition(pattern.test(value), `${label} format is invalid`);
  }
  return value;
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalValue(item));
  }
  if (isRecord(value)) {
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      output[key] = canonicalValue(value[key]);
    }
    return output;
  }
  return value;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalValue(value));
}

function assertBindingActiveAt(
  binding: ProviderKeyBindingV1,
  atUtc: string,
): void {
  const at = Date.parse(atUtc);
  assertCondition(Number.isFinite(at), "binding resolution time is invalid");
  assertCondition(
    at >= Date.parse(binding.valid_from_utc)
      && at < Date.parse(binding.expires_at_utc),
    "provider binding is inactive at authentication creation time",
  );
  if (binding.revoked_at_utc !== null) {
    assertCondition(
      at < Date.parse(binding.revoked_at_utc),
      "provider binding is revoked at authentication creation time",
    );
  }
}

function resolveExampleBinding(
  packet: PublicAgentServiceProviderTrustRegistrySnapshotPacketV1,
  providerId: string,
  atUtc: string,
): ProviderKeyBindingV1 {
  const matches =
    packet.snapshot_body.provider_key_bindings.filter(
      (binding) => binding.provider_id === providerId,
    );
  assertCondition(
    matches.length === 1,
    "example provider must resolve to exactly one snapshot binding",
  );
  const binding = matches[0]!;
  assertBindingActiveAt(binding, atUtc);
  return binding;
}

export function validatePublicAgentServiceTrustedProviderQuoteResponseVerificationV1(
  value: unknown,
): PublicAgentServiceTrustedProviderQuoteResponseVerificationV1 {
  const root = requireRecord(
    value,
    "trusted provider quote-response verification input",
  );
  requireExactKeys(
    root,
    "trusted provider quote-response verification input",
    [
      "marker",
      "version",
      "evidence_mode",
      "expected_trust_root_id",
      "provider_trust_registry_snapshot_input",
      "provider_quote_response_authentication_input",
      "catalog_value",
    ],
  );
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_TRUSTED_PROVIDER_QUOTE_RESPONSE_VERIFICATION_MARKER,
    "trusted provider quote-response verification marker mismatch",
  );
  assertCondition(
    root.version
      === PUBLIC_AGENT_SERVICE_TRUSTED_PROVIDER_QUOTE_RESPONSE_VERIFICATION_VERSION,
    "trusted provider quote-response verification version mismatch",
  );
  assertCondition(
    root.evidence_mode === "example_fixture"
      || root.evidence_mode === "external_provider_evidence",
    "trusted provider quote-response evidence mode is invalid",
  );

  const snapshot =
    root.provider_trust_registry_snapshot_input as
      PublicAgentServiceProviderTrustRegistrySnapshotV1;
  const authentication =
    validatePublicAgentServiceProviderQuoteResponseAuthenticationV1(
      root.provider_quote_response_authentication_input,
    );

  assertCondition(
    isRecord(snapshot),
    "provider trust snapshot input must be an object",
  );
  assertCondition(
    isRecord(root.catalog_value),
    "catalog_value must be an object",
  );

  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_PROVIDER_QUOTE_RESPONSE_VERIFICATION_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_PROVIDER_QUOTE_RESPONSE_VERIFICATION_VERSION,
    evidence_mode: root.evidence_mode,
    expected_trust_root_id: requireString(
      root.expected_trust_root_id,
      "expected_trust_root_id",
      ROOT_ID_PATTERN,
    ),
    provider_trust_registry_snapshot_input: snapshot,
    provider_quote_response_authentication_input: authentication,
    catalog_value: root.catalog_value,
  };
}

export function materializePublicAgentServiceTrustedProviderQuoteResponseVerificationV1(
  inputValue: unknown,
): PublicAgentServiceTrustedProviderQuoteResponseVerificationPacketV1 {
  const input =
    validatePublicAgentServiceTrustedProviderQuoteResponseVerificationV1(
      inputValue,
    );
  const authenticationInput =
    input.provider_quote_response_authentication_input;
  const snapshotInput =
    input.provider_trust_registry_snapshot_input;

  if (input.evidence_mode === "example_fixture") {
    assertCondition(
      snapshotInput.evidence_mode === "example_fixture",
      "example composition requires an example trust snapshot",
    );
    assertCondition(
      authenticationInput.evidence_mode === "example_fixture",
      "example composition requires example provider authentication",
    );
  } else {
    assertCondition(
      snapshotInput.evidence_mode === "operator_signed_snapshot",
      "external composition requires an operator-signed trust snapshot",
    );
    assertCondition(
      authenticationInput.evidence_mode === "external_provider_evidence",
      "external composition requires external provider authentication",
    );
  }

  const trustSnapshotPacket =
    materializePublicAgentServiceProviderTrustRegistrySnapshotV1(
      snapshotInput,
      input.expected_trust_root_id,
    );

  const providerId =
    authenticationInput.authentication_envelope.provider_id;
  const authenticationCreatedAt =
    authenticationInput.authentication_envelope.created_at_utc;

  const resolvedBinding =
    input.evidence_mode === "example_fixture"
      ? resolveExampleBinding(
          trustSnapshotPacket,
          providerId,
          authenticationCreatedAt,
        )
      : resolveProviderKeyBindingFromTrustRegistrySnapshotV1(
          snapshotInput,
          input.expected_trust_root_id,
          providerId,
          authenticationCreatedAt,
        );

  assertCondition(
    canonicalJson(resolvedBinding)
      === canonicalJson(authenticationInput.provider_key_binding),
    "provider authentication binding does not exactly match trust-registry resolution",
  );

  const authenticationPacket =
    materializePublicAgentServiceProviderQuoteResponseAuthenticationV1(
      authenticationInput,
      input.catalog_value,
    );

  assertCondition(
    canonicalJson(authenticationPacket.provider_key_binding)
      === canonicalJson(resolvedBinding),
    "provider authentication packet binding changed after trust resolution",
  );
  assertCondition(
    authenticationPacket.source.provider_id === resolvedBinding.provider_id,
    "provider authentication packet provider_id mismatch",
  );
  assertCondition(
    authenticationPacket.source.provider_key_binding_id
      === resolvedBinding.binding_id,
    "provider authentication packet binding_id mismatch",
  );
  assertCondition(
    authenticationPacket.source.key_id === resolvedBinding.key_id,
    "provider authentication packet key_id mismatch",
  );

  const example = input.evidence_mode === "example_fixture";

  if (example) {
    assertCondition(
      trustSnapshotPacket.status === "example_only",
      "example composition trust snapshot became live",
    );
    assertCondition(
      authenticationPacket.status === "example_only",
      "example composition provider authentication became live",
    );
    assertCondition(
      trustSnapshotPacket.provider_authentication_gate
        .eligible_for_provider_authentication === false,
      "example trust snapshot became authentication eligible",
    );
    assertCondition(
      authenticationPacket.acceptance_gate.eligible_for_acceptance === false,
      "example provider authentication became acceptance eligible",
    );
  } else {
    assertCondition(
      trustSnapshotPacket.status
        === "operator_signed_snapshot_verified",
      "external composition trust snapshot is not verified",
    );
    assertCondition(
      authenticationPacket.status
        === "provider_authenticated_for_acceptance",
      "external composition provider response is not authenticated",
    );
    assertCondition(
      trustSnapshotPacket.provider_authentication_gate
        .eligible_for_provider_authentication === true,
      "external trust snapshot is not provider-authentication eligible",
    );
    assertCondition(
      authenticationPacket.acceptance_gate.eligible_for_acceptance === true,
      "external provider authentication is not separately acceptance eligible",
    );
  }

  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_PROVIDER_QUOTE_RESPONSE_VERIFICATION_PACKET_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_PROVIDER_QUOTE_RESPONSE_VERIFICATION_VERSION,
    status: example
      ? "example_only"
      : "trusted_provider_quote_response_verified",
    source: {
      expected_trust_root_id: input.expected_trust_root_id,
      snapshot_id: trustSnapshotPacket.snapshot_id,
      snapshot_authentication_id:
        trustSnapshotPacket.authentication_id,
      registry_id: trustSnapshotPacket.source.registry_id,
      registry_sequence: trustSnapshotPacket.source.sequence,
      provider_id: resolvedBinding.provider_id,
      provider_key_binding_id: resolvedBinding.binding_id,
      provider_key_id: resolvedBinding.key_id,
      response_id: authenticationPacket.source.response_id,
      quote_id: authenticationPacket.source.quote_id,
      provider_authentication_id:
        authenticationPacket.authentication_id,
      provider_authentication_created_at_utc:
        authenticationPacket.authentication_envelope.created_at_utc,
    },
    resolved_provider_key_binding: resolvedBinding,
    trust_snapshot_packet: trustSnapshotPacket,
    provider_authentication_packet: authenticationPacket,
    verification: {
      expected_trust_root_id_verified: true,
      trust_snapshot_signature_verified: true,
      trust_snapshot_provenance_verified: true,
      provider_binding_resolved_at_authentication_time: true,
      resolved_binding_exact_match_verified: true,
      provider_authentication_signature_verified: true,
      provider_response_binding_verified: true,
      composed_trust_chain_verified: true,
    },
    separate_acceptance_gate: {
      eligible_for_separate_requester_acceptance: !example,
      reason: example
        ? "example_fixture_not_live_trust"
        : "trusted_provider_quote_response_verified",
      requester_authentication_required: true,
      quote_acceptance_not_performed: true,
      authentication_replay_protection_required: true,
      provider_authentication_id_consumption_required: true,
      single_active_acceptance_per_quote_required: true,
    },
    authority: {
      trust_root_creation: false,
      trust_root_rotation: false,
      trust_root_revocation: false,
      provider_key_binding_creation: false,
      provider_key_registry_write: false,
      provider_approval: false,
      provider_key_rotation: false,
      provider_key_revocation: false,
      provider_selection: false,
      quote_generation: false,
      quote_submission: false,
      quote_publication: false,
      quote_acceptance: false,
      payment_rail_resolution: false,
      payment_destination_resolution: false,
      payment_authorization: false,
      payment_execution: false,
      work_execution_authorization: false,
      work_dispatch: false,
      work_credit_write: false,
      work_credit_settlement: false,
      wallet_access: false,
      production_signing: false,
      transaction_broadcast: false,
      http_submission: false,
      credential_change: false,
      runtime_mutation: false,
      service_restart: false,
      deployment: false,
      money_movement: false,
    },
  };
}

export function verifyPublicAgentServiceTrustedProviderQuoteResponseVerificationV1(
  inputValue: unknown,
  packetValue: unknown,
): PublicAgentServiceTrustedProviderQuoteResponseVerificationPacketV1 {
  const expected =
    materializePublicAgentServiceTrustedProviderQuoteResponseVerificationV1(
      inputValue,
    );
  assertCondition(
    isRecord(packetValue),
    "trusted provider quote-response verification packet must be an object",
  );
  assertCondition(
    canonicalJson(packetValue) === canonicalJson(expected),
    "trusted provider quote-response verification packet does not match source evidence",
  );
  return expected;
}

function readJson(file: string): unknown {
  const bytes = fs.readFileSync(file);
  assertCondition(
    bytes.length <= MAX_JSON_BYTES,
    "input JSON exceeds maximum size",
  );
  return JSON.parse(bytes.toString("utf8"));
}

function usage(): never {
  fail(
    "usage: trusted-provider-quote-response-verification-v1 "
      + "materialize <input.json> [packet.json] | "
      + "verify <input.json> <packet.json>",
  );
}

function main(): void {
  const [command, inputFile, packetFile] = process.argv.slice(2);
  if (command === "materialize" && inputFile !== undefined) {
    const packet =
      materializePublicAgentServiceTrustedProviderQuoteResponseVerificationV1(
        readJson(inputFile),
      );
    const output = `${JSON.stringify(packet, null, 2)}\n`;
    if (packetFile === undefined) {
      process.stdout.write(output);
    } else {
      fs.writeFileSync(packetFile, output, { mode: 0o600 });
    }
    return;
  }
  if (
    command === "verify"
    && inputFile !== undefined
    && packetFile !== undefined
  ) {
    verifyPublicAgentServiceTrustedProviderQuoteResponseVerificationV1(
      readJson(inputFile),
      readJson(packetFile),
    );
    process.stdout.write(
      "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_PROVIDER_QUOTE_RESPONSE_VERIFICATION_V1_EXACT_GREEN\n",
    );
    return;
  }
  usage();
}

const invokedUrl =
  process.argv[1] === undefined
    ? ""
    : pathToFileURL(path.resolve(process.argv[1])).href;
if (import.meta.url === invokedUrl) {
  main();
}
