#!/usr/bin/env node
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const MARKER = "VOID_FIRST_PUBLIC_EARN_TUNNEL_OVERLAY_COMPOSER_V1";
const SCHEMA = "void_first_public_earn_tunnel_overlay_v1";
const HOSTNAME = "seed.nullfeed.org";
const SEED_ORIGIN = "http://127.0.0.1:4111";
const EARN_ORIGIN = "http://127.0.0.1:4122";

const EARN_RULES = Object.freeze([
  Object.freeze({ path: "^/health$", service: EARN_ORIGIN }),
  Object.freeze({
    path: "^/__void/public-earn-gateway-v1/status\\.json$",
    service: EARN_ORIGIN,
  }),
  Object.freeze({
    path: "^/wc/public-earning-pilot-v1/(status|claim-ticket|submit-result)$",
    service: EARN_ORIGIN,
  }),
  Object.freeze({
    path: "^/download/void-public-earn-no-node-client-v1\\.mjs$",
    service: EARN_ORIGIN,
  }),
  Object.freeze({
    path: "^/datanet/v1/fetch/[A-Za-z0-9._:-]{1,180}$",
    service: EARN_ORIGIN,
  }),
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
function parseArgs(argv) {
  const values = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) throw new Error(`unexpected argument ${key}`);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) throw new Error(`missing value for ${key}`);
    const name = key.slice(2);
    if (Object.hasOwn(values, name)) throw new Error(`duplicate argument ${key}`);
    values[name] = value;
    i += 1;
  }
  for (const key of [
    "source-config",
    "source-tunnel-unit",
    "expected-source-config-sha256",
    "cloudflared",
    "output",
  ]) {
    if (!values[key]) throw new Error(`missing --${key}`);
  }
  return values;
}
function regularFile(raw, label, { executable = false } = {}) {
  const resolved = path.resolve(String(raw));
  const st = fs.lstatSync(resolved);
  if (st.isSymbolicLink() || !st.isFile()) throw new Error(`${label} must be one regular non-symlink file`);
  if (fs.realpathSync(resolved) !== resolved) throw new Error(`${label} path must already be canonical`);
  if (executable && (st.mode & 0o111) === 0) throw new Error(`${label} must be executable`);
  return resolved;
}
function run(command, args) {
  const result = childProcess.spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed: ${String(result.stderr || result.stdout || "").trim()}`,
    );
  }
  return String(result.stdout || "").trim();
}
function parseSourceConfig(sourceText) {
  const match = /^tunnel: ([0-9a-f-]{36})\ncredentials-file: ([^\n]+)\noriginRequest:\n  connectTimeout: 10s\ningress:\n  - hostname: seed\.nullfeed\.org\n    service: http:\/\/127\.0\.0\.1:4111\n  - service: http_status:404\n$/u.exec(sourceText);
  if (!match) throw new Error("source config is outside the exact reviewed seed.nullfeed.org ingress contract");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(match[1])) {
    throw new Error("source tunnel id is malformed");
  }
  if (/[\0\r\n]/.test(match[2])) throw new Error("source credential path is malformed");
  return { tunnelId: match[1], credentialsFile: match[2] };
}
function renderConfig({ tunnelId, credentialsFile }) {
  const lines = [
    `tunnel: ${tunnelId}`,
    `credentials-file: ${credentialsFile}`,
    "originRequest:",
    "  connectTimeout: 10s",
    "ingress:",
  ];
  for (const rule of EARN_RULES) {
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
function assertRule(cloudflared, config, url, expectedService) {
  const output = run(cloudflared, ["--config", config, "tunnel", "ingress", "rule", url]);
  if (!output.includes(`service: ${expectedService}`)) {
    throw new Error(`ingress rule mismatch for ${url}: expected ${expectedService}; got ${output}`);
  }
}
function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceConfig = regularFile(args["source-config"], "source config");
  const sourceTunnelUnit = regularFile(args["source-tunnel-unit"], "source tunnel unit");
  const cloudflared = regularFile(args.cloudflared, "cloudflared", { executable: true });
  const expectedSourceConfigSha = String(args["expected-source-config-sha256"]).toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(expectedSourceConfigSha)) throw new Error("expected source config sha256 is malformed");
  const observedSourceConfigSha = sha256File(sourceConfig);
  if (observedSourceConfigSha !== expectedSourceConfigSha) {
    throw new Error(`source config sha256 mismatch: expected ${expectedSourceConfigSha} got ${observedSourceConfigSha}`);
  }

  const sourceConfigText = fs.readFileSync(sourceConfig, "utf8");
  const source = parseSourceConfig(sourceConfigText);
  const sourceUnitText = fs.readFileSync(sourceTunnelUnit, "utf8");
  const sourceConfigOccurrences = sourceUnitText.split(sourceConfig).length - 1;
  if (sourceConfigOccurrences !== 1) throw new Error("source tunnel unit must reference source config exactly once");
  if (!sourceUnitText.includes(`tunnel run ${source.tunnelId}`)) {
    throw new Error("source tunnel unit tunnel id does not match source config");
  }

  const version = run(cloudflared, ["--version"]).split(/\r?\n/)[0].slice(0, 512);
  if (!/cloudflared/i.test(version)) throw new Error("cloudflared --version did not identify cloudflared");

  const output = path.resolve(String(args.output));
  if (fs.existsSync(output)) throw new Error("output directory already exists");
  fs.mkdirSync(output, { mode: 0o700 });

  let created = true;
  try {
    const configPath = path.join(output, "cloudflared-config.yml");
    const unitPath = path.join(output, "void-public-seed-named-tunnel-v1.service");
    const sourceUnitCopy = path.join(output, "source-void-public-seed-named-tunnel-v1.service");
    const manifestPath = path.join(output, "overlay.json");

    const config = renderConfig(source);
    fs.writeFileSync(configPath, config, { mode: 0o600 });
    fs.chmodSync(configPath, 0o600);

    fs.writeFileSync(sourceUnitCopy, sourceUnitText, { mode: 0o600 });
    fs.chmodSync(sourceUnitCopy, 0o600);

    const unit = sourceUnitText.replace(sourceConfig, configPath);
    if (unit === sourceUnitText || unit.includes(sourceConfig)) {
      throw new Error("generated tunnel unit config pointer replacement failed");
    }
    fs.writeFileSync(unitPath, unit, { mode: 0o600 });
    fs.chmodSync(unitPath, 0o600);

    run(cloudflared, ["--config", configPath, "tunnel", "ingress", "validate"]);

    for (const url of [
      `https://${HOSTNAME}/health`,
      `https://${HOSTNAME}/__void/public-earn-gateway-v1/status.json`,
      `https://${HOSTNAME}/wc/public-earning-pilot-v1/status`,
      `https://${HOSTNAME}/wc/public-earning-pilot-v1/claim-ticket`,
      `https://${HOSTNAME}/wc/public-earning-pilot-v1/submit-result`,
      `https://${HOSTNAME}/download/void-public-earn-no-node-client-v1.mjs`,
      `https://${HOSTNAME}/datanet/v1/fetch/void-public-earn-first-work-v1`,
    ]) {
      assertRule(cloudflared, configPath, url, EARN_ORIGIN);
    }
    for (const url of [
      `https://${HOSTNAME}/__void/ready.json`,
      `https://${HOSTNAME}/__void/checkpoint/v1.json`,
      `https://${HOSTNAME}/wc/redeemable?account=refused`,
      `https://${HOSTNAME}/wc/public-earning-pilot-v1/operator/issue`,
      `https://${HOSTNAME}/wc/public-earning-pilot-v1/sign-claim`,
      `https://${HOSTNAME}/wallet`,
    ]) {
      assertRule(cloudflared, configPath, url, SEED_ORIGIN);
    }
    assertRule(cloudflared, configPath, "https://other.invalid/health", "http_status:404");

    const body = {
      schema: SCHEMA,
      version: 1,
      hostname: HOSTNAME,
      source_config_path: sourceConfig,
      source_config_sha256: observedSourceConfigSha,
      source_tunnel_unit_path: sourceTunnelUnit,
      source_tunnel_unit_sha256: sha256File(sourceTunnelUnit),
      tunnel_id: source.tunnelId,
      cloudflared: {
        path: cloudflared,
        sha256: sha256File(cloudflared),
        version,
      },
      earn_origin: EARN_ORIGIN,
      seed_origin: SEED_ORIGIN,
      earn_rules: EARN_RULES,
      generated: {
        config_path: configPath,
        config_sha256: sha256File(configPath),
        tunnel_unit_path: unitPath,
        tunnel_unit_sha256: sha256File(unitPath),
        source_tunnel_unit_copy_path: sourceUnitCopy,
        source_tunnel_unit_copy_sha256: sha256File(sourceUnitCopy),
      },
      authority: {
        service_restart: false,
        tunnel_cutover: false,
        ticket_issuance: false,
        wc_write: false,
        settlement: false,
        wallet_access: false,
        validator_mutation: false,
        fund_movement: false,
      },
    };
    const overlay = {
      ...body,
      overlay_id: `voidpeio1_${sha256Bytes(Buffer.from(canonicalJson(body)))}`,
    };
    fs.writeFileSync(manifestPath, `${JSON.stringify(overlay, null, 2)}\n`, { mode: 0o600 });
    fs.chmodSync(manifestPath, 0o600);

    console.log(`${MARKER}_GREEN`);
    console.log(`overlay=${output}`);
    console.log(`overlay_id=${overlay.overlay_id}`);
    console.log(`source_config_sha256=${overlay.source_config_sha256}`);
    console.log(`generated_config_sha256=${overlay.generated.config_sha256}`);
    console.log(`generated_tunnel_unit_sha256=${overlay.generated.tunnel_unit_sha256}`);
    console.log("earn_origin=http://127.0.0.1:4122");
    console.log("seed_origin=http://127.0.0.1:4111");
    console.log("earn_route_count=5");
    console.log("source_seed_fallback_preserved=true");
    console.log("terminal_404_preserved=true");
    console.log("credential_content_read=false");
    console.log("service_restart=false");
    console.log("ticket_issuance=false");
    console.log("wc_write=false");
    console.log("fund_movement=false");
  } catch (error) {
    if (created && fs.existsSync(output)) fs.rmSync(output, { recursive: true, force: true });
    throw error;
  }
}

try {
  main();
} catch (error) {
  fail(error?.stack || String(error));
}
