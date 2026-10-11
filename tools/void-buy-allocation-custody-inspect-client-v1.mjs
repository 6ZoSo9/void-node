import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { TextDecoder, types as utilTypes } from "node:util";

export const VOID_BUY_VOID_CUSTODY_INSPECT_CLIENT_V1 =
  "VOID_BUY_VOID_CUSTODY_INSPECT_CLIENT_V1";

export const VOID_BUY_VOID_CUSTODY_INSPECT_CLIENT_AUTHORITY_V1 = Object.freeze({
  source_only_unmounted: true,
  inspect_only: true,
  reserve_or_recover_method_available: false,
  no_customer_or_payment_fields: true,
  socket_path_and_owner_preflight_required: true,
  total_deadline_enforced: true,
  bounded_response_and_request_digest_required: true,
  socket_peer_credentials_authenticated: false,
  cross_uid_principal_separation_verified: false,
  protected_custody_verified: false,
  operation_performed: false,
  allocation_write: false,
  lock_release_authorized: false,
  payment_acceptance: false,
  runtime_integration: false,
  production_gate_ready: false,
  presale_activation: false,
  funds_movement: false,
});

const REQUEST_SCHEMA = "void_buy_void_allocation_custody_service_request_v2";
const RESPONSE_SCHEMA = "void_buy_void_allocation_custody_service_response_v2";
const SERVER_MARKER = "VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_V2";
const MAX_REQUEST_BYTES = 64 * 1024;
const MAX_RESPONSE_BYTES = 64 * 1024;
const MAX_TIMEOUT_MS = 5000;
// Bind the entire decoder call at module load: neither a later
// TextDecoder.prototype.decode nor a later Reflect.apply replacement may
// reinterpret the received socket bytes.
const UTF8 = new TextDecoder("utf-8", { fatal: true });
const UTF8_DECODE_BOUND_V1 = TextDecoder.prototype.decode.bind(UTF8);

function fail(code) {
  throw new Error("void_buy_void_custody_inspect_client_" + code);
}
function exactOwnData(input, keys) {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      utilTypes.isProxy(input) ||
      ![null, Object.prototype].includes(Object.getPrototypeOf(input))) {
    fail("config_shape_invalid");
  }
  const fields = Reflect.ownKeys(input);
  if (fields.length !== keys.length ||
      fields.some(key => typeof key !== "string" || !keys.includes(key))) {
    fail("config_fields_invalid");
  }
  const out = Object.create(null);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !Object.hasOwn(descriptor, "value") ||
        descriptor.enumerable !== true) fail("config_accessors_forbidden");
    Object.defineProperty(out, key, {
      value: descriptor.value, writable: false,
      enumerable: true, configurable: false,
    });
  }
  return Object.freeze(out);
}
function normalizeConfig(raw) {
  const value = exactOwnData(raw, [
    "socket_path", "expected_socket_uid", "expected_socket_gid", "timeout_ms",
  ]);
  if (process.platform !== "linux" ||
      typeof process.getuid !== "function" || process.getuid() <= 0) {
    fail("nonroot_linux_required");
  }
  const socket = value.socket_path;
  if (typeof socket !== "string" || socket.length < 3 ||
      !path.isAbsolute(socket) || path.resolve(socket) !== socket ||
      socket.includes("//") || socket.includes("\0") ||
      socket.endsWith("/")) fail("socket_path_invalid");
  if (![value.expected_socket_uid, value.expected_socket_gid].every(v =>
        Number.isSafeInteger(v) && v > 0 && v <= 0x7fffffff)) {
    fail("socket_identity_invalid");
  }
  if (!Number.isSafeInteger(value.timeout_ms) ||
      value.timeout_ms < 50 || value.timeout_ms > MAX_TIMEOUT_MS) {
    fail("timeout_invalid");
  }
  return Object.freeze({
    socket_path: socket, expected_socket_uid: value.expected_socket_uid,
    expected_socket_gid: value.expected_socket_gid,
    timeout_ms: value.timeout_ms,
  });
}
function sameIdentity(a, b) {
  return a.dev === b.dev && a.ino === b.ino && a.uid === b.uid &&
    a.gid === b.gid && a.mode === b.mode && a.nlink === b.nlink;
}
function observeSocket(config) {
  const directory = path.dirname(config.socket_path);
  // Reject symlink substitution of any named directory ancestor. The source
  // does not claim kernel SO_PEERCRED or live custody security equivalence.
  let walk = path.parse(directory).root;
  for (const component of directory.slice(walk.length).split(path.sep).filter(Boolean)) {
    walk = path.join(walk, component);
    const stat = fs.lstatSync(walk);
    if (!stat.isDirectory() || stat.isSymbolicLink()) fail("socket_ancestor_invalid");
  }
  const parent = fs.lstatSync(directory);
  if (parent.uid !== config.expected_socket_uid ||
      parent.gid !== config.expected_socket_gid ||
      (parent.mode & 0o777) !== 0o750) {
    fail("socket_parent_identity_invalid");
  }
  const leaf = fs.lstatSync(config.socket_path);
  if (!leaf.isSocket() || leaf.isSymbolicLink() || leaf.nlink !== 1 ||
      leaf.uid !== config.expected_socket_uid ||
      leaf.gid !== config.expected_socket_gid ||
      (leaf.mode & 0o777) !== 0o660) {
    fail("socket_leaf_identity_invalid");
  }
  return Object.freeze({ directory, parent, leaf });
}
function canonical(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort()
      .map(k => JSON.stringify(k) + ":" + canonical(value[k])).join(",") + "}";
  }
  fail("canonical_request_invalid");
}
function onlyFields(row, keys) {
  if (!row || typeof row !== "object" || Array.isArray(row) ||
      utilTypes.isProxy(row)) return false;
  const actual = Reflect.ownKeys(row);
  return actual.length === keys.length && keys.every(k =>
    Object.getOwnPropertyDescriptor(row, k)?.enumerable === true &&
    Object.hasOwn(Object.getOwnPropertyDescriptor(row, k), "value"));
}
function parseResponse(bytes, expectedDigest) {
  if (bytes.length < 3 || bytes.length > MAX_RESPONSE_BYTES ||
      bytes[bytes.length - 1] !== 0x0a) fail("response_framing_invalid");
  const decoded = UTF8_DECODE_BOUND_V1(bytes);
  if (decoded.includes("\r") || decoded.indexOf("\n") !== decoded.length - 1) {
    fail("response_multiline_invalid");
  }
  let value;
  try {
    value = JSON.parse(decoded.slice(0, -1), (_key, x) => {
      if (x !== null && typeof x === "object") Object.setPrototypeOf(x, null);
      return x;
    });
  } catch { fail("response_json_invalid"); }
  if (JSON.stringify(value) !== decoded.slice(0, -1)) {
    fail("response_noncanonical_json");
  }
  if (!onlyFields(value, ["schema", "marker", "version", "request_sha256", "decision"]) ||
      value.schema !== RESPONSE_SCHEMA || value.marker !== SERVER_MARKER ||
      value.version !== 2 || value.request_sha256 !== expectedDigest) {
    fail("response_identity_invalid");
  }
  const d = value.decision;
  if (!onlyFields(d, [
    "ok", "status", "record_id", "allocation_record_hash", "record_count",
    "tip_hash", "operation_performed", "custody_cross_uid_lock_participation_verified",
    "web_payment_writer_cross_uid_lock_participation_verified",
    "payment_capacity_lock_verified", "allocation_handoff_atomicity_proven",
    "runtime_integration", "payment_acceptance", "transaction_broadcast", "funds_movement",
  ]) || d.ok !== true || d.status !== "inspected" ||
      d.record_id !== null || d.allocation_record_hash !== null ||
      !Number.isSafeInteger(d.record_count) || d.record_count < 0 ||
      d.record_count > 100_000 ||
      typeof d.tip_hash !== "string" ||
      !/^sha256:[0-9a-f]{64}$/u.test(d.tip_hash) ||
      (d.record_count === 0 && d.tip_hash !== "sha256:" + "0".repeat(64)) ||
      d.operation_performed !== false ||
      d.custody_cross_uid_lock_participation_verified !== false ||
      d.web_payment_writer_cross_uid_lock_participation_verified !== false ||
      d.payment_capacity_lock_verified !== false ||
      d.allocation_handoff_atomicity_proven !== false ||
      d.runtime_integration !== false || d.payment_acceptance !== false ||
      d.transaction_broadcast !== false || d.funds_movement !== false) {
    fail("response_decision_unqualified");
  }
  return Object.freeze({
    marker: VOID_BUY_VOID_CUSTODY_INSPECT_CLIENT_V1,
    status: "source_inspected",
    ok: true,
    record_count: d.record_count,
    tip_hash: d.tip_hash,
    socket_peer_credentials_authenticated: false,
    cross_uid_principal_separation_verified: false,
    protected_custody_verified: false,
    operation_performed: false,
    allocation_write: false,
    lock_release_authorized: false,
    payment_acceptance: false,
    runtime_integration: false,
    production_gate_ready: false,
    presale_activation: false,
    funds_movement: false,
  });
}
function inspectWire(config, line) {
  return new Promise((resolve, reject) => {
    const startedAt = process.hrtime.bigint();
    const socket = net.createConnection({ path: config.socket_path });
    let done = false;
    const chunks = [];
    let length = 0;
    const complete = (error = null, bytes = null) => {
      if (done) return;
      done = true;
      clearTimeout(deadline);
      socket.destroy();
      if (!error && process.hrtime.bigint() - startedAt >
          BigInt(config.timeout_ms) * 1_000_000n) {
        error = new Error("socket_total_deadline_exceeded");
      }
      if (error) reject(error);
      else resolve(bytes);
    };
    const deadline = setTimeout(() =>
      complete(new Error("socket_total_deadline_exceeded")), config.timeout_ms);
    deadline.unref?.();
    socket.once("connect", () => socket.end(line));
    socket.on("data", chunk => {
      length += chunk.length;
      if (length > MAX_RESPONSE_BYTES) {
        complete(new Error("socket_response_too_large"));
      } else {
        chunks.push(chunk);
      }
    });
    socket.once("end", () => complete(null, Buffer.concat(chunks, length)));
    socket.once("error", error => complete(error));
    socket.once("close", hadError => {
      if (!done) complete(new Error(hadError ? "socket_io_failed" : "socket_truncated"));
    });
  });
}
export async function inspectVoidBuyAllocationCustodyServiceV2ReadOnlyV1(raw) {
  let config;
  try { config = normalizeConfig(raw); }
  catch { return held("config_invalid"); }
  try {
    const before = observeSocket(config);
    const request = Object.freeze({
      schema: REQUEST_SCHEMA, marker: SERVER_MARKER,
      version: 2, method: "inspect", request: Object.freeze({}),
    });
    const expectedDigest = "sha256:" + crypto.createHash("sha256")
      .update(Buffer.from(canonical(request), "utf8")).digest("hex");
    // V2 server requires the exact sorted canonical JSON byte framing.
    // A semantically equal JSON.stringify order must still be rejected.
    const bytes = Buffer.from(canonical(request) + "\n", "utf8");
    if (bytes.length > MAX_REQUEST_BYTES) fail("request_too_large");
    const received = await inspectWire(config, bytes);
    const after = observeSocket(config);
    if (!sameIdentity(before.parent, after.parent) ||
        !sameIdentity(before.leaf, after.leaf)) fail("socket_generation_changed");
    return parseResponse(received, expectedDigest);
  } catch (error) {
    // Preserve only fixed source-defined diagnostic codes; never echo a raw
    // filesystem exception, path, response bytes or peer-controlled reason.
    const code = error instanceof Error ? error.message : "";
    const safe = new Set([
      "socket_total_deadline_exceeded",
      "socket_response_too_large",
      "socket_io_failed",
      "socket_truncated",
      "void_buy_void_custody_inspect_client_response_framing_invalid",
      "void_buy_void_custody_inspect_client_response_multiline_invalid",
      "void_buy_void_custody_inspect_client_response_json_invalid",
      "void_buy_void_custody_inspect_client_response_noncanonical_json",
      "void_buy_void_custody_inspect_client_response_identity_invalid",
      "void_buy_void_custody_inspect_client_response_decision_unqualified",
      "void_buy_void_custody_inspect_client_socket_generation_changed",
    ]);
    return held(safe.has(code) ? code : "inspection_unqualified");
  }
}
function held(reason) {
  return Object.freeze({
    marker: VOID_BUY_VOID_CUSTODY_INSPECT_CLIENT_V1,
    status: "held", ok: false, reason,
    record_count: null, tip_hash: null,
    socket_peer_credentials_authenticated: false,
    cross_uid_principal_separation_verified: false,
    protected_custody_verified: false,
    operation_performed: false,
    allocation_write: false,
    lock_release_authorized: false,
    payment_acceptance: false,
    runtime_integration: false,
    production_gate_ready: false,
    presale_activation: false,
    funds_movement: false,
  });
}
