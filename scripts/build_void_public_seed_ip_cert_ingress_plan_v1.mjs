#!/usr/bin/env node
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  CHAIN_ID,
  NETWORK,
  assertPlainObject,
  assertSafeInteger,
  isPublicIpAddress,
  normalizeHostname,
  objectWithId,
  writeJsonAtomic,
} from "./lib/void_public_seed_qualification_v1.mjs";

export const IP_CERT_INGRESS_PLAN_SCHEMA =
  "void_public_seed_ip_cert_ingress_plan_v1";
export const ACME_CERTIFICATE_VALIDITY_HOURS = 160;
export const DEFAULT_RENEW_INTERVAL_HOURS = 6;
export const RENEWAL_FAIL_CLOSED_HOURS = 24;
export const CERTBOT_MINIMUM_VERSION = "5.4";

const AUTHORITY_KEYS = Object.freeze([
  "infrastructure_purchase_authority",
  "credential_access",
  "certificate_issuance",
  "firewall_mutation",
  "service_mutation",
  "manifest_publication",
  "wallet_authority",
  "signer_authority",
  "validator_authority",
  "treasury_authority",
  "work_credit_authority",
  "money_movement_authority",
]);

function exactKeys(value, expected, label) {
  const object = assertPlainObject(value, label);
  const actual = Object.keys(object).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label} keys mismatch`);
  }
  return object;
}

function normalizeSourceSha(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(value)) {
    throw new Error("source SHA must be exactly 40 lowercase hexadecimal characters");
  }
  return value;
}

function normalizePublicIp(raw) {
  const address = normalizeHostname(raw);
  if (!net.isIP(address)) throw new Error("public seed address must be an IP literal");
  if (!isPublicIpAddress(address)) {
    throw new Error(`public seed address is not globally routable: ${address}`);
  }
  return address;
}

function ipHttpsOrigin(address) {
  return net.isIP(address) === 6
    ? `https://[${address}]`
    : `https://${address}`;
}

function absoluteOutsideRepo(raw, repoRoot, label) {
  const original = String(raw || "").trim();
  if (!path.isAbsolute(original)) throw new Error(`${label} must be an absolute path`);
  const value = path.resolve(original);
  const relative = path.relative(repoRoot, value);
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    throw new Error(`${label} must remain outside the repository`);
  }
  return value;
}

function distinctPaths(entries) {
  const seen = new Map();
  for (const [label, value] of entries) {
    if (seen.has(value)) {
      throw new Error(`${label} duplicates ${seen.get(value)}`);
    }
    seen.set(value, label);
  }
}

function authorityFalse() {
  return Object.fromEntries(AUTHORITY_KEYS.map((key) => [key, false]));
}

export function buildVoidPublicSeedIpCertIngressPlanV1({
  publicIp,
  sourceSha,
  repoRoot,
  stateRoot,
  acmeWebroot,
  certRoot,
  nodeDataRoot,
  renewIntervalHours = DEFAULT_RENEW_INTERVAL_HOURS,
} = {}) {
  const repository = path.resolve(String(repoRoot || process.cwd()));
  const address = normalizePublicIp(publicIp);
  const source = normalizeSourceSha(sourceSha);
  const renewInterval = assertSafeInteger(
    renewIntervalHours,
    "renew interval hours",
    { min: 1, max: 12 },
  );

  const paths = {
    state_root: absoluteOutsideRepo(stateRoot, repository, "state root"),
    acme_webroot: absoluteOutsideRepo(acmeWebroot, repository, "ACME webroot"),
    certificate_root: absoluteOutsideRepo(certRoot, repository, "certificate root"),
    node_data_root: absoluteOutsideRepo(nodeDataRoot, repository, "node data root"),
  };
  distinctPaths(Object.entries(paths));

  const body = {
    schema: IP_CERT_INGRESS_PLAN_SCHEMA,
    network: NETWORK,
    chain_id: CHAIN_ID,
    source_sha: source,
    endpoint: ipHttpsOrigin(address),
    public_ip: address,
    address_source: "ip_literal",
    seed_service_ports: {
      acme_http01_tcp: 80,
      restricted_https_tcp: 443,
      native_p2p_tcp: 4700,
      public_any_source_tcp: [80, 443, 4700],
    },
    private_service_ports: {
      node_http: {
        bind: "127.0.0.1",
        port: 4100,
        public: false,
      },
      restricted_gateway: {
        bind: "127.0.0.1",
        port: 4111,
        upstream: "http://127.0.0.1:4100",
        public: false,
      },
    },
    acme: {
      certificate_authority: "letsencrypt",
      challenge: "http-01",
      profile: "shortlived",
      certificate_validity_hours: ACME_CERTIFICATE_VALIDITY_HOURS,
      external_validation_port: 80,
      certbot_minimum_version: CERTBOT_MINIMUM_VERSION,
      renew_check_interval_hours: renewInterval,
      fail_closed_before_expiry_hours: RENEWAL_FAIL_CLOSED_HOURS,
      staging_required_before_production: true,
      automatic_reload_required: true,
    },
    firewall: {
      arbitrary_public_node_http: false,
      arbitrary_public_plaintext_gateway: false,
      management_plane_separate: true,
      management_source_allowlist_required: true,
    },
    paths,
    authority: authorityFalse(),
    deployment_performed: false,
    manifest_published: false,
  };
  return objectWithId("voidpsip1_", body, "plan_id");
}

export function validateVoidPublicSeedIpCertIngressPlanV1(raw) {
  const plan = exactKeys(
    structuredClone(raw),
    [
      "schema",
      "network",
      "chain_id",
      "source_sha",
      "endpoint",
      "public_ip",
      "address_source",
      "seed_service_ports",
      "private_service_ports",
      "acme",
      "firewall",
      "paths",
      "authority",
      "deployment_performed",
      "manifest_published",
      "plan_id",
    ],
    "IP-certificate ingress plan",
  );
  if (plan.schema !== IP_CERT_INGRESS_PLAN_SCHEMA) {
    throw new Error("unexpected IP-certificate ingress plan schema");
  }
  if (plan.network !== NETWORK || Number(plan.chain_id) !== CHAIN_ID) {
    throw new Error("IP-certificate ingress plan network mismatch");
  }
  const expected = objectWithId("voidpsip1_", plan, "plan_id").plan_id;
  if (plan.plan_id !== expected) throw new Error("IP-certificate ingress plan ID mismatch");

  const rebuilt = buildVoidPublicSeedIpCertIngressPlanV1({
    publicIp: plan.public_ip,
    sourceSha: plan.source_sha,
    repoRoot: "/tmp/void-plan-validation-repository",
    stateRoot: plan.paths.state_root,
    acmeWebroot: plan.paths.acme_webroot,
    certRoot: plan.paths.certificate_root,
    nodeDataRoot: plan.paths.node_data_root,
    renewIntervalHours: plan.acme.renew_check_interval_hours,
  });

  for (const key of [
    "endpoint",
    "public_ip",
    "address_source",
    "seed_service_ports",
    "private_service_ports",
    "acme",
    "firewall",
    "paths",
    "authority",
    "deployment_performed",
    "manifest_published",
  ]) {
    if (JSON.stringify(plan[key]) !== JSON.stringify(rebuilt[key])) {
      throw new Error(`IP-certificate ingress plan ${key} mismatch`);
    }
  }

  for (const key of AUTHORITY_KEYS) {
    if (plan.authority[key] !== false) {
      throw new Error(`IP-certificate ingress authority ${key} must be false`);
    }
  }
  return Object.freeze(plan);
}

function parseArgs(argv) {
  const values = {
    publicIp: "",
    sourceSha: "",
    repoRoot: process.cwd(),
    stateRoot: "",
    acmeWebroot: "",
    certRoot: "",
    nodeDataRoot: "",
    renewIntervalHours: DEFAULT_RENEW_INTERVAL_HOURS,
    output: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`missing value after ${argument}`);
      return argv[index];
    };
    if (argument === "--public-ip") values.publicIp = next();
    else if (argument === "--source-sha") values.sourceSha = next();
    else if (argument === "--repo-root") values.repoRoot = next();
    else if (argument === "--state-root") values.stateRoot = next();
    else if (argument === "--acme-webroot") values.acmeWebroot = next();
    else if (argument === "--cert-root") values.certRoot = next();
    else if (argument === "--node-data-root") values.nodeDataRoot = next();
    else if (argument === "--renew-interval-hours") {
      values.renewIntervalHours = Number(next());
    } else if (argument === "--output") values.output = next();
    else throw new Error(`unknown argument ${argument}`);
  }
  return values;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const plan = buildVoidPublicSeedIpCertIngressPlanV1(options);
  validateVoidPublicSeedIpCertIngressPlanV1(plan);
  if (options.output) writeJsonAtomic(options.output, plan);
  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
}

const invoked = process.argv[1]
  ? import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
  : false;
if (invoked) {
  main().catch((error) => {
    console.error(`VOID_PUBLIC_SEED_IP_CERT_INGRESS_PLAN_V1_FAIL: ${error.message}`);
    process.exit(1);
  });
}
