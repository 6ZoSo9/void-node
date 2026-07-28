import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  canonicalJson,
} from "./agent_paid_work_order_envelope_v1.js";
import {
  materializePublicAgentServiceRequesterTrustRegistrySnapshotV1,
  resolveRequesterKeyBindingFromTrustRegistrySnapshotV1,
  validatePublicAgentServiceRequesterTrustRegistrySnapshotV1,
  type PublicAgentServiceRequesterTrustRegistrySnapshotPacketV1,
  type PublicAgentServiceRequesterTrustRegistrySnapshotV1,
} from "./public_agent_service_requester_trust_registry_snapshot_v1.js";
import {
  materializePublicAgentServiceTrustedRequesterAcceptanceVerificationV1,
  validatePublicAgentServiceTrustedRequesterAcceptanceVerificationV1,
  type PublicAgentServiceTrustedRequesterAcceptanceVerificationPacketV1,
  type PublicAgentServiceTrustedRequesterAcceptanceVerificationV1,
} from "./public_agent_service_trusted_requester_acceptance_verification_v1.js";
import {
  type RequesterAcceptanceKeyBindingV1,
} from "./public_agent_service_requester_acceptance_authentication_v1.js";

export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REGISTRY_VERIFICATION_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REGISTRY_VERIFICATION_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REGISTRY_VERIFICATION_PACKET_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REGISTRY_VERIFICATION_PACKET_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REGISTRY_VERIFICATION_VERSION =
  1 as const;

const MAX_JSON_BYTES = 16 * 1024 * 1024;
const REQUESTER_TRUST_ROOT_ID_PATTERN =
  /^voidartr1_[0-9a-f]{64}$/;

export type PublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationV1 = {
  marker:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REGISTRY_VERIFICATION_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REGISTRY_VERIFICATION_VERSION;
  evidence_mode:
    | "example_fixture"
    | "external_requester_evidence";
  expected_requester_trust_root_id: string;
  requester_trust_registry_snapshot_input:
    PublicAgentServiceRequesterTrustRegistrySnapshotV1;
  trusted_requester_acceptance_verification_input:
    PublicAgentServiceTrustedRequesterAcceptanceVerificationV1;
};

export type PublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationPacketV1 = {
  marker:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REGISTRY_VERIFICATION_PACKET_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REGISTRY_VERIFICATION_VERSION;
  status:
    | "example_only"
    | "trusted_requester_acceptance_registry_verified";
  source: {
    expected_requester_trust_root_id: string;
    requester_snapshot_id: string;
    requester_snapshot_authentication_id: string;
    requester_registry_id: string;
    requester_registry_sequence: number;
    requester_trust_root_id: string;
    requester_trust_root_key_id: string;
    requester_binding_resolution_at_utc: string;
    requester_agent_id: string;
    requester_key_binding_id: string;
    requester_key_id: string;
    requester_authentication_id: string;
    provider_authentication_id: string;
    quote_id: string;
    work_order_id: string;
    acceptance_nonce: string;
  };
  requester_trust_registry_packet:
    PublicAgentServiceRequesterTrustRegistrySnapshotPacketV1;
  trusted_requester_packet:
    PublicAgentServiceTrustedRequesterAcceptanceVerificationPacketV1;
  resolved_requester_binding:
    RequesterAcceptanceKeyBindingV1;
  verification: {
    requester_snapshot_verified: true;
    requester_snapshot_provenance_verified: boolean;
    trusted_provider_chain_verified: true;
    requester_signature_verified: true;
    requester_intent_binding_verified: true;
    composed_acceptance_intent_verified: true;
    requester_agent_identity_verified: true;
    requester_binding_identity_verified: true;
    requester_key_identity_verified: true;
    requester_binding_exact_match_verified: true;
    requester_binding_provenance_verified: boolean;
  };
  acceptance_materialization_gate: {
    eligible_for_acceptance_materialization: boolean;
    reason:
      | "example_fixture_not_live_trust"
      | "requester_binding_provenance_verified";
    requester_binding_provenance_required: true;
    separate_acceptance_materialization_required: true;
    requester_authentication_replay_protection_required: true;
    requester_authentication_id_consumption_required: true;
    provider_authentication_id_consumption_required: true;
    acceptance_replay_protection_required: true;
    acceptance_id_consumption_required: true;
    single_active_acceptance_per_quote_required: true;
    acceptance_replay_consumer_verified: false;
    production_persistence_consumer_verified: false;
    quote_acceptance_not_performed: true;
  };
  authority: {
    requester_trust_root_creation: false;
    requester_trust_root_rotation: false;
    requester_trust_root_revocation: false;
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
  assertCondition(
    isRecord(value),
    `${label} must be an object`,
  );
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
  pattern: RegExp,
): string {
  assertCondition(
    typeof value === "string",
    `${label} must be a string`,
  );
  assertCondition(
    pattern.test(value),
    `${label} format is invalid`,
  );
  return value;
}

export function validatePublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationV1(
  value: unknown,
): PublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationV1 {
  const root = requireRecord(
    value,
    "trusted requester registry verification input",
  );
  requireExactKeys(
    root,
    "trusted requester registry verification input",
    [
      "marker",
      "version",
      "evidence_mode",
      "expected_requester_trust_root_id",
      "requester_trust_registry_snapshot_input",
      "trusted_requester_acceptance_verification_input",
    ],
  );
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REGISTRY_VERIFICATION_MARKER,
    "trusted requester registry verification marker mismatch",
  );
  assertCondition(
    root.version
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REGISTRY_VERIFICATION_VERSION,
    "trusted requester registry verification version mismatch",
  );
  assertCondition(
    root.evidence_mode === "example_fixture"
      || root.evidence_mode === "external_requester_evidence",
    "trusted requester registry verification evidence mode is invalid",
  );

  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REGISTRY_VERIFICATION_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REGISTRY_VERIFICATION_VERSION,
    evidence_mode:
      root.evidence_mode,
    expected_requester_trust_root_id:
      requireString(
        root.expected_requester_trust_root_id,
        "expected_requester_trust_root_id",
        REQUESTER_TRUST_ROOT_ID_PATTERN,
      ),
    requester_trust_registry_snapshot_input:
      validatePublicAgentServiceRequesterTrustRegistrySnapshotV1(
        root.requester_trust_registry_snapshot_input,
      ),
    trusted_requester_acceptance_verification_input:
      validatePublicAgentServiceTrustedRequesterAcceptanceVerificationV1(
        root.trusted_requester_acceptance_verification_input,
      ),
  };
}

function resolveExampleRequesterBinding(
  packet: PublicAgentServiceRequesterTrustRegistrySnapshotPacketV1,
  requesterAgentId: string,
): RequesterAcceptanceKeyBindingV1 {
  const matches =
    packet.snapshot_body.requester_key_bindings.filter(
      (binding) =>
        binding.requester_agent_id === requesterAgentId,
    );
  assertCondition(
    matches.length === 1,
    "example requester must resolve to exactly one registry binding",
  );
  return matches[0]!;
}

export function materializePublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationV1(
  inputValue: unknown,
): PublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationPacketV1 {
  const input =
    validatePublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationV1(
      inputValue,
    );
  const example =
    input.evidence_mode === "example_fixture";
  const registryInput =
    input.requester_trust_registry_snapshot_input;
  const trustedInput =
    input.trusted_requester_acceptance_verification_input;

  if (example) {
    assertCondition(
      registryInput.evidence_mode === "example_fixture",
      "example composition requires example requester registry evidence",
    );
    assertCondition(
      trustedInput.evidence_mode === "example_fixture",
      "example composition requires example trusted requester evidence",
    );
  } else {
    assertCondition(
      registryInput.evidence_mode === "operator_signed_snapshot",
      "external composition requires operator-signed requester registry evidence",
    );
    assertCondition(
      trustedInput.evidence_mode === "external_requester_evidence",
      "external composition requires external trusted requester evidence",
    );
  }

  const registryPacket =
    materializePublicAgentServiceRequesterTrustRegistrySnapshotV1(
      registryInput,
      input.expected_requester_trust_root_id,
    );
  const trustedPacket =
    materializePublicAgentServiceTrustedRequesterAcceptanceVerificationV1(
      trustedInput,
    );

  const requesterAuthenticationInput =
    trustedInput.requester_acceptance_authentication_input;
  const suppliedBinding =
    requesterAuthenticationInput.requester_key_binding;
  const resolutionAtUtc =
    requesterAuthenticationInput.requester_authentication_envelope
      .created_at_utc;
  const requesterAgentId =
    trustedPacket.source.requester_agent_id;

  let resolvedBinding: RequesterAcceptanceKeyBindingV1;
  if (example) {
    assertCondition(
      registryPacket.status === "example_only",
      "example requester registry packet became live",
    );
    assertCondition(
      trustedPacket.status === "example_only",
      "example trusted requester packet became live",
    );
    resolvedBinding =
      resolveExampleRequesterBinding(
        registryPacket,
        requesterAgentId,
      );
  } else {
    assertCondition(
      registryPacket.status
        === "operator_signed_snapshot_verified",
      "external requester registry snapshot is not verified",
    );
    assertCondition(
      registryPacket.requester_authentication_gate
        .eligible_for_requester_authentication === true,
      "external requester registry snapshot is not authentication eligible",
    );
    assertCondition(
      trustedPacket.status
        === "trusted_provider_requester_acceptance_intent_verified",
      "external trusted requester chain is not verified",
    );
    assertCondition(
      trustedPacket.verification
        .requester_binding_provenance_verified === false,
      "upstream trusted requester packet unexpectedly claims registry provenance",
    );
    assertCondition(
      trustedPacket.acceptance_materialization_gate
        .eligible_for_acceptance_materialization === false,
      "upstream trusted requester packet unexpectedly bypasses registry provenance",
    );
    resolvedBinding =
      resolveRequesterKeyBindingFromTrustRegistrySnapshotV1(
        registryInput,
        input.expected_requester_trust_root_id,
        requesterAgentId,
        resolutionAtUtc,
      );
  }

  assertCondition(
    canonicalJson(resolvedBinding)
      === canonicalJson(suppliedBinding),
    "resolved requester registry binding does not exactly match the binding used for requester signature verification",
  );
  assertCondition(
    resolvedBinding.requester_agent_id
      === trustedPacket.source.requester_agent_id,
    "resolved requester agent identity does not match trusted requester packet",
  );
  assertCondition(
    resolvedBinding.binding_id
      === trustedPacket.source.requester_key_binding_id,
    "resolved requester binding identity does not match trusted requester packet",
  );
  assertCondition(
    resolvedBinding.key_id
      === trustedPacket.source.requester_key_id,
    "resolved requester key identity does not match trusted requester packet",
  );
  assertCondition(
    trustedPacket.requester_authentication_packet
      .verification.requester_signature_verified === true,
    "requester signature verification is not present",
  );
  assertCondition(
    trustedPacket.verification
      .composed_acceptance_intent_verified === true,
    "trusted requester acceptance intent is not composed",
  );
  assertCondition(
    registryPacket.verification
      .snapshot_provenance_verified === true,
    "requester registry snapshot provenance is not verified",
  );

  const live = !example;

  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REGISTRY_VERIFICATION_PACKET_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REGISTRY_VERIFICATION_VERSION,
    status: live
      ? "trusted_requester_acceptance_registry_verified"
      : "example_only",
    source: {
      expected_requester_trust_root_id:
        input.expected_requester_trust_root_id,
      requester_snapshot_id:
        registryPacket.snapshot_id,
      requester_snapshot_authentication_id:
        registryPacket.authentication_id,
      requester_registry_id:
        registryPacket.source.registry_id,
      requester_registry_sequence:
        registryPacket.source.sequence,
      requester_trust_root_id:
        registryPacket.source.trust_root_id,
      requester_trust_root_key_id:
        registryPacket.source.trust_root_key_id,
      requester_binding_resolution_at_utc:
        resolutionAtUtc,
      requester_agent_id:
        trustedPacket.source.requester_agent_id,
      requester_key_binding_id:
        trustedPacket.source.requester_key_binding_id,
      requester_key_id:
        trustedPacket.source.requester_key_id,
      requester_authentication_id:
        trustedPacket.source.requester_authentication_id,
      provider_authentication_id:
        trustedPacket.source.provider_authentication_id,
      quote_id:
        trustedPacket.source.quote_id,
      work_order_id:
        trustedPacket.source.work_order_id,
      acceptance_nonce:
        trustedPacket.source.acceptance_nonce,
    },
    requester_trust_registry_packet:
      registryPacket,
    trusted_requester_packet:
      trustedPacket,
    resolved_requester_binding:
      resolvedBinding,
    verification: {
      requester_snapshot_verified: true,
      requester_snapshot_provenance_verified:
        live,
      trusted_provider_chain_verified: true,
      requester_signature_verified: true,
      requester_intent_binding_verified: true,
      composed_acceptance_intent_verified: true,
      requester_agent_identity_verified: true,
      requester_binding_identity_verified: true,
      requester_key_identity_verified: true,
      requester_binding_exact_match_verified: true,
      requester_binding_provenance_verified:
        live,
    },
    acceptance_materialization_gate: {
      eligible_for_acceptance_materialization:
        live,
      reason: live
        ? "requester_binding_provenance_verified"
        : "example_fixture_not_live_trust",
      requester_binding_provenance_required: true,
      separate_acceptance_materialization_required: true,
      requester_authentication_replay_protection_required:
        true,
      requester_authentication_id_consumption_required:
        true,
      provider_authentication_id_consumption_required:
        true,
      acceptance_replay_protection_required:
        true,
      acceptance_id_consumption_required:
        true,
      single_active_acceptance_per_quote_required:
        true,
      acceptance_replay_consumer_verified:
        false,
      production_persistence_consumer_verified:
        false,
      quote_acceptance_not_performed:
        true,
    },
    authority: {
      requester_trust_root_creation: false,
      requester_trust_root_rotation: false,
      requester_trust_root_revocation: false,
      requester_binding_registry_write: false,
      requester_binding_approval: false,
      requester_binding_creation: false,
      requester_binding_rotation: false,
      requester_binding_revocation: false,
      requester_authentication_replay_write:
        false,
      provider_authentication_replay_write:
        false,
      acceptance_replay_write:
        false,
      authentication_id_consumption:
        false,
      acceptance_id_consumption:
        false,
      acceptance_creation:
        false,
      quote_acceptance:
        false,
      provider_selection:
        false,
      quote_publication:
        false,
      payment_rail_resolution:
        false,
      payment_destination_resolution:
        false,
      payment_authorization:
        false,
      payment_execution:
        false,
      work_execution_authorization:
        false,
      work_dispatch:
        false,
      work_credit_write:
        false,
      work_credit_settlement:
        false,
      wallet_access:
        false,
      production_signing:
        false,
      transaction_broadcast:
        false,
      http_submission:
        false,
      credential_issue:
        false,
      credential_change:
        false,
      runtime_mutation:
        false,
      service_restart:
        false,
      deployment:
        false,
      money_movement:
        false,
    },
  };
}

export function verifyPublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationV1(
  inputValue: unknown,
  packetValue: unknown,
): PublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationPacketV1 {
  const expected =
    materializePublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationV1(
      inputValue,
    );
  assertCondition(
    isRecord(packetValue),
    "trusted requester registry verification packet must be an object",
  );
  assertCondition(
    canonicalJson(packetValue)
      === canonicalJson(expected),
    "trusted requester registry verification packet does not match source evidence",
  );
  return expected;
}

function readJson(file: string): unknown {
  const resolved = path.resolve(file);
  const fileStat = fs.lstatSync(resolved);
  assertCondition(
    !fileStat.isSymbolicLink(),
    "symlink input forbidden",
  );
  assertCondition(
    fileStat.isFile(),
    "regular file input required",
  );
  assertCondition(
    fileStat.size <= MAX_JSON_BYTES,
    "JSON input too large",
  );
  return JSON.parse(
    fs.readFileSync(resolved, "utf8"),
  ) as unknown;
}

function usage(): never {
  return fail(
    [
      "usage:",
      "  tsx scripts/public_agent_service_trusted_requester_acceptance_registry_verification_v1.ts materialize <input.json> [packet.json]",
      "  tsx scripts/public_agent_service_trusted_requester_acceptance_registry_verification_v1.ts verify <input.json> <packet.json>",
    ].join("\n"),
  );
}

function main(): void {
  const [
    mode,
    inputPath,
    packetPath,
    ...extra
  ] = process.argv.slice(2);
  assertCondition(
    extra.length === 0,
    "unexpected arguments",
  );
  assertCondition(
    inputPath !== undefined,
    "input path is required",
  );

  if (mode === "materialize") {
    const packet =
      materializePublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationV1(
        readJson(inputPath),
      );
    const output =
      `${JSON.stringify(packet, null, 2)}\n`;
    if (packetPath === undefined) {
      process.stdout.write(output);
    } else {
      fs.writeFileSync(
        path.resolve(packetPath),
        output,
        {
          encoding: "utf8",
          flag: "wx",
          mode: 0o600,
        },
      );
    }
    console.log(`status=${packet.status}`);
    console.log(
      `requester_binding_provenance_verified=${packet.verification.requester_binding_provenance_verified}`,
    );
    console.log(
      `eligible_for_acceptance_materialization=${packet.acceptance_materialization_gate.eligible_for_acceptance_materialization}`,
    );
    console.log(
      "acceptance_replay_consumer_verified=false",
    );
    console.log(
      "authentication_id_consumption=false",
    );
    console.log("acceptance_id_consumption=false");
    console.log("acceptance_creation=false");
    console.log("quote_acceptance=false");
    console.log("payment_authorization=false");
    console.log("payment_execution=false");
    console.log("work_dispatch=false");
    console.log("work_credit_write=false");
    console.log("runtime_mutation=false");
    console.log("money_movement=false");
    return;
  }

  if (
    mode === "verify"
    && packetPath !== undefined
  ) {
    const packet =
      verifyPublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationV1(
        readJson(inputPath),
        readJson(packetPath),
      );
    console.log(`status=${packet.status}`);
    console.log(
      `requester_binding_provenance_verified=${packet.verification.requester_binding_provenance_verified}`,
    );
    console.log(
      `eligible_for_acceptance_materialization=${packet.acceptance_materialization_gate.eligible_for_acceptance_materialization}`,
    );
    console.log(
      "acceptance_replay_consumer_verified=false",
    );
    console.log(
      "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REGISTRY_VERIFICATION_V1_VALID",
    );
    return;
  }

  usage();
}

const invokedUrl = process.argv[1]
  ? pathToFileURL(
      path.resolve(process.argv[1]),
    ).href
  : "";

if (import.meta.url === invokedUrl) {
  try {
    main();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);
    console.error(`HOLD: ${message}`);
    process.exitCode = 1;
  }
}
