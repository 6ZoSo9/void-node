import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  type PublicAgentServiceRequesterAcceptanceAuthenticationPacketV1,
  type PublicAgentServiceRequesterAcceptanceAuthenticationV1,
  materializePublicAgentServiceRequesterAcceptanceAuthenticationV1,
  validatePublicAgentServiceRequesterAcceptanceAuthenticationV1,
} from "./public_agent_service_requester_acceptance_authentication_v1.js";
import {
  type PublicAgentServiceTrustedProviderQuoteResponseVerificationPacketV1,
  type PublicAgentServiceTrustedProviderQuoteResponseVerificationV1,
  materializePublicAgentServiceTrustedProviderQuoteResponseVerificationV1,
  validatePublicAgentServiceTrustedProviderQuoteResponseVerificationV1,
} from "./public_agent_service_trusted_provider_quote_response_verification_v1.js";

export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_VERIFICATION_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_VERIFICATION_V1";
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_VERIFICATION_PACKET_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_VERIFICATION_PACKET_V1";
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_VERIFICATION_VERSION =
  1 as const;

const MAX_JSON_BYTES = 24 * 1024 * 1024;

export type PublicAgentServiceTrustedRequesterAcceptanceVerificationV1 = {
  marker:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_VERIFICATION_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_VERIFICATION_VERSION;
  evidence_mode:
    | "example_fixture"
    | "external_requester_evidence";
  trusted_provider_quote_response_verification_input:
    PublicAgentServiceTrustedProviderQuoteResponseVerificationV1;
  requester_acceptance_authentication_input:
    PublicAgentServiceRequesterAcceptanceAuthenticationV1;
};

export type PublicAgentServiceTrustedRequesterAcceptanceVerificationPacketV1 = {
  marker:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_VERIFICATION_PACKET_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_VERIFICATION_VERSION;
  status:
    | "example_only"
    | "trusted_provider_requester_acceptance_intent_verified";
  source: {
    expected_trust_root_id: string;
    snapshot_id: string;
    snapshot_authentication_id: string;
    registry_id: string;
    registry_sequence: number;
    provider_id: string;
    provider_key_binding_id: string;
    provider_key_id: string;
    provider_authentication_id: string;
    response_id: string;
    quote_id: string;
    quote_handoff_id: string;
    work_order_id: string;
    handoff_id: string;
    requester_agent_id: string;
    requester_key_binding_id: string;
    requester_key_id: string;
    requester_authentication_id: string;
    acceptance_nonce: string;
    catalog_fingerprint_sha256: string;
  };
  trusted_provider_packet:
    PublicAgentServiceTrustedProviderQuoteResponseVerificationPacketV1;
  requester_authentication_packet:
    PublicAgentServiceRequesterAcceptanceAuthenticationPacketV1;
  verification: {
    trusted_provider_chain_verified: true;
    provider_authentication_input_exact_match_verified: true;
    provider_authentication_identity_verified: true;
    provider_binding_identity_verified: true;
    provider_key_identity_verified: true;
    response_identity_verified: true;
    quote_identity_verified: true;
    quote_handoff_identity_verified: true;
    work_order_identity_verified: true;
    provider_identity_verified: true;
    catalog_identity_verified: true;
    requester_signature_verified: true;
    requester_intent_binding_verified: true;
    composed_acceptance_intent_verified: true;
    requester_binding_provenance_verified: false;
  };
  acceptance_materialization_gate: {
    eligible_for_acceptance_materialization: false;
    reason:
      | "example_fixture_not_live_trust"
      | "requester_binding_provenance_not_verified";
    requester_binding_provenance_required: true;
    separate_acceptance_materialization_required: true;
    requester_authentication_replay_protection_required: true;
    requester_authentication_id_consumption_required: true;
    provider_authentication_id_consumption_required: true;
    acceptance_replay_protection_required: true;
    acceptance_id_consumption_required: true;
    single_active_acceptance_per_quote_required: true;
    acceptance_replay_consumer_verified: false;
    quote_acceptance_not_performed: true;
  };
  authority: {
    requester_binding_registry_read: false;
    requester_binding_registry_write: false;
    requester_binding_approval: false;
    requester_binding_creation: false;
    requester_binding_rotation: false;
    requester_binding_revocation: false;
    requester_authentication_replay_write: false;
    provider_authentication_replay_write: false;
    acceptance_replay_write: false;
    authentication_id_consumption: false;
    acceptance_id_consumption: false;
    acceptance_creation: false;
    quote_acceptance: false;
    provider_selection: false;
    quote_publication: false;
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
    credential_issue: false;
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

export function validatePublicAgentServiceTrustedRequesterAcceptanceVerificationV1(
  value: unknown,
): PublicAgentServiceTrustedRequesterAcceptanceVerificationV1 {
  const root = requireRecord(
    value,
    "trusted requester acceptance verification input",
  );
  requireExactKeys(
    root,
    "trusted requester acceptance verification input",
    [
      "marker",
      "version",
      "evidence_mode",
      "trusted_provider_quote_response_verification_input",
      "requester_acceptance_authentication_input",
    ],
  );
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_VERIFICATION_MARKER,
    "trusted requester acceptance verification marker mismatch",
  );
  assertCondition(
    root.version
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_VERIFICATION_VERSION,
    "trusted requester acceptance verification version mismatch",
  );
  assertCondition(
    root.evidence_mode === "example_fixture"
      || root.evidence_mode === "external_requester_evidence",
    "trusted requester acceptance evidence mode is invalid",
  );

  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_VERIFICATION_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_VERIFICATION_VERSION,
    evidence_mode: root.evidence_mode,
    trusted_provider_quote_response_verification_input:
      validatePublicAgentServiceTrustedProviderQuoteResponseVerificationV1(
        root.trusted_provider_quote_response_verification_input,
      ),
    requester_acceptance_authentication_input:
      validatePublicAgentServiceRequesterAcceptanceAuthenticationV1(
        root.requester_acceptance_authentication_input,
      ),
  };
}

export function materializePublicAgentServiceTrustedRequesterAcceptanceVerificationV1(
  inputValue: unknown,
): PublicAgentServiceTrustedRequesterAcceptanceVerificationPacketV1 {
  const input =
    validatePublicAgentServiceTrustedRequesterAcceptanceVerificationV1(
      inputValue,
    );
  const trustedProviderInput =
    input.trusted_provider_quote_response_verification_input;
  const requesterInput =
    input.requester_acceptance_authentication_input;

  if (input.evidence_mode === "example_fixture") {
    assertCondition(
      trustedProviderInput.evidence_mode === "example_fixture",
      "example composition requires example trusted-provider evidence",
    );
    assertCondition(
      requesterInput.evidence_mode === "example_fixture",
      "example composition requires example requester evidence",
    );
  } else {
    assertCondition(
      trustedProviderInput.evidence_mode === "external_provider_evidence",
      "external composition requires external trusted-provider evidence",
    );
    assertCondition(
      requesterInput.evidence_mode === "external_requester_evidence",
      "external composition requires external requester evidence",
    );
  }

  const requesterHandoffInput =
    requesterInput.authenticated_quote_acceptance_handoff_input;
  assertCondition(
    canonicalJson(requesterHandoffInput.provider_authentication_input)
      === canonicalJson(
        trustedProviderInput.provider_quote_response_authentication_input,
      ),
    "requester handoff provider authentication input does not exactly match trusted-provider evidence",
  );

  const trustedProviderPacket =
    materializePublicAgentServiceTrustedProviderQuoteResponseVerificationV1(
      trustedProviderInput,
    );
  const requesterPacket =
    materializePublicAgentServiceRequesterAcceptanceAuthenticationV1(
      requesterInput,
      trustedProviderInput.catalog_value,
    );

  const identityChecks: Array<
    [unknown, unknown, string]
  > = [
    [
      requesterPacket.source.provider_authentication_id,
      trustedProviderPacket.source.provider_authentication_id,
      "provider_authentication_id",
    ],
    [
      requesterPacket.source.provider_key_binding_id,
      trustedProviderPacket.source.provider_key_binding_id,
      "provider_key_binding_id",
    ],
    [
      requesterPacket.source.provider_key_id,
      trustedProviderPacket.source.provider_key_id,
      "provider_key_id",
    ],
    [
      requesterPacket.source.response_id,
      trustedProviderPacket.source.response_id,
      "response_id",
    ],
    [
      requesterPacket.source.quote_id,
      trustedProviderPacket.source.quote_id,
      "quote_id",
    ],
    [
      requesterPacket.source.quote_handoff_id,
      trustedProviderPacket.provider_authentication_packet.source.handoff_id,
      "quote_handoff_id",
    ],
    [
      requesterPacket.source.work_order_id,
      trustedProviderPacket.provider_authentication_packet.source.work_order_id,
      "work_order_id",
    ],
    [
      requesterPacket.source.provider_id,
      trustedProviderPacket.source.provider_id,
      "provider_id",
    ],
    [
      requesterPacket.source.catalog_fingerprint_sha256,
      trustedProviderPacket.provider_authentication_packet.source
        .catalog_fingerprint_sha256,
      "catalog_fingerprint_sha256",
    ],
  ];
  for (const [actual, expected, label] of identityChecks) {
    assertCondition(
      actual === expected,
      `requester authentication ${label} does not match trusted-provider chain`,
    );
  }

  const example = input.evidence_mode === "example_fixture";
  if (example) {
    assertCondition(
      trustedProviderPacket.status === "example_only",
      "example trusted-provider packet became live",
    );
    assertCondition(
      requesterPacket.status === "example_only",
      "example requester packet became live",
    );
  } else {
    assertCondition(
      trustedProviderPacket.status
        === "trusted_provider_quote_response_verified",
      "external trusted-provider chain is not verified",
    );
    assertCondition(
      requesterPacket.status
        === "requester_authenticated_for_acceptance",
      "external requester authentication is not verified",
    );
    assertCondition(
      requesterPacket.acceptance_gate
        .eligible_for_acceptance_materialization === true,
      "external requester authentication is not independently acceptance eligible",
    );
  }

  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_VERIFICATION_PACKET_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_VERIFICATION_VERSION,
    status: example
      ? "example_only"
      : "trusted_provider_requester_acceptance_intent_verified",
    source: {
      expected_trust_root_id:
        trustedProviderPacket.source.expected_trust_root_id,
      snapshot_id:
        trustedProviderPacket.source.snapshot_id,
      snapshot_authentication_id:
        trustedProviderPacket.source.snapshot_authentication_id,
      registry_id:
        trustedProviderPacket.source.registry_id,
      registry_sequence:
        trustedProviderPacket.source.registry_sequence,
      provider_id:
        trustedProviderPacket.source.provider_id,
      provider_key_binding_id:
        trustedProviderPacket.source.provider_key_binding_id,
      provider_key_id:
        trustedProviderPacket.source.provider_key_id,
      provider_authentication_id:
        trustedProviderPacket.source.provider_authentication_id,
      response_id:
        requesterPacket.source.response_id,
      quote_id:
        requesterPacket.source.quote_id,
      quote_handoff_id:
        requesterPacket.source.quote_handoff_id,
      work_order_id:
        requesterPacket.source.work_order_id,
      handoff_id:
        requesterPacket.source.handoff_id,
      requester_agent_id:
        requesterPacket.source.requester_agent_id,
      requester_key_binding_id:
        requesterPacket.source.requester_key_binding_id,
      requester_key_id:
        requesterPacket.source.requester_key_id,
      requester_authentication_id:
        requesterPacket.requester_authentication_id,
      acceptance_nonce:
        requesterPacket.source.acceptance_nonce,
      catalog_fingerprint_sha256:
        requesterPacket.source.catalog_fingerprint_sha256,
    },
    trusted_provider_packet:
      trustedProviderPacket,
    requester_authentication_packet:
      requesterPacket,
    verification: {
      trusted_provider_chain_verified: true,
      provider_authentication_input_exact_match_verified: true,
      provider_authentication_identity_verified: true,
      provider_binding_identity_verified: true,
      provider_key_identity_verified: true,
      response_identity_verified: true,
      quote_identity_verified: true,
      quote_handoff_identity_verified: true,
      work_order_identity_verified: true,
      provider_identity_verified: true,
      catalog_identity_verified: true,
      requester_signature_verified: true,
      requester_intent_binding_verified: true,
      composed_acceptance_intent_verified: true,
      requester_binding_provenance_verified: false,
    },
    acceptance_materialization_gate: {
      eligible_for_acceptance_materialization: false,
      reason: example
        ? "example_fixture_not_live_trust"
        : "requester_binding_provenance_not_verified",
      requester_binding_provenance_required: true,
      separate_acceptance_materialization_required: true,
      requester_authentication_replay_protection_required: true,
      requester_authentication_id_consumption_required: true,
      provider_authentication_id_consumption_required: true,
      acceptance_replay_protection_required: true,
      acceptance_id_consumption_required: true,
      single_active_acceptance_per_quote_required: true,
      acceptance_replay_consumer_verified: false,
      quote_acceptance_not_performed: true,
    },
    authority: {
      requester_binding_registry_read: false,
      requester_binding_registry_write: false,
      requester_binding_approval: false,
      requester_binding_creation: false,
      requester_binding_rotation: false,
      requester_binding_revocation: false,
      requester_authentication_replay_write: false,
      provider_authentication_replay_write: false,
      acceptance_replay_write: false,
      authentication_id_consumption: false,
      acceptance_id_consumption: false,
      acceptance_creation: false,
      quote_acceptance: false,
      provider_selection: false,
      quote_publication: false,
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
      credential_issue: false,
      credential_change: false,
      runtime_mutation: false,
      service_restart: false,
      deployment: false,
      money_movement: false,
    },
  };
}

export function verifyPublicAgentServiceTrustedRequesterAcceptanceVerificationV1(
  inputValue: unknown,
  packetValue: unknown,
): PublicAgentServiceTrustedRequesterAcceptanceVerificationPacketV1 {
  const expected =
    materializePublicAgentServiceTrustedRequesterAcceptanceVerificationV1(
      inputValue,
    );
  assertCondition(
    isRecord(packetValue),
    "trusted requester acceptance verification packet must be an object",
  );
  assertCondition(
    canonicalJson(packetValue) === canonicalJson(expected),
    "trusted requester acceptance verification packet does not match source evidence",
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
    "usage: trusted-requester-acceptance-verification-v1 "
      + "materialize <input.json> [packet.json] | "
      + "verify <input.json> <packet.json>",
  );
}

function main(): void {
  const [command, inputFile, packetFile] = process.argv.slice(2);
  if (command === "materialize" && inputFile !== undefined) {
    const packet =
      materializePublicAgentServiceTrustedRequesterAcceptanceVerificationV1(
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
    verifyPublicAgentServiceTrustedRequesterAcceptanceVerificationV1(
      readJson(inputFile),
      readJson(packetFile),
    );
    process.stdout.write(
      "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_VERIFICATION_V1_EXACT_GREEN\n",
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
