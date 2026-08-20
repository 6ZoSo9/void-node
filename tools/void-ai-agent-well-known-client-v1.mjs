#!/usr/bin/env node
import {
  createHash,
  createPublicKey,
  verify as verifySignature,
} from "node:crypto";
import process from "node:process";

const WELL_KNOWN_PATH = "/.well-known/void-agent-discovery.json";
const WELL_KNOWN_MARKER = "VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1";
const WELL_KNOWN_PROTOCOL = "void-agent-discovery-well-known/1";
const NETWORK_AUTHENTICITY_PATH =
  "/.well-known/void-network-authenticity.json";
const NETWORK_AUTHENTICITY_MARKER =
  "VOID_OFFICIAL_NETWORK_AUTHENTICITY_WELL_KNOWN_V1";
const NETWORK_AUTHENTICITY_PROTOCOL = "void-network-authenticity/1";
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
const CANONICAL_DISCOVERY_SHA256 =
  "cd08f98f5dfdfcb4c4ae547d31da97b242554697afa51fd8c4663f5b193740cc";
const CANONICAL_MARKER = "VOID_AI_AGENT_DISCOVERY_CONTRACT_WALL_V1";
const CANONICAL_PROTOCOL = "void-agent-discovery/1";
const SAFE_METHODS = new Set(["GET", "HEAD"]);
const MAX_RESPONSE_BYTES = 262_144;
const RESPONSE_TIMEOUT_MS = 10_000;
const RESPONSE_TEARDOWN_TIMEOUT_MS = 250;

function requireExactObjectKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
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

function canonicalJsonValue(value) {
  if (Array.isArray(value)) return value.map(canonicalJsonValue);
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

function fail(error, detail = undefined) {
  const output = {
    ok: false,
    marker: "VOID_AI_AGENT_WELL_KNOWN_CLIENT_V1",
    error,
  };
  if (detail !== undefined) output.detail = detail;
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  process.exitCode = 1;
}

function parseArgs(argv) {
  const parsed = { base: "", probe: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--base") {
      parsed.base = argv[index + 1] ?? "";
      index += 1;
    } else if (value === "--probe") {
      parsed.probe = true;
    } else if (value === "--help" || value === "-h") {
      process.stdout.write(
        [
          "Usage:",
          "  node tools/void-ai-agent-well-known-client-v1.mjs --base https://node.example [--probe]",
          "",
          "Resolves VOID AI-agent discovery through the stable well-known entrypoint.",
          "The client performs same-origin GET requests only and sends no credentials.",
          "",
        ].join("\n"),
      );
      process.exit(0);
    } else {
      fail("unknown_argument", value);
      return null;
    }
  }
  if (!parsed.base) {
    fail("missing_required_argument", "--base");
    return null;
  }
  return parsed;
}

function normalizeBase(value) {
  const url = new URL(value);
  const loopback =
    url.hostname === "127.0.0.1" ||
    url.hostname === "localhost" ||
    url.hostname === "::1";
  if (url.protocol !== "https:" && !loopback) {
    throw new Error("base_must_use_https_except_loopback");
  }
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
}

function sameOriginPath(base, value, label) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    throw new Error(`${label}_must_be_same_origin_absolute_path`);
  }
  const resolved = new URL(value, base);
  if (resolved.origin !== base.origin) {
    throw new Error(`${label}_cross_origin_rejected`);
  }
  return resolved;
}

async function settleTeardownBounded(startCleanup) {
  let cleanup;
  try {
    cleanup = startCleanup?.();
  } catch {
    return;
  }
  if (!cleanup || typeof cleanup.then !== "function") return;

  let timeout;
  const timeoutPromise = new Promise((resolve) => {
    timeout = setTimeout(resolve, RESPONSE_TEARDOWN_TIMEOUT_MS);
  });
  try {
    await Promise.race([
      Promise.resolve(cleanup).then(
        () => undefined,
        () => undefined,
      ),
      timeoutPromise,
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

async function rejectWithTeardown(response, controller, error, reader = undefined) {
  controller.abort();
  await settleTeardownBounded(() => {
    if (reader && typeof reader.cancel === "function") return reader.cancel();
    if (response?.body && typeof response.body.cancel === "function") {
      return response.body.cancel();
    }
    return undefined;
  });
  throw error;
}

async function readBoundedJson(response, label, controller) {
  const contentType = response.headers.get("content-type") ?? "";
  const mediaType = contentType.split(";", 1)[0].trim().toLowerCase();
  if (mediaType !== "application/json") {
    await rejectWithTeardown(
      response,
      controller,
      new Error(`${label}_content_type_not_json`),
    );
  }

  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null) {
    if (!/^(?:0|[1-9][0-9]*)$/.test(declaredLength)) {
      await rejectWithTeardown(
        response,
        controller,
        new Error(`${label}_content_length_invalid`),
      );
    }
    const declaredBytes = Number(declaredLength);
    if (
      !Number.isSafeInteger(declaredBytes) ||
      declaredBytes > MAX_RESPONSE_BYTES
    ) {
      await rejectWithTeardown(
        response,
        controller,
        new Error(`${label}_response_exceeds_${MAX_RESPONSE_BYTES}_bytes`),
      );
    }
  }

  if (response.body === null) {
    controller.abort();
    throw new Error(`${label}_response_body_missing`);
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      let result;
      try {
        result = await reader.read();
      } catch {
        const error = controller.signal.aborted
          ? new Error(`${label}_deadline_exceeded`)
          : new Error(`${label}_response_read_failed`);
        await rejectWithTeardown(response, controller, error, reader);
      }
      const { done, value } = result;
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await rejectWithTeardown(
          response,
          controller,
          new Error(`${label}_response_exceeds_${MAX_RESPONSE_BYTES}_bytes`),
          reader,
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${label}_response_not_utf8`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label}_response_not_json`);
  }
}

async function getJson(url, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RESPONSE_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "error",
      headers: {
        accept: "application/json",
        "user-agent": "void-ai-agent-well-known-client-v1",
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      await rejectWithTeardown(
        response,
        controller,
        new Error(`${label}_http_${response.status}`),
      );
    }
    if (response.url !== url.href) {
      await rejectWithTeardown(
        response,
        controller,
        new Error(`${label}_final_url_mismatch`),
      );
    }
    return await readBoundedJson(response, label, controller);
  } finally {
    clearTimeout(timer);
  }
}

function validateWellKnown(base, document) {
  requireExactObjectKeys(
    document,
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
  if (document.$schema !== "./void-agent-discovery.schema.json") {
    throw new Error("well_known_schema_mismatch");
  }
  if (document.marker !== WELL_KNOWN_MARKER) {
    throw new Error("well_known_marker_mismatch");
  }
  if (document.protocol !== WELL_KNOWN_PROTOCOL) {
    throw new Error("well_known_protocol_mismatch");
  }
  requireExactObjectKeys(
    document.network,
    ["name", "chain_id"],
    "well_known_network",
  );
  if (
    document.network.name !== "VOID Mainnet-0" ||
    document.network.chain_id !== 2050
  ) {
    throw new Error("well_known_network_mismatch");
  }
  requireExactObjectKeys(
    document.authority,
    ["default", "mutation_authority_granted", "credentials_required"],
    "well_known_authority",
  );
  if (document.authority?.default !== "read_only") {
    throw new Error("well_known_default_authority_not_read_only");
  }
  if (document.authority?.mutation_authority_granted !== false) {
    throw new Error("well_known_mutation_authority_claim_rejected");
  }
  if (document.authority?.credentials_required !== false) {
    throw new Error("well_known_credentials_requirement_rejected");
  }
  requireExactObjectKeys(
    document.safety,
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
  if (document.safety.same_origin_only !== true) {
    throw new Error("well_known_same_origin_wall_missing");
  }
  if (document.safety?.follow_redirects !== false) {
    throw new Error("well_known_redirect_wall_missing");
  }
  if (document.safety?.send_secrets !== false) {
    throw new Error("well_known_secret_send_must_be_false");
  }
  if (document.safety?.send_wallet_material !== false) {
    throw new Error("well_known_wallet_send_must_be_false");
  }
  if (document.safety?.send_operator_keys !== false) {
    throw new Error("well_known_operator_key_send_must_be_false");
  }
  if (document.safety?.treat_unknown_as !== "not_granted") {
    throw new Error("well_known_unknown_authority_must_be_not_granted");
  }
  if (document.network_authenticity !== NETWORK_AUTHENTICITY_PATH) {
    throw new Error("well_known_network_authenticity_mismatch");
  }
  return {
    canonicalUrl: sameOriginPath(
      base,
      document.canonical_discovery,
      "canonical_discovery",
    ),
    authenticityUrl: sameOriginPath(
      base,
      document.network_authenticity,
      "network_authenticity",
    ),
  };
}

function validateOfficialNetworkAuthenticity(document) {
  requireExactObjectKeys(
    document,
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
  if (document.$schema !== "./void-network-authenticity.schema.json") {
    throw new Error("network_authenticity_schema_mismatch");
  }
  if (document.marker !== NETWORK_AUTHENTICITY_MARKER) {
    throw new Error("network_authenticity_marker_mismatch");
  }
  if (document.protocol !== NETWORK_AUTHENTICITY_PROTOCOL) {
    throw new Error("network_authenticity_protocol_mismatch");
  }
  if (document.status !== "public_verification_available") {
    throw new Error("network_authenticity_status_mismatch");
  }

  requireExactObjectKeys(
    document.network,
    ["name", "chain_id", "legacy_genesis_name", "genesis_sha256"],
    "network_authenticity_network",
  );
  if (
    document.network.name !== "VOID Mainnet-0" ||
    document.network.chain_id !== 2050 ||
    document.network.legacy_genesis_name !== "VOID-DEV" ||
    document.network.genesis_sha256 !== NETWORK_AUTHENTICITY_GENESIS_SHA256
  ) {
    throw new Error("network_authenticity_network_mismatch");
  }

  requireExactObjectKeys(
    document.admission,
    [
      "status",
      "checkpoint_tag",
      "checkpoint_commit",
      "source_public_return_zip_sha256",
    ],
    "network_authenticity_admission",
  );
  if (
    document.admission.status !== "admitted_unactivated" ||
    document.admission.checkpoint_tag !== NETWORK_AUTHENTICITY_CHECKPOINT_TAG ||
    document.admission.checkpoint_commit !==
      NETWORK_AUTHENTICITY_CHECKPOINT_COMMIT ||
    document.admission.source_public_return_zip_sha256 !==
      NETWORK_AUTHENTICITY_RETURN_ZIP_SHA256
  ) {
    throw new Error("network_authenticity_admission_mismatch");
  }

  requireExactObjectKeys(
    document.verification,
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
    document.verification.algorithm !== "Ed25519" ||
    document.verification.signature_domain !==
      NETWORK_AUTHENTICITY_SIGNATURE_DOMAIN ||
    document.verification.key_id !== NETWORK_AUTHENTICITY_KEY_ID ||
    document.verification.payload_sha256 !==
      NETWORK_AUTHENTICITY_PAYLOAD_SHA256
  ) {
    throw new Error("network_authenticity_verification_contract_mismatch");
  }

  requireExactObjectKeys(
    document.supersession,
    [
      "superseded_payload_sha256",
      "quarantined_key_id",
      "quarantined_candidate_admitted",
    ],
    "network_authenticity_supersession",
  );
  if (
    document.supersession.superseded_payload_sha256 !==
      NETWORK_AUTHENTICITY_SUPERSEDED_PAYLOAD_SHA256 ||
    document.supersession.quarantined_key_id !==
      NETWORK_AUTHENTICITY_QUARANTINED_KEY_ID ||
    document.supersession.quarantined_candidate_admitted !== false
  ) {
    throw new Error("network_authenticity_supersession_mismatch");
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
    document.authority,
    ["verification_only", ...falseAuthorityKeys],
    "network_authenticity_authority",
  );
  if (
    document.authority.verification_only !== true ||
    falseAuthorityKeys.some((key) => document.authority[key] !== false)
  ) {
    throw new Error("network_authenticity_authority_mismatch");
  }
  requireExactObjectKeys(
    document.safety,
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
    document.safety.private_key_present !== false ||
    document.safety.credentials_required !== false ||
    document.safety.send_secrets !== false ||
    document.safety.send_wallet_material !== false ||
    document.safety.send_operator_keys !== false ||
    document.safety.follow_redirects !== false ||
    document.safety.treat_unknown_as !== "not_official"
  ) {
    throw new Error("network_authenticity_safety_mismatch");
  }

  const signedPayloadBytes = Buffer.from(
    `${JSON.stringify(
      canonicalJsonValue(document.verification.signed_payload),
    )}\n`,
    "utf8",
  );
  const payloadDigest = sha256Hex(signedPayloadBytes);
  if (payloadDigest !== NETWORK_AUTHENTICITY_PAYLOAD_SHA256) {
    throw new Error("network_authenticity_payload_digest_mismatch");
  }

  let publicKey;
  try {
    publicKey = createPublicKey(document.verification.public_key_pem);
  } catch {
    throw new Error("network_authenticity_public_key_invalid");
  }
  if (publicKey.asymmetricKeyType !== "ed25519") {
    throw new Error("network_authenticity_public_key_type_mismatch");
  }
  const derivedKeyId = `ed25519:${sha256Hex(
    publicKey.export({ format: "der", type: "spki" }),
  )}`;
  if (derivedKeyId !== NETWORK_AUTHENTICITY_KEY_ID) {
    throw new Error("network_authenticity_public_key_identity_mismatch");
  }

  const rawSignature = document.verification.signature_base64;
  if (typeof rawSignature !== "string") {
    throw new Error("network_authenticity_signature_invalid");
  }
  const signature = Buffer.from(rawSignature, "base64");
  if (
    signature.length !== 64 ||
    signature.toString("base64") !== rawSignature ||
    !verifySignature(null, signedPayloadBytes, publicKey, signature)
  ) {
    throw new Error("network_authenticity_signature_invalid");
  }
}

function validateCanonical(base, document) {
  requireExactObjectKeys(
    document,
    [
      "$schema",
      "marker",
      "protocol",
      "network",
      "purpose",
      "authority",
      "entrypoints",
      "capabilities",
      "agent_onboarding",
      "safety",
    ],
    "canonical",
  );
  if (document.$schema !== "./discovery-v1.schema.json") {
    throw new Error("canonical_schema_mismatch");
  }
  if (document.marker !== CANONICAL_MARKER) {
    throw new Error("canonical_marker_mismatch");
  }
  if (document.protocol !== CANONICAL_PROTOCOL) {
    throw new Error("canonical_protocol_mismatch");
  }
  requireExactObjectKeys(
    document.network,
    ["name", "chain_id"],
    "canonical_network",
  );
  if (
    document.network.name !== "VOID Mainnet-0" ||
    document.network.chain_id !== 2050
  ) {
    throw new Error("canonical_network_mismatch");
  }
  if (
    typeof document.purpose !== "string" ||
    document.purpose.length === 0
  ) {
    throw new Error("canonical_purpose_missing");
  }
  requireExactObjectKeys(
    document.authority,
    [
      "default",
      "granted_http_methods",
      "mutation_authority_granted",
      "credentials_required_for_discovery",
      "forbidden_assumptions",
    ],
    "canonical_authority",
  );
  if (document.authority?.default !== "read_only") {
    throw new Error("canonical_default_authority_not_read_only");
  }
  if (document.authority?.mutation_authority_granted !== false) {
    throw new Error("canonical_mutation_authority_claim_rejected");
  }
  if (document.authority.credentials_required_for_discovery !== false) {
    throw new Error("canonical_credentials_requirement_rejected");
  }
  if (
    !Array.isArray(document.authority.forbidden_assumptions) ||
    document.authority.forbidden_assumptions.length === 0 ||
    document.authority.forbidden_assumptions.some(
      (value) => typeof value !== "string" || value.length === 0,
    )
  ) {
    throw new Error("canonical_forbidden_assumptions_invalid");
  }

  const methods = document.authority?.granted_http_methods;
  if (!Array.isArray(methods) || methods.length === 0) {
    throw new Error("canonical_granted_methods_missing");
  }
  for (const method of methods) {
    if (!SAFE_METHODS.has(method)) {
      throw new Error(`canonical_unsafe_granted_method_${method}`);
    }
  }

  const entrypoints = document.entrypoints;
  requireExactObjectKeys(
    entrypoints,
    [
      "node_identity",
      "public_index",
      "readiness",
      "participant_app",
      "capability_negotiation",
      "authentication_contract",
      "paid_work_protocol",
    ],
    "canonical_entrypoints",
  );
  for (const [name, path] of Object.entries(entrypoints)) {
    sameOriginPath(base, path, `canonical_entrypoint_${name}`);
  }

  if (!Array.isArray(document.capabilities) || document.capabilities.length === 0) {
    throw new Error("canonical_capabilities_missing");
  }
  const capabilityIds = new Set();
  for (const capability of document.capabilities) {
    const keys = ["id", "state", "authority"];
    if (Object.hasOwn(capability, "discovery")) keys.push("discovery");
    if (Object.hasOwn(capability, "enabled")) keys.push("enabled");
    requireExactObjectKeys(capability, keys, "canonical_capability");
    if (
      typeof capability.id !== "string" ||
      capability.id.length === 0 ||
      capabilityIds.has(capability.id)
    ) {
      throw new Error("canonical_capability_id_invalid");
    }
    capabilityIds.add(capability.id);
    if (capability.state === "live") {
      if (
        capability.authority !== "read_only" ||
        typeof capability.discovery !== "string"
      ) {
        throw new Error(
          `canonical_live_capability_${capability.id}_not_read_only`,
        );
      }
      sameOriginPath(
        base,
        capability.discovery,
        `canonical_capability_${capability.id}`,
      );
    } else if (capability.state === "guarded") {
      if (
        capability.authority !== "not_granted" ||
        capability.enabled !== false
      ) {
        throw new Error(
          `canonical_guarded_capability_${capability.id}_grants_authority`,
        );
      }
    } else if (capability.state === "bounded_pilot") {
      if (
        capability.id !== "work_credit_earning" ||
        capability.authority !==
          "coordinator_ticket_and_verified_receipt_only"
      ) {
        throw new Error("canonical_bounded_pilot_contract_mismatch");
      }
      sameOriginPath(
        base,
        capability.discovery,
        "canonical_capability_work_credit_earning",
      );
    } else {
      throw new Error(
        `canonical_capability_${capability.id}_state_rejected`,
      );
    }
  }

  requireExactObjectKeys(
    document.agent_onboarding,
    ["steps", "stop_conditions"],
    "canonical_agent_onboarding",
  );
  if (
    !Array.isArray(document.agent_onboarding.steps) ||
    document.agent_onboarding.steps.length === 0 ||
    !Array.isArray(document.agent_onboarding.stop_conditions) ||
    document.agent_onboarding.stop_conditions.length === 0
  ) {
    throw new Error("canonical_agent_onboarding_invalid");
  }
  for (const step of document.agent_onboarding.steps) {
    if (
      step.action === "fetch" &&
      (step.method !== "GET" ||
        sameOriginPath(base, step.path, "canonical_onboarding_step").origin !==
          base.origin)
    ) {
      throw new Error("canonical_agent_onboarding_fetch_unsafe");
    }
    if (
      step.action !== "fetch" &&
      step.action !== "enforce_authority_boundary"
    ) {
      throw new Error("canonical_agent_onboarding_action_rejected");
    }
  }

  requireExactObjectKeys(
    document.safety,
    [
      "same_origin_only",
      "follow_cross_origin_links_automatically",
      "send_secrets",
      "send_wallet_material",
      "send_operator_keys",
      "treat_unknown_capability_as",
    ],
    "canonical_safety",
  );
  if (document.safety.same_origin_only !== true) {
    throw new Error("canonical_same_origin_wall_missing");
  }
  if (
    document.safety.follow_cross_origin_links_automatically !== false ||
    document.safety.send_secrets !== false ||
    document.safety.send_wallet_material !== false ||
    document.safety.send_operator_keys !== false
  ) {
    throw new Error("canonical_safety_boundary_rejected");
  }
  if (document.safety?.treat_unknown_capability_as !== "not_granted") {
    throw new Error("canonical_unknown_capability_must_be_not_granted");
  }
  const canonicalDigest = sha256Hex(
    Buffer.from(
      `${JSON.stringify(canonicalJsonValue(document))}\n`,
      "utf8",
    ),
  );
  if (canonicalDigest !== CANONICAL_DISCOVERY_SHA256) {
    throw new Error("canonical_committed_contract_digest_mismatch");
  }
  return document;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args) return;

  try {
    const base = normalizeBase(args.base);
    const wellKnownUrl = sameOriginPath(
      base,
      WELL_KNOWN_PATH,
      "well_known",
    );
    const wellKnown = await getJson(wellKnownUrl, "well_known");
    const { canonicalUrl, authenticityUrl } = validateWellKnown(
      base,
      wellKnown,
    );
    validateOfficialNetworkAuthenticity(
      await getJson(authenticityUrl, "network_authenticity"),
    );
    const canonical = validateCanonical(
      base,
      await getJson(canonicalUrl, "canonical"),
    );

    const output = {
      ok: true,
      marker: "VOID_AI_AGENT_WELL_KNOWN_CLIENT_V1",
      base_origin: base.origin,
      well_known_url: wellKnownUrl.href,
      network_authenticity_url: authenticityUrl.href,
      canonical_url: canonicalUrl.href,
      network: canonical.network,
      authority: canonical.authority,
      capabilities: canonical.capabilities,
      probe: null,
    };

    if (args.probe) {
      output.probe = {};
      for (const name of ["node_identity", "public_index", "readiness"]) {
        const url = sameOriginPath(
          base,
          canonical.entrypoints[name],
          `probe_${name}`,
        );
        try {
          output.probe[name] = {
            ok: true,
            url: url.href,
            body: await getJson(url, `probe_${name}`),
          };
        } catch (error) {
          output.probe[name] = {
            ok: false,
            url: url.href,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    }

    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  } catch (error) {
    fail(
      "well_known_discovery_rejected",
      error instanceof Error ? error.message : String(error),
    );
  }
}

await main();
