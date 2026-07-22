#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const TOOL_MARKER = "VOID_RELEASE_QUALIFICATION_CONTROL_V1";
const PLAN_MARKER = "VOID_RELEASE_QUALIFICATION_PLAN_V1";
const RESULT_MARKER = "VOID_RELEASE_QUALIFICATION_RESULT_V1";
const RECEIPT_MARKER = "VOID_RELEASE_QUALIFICATION_RECEIPT_V1";
const APPROVAL_MARKER = "VOID_RELEASE_QUALIFICATION_APPROVAL_V1";
const PACKET_MARKER = "VOID_RELEASE_PUBLICATION_PACKET_V1";
const PUBLICATION_MARKER = "VOID_RELEASE_PUBLICATION_RECEIPT_V1";
const CANARY_MARKER = "VOID_RELEASE_CANARY_RECEIPT_V1";

const TARGETS = [
  {
    id: "ubuntu-22.04-x64",
    class: "fresh-host",
    required_checks: ["artifact_integrity", "provenance", "clean_install", "service_disabled_by_default", "explicit_start_only", "readiness_ready", "readiness_gap_zero", "readiness_txroot_live", "participant_ui", "uninstall_purge"],
  },
  {
    id: "ubuntu-24.04-x64",
    class: "fresh-host",
    required_checks: ["artifact_integrity", "provenance", "clean_install", "service_disabled_by_default", "explicit_start_only", "readiness_ready", "readiness_gap_zero", "readiness_txroot_live", "participant_ui", "uninstall_purge"],
  },
  {
    id: "debian-12-x64",
    class: "fresh-host",
    required_checks: ["artifact_integrity", "provenance", "clean_install", "service_disabled_by_default", "explicit_start_only", "readiness_ready", "readiness_gap_zero", "readiness_txroot_live", "participant_ui", "uninstall_purge"],
  },
  {
    id: "windows-wsl2-ubuntu-24.04-x64",
    class: "windows-wsl2",
    required_checks: ["artifact_integrity", "provenance", "clean_install", "service_disabled_by_default", "explicit_start_only", "readiness_ready", "readiness_gap_zero", "readiness_txroot_live", "participant_ui", "windows_host_access", "uninstall_purge"],
  },
  {
    id: "upgrade-from-current-stable",
    class: "upgrade",
    required_checks: ["artifact_integrity", "provenance", "update_check", "update_apply", "data_preserved", "readiness_ready", "readiness_gap_zero", "readiness_txroot_live", "previous_release_pointer", "rollback"],
  },
  {
    id: "rollback-health-failure",
    class: "rollback",
    required_checks: ["artifact_integrity", "provenance", "health_failure_detected", "automatic_rollback", "previous_release_restored", "data_preserved", "service_state_preserved"],
  },
  {
    id: "two-node-sync",
    class: "network",
    required_checks: ["artifact_integrity", "provenance", "node_a_ready", "node_b_ready", "peer_connected", "head_converged", "gap_zero", "txroot_live", "restart_persistence"],
  },
  {
    id: "participant-ui-smoke",
    class: "participant",
    required_checks: ["artifact_integrity", "provenance", "participant_route", "participant_assets", "read_only_default", "wallet_mutation_absent", "buy_void_fulfillment_absent", "validator_admission_absent", "treasury_movement_absent"],
  },
];

const SAFETY_FALSE = [
  "release_tag_published_by_qualification",
  "live_deployment",
  "service_started_implicitly",
  "wallet_key_generated",
  "validator_key_generated",
  "treasury_key_generated",
  "work_credit_ledger_write",
  "buy_void_fulfillment",
  "money_movement",
  "validator_admission",
  "authority_transfer",
  "guarded_lanes_activated",
];

function fail(message, code = 1) {
  console.error(`ERROR: ${message}`);
  process.exit(code);
}
function stable(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stable);
  const out = {};
  for (const key of Object.keys(value).sort()) out[key] = stable(value[key]);
  return out;
}
function stableJson(value) { return JSON.stringify(stable(value), null, 2) + "\n"; }
function canonical(value) { return JSON.stringify(stable(value)); }
function shaBytes(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function shaFile(file) { return shaBytes(fs.readFileSync(file)); }
function shaObject(value) { return shaBytes(Buffer.from(canonical(value))); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(path.resolve(file)), {recursive: true});
  const tmp = `${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString("hex")}`;
  fs.writeFileSync(tmp, stableJson(value), {mode: 0o644});
  fs.renameSync(tmp, file);
}
function isHex(value, n) { return new RegExp(`^[0-9a-f]{${n}}$`).test(String(value || "")); }
function timestamp(value) {
  const raw = String(value || process.env.VOID_RELEASE_TIMESTAMP || new Date().toISOString());
  if (Number.isNaN(Date.parse(raw))) fail(`invalid timestamp: ${raw}`);
  return new Date(raw).toISOString();
}
function parseArgs(argv) {
  const command = argv.shift() || "help";
  const out = {command};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) fail(`unexpected positional argument: ${a}`);
    const key = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) out[key] = true;
    else { out[key] = next; i++; }
  }
  return out;
}
function need(opt, key) {
  const value = opt[key];
  if (value === undefined || value === true || value === "") fail(`--${key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)} is required`);
  return String(value);
}
function semver(value) {
  const s = String(value || "");
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(s)) fail(`invalid semantic version: ${s}`);
  return s;
}
function exactConfirm(actual, expected) {
  if (String(actual || "") !== expected) fail(`exact confirmation required: ${expected}`);
}
function validatePacket(packet) {
  if (packet?.marker !== PACKET_MARKER || packet?.schema_version !== 1) fail("invalid publication packet marker/schema");
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(packet.repository || "")) fail("invalid repository");
  semver(packet.version);
  if (packet.release_tag !== `release-v${packet.version}`) fail("packet tag/version mismatch");
  if (!isHex(packet.source_commit, 40)) fail("invalid packet source commit");
  if (!Array.isArray(packet.assets) || packet.assets.length < 5) fail("packet asset inventory is incomplete");
  return packet;
}
function validatePublication(receipt, packet) {
  if (receipt?.marker !== PUBLICATION_MARKER || receipt?.schema_version !== 1) fail("invalid publication receipt marker/schema");
  if (receipt.repository !== packet.repository || receipt.release_tag !== packet.release_tag || receipt.source_commit !== packet.source_commit) fail("publication receipt binding mismatch");
  if (receipt.packet_sha256 !== shaObject(packet)) fail("publication packet hash mismatch");
  if (receipt.release?.is_immutable !== true || receipt.release?.is_draft !== false) fail("publication is not immutable and final");
  if (receipt.verification?.release_attestation_verified !== true || receipt.verification?.all_assets_verified !== true || receipt.verification?.artifact_attestations_verified !== true) fail("publication verification is incomplete");
  return receipt;
}
function validateCanary(receipt, packet, publication) {
  if (receipt?.marker !== CANARY_MARKER || receipt?.schema_version !== 1) fail("invalid canary receipt marker/schema");
  if (receipt.repository !== packet.repository || receipt.release_tag !== packet.release_tag || receipt.source_commit !== packet.source_commit) fail("canary receipt binding mismatch");
  if (receipt.packet_sha256 !== shaObject(packet) || receipt.publication_receipt_sha256 !== shaObject(publication)) fail("canary hash binding mismatch");
  if (receipt.passed !== true) fail("canary is not green");
  if (receipt.service_started_implicitly !== false || receipt.guarded_lanes_activated !== false) fail("unsafe canary receipt");
  return receipt;
}
function targetMap(plan) { return new Map(plan.targets.map(t => [t.id, t])); }
function validatePlan(plan) {
  if (plan?.marker !== PLAN_MARKER || plan?.schema_version !== 1) fail("invalid qualification plan marker/schema");
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(plan.repository || "")) fail("invalid plan repository");
  semver(plan.version);
  if (plan.release_tag !== `release-v${plan.version}` || !isHex(plan.source_commit, 40)) fail("invalid plan release binding");
  for (const key of ["packet_sha256", "publication_receipt_sha256", "canary_receipt_sha256"]) if (!isHex(plan[key], 64)) fail(`invalid plan hash: ${key}`);
  if (!Array.isArray(plan.targets) || plan.targets.length !== TARGETS.length) fail("qualification target matrix is incomplete");
  const expected = new Map(TARGETS.map(t => [t.id, t]));
  const seen = new Set();
  for (const target of plan.targets) {
    if (!target?.id || seen.has(target.id)) fail(`duplicate or missing plan target: ${target?.id}`);
    seen.add(target.id);
    const exp = expected.get(target.id);
    if (!exp || canonical(target) !== canonical(exp)) fail(`qualification target contract mismatch: ${target.id}`);
  }
  if (plan.policy?.all_targets_required !== true || plan.policy?.failed_result_blocks_approval !== true || plan.policy?.reviewer_must_be_distinct_from_runners !== true || plan.policy?.stable_promotion_requires_approval !== true || plan.policy?.live_deployment_allowed !== false || plan.policy?.guarded_lanes_activated !== false) fail("unsafe qualification plan policy");
  return plan;
}
function validateSafety(safety) {
  for (const key of SAFETY_FALSE) if (safety?.[key] !== false) fail(`unsafe qualification result safety flag: ${key}`);
  return safety;
}
function validateResult(result, plan) {
  if (result?.marker !== RESULT_MARKER || result?.schema_version !== 1) fail("invalid qualification result marker/schema");
  if (result.repository !== plan.repository || result.release_tag !== plan.release_tag || result.source_commit !== plan.source_commit || result.plan_sha256 !== shaObject(plan)) fail("qualification result release binding mismatch");
  const target = targetMap(plan).get(result.target);
  if (!target) fail(`result target is not in plan: ${result.target}`);
  if (!result.runner_id || !/^[A-Za-z0-9_.:@/-]{3,160}$/.test(result.runner_id)) fail("invalid runner id");
  if (!result.run_id || !/^[A-Za-z0-9_.:@/-]{3,200}$/.test(result.run_id)) fail("invalid run id");
  if (!result.checks || typeof result.checks !== "object") fail("result checks missing");
  for (const check of target.required_checks) if (result.checks[check] !== true) fail(`required qualification check is not green for ${target.id}: ${check}`);
  validateSafety(result.safety);
  if (result.passed !== true) fail(`qualification result is not green: ${target.id}`);
  if (!Array.isArray(result.evidence) || result.evidence.length < 1) fail(`qualification result lacks evidence: ${target.id}`);
  for (const ev of result.evidence) {
    if (!ev?.name || String(ev.name).includes("/") || String(ev.name).includes("\\")) fail("unsafe evidence name");
    if (!isHex(ev.sha256, 64) || !Number.isSafeInteger(ev.bytes) || ev.bytes < 1) fail(`invalid evidence metadata: ${ev.name}`);
  }
  return result;
}
function validateReceipt(receipt, plan, results) {
  if (receipt?.marker !== RECEIPT_MARKER || receipt?.schema_version !== 1) fail("invalid qualification receipt marker/schema");
  if (receipt.repository !== plan.repository || receipt.release_tag !== plan.release_tag || receipt.source_commit !== plan.source_commit || receipt.plan_sha256 !== shaObject(plan)) fail("qualification receipt binding mismatch");
  if (receipt.packet_sha256 !== plan.packet_sha256 || receipt.publication_receipt_sha256 !== plan.publication_receipt_sha256 || receipt.canary_receipt_sha256 !== plan.canary_receipt_sha256) fail("qualification receipt upstream hash mismatch");
  if (receipt.passed !== true || receipt.matrix_passed !== true) fail("qualification receipt is not green");
  if (!Array.isArray(receipt.results) || receipt.results.length !== plan.targets.length) fail("qualification receipt result count mismatch");
  const expected = new Map(results.map(r => [r.target, shaObject(r)]));
  for (const item of receipt.results) {
    if (expected.get(item.target) !== item.result_sha256 || item.passed !== true) fail(`qualification receipt result hash mismatch: ${item.target}`);
  }
  if (receipt.policy?.stable_promotion_allowed !== true || receipt.policy?.release_tag_published_by_qualification !== false || receipt.policy?.live_deployment !== false || receipt.policy?.guarded_lanes_activated !== false) fail("unsafe qualification receipt policy");
  return receipt;
}
function validateApproval(approval, receipt) {
  if (approval?.marker !== APPROVAL_MARKER || approval?.schema_version !== 1) fail("invalid qualification approval marker/schema");
  if (approval.repository !== receipt.repository || approval.release_tag !== receipt.release_tag || approval.source_commit !== receipt.source_commit || approval.qualification_receipt_sha256 !== shaObject(receipt)) fail("qualification approval binding mismatch");
  if (approval.approved !== true || !approval.reviewer_id) fail("qualification approval is not approved");
  if (receipt.runner_ids.includes(approval.reviewer_id)) fail("qualification reviewer must be distinct from all runners");
  if (approval.policy?.stable_promotion_authorized !== true || approval.policy?.single_person_run_and_approve_allowed !== false || approval.policy?.release_tag_published_by_approval !== false || approval.policy?.live_deployment !== false || approval.policy?.guarded_lanes_activated !== false) fail("unsafe qualification approval policy");
  return approval;
}
function loadResults(dir, plan) {
  if (!fs.existsSync(dir)) fail(`result directory does not exist: ${dir}`);
  const files = fs.readdirSync(dir).filter(x => x.endsWith(".json")).sort();
  const results = files.map(name => validateResult(readJson(path.join(dir, name)), plan));
  const byTarget = new Map();
  const runIds = new Set();
  for (const result of results) {
    if (byTarget.has(result.target)) fail(`duplicate qualification result target: ${result.target}`);
    if (runIds.has(result.run_id)) fail(`duplicate qualification run id: ${result.run_id}`);
    byTarget.set(result.target, result);
    runIds.add(result.run_id);
  }
  for (const target of plan.targets) if (!byTarget.has(target.id)) fail(`missing qualification result: ${target.id}`);
  if (results.length !== plan.targets.length) fail(`unexpected qualification result count: ${results.length}`);
  return plan.targets.map(t => byTarget.get(t.id));
}
function evidenceList(value) {
  const files = String(value || "").split(",").map(x => x.trim()).filter(Boolean);
  if (!files.length) fail("--evidence-files requires at least one file");
  return files.map(file => {
    const p = path.resolve(file);
    if (!fs.existsSync(p) || !fs.statSync(p).isFile()) fail(`evidence file missing: ${p}`);
    return {name: path.basename(p), sha256: shaFile(p), bytes: fs.statSync(p).size};
  });
}

const opt = parseArgs(process.argv.slice(2));
if (["help", "--help", "-h"].includes(opt.command)) {
  console.log(`VOID release qualification control v1\n\nCommands:\n  prepare --packet FILE --publication-receipt FILE --canary-receipt FILE --out FILE\n  result --plan FILE --target ID --runner-id ID --run-id ID --checks FILE --safety FILE --evidence-files FILE[,FILE] --out FILE\n  evaluate --plan FILE --result-dir DIR --out FILE\n  approve --receipt FILE --reviewer-id ID --confirm PHRASE --out FILE\n  verify --plan FILE --result-dir DIR --receipt FILE --approval FILE\n  render --receipt FILE --approval FILE --out-dir DIR\n`);
  process.exit(0);
}

if (opt.command === "prepare") {
  const packet = validatePacket(readJson(path.resolve(need(opt, "packet"))));
  const publication = validatePublication(readJson(path.resolve(need(opt, "publicationReceipt"))), packet);
  const canary = validateCanary(readJson(path.resolve(need(opt, "canaryReceipt"))), packet, publication);
  const plan = {
    marker: PLAN_MARKER,
    schema_version: 1,
    repository: packet.repository,
    version: packet.version,
    release_tag: packet.release_tag,
    source_commit: packet.source_commit,
    packet_sha256: shaObject(packet),
    publication_receipt_sha256: shaObject(publication),
    canary_receipt_sha256: shaObject(canary),
    generated_at_utc: timestamp(opt.timestamp),
    targets: TARGETS,
    safety_flags_required_false: SAFETY_FALSE,
    policy: {
      all_targets_required: true,
      failed_result_blocks_approval: true,
      reviewer_must_be_distinct_from_runners: true,
      stable_promotion_requires_approval: true,
      live_deployment_allowed: false,
      guarded_lanes_activated: false,
    },
  };
  validatePlan(plan);
  writeJson(path.resolve(need(opt, "out")), plan);
  console.log(`${TOOL_MARKER}_PREPARE_GREEN`);
  console.log(`plan_sha256=${shaObject(plan)}`);
  process.exit(0);
}

if (opt.command === "result") {
  const plan = validatePlan(readJson(path.resolve(need(opt, "plan"))));
  const targetId = need(opt, "target");
  const target = targetMap(plan).get(targetId);
  if (!target) fail(`unknown qualification target: ${targetId}`);
  const checks = readJson(path.resolve(need(opt, "checks")));
  const safety = readJson(path.resolve(need(opt, "safety")));
  const evidence = evidenceList(need(opt, "evidenceFiles"));
  const result = {
    marker: RESULT_MARKER,
    schema_version: 1,
    repository: plan.repository,
    release_tag: plan.release_tag,
    source_commit: plan.source_commit,
    plan_sha256: shaObject(plan),
    target: target.id,
    target_class: target.class,
    runner_id: need(opt, "runnerId"),
    run_id: need(opt, "runId"),
    generated_at_utc: timestamp(opt.timestamp),
    checks,
    safety,
    evidence,
    passed: target.required_checks.every(k => checks[k] === true) && SAFETY_FALSE.every(k => safety[k] === false),
  };
  validateResult(result, plan);
  writeJson(path.resolve(need(opt, "out")), result);
  console.log(`${TOOL_MARKER}_RESULT_GREEN`);
  console.log(`target=${target.id}`);
  console.log(`result_sha256=${shaObject(result)}`);
  process.exit(0);
}

if (opt.command === "evaluate") {
  const plan = validatePlan(readJson(path.resolve(need(opt, "plan"))));
  const results = loadResults(path.resolve(need(opt, "resultDir")), plan);
  const receipt = {
    marker: RECEIPT_MARKER,
    schema_version: 1,
    repository: plan.repository,
    version: plan.version,
    release_tag: plan.release_tag,
    source_commit: plan.source_commit,
    plan_sha256: shaObject(plan),
    packet_sha256: plan.packet_sha256,
    publication_receipt_sha256: plan.publication_receipt_sha256,
    canary_receipt_sha256: plan.canary_receipt_sha256,
    generated_at_utc: timestamp(opt.timestamp),
    passed: true,
    matrix_passed: true,
    runner_ids: [...new Set(results.map(r => r.runner_id))].sort(),
    results: results.map(r => ({target: r.target, target_class: r.target_class, runner_id: r.runner_id, run_id: r.run_id, result_sha256: shaObject(r), passed: true})),
    policy: {
      stable_promotion_allowed: true,
      release_tag_published_by_qualification: false,
      live_deployment: false,
      guarded_lanes_activated: false,
    },
  };
  validateReceipt(receipt, plan, results);
  writeJson(path.resolve(need(opt, "out")), receipt);
  console.log(`${TOOL_MARKER}_EVALUATE_GREEN`);
  console.log(`qualification_receipt_sha256=${shaObject(receipt)}`);
  process.exit(0);
}

if (opt.command === "approve") {
  const receipt = readJson(path.resolve(need(opt, "receipt")));
  if (receipt?.marker !== RECEIPT_MARKER || receipt?.passed !== true || !Array.isArray(receipt.runner_ids)) fail("invalid or non-green qualification receipt");
  const reviewer = need(opt, "reviewerId");
  if (receipt.runner_ids.includes(reviewer)) fail("reviewer must be distinct from qualification runners");
  exactConfirm(opt.confirm, `APPROVE RELEASE QUALIFICATION ${receipt.release_tag}`);
  const approval = {
    marker: APPROVAL_MARKER,
    schema_version: 1,
    repository: receipt.repository,
    release_tag: receipt.release_tag,
    source_commit: receipt.source_commit,
    qualification_receipt_sha256: shaObject(receipt),
    reviewer_id: reviewer,
    approved_at_utc: timestamp(opt.timestamp),
    approved: true,
    policy: {
      stable_promotion_authorized: true,
      single_person_run_and_approve_allowed: false,
      release_tag_published_by_approval: false,
      live_deployment: false,
      guarded_lanes_activated: false,
    },
  };
  validateApproval(approval, receipt);
  writeJson(path.resolve(need(opt, "out")), approval);
  console.log(`${TOOL_MARKER}_APPROVE_GREEN`);
  console.log(`qualification_approval_sha256=${shaObject(approval)}`);
  process.exit(0);
}

if (opt.command === "verify") {
  const plan = validatePlan(readJson(path.resolve(need(opt, "plan"))));
  const results = loadResults(path.resolve(need(opt, "resultDir")), plan);
  const receipt = validateReceipt(readJson(path.resolve(need(opt, "receipt"))), plan, results);
  validateApproval(readJson(path.resolve(need(opt, "approval"))), receipt);
  console.log(`${TOOL_MARKER}_VERIFY_GREEN`);
  console.log(`qualification_receipt_sha256=${shaObject(receipt)}`);
  process.exit(0);
}

if (opt.command === "render") {
  const receipt = readJson(path.resolve(need(opt, "receipt")));
  const approval = validateApproval(readJson(path.resolve(need(opt, "approval"))), receipt);
  if (receipt?.marker !== RECEIPT_MARKER || receipt?.passed !== true) fail("invalid qualification receipt");
  const outDir = path.resolve(need(opt, "outDir"));
  fs.mkdirSync(outDir, {recursive: true});
  const summary = {
    marker: "VOID_PUBLIC_RELEASE_QUALIFICATION_STATUS_V1",
    schema_version: 1,
    repository: receipt.repository,
    release_tag: receipt.release_tag,
    source_commit: receipt.source_commit,
    passed: true,
    approved: true,
    reviewer_id: approval.reviewer_id,
    qualification_receipt_sha256: shaObject(receipt),
    qualification_approval_sha256: shaObject(approval),
    target_count: receipt.results.length,
    targets: receipt.results.map(r => ({target: r.target, target_class: r.target_class, passed: r.passed})),
    release_tag_published_by_qualification: false,
    live_deployment: false,
    service_restart: false,
    money_movement: false,
    guarded_lanes_activated: false,
  };
  writeJson(path.join(outDir, "release-qualification-v1.json"), summary);
  const rows = summary.targets.map(t => `<tr><td>${t.target}</td><td>${t.target_class}</td><td>green</td></tr>`).join("\n");
  fs.writeFileSync(path.join(outDir, "release-qualification-v1.html"), `<!doctype html><html><head><meta charset="utf-8"><title>VOID release qualification</title></head><body><h1>VOID Release Qualification</h1><p>Release <code>${summary.release_tag}</code> is qualified and independently approved.</p><table><thead><tr><th>Target</th><th>Class</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table><p>No release tag was published and no live deployment was performed by qualification.</p></body></html>\n`);
  console.log(`${TOOL_MARKER}_RENDER_GREEN`);
  process.exit(0);
}

fail(`unknown command: ${opt.command}`);
