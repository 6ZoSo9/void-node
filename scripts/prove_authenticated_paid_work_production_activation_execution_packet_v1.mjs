#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repo = process.cwd();
const packetPath = path.join(
  repo,
  "config/activation-candidates/authenticated-paid-work-production-activation-execution-packet-v1.json",
);
const packet = JSON.parse(fs.readFileSync(packetPath, "utf8"));

const EXPECTED_REVIEWED_MAIN =
  "32cd4883b95354ab979d12640ffd2e2ac1279e57";

const EXPECTED_SOURCE_COMMITS = Object.freeze({
  activation_configuration_instance:
    "27dc14a7e59967744ef5c65e6b28e84b265b1565",
  trusted_context_reference_metadata:
    "ac074d53ab937d302c69b6bff54f02d064e37d57",
  rollback_plan:
    "cb57842cbb53fcad7ed6861d829058635af9308c",
  service_unit_design:
    "09ddef7d672b57484bbf853d500fd47d9537c5fb",
  credential_reference_metadata:
    "1c0d4d842210158aeac466deb8e0918aa7443997",
  bounded_replay_snapshot:
    "54795a9e35a19067559d0cb315b0ea2669c59088",
  execution_confirmation:
    "b32a13792bb4d94fb0da52c175930e9ccf03d631",
  live_canary_scope:
    "92daf8ec4668c78768f97876a039f8301909573e",
  direct_authentication:
    "97dd668fdbe8e3329cc5a083df010a1ffd6050c8",
  direct_activation_persistence:
    "2bf85f63e7f49a87e3e4e5f8450076b05078369f",
  fresh_direct_quote_authentication_preparation:
    "a371372213782e8b55d678d28dc5291559ad02ee",
  fresh_direct_quote_signing_handoff:
    "32cd4883b95354ab979d12640ffd2e2ac1279e57",
});

const FORBIDDEN_UNRELATED_COMMIT =
  "44d9a95e335e9ebabd65e60f7e388385e0d14abe";

function check(value, message) {
  if (!value) throw new Error(message);
}

check(
  packet.marker ===
    "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_EXECUTION_PACKET_V1",
  "marker mismatch",
);
check(packet.version === 1, "version mismatch");
check(
  packet.status === "source_ready_execution_not_authorized",
  "status mismatch",
);
check(
  packet.reviewed_source_main === EXPECTED_REVIEWED_MAIN,
  "reviewed source main mismatch",
);
check(
  packet.target.host === "zoso-Precision-Tower-7810",
  "target host mismatch",
);
check(packet.target.runtime_user === "zoso", "runtime user mismatch");
check(
  packet.target.manager_scope === "systemd_user",
  "manager scope mismatch",
);
check(
  packet.target.start_mode === "manual_oneshot",
  "start mode mismatch",
);

const required = packet.required_source_commits;
check(
  required !== null &&
    typeof required === "object" &&
    !Array.isArray(required),
  "required source commits must be an object",
);

assert.deepEqual(
  Object.keys(required).sort(),
  Object.keys(EXPECTED_SOURCE_COMMITS).sort(),
  "required source commit keys mismatch",
);

for (const [name, expectedCommit] of Object.entries(
  EXPECTED_SOURCE_COMMITS,
)) {
  check(
    required[name] === expectedCommit,
    `${name} source binding mismatch`,
  );
}

const commits = Object.values(required);
check(commits.length === 12, "required source commit count mismatch");
check(
  commits.every(
    (value) =>
      typeof value === "string" && /^[0-9a-f]{40}$/.test(value),
  ),
  "invalid source commit",
);
check(
  new Set(commits).size === commits.length,
  "unexpected source commit collapse",
);
check(
  !commits.includes(FORBIDDEN_UNRELATED_COMMIT),
  "unrelated WC preflight commit is bound as an activation source",
);

const gates = packet.ordered_execution_gates;
check(
  Array.isArray(gates) && gates.length === 18,
  "ordered gate count mismatch",
);
check(
  gates[0] === "capture_current_origin_main",
  "first gate mismatch",
);
check(
  gates[4] === "privately_verify_trusted_context_reference",
  "trusted-context verification gate mismatch",
);
check(
  gates[5] === "privately_verify_fresh_credential_reference",
  "credential verification gate mismatch",
);
check(
  gates[6] === "materialize_fresh_direct_provider_signing_request",
  "provider signing-request gate mismatch",
);
check(
  gates[7] ===
    "verify_provider_signature_and_materialize_requester_signing_request",
  "provider verification gate mismatch",
);
check(
  gates[8] ===
    "verify_requester_signature_and_finalize_direct_authentication_preparation",
  "requester verification gate mismatch",
);
check(
  gates[9] ===
    "independently_verify_final_direct_authentication_packet",
  "final authentication verification gate mismatch",
);
check(
  gates[12] ===
    "obtain_fresh_operation_bound_confirmation_from_zoso",
  "confirmation gate mismatch",
);
check(
  gates.at(-1) ===
    "make_separate_post_execution_readiness_decision",
  "terminal gate mismatch",
);
check(new Set(gates).size === gates.length, "duplicate gate");

const inputs = packet.mandatory_runtime_inputs;
assert.deepEqual(
  inputs,
  {
    fresh_origin_main: null,
    trusted_context_reference_verified: false,
    credential_reference_verified_and_fresh: false,
    provider_signature_verified: false,
    requester_signature_verified: false,
    fresh_direct_authentication_packet_sha256: null,
    execution_plan_sha256: null,
    fresh_zoso_confirmation: null,
    fresh_quote_required: true,
  },
  "mandatory runtime inputs must remain exactly unresolved",
);

const failures = packet.fail_closed_conditions;
check(
  Array.isArray(failures) && failures.length === 11,
  "fail-closed condition count mismatch",
);
for (const requiredFailure of [
  "origin_main_changes_after_plan_digest",
  "source_artifact_mismatch",
  "trusted_context_reference_mismatch",
  "provider_or_requester_signature_binding_mismatch",
  "fresh_direct_authentication_packet_mismatch",
  "quote_expired_or_previously_consumed",
  "any_unreviewed_mutation_required",
]) {
  check(
    failures.includes(requiredFailure),
    `fail-closed condition missing: ${requiredFailure}`,
  );
}

const authority = packet.authority;
check(
  authority !== null &&
    typeof authority === "object" &&
    !Array.isArray(authority),
  "authority must be an object",
);
const authorityValues = Object.values(authority);
check(
  authorityValues.length === 12,
  "authority boundary count mismatch",
);
check(
  authorityValues.every((value) => value === false),
  "source packet grants authority",
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
console.log(`reviewed_source_main=${packet.reviewed_source_main}`);
console.log(`required_source_commits=${commits.length}`);
console.log("source_binding_semantic_map_exact=true");
console.log("activation_configuration_source_bound=true");
console.log("trusted_context_source_bound=true");
console.log("unrelated_wc_preflight_source_absent=true");
console.log(`ordered_execution_gates=${gates.length}`);
console.log("fresh_direct_signing_gates=4");
console.log(`fail_closed_conditions=${failures.length}`);
console.log(`denied_authorities=${authorityValues.length}`);
console.log("fresh_quote_required=true");
console.log("provider_signature_verified=false");
console.log("requester_signature_verified=false");
console.log("fresh_zoso_confirmation_required=true");
console.log(
  "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_EXECUTION_PACKET_V1_PROOF_GREEN=true",
);
