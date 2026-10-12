#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const MARKER = "VOID_FIRST_PUBLIC_EARN_TUNNEL_OVERLAY_VERIFIER_V1";
const SCHEMA = "void_first_public_earn_tunnel_overlay_v1";
const HOSTNAME = "seed.nullfeed.org";
const SEED_ORIGIN = "http://127.0.0.1:4111";
const EARN_ORIGIN = "http://127.0.0.1:4122";
const EXPECTED_RULES = Object.freeze([
  Object.freeze({ path: "^/health$", service: EARN_ORIGIN }),
  Object.freeze({ path: "^/__void/public-earn-gateway-v1/status\\.json$", service: EARN_ORIGIN }),
  Object.freeze({ path: "^/wc/public-earning-pilot-v1/(status|claim-ticket|submit-result)$", service: EARN_ORIGIN }),
  Object.freeze({ path: "^/download/void-public-earn-no-node-client-v1\\.mjs$", service: EARN_ORIGIN }),
  Object.freeze({ path: "^/datanet/v1/fetch/[A-Za-z0-9._:-]{1,180}$", service: EARN_ORIGIN }),
]);

function fail(message) {
  console.error(`${MARKER}_FAIL: ${message}`);
  process.exit(1);
}
function sha256Bytes(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function sha256File(file) {
  return sha256Bytes(fs.readFileSync(file));
}
function canonicalize(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  throw new Error("unsupported canonical JSON value");
}
function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}
function regularFile(raw, label) {
  const resolved = path.resolve(String(raw));
  const st = fs.lstatSync(resolved);
  if (st.isSymbolicLink() || !st.isFile()) throw new Error(`${label} must be one regular non-symlink file`);
  if (fs.realpathSync(resolved) !== resolved) throw new Error(`${label} path must already be canonical`);
  return resolved;
}
function parseArgs(argv) {
  if (argv.length !== 2 || argv[0] !== "--overlay") throw new Error("usage: --overlay <dir>");
  return path.resolve(argv[1]);
}
function expectedConfig(overlay, credentialLine) {
  const lines = [
    `tunnel: ${overlay.tunnel_id}`,
    `credentials-file: ${credentialLine}`,
    "originRequest:",
    "  connectTimeout: 10s",
    "ingress:",
  ];
  for (const rule of EXPECTED_RULES) {
    lines.push(
      `  - hostname: ${HOSTNAME}`,
      `    path: ${rule.path}`,
      `    service: ${rule.service}`,
    );
  }
  lines.push(
    `  - hostname: ${HOSTNAME}`,
    `    service: ${SEED_ORIGIN}`,
    "  - service: http_status:404",
    "",
  );
  return lines.join("\n");
}
function main() {
  const root = parseArgs(process.argv.slice(2));
  const st = fs.lstatSync(root);
  if (st.isSymbolicLink() || !st.isDirectory() || fs.realpathSync(root) !== root) {
    throw new Error("overlay must be one canonical real directory");
  }

  const manifestPath = regularFile(path.join(root, "overlay.json"), "overlay manifest");
  const overlay = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (overlay.schema !== SCHEMA || overlay.version !== 1 || overlay.hostname !== HOSTNAME) {
    throw new Error("overlay identity mismatch");
  }
  if (overlay.earn_origin !== EARN_ORIGIN || overlay.seed_origin !== SEED_ORIGIN) {
    throw new Error("overlay origin contract mismatch");
  }
  if (JSON.stringify(overlay.earn_rules) !== JSON.stringify(EXPECTED_RULES)) {
    throw new Error("overlay earn rule set mismatch");
  }
  if (!/^voidpeio1_[0-9a-f]{64}$/.test(String(overlay.overlay_id || ""))) {
    throw new Error("overlay id malformed");
  }

  const body = { ...overlay };
  delete body.overlay_id;
  const expectedId = `voidpeio1_${sha256Bytes(Buffer.from(canonicalJson(body)))}`;
  if (overlay.overlay_id !== expectedId) throw new Error("overlay id mismatch");

  const sourceConfig = regularFile(overlay.source_config_path, "source config");
  const sourceUnitCopy = regularFile(
    path.join(root, "source-void-public-seed-named-tunnel-v1.service"),
    "source tunnel unit copy",
  );
  const config = regularFile(path.join(root, "cloudflared-config.yml"), "generated config");
  const unit = regularFile(path.join(root, "void-public-seed-named-tunnel-v1.service"), "generated tunnel unit");

  if (sha256File(sourceConfig) !== overlay.source_config_sha256) throw new Error("source config changed");
  if (sha256File(sourceUnitCopy) !== overlay.source_tunnel_unit_sha256) throw new Error("source unit copy hash mismatch");
  if (sha256File(config) !== overlay.generated.config_sha256) throw new Error("generated config hash mismatch");
  if (sha256File(unit) !== overlay.generated.tunnel_unit_sha256) throw new Error("generated tunnel unit hash mismatch");
  if (sha256File(sourceUnitCopy) !== overlay.generated.source_tunnel_unit_copy_sha256) {
    throw new Error("generated source unit copy metadata mismatch");
  }

  const sourceText = fs.readFileSync(sourceConfig, "utf8");
  const sourceMatch = /^tunnel: ([0-9a-f-]{36})\ncredentials-file: ([^\n]+)\noriginRequest:\n  connectTimeout: 10s\ningress:\n  - hostname: seed\.nullfeed\.org\n    service: http:\/\/127\.0\.0\.1:4111\n  - service: http_status:404\n$/u.exec(sourceText);
  if (!sourceMatch || sourceMatch[1] !== overlay.tunnel_id) throw new Error("source ingress contract changed");

  const expected = expectedConfig(overlay, sourceMatch[2]);
  if (fs.readFileSync(config, "utf8") !== expected) throw new Error("generated ingress config bytes mismatch");

  const sourceUnitText = fs.readFileSync(sourceUnitCopy, "utf8");
  const expectedUnit = sourceUnitText.replace(overlay.source_config_path, path.join(root, "cloudflared-config.yml"));
  if (expectedUnit === sourceUnitText || expectedUnit.includes(overlay.source_config_path)) {
    throw new Error("source unit config pointer contract mismatch");
  }
  if (fs.readFileSync(unit, "utf8") !== expectedUnit) throw new Error("generated tunnel unit bytes mismatch");

  for (const forbidden of [
    "/wc/redeemable",
    "/operator/issue",
    "/sign-claim",
    "/wallet",
    "/validator",
    "/admin",
    "/rpc",
  ]) {
    if (expected.includes(`path: .*${forbidden}`)) throw new Error(`forbidden public earn path admitted: ${forbidden}`);
  }

  for (const [key, expectedValue] of Object.entries({
    service_restart: false,
    tunnel_cutover: false,
    ticket_issuance: false,
    wc_write: false,
    settlement: false,
    wallet_access: false,
    validator_mutation: false,
    fund_movement: false,
  })) {
    if (overlay.authority?.[key] !== expectedValue) throw new Error(`overlay authority mismatch: ${key}`);
  }

  console.log(`${MARKER}_GREEN`);
  console.log(`overlay_id=${overlay.overlay_id}`);
  console.log("earn_route_count=5");
  console.log("earn_origin=http://127.0.0.1:4122");
  console.log("seed_fallback=http://127.0.0.1:4111");
  console.log("terminal_404=true");
  console.log("credential_content_read=false");
  console.log("ticket_issuance=false");
  console.log("wc_write=false");
  console.log("fund_movement=false");
}
try {
  main();
} catch (error) {
  fail(error?.stack || String(error));
}
