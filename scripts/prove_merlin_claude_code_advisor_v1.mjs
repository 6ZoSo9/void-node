#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const STATIC_MARKER = "VOID_MERLIN_CLAUDE_CODE_ADVISOR_V1_PROOF_GREEN";
const RUNTIME_MARKER = "VOID_MERLIN_CLAUDE_CODE_RUNTIME_PREFLIGHT_GREEN";
const MIN_CLAUDE_VERSION = [2, 1, 187];

const PROTECTED_PARENT_ENV = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_AUTH_TOKEN",
  "CLAUDE_CODE_OAUTH_TOKEN",
  "OPENAI_API_KEY",
  "OPENROUTER_API_KEY",
  "GH_TOKEN",
  "GITHUB_TOKEN",
  "NPM_TOKEN",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_SESSION_TOKEN",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "AGENT_TOKEN",
  "VOID_AGENT_TOKEN",
  "VOID_STEAM_WEB_API_KEY",
];

function parseVersion(text) {
  const m = String(text).match(/(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return m.slice(1, 4).map(Number);
}

function versionAtLeast(actual, minimum) {
  for (let i = 0; i < 3; i += 1) {
    if (actual[i] > minimum[i]) return true;
    if (actual[i] < minimum[i]) return false;
  }
  return true;
}

function protectedParentEnvPresent(env = process.env) {
  return PROTECTED_PARENT_ENV.filter((name) =>
    Object.prototype.hasOwnProperty.call(env, name)
  );
}

function fail(message) {
  console.error(message);
  process.exit(2);
}

function runPretoolBashGate() {
  const claude = spawnSync("claude", ["--version"], {
    encoding: "utf8",
    env: process.env,
  });
  if (claude.status !== 0) {
    fail("VOID Merlin blocked: Claude Code version unavailable");
  }

  const version = parseVersion(`${claude.stdout ?? ""}\n${claude.stderr ?? ""}`);
  if (!version) {
    fail("VOID Merlin blocked: cannot parse Claude Code version");
  }
  if (!versionAtLeast(version, MIN_CLAUDE_VERSION)) {
    fail("VOID Merlin blocked: Claude Code >=2.1.187 required");
  }

  const present = protectedParentEnvPresent();
  if (present.length) {
    fail(
      "VOID Merlin blocked: protected parent credential variables present: " +
        present.join(",")
    );
  }

  console.log("VOID_MERLIN_PRETOOL_BASH_GATE_GREEN");
  console.log(`claude_client_version=${version.join(".")}`);
  console.log("protected_parent_credential_variables_present=false");
}

function loadProjectFiles() {
  const rolePath = path.join(ROOT, "CLAUDE.md");
  const settingsPath = path.join(ROOT, ".claude", "settings.json");
  const agentsPath = path.join(ROOT, "AGENTS.md");

  const role = fs.readFileSync(rolePath, "utf8");
  const agents = fs.readFileSync(agentsPath, "utf8");
  const settingsText = fs.readFileSync(settingsPath, "utf8");
  const settings = JSON.parse(settingsText);

  return { role, agents, settings, settingsText };
}

function getBashPreToolCommand(settings) {
  const entries = settings?.hooks?.PreToolUse ?? [];
  for (const entry of entries) {
    if (entry?.matcher !== "Bash") continue;
    for (const hook of entry?.hooks ?? []) {
      if (hook?.type === "command" && typeof hook?.command === "string") {
        return { command: hook.command, timeout: hook.timeout };
      }
    }
  }
  return null;
}

function runStaticProof() {
  const { role, agents, settings } = loadProjectFiles();

  assert.ok(role.startsWith("@AGENTS.md\n"), "CLAUDE.md must import AGENTS.md first");
  assert.match(role, /VOID_MERLIN_CLAUDE_CODE_ADVISOR_V1/);
  assert.match(role, /VOID role name: \*\*Merlin\*\*/);
  assert.match(role, /Title: \*\*Royal Advisor\*\*/);
  assert.match(role, /Office class: advisory-only external AI/);
  assert.match(role, /Constitutional authority: \*\*none\*\*/);
  assert.match(role, /Command authority: \*\*none\*\*/);
  assert.match(role, /ZoSo \/ Derrek Patrick Daly is the VOID Sovereign and King/);
  assert.match(
    role,
    /Merlin serves only as \*\*Royal Advisor\*\* to the Sovereign\/King and the Brood Queen/
  );
  assert.match(
    role,
    /must identify ZoSo \/ Derrek Patrick Daly as Sovereign\/King and Ren as the sole Brood Queen/
  );
  assert.match(role, /Ren is the sole Brood Queen identity/);
  assert.match(
    role,
    /must never claim, impersonate, role-play as, replace, supersede, or speak with the authority of Ren or the Brood Queen/
  );
  assert.match(role, /Merlin is not Apollyon and does not command Apollyon/);
  assert.match(role, /Merlin is not a validator and does not command validators/);
  assert.match(role, /Merlin's advice is non-binding/);
  assert.match(role, /Never create a duplicate lane/);
  assert.match(role, /producer_role=MerlinRoyalAdvisor/);
  assert.match(role, /constitutional_authority=false/);
  assert.match(role, /Do not weaken it to make a task easier/);
  assert.match(role, /Claude Code v2\.1\.187 or later/);
  assert.match(
    role,
    /node scripts\/prove_merlin_claude_code_advisor_v1\.mjs --runtime-preflight/
  );
  assert.match(role, /VOID_MERLIN_CLAUDE_CODE_RUNTIME_PREFLIGHT_GREEN/);

  assert.match(agents, /VOID_AGENT_WORKING_AGREEMENT_V1/);
  assert.match(agents, /Source-only by default/i);

  assert.equal(settings?.permissions?.defaultMode, "acceptEdits");
  assert.equal(settings?.permissions?.disableBypassPermissionsMode, "disable");
  assert.equal(
    settings?.permissions?.allow,
    undefined,
    "Merlin v1 must not carry blanket auto-allow rules"
  );

  const ask = new Set(settings?.permissions?.ask ?? []);
  for (const rule of [
    "WebFetch",
    "Bash(git add *)",
    "Bash(git commit *)",
    "Bash(npm ci)",
    "Bash(npm ci *)",
    "Bash(npm update)",
    "Bash(npm update *)",
    "Edit(/docs/governance/**)",
    "Edit(/src/security/**)",
    "Edit(/src/chain/**)",
    "Edit(/src/economic/**)",
    "Edit(/src/index.ts)",
    "Edit(/src/node_core.ts)",
    "Edit(/contracts/**)",
    "Edit(/ops/**)",
    "Edit(/.github/workflows/**)",
  ]) {
    assert.ok(ask.has(rule), `missing required ask rule: ${rule}`);
  }

  const deny = new Set(settings?.permissions?.deny ?? []);
  for (const rule of [
    "WebSearch",
    "mcp__*",
    "Agent",
    "Edit(/CLAUDE.md)",
    "Edit(/AGENTS.md)",
    "Edit(/.claude/**)",
    "Edit(/scripts/prove_merlin_claude_code_advisor_v1.mjs)",
    "Edit(/.github/workflows/void-merlin-claude-code-advisor-v1.yml)",
    "Read(**/*.env)",
    "Read(**/.env*)",
    "Read(~/.claude/**)",
    "Read(~/.ssh/**)",
    "Read(~/.gnupg/**)",
    "Read(~/.config/gh/**)",
    "Read(//media/**)",
    "Read(//mnt/**)",
    "Read(//run/media/**)",
    "Read(//dev/disk/**)",
    "Read(//dev/mapper/**)",
    "Read(//proc/**/environ)",
    "Bash(sudo *)",
    "Bash(systemctl *)",
    "Bash(tailscale *)",
    "Bash(ssh *)",
    "Bash(curl *)",
    "Bash(wget *)",
    "Bash(gh *)",
    "Bash(git push *)",
    "Bash(git fetch *)",
    "Bash(git pull *)",
    "Bash(git merge *)",
    "Bash(git rebase *)",
    "Bash(git reset *)",
    "Bash(git checkout *)",
    "Bash(git switch *)",
    "Bash(git worktree *)",
    "Bash(npm install *)",
    "Bash(npm audit fix)",
    "Bash(npm audit fix *)",
    "Bash(npm publish *)",
  ]) {
    assert.ok(deny.has(rule), `missing required deny rule: ${rule}`);
  }

  assert.ok(!deny.has("Bash(npm ci)"), "bare npm ci must not be denied");
  assert.ok(!deny.has("Bash(npm ci *)"), "npm ci with args must not be denied");
  assert.ok(
    !deny.has("Bash(npm update)"),
    "bare npm update must remain approval-gated, not denied"
  );
  assert.ok(
    !deny.has("Bash(npm update *)"),
    "npm update with args must remain approval-gated, not denied"
  );
  assert.ok(
    !ask.has("Bash(npm audit fix)"),
    "npm audit fix must not be approval-gated; it must be denied"
  );
  assert.ok(
    !ask.has("Bash(npm audit fix *)"),
    "npm audit fix with args must not be approval-gated; it must be denied"
  );

  assert.equal(settings?.sandbox?.enabled, true);
  assert.equal(settings?.sandbox?.failIfUnavailable, true);
  assert.equal(settings?.sandbox?.autoAllowBashIfSandboxed, false);
  assert.equal(settings?.sandbox?.allowUnsandboxedCommands, false);
  assert.deepEqual(settings?.sandbox?.excludedCommands, []);
  assert.deepEqual(settings?.sandbox?.network?.allowedDomains, ["registry.npmjs.org"]);
  assert.deepEqual(settings?.sandbox?.network?.allowUnixSockets, []);
  assert.equal(settings?.sandbox?.network?.allowAllUnixSockets, false);
  assert.equal(settings?.sandbox?.network?.allowLocalBinding, false);

  const denyRead = new Set(settings?.sandbox?.filesystem?.denyRead ?? []);
  const allowRead = new Set(settings?.sandbox?.filesystem?.allowRead ?? []);
  for (const entry of [
    "~/",
    "/media/**",
    "/mnt/**",
    "/run/media/**",
    "/dev/disk/**",
    "/dev/mapper/**",
    "/dev/sd*",
    "/dev/nvme*",
    "**/*.env",
    "**/.env*",
  ]) {
    assert.ok(denyRead.has(entry), `missing sandbox denyRead: ${entry}`);
  }
  assert.ok(
    allowRead.has("."),
    "sandbox must re-allow the project root inside denied home scope"
  );

  const credentialFiles = new Map(
    (settings?.sandbox?.credentials?.files ?? []).map((entry) => [
      entry.path,
      entry.mode,
    ])
  );
  for (const entry of [
    "~/.claude",
    "~/.ssh",
    "~/.gnupg",
    "~/.aws",
    "~/.config/gh",
    "~/.docker",
    "~/.kube",
    "~/.local/share/keyrings",
    "~/.password-store",
    "~/.npmrc",
    "~/.netrc",
    "**/*.env",
    "**/.env*",
  ]) {
    assert.equal(
      credentialFiles.get(entry),
      "deny",
      `credential file must be denied: ${entry}`
    );
  }

  const credentialEnv = new Map(
    (settings?.sandbox?.credentials?.envVars ?? []).map((entry) => [
      entry.name,
      entry.mode,
    ])
  );
  for (const name of [...PROTECTED_PARENT_ENV, "SSH_AUTH_SOCK"]) {
    assert.equal(
      credentialEnv.get(name),
      "deny",
      `credential environment variable must be denied: ${name}`
    );
  }

  const bashHook = getBashPreToolCommand(settings);
  assert.ok(bashHook, "missing Bash PreToolUse fail-closed gate");
  assert.equal(bashHook.timeout, 5);
  assert.match(bashHook.command, /claude/);
  assert.match(bashHook.command, /--version/);
  assert.match(bashHook.command, /2\.1\.187/);
  for (const name of PROTECTED_PARENT_ENV) {
    assert.ok(
      bashHook.command.includes(name),
      `Bash PreToolUse gate must cover protected parent env: ${name}`
    );
  }

  console.log(STATIC_MARKER);
  console.log("role=MerlinRoyalAdvisor");
  console.log("sovereign_identity_bound_to_ZoSo_Derrek_Patrick_Daly=true");
  console.log("brood_queen_identity_reserved_to_Ren=true");
  console.log("constitutional_authority=false");
  console.log("command_authority=false");
  console.log("sandbox_required=true");
  console.log("unsandboxed_escape=false");
  console.log("external_mount_reads_denied=true");
  console.log("credential_reads_denied=true");
  console.log("repo_env_reads_denied=true");
  console.log("void_credential_env_denied=true");
  console.log("remote_git_mutation_denied=true");
  console.log("self_policy_edit_denied=true");
  console.log("boundary_proof_self_edit_denied=true");
  console.log("npm_ci_prompted=true");
  console.log("npm_update_prompted=true");
  console.log("npm_audit_fix_denied=true");
  console.log("sandbox_network_registry_npmjs_only=true");
  console.log("minimum_claude_client_guarded=true");
  console.log("bash_parent_credential_pretool_guard=true");
}

function runtimePreflight() {
  const present = protectedParentEnvPresent();
  assert.deepEqual(
    present,
    [],
    `protected parent credential variables present: ${present.join(",")}`
  );

  const claude = spawnSync("claude", ["--version"], {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
  });
  assert.equal(claude.status, 0, "claude --version must succeed");

  const version = parseVersion(`${claude.stdout ?? ""}\n${claude.stderr ?? ""}`);
  assert.ok(version, "must parse Claude Code version");
  assert.ok(
    versionAtLeast(version, MIN_CLAUDE_VERSION),
    `Claude Code >=${MIN_CLAUDE_VERSION.join(".")} required`
  );

  const doctor = spawnSync("claude", ["doctor"], {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
  });
  assert.equal(doctor.status, 0, "claude doctor must succeed");
  const doctorText = `${doctor.stdout ?? ""}\n${doctor.stderr ?? ""}`;
  assert.doesNotMatch(
    doctorText,
    /Settings Error|Settings Warning|unknown setting|rejected setting/i,
    "claude doctor reported a rejected or invalid setting"
  );

  const { settings } = loadProjectFiles();
  const bashHook = getBashPreToolCommand(settings);
  assert.ok(bashHook, "missing Bash PreToolUse gate");

  const cleanEnv = { ...process.env };
  for (const name of PROTECTED_PARENT_ENV) delete cleanEnv[name];

  const cleanGate = spawnSync("/bin/sh", ["-c", bashHook.command], {
    cwd: ROOT,
    encoding: "utf8",
    env: cleanEnv,
  });
  assert.equal(cleanGate.status, 0, "clean Bash pretool gate must pass");

  const syntheticValue = "VOID_SYNTHETIC_SECRET_DO_NOT_USE";
  const syntheticGate = spawnSync("/bin/sh", ["-c", bashHook.command], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...cleanEnv, AGENT_TOKEN: syntheticValue },
  });
  assert.equal(
    syntheticGate.status,
    2,
    "synthetic protected parent credential must fail closed"
  );
  const syntheticText = `${syntheticGate.stdout ?? ""}\n${syntheticGate.stderr ?? ""}`;
  assert.ok(
    syntheticText.includes("AGENT_TOKEN"),
    "synthetic failure should identify the variable name"
  );
  assert.ok(
    !syntheticText.includes(syntheticValue),
    "synthetic secret value must never be printed"
  );

  console.log(RUNTIME_MARKER);
  console.log(`claude_client_version=${version.join(".")}`);
  console.log("settings_diagnostics_clean=true");
  console.log("pretool_gate_clean_path_green=true");
  console.log("synthetic_parent_credential_blocked=true");
  console.log("synthetic_secret_value_not_printed=true");
}

const mode = process.argv[2] ?? "";
if (mode === "--pretool-bash") {
  runPretoolBashGate();
} else if (mode === "--runtime-preflight") {
  runStaticProof();
  runtimePreflight();
} else if (mode === "") {
  runStaticProof();
} else {
  console.error(`unknown mode: ${mode}`);
  process.exit(2);
}
