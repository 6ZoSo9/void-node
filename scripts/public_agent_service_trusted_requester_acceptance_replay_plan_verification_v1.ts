import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  canonicalJson,
} from "./agent_paid_work_order_envelope_v1.js";
import {
  planPublicAgentServiceAcceptanceMaterializationReplayConsumerV1,
  type PublicAgentServiceAcceptanceMaterializationReplayConsumerPacketV1,
  type PublicAgentServiceAcceptanceMaterializationReplayConsumerV1,
} from "./public_agent_service_acceptance_materialization_replay_consumer_v1.js";
import {
  validateVerifiedAcceptanceReplayConsumerPacketV1,
} from "./public_agent_service_acceptance_persistence_adapter_v1.js";
import {
  materializePublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationV1,
  validatePublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationV1,
  type PublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationPacketV1,
  type PublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationV1,
} from "./public_agent_service_trusted_requester_acceptance_registry_verification_v1.js";

export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REPLAY_PLAN_VERIFICATION_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REPLAY_PLAN_VERIFICATION_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REPLAY_PLAN_VERIFICATION_PACKET_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REPLAY_PLAN_VERIFICATION_PACKET_V1" as const;
export const PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REPLAY_PLAN_VERIFICATION_VERSION =
  1 as const;

const MAX_JSON_BYTES = 32 * 1024 * 1024;

export type PublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1 = {
  marker:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REPLAY_PLAN_VERIFICATION_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REPLAY_PLAN_VERIFICATION_VERSION;
  evidence_mode:
    | "example_fixture"
    | "external_requester_evidence";
  trusted_requester_acceptance_registry_verification_input:
    PublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationV1;
  acceptance_materialization_replay_consumer_input:
    PublicAgentServiceAcceptanceMaterializationReplayConsumerV1;
  catalog_value: unknown;
  work_order_value: unknown;
  quote_value: unknown;
};

export type PublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationPacketV1 = {
  marker:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REPLAY_PLAN_VERIFICATION_PACKET_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REPLAY_PLAN_VERIFICATION_VERSION;
  status:
    | "example_only"
    | "trusted_requester_acceptance_replay_plan_verified";
  source: {
    requester_snapshot_id: string;
    requester_authentication_id: string;
    provider_authentication_id: string;
    handoff_id: string;
    quote_id: string;
    work_order_id: string;
    requester_agent_id: string;
    provider_id: string;
    acceptance_nonce: string;
    plan_id: string;
    acceptance_id: string | null;
    replay_transaction_id: string | null;
    before_state_id: string;
    after_state_id: string | null;
    before_revision: number;
    after_revision: number | null;
  };
  trusted_requester_registry_packet:
    PublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationPacketV1;
  acceptance_replay_plan_packet:
    PublicAgentServiceAcceptanceMaterializationReplayConsumerPacketV1;
  verification: {
    trusted_requester_registry_verification_verified: true;
    requester_binding_provenance_verified: boolean;
    acceptance_materialization_eligibility_verified: boolean;
    requester_authentication_input_exact_match_verified: true;
    requester_authentication_identity_verified: true;
    provider_authentication_identity_verified: true;
    handoff_identity_verified: true;
    quote_identity_verified: true;
    work_order_identity_verified: true;
    requester_identity_verified: true;
    provider_identity_verified: true;
    acceptance_nonce_verified: true;
    acceptance_replay_plan_verified: boolean;
    acceptance_materialized_in_memory: boolean;
    canonical_acceptance_verified: boolean;
    requester_authentication_replay_checked: boolean;
    provider_authentication_replay_checked: boolean;
    acceptance_replay_checked: boolean;
    atomic_three_id_transition_verified: boolean;
    single_active_acceptance_per_quote_verified: boolean;
    expected_revision_verified: boolean;
    all_or_nothing_transition_verified: boolean;
    persistence_handoff_packet_validated: boolean;
  };
  persistence_handoff_gate: {
    eligible_for_operator_confirmed_persistence: boolean;
    reason:
      | "example_fixture_not_live_trust"
      | "verified_replay_plan_requires_separate_operator_confirmation";
    separate_operator_confirmation_required: true;
    persistence_request_not_constructed: true;
    persistence_confirmation_not_supplied: true;
    persistence_adapter_invoked: false;
    production_persistence_performed: false;
    acceptance_created_in_durable_state: false;
    requester_authentication_replay_write_performed: false;
    provider_authentication_replay_write_performed: false;
    acceptance_replay_write_performed: false;
    authentication_ids_consumed_in_durable_state: false;
    acceptance_id_consumed_in_durable_state: false;
    quote_acceptance_recorded: false;
  };
  authority: {
    acceptance_persistence: false;
    quote_acceptance: false;
    requester_authentication_replay_write: false;
    provider_authentication_replay_write: false;
    acceptance_replay_write: false;
    authentication_id_consumption: false;
    acceptance_id_consumption: false;
    acceptance_creation: false;
    payment_authorization: false;
    payment_execution: false;
    execution_authorization: false;
    work_dispatch: false;
    credential_issue: false;
    credential_change: false;
    provider_selection: false;
    requester_key_registry_write: false;
    provider_key_registry_write: false;
    wallet_access: false;
    production_signing: false;
    transaction_broadcast: false;
    work_credit_write: false;
    work_credit_settlement: false;
    http_submission: false;
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

export function validatePublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1(
  value: unknown,
): PublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1 {
  const root = requireRecord(
    value,
    "trusted requester acceptance replay-plan verification input",
  );
  requireExactKeys(
    root,
    "trusted requester acceptance replay-plan verification input",
    [
      "marker",
      "version",
      "evidence_mode",
      "trusted_requester_acceptance_registry_verification_input",
      "acceptance_materialization_replay_consumer_input",
      "catalog_value",
      "work_order_value",
      "quote_value",
    ],
  );
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REPLAY_PLAN_VERIFICATION_MARKER,
    "trusted requester acceptance replay-plan verification marker mismatch",
  );
  assertCondition(
    root.version
      === PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REPLAY_PLAN_VERIFICATION_VERSION,
    "trusted requester acceptance replay-plan verification version mismatch",
  );
  assertCondition(
    root.evidence_mode === "example_fixture"
      || root.evidence_mode === "external_requester_evidence",
    "trusted requester acceptance replay-plan verification evidence mode is invalid",
  );

  const trustedInput =
    validatePublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationV1(
      root.trusted_requester_acceptance_registry_verification_input,
    );
  const replayInput = requireRecord(
    root.acceptance_materialization_replay_consumer_input,
    "acceptance replay-consumer input",
  ) as unknown as PublicAgentServiceAcceptanceMaterializationReplayConsumerV1;

  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REPLAY_PLAN_VERIFICATION_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REPLAY_PLAN_VERIFICATION_VERSION,
    evidence_mode:
      root.evidence_mode,
    trusted_requester_acceptance_registry_verification_input:
      trustedInput,
    acceptance_materialization_replay_consumer_input:
      replayInput,
    catalog_value:
      root.catalog_value,
    work_order_value:
      root.work_order_value,
    quote_value:
      root.quote_value,
  };
}

function exactIdentityChecks(
  trustedPacket:
    PublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationPacketV1,
  replayPacket:
    PublicAgentServiceAcceptanceMaterializationReplayConsumerPacketV1,
): void {
  const trustedSource =
    trustedPacket.source;
  const upstreamSource =
    trustedPacket.trusted_requester_packet.source;

  const checks: Array<
    [unknown, unknown, string]
  > = [
    [
      replayPacket.source.requester_authentication_id,
      trustedSource.requester_authentication_id,
      "requester_authentication_id",
    ],
    [
      replayPacket.source.provider_authentication_id,
      trustedSource.provider_authentication_id,
      "provider_authentication_id",
    ],
    [
      replayPacket.source.handoff_id,
      upstreamSource.handoff_id,
      "handoff_id",
    ],
    [
      replayPacket.source.quote_id,
      trustedSource.quote_id,
      "quote_id",
    ],
    [
      replayPacket.source.work_order_id,
      trustedSource.work_order_id,
      "work_order_id",
    ],
    [
      replayPacket.source.requester_agent_id,
      trustedSource.requester_agent_id,
      "requester_agent_id",
    ],
    [
      replayPacket.source.provider_id,
      upstreamSource.provider_id,
      "provider_id",
    ],
    [
      replayPacket.source.acceptance_nonce,
      trustedSource.acceptance_nonce,
      "acceptance_nonce",
    ],
  ];
  for (const [actual, expected, label] of checks) {
    assertCondition(
      actual === expected,
      `acceptance replay-plan ${label} does not match trusted requester registry evidence`,
    );
  }
}

export function materializePublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1(
  inputValue: unknown,
): PublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationPacketV1 {
  const input =
    validatePublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1(
      inputValue,
    );
  const example =
    input.evidence_mode === "example_fixture";
  const trustedInput =
    input.trusted_requester_acceptance_registry_verification_input;
  const replayInput =
    input.acceptance_materialization_replay_consumer_input;

  if (example) {
    assertCondition(
      trustedInput.evidence_mode === "example_fixture",
      "example composition requires example trusted requester registry evidence",
    );
    assertCondition(
      replayInput.mode === "example_fixture",
      "example composition requires example replay-consumer evidence",
    );
  } else {
    assertCondition(
      trustedInput.evidence_mode === "external_requester_evidence",
      "external composition requires external trusted requester registry evidence",
    );
    assertCondition(
      replayInput.mode === "external_requester_evidence",
      "external composition requires external replay-consumer evidence",
    );
  }

  const trustedRequesterAuthenticationInput =
    trustedInput
      .trusted_requester_acceptance_verification_input
      .requester_acceptance_authentication_input;
  assertCondition(
    canonicalJson(
      replayInput.requester_authentication_input,
    )
      === canonicalJson(
        trustedRequesterAuthenticationInput,
      ),
    "replay-consumer requester authentication input does not exactly match trusted requester registry evidence",
  );

  const trustedPacket =
    materializePublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationV1(
      trustedInput,
    );
  const replayPacket =
    planPublicAgentServiceAcceptanceMaterializationReplayConsumerV1(
      replayInput,
      input.catalog_value,
      input.work_order_value,
      input.quote_value,
    );

  exactIdentityChecks(
    trustedPacket,
    replayPacket,
  );

  assertCondition(
    trustedPacket.verification
      .trusted_provider_chain_verified === true,
    "trusted provider chain is not verified",
  );
  assertCondition(
    trustedPacket.verification
      .requester_signature_verified === true,
    "requester signature is not verified",
  );
  assertCondition(
    trustedPacket.verification
      .requester_binding_exact_match_verified === true,
    "requester registry binding is not the exact signature-verification binding",
  );

  if (example) {
    assertCondition(
      trustedPacket.status === "example_only",
      "example trusted requester registry packet became live",
    );
    assertCondition(
      trustedPacket.verification
        .requester_binding_provenance_verified === false,
      "example trusted requester packet claimed live provenance",
    );
    assertCondition(
      trustedPacket.acceptance_materialization_gate
        .eligible_for_acceptance_materialization === false,
      "example trusted requester packet became materialization eligible",
    );
    assertCondition(
      replayPacket.status === "example_only",
      "example replay plan became live",
    );
    assertCondition(
      replayPacket.acceptance.acceptance_materialized_in_memory === false,
      "example replay plan materialized an acceptance",
    );
    assertCondition(
      replayPacket.acceptance.acceptance_created_in_durable_state === false,
      "example replay plan claimed durable acceptance",
    );
    assertCondition(
      replayPacket.replay.next_state === null
        && replayPacket.replay.transaction === null,
      "example replay plan created a transition",
    );
  } else {
    assertCondition(
      trustedPacket.status
        === "trusted_requester_acceptance_registry_verified",
      "external trusted requester registry packet is not verified",
    );
    assertCondition(
      trustedPacket.verification
        .requester_binding_provenance_verified === true,
      "external requester binding provenance is not verified",
    );
    assertCondition(
      trustedPacket.acceptance_materialization_gate
        .eligible_for_acceptance_materialization === true,
      "external trusted requester packet is not materialization eligible",
    );
    assertCondition(
      replayPacket.status
        === "acceptance_materialization_planned",
      "external acceptance replay plan is not verified",
    );
    assertCondition(
      replayPacket.acceptance.acceptance_materialized_in_memory === true,
      "external replay plan did not materialize an in-memory acceptance",
    );
    assertCondition(
      replayPacket.acceptance.acceptance_created_in_durable_state === false,
      "external replay plan already claims durable acceptance",
    );
    assertCondition(
      replayPacket.acceptance.acceptance_id !== null
        && replayPacket.acceptance.acceptance_envelope !== null,
      "external replay plan omitted acceptance evidence",
    );
    assertCondition(
      replayPacket.replay.next_state !== null
        && replayPacket.replay.transaction !== null,
      "external replay plan omitted its next state or transaction",
    );
    assertCondition(
      replayPacket.replay.transaction.atomic_consumption_count === 3,
      "external replay plan does not contain one atomic three-ID transition",
    );
    assertCondition(
      replayPacket.replay.transaction
        .single_active_acceptance_per_quote_enforced === true,
      "external replay plan did not enforce one active acceptance per quote",
    );
    assertCondition(
      replayPacket.replay.requester_authentication_replay_checked === true
        && replayPacket.replay.provider_authentication_replay_checked === true
        && replayPacket.replay.acceptance_replay_checked === true,
      "external replay plan omitted a replay check",
    );
    assertCondition(
      replayPacket.replay.expected_revision_checked === true,
      "external replay plan did not verify the expected revision",
    );
    assertCondition(
      replayPacket.replay.all_or_nothing_transition_verified === true,
      "external replay plan is not all-or-nothing",
    );
    assertCondition(
      replayPacket.source_evidence
        .production_persistence_consumer_verified === false
        && replayPacket.replay
          .production_persistence_consumer_verified === false,
      "upstream replay plan unexpectedly claims production persistence",
    );

    // Read-only structural handoff validation. This function validates the
    // exact packet accepted by the persistence adapter, but performs no
    // filesystem access and does not receive a persistence request,
    // confirmation, configuration, root, or write callback.
    validateVerifiedAcceptanceReplayConsumerPacketV1(
      replayPacket,
    );
  }

  const live =
    !example;
  const transaction =
    replayPacket.replay.transaction;
  const nextState =
    replayPacket.replay.next_state;
  const acceptance =
    replayPacket.acceptance;

  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REPLAY_PLAN_VERIFICATION_PACKET_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REPLAY_PLAN_VERIFICATION_VERSION,
    status: live
      ? "trusted_requester_acceptance_replay_plan_verified"
      : "example_only",
    source: {
      requester_snapshot_id:
        trustedPacket.source.requester_snapshot_id,
      requester_authentication_id:
        trustedPacket.source.requester_authentication_id,
      provider_authentication_id:
        trustedPacket.source.provider_authentication_id,
      handoff_id:
        trustedPacket.trusted_requester_packet.source.handoff_id,
      quote_id:
        trustedPacket.source.quote_id,
      work_order_id:
        trustedPacket.source.work_order_id,
      requester_agent_id:
        trustedPacket.source.requester_agent_id,
      provider_id:
        trustedPacket.trusted_requester_packet.source.provider_id,
      acceptance_nonce:
        trustedPacket.source.acceptance_nonce,
      plan_id:
        replayPacket.plan_id,
      acceptance_id:
        acceptance.acceptance_id,
      replay_transaction_id:
        transaction?.transaction_id ?? null,
      before_state_id:
        replayPacket.replay.before_state.state_id,
      after_state_id:
        nextState?.state_id ?? null,
      before_revision:
        replayPacket.replay.before_state.revision,
      after_revision:
        nextState?.revision ?? null,
    },
    trusted_requester_registry_packet:
      trustedPacket,
    acceptance_replay_plan_packet:
      replayPacket,
    verification: {
      trusted_requester_registry_verification_verified:
        true,
      requester_binding_provenance_verified:
        live,
      acceptance_materialization_eligibility_verified:
        live,
      requester_authentication_input_exact_match_verified:
        true,
      requester_authentication_identity_verified:
        true,
      provider_authentication_identity_verified:
        true,
      handoff_identity_verified:
        true,
      quote_identity_verified:
        true,
      work_order_identity_verified:
        true,
      requester_identity_verified:
        true,
      provider_identity_verified:
        true,
      acceptance_nonce_verified:
        true,
      acceptance_replay_plan_verified:
        live,
      acceptance_materialized_in_memory:
        live,
      canonical_acceptance_verified:
        live,
      requester_authentication_replay_checked:
        live,
      provider_authentication_replay_checked:
        live,
      acceptance_replay_checked:
        live,
      atomic_three_id_transition_verified:
        live,
      single_active_acceptance_per_quote_verified:
        live,
      expected_revision_verified:
        live,
      all_or_nothing_transition_verified:
        live,
      persistence_handoff_packet_validated:
        live,
    },
    persistence_handoff_gate: {
      eligible_for_operator_confirmed_persistence:
        live,
      reason: live
        ? "verified_replay_plan_requires_separate_operator_confirmation"
        : "example_fixture_not_live_trust",
      separate_operator_confirmation_required:
        true,
      persistence_request_not_constructed:
        true,
      persistence_confirmation_not_supplied:
        true,
      persistence_adapter_invoked:
        false,
      production_persistence_performed:
        false,
      acceptance_created_in_durable_state:
        false,
      requester_authentication_replay_write_performed:
        false,
      provider_authentication_replay_write_performed:
        false,
      acceptance_replay_write_performed:
        false,
      authentication_ids_consumed_in_durable_state:
        false,
      acceptance_id_consumed_in_durable_state:
        false,
      quote_acceptance_recorded:
        false,
    },
    authority: {
      acceptance_persistence:
        false,
      quote_acceptance:
        false,
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
      payment_authorization:
        false,
      payment_execution:
        false,
      execution_authorization:
        false,
      work_dispatch:
        false,
      credential_issue:
        false,
      credential_change:
        false,
      provider_selection:
        false,
      requester_key_registry_write:
        false,
      provider_key_registry_write:
        false,
      wallet_access:
        false,
      production_signing:
        false,
      transaction_broadcast:
        false,
      work_credit_write:
        false,
      work_credit_settlement:
        false,
      http_submission:
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

export function verifyPublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1(
  inputValue: unknown,
  packetValue: unknown,
): PublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationPacketV1 {
  const expected =
    materializePublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1(
      inputValue,
    );
  assertCondition(
    isRecord(packetValue),
    "trusted requester acceptance replay-plan packet must be an object",
  );
  assertCondition(
    canonicalJson(packetValue)
      === canonicalJson(expected),
    "trusted requester acceptance replay-plan packet does not match source evidence",
  );
  return expected;
}

function readJson(file: string): unknown {
  const resolved =
    path.resolve(file);
  const fileStat =
    fs.lstatSync(resolved);
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
      "  tsx scripts/public_agent_service_trusted_requester_acceptance_replay_plan_verification_v1.ts materialize <input.json> [packet.json]",
      "  tsx scripts/public_agent_service_trusted_requester_acceptance_replay_plan_verification_v1.ts verify <input.json> <packet.json>",
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
      materializePublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1(
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
      `acceptance_replay_plan_verified=${packet.verification.acceptance_replay_plan_verified}`,
    );
    console.log(
      `persistence_handoff_packet_validated=${packet.verification.persistence_handoff_packet_validated}`,
    );
    console.log(
      `eligible_for_operator_confirmed_persistence=${packet.persistence_handoff_gate.eligible_for_operator_confirmed_persistence}`,
    );
    console.log("production_persistence_performed=false");
    console.log("authentication_id_consumption=false");
    console.log("acceptance_id_consumption=false");
    console.log("quote_acceptance=false");
    console.log("payment_authorization=false");
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
      verifyPublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1(
        readJson(inputPath),
        readJson(packetPath),
      );
    console.log(`status=${packet.status}`);
    console.log(
      `acceptance_replay_plan_verified=${packet.verification.acceptance_replay_plan_verified}`,
    );
    console.log(
      `persistence_handoff_packet_validated=${packet.verification.persistence_handoff_packet_validated}`,
    );
    console.log(
      `eligible_for_operator_confirmed_persistence=${packet.persistence_handoff_gate.eligible_for_operator_confirmed_persistence}`,
    );
    console.log("production_persistence_performed=false");
    console.log("authentication_id_consumption=false");
    console.log("acceptance_id_consumption=false");
    console.log("quote_acceptance=false");
    console.log("payment_authorization=false");
    console.log("work_dispatch=false");
    console.log("work_credit_write=false");
    console.log("runtime_mutation=false");
    console.log("money_movement=false");
    console.log(
      "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REPLAY_PLAN_VERIFICATION_V1_EXACT_GREEN",
    );
    return;
  }

  usage();
}

const invokedUrl =
  process.argv[1] === undefined
    ? ""
    : pathToFileURL(
        path.resolve(process.argv[1]),
      ).href;
if (import.meta.url === invokedUrl) {
  main();
}
