#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const HOSTNAME = "seed.nullfeed.org";
export const SEED_ORIGIN = "http://127.0.0.1:4111";
export const EARN_ORIGIN = "http://127.0.0.1:4122";
export const EPOCH2_ORIGIN = "http://127.0.0.1:8083";
export const MARKER = "VOID_ECONOMIC_EPOCH2_PUBLIC_READ_TUNNEL_OVERLAY_V1";

export const EARN_RULES = Object.freeze([
  Object.freeze({ path: "^/health$", service: EARN_ORIGIN }),
  Object.freeze({ path: "^/__void/public-earn-gateway-v1/status\\.json$", service: EARN_ORIGIN }),
  Object.freeze({ path: "^/wc/public-earning-pilot-v1/(status|claim-ticket|submit-result)$", service: EARN_ORIGIN }),
  Object.freeze({ path: "^/download/void-public-earn-no-node-client-v1\\.mjs$", service: EARN_ORIGIN }),
  Object.freeze({ path: "^/datanet/v1/fetch/[A-Za-z0-9._:-]{1,180}$", service: EARN_ORIGIN }),
]);

export const EPOCH2_RULES = Object.freeze([
  Object.freeze({ path: "^/public-node/economic/epoch2/read-status-v1\\.json$", service: EPOCH2_ORIGIN }),
  Object.freeze({ path: "^/public-node/economic/epoch2/balance-v1$", service: EPOCH2_ORIGIN }),
  Object.freeze({ path: "^/public-node/economic/epoch2/code-v1$", service: EPOCH2_ORIGIN }),
  Object.freeze({ path: "^/public-node/economic/epoch2/receipt-v1$", service: EPOCH2_ORIGIN }),
]);

function sha256Bytes(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function splitCanonicalLines(text) {
  if (typeof text !== "string" || !text.endsWith("\n") || text.includes("\r") || text.includes("\t")) {
    throw new Error("source config is not canonical LF text");
  }
  return text.slice(0, -1).split("\n");
}

function expectLine(lines, index, expected) {
  if (lines[index] !== expected) {
    throw new Error("source ingress contract mismatch at line " + String(index + 1));
  }
  return index + 1;
}

export function parseEpoch2PublicReadTunnelSourceV1(text) {
  const lines = splitCanonicalLines(text);
  if (lines.length < 9) throw new Error("source config is too short");

  const tunnelMatch = /^tunnel: ([0-9a-f-]{36})$/iu.exec(lines[0]);
  if (!tunnelMatch) throw new Error("source tunnel id is malformed");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(tunnelMatch[1])) {
    throw new Error("source tunnel id is malformed");
  }

  const credentialMatch = /^credentials-file: ([^\0\r\n]+)$/u.exec(lines[1]);
  if (!credentialMatch) throw new Error("source credential path is malformed");

  let i = 2;
  i = expectLine(lines, i, "originRequest:");
  i = expectLine(lines, i, "  connectTimeout: 10s");
  i = expectLine(lines, i, "ingress:");

  const routeRows = [];
  while (i < lines.length) {
    if (lines[i] === "  - service: http_status:404") break;
    if (lines[i] !== "  - hostname: " + HOSTNAME) throw new Error("unexpected ingress hostname row");
    if (lines[i + 1] === "    service: " + SEED_ORIGIN) break;
    if (!lines[i + 1]?.startsWith("    path: ")) throw new Error("ingress path row missing");
    if (!lines[i + 2]?.startsWith("    service: ")) throw new Error("ingress service row missing");
    routeRows.push({
      path: lines[i + 1].slice("    path: ".length),
      service: lines[i + 2].slice("    service: ".length),
    });
    i += 3;
  }

  const baseline = JSON.stringify(EARN_RULES);
  const upgraded = JSON.stringify([...EARN_RULES, ...EPOCH2_RULES]);
  const observed = JSON.stringify(routeRows);
  let sourceEpoch2RulesPresent = false;
  if (observed === baseline) {
    sourceEpoch2RulesPresent = false;
  } else if (observed === upgraded) {
    sourceEpoch2RulesPresent = true;
  } else {
    throw new Error("source ingress route set is outside the reviewed earn/epoch2 contract");
  }

  i = expectLine(lines, i, "  - hostname: " + HOSTNAME);
  i = expectLine(lines, i, "    service: " + SEED_ORIGIN);
  i = expectLine(lines, i, "  - service: http_status:404");
  if (i !== lines.length) throw new Error("unexpected rows after terminal 404");

  return {
    tunnelId: tunnelMatch[1],
    credentialsFile: credentialMatch[1],
    sourceEpoch2RulesPresent,
  };
}

export function renderEpoch2PublicReadTunnelConfigV1(parsed) {
  if (!parsed || typeof parsed !== "object") throw new Error("parsed source required");
  const lines = [
    "tunnel: " + parsed.tunnelId,
    "credentials-file: " + parsed.credentialsFile,
    "originRequest:",
    "  connectTimeout: 10s",
    "ingress:",
  ];
  for (const rule of [...EARN_RULES, ...EPOCH2_RULES]) {
    lines.push(
      "  - hostname: " + HOSTNAME,
      "    path: " + rule.path,
      "    service: " + rule.service,
    );
  }
  lines.push(
    "  - hostname: " + HOSTNAME,
    "    service: " + SEED_ORIGIN,
    "  - service: http_status:404",
    "",
  );
  return lines.join("\n");
}

export function buildEpoch2PublicReadTunnelOverlayV1(sourceText) {
  const parsed = parseEpoch2PublicReadTunnelSourceV1(sourceText);
  const config = renderEpoch2PublicReadTunnelConfigV1(parsed);
  const body = {
    marker: MARKER,
    version: 1,
    hostname: HOSTNAME,
    source_config_sha256: sha256Bytes(Buffer.from(sourceText)),
    generated_config_sha256: sha256Bytes(Buffer.from(config)),
    source_epoch2_rules_present: parsed.sourceEpoch2RulesPresent,
    earn_origin: EARN_ORIGIN,
    epoch2_origin: EPOCH2_ORIGIN,
    seed_fallback: SEED_ORIGIN,
    earn_route_count: EARN_RULES.length,
    epoch2_route_count: EPOCH2_RULES.length,
    raw_public_rpc_allowed: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    validator_mutation: false,
    token_movement: false,
    funds_movement: false,
  };
  const overlayId = "voide2pro1_" + sha256Bytes(Buffer.from(JSON.stringify(body)));
  return { config, manifest: { ...body, overlay_id: overlayId } };
}

function regularFile(raw, label) {
  const resolved = path.resolve(String(raw));
  const st = fs.lstatSync(resolved);
  if (st.isSymbolicLink() || !st.isFile()) throw new Error(label + " must be one regular non-symlink file");
  if (fs.realpathSync(resolved) !== resolved) throw new Error(label + " path must already be canonical");
  return resolved;
}

function parseArgs(argv) {
  const values = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key?.startsWith("--") || value === undefined) throw new Error("invalid arguments");
    values[key.slice(2)] = value;
  }
  for (const key of ["source-config", "output-config", "output-manifest"]) {
    if (!values[key]) throw new Error("missing --" + key);
  }
  return values;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const source = regularFile(args["source-config"], "source config");
  const outConfig = path.resolve(args["output-config"]);
  const outManifest = path.resolve(args["output-manifest"]);
  if (fs.existsSync(outConfig) || fs.existsSync(outManifest)) throw new Error("output already exists");

  const built = buildEpoch2PublicReadTunnelOverlayV1(fs.readFileSync(source, "utf8"));
  fs.writeFileSync(outConfig, built.config, { mode: 0o600 });
  fs.chmodSync(outConfig, 0o600);
  fs.writeFileSync(outManifest, JSON.stringify(built.manifest, null, 2) + "\n", { mode: 0o600 });
  fs.chmodSync(outManifest, 0o600);

  console.log(MARKER + "_GREEN");
  console.log("overlay_id=" + built.manifest.overlay_id);
  console.log("source_epoch2_rules_present=" + String(built.manifest.source_epoch2_rules_present));
  console.log("earn_route_count=" + String(EARN_RULES.length));
  console.log("epoch2_route_count=" + String(EPOCH2_RULES.length));
  console.log("epoch2_origin=" + EPOCH2_ORIGIN);
  console.log("seed_fallback=" + SEED_ORIGIN);
  console.log("raw_public_rpc_allowed=false");
  console.log("transaction_submission=false");
  console.log("transaction_broadcast=false");
  console.log("authoritative_chain2050_write=false");
  console.log("funds_movement=false");
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invoked && invoked === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(MARKER + "_HOLD: " + (error?.message || String(error)));
    process.exit(1);
  }
}
