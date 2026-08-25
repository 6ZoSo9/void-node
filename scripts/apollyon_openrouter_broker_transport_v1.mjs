// VOID_OX_ALPHA_OPENROUTER_BROKER_TRANSPORT_V8_4 - source-only OpenRouter broker transport.
// One internal chat-send closure behind the V8.3 boundary; no caller-supplied send capability,
// no retry/fallback, no metadata GET, no filesystem/wallet/service/validator authority here.
import { createHash } from 'node:crypto';
import { runBrokerProviderAttemptV1 } from './apollyon_execution_provider_boundary_v1.mjs';

const MODULE_ID = 'VOID_OX_ALPHA_OPENROUTER_BROKER_TRANSPORT_V8_4';
const CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const RESULT_MARKER = 'VOID_APOLLYON_OPENROUTER_VALIDATED_RESULT_V1';
const DIGEST_MARKER = 'VOID_APOLLYON_OPENROUTER_RESULT_DIGEST_V1';
const MAX_BODY_BYTES = 3 * 1024 * 1024;
const MAX_CHAT_RESPONSE_BYTES = 8 * 1024 * 1024;
const MAX_ERROR_RESPONSE_BYTES = 64 * 1024;
const MAX_USAGE_CANONICAL_BYTES = 256 * 1024;
const MODEL_SLUG = /^[a-z0-9][a-z0-9._-]{0,62}\/[a-z0-9][a-z0-9._-]{0,62}(?::[a-z0-9][a-z0-9_-]{0,31})?$/;
const PROVIDER_SLUG = /^[A-Za-z0-9._-]{1,128}$/;

function fail(message) { throw new Error(`${MODULE_ID}: ${message}`); }

function isPlainObjectV1(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function exactKeysV1(value, keys, label) {
  if (!isPlainObjectV1(value)) fail(`${label} must be a plain object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) fail(`${label} must contain exactly: ${expected.join(',')}`);
}

function boundedTextV1(text, apiKey) {
  let out = String(text).replace(/[\r\n\t]+/g, ' ').trim();
  if (apiKey) out = out.split(apiKey).join('[REDACTED_API_KEY]');
  return out.length > 768 ? `${out.slice(0, 768)}…` : out;
}

function sha256HexV1(bytes) { return createHash('sha256').update(bytes).digest('hex'); }

function canonicalJsonV1(value) { // sorted object keys, array order preserved, finite numbers only
  if (value === null || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('canonical JSON requires finite numbers');
    return JSON.stringify(value);
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalJsonV1(entry)).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJsonV1(value[key])}`).join(',')}}`;
}

function snapshotJsonValueV1(value, label, depth) { // bounded JSON-only deep snapshot, frozen
  if (depth > 16) fail(`${label} exceeds maximum nested depth 16`);
  if (value === null) return null;
  const type = typeof value;
  if (type === 'string' || type === 'boolean') return value;
  if (type === 'number') {
    if (!Number.isFinite(value)) fail(`${label} contains a non-finite number`);
    return value;
  }
  if (type !== 'object') fail(`${label} contains a non-JSON ${type} value`);
  if (Array.isArray(value)) {
    if (value.length > 256) fail(`${label} array exceeds 256 entries`);
    return Object.freeze(value.map((entry) => snapshotJsonValueV1(entry, label, depth + 1)));
  }
  if (!isPlainObjectV1(value)) fail(`${label} contains a non-plain object`);
  const keys = Object.keys(value);
  if (keys.length > 256) fail(`${label} object exceeds 256 keys`);
  const out = {};
  for (const key of keys) out[key] = snapshotJsonValueV1(value[key], label, depth + 1);
  return Object.freeze(out);
}

async function readBodyBoundedV1(response, maxBytes, label) {
  const reader = response.body && typeof response.body.getReader === 'function' ? response.body.getReader() : null;
  if (!reader) fail(`${label} response body is unreadable`);
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) fail(`${label} response exceeds ${maxBytes} bytes`);
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
  return merged;
}

async function readJsonBoundedV1(response, maxBytes, label) {
  const bytes = await readBodyBoundedV1(response, maxBytes, label);
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { fail(`${label} response is not valid UTF-8`); }
  try { return JSON.parse(text); } catch { fail(`${label} response is not valid JSON`); }
}

async function httpErrorV1(response, apiKey) {
  const parts = [`OpenRouter chat completion returned HTTP ${response.status}`];
  try {
    const payload = await readJsonBoundedV1(response, MAX_ERROR_RESPONSE_BYTES, 'chat error');
    const error = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload.error : null;
    if (error && typeof error === 'object' && !Array.isArray(error)) {
      if ((typeof error.code === 'string' && error.code) || typeof error.code === 'number') parts.push(`code=${boundedTextV1(error.code, apiKey)}`);
      if (typeof error.message === 'string' && error.message.trim()) parts.push(`message=${boundedTextV1(error.message, apiKey)}`);
    }
  } catch { /* status-only fallback when the error body is absent, malformed, or oversized */ }
  const retryAfter = response.headers && typeof response.headers.get === 'function' ? response.headers.get('retry-after') : null;
  if (retryAfter) parts.push(`retry_after=${boundedTextV1(retryAfter, apiKey)}`);
  return new Error(parts.join(' '));
}

function validateContestantV1(contestant) {
  exactKeysV1(contestant, ['model', 'canonical_slug', 'scored_trial_eligible', 'max_tokens_cap', 'provider_policy'], 'contestant');
  if (typeof contestant.model !== 'string' || !MODEL_SLUG.test(contestant.model)) fail('contestant.model fails the reviewed slug pattern');
  if (typeof contestant.canonical_slug !== 'string' || !MODEL_SLUG.test(contestant.canonical_slug)) fail('contestant.canonical_slug fails the reviewed slug pattern');
  if (typeof contestant.scored_trial_eligible !== 'boolean') fail('contestant.scored_trial_eligible must be boolean');
  if (!Number.isSafeInteger(contestant.max_tokens_cap) || contestant.max_tokens_cap < 1 || contestant.max_tokens_cap > 32768) fail('contestant.max_tokens_cap must be a safe integer 1..32768');
  const policy = contestant.provider_policy;
  exactKeysV1(policy, ['allow_fallbacks', 'require_parameters', 'data_collection', 'zdr', 'only'], 'contestant.provider_policy');
  if (policy.allow_fallbacks !== false || policy.require_parameters !== true) fail('contestant.provider_policy must pin allow_fallbacks=false and require_parameters=true');
  if (policy.data_collection !== null && policy.data_collection !== 'deny' && policy.data_collection !== 'allow') fail('contestant.provider_policy.data_collection must be null, deny, or allow');
  if (typeof policy.zdr !== 'boolean') fail('contestant.provider_policy.zdr must be boolean');
  if (!Array.isArray(policy.only) || policy.only.length > 16) fail('contestant.provider_policy.only must hold at most 16 provider slugs');
  for (const entry of policy.only) {
    if (typeof entry !== 'string' || !PROVIDER_SLUG.test(entry)) fail('contestant.provider_policy.only entries must be bounded provider slugs');
  }
  if (contestant.scored_trial_eligible && policy.only.length !== 1) fail('scored_trial_eligible contestants require exactly one reviewed provider in only');
}

function resolveExecutionModelV1(contestant) {
  if (contestant.model.endsWith(':free') && !contestant.canonical_slug.endsWith(':free')) return `${contestant.canonical_slug}:free`;
  return contestant.canonical_slug;
}

function validateRequestBodyV1(requestBody, contestant, executionModel) {
  exactKeysV1(requestBody, ['model', 'messages', 'max_tokens', 'stream', 'provider'], 'requestBody');
  if (requestBody.model !== executionModel) fail(`requestBody.model must equal resolved execution model ${executionModel}`);
  if (requestBody.stream !== false) fail('requestBody.stream must be exactly false');
  if (!Number.isSafeInteger(requestBody.max_tokens) || requestBody.max_tokens < 1 || requestBody.max_tokens > contestant.max_tokens_cap) fail(`requestBody.max_tokens must be a safe integer 1..${contestant.max_tokens_cap}`);
  if (!Array.isArray(requestBody.messages) || requestBody.messages.length !== 2) fail('requestBody.messages must be exactly 2 messages');
  const roles = ['system', 'user'];
  requestBody.messages.forEach((message, index) => {
    exactKeysV1(message, ['role', 'content'], `requestBody.messages[${index}]`);
    if (message.role !== roles[index]) fail(`requestBody.messages[${index}].role must equal ${roles[index]}`);
    if (typeof message.content !== 'string') fail(`requestBody.messages[${index}].content must be a string`);
  });
  const policy = contestant.provider_policy;
  const expectedKeys = ['allow_fallbacks', 'require_parameters', 'max_price', 'zdr'];
  if (policy.data_collection !== null) expectedKeys.push('data_collection');
  if (policy.only.length > 0) expectedKeys.push('only');
  exactKeysV1(requestBody.provider, expectedKeys, 'requestBody.provider');
  if (requestBody.provider.allow_fallbacks !== false || requestBody.provider.require_parameters !== true) fail('requestBody.provider must pin allow_fallbacks=false and require_parameters=true');
  exactKeysV1(requestBody.provider.max_price, ['prompt', 'completion'], 'requestBody.provider.max_price');
  if (requestBody.provider.max_price.prompt !== 0 || requestBody.provider.max_price.completion !== 0) fail('requestBody.provider.max_price must be exactly {prompt:0,completion:0}');
  if (requestBody.provider.zdr !== policy.zdr) fail('requestBody.provider.zdr must equal the contestant policy');
  if (policy.data_collection !== null && requestBody.provider.data_collection !== policy.data_collection) fail('requestBody.provider.data_collection must equal the contestant policy');
  if (policy.only.length > 0) {
    const only = requestBody.provider.only;
    if (!Array.isArray(only) || only.length !== policy.only.length || only.some((entry, index) => entry !== policy.only[index])) fail('requestBody.provider.only must exactly equal the reviewed contestant provider list');
  }
  if (Buffer.byteLength(JSON.stringify(requestBody), 'utf8') > MAX_BODY_BYTES) fail('requestBody exceeds the 3 MiB JSON ceiling');
}

function validateChatResponseV1(response, snapshot) {
  if (!isPlainObjectV1(response)) fail('OpenRouter chat response is malformed');
  if (!Array.isArray(response.choices) || response.choices.length < 1) fail('OpenRouter chat response has no choices');
  const first = response.choices[0];
  const message = first && typeof first === 'object' && !Array.isArray(first) ? first.message : null;
  if (!message || typeof message !== 'object' || Array.isArray(message)) fail('OpenRouter chat response message is missing');
  if (message.tool_calls != null && !(Array.isArray(message.tool_calls) && message.tool_calls.length === 0)) fail('OpenRouter contestant attempted a tool call; tools are not admitted');
  if (first.finish_reason !== 'stop') fail('OpenRouter contestant finish_reason must equal stop');
  if (typeof message.content !== 'string') fail('OpenRouter contestant returned non-text content');
  if (response.model !== snapshot.executionModel) fail(`OpenRouter response model must equal concrete execution model ${snapshot.executionModel}`);
  const router = response.openrouter_metadata;
  if (!isPlainObjectV1(router)) fail('OpenRouter successful response must include router metadata');
  if (router.requested !== snapshot.executionModel) fail(`OpenRouter router requested model must equal ${snapshot.executionModel}`);
  if (!Array.isArray(router.endpoints?.available)) fail('OpenRouter router metadata endpoints are missing');
  const selected = router.endpoints.available.filter((entry) => entry && typeof entry === 'object' && entry.selected === true);
  if (selected.length !== 1) fail('OpenRouter router metadata must identify exactly one selected endpoint');
  if (selected[0].model !== snapshot.executionModel) fail(`OpenRouter selected endpoint model must equal ${snapshot.executionModel}`);
  if (typeof selected[0].provider !== 'string' || selected[0].provider.length < 1 || selected[0].provider.length > 128) fail('OpenRouter selected endpoint provider is invalid');
  if (snapshot.scoredTrialEligible && selected[0].provider !== snapshot.reviewedProvider) fail(`OpenRouter selected endpoint provider must equal reviewed scored provider ${snapshot.reviewedProvider}`);
  return {
    content: message.content,
    reported_model: response.model,
    response_id: typeof response.id === 'string' ? response.id : null,
    usage: response.usage && typeof response.usage === 'object' ? response.usage : null,
    router_requested_model: router.requested,
    router_selected_model: selected[0].model,
    router_selected_provider: selected[0].provider,
  };
}

export async function runOpenRouterBrokerAttemptV1(directoryHandle, input) {
  if (!isPlainObjectV1(input)) fail('input must be a plain object');
  exactKeysV1(input, ['apiKey', 'requestBody', 'timeoutMs', 'contestant'], 'input');
  const { apiKey, requestBody, timeoutMs, contestant } = input;
  if (typeof apiKey !== 'string' || apiKey.length < 8 || apiKey.length > 512 || !/\S/.test(apiKey)) fail('apiKey must be a non-whitespace string of length 8..512');
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 300000) fail('timeoutMs must be a safe integer 1000..300000');
  validateContestantV1(contestant);
  const executionModel = resolveExecutionModelV1(contestant);
  validateRequestBodyV1(requestBody, contestant, executionModel);
  // Fresh immutable snapshot before the first await; no caller object references are retained.
  const policy = contestant.provider_policy;
  const provider = { allow_fallbacks: false, require_parameters: true, max_price: Object.freeze({ prompt: 0, completion: 0 }) };
  if (policy.data_collection !== null) provider.data_collection = policy.data_collection;
  provider.zdr = policy.zdr;
  if (policy.only.length > 0) provider.only = Object.freeze([...policy.only]);
  const snapshot = Object.freeze({
    apiKey,
    timeoutMs,
    executionModel,
    scoredTrialEligible: contestant.scored_trial_eligible,
    reviewedProvider: policy.only.length > 0 ? policy.only[0] : null,
    body: Object.freeze({
      model: requestBody.model,
      messages: Object.freeze([
        Object.freeze({ role: 'system', content: requestBody.messages[0].content }),
        Object.freeze({ role: 'user', content: requestBody.messages[1].content }),
      ]),
      max_tokens: requestBody.max_tokens,
      stream: false,
      provider: Object.freeze(provider),
    }),
  });
  // The ONLY provider-send callback of this module: created here, zero-argument, never returned,
  // never accepted from the caller, and invoked exactly once by the V8.3 boundary.
  const sendChatOnceV1 = async () => {
    const response = await globalThis.fetch(CHAT_URL, {
      method: 'POST',
      redirect: 'error',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${snapshot.apiKey}`,
        'content-type': 'application/json',
        'x-openrouter-metadata': 'enabled',
      },
      body: JSON.stringify(snapshot.body),
      signal: AbortSignal.timeout(snapshot.timeoutMs),
    });
    if (response.url !== CHAT_URL) fail(`chat completion final url must be exactly ${CHAT_URL}`);
    if (response.status !== 200) throw await httpErrorV1(response, snapshot.apiKey);
    const parsed = await readJsonBoundedV1(response, MAX_CHAT_RESPONSE_BYTES, 'OpenRouter chat completion');
    const validated = validateChatResponseV1(parsed, snapshot);
    const usage = validated.usage === null ? null : snapshotJsonValueV1(validated.usage, 'response.usage', 0);
    if (usage !== null && Buffer.byteLength(canonicalJsonV1(usage), 'utf8') > MAX_USAGE_CANONICAL_BYTES) fail('response.usage exceeds the 256 KiB canonical snapshot ceiling');
    const normalizedResult = Object.freeze({
      marker: RESULT_MARKER,
      content: validated.content,
      finish_reason: 'stop',
      reported_model: validated.reported_model,
      response_id: validated.response_id,
      usage,
      router_requested_model: validated.router_requested_model,
      router_selected_model: validated.router_selected_model,
      router_selected_provider: validated.router_selected_provider,
    });
    const digestPayload = {
      marker: DIGEST_MARKER,
      response_content_sha256: sha256HexV1(Buffer.from(validated.content, 'utf8')),
      response_content_bytes: Buffer.byteLength(validated.content, 'utf8'),
      finish_reason: 'stop',
      reported_model: validated.reported_model,
      response_id: validated.response_id,
      router_requested_model: validated.router_requested_model,
      router_selected_model: validated.router_selected_model,
      router_selected_provider: validated.router_selected_provider,
    };
    const resultDigest = sha256HexV1(Buffer.concat([Buffer.from(`${DIGEST_MARKER}\0`, 'utf8'), Buffer.from(canonicalJsonV1(digestPayload), 'utf8')]));
    return { resultDigest, value: normalizedResult };
  };
  return runBrokerProviderAttemptV1(directoryHandle, sendChatOnceV1);
}
