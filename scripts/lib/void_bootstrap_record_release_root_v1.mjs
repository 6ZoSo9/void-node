#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  BOOTSTRAP_RECORD_V2_PREFIX,
  VOID_CHAIN_ID,
  VOID_NETWORK,
  contentId,
} from "./void_public_bootstrap_record_v2_mirror_contract_v1.mjs";

export const VOID_BOOTSTRAP_RECORD_RELEASE_ROOT_SCHEMA_V1 =
  "void_bootstrap_record_release_root_v1";
export const VOID_BOOTSTRAP_RECORD_SIGNED_ID_SCHEMA_V1 =
  "void_bootstrap_record_signed_id_v1";
export const VOID_BOOTSTRAP_RECORD_RELEASE_ROOT_PREFIX_V1 = "voidbrr1_";
export const VOID_BOOTSTRAP_RECORD_RELEASE_KEY_PREFIX_V1 = "voidbrk1_";
export const VOID_BOOTSTRAP_RECORD_SIGNATURE_DOMAIN_V1 =
  "void:mainnet-0:bootstrap-record-v2-release-v1";
export const VOID_BOOTSTRAP_RECORD_RELEASE_ROOT_FILENAME_V1 =
  "void-bootstrap-record-release-root-v1.json";

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
  "record_id",
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

const RECORD_ID_RE = new RegExp(`^${BOOTSTRAP_RECORD_V2_PREFIX}[0-9a-f]{64}$`);
const ROOT_ID_RE = new RegExp(
  `^${VOID_BOOTSTRAP_RECORD_RELEASE_ROOT_PREFIX_V1}[0-9a-f]{64}$`,
);
const KEY_ID_RE = new RegExp(
  `^${VOID_BOOTSTRAP_RECORD_RELEASE_KEY_PREFIX_V1}[0-9a-f]{64}$`,
);

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

function requireCanonicalSortedIds(ids, label) {
  const sorted = [...ids].sort();
  if (JSON.stringify(ids) !== JSON.stringify(sorted)) {
    throw new Error(`${label} must be sorted by key ID`);
  }
}

export function requireVoidBootstrapRecordIdV2(rawRecordId) {
  const recordId = String(rawRecordId || "");
  if (!RECORD_ID_RE.test(recordId)) {
    throw new Error("exact canonical voidpbr2_<sha256> record ID is required");
  }
  return recordId;
}

export function voidBootstrapRecordReleaseKeyIdV1(publicKeyDer) {
  const bytes = Buffer.from(publicKeyDer);
  return `${VOID_BOOTSTRAP_RECORD_RELEASE_KEY_PREFIX_V1}${crypto
    .createHash("sha256")
    .update(bytes)
    .digest("hex")}`;
}

export function voidBootstrapRecordReleaseRootIdV1(root) {
  return contentId(
    VOID_BOOTSTRAP_RECORD_RELEASE_ROOT_PREFIX_V1,
    root,
    "root_id",
  );
}

export function voidBootstrapRecordSigningPayloadV1(root, rawRecordId) {
  const recordId = requireVoidBootstrapRecordIdV2(rawRecordId);
  return Buffer.from(
    [root.signature_domain, root.root_id, recordId, ""].join("\n"),
    "utf8",
  );
}

export function validateVoidBootstrapRecordReleaseRootV1(
  rawRoot,
  { allowHold = true } = {},
) {
  const root = exactKeys(
    structuredClone(rawRoot),
    ROOT_KEYS,
    "VOID bootstrap record release root",
  );
  if (
    root.schema !== VOID_BOOTSTRAP_RECORD_RELEASE_ROOT_SCHEMA_V1 ||
    root.network !== VOID_NETWORK ||
    root.chain_id !== VOID_CHAIN_ID
  ) {
    throw new Error("VOID bootstrap record release-root network contract mismatch");
  }
  if (root.signature_domain !== VOID_BOOTSTRAP_RECORD_SIGNATURE_DOMAIN_V1) {
    throw new Error("VOID bootstrap record release-root signature domain mismatch");
  }
  validateFalseAuthority(root.authority, "VOID bootstrap record release-root authority");

  if (!ROOT_ID_RE.test(String(root.root_id || ""))) {
    throw new Error("VOID bootstrap record release-root ID is malformed");
  }
  const computedRootId = voidBootstrapRecordReleaseRootIdV1(root);
  if (root.root_id !== computedRootId) {
    throw new Error("VOID bootstrap record release-root ID does not match its content");
  }

  if (!Array.isArray(root.keys) || root.keys.length > 8) {
    throw new Error("VOID bootstrap record release-root key set is invalid");
  }

  const keys = [];
  const seen = new Set();
  for (const [index, rawKey] of root.keys.entries()) {
    const key = exactKeys(
      rawKey,
      ROOT_KEY_KEYS,
      `VOID bootstrap record release key ${index + 1}`,
    );
    if (key.algorithm !== "ed25519") {
      throw new Error("VOID bootstrap record release key algorithm must be ed25519");
    }
    if (!KEY_ID_RE.test(String(key.key_id || ""))) {
      throw new Error("VOID bootstrap record release key ID is malformed");
    }
    if (seen.has(key.key_id)) {
      throw new Error("VOID bootstrap record release root contains a duplicate key ID");
    }

    const der = canonicalBase64(
      key.public_key_spki_base64,
      "VOID bootstrap record release public key",
    );
    let publicKey;
    try {
      publicKey = crypto.createPublicKey({ key: der, format: "der", type: "spki" });
    } catch (error) {
      throw new Error(
        `VOID bootstrap record release public key is invalid: ${error.message}`,
      );
    }
    if (publicKey.asymmetricKeyType !== "ed25519") {
      throw new Error("VOID bootstrap record release public key is not Ed25519");
    }
    const canonicalDer = publicKey.export({ type: "spki", format: "der" });
    if (!Buffer.from(canonicalDer).equals(der)) {
      throw new Error("VOID bootstrap record release public key SPKI is not canonical DER");
    }
    if (voidBootstrapRecordReleaseKeyIdV1(der) !== key.key_id) {
      throw new Error("VOID bootstrap record release key ID does not match its public key");
    }

    seen.add(key.key_id);
    keys.push(Object.freeze({ ...key, publicKey }));
  }

  requireCanonicalSortedIds(keys.map((entry) => entry.key_id), "release-root keys");

  if (root.status === "hold_no_signing_keys") {
    if (!allowHold) {
      throw new Error("VOID bootstrap record release root is in hold state");
    }
    if (root.threshold !== 0 || keys.length !== 0) {
      throw new Error(
        "VOID bootstrap record hold root must have threshold zero and no keys",
      );
    }
  } else if (root.status === "active") {
    if (
      !Number.isSafeInteger(root.threshold) ||
      root.threshold < 1 ||
      root.threshold > keys.length
    ) {
      throw new Error("VOID bootstrap record active release-root threshold is invalid");
    }
  } else {
    throw new Error("VOID bootstrap record release-root status is invalid");
  }

  return Object.freeze({
    root: Object.freeze(structuredClone(root)),
    keys: Object.freeze(keys),
  });
}

export function validateVoidBootstrapRecordSignedIdV1(
  rawEnvelope,
  validatedRoot,
) {
  const rawRoot = validatedRoot?.root ? validatedRoot.root : validatedRoot;
  const rootValidation = validateVoidBootstrapRecordReleaseRootV1(rawRoot, {
    allowHold: false,
  });
  const root = rootValidation.root;

  const envelope = exactKeys(
    structuredClone(rawEnvelope),
    ENVELOPE_KEYS,
    "VOID bootstrap record signed-ID envelope",
  );
  if (envelope.schema !== VOID_BOOTSTRAP_RECORD_SIGNED_ID_SCHEMA_V1) {
    throw new Error("VOID bootstrap record signed-ID schema mismatch");
  }
  if (envelope.root_id !== root.root_id) {
    throw new Error("VOID bootstrap record signed-ID root ID mismatch");
  }
  const recordId = requireVoidBootstrapRecordIdV2(envelope.record_id);
  if (
    !Array.isArray(envelope.signatures) ||
    envelope.signatures.length < 1 ||
    envelope.signatures.length > 8
  ) {
    throw new Error("VOID bootstrap record signed-ID signature set is invalid");
  }

  const keyById = new Map(
    rootValidation.keys.map((entry) => [entry.key_id, entry]),
  );
  const payload = voidBootstrapRecordSigningPayloadV1(root, recordId);
  const seen = new Set();
  let validSignatureCount = 0;
  const signatureIds = [];

  for (const [index, rawSignature] of envelope.signatures.entries()) {
    const signature = exactKeys(
      rawSignature,
      SIGNATURE_KEYS,
      `VOID bootstrap record signature ${index + 1}`,
    );
    if (!KEY_ID_RE.test(String(signature.key_id || ""))) {
      throw new Error("VOID bootstrap record signature key ID is malformed");
    }
    if (seen.has(signature.key_id)) {
      throw new Error("VOID bootstrap record envelope contains a duplicate signature key ID");
    }
    const key = keyById.get(signature.key_id);
    if (!key) {
      throw new Error("VOID bootstrap record signature uses an unknown key");
    }
    const signatureBytes = canonicalBase64(
      signature.signature_base64,
      "VOID bootstrap record signature",
      64,
    );
    if (!crypto.verify(null, payload, key.publicKey, signatureBytes)) {
      throw new Error("VOID bootstrap record signature verification failed");
    }
    seen.add(signature.key_id);
    signatureIds.push(signature.key_id);
    validSignatureCount += 1;
  }

  requireCanonicalSortedIds(signatureIds, "record signatures");

  if (validSignatureCount < root.threshold) {
    throw new Error("VOID bootstrap record signature threshold was not met");
  }

  return Object.freeze({
    root,
    recordId,
    validSignatureCount,
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

export function loadVoidBootstrapRecordReleaseRootFileV1(rawPath, options = {}) {
  const loaded = readCanonicalRegularJson(
    rawPath,
    "VOID bootstrap record release root",
    256 * 1024,
  );
  return Object.freeze({
    target: loaded.target,
    ...validateVoidBootstrapRecordReleaseRootV1(loaded.value, options),
  });
}

export function loadVoidBootstrapRecordSignedIdFileV1(rawPath, validatedRoot) {
  const loaded = readCanonicalRegularJson(
    rawPath,
    "VOID bootstrap record signed-ID envelope",
    256 * 1024,
  );
  return Object.freeze({
    target: loaded.target,
    ...validateVoidBootstrapRecordSignedIdV1(loaded.value, validatedRoot),
  });
}
