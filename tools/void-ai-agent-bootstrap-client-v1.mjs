#!/usr/bin/env node
import {
  createHash,
  createPublicKey,
  verify as verifySignature,
} from "node:crypto";
import {
  closeSync,
  constants,
  fchmodSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const VOID_AI_AGENT_BOOTSTRAP_CLIENT_V1 =
  "VOID_AI_AGENT_BOOTSTRAP_CLIENT_V1";
export const VOID_AI_AGENT_BOOTSTRAP_RESULT_SCHEMA_V1 =
  "void_ai_agent_bootstrap_result_v1";

const WELL_KNOWN_MARKER =
  "VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1";
const WELL_KNOWN_PROTOCOL =
  "void-agent-discovery-well-known/1";
const NETWORK_AUTHENTICITY_MARKER =
  "VOID_OFFICIAL_NETWORK_AUTHENTICITY_WELL_KNOWN_V1";
const NETWORK_AUTHENTICITY_PROTOCOL =
  "void-network-authenticity/1";
const NETWORK_AUTHENTICITY_SIGNATURE_DOMAIN =
  "VOID_OFFICIAL_NETWORK_AUTHENTICITY_ROOT_V2";
const NETWORK_AUTHENTICITY_KEY_ID =
  "ed25519:00e7609bf643b41c7cae625c3ae51f5d55c06ec1adba35e8eb80300c64e77a7c";
const NETWORK_AUTHENTICITY_PAYLOAD_SHA256 =
  "3c3af2b3f7753e03e244c6f2520bcc0501b1b6f1eacea583a9a8e4fe32b8cdf3";
const NETWORK_AUTHENTICITY_GENESIS_SHA256 =
  "22f42ef6cfa8e4ebfbc5ea98cdc536ec04c1bb4ddb15885b45b1ac02d0f122ab";
const NETWORK_AUTHENTICITY_CHECKPOINT_TAG =
  "ckpt-official-network-authenticity-root-public-admission-v2-1-post-merge-exact-green-20260725T144005Z";
const NETWORK_AUTHENTICITY_CHECKPOINT_COMMIT =
  "b8e93d1d0b84e917c16a2d5cdfc195fcb6e4e8af";
const NETWORK_AUTHENTICITY_RETURN_ZIP_SHA256 =
  "8a920f18636c86fff4d6386073b2980092df3c6b95a180bfd8ce04f5e22969d9";
const NETWORK_AUTHENTICITY_SUPERSEDED_PAYLOAD_SHA256 =
  "b624f7bb029e5b3eca8b2e14050711d4f764d2d39bba56455f1f94697de2708e";
const NETWORK_AUTHENTICITY_QUARANTINED_KEY_ID =
  "ed25519:0ccca842c156fc87af3279b15830fca826db1225d669b790e97705e2b402362b";
const REVIEWED_SURFACE_CONTRACTS_V1 = Object.freeze({
  canonical_discovery: Object.freeze({
    marker: "VOID_AI_AGENT_DISCOVERY_CONTRACT_WALL_V1",
    canonical_sha256:
      "c27ed5e98a3171dadfd9ce136a249bd072b7c9bcb53f0330069f9dc10b65b93d",
  }),
  capabilities: Object.freeze({
    marker: "VOID_AI_AGENT_CAPABILITY_WELL_KNOWN_V1",
    canonical_sha256:
      "c7d4d75f97599a9accaca699c6918c8345712045e18c9c35e0d1a415a875eb4f",
  }),
  authentication: Object.freeze({
    marker: "VOID_AI_AGENT_AUTHENTICATION_WELL_KNOWN_V1",
    canonical_sha256:
      "b25bd797ede8464053a21f065f812d7d85effccf6df8185f0b30e002d28b9881",
  }),
  first_contact: Object.freeze({
    marker: "VOID_AI_AGENT_FIRST_CONTACT_V1",
    canonical_sha256:
      "a5cfc0a39644ea8b4665dca46c82d9360a25b035cd0f91409c3761000a1be52b",
  }),
  external_opportunity_intake: Object.freeze({
    marker: "VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_V1",
    canonical_sha256:
      "5b16d50b6e4991ff64ad78a51421ed151d32a3d6340192a15167f3d5f096dd42",
  }),
});

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_BYTES = 1_048_576;
const MAX_ALLOWED_BYTES = 4_194_304;
const RESPONSE_REJECTION_TEARDOWN_MS = 250;
const BODY_READ_YIELD_INTERVAL = 64;
const PROC_FD_ROOT = "/proc/self/fd";
const activeTransportLeases = new WeakMap();

const ROUTES = Object.freeze({
  well_known_discovery:
    "/.well-known/void-agent-discovery.json",
  network_authenticity:
    "/.well-known/void-network-authenticity.json",
  canonical_discovery:
    "/public-node/agents/discovery-v1.json",
  capabilities:
    "/.well-known/void-agent-capabilities.json",
  authentication:
    "/.well-known/void-agent-authentication.json",
  first_contact:
    "/public-node/agents/first-contact-v1.json",
  external_opportunity_intake:
    "/.well-known/void-agent-intake-capability-v1.json",
});

function usage() {
  return [
    "VOID AI Agent Bootstrap Client V1",
    "",
    "Usage:",
    "  node tools/void-ai-agent-bootstrap-client-v1.mjs \\",
    "    --base-url https://example.invalid [options]",
    "",
    "Options:",
    "  --base-url URL       Required network origin.",
    "  --output PATH        Optional mode-0600 JSON output.",
    "  --pretty             Pretty-print JSON.",
    "  --timeout-ms N       Per-request timeout (default 10000).",
    "  --max-bytes N        Per-response maximum (default 1048576).",
    "  --help               Show this help.",
    "",
    "Authority:",
    "  GET only; no redirects; same origin only; no credentials,",
    "  wallet material, signing, submission, payment, or mutation.",
  ].join("\n");
}

function validateBoundInteger(
  value,
  label,
  maximum,
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > maximum
  ) {
    throw new Error(
      `${label} must be an integer from 1 through ${maximum}`,
    );
  }
  return value;
}

function parsePositiveInteger(
  raw,
  label,
  maximum,
) {
  if (
    typeof raw !== "string" ||
    !/^[1-9][0-9]*$/.test(raw)
  ) {
    throw new Error(
      `${label} must be an integer from 1 through ${maximum}`,
    );
  }

  return validateBoundInteger(
    Number(raw),
    label,
    maximum,
  );
}

export function parseBootstrapClientArgsV1(argv) {
  const output = {
    baseUrl: "",
    outputPath: "",
    pretty: false,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    maxBytes: DEFAULT_MAX_BYTES,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];

    if (item === "--help" || item === "-h") {
      output.help = true;
      continue;
    }
    if (item === "--pretty") {
      output.pretty = true;
      continue;
    }
    if (item === "--base-url") {
      output.baseUrl = String(argv[index + 1] || "");
      index += 1;
      continue;
    }
    if (item === "--output") {
      output.outputPath = String(argv[index + 1] || "");
      index += 1;
      continue;
    }
    if (item === "--timeout-ms") {
      output.timeoutMs = parsePositiveInteger(
        argv[index + 1],
        "timeout-ms",
        MAX_TIMEOUT_MS,
      );
      index += 1;
      continue;
    }
    if (item === "--max-bytes") {
      output.maxBytes = parsePositiveInteger(
        argv[index + 1],
        "max-bytes",
        MAX_ALLOWED_BYTES,
      );
      index += 1;
      continue;
    }

    throw new Error(`unknown argument: ${item}`);
  }

  return output;
}

function isLoopbackHostname(hostname) {
  const normalized = String(hostname || "")
    .trim()
    .toLowerCase();

  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "[::1]"
  );
}

export function normalizeBootstrapBaseUrlV1(raw) {
  const value = new URL(String(raw || ""));

  if (value.username || value.password) {
    throw new Error(
      "base URL credentials are forbidden",
    );
  }
  if (
    value.protocol !== "https:" &&
    !(
      value.protocol === "http:" &&
      isLoopbackHostname(value.hostname)
    )
  ) {
    throw new Error(
      "base URL must use HTTPS or loopback HTTP",
    );
  }
  if (value.search || value.hash) {
    throw new Error(
      "base URL query and fragment are forbidden",
    );
  }

  return new URL("/", value);
}

function sameOriginUrl(base, routeOrUrl) {
  const resolved = new URL(routeOrUrl, base);

  if (resolved.origin !== base.origin) {
    throw new Error(
      `cross-origin route forbidden: ${resolved.href}`,
    );
  }
  if (resolved.username || resolved.password) {
    throw new Error(
      "route credentials are forbidden",
    );
  }

  return resolved;
}

function requireExactObjectKeys(value, expected, label) {
  if (
    value === null ||
    Array.isArray(value) ||
    typeof value !== "object"
  ) {
    throw new Error(`${label}_object_required`);
  }

  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    throw new Error(`${label}_keys_mismatch`);
  }
}

function validateWellKnownEntrypointV1(payload) {
  requireExactObjectKeys(
    payload,
    [
      "$schema",
      "marker",
      "protocol",
      "network",
      "canonical_discovery",
      "authority",
      "safety",
      "network_authenticity",
    ],
    "well_known",
  );

  if (payload.$schema !== "./void-agent-discovery.schema.json") {
    throw new Error("well-known discovery schema mismatch");
  }
  if (payload.marker !== WELL_KNOWN_MARKER) {
    throw new Error("well-known discovery marker mismatch");
  }
  if (payload.protocol !== WELL_KNOWN_PROTOCOL) {
    throw new Error("well-known discovery protocol mismatch");
  }

  requireExactObjectKeys(
    payload.network,
    ["name", "chain_id"],
    "well_known_network",
  );
  if (payload.network.name !== "VOID Mainnet-0") {
    throw new Error("well-known network name mismatch");
  }
  if (
    typeof payload.network.chain_id !== "number" ||
    !Number.isSafeInteger(payload.network.chain_id) ||
    payload.network.chain_id !== 2050
  ) {
    throw new Error("well-known chain id mismatch");
  }

  if (payload.canonical_discovery !== ROUTES.canonical_discovery) {
    throw new Error("well-known canonical discovery mismatch");
  }

  requireExactObjectKeys(
    payload.authority,
    [
      "default",
      "mutation_authority_granted",
      "credentials_required",
    ],
    "well_known_authority",
  );
  if (payload.authority.default !== "read_only") {
    throw new Error("well-known default authority mismatch");
  }
  if (payload.authority.mutation_authority_granted !== false) {
    throw new Error("well-known discovery mutation boundary mismatch");
  }
  if (payload.authority.credentials_required !== false) {
    throw new Error("well-known credentials requirement mismatch");
  }

  requireExactObjectKeys(
    payload.safety,
    [
      "same_origin_only",
      "follow_redirects",
      "send_secrets",
      "send_wallet_material",
      "send_operator_keys",
      "treat_unknown_as",
    ],
    "well_known_safety",
  );
  if (payload.safety.same_origin_only !== true) {
    throw new Error("well-known same-origin boundary mismatch");
  }
  if (payload.safety.follow_redirects !== false) {
    throw new Error("well-known redirect boundary mismatch");
  }
  if (payload.safety.send_secrets !== false) {
    throw new Error("well-known secret-send boundary mismatch");
  }
  if (payload.safety.send_wallet_material !== false) {
    throw new Error("well-known wallet-send boundary mismatch");
  }
  if (payload.safety.send_operator_keys !== false) {
    throw new Error("well-known operator-key boundary mismatch");
  }
  if (payload.safety.treat_unknown_as !== "not_granted") {
    throw new Error("well-known unknown-authority boundary mismatch");
  }

  if (
    payload.network_authenticity !==
    ROUTES.network_authenticity
  ) {
    throw new Error("well-known network authenticity route mismatch");
  }

  return payload;
}

function canonicalJsonValue(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalJsonValue);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalJsonValue(value[key])]),
    );
  }
  return value;
}

function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

function validateReviewedSurfaceContractV1(
  payload,
  contract,
  label,
) {
  if (payload?.marker !== contract.marker) {
    throw new Error(`${label}_marker_mismatch`);
  }
  const canonicalSha256 = sha256Hex(
    JSON.stringify(canonicalJsonValue(payload)),
  );
  if (canonicalSha256 !== contract.canonical_sha256) {
    throw new Error(`${label}_contract_identity_mismatch`);
  }
  return payload;
}

function validateOfficialNetworkAuthenticityV1(payload) {
  requireExactObjectKeys(
    payload,
    [
      "$schema",
      "marker",
      "protocol",
      "status",
      "network",
      "admission",
      "verification",
      "supersession",
      "authority",
      "safety",
    ],
    "network_authenticity",
  );

  if (payload.$schema !== "./void-network-authenticity.schema.json") {
    throw new Error("network authenticity schema mismatch");
  }
  if (payload.marker !== NETWORK_AUTHENTICITY_MARKER) {
    throw new Error("network authenticity marker mismatch");
  }
  if (payload.protocol !== NETWORK_AUTHENTICITY_PROTOCOL) {
    throw new Error("network authenticity protocol mismatch");
  }
  if (payload.status !== "public_verification_available") {
    throw new Error("network authenticity status mismatch");
  }

  requireExactObjectKeys(
    payload.network,
    [
      "name",
      "chain_id",
      "legacy_genesis_name",
      "genesis_sha256",
    ],
    "network_authenticity_network",
  );
  if (
    payload.network.name !== "VOID Mainnet-0" ||
    typeof payload.network.chain_id !== "number" ||
    !Number.isSafeInteger(payload.network.chain_id) ||
    payload.network.chain_id !== 2050 ||
    payload.network.legacy_genesis_name !== "VOID-DEV" ||
    payload.network.genesis_sha256 !== NETWORK_AUTHENTICITY_GENESIS_SHA256
  ) {
    throw new Error("network authenticity network mismatch");
  }

  requireExactObjectKeys(
    payload.admission,
    [
      "status",
      "checkpoint_tag",
      "checkpoint_commit",
      "source_public_return_zip_sha256",
    ],
    "network_authenticity_admission",
  );
  if (
    payload.admission.status !== "admitted_unactivated" ||
    payload.admission.checkpoint_tag !== NETWORK_AUTHENTICITY_CHECKPOINT_TAG ||
    payload.admission.checkpoint_commit !== NETWORK_AUTHENTICITY_CHECKPOINT_COMMIT ||
    payload.admission.source_public_return_zip_sha256 !==
      NETWORK_AUTHENTICITY_RETURN_ZIP_SHA256
  ) {
    throw new Error("network authenticity admission mismatch");
  }

  requireExactObjectKeys(
    payload.verification,
    [
      "algorithm",
      "signature_domain",
      "key_id",
      "payload_sha256",
      "public_key_pem",
      "signature_base64",
      "signed_payload",
    ],
    "network_authenticity_verification",
  );
  if (
    payload.verification.algorithm !== "Ed25519" ||
    payload.verification.signature_domain !==
      NETWORK_AUTHENTICITY_SIGNATURE_DOMAIN
  ) {
    throw new Error("network authenticity verification contract mismatch");
  }
  if (payload.verification.key_id !== NETWORK_AUTHENTICITY_KEY_ID) {
    throw new Error("network authenticity key id mismatch");
  }
  if (
    payload.verification.payload_sha256 !==
    NETWORK_AUTHENTICITY_PAYLOAD_SHA256
  ) {
    throw new Error("network authenticity payload id mismatch");
  }

  requireExactObjectKeys(
    payload.supersession,
    [
      "superseded_payload_sha256",
      "quarantined_key_id",
      "quarantined_candidate_admitted",
    ],
    "network_authenticity_supersession",
  );
  if (
    payload.supersession.superseded_payload_sha256 !==
      NETWORK_AUTHENTICITY_SUPERSEDED_PAYLOAD_SHA256 ||
    payload.supersession.quarantined_key_id !==
      NETWORK_AUTHENTICITY_QUARANTINED_KEY_ID ||
    payload.supersession.quarantined_candidate_admitted !== false
  ) {
    throw new Error("network authenticity supersession mismatch");
  }

  const falseAuthorityKeys = [
    "mutation_authority_granted",
    "runtime_authority_granted",
    "service_enablement_granted",
    "wallet_authority_granted",
    "validator_authority_granted",
    "work_credit_authority_granted",
    "buy_void_authority_granted",
    "economic_authority_granted",
    "third_party_network_control_granted",
  ];
  requireExactObjectKeys(
    payload.authority,
    ["verification_only", ...falseAuthorityKeys],
    "network_authenticity_authority",
  );
  if (
    payload.authority.verification_only !== true ||
    falseAuthorityKeys.some((key) => payload.authority[key] !== false)
  ) {
    throw new Error("network authenticity authority mismatch");
  }

  requireExactObjectKeys(
    payload.safety,
    [
      "private_key_present",
      "credentials_required",
      "send_secrets",
      "send_wallet_material",
      "send_operator_keys",
      "follow_redirects",
      "treat_unknown_as",
    ],
    "network_authenticity_safety",
  );
  if (
    payload.safety.private_key_present !== false ||
    payload.safety.credentials_required !== false ||
    payload.safety.send_secrets !== false ||
    payload.safety.send_wallet_material !== false ||
    payload.safety.send_operator_keys !== false ||
    payload.safety.follow_redirects !== false ||
    payload.safety.treat_unknown_as !== "not_official"
  ) {
    throw new Error("network authenticity safety mismatch");
  }

  const signedPayloadBytes = Buffer.from(
    `${JSON.stringify(
      canonicalJsonValue(payload.verification.signed_payload),
    )}\n`,
    "utf8",
  );
  const payloadDigest = sha256Hex(signedPayloadBytes);
  if (
    payloadDigest !== NETWORK_AUTHENTICITY_PAYLOAD_SHA256 ||
    payload.verification.payload_sha256 !== payloadDigest
  ) {
    throw new Error("network authenticity payload digest mismatch");
  }

  let publicKey;
  try {
    publicKey = createPublicKey(payload.verification.public_key_pem);
  } catch {
    throw new Error("network authenticity public key invalid");
  }
  if (publicKey.asymmetricKeyType !== "ed25519") {
    throw new Error("network authenticity public key type mismatch");
  }
  const derivedKeyId = `ed25519:${sha256Hex(
    publicKey.export({ format: "der", type: "spki" }),
  )}`;
  if (
    derivedKeyId !== NETWORK_AUTHENTICITY_KEY_ID ||
    payload.verification.key_id !== derivedKeyId
  ) {
    throw new Error("network authenticity public key identity mismatch");
  }

  const rawSignature = payload.verification.signature_base64;
  if (typeof rawSignature !== "string") {
    throw new Error("network authenticity signature invalid");
  }
  const signature = Buffer.from(rawSignature, "base64");
  if (
    signature.length !== 64 ||
    signature.toString("base64") !== rawSignature ||
    !verifySignature(
      null,
      signedPayloadBytes,
      publicKey,
      signature,
    )
  ) {
    throw new Error("network authenticity signature invalid");
  }

  return payload;
}

function requireExactResponseUrl(response, requestedUrl) {
  if (response?.redirected === true) {
    throw new Error("response_redirected_forbidden");
  }

  const raw = response?.url;
  if (typeof raw !== "string" || raw.length === 0) {
    throw new Error("response_final_url_missing");
  }

  let finalUrl;
  try {
    finalUrl = new URL(raw);
  } catch {
    throw new Error("response_final_url_invalid");
  }

  if (finalUrl.href !== requestedUrl.href) {
    throw new Error("response_final_url_mismatch");
  }
}

function readExactResponseStatus(response) {
  let status;
  let ok;
  try {
    status = response?.status;
    ok = response?.ok;
  } catch {
    throw new Error("response_status_metadata_unavailable");
  }

  if (
    typeof status !== "number" ||
    !Number.isSafeInteger(status) ||
    status < 100 ||
    status > 599
  ) {
    throw new Error("response_status_invalid");
  }
  if (typeof ok !== "boolean") {
    throw new Error("response_ok_invalid");
  }
  if (ok !== (status >= 200 && status < 300)) {
    throw new Error("response_ok_status_mismatch");
  }

  return status;
}

function parseDeclaredResponseLength(response) {
  const raw = response.headers.get("content-length");
  if (raw === null) return null;

  if (!/^(0|[1-9][0-9]*)$/.test(raw)) {
    throw new Error(
      `response_invalid_content_length:${raw}`,
    );
  }

  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(
      `response_invalid_content_length:${raw}`,
    );
  }

  return value;
}

function deadlineError(signal) {
  return signal.reason instanceof Error
    ? signal.reason
    : new Error("bootstrap_request_deadline_exceeded");
}

function awaitWithinOwnedDeadline(promise, signal) {
  if (signal.aborted) {
    return Promise.reject(deadlineError(signal));
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const onAbort = () => {
      if (settled) return;
      settled = true;
      reject(deadlineError(signal));
    };

    signal.addEventListener("abort", onAbort, {
      once: true,
    });

    Promise.resolve(promise).then(
      (value) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

async function settleCancellationBounded(cancellation) {
  if (!cancellation || typeof cancellation.then !== "function") {
    return;
  }

  let timeout = null;
  try {
    await Promise.race([
      Promise.resolve(cancellation).catch(() => undefined),
      new Promise((resolve) => {
        timeout = setTimeout(
          resolve,
          RESPONSE_REJECTION_TEARDOWN_MS,
        );
      }),
    ]);
  } finally {
    if (timeout !== null) clearTimeout(timeout);
  }
}

function getTransportOriginLeases(fetchImpl, create = false) {
  let originLeases = activeTransportLeases.get(fetchImpl);
  if (!originLeases && create) {
    originLeases = new Map();
    activeTransportLeases.set(fetchImpl, originLeases);
  }
  return originLeases ?? null;
}

function makeTransportLease(fetchImpl, origin, acquisition) {
  const lease = {
    acquisition,
    pendingRetentions: 0,
    releaseRequested: false,
    poisoned: false,
    released: false,
    retain(promise) {
      if (!promise || typeof promise.then !== "function") {
        return;
      }
      lease.pendingRetentions += 1;
      const settle = () => {
        lease.pendingRetentions -= 1;
        lease.maybeRelease();
      };
      Promise.resolve(promise).then(settle, settle);
    },
    poison() {
      lease.poisoned = true;
    },
    maybeRelease() {
      if (
        lease.released ||
        lease.poisoned ||
        !lease.releaseRequested ||
        lease.pendingRetentions !== 0
      ) {
        return;
      }
      lease.released = true;
      const originLeases = getTransportOriginLeases(fetchImpl);
      if (originLeases?.get(origin) === lease) {
        originLeases.delete(origin);
        if (originLeases.size === 0) {
          activeTransportLeases.delete(fetchImpl);
        }
      }
    },
    release() {
      lease.releaseRequested = true;
      lease.maybeRelease();
    },
  };
  return lease;
}

async function rejectResponseBodyBounded(
  response,
  reader,
  controller,
  transportLease = null,
  knownBody = undefined,
) {
  if (!controller.signal.aborted) {
    controller.abort(
      new Error("bootstrap_response_rejected"),
    );
  }

  let body = knownBody;
  let cancellation = null;
  try {
    if (reader !== null && reader !== undefined) {
      const cancel = reader.cancel;
      if (typeof cancel !== "function") {
        transportLease?.poison();
        return;
      }
      cancellation = cancel.call(reader);
    } else {
      if (body === undefined) {
        body = response?.body;
      }
      if (!body) return;

      const cancel = body.cancel;
      if (typeof cancel !== "function") {
        transportLease?.poison();
        return;
      }
      cancellation = cancel.call(body);
    }
  } catch (_error) {
    // A cleanup attempt that cannot even start provides no terminal witness.
    // Preserve the already-known response rejection and keep this exact
    // transport/origin generation quarantined for the process lifetime.
    transportLease?.poison();
    return;
  }

  if (!cancellation || typeof cancellation.then !== "function") {
    transportLease?.poison();
    return;
  }

  const observedCancellation = Promise.resolve(cancellation).then(
    () => undefined,
    () => {
      // A rejected cleanup promise is terminal for the attempt, but not proof
      // that the rejected response resource actually closed.
      transportLease?.poison();
    },
  );
  transportLease?.retain(observedCancellation);
  await settleCancellationBounded(observedCancellation);
}

async function acquireResponseBounded(
  fetchImpl,
  url,
  init,
  controller,
) {
  const origin = url.origin;
  const originLeases = getTransportOriginLeases(fetchImpl, true);
  if (originLeases.has(origin)) {
    throw new Error(
      "bootstrap_fetch_acquisition_quarantined",
    );
  }

  const acquisition = Promise.resolve().then(
    () => fetchImpl(url, init),
  );
  const lease = makeTransportLease(fetchImpl, origin, acquisition);
  originLeases.set(origin, lease);

  // If the logical request times out before a custom fetch settles, retain
  // ownership of that exact generation. A late Response is torn down once,
  // and unresolved cancellation keeps only that exact origin quarantined
  // without extending the participant-facing deadline.
  acquisition.then(
    async (response) => {
      if (controller.signal.aborted) {
        try {
          await rejectResponseBodyBounded(
            response,
            null,
            controller,
            lease,
          );
        } catch (_error) {
          // The participant-facing deadline is already terminal.
        } finally {
          lease.release();
        }
      }
    },
    () => {
      lease.release();
    },
  ).catch(() => undefined);

  try {
    const response = await awaitWithinOwnedDeadline(
      acquisition,
      controller.signal,
    );
    return { response, lease };
  } catch (error) {
    if (!controller.signal.aborted) {
      lease.release();
    }
    throw error;
  }
}

async function boundedRead(
  response,
  maxBytes,
  controller,
  transportLease,
) {
  let declared;
  try {
    declared = parseDeclaredResponseLength(response);
  } catch (error) {
    await rejectResponseBodyBounded(
      response,
      null,
      controller,
      transportLease,
    );
    throw error;
  }

  if (declared !== null && declared > maxBytes) {
    const primary = new Error(
      `response_too_large:${declared}`,
    );
    await rejectResponseBodyBounded(
      response,
      null,
      controller,
      transportLease,
    );
    throw primary;
  }

  let body;
  try {
    body = response.body;
  } catch (_error) {
    if (!controller.signal.aborted) {
      controller.abort(
        new Error("bootstrap_response_rejected"),
      );
    }
    transportLease?.poison();
    throw new Error("response_body_unavailable");
  }

  if (!body) {
    if (declared === null || declared === 0) {
      return "";
    }
    const primary = new Error(
      "response_body_unavailable",
    );
    await rejectResponseBodyBounded(
      response,
      null,
      controller,
      transportLease,
      body,
    );
    throw primary;
  }

  let getReader;
  try {
    getReader = body.getReader;
  } catch (_error) {
    const primary = new Error(
      "response_body_reader_unavailable",
    );
    await rejectResponseBodyBounded(
      response,
      null,
      controller,
      transportLease,
      body,
    );
    throw primary;
  }

  if (typeof getReader !== "function") {
    const primary = new Error(
      "response_body_reader_unavailable",
    );
    await rejectResponseBodyBounded(
      response,
      null,
      controller,
      transportLease,
      body,
    );
    throw primary;
  }

  let reader;
  try {
    reader = getReader.call(body);
  } catch (_error) {
    const primary = new Error(
      "response_body_reader_unavailable",
    );
    await rejectResponseBodyBounded(
      response,
      null,
      controller,
      transportLease,
      body,
    );
    throw primary;
  }

  const chunks = [];
  let total = 0;
  let admittedReads = 0;

  while (true) {
    const readPromise = Promise.resolve().then(
      () => reader.read(),
    );
    let readResult;
    try {
      readResult = await awaitWithinOwnedDeadline(
        readPromise,
        controller.signal,
      );
    } catch (error) {
      if (controller.signal.aborted) {
        transportLease?.retain(readPromise);
        await rejectResponseBodyBounded(
          response,
          reader,
          controller,
          transportLease,
          body,
        );
      } else {
        await rejectResponseBodyBounded(
          response,
          reader,
          controller,
          transportLease,
          body,
        );
      }
      throw error;
    }

    let done;
    let value;
    let chunkLength;
    let chunk;
    try {
      if (
        readResult === null ||
        Array.isArray(readResult) ||
        typeof readResult !== "object" ||
        typeof readResult.done !== "boolean"
      ) {
        throw new Error("response_body_read_result_invalid");
      }

      ({ done, value } = readResult);
      if (done) break;

      if (!(value instanceof Uint8Array)) {
        throw new Error("response_body_read_chunk_invalid");
      }
      chunkLength = value.byteLength;
      if (chunkLength === 0) {
        throw new Error("response_body_zero_progress_chunk");
      }
      if (chunkLength > maxBytes - total) {
        throw new Error(
          `response_too_large:${total + chunkLength}`,
        );
      }

      // The configured byte ceiling is checked from the typed-array view
      // before Buffer.from() is allowed to allocate/copy the chunk.
      chunk = Buffer.from(value);
    } catch (error) {
      chunks.length = 0;
      await rejectResponseBodyBounded(
        response,
        reader,
        controller,
        transportLease,
        body,
      );
      throw error;
    }

    total += chunkLength;
    chunks.push(chunk);
    admittedReads += 1;

    if (admittedReads % BODY_READ_YIELD_INTERVAL === 0) {
      try {
        await awaitWithinOwnedDeadline(
          new Promise((resolve) => setImmediate(resolve)),
          controller.signal,
        );
      } catch (error) {
        chunks.length = 0;
        await rejectResponseBodyBounded(
          response,
          reader,
          controller,
          transportLease,
          body,
        );
        throw error;
      }
    }
  }

  return new TextDecoder("utf-8", {
    fatal: true,
  }).decode(Buffer.concat(chunks, total));
}

async function fetchJsonV1({
  base,
  route,
  timeoutMs,
  maxBytes,
  fetchImpl,
}) {
  const url = sameOriginUrl(base, route);
  const controller = new AbortController();
  const timer = setTimeout(
    () =>
      controller.abort(
        new Error("bootstrap_request_deadline_exceeded"),
      ),
    timeoutMs,
  );
  let transportLease = null;

  try {
    const acquired = await acquireResponseBounded(
      fetchImpl,
      url,
      {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          accept: "application/json",
          "user-agent":
            "void-ai-agent-bootstrap-client-v1",
        },
      },
      controller,
    );
    const response = acquired.response;
    transportLease = acquired.lease;

    try {
      requireExactResponseUrl(response, url);
    } catch (error) {
      await rejectResponseBodyBounded(
        response,
        null,
        controller,
        transportLease,
      );
      throw error;
    }

    let status;
    try {
      status = readExactResponseStatus(response);
    } catch (error) {
      await rejectResponseBodyBounded(
        response,
        null,
        controller,
        transportLease,
      );
      throw error;
    }

    if (status >= 300 && status < 400) {
      const primary = new Error(
        `redirect_forbidden:${status}`,
      );
      await rejectResponseBodyBounded(
        response,
        null,
        controller,
        transportLease,
      );
      throw primary;
    }

    if (status < 200 || status >= 300) {
      const primary = new Error(`http_status:${status}`);
      await rejectResponseBodyBounded(
        response,
        null,
        controller,
        transportLease,
      );
      throw primary;
    }

    const raw = await boundedRead(
      response,
      maxBytes,
      controller,
      transportLease,
    );

    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new Error("invalid_json");
    }

    if (
      payload === null ||
      Array.isArray(payload) ||
      typeof payload !== "object"
    ) {
      throw new Error("json_object_required");
    }

    return {
      ok: true,
      route: url.pathname,
      status,
      bytes: Buffer.byteLength(raw, "utf8"),
      marker:
        typeof payload.marker === "string"
          ? payload.marker
          : null,
      payload,
    };
  } finally {
    clearTimeout(timer);
    transportLease?.release();
  }
}

async function probeSurfaceV1(options) {
  try {
    const value = await fetchJsonV1(options);
    const payload = options.validate(value.payload);

    return {
      available: true,
      route: value.route,
      http_status: value.status,
      response_bytes: value.bytes,
      marker: value.marker,
      public_marker_valid: true,
      error: null,
      payload,
    };
  } catch (error) {
    return {
      available: false,
      route: String(options.route),
      http_status: null,
      response_bytes: null,
      marker: null,
      public_marker_valid: false,
      error:
        error instanceof Error
          ? error.message
          : String(error),
      payload: null,
    };
  }
}

function surfaceProjection(value) {
  return {
    available: value.available,
    route: value.route,
    http_status: value.http_status,
    response_bytes: value.response_bytes,
    marker: value.marker,
    public_marker_valid:
      value.public_marker_valid,
    error: value.error,
  };
}

function readNetwork(value) {
  const network = value?.network;
  if (
    network === null ||
    Array.isArray(network) ||
    typeof network !== "object"
  ) {
    return {
      name: null,
      chain_id: null,
    };
  }

  return {
    name:
      typeof network.name === "string"
        ? network.name
        : null,
    chain_id:
      Number.isInteger(network.chain_id)
        ? network.chain_id
        : null,
  };
}

function identityOfV1(stat) {
  return Object.freeze({
    dev: String(stat.dev),
    ino: String(stat.ino),
  });
}

function sameIdentityV1(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function procFdPathV1(fd, leaf = "") {
  const root = path.join(PROC_FD_ROOT, String(fd));
  return leaf ? path.join(root, leaf) : root;
}

function openPinnedOutputParentV1(
  parent,
  { createMissing = true } = {},
) {
  let procStat;
  try {
    procStat = lstatSync(PROC_FD_ROOT);
  } catch {
    throw new Error(
      "output parent authority requires /proc/self/fd",
    );
  }
  if (!procStat.isDirectory()) {
    throw new Error(
      "output parent authority requires /proc/self/fd",
    );
  }

  const absolute = path.resolve(parent);
  const root = path.parse(absolute).root;
  const relative = path.relative(root, absolute);
  const parts = relative
    ? relative.split(path.sep).filter(Boolean)
    : [];
  let fd = openSync(
    root,
    constants.O_RDONLY | constants.O_DIRECTORY,
  );

  try {
    for (const part of parts) {
      if (
        part !== path.basename(part) ||
        part === "." ||
        part === ".."
      ) {
        throw new Error("output parent component invalid");
      }
      const bound = procFdPathV1(fd, part);
      let next;
      try {
        next = openSync(
          bound,
          constants.O_RDONLY |
            constants.O_DIRECTORY |
            Number(constants.O_NOFOLLOW || 0),
        );
      } catch (error) {
        if (error?.code !== "ENOENT") {
          throw new Error(
            "output parent must contain only real directories",
          );
        }
        if (!createMissing) {
          throw new Error(
            "output parent path changed generation",
          );
        }
        mkdirSync(bound, { mode: 0o700 });
        fsyncSync(fd);
        next = openSync(
          bound,
          constants.O_RDONLY |
            constants.O_DIRECTORY |
            Number(constants.O_NOFOLLOW || 0),
        );
      }
      const metadata = fstatSync(next, {
        bigint: true,
      });
      if (!metadata.isDirectory()) {
        closeSync(next);
        throw new Error(
          "output parent component is not a directory",
        );
      }
      closeSync(fd);
      fd = next;
    }

    const metadata = fstatSync(fd, { bigint: true });
    return Object.freeze({
      fd,
      absolute,
      identity: identityOfV1(metadata),
    });
  } catch (error) {
    closeSync(fd);
    throw error;
  }
}

function assertPinnedOutputParentV1(pinned) {
  const current = openPinnedOutputParentV1(
    pinned.absolute,
    { createMissing: false },
  );
  try {
    if (!sameIdentityV1(pinned.identity, current.identity)) {
      throw new Error(
        "output parent path changed generation",
      );
    }
  } finally {
    closeSync(current.fd);
  }
}

export function writeBootstrapOutputFileV1(
  outputPath,
  content,
  testHooks = null,
) {
  const resolved = path.resolve(
    process.cwd(),
    outputPath,
  );
  const parent = path.dirname(resolved);
  const leaf = path.basename(resolved);
  if (!leaf || leaf === "." || leaf === "..") {
    throw new Error("output path leaf invalid");
  }
  if (testHooks !== null && typeof testHooks !== "object") {
    throw new Error("output test hooks invalid");
  }

  const pinned = openPinnedOutputParentV1(parent);
  const boundOutput = procFdPathV1(pinned.fd, leaf);
  let descriptor;
  let openedIdentity = null;
  let published = false;
  try {
    testHooks?.afterParentPinned?.({
      parent,
      resolved,
    });
    assertPinnedOutputParentV1(pinned);

    try {
      descriptor = openSync(
        boundOutput,
        constants.O_WRONLY |
          constants.O_CREAT |
          constants.O_EXCL |
          Number(constants.O_NOFOLLOW || 0),
        0o600,
      );
    } catch (error) {
      if (error?.code === "EEXIST") {
        throw new Error("output path already exists");
      }
      throw error;
    }

    openedIdentity = identityOfV1(
      fstatSync(descriptor, { bigint: true }),
    );
    testHooks?.afterOutputOpened?.({
      parent,
      resolved,
    });
    assertPinnedOutputParentV1(pinned);

    writeFileSync(descriptor, content, {
      encoding: "utf8",
    });
    fchmodSync(descriptor, 0o600);
    fsyncSync(descriptor);
    const linkedIdentity = identityOfV1(
      lstatSync(boundOutput, { bigint: true }),
    );
    if (!sameIdentityV1(openedIdentity, linkedIdentity)) {
      throw new Error("output path changed generation");
    }
    fsyncSync(pinned.fd);
    assertPinnedOutputParentV1(pinned);
    published = true;
  } finally {
    if (descriptor !== undefined) {
      closeSync(descriptor);
    }
    if (!published && openedIdentity) {
      try {
        const linkedIdentity = identityOfV1(
          lstatSync(boundOutput, { bigint: true }),
        );
        if (sameIdentityV1(openedIdentity, linkedIdentity)) {
          unlinkSync(boundOutput);
          fsyncSync(pinned.fd);
        }
      } catch {
        // Never delete an unknown replacement generation while failing closed.
      }
    }
    closeSync(pinned.fd);
  }

  return resolved;
}

export async function runVoidAiAgentBootstrapClientV1({
  baseUrl,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxBytes = DEFAULT_MAX_BYTES,
  fetchImpl = globalThis.fetch,
} = {}) {
  const checkedTimeoutMs = validateBoundInteger(
    timeoutMs,
    "timeoutMs",
    MAX_TIMEOUT_MS,
  );
  const checkedMaxBytes = validateBoundInteger(
    maxBytes,
    "maxBytes",
    MAX_ALLOWED_BYTES,
  );

  if (typeof fetchImpl !== "function") {
    throw new Error(
      "fetch implementation is unavailable",
    );
  }

  const base = normalizeBootstrapBaseUrlV1(
    baseUrl,
  );

  const wellKnown = await fetchJsonV1({
    base,
    route: ROUTES.well_known_discovery,
    timeoutMs: checkedTimeoutMs,
    maxBytes: checkedMaxBytes,
    fetchImpl,
  });

  const wellKnownPayload =
    validateWellKnownEntrypointV1(
      wellKnown.payload,
    );
  const canonicalRoute =
    wellKnownPayload.canonical_discovery;
  const networkAuthenticityRoute =
    wellKnownPayload.network_authenticity;

  // The root reference is not authenticity evidence by itself. Consume the
  // exact referenced packet through the same bounded/provenance-safe transport
  // and cryptographically bind it to the reviewed admitted Mainnet-0 root
  // before any downstream surface can contribute to readiness truth.
  sameOriginUrl(base, networkAuthenticityRoute);
  const networkAuthenticity = await fetchJsonV1({
    base,
    route: networkAuthenticityRoute,
    timeoutMs: checkedTimeoutMs,
    maxBytes: checkedMaxBytes,
    fetchImpl,
  });
  validateOfficialNetworkAuthenticityV1(
    networkAuthenticity.payload,
  );

  // Preserve a transport-level same-origin assertion even though the exact
  // root contract already pins the reviewed canonical discovery path.
  sameOriginUrl(base, canonicalRoute);

  const canonical = await probeSurfaceV1({
    base,
    route: canonicalRoute,
    timeoutMs: checkedTimeoutMs,
    maxBytes: checkedMaxBytes,
    fetchImpl,
    validate: (payload) =>
      validateReviewedSurfaceContractV1(
        payload,
        REVIEWED_SURFACE_CONTRACTS_V1.canonical_discovery,
        "canonical_discovery",
      ),
  });
  const capabilities =
    await probeSurfaceV1({
      base,
      route: ROUTES.capabilities,
      timeoutMs: checkedTimeoutMs,
      maxBytes: checkedMaxBytes,
      fetchImpl,
      validate: (payload) =>
        validateReviewedSurfaceContractV1(
          payload,
          REVIEWED_SURFACE_CONTRACTS_V1.capabilities,
          "capabilities",
        ),
    });
  const authentication =
    await probeSurfaceV1({
      base,
      route: ROUTES.authentication,
      timeoutMs: checkedTimeoutMs,
      maxBytes: checkedMaxBytes,
      fetchImpl,
      validate: (payload) =>
        validateReviewedSurfaceContractV1(
          payload,
          REVIEWED_SURFACE_CONTRACTS_V1.authentication,
          "authentication",
        ),
    });
  const firstContact =
    await probeSurfaceV1({
      base,
      route: ROUTES.first_contact,
      timeoutMs: checkedTimeoutMs,
      maxBytes: checkedMaxBytes,
      fetchImpl,
      validate: (payload) =>
        validateReviewedSurfaceContractV1(
          payload,
          REVIEWED_SURFACE_CONTRACTS_V1.first_contact,
          "first_contact",
        ),
    });
  const externalIntake =
    await probeSurfaceV1({
      base,
      route:
        ROUTES.external_opportunity_intake,
      timeoutMs: checkedTimeoutMs,
      maxBytes: checkedMaxBytes,
      fetchImpl,
      validate: (payload) =>
        validateReviewedSurfaceContractV1(
          payload,
          REVIEWED_SURFACE_CONTRACTS_V1.external_opportunity_intake,
          "external_opportunity_intake",
        ),
    });

  const required = [
    canonical,
    capabilities,
    authentication,
  ];
  const all = [
    ...required,
    firstContact,
    externalIntake,
  ];

  const readOnlyConnectionReady =
    required.every(
      (value) =>
        value.available &&
        value.public_marker_valid,
    );
  const onboardingSurfaceComplete =
    all.every(
      (value) =>
        value.available &&
        value.public_marker_valid,
    );

  const nextSteps = [];
  if (!canonical.available) {
    nextSteps.push(
      "retry_canonical_discovery_read",
    );
  }
  if (!capabilities.available) {
    nextSteps.push(
      "retry_capability_discovery_read",
    );
  }
  if (!authentication.available) {
    nextSteps.push(
      "retry_authentication_contract_read",
    );
  }
  if (!firstContact.available) {
    nextSteps.push(
      "retry_first_contact_contract_read",
    );
  }
  if (!externalIntake.available) {
    nextSteps.push(
      "retry_external_opportunity_intake_read",
    );
  }
  if (onboardingSurfaceComplete) {
    nextSteps.push(
      "select_explicit_read_only_capability",
    );
  }

  const network = readNetwork(
    wellKnownPayload,
  );

  return {
    marker:
      VOID_AI_AGENT_BOOTSTRAP_CLIENT_V1,
    schema:
      VOID_AI_AGENT_BOOTSTRAP_RESULT_SCHEMA_V1,
    version: 1,
    base_origin: base.origin,
    network,
    official_entrypoint: {
      verified: true,
      route: wellKnown.route,
      marker: wellKnown.marker,
      protocol:
        wellKnownPayload.protocol,
      canonical_discovery:
        new URL(
          canonicalRoute,
          base,
        ).pathname,
      authority_default:
        wellKnownPayload.authority.default,
      mutation_authority_granted: false,
    },
    surfaces: {
      canonical_discovery:
        surfaceProjection(canonical),
      capabilities:
        surfaceProjection(capabilities),
      authentication:
        surfaceProjection(authentication),
      first_contact:
        surfaceProjection(firstContact),
      external_opportunity_intake:
        surfaceProjection(externalIntake),
    },
    readiness: {
      read_only_connection_ready:
        readOnlyConnectionReady,
      onboarding_surface_complete:
        onboardingSurfaceComplete,
      paid_work_execution_promised: false,
      work_credit_earning_promised: false,
      mutation_authority_granted: false,
      wallet_or_signer_access_granted: false,
      payment_authority_granted: false,
      buy_void_fulfillment_authority_granted:
        false,
    },
    next_steps: nextSteps,
    safety: {
      http_methods_used: ["GET"],
      same_origin_only: true,
      redirects_followed: false,
      credentials_sent: false,
      authorization_header_sent: false,
      cookies_sent: false,
      wallet_material_sent: false,
      operator_keys_sent: false,
      request_body_sent: false,
      mutation_performed: false,
      payment_performed: false,
      transaction_broadcast_performed: false,
      wc_ledger_write_performed: false,
    },
  };
}

async function main() {
  const args = parseBootstrapClientArgsV1(
    process.argv.slice(2),
  );

  if (args.help) {
    process.stdout.write(usage() + "\n");
    return 0;
  }
  if (!args.baseUrl) {
    throw new Error("--base-url is required");
  }

  const result =
    await runVoidAiAgentBootstrapClientV1({
      baseUrl: args.baseUrl,
      timeoutMs: args.timeoutMs,
      maxBytes: args.maxBytes,
    });

  const content =
    JSON.stringify(
      result,
      null,
      args.pretty ? 2 : 0,
    ) + "\n";

  if (args.outputPath) {
    const resolved = writeBootstrapOutputFileV1(
      args.outputPath,
      content,
    );
    process.stderr.write(
      `output=${resolved}\n`,
    );
  }

  process.stdout.write(content);
  return 0;
}

const invokedPath = process.argv[1]
  ? pathToFileURL(
      path.resolve(process.argv[1]),
    ).href
  : "";

if (import.meta.url === invokedPath) {
  main().catch((error) => {
    process.stderr.write(
      `HOLD: ${
        error instanceof Error
          ? error.message
          : String(error)
      }\n`,
    );
    process.exitCode = 2;
  });
}
