#!/usr/bin/env node
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const COMPOSER = path.join(ROOT, "scripts", "compose_first_public_earn_tunnel_overlay_v1.mjs");
const VERIFIER = path.join(ROOT, "scripts", "verify_first_public_earn_tunnel_overlay_v1.mjs");
const INSTALLER = path.join(ROOT, "ops", "mainnet0", "install-first-public-earn-tunnel-overlay-v1.sh");
const MARKER = "VOID_FIRST_PUBLIC_EARN_TUNNEL_OVERLAY_V1_PROOF";
const TUNNEL = "dc1fd639-c2ba-4eb8-b90b-7f73ac020cd9";

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}
function run(command, args, options = {}) {
  const r = childProcess.spawnSync(command, args, {
    cwd: options.cwd || ROOT,
    env: { ...process.env, ...(options.env || {}) },
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (r.status !== (options.expect ?? 0)) {
    process.stderr.write(r.stdout || "");
    process.stderr.write(r.stderr || "");
    throw new Error(`${command} failed with status ${r.status}`);
  }
  return r;
}
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "void-first-public-earn-tunnel-overlay-v1-"));
try {
  const sourceConfig = path.join(temp, "source-cloudflared.yml");
  const sourceUnit = path.join(temp, "source-tunnel.service");
  const cloudflared = path.join(temp, "cloudflared");
  const output = path.join(temp, "overlay");
  const credential = path.join(temp, `${TUNNEL}.json`);

  fs.writeFileSync(credential, '{"not_read":true}\n', { mode: 0o600 });
  fs.writeFileSync(sourceConfig, [
    `tunnel: ${TUNNEL}`,
    `credentials-file: ${credential}`,
    "originRequest:",
    "  connectTimeout: 10s",
    "ingress:",
    "  - hostname: seed.nullfeed.org",
    "    service: http://127.0.0.1:4111",
    "  - service: http_status:404",
    "",
  ].join("\n"), { mode: 0o600 });
  fs.writeFileSync(sourceUnit, [
    "[Unit]",
    "Description=fixture",
    "[Service]",
    `ExecStart="/fixture/cloudflared" --config "${sourceConfig}" tunnel run "${TUNNEL}"`,
    "",
  ].join("\n"), { mode: 0o600 });

  fs.writeFileSync(cloudflared, `#!/usr/bin/env bash
set -euo pipefail
if [[ " $* " == *" --version "* ]] || [ "\${1:-}" = "--version" ]; then
  echo "cloudflared version 2026.9.0 (fixture)"
  exit 0
fi
if [[ " $* " == *" tunnel ingress validate "* ]]; then
  exit 0
fi
if [[ " $* " == *" tunnel ingress rule "* ]]; then
  url="\${@: -1}"
  case "$url" in
    https://seed.nullfeed.org/health|https://seed.nullfeed.org/__void/public-earn-gateway-v1/status.json|https://seed.nullfeed.org/.well-known/void-node-public-origin-binding-v1.json|https://seed.nullfeed.org/wc/public-earning-pilot-v1/status|https://seed.nullfeed.org/wc/public-earning-pilot-v1/claim-ticket|https://seed.nullfeed.org/wc/public-earning-pilot-v1/submit-result|https://seed.nullfeed.org/download/void-public-earn-no-node-client-v1.mjs|https://seed.nullfeed.org/datanet/v1/fetch/void-public-earn-first-work-v1)
      echo "service: http://127.0.0.1:4122" ;;
    https://other.invalid/health)
      echo "service: http_status:404" ;;
    *)
      echo "service: http://127.0.0.1:4111" ;;
  esac
  exit 0
fi
exit 2
`, { mode: 0o700 });

  const built = run(process.execPath, [
    COMPOSER,
    "--source-config", sourceConfig,
    "--source-tunnel-unit", sourceUnit,
    "--expected-source-config-sha256", sha256(sourceConfig),
    "--cloudflared", cloudflared,
    "--output", output,
  ]);
  assert.match(built.stdout, /VOID_FIRST_PUBLIC_EARN_TUNNEL_OVERLAY_COMPOSER_V1_GREEN/);

  const verified = run(process.execPath, [VERIFIER, "--overlay", output]);
  assert.match(verified.stdout, /VOID_FIRST_PUBLIC_EARN_TUNNEL_OVERLAY_VERIFIER_V1_GREEN/);

  const config = fs.readFileSync(path.join(output, "cloudflared-config.yml"), "utf8");
  const earnOriginMatches = config.match(/service: http:\/\/127\.0\.0\.1:4122/g) || [];
  assert.equal(earnOriginMatches.length, 6);
  assert.match(config, /path: \^\/health\$/);
  assert.match(config, /public-earn-gateway-v1\/status\\\.json/);
  assert.match(
    config,
    /\\\.well-known\/void-node-public-origin-binding-v1\\\.json/,
  );
  assert.match(config, /public-earning-pilot-v1\/\(status\|claim-ticket\|submit-result\)/);
  assert.match(config, /void-public-earn-no-node-client-v1\\\.mjs/);
  assert.match(config, /datanet\/v1\/fetch\/\[A-Za-z0-9\._:-\]\{1,180\}/);
  assert.match(config, /service: http:\/\/127\.0\.0\.1:4111/);
  assert.match(config, /service: http_status:404/);
  for (const forbidden of ["/wc/redeemable", "/operator/issue", "/sign-claim", "/wallet", "/validator", "/admin", "/rpc"]) {
    assert.equal(config.includes(forbidden), false, `overlay directly exposes ${forbidden}`);
  }

  const installer = fs.readFileSync(INSTALLER, "utf8");
  for (const required of [
    "activate-first-public-earn-tunnel-overlay-v1",
    "scripts/verify_first_public_earn_tunnel_overlay_v1.mjs",
    "http://127.0.0.1:4122",
    "http://127.0.0.1:4111",
    "https://seed.nullfeed.org/__void/public-earn-gateway-v1/status.json",
    "https://seed.nullfeed.org/.well-known/void-node-public-origin-binding-v1.json",
    "https://seed.nullfeed.org/__void/checkpoint/v1.json",
    "ROLLBACK_BEGIN",
    "ticket_issuance=false",
    "wc_write=false",
    "fund_movement=false",
  ]) {
    assert.ok(installer.includes(required), `installer missing ${required}`);
  }
  assert.equal(installer.includes("claim-ticket -X POST"), false);
  assert.equal(installer.includes("--private-key"), false);
  assert.equal(installer.includes("wallet_file"), false);

  console.log(`${MARKER}_GREEN`);
  console.log("earn_route_count=6");
  console.log("signed_origin_binding_ingress=http://127.0.0.1:4122");
  console.log("seed_fallback_preserved=true");
  console.log("rollback_present=true");
  console.log("ticket_issuance=false");
  console.log("wc_write=false");
  console.log("fund_movement=false");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
