import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  providerQuoteResponseAuthenticationKeyIdV1,
} from "./public_agent_service_provider_quote_response_authentication_v1.js";
import {
  materializeDatanetPromotionIndependentAttestationSetV1,
  datanetPromotionCanonicalJsonV1,
} from "./datanet_promotion_independent_attestation_set_v1.js";

export const DATANET_PROMOTION_PUBLISHER_PROVENANCE_MARKER =
  "VOID_DATANET_PROMOTION_PUBLISHER_PROVENANCE_V1" as const;
export const DATANET_PROMOTION_PUBLISHER_PROVENANCE_SIGNATURE_DOMAIN =
  "void.datanet.promotion.publisher-provenance.v1" as const;
export const DATANET_PROMOTION_PUBLISHER_PROVENANCE_CANONICALIZATION =
  "void.canonical-json.sorted-keys.v1" as const;
export const DATANET_PROMOTION_PUBLISHER_PROVENANCE_ID_PREFIX =
  "voiddppp1_" as const;

type RecordValue = Record<string, unknown>;

const SHA256 = /^[0-9a-f]{64}$/;
const KEY_ID = /^ed25519:[0-9a-f]{64}$/;
const PROVENANCE_ID = /^voiddppp1_[0-9a-f]{64}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const BASE64_SIGNATURE = /^[A-Za-z0-9+/]{86}==$/;
const MAX_JSON_BYTES = 2 * 1024 * 1024;

const LOCAL_RECEIPT_KEYS = [
  "marker",
  "object_id",
  "bytes",
  "sha256",
  "imported_at",
  "storage_class",
  "public_upload",
  "operator_local_import_only",
  "trusted_as_network_truth",
] as const;

const AUTHORITY_KEYS = [
  "evidence_only",
  "chain2050_write_authorized",
  "datanet_mutation_authorized",
  "validator_authority_granted",
  "governance_mutation_authorized",
  "signer_or_wallet_access",
  "work_credit_award_authorized",
  "runtime_service_action",
  "funds_action",
] as const;

const PROVENANCE_KEYS = [
  "marker",
  "version",
  "publisher_subject_id",
  "publisher_key_id",
  "publisher_public_key_pem",
  "object_id",
  "content_sha256",
  "byte_length",
  "imported_at_utc",
  "local_receipt_sha256",
  "signature_scheme",
  "signature_domain",
  "canonicalization",
  "signed_at_utc",
  "nonce",
  "authority",
  "signature_base64",
  "publisher_provenance_id",
] as const;

const SIGNING_BODY_KEYS = PROVENANCE_KEYS.filter(
  (key) => key !== "signature_base64" && key !== "publisher_provenance_id",
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

function sha256Hex(value: string | Uint8Array): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function canonicalPublicKeyPem(value: unknown): string {
  assertCondition(
    typeof value === "string",
    "publisher_public_key_pem must be a string",
  );
  assertCondition(
    value.length >= 80 && value.length <= 4096,
    "publisher_public_key_pem length invalid",
  );
  const pem = value;
  let key: crypto.KeyObject;
  try {
    key = crypto.createPublicKey({ key: pem, type: "spki", format: "pem" });
  } catch (error) {
    return fail("publisher public key PEM could not be parsed");
  }
  assertCondition(
    key.asymmetricKeyType === "ed25519",
    "publisher public key must be Ed25519",
  );
  const canonical = key.export({ type: "spki", format: "pem" }).toString();
  assertCondition(canonical === pem, "publisher public key PEM is not canonical");
  return pem;
}

function validateAuthority(value: unknown): void {
  const authority = record(value, "publisher provenance authority");
  exactKeys(authority, "publisher provenance authority", AUTHORITY_KEYS);
  booleanLiteral(authority.evidence_only, "authority.evidence_only", true);
  for (const key of AUTHORITY_KEYS.filter((key) => key !== "evidence_only")) {
    booleanLiteral(authority[key], `authority.${key}`, false);
  }
}

function validateLocalReceipt(value: unknown): {
  receipt: RecordValue;
  object_id: string;
  content_sha256: string;
  byte_length: number;
  imported_at_utc: string;
  receipt_sha256: string;
} {
  const receipt = record(value, "local data drop receipt");
  exactKeys(receipt, "local data drop receipt", LOCAL_RECEIPT_KEYS);
  assertCondition(
    receipt.marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1",
    "local receipt marker invalid",
  );
  const objectId = stringValue(receipt.object_id, "local receipt object_id", undefined, 512);
  const contentSha256 = stringValue(
    receipt.sha256,
    "local receipt sha256",
    SHA256,
    64,
  );
  const byteLength = integerValue(receipt.bytes, "local receipt bytes", 1, 268435456);
  const importedAt = isoUtc(receipt.imported_at, "local receipt imported_at");
  assertCondition(
    receipt.storage_class === "operator_local_public_read_only",
    "local receipt storage_class invalid",
  );
  booleanLiteral(receipt.public_upload, "local receipt public_upload", false);
  booleanLiteral(
    receipt.operator_local_import_only,
    "local receipt operator_local_import_only",
    true,
  );
  booleanLiteral(
    receipt.trusted_as_network_truth,
    "local receipt trusted_as_network_truth",
    false,
  );
  return {
    receipt,
    object_id: objectId,
    content_sha256: contentSha256,
    byte_length: byteLength,
    imported_at_utc: importedAt,
    receipt_sha256: sha256Hex(datanetPromotionCanonicalJsonV1(receipt)),
  };
}

function exactSigningBody(value: RecordValue): RecordValue {
  return Object.fromEntries(
    SIGNING_BODY_KEYS.map((key) => [key, value[key]]),
  );
}

export function datanetPromotionPublisherProvenanceSigningBytesV1(
  provenance: RecordValue,
): Buffer {
  return Buffer.from(
    DATANET_PROMOTION_PUBLISHER_PROVENANCE_SIGNATURE_DOMAIN
      + "\n"
      + datanetPromotionCanonicalJsonV1(exactSigningBody(provenance)),
    "utf8",
  );
}

export function datanetPromotionPublisherProvenanceIdV1(
  valueWithoutId: RecordValue,
): string {
  return DATANET_PROMOTION_PUBLISHER_PROVENANCE_ID_PREFIX
    + sha256Hex(datanetPromotionCanonicalJsonV1(valueWithoutId));
}

export function validateDatanetPromotionPublisherProvenanceV1(
  localReceiptValue: unknown,
  expectedPublisherKeyId: string,
  provenanceValue: unknown,
): {
  publisher_provenance_id: string;
  publisher_key_id: string;
  publisher_subject_id: string;
  object_id: string;
  content_sha256: string;
  byte_length: number;
} {
  assertCondition(KEY_ID.test(expectedPublisherKeyId), "expected publisher key ID invalid");
  const local = validateLocalReceipt(localReceiptValue);
  const p = record(provenanceValue, "publisher provenance");
  exactKeys(p, "publisher provenance", PROVENANCE_KEYS);
  assertCondition(
    p.marker === DATANET_PROMOTION_PUBLISHER_PROVENANCE_MARKER,
    "publisher provenance marker invalid",
  );
  assertCondition(p.version === 1, "publisher provenance version must be 1");

  const subjectId = stringValue(
    p.publisher_subject_id,
    "publisher_subject_id",
    SAFE_ID,
    128,
  );
  const publisherKeyId = stringValue(
    p.publisher_key_id,
    "publisher_key_id",
    KEY_ID,
    72,
  );
  const publicKeyPem = canonicalPublicKeyPem(p.publisher_public_key_pem);
  const derivedKeyId = providerQuoteResponseAuthenticationKeyIdV1(publicKeyPem);
  assertCondition(
    publisherKeyId === derivedKeyId,
    "publisher key ID does not match public key",
  );
  assertCondition(
    publisherKeyId === expectedPublisherKeyId,
    "publisher key ID does not match separately pinned expected key",
  );

  assertCondition(p.object_id === local.object_id, "publisher provenance object_id mismatch");
  assertCondition(
    p.content_sha256 === local.content_sha256,
    "publisher provenance content_sha256 mismatch",
  );
  assertCondition(
    p.byte_length === local.byte_length,
    "publisher provenance byte_length mismatch",
  );
  assertCondition(
    p.imported_at_utc === local.imported_at_utc,
    "publisher provenance imported_at_utc mismatch",
  );
  assertCondition(
    p.local_receipt_sha256 === local.receipt_sha256,
    "publisher provenance local_receipt_sha256 mismatch",
  );

  assertCondition(p.signature_scheme === "ed25519", "publisher signature scheme invalid");
  assertCondition(
    p.signature_domain === DATANET_PROMOTION_PUBLISHER_PROVENANCE_SIGNATURE_DOMAIN,
    "publisher signature domain invalid",
  );
  assertCondition(
    p.canonicalization === DATANET_PROMOTION_PUBLISHER_PROVENANCE_CANONICALIZATION,
    "publisher canonicalization invalid",
  );
  const signedAt = isoUtc(p.signed_at_utc, "publisher signed_at_utc");
  assertCondition(
    Date.parse(signedAt) >= Date.parse(local.imported_at_utc),
    "publisher provenance cannot predate import",
  );
  stringValue(p.nonce, "publisher nonce", SAFE_ID, 128);
  validateAuthority(p.authority);

  const signature = stringValue(
    p.signature_base64,
    "publisher signature_base64",
    BASE64_SIGNATURE,
    88,
  );
  const signatureBytes = Buffer.from(signature, "base64");
  assertCondition(
    signatureBytes.length === 64 && signatureBytes.toString("base64") === signature,
    "publisher signature must be canonical 64-byte base64",
  );

  const provenanceId = stringValue(
    p.publisher_provenance_id,
    "publisher_provenance_id",
    PROVENANCE_ID,
    75,
  );
  const withoutId: RecordValue = { ...p };
  delete withoutId.publisher_provenance_id;
  assertCondition(
    provenanceId === datanetPromotionPublisherProvenanceIdV1(withoutId),
    "publisher_provenance_id does not match canonical signed envelope",
  );

  const publicKey = crypto.createPublicKey(publicKeyPem);
  const verified = crypto.verify(
    null,
    datanetPromotionPublisherProvenanceSigningBytesV1(p),
    publicKey,
    signatureBytes,
  );
  assertCondition(verified, "publisher provenance signature invalid");

  return {
    publisher_provenance_id: provenanceId,
    publisher_key_id: publisherKeyId,
    publisher_subject_id: subjectId,
    object_id: local.object_id,
    content_sha256: local.content_sha256,
    byte_length: local.byte_length,
  };
}

export function materializeDatanetPromotionPublisherSeparatedExternalEvidenceV1(
  localReceiptValue: unknown,
  expectedPublisherKeyId: string,
  provenanceValue: unknown,
  trustInput: unknown,
  expectedTrustRootId: string,
  attestationSetInput: unknown,
): {
  publisher_provenance_id: string;
  publisher_key_id: string;
  attestation_set_id: string;
  external_evidence: RecordValue;
} {
  const publisher = validateDatanetPromotionPublisherProvenanceV1(
    localReceiptValue,
    expectedPublisherKeyId,
    provenanceValue,
  );
  const attestationSet = materializeDatanetPromotionIndependentAttestationSetV1(
    trustInput,
    expectedTrustRootId,
    attestationSetInput,
  );

  const setObject = record(
    record(attestationSetInput, "attestation set").object,
    "attestation set object",
  );
  assertCondition(setObject.object_id === publisher.object_id, "publisher/attester object_id mismatch");
  assertCondition(
    setObject.content_sha256 === publisher.content_sha256,
    "publisher/attester content_sha256 mismatch",
  );
  assertCondition(
    setObject.byte_length === publisher.byte_length,
    "publisher/attester byte_length mismatch",
  );

  assertCondition(
    !attestationSet.provider_key_ids.includes(publisher.publisher_key_id),
    "external attester signing key collides with publisher signing key",
  );

  return {
    publisher_provenance_id: publisher.publisher_provenance_id,
    publisher_key_id: publisher.publisher_key_id,
    attestation_set_id: attestationSet.set_id,
    external_evidence: attestationSet.external_evidence,
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
    localReceiptPath,
    expectedPublisherKeyId,
    provenancePath,
    trustPath,
    expectedTrustRootId,
    attestationSetPath,
    outputPath,
    ...extra
  ] = process.argv.slice(2);

  assertCondition(extra.length === 0, "unexpected extra arguments");
  assertCondition(
    mode === "materialize",
    "only materialize mode is supported in v1",
  );
  assertCondition(
    Boolean(
      localReceiptPath
      && expectedPublisherKeyId
      && provenancePath
      && trustPath
      && expectedTrustRootId
      && attestationSetPath
      && outputPath
    ),
    "usage: materialize <local-receipt.json> <expected-publisher-key-id> <publisher-provenance.json> <provider-trust-snapshot.json> <expected-trust-root-id> <attestation-set.json> <external-evidence.json>",
  );

  const output = path.resolve(outputPath!);
  assertCondition(!fs.existsSync(output), "refusing to overwrite external evidence");
  const result = materializeDatanetPromotionPublisherSeparatedExternalEvidenceV1(
    readJson(localReceiptPath!),
    expectedPublisherKeyId!,
    readJson(provenancePath!),
    readJson(trustPath!),
    expectedTrustRootId!,
    readJson(attestationSetPath!),
  );

  fs.writeFileSync(
    output,
    JSON.stringify(result.external_evidence, null, 2) + "\n",
    { encoding: "utf8", mode: 0o600, flag: "wx" },
  );

  console.log("VOID_DATANET_PROMOTION_PUBLISHER_SEPARATION_V1_GREEN");
  console.log(`publisher_provenance_id=${result.publisher_provenance_id}`);
  console.log(`publisher_key_id=${result.publisher_key_id}`);
  console.log(`attestation_set_id=${result.attestation_set_id}`);
  console.log("publisher_attester_key_separation_verified=true");
  console.log("publisher_private_key_access=false");
  console.log("chain2050_write_authorized=false");
  console.log("datanet_mutation_authorized=false");
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
