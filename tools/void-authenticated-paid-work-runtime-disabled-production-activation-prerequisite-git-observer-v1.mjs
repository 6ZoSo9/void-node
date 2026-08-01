#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CONFIG_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITE_GIT_OBSERVER_CONFIG_V1";
export const RESULT_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITE_GIT_OBSERVER_RESULT_V1";
export const VERSION = 1;

const OID = /^[0-9a-f]{40}$/u;
const TAG = /^[A-Za-z0-9][A-Za-z0-9._-]{2,179}$/u;
const EXPECTED_KEYS = [
  "install_checkpoint_tag",
  "install_checkpoint_target",
  "install_mechanism_checkpoint_tag",
  "install_mechanism_checkpoint_target",
  "packet_commit",
  "pr894_merge_commit",
  "prerequisite_main_commit",
  "prerequisite_merge_commit",
  "repair_checkpoint_tag",
  "repair_checkpoint_target",
  "repair_merge_commit",
  "runtime_source_commit",
];

function fail(message) {
  throw new Error(`${RESULT_MARKER}: ${message}`);
}

function requireCondition(condition, message) {
  if (!condition) fail(message);
}

function exactKeys(value, keys, label) {
  requireCondition(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  requireCondition(
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()),
    `${label} keys mismatch`,
  );
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function validateConfig(value) {
  exactKeys(value, ["expected", "marker", "version"], "config");
  requireCondition(value.marker === CONFIG_MARKER, "config marker mismatch");
  requireCondition(value.version === VERSION, "config version mismatch");
  exactKeys(value.expected, EXPECTED_KEYS, "config.expected");

  for (const key of EXPECTED_KEYS.filter((item) => item.endsWith("_commit") || item.endsWith("_target"))) {
    requireCondition(OID.test(value.expected[key]), `config.expected.${key} must be a lowercase Git object ID`);
  }
  for (const key of EXPECTED_KEYS.filter((item) => item.endsWith("_tag"))) {
    requireCondition(TAG.test(value.expected[key]), `config.expected.${key} must be a safe tag name`);
  }
  requireCondition(
    value.expected.install_checkpoint_target === value.expected.prerequisite_main_commit,
    "install checkpoint target must equal prerequisite main commit",
  );
  requireCondition(
    value.expected.install_mechanism_checkpoint_target === value.expected.pr894_merge_commit,
    "install mechanism checkpoint target must equal PR #894 merge commit",
  );
  requireCondition(
    value.expected.repair_checkpoint_target === value.expected.repair_merge_commit,
    "repair checkpoint target must equal repair merge commit",
  );
  return value;
}

function secondsUtc(now) {
  const value = now().toISOString().replace(/\.\d{3}Z$/u, "Z");
  requireCondition(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(value), "clock did not produce UTC seconds");
  return value;
}

export function observeGitCheckpointLineageV1(configValue, options = {}) {
  const config = validateConfig(configValue);
  const repositoryInput = path.resolve(options.repositoryRoot ?? process.cwd());
  const repositoryRoot = realpathSync(repositoryInput);
  const repositoryStat = lstatSync(repositoryRoot);
  requireCondition(repositoryStat.isDirectory() && !repositoryStat.isSymbolicLink(), "repository root must be a directory");

  const gitBinary = options.gitBinary ?? "git";
  requireCondition(gitBinary === "git", "git binary override is forbidden");
  const commands = [];

  const run = (purpose, args, accepted = [0]) => {
    const argv = args[0] === "--version"
      ? [gitBinary, ...args]
      : [gitBinary, "-C", repositoryRoot, ...args];
    const result = spawnSync(argv[0], argv.slice(1), {
      encoding: "utf8",
      env: {
        ...process.env,
        GIT_PAGER: "cat",
        GIT_TERMINAL_PROMPT: "0",
        LC_ALL: "C",
      },
      maxBuffer: 4 * 1024 * 1024,
      shell: false,
    });
    if (result.error) fail(`${purpose} failed to start: ${result.error.message}`);
    const record = {
      argv,
      exit_code: result.status ?? 1,
      purpose,
      stderr: result.stderr ?? "",
      stdout: result.stdout ?? "",
    };
    commands.push(record);
    requireCondition(
      accepted.includes(record.exit_code),
      `${purpose} failed with exit ${record.exit_code}: ${(record.stderr || record.stdout).trim()}`,
    );
    return record.stdout.trim();
  };

  const gitVersion = run("identify Git implementation", ["--version"]);
  const observedTopLevel = realpathSync(run("resolve repository top level", ["rev-parse", "--show-toplevel"]));
  requireCondition(observedTopLevel === repositoryRoot, "repository top level mismatch");

  const resolveCommit = (purpose, expression) => {
    const value = run(purpose, ["rev-parse", "--verify", "--end-of-options", `${expression}^{commit}`]);
    requireCondition(OID.test(value), `${purpose} returned an invalid object ID`);
    const type = run(`${purpose} object type`, ["cat-file", "-t", value]);
    requireCondition(type === "commit", `${purpose} did not resolve to a commit`);
    return value;
  };

  const observedHeadCommit = resolveCommit("resolve HEAD", "HEAD");
  const observedMainCommit = resolveCommit(
    "resolve origin main",
    "refs/remotes/origin/main",
  );

  const observed = {};
  for (const key of EXPECTED_KEYS.filter((item) => item.endsWith("_commit") || item.endsWith("_target"))) {
    observed[key] = resolveCommit(`resolve configured ${key}`, config.expected[key]);
    requireCondition(observed[key] === config.expected[key], `${key} observation mismatch`);
  }

  const resolveTag = (tagKey, targetKey) => {
    const tag = config.expected[tagKey];
    const target = resolveCommit(`resolve tag ${tag}`, `refs/tags/${tag}`);
    requireCondition(target === config.expected[targetKey], `${tagKey} target mismatch`);
    return { name: tag, target };
  };

  const installCheckpoint = resolveTag("install_checkpoint_tag", "install_checkpoint_target");
  const installMechanismCheckpoint = resolveTag(
    "install_mechanism_checkpoint_tag",
    "install_mechanism_checkpoint_target",
  );
  const repairCheckpoint = resolveTag("repair_checkpoint_tag", "repair_checkpoint_target");

  const lineage = [
    ["runtime source precedes packet", observed.runtime_source_commit, observed.packet_commit],
    ["packet precedes PR #894 merge", observed.packet_commit, observed.pr894_merge_commit],
    ["PR #894 merge precedes prerequisite main", observed.pr894_merge_commit, observed.prerequisite_main_commit],
    ["prerequisite main precedes prerequisite merge", observed.prerequisite_main_commit, observed.prerequisite_merge_commit],
    ["prerequisite merge precedes repair merge", observed.prerequisite_merge_commit, observed.repair_merge_commit],
    ["repair merge is retained by observed main", observed.repair_merge_commit, observedMainCommit],
  ].map(([purpose, ancestor, descendant]) => {
    run(purpose, ["merge-base", "--is-ancestor", ancestor, descendant]);
    return { ancestor, descendant, verified: true };
  });

  return canonicalize({
    execution_boundary: {
      activation_configuration_written: false,
      credential_or_token_read: false,
      external_network_request: false,
      fund_movement: false,
      git_fetch: false,
      git_ref_write: false,
      payment_execution: false,
      read_only: true,
      runtime_listener_created: false,
      service_restart: false,
      separate_activation_execution_lane_required: true,
      wallet_or_signer_access: false,
      work_credit_write: false,
      work_dispatch: false,
    },
    gates: {
      all_configured_commits_observed_exact: true,
      checkpoint_targets_observed_exact: true,
      complete_lineage_observed_exact: true,
      repair_merge_retained_by_observed_main: true,
      repository_top_level_observed_exact: true,
    },
    marker: RESULT_MARKER,
    observation_provenance: {
      command_count: commands.length,
      commands,
      config_sha256: sha256(JSON.stringify(canonicalize(config))),
      git_version: gitVersion,
      independently_observed: true,
      repository_root: repositoryRoot,
      source: "local_git_cli",
    },
    observations: {
      install_checkpoint: installCheckpoint,
      install_mechanism_checkpoint: installMechanismCheckpoint,
      lineage,
      observed_head_commit: observedHeadCommit,
      observed_main_commit: observedMainCommit,
      repair_checkpoint: repairCheckpoint,
      resolved_configured_commits: observed,
    },
    observed_at_utc: secondsUtc(options.now ?? (() => new Date())),
    status: "git_checkpoint_lineage_observed_exact_activation_forbidden",
    version: VERSION,
  });
}

function parseArgs(argv) {
  const output = { repositoryRoot: process.cwd() };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--config" || token === "--repository-root") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) fail(`${token} requires a value`);
      if (token === "--config") output.configPath = value;
      else output.repositoryRoot = value;
      index += 1;
    } else {
      fail(`unexpected argument: ${token}`);
    }
  }
  requireCondition(typeof output.configPath === "string", "--config is required");
  return output;
}

function readConfig(configPath) {
  const resolved = realpathSync(path.resolve(configPath));
  const stat = lstatSync(resolved);
  requireCondition(stat.isFile() && !stat.isSymbolicLink(), "config must be a regular file");
  return JSON.parse(readFileSync(resolved, "utf8"));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = observeGitCheckpointLineageV1(readConfig(args.configPath), {
    repositoryRoot: args.repositoryRoot,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invoked === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(`HOLD: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
