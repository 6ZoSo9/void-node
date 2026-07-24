import assert from "node:assert/strict";

import {
  PAID_DATANET_QUOTE_V1_SCHEMA,
  PAID_DATANET_SERVICE_CATALOG_V1,
  PAID_DATANET_SERVICE_CATALOG_V1_MARKER,
  USD_CENTS,
  getPaidDatanetServiceV1,
  quotePaidDatanetServiceV1,
} from "../src/paid_services/datanet_service_catalog_v1.js";

let assertions = 0;

function equal<T>(actual: T, expected: T, message?: string): void {
  assert.equal(actual, expected, message);
  assertions += 1;
}

function deepEqual(
  actual: unknown,
  expected: unknown,
  message?: string,
): void {
  assert.deepEqual(actual, expected, message);
  assertions += 1;
}

function matches(
  actual: string,
  pattern: RegExp,
  message?: string,
): void {
  assert.match(actual, pattern, message);
  assertions += 1;
}

function throws(
  fn: () => unknown,
  pattern: RegExp,
  message?: string,
): void {
  assert.throws(fn, pattern, message);
  assertions += 1;
}

const serviceCodes = Object.keys(PAID_DATANET_SERVICE_CATALOG_V1);
equal(serviceCodes.length, 3);
deepEqual(serviceCodes, [
  "datanet.object-integrity-check.v1",
  "datanet.public-retrieval-evidence.v1",
  "datanet.dataset-replication-audit.v1",
]);

for (const service of Object.values(
  PAID_DATANET_SERVICE_CATALOG_V1,
)) {
  equal(service.currency, USD_CENTS);
  equal(Object.isFrozen(service), true);
  equal(Object.isFrozen(service.pricing), true);
  equal(Object.isFrozen(service.required_evidence), true);
  equal(Object.isFrozen(service.exclusions), true);
  equal(service.required_evidence.length >= 5, true);
  equal(service.exclusions.length >= 4, true);
  equal(service.pricing.minimum_operator_margin_bps > 0, true);
  equal(service.pricing.minimum_operator_margin_bps < 10_000, true);
}

const integrityRequest = {
  request_id: "request-integrity-001",
  requester_id: "customer-example-001",
  service_code: "datanet.object-integrity-check.v1" as const,
  object_count: 2,
  total_bytes: 1_048_577,
  operator_cost_basis_cents: 200,
  requested_at_ms: 1_800_000_000_000,
};

const integrityQuote = quotePaidDatanetServiceV1(integrityRequest);
equal(integrityQuote.schema, PAID_DATANET_QUOTE_V1_SCHEMA);
equal(
  integrityQuote.marker,
  PAID_DATANET_SERVICE_CATALOG_V1_MARKER,
);
equal(integrityQuote.quote_only, true);
equal(integrityQuote.currency, USD_CENTS);
equal(integrityQuote.request.billable_mib, 2);
equal(integrityQuote.pricing.base_cents, 250);
equal(integrityQuote.pricing.object_charge_cents, 50);
equal(integrityQuote.pricing.byte_charge_cents, 4);
equal(integrityQuote.pricing.catalog_subtotal_cents, 304);
equal(integrityQuote.pricing.cost_protected_subtotal_cents, 267);
equal(integrityQuote.pricing.quoted_subtotal_cents, 304);
equal(integrityQuote.pricing.quoted_total_cents, 304);
equal(integrityQuote.pricing.tax_cents, 0);
equal(
  integrityQuote.expires_at_ms,
  integrityRequest.requested_at_ms + 15 * 60 * 1000,
);
matches(integrityQuote.quote_id, /^[0-9a-f]{64}$/);
equal(integrityQuote.controls.operator_approval_required, true);
equal(
  integrityQuote.controls.customer_payment_required_before_work,
  true,
);
equal(integrityQuote.controls.automatic_execution_enabled, false);
equal(
  integrityQuote.controls.automatic_payment_collection_enabled,
  false,
);
equal(integrityQuote.controls.treasury_access_enabled, false);

const repeatedQuote = quotePaidDatanetServiceV1({
  ...integrityRequest,
});
equal(repeatedQuote.quote_id, integrityQuote.quote_id);
deepEqual(repeatedQuote, integrityQuote);

const costProtectedQuote = quotePaidDatanetServiceV1({
  ...integrityRequest,
  request_id: "request-integrity-002",
  operator_cost_basis_cents: 1000,
});
equal(costProtectedQuote.pricing.catalog_subtotal_cents, 304);
equal(
  costProtectedQuote.pricing.cost_protected_subtotal_cents,
  1334,
);
equal(costProtectedQuote.pricing.quoted_total_cents, 1334);
equal(
  costProtectedQuote.quote_id === integrityQuote.quote_id,
  false,
);

const retrievalQuote = quotePaidDatanetServiceV1({
  request_id: "request-retrieval-001",
  requester_id: "customer-example-002",
  service_code: "datanet.public-retrieval-evidence.v1",
  object_count: 1,
  total_bytes: 1,
  operator_cost_basis_cents: 0,
  requested_at_ms: 1_800_000_000_000,
});
equal(retrievalQuote.request.billable_mib, 1);
equal(retrievalQuote.pricing.catalog_subtotal_cents, 453);
equal(retrievalQuote.pricing.quoted_total_cents, 453);

const replicationQuote = quotePaidDatanetServiceV1({
  request_id: "request-replication-001",
  requester_id: "customer-example-003",
  service_code: "datanet.dataset-replication-audit.v1",
  object_count: 10,
  total_bytes: 10 * 1024 * 1024,
  operator_cost_basis_cents: 0,
  requested_at_ms: 1_800_000_000_000,
});
equal(replicationQuote.request.billable_mib, 10);
equal(replicationQuote.pricing.catalog_subtotal_cents, 1310);

equal(
  getPaidDatanetServiceV1(
    "datanet.dataset-replication-audit.v1",
  ).max_object_count,
  256,
);

throws(
  () => getPaidDatanetServiceV1("unknown.service"),
  /unknown paid DataNet service/,
);
throws(
  () =>
    quotePaidDatanetServiceV1({
      ...integrityRequest,
      request_id: "x",
    }),
  /request_id must match/,
);
throws(
  () =>
    quotePaidDatanetServiceV1({
      ...integrityRequest,
      requester_id: "contains space",
    }),
  /requester_id must match/,
);
throws(
  () =>
    quotePaidDatanetServiceV1({
      ...integrityRequest,
      object_count: 0,
    }),
  /object_count must be a safe integer/,
);
throws(
  () =>
    quotePaidDatanetServiceV1({
      ...integrityRequest,
      object_count: 33,
    }),
  /object_count must be a safe integer/,
);
throws(
  () =>
    quotePaidDatanetServiceV1({
      ...integrityRequest,
      object_count: 1.5,
    }),
  /object_count must be a safe integer/,
);
throws(
  () =>
    quotePaidDatanetServiceV1({
      ...integrityRequest,
      total_bytes: 0,
    }),
  /total_bytes must be a safe integer/,
);
throws(
  () =>
    quotePaidDatanetServiceV1({
      ...integrityRequest,
      total_bytes: 256 * 1024 * 1024 + 1,
    }),
  /total_bytes must be a safe integer/,
);
throws(
  () =>
    quotePaidDatanetServiceV1({
      ...integrityRequest,
      operator_cost_basis_cents: -1,
    }),
  /operator_cost_basis_cents must be a safe integer/,
);
throws(
  () =>
    quotePaidDatanetServiceV1({
      ...integrityRequest,
      operator_cost_basis_cents: Number.NaN,
    }),
  /operator_cost_basis_cents must be a safe integer/,
);
throws(
  () =>
    quotePaidDatanetServiceV1({
      ...integrityRequest,
      requested_at_ms: -1,
    }),
  /requested_at_ms must be a safe integer/,
);

console.log(
  JSON.stringify(
    {
      marker: PAID_DATANET_SERVICE_CATALOG_V1_MARKER,
      schema: PAID_DATANET_QUOTE_V1_SCHEMA,
      service_count: serviceCodes.length,
      assertion_count: assertions,
      deterministic_quote_id: integrityQuote.quote_id,
      quote_only: true,
      automatic_execution_enabled: false,
      automatic_payment_collection_enabled: false,
      treasury_access_enabled: false,
      status: "GREEN",
    },
    null,
    2,
  ),
);
