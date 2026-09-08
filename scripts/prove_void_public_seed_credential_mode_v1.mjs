#!/usr/bin/env node
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const MARKER = "VOID_PUBLIC_SEED_CREDENTIAL_MODE_V1_PROOF";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const BUILDER = path.join(ROOT, "scripts", "build_void_public_seed_named_tunnel_packet_v1.mjs");
const VERIFIER = path.join(ROOT, "scripts", "verify_void_public_seed_named_tunnel_packet_v1.mjs");
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

function buildArgs({ repo, head, credentials, cloudflared, output }) {
  return [
    BUILDER,
    "--hostname", "seed.example.org",
    "--tunnel-id", TUNNEL_ID,
    "--credentials-file", credentials,
    "--repo-root", repo,
    "--expected-head", head,
    "--cloudflared", cloudflared,
    "--output", output,
  ];
}

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "void-public-seed-credential-mode-proof-"));
const repo = path.join(temporary, "repo");
const secrets = path.join(temporary, "secrets");
const credentials = path.join(secrets, `${TUNNEL_ID}.json`);
const cloudflared = path.join(temporary, "cloudflared");

try {
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

  for (const mode of [0o400, 0o600]) {
    fs.chmodSync(credentials, mode);
    const packet = path.join(temporary, `packet-${mode.toString(8)}`);
    const built = run(process.execPath, buildArgs({ repo, head, credentials, cloudflared, output: packet }));
    assert.match(built.stdout, /VOID_PUBLIC_SEED_NAMED_TUNNEL_PACKET_BUILDER_V1_GREEN/);
    const verified = run(process.execPath, [VERIFIER, "--packet", packet, "--skip-runtime-probe"]);
    assert.match(verified.stdout, /VOID_PUBLIC_SEED_NAMED_TUNNEL_PACKET_VERIFIER_V1_GREEN/);
    console.log(`[PASS] credential mode ${mode.toString(8).padStart(4, "0")} accepted by builder and verifier`);
  }

  for (const mode of [0o200, 0o500, 0o640, 0o644, 0o700]) {
    fs.chmodSync(credentials, mode);
    const packet = path.join(temporary, `reject-builder-${mode.toString(8)}`);
    const rejected = run(
      process.execPath,
      buildArgs({ repo, head, credentials, cloudflared, output: packet }),
      { expect: 1 },
    );
    assert.match(rejected.stderr, /mode 0400 or 0600/);
    assert.equal(fs.existsSync(packet), false);
    console.log(`[PASS] builder rejects credential mode ${mode.toString(8).padStart(4, "0")}`);
  }

  fs.chmodSync(credentials, 0o600);
  const verifierPacket = path.join(temporary, "verifier-packet");
  run(process.execPath, buildArgs({ repo, head, credentials, cloudflared, output: verifierPacket }));

  for (const mode of [0o200, 0o500, 0o640, 0o644, 0o700]) {
    fs.chmodSync(credentials, mode);
    const rejected = run(
      process.execPath,
      [VERIFIER, "--packet", verifierPacket, "--skip-runtime-probe"],
      { expect: 1 },
    );
    assert.match(rejected.stderr, /mode 0400 or 0600/);
    console.log(`[PASS] verifier rejects credential mode ${mode.toString(8).padStart(4, "0")}`);
  }

  fs.chmodSync(credentials, 0o400);
  const symlinkDir = path.join(temporary, "symlink-secrets");
  fs.mkdirSync(symlinkDir, { mode: 0o700 });
  const symlinkCredentials = path.join(symlinkDir, `${TUNNEL_ID}.json`);
  fs.symlinkSync(credentials, symlinkCredentials);
  const symlinkBuild = run(
    process.execPath,
    buildArgs({
      repo,
      head,
      credentials: symlinkCredentials,
      cloudflared,
      output: path.join(temporary, "symlink-builder-packet"),
    }),
    { expect: 1 },
  );
  assert.match(symlinkBuild.stderr, /regular non-symlink file/);
  console.log("[PASS] builder rejects credential symlink");

  fs.chmodSync(credentials, 0o600);
  const realCredential = `${credentials}.real`;
  fs.renameSync(credentials, realCredential);
  fs.symlinkSync(realCredential, credentials);
  const symlinkVerify = run(
    process.execPath,
    [VERIFIER, "--packet", verifierPacket, "--skip-runtime-probe"],
    { expect: 1 },
  );
  assert.match(symlinkVerify.stderr, /regular non-symlink file/);
  fs.unlinkSync(credentials);
  fs.renameSync(realCredential, credentials);
  fs.chmodSync(credentials, 0o600);
  console.log("[PASS] verifier rejects credential symlink");

  console.log(`${MARKER}_GREEN`);
  console.log("credential_mode_0400_accepted=true");
  console.log("credential_mode_0600_accepted=true");
  console.log("credential_mode_0200_rejected=true");
  console.log("credential_mode_0500_rejected=true");
  console.log("credential_mode_0640_rejected=true");
  console.log("credential_mode_0644_rejected=true");
  console.log("credential_mode_0700_rejected=true");
  console.log("credential_symlink_rejected=true");
  console.log("credentials_read=false");
  console.log("service_mutation=false");
  console.log("dns_mutation=false");
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
