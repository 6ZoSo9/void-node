import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  materializeDatanetPromotionPublisherSeparatedExternalEvidenceV1,
} from "./datanet_promotion_publisher_provenance_separation_v1.js";
import {
  datanetPromotionCanonicalJsonV1,
} from "./datanet_promotion_independent_attestation_set_v1.js";

export const DATANET_PROMOTION_PACKET_ASSEMBLY_MARKER =
  "VOID_DATANET_PROMOTION_PACKET_ASSEMBLY_V1" as const;
export const DATANET_PROMOTION_PACKET_ASSEMBLY_ID_PREFIX =
  "voiddppa1_" as const;

type RecordValue = Record<string, unknown>;

const MAX_JSON_BYTES = 2 * 1024 * 1024;
const SHA256 = /^[0-9a-f]{64}$/;
const ASSEMBLY_ID = /^voiddppa1_[0-9a-f]{64}$/;

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const COLLECTOR = path.join(
  SCRIPT_DIR,
  "datanet_promotion_evidence_source_collect_v1.mjs",
);
const GENERATOR = path.join(
  SCRIPT_DIR,
  "datanet_promotion_candidate_generate_v1.mjs",
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

function sha256Hex(value: string | Uint8Array): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function shaJson(value: unknown): string {
  return sha256Hex(datanetPromotionCanonicalJsonV1(value));
}

function canonicalIsoUtc(value: string, label: string): string {
  assertCondition(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value),
    `${label} must be second-precision UTC`,
  );
  const ms = Date.parse(value);
  assertCondition(Number.isFinite(ms), `${label} invalid UTC`);
  assertCondition(
    new Date(ms).toISOString() === value.replace("Z", ".000Z"),
    `${label} not canonical UTC`,
  );
  return value;
}

function readJsonFile(file: string, label: string): unknown {
  const resolved = path.resolve(file);
  const stat = fs.lstatSync(resolved);
  assertCondition(!stat.isSymbolicLink(), `${label} symlink forbidden`);
  assertCondition(stat.isFile(), `${label} must be a regular file`);
  assertCondition(stat.size <= MAX_JSON_BYTES, `${label} exceeds size bound`);
  return JSON.parse(fs.readFileSync(resolved, "utf8")) as unknown;
}

function writeJsonCreateOnly(file: string, value: unknown): void {
  fs.writeFileSync(
    file,
    JSON.stringify(value, null, 2) + "\n",
    { encoding: "utf8", mode: 0o600, flag: "wx" },
  );
}

function runNodeScript(
  script: string,
  args: string[],
  label: string,
): string {
  const result = spawnSync(
    process.execPath,
    [script, ...args],
    {
      cwd: path.dirname(SCRIPT_DIR),
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
      env: {
        PATH: process.env.PATH ?? "",
        HOME: process.env.HOME ?? "",
        LANG: process.env.LANG ?? "C.UTF-8",
      },
    },
  );
  assertCondition(
    result.error === undefined,
    `${label} failed to start: ${String(result.error)}`,
  );
  if (result.status !== 0) {
    const stdout = String(result.stdout ?? "").trim();
    const stderr = String(result.stderr ?? "").trim();
    fail(
      `${label} failed status=${String(result.status)} stdout=${stdout} stderr=${stderr}`,
    );
  }
  return String(result.stdout ?? "");
}

function cleanupDirectory(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (error) {
    process.stderr.write(
      "VOID_DATANET_PROMOTION_PACKET_ASSEMBLY_CLEANUP_FAIL "
        + (error instanceof Error ? error.message : String(error))
        + "\n",
    );
  }
}

function validatePublisherReceiptIdentity(
  localReceiptValue: unknown,
): {
  object_id: string;
  content_sha256: string;
  byte_length: number;
} {
  const receipt = record(localReceiptValue, "local receipt");
  assertCondition(
    receipt.marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1",
    "local receipt marker invalid",
  );
  assertCondition(
    typeof receipt.object_id === "string" && receipt.object_id.length >= 1,
    "local receipt object_id invalid",
  );
  assertCondition(
    typeof receipt.sha256 === "string" && SHA256.test(receipt.sha256),
    "local receipt sha256 invalid",
  );
  assertCondition(
    Number.isSafeInteger(receipt.bytes)
      && (receipt.bytes as number) >= 1
      && (receipt.bytes as number) <= 268435456,
    "local receipt bytes invalid",
  );
  return {
    object_id: receipt.object_id,
    content_sha256: receipt.sha256,
    byte_length: receipt.bytes as number,
  };
}

function validateIntegratedOutputs(
  objectId: string,
  contentSha256: string,
  byteLength: number,
  sourceValue: unknown,
  mapValue: unknown,
  candidateValue: unknown,
): {
  candidate_id: string;
  disposition: string;
} {
  const source = record(sourceValue, "source bundle");
  const sourceObject = record(source.object, "source bundle object");
  assertCondition(sourceObject.object_id === objectId, "source object_id mismatch");
  assertCondition(
    sourceObject.content_sha256 === contentSha256,
    "source content_sha256 mismatch",
  );
  assertCondition(
    sourceObject.byte_length === byteLength,
    "source byte_length mismatch",
  );

  const map = record(mapValue, "evidence map");
  assertCondition(
    map.marker === "VOID_DATANET_PROMOTION_EVIDENCE_MAP_V1",
    "evidence map marker invalid",
  );
  assertCondition(
    map.content_sha256 === contentSha256,
    "evidence map content_sha256 mismatch",
  );
  assertCondition(map.candidate_eligible === true, "evidence map not candidate eligible");
  const mapAuthority = record(map.authority, "evidence map authority");
  assertCondition(
    mapAuthority.chain2050_write_authorized === false,
    "evidence map unexpectedly authorizes Chain-2050 write",
  );
  assertCondition(
    mapAuthority.validator_authority_granted === false,
    "evidence map unexpectedly grants validator authority",
  );

  const candidate = record(candidateValue, "promotion candidate");
  assertCondition(
    candidate.marker === "VOID_DATANET_CHAIN_PROMOTION_CANDIDATE_V1",
    "candidate marker invalid",
  );
  const candidateObject = record(candidate.candidate, "candidate object");
  assertCondition(
    candidateObject.object_id_sha256 === sha256Hex(objectId),
    "candidate object_id_sha256 mismatch",
  );
  assertCondition(
    candidateObject.content_sha256 === contentSha256,
    "candidate content_sha256 mismatch",
  );
  assertCondition(
    candidateObject.byte_length === byteLength,
    "candidate byte_length mismatch",
  );
  const candidateId = String(candidateObject.candidate_id ?? "");
  assertCondition(
    /^voiddcp1_[0-9a-f]{32}$/.test(candidateId),
    "candidate ID invalid",
  );

  const phase = record(candidate.phase_context, "candidate phase_context");
  assertCondition(phase.phase === 0, "candidate must remain Phase 0");
  assertCondition(
    phase.authority_mode === "PHASE0_OPERATOR_ROOTED",
    "candidate authority mode changed",
  );
  assertCondition(
    phase.validator_admission_authority_active === false,
    "validator admission authority must remain inactive",
  );

  const admission = record(candidate.admission, "candidate admission");
  assertCondition(
    admission.disposition === "PHASE0_OPERATOR_REVIEW_ONLY",
    "candidate disposition changed",
  );
  assertCondition(
    admission.canonical_write_authorized === false,
    "candidate unexpectedly authorizes canonical write",
  );
  assertCondition(
    admission.automatic_promotion === false,
    "candidate unexpectedly enables automatic promotion",
  );

  const authority = record(candidate.authority, "candidate authority");
  for (const [key, value] of Object.entries(authority)) {
    if (key === "source_only" || key === "candidate_only") {
      assertCondition(value === true, `candidate authority ${key} changed`);
    } else {
      assertCondition(value === false, `candidate authority ${key} must be false`);
    }
  }

  return {
    candidate_id: candidateId,
    disposition: admission.disposition as string,
  };
}

export type DatanetPromotionPacketAssemblyInputV1 = {
  base_url: string;
  observed_at_utc: string;
  local_receipt_path: string;
  expected_publisher_key_id: string;
  publisher_provenance_path: string;
  provider_trust_snapshot_path: string;
  expected_trust_root_id: string;
  attestation_set_path: string;
  output_dir: string;
};

export function assembleDatanetPromotionPacketV1(
  input: DatanetPromotionPacketAssemblyInputV1,
): RecordValue {
  const observedAt = canonicalIsoUtc(
    input.observed_at_utc,
    "observed_at_utc",
  );

  const localReceipt = readJsonFile(
    input.local_receipt_path,
    "local receipt",
  );
  const publisherProvenance = readJsonFile(
    input.publisher_provenance_path,
    "publisher provenance",
  );
  const trustSnapshot = readJsonFile(
    input.provider_trust_snapshot_path,
    "provider trust snapshot",
  );
  const attestationSet = readJsonFile(
    input.attestation_set_path,
    "attestation set",
  );

  const identity = validatePublisherReceiptIdentity(localReceipt);

  const separated =
    materializeDatanetPromotionPublisherSeparatedExternalEvidenceV1(
      localReceipt,
      input.expected_publisher_key_id,
      publisherProvenance,
      trustSnapshot,
      input.expected_trust_root_id,
      attestationSet,
    );

  const target = path.resolve(input.output_dir);
  assertCondition(!fs.existsSync(target), "output directory already exists");
  const parent = path.dirname(target);
  const parentStat = fs.lstatSync(parent);
  assertCondition(!parentStat.isSymbolicLink(), "output parent symlink forbidden");
  assertCondition(parentStat.isDirectory(), "output parent must be a directory");

  const staging = fs.mkdtempSync(
    path.join(parent, "." + path.basename(target) + ".staging-"),
  );
  fs.chmodSync(staging, 0o700);

  try {
    const externalPath = path.join(staging, "external-evidence.json");
    const sourcePath = path.join(staging, "source-bundle.json");
    const mapPath = path.join(staging, "evidence-map.json");
    const candidatePath = path.join(staging, "promotion-candidate.json");
    const manifestPath = path.join(staging, "assembly-manifest.json");

    writeJsonCreateOnly(externalPath, separated.external_evidence);

    const collectorStdout = runNodeScript(
      COLLECTOR,
      [
        "--base", input.base_url,
        "--object-id", identity.object_id,
        "--observed-at", observedAt,
        "--external-evidence", externalPath,
        "--out", sourcePath,
      ],
      "promotion evidence collector",
    );
    assertCondition(
      collectorStdout.includes(
        '"marker": "VOID_DATANET_PROMOTION_EVIDENCE_COLLECTOR_V1_GREEN"',
      ),
      "collector green marker missing",
    );

    const generatorStdout = runNodeScript(
      GENERATOR,
      [
        "--input", sourcePath,
        "--map-out", mapPath,
        "--candidate-out", candidatePath,
      ],
      "promotion candidate generator",
    );
    assertCondition(
      generatorStdout.includes(
        '"marker": "VOID_DATANET_PROMOTION_EVIDENCE_GENERATOR_V1_GREEN"',
      ),
      "generator green marker missing",
    );

    const sourceBundle = readJsonFile(sourcePath, "generated source bundle");
    const evidenceMap = readJsonFile(mapPath, "generated evidence map");
    const candidate = readJsonFile(candidatePath, "generated candidate");

    const integrated = validateIntegratedOutputs(
      identity.object_id,
      identity.content_sha256,
      identity.byte_length,
      sourceBundle,
      evidenceMap,
      candidate,
    );

    const attestationSetRecord = record(attestationSet, "attestation set");
    const trustSnapshotId = String(attestationSetRecord.trust_snapshot_id ?? "");
    assertCondition(
      /^voidapts1_[0-9a-f]{64}$/.test(trustSnapshotId),
      "attestation set trust_snapshot_id invalid",
    );

    const manifestBody: RecordValue = {
      marker: DATANET_PROMOTION_PACKET_ASSEMBLY_MARKER,
      version: 1,
      assembled_at_utc: observedAt,
      object: {
        object_id_sha256: sha256Hex(identity.object_id),
        content_sha256: identity.content_sha256,
        byte_length: identity.byte_length,
      },
      input_commitments: {
        local_receipt_sha256: shaJson(localReceipt),
        publisher_provenance_sha256: shaJson(publisherProvenance),
        provider_trust_snapshot_sha256: shaJson(trustSnapshot),
        attestation_set_sha256: shaJson(attestationSet),
      },
      publisher: {
        publisher_provenance_id: separated.publisher_provenance_id,
        publisher_key_id: separated.publisher_key_id,
      },
      external_attestation: {
        attestation_set_id: separated.attestation_set_id,
        trust_snapshot_id: trustSnapshotId,
        external_evidence_sha256: shaJson(separated.external_evidence),
      },
      evidence: {
        source_bundle_sha256: shaJson(sourceBundle),
        evidence_map_sha256: shaJson(evidenceMap),
        promotion_candidate_sha256: shaJson(candidate),
        candidate_id: integrated.candidate_id,
      },
      phase_context: {
        phase: 0,
        authority_mode: "PHASE0_OPERATOR_ROOTED",
        validator_admission_authority_active: false,
      },
      admission: {
        disposition: integrated.disposition,
        operator_review_required: true,
        canonical_write_authorized: false,
        automatic_promotion: false,
      },
      authority: {
        evidence_only: true,
        datanet_mutation_authorized: false,
        chain2050_write_authorized: false,
        validator_authority_granted: false,
        governance_mutation_authorized: false,
        signer_or_wallet_access: false,
        work_credit_award_authorized: false,
        runtime_service_action: false,
        funds_action: false,
      },
    };

    const assemblyId =
      DATANET_PROMOTION_PACKET_ASSEMBLY_ID_PREFIX + shaJson(manifestBody);
    assertCondition(ASSEMBLY_ID.test(assemblyId), "assembly ID invalid");
    const manifest = {
      ...manifestBody,
      assembly_id: assemblyId,
    };
    writeJsonCreateOnly(manifestPath, manifest);

    const expectedFiles = [
      "assembly-manifest.json",
      "evidence-map.json",
      "external-evidence.json",
      "promotion-candidate.json",
      "source-bundle.json",
    ];
    const actualFiles = fs.readdirSync(staging).sort();
    assertCondition(
      JSON.stringify(actualFiles) === JSON.stringify(expectedFiles),
      "staging output file set changed",
    );

    fs.renameSync(staging, target);
    return manifest;
  } catch (error) {
    cleanupDirectory(staging);
    throw error;
  }
}

function requireOption(
  args: string[],
  name: string,
): string {
  const index = args.indexOf(name);
  assertCondition(
    index >= 0 && index + 1 < args.length,
    `missing required option ${name}`,
  );
  return args[index + 1]!;
}

function main(): void {
  const args = process.argv.slice(2);
  assertCondition(args[0] === "assemble", "first argument must be assemble");

  const known = new Set([
    "assemble",
    "--base",
    "--observed-at",
    "--local-receipt",
    "--expected-publisher-key-id",
    "--publisher-provenance",
    "--provider-trust-snapshot",
    "--expected-trust-root-id",
    "--attestation-set",
    "--out-dir",
  ]);
  for (let i = 0; i < args.length; i += 1) {
    const value = args[i]!;
    if (value.startsWith("--")) {
      assertCondition(known.has(value), `unknown option ${value}`);
      i += 1;
    }
  }

  const manifest = assembleDatanetPromotionPacketV1({
    base_url: requireOption(args, "--base"),
    observed_at_utc: requireOption(args, "--observed-at"),
    local_receipt_path: requireOption(args, "--local-receipt"),
    expected_publisher_key_id: requireOption(
      args,
      "--expected-publisher-key-id",
    ),
    publisher_provenance_path: requireOption(args, "--publisher-provenance"),
    provider_trust_snapshot_path: requireOption(
      args,
      "--provider-trust-snapshot",
    ),
    expected_trust_root_id: requireOption(args, "--expected-trust-root-id"),
    attestation_set_path: requireOption(args, "--attestation-set"),
    output_dir: requireOption(args, "--out-dir"),
  });

  console.log("VOID_DATANET_PROMOTION_PACKET_ASSEMBLY_V1_GREEN");
  console.log(`assembly_id=${String(manifest.assembly_id)}`);
  console.log("phase=0");
  console.log("disposition=PHASE0_OPERATOR_REVIEW_ONLY");
  console.log("operator_review_required=true");
  console.log("canonical_write_authorized=false");
  console.log("automatic_promotion=false");
  console.log("datanet_mutation_authorized=false");
  console.log("validator_authority_granted=false");
  console.log("publisher_private_key_access=false");
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
