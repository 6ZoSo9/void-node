#!/usr/bin/env node
import { createHash } from "node:crypto";
import { closeSync, openSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  validateFleetAuditV1,
  validateFleetConfigV1,
  verifyCoordinatorRemoteBindingV1,
} from "./void-node-fleet-source-convergence-v1.mjs";

export const VOID_NODE_FLEET_ATOMIC_CUTOVER_V1 = "VOID_NODE_FLEET_ATOMIC_CUTOVER_V1";
export const VOID_NODE_FLEET_ATOMIC_CUTOVER_PLAN_V1 = "VOID_NODE_FLEET_ATOMIC_CUTOVER_PLAN_V1";

const SHA40 = /^[0-9a-f]{40}$/;
const INV = /^[0-9a-f]{32}$/;
const NAME = /^[a-z0-9][a-z0-9._-]{0,63}$/i;
const MAX = 4 * 1024 * 1024;
const PROCESS_SOURCE_MARKER = "VOID_NODE_PROCESS_SOURCE_IDENTITY_V1";
const REVIEWED_SUPPORT_PATHS_V1 = new Set([
  ".ci/VCL_LICENSE.txt",
  "LICENSE",
  "ops/coordination/worker-coordination-state-v3.json",
  "public/void-app-wave1-v1/assets/css/site-theme.css",
  "scripts/prove_void_p2p_udp_swarm_public_relay_introduction_collector_v1.ts",
  "tools/void-worker-coordination-v3.mjs",
]);
const RUNTIME_V1 = new Set([
  "src/p2p/udp_swarm_node_runtime_mount_v1.ts",
  "src/p2p/udp_swarm_public_relay_introduction_collector_v1.ts",
]);
const SEALED_AGENT_SDK_DISTRIBUTION_V1 = new Set([
  "integrations/agents/void-agent-sdk-v1/LICENSE",
  "integrations/agents/void-agent-sdk-v1/README.md",
  "integrations/agents/void-agent-sdk-v1/cli.mjs",
  "integrations/agents/void-agent-sdk-v1/index.mjs",
  "integrations/agents/void-agent-sdk-v1/integrity.json",
  "integrations/agents/void-agent-sdk-v1/package.json",
]);
const PROOFS = [
  "scripts/prove_void_p2p_udp_swarm_node_runtime_mount_v1.ts",
  "scripts/prove_void_p2p_udp_swarm_public_relay_introduction_collector_v1.ts",
  "scripts/prove_void_agent_sdk_release_pack_v1.mjs",
];

const fail = (m) => { const e = new Error(m); e.name = "VoidFleetAtomicCutoverError"; throw e; };
const stable = (v) => Array.isArray(v)
  ? `[${v.map(stable).join(",")}]`
  : v && typeof v === "object"
    ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(",")}}`
    : JSON.stringify(v);
const digest = (v) => createHash("sha256").update(typeof v === "string" ? v : stable(v)).digest("hex");
const q = (v) => `'${String(v).replaceAll("'", `'\\''`)}'`;
const expandHome = (v) => String(v).replace(/^~(?=\/)/, homedir());
const pathExpr = (v) => {
  if (typeof v !== "string" || (!v.startsWith("/") && !v.startsWith("~/"))) fail("unsafe path");
  return v.startsWith("~/") ? `"$HOME"/${q(v.slice(2))}` : q(v);
};
const run = (cmd, args, o = {}) => {
  const r = spawnSync(cmd, args, {
    encoding: "utf8", input: o.input, timeout: o.timeout ?? 20000,
    maxBuffer: MAX, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  return { ok: r.status === 0 && !r.error, stdout: r.stdout ?? "", stderr: r.stderr ?? "", error: r.error?.message ?? "" };
};
const tx = (node, script, timeout = 30000) => node.transport === "local"
  ? run("bash", ["-s"], { input: script, timeout })
  : run("ssh", ["-o", "BatchMode=yes", "-o", `ConnectTimeout=${node.connect_timeout_seconds}`, node.ssh_target, "bash", "-s"], { input: script, timeout });
const fields = (out) => new Map(String(out).split(/\r?\n/).map((l) => {
  const i = l.indexOf("\t"); return i > 0 ? [l.slice(0, i), l.slice(i + 1)] : null;
}).filter(Boolean));
const json64 = (v) => { try { return JSON.parse(Buffer.from(v || "", "base64").toString("utf8")); } catch { return null; } };
const text64 = (v) => Buffer.from(v || "", "base64").toString("utf8");
const peerCount = (p) => Array.isArray(p) ? p.length : Array.isArray(p?.connected) ? p.connected.length : Array.isArray(p?.peers) ? p.peers.length : -1;
const readJson = (f) => JSON.parse(readFileSync(f, "utf8"));
const write0600 = (f, v) => { const fd = openSync(f, "wx", 0o600); try { writeFileSync(fd, `${JSON.stringify(v, null, 2)}\n`); } finally { closeSync(fd); } };

export function validateTransitionPolicyV1(node) {
  const paths = node?.comparison?.changed_paths;
  if (!Array.isArray(paths)) fail("changed-path evidence missing");
  const runtime = [], sealedSdk = [], support = [], seen = new Set();
  for (const p of paths) {
    if (typeof p !== "string" || seen.has(p)) fail("changed-path evidence invalid");
    seen.add(p);
    if (REVIEWED_SUPPORT_PATHS_V1.has(p)) support.push(p);
    else if (SEALED_AGENT_SDK_DISTRIBUTION_V1.has(p)) sealedSdk.push(p);
    else if (RUNTIME_V1.has(p)) runtime.push(p);
    else fail(`unreviewed transition path ${p}`);
  }
  return {
    changed_path_count: paths.length,
    runtime_core_paths: runtime.sort(),
    sealed_agent_sdk_distribution_files: sealedSdk.sort(),
    transition_path_class_counts: {
      reviewed_support: support.length,
      runtime_core: runtime.length,
      sealed_agent_sdk_distribution: sealedSdk.length,
    },
  };
}

function liveScript(n) {
  const repo = pathExpr(n.repo), svc = q(n.service), remote = q(n.git_remote), http = q(n.http_base);
  return `set -u
repo=${repo}; service=${svc}; remote=${remote}; http=${http}
repo_real="$(readlink -f -- "$repo" 2>/dev/null||true)"
head="$(git -C "$repo" rev-parse HEAD 2>/dev/null||true)"
branch="$(git -C "$repo" symbolic-ref --short -q HEAD 2>/dev/null||true)"
status="$(git -C "$repo" status --porcelain=v1 2>/dev/null||printf __ERR__)"
remote_url="$(git -C "$repo" remote get-url "$remote" 2>/dev/null||true)"
shallow="$(git -C "$repo" rev-parse --is-shallow-repository 2>/dev/null||true)"
show="$(systemctl --user show "$service" -p ActiveState -p MainPID -p InvocationID 2>/dev/null||true)"
active="$(printf '%s\\n' "$show"|sed -n 's/^ActiveState=//p'|tail -1)"
pid="$(printf '%s\\n' "$show"|sed -n 's/^MainPID=//p'|tail -1)"
inv="$(printf '%s\\n' "$show"|sed -n 's/^InvocationID=//p'|tail -1)"
cwd=""; exe=""; argv=""; pc=""; pt=""; pb=""; prt=""; pa=0
if printf '%s' "$pid"|grep -Eq '^[1-9][0-9]*$'&&test -d "/proc/$pid"; then
 cwd="$(readlink -f -- "/proc/$pid/cwd" 2>/dev/null||true)"
 exe="$(readlink -f -- "/proc/$pid/exe" 2>/dev/null||true)"
 argv="$(tr '\\0' '\\n'<"/proc/$pid/cmdline" 2>/dev/null||true)"
 a="$(printf '%s\\n' "$argv"|sed -n '3p')"; b="$(printf '%s\\n' "$argv"|sed -n '4p')"; c="$(printf '%s\\n' "$argv"|sed -n '5p')"
 case "$a" in --conditions=void-process-source-commit-*) pc="\${a#--conditions=void-process-source-commit-}";; esac
 case "$b" in --conditions=void-process-source-tree-*) pt="\${b#--conditions=void-process-source-tree-}";; esac
 case "$c" in --conditions=void-process-source-branch-*) pb="\${c#--conditions=void-process-source-branch-}";; esac
 if printf '%s' "$pc"|grep -Eq '^[0-9a-f]{40}$'; then
  prt="$(git -C "$repo" rev-parse "$pc^{tree}" 2>/dev/null||true)"
  git -C "$repo" merge-base --is-ancestor "$pc" "$head" >/dev/null 2>&1&&pa=1
 fi
fi
health="$(curl -fsS --max-time 4 "$http/health" 2>/dev/null||true)"
ready="$(curl -fsS --max-time 4 "$http/__void/ready.json" 2>/dev/null||true)"
version="$(curl -fsS --max-time 4 "$http/version" 2>/dev/null||true)"
peer="$(curl -fsS --max-time 4 "$http/p2p/peers" 2>/dev/null||curl -fsS --max-time 4 "$http/peers" 2>/dev/null||true)"
printf 'repo_real\\t%s\\nhead\\t%s\\nbranch\\t%s\\nstatus\\t%s\\nremote\\t%s\\nshallow\\t%s\\nactive\\t%s\\npid\\t%s\\ninv\\t%s\\ncwd\\t%s\\nexe\\t%s\\nargv\\t%s\\npc\\t%s\\npt\\t%s\\npb\\t%s\\nprt\\t%s\\npa\\t%s\\nhealth\\t%s\\nready\\t%s\\nversion\\t%s\\npeer\\t%s\\n' "$repo_real" "$head" "$branch" "$(printf %s "$status"|base64 -w0)" "$remote_url" "$shallow" "$active" "$pid" "$inv" "$cwd" "$exe" "$(printf %s "$argv"|base64 -w0)" "$pc" "$pt" "$pb" "$prt" "$pa" "$(printf %s "$health"|base64 -w0)" "$(printf %s "$ready"|base64 -w0)" "$(printf %s "$version"|base64 -w0)" "$(printf %s "$peer"|base64 -w0)"
`;
}

export function parseLiveInspectionV1(out) {
  const f = fields(out), status = text64(f.get("status"));
  const h = json64(f.get("health")), r = json64(f.get("ready")), v = json64(f.get("version")), p = json64(f.get("peer"));
  return {
    repo_real: f.get("repo_real") || "", head: f.get("head") || "", branch: f.get("branch") || "", dirty_count: status === "" ? 0 : -1,
    remote_url: f.get("remote") || "", shallow: f.get("shallow") === "true", service_active: f.get("active") === "active",
    main_pid: Number(f.get("pid")) || 0, invocation_id: f.get("inv") || "", process_cwd: f.get("cwd") || "",
    process_executable: f.get("exe") || "", process_argv: text64(f.get("argv")).split(/\r?\n/).filter(Boolean),
    process_source_commit: f.get("pc") || "", process_source_tree: f.get("pt") || "", process_source_branch: f.get("pb") || "",
    process_source_resolved_tree: f.get("prt") || "", process_source_ancestor_of_head: f.get("pa") === "1",
    health: h, readiness: r, version: v, peer_count: peerCount(p),
  };
}

function expectedProcessArgvV1(l, repo) {
  return [
    l.process_executable,
    "--conditions=void-process-source-identity-v1",
    `--conditions=void-process-source-commit-${l.process_source_commit}`,
    `--conditions=void-process-source-tree-${l.process_source_tree}`,
    "--conditions=void-process-source-branch-main",
    "--require",
    `${repo}/node_modules/tsx/dist/preflight.cjs`,
    "--import",
    `file://${repo}/node_modules/tsx/dist/loader.mjs`,
    `${repo}/src/index.ts`,
  ];
}

export function validateLiveInspectionV1(l, c, old) {
  const repo = resolve(expandHome(c.node.repo));
  const processSource = l.version?.process_source;
  if (
    l.head !== old || l.branch !== "main" || l.dirty_count !== 0 || l.shallow || !l.service_active ||
    l.main_pid < 1 || !INV.test(l.invocation_id) || l.remote_url !== c.node.expected_remote_url ||
    resolve(l.repo_real || "/") !== repo || resolve(l.process_cwd || "/") !== repo ||
    !["node", "nodejs"].includes(basename(l.process_executable || "")) ||
    l.process_source_commit !== old || !SHA40.test(l.process_source_tree) || l.process_source_branch !== "main" ||
    l.process_source_resolved_tree !== l.process_source_tree || l.process_source_ancestor_of_head !== true ||
    stable(l.process_argv) !== stable(expectedProcessArgvV1(l, repo)) ||
    processSource?.marker !== PROCESS_SOURCE_MARKER || processSource?.commit !== old ||
    processSource?.tree !== l.process_source_tree || processSource?.branch !== "main" || processSource?.immutable !== true ||
    l.health?.ok !== true || l.readiness?.ready !== true || l.readiness?.gap !== 0 || l.readiness?.txroot_live !== 1 ||
    l.peer_count < c.node.min_peers
  ) fail("live process/source no longer matches audited healthy state");
  return {
    old_process_invocation_id: l.invocation_id,
    old_process_source_tree: l.process_source_tree,
    peer_count: l.peer_count,
    process_identity_sha256: digest({
      pid: l.main_pid, invocation: l.invocation_id, cwd: l.process_cwd, executable: l.process_executable,
      argv: l.process_argv, commit: l.process_source_commit, tree: l.process_source_tree,
    }),
  };
}

export function validateCutoverStabilityV1(remoteBefore, remoteAfter, target, before, after, c, old) {
  if (remoteBefore !== target || remoteAfter !== target) fail("remote main moved during stage proofs");
  const b = validateLiveInspectionV1(before, c, old);
  const a = validateLiveInspectionV1(after, c, old);
  if (b.process_identity_sha256 !== a.process_identity_sha256) fail("live process identity changed during stage proofs");
  if (before.head !== after.head || before.remote_url !== after.remote_url || before.dirty_count !== after.dirty_count) {
    fail("live source changed during stage proofs");
  }
  return b;
}

function stageScript(n, stage) {
  const repo = pathExpr(n.repo), s = pathExpr(stage);
  return `set -u
repo=${repo}; stage=${s}; tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
head_before="$(git -C "$stage" rev-parse HEAD 2>/dev/null||true)"
branch_before="$(git -C "$stage" symbolic-ref --short -q HEAD 2>/dev/null||true)"
common_before="$(git -C "$stage" rev-parse --path-format=absolute --git-common-dir 2>/dev/null||true)"
live_common_before="$(git -C "$repo" rev-parse --path-format=absolute --git-common-dir 2>/dev/null||true)"
runner="$repo/node_modules/.bin/tsx"; tx=0; test -x "$runner"&&tx=1
p0=0; test "$tx" -eq 1&&(cd "$stage"&&"$runner" ${PROOFS[0]}) >"$tmp/0" 2>&1&&p0=1
p1=0; test "$tx" -eq 1&&(cd "$stage"&&"$runner" ${PROOFS[1]}) >"$tmp/1" 2>&1&&p1=1
p2=0; (cd "$stage"&&node ${PROOFS[2]}) >"$tmp/2" 2>&1&&p2=1
nm=0; test -e "$stage/node_modules"&&nm=1
status="$(git -C "$stage" status --porcelain=v1 2>/dev/null||printf __ERR__)"
head_after="$(git -C "$stage" rev-parse HEAD 2>/dev/null||true)"
branch_after="$(git -C "$stage" symbolic-ref --short -q HEAD 2>/dev/null||true)"
common_after="$(git -C "$stage" rev-parse --path-format=absolute --git-common-dir 2>/dev/null||true)"
live_common_after="$(git -C "$repo" rev-parse --path-format=absolute --git-common-dir 2>/dev/null||true)"
printf 'head_before\\t%s\\nbranch_before\\t%s\\nstatus\\t%s\\ncommon_before\\t%s\\nlive_common_before\\t%s\\nhead_after\\t%s\\nbranch_after\\t%s\\ncommon_after\\t%s\\nlive_common_after\\t%s\\nnm\\t%s\\ntx\\t%s\\np0\\t%s\\np1\\t%s\\np2\\t%s\\n' "$head_before" "$branch_before" "$(printf %s "$status"|base64 -w0)" "$common_before" "$live_common_before" "$head_after" "$branch_after" "$common_after" "$live_common_after" "$nm" "$tx" "$p0" "$p1" "$p2"
`;
}

export function parseStageInspectionV1(out) {
  const f = fields(out), status = text64(f.get("status"));
  return {
    head_before: f.get("head_before") || "", branch_before: f.get("branch_before") || "",
    common_before: f.get("common_before") || "", live_common_before: f.get("live_common_before") || "",
    head_after: f.get("head_after") || "", branch_after: f.get("branch_after") || "",
    common_after: f.get("common_after") || "", live_common_after: f.get("live_common_after") || "",
    dirty_count: status === "" ? 0 : -1, node_modules: f.get("nm") === "1",
    proof_runner: f.get("tx") === "1", proof0: f.get("p0") === "1", proof1: f.get("p1") === "1", proof2: f.get("p2") === "1",
  };
}

export function validateStageInspectionV1(s, target) {
  if (
    s.head_before !== target || s.head_after !== target || s.branch_before !== "" || s.branch_after !== "" ||
    s.dirty_count !== 0 || s.node_modules || !s.proof_runner || !s.proof0 || !s.proof1 || !s.proof2 ||
    !s.common_before || !s.common_after || !s.live_common_before || !s.live_common_after ||
    resolve(s.common_before) !== resolve(s.live_common_before) ||
    resolve(s.common_after) !== resolve(s.live_common_after) ||
    resolve(s.common_before) !== resolve(s.common_after) ||
    resolve(s.live_common_before) !== resolve(s.live_common_after)
  ) fail("stage is not stable exact detached proof-green target");
  return true;
}

export function buildCutoverPlanV1(c, facts, policy, stagePath, live, stage) {
  const privatePlan = {
    marker: VOID_NODE_FLEET_ATOMIC_CUTOVER_PLAN_V1, audit: facts.audit_id_sha256, node: c.node.name,
    ssh: c.node.ssh_target, repo: c.node.repo, stage: stagePath, service: c.node.service, http: c.node.http_base,
    remote: c.node.git_remote, remote_url: c.node.expected_remote_url, from: facts.from_sha, target: facts.to_sha,
    invocation: live.old_process_invocation_id, process_tree: live.old_process_source_tree,
    process_identity: live.process_identity_sha256, paths: policy,
  };
  return Object.freeze({
    marker: VOID_NODE_FLEET_ATOMIC_CUTOVER_PLAN_V1, version: 1, outcome: "READY_FOR_SEPARATE_CUTOVER_AUTHORIZATION",
    plan_id_sha256: digest(privatePlan), audit_id_sha256: facts.audit_id_sha256, node: c.node.name,
    from_sha: facts.from_sha, target_sha: facts.to_sha, old_process_invocation_id: live.old_process_invocation_id,
    transition: policy,
    stability: { remote_main_stable: true, live_process_identity_stable: true, stage_identity_stable: true },
    stage: {
      detached_exact_target: true, stage_node_modules_present: stage.node_modules, live_checkout_tsx_runner: stage.proof_runner,
      p2p_runtime_mount_green: stage.proof0, relay_collector_green: stage.proof1, agent_sdk_release_pack_green: stage.proof2,
    },
    required_order: ["quiesce_selected_service", "exact_fast_forward_to_target", "start_selected_service_once", "prove_new_process_identity_and_health"],
    mutation_authority_granted: false, automatic_retry: false, automatic_rollback: false, next_node_automatic: false,
    authority: {
      git_mutation: false, service_mutation: false, package_install: false, build: false, deployment: false,
      network_configuration: false, credential_read: false, wallet_or_signer: false, validator_mutation: false,
      work_credit_mutation: false, transaction: false, funds_moved: false,
    },
  });
}

const parseArgs = (a) => {
  const o={config:`${homedir()}/.config/void/node-fleet-drift-audit-v1.json`,audit:`${homedir()}/.config/void/node-fleet-drift-audit-result-v1.json`,node:"",stage:"",output:"",maxAge:300};
  for(let i=0;i<a.length;i++){const k=a[i],v=()=>{if(++i>=a.length)fail(`${k} needs value`);return a[i];};
    if(k==="--config")o.config=v();else if(k==="--audit")o.audit=v();else if(k==="--node")o.node=v();else if(k==="--stage-dir")o.stage=v();
    else if(k==="--output")o.output=v();else if(k==="--max-audit-age-seconds")o.maxAge=Number(v());else if(k==="--help")o.help=true;else fail(`unknown ${k}`);}
  return o;
};

function readRemoteMainV1(c) {
  verifyCoordinatorRemoteBindingV1(c);
  const ls=run("git",["-C",c.coordinator_repo,"ls-remote",c.canonical_remote,"refs/heads/main"]);
  const sha=String(ls.stdout||"").trim().split(/\s+/)[0]||"";
  if(!ls.ok||!SHA40.test(sha))fail("remote main unavailable");
  return sha;
}

export async function main(argv=process.argv.slice(2)) {
  const a=parseArgs(argv);if(a.help){console.log("read-only cutover planner; see docs/operations/void-node-fleet-atomic-cutover-v1.md");return 0;}
  if(!NAME.test(a.node)||!a.stage)fail("--node and --stage-dir required");
  const raw=readJson(a.config),c=validateFleetConfigV1(raw,a.node),audit=readJson(a.audit);
  if(raw.nodes.length<3||audit.nodes?.length!==raw.nodes.length||stable(raw.nodes.map(n=>n.name))!==stable(audit.nodes.map(n=>n.name)))fail("full configured fleet audit required");
  if((Date.now()-statSync(a.audit).mtimeMs)/1000>a.maxAge)fail("audit stale");
  const facts=validateFleetAuditV1(audit,c,a.node),policy=validateTransitionPolicyV1(facts.node);
  const remoteBefore=readRemoteMainV1(c);if(remoteBefore!==facts.to_sha)fail("remote main moved");
  let r=tx(c.node,liveScript(c.node));if(!r.ok)fail("live inspection failed");const liveBefore=parseLiveInspectionV1(r.stdout);validateLiveInspectionV1(liveBefore,c,facts.from_sha);
  r=tx(c.node,stageScript(c.node,a.stage),180000);if(!r.ok)fail("stage proof transport failed");const stage=parseStageInspectionV1(r.stdout);validateStageInspectionV1(stage,facts.to_sha);
  const remoteAfter=readRemoteMainV1(c);
  r=tx(c.node,liveScript(c.node));if(!r.ok)fail("post-proof live inspection failed");const liveAfter=parseLiveInspectionV1(r.stdout);
  const live=validateCutoverStabilityV1(remoteBefore,remoteAfter,facts.to_sha,liveBefore,liveAfter,c,facts.from_sha);
  const plan=buildCutoverPlanV1(c,facts,policy,a.stage,live,stage);if(a.output)write0600(a.output,plan);console.log(JSON.stringify(plan,null,2));return 0;
}

if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url)))main().then(c=>process.exitCode=c,e=>{console.error(`${e.name}: ${e.message}`);process.exitCode=1;});