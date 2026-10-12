#!/usr/bin/env node
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const MARKER = "VOID_PUBLIC_SEED_SYSTEMD_WORKING_DIRECTORY_V1_PROOF";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const BUILDER = path.join(ROOT, "scripts", "build_void_public_seed_named_tunnel_packet_v1.mjs");
const TUNNEL_ID = "6ff42ae2-765d-4adf-8112-31c55c1551ef";

function run(command, args, { cwd, expect = 0 } = {}) {
  const result = childProcess.spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== expect) {
    process.stderr.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    throw new Error(`${command} ${args.join(" ")} returned ${result.status}; expected ${expect}`);
  }
  return { stdout: String(result.stdout || ""), stderr: String(result.stderr || "") };
}

function write(file, content, mode = 0o600) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, content, { encoding: "utf8", mode });
  fs.chmodSync(file, mode);
}

function makeFixture(root, repoName) {
  const repo = path.join(root, repoName);
  const secrets = path.join(root, "secrets");
  const credentials = path.join(secrets, `${TUNNEL_ID}.json`);
  const cloudflared = path.join(root, "cloudflared");

  fs.mkdirSync(repo, { recursive: true, mode: 0o700 });
  fs.mkdirSync(secrets, { recursive: true, mode: 0o700 });
  write(
    path.join(repo, "tools", "void-public-seed-gateway-v1.mjs"),
    '#!/usr/bin/env node\nconsole.log("fixture gateway");\n',
    0o700,
  );
  write(
    cloudflared,
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      'if test "${1:-}" = "--version"; then',
      '  echo "cloudflared version 2026.8.2 (fixture)"',
      "  exit 0",
      "fi",
      'case " $* " in',
      '  *" tunnel ingress validate "*) exit 0 ;;',
      "esac",
      'echo "unexpected fixture cloudflared arguments: $*" >&2',
      "exit 2",
      "",
    ].join("\n"),
    0o700,
  );
  write(credentials, '{"fixture":true}\n', 0o600);

  run("git", ["init", "-q", repo]);
  run("git", ["-C", repo, "config", "user.email", "proof@example.invalid"]);
  run("git", ["-C", repo, "config", "user.name", "VOID Proof"]);
  run("git", ["-C", repo, "add", "tools/void-public-seed-gateway-v1.mjs"]);
  run("git", ["-C", repo, "commit", "-qm", "fixture"]);
  const head = run("git", ["-C", repo, "rev-parse", "HEAD"]).stdout.trim();

  return { repo, credentials, cloudflared, head };
}

function builderArgs({ repo, credentials, cloudflared, head, output }) {
  return [
    BUILDER,
    "--hostname",
    "seed.example.org",
    "--tunnel-id",
    TUNNEL_ID,
    "--credentials-file",
    credentials,
    "--repo-root",
    repo,
    "--expected-head",
    head,
    "--cloudflared",
    cloudflared,
    "--output",
    output,
  ];
}

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "void-public-seed-systemd-working-directory-proof-"));

try {
  const fixture = makeFixture(temporary, "repo-safe");
  const packet = path.join(temporary, "packet-safe");
  const built = run(process.execPath, builderArgs({ ...fixture, output: packet }));
  assert.match(built.stdout, /VOID_PUBLIC_SEED_NAMED_TUNNEL_PACKET_BUILDER_V1_GREEN/);

  const expected = `WorkingDirectory=${fixture.repo}`;
  for (const name of [
    "void-public-seed-gateway-v1.service",
    "void-public-seed-named-tunnel-v1.service",
  ]) {
    const unit = fs.readFileSync(path.join(packet, name), "utf8");
    const lines = unit.split(/\r?\n/).filter((line) => line.startsWith("WorkingDirectory="));
    assert.deepEqual(lines, [expected], `${name} must contain one exact portable WorkingDirectory line`);
    assert.doesNotMatch(unit, /^WorkingDirectory=["']/m, `${name} must not quote WorkingDirectory`);
  }
  console.log("[PASS] generated units use one unquoted absolute WorkingDirectory directive");

  const unsafeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "void seed unsafe "));
  try {
    const unsafeFixture = makeFixture(unsafeRoot, "repo");
    const rejected = run(
      process.execPath,
      builderArgs({ ...unsafeFixture, output: path.join(unsafeRoot, "packet") }),
      { expect: 1 },
    );
    assert.match(rejected.stderr, /unsupported by portable systemd WorkingDirectory/);
  } finally {
    fs.rmSync(unsafeRoot, { recursive: true, force: true });
  }
  console.log("[PASS] repository paths requiring WorkingDirectory quoting are rejected before packet generation");

  const builderSource = fs.readFileSync(BUILDER, "utf8");
  assert.doesNotMatch(builderSource, /WorkingDirectory=\$\{systemdQuote\(repoRoot\)\}/);
  assert.match(builderSource, /WorkingDirectory=\$\{workingDirectory\}/);
  console.log("[PASS] WorkingDirectory no longer reuses ExecStart argument quoting");

  console.log(`${MARKER}_GREEN`);
  console.log("working_directory_absolute=true");
  console.log("working_directory_quoted=false");
  console.log("unsafe_repository_path_rejected=true");
  console.log("services_started=false");
  console.log("dns_mutation=false");
  console.log("credential_content_read=false");
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
