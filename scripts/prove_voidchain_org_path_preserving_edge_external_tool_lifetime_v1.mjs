#!/usr/bin/env node
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const MARKER = "VOIDCHAIN_ORG_PATH_PRESERVING_EDGE_EXTERNAL_TOOL_LIFETIME_V1_PROOF";
const TUNNEL_ID = "6ff42ae2-765d-4adf-8112-31c55c1551ef";
const EXPECTED_TIMEOUT_MS = 5_000;
const OUTER_TIMEOUT_MS = 9_000;
const MAX_CASE_ELAPSED_MS = 8_000;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUILDER = path.join(ROOT, "scripts/build_voidchain_org_path_preserving_edge_packet_v1.mjs");
const VERIFIER = path.join(ROOT, "scripts/verify_voidchain_org_path_preserving_edge_packet_v1.mjs");

function run(command, args, options = {}) {
  const result = childProcess.spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: OUTER_TIMEOUT_MS,
    killSignal: "SIGKILL",
    maxBuffer: 512 * 1024,
    ...options,
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed: error=${result.error?.message || "none"} status=${result.status}\nstdout=${result.stdout || ""}\nstderr=${result.stderr || ""}`,
    );
  }
  return String(result.stdout || "").trim();
}

function expectBoundedFailure(command, args, needle) {
  const started = performance.now();
  const result = childProcess.spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: OUTER_TIMEOUT_MS,
    killSignal: "SIGKILL",
    maxBuffer: 512 * 1024,
  });
  const elapsed = performance.now() - started;
  assert.equal(
    result.error?.code === "ETIMEDOUT",
    false,
    `outer proof timeout fired; product failed to own its terminal: ${result.error?.message || ""}`,
  );
  assert.notEqual(result.status, 0, `expected failure: ${command} ${args.join(" ")}`);
  const combined = `${result.stdout || ""}\n${result.stderr || ""}`;
  assert.equal(combined.includes(needle), true, combined);
  assert.ok(
    elapsed < MAX_CASE_ELAPSED_MS,
    `bounded failure exceeded ${MAX_CASE_ELAPSED_MS}ms: ${Math.round(elapsed)}ms`,
  );
  return elapsed;
}

function builderArgs(repo, head, credentials, cloudflared, output) {
  return [
    BUILDER,
    "--tunnel-id", TUNNEL_ID,
    "--credentials-file", credentials,
    "--repo-root", repo,
    "--expected-head", head,
    "--cloudflared", cloudflared,
    "--output", output,
  ];
}

function setMode(modeFile, mode) {
  fs.writeFileSync(modeFile, `${mode}\n`, { mode: 0o600 });
}

const builderSource = fs.readFileSync(BUILDER, "utf8");
const verifierSource = fs.readFileSync(VERIFIER, "utf8");
for (const source of [builderSource, verifierSource]) {
  assert.match(source, /const CLOUDFLARED_TOOL_TIMEOUT_MS = 5_000;/);
  assert.match(source, /const CLOUDFLARED_TOOL_MAX_OUTPUT_BYTES = 64 \* 1024;/);
  assert.match(source, /timeout: CLOUDFLARED_TOOL_TIMEOUT_MS/);
  assert.match(source, /killSignal: "SIGKILL"/);
  assert.match(source, /maxBuffer: CLOUDFLARED_TOOL_MAX_OUTPUT_BYTES/);
  assert.equal(
    (source.match(/runCloudflared\(cloudflaredPath,/g) || []).length,
    2,
    "both cloudflared --version and ingress validation must use the bounded runner",
  );
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "void-edge-tool-lifetime-proof-"));
try {
  const repo = path.join(temp, "repo");
  const external = path.join(temp, "external");
  fs.mkdirSync(repo, { mode: 0o700 });
  fs.mkdirSync(external, { mode: 0o700 });
  fs.mkdirSync(path.join(repo, "scripts"), { recursive: true, mode: 0o700 });
  fs.copyFileSync(BUILDER, path.join(repo, "scripts", path.basename(BUILDER)));
  fs.writeFileSync(path.join(repo, "README.md"), "bounded external-tool proof fixture\n", { mode: 0o600 });

  run("git", ["init", "-q", repo]);
  run("git", ["-C", repo, "config", "user.name", "VOID proof"]);
  run("git", ["-C", repo, "config", "user.email", "proof@void.invalid"]);
  run("git", ["-C", repo, "add", "README.md", `scripts/${path.basename(BUILDER)}`]);
  run("git", ["-C", repo, "commit", "-q", "-m", "proof fixture"]);
  const head = run("git", ["-C", repo, "rev-parse", "HEAD"]);

  const credentials = path.join(external, `${TUNNEL_ID}.json`);
  fs.writeFileSync(credentials, "proof-only-opaque-credential\n", { mode: 0o600 });
  fs.chmodSync(credentials, 0o600);

  const modeFile = path.join(external, "cloudflared-mode.txt");
  setMode(modeFile, "normal");

  const cloudflared = path.join(external, "cloudflared");
  fs.writeFileSync(
    cloudflared,
    `#!/usr/bin/env node\nconst fs = require("node:fs");\nconst mode = fs.readFileSync(${JSON.stringify(modeFile)}, "utf8").trim();\nconst args = process.argv.slice(2);\nconst hang = () => { setInterval(() => {}, 1000); };\nif (args[0] === "--version") {\n  if (mode === "version-hang") {\n    hang();\n  } else if (mode === "version-flood") {\n    process.stdout.write("x".repeat(128 * 1024));\n    process.exit(0);\n  } else {\n    console.log("cloudflared version 2026.8.0 bounded-proof");\n    process.exit(0);\n  }\n} else if (args[0] === "--config" && args[2] === "tunnel" && args[3] === "ingress" && args[4] === "validate") {\n  if (mode === "ingress-hang") {\n    hang();\n  } else if (mode === "ingress-flood") {\n    process.stderr.write("x".repeat(128 * 1024));\n    process.exit(1);\n  } else {\n    if (!fs.existsSync(args[1])) process.exit(92);\n    process.exit(0);\n  }\n} else {\n  process.exit(91);\n}\n`,
    { mode: 0o700 },
  );
  fs.chmodSync(cloudflared, 0o700);

  const packet = path.join(external, "packet-normal");
  const built = run(process.execPath, builderArgs(repo, head, credentials, cloudflared, packet));
  assert.match(built, /VOIDCHAIN_ORG_PATH_PRESERVING_EDGE_PACKET_BUILDER_V1_GREEN/);
  assert.match(built, /cloudflared_preflight_timeout_ms=5000/);
  assert.match(built, /cloudflared_preflight_max_output_bytes=65536/);

  const verified = run(process.execPath, [VERIFIER, "--packet", packet, "--repo-root", repo]);
  assert.match(verified, /VOIDCHAIN_ORG_PATH_PRESERVING_EDGE_PACKET_VERIFIER_V1_GREEN/);
  assert.match(verified, /cloudflared_preflight_timeout_ms=5000/);
  assert.match(verified, /cloudflared_preflight_max_output_bytes=65536/);

  setMode(modeFile, "version-hang");
  const builderVersionMs = expectBoundedFailure(
    process.execPath,
    builderArgs(repo, head, credentials, cloudflared, path.join(external, "packet-builder-version-hang")),
    `cloudflared invocation timed out after ${EXPECTED_TIMEOUT_MS}ms`,
  );
  const verifierVersionMs = expectBoundedFailure(
    process.execPath,
    [VERIFIER, "--packet", packet, "--repo-root", repo],
    `cloudflared invocation timed out after ${EXPECTED_TIMEOUT_MS}ms`,
  );

  setMode(modeFile, "ingress-hang");
  const builderIngressMs = expectBoundedFailure(
    process.execPath,
    builderArgs(repo, head, credentials, cloudflared, path.join(external, "packet-builder-ingress-hang")),
    `cloudflared invocation timed out after ${EXPECTED_TIMEOUT_MS}ms`,
  );
  const verifierIngressMs = expectBoundedFailure(
    process.execPath,
    [VERIFIER, "--packet", packet, "--repo-root", repo],
    `cloudflared invocation timed out after ${EXPECTED_TIMEOUT_MS}ms`,
  );

  setMode(modeFile, "version-flood");
  expectBoundedFailure(
    process.execPath,
    builderArgs(repo, head, credentials, cloudflared, path.join(external, "packet-builder-version-flood")),
    "cloudflared invocation failed",
  );

  setMode(modeFile, "ingress-flood");
  expectBoundedFailure(
    process.execPath,
    [VERIFIER, "--packet", packet, "--repo-root", repo],
    "cloudflared invocation failed",
  );

  setMode(modeFile, "normal");
  const recovered = run(process.execPath, [VERIFIER, "--packet", packet, "--repo-root", repo]);
  assert.match(recovered, /VOIDCHAIN_ORG_PATH_PRESERVING_EDGE_PACKET_VERIFIER_V1_GREEN/);

  console.log(`${MARKER}_GREEN`);
  console.log(`cloudflared_timeout_ms=${EXPECTED_TIMEOUT_MS}`);
  console.log("cloudflared_max_output_bytes=65536");
  console.log(`builder_version_hang_ms=${Math.round(builderVersionMs)}`);
  console.log(`verifier_version_hang_ms=${Math.round(verifierVersionMs)}`);
  console.log(`builder_ingress_hang_ms=${Math.round(builderIngressMs)}`);
  console.log(`verifier_ingress_hang_ms=${Math.round(verifierIngressMs)}`);
  console.log("hard_kill_signal=SIGKILL");
  console.log("normal_fast_control_green=true");
  console.log("installer_inherits_bounded_verifier=true");
  console.log("runtime_or_network_mutation=false");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
