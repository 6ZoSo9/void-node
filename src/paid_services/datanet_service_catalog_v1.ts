import { createHash } from "node:crypto";

export const PAID_DATANET_SERVICE_CATALOG_V1_MARKER =
  "VOID_PAID_DATANET_SERVICE_CATALOG_V1" as const;

export const PAID_DATANET_SERVICE_CATALOG_V1_SCHEMA =
  "void-paid-datanet-service-catalog-v1" as const;

export const PAID_DATANET_QUOTE_V1_SCHEMA =
  "void-paid-datanet-quote-v1" as const;

export const USD_CENTS = "USD_CENTS" as const;

const MIB_BYTES = 1024 * 1024;
const MAX_COST_BASIS_CENTS = 100_000_000;
const MAX_REQUESTED_AT_MS = 8_000_000_000_000_000;

export type PaidDatanetServiceCodeV1 =
  | "datanet.object-integrity-check.v1"
  | "datanet.public-retrieval-evidence.v1"
  | "datanet.dataset-replication-audit.v1";

export interface PaidDatanetPricingV1 {
  readonly base_cents: number;
  readonly per_object_cents: number;
  readonly per_billable_mib_cents: number;
  readonly minimum_operator_margin_bps: number;
}

export interface PaidDatanetServiceDefinitionV1 {
  readonly service_code: PaidDatanetServiceCodeV1;
  readonly public_name: string;
  readonly customer_outcome: string;
  readonly currency: typeof USD_CENTS;
  readonly max_object_count: number;
  readonly max_total_bytes: number;
  readonly target_completion_seconds: number;
  readonly quote_valid_for_ms: number;
  readonly pricing: PaidDatanetPricingV1;
  readonly required_evidence: readonly string[];
  readonly exclusions: readonly string[];
}

export interface PaidDatanetQuoteRequestV1 {
  readonly request_id: string;
  readonly requester_id: string;
  readonly service_code: PaidDatanetServiceCodeV1;
  readonly object_count: number;
  readonly total_bytes: number;
  readonly operator_cost_basis_cents: number;
  readonly requested_at_ms: number;
}

export interface PaidDatanetQuoteV1 {
  readonly schema: typeof PAID_DATANET_QUOTE_V1_SCHEMA;
  readonly marker: typeof PAID_DATANET_SERVICE_CATALOG_V1_MARKER;
  readonly quote_id: string;
  readonly quote_only: true;
  readonly service_code: PaidDatanetServiceCodeV1;
  readonly service_name: string;
  readonly currency: typeof USD_CENTS;
  readonly requested_at_ms: number;
  readonly expires_at_ms: number;
  readonly request: {
    readonly request_id: string;
    readonly requester_id: string;
    readonly object_count: number;
    readonly total_bytes: number;
    readonly billable_mib: number;
  };
  readonly pricing: {
    readonly base_cents: number;
    readonly object_charge_cents: number;
    readonly byte_charge_cents: number;
    readonly catalog_subtotal_cents: number;
    readonly operator_cost_basis_cents: number;
    readonly minimum_operator_margin_bps: number;
    readonly cost_protected_subtotal_cents: number;
    readonly quoted_subtotal_cents: number;
    readonly tax_cents: 0;
    readonly quoted_total_cents: number;
  };
  readonly controls: {
    readonly operator_approval_required: true;
    readonly customer_payment_required_before_work: true;
    readonly automatic_execution_enabled: false;
    readonly automatic_payment_collection_enabled: false;
    readonly treasury_access_enabled: false;
  };
  readonly required_evidence: readonly string[];
  readonly exclusions: readonly string[];
}

function frozenStrings(values: readonly string[]): readonly string[] {
  return Object.freeze([...values]);
}

function frozenPricing(
  value: PaidDatanetPricingV1,
): PaidDatanetPricingV1 {
  return Object.freeze({ ...value });
}

function frozenService(
  value: PaidDatanetServiceDefinitionV1,
): PaidDatanetServiceDefinitionV1 {
  return Object.freeze({
    ...value,
    pricing: frozenPricing(value.pricing),
    required_evidence: frozenStrings(value.required_evidence),
    exclusions: frozenStrings(value.exclusions),
  });
}

export const PAID_DATANET_SERVICE_CATALOG_V1: Readonly<
  Record<PaidDatanetServiceCodeV1, PaidDatanetServiceDefinitionV1>
> = Object.freeze({
  "datanet.object-integrity-check.v1": frozenService({
    service_code: "datanet.object-integrity-check.v1",
    public_name: "DataNet Object Integrity Check",
    customer_outcome:
      "Verify bounded content-addressed objects and return deterministic integrity evidence.",
    currency: USD_CENTS,
    max_object_count: 32,
    max_total_bytes: 256 * MIB_BYTES,
    target_completion_seconds: 15 * 60,
    quote_valid_for_ms: 15 * 60 * 1000,
    pricing: {
      base_cents: 250,
      per_object_cents: 25,
      per_billable_mib_cents: 2,
      minimum_operator_margin_bps: 2500,
    },
    required_evidence: [
      "request-bound object identifiers",
      "observed SHA-256 digest per object",
      "expected-versus-observed verdict per object",
      "bounded execution summary",
      "operator-signed completion receipt",
    ],
    exclusions: [
      "content repair",
      "content moderation judgment",
      "custody of customer secrets",
      "automatic settlement",
    ],
  }),
  "datanet.public-retrieval-evidence.v1": frozenService({
    service_code: "datanet.public-retrieval-evidence.v1",
    public_name: "DataNet Public Retrieval Evidence",
    customer_outcome:
      "Attempt bounded public retrieval and return reproducible availability evidence.",
    currency: USD_CENTS,
    max_object_count: 16,
    max_total_bytes: 128 * MIB_BYTES,
    target_completion_seconds: 30 * 60,
    quote_valid_for_ms: 15 * 60 * 1000,
    pricing: {
      base_cents: 400,
      per_object_cents: 50,
      per_billable_mib_cents: 3,
      minimum_operator_margin_bps: 3000,
    },
    required_evidence: [
      "request-bound object identifiers",
      "retrieval source identity",
      "bounded retrieval result per object",
      "content digest when retrieval succeeds",
      "operator-signed completion receipt",
    ],
    exclusions: [
      "availability guarantees beyond the observed window",
      "private-network access",
      "credential handling",
      "automatic settlement",
    ],
  }),
  "datanet.dataset-replication-audit.v1": frozenService({
    service_code: "datanet.dataset-replication-audit.v1",
    public_name: "DataNet Dataset Replication Audit",
    customer_outcome:
      "Audit a bounded dataset manifest against declared replicas and return a coverage report.",
    currency: USD_CENTS,
    max_object_count: 256,
    max_total_bytes: 2048 * MIB_BYTES,
    target_completion_seconds: 4 * 60 * 60,
    quote_valid_for_ms: 15 * 60 * 1000,
    pricing: {
      base_cents: 1200,
      per_object_cents: 10,
      per_billable_mib_cents: 1,
      minimum_operator_margin_bps: 3500,
    },
    required_evidence: [
      "request-bound dataset manifest digest",
      "declared replica identities",
      "object coverage verdict per replica",
      "aggregate replication coverage",
      "operator-signed completion receipt",
    ],
    exclusions: [
      "creating or funding replicas",
      "permanent storage guarantees",
      "private-key custody",
      "automatic settlement",
    ],
  }),
});

function assertSafeInteger(
  name: string,
  value: number,
  minimum: number,
  maximum: number,
): void {
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

function assertBoundedIdentifier(name: string, value: string): void {
  if (
    typeof value !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/.test(value)
  ) {
    throw new Error(
      `${name} must match ^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$`,
    );
  }
}

function ceilDivide(numerator: number, denominator: number): number {
  return Math.floor((numerator + denominator - 1) / denominator);
}

function canonicalJson(value: unknown): string {
  if (value === null) {
    return "null";
  }

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
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalJson(record[key])}`,
      )
      .join(",")}}`;
  }

  throw new Error(`canonical JSON does not support ${typeof value}`);
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function getPaidDatanetServiceV1(
  serviceCode: string,
): PaidDatanetServiceDefinitionV1 {
  const service = (
    PAID_DATANET_SERVICE_CATALOG_V1 as Readonly<
      Record<string, PaidDatanetServiceDefinitionV1 | undefined>
    >
  )[serviceCode];

  if (!service) {
    throw new Error(`unknown paid DataNet service: ${serviceCode}`);
  }

  return service;
}

export function quotePaidDatanetServiceV1(
  request: PaidDatanetQuoteRequestV1,
): PaidDatanetQuoteV1 {
  assertBoundedIdentifier("request_id", request.request_id);
  assertBoundedIdentifier("requester_id", request.requester_id);

  const service = getPaidDatanetServiceV1(request.service_code);

  assertSafeInteger(
    "object_count",
    request.object_count,
    1,
    service.max_object_count,
  );
  assertSafeInteger(
    "total_bytes",
    request.total_bytes,
    1,
    service.max_total_bytes,
  );
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

  const billableMib = ceilDivide(request.total_bytes, MIB_BYTES);
  const objectCharge =
    request.object_count * service.pricing.per_object_cents;
  const byteCharge =
    billableMib * service.pricing.per_billable_mib_cents;
  const catalogSubtotal =
    service.pricing.base_cents + objectCharge + byteCharge;

  const marginDenominator =
    10_000 - service.pricing.minimum_operator_margin_bps;
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
    quote_only: true as const,
    service_code: service.service_code,
    service_name: service.public_name,
    currency: USD_CENTS,
    requested_at_ms: request.requested_at_ms,
    expires_at_ms:
      request.requested_at_ms + service.quote_valid_for_ms,
    request: {
      request_id: request.request_id,
      requester_id: request.requester_id,
      object_count: request.object_count,
      total_bytes: request.total_bytes,
      billable_mib: billableMib,
    },
    pricing: {
      base_cents: service.pricing.base_cents,
      object_charge_cents: objectCharge,
      byte_charge_cents: byteCharge,
      catalog_subtotal_cents: catalogSubtotal,
      operator_cost_basis_cents:
        request.operator_cost_basis_cents,
      minimum_operator_margin_bps:
        service.pricing.minimum_operator_margin_bps,
      cost_protected_subtotal_cents: costProtectedSubtotal,
      quoted_subtotal_cents: quotedSubtotal,
      tax_cents: 0 as const,
      quoted_total_cents: quotedSubtotal,
    },
    controls: {
      operator_approval_required: true as const,
      customer_payment_required_before_work: true as const,
      automatic_execution_enabled: false as const,
      automatic_payment_collection_enabled: false as const,
      treasury_access_enabled: false as const,
    },
    required_evidence: service.required_evidence,
    exclusions: service.exclusions,
  };

  const quoteId = sha256Hex(canonicalJson(body));

  return Object.freeze({
    ...body,
    quote_id: quoteId,
  });
}
