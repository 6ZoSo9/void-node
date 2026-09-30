#!/usr/bin/env node
import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { access, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import {
  VOID_NODE_PUBLIC_ORIGIN_BINDING_CANONICALIZATION,
  VOID_NODE_PUBLIC_ORIGIN_BINDING_DOMAIN,
  buildUnsignedVoidNodePublicOriginBindingV1,
  canonicalJsonV1,
  normalizeVoidPublicOriginV1,
  unsignedVoidNodePublicOriginBindingBytesV1,
} from "./lib/void-node-public-origin-binding-v1.mjs";
import {
  reviewedVoidPublicNodeIdentityTrustEntryV1,
} from "./lib/void-public-node-identity-trust-v1.mjs";

export const VOID_NODE_PUBLIC_ORIGIN_BINDING_SIGNING_REQUEST_V1 =
  "VOID_NODE_PUBLIC_ORIGIN_BINDING_SIGNING_REQUEST_V1";
export const VOID_NODE_PUBLIC_ORIGIN_BINDING_SIGNING_REQUEST_SCHEMA_V1 =
  "void.node-public-origin-binding-signing-request.v1";

export const VOID_NODE_PUBLIC_ORIGIN_BINDING_SIGNING_REQUEST_AUTHORITY_V1 =
  Object.freeze({
    source_only_unsigned_request_creation: true,
    reviewed_trust_registry_required: true,
    production_private_key_access: false,
    wallet_or_signer_access: false,
    signature_creation: false,
    binding_publication: false,
    route_activation: false,
    service_restart: false,
    node_runtime_mutation: false,
    work_credit_mutation: false,
    transaction_submission: false,
    validator_mutation: false,
    payment_authority: false,
    funds_movement: false,
  });

const PUBLIC_DNS_LABEL =
  /^(?!-)[a-z0-9-]{1,63}(?<!-)$/u;

function fail(message) {
  throw new Error(message);
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value, expected, label) {
  if (!isPlainObject(value)) fail(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    fail(`${label} keys mismatch`);
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalProductionHttpsOrigin(value) {
  const normalized = normalizeVoidPublicOriginV1(
    value,
    "production public origin",
  );
  const parsed = new URL(normalized);
  const labels = parsed.hostname.split(".");
  if (
    parsed.protocol !== "https:"
    || parsed.port
    || parsed.hostname.endsWith(".onion")
    || parsed.hostname.length > 253
    || labels.length < 2
    || labels.some((label) => !PUBLIC_DNS_LABEL.test(label))
    || !/^[a-z]{2,63}$/u.test(labels.at(-1))
  ) {
    fail(
      "production public origin must be a canonical default-port HTTPS DNS origin",
    );
  }
  return normalized;
}

function inputFromRequest(request) {
  return {
    origin: request.unsigned_binding.origin.value,
    node_id: request.unsigned_binding.node.node_id,
    public_key_pem: request.unsigned_binding.node.public_key_pem,
    issued_at: request.unsigned_binding.issued_at,
    expires_at: request.unsigned_binding.expires_at,
  };
}

export function buildVoidNodePublicOriginBindingSigningRequestV1(input) {
  exactKeys(
    input,
    [
      "origin",
      "node_id",
      "public_key_pem",
      "issued_at",
      "expires_at",
    ],
    "input",
  );

  const origin = canonicalProductionHttpsOrigin(input.origin);
  if (origin !== input.origin) {
    fail("production public origin must already be canonical");
  }

  const { registry, entry } =
    reviewedVoidPublicNodeIdentityTrustEntryV1(input.node_id);

  const built = buildUnsignedVoidNodePublicOriginBindingV1({
    nodeId: input.node_id,
    publicKey: input.public_key_pem,
    origin,
    issuedAt: input.issued_at,
    expiresAt: input.expires_at,
  });
  if (
    built.issued_at !== input.issued_at
    || built.expires_at !== input.expires_at
  ) {
    fail("binding timestamps must already be canonical ISO-8601");
  }
  if (
    built.node.public_key_fingerprint_sha256
      !== entry.public_key_fingerprint_sha256
  ) {
    fail("public key does not match the reviewed node trust fingerprint");
  }

  const unsignedBinding = structuredClone(built);
  unsignedBinding.signature.value = null;
  const payload = unsignedVoidNodePublicOriginBindingBytesV1(
    unsignedBinding,
  );
  const payloadSha256 = sha256(payload);

  return Object.freeze({
    schema:
      VOID_NODE_PUBLIC_ORIGIN_BINDING_SIGNING_REQUEST_SCHEMA_V1,
    marker:
      VOID_NODE_PUBLIC_ORIGIN_BINDING_SIGNING_REQUEST_V1,
    version: 1,
    status: "unsigned",
    request_id: `voidnpobsr1_${payloadSha256}`,
    generated_at: unsignedBinding.issued_at,
    trust_registry: Object.freeze({
      marker: registry.marker,
      sha256: registry.sha256,
      node_id: entry.node_id,
      public_key_fingerprint_sha256:
        entry.public_key_fingerprint_sha256,
    }),
    unsigned_binding: unsignedBinding,
    signing: Object.freeze({
      domain: VOID_NODE_PUBLIC_ORIGIN_BINDING_DOMAIN,
      algorithm: "ed25519",
      encoding: "base64",
      canonicalization:
        VOID_NODE_PUBLIC_ORIGIN_BINDING_CANONICALIZATION,
      key_id: unsignedBinding.signature.key_id,
      payload_sha256: payloadSha256,
      payload_base64: payload.toString("base64"),
    }),
    authority:
      VOID_NODE_PUBLIC_ORIGIN_BINDING_SIGNING_REQUEST_AUTHORITY_V1,
  });
}

export function verifyVoidNodePublicOriginBindingSigningRequestV1(
  request,
) {
  exactKeys(
    request,
    [
      "schema",
      "marker",
      "version",
      "status",
      "request_id",
      "generated_at",
      "trust_registry",
      "unsigned_binding",
      "signing",
      "authority",
    ],
    "request",
  );
  if (
    request.schema
      !== VOID_NODE_PUBLIC_ORIGIN_BINDING_SIGNING_REQUEST_SCHEMA_V1
    || request.marker
      !== VOID_NODE_PUBLIC_ORIGIN_BINDING_SIGNING_REQUEST_V1
    || request.version !== 1
    || request.status !== "unsigned"
  ) {
    fail("request identity mismatch");
  }

  exactKeys(
    request.trust_registry,
    [
      "marker",
      "sha256",
      "node_id",
      "public_key_fingerprint_sha256",
    ],
    "request.trust_registry",
  );
  const { registry, entry } =
    reviewedVoidPublicNodeIdentityTrustEntryV1(
      request.trust_registry.node_id,
    );
  if (
    request.trust_registry.marker !== registry.marker
    || request.trust_registry.sha256 !== registry.sha256
    || request.trust_registry.node_id !== entry.node_id
    || request.trust_registry.public_key_fingerprint_sha256
      !== entry.public_key_fingerprint_sha256
  ) {
    fail("request trust registry binding mismatch");
  }

  exactKeys(
    request.signing,
    [
      "domain",
      "algorithm",
      "encoding",
      "canonicalization",
      "key_id",
      "payload_sha256",
      "payload_base64",
    ],
    "request.signing",
  );
  exactKeys(
    request.authority,
    Object.keys(
      VOID_NODE_PUBLIC_ORIGIN_BINDING_SIGNING_REQUEST_AUTHORITY_V1,
    ),
    "request.authority",
  );
  for (
    const [key, expected]
    of Object.entries(
      VOID_NODE_PUBLIC_ORIGIN_BINDING_SIGNING_REQUEST_AUTHORITY_V1,
    )
  ) {
    if (request.authority[key] !== expected) {
      fail(`request authority.${key} mismatch`);
    }
  }

  if (request.unsigned_binding?.signature?.value !== null) {
    fail("unsigned request must not contain a signature value");
  }
  if (
    request.generated_at
      !== request.unsigned_binding?.issued_at
  ) {
    fail("request generated_at must equal binding issued_at");
  }

  const rebuilt =
    buildVoidNodePublicOriginBindingSigningRequestV1(
      inputFromRequest(request),
    );
  if (
    canonicalJsonV1(request)
      !== canonicalJsonV1(rebuilt)
  ) {
    fail("request does not match deterministic signing payload");
  }

  return Object.freeze({
    request_id: rebuilt.request_id,
    origin: rebuilt.unsigned_binding.origin.value,
    node_id: rebuilt.unsigned_binding.node.node_id,
    public_key_fingerprint_sha256:
      rebuilt.unsigned_binding.node
        .public_key_fingerprint_sha256,
    trust_registry_sha256:
      rebuilt.trust_registry.sha256,
    payload_sha256: rebuilt.signing.payload_sha256,
    private_key_access: false,
    wallet_or_signer_access: false,
    signature_created: false,
    publication_performed: false,
    route_activation_performed: false,
    runtime_mutation_performed: false,
  });
}

async function readJson(file, label) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    fail(`${label} could not be read as JSON: ${error.message}`);
  }
}

async function writeNewJson(file, value) {
  try {
    await access(file, fsConstants.F_OK);
    fail(`refusing to overwrite existing output: ${file}`);
  } catch (error) {
    if (error?.message?.startsWith("refusing to overwrite")) {
      throw error;
    }
    if (error?.code !== "ENOENT") throw error;
  }
  await writeFile(
    file,
    JSON.stringify(value, null, 2) + "\n",
    { flag: "wx", mode: 0o644 },
  );
}

async function main(argv) {
  const [command, first, second, ...extra] = argv;
  if (extra.length > 0) fail("too many arguments");

  if (command === "build" && first && second) {
    const request =
      buildVoidNodePublicOriginBindingSigningRequestV1(
        await readJson(first, "input"),
      );
    await writeNewJson(second, request);
    const verified =
      verifyVoidNodePublicOriginBindingSigningRequestV1(
        request,
      );
    console.log(
      VOID_NODE_PUBLIC_ORIGIN_BINDING_SIGNING_REQUEST_V1,
    );
    console.log(`request_id=${verified.request_id}`);
    console.log(`origin=${verified.origin}`);
    console.log(`node_id=${verified.node_id}`);
    console.log(
      `payload_sha256=${verified.payload_sha256}`,
    );
    console.log("private_key_access=false");
    console.log("signature_created=false");
    console.log("publication_performed=false");
    console.log(`output=${second}`);
    return;
  }

  if (command === "verify" && first && !second) {
    const verified =
      verifyVoidNodePublicOriginBindingSigningRequestV1(
        await readJson(first, "request"),
      );
    console.log(
      "VOID_NODE_PUBLIC_ORIGIN_BINDING_SIGNING_REQUEST_V1_VERIFIED",
    );
    for (const [key, value] of Object.entries(verified)) {
      console.log(`${key}=${value}`);
    }
    return;
  }

  fail(
    "usage: void-node-public-origin-binding-signing-request-v1.mjs "
      + "build <input.json> <request.json> | "
      + "verify <request.json>",
  );
}

const direct = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;
if (direct) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`HOLD: ${error.message}`);
    process.exitCode = 1;
  });
}
