import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  MARKER,
  RESULT_MARKER,
  evaluateVoidLuantiUsefulWorkGameFoundationV1,
} from "./void_luanti_useful_work_game_foundation_v1.mjs";

function fail(message) {
  throw new Error(message);
}
function assertCondition(condition, message) {
  if (!condition) fail(message);
}
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
function expectReject(label, callback) {
  try {
    callback();
  } catch {
    return;
  }
  fail(`expected rejection: ${label}`);
}

const examplePath =
  "examples/void-luanti-useful-work-game-foundation-v1.example.json";
const schemaPath =
  "schemas/void-luanti-useful-work-game-foundation-v1.schema.json";
const docsPath =
  "docs/architecture/void-luanti-useful-work-game-foundation-v1.md";
const workflowPath =
  ".github/workflows/void-luanti-useful-work-game-foundation-v1.yml";
const probePath =
  "ops/mainnet0/probe_void_luanti_useful_work_game_host_readiness_v1.py";
const modConfPath = "integrations/luanti/void_work/mod.conf";
const modInitPath = "integrations/luanti/void_work/init.lua";
const modReadmePath = "integrations/luanti/void_work/README.md";

const example = JSON.parse(fs.readFileSync(examplePath, "utf8"));
const result = evaluateVoidLuantiUsefulWorkGameFoundationV1(example);

assertCondition(result.marker === RESULT_MARKER, "result marker mismatch");
assertCondition(
  result.status ===
    "foundation_ready_for_separate_upstream_and_companion_gates",
  "foundation status mismatch",
);
assertCondition(
  result.server_mod_can_run_player_compute === false,
  "server mod gained player compute",
);
assertCondition(
  result.separate_worker_companion_required === true,
  "worker companion boundary missing",
);
assertCondition(result.default_opt_in === false, "default opt-in changed");
assertCondition(
  result.game_mod_work_credit_write_authority === false,
  "game mod gained WC authority",
);

for (const [label, mutate] of [
  ["hidden compute", (v) => { v.consent_and_resources.hidden_compute_allowed = true; }],
  ["default opt-in", (v) => { v.consent_and_resources.default_opt_in = true; }],
  ["background autostart", (v) => { v.consent_and_resources.background_autostart_allowed = true; }],
  ["server starts worker", (v) => { v.architecture.server_mod_can_start_worker = true; }],
  ["game wallet", (v) => { v.architecture.game_account_is_wallet = true; }],
  ["direct VOID reward", (v) => { v.architecture.direct_void_rewards = true; }],
  ["game WC write", (v) => { v.architecture.game_mod_has_work_credit_write_authority = true; }],
  ["worker credential leak", (v) => { v.identity_and_rewards.raw_worker_credential_exposed_to_mod = true; }],
  ["pay to win", (v) => { v.identity_and_rewards.pay_to_win_allowed = true; }],
  ["upstream download", (v) => { v.authority.upstream_download = true; }],
  ["work execution", (v) => { v.authority.work_execution = true; }],
  ["money movement", (v) => { v.authority.money_movement = true; }],
]) {
  const candidate = clone(example);
  mutate(candidate);
  expectReject(label, () =>
    evaluateVoidLuantiUsefulWorkGameFoundationV1(candidate),
  );
}

const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
assertCondition(schema.additionalProperties === false, "schema not closed");

const docs = fs.readFileSync(docsPath, "utf8");
for (const fragment of [
  "VOID Realms",
  "Luanti",
  "Mineclonia",
  "separately installed, visible **VOID Worker Companion**",
  "There is no hidden mining",
  "Work Credits",
  "must not create pay-to-win",
  "Do not copy Minecraft textures",
]) {
  assertCondition(docs.includes(fragment), `docs missing: ${fragment}`);
}

const modConf = fs.readFileSync(modConfPath, "utf8");
assertCondition(modConf.includes("name = void_work"), "mod name missing");
assertCondition(
  modConf.includes("license = GPL-3.0-or-later"),
  "mod license missing",
);

const modSource = fs.readFileSync(modInitPath, "utf8");
for (const required of [
  'core.register_chatcommand("voidwork"',
  'core.register_chatcommand("voidwork_consent"',
  "void_work.publish_sanitized_snapshot",
  "This mod starts no work",
  "awards no Work Credits",
]) {
  assertCondition(modSource.includes(required), `mod source missing: ${required}`);
}
for (const forbidden of [
  "core.request_http_api",
  "minetest.request_http_api",
  "io.open",
  "os.execute",
  "package.loadlib",
  "require(\"socket",
  "require('socket",
  "ffi.load",
]) {
  assertCondition(
    !modSource.includes(forbidden),
    `mod source contains forbidden authority: ${forbidden}`,
  );
}

const modReadme = fs.readFileSync(modReadmePath, "utf8");
assertCondition(
  modReadme.includes("starts no work"),
  "mod README does not preserve no-work boundary",
);
assertCondition(
  modReadme.includes("must independently obtain explicit consent"),
  "companion consent boundary missing",
);

for (const requiredPath of [
  "tools/void_public_earn_no_node_client_v1.mjs",
  "ops/mainnet0/wc-public-earning-participant-v1.sh",
  "src/economic/agent_paid_work_wc_earning_adapter_v1.ts",
]) {
  assertCondition(fs.existsSync(requiredPath), `missing VOID boundary: ${requiredPath}`);
}

const workflow = fs.readFileSync(workflowPath, "utf8");
assertCondition(
  workflow.includes("prove_void_luanti_useful_work_game_foundation_v1.mjs"),
  "workflow proof missing",
);
assertCondition(
  workflow.includes("probe_void_luanti_useful_work_game_host_readiness_v1.py"),
  "workflow probe missing",
);
assertCondition(!workflow.includes("\n  push:"), "workflow adds push trigger");

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-luanti-foundation-proof-"),
);
const fakeRepo = path.join(temp, "repo");
for (const directory of [
  ".git",
  "tools",
  "ops/mainnet0",
  "src/economic",
  "integrations/luanti/void_work",
]) {
  fs.mkdirSync(path.join(fakeRepo, directory), { recursive: true });
}
for (const [relative, content] of [
  ["tools/void_public_earn_no_node_client_v1.mjs", "export {};\n"],
  ["ops/mainnet0/wc-public-earning-participant-v1.sh", "#!/bin/sh\n"],
  ["src/economic/agent_paid_work_wc_earning_adapter_v1.ts", "export {};\n"],
  ["integrations/luanti/void_work/mod.conf", modConf],
  ["integrations/luanti/void_work/init.lua", modSource],
]) {
  fs.writeFileSync(path.join(fakeRepo, relative), content);
}
const reportPath = path.join(temp, "report.json");
const probe = spawnSync(
  "python3",
  [
    probePath,
    "--repo",
    fakeRepo,
    "--output",
    reportPath,
  ],
  {
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: "/usr/bin:/bin",
    },
  },
);
assertCondition(probe.status === 0, `host probe failed: ${probe.stderr}`);
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
assertCondition(
  ["missing_local_luanti_runtime", "ready_for_private_server_smoke_test_plan"]
    .includes(report.status),
  "host readiness status mismatch",
);
assertCondition(
  report.foundation.server_mod_runs_player_compute === false,
  "probe changed server mod compute boundary",
);
assertCondition(
  Object.values(report.authority).every((value) => value === false),
  "host probe granted authority",
);

console.log(`marker=${MARKER}`);
console.log("working_title=VOID Realms");
console.log("engine_candidate=Luanti 5.16.1");
console.log("reference_game_candidate=Mineclonia 0.122.2");
console.log("server_mod_can_run_player_compute=false");
console.log("separate_worker_companion_required=true");
console.log("default_opt_in=false");
console.log("hidden_compute_allowed=false");
console.log("reward_unit=WC");
console.log("verified_receipt_required=true");
console.log("game_mod_work_credit_write_authority=false");
console.log("upstream_download=false");
console.log("server_start=false");
console.log("worker_start=false");
console.log("deployment=false");
console.log("money_movement=false");
console.log(
  "VOID_LUANTI_USEFUL_WORK_GAME_FOUNDATION_V1_PROOF_GREEN=true",
);
