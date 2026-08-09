#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const VOID_NODE_FLEET_DRIFT_AUDIT_V1 = "VOID_NODE_FLEET_DRIFT_AUDIT_V1";
export const VOID_NODE_FLEET_DRIFT_CONFIG_V1 = "VOID_NODE_FLEET_DRIFT_CONFIG_V1";

const SHA_RE = /^[0-9a-f]{40}$/;
const NAME_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/i;
const SSH_TARGET_RE = /^[a-z0-9][a-z0-9._@:-]{0,254}$/i;
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024;

function fail(message) {
  const error = new Error(message);
  error.name = "VoidFleetDriftAuditError";
  throw error;
}

function expandHome(input) {
  if (input === "~") return homedir();
  if (input.startsWith("~/")) return resolve(homedir(), input.slice(2));
  return input;
}

function assertString(value, label) {
  if (typeof value !== "string" || value.length === 0) fail(`${label} must be a non-empty string`);
  if (/[\0\r\n]/.test(value)) fail(`${label} contains a control character`);
  return value;
}

function assertSha(value, label) {
  if (!SHA_RE.test(String(value ?? ""))) fail(`${label} must be lowercase 40-hex`);
  return String(value);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    input: options.input,
    timeout: options.timeoutMs ?? 10_000,
    maxBuffer: MAX_OUTPUT_BYTES,
    env: process.env,
  });
  return {
    ok: result.status === 0 && !result.error,
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error ? String(result.error.message || result.error) : "",
  };
}

function bashLiteral(value) {
  return `'${String(value).replaceAll("'", `'\\''`)}'`;
}

function bashPathExpression(value) {
  assertString(value, "repo path");
  if (value.startsWith("~/")) return `"$HOME/${value.slice(2).replaceAll('"', '\\"')}"`;
  if (!value.startsWith("/")) fail("repo path must be absolute or begin with ~/");
  return bashLiteral(value);
}

function decodeBase64Json(value) {
  if (!value) return { ok: false, value: null };
  try {
    return { ok: true, value: JSON.parse(Buffer.from(value, "base64").toString("utf8")) };
  } catch {
    return { ok: false, value: null };
  }
}

function parseCollectorOutput(stdout) {
  const fields = new Map();
  for (const line of stdout.split(/\r?\n/)) {
    if (!line) continue;
    const tab = line.indexOf("\t");
    if (tab >= 0) fields.set(line.slice(0, tab), line.slice(tab + 1));
  }
  const health = decodeBase64Json(fields.get("health_b64") ?? "");
  const readiness = decodeBase64Json(fields.get("readiness_b64") ?? "");
  const peers = decodeBase64Json(fields.get("peers_b64") ?? "");
  return {
    repo_ok: fields.get("repo_ok") === "1",
    head: fields.get("head") || "",
    branch: fields.get("branch") || "",
    dirty_count: Number.parseInt(fields.get("dirty_count") || "0", 10) || 0,
    service_active: fields.get("service_active") === "active",
    health_json_ok: health.ok,
    health: health.value,
    readiness_json_ok: readiness.ok,
    readiness: readiness.value,
    peers_json_ok: peers.ok,
    peers: peers.value,
  };
}

function buildCollectorScript(node) {
  const repo = bashPathExpression(node.repo);
  const service = bashLiteral(assertString(node.service, `${node.name}.service`));
  const httpBase = bashLiteral(assertString(node.http_base, `${node.name}.http_base`).replace(/\/+$/, ""));
  return `set -u
repo=${repo}
service=${service}
http_base=${httpBase}

if git -C "$repo" rev-parse --git-dir >/dev/null 2>&1; then
  printf 'repo_ok\\t1\\n'
else
  printf 'repo_ok\\t0\\n'
  exit 0
fi

head="$(git -C "$repo" rev-parse HEAD 2>/dev/null || true)"
branch="$(git -C "$repo" symbolic-ref --short -q HEAD 2>/dev/null || true)"
dirty_count="$(git -C "$repo" status --porcelain=v1 2>/dev/null | wc -l | tr -d '[:space:]')"
service_active="$(systemctl --user is-active "$service" 2>/dev/null || true)"
health="$(curl -fsS --max-time 4 "$http_base/health" 2>/dev/null || true)"
readiness="$(curl -fsS --max-time 4 "$http_base/__void/ready.json" 2>/dev/null || true)"
peers="$(curl -fsS --max-time 4 "$http_base/p2p/peers" 2>/dev/null || curl -fsS --max-time 4 "$http_base/peers" 2>/dev/null || true)"

printf 'head\\t%s\\n' "$head"
printf 'branch\\t%s\\n' "$branch"
printf 'dirty_count\\t%s\\n' "$dirty_count"
printf 'service_active\\t%s\\n' "$service_active"
printf 'health_b64\\t%s\\n' "$(printf '%s' "$health" | base64 -w0 2>/dev/null || true)"
printf 'readiness_b64\\t%s\\n' "$(printf '%s' "$readiness" | base64 -w0 2>/dev/null || true)"
printf 'peers_b64\\t%s\\n' "$(printf '%s' "$peers" | base64 -w0 2>/dev/null || true)"
`;
}

function collectNode(node) {
  const script = buildCollectorScript(node);
  let result;
  if (node.transport === "local") {
    result = run("bash", ["-s"], { input: script, timeoutMs: node.timeout_ms ?? 12_000 });
  } else if (node.transport === "ssh") {
    const target = assertString(node.ssh_target, `${node.name}.ssh_target`);
    if (!SSH_TARGET_RE.test(target)) fail(`${node.name}.ssh_target is not a safe SSH target`);
    result = run(
      "ssh",
      [
        "-o", "BatchMode=yes",
        "-o", `ConnectTimeout=${Math.max(1, Math.min(20, node.connect_timeout_seconds ?? 5))}`,
        target,
        "bash",
        "-s",
      ],
      { input: script, timeoutMs: node.timeout_ms ?? 18_000 },
    );
  } else {
    fail(`${node.name}.transport must be local or ssh`);
  }

  if (!result.ok) {
    return {
      name: node.name,
      transport: node.transport,
      reachable: false,
      collector_status: result.status,
      collector_error: result.error || result.stderr.trim().slice(0, 500),
    };
  }
  return { name: node.name, transport: node.transport, reachable: true, ...parseCollectorOutput(result.stdout) };
}

export function classifyChangedPathsV1(changedPaths) {
  const buckets = {
    runtime_core: [],
    operator_surface: [],
    public_surface: [],
    protocol_source: [],
    integration_runtime: [],
    evidence_only: [],
    review_required: [],
  };

  for (const raw of changedPaths) {
    const path = String(raw);
    if (
      path.startsWith("src/") || path === "package.json" || path === "package-lock.json" ||
      path === "Dockerfile" || path === ".nvmrc" || path.startsWith("tsconfig")
    ) {
      buckets.runtime_core.push(path);
    } else if (
      path === "ops/voidctl" || path.startsWith("ops/") ||
      (path.startsWith("scripts/") && !path.startsWith("scripts/prove_"))
    ) {
      buckets.operator_surface.push(path);
    } else if (path.startsWith("public/")) {
      buckets.public_surface.push(path);
    } else if (path.startsWith("contracts/") || path.startsWith("config/")) {
      buckets.protocol_source.push(path);
    } else if (path.startsWith("integrations/")) {
      buckets.integration_runtime.push(path);
    } else if (
      path.startsWith(".github/") || path.startsWith("docs/") || path.startsWith("fixtures/") ||
      path.startsWith("schemas/") || path.startsWith("examples/") || path.startsWith("scripts/prove_")
    ) {
      buckets.evidence_only.push(path);
    } else {
      buckets.review_required.push(path);
    }
  }

  const runtimeRelevant = buckets.runtime_core.length + buckets.operator_surface.length +
    buckets.public_surface.length + buckets.protocol_source.length + buckets.integration_runtime.length +
    buckets.review_required.length;

  return {
    ...buckets,
    runtime_relevant_path_count: runtimeRelevant,
    evidence_only_path_count: buckets.evidence_only.length,
    changed_path_count: changedPaths.length,
  };
}

function gitObjectExists(repo, sha) {
  return run("git", ["-C", repo, "cat-file", "-e", `${sha}^{commit}`]).ok;
}

function gitCount(repo, range) {
  const result = run("git", ["-C", repo, "rev-list", "--count", range]);
  if (!result.ok) fail(`git rev-list failed for ${range}`);
  const count = Number.parseInt(result.stdout.trim(), 10);
  if (!Number.isSafeInteger(count) || count < 0) fail(`invalid git count for ${range}`);
  return count;
}

function compareAtCoordinator(repo, nodeSha, canonicalSha) {
  if (!gitObjectExists(repo, nodeSha)) return { relation: "node_object_missing" };
  if (!gitObjectExists(repo, canonicalSha)) return { relation: "canonical_object_missing" };

  if (run("git", ["-C", repo, "merge-base", "--is-ancestor", nodeSha, canonicalSha]).ok) {
    const behind = gitCount(repo, `${nodeSha}..${canonicalSha}`);
    const diff = run("git", ["-C", repo, "diff", "--name-only", `${nodeSha}..${canonicalSha}`], { timeoutMs: 15_000 });
    if (!diff.ok) return { relation: "compare_failed" };
    const changedPaths = diff.stdout.split(/\r?\n/).filter(Boolean);
    return {
      relation: behind === 0 ? "current" : "behind",
      commits_behind: behind,
      commits_ahead: 0,
      changed_paths: changedPaths,
      path_classification: classifyChangedPathsV1(changedPaths),
    };
  }

  if (run("git", ["-C", repo, "merge-base", "--is-ancestor", canonicalSha, nodeSha]).ok) {
    return {
      relation: "ahead",
      commits_behind: 0,
      commits_ahead: gitCount(repo, `${canonicalSha}..${nodeSha}`),
      changed_paths: [],
      path_classification: classifyChangedPathsV1([]),
    };
  }

  const counts = run("git", ["-C", repo, "rev-list", "--left-right", "--count", `${nodeSha}...${canonicalSha}`]);
  const [aheadRaw, behindRaw] = counts.ok ? counts.stdout.trim().split(/\s+/) : [];
  return {
    relation: "diverged",
    commits_ahead: Number.parseInt(aheadRaw || "0", 10) || 0,
    commits_behind: Number.parseInt(behindRaw || "0", 10) || 0,
    changed_paths: [],
    path_classification: classifyChangedPathsV1([]),
  };
}

function peerCount(peers) {
  if (Array.isArray(peers)) return peers.length;
  if (peers && Array.isArray(peers.connected)) return peers.connected.length;
  if (peers && Array.isArray(peers.peers)) return peers.peers.length;
  return 0;
}

function readinessGreen(snapshot) {
  const ready = snapshot.readiness;
  if (!snapshot.readiness_json_ok || !ready || typeof ready !== "object") return false;
  if (ready.ready !== true) return false;
  if ("gap" in ready && Number(ready.gap) !== 0) return false;
  return true;
}

export function classifyNodeSnapshotV1(snapshot, comparison, minPeers = 1) {
  const reasons = [];
  if (!snapshot.reachable) reasons.push("node_unreachable");
  if (snapshot.reachable && !snapshot.repo_ok) reasons.push("repo_unavailable");
  if (snapshot.reachable && snapshot.repo_ok && !SHA_RE.test(snapshot.head || "")) reasons.push("invalid_deployed_head");
  if ((snapshot.dirty_count ?? 0) > 0) reasons.push("worktree_dirty");
  if (snapshot.reachable && !snapshot.service_active) reasons.push("service_inactive");
  if (snapshot.reachable && (!snapshot.health_json_ok || snapshot.health?.ok !== true)) reasons.push("health_not_green");
  if (snapshot.reachable && !readinessGreen(snapshot)) reasons.push("readiness_not_green");
  if (snapshot.reachable && snapshot.peers_json_ok && peerCount(snapshot.peers) < minPeers) reasons.push("peer_floor_not_met");

  const relation = comparison?.relation ?? "unavailable";
  if (["ahead", "diverged", "compare_failed", "node_object_missing", "canonical_object_missing"].includes(relation)) {
    reasons.push(`git_${relation}`);
  }

  let classification = "CURRENT";
  if (reasons.length > 0) {
    classification = "HOLD";
  } else if (relation === "behind") {
    classification = (comparison.path_classification?.runtime_relevant_path_count ?? 0) > 0
      ? "BEHIND_RUNTIME_RELEVANT"
      : "BEHIND_EVIDENCE_ONLY";
  } else if (relation !== "current") {
    classification = "HOLD";
    reasons.push(`git_${relation}`);
  }

  return { classification, reasons: [...new Set(reasons)].sort(), peer_count: peerCount(snapshot.peers) };
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256Id(value) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export function buildFleetDecisionV1(canonicalSha, nodes) {
  const hold = nodes.some((node) => node.classification === "HOLD");
  const behind = nodes.some((node) => node.classification.startsWith("BEHIND_"));
  const decision = hold ? "HOLD" : behind ? "CONVERGENCE_RECOMMENDED" : "CURRENT";
  const convergenceCandidates = nodes.filter((node) => node.classification.startsWith("BEHIND_")).map((node) => ({
    name: node.name,
    from_sha: node.head,
    to_sha: canonicalSha,
    classification: node.classification,
    commits_behind: node.comparison?.commits_behind ?? null,
    runtime_relevant_path_count: node.comparison?.path_classification?.runtime_relevant_path_count ?? null,
  }));
  const digestPayload = {
    marker: VOID_NODE_FLEET_DRIFT_AUDIT_V1,
    canonical_sha: canonicalSha,
    decision,
    nodes: nodes.map((node) => ({
      name: node.name,
      head: node.head || null,
      classification: node.classification,
      reasons: node.reasons,
      relation: node.comparison?.relation ?? null,
      commits_behind: node.comparison?.commits_behind ?? null,
      runtime_relevant_path_count: node.comparison?.path_classification?.runtime_relevant_path_count ?? null,
    })),
  };
  return { decision, convergence_candidates: convergenceCandidates, audit_id_sha256: sha256Id(digestPayload) };
}

function resolveCanonicalSha(repo, remote, branch) {
  const result = run("git", ["-C", repo, "ls-remote", "--exit-code", remote, `refs/heads/${branch}`], { timeoutMs: 12_000 });
  if (!result.ok) fail(`unable to resolve ${remote}/${branch} with git ls-remote`);
  return assertSha(result.stdout.trim().split(/\s+/)[0], "canonical SHA");
}

function validateConfig(input) {
  if (!input || input.marker !== VOID_NODE_FLEET_DRIFT_CONFIG_V1) fail(`config marker must be ${VOID_NODE_FLEET_DRIFT_CONFIG_V1}`);
  const coordinatorRepo = expandHome(assertString(input.coordinator_repo, "coordinator_repo"));
  const canonicalRemote = assertString(input.canonical_remote ?? "origin", "canonical_remote");
  const canonicalBranch = assertString(input.canonical_branch ?? "main", "canonical_branch");
  if (!Array.isArray(input.nodes) || input.nodes.length < 1 || input.nodes.length > 16) fail("nodes must contain 1..16 entries");
  const seen = new Set();
  const nodes = input.nodes.map((node, index) => {
    if (!node || typeof node !== "object") fail(`nodes[${index}] must be an object`);
    const name = assertString(node.name, `nodes[${index}].name`);
    if (!NAME_RE.test(name)) fail(`nodes[${index}].name is invalid`);
    if (seen.has(name)) fail(`duplicate node name ${name}`);
    seen.add(name);
    if (node.transport !== "local" && node.transport !== "ssh") fail(`${name}.transport must be local or ssh`);
    if (node.transport === "ssh") {
      const target = assertString(node.ssh_target, `${name}.ssh_target`);
      if (!SSH_TARGET_RE.test(target)) fail(`${name}.ssh_target is invalid`);
    }
    return {
      name,
      transport: node.transport,
      ssh_target: node.ssh_target,
      repo: assertString(node.repo, `${name}.repo`),
      service: assertString(node.service, `${name}.service`),
      http_base: assertString(node.http_base, `${name}.http_base`),
      min_peers: Number.isInteger(node.min_peers) && node.min_peers >= 0 && node.min_peers <= 256 ? node.min_peers : 1,
      connect_timeout_seconds: node.connect_timeout_seconds,
      timeout_ms: node.timeout_ms,
    };
  });
  return { coordinatorRepo, canonicalRemote, canonicalBranch, nodes };
}

export function exampleFleetConfigV1() {
  return {
    marker: VOID_NODE_FLEET_DRIFT_CONFIG_V1,
    coordinator_repo: "~/dev/void-node",
    canonical_remote: "origin",
    canonical_branch: "main",
    nodes: [
      { name: "precision", transport: "local", repo: "~/dev/void-node", service: "void-node-live.service", http_base: "http://127.0.0.1:4100", min_peers: 1 },
      { name: "nimo", transport: "ssh", ssh_target: "REPLACE_WITH_NIMO_SSH_ALIAS", repo: "~/dev/void-node", service: "void-node-live.service", http_base: "http://127.0.0.1:4101", min_peers: 1 },
      { name: "alienware", transport: "ssh", ssh_target: "REPLACE_WITH_ALIENWARE_SSH_ALIAS", repo: "~/dev/void-node", service: "void-node-live.service", http_base: "http://127.0.0.1:4100", min_peers: 1 },
    ],
  };
}

function parseArgs(argv) {
  const out = { config: "~/.config/void/node-fleet-drift-audit-v1.json", output: "", canonicalSha: "", printExample: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--config") out.config = argv[++i] ?? "";
    else if (arg === "--output") out.output = argv[++i] ?? "";
    else if (arg === "--canonical-sha") out.canonicalSha = argv[++i] ?? "";
    else if (arg === "--print-example-config") out.printExample = true;
    else if (arg === "--help") {
      console.log("Usage: node tools/void-node-fleet-drift-audit-v1.mjs [--config PATH] [--canonical-sha SHA] [--output PATH] [--print-example-config]");
      process.exit(0);
    } else fail(`unknown argument: ${arg}`);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.printExample) {
    process.stdout.write(`${JSON.stringify(exampleFleetConfigV1(), null, 2)}\n`);
    return;
  }
  const configPath = expandHome(assertString(args.config, "config path"));
  const config = validateConfig(JSON.parse(readFileSync(configPath, "utf8")));
  const canonicalSha = args.canonicalSha
    ? assertSha(args.canonicalSha, "canonical SHA")
    : resolveCanonicalSha(config.coordinatorRepo, config.canonicalRemote, config.canonicalBranch);

  const nodes = config.nodes.map((node) => {
    const snapshot = collectNode(node);
    const comparison = snapshot.reachable && snapshot.repo_ok && SHA_RE.test(snapshot.head || "")
      ? compareAtCoordinator(config.coordinatorRepo, snapshot.head, canonicalSha)
      : { relation: "unavailable" };
    const assessment = classifyNodeSnapshotV1(snapshot, comparison, node.min_peers);
    return {
      name: node.name,
      transport: node.transport,
      reachable: snapshot.reachable,
      repo_ok: snapshot.repo_ok ?? false,
      head: snapshot.head || null,
      branch: snapshot.branch || null,
      dirty_count: snapshot.dirty_count ?? null,
      service_active: snapshot.service_active ?? false,
      health_ok: Boolean(snapshot.health_json_ok && snapshot.health?.ok === true),
      readiness_ok: readinessGreen(snapshot),
      peer_count: assessment.peer_count,
      comparison,
      classification: assessment.classification,
      reasons: assessment.reasons,
    };
  });

  const fleet = buildFleetDecisionV1(canonicalSha, nodes);
  const output = {
    marker: VOID_NODE_FLEET_DRIFT_AUDIT_V1,
    version: 1,
    canonical: { remote: config.canonicalRemote, branch: config.canonicalBranch, sha: canonicalSha },
    decision: fleet.decision,
    audit_id_sha256: fleet.audit_id_sha256,
    convergence_candidates: fleet.convergence_candidates,
    nodes,
    mutation_attempted: false,
    authority: {
      git_fetch: false,
      git_pull: false,
      checkout: false,
      reset: false,
      service_restart: false,
      deployment: false,
      credential_read: false,
      wallet_or_signer: false,
      transaction: false,
      funds_moved: false,
    },
  };

  const json = `${JSON.stringify(output, null, 2)}\n`;
  if (args.output) writeFileSync(expandHome(args.output), json, { encoding: "utf8", mode: 0o600 });
  process.stdout.write(json);
  process.exitCode = fleet.decision === "HOLD" ? 2 : 0;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  try {
    main();
  } catch (error) {
    console.error(JSON.stringify({ marker: VOID_NODE_FLEET_DRIFT_AUDIT_V1, decision: "HOLD", error: String(error?.message || error), mutation_attempted: false }));
    process.exitCode = 1;
  }
}
