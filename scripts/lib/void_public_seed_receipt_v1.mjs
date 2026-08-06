import {
  BOOTSTRAP_SCHEMA,
  CHAIN_ID,
  DEFAULT_MANIFEST_VALIDITY_MS,
  DEFAULT_MAX_RECEIPT_AGE_MS,
  DEFAULT_MIN_SAMPLES,
  DEFAULT_MIN_SPAN_MS,
  NETWORK,
  QUALIFICATION_SCHEMA,
  assertPlainObject,
  assertSafeInteger,
  isPublicIpAddress,
  isTemporarySeedHostname,
  normalizePublicSeedBase,
  objectWithId,
} from "./void_public_seed_common_v1.mjs";

export function createQualificationReceipt(
  { endpoint, samples, generatedAt, allowTemporaryFixture = false } = {},
) {
  const normalized = normalizePublicSeedBase(endpoint, {
    allowLoopbackFixture: String(endpoint).startsWith("http://127.0.0.1") ||
      String(endpoint).startsWith("http://localhost") ||
      String(endpoint).startsWith("http://[::1]"),
    allowTemporaryFixture,
  });
  if (!Array.isArray(samples) || samples.length === 0) {
    throw new Error("qualification receipt requires at least one sample");
  }

  const generated = generatedAt || new Date().toISOString();
  const body = {
    schema: QUALIFICATION_SCHEMA,
    network: NETWORK,
    chain_id: CHAIN_ID,
    generated_at: generated,
    endpoint: normalized.base,
    hostname: normalized.hostname,
    loopback_fixture: normalized.loopback_fixture,
    temporary_provider: isTemporarySeedHostname(normalized.hostname),
    sample_count: samples.length,
    samples: structuredClone(samples),
    authority: {
      private_routes_exposed: false,
      wallet_authority: false,
      signer_authority: false,
      validator_authority: false,
      treasury_authority: false,
      work_credit_authority: false,
      money_movement_authority: false,
    },
  };
  return objectWithId("voidpsq1_", body, "qualification_id");
}

function parseTime(value, label) {
  const time = Date.parse(String(value));
  if (!Number.isFinite(time)) throw new Error(`${label} is not a valid timestamp`);
  return time;
}

function assertAuthorityBoundary(authority) {
  const value = assertPlainObject(authority, "qualification authority");
  for (const key of [
    "private_routes_exposed",
    "wallet_authority",
    "signer_authority",
    "validator_authority",
    "treasury_authority",
    "work_credit_authority",
    "money_movement_authority",
  ]) {
    if (value[key] !== false) throw new Error(`qualification authority ${key} must be false`);
  }
}

function verifyQualificationId(receipt) {
  const expected = objectWithId("voidpsq1_", receipt, "qualification_id").qualification_id;
  if (receipt.qualification_id !== expected) throw new Error("qualification ID does not match receipt content");
}

export function validateQualificationReceipt(
  rawReceipt,
  {
    nowMs = Date.now(),
    minSamples = DEFAULT_MIN_SAMPLES,
    minSpanMs = DEFAULT_MIN_SPAN_MS,
    maxAgeMs = DEFAULT_MAX_RECEIPT_AGE_MS,
  } = {},
) {
  const receipt = assertPlainObject(structuredClone(rawReceipt), "qualification receipt");
  if (receipt.schema !== QUALIFICATION_SCHEMA) throw new Error("unexpected qualification schema");
  if (receipt.network !== NETWORK || Number(receipt.chain_id) !== CHAIN_ID) {
    throw new Error("qualification network or chain ID mismatch");
  }
  verifyQualificationId(receipt);
  if (receipt.loopback_fixture !== false) throw new Error("loopback fixture cannot qualify for publication");
  const normalized = normalizePublicSeedBase(receipt.endpoint);
  if (receipt.hostname !== normalized.hostname) throw new Error("qualification hostname mismatch");
  if (receipt.temporary_provider !== false || isTemporarySeedHostname(receipt.hostname)) {
    throw new Error("temporary provider cannot qualify for publication");
  }
  assertAuthorityBoundary(receipt.authority);

  const requiredSamples = assertSafeInteger(minSamples, "minimum samples", { min: 1, max: 20 });
  const requiredSpan = assertSafeInteger(minSpanMs, "minimum span", { min: 0, max: 24 * 60 * 60 * 1000 });
  const allowedAge = assertSafeInteger(maxAgeMs, "maximum receipt age", { min: 1, max: 30 * 24 * 60 * 60 * 1000 });
  if (!Array.isArray(receipt.samples) || receipt.samples.length < requiredSamples) {
    throw new Error(`qualification requires at least ${requiredSamples} samples`);
  }
  if (Number(receipt.sample_count) !== receipt.samples.length) {
    throw new Error("qualification sample_count mismatch");
  }

  let previousObserved = -Infinity;
  let previousHead = -Infinity;
  let firstObserved = 0;
  let lastObserved = 0;
  for (const [index, sampleValue] of receipt.samples.entries()) {
    const sample = assertPlainObject(sampleValue, `qualification sample ${index + 1}`);
    const observed = parseTime(sample.observed_at, `qualification sample ${index + 1} observed_at`);
    if (index === 0) firstObserved = observed;
    lastObserved = observed;
    if (observed < previousObserved) throw new Error("qualification samples are not time ordered");
    previousObserved = observed;

    const readyHead = assertSafeInteger(sample.ready_head, "sample ready_head", { min: 1 });
    const head = assertSafeInteger(sample.head, "sample head", { min: 1 });
    const rangeHead = assertSafeInteger(sample.range_head, "sample range_head", { min: 1 });
    if (sample.ready !== true || Number(sample.gap) !== 0 || Number(sample.txroot_live) !== 1) {
      throw new Error("qualification sample is not exact-green");
    }
    if (sample.gateway_header !== "v1") throw new Error("qualification sample gateway header mismatch");
    if (Number(sample.private_route_status) !== 404 || sample.private_route_error !== "route_not_public") {
      throw new Error("qualification sample private-route boundary mismatch");
    }
    if (Number(sample.mutation_status) !== 405 || sample.mutation_error !== "method_not_allowed") {
      throw new Error("qualification sample mutation boundary mismatch");
    }
    if (Math.abs(head - readyHead) > 64 || rangeHead > Math.max(head, readyHead)) {
      throw new Error("qualification sample head binding mismatch");
    }
    if (head < previousHead) throw new Error("qualification head regressed across samples");
    previousHead = head;

    if (!Array.isArray(sample.dns_addresses) || sample.dns_addresses.length === 0) {
      throw new Error("qualification sample has no DNS evidence");
    }
    for (const address of sample.dns_addresses) {
      if (!isPublicIpAddress(String(address))) {
        throw new Error(`qualification sample contains non-public DNS address ${address}`);
      }
    }
    if (!Array.isArray(sample.connected_addresses) || sample.connected_addresses.length === 0) {
      throw new Error("qualification sample has no connected-address evidence");
    }
    for (const address of sample.connected_addresses) {
      if (!isPublicIpAddress(String(address))) {
        throw new Error(`qualification sample contains non-public connected address ${address}`);
      }
      if (!sample.dns_addresses.includes(address)) {
        throw new Error(`qualification sample connected address ${address} is not DNS-bound`);
      }
    }
  }

  if (lastObserved - firstObserved < requiredSpan) {
    throw new Error(`qualification observation span is less than ${requiredSpan} ms`);
  }
  if (lastObserved > nowMs + 5 * 60 * 1000) throw new Error("qualification receipt is from the future");
  if (nowMs - lastObserved > allowedAge) throw new Error("qualification receipt is stale");

  return Object.freeze({
    receipt,
    endpoint: normalized.base,
    first_observed_at: new Date(firstObserved).toISOString(),
    last_observed_at: new Date(lastObserved).toISOString(),
    latest_head: previousHead,
  });
}

export function buildBootstrapManifest(
  receipts,
  {
    nowMs = Date.now(),
    validityMs = DEFAULT_MANIFEST_VALIDITY_MS,
    minSamples = DEFAULT_MIN_SAMPLES,
    minSpanMs = DEFAULT_MIN_SPAN_MS,
    maxAgeMs = DEFAULT_MAX_RECEIPT_AGE_MS,
  } = {},
) {
  if (!Array.isArray(receipts) || receipts.length === 0) {
    throw new Error("manifest requires at least one qualification receipt");
  }
  if (receipts.length > 8) throw new Error("manifest supports at most eight qualified HTTPS seeds");
  const validity = assertSafeInteger(validityMs, "manifest validity", {
    min: 60 * 60 * 1000,
    max: 7 * 24 * 60 * 60 * 1000,
  });

  const validated = receipts.map((receipt) =>
    validateQualificationReceipt(receipt, { nowMs, minSamples, minSpanMs, maxAgeMs }),
  );
  const endpoints = new Set();
  for (const entry of validated) {
    if (endpoints.has(entry.endpoint)) throw new Error(`duplicate qualified endpoint ${entry.endpoint}`);
    endpoints.add(entry.endpoint);
  }

  const body = {
    schema: BOOTSTRAP_SCHEMA,
    network: NETWORK,
    chain_id: CHAIN_ID,
    status: "stable_https_seed",
    generated_at: new Date(nowMs).toISOString(),
    expires_at: new Date(nowMs + validity).toISOString(),
    sync_endpoints: validated.map((entry, index) => ({
      transport: "https",
      base: entry.endpoint,
      priority: 10 + index * 10,
      enabled: true,
      temporary: false,
      qualification_id: entry.receipt.qualification_id,
      qualified_at: entry.last_observed_at,
      qualified_head: entry.latest_head,
    })),
    onion_endpoints: [],
    private_tailnet_endpoints_published: false,
    authority: {
      private_routes_exposed: false,
      wallet_authority: false,
      signer_authority: false,
      validator_authority: false,
      treasury_authority: false,
      work_credit_authority: false,
      money_movement_authority: false,
    },
    notes:
      "Stable public HTTPS seeds only. Each endpoint is bound to a fresh multi-sample qualification receipt and the restricted read-only gateway v1.",
  };
  return objectWithId("voidpbm1_", body, "manifest_id");
}
