import { createHash, randomBytes } from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  existsSync,
  fchmodSync,
  fstatSync,
  fsyncSync,
  linkSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  unlinkSync,
  writeFileSync,
  type BigIntStats,
} from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  canonicalJson,
  validateAgentPaidWorkOrderEnvelope,
  type AgentPaidWorkOrderEnvelope,
} from "./agent_paid_work_order_envelope_v1.js";
import {
  validateAgentPaidWorkQuoteEnvelope,
  type AgentPaidWorkQuoteEnvelope,
} from "./agent_paid_work_quote_envelope_v1.js";
import {
  PUBLIC_AGENT_SERVICES_CATALOG_ID,
} from "./public_agent_service_order_adapter_v1.js";
import {
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_VERSION,
  readPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1,
} from "../src/http/public_agent_service_acceptance_persistence_trusted_context_provider_binding_v1.js";

export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_BUILDER_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_BUILDER_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_BUILDER_RESULT_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_BUILDER_RESULT_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_BUILDER_VERSION =
  1 as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_BUILDER_CONFIRMATION =
  "buildAcceptancePersistenceTrustedContextBundleV1" as const;

const MAX_JSON_BYTES = 24 * 1024 * 1024;
const MAX_PATH_BYTES = 4096;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

type JsonRecord = Record<string, unknown>;

export interface PublicAgentServiceAcceptancePersistenceTrustedContextBundleBuilderInputV1 {
  catalog_path: string;
  work_order_path: string;
  quote_path: string;
  output_path: string;
}

export interface PublicAgentServiceAcceptancePersistenceTrustedContextBundleBuilderAuthorityV1 {
  input_artifact_read: true;
  output_bundle_write: boolean;
  existing_output_replace: false;
  network_listener_creation: false;
  external_http_submission: false;
  production_acceptance_persistence: false;
  production_replay_write: false;
  payment_authorization: false;
  payment_execution: false;
  execution_authorization: false;
  work_dispatch: false;
  work_credit_write: false;
  wallet_access: false;
  production_signing: false;
  transaction_broadcast: false;
  runtime_configuration_change: false;
  service_restart: false;
  deployment_performed: false;
  money_movement: false;
}

export interface PublicAgentServiceAcceptancePersistenceTrustedContextBundleBuilderResultV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_BUILDER_RESULT_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_BUILDER_VERSION;
  status: "planned" | "built" | "verified";
  confirmation_verified: boolean;
  bundle_marker:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_MARKER;
  bundle_version:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_VERSION;
  bundle_bytes: number;
  bundle_sha256: string;
  bundle_path_fingerprint_sha256: string;
  catalog_id:
    typeof PUBLIC_AGENT_SERVICES_CATALOG_ID;
  catalog_fingerprint_sha256: string;
  service_id: string;
  capability_id: string;
  work_order_id: string;
  quote_id: string;
  provider_id: string;
  output_exists: boolean;
  output_mode_0600: boolean;
  authority:
    PublicAgentServiceAcceptancePersistenceTrustedContextBundleBuilderAuthorityV1;
}

interface ValidatedTupleV1 {
  catalog: JsonRecord;
  work_order: AgentPaidWorkOrderEnvelope;
  quote: AgentPaidWorkQuoteEnvelope;
  catalog_fingerprint_sha256: string;
  service_id: string;
  capability_id: string;
}

interface BundleDocumentV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_VERSION;
  catalog: JsonRecord;
  work_order: AgentPaidWorkOrderEnvelope;
  quote: AgentPaidWorkQuoteEnvelope;
}

export interface PublicAgentServiceAcceptancePersistenceTrustedContextBundleBuilderCliIoV1 {
  stdout: (line: string) => void;
  stderr: (line: string) => void;
}

function fail(message: string): never {
  throw new Error(message);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    fail(message);
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return (
    typeof value === "object"
    && value !== null
    && !Array.isArray(value)
  );
}

function requireRecord(
  value: unknown,
  label: string,
): JsonRecord {
  assertCondition(
    isRecord(value),
    `${label} must be an object`,
  );
  return value;
}

function requireExactKeys(
  value: JsonRecord,
  label: string,
  expected: readonly string[],
): void {
  const actualKeys = Object.keys(value).sort();
  const expectedKeys = [...expected].sort();
  assertCondition(
    actualKeys.length === expectedKeys.length
      && actualKeys.every(
        (entry, index) => entry === expectedKeys[index],
      ),
    `${label} keys must be exact`,
  );
}

function requireString(
  value: unknown,
  label: string,
  minimumBytes: number,
  maximumBytes: number,
): string {
  assertCondition(
    typeof value === "string",
    `${label} must be a string`,
  );
  assertCondition(
    value === value.trim(),
    `${label} must be trimmed`,
  );
  const bytes = Buffer.byteLength(value, "utf8");
  assertCondition(
    bytes >= minimumBytes && bytes <= maximumBytes,
    `${label} length is invalid`,
  );
  return value;
}

function requirePattern(
  value: unknown,
  label: string,
  pattern: RegExp,
  minimumBytes: number,
  maximumBytes: number,
): string {
  const text = requireString(
    value,
    label,
    minimumBytes,
    maximumBytes,
  );
  assertCondition(
    pattern.test(text),
    `${label} format is invalid`,
  );
  return text;
}

function requireAbsoluteNormalizedPath(
  value: unknown,
  label: string,
): string {
  const pathname = requireString(
    value,
    label,
    1,
    MAX_PATH_BYTES,
  );
  assertCondition(
    path.isAbsolute(pathname),
    `${label} must be absolute`,
  );
  assertCondition(
    path.normalize(pathname) === pathname,
    `${label} must be normalized`,
  );
  return pathname;
}

function sha256Text(value: string): string {
  return createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

function assertStableFileMetadata(
  before: BigIntStats,
  after: BigIntStats,
  label: string,
): void {
  assertCondition(
    before.dev === after.dev
      && before.ino === after.ino
      && before.size === after.size
      && before.mtimeNs === after.mtimeNs
      && before.ctimeNs === after.ctimeNs,
    `${label} changed while being read`,
  );
}

function assertTrustedOwnership(
  uid: bigint,
  label: string,
): void {
  if (typeof process.getuid === "function") {
    const currentUid = BigInt(process.getuid());
    assertCondition(
      uid === currentUid || uid === 0n,
      `${label} owner is not trusted`,
    );
  }
}

interface TrustedJsonSourceV1 {
  value: unknown;
  source: string;
}

function readTrustedJsonFile(
  pathnameValue: unknown,
  label: string,
): TrustedJsonSourceV1 {
  const pathname = requireAbsoluteNormalizedPath(
    pathnameValue,
    `${label} path`,
  );
  assertCondition(
    realpathSync.native(pathname) === pathname,
    `${label} path must not contain symlinks`,
  );

  const noFollowFlag =
    typeof fsConstants.O_NOFOLLOW === "number"
      ? fsConstants.O_NOFOLLOW
      : 0;
  const descriptor = openSync(
    pathname,
    fsConstants.O_RDONLY | noFollowFlag,
  );
  let source: string;
  try {
    const before = fstatSync(
      descriptor,
      {
        bigint: true,
      },
    );
    assertCondition(
      before.isFile(),
      `${label} must be a regular file`,
    );
    assertCondition(
      before.size >= 1n
        && before.size <= BigInt(MAX_JSON_BYTES),
      `${label} size is invalid`,
    );
    assertCondition(
      (before.mode & 0o022n) === 0n,
      `${label} must not be group or other writable`,
    );
    assertTrustedOwnership(before.uid, label);
    source = readFileSync(
      descriptor,
      {
        encoding: "utf8",
      },
    );
    const after = fstatSync(
      descriptor,
      {
        bigint: true,
      },
    );
    assertStableFileMetadata(before, after, label);
  } finally {
    closeSync(descriptor);
  }

  assertCondition(
    Buffer.byteLength(source, "utf8") <= MAX_JSON_BYTES,
    `${label} size is invalid`,
  );
  try {
    return {
      value: JSON.parse(source) as unknown,
      source,
    };
  } catch {
    return fail(`${label} must contain valid JSON`);
  }
}

function validateCatalogForWorkOrderV1(
  catalogValue: unknown,
  workOrder: AgentPaidWorkOrderEnvelope,
): {
  catalog: JsonRecord;
  catalog_fingerprint_sha256: string;
  service_id: string;
} {
  const catalog = requireRecord(
    catalogValue,
    "catalog",
  );
  assertCondition(
    catalog.schema === "void.public-agent-services-catalog.v1",
    "catalog schema mismatch",
  );
  assertCondition(
    catalog.marker === "VOID_PUBLIC_AGENT_SERVICES_CATALOG_V1",
    "catalog marker mismatch",
  );
  assertCondition(
    catalog.version === 1,
    "catalog version mismatch",
  );
  assertCondition(
    catalog.catalog_id === PUBLIC_AGENT_SERVICES_CATALOG_ID,
    "catalog_id mismatch",
  );
  assertCondition(
    catalog.catalog_status === "descriptive_only",
    "catalog must remain descriptive_only",
  );

  const catalogFingerprint = requirePattern(
    catalog.catalog_fingerprint_sha256,
    "catalog fingerprint",
    SHA256_PATTERN,
    64,
    64,
  );
  const catalogWithoutFingerprint = {
    ...catalog,
  };
  delete catalogWithoutFingerprint.catalog_fingerprint_sha256;
  assertCondition(
    sha256Text(canonicalJson(catalogWithoutFingerprint))
      === catalogFingerprint,
    "catalog fingerprint is not reproducible",
  );

  const honesty = requireRecord(
    catalog.honesty,
    "catalog honesty",
  );
  for (const key of [
    "external_paid_work_execution_available",
    "automatic_payment_execution_available",
    "wallet_access",
    "credential_issuance",
    "signing",
    "transaction_broadcast",
    "money_movement",
    "runtime_mutation",
    "service_mutation",
  ]) {
    assertCondition(
      honesty[key] === false,
      `catalog authority must remain false: ${key}`,
    );
  }

  assertCondition(
    Array.isArray(catalog.services),
    "catalog services must be an array",
  );
  const matchingServices = catalog.services.filter(
    (value): value is JsonRecord => {
      if (!isRecord(value) || typeof value.service_id !== "string") {
        return false;
      }
      const match = /^void\.(.+)\.v1$/.exec(value.service_id);
      return Boolean(
        match
        && match[1].replaceAll("-", "_")
          === workOrder.service.capability_id,
      );
    },
  );
  assertCondition(
    matchingServices.length === 1,
    "catalog must contain exactly one service for the work-order capability",
  );

  const service = matchingServices[0];
  assertCondition(
    service.category === "verifiable_work",
    "catalog service must be verifiable_work",
  );
  assertCondition(
    service.maturity === "contract_defined",
    "catalog service must be contract_defined",
  );
  assertCondition(
    service.availability === "contract_only",
    "catalog service must remain contract_only",
  );

  const interfaceValue = requireRecord(
    service.interface,
    "catalog service interface",
  );
  assertCondition(
    interfaceValue.kind === "work_type",
    "catalog service interface must be work_type",
  );
  assertCondition(
    interfaceValue.method === null,
    "catalog work_type method must be null",
  );
  assertCondition(
    interfaceValue.path
      === workOrder.service.capability_id.replaceAll(".", "_"),
    "catalog interface path does not match the work-order capability",
  );

  const pricing = requireRecord(
    service.pricing,
    "catalog service pricing",
  );
  assertCondition(
    pricing.status === "not_published"
      || pricing.status === "quote_required",
    "catalog service must use quote-based pricing",
  );
  assertCondition(
    pricing.amount === null
      && pricing.currency === null
      && pricing.payment_execution_available === false,
    "catalog service must not publish or execute payment",
  );

  const execution = requireRecord(
    service.execution,
    "catalog service execution",
  );
  assertCondition(
    execution.external_available === false
      && execution.mode === "contract_only"
      && execution.mutation_authority === false,
    "catalog service must preserve contract-only execution",
  );

  const verification = requireRecord(
    service.verification,
    "catalog service verification",
  );
  assertCondition(
    verification.deterministic_receipts === true,
    "catalog service must support deterministic receipts",
  );

  return {
    catalog,
    catalog_fingerprint_sha256:
      catalogFingerprint,
    service_id:
      service.service_id as string,
  };
}

function validateTrustedTupleV1(
  catalogValue: unknown,
  workOrderValue: unknown,
  quoteValue: unknown,
): ValidatedTupleV1 {
  validateAgentPaidWorkOrderEnvelope(workOrderValue);
  validateAgentPaidWorkQuoteEnvelope(
    workOrderValue,
    quoteValue,
  );
  const workOrder = workOrderValue;
  const quote = quoteValue;
  const catalogResult = validateCatalogForWorkOrderV1(
    catalogValue,
    workOrder,
  );
  return {
    catalog:
      catalogResult.catalog,
    work_order:
      workOrder,
    quote,
    catalog_fingerprint_sha256:
      catalogResult.catalog_fingerprint_sha256,
    service_id:
      catalogResult.service_id,
    capability_id:
      workOrder.service.capability_id,
  };
}

function canonicalizeJson(value: unknown): unknown {
  if (
    value === null
    || typeof value === "string"
    || typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    assertCondition(
      Number.isFinite(value) && Number.isSafeInteger(value),
      "bundle JSON numbers must be finite safe integers",
    );
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalizeJson);
  }
  const record = requireRecord(
    value,
    "bundle JSON value",
  );
  const canonical = Object.create(null) as JsonRecord;
  for (const key of Object.keys(record).sort()) {
    assertCondition(
      record[key] !== undefined,
      "bundle JSON rejects undefined",
    );
    canonical[key] = canonicalizeJson(record[key]);
  }
  return canonical;
}

function bundleDocumentV1(
  tuple: ValidatedTupleV1,
): {
  document: BundleDocumentV1;
  source: string;
} {
  const document: BundleDocumentV1 = {
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_VERSION,
    catalog:
      tuple.catalog,
    work_order:
      tuple.work_order,
    quote:
      tuple.quote,
  };
  const source = `${
    JSON.stringify(
      canonicalizeJson(document),
      null,
      2,
    )
  }\n`;
  assertCondition(
    Buffer.byteLength(source, "utf8") <= MAX_JSON_BYTES,
    "trusted context bundle exceeds the provider size limit",
  );
  return {
    document,
    source,
  };
}

function validateOutputPath(
  outputPathValue: unknown,
  inputPaths: readonly string[],
): string {
  const outputPath = requireAbsoluteNormalizedPath(
    outputPathValue,
    "output path",
  );
  assertCondition(
    outputPath.endsWith(".json"),
    "output path must end with .json",
  );
  assertCondition(
    !inputPaths.includes(outputPath),
    "output path must differ from every input path",
  );
  assertCondition(
    !existsSync(outputPath),
    "refusing to overwrite an existing output",
  );

  const parent = path.dirname(outputPath);
  assertCondition(
    realpathSync.native(parent) === parent,
    "output parent path must not contain symlinks",
  );
  const parentStat = lstatSync(
    parent,
    {
      bigint: true,
    },
  );
  assertCondition(
    parentStat.isDirectory(),
    "output parent must be a directory",
  );
  assertCondition(
    (parentStat.mode & 0o022n) === 0n,
    "output parent must not be group or other writable",
  );
  assertTrustedOwnership(
    parentStat.uid,
    "output parent",
  );
  return outputPath;
}

function atomicWriteNewBundle(
  outputPath: string,
  source: string,
): void {
  const parent = path.dirname(outputPath);
  const temporaryPath = path.join(
    parent,
    `.${
      path.basename(outputPath)
    }.void-tmp-${
      process.pid
    }-${
      randomBytes(16).toString("hex")
    }`,
  );
  let descriptor: number | null = null;
  let temporaryExists = false;
  try {
    const noFollowFlag =
      typeof fsConstants.O_NOFOLLOW === "number"
        ? fsConstants.O_NOFOLLOW
        : 0;
    descriptor = openSync(
      temporaryPath,
      fsConstants.O_WRONLY
        | fsConstants.O_CREAT
        | fsConstants.O_EXCL
        | noFollowFlag,
      0o600,
    );
    temporaryExists = true;
    writeFileSync(
      descriptor,
      source,
      {
        encoding: "utf8",
      },
    );
    fchmodSync(descriptor, 0o600);
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = null;

    linkSync(
      temporaryPath,
      outputPath,
    );
    unlinkSync(temporaryPath);
    temporaryExists = false;

    const parentDescriptor = openSync(
      parent,
      fsConstants.O_RDONLY,
    );
    try {
      fsyncSync(parentDescriptor);
    } finally {
      closeSync(parentDescriptor);
    }
  } finally {
    if (descriptor !== null) {
      closeSync(descriptor);
    }
    if (temporaryExists) {
      unlinkSync(temporaryPath);
    }
  }
}

function resultV1(
  status:
    PublicAgentServiceAcceptancePersistenceTrustedContextBundleBuilderResultV1["status"],
  tuple: ValidatedTupleV1,
  bundlePath: string,
  bundleSource: string,
): PublicAgentServiceAcceptancePersistenceTrustedContextBundleBuilderResultV1 {
  const outputExists = existsSync(bundlePath);
  let outputMode0600 = false;
  if (outputExists) {
    const outputStat = lstatSync(
      bundlePath,
      {
        bigint: true,
      },
    );
    outputMode0600 =
      outputStat.isFile()
      && (outputStat.mode & 0o777n) === 0o600n;
  }
  return Object.freeze({
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_BUILDER_RESULT_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_BUILDER_VERSION,
    status,
    confirmation_verified:
      status === "built",
    bundle_marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_MARKER,
    bundle_version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_VERSION,
    bundle_bytes:
      Buffer.byteLength(bundleSource, "utf8"),
    bundle_sha256:
      sha256Text(bundleSource),
    bundle_path_fingerprint_sha256:
      sha256Text(bundlePath),
    catalog_id:
      PUBLIC_AGENT_SERVICES_CATALOG_ID,
    catalog_fingerprint_sha256:
      tuple.catalog_fingerprint_sha256,
    service_id:
      tuple.service_id,
    capability_id:
      tuple.capability_id,
    work_order_id:
      tuple.work_order.work_order_id,
    quote_id:
      tuple.quote.quote_id,
    provider_id:
      tuple.quote.provider.provider_id,
    output_exists:
      outputExists,
    output_mode_0600:
      outputMode0600,
    authority: Object.freeze({
      input_artifact_read: true as const,
      output_bundle_write:
        status === "built",
      existing_output_replace: false as const,
      network_listener_creation: false as const,
      external_http_submission: false as const,
      production_acceptance_persistence: false as const,
      production_replay_write: false as const,
      payment_authorization: false as const,
      payment_execution: false as const,
      execution_authorization: false as const,
      work_dispatch: false as const,
      work_credit_write: false as const,
      wallet_access: false as const,
      production_signing: false as const,
      transaction_broadcast: false as const,
      runtime_configuration_change: false as const,
      service_restart: false as const,
      deployment_performed: false as const,
      money_movement: false as const,
    }),
  });
}

function loadBuilderInputV1(
  input:
    PublicAgentServiceAcceptancePersistenceTrustedContextBundleBuilderInputV1,
): {
  tuple: ValidatedTupleV1;
  output_path: string;
  source: string;
} {
  const catalogPath = requireAbsoluteNormalizedPath(
    input.catalog_path,
    "catalog path",
  );
  const workOrderPath = requireAbsoluteNormalizedPath(
    input.work_order_path,
    "work-order path",
  );
  const quotePath = requireAbsoluteNormalizedPath(
    input.quote_path,
    "quote path",
  );
  assertCondition(
    new Set([
      catalogPath,
      workOrderPath,
      quotePath,
    ]).size === 3,
    "input paths must be distinct",
  );
  const outputPath = validateOutputPath(
    input.output_path,
    [
      catalogPath,
      workOrderPath,
      quotePath,
    ],
  );
  const tuple = validateTrustedTupleV1(
    readTrustedJsonFile(
      catalogPath,
      "catalog",
    ).value,
    readTrustedJsonFile(
      workOrderPath,
      "work order",
    ).value,
    readTrustedJsonFile(
      quotePath,
      "quote",
    ).value,
  );
  return {
    tuple,
    output_path:
      outputPath,
    source:
      bundleDocumentV1(tuple).source,
  };
}

export function planPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1(
  input:
    PublicAgentServiceAcceptancePersistenceTrustedContextBundleBuilderInputV1,
): PublicAgentServiceAcceptancePersistenceTrustedContextBundleBuilderResultV1 {
  const loaded = loadBuilderInputV1(input);
  return resultV1(
    "planned",
    loaded.tuple,
    loaded.output_path,
    loaded.source,
  );
}

export function buildPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1(
  input:
    PublicAgentServiceAcceptancePersistenceTrustedContextBundleBuilderInputV1,
  confirmation: unknown,
): PublicAgentServiceAcceptancePersistenceTrustedContextBundleBuilderResultV1 {
  assertCondition(
    confirmation
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_BUILDER_CONFIRMATION,
    "build requires exact confirmation",
  );
  const loaded = loadBuilderInputV1(input);
  atomicWriteNewBundle(
    loaded.output_path,
    loaded.source,
  );
  const providerContext =
    readPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1(
      loaded.output_path,
    );
  validateTrustedTupleV1(
    providerContext.catalog,
    providerContext.work_order,
    providerContext.quote,
  );
  const writtenSource = readTrustedJsonFile(
    loaded.output_path,
    "written trusted context bundle",
  ).source;
  assertCondition(
    writtenSource === loaded.source,
    "written bundle does not match the planned source",
  );
  return resultV1(
    "built",
    loaded.tuple,
    loaded.output_path,
    loaded.source,
  );
}

export function verifyPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1(
  bundlePathValue: unknown,
): PublicAgentServiceAcceptancePersistenceTrustedContextBundleBuilderResultV1 {
  const bundlePath = requireAbsoluteNormalizedPath(
    bundlePathValue,
    "bundle path",
  );
  const bundleRead = readTrustedJsonFile(
    bundlePath,
    "trusted context bundle",
  );
  const root = requireRecord(
    bundleRead.value,
    "trusted context bundle",
  );
  requireExactKeys(
    root,
    "trusted context bundle",
    [
      "marker",
      "version",
      "catalog",
      "work_order",
      "quote",
    ],
  );
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_MARKER,
    "trusted context bundle marker mismatch",
  );
  assertCondition(
    root.version
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_VERSION,
    "trusted context bundle version mismatch",
  );
  const tuple = validateTrustedTupleV1(
    root.catalog,
    root.work_order,
    root.quote,
  );
  const expectedSource =
    bundleDocumentV1(tuple).source;
  const actualSource = bundleRead.source;
  assertCondition(
    actualSource === expectedSource,
    "trusted context bundle must use exact canonical JSON encoding",
  );
  readPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1(
    bundlePath,
  );
  const result = resultV1(
    "verified",
    tuple,
    bundlePath,
    actualSource,
  );
  assertCondition(
    result.output_mode_0600,
    "trusted context bundle mode must be 0600",
  );
  return result;
}

interface ParsedCliV1 {
  mode: "plan" | "build" | "verify";
  values: Record<string, string>;
}

function parseCliArgumentsV1(
  argv: readonly string[],
): ParsedCliV1 {
  const [
    modeValue,
    ...rest
  ] = argv;
  assertCondition(
    modeValue === "plan"
      || modeValue === "build"
      || modeValue === "verify",
    "mode must be plan, build, or verify",
  );
  assertCondition(
    rest.length % 2 === 0,
    "CLI flags must use --name value pairs",
  );
  const values: Record<string, string> = {};
  for (let index = 0; index < rest.length; index += 2) {
    const flag = rest[index];
    const value = rest[index + 1];
    assertCondition(
      /^--[a-z-]+$/.test(flag),
      `invalid CLI flag: ${flag}`,
    );
    const key = flag.slice(2);
    assertCondition(
      values[key] === undefined,
      `duplicate CLI flag: ${flag}`,
    );
    values[key] = value;
  }

  const expected =
    modeValue === "verify"
      ? ["bundle"]
      : modeValue === "build"
        ? [
            "catalog",
            "confirmation",
            "output",
            "quote",
            "work-order",
          ]
        : [
            "catalog",
            "output",
            "quote",
            "work-order",
          ];
  requireExactKeys(
    values,
    "CLI flags",
    expected,
  );
  return {
    mode:
      modeValue,
    values,
  };
}

function defaultCliIoV1():
  PublicAgentServiceAcceptancePersistenceTrustedContextBundleBuilderCliIoV1 {
  return {
    stdout: (line: string): void => console.log(line),
    stderr: (line: string): void => console.error(line),
  };
}

export function runPublicAgentServiceAcceptancePersistenceTrustedContextBundleBuilderCliV1(
  argv: readonly string[],
  io:
    PublicAgentServiceAcceptancePersistenceTrustedContextBundleBuilderCliIoV1 =
      defaultCliIoV1(),
): number {
  try {
    const command = parseCliArgumentsV1(argv);
    let result:
      PublicAgentServiceAcceptancePersistenceTrustedContextBundleBuilderResultV1;
    if (command.mode === "verify") {
      result =
        verifyPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1(
          command.values.bundle,
        );
    } else {
      const input = {
        catalog_path:
          command.values.catalog,
        work_order_path:
          command.values["work-order"],
        quote_path:
          command.values.quote,
        output_path:
          command.values.output,
      };
      result =
        command.mode === "plan"
          ? planPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1(
              input,
            )
          : buildPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1(
              input,
              command.values.confirmation,
            );
    }
    io.stdout(
      JSON.stringify(
        result,
        null,
        2,
      ),
    );
    io.stdout(
      `VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_${result.status.toUpperCase()}_V1`,
    );
    return 0;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);
    io.stderr(`HOLD: ${message}`);
    return 1;
  }
}

const invokedUrl = process.argv[1]
  ? pathToFileURL(
      path.resolve(process.argv[1]),
    ).href
  : "";

if (invokedUrl === import.meta.url) {
  process.exitCode =
    runPublicAgentServiceAcceptancePersistenceTrustedContextBundleBuilderCliV1(
      process.argv.slice(2),
    );
}
