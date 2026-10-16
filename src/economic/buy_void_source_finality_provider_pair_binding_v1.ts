import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const VOID_BUY_VOID_SOURCE_FINALITY_PROVIDER_PAIR_BINDING_V1 =
  "VOID_BUY_VOID_SOURCE_FINALITY_PROVIDER_PAIR_BINDING_V1";

export const VOID_BUY_VOID_SOURCE_FINALITY_PROVIDER_PAIR_BINDING_PATH_V1 =
  "/var/lib/void-source-finality-v7/provider-pair-binding-v1.json";

export const VOID_BUY_VOID_SOURCE_FINALITY_PROVIDER_PAIR_BINDING_AUTHORITY_V1 =
  Object.freeze({
    source_only_gate: true,
    root_custodied_receipt_required: true,
    operator_approved_provider_pair_required: true,
    same_chain_distinct_provider_identities_required: true,
    same_chain_distinct_rpc_fingerprints_required: true,
    deployment_receipt_binding_required: true,
    accepted_enforcement_set_binding_required: true,
    verified_result_module_brand_required: true,
    legal_provider_identity_verified: false,
    rpc_contact: false,
    rpc_write: false,
    host_mutation: false,
    service_mutation: false,
    credential_access: false,
    wallet_or_signer_access: false,
    transaction_signing: false,
    transaction_broadcast: false,
    production_source_finality_authority_ready: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const RECEIPT_MARKER =
  "VOID_BUY_VOID_SOURCE_FINALITY_PROVIDER_PAIR_BINDING_RECEIPT_V1";
const MAX_RECEIPT_BYTES = 64 * 1024;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const DEPLOYMENT_RECEIPT_ID = /^voidbsfdep1_[0-9a-f]{64}$/u;
const RECEIPT_ID = /^voidbsfpp1_[0-9a-f]{64}$/u;

type SourceChainV1 = "base" | "ethereum";

type ProviderEndpointV1 = {
  rpc_identity: string;
  rpc_url_fingerprint_sha256: string;
};

type ProviderRailV1 = {
  source_chain: SourceChainV1;
  primary: ProviderEndpointV1;
  secondary: ProviderEndpointV1;
};

type ProviderPairAuthorityV1 = {
  operator_approved_provider_pair_binding: true;
  legal_provider_identity_verified: false;
  rpc_contact: false;
  production_source_finality_authority_ready: false;
  public_presale_activation: false;
  funds_movement: false;
};

export type BuyVoidSourceFinalityProviderPairBindingReceiptV1 = {
  schema: "void_buy_void_source_finality_provider_pair_binding_v1";
  marker: typeof RECEIPT_MARKER;
  version: 1;
  status: "operator_approved_provider_pair_binding";
  deployment_receipt_id: string;
  accepted_enforcement_set_sha256: string;
  rails: [ProviderRailV1, ProviderRailV1];
  authority: ProviderPairAuthorityV1;
  receipt_id: string;
};

export type BuyVoidSourceFinalityProviderPairVerifiedV1 = {
  ok: true;
  marker: typeof VOID_BUY_VOID_SOURCE_FINALITY_PROVIDER_PAIR_BINDING_V1;
  version: 1;
  status: "provider_pair_binding_verified_production_authority_still_hold";
  receipt_id: string;
  deployment_receipt_id: string;
  accepted_enforcement_set_sha256: string;
  source_chain: SourceChainV1;
  primary_rpc_identity: string;
  primary_rpc_url_fingerprint_sha256: string;
  secondary_rpc_identity: string;
  secondary_rpc_url_fingerprint_sha256: string;
  operator_approved_provider_pair_binding: true;
  same_chain_distinct_provider_identities_verified: true;
  same_chain_distinct_rpc_fingerprints_verified: true;
  legal_provider_identity_verified: false;
  rpc_contact: false;
  production_source_finality_authority_ready: false;
  public_presale_activation: false;
  funds_movement: false;
};

export type BuyVoidSourceFinalityProviderPairHeldV1 = {
  ok: false;
  marker: typeof VOID_BUY_VOID_SOURCE_FINALITY_PROVIDER_PAIR_BINDING_V1;
  version: 1;
  status: "held";
  reason: string;
  provider_pair_binding_verified: false;
  legal_provider_identity_verified: false;
  rpc_contact: false;
  production_source_finality_authority_ready: false;
  public_presale_activation: false;
  funds_movement: false;
};

const verifiedResults = new WeakSet<object>();

function fail(code: string): never {
  throw new Error(code);
}

function plain(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function exactKeys(
  value: unknown,
  keys: readonly string[],
  code: string,
): asserts value is Record<string, unknown> {
  if (!plain(value)) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Reflect.ownKeys(descriptors);
  if (actual.some((key) => typeof key !== "string")) fail(code);
  const sorted = [...actual].sort();
  const expected = [...keys].sort();
  if (
    sorted.length !== expected.length ||
    sorted.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(code);
    }
  }
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (plain(value)) {
    return "{" + Object.keys(value).sort().map(
      (key) => JSON.stringify(key) + ":" + canonicalJson(value[key]),
    ).join(",") + "}";
  }
  fail("provider_pair_canonical_value_invalid");
}

function sha256(value: string | Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function safeId(value: unknown, code: string): string {
  if (typeof value !== "string" || !SAFE_ID.test(value)) fail(code);
  return value;
}

function hash64(value: unknown, code: string): string {
  if (typeof value !== "string" || !SHA256.test(value)) fail(code);
  return value;
}

function deploymentReceiptId(value: unknown): string {
  if (typeof value !== "string" || !DEPLOYMENT_RECEIPT_ID.test(value)) {
    fail("provider_pair_deployment_receipt_id_invalid");
  }
  return value;
}

function sourceChain(value: unknown): SourceChainV1 {
  if (value !== "base" && value !== "ethereum") {
    fail("provider_pair_source_chain_invalid");
  }
  return value;
}

function endpoint(value: unknown, label: string): ProviderEndpointV1 {
  exactKeys(
    value,
    ["rpc_identity", "rpc_url_fingerprint_sha256"],
    "provider_pair_endpoint_shape_invalid:" + label,
  );
  return Object.freeze({
    rpc_identity: safeId(
      value.rpc_identity,
      "provider_pair_rpc_identity_invalid:" + label,
    ),
    rpc_url_fingerprint_sha256: hash64(
      value.rpc_url_fingerprint_sha256,
      "provider_pair_rpc_fingerprint_invalid:" + label,
    ),
  });
}

function rail(value: unknown, expected: SourceChainV1): ProviderRailV1 {
  exactKeys(
    value,
    ["source_chain", "primary", "secondary"],
    "provider_pair_rail_shape_invalid:" + expected,
  );
  const chain = sourceChain(value.source_chain);
  if (chain !== expected) fail("provider_pair_rail_order_invalid");
  const primary = endpoint(value.primary, expected + ":primary");
  const secondary = endpoint(value.secondary, expected + ":secondary");
  if (primary.rpc_identity === secondary.rpc_identity) {
    fail("provider_pair_rpc_identities_not_distinct:" + expected);
  }
  if (
    primary.rpc_url_fingerprint_sha256 ===
    secondary.rpc_url_fingerprint_sha256
  ) {
    fail("provider_pair_rpc_fingerprints_not_distinct:" + expected);
  }
  return Object.freeze({
    source_chain: chain,
    primary,
    secondary,
  });
}

function authority(value: unknown): ProviderPairAuthorityV1 {
  exactKeys(
    value,
    [
      "funds_movement",
      "legal_provider_identity_verified",
      "operator_approved_provider_pair_binding",
      "production_source_finality_authority_ready",
      "public_presale_activation",
      "rpc_contact",
    ],
    "provider_pair_authority_shape_invalid",
  );
  if (
    value.operator_approved_provider_pair_binding !== true ||
    value.legal_provider_identity_verified !== false ||
    value.rpc_contact !== false ||
    value.production_source_finality_authority_ready !== false ||
    value.public_presale_activation !== false ||
    value.funds_movement !== false
  ) {
    fail("provider_pair_authority_invalid");
  }
  return Object.freeze({
    operator_approved_provider_pair_binding: true,
    legal_provider_identity_verified: false,
    rpc_contact: false,
    production_source_finality_authority_ready: false,
    public_presale_activation: false,
    funds_movement: false,
  });
}

export function buyVoidSourceFinalityProviderPairBindingReceiptIdV1(
  material: Omit<BuyVoidSourceFinalityProviderPairBindingReceiptV1, "receipt_id">,
): string {
  return "voidbsfpp1_" + sha256(canonicalJson(material));
}

function normalizeReceipt(
  raw: unknown,
): BuyVoidSourceFinalityProviderPairBindingReceiptV1 {
  exactKeys(
    raw,
    [
      "accepted_enforcement_set_sha256",
      "authority",
      "deployment_receipt_id",
      "marker",
      "rails",
      "receipt_id",
      "schema",
      "status",
      "version",
    ],
    "provider_pair_receipt_shape_invalid",
  );
  if (
    raw.schema !== "void_buy_void_source_finality_provider_pair_binding_v1" ||
    raw.marker !== RECEIPT_MARKER ||
    raw.version !== 1 ||
    raw.status !== "operator_approved_provider_pair_binding" ||
    !Array.isArray(raw.rails) ||
    raw.rails.length !== 2
  ) {
    fail("provider_pair_receipt_identity_invalid");
  }
  const normalized = Object.freeze({
    schema: "void_buy_void_source_finality_provider_pair_binding_v1" as const,
    marker: RECEIPT_MARKER,
    version: 1 as const,
    status: "operator_approved_provider_pair_binding" as const,
    deployment_receipt_id: deploymentReceiptId(raw.deployment_receipt_id),
    accepted_enforcement_set_sha256: hash64(
      raw.accepted_enforcement_set_sha256,
      "provider_pair_enforcement_set_invalid",
    ),
    rails: Object.freeze([
      rail(raw.rails[0], "base"),
      rail(raw.rails[1], "ethereum"),
    ]) as unknown as [ProviderRailV1, ProviderRailV1],
    authority: authority(raw.authority),
    receipt_id:
      typeof raw.receipt_id === "string" && RECEIPT_ID.test(raw.receipt_id)
        ? raw.receipt_id
        : fail("provider_pair_receipt_id_invalid"),
  });
  const material = {
    schema: normalized.schema,
    marker: normalized.marker,
    version: normalized.version,
    status: normalized.status,
    deployment_receipt_id: normalized.deployment_receipt_id,
    accepted_enforcement_set_sha256:
      normalized.accepted_enforcement_set_sha256,
    rails: normalized.rails,
    authority: normalized.authority,
  };
  if (
    normalized.receipt_id !==
    buyVoidSourceFinalityProviderPairBindingReceiptIdV1(material)
  ) {
    fail("provider_pair_receipt_id_mismatch");
  }
  return normalized;
}

function metadataSame(a: fs.Stats, b: fs.Stats): boolean {
  return (
    a.dev === b.dev &&
    a.ino === b.ino &&
    a.uid === b.uid &&
    a.gid === b.gid &&
    a.mode === b.mode &&
    a.nlink === b.nlink &&
    a.size === b.size &&
    a.mtimeMs === b.mtimeMs &&
    a.ctimeMs === b.ctimeMs
  );
}

function assertRootOwnedAncestors(file: string): void {
  const parsed = path.parse(file);
  let cursor = parsed.root;
  const directories = path.dirname(file)
    .slice(parsed.root.length)
    .split(path.sep)
    .filter(Boolean);
  for (const segment of directories) {
    cursor = path.join(cursor, segment);
    const st = fs.lstatSync(cursor);
    if (
      !st.isDirectory() ||
      st.isSymbolicLink() ||
      st.uid !== 0 ||
      (st.mode & 0o022) !== 0 ||
      fs.realpathSync.native(cursor) !== cursor
    ) {
      fail("provider_pair_receipt_ancestor_custody_invalid");
    }
  }
}

function readRootCustodiedReceipt(file: string): Buffer {
  if (
    file !== VOID_BUY_VOID_SOURCE_FINALITY_PROVIDER_PAIR_BINDING_PATH_V1 ||
    !path.isAbsolute(file) ||
    path.normalize(file) !== file
  ) {
    fail("provider_pair_receipt_path_invalid");
  }
  assertRootOwnedAncestors(file);
  const before = fs.lstatSync(file);
  if (
    !before.isFile() ||
    before.isSymbolicLink() ||
    before.uid !== 0 ||
    before.gid !== 0 ||
    before.nlink !== 1 ||
    (before.mode & 0o7777) !== 0o444 ||
    before.size < 2 ||
    before.size > MAX_RECEIPT_BYTES ||
    fs.realpathSync.native(file) !== file
  ) {
    fail("provider_pair_receipt_custody_invalid");
  }
  const fd = fs.openSync(
    file,
    fs.constants.O_RDONLY | Number(fs.constants.O_NOFOLLOW || 0),
  );
  try {
    const opened = fs.fstatSync(fd);
    if (!metadataSame(before, opened)) {
      fail("provider_pair_receipt_open_identity_mismatch");
    }
    const bytes = fs.readFileSync(fd);
    const after = fs.fstatSync(fd);
    const visible = fs.lstatSync(file);
    if (
      bytes.length !== after.size ||
      !metadataSame(opened, after) ||
      !metadataSame(after, visible)
    ) {
      fail("provider_pair_receipt_changed_during_read");
    }
    return Buffer.from(bytes);
  } finally {
    fs.closeSync(fd);
  }
}

function held(reason: string): BuyVoidSourceFinalityProviderPairHeldV1 {
  return Object.freeze({
    ok: false,
    marker: VOID_BUY_VOID_SOURCE_FINALITY_PROVIDER_PAIR_BINDING_V1,
    version: 1,
    status: "held",
    reason,
    provider_pair_binding_verified: false,
    legal_provider_identity_verified: false,
    rpc_contact: false,
    production_source_finality_authority_ready: false,
    public_presale_activation: false,
    funds_movement: false,
  });
}

export function verifyBuyVoidSourceFinalityProviderPairBindingV1(input: {
  receipt_path?: string;
  deployment_receipt_id: string;
  accepted_enforcement_set_sha256: string;
  source_chain: SourceChainV1;
  primary_rpc_identity: string;
  primary_rpc_url_fingerprint_sha256: string;
  secondary_rpc_identity: string;
  secondary_rpc_url_fingerprint_sha256: string;
}): BuyVoidSourceFinalityProviderPairVerifiedV1 |
  BuyVoidSourceFinalityProviderPairHeldV1 {
  try {
    const deployment = deploymentReceiptId(input.deployment_receipt_id);
    const enforcement = hash64(
      input.accepted_enforcement_set_sha256,
      "provider_pair_expected_enforcement_set_invalid",
    );
    const chain = sourceChain(input.source_chain);
    const primaryIdentity = safeId(
      input.primary_rpc_identity,
      "provider_pair_expected_primary_identity_invalid",
    );
    const primaryFingerprint = hash64(
      input.primary_rpc_url_fingerprint_sha256,
      "provider_pair_expected_primary_fingerprint_invalid",
    );
    const secondaryIdentity = safeId(
      input.secondary_rpc_identity,
      "provider_pair_expected_secondary_identity_invalid",
    );
    const secondaryFingerprint = hash64(
      input.secondary_rpc_url_fingerprint_sha256,
      "provider_pair_expected_secondary_fingerprint_invalid",
    );
    if (primaryIdentity === secondaryIdentity) {
      fail("provider_pair_expected_identities_not_distinct");
    }
    if (primaryFingerprint === secondaryFingerprint) {
      fail("provider_pair_expected_fingerprints_not_distinct");
    }

    const bytes = readRootCustodiedReceipt(
      input.receipt_path ??
        VOID_BUY_VOID_SOURCE_FINALITY_PROVIDER_PAIR_BINDING_PATH_V1,
    );
    let parsed: unknown;
    try {
      parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    } catch {
      fail("provider_pair_receipt_json_invalid");
    }
    const receipt = normalizeReceipt(parsed);
    if (canonicalJson(receipt) + "\n" !== bytes.toString("utf8")) {
      fail("provider_pair_receipt_not_canonical");
    }
    if (receipt.deployment_receipt_id !== deployment) {
      fail("provider_pair_deployment_receipt_mismatch");
    }
    if (receipt.accepted_enforcement_set_sha256 !== enforcement) {
      fail("provider_pair_enforcement_set_mismatch");
    }
    const selected = receipt.rails.find((row) => row.source_chain === chain);
    if (!selected) fail("provider_pair_source_chain_missing");
    if (
      selected.primary.rpc_identity !== primaryIdentity ||
      selected.primary.rpc_url_fingerprint_sha256 !== primaryFingerprint ||
      selected.secondary.rpc_identity !== secondaryIdentity ||
      selected.secondary.rpc_url_fingerprint_sha256 !== secondaryFingerprint
    ) {
      fail("provider_pair_observation_binding_mismatch");
    }
    const result = Object.freeze({
      ok: true as const,
      marker: VOID_BUY_VOID_SOURCE_FINALITY_PROVIDER_PAIR_BINDING_V1,
      version: 1 as const,
      status:
        "provider_pair_binding_verified_production_authority_still_hold" as const,
      receipt_id: receipt.receipt_id,
      deployment_receipt_id: receipt.deployment_receipt_id,
      accepted_enforcement_set_sha256:
        receipt.accepted_enforcement_set_sha256,
      source_chain: chain,
      primary_rpc_identity: primaryIdentity,
      primary_rpc_url_fingerprint_sha256: primaryFingerprint,
      secondary_rpc_identity: secondaryIdentity,
      secondary_rpc_url_fingerprint_sha256: secondaryFingerprint,
      operator_approved_provider_pair_binding: true as const,
      same_chain_distinct_provider_identities_verified: true as const,
      same_chain_distinct_rpc_fingerprints_verified: true as const,
      legal_provider_identity_verified: false as const,
      rpc_contact: false as const,
      production_source_finality_authority_ready: false as const,
      public_presale_activation: false as const,
      funds_movement: false as const,
    });
    verifiedResults.add(result);
    return result;
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "provider_pair_binding_verification_failed",
    );
  }
}

export function assertBuyVoidSourceFinalityProviderPairVerifiedV1(
  value: unknown,
): asserts value is BuyVoidSourceFinalityProviderPairVerifiedV1 {
  if (!plain(value) || value.ok !== true || !verifiedResults.has(value)) {
    fail("provider_pair_verified_result_not_module_branded");
  }
  if (
    value.marker !== VOID_BUY_VOID_SOURCE_FINALITY_PROVIDER_PAIR_BINDING_V1 ||
    value.status !==
      "provider_pair_binding_verified_production_authority_still_hold" ||
    value.operator_approved_provider_pair_binding !== true ||
    value.same_chain_distinct_provider_identities_verified !== true ||
    value.same_chain_distinct_rpc_fingerprints_verified !== true ||
    value.legal_provider_identity_verified !== false ||
    value.rpc_contact !== false ||
    value.production_source_finality_authority_ready !== false ||
    value.public_presale_activation !== false ||
    value.funds_movement !== false
  ) {
    fail("provider_pair_verified_result_invalid");
  }
}
