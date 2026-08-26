import { createHash } from 'node:crypto';

const MODEL_CATALOG_URL = 'https://openrouter.ai/api/v1/models';
const MAX_MODEL_RESPONSE_BYTES = 8 * 1024 * 1024;
const MIN_TIMEOUT_MS = 1000;
const MAX_TIMEOUT_MS = 300000;
const PROVIDER_SLUG = /^[A-Za-z0-9._-]{1,128}$/;
const MODEL_SLUG = /^[a-z0-9._-]+\/[A-Za-z0-9._:-]+$/;
const CANONICAL_SLUG = /^[a-z0-9._~-]+\/[A-Za-z0-9._~:-]+$/;

function fail(message) {
  throw new Error(`VOID_APOLLYON_OPENROUTER_BROKER_CATALOG_PREFLIGHT_V1: ${message}`);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function canonicalize(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('non-finite JSON number is forbidden');
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') fail('non-JSON value is forbidden');
  const out = {};
  for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
  return out;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function exactKeys(value, expected, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${name} must be an object`);
  const actual = Object.keys(value).sort().join(',');
  const wanted = [...expected].sort().join(',');
  if (actual !== wanted) fail(`${name} has unexpected fields`);
}

function isExactPublishedZeroPrice(raw) {
  if (typeof raw === 'number') return Object.is(raw, 0);
  return raw === '0';
}

export function validateBrokerCatalogContestantV1(contestant) {
  exactKeys(
    contestant,
    [
      'model',
      'canonical_slug',
      'status',
      'scored_trial_eligible',
      'zero_price_required',
      'min_context_length',
      'max_tokens_cap',
      'retention_class',
      'privacy_class',
      'provider_policy',
    ],
    'contestant',
  );
  if (typeof contestant.model !== 'string' || !MODEL_SLUG.test(contestant.model)) {
    fail('contestant.model is invalid');
  }
  if (typeof contestant.canonical_slug !== 'string' || !CANONICAL_SLUG.test(contestant.canonical_slug)) {
    fail('contestant.canonical_slug is invalid');
  }
  if (!['qualified', 'qualification_only'].includes(contestant.status)) {
    fail('contestant.status is not executable');
  }
  if (typeof contestant.scored_trial_eligible !== 'boolean') fail('contestant.scored_trial_eligible is invalid');
  if (contestant.status !== 'qualified' && contestant.scored_trial_eligible !== false) {
    fail('qualification-only contestant cannot be scored-trial eligible');
  }
  if (contestant.zero_price_required !== true) fail('contestant must require zero pricing');
  if (!Number.isSafeInteger(contestant.min_context_length) || contestant.min_context_length < 32768) {
    fail('contestant.min_context_length is invalid');
  }
  if (!Number.isSafeInteger(contestant.max_tokens_cap)
      || contestant.max_tokens_cap < 1
      || contestant.max_tokens_cap > 32768) {
    fail('contestant.max_tokens_cap is invalid');
  }
  if (typeof contestant.retention_class !== 'string'
      || contestant.retention_class.length < 3
      || contestant.retention_class.length > 256) {
    fail('contestant.retention_class is invalid');
  }
  if (!['zdr_public_or_sanitized', 'retained_public_only'].includes(contestant.privacy_class)) {
    fail('contestant.privacy_class is invalid');
  }

  exactKeys(
    contestant.provider_policy,
    ['allow_fallbacks', 'require_parameters', 'data_collection', 'zdr', 'only'],
    'contestant.provider_policy',
  );
  const policy = contestant.provider_policy;
  if (policy.allow_fallbacks !== false) fail('provider fallbacks must be disabled');
  if (policy.require_parameters !== true) fail('provider parameter support must be required');
  if (![null, 'allow', 'deny'].includes(policy.data_collection)) fail('provider data_collection is invalid');
  if (typeof policy.zdr !== 'boolean') fail('provider zdr is invalid');
  if (!Array.isArray(policy.only) || policy.only.length > 16) fail('provider only-list is invalid');
  for (const slug of policy.only) {
    if (typeof slug !== 'string' || !PROVIDER_SLUG.test(slug)) fail('provider slug is invalid');
  }
  if (contestant.scored_trial_eligible === true && policy.only.length !== 1) {
    fail('scored contestant must bind exactly one reviewed provider');
  }

  if (contestant.privacy_class === 'zdr_public_or_sanitized') {
    if (policy.data_collection !== 'deny' || policy.zdr !== true) {
      fail('ZDR contestant policy is inconsistent');
    }
  } else if (policy.zdr !== false || ![null, 'allow'].includes(policy.data_collection)) {
    fail('retained-public-only contestant policy is inconsistent');
  }

  return Object.freeze({
    model: contestant.model,
    canonical_slug: contestant.canonical_slug,
    status: contestant.status,
    scored_trial_eligible: contestant.scored_trial_eligible,
    zero_price_required: true,
    min_context_length: contestant.min_context_length,
    max_tokens_cap: contestant.max_tokens_cap,
    retention_class: contestant.retention_class,
    privacy_class: contestant.privacy_class,
    provider_policy: Object.freeze({
      allow_fallbacks: false,
      require_parameters: true,
      data_collection: policy.data_collection,
      zdr: policy.zdr,
      only: Object.freeze([...policy.only]),
    }),
  });
}

export function transportContestantFromCatalogContestantV1(contestant) {
  const validated = validateBrokerCatalogContestantV1(contestant);
  return Object.freeze({
    model: validated.model,
    canonical_slug: validated.canonical_slug,
    scored_trial_eligible: validated.scored_trial_eligible,
    max_tokens_cap: validated.max_tokens_cap,
    provider_policy: Object.freeze({
      allow_fallbacks: validated.provider_policy.allow_fallbacks,
      require_parameters: validated.provider_policy.require_parameters,
      data_collection: validated.provider_policy.data_collection,
      zdr: validated.provider_policy.zdr,
      only: Object.freeze([...validated.provider_policy.only]),
    }),
  });
}

async function readResponseJsonBounded(response, maxBytes, name) {
  if (!response?.body || typeof response.body.getReader !== 'function') {
    fail(`${name} response body is unavailable`);
  }
  const rawLength = response.headers?.get?.('content-length');
  if (rawLength !== null && rawLength !== undefined && rawLength !== '') {
    const text = String(rawLength).trim();
    if (!/^(?:0|[1-9][0-9]*)$/.test(text)) fail(`${name} content-length is invalid`);
    const parsed = Number(text);
    if (!Number.isSafeInteger(parsed) || parsed > maxBytes) fail(`${name} content-length exceeds bound`);
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) fail(`${name} body chunk is invalid`);
      total += value.byteLength;
      if (total > maxBytes) fail(`${name} response exceeds ${maxBytes} bytes`);
      chunks.push(Buffer.from(value));
    }
  } finally {
    try { await reader.cancel(); } catch (cancelError) { void cancelError; }
  }

  const bytes = Buffer.concat(chunks, total);
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    fail(`${name} is not valid UTF-8`);
  }
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    fail(`${name} is not valid JSON`);
  }
  return { bytes, value };
}

function validateZeroPriceModel(modelEnvelope, contestant) {
  const model = modelEnvelope?.data ?? modelEnvelope;
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    fail('OpenRouter model metadata is malformed');
  }
  if (model.id !== contestant.model) fail(`OpenRouter model id must equal ${contestant.model}`);
  if (model.canonical_slug !== contestant.canonical_slug) {
    fail(`OpenRouter canonical model generation must equal ${contestant.canonical_slug}`);
  }
  if (!Number.isSafeInteger(model.context_length) || model.context_length < contestant.min_context_length) {
    fail(`OpenRouter model context_length is below the reviewed minimum for ${contestant.model}`);
  }

  const pricing = model.pricing;
  if (!pricing || typeof pricing !== 'object' || Array.isArray(pricing) || Object.keys(pricing).length === 0) {
    fail('OpenRouter pricing metadata is missing');
  }
  const required = new Set(['prompt', 'completion']);
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(pricing, key)) fail(`OpenRouter pricing.${key} is missing`);
    if (!isExactPublishedZeroPrice(pricing[key])) fail(`OpenRouter pricing.${key} is not canonical exact zero`);
  }
  for (const [key, raw] of Object.entries(pricing)) {
    if (required.has(key) || raw === null || raw === undefined) continue;
    if (!isExactPublishedZeroPrice(raw)) fail(`OpenRouter pricing.${key} is not canonical exact zero`);
  }

  return Object.freeze({
    marker: 'VOID_APOLLYON_OPENROUTER_BROKER_CATALOG_PREFLIGHT_V1',
    version: 1,
    model: model.id,
    canonical_slug: model.canonical_slug,
    context_length: model.context_length,
    pricing_zero: true,
    selected_model_sha256: sha256(Buffer.from(canonicalJson(model), 'utf8')),
  });
}

export async function runOpenRouterCatalogPreflightV1(input) {
  exactKeys(input, ['apiKey', 'contestant', 'timeoutMs'], 'input');
  const apiKey = String(input.apiKey ?? '');
  if (apiKey.length < 8 || apiKey.length > 512 || /\s/.test(apiKey)) fail('apiKey is malformed');
  const contestant = validateBrokerCatalogContestantV1(input.contestant);
  if (!Number.isSafeInteger(input.timeoutMs)
      || input.timeoutMs < MIN_TIMEOUT_MS
      || input.timeoutMs > MAX_TIMEOUT_MS) {
    fail('timeoutMs is invalid');
  }

  const response = await globalThis.fetch(MODEL_CATALOG_URL, {
    method: 'GET',
    redirect: 'error',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(input.timeoutMs),
  });
  if (response?.url !== MODEL_CATALOG_URL) fail('model catalog response URL is not exact');
  if (response.status !== 200) fail(`OpenRouter model catalog returned HTTP ${response.status}`);

  const catalogRead = await readResponseJsonBounded(
    response,
    MAX_MODEL_RESPONSE_BYTES,
    'OpenRouter model catalog',
  );
  const catalog = catalogRead.value;
  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog) || !Array.isArray(catalog.data)) {
    fail('OpenRouter model catalog is malformed');
  }
  if (catalog.data.length > 100000) fail('OpenRouter model catalog entry count exceeds bound');

  const matches = catalog.data.filter(
    (entry) => entry && typeof entry === 'object' && !Array.isArray(entry) && entry.id === contestant.model,
  );
  if (matches.length === 0) fail(`OpenRouter model ${contestant.model} is absent from the exact catalog`);
  if (matches.length !== 1) fail(`OpenRouter model ${contestant.model} is ambiguous in the exact catalog`);

  const validated = validateZeroPriceModel(matches[0], contestant);
  return Object.freeze({
    ...validated,
    catalog_sha256: sha256(catalogRead.bytes),
  });
}
