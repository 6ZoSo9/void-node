#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repo = process.cwd();
const packetPath = path.join(
  repo,
  "config/activation-candidates/authenticated-paid-work-production-activation-execution-packet-v1.json",
);
const packet = JSON.parse(fs.readFileSync(packetPath, "utf8"));

const EXPECTED_MAIN = "32cd4883b95354ab979d12640ffd2e2ac1279e57";
const EXPECTED_PREPARATION =
  "a371372213782e8b55d678d28dc5291559ad02ee";
const EXPECTED_HANDOFF =
  "32cd4883b95354ab979d12640ffd2e2ac1279e57";

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
  packet.reviewed_source_main === EXPECTED_MAIN,
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
const commits = Object.values(required);
check(commits.length === 11, "required source commit count mismatch");
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
  required.fresh_direct_quote_authentication_preparation ===
    EXPECTED_PREPARATION,
  "fresh preparation source binding mismatch",
);
check(
  required.fresh_direct_quote_signing_handoff === EXPECTED_HANDOFF,
  "signing handoff source binding mismatch",
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
check(
  new Set(gates).size === gates.length,
  "duplicate gate",
);

const inputs = packet.mandatory_runtime_inputs;
check(
  Object.keys(inputs).length === 9,
  "mandatory runtime input count mismatch",
);
check(
  inputs.fresh_origin_main === null,
  "source packet must not capture future main",
);
check(
  inputs.trusted_context_reference_verified === false,
  "trusted context must remain unverified",
);
check(
  inputs.credential_reference_verified_and_fresh === false,
  "credential must remain unverified",
);
check(
  inputs.provider_signature_verified === false,
  "provider signature must remain unverified",
);
check(
  inputs.requester_signature_verified === false,
  "requester signature must remain unverified",
);
check(
  inputs.fresh_direct_authentication_packet_sha256 === null,
  "fresh authentication packet digest must remain absent",
);
check(
  inputs.execution_plan_sha256 === null,
  "execution plan digest must remain absent",
);
check(
  inputs.fresh_zoso_confirmation === null,
  "confirmation must remain absent",
);
check(
  inputs.fresh_quote_required === true,
  "fresh quote requirement missing",
);

const failures = packet.fail_closed_conditions;
check(
  Array.isArray(failures) && failures.length === 11,
  "fail-closed condition count mismatch",
);
check(
  failures.includes("origin_main_changes_after_plan_digest"),
  "dynamic main drift guard missing",
);
check(
  failures.includes(
    "provider_or_requester_signature_binding_mismatch",
  ),
  "signature binding guard missing",
);
check(
  failures.includes(
    "fresh_direct_authentication_packet_mismatch",
  ),
  "final authentication packet guard missing",
);
check(
  failures.includes("quote_expired_or_previously_consumed"),
  "fresh quote guard missing",
);

const authorityValues = Object.values(packet.authority);
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
