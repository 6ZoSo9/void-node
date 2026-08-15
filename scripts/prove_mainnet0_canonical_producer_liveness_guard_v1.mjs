#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const MARKER = "VOID_MAINNET0_CANONICAL_PRODUCER_LIVENESS_GUARD_V1";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function requireIncludes(source, token, label) {
  if (!source.includes(token)) {
    throw new Error(`${label} missing token: ${token}`);
  }
}

function requireExcludes(source, token, label) {
  if (source.includes(token)) {
    throw new Error(`${label} unexpectedly contains token: ${token}`);
  }
}

const guardPath = "ops/guard-canonical-producer-liveness-v1.sh";
const canonicalInstallerPath = "ops/mainnet0/install-canonical-producer-liveness-v1.sh";
const liveInstallerPath = "ops/install-void-node-live-user-service-v1.sh";
const quarantineInstallerPath = "ops/mainnet0/public-node-live-runtime-quarantine-install.sh";

const guard = read(guardPath);
const canonicalInstaller = read(canonicalInstallerPath);
const liveInstaller = read(liveInstallerPath);
const quarantineInstaller = read(quarantineInstallerPath);
const runtime = read("src/index.ts");

for (const token of [
  "VOID_CANONICAL_PRODUCER_ROLE",
  "VOID_QUARANTINE_HOT_RUNTIME",
  "VOID_DISABLE_FINALIZE_WAL_COMMIT",
  "PROPOSER_AUTO",
  "VOID_COMMIT_DIRECT_AUTOPROP",
  "VOID_COMMIT_DIRECT_V2FS_AUTORUN",
  "VOID_DISABLE_COMMIT_DIRECT_AUTOPROP",
  "VOID_DISABLE_PROPOSER_AUTOPROP",
  "VOID_DISABLE_COMMIT_DIRECT_V2FS_AUTORUN",
]) {
  requireIncludes(guard, token, "prestart guard");
}

const requiredProducerAssignments = [
  "Environment=VOID_CANONICAL_PRODUCER_ROLE=1",
  "Environment=VOID_QUARANTINE_HOT_RUNTIME=0",
  "Environment=VOID_DISABLE_FINALIZE_WAL_COMMIT=0",
  "Environment=PROPOSER_AUTO=1",
  "Environment=VOID_PROPOSER_AUTO=1",
  "Environment=VOID_COMMIT_DIRECT_AUTOPROP=1",
  "Environment=VOID_COMMIT_DIRECT_AUTOPROP_V1=1",
  "Environment=VOID_AUTOPROP=1",
  "Environment=VOID_COMMIT_DIRECT_V2FS_AUTORUN=1",
  "Environment=VOID_DISABLE_COMMIT_DIRECT_AUTOPROP=0",
  "Environment=VOID_DISABLE_PROPOSER_AUTOPROP=0",
  "Environment=VOID_DISABLE_COMMIT_DIRECT_V2FS_AUTORUN=0",
];
for (const token of requiredProducerAssignments) {
  requireIncludes(canonicalInstaller, token, "canonical producer installer");
}

requireIncludes(
  canonicalInstaller,
  "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~CANONICAL-PRODUCER-LIVENESS-V1.conf",
  "canonical producer installer",
);
requireIncludes(canonicalInstaller, "restart_performed=false", "canonical producer installer");

for (const forbidden of [
  "Environment=VOID_DISABLE_WRAPPER_STORM=0",
  "Environment=VOID_DISABLE_TERMINAL_SAVEBLOCK=0",
  "Environment=VOID_DISABLE_TERMINAL_SAVEBLOCK_V2=0",
  "Environment=VOID_DISABLE_TXROOT_CORE_BUCKET=0",
  "Environment=VOID_DISABLE_TXROOT_HEADER_NOOP=0",
  "Environment=VOID_DISABLE_SAVEBLOCK_TAIL=0",
]) {
  requireExcludes(canonicalInstaller, forbidden, "canonical producer installer");
}

const guardPrestart = "ExecStartPre=/usr/bin/env bash $ROOT/ops/guard-canonical-producer-liveness-v1.sh";
const listenerPrestart = "ExecStartPre=$ROOT/ops/kill-void-node-live-listeners-v1.sh";
requireIncludes(liveInstaller, guardPrestart, "live service installer");
requireIncludes(liveInstaller, listenerPrestart, "live service installer");
if (liveInstaller.indexOf(guardPrestart) > liveInstaller.indexOf(listenerPrestart)) {
  throw new Error("canonical producer liveness guard must run before listener cleanup");
}

const quarantineRoleCheck = "VOID_CANONICAL_PRODUCER_ROLE=1";
requireIncludes(quarantineInstaller, quarantineRoleCheck, "public quarantine installer");
const quarantineWrite = 'cat > "$DROPIN"';
if (quarantineInstaller.indexOf(quarantineRoleCheck) > quarantineInstaller.indexOf(quarantineWrite)) {
  throw new Error("public quarantine installer checks canonical role only after writing quarantine");
}
for (const retainedProtection of [
  "Environment=VOID_DISABLE_WRAPPER_STORM=1",
  "Environment=VOID_DISABLE_TERMINAL_SAVEBLOCK=1",
  "Environment=VOID_DISABLE_TERMINAL_SAVEBLOCK_V2=1",
]) {
  requireIncludes(quarantineInstaller, retainedProtection, "public quarantine installer");
}

for (const runtimeToken of [
  'process.env.VOID_QUARANTINE_HOT_RUNTIME !== "1"',
  'process.env.VOID_DISABLE_FINALIZE_WAL_COMMIT !== "1"',
  'String(process.env.PROPOSER_AUTO || "0") === "0"',
  "/__void/metrics/proposer.commit-direct.v2fs/status.json",
  "/__void/metrics/commit-direct-autoprop.v1/status.json",
  "/__void/metrics/proposer.commit-direct.v2fs/commit?empty=1",
]) {
  requireIncludes(runtime, runtimeToken, "runtime liveness source");
}

const greenEnv = {
  ...process.env,
  VOID_CANONICAL_PRODUCER_ROLE: "1",
  VOID_QUARANTINE_HOT_RUNTIME: "0",
  VOID_DISABLE_FINALIZE_WAL_COMMIT: "0",
  PROPOSER_AUTO: "1",
  VOID_PROPOSER_AUTO: "1",
  VOID_COMMIT_DIRECT_AUTOPROP: "1",
  VOID_COMMIT_DIRECT_AUTOPROP_V1: "1",
  VOID_AUTOPROP: "1",
  VOID_COMMIT_DIRECT_V2FS_AUTORUN: "1",
  VOID_DISABLE_COMMIT_DIRECT_AUTOPROP: "0",
  VOID_DISABLE_PROPOSER_AUTOPROP: "0",
  VOID_DISABLE_COMMIT_DIRECT_V2FS_AUTORUN: "0",
};

function runGuard(overrides = {}) {
  return spawnSync("bash", [guardPath], {
    env: { ...greenEnv, ...overrides },
    encoding: "utf8",
  });
}

const green = runGuard();
if (green.status !== 0 || !green.stdout.includes("VOID_CANONICAL_PRODUCER_LIVENESS_GUARD_V1_GREEN")) {
  throw new Error(`green producer contract did not pass: ${green.stderr || green.stdout}`);
}

for (const [name, overrides] of [
  ["hot runtime quarantine", { VOID_QUARANTINE_HOT_RUNTIME: "1" }],
  ["WAL finalization disabled", { VOID_DISABLE_FINALIZE_WAL_COMMIT: "1" }],
  ["proposer auto disabled", { PROPOSER_AUTO: "0" }],
  ["autoprop disabled", { VOID_DISABLE_COMMIT_DIRECT_AUTOPROP: "1" }],
  ["v2fs autorun disabled", { VOID_DISABLE_COMMIT_DIRECT_V2FS_AUTORUN: "1" }],
]) {
  const result = runGuard(overrides);
  if (result.status === 0 || !result.stderr.includes("_HOLD")) {
    throw new Error(`${name} did not fail closed`);
  }
}

const noncanonical = spawnSync("bash", [guardPath], {
  env: { ...process.env, VOID_CANONICAL_PRODUCER_ROLE: "0" },
  encoding: "utf8",
});
if (noncanonical.status !== 0 || !noncanonical.stdout.includes("_SKIP role=noncanonical")) {
  throw new Error("noncanonical live node did not preserve no-op guard behavior");
}

console.log(
  `${MARKER}_GREEN`,
  JSON.stringify({
    canonical_role_explicit: true,
    contradictory_quarantine_fails_prestart: true,
    wal_finalization_required: true,
    autoprop_required: true,
    v2fs_autorun_required: true,
    public_quarantine_rejects_canonical_role_before_write: true,
    wrapper_storm_protections_not_reenabled: true,
    guard_runs_before_listener_cleanup: true,
    installer_restart_performed: false,
    runtime_liveness_surfaces_bound: true,
  }),
);
