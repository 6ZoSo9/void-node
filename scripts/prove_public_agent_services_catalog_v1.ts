import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const CATALOG_REL = "ops/public/agent-services-v1/catalog.json";
const SCHEMA_REL = "ops/public/agent-services-v1/catalog.schema.json";
const DOC_REL = "docs/public-agent/public-agent-services-catalog-v1.md";
const PROOF_REL = "scripts/prove_public_agent_services_catalog_v1.ts";
const WORKFLOW_REL = ".github/workflows/public-agent-services-catalog-v1.yml";
const DISCOVERY_REL = "docs/public/agent-paid-work-public-discovery-v1.json";

const EXPECTED_IDS = [
  "void.agent-paid-work.protocol-discovery.v1",
  "void.agent-paid-work.credential-request-intake.v1",
  "void.agent-paid-work.submission-intake.v1",
  "void.datanet.fetch-verify.v1",
];

const DENIED = [
  "external_paid_work_execution_available",
  "automatic_payment_execution_available",
  "wallet_access",
  "credential_issuance",
  "signing",
  "transaction_broadcast",
  "money_movement",
  "runtime_mutation",
  "service_mutation",
];

function fail(message: string): never {
  throw new Error(message);
}

function readObject(relative: string): Record<string, unknown> {
  const file = path.join(ROOT, relative);
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    fail(`regular non-symlink file required: ${relative}`);
  }
  const value = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`JSON object required: ${relative}`);
  }
  return value as Record<string, unknown>;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(
      (key) => `${JSON.stringify(key)}:${canonical(record[key])}`,
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function tracked(relative: string): boolean {
  try {
    execFileSync(
      "git",
      ["ls-files", "--error-unmatch", "--", relative],
      { cwd: ROOT, stdio: "ignore" },
    );
    return true;
  } catch {
    return false;
  }
}

function collectKey(value: unknown, key: string, found: unknown[] = []): unknown[] {
  if (Array.isArray(value)) {
    for (const child of value) collectKey(child, key, found);
  } else if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const [childKey, child] of Object.entries(record)) {
      if (childKey === key) found.push(child);
      collectKey(child, key, found);
    }
  }
  return found;
}

for (const relative of [CATALOG_REL, SCHEMA_REL, DOC_REL, PROOF_REL, WORKFLOW_REL]) {
  const stat = fs.lstatSync(path.join(ROOT, relative));
  if (stat.isSymbolicLink() || !stat.isFile()) {
    fail(`required file missing or unsafe: ${relative}`);
  }
}

const catalog = readObject(CATALOG_REL);
const schema = readObject(SCHEMA_REL);
const discovery = readObject(DISCOVERY_REL);

if (catalog.schema !== "void.public-agent-services-catalog.v1") fail("schema mismatch");
if (catalog.marker !== "VOID_PUBLIC_AGENT_SERVICES_CATALOG_V1") fail("marker mismatch");
if (catalog.version !== 1) fail("version mismatch");
if (catalog.catalog_status !== "descriptive_only") fail("catalog must remain descriptive_only");
if (schema.x_void_marker !== "VOID_PUBLIC_AGENT_SERVICES_CATALOG_SCHEMA_V1") {
  fail("schema marker mismatch");
}

const sourceCommit = String(catalog.source_commit || "");
if (!/^[0-9a-f]{40}$/.test(sourceCommit)) fail("invalid source commit");
execFileSync("git", ["merge-base", "--is-ancestor", sourceCommit, "HEAD"], {
  cwd: ROOT,
  stdio: "ignore",
});

const honesty = catalog.honesty as Record<string, unknown>;
for (const key of DENIED) {
  if (!honesty || honesty[key] !== false) fail(`authority must remain false: ${key}`);
}

const services = catalog.services;
if (!Array.isArray(services) || services.length !== 4) fail("exactly four services required");
const ids = services.map((value) => String((value as Record<string, unknown>).service_id || ""));
if (JSON.stringify(ids) !== JSON.stringify(EXPECTED_IDS)) fail("service identifiers or order changed");
if (new Set(ids).size !== ids.length) fail("duplicate service identifier");

for (const raw of services) {
  const service = raw as Record<string, unknown>;
  const pricing = service.pricing as Record<string, unknown>;
  const execution = service.execution as Record<string, unknown>;
  const evidence = service.evidence as Record<string, unknown>;
  const paths = evidence?.paths;

  if (!pricing || pricing.payment_execution_available !== false) {
    fail(`payment execution must remain false: ${service.service_id}`);
  }
  if (!execution || execution.external_available !== false || execution.mutation_authority !== false) {
    fail(`execution authority failed: ${service.service_id}`);
  }
  if (!Array.isArray(paths) || paths.length < 1) fail(`evidence missing: ${service.service_id}`);
  for (const rawPath of paths) {
    const relative = String(rawPath);
    const resolved = path.resolve(ROOT, relative);
    if (!resolved.startsWith(`${ROOT}${path.sep}`)) fail(`evidence escapes repo: ${relative}`);
    const stat = fs.lstatSync(resolved);
    if (stat.isSymbolicLink() || !stat.isFile()) fail(`unsafe evidence: ${relative}`);
    if (!tracked(relative)) fail(`untracked evidence: ${relative}`);
  }
}

const fingerprint = String(catalog.catalog_fingerprint_sha256 || "");
const copy = { ...catalog };
delete copy.catalog_fingerprint_sha256;
if (sha256(canonical(copy)) !== fingerprint) fail("catalog fingerprint mismatch");

if (discovery.protocol_id !== "void.agent-paid-work.v1") fail("discovery protocol changed");
const availability = collectKey(
  discovery,
  "external_agent_paid_work_execution_available",
);
if (availability.length < 1 || availability.some((value) => value !== false)) {
  fail("public discovery no longer denies external execution");
}

console.log(JSON.stringify({
  marker: "VOID_PUBLIC_AGENT_SERVICES_CATALOG_V1",
  service_count: services.length,
  source_commit: sourceCommit,
  catalog_fingerprint_sha256: fingerprint,
  external_paid_work_execution_available: false,
  automatic_payment_execution_available: false,
  wallet_access: false,
  credential_issuance: false,
  signing: false,
  transaction_broadcast: false,
  money_movement: false,
  runtime_mutation: false,
  service_mutation: false,
  proof: "green",
}, null, 2));
