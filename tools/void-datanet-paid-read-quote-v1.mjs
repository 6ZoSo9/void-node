#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { isIP } from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const VOID_DATANET_PAID_READ_QUOTE_V1_MARKER =
  "VOID_DATANET_PAID_READ_QUOTE_V1";

export const VOID_DATANET_PAID_READ_QUOTE_V1_SCHEMA =
  "void-datanet-paid-read-quote-v1";

export const PAID_DATANET_SERVICE_CATALOG_V1_MARKER =
  "VOID_PAID_DATANET_SERVICE_CATALOG_V1";

export const PAID_DATANET_QUOTE_V1_SCHEMA =
  "void-paid-datanet-quote-v1";

export const SERVICE_CODE =
  "datanet.public-retrieval-evidence.v1";

export const CATALOG_SOURCE_PATH =
  "src/paid_services/datanet_service_catalog_v1.ts";

export const CATALOG_SOURCE_SHA256 =
  "452c777bd21f22cfb596276e1a75b923fc1cfb45371f2fbec6a5cde020eabdff";

export const USD_CENTS = "USD_CENTS";

const MIB_BYTES = 1024 * 1024;
const MAX_COST_BASIS_CENTS = 100_000_000;
const MAX_REQUESTED_AT_MS = 8_000_000_000_000_000;
const MAX_TOTAL_BYTES = 128 * MIB_BYTES;

const SERVICE = Object.freeze({
  service_code: SERVICE_CODE,
  public_name: "DataNet Public Retrieval Evidence",
  customer_outcome:
    "Attempt bounded public retrieval and return reproducible availability evidence.",
  currency: USD_CENTS,
  max_object_count: 16,
  max_total_bytes: MAX_TOTAL_BYTES,
  target_completion_seconds: 30 * 60,
  quote_valid_for_ms: 15 * 60 * 1000,
  pricing: Object.freeze({
    base_cents: 400,
    per_object_cents: 50,
    per_billable_mib_cents: 3,
    minimum_operator_margin_bps: 3000,
  }),
  required_evidence: Object.freeze([
    "request-bound object identifiers",
    "retrieval source identity",
    "bounded retrieval result per object",
    "content digest when retrieval succeeds",
    "operator-signed completion receipt",
  ]),
  exclusions: Object.freeze([
    "availability guarantees beyond the observed window",
    "private-network access",
    "credential handling",
    "automatic settlement",
  ]),
});

const VALUE_FLAGS = new Set([
  "--request-id",
  "--requester-id",
  "--dataset-id",
  "--who",
  "--source-base",
  "--total-bytes",
  "--operator-cost-basis-cents",
  "--requested-at-ms",
  "--format",
]);

function sha256Hex(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function canonicalJson(value) {
  if (value === null) return "null";

  if (
    typeof value === "string" ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new Error("canonical JSON does not support non-finite numbers");
    }
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  }

  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }

  throw new Error(`canonical JSON does not support ${typeof value}`);
}

function assertSafeInteger(name, value, minimum, maximum) {
  if (
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new Error(
      `${name} must be a safe integer in [${minimum}, ${maximum}]`,
    );
  }
}

function assertBoundedIdentifier(name, value) {
  if (
    typeof value !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/.test(value)
  ) {
    throw new Error(
      `${name} must match ^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$`,
    );
  }
}

function assertDatasetId(value) {
  if (
    typeof value !== "string" ||
    !/^[A-Za-z0-9._:-]{1,200}$/.test(value)
  ) {
    throw new Error(
      "dataset_id must match ^[A-Za-z0-9._:-]{1,200}$",
    );
  }
}

function ceilDivide(numerator, denominator) {
  return Math.floor((numerator + denominator - 1) / denominator);
}

function privateIpv4(hostname) {
  const parts = hostname.split(".").map((value) => Number(value));
  if (
    parts.length !== 4 ||
    parts.some((value) => !Number.isInteger(value) || value < 0 || value > 255)
  ) {
    return true;
  }
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function privateIpv6(hostname) {
  const value = hostname.toLowerCase();
  return (
    value === "::" ||
    value === "::1" ||
    value.startsWith("fc") ||
    value.startsWith("fd") ||
    /^fe[89ab]/.test(value)
  );
}

export function normalizePublicSourceBase(value) {
  if (typeof value !== "string" || value.trim() !== value || value === "") {
    throw new Error("source_base must be a non-empty canonical URL");
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("source_base must be a valid URL");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("source_base protocol must be http or https");
  }
  if (url.username || url.password) {
    throw new Error("source_base must not contain credentials");
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error(
      "source_base must contain only scheme and authority",
    );
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    throw new Error("source_base must identify a public source");
  }

  const ipVersion = isIP(hostname);
  if (
    (ipVersion === 4 && privateIpv4(hostname)) ||
    (ipVersion === 6 && privateIpv6(hostname))
  ) {
    throw new Error("source_base must identify a public source");
  }

  return `${url.protocol}//${url.host}`;
}

export function verifyCatalogContractV1(sourceText) {
  if (sha256Hex(sourceText) !== CATALOG_SOURCE_SHA256) {
    throw new Error("paid DataNet service catalog SHA-256 mismatch");
  }

  const requiredFragments = [
    `export const PAID_DATANET_SERVICE_CATALOG_V1_MARKER =\n  "${PAID_DATANET_SERVICE_CATALOG_V1_MARKER}" as const;`,
    `export const PAID_DATANET_QUOTE_V1_SCHEMA =\n  "${PAID_DATANET_QUOTE_V1_SCHEMA}" as const;`,
    `"${SERVICE_CODE}": frozenService({`,
    "base_cents: 400,",
    "per_object_cents: 50,",
    "per_billable_mib_cents: 3,",
    "minimum_operator_margin_bps: 3000,",
    "max_total_bytes: 128 * MIB_BYTES,",
    "quote_valid_for_ms: 15 * 60 * 1000,",
  ];

  for (const fragment of requiredFragments) {
    if (!sourceText.includes(fragment)) {
      throw new Error(
        `paid DataNet service catalog contract omitted: ${fragment}`,
      );
    }
  }

  return true;
}

function catalogPath() {
  const toolPath = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(toolPath), "..", CATALOG_SOURCE_PATH);
}

export function assertCatalogContractV1() {
  const sourceText = readFileSync(catalogPath(), "utf8");
  return verifyCatalogContractV1(sourceText);
}

export function quotePublicReadEvidenceV1(request) {
  assertBoundedIdentifier("request_id", request.request_id);
  assertBoundedIdentifier("requester_id", request.requester_id);
  assertSafeInteger("total_bytes", request.total_bytes, 1, MAX_TOTAL_BYTES);
  assertSafeInteger(
    "operator_cost_basis_cents",
    request.operator_cost_basis_cents,
    0,
    MAX_COST_BASIS_CENTS,
  );
  assertSafeInteger(
    "requested_at_ms",
    request.requested_at_ms,
    0,
    MAX_REQUESTED_AT_MS,
  );

  const objectCount = 1;
  const billableMib = ceilDivide(request.total_bytes, MIB_BYTES);
  const objectCharge = objectCount * SERVICE.pricing.per_object_cents;
  const byteCharge =
    billableMib * SERVICE.pricing.per_billable_mib_cents;
  const catalogSubtotal =
    SERVICE.pricing.base_cents + objectCharge + byteCharge;
  const marginDenominator =
    10_000 - SERVICE.pricing.minimum_operator_margin_bps;
  const costProtectedSubtotal =
    request.operator_cost_basis_cents === 0
      ? 0
      : ceilDivide(
          request.operator_cost_basis_cents * 10_000,
          marginDenominator,
        );
  const quotedSubtotal = Math.max(
    catalogSubtotal,
    costProtectedSubtotal,
  );

  const body = {
    schema: PAID_DATANET_QUOTE_V1_SCHEMA,
    marker: PAID_DATANET_SERVICE_CATALOG_V1_MARKER,
    quote_only: true,
    service_code: SERVICE.service_code,
    service_name: SERVICE.public_name,
    currency: USD_CENTS,
    requested_at_ms: request.requested_at_ms,
    expires_at_ms:
      request.requested_at_ms + SERVICE.quote_valid_for_ms,
    request: {
      request_id: request.request_id,
      requester_id: request.requester_id,
      object_count: objectCount,
      total_bytes: request.total_bytes,
      billable_mib: billableMib,
    },
    pricing: {
      base_cents: SERVICE.pricing.base_cents,
      object_charge_cents: objectCharge,
      byte_charge_cents: byteCharge,
      catalog_subtotal_cents: catalogSubtotal,
      operator_cost_basis_cents:
        request.operator_cost_basis_cents,
      minimum_operator_margin_bps:
        SERVICE.pricing.minimum_operator_margin_bps,
      cost_protected_subtotal_cents: costProtectedSubtotal,
      quoted_subtotal_cents: quotedSubtotal,
      tax_cents: 0,
      quoted_total_cents: quotedSubtotal,
    },
    controls: {
      operator_approval_required: true,
      customer_payment_required_before_work: true,
      automatic_execution_enabled: false,
      automatic_payment_collection_enabled: false,
      treasury_access_enabled: false,
    },
    required_evidence: [...SERVICE.required_evidence],
    exclusions: [...SERVICE.exclusions],
  };

  return {
    ...body,
    quote_id: sha256Hex(canonicalJson(body)),
  };
}

export function createPaidReadQuoteV1(input) {
  assertCatalogContractV1();
  assertDatasetId(input.dataset_id);
  assertBoundedIdentifier("who", input.who);
  const sourceBase = normalizePublicSourceBase(input.source_base);

  const quote = quotePublicReadEvidenceV1({
    request_id: input.request_id,
    requester_id: input.requester_id,
    total_bytes: input.total_bytes,
    operator_cost_basis_cents: input.operator_cost_basis_cents,
    requested_at_ms: input.requested_at_ms,
  });

  const fetchUrl = new URL(
    `/datanet/v1/fetch/${encodeURIComponent(input.dataset_id)}`,
    `${sourceBase}/`,
  );
  fetchUrl.searchParams.set("who", input.who);

  const body = {
    schema: VOID_DATANET_PAID_READ_QUOTE_V1_SCHEMA,
    marker: VOID_DATANET_PAID_READ_QUOTE_V1_MARKER,
    status: "QUOTE_GREEN",
    quote_only: true,
    catalog_contract: {
      source_path: CATALOG_SOURCE_PATH,
      source_sha256: CATALOG_SOURCE_SHA256,
      catalog_marker: PAID_DATANET_SERVICE_CATALOG_V1_MARKER,
      quote_schema: PAID_DATANET_QUOTE_V1_SCHEMA,
      service_code: SERVICE_CODE,
    },
    binding: {
      request_id: input.request_id,
      requester_id: input.requester_id,
      dataset_id: input.dataset_id,
      who: input.who,
      source_base: sourceBase,
      fetch_url: fetchUrl.toString(),
      object_count: 1,
      total_bytes: input.total_bytes,
    },
    quote,
    controls: {
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
    },
  };

  return {
    ...body,
    read_quote_id: sha256Hex(canonicalJson(body)),
  };
}

function parseUnsignedInteger(name, value) {
  if (!/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new Error(`${name} must be an unsigned base-10 integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${name} must be a JavaScript safe integer`);
  }
  return parsed;
}

function parseFormat(value) {
  if (value === undefined || value === "compact") return "compact";
  if (value === "pretty") return "pretty";
  throw new Error("--format must be compact or pretty");
}

function parseArgs(argv) {
  if (argv.length === 0 || (argv.length === 1 && argv[0] === "--help")) {
    return { kind: "help" };
  }
  if (argv.includes("--help")) {
    throw new Error("--help cannot be combined with other options");
  }
  if (argv.length % 2 !== 0) {
    throw new Error(`missing value for ${argv[argv.length - 1] ?? "option"}`);
  }

  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--")) {
      throw new Error(`unexpected positional argument: ${flag ?? ""}`);
    }
    if (!VALUE_FLAGS.has(flag)) {
      throw new Error(`unknown option: ${flag}`);
    }
    if (values.has(flag)) {
      throw new Error(`duplicate option: ${flag}`);
    }
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`missing value for ${flag}`);
    }
    values.set(flag, value);
  }

  const required = (flag) => {
    const value = values.get(flag);
    if (value === undefined) {
      throw new Error(`missing required option: ${flag}`);
    }
    return value;
  };

  return {
    kind: "quote",
    format: parseFormat(values.get("--format")),
    input: {
      request_id: required("--request-id"),
      requester_id: required("--requester-id"),
      dataset_id: required("--dataset-id"),
      who: required("--who"),
      source_base: required("--source-base"),
      total_bytes: parseUnsignedInteger(
        "--total-bytes",
        required("--total-bytes"),
      ),
      operator_cost_basis_cents: parseUnsignedInteger(
        "--operator-cost-basis-cents",
        required("--operator-cost-basis-cents"),
      ),
      requested_at_ms: parseUnsignedInteger(
        "--requested-at-ms",
        required("--requested-at-ms"),
      ),
    },
  };
}

const HELP_TEXT = `\
${VOID_DATANET_PAID_READ_QUOTE_V1_MARKER}

Generate one deterministic, quote-only DataNet public read offer.

Usage:
  node tools/void-datanet-paid-read-quote-v1.mjs \\
    --request-id <id> \\
    --requester-id <id> \\
    --dataset-id <id> \\
    --who <id> \\
    --source-base <public-http-or-https-origin> \\
    --total-bytes <integer> \\
    --operator-cost-basis-cents <integer> \\
    --requested-at-ms <integer> \\
    [--format compact|pretty]

Controls:
  DataNet fetch performed: false.
  Payment collection: disabled.
  Execution authorization: disabled.
  Wallet, signer, transaction, WC, settlement, and treasury access: disabled.
`;

function defaultIo() {
  return {
    stdout: (value) =>
      process.stdout.write(value.endsWith("\n") ? value : `${value}\n`),
    stderr: (value) =>
      process.stderr.write(value.endsWith("\n") ? value : `${value}\n`),
  };
}

export function runPaidReadQuoteCliV1(argv, io = defaultIo()) {
  try {
    const command = parseArgs(argv);
    if (command.kind === "help") {
      io.stdout(HELP_TEXT);
      return 0;
    }

    const quote = createPaidReadQuoteV1(command.input);
    io.stdout(
      command.format === "pretty"
        ? JSON.stringify(quote, null, 2)
        : JSON.stringify(quote),
    );
    return 0;
  } catch (error) {
    io.stderr(
      JSON.stringify({
        schema: VOID_DATANET_PAID_READ_QUOTE_V1_SCHEMA,
        marker: VOID_DATANET_PAID_READ_QUOTE_V1_MARKER,
        status: "ERROR",
        error: error instanceof Error ? error.message : String(error),
        quote_created: false,
        datanet_fetch_performed: false,
        payment_collection_enabled: false,
        execution_authorized: false,
        automatic_execution_enabled: false,
        wallet_or_signer_access: false,
        transaction_submission: false,
        work_credit_write: false,
        void_settlement: false,
        treasury_access_enabled: false,
      }),
    );
    return 2;
  }
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  process.exitCode = runPaidReadQuoteCliV1(process.argv.slice(2));
}
