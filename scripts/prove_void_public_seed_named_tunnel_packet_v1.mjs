#!/usr/bin/env node
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const MARKER = "VOID_PUBLIC_SEED_NAMED_TUNNEL_PACKET_V1_PROOF";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const BUILDER = path.join(ROOT, "scripts", "build_void_public_seed_named_tunnel_packet_v1.mjs");
const VERIFIER = path.join(ROOT, "scripts", "verify_void_public_seed_named_tunnel_packet_v1.mjs");

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
function buildArgs({ repo, head, credentials, cloudflared, output, hostname = "seed.example.org" }) {
  return [
    BUILDER,
    "--hostname", hostname,
    "--tunnel-id", "6ff42ae2-765d-4adf-8112-31c55c1551ef",
    "--credentials-file", credentials,
    "--repo-root", repo,
    "--expected-head", head,
    "--cloudflared", cloudflared,
    "--output", output,
  ];
}

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "void-public-seed-ingress-proof-"));
const repo = path.join(temporary, "repo");
const secrets = path.join(temporary, "secrets");
const credentials = path.join(secrets, "6ff42ae2-765d-4adf-8112-31c55c1551ef.json");
const cloudflared = path.join(temporary, "cloudflared");
const packet = path.join(temporary, "packet");

try {
  fs.mkdirSync(repo, { recursive: true, mode: 0o700 });
  fs.mkdirSync(secrets, { recursive: true, mode: 0o700 });
  write(path.join(repo, "tools", "void-public-seed-gateway-v1.mjs"), '#!/usr/bin/env node\nconsole.log("fixture gateway");\n', 0o700);
  write(
    cloudflared,
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      'if test "${1:-}" = "--version"; then',
      '  echo "cloudflared version 2026.7.3 (fixture)"',
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
  write(credentials, '{"AccountTag":"fixture","TunnelSecret":"not-a-real-secret","TunnelID":"fixture"}\n', 0o600);
  run("git", ["init", "-q", repo]);
  run("git", ["-C", repo, "config", "user.email", "proof@example.invalid"]);
  run("git", ["-C", repo, "config", "user.name", "VOID Proof"]);
  run("git", ["-C", repo, "add", "tools/void-public-seed-gateway-v1.mjs"]);
  run("git", ["-C", repo, "commit", "-qm", "fixture"]);
  const head = run("git", ["-C", repo, "rev-parse", "HEAD"]).stdout.trim();

  const built = run(process.execPath, buildArgs({ repo, head, credentials, cloudflared, output: packet }));
  assert.match(built.stdout, /VOID_PUBLIC_SEED_NAMED_TUNNEL_PACKET_BUILDER_V1_GREEN/);
  assert.match(built.stdout, /credentials_read=false/);
  assert.match(built.stdout, /services_started=false/);
  const verified = run(process.execPath, [VERIFIER, "--packet", packet, "--skip-runtime-probe"]);
  assert.match(verified.stdout, /VOID_PUBLIC_SEED_NAMED_TUNNEL_PACKET_VERIFIER_V1_GREEN/);
  assert.match(verified.stdout, /token_in_process_arguments=false/);
  assert.match(verified.stdout, /gateway_loopback_only=true/);

  const config = fs.readFileSync(path.join(packet, "cloudflared-config.yml"), "utf8");
  const gatewayUnit = fs.readFileSync(path.join(packet, "void-public-seed-gateway-v1.service"), "utf8");
  const tunnelUnit = fs.readFileSync(path.join(packet, "void-public-seed-named-tunnel-v1.service"), "utf8");
  assert.match(config, /hostname: seed\.example\.org/);
  assert.match(config, /service: http:\/\/127\.0\.0\.1:4111/);
  assert.match(config, /- service: http_status:404\s*$/);
  assert.match(gatewayUnit, /VOID_PUBLIC_SEED_BIND=127\.0\.0\.1/);
  assert.match(gatewayUnit, /VOID_PUBLIC_SEED_UPSTREAM=http:\/\/127\.0\.0\.1:4100/);
  assert.doesNotMatch(tunnelUnit, /--token|trycloudflare|100\.122\.|0\.0\.0\.0/);
  assert.match(tunnelUnit, /tunnel run/);
  console.log("[PASS] exact packet source and secret boundary");

  const configPath = path.join(packet, "cloudflared-config.yml");
  const originalConfig = fs.readFileSync(configPath);
  fs.appendFileSync(configPath, "# tampered\n");
  const tampered = run(process.execPath, [VERIFIER, "--packet", packet, "--skip-runtime-probe"], { expect: 1 });
  assert.match(tampered.stderr, /(byte count|SHA-256) mismatch/);
  fs.writeFileSync(configPath, originalConfig);
  fs.chmodSync(configPath, 0o600);
  console.log("[PASS] tampered packet rejection");

  fs.chmodSync(credentials, 0o644);
  const broadCredentials = run(process.execPath, [VERIFIER, "--packet", packet, "--skip-runtime-probe"], { expect: 1 });
  assert.match(broadCredentials.stderr, /mode 0600/);
  fs.chmodSync(credentials, 0o600);
  console.log("[PASS] credential metadata boundary");

  const originalCloudflared = fs.readFileSync(cloudflared);
  fs.appendFileSync(cloudflared, "# changed\n");
  fs.chmodSync(cloudflared, 0o700);
  const changedBinary = run(process.execPath, [VERIFIER, "--packet", packet, "--skip-runtime-probe"], { expect: 1 });
  assert.match(changedBinary.stderr, /cloudflared executable SHA-256 mismatch/);
  fs.writeFileSync(cloudflared, originalCloudflared);
  fs.chmodSync(cloudflared, 0o700);
  console.log("[PASS] executable drift rejection");

  write(path.join(repo, "dirty.txt"), "dirty\n");
  const dirtyRepo = run(process.execPath, [VERIFIER, "--packet", packet, "--skip-runtime-probe"], { expect: 1 });
  assert.match(dirtyRepo.stderr, /repository is not clean/);
  fs.rmSync(path.join(repo, "dirty.txt"));
  console.log("[PASS] exact clean source requirement");

  const temporaryHost = run(
    process.execPath,
    buildArgs({ repo, head, credentials, cloudflared, output: path.join(temporary, "temporary-host-packet"), hostname: "bad.trycloudflare.com" }),
    { expect: 1 },
  );
  assert.match(temporaryHost.stderr, /temporary/);
  console.log("[PASS] temporary provider hostname rejection");

  const qualificationWorkflow = fs.readFileSync(path.join(ROOT, ".github/workflows/void-public-seed-live-qualification-v1.yml"), "utf8");
  const acceptanceWorkflow = fs.readFileSync(path.join(ROOT, ".github/workflows/void-public-bootstrap-outside-machine-acceptance-v1.yml"), "utf8");
  const ciWorkflow = fs.readFileSync(path.join(ROOT, ".github/workflows/void-public-seed-stable-ingress-activation-v1.yml"), "utf8");
  const documentation = fs.readFileSync(path.join(ROOT, "docs/public/public-seed-stable-ingress-activation-v1.md"), "utf8");
  for (const [name, workflow] of [["qualification", qualificationWorkflow], ["acceptance", acceptanceWorkflow]]) {
    assert.match(workflow, /workflow_dispatch:/, `${name} workflow is not manual-only`);
    assert.doesNotMatch(workflow, /\n\s*pull_request:/, `${name} workflow runs automatically`);
    assert.doesNotMatch(workflow, /secrets\./, `${name} workflow accesses repository secrets`);
    assert.doesNotMatch(workflow, /\bsudo\b/, `${name} workflow uses sudo`);
  }
  assert.match(qualificationWorkflow, /--samples 3/);
  assert.match(qualificationWorkflow, /--interval-ms 30000/);
  assert.match(qualificationWorkflow, /manifest_published=false/);
  assert.match(acceptanceWorkflow, /VOID_PUBLIC_BOOTSTRAP_REQUIRE: '1'/);
  assert.match(acceptanceWorkflow, /seq 1 2400/);
  assert.match(acceptanceWorkflow, /public_sync_via_loopback_adapter=true/);
  assert.match(acceptanceWorkflow, /direct_remote_fetch_from_node=false/);
  assert.match(ciWorkflow, /node: \[22, 24, 26\]/);
  assert.match(ciWorkflow, /npm ci --ignore-scripts --no-audit --no-fund/);
  assert.match(documentation, /Issue #1005 remains open/);
  assert.match(documentation, /credentials contents/);
  assert.match(documentation, /VOID_PUBLIC_BOOTSTRAP_REQUIRE=1/);
  console.log("[PASS] manual qualification and outside-machine workflow boundary");

  for (const relative of [
    "scripts/build_void_public_seed_named_tunnel_packet_v1.mjs",
    "scripts/verify_void_public_seed_named_tunnel_packet_v1.mjs",
    "scripts/prove_void_public_seed_named_tunnel_packet_v1.mjs",
    "ops/public/install_void_public_seed_named_tunnel_packet_v1.sh",
  ]) {
    const source = fs.readFileSync(path.join(ROOT, relative), "utf8");
    assert.doesNotMatch(source, /catch\s*\{\s*\}/);
    assert.doesNotMatch(source, /\.catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/);
  }
  console.log("[PASS] terminal empty-catch boundary");
  console.log(`${MARKER}_GREEN`);
  console.log("stable_seed_published=false");
  console.log("credentials_read=false");
  console.log("token_in_process_arguments=false");
  console.log("gateway_loopback_only=true");
  console.log("temporary_provider_accepted=false");
  console.log("services_started=false");
  console.log("dns_changed=false");
  console.log("manifest_published=false");
  console.log("wallet_authority=false");
  console.log("signer_authority=false");
  console.log("validator_authority=false");
  console.log("treasury_authority=false");
  console.log("work_credit_authority=false");
  console.log("money_movement_authority=false");
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
