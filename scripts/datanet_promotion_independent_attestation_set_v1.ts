import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  materializePublicAgentServiceProviderTrustRegistrySnapshotV1,
  resolveProviderKeyBindingFromTrustRegistrySnapshotV1,
} from "./public_agent_service_provider_trust_registry_snapshot_v1.js";

export const DATANET_PROMOTION_INDEPENDENT_ATTESTATION_SET_MARKER =
  "VOID_DATANET_PROMOTION_INDEPENDENT_ATTESTATION_SET_V1" as const;
export const DATANET_PROMOTION_INDEPENDENT_ATTESTATION_MARKER =
  "VOID_DATANET_PROMOTION_INDEPENDENT_ATTESTATION_V1" as const;
export const DATANET_PROMOTION_INDEPENDENT_ATTESTATION_SIGNATURE_DOMAIN =
  "void.datanet.promotion.independent-attestation.v1" as const;
export const DATANET_PROMOTION_INDEPENDENT_ATTESTATION_CANONICALIZATION =
  "void.canonical-json.sorted-keys.v1" as const;
export const DATANET_PROMOTION_INDEPENDENT_ATTESTATION_SET_ID_PREFIX =
  "voiddpias1_" as const;
export const DATANET_PROMOTION_INDEPENDENT_ATTESTATION_ID_PREFIX =
  "voiddpia1_" as const;

type JsonValue =
  | null
  | string
  | boolean
  | number
  | JsonValue[]
  | { [key: string]: JsonValue };

type RecordValue = Record<string, unknown>;

const SHA256 = /^[0-9a-f]{64}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const SET_ID = /^voiddpias1_[0-9a-f]{64}$/;
const ATTESTATION_ID = /^voiddpia1_[0-9a-f]{64}$/;
const SNAPSHOT_ID = /^voidapts1_[0-9a-f]{64}$/;
const KEY_ID = /^ed25519:[0-9a-f]{64}$/;
const BASE64_SIGNATURE = /^[A-Za-z0-9+/]{86}==$/;
const MAX_JSON_BYTES = 2 * 1024 * 1024;

const AUTHORITY_KEYS = [
  "evidence_only",
  "chain2050_write_authorized",
  "validator_authority_granted",
  "governance_mutation_authorized",
  "signer_or_wallet_access",
  "work_credit_award_authorized",
  "runtime_service_action",
  "funds_action",
] as const;

const SET_KEYS = [
  "marker",
  "version",
  "object",
  "trust_snapshot_id",
  "attestations",
  "authority",
] as const;

const OBJECT_KEYS = [
  "object_id",
  "content_sha256",
  "byte_length",
] as const;

const ATTESTATION_KEYS = [
  "marker",
  "version",
  "kind",
  "provider_id",
  "provider_key_binding_id",
  "signing_key_id",
  "object_id",
  "content_sha256",
  "byte_length",
  "attested_at_utc",
  "verification_run_id",
  "evidence_sha256",
  "exact_bytes_verified",
  "conflict_detected",
  "replay_verified",
  "signature_scheme",
  "signature_domain",
  "canonicalization",
  "nonce",
  "signature_base64",
  "attestation_id",
] as const;

const SIGNING_BODY_KEYS = ATTESTATION_KEYS.filter(
  (key) => key !== "signature_base64" && key !== "attestation_id",
);

function fail(message: string): never {
  throw new Error(message);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) fail(message);
}

function record(value: unknown, label: string): RecordValue {
  assertCondition(
    typeof value === "object" && value !== null && !Array.isArray(value),
    `${label} must be an object`,
  );
  return value as RecordValue;
}

function exactKeys(
  value: RecordValue,
  label: string,
  expected: readonly string[],
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  assertCondition(
    JSON.stringify(actual) === JSON.stringify(wanted),
    `${label} keys must be exactly: ${wanted.join(", ")}`,
  );
}

function stringValue(
  value: unknown,
  label: string,
  pattern?: RegExp,
  max = 512,
): string {
  assertCondition(typeof value === "string", `${label} must be a string`);
  assertCondition(value === value.trim(), `${label} must be trimmed`);
  assertCondition(value.length >= 1 && value.length <= max, `${label} length invalid`);
  if (pattern) assertCondition(pattern.test(value), `${label} format invalid`);
  return value;
}

function integerValue(
  value: unknown,
  label: string,
  min: number,
  max: number,
): number {
  assertCondition(Number.isSafeInteger(value), `${label} must be a safe integer`);
  assertCondition(
    (value as number) >= min && (value as number) <= max,
    `${label} outside allowed range`,
  );
  return value as number;
}

function booleanLiteral(
  value: unknown,
  label: string,
  expected: boolean,
): void {
  assertCondition(value === expected, `${label} must be ${expected}`);
}

function isoUtc(value: unknown, label: string): string {
  const exact = stringValue(value, label, undefined, 20);
  assertCondition(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(exact),
    `${label} must be second-precision UTC`,
  );
  const ms = Date.parse(exact);
  assertCondition(Number.isFinite(ms), `${label} invalid UTC`);
  assertCondition(
    new Date(ms).toISOString() === exact.replace("Z", ".000Z"),
    `${label} not canonical UTC`,
  );
  return exact;
}

function canonicalize(value: unknown): JsonValue {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    assertCondition(Number.isSafeInteger(value), "canonical JSON rejects unsafe numbers");
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  const source = record(value, "canonical JSON value");
  const out: { [key: string]: JsonValue } = {};
  for (const key of Object.keys(source).sort()) {
    assertCondition(source[key] !== undefined, "canonical JSON rejects undefined");
    out[key] = canonicalize(source[key]);
  }
  return out;
}

export function datanetPromotionCanonicalJsonV1(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function sha256Hex(value: string | Uint8Array): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function exactSigningBody(
  attestation: RecordValue,
): RecordValue {
  return Object.fromEntries(
    SIGNING_BODY_KEYS.map((key) => [key, attestation[key]]),
  );
}

export function datanetPromotionIndependentAttestationSigningBytesV1(
  attestation: RecordValue,
): Buffer {
  return Buffer.from(
    DATANET_PROMOTION_INDEPENDENT_ATTESTATION_SIGNATURE_DOMAIN
      + "\n"
      + datanetPromotionCanonicalJsonV1(exactSigningBody(attestation)),
    "utf8",
  );
}

export function datanetPromotionIndependentAttestationIdV1(
  attestationWithoutId: RecordValue,
): string {
  return DATANET_PROMOTION_INDEPENDENT_ATTESTATION_ID_PREFIX
    + sha256Hex(datanetPromotionCanonicalJsonV1(attestationWithoutId));
}

function evidenceMaterialHash(value: RecordValue): string {
  const { evidence_sha256: _ignored, ...material } = value;
  return sha256Hex(datanetPromotionCanonicalJsonV1(material));
}

function validateAuthority(value: unknown): void {
  const authority = record(value, "authority");
  exactKeys(authority, "authority", AUTHORITY_KEYS);
  booleanLiteral(authority.evidence_only, "authority.evidence_only", true);
  for (const key of AUTHORITY_KEYS.filter((key) => key !== "evidence_only")) {
    booleanLiteral(authority[key], `authority.${key}`, false);
  }
}

function validateAttestationShape(
  value: unknown,
): RecordValue {
  const a = record(value, "attestation");
  exactKeys(a, "attestation", ATTESTATION_KEYS);
  assertCondition(
    a.marker === DATANET_PROMOTION_INDEPENDENT_ATTESTATION_MARKER,
    "attestation marker invalid",
  );
  assertCondition(a.version === 1, "attestation version must be 1");
  assertCondition(
    a.kind === "corroboration" || a.kind === "reproducibility",
    "attestation kind invalid",
  );
  stringValue(a.provider_id, "attestation.provider_id", SAFE_ID, 128);
  stringValue(
    a.provider_key_binding_id,
    "attestation.provider_key_binding_id",
    /^voidapkb1_[0-9a-f]{64}$/,
    74,
  );
  stringValue(a.signing_key_id, "attestation.signing_key_id", KEY_ID, 72);
  stringValue(a.object_id, "attestation.object_id", undefined, 512);
  stringValue(a.content_sha256, "attestation.content_sha256", SHA256, 64);
  integerValue(a.byte_length, "attestation.byte_length", 1, 268435456);
  isoUtc(a.attested_at_utc, "attestation.attested_at_utc");
  stringValue(a.verification_run_id, "attestation.verification_run_id", SAFE_ID, 128);
  stringValue(a.evidence_sha256, "attestation.evidence_sha256", SHA256, 64);
  booleanLiteral(
    a.exact_bytes_verified,
    "attestation.exact_bytes_verified",
    true,
  );
  booleanLiteral(
    a.conflict_detected,
    "attestation.conflict_detected",
    false,
  );
  assertCondition(
    typeof a.replay_verified === "boolean",
    "attestation.replay_verified must be boolean",
  );
  if (a.kind === "reproducibility") {
    booleanLiteral(
      a.replay_verified,
      "reproducibility replay_verified",
      true,
    );
  }
  assertCondition(a.signature_scheme === "ed25519", "signature scheme must be ed25519");
  assertCondition(
    a.signature_domain ===
      DATANET_PROMOTION_INDEPENDENT_ATTESTATION_SIGNATURE_DOMAIN,
    "signature domain invalid",
  );
  assertCondition(
    a.canonicalization ===
      DATANET_PROMOTION_INDEPENDENT_ATTESTATION_CANONICALIZATION,
    "canonicalization invalid",
  );
  stringValue(a.nonce, "attestation.nonce", SAFE_ID, 128);
  const signature = stringValue(
    a.signature_base64,
    "attestation.signature_base64",
    BASE64_SIGNATURE,
    88,
  );
  const signatureBytes = Buffer.from(signature, "base64");
  assertCondition(signatureBytes.length === 64, "Ed25519 signature must be 64 bytes");
  assertCondition(
    signatureBytes.toString("base64") === signature,
    "signature_base64 must be canonical",
  );
  const attestationId = stringValue(
    a.attestation_id,
    "attestation.attestation_id",
    ATTESTATION_ID,
    74,
  );
  const withoutId: RecordValue = { ...a };
  delete withoutId.attestation_id;
  assertCondition(
    attestationId === datanetPromotionIndependentAttestationIdV1(withoutId),
    "attestation_id does not match canonical signed envelope",
  );
  return a;
}

function verifyAttestationIdentityAndSignature(
  trustInput: unknown,
  expectedTrustRootId: string,
  trustSnapshotId: string,
  attestation: RecordValue,
): void {
  const atUtc = attestation.attested_at_utc as string;
  const providerId = attestation.provider_id as string;
  const binding =
    resolveProviderKeyBindingFromTrustRegistrySnapshotV1(
      trustInput,
      expectedTrustRootId,
      providerId,
      atUtc,
    );
  assertCondition(
    binding.binding_id === attestation.provider_key_binding_id,
    "attestation provider binding ID mismatch",
  );
  assertCondition(
    binding.key_id === attestation.signing_key_id,
    "attestation signing key ID mismatch",
  );
  const publicKey = crypto.createPublicKey(binding.public_key_pem);
  assertCondition(
    publicKey.asymmetricKeyType === "ed25519",
    "resolved provider key must be Ed25519",
  );
  const verified = crypto.verify(
    null,
    datanetPromotionIndependentAttestationSigningBytesV1(attestation),
    publicKey,
    Buffer.from(attestation.signature_base64 as string, "base64"),
  );
  assertCondition(verified, "independent attestation signature invalid");
  assertCondition(SNAPSHOT_ID.test(trustSnapshotId), "trust snapshot ID invalid");
}

function externalEvidenceFromSet(
  setId: string,
  objectId: string,
  contentSha256: string,
  corroborationCount: number,
  reproductionCount: number,
): RecordValue {
  const corroboration: RecordValue = {
    object_id: objectId,
    sha256: contentSha256,
    source_locator:
      `evidence://void/datanet/promotion-independent-attestation-set/${setId}/corroboration`,
    independent_source_count: corroborationCount,
    conflict_detected: false,
  };
  corroboration.evidence_sha256 = evidenceMaterialHash(corroboration);

  const reproducibility: RecordValue = {
    object_id: objectId,
    sha256: contentSha256,
    source_locator:
      `evidence://void/datanet/promotion-independent-attestation-set/${setId}/reproducibility`,
    independent_verifier_count: reproductionCount,
    replay_verified: true,
  };
  reproducibility.evidence_sha256 = evidenceMaterialHash(reproducibility);

  return {
    schema: "void_datanet_promotion_external_evidence_v1",
    marker: "VOID_DATANET_PROMOTION_EXTERNAL_EVIDENCE_V1",
    version: 1,
    corroboration_evidence: corroboration,
    reproducibility_evidence: reproducibility,
    authority: {
      evidence_only: true,
      chain2050_write_authorized: false,
      validator_authority_granted: false,
      governance_mutation_authorized: false,
      signer_or_wallet_access: false,
      work_credit_award_authorized: false,
      runtime_service_action: false,
      funds_action: false,
    },
  };
}

export function materializeDatanetPromotionIndependentAttestationSetV1(
  trustInput: unknown,
  expectedTrustRootId: string,
  setInputValue: unknown,
): {
  set_id: string;
  external_evidence: RecordValue;
  providers: string[];
  provider_key_ids: string[];
} {
  const trustPacket =
    materializePublicAgentServiceProviderTrustRegistrySnapshotV1(
      trustInput,
      expectedTrustRootId,
    );
  assertCondition(
    trustPacket.status === "operator_signed_snapshot_verified",
    "promotion attestations require an operator-signed provider trust snapshot",
  );

  const setInput = record(setInputValue, "attestation set");
  exactKeys(setInput, "attestation set", SET_KEYS);
  assertCondition(
    setInput.marker === DATANET_PROMOTION_INDEPENDENT_ATTESTATION_SET_MARKER,
    "attestation-set marker invalid",
  );
  assertCondition(setInput.version === 1, "attestation-set version must be 1");

  const object = record(setInput.object, "attestation set object");
  exactKeys(object, "attestation set object", OBJECT_KEYS);
  const objectId = stringValue(object.object_id, "object.object_id", undefined, 512);
  const contentSha256 = stringValue(
    object.content_sha256,
    "object.content_sha256",
    SHA256,
    64,
  );
  const byteLength = integerValue(
    object.byte_length,
    "object.byte_length",
    1,
    268435456,
  );

  const trustSnapshotId = stringValue(
    setInput.trust_snapshot_id,
    "trust_snapshot_id",
    SNAPSHOT_ID,
    74,
  );
  assertCondition(
    trustSnapshotId === trustPacket.snapshot_id,
    "attestation set trust_snapshot_id mismatch",
  );
  validateAuthority(setInput.authority);

  assertCondition(Array.isArray(setInput.attestations), "attestations must be an array");
  assertCondition(
    setInput.attestations.length === 3,
    "v1 requires exactly three independent attestations",
  );

  const attestations = setInput.attestations.map(validateAttestationShape);
  for (const a of attestations) {
    assertCondition(a.object_id === objectId, "attestation object_id mismatch");
    assertCondition(
      a.content_sha256 === contentSha256,
      "attestation content_sha256 mismatch",
    );
    assertCondition(a.byte_length === byteLength, "attestation byte_length mismatch");
    verifyAttestationIdentityAndSignature(
      trustInput,
      expectedTrustRootId,
      trustSnapshotId,
      a,
    );
  }

  const corroborations = attestations.filter(
    (a) => a.kind === "corroboration",
  );
  const reproductions = attestations.filter(
    (a) => a.kind === "reproducibility",
  );
  assertCondition(
    corroborations.length === 2,
    "v1 requires exactly two corroboration attestations",
  );
  assertCondition(
    reproductions.length === 1,
    "v1 requires exactly one reproducibility attestation",
  );

  const unique = (values: string[], label: string) => {
    assertCondition(
      new Set(values).size === values.length,
      `${label} must be unique across all three attestations`,
    );
  };

  const providers = attestations.map((a) => a.provider_id as string);
  const keyIds = attestations.map((a) => a.signing_key_id as string);
  const bindingIds = attestations.map((a) => a.provider_key_binding_id as string);
  const runIds = attestations.map((a) => a.verification_run_id as string);
  const nonces = attestations.map((a) => a.nonce as string);
  const attestationIds = attestations.map((a) => a.attestation_id as string);

  unique(providers, "provider identities");
  unique(keyIds, "provider key identities");
  unique(bindingIds, "provider key bindings");
  unique(runIds, "verification run IDs");
  unique(nonces, "attestation nonces");
  unique(attestationIds, "attestation IDs");

  const setId = DATANET_PROMOTION_INDEPENDENT_ATTESTATION_SET_ID_PREFIX
    + sha256Hex(datanetPromotionCanonicalJsonV1(setInput));
  assertCondition(SET_ID.test(setId), "attestation set ID invalid");

  return {
    set_id: setId,
    external_evidence: externalEvidenceFromSet(
      setId,
      objectId,
      contentSha256,
      corroborations.length,
      reproductions.length,
    ),
    providers,
    provider_key_ids: keyIds,
  };
}

function readJson(file: string): unknown {
  const resolved = path.resolve(file);
  const stat = fs.lstatSync(resolved);
  assertCondition(!stat.isSymbolicLink(), "symlink input forbidden");
  assertCondition(stat.isFile(), "regular-file input required");
  assertCondition(stat.size <= MAX_JSON_BYTES, "JSON input too large");
  return JSON.parse(fs.readFileSync(resolved, "utf8")) as unknown;
}

function main(): void {
  const [
    mode,
    trustPath,
    expectedTrustRootId,
    setPath,
    outputPath,
    ...extra
  ] = process.argv.slice(2);
  assertCondition(extra.length === 0, "unexpected extra arguments");
  assertCondition(
    mode === "materialize",
    "only materialize mode is supported in v1",
  );
  assertCondition(
    Boolean(trustPath && expectedTrustRootId && setPath && outputPath),
    "usage: materialize <provider-trust-snapshot.json> <expected-trust-root-id> <attestation-set.json> <external-evidence.json>",
  );

  const output = path.resolve(outputPath!);
  assertCondition(!fs.existsSync(output), "refusing to overwrite external evidence");
  const result = materializeDatanetPromotionIndependentAttestationSetV1(
    readJson(trustPath!),
    expectedTrustRootId!,
    readJson(setPath!),
  );
  fs.writeFileSync(
    output,
    JSON.stringify(result.external_evidence, null, 2) + "\n",
    { encoding: "utf8", mode: 0o600, flag: "wx" },
  );
  console.log("VOID_DATANET_PROMOTION_INDEPENDENT_ATTESTATION_SET_V1_GREEN");
  console.log(`set_id=${result.set_id}`);
  console.log("trusted_identity_source=operator_signed_provider_trust_snapshot");
  console.log("provider_registry_used_for_identity_provenance_only=true");
  console.log("provider_quote_authority_expanded=false");
  console.log("distinct_corroborators=2");
  console.log("distinct_reproducer=1");
  console.log("all_three_provider_ids_distinct=true");
  console.log("all_three_signing_key_ids_distinct=true");
  console.log("chain2050_write_authorized=false");
  console.log("validator_authority_granted=false");
  console.log("automatic_promotion=false");
}

const invokedUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (invokedUrl === import.meta.url) {
  try {
    main();
  } catch (error) {
    console.error(
      "HOLD: " + (error instanceof Error ? error.message : String(error)),
    );
    process.exitCode = 1;
  }
}
