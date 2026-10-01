#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const MARKER = "VOID_TWO_BOX_LEGACY_PROOF_EXPLICIT_TARGET_V1";
const HELPER = "ops/lib/void-two-box-legacy-proof-admission-v1.sh";

const scripts = [
  { path: "ops/two-box-remote-product-proof.sh", remote: ["REMOTE_NODE_BASE", "REMOTE_HELPER_BASE", "REMOTE_RELAYER_BASE"], effectful: true },
  { path: "ops/two-box-remote-participant-js-parse-proof.sh", remote: ["REMOTE_NODE_BASE"], effectful: false },
  { path: "ops/two-box-remote-participant-copy-actions-proof.sh", remote: ["REMOTE_NODE_BASE"], effectful: false },
  { path: "ops/two-box-datanet-tab-proof.sh", remote: ["REMOTE_NODE_BASE"], effectful: false },
  { path: "ops/two-box-datanet-proof.sh", remote: ["REMOTE_NODE_BASE"], effectful: true },
  { path: "ops/two-box-datanet-canonical-proof.sh", remote: ["REMOTE_NODE_BASE"], effectful: true },
  { path: "ops/two-box-bidirectional-open-proof.sh", remote: ["REMOTE_NODE_BASE"], effectful: true },
  { path: "ops/two-box-datanet-workloop-proof.sh", remote: ["REMOTE_NODE_BASE"], effectful: true },
  { path: "ops/two-box-receipt-result-fetch-proof.sh", remote: ["REMOTE_NODE_BASE"], effectful: true },
  { path: "ops/two-box-reverse-bidirectional-open-proof.sh", remote: ["REMOTE_NODE_BASE"], effectful: true },
  { path: "ops/two-box-datanet-peer-path-proof.sh", remote: ["REMOTE_NODE_BASE"], effectful: true },
  { path: "ops/two-box-full-useful-work-loop-proof.sh", remote: ["REMOTE_NODE_BASE"], effectful: true },
  { path: "ops/two-box-ui-share-open-both-ways-proof.sh", remote: ["REMOTE_NODE_BASE"], effectful: true, publicLocal: true },
  { path: "ops/two-box-remote-verify-redundancy-proof.sh", remote: ["REMOTE_NODE_BASE"], effectful: true },
  { path: "ops/two-box-ui-share-open-both-ways-no-seed-proof.sh", remote: ["REMOTE_NODE_BASE"], effectful: true },
  { path: "ops/two-box-peer-proof-suite.sh", remote: ["REMOTE_BASE"], effectful: true },
];

const effectful = new Set(scripts.filter((s) => s.effectful).map((s) => s.path));

const explicit = Object.freeze({
  ALIEN: "operator@203.0.113.10",
  REMOTE_NODE_BASE: "http://203.0.113.10:4102",
  REMOTE_HELPER_BASE: "http://203.0.113.10:4312/workcredits/devnet",
  REMOTE_RELAYER_BASE: "http://203.0.113.10:4313",
  REMOTE_BASE: "http://203.0.113.10:4102",
  PUBLIC_LOCAL_NODE_BASE: "http://198.51.100.20:4100",
});

function baseEnv() {
  return {
    PATH: process.env.PATH || "/usr/bin:/bin",
    HOME: process.env.HOME || "/tmp",
  };
}

function envFor(spec) {
  const env = baseEnv();
  env.ALIEN = explicit.ALIEN;
  for (const name of spec.remote) env[name] = explicit[name];
  if (spec.publicLocal) env.PUBLIC_LOCAL_NODE_BASE = explicit.PUBLIC_LOCAL_NODE_BASE;
  return env;
}

function runScript(scriptPath, env) {
  return spawnSync("bash", [scriptPath], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
    timeout: 5000,
  });
}

function output(result) {
  return String(result.stderr || "") + String(result.stdout || "");
}

function expectHold(result, pattern, label) {
  assert.equal(
    result.status,
    2,
    `${label}: exit=${result.status} signal=${result.signal} output=${JSON.stringify(output(result).slice(-3000))}`,
  );
  assert.match(output(result), pattern, label);
}

const helper = fs.readFileSync(HELPER, "utf8");
for (const needle of [
  "void_two_box_validate_ssh_destination",
  "void_two_box_validate_http_origin",
  "void_two_box_validate_http_prefix",
  "void_two_box_require_mutation_confirmation",
  "void_two_box_collect_remote_identity",
  "void_two_box_require_source_parity_and_bind_remote",
  'branch --show-current',
  'status --porcelain=v1 --untracked-files=all',
  'rev-parse HEAD',
  'local/remote Git HEAD mismatch',
  'remote HTTP origin host does not match selected SSH peer',
  'GIT_NO_REPLACE_OBJECTS=1',
  'GIT_CONFIG_GLOBAL=/dev/null',
  '/usr/bin/ssh',
]) {
  assert.ok(helper.includes(needle), `helper missing ${needle}`);
}

for (const spec of scripts) {
  const text = fs.readFileSync(spec.path, "utf8");
  assert.ok(text.includes(`MARKER="${MARKER}"`), `${spec.path}: marker missing`);
  assert.ok(
    text.includes('source "$SCRIPT_DIR/lib/void-two-box-legacy-proof-admission-v1.sh"'),
    `${spec.path}: shared admission helper missing`,
  );
  assert.ok(
    text.includes('void_two_box_validate_ssh_destination "${ALIEN:-}"'),
    `${spec.path}: SSH destination validator missing`,
  );
  assert.ok(
    text.includes('void_two_box_require_source_parity_and_bind_remote "$ALIEN"'),
    `${spec.path}: source parity gate missing`,
  );
  assert.equal(
    text.includes(":-zoso@100.122.79.39"),
    false,
    `${spec.path}: retired SSH default remains`,
  );
  assert.equal(
    text.includes(":-http://100.122.79.39"),
    false,
    `${spec.path}: retired HTTP default remains`,
  );

  for (const name of spec.remote) {
    const normal =
      `void_two_box_validate_http_origin "${name}" "\${${name}:-}"`;
    const helperPrefix =
      `void_two_box_validate_http_prefix "${name}" "\${${name}:-}" "/workcredits/devnet"`;
    assert.ok(
      text.includes(normal) || text.includes(helperPrefix),
      `${spec.path}: remote origin validator missing for ${name}`,
    );
  }

  const sourceAt = text.indexOf(
    'source "$SCRIPT_DIR/lib/void-two-box-legacy-proof-admission-v1.sh"',
  );
  const parityAt = text.indexOf(
    'void_two_box_require_source_parity_and_bind_remote "$ALIEN"',
  );
  const sideEffects = [
    "curl ",
    "ssh ",
    "mkdir -p",
    "jpost_json ",
    "-X POST",
    "systemctl ",
  ]
    .map((token) => text.indexOf(token))
    .filter((index) => index >= 0);
  const firstSideEffect = sideEffects.length
    ? Math.min(...sideEffects)
    : Number.POSITIVE_INFINITY;
  assert.ok(sourceAt >= 0 && sourceAt < parityAt, `${spec.path}: helper load ordering invalid`);
  assert.ok(parityAt >= 0 && parityAt < firstSideEffect, `${spec.path}: parity gate must precede side effects`);

  const confirmationAt = text.indexOf(
    'void_two_box_require_mutation_confirmation "$0"',
  );
  if (spec.effectful) {
    assert.ok(
      confirmationAt >= 0 && confirmationAt < parityAt,
      `${spec.path}: mutation confirmation must precede remote parity/network`,
    );
  } else {
    assert.equal(
      confirmationAt,
      -1,
      `${spec.path}: read-only wrapper unexpectedly requires mutation confirmation`,
    );
  }

  const missing = runScript(spec.path, baseEnv());
  expectHold(
    missing,
    new RegExp(`${MARKER} HOLD: missing explicit ALIEN`),
    `${spec.path}: missing target`,
  );

  {
    const env = envFor(spec);
    env.ALIEN = "zoso@100.122.79.39";
    const retired = runScript(spec.path, env);
    expectHold(
      retired,
      new RegExp(`${MARKER} HOLD: retired Alienware target is forbidden`),
      `${spec.path}: retired target`,
    );
  }

  {
    const env = envFor(spec);
    env.ALIEN = "-Fattacker";
    const malformed = runScript(spec.path, env);
    expectHold(
      malformed,
      new RegExp(`${MARKER} HOLD: invalid SSH destination syntax`),
      `${spec.path}: option-shaped SSH target`,
    );
  }

  {
    const env = envFor(spec);
    env[spec.remote[0]] = "ftp://203.0.113.10:4102";
    const malformed = runScript(spec.path, env);
    expectHold(
      malformed,
      new RegExp(`${MARKER} HOLD: invalid ${spec.remote[0]} (?:origin|scheme)`),
      `${spec.path}: unsupported remote origin`,
    );
  }

  if (spec.effectful) {
    const noConfirmation = runScript(spec.path, envFor(spec));
    expectHold(
      noConfirmation,
      new RegExp(`${MARKER} HOLD: confirmation required`),
      `${spec.path}: missing mutation confirmation`,
    );
  }
}

{
  const spec = scripts.find((entry) => entry.path === "ops/two-box-bidirectional-open-proof.sh");
  const env = envFor(spec);
  env.REMOTE_NODE_BASE = "http://user@203.0.113.10:4102";
  const userinfo = runScript(spec.path, env);
  expectHold(
    userinfo,
    new RegExp(`${MARKER} HOLD: invalid REMOTE_NODE_BASE`),
    "userinfo remote origin",
  );
}

{
  const text = fs.readFileSync(
    "ops/two-box-ui-share-open-both-ways-proof.sh",
    "utf8",
  );
  assert.ok(
    text.includes(
      'void_two_box_validate_http_origin "PUBLIC_LOCAL_NODE_BASE" "${PUBLIC_LOCAL_NODE_BASE:-}"',
    ),
    "UI both-ways proof must require/validate PUBLIC_LOCAL_NODE_BASE before effects",
  );
}

{
  const text = fs.readFileSync("ops/two-box-remote-product-proof.sh", "utf8");
  assert.ok(
    text.includes(
      'void_two_box_validate_http_prefix "REMOTE_HELPER_BASE" "${REMOTE_HELPER_BASE:-}" "/workcredits/devnet"',
    ),
    "remote-product helper origin must bind exact reviewed path prefix",
  );
}

{
  const text = fs.readFileSync(
    "ops/two-box-datanet-peer-path-proof.sh",
    "utf8",
  );
  assert.ok(
    text.includes(
      'CONFIRM_TWO_BOX_LEGACY_PROOF="runVoidTwoBoxLegacyProofV1:two-box-remote-verify-redundancy-proof.sh" bash ops/two-box-remote-verify-redundancy-proof.sh',
    ),
    "parent peer-path proof must propagate the child wrapper's exact confirmation",
  );
}

function git(tmp, args, env = {}) {
  const result = spawnSync("git", args, {
    cwd: tmp,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  assert.equal(
    result.status,
    0,
    `git ${args.join(" ")} failed: ${result.stderr || result.stdout}`,
  );
  return String(result.stdout || "").trim();
}

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-two-box-legacy-admission-proof-"),
);
try {
  git(temp, ["init", "-b", "main"]);
  fs.writeFileSync(path.join(temp, "tracked.txt"), "proof\n");
  git(temp, ["add", "tracked.txt"]);
  git(
    temp,
    ["commit", "-m", "fixture"],
    {
      GIT_AUTHOR_NAME: "VOID proof",
      GIT_AUTHOR_EMAIL: "void-proof@example.invalid",
      GIT_COMMITTER_NAME: "VOID proof",
      GIT_COMMITTER_EMAIL: "void-proof@example.invalid",
    },
  );
  const localHead = git(temp, ["rev-parse", "HEAD"]);
  assert.match(localHead, /^[0-9a-f]{40}$/u);

  const helperAbs = path.resolve(HELPER);
  const common = [
    "set -euo pipefail",
    `MARKER=${JSON.stringify(MARKER)}`,
    `source ${JSON.stringify(helperAbs)}`,
    `VOID_TWO_BOX_REPO_ROOT=${JSON.stringify(temp)}`,
  ];

  const mismatchScript = [
    ...common,
    "void_two_box_collect_remote_identity() {",
    "  printf 'HEAD=%s\\n' '" + "2".repeat(40) + "'",
    "  printf 'HOST=%s\\n' peer",
    "  printf 'FQDN=%s\\n' peer",
    "  printf 'TSIP=%s\\n' 203.0.113.10",
    "  printf 'TSDNS=%s\\n' peer.example.invalid",
    "}",
    'void_two_box_require_source_parity_and_bind_remote "operator@peer" "http://203.0.113.10:4102"',
  ].join("\n");
  const mismatch = spawnSync("bash", ["-c", mismatchScript], {
    cwd: process.cwd(),
    env: baseEnv(),
    encoding: "utf8",
  });
  expectHold(
    mismatch,
    new RegExp(`${MARKER} HOLD: local/remote Git HEAD mismatch`),
    "remote source mismatch",
  );

  const crossHostScript = [
    ...common,
    "void_two_box_collect_remote_identity() {",
    `  printf 'HEAD=%s\\n' ${JSON.stringify(localHead)}`,
    "  printf 'HOST=%s\\n' peer",
    "  printf 'FQDN=%s\\n' peer",
    "  printf 'TSIP=%s\\n' 203.0.113.10",
    "  printf 'TSDNS=%s\\n' peer.example.invalid",
    "}",
    'void_two_box_require_source_parity_and_bind_remote "operator@peer" "http://198.51.100.77:4102"',
  ].join("\n");
  const crossHost = spawnSync("bash", ["-c", crossHostScript], {
    cwd: process.cwd(),
    env: baseEnv(),
    encoding: "utf8",
  });
  expectHold(
    crossHost,
    new RegExp(`${MARKER} HOLD: remote HTTP origin host does not match selected SSH peer`),
    "cross-host remote origin",
  );

  const acceptedScript = [
    ...common,
    "void_two_box_collect_remote_identity() {",
    `  printf 'HEAD=%s\\n' ${JSON.stringify(localHead)}`,
    "  printf 'HOST=%s\\n' peer",
    "  printf 'FQDN=%s\\n' peer",
    "  printf 'TSIP=%s\\n' 203.0.113.10",
    "  printf 'TSDNS=%s\\n' peer.example.invalid",
    "}",
    'void_two_box_require_source_parity_and_bind_remote "operator@peer" "http://203.0.113.10:4102"',
    "printf 'ADMISSION_OK\\n'",
  ].join("\n");
  const accepted = spawnSync("bash", ["-c", acceptedScript], {
    cwd: process.cwd(),
    env: baseEnv(),
    encoding: "utf8",
  });
  assert.equal(
    accepted.status,
    0,
    `hermetic accepted control failed: ${output(accepted)}`,
  );
  assert.match(accepted.stdout, /ADMISSION_OK/u);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log(`${MARKER}_PROOF_GREEN`);
console.log(`script_count=${scripts.length}`);
console.log(`effectful_script_count=${effectful.size}`);
console.log("missing_target_fails_closed=true");
console.log("retired_alienware_target_rejected=true");
console.log("ssh_destination_syntax_rejected=true");
console.log("remote_origin_syntax_rejected=true");
console.log("effectful_confirmation_required=true");
console.log("source_parity_mismatch_held=true");
console.log("remote_origin_peer_binding_verified=true");
console.log("public_local_origin_explicit=true");
console.log("live_network_execution_performed=false");
