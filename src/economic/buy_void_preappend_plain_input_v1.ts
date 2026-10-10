import { types as utilTypes } from "node:util";

// This is a source-only input boundary, NOT payment, ledger, or runtime authority.
export const VOID_BUY_VOID_PREAPPEND_PLAIN_INPUT_V1 =
  "VOID_BUY_VOID_PREAPPEND_PLAIN_INPUT_V1";

const FIELDS = Object.freeze([
  "allocation_jsonl", "event", "prior_operator_events_jsonl",
  "request", "requests_jsonl",
]);
const MAX_VALUE_BYTES = 1_048_576;
const MAX_NODES = 10_000;
const MAX_DEPTH = 32;
const MAX_KEYS = 1024;
const MAX_ARRAY_ITEMS = 4096;

type State = { bytes: number; nodes: number; active: Set<object> };
export type BuyVoidPreappendPlainInputV1 = Readonly<{
  request: Record<string, unknown>;
  event: Record<string, unknown>;
  requests_jsonl: Buffer;
  prior_operator_events_jsonl: Buffer;
  allocation_jsonl: Buffer;
}>;

function hold(which: string): never {
  throw new Error("preappend_" + which + "_not_plain_data");
}

function consume(state: State, bytes: number, label: string): void {
  if (!Number.isSafeInteger(bytes) || bytes < 0) hold(label);
  state.bytes += bytes;
  state.nodes += 1;
  if (state.bytes > MAX_VALUE_BYTES || state.nodes > MAX_NODES) hold(label);
}

// Construct new, isolated JSON data in the original own-key order. No member
// of any caller object is ever read through a property get operation.
function copyValue(
  value: unknown, label: string, state: State, depth: number,
): unknown {
  if (depth > MAX_DEPTH) hold(label);
  if (value === null || typeof value === "boolean") {
    consume(state, 4, label);
    return value;
  }
  if (typeof value === "string") {
    const bytes = Buffer.byteLength(value, "utf8");
    if (bytes > MAX_VALUE_BYTES) hold(label);
    consume(state, bytes, label);
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    consume(state, 32, label);
    return value;
  }
  // utilTypes.isProxy precedes Array.isArray and all potentially trapped
  // object-inspection operations, including checks against revoked Proxies.
  if (!value || typeof value !== "object" || utilTypes.isProxy(value)) {
    return hold(label);
  }
  if (state.active.has(value)) hold(label);
  const isArray = Array.isArray(value);
  const prototype = Object.getPrototypeOf(value);
  if (
    (isArray && prototype !== Array.prototype) ||
    (!isArray && prototype !== Object.prototype && prototype !== null)
  ) hold(label);
  const keys = Reflect.ownKeys(value);
  if (isArray) {
    const length = Object.getOwnPropertyDescriptor(value, "length")?.value;
    if (
      !Number.isSafeInteger(length) || length < 0 ||
      length > MAX_ARRAY_ITEMS || keys.length !== length + 1
    ) hold(label);
    consume(state, length, label);
    const result: unknown[] = new Array(length);
    // A native Array inherits Object.prototype and might inherit toJSON.
    // An own, nonenumerable undefined data field blocks ambient serializers.
    Object.defineProperty(result, "toJSON", {
      value: undefined, enumerable: false,
      writable: false, configurable: false,
    });
    state.active.add(value);
    try {
      for (let i = 0; i < length; i += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
        if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
          hold(label);
        }
        result[i] = copyValue(descriptor.value, label, state, depth + 1);
      }
      return Object.freeze(result);
    } finally {
      state.active.delete(value);
    }
  }

  if (keys.length > MAX_KEYS) hold(label);
  consume(state, keys.length, label);
  // A null prototype cannot inherit an ambient Object.prototype.toJSON.
  const result: Record<string, unknown> = Object.create(null);
  state.active.add(value);
  try {
    for (const key of keys) {
      if (
        typeof key !== "string" ||
        ["toJSON", "__proto__", "prototype", "constructor"].includes(key)
      ) hold(label);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
        hold(label);
      }
      consume(state, Buffer.byteLength(key, "utf8"), label);
      Object.defineProperty(result, key, {
        value: copyValue(descriptor.value, label, state, depth + 1),
        enumerable: true, writable: false, configurable: false,
      });
    }
    return Object.freeze(result);
  } finally {
    state.active.delete(value);
  }
}

export function snapshotBuyVoidPreappendPlainInputV1(
  input: unknown,
): BuyVoidPreappendPlainInputV1 {
  if (
    !input || typeof input !== "object" || utilTypes.isProxy(input) ||
    Array.isArray(input)
  ) hold("input");
  const proto = Object.getPrototypeOf(input);
  if (proto !== Object.prototype && proto !== null) hold("input");
  const keys = Reflect.ownKeys(input);
  if (
    keys.length !== FIELDS.length ||
    keys.some(k => typeof k !== "string" || !FIELDS.includes(k))
  ) hold("input");
  const row: Record<string, unknown> = Object.create(null);
  for (const key of FIELDS) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
      hold("input");
    }
    row[key] = descriptor.value;
  }
  const state: State = { bytes: 0, nodes: 0, active: new Set() };
  const request = copyValue(row.request, "request", state, 0);
  const event = copyValue(row.event, "event", state, 0);
  if (!request || Array.isArray(request) || typeof request !== "object" ||
      !event || Array.isArray(event) || typeof event !== "object") {
    hold("input");
  }
  // Buffer fields deliberately remain opaque here. The existing native
  // intrinsic descriptor/length/copy guard is the sole authority over bytes.
  return Object.freeze({
    request: request as Record<string, unknown>,
    event: event as Record<string, unknown>,
    requests_jsonl: row.requests_jsonl as Buffer,
    prior_operator_events_jsonl: row.prior_operator_events_jsonl as Buffer,
    allocation_jsonl: row.allocation_jsonl as Buffer,
  });
}
