#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CATALOG_SOURCE_PATH,
  CATALOG_SOURCE_SHA256,
  PAID_DATANET_QUOTE_V1_SCHEMA,
  PAID_DATANET_SERVICE_CATALOG_V1_MARKER,
  SERVICE_CODE,
  VOID_DATANET_PAID_READ_QUOTE_V1_MARKER,
  VOID_DATANET_PAID_READ_QUOTE_V1_SCHEMA,
  canonicalJson,
  createPaidReadQuoteV1,
  runPaidReadQuoteCliV1,
  verifyCatalogContractV1,
} from "../tools/void-datanet-paid-read-quote-v1.mjs";

let assertions = 0;

function equal(actual, expected, message) {
  assert.equal(actual, expected, message);
  assertions += 1;
}

function deepEqual(actual, expected, message) {
  assert.deepEqual(actual, expected, message);
  assertions += 1;
}

function match(actual, pattern, message) {
  assert.match(actual, pattern, message);
  assertions += 1;
}

function truthy(value, message) {
  assert.ok(value, message);
  assertions += 1;
}

function capture() {
  const stdout = [];
  const stderr = [];
  return {
    stdout,
    stderr,
    io: {
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value),
    },
  };
}

function runCase(argv) {
  const target = capture();
  const exitCode = runPaidReadQuoteCliV1(argv, target.io);
  return {
    exitCode,
    stdout: target.stdout,
    stderr: target.stderr,
  };
}

function parseSingle(values) {
  equal(values.length, 1);
  return JSON.parse(values[0] ?? "");
}

function expectError(argv, pattern) {
  const result = runCase(argv);
  equal(result.exitCode, 2);
  equal(result.stdout.length, 0);
  const payload = parseSingle(result.stderr);
  equal(payload.schema, VOID_DATANET_PAID_READ_QUOTE_V1_SCHEMA);
  equal(payload.marker, VOID_DATANET_PAID_READ_QUOTE_V1_MARKER);
  equal(payload.status, "ERROR");
  match(payload.error, pattern);
  equal(payload.quote_created, false);
  equal(payload.datanet_fetch_performed, false);
  equal(payload.payment_collection_enabled, false);
  equal(payload.execution_authorized, false);
  equal(payload.automatic_execution_enabled, false);
  equal(payload.wallet_or_signer_access, false);
  equal(payload.transaction_submission, false);
  equal(payload.work_credit_write, false);
  equal(payload.void_settlement, false);
  equal(payload.treasury_access_enabled, false);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const catalogPath = path.join(repoRoot, CATALOG_SOURCE_PATH);
const catalogSource = readFileSync(catalogPath, "utf8");
const catalogSha = createHash("sha256")
  .update(catalogSource, "utf8")
  .digest("hex");
equal(catalogSha, CATALOG_SOURCE_SHA256);
equal(verifyCatalogContractV1(catalogSource), true);
assert.throws(
  () => verifyCatalogContractV1(`${catalogSource}\n// tampered`),
  /SHA-256 mismatch/,
);
assertions += 1;

const noArgs = runCase([]);
equal(noArgs.exitCode, 0);
equal(noArgs.stderr.length, 0);
equal(noArgs.stdout.length, 1);
match(noArgs.stdout[0] ?? "", /Generate one deterministic/);
match(noArgs.stdout[0] ?? "", /DataNet fetch performed: false/);
match(noArgs.stdout[0] ?? "", /Payment collection: disabled/);

const baseArgs = [
  "--request-id", "request-read-001",
  "--requester-id", "customer-read-001",
  "--dataset-id", "ds:public.read-001",
  "--who", "customer-read-001",
  "--source-base", "https://public-node.example",
  "--total-bytes", "42",
  "--operator-cost-basis-cents", "0",
  "--requested-at-ms", "1800000000000",
];

const compact = runCase(baseArgs);
equal(compact.exitCode, 0);
equal(compact.stderr.length, 0);
const quote = parseSingle(compact.stdout);

equal(quote.schema, VOID_DATANET_PAID_READ_QUOTE_V1_SCHEMA);
equal(quote.marker, VOID_DATANET_PAID_READ_QUOTE_V1_MARKER);
equal(quote.status, "QUOTE_GREEN");
equal(quote.quote_only, true);
match(quote.read_quote_id, /^[0-9a-f]{64}$/);

equal(quote.catalog_contract.source_path, CATALOG_SOURCE_PATH);
equal(quote.catalog_contract.source_sha256, CATALOG_SOURCE_SHA256);
equal(
  quote.catalog_contract.catalog_marker,
  PAID_DATANET_SERVICE_CATALOG_V1_MARKER,
);
equal(
  quote.catalog_contract.quote_schema,
  PAID_DATANET_QUOTE_V1_SCHEMA,
);
equal(quote.catalog_contract.service_code, SERVICE_CODE);

equal(quote.binding.request_id, "request-read-001");
equal(quote.binding.requester_id, "customer-read-001");
equal(quote.binding.dataset_id, "ds:public.read-001");
equal(quote.binding.who, "customer-read-001");
equal(quote.binding.source_base, "https://public-node.example");
equal(
  quote.binding.fetch_url,
  "https://public-node.example/datanet/v1/fetch/ds%3Apublic.read-001?who=customer-read-001",
);
equal(quote.binding.object_count, 1);
equal(quote.binding.total_bytes, 42);

equal(quote.quote.schema, PAID_DATANET_QUOTE_V1_SCHEMA);
equal(
  quote.quote.marker,
  PAID_DATANET_SERVICE_CATALOG_V1_MARKER,
);
equal(quote.quote.quote_only, true);
equal(quote.quote.service_code, SERVICE_CODE);
equal(
  quote.quote.service_name,
  "DataNet Public Retrieval Evidence",
);
equal(quote.quote.currency, "USD_CENTS");
equal(quote.quote.requested_at_ms, 1_800_000_000_000);
equal(quote.quote.expires_at_ms, 1_800_000_900_000);
equal(quote.quote.request.request_id, "request-read-001");
equal(quote.quote.request.requester_id, "customer-read-001");
equal(quote.quote.request.object_count, 1);
equal(quote.quote.request.total_bytes, 42);
equal(quote.quote.request.billable_mib, 1);
equal(quote.quote.pricing.base_cents, 400);
equal(quote.quote.pricing.object_charge_cents, 50);
equal(quote.quote.pricing.byte_charge_cents, 3);
equal(quote.quote.pricing.catalog_subtotal_cents, 453);
equal(quote.quote.pricing.operator_cost_basis_cents, 0);
equal(quote.quote.pricing.minimum_operator_margin_bps, 3000);
equal(quote.quote.pricing.cost_protected_subtotal_cents, 0);
equal(quote.quote.pricing.quoted_subtotal_cents, 453);
equal(quote.quote.pricing.tax_cents, 0);
equal(quote.quote.pricing.quoted_total_cents, 453);
match(quote.quote.quote_id, /^[0-9a-f]{64}$/);

deepEqual(quote.quote.controls, {
  operator_approval_required: true,
  customer_payment_required_before_work: true,
  automatic_execution_enabled: false,
  automatic_payment_collection_enabled: false,
  treasury_access_enabled: false,
});
equal(quote.quote.required_evidence.length, 5);
equal(quote.quote.exclusions.length, 4);
truthy(
  quote.quote.required_evidence.includes("retrieval source identity"),
);
truthy(quote.quote.exclusions.includes("private-network access"));

deepEqual(quote.controls, {
  operator_approval_required: true,
  customer_payment_required_before_work: true,
  quote_only: true,
  payment_collection_enabled: false,
  payment_confirmation_performed: false,
  execution_authorized: false,
  automatic_execution_enabled: false,
  datanet_fetch_performed: false,
  datanet_mutation_enabled: false,
  wallet_or_signer_access: false,
  transaction_submission: false,
  work_credit_write: false,
  void_settlement: false,
  treasury_access_enabled: false,
});

const {
  read_quote_id: _readQuoteId,
  ...unsignedReadQuote
} = quote;
equal(
  quote.read_quote_id,
  createHash("sha256")
    .update(canonicalJson(unsignedReadQuote), "utf8")
    .digest("hex"),
);

const {
  quote_id: _quoteId,
  ...unsignedCatalogQuote
} = quote.quote;
equal(
  quote.quote.quote_id,
  createHash("sha256")
    .update(canonicalJson(unsignedCatalogQuote), "utf8")
    .digest("hex"),
);

const direct = createPaidReadQuoteV1({
  request_id: "request-read-001",
  requester_id: "customer-read-001",
  dataset_id: "ds:public.read-001",
  who: "customer-read-001",
  source_base: "https://public-node.example",
  total_bytes: 42,
  operator_cost_basis_cents: 0,
  requested_at_ms: 1_800_000_000_000,
});
deepEqual(direct, quote);

const repeated = runCase(baseArgs);
deepEqual(repeated, compact);

const pretty = runCase([...baseArgs, "--format", "pretty"]);
equal(pretty.exitCode, 0);
equal(pretty.stderr.length, 0);
equal(pretty.stdout.length, 1);
match(pretty.stdout[0] ?? "", /\n  "schema"/);
deepEqual(JSON.parse(pretty.stdout[0] ?? ""), quote);

const costProtected = parseSingle(
  runCase([
    ...baseArgs.slice(0, 12),
    "--operator-cost-basis-cents", "1000",
    "--requested-at-ms", "1800000000000",
  ]).stdout,
);
equal(costProtected.quote.pricing.catalog_subtotal_cents, 453);
equal(
  costProtected.quote.pricing.cost_protected_subtotal_cents,
  1429,
);
equal(costProtected.quote.pricing.quoted_total_cents, 1429);

const maxBytes = parseSingle(
  runCase([
    ...baseArgs.slice(0, 10),
    "--total-bytes", "134217728",
    "--operator-cost-basis-cents", "0",
    "--requested-at-ms", "1800000000000",
  ]).stdout,
);
equal(maxBytes.quote.request.billable_mib, 128);
equal(maxBytes.quote.pricing.byte_charge_cents, 384);
equal(maxBytes.quote.pricing.quoted_total_cents, 834);

expectError(["--help", "--format", "pretty"], /cannot be combined/);
expectError(["--unknown", "value"], /unknown option/);
expectError(["request-read-001"], /missing value|unexpected positional/);
expectError(
  ["--request-id", "request-read-001", "--request-id", "again"],
  /duplicate option/,
);
expectError(["--request-id"], /missing value/);
expectError(
  [
    "--request-id", "request-read-001",
    "--requester-id", "customer-read-001",
  ],
  /missing required option: --dataset-id/,
);
expectError(
  [...baseArgs.slice(0, 5), "contains space", ...baseArgs.slice(6)],
  /dataset_id must match/,
);
expectError(
  [...baseArgs.slice(0, 7), "x", ...baseArgs.slice(8)],
  /who must match/,
);
expectError(
  [...baseArgs.slice(0, 9), "ftp://public-node.example", ...baseArgs.slice(10)],
  /protocol must be http or https/,
);
expectError(
  [...baseArgs.slice(0, 9), "https://user:pass@public-node.example", ...baseArgs.slice(10)],
  /must not contain credentials/,
);
expectError(
  [...baseArgs.slice(0, 9), "https://public-node.example/path", ...baseArgs.slice(10)],
  /only scheme and authority/,
);
expectError(
  [...baseArgs.slice(0, 9), "https://public-node.example?x=1", ...baseArgs.slice(10)],
  /only scheme and authority/,
);
expectError(
  [...baseArgs.slice(0, 9), "http://localhost:4100", ...baseArgs.slice(10)],
  /public source/,
);
expectError(
  [...baseArgs.slice(0, 9), "http://127.0.0.1:4100", ...baseArgs.slice(10)],
  /public source/,
);
expectError(
  [...baseArgs.slice(0, 9), "http://10.0.0.1:4100", ...baseArgs.slice(10)],
  /public source/,
);
expectError(
  [...baseArgs.slice(0, 9), "http://100.122.198.38:4101", ...baseArgs.slice(10)],
  /public source/,
);
expectError(
  [...baseArgs.slice(0, 9), "http://192.168.1.1:4100", ...baseArgs.slice(10)],
  /public source/,
);
expectError(
  [...baseArgs.slice(0, 9), "http://[::1]:4100", ...baseArgs.slice(10)],
  /public source/,
);
expectError(
  [...baseArgs.slice(0, 11), "0", ...baseArgs.slice(12)],
  /total_bytes must be a safe integer/,
);
expectError(
  [...baseArgs.slice(0, 11), "134217729", ...baseArgs.slice(12)],
  /total_bytes must be a safe integer/,
);
expectError(
  [...baseArgs.slice(0, 13), "-1", ...baseArgs.slice(14)],
  /unsigned base-10 integer/,
);
expectError(
  [...baseArgs.slice(0, 13), "01", ...baseArgs.slice(14)],
  /unsigned base-10 integer/,
);
expectError(
  [...baseArgs.slice(0, 15), "9007199254740992"],
  /safe integer/,
);
expectError([...baseArgs, "--format", "yaml"], /compact or pretty/);

const toolSource = readFileSync(
  path.join(repoRoot, "tools/void-datanet-paid-read-quote-v1.mjs"),
  "utf8",
);
for (const forbidden of [
  "node:child_process",
  "node:http",
  "node:https",
  "fetch(",
  ".request(",
  ".connect(",
]) {
  equal(toolSource.includes(forbidden), false, forbidden);
}

truthy(assertions >= 190);

console.log(
  JSON.stringify(
    {
      marker: "VOID_DATANET_PAID_READ_QUOTE_V1_PROOF",
      quote_marker: VOID_DATANET_PAID_READ_QUOTE_V1_MARKER,
      schema: VOID_DATANET_PAID_READ_QUOTE_V1_SCHEMA,
      assertion_count: assertions,
      catalog_source_sha256: CATALOG_SOURCE_SHA256,
      service_code: SERVICE_CODE,
      deterministic_read_quote_id: quote.read_quote_id,
      deterministic_catalog_quote_id: quote.quote.quote_id,
      quoted_total_cents: quote.quote.pricing.quoted_total_cents,
      one_object_bound: true,
      public_source_only: true,
      quote_only: true,
      datanet_fetch_performed: false,
      payment_collection_enabled: false,
      execution_authorized: false,
      automatic_execution_enabled: false,
      wallet_or_signer_access: false,
      transaction_submission: false,
      work_credit_write: false,
      void_settlement: false,
      treasury_access_enabled: false,
      status: "GREEN",
    },
    null,
    2,
  ),
);
