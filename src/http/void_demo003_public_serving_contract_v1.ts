import { createHash } from "node:crypto";

export const VOID_DEMO003_PUBLIC_SERVING_CONTRACT_V1 =
  "VOID_DEMO003_PUBLIC_SERVING_CONTRACT_V1";
export const VOID_DEMO003_PUBLIC_SERVING_AUTHORITY_V1 =
  "canonical_demo003_source_contract_v1";
export const VOID_DEMO003_OBJECT_SET_ID_V1 =
  "demo003-folder-fixture-v1";

export const VOID_DEMO003_CANONICAL_PAYLOADS_V1 = Object.freeze({
  "README.txt": Object.freeze({
    path: "files/README.txt",
    bytes: 235,
    sha256: "267e90b34c9868f5d886a22c6a3e98545506f5d45bf3c39475b42151d56dca40",
  }),
  "index.html": Object.freeze({
    path: "files/index.html",
    bytes: 220,
    sha256: "e153126df5fcd15497fd5e12b73481fa84179773ed0b0da191494b3455bf10f6",
  }),
  "metadata.json": Object.freeze({
    path: "files/metadata.json",
    bytes: 295,
    sha256: "058b532ea1b01370dcb591dfe0278a962784892f5c8776e18f515eabc1ba5bfd",
  }),
});

const SEALED_ORDER_V1 = Object.freeze([
  "manifest.json",
  "sha256sums.txt",
  "files/README.txt",
  "files/index.html",
  "files/metadata.json",
]);
export const VOID_DEMO003_CONTROL_MAX_BYTES_V1 = 2 * 1024 * 1024;
const SHA256_RE_V1 = /^[0-9a-f]{64}$/u;

function failV1(code: string): never {
  throw new Error(code);
}

function plainObjectV1(value: any): value is Record<string, any> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function exactKeysV1(value: any, expected: readonly string[], code: string): void {
  if (!plainObjectV1(value)) failV1(code);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    failV1(code);
  }
}

function toBytesV1(value: any, code: string, maxBytes: number = VOID_DEMO003_CONTROL_MAX_BYTES_V1): Buffer {
  let bytes: Buffer;
  if (Buffer.isBuffer(value)) bytes = value;
  else if (value instanceof Uint8Array) bytes = Buffer.from(value);
  else failV1(code);
  if (bytes.length <= 0 || bytes.length > maxBytes) failV1(code);
  return bytes;
}

function sha256V1(bytes: Buffer | Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalJsonV1(value: any): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) failV1("demo003_canonical_number_invalid");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJsonV1).join(",") + "]";
  }
  if (plainObjectV1(value)) {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key) + ":" + canonicalJsonV1(value[key]),
        )
        .join(",") +
      "}"
    );
  }
  failV1("demo003_canonical_value_invalid");
}

function parseJsonBytesV1(bytes: Buffer | Uint8Array, code: string): Record<string, any> {
  let text: string;
  let value: any;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    value = JSON.parse(text);
  } catch {
    failV1(code);
  }
  if (!plainObjectV1(value)) failV1(code);
  return value;
}

function requireBooleanMapV1(value: any, requiredTrue: readonly string[], requiredFalse: readonly string[], code: string): void {
  if (!plainObjectV1(value)) failV1(code);
  for (const key of requiredTrue) {
    if (value[key] !== true) failV1(code + ":" + key);
  }
  for (const key of requiredFalse) {
    if (value[key] !== false) failV1(code + ":" + key);
  }
}

function validateManifestV1(manifest: Record<string, any>): void {
  exactKeysV1(
    manifest,
    [
      "marker",
      "fixture_marker",
      "object_set_id",
      "created_at_utc",
      "file_count",
      "files",
      "trust_boundary",
      "safety_boundary",
    ],
    "demo003_manifest_shape_invalid",
  );
  if (
    manifest.marker !==
      "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_FIXTURE_MANIFEST_V1" ||
    manifest.fixture_marker !==
      "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_FIXTURE_V1" ||
    manifest.object_set_id !== VOID_DEMO003_OBJECT_SET_ID_V1 ||
    manifest.file_count !== 3 ||
    !Number.isInteger(manifest.file_count) ||
    !Array.isArray(manifest.files) ||
    manifest.files.length !== 3
  ) {
    failV1("demo003_manifest_contract_invalid");
  }
  const createdAtMs = Date.parse(String(manifest.created_at_utc || ""));
  if (
    !Number.isFinite(createdAtMs) ||
    new Date(createdAtMs).toISOString() !== manifest.created_at_utc
  ) {
    failV1("demo003_manifest_created_at_invalid");
  }

  const seen = new Set();
  for (const row of manifest.files) {
    exactKeysV1(
      row,
      ["path", "sizeBytes", "sha256"],
      "demo003_manifest_file_shape_invalid",
    );
    const entry = Object.values(VOID_DEMO003_CANONICAL_PAYLOADS_V1).find(
      (candidate) => candidate.path === row.path,
    );
    if (!entry || seen.has(row.path)) {
      failV1("demo003_manifest_file_set_invalid");
    }
    seen.add(row.path);
    if (
      row.sizeBytes !== entry.bytes ||
      row.sha256 !== entry.sha256
    ) {
      failV1("demo003_manifest_source_contract_mismatch:" + row.path);
    }
  }
  if (seen.size !== 3) failV1("demo003_manifest_file_set_invalid");

  exactKeysV1(
    manifest.trust_boundary,
    [
      "offline_verified",
      "network_fetch",
      "network_fetch_during_import",
      "trusted_as_network_truth",
    ],
    "demo003_manifest_trust_shape_invalid",
  );
  requireBooleanMapV1(
    manifest.trust_boundary,
    ["offline_verified"],
    [
      "network_fetch",
      "network_fetch_during_import",
      "trusted_as_network_truth",
    ],
    "demo003_manifest_trust_invalid",
  );

  exactKeysV1(
    manifest.safety_boundary,
    [
      "public_routes_only",
      "read_only",
      "mutation",
      "money_movement",
      "wallet_send",
      "validator_mutation",
    ],
    "demo003_manifest_safety_shape_invalid",
  );
  requireBooleanMapV1(
    manifest.safety_boundary,
    ["public_routes_only", "read_only"],
    ["mutation", "money_movement", "wallet_send", "validator_mutation"],
    "demo003_manifest_safety_invalid",
  );
}

function parseChecksumLedgerV1(bytes: Buffer | Uint8Array, observed: Record<string, string>): void {
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    failV1("demo003_checksum_utf8_invalid");
  }
  if (!text.endsWith("\n")) failV1("demo003_checksum_serialization_invalid");
  const lines = text.slice(0, -1).split("\n");
  if (lines.length !== 4) failV1("demo003_checksum_line_count_invalid");
  const expectedPaths = new Set([
    "./manifest.json",
    "./files/README.txt",
    "./files/index.html",
    "./files/metadata.json",
  ]);
  const seen = new Set();
  for (const line of lines) {
    const match = /^([0-9a-f]{64})  (\.\/(?:manifest\.json|files\/(?:README\.txt|index\.html|metadata\.json)))$/u.exec(
      line,
    );
    if (!match) failV1("demo003_checksum_line_invalid");
    const digest = match[1];
    const path = match[2];
    if (!expectedPaths.has(path) || seen.has(path)) {
      failV1("demo003_checksum_path_set_invalid");
    }
    seen.add(path);
    if (observed[path.slice(2)] !== digest) {
      failV1("demo003_checksum_digest_mismatch:" + path);
    }
  }
  if (seen.size !== expectedPaths.size) {
    failV1("demo003_checksum_path_set_invalid");
  }
}

function validateIntakeV1(intake: Record<string, any>, manifest: Record<string, any>, observed: Record<string, string>): void {
  if (
    intake.marker !==
      "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_RECORD_V1" ||
    intake.object_set_id !== VOID_DEMO003_OBJECT_SET_ID_V1 ||
    intake.file_count !== 3 ||
    !Number.isInteger(intake.file_count) ||
    intake.offline_verified !== true ||
    intake.network_fetch_during_import !== false ||
    intake.trusted_as_network_truth !== false ||
    intake.verified_content_authority !== "sealed_memfd_snapshot" ||
    intake.visible_extraction_tree_trusted !== false ||
    intake.public_routes_only !== true ||
    intake.read_only !== true ||
    intake.mutation !== false ||
    intake.money_movement !== false ||
    intake.wallet_send !== false ||
    intake.validator_mutation !== false
  ) {
    failV1("demo003_intake_contract_invalid");
  }
  if (
    canonicalJsonV1(intake.source_manifest) !== canonicalJsonV1(manifest)
  ) {
    failV1("demo003_intake_source_manifest_mismatch");
  }
  exactKeysV1(
    intake.sealed_snapshot_sha256,
    SEALED_ORDER_V1,
    "demo003_intake_sealed_snapshot_shape_invalid",
  );
  for (const name of SEALED_ORDER_V1) {
    if (
      !SHA256_RE_V1.test(String(intake.sealed_snapshot_sha256[name] || "")) ||
      intake.sealed_snapshot_sha256[name] !== observed[name]
    ) {
      failV1("demo003_intake_sealed_snapshot_mismatch:" + name);
    }
  }
  if (
    !SHA256_RE_V1.test(String(intake.sealed_snapshot_set_sha256 || ""))
  ) {
    failV1("demo003_intake_snapshot_set_invalid");
  }
  const material = Buffer.from(
    SEALED_ORDER_V1.map(
      (name) => name + "=" + observed[name] + "\n",
    ).join(""),
    "ascii",
  );
  if (sha256V1(material) !== intake.sealed_snapshot_set_sha256) {
    failV1("demo003_intake_snapshot_set_mismatch");
  }
}

const SOURCE_CONTRACT_MATERIAL_V1 = Object.freeze({
  marker: VOID_DEMO003_PUBLIC_SERVING_CONTRACT_V1,
  object_set_id: VOID_DEMO003_OBJECT_SET_ID_V1,
  payloads: VOID_DEMO003_CANONICAL_PAYLOADS_V1,
  trust_boundary: Object.freeze({
    offline_verified: true,
    network_fetch: false,
    network_fetch_during_import: false,
    trusted_as_network_truth: false,
  }),
  safety_boundary: Object.freeze({
    public_routes_only: true,
    read_only: true,
    mutation: false,
    money_movement: false,
    wallet_send: false,
    validator_mutation: false,
  }),
});

export const VOID_DEMO003_PUBLIC_SOURCE_CONTRACT_SHA256_V1 =
  "sha256:" +
  sha256V1(
    Buffer.from(canonicalJsonV1(SOURCE_CONTRACT_MATERIAL_V1), "utf8"),
  );

export function classifyVoidDemo003PublicServingSetV1({
  manifestBytes,
  checksumBytes,
  intakeBytes,
  payloadBytes,
}: {
  manifestBytes: Buffer | Uint8Array;
  checksumBytes: Buffer | Uint8Array;
  intakeBytes: Buffer | Uint8Array;
  payloadBytes: Record<string, Buffer | Uint8Array>;
}) {
  const manifestBuffer = toBytesV1(
    manifestBytes,
    "demo003_manifest_bytes_invalid",
  );
  const checksumBuffer = toBytesV1(
    checksumBytes,
    "demo003_checksum_bytes_invalid",
  );
  const intakeBuffer = toBytesV1(
    intakeBytes,
    "demo003_intake_bytes_invalid",
  );
  if (!plainObjectV1(payloadBytes)) {
    failV1("demo003_payload_map_invalid");
  }
  exactKeysV1(
    payloadBytes,
    Object.keys(VOID_DEMO003_CANONICAL_PAYLOADS_V1),
    "demo003_payload_map_shape_invalid",
  );

  const manifest = parseJsonBytesV1(
    manifestBuffer,
    "demo003_manifest_json_invalid",
  );
  validateManifestV1(manifest);

  const observed: Record<string, string> = {
    "manifest.json": sha256V1(manifestBuffer),
    "sha256sums.txt": sha256V1(checksumBuffer),
  };

  for (const [name, entry] of Object.entries(
    VOID_DEMO003_CANONICAL_PAYLOADS_V1,
  )) {
    const bytes = toBytesV1(
      payloadBytes[name],
      "demo003_payload_bytes_invalid:" + name,
      VOID_DEMO003_CONTROL_MAX_BYTES_V1,
    );
    const digest = sha256V1(bytes);
    if (bytes.length !== entry.bytes || digest !== entry.sha256) {
      failV1("demo003_payload_source_contract_mismatch:" + name);
    }
    observed[entry.path] = digest;
  }

  parseChecksumLedgerV1(checksumBuffer, observed);

  const intake = parseJsonBytesV1(
    intakeBuffer,
    "demo003_intake_json_invalid",
  );
  validateIntakeV1(intake, manifest, observed);

  return Object.freeze({
    ok: true,
    marker: VOID_DEMO003_PUBLIC_SERVING_CONTRACT_V1,
    object_set_id: VOID_DEMO003_OBJECT_SET_ID_V1,
    manifest,
    intake_marker: intake.marker,
    sealed_snapshot_set_sha256: intake.sealed_snapshot_set_sha256,
    sealed_snapshot_sha256: Object.freeze({ ...intake.sealed_snapshot_sha256 }),
    verified_content_authority: VOID_DEMO003_PUBLIC_SERVING_AUTHORITY_V1,
    intake_verified_content_authority: "sealed_memfd_snapshot",
    serving_authority: VOID_DEMO003_PUBLIC_SERVING_AUTHORITY_V1,
    source_contract_sha256:
      VOID_DEMO003_PUBLIC_SOURCE_CONTRACT_SHA256_V1,
    visible_extraction_tree_trusted: false,
    offline_verified: true,
    network_fetch_during_import: false,
    trusted_as_network_truth: false,
  });
}
