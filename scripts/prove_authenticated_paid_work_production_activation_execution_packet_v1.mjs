#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repo = process.cwd();
const packetPath = path.join(repo, "config/activation-candidates/authenticated-paid-work-production-activation-execution-packet-v1.json");
const packet = JSON.parse(fs.readFileSync(packetPath, "utf8"));

const EXPECTED_MAIN = "32cd4883b95354ab979d12640ffd2e2ac1279e57";
const EXPECTED_COMMITS = {"activation_configuration_instance":"44d9a95e335e9ebabd65e60f7e388385e0d14abe","bounded_replay_snapshot":"54795a9e35a19067559d0cb315b0ea2669c59088","credential_reference_metadata":"1c0d4d842210158aeac466deb8e0918aa7443997","direct_activation_persistence":"2bf85f63e7f49a87e3e4e5f8450076b05078369f","direct_authentication":"97dd668fdbe8e3329cc5a083df010a1ffd6050c8","execution_confirmation":"b32a13792bb4d94fb0da52c175930e9ccf03d631","fresh_direct_quote_authentication_preparation":"a371372213782e8b55d678d28dc5291559ad02ee","live_canary_scope":"92daf8ec4668c78768f97876a039f8301909573e","rollback_plan":"cb57842cbb53fcad7ed6861d829058635af9308c","service_unit_design":"09ddef7d672b57484bbf853d500fd47d9537c5fb"};
const EXPECTED_GATES = ["capture_current_origin_main","verify_required_source_artifacts","verify_disabled_runtime_preimage","verify_fresh_persistence_state","privately_verify_trusted_context_reference","privately_verify_fresh_credential_reference","materialize_and_verify_fresh_direct_authentication_preparation","materialize_non_secret_execution_plan","compute_canonical_execution_plan_sha256","obtain_fresh_operation_bound_confirmation_from_zoso","revalidate_origin_main_and_all_prestates","perform_reviewed_one_shot_activation","execute_exactly_one_fresh_paid_work_canary","capture_sanitized_post_execution_evidence","make_separate_post_execution_readiness_decision"];
const EXPECTED_FAILS = ["origin_main_changes_after_plan_digest","source_artifact_mismatch","runtime_preimage_drift","non_fresh_or_revoked_credential","trusted_context_reference_mismatch","non_empty_or_unexpected_replay_state","fresh_direct_authentication_preparation_mismatch_expired_or_unverified","confirmation_missing_expired_or_mismatched","quote_expired_or_previously_consumed","any_unreviewed_mutation_required"];
const EXPECTED_AUTHORITY_KEYS = ["execution_authorized","deployment_authorized","service_start_authorized","credential_access_authorized","quote_acceptance_authorized","payment_authority_granted","payment_execution_authorized","work_dispatch_authorized","work_credit_write_authorized","wallet_or_signer_access_authorized","transaction_broadcast_authorized","fund_movement_authorized"];

function check(value, message) {
  if (!value) throw new Error(message);
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    const output = {};
    for (const key of Object.keys(value).sort()) {
      output[key] = canonical(value[key]);
    }
    return output;
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonical(value));
}

check(packet.marker === "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_EXECUTION_PACKET_V1", "marker mismatch");
check(packet.version === 1, "version mismatch");
check(
  packet.status === "source_ready_execution_not_authorized",
  "status mismatch",
);
check(packet.reviewed_source_main === EXPECTED_MAIN, "reviewed main mismatch");
check(packet.target.host === "zoso-Precision-Tower-7810", "target host mismatch");
check(packet.target.runtime_user === "zoso", "runtime user mismatch");
check(packet.target.manager_scope === "systemd_user", "manager scope mismatch");
check(packet.target.start_mode === "manual_oneshot", "start mode mismatch");

check(
  canonicalJson(packet.required_source_commits) ===
    canonicalJson(EXPECTED_COMMITS),
  "required source commit map mismatch",
);
const commits = Object.values(packet.required_source_commits);
check(commits.length === 10, "required source commit count mismatch");
check(
  commits.every(
    (value) => typeof value === "string" && /^[0-9a-f]{40}$/.test(value),
  ),
  "invalid required source commit",
);
check(
  packet.required_source_commits.fresh_direct_quote_authentication_preparation ===
    "a371372213782e8b55d678d28dc5291559ad02ee",
  "fresh preparation commit mismatch",
);
check(
  packet.required_source_commits.live_canary_scope ===
    "92daf8ec4668c78768f97876a039f8301909573e",
  "live-canary source mismatch",
);
check(
  packet.required_source_commits.direct_activation_persistence ===
    "2bf85f63e7f49a87e3e4e5f8450076b05078369f",
  "direct persistence source mismatch",
);

check(
  canonicalJson(packet.ordered_execution_gates) ===
    canonicalJson(EXPECTED_GATES),
  "ordered gate contract mismatch",
);
check(packet.ordered_execution_gates.length === 15, "gate count mismatch");
check(
  packet.ordered_execution_gates[6] ===
    "materialize_and_verify_fresh_direct_authentication_preparation",
  "fresh preparation gate position mismatch",
);
check(
  packet.ordered_execution_gates[9] ===
    "obtain_fresh_operation_bound_confirmation_from_zoso",
  "ZoSo confirmation gate position mismatch",
);
check(
  packet.ordered_execution_gates.at(-1) ===
    "make_separate_post_execution_readiness_decision",
  "terminal gate mismatch",
);

const inputs = packet.mandatory_runtime_inputs;
check(inputs.fresh_origin_main === null, "future main must remain absent");
check(
  inputs.trusted_context_reference_verified === false,
  "trusted context must remain unverified",
);
check(
  inputs.credential_reference_verified_and_fresh === false,
  "credential must remain unverified",
);
check(
  inputs.fresh_direct_authentication_preparation_packet_sha256 === null,
  "fresh preparation digest must remain absent",
);
check(
  inputs.external_provider_and_requester_signatures_verified === false,
  "external signatures must remain unverified",
);
check(
  inputs.execution_plan_sha256 === null,
  "execution plan digest must remain absent",
);
check(
  inputs.fresh_zoso_confirmation === null,
  "ZoSo confirmation must remain absent",
);
check(inputs.fresh_quote_required === true, "fresh quote requirement missing");

check(
  canonicalJson(packet.fail_closed_conditions) ===
    canonicalJson(EXPECTED_FAILS),
  "fail-closed contract mismatch",
);
check(packet.fail_closed_conditions.length === 10, "fail-closed count mismatch");

check(
  canonicalJson(Object.keys(packet.authority).sort()) ===
    canonicalJson([...EXPECTED_AUTHORITY_KEYS].sort()),
  "authority key set mismatch",
);
check(
  Object.values(packet.authority).every((value) => value === false),
  "source packet grants authority",
);

const recomposition = packet.source_recomposition;
check(recomposition.predecessor_pr === 947, "predecessor PR mismatch");
check(
  recomposition.predecessor_head === "031279b4bbb73cde6c5ee39c2ca31aca1a41c629",
  "predecessor head mismatch",
);
check(recomposition.predecessor_preserved === true, "predecessor not preserved");
check(
  recomposition.current_main_bound_at_recomposition === EXPECTED_MAIN,
  "recomposition main mismatch",
);
check(
  recomposition.fresh_direct_authentication_preparation_is_canonical_source ===
    true,
  "canonical preparation source flag missing",
);
check(
  recomposition.stale_signing_handoff_pr_required === false,
  "stale signing handoff incorrectly required",
);

const source = fs.readFileSync(packetPath, "utf8");
check(
  !/(private[_ -]?key|seed phrase|bearer |authorization:|sk-[a-z0-9])/i.test(
    source,
  ),
  "secret-like content detected",
);
check(
  Number.parseInt(process.versions.node.split(".")[0], 10) === 22,
  "Node.js 22 required",
);

console.log("packet_status=source_ready_execution_not_authorized");
console.log(`reviewed_source_main=${EXPECTED_MAIN}`);
console.log(`required_source_commits=${commits.length}`);
console.log(`ordered_execution_gates=${packet.ordered_execution_gates.length}`);
console.log(`fail_closed_conditions=${packet.fail_closed_conditions.length}`);
console.log(`denied_authorities=${Object.values(packet.authority).length}`);
console.log("fresh_quote_required=true");
console.log("fresh_direct_authentication_preparation_required=true");
console.log("external_provider_and_requester_signatures_required=true");
console.log("fresh_zoso_confirmation_required=true");
console.log("VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_EXECUTION_PACKET_V1_PROOF_GREEN=true");
