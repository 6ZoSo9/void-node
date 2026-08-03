#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repo = process.cwd();
const packetPath = path.join(repo, "config/activation-candidates/authenticated-paid-work-production-activation-execution-packet-v1.json");
const packet = JSON.parse(fs.readFileSync(packetPath, "utf8"));

function check(value, message) {
  if (!value) throw new Error(message);
}

check(packet.marker === "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_EXECUTION_PACKET_V1", "marker mismatch");
check(packet.version === 1, "version mismatch");
check(packet.status === "source_ready_execution_not_authorized", "status mismatch");
check(/^[0-9a-f]{40}$/.test(packet.reviewed_source_main), "reviewed source main mismatch");
check(packet.target.host === "zoso-Precision-Tower-7810", "target host mismatch");
check(packet.target.runtime_user === "zoso", "runtime user mismatch");
check(packet.target.manager_scope === "systemd_user", "manager scope mismatch");
check(packet.target.start_mode === "manual_oneshot", "start mode mismatch");

const commits = Object.values(packet.required_source_commits);
check(commits.length === 9, "required source commit count mismatch");
check(commits.every((value) => typeof value === "string" && /^[0-9a-f]{40}$/.test(value)), "invalid source commit");
check(new Set(commits).size >= 8, "unexpected source commit collapse");

check(Array.isArray(packet.ordered_execution_gates) && packet.ordered_execution_gates.length === 14, "ordered gate count mismatch");
check(packet.ordered_execution_gates[0] === "capture_current_origin_main", "first gate mismatch");
check(packet.ordered_execution_gates[8] === "obtain_fresh_operation_bound_confirmation_from_zoso", "confirmation gate mismatch");
check(packet.ordered_execution_gates.at(-1) === "make_separate_post_execution_readiness_decision", "terminal gate mismatch");
check(new Set(packet.ordered_execution_gates).size === packet.ordered_execution_gates.length, "duplicate gate");

const inputs = packet.mandatory_runtime_inputs;
check(inputs.fresh_origin_main === null, "source packet must not capture future main");
check(inputs.trusted_context_reference_verified === false, "trusted context must remain unverified");
check(inputs.credential_reference_verified_and_fresh === false, "credential must remain unverified");
check(inputs.execution_plan_sha256 === null, "execution plan digest must remain absent");
check(inputs.fresh_zoso_confirmation === null, "confirmation must remain absent");
check(inputs.fresh_quote_required === true, "fresh quote requirement missing");

check(Array.isArray(packet.fail_closed_conditions) && packet.fail_closed_conditions.length === 9, "fail-closed condition count mismatch");
check(packet.fail_closed_conditions.includes("origin_main_changes_after_plan_digest"), "dynamic main drift guard missing");
check(packet.fail_closed_conditions.includes("quote_expired_or_previously_consumed"), "fresh quote guard missing");

const authorityValues = Object.values(packet.authority);
check(authorityValues.length === 12, "authority boundary count mismatch");
check(authorityValues.every((value) => value === false), "source packet grants authority");

const source = fs.readFileSync(packetPath, "utf8");
check(!/(private[_ -]?key|seed phrase|bearer |authorization:|sk-[a-z0-9])/i.test(source), "secret-like content detected");
check(Number.parseInt(process.versions.node.split(".")[0], 10) === 22, "Node.js 22 required");

console.log("packet_status=source_ready_execution_not_authorized");
console.log(`required_source_commits=${commits.length}`);
console.log(`ordered_execution_gates=${packet.ordered_execution_gates.length}`);
console.log(`fail_closed_conditions=${packet.fail_closed_conditions.length}`);
console.log(`denied_authorities=${authorityValues.length}`);
console.log("fresh_quote_required=true");
console.log("fresh_zoso_confirmation_required=true");
console.log("VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_EXECUTION_PACKET_V1_PROOF_GREEN=true");
