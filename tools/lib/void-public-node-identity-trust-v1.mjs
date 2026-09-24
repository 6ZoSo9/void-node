import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  verifyVoidNodePublicOriginBindingV1,
} from "./void-node-public-origin-binding-v1.mjs";

export const VOID_PUBLIC_NODE_IDENTITY_TRUST_REGISTRY_SHA256 =
  "49f285908fa70c72ce036b44d9ead41e11fc1bd40092384636a2c0cc3a0d3790";

const HERE = dirname(fileURLToPath(import.meta.url));
export const VOID_PUBLIC_NODE_IDENTITY_TRUST_REGISTRY_PATH = resolve(
  HERE,
  "../../config/void-public-node-identity-trust-v1.json",
);

const NODE_ID_PATTERN = /^[0-9a-f]{32}$/u;
const FINGERPRINT_PATTERN = /^[0-9a-f]{64}$/u;

function fail(message) {
  throw new Error(message);
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    fail(`${label} keys mismatch`);
  }
}

export function loadReviewedVoidPublicNodeIdentityTrustV1() {
  const bytes = readFileSync(VOID_PUBLIC_NODE_IDENTITY_TRUST_REGISTRY_PATH);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== VOID_PUBLIC_NODE_IDENTITY_TRUST_REGISTRY_SHA256) {
    fail("reviewed public node identity trust registry bytes changed");
  }

  let registry;
  try {
    registry = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail("reviewed public node identity trust registry is not valid JSON");
  }

  exactKeys(
    registry,
    ["$schema", "marker", "version", "status", "network", "entries", "authority"],
    "trust registry",
  );
  if (
    registry.marker !== "VOID_PUBLIC_NODE_IDENTITY_TRUST_V1"
    || registry.version !== 1
    || registry.status !== "reviewed"
  ) {
    fail("reviewed public node identity trust registry identity mismatch");
  }
  if (
    registry.network?.name !== "VOID Mainnet-0"
    || registry.network?.identity !== "mainnet0"
    || registry.network?.chain_id !== 2050
  ) {
    fail("reviewed public node identity trust registry network mismatch");
  }
  if (!Array.isArray(registry.entries) || registry.entries.length < 1) {
    fail("reviewed public node identity trust registry has no entries");
  }

  const seenNodeIds = new Set();
  const entries = registry.entries.map((entry, index) => {
    if (
      !entry
      || typeof entry !== "object"
      || Array.isArray(entry)
      || typeof entry.node_id !== "string"
      || !NODE_ID_PATTERN.test(entry.node_id)
      || entry.key_type !== "ed25519"
      || typeof entry.public_key_fingerprint_sha256 !== "string"
      || !FINGERPRINT_PATTERN.test(entry.public_key_fingerprint_sha256)
      || entry.status !== "trusted"
    ) {
      fail(`reviewed public node identity trust entry ${index} is invalid`);
    }
    if (seenNodeIds.has(entry.node_id)) {
      fail("reviewed public node identity trust registry contains duplicate node_id");
    }
    seenNodeIds.add(entry.node_id);
    return Object.freeze({
      node_id: entry.node_id,
      key_type: entry.key_type,
      public_key_fingerprint_sha256: entry.public_key_fingerprint_sha256,
      status: entry.status,
    });
  });

  const authority = registry.authority || {};
  if (
    authority.verification_only !== true
    || authority.mutation_authority_granted !== false
    || authority.work_credit_authority_granted !== false
    || authority.wallet_or_signer_access !== false
    || authority.transaction_authority_granted !== false
    || authority.validator_authority_granted !== false
    || authority.treasury_or_liquidity_authority_granted !== false
    || authority.funds_movement_authority_granted !== false
  ) {
    fail("reviewed public node identity trust registry authority mismatch");
  }

  return Object.freeze({
    marker: registry.marker,
    sha256,
    entries: Object.freeze(entries),
    authority: Object.freeze({
      verification_only: true,
      mutation_authority_granted: false,
      work_credit_authority_granted: false,
      wallet_or_signer_access: false,
      transaction_authority_granted: false,
      validator_authority_granted: false,
      treasury_or_liquidity_authority_granted: false,
      funds_movement_authority_granted: false,
    }),
  });
}

export function reviewedVoidPublicNodeIdentityTrustEntryV1(nodeId) {
  if (typeof nodeId !== "string" || !NODE_ID_PATTERN.test(nodeId)) {
    fail("live health node_id is invalid");
  }
  const registry = loadReviewedVoidPublicNodeIdentityTrustV1();
  const entry = registry.entries.find((candidate) => candidate.node_id === nodeId);
  if (!entry) {
    fail("live health node_id is not present in the reviewed public node identity trust registry");
  }
  return Object.freeze({ registry, entry });
}

export function verifyReviewedVoidNodePublicOriginBindingV1(
  bindingValue,
  {
    expectedOrigin,
    expectedNodeId,
    nowMs,
  } = {},
) {
  const { registry, entry } = reviewedVoidPublicNodeIdentityTrustEntryV1(
    expectedNodeId,
  );
  const verified = verifyVoidNodePublicOriginBindingV1(bindingValue, {
    expectedOrigin,
    expectedNodeId,
    expectedPublicKeyFingerprintSha256:
      entry.public_key_fingerprint_sha256,
    ...(nowMs === undefined ? {} : { nowMs }),
  });
  return Object.freeze({
    ...verified,
    trust_registry_marker: registry.marker,
    trust_registry_sha256: registry.sha256,
    trust_registry_node_id: entry.node_id,
    trust_registry_public_key_fingerprint_sha256:
      entry.public_key_fingerprint_sha256,
  });
}
