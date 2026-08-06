#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  canonicalJson,
  contentId,
  validateTorNativeEndpoints,
} from "./void_tor_native_bootstrap_transport_v1.mjs";

export const TOR_BOOTSTRAP_RELEASE_ROOT_SCHEMA = "void_tor_bootstrap_release_root_v1";
export const TOR_BOOTSTRAP_SIGNED_MANIFEST_SCHEMA = "void_tor_bootstrap_signed_manifest_v1";
export const TOR_BOOTSTRAP_SIGNATURE_DOMAIN = "void:mainnet-0:tor-bootstrap-manifest-v1";
export const TOR_BOOTSTRAP_RELEASE_ROOT_FILENAME = "void-tor-bootstrap-release-root-v1.json";
export const TOR_BOOTSTRAP_NETWORK = "VOID Network";
export const TOR_BOOTSTRAP_CHAIN_ID = 2050;

const ROOT_KEYS = Object.freeze([
  "schema",
  "network",
  "chain_id",
  "status",
  "signature_domain",
  "threshold",
  "keys",
  "authority",
  "root_id",
]);
const ROOT_KEY_KEYS = Object.freeze([
  "key_id",
  "algorithm",
  "public_key_spki_base64",
]);
const ENVELOPE_KEYS = Object.freeze([
  "schema",
  "root_id",
  "manifest",
  "signatures",
]);
const SIGNATURE_KEYS = Object.freeze([
  "key_id",
  "signature_base64",
]);
const AUTHORITY_KEYS = Object.freeze([
  "private_routes_exposed",
  "wallet_authority",
  "signer_authority",
  "validator_authority",
  "treasury_authority",
  "work_credit_authority",
  "money_movement_authority",
]);
const MANIFEST_KEYS = Object.freeze([
  "schema",
  "network",
  "chain_id",
  "status",
  "generated_at",
  "expires_at",
  "sync_endpoints",
  "onion_endpoints",
  "private_tailnet_endpoints_published",
  "authority",
  "notes",
  "manifest_id",
]);
const TOR_BOOTSTRAP_MANIFEST_SCHEMA = "void_public_bootstrap_v1";
const MIN_MANIFEST_VALIDITY_MS = 60 * 60 * 1000;
const MAX_MANIFEST_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000;

function plainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

function exactKeys(value, expected, label) {
  const object = plainObject(value, label);
  const actual = Object.keys(object).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label} keys mismatch`);
  }
  return object;
}

function canonicalBase64(raw, label, expectedBytes = null) {
  const value = String(raw || "");
  if (!value || value.length > 4096 || /\s/.test(value)) {
    throw new Error(`${label} is not canonical base64`);
  }
  const bytes = Buffer.from(value, "base64");
  if (bytes.length === 0 || bytes.toString("base64") !== value) {
    throw new Error(`${label} is not canonical base64`);
  }
  if (expectedBytes !== null && bytes.length !== expectedBytes) {
    throw new Error(`${label} has an invalid byte length`);
  }
  return bytes;
}

function validateFalseAuthority(raw, label) {
  const authority = exactKeys(raw, AUTHORITY_KEYS, label);
  for (const key of AUTHORITY_KEYS) {
    if (authority[key] !== false) {
      throw new Error(`${label} ${key} must be false`);
    }
  }
  return Object.freeze({ ...authority });
}

function validateAuthority(raw) {
  return validateFalseAuthority(raw, "Tor bootstrap release-root authority");
}

export function validateTorBootstrapManifestContract(rawManifest, nowMs = Date.now()) {
  if (!Number.isFinite(nowMs)) {
    throw new Error("Tor bootstrap signed-manifest validation time is invalid");
  }
  const manifest = exactKeys(
    structuredClone(rawManifest),
    MANIFEST_KEYS,
    "Tor bootstrap signed manifest",
  );
  if (
    manifest.schema !== TOR_BOOTSTRAP_MANIFEST_SCHEMA ||
    manifest.network !== TOR_BOOTSTRAP_NETWORK ||
    manifest.chain_id !== TOR_BOOTSTRAP_CHAIN_ID
  ) {
    throw new Error("Tor bootstrap signed manifest network contract mismatch");
  }
  if (manifest.status !== "stable_tor_seed") {
    throw new Error("Tor bootstrap signed manifest status must be stable_tor_seed");
  }
  if (manifest.private_tailnet_endpoints_published !== false) {
    throw new Error("Tor bootstrap signed manifest violates the private-Tailnet boundary");
  }
  validateFalseAuthority(
    manifest.authority,
    "Tor bootstrap signed-manifest authority",
  );
  if (!Array.isArray(manifest.sync_endpoints) || manifest.sync_endpoints.length !== 0) {
    throw new Error(
      "Tor bootstrap signed manifest must not require clearnet synchronization endpoints",
    );
  }
  if (typeof manifest.notes !== "string" || manifest.notes.length > 4096) {
    throw new Error("Tor bootstrap signed manifest notes are invalid");
  }

  const generatedAt = Date.parse(String(manifest.generated_at));
  const expiresAt = Date.parse(String(manifest.expires_at));
  if (!Number.isFinite(generatedAt) || !Number.isFinite(expiresAt)) {
    throw new Error("Tor bootstrap signed manifest timestamps are invalid");
  }
  if (generatedAt > nowMs + 5 * 60 * 1000) {
    throw new Error("Tor bootstrap signed manifest is from the future");
  }
  if (expiresAt <= nowMs) {
    throw new Error("Tor bootstrap signed manifest is expired");
  }
  const validity = expiresAt - generatedAt;
  if (
    validity < MIN_MANIFEST_VALIDITY_MS ||
    validity > MAX_MANIFEST_VALIDITY_MS
  ) {
    throw new Error(
      "Tor bootstrap signed manifest validity must be from one hour through seven days",
    );
  }

  const manifestId = contentId("voidpbm1_", manifest, "manifest_id");
  if (manifest.manifest_id !== manifestId) {
    throw new Error("Tor bootstrap signed manifest ID does not match its content");
  }
  const endpoints = validateTorNativeEndpoints(manifest.onion_endpoints, nowMs);
  return Object.freeze({
    manifest: Object.freeze(structuredClone(manifest)),
    manifestId,
    endpoints,
  });
}

export function torBootstrapReleaseKeyId(publicKeyDer) {
  const bytes = Buffer.from(publicKeyDer);
  return `voidtpk1_${crypto.createHash("sha256").update(bytes).digest("hex")}`;
}

export function torBootstrapReleaseRootId(root) {
  return contentId("voidptr1_", root, "root_id");
}

export function torBootstrapManifestSigningPayload(root, manifest) {
  return Buffer.from([
    root.signature_domain,
    root.root_id,
    canonicalJson(manifest),
    "",
  ].join("\n"), "utf8");
}

export function validateTorBootstrapReleaseRoot(rawRoot, { allowHold = true } = {}) {
  const root = exactKeys(structuredClone(rawRoot), ROOT_KEYS, "Tor bootstrap release root");
  if (
    root.schema !== TOR_BOOTSTRAP_RELEASE_ROOT_SCHEMA ||
    root.network !== TOR_BOOTSTRAP_NETWORK ||
    Number(root.chain_id) !== TOR_BOOTSTRAP_CHAIN_ID
  ) {
    throw new Error("Tor bootstrap release root network contract mismatch");
  }
  if (root.signature_domain !== TOR_BOOTSTRAP_SIGNATURE_DOMAIN) {
    throw new Error("Tor bootstrap release root signature domain mismatch");
  }
  validateAuthority(root.authority);
  const computedRootId = torBootstrapReleaseRootId(root);
  if (root.root_id !== computedRootId) {
    throw new Error("Tor bootstrap release root ID does not match its content");
  }
  if (!Array.isArray(root.keys) || root.keys.length > 8) {
    throw new Error("Tor bootstrap release root key set is invalid");
  }

  const keys = [];
  const seen = new Set();
  for (const [index, rawKey] of root.keys.entries()) {
    const key = exactKeys(rawKey, ROOT_KEY_KEYS, `Tor bootstrap release key ${index + 1}`);
    if (key.algorithm !== "ed25519") {
      throw new Error("Tor bootstrap release key algorithm must be ed25519");
    }
    if (!/^voidtpk1_[0-9a-f]{64}$/.test(String(key.key_id || ""))) {
      throw new Error("Tor bootstrap release key ID is malformed");
    }
    if (seen.has(key.key_id)) {
      throw new Error("Tor bootstrap release root contains a duplicate key ID");
    }
    const der = canonicalBase64(
      key.public_key_spki_base64,
      "Tor bootstrap release public key",
    );
    let publicKey;
    try {
      publicKey = crypto.createPublicKey({ key: der, format: "der", type: "spki" });
    } catch (error) {
      throw new Error(`Tor bootstrap release public key is invalid: ${error.message}`);
    }
    if (publicKey.asymmetricKeyType !== "ed25519") {
      throw new Error("Tor bootstrap release public key is not Ed25519");
    }
    const canonicalDer = publicKey.export({ type: "spki", format: "der" });
    if (!Buffer.from(canonicalDer).equals(der)) {
      throw new Error("Tor bootstrap release public key SPKI is not canonical DER");
    }
    if (torBootstrapReleaseKeyId(der) !== key.key_id) {
      throw new Error("Tor bootstrap release key ID does not match its public key");
    }
    seen.add(key.key_id);
    keys.push(Object.freeze({ ...key, publicKey }));
  }

  if (root.status === "hold_no_signing_keys") {
    if (!allowHold) throw new Error("Tor bootstrap release root is in hold state");
    if (root.threshold !== 0 || keys.length !== 0) {
      throw new Error("Tor bootstrap hold root must have threshold zero and no keys");
    }
  } else if (root.status === "active") {
    if (
      !Number.isSafeInteger(root.threshold) ||
      root.threshold < 1 ||
      root.threshold > keys.length
    ) {
      throw new Error("Tor bootstrap active release-root threshold is invalid");
    }
  } else {
    throw new Error("Tor bootstrap release-root status is invalid");
  }

  return Object.freeze({
    root: Object.freeze({ ...root }),
    keys: Object.freeze(keys),
  });
}

export function validateTorBootstrapSignedManifest(
  rawEnvelope,
  validatedRoot,
  { nowMs = Date.now() } = {},
) {
  const rawRoot = validatedRoot?.root ? validatedRoot.root : validatedRoot;
  const rootValidation = validateTorBootstrapReleaseRoot(rawRoot, { allowHold: false });
  const root = rootValidation.root;

  const envelope = exactKeys(
    structuredClone(rawEnvelope),
    ENVELOPE_KEYS,
    "Tor bootstrap signed manifest envelope",
  );
  if (envelope.schema !== TOR_BOOTSTRAP_SIGNED_MANIFEST_SCHEMA) {
    throw new Error("Tor bootstrap signed manifest schema mismatch");
  }
  if (envelope.root_id !== root.root_id) {
    throw new Error("Tor bootstrap signed manifest root ID mismatch");
  }
  const manifestValidation = validateTorBootstrapManifestContract(
    envelope.manifest,
    nowMs,
  );
  const manifest = manifestValidation.manifest;
  const manifestId = manifestValidation.manifestId;
  if (!Array.isArray(envelope.signatures) || envelope.signatures.length < 1 || envelope.signatures.length > 8) {
    throw new Error("Tor bootstrap signed manifest signature set is invalid");
  }

  const keyById = new Map(rootValidation.keys.map((entry) => [entry.key_id, entry]));
  const payload = torBootstrapManifestSigningPayload(root, manifest);
  const seen = new Set();
  let valid = 0;
  for (const [index, rawSignature] of envelope.signatures.entries()) {
    const signature = exactKeys(
      rawSignature,
      SIGNATURE_KEYS,
      `Tor bootstrap manifest signature ${index + 1}`,
    );
    if (!/^voidtpk1_[0-9a-f]{64}$/.test(String(signature.key_id || ""))) {
      throw new Error("Tor bootstrap manifest signature key ID is malformed");
    }
    if (seen.has(signature.key_id)) {
      throw new Error("Tor bootstrap manifest contains a duplicate signature key ID");
    }
    const key = keyById.get(signature.key_id);
    if (!key) throw new Error("Tor bootstrap manifest signature uses an unknown key");
    const signatureBytes = canonicalBase64(
      signature.signature_base64,
      "Tor bootstrap manifest signature",
      64,
    );
    if (!crypto.verify(null, payload, key.publicKey, signatureBytes)) {
      throw new Error("Tor bootstrap manifest signature verification failed");
    }
    seen.add(signature.key_id);
    valid += 1;
  }
  if (valid < root.threshold) {
    throw new Error("Tor bootstrap manifest signature threshold was not met");
  }

  return Object.freeze({
    root,
    manifest: Object.freeze(structuredClone(manifest)),
    manifestId,
    validSignatureCount: valid,
  });
}

function readCanonicalRegularJson(rawPath, label, maxBytes) {
  const target = path.resolve(String(rawPath || ""));
  const status = fs.lstatSync(target);
  if (status.isSymbolicLink() || !status.isFile()) {
    throw new Error(`${label} must be one regular non-symlink file`);
  }
  if (fs.realpathSync(target) !== target) {
    throw new Error(`${label} path must already be canonical`);
  }
  if (status.size < 2 || status.size > maxBytes) {
    throw new Error(`${label} size is invalid`);
  }
  try {
    return { target, value: JSON.parse(fs.readFileSync(target, "utf8")) };
  } catch (error) {
    throw new Error(`${label} JSON is invalid: ${error.message}`);
  }
}

export function loadTorBootstrapReleaseRootFile(rawPath, options = {}) {
  const loaded = readCanonicalRegularJson(
    rawPath,
    "Tor bootstrap release root",
    256 * 1024,
  );
  return Object.freeze({
    target: loaded.target,
    ...validateTorBootstrapReleaseRoot(loaded.value, options),
  });
}

export function loadTorBootstrapSignedManifestFile(rawPath, validatedRoot) {
  const loaded = readCanonicalRegularJson(
    rawPath,
    "Tor bootstrap signed manifest envelope",
    2 * 1024 * 1024,
  );
  return Object.freeze({
    target: loaded.target,
    ...validateTorBootstrapSignedManifest(loaded.value, validatedRoot),
  });
}
