#!/usr/bin/env node
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const MARKER = "VOIDCHAIN_ORG_PATH_PRESERVING_EDGE_PACKET_V1_PROOF";
const TUNNEL_ID = "6ff42ae2-765d-4adf-8112-31c55c1551ef";
const HOSTNAMES = ["voidchain.org", "www.voidchain.org"];
const EDGE_ORIGIN = "http://127.0.0.1:8080";
const UNIT_NAME = "voidchain-org-path-preserving-edge-v1.service";
const root = process.cwd();
const builder = path.join(root, "scripts/build_voidchain_org_path_preserving_edge_packet_v1.mjs");
const verifier = path.join(root, "scripts/verify_voidchain_org_path_preserving_edge_packet_v1.mjs");

function run(command, args, options = {}) {
  const result = childProcess.spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  }
  return String(result.stdout || "").trim();
}

function expectFailure(command, args, needle) {
  const result = childProcess.spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  assert.notEqual(result.status, 0, `expected failure: ${command} ${args.join(" ")}`);
  const combined = `${result.stdout || ""}\n${result.stderr || ""}`;
  if (needle) assert.equal(combined.includes(needle), true, combined);
}

function canonicalize(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("canonical JSON cannot contain non-finite numbers");
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  throw new Error(`canonical JSON cannot contain ${typeof value}`);
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256Bytes(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function builderArgs(repo, head, credentials, cloudflared, output) {
  return [
    builder,
    "--tunnel-id", TUNNEL_ID,
    "--credentials-file", credentials,
    "--repo-root", repo,
    "--expected-head", head,
    "--cloudflared", cloudflared,
    "--output", output,
  ];
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "voidchain-org-edge-proof-"));
try {
  const repo = path.join(temp, "repo");
  const external = path.join(temp, "external");
  fs.mkdirSync(repo, { mode: 0o700 });
  fs.mkdirSync(external, { mode: 0o700 });
  fs.mkdirSync(path.join(repo, "scripts"), { recursive: true, mode: 0o700 });
  fs.copyFileSync(builder, path.join(repo, "scripts", path.basename(builder)));
  fs.writeFileSync(path.join(repo, "README.md"), "proof fixture\n", { mode: 0o600 });

  run("git", ["init", "-q", repo]);
  run("git", ["-C", repo, "config", "user.name", "VOID proof"]);
  run("git", ["-C", repo, "config", "user.email", "proof@void.invalid"]);
  run("git", ["-C", repo, "add", "README.md", `scripts/${path.basename(builder)}`]);
  run("git", ["-C", repo, "commit", "-q", "-m", "proof fixture"]);
  const head = run("git", ["-C", repo, "rev-parse", "HEAD"]);

  const secret = "CLOUDFLARED_TEST_SECRET_MUST_NEVER_ENTER_PACKET";
  const credentials = path.join(external, `${TUNNEL_ID}.json`);
  fs.writeFileSync(credentials, `${secret}\n`, { mode: 0o600 });
  fs.chmodSync(credentials, 0o600);

  const cloudflared = path.join(external, "cloudflared");
  fs.writeFileSync(
    cloudflared,
    `#!/usr/bin/env bash\nset -euo pipefail\nif test "\${1:-}" = --version; then echo 'cloudflared version 2026.8.0 proof'; exit 0; fi\nif test "\${1:-}" = --config && test "\${3:-}" = tunnel && test "\${4:-}" = ingress && test "\${5:-}" = validate; then test -f "\${2:-}"; exit 0; fi\nexit 91\n`,
    { mode: 0o700 },
  );
  fs.chmodSync(cloudflared, 0o700);

  const output = path.join(external, "packet");
  const built = run(process.execPath, builderArgs(repo, head, credentials, cloudflared, output));
  assert.equal(built.includes("VOIDCHAIN_ORG_PATH_PRESERVING_EDGE_PACKET_BUILDER_V1_GREEN"), true);

  const verified = run(process.execPath, [verifier, "--packet", output, "--repo-root", repo]);
  assert.equal(verified.includes("VOIDCHAIN_ORG_PATH_PRESERVING_EDGE_PACKET_VERIFIER_V1_GREEN"), true);
  assert.equal(verified.includes("path_preserved=true"), true);
  assert.equal(verified.includes("unit_semantics_bound=true"), true);

  const packetPath = path.join(output, "packet.json");
  const packet = JSON.parse(fs.readFileSync(packetPath, "utf8"));
  assert.deepEqual(packet.hostnames, HOSTNAMES);
  assert.deepEqual(packet.public_origins, HOSTNAMES.map((host) => `https://${host}`));
  assert.equal(packet.local_edge.origin, EDGE_ORIGIN);
  assert.equal(packet.local_edge.existing_tailscale_funnel_unchanged, true);
  assert.equal(packet.path_preservation.host_only_ingress, true);
  assert.equal(packet.path_preservation.path_matcher, false);
  assert.equal(packet.path_preservation.redirect, false);
  assert.equal(packet.path_preservation.prefix_strip, false);
  assert.equal(packet.path_preservation.rewrite, false);
  assert.equal(packet.activation.dns_changed, false);
  assert.equal(packet.activation.northwest_forwarding_changed, false);
  assert.equal(packet.activation.tailscale_funnel_changed, false);
  assert.equal(packet.authority.credentials_contents_read, false);
  assert.equal(packet.authority.node_runtime_changed, false);

  const configPath = path.join(output, "cloudflared-config.yml");
  const config = fs.readFileSync(configPath, "utf8");
  for (const hostname of HOSTNAMES) {
    assert.equal((config.match(new RegExp(`hostname: ${hostname.replaceAll(".", "\\.")}`, "g")) || []).length, 1);
  }
  assert.equal((config.match(/service: http:\/\/127\.0\.0\.1:8080/g) || []).length, 2);
  assert.equal(config.endsWith("  - service: http_status:404\n"), true);
  assert.equal(/^\s*path\s*:/m.test(config), false);
  assert.equal(/\b(?:redirect|rewrite|strip)\b/i.test(config), false);

  const packetFiles = fs.readdirSync(output);
  for (const name of packetFiles) {
    const bytes = fs.readFileSync(path.join(output, name));
    assert.equal(bytes.includes(Buffer.from(secret)), false, `${name} leaked credential contents`);
  }

  const originalConfig = fs.readFileSync(configPath);
  fs.writeFileSync(configPath, `${originalConfig.toString("utf8")}# tampered\n`);
  expectFailure(process.execPath, [verifier, "--packet", output, "--repo-root", repo], "packet file identity mismatch");
  fs.writeFileSync(configPath, originalConfig);

  const unitPath = path.join(output, UNIT_NAME);
  const originalUnit = fs.readFileSync(unitPath, "utf8");
  const originalPacketText = fs.readFileSync(packetPath, "utf8");
  const tamperedUnit = originalUnit.replace("Restart=always\n", "Restart=no\n");
  assert.notEqual(tamperedUnit, originalUnit);
  fs.writeFileSync(unitPath, tamperedUnit);
  const selfConsistentTamperedPacket = JSON.parse(originalPacketText);
  selfConsistentTamperedPacket.files[UNIT_NAME] = {
    bytes: Buffer.byteLength(tamperedUnit, "utf8"),
    sha256: sha256Bytes(tamperedUnit),
  };
  const { packet_id: ignoredPacketId, ...tamperedBody } = selfConsistentTamperedPacket;
  void ignoredPacketId;
  selfConsistentTamperedPacket.packet_id = `voidedge1_${sha256Bytes(canonicalJson(tamperedBody))}`;
  fs.writeFileSync(packetPath, `${JSON.stringify(selfConsistentTamperedPacket, null, 2)}\n`);
  expectFailure(
    process.execPath,
    [verifier, "--packet", output, "--repo-root", repo],
    "systemd unit is not the exact reviewed service contract",
  );
  fs.writeFileSync(unitPath, originalUnit);
  fs.writeFileSync(packetPath, originalPacketText);

  fs.chmodSync(credentials, 0o644);
  expectFailure(process.execPath, [verifier, "--packet", output, "--repo-root", repo], "credentials file must have mode 0600");
  fs.chmodSync(credentials, 0o600);

  fs.writeFileSync(path.join(repo, "dirty-untracked.txt"), "dirty\n");
  expectFailure(
    process.execPath,
    builderArgs(repo, head, credentials, cloudflared, path.join(external, "dirty-output")),
    "repository must be clean",
  );
  fs.unlinkSync(path.join(repo, "dirty-untracked.txt"));

  const insideCredentials = path.join(repo, ".git", `${TUNNEL_ID}.json`);
  fs.writeFileSync(insideCredentials, "inside-test-secret\n", { mode: 0o600 });
  fs.chmodSync(insideCredentials, 0o600);
  expectFailure(
    process.execPath,
    builderArgs(repo, head, insideCredentials, cloudflared, path.join(external, "inside-output")),
    "credentials file must remain outside the repository",
  );
  fs.unlinkSync(insideCredentials);

  const finalVerified = run(process.execPath, [verifier, "--packet", output, "--repo-root", repo]);
  assert.equal(finalVerified.includes("path_preserved=true"), true);
  assert.equal(finalVerified.includes("unit_semantics_bound=true"), true);

  console.log(`${MARKER}_GREEN`);
  console.log("hostnames=voidchain.org,www.voidchain.org");
  console.log("edge_origin=http://127.0.0.1:8080");
  console.log("path_preservation=host_only_no_rewrite");
  console.log("terminal_deny=http_status:404");
  console.log("unit_semantics_bound=true");
  console.log("self_consistent_unit_tamper_rejected=true");
  console.log("credential_contents_leaked=false");
  console.log("dirty_repo_rejected=true");
  console.log("in_repo_credentials_rejected=true");
  console.log("dns_changed=false");
  console.log("tailscale_funnel_changed=false");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
