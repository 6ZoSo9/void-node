import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { TextDecoder } from "node:util";

import {
  VOID_SEGMENTED_JSONL_MAX_RECORD_BYTES_V1,
  buildSegmentedJsonlV1FromFile,
  readSegmentedJsonlManifestV1,
} from "../storage/segmented_jsonl_v1.js";
import {
  deriveSegmentedJsonlSnapshotAuthorityV1,
  deriveSegmentedJsonlCheckpointV1,
  verifySegmentedJsonlCheckpointAnchorV1,
  verifySegmentedJsonlSnapshotAuthorityObjectV1,
  type SegmentedJsonlCheckpointAnchorV1,
  type SegmentedJsonlCheckpointV1,
  type SegmentedJsonlSnapshotAuthorityV1,
} from "../storage/segmented_jsonl_snapshot_authority_v1.js";
import {
  deriveSegmentedJsonlMaterializedAuthorityV1,
  verifySegmentedJsonlMaterializedAuthorityObjectV1,
  type SegmentedJsonlMaterializedAuthorityV1,
} from "../storage/segmented_jsonl_materialized_authority_v1.js";
import {
  verifySegmentedJsonlCheckpointAppendOnlyAtUseV1,
  verifySegmentedJsonlAppendOnlyCheckpointWitnessObjectV1,
  type SegmentedJsonlAppendOnlyCheckpointWitnessV1,
} from "../storage/segmented_jsonl_checkpoint_materialized_authority_v1.js";
import {
  readSegmentedJsonlDurableRootV1,
  verifySegmentedJsonlDurableRootMaterializedAtUseV1,
  type SegmentedJsonlDurableRootPublishInputV1,
  type SegmentedJsonlDurableRootV1,
} from "../storage/segmented_jsonl_durable_root_v1.js";
import {
  VOID_BUY_VOID_HISTORY_CARRIER_ACTIVE_SEGMENT_ID_V1,
  type BuyVoidHistoryRecordLocatorV1,
} from "./buy_void_history_carrier_v1.js";

export const VOID_BUY_VOID_HISTORY_SEGMENTED_SUCCESSOR_V1 =
  "VOID_BUY_VOID_HISTORY_SEGMENTED_SUCCESSOR_V1";

export const VOID_BUY_VOID_HISTORY_SEGMENTED_SUCCESSOR_MAX_PREDECESSOR_BYTES_V1 =
  16 * 1024 * 1024;
export const VOID_BUY_VOID_HISTORY_SEGMENTED_SUCCESSOR_SEGMENT_TARGET_BYTES_V1 =
  8 * 1024 * 1024;

export const VOID_BUY_VOID_HISTORY_SEGMENTED_SUCCESSOR_AUTHORITY_V1 =
  Object.freeze({
    source_only_producer: true,
    dedicated_successor_namespace_required: true,
    legacy_migration_namespace_mutation: false,
    exact_predecessor_durable_root_required: true,
    exact_predecessor_checkpoint_anchor_required: true,
    exact_predecessor_materialized_authority_required: true,
    predecessor_materialized_verified_at_use: true,
    predecessor_byte_ceiling:
      VOID_BUY_VOID_HISTORY_SEGMENTED_SUCCESSOR_MAX_PREDECESSOR_BYTES_V1,
    one_record_append_per_generation: true,
    canonical_json_record_required: true,
    atomic_generation_visibility: true,
    completed_stage_replay_idempotent: true,
    append_only_witness_produced_at_use: true,
    durable_root_publish_input_materialized: true,
    durable_root_publish_performed: false,
    carrier_root_mutation: false,
    carrier_successor_publication: false,
    reservation_lifecycle_mount: false,
    paid_unreservable_obligation_lifecycle_mount: false,
    terminal_closeout_refresh_mount: false,
    runtime_activation_ready: false,
    runtime_enablement: false,
    apply_enablement: false,
    public_activation: false,
    service_action: false,
    credential_content_read: false,
    wallet_or_signer_access: false,
    rpc_call: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    inventory_mutation: false,
    treasury_or_liquidity_action: false,
    funds_movement: false,
    automatic_retry: false,
  });

const MARKER =
  VOID_BUY_VOID_HISTORY_SEGMENTED_SUCCESSOR_V1;
const STAGE_FILE = "stage.v1.json";
const MATERIALIZED_FILE = "materialized.v1.jsonl";
const STORE_DIR = "store";
const SHA256 = /^[0-9a-f]{64}$/u;
const FATAL_UTF8 = new TextDecoder("utf-8", { fatal: true });
const READ_CHUNK = 1024 * 1024;

export type BuyVoidHistorySegmentedSuccessorStageMetadataV1 = {
  marker: typeof VOID_BUY_VOID_HISTORY_SEGMENTED_SUCCESSOR_V1;
  version: 1;
  current_durable_root_sha256: string;
  current_store_generation: number;
  next_store_generation: number;
  appended_record_sha256: string;
  appended_record_bytes: number;
  appended_record_offset: number;
  record_segment_id: number;
  record_segment_sha256: string;
  current_checkpoint_anchor: SegmentedJsonlCheckpointAnchorV1;
  current_materialized_authority: SegmentedJsonlMaterializedAuthorityV1;
  next_snapshot: SegmentedJsonlSnapshotAuthorityV1;
  next_checkpoint: SegmentedJsonlCheckpointV1;
  next_materialized_authority: SegmentedJsonlMaterializedAuthorityV1;
  append_only_witness: SegmentedJsonlAppendOnlyCheckpointWitnessV1;
  stage_id: string;
};

export type BuyVoidHistorySegmentedSuccessorStageV1 = {
  status: "staged" | "duplicate";
  generation_root: string;
  store_root: string;
  materialized_file: string;
  metadata_file: string;
  metadata: BuyVoidHistorySegmentedSuccessorStageMetadataV1;
  publish_input: SegmentedJsonlDurableRootPublishInputV1;
  locator_without_durable_root: Omit<
    BuyVoidHistoryRecordLocatorV1,
    "segmented_durable_root_sha256"
  >;
  filesystem_mutation_performed: boolean;
  durable_root_publish_performed: false;
  carrier_root_mutation_performed: false;
  runtime_activation_authorized: false;
  apply_activation_authorized: false;
  public_activation_authorized: false;
  transaction_broadcast_performed: false;
  chain2050_write_performed: false;
  funds_movement_performed: false;
  authority:
    typeof VOID_BUY_VOID_HISTORY_SEGMENTED_SUCCESSOR_AUTHORITY_V1;
};

export type BuyVoidHistorySegmentedSuccessorInputV1 = {
  durable_root_directory: string;
  current_store_root: string;
  current_materialized_file: string;
  current_checkpoint_anchor: SegmentedJsonlCheckpointAnchorV1;
  trusted_current_durable_root_sha256: string;
  generation_parent: string;
  record_bytes: Buffer;
};

function fail(code: string, detail: string): never {
  throw new Error(`${MARKER}:${code}:${detail}`);
}

function sha256(value: Buffer | string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      fail("NON_CANONICAL_NUMBER", String(value));
    }
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(record)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key) +
            ":" +
            canonicalJson(record[key]),
        )
        .join(",") +
      "}"
    );
  }
  fail("NON_CANONICAL_VALUE", typeof value);
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  code: string,
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    fail(code, actual.join(","));
  }
}

function currentUid(): number {
  const getuid = process.getuid;
  if (typeof getuid !== "function") {
    fail("UID_UNAVAILABLE", "process.getuid");
  }
  return getuid();
}

function privateDirectory(
  directoryInput: string,
  label: string,
): string {
  const directory = path.resolve(String(directoryInput || ""));
  if (
    !directory ||
    directory === path.parse(directory).root ||
    fs.realpathSync(directory) !== directory
  ) {
    fail(label + "_INVALID", directory || "empty");
  }
  const st = fs.lstatSync(directory);
  if (
    !st.isDirectory() ||
    st.isSymbolicLink() ||
    st.uid !== currentUid() ||
    (st.mode & 0o077) !== 0
  ) {
    fail(label + "_AUTHORITY_MISMATCH", directory);
  }
  return directory;
}

function validateRecordBytes(input: Buffer): Buffer {
  const bytes = Buffer.from(input || Buffer.alloc(0));
  if (
    bytes.length < 2 ||
    bytes.length >
      VOID_SEGMENTED_JSONL_MAX_RECORD_BYTES_V1 + 1 ||
    bytes[bytes.length - 1] !== 0x0a ||
    bytes.subarray(0, bytes.length - 1).includes(0x0a)
  ) {
    fail("RECORD_FRAMING_INVALID", String(bytes.length));
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(
      FATAL_UTF8.decode(bytes.subarray(0, bytes.length - 1)),
    );
  } catch {
    fail("RECORD_JSON_INVALID", sha256(bytes));
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    fail("RECORD_OBJECT_REQUIRED", sha256(bytes));
  }
  return bytes;
}

function fsyncDirectory(directory: string): void {
  const fd = fs.openSync(
    directory,
    fs.constants.O_RDONLY |
      ((fs.constants as any).O_DIRECTORY || 0) |
      ((fs.constants as any).O_NOFOLLOW || 0),
  );
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function writePrivateNew(file: string, body: Buffer, mode: number): void {
  const fd = fs.openSync(
    file,
    fs.constants.O_WRONLY |
      fs.constants.O_CREAT |
      fs.constants.O_EXCL |
      ((fs.constants as any).O_NOFOLLOW || 0),
    mode,
  );
  try {
    let offset = 0;
    while (offset < body.length) {
      const written = fs.writeSync(
        fd,
        body,
        offset,
        body.length - offset,
        null,
      );
      if (written <= 0) {
        fail("SHORT_WRITE", file);
      }
      offset += written;
    }
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function stageCore(
  input: Omit<
    BuyVoidHistorySegmentedSuccessorStageMetadataV1,
    "stage_id"
  >,
): Omit<
  BuyVoidHistorySegmentedSuccessorStageMetadataV1,
  "stage_id"
> {
  return input;
}

function stageId(
  core: Omit<
    BuyVoidHistorySegmentedSuccessorStageMetadataV1,
    "stage_id"
  >,
): string {
  return sha256(canonicalJson(core));
}

function stagePaths(generationRoot: string) {
  return {
    generation_root: generationRoot,
    store_root: path.join(generationRoot, STORE_DIR),
    materialized_file:
      path.join(generationRoot, MATERIALIZED_FILE),
    metadata_file: path.join(generationRoot, STAGE_FILE),
  };
}

function publishInput(
  metadata: BuyVoidHistorySegmentedSuccessorStageMetadataV1,
): SegmentedJsonlDurableRootPublishInputV1 {
  return {
    checkpoint: metadata.next_checkpoint,
    snapshot: metadata.next_snapshot,
    materialized: metadata.next_materialized_authority,
    previousAnchor: metadata.current_checkpoint_anchor,
    previousMaterialized:
      metadata.current_materialized_authority,
    appendOnlyWitness: metadata.append_only_witness,
    trustedAppendOnlyWitnessSha256:
      metadata.append_only_witness.witness_sha256,
  };
}

function locatorWithoutRoot(
  metadata: BuyVoidHistorySegmentedSuccessorStageMetadataV1,
): Omit<
  BuyVoidHistoryRecordLocatorV1,
  "segmented_durable_root_sha256"
> {
  return {
    segment_id: metadata.record_segment_id,
    segment_sha256: metadata.record_segment_sha256,
    byte_offset: String(metadata.appended_record_offset),
    byte_length: metadata.appended_record_bytes,
    record_sha256: metadata.appended_record_sha256,
  };
}

function validateMetadata(
  value: unknown,
): BuyVoidHistorySegmentedSuccessorStageMetadataV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("STAGE_METADATA_OBJECT_REQUIRED", "metadata");
  }
  const raw = value as Record<string, unknown>;
  exactKeys(
    raw,
    [
      "marker",
      "version",
      "current_durable_root_sha256",
      "current_store_generation",
      "next_store_generation",
      "appended_record_sha256",
      "appended_record_bytes",
      "appended_record_offset",
      "record_segment_id",
      "record_segment_sha256",
      "current_checkpoint_anchor",
      "current_materialized_authority",
      "next_snapshot",
      "next_checkpoint",
      "next_materialized_authority",
      "append_only_witness",
      "stage_id",
    ],
    "STAGE_METADATA_KEYS_INVALID",
  );
  if (
    raw.marker !== MARKER ||
    raw.version !== 1 ||
    !SHA256.test(String(raw.current_durable_root_sha256 || "")) ||
    !SHA256.test(String(raw.appended_record_sha256 || "")) ||
    !SHA256.test(String(raw.record_segment_sha256 || "")) ||
    !SHA256.test(String(raw.stage_id || "")) ||
    !Number.isSafeInteger(raw.current_store_generation) ||
    Number(raw.current_store_generation) < 1 ||
    !Number.isSafeInteger(raw.next_store_generation) ||
    Number(raw.next_store_generation) !==
      Number(raw.current_store_generation) + 1 ||
    !Number.isSafeInteger(raw.appended_record_bytes) ||
    Number(raw.appended_record_bytes) < 2 ||
    !Number.isSafeInteger(raw.appended_record_offset) ||
    Number(raw.appended_record_offset) < 0 ||
    !Number.isSafeInteger(raw.record_segment_id) ||
    Number(raw.record_segment_id) < 0
  ) {
    fail("STAGE_METADATA_SHAPE_INVALID", "metadata");
  }

  const currentAnchor =
    verifySegmentedJsonlCheckpointAnchorV1(
      raw.current_checkpoint_anchor as SegmentedJsonlCheckpointAnchorV1,
    );
  const currentMaterialized =
    verifySegmentedJsonlMaterializedAuthorityObjectV1(
      raw.current_materialized_authority as SegmentedJsonlMaterializedAuthorityV1,
    );
  const nextSnapshot =
    deriveVerifiedSnapshot(
      raw.next_snapshot as SegmentedJsonlSnapshotAuthorityV1,
    );
  const nextCheckpoint =
    deriveVerifiedCheckpoint(
      raw.next_checkpoint as SegmentedJsonlCheckpointV1,
      nextSnapshot,
      currentAnchor,
    );
  const nextMaterialized =
    verifySegmentedJsonlMaterializedAuthorityObjectV1(
      raw.next_materialized_authority as SegmentedJsonlMaterializedAuthorityV1,
    );
  const witness =
    verifySegmentedJsonlAppendOnlyCheckpointWitnessObjectV1(
      raw.append_only_witness as SegmentedJsonlAppendOnlyCheckpointWitnessV1,
    );
  if (
    witness.previous_checkpoint_sha256 !==
      currentAnchor.checkpoint.checkpoint_sha256 ||
    witness.checkpoint_sha256 !==
      nextCheckpoint.checkpoint_sha256 ||
    witness.previous_materialized_authority_sha256 !==
      currentMaterialized.authority_sha256 ||
    witness.current_materialized_authority_sha256 !==
      nextMaterialized.authority_sha256 ||
    witness.previous_generation !==
      currentMaterialized.store_generation ||
    witness.current_generation !==
      nextMaterialized.store_generation
  ) {
    fail("STAGE_WITNESS_BINDING_INVALID", witness.witness_sha256);
  }

  const candidate: Omit<
    BuyVoidHistorySegmentedSuccessorStageMetadataV1,
    "stage_id"
  > = {
    marker: MARKER,
    version: 1 as const,
    current_durable_root_sha256:
      String(raw.current_durable_root_sha256),
    current_store_generation:
      Number(raw.current_store_generation),
    next_store_generation:
      Number(raw.next_store_generation),
    appended_record_sha256:
      String(raw.appended_record_sha256),
    appended_record_bytes:
      Number(raw.appended_record_bytes),
    appended_record_offset:
      Number(raw.appended_record_offset),
    record_segment_id:
      Number(raw.record_segment_id),
    record_segment_sha256:
      String(raw.record_segment_sha256),
    current_checkpoint_anchor: currentAnchor,
    current_materialized_authority: currentMaterialized,
    next_snapshot: nextSnapshot,
    next_checkpoint: nextCheckpoint,
    next_materialized_authority: nextMaterialized,
    append_only_witness: witness,
  };
  const digest = stageId(candidate);
  if (digest !== raw.stage_id) {
    fail("STAGE_ID_MISMATCH", String(raw.stage_id));
  }
  return {
    ...candidate,
    stage_id: digest,
  };
}

function deriveVerifiedSnapshot(
  snapshot: SegmentedJsonlSnapshotAuthorityV1,
): SegmentedJsonlSnapshotAuthorityV1 {
  return verifySegmentedJsonlSnapshotAuthorityObjectV1(snapshot);
}

function deriveVerifiedCheckpoint(
  checkpoint: SegmentedJsonlCheckpointV1,
  snapshot: SegmentedJsonlSnapshotAuthorityV1,
  previous: SegmentedJsonlCheckpointAnchorV1,
): SegmentedJsonlCheckpointV1 {
  const derived =
    deriveSegmentedJsonlCheckpointV1(snapshot, previous);
  if (
    canonicalJson(derived) !== canonicalJson(checkpoint)
  ) {
    fail(
      "CHECKPOINT_METADATA_INVALID",
      checkpoint.checkpoint_sha256,
    );
  }
  return checkpoint;
}

function readStageFile(
  generationRootInput: string,
): BuyVoidHistorySegmentedSuccessorStageV1 {
  const generationRoot =
    privateDirectory(generationRootInput, "GENERATION_ROOT");
  const paths = stagePaths(generationRoot);
  const st = fs.lstatSync(paths.metadata_file);
  if (
    !st.isFile() ||
    st.isSymbolicLink() ||
    st.uid !== currentUid() ||
    (st.mode & 0o777) !== 0o400 ||
    st.size <= 0 ||
    st.size > 256 * 1024
  ) {
    fail("STAGE_METADATA_FILE_INVALID", paths.metadata_file);
  }
  const bytes = fs.readFileSync(paths.metadata_file);
  const metadata = validateMetadata(
    JSON.parse(FATAL_UTF8.decode(bytes)),
  );

  const manifest = readSegmentedJsonlManifestV1(paths.store_root);
  const snapshot =
    deriveSegmentedJsonlSnapshotAuthorityV1(manifest);
  if (
    snapshot.snapshot_sha256 !==
      metadata.next_snapshot.snapshot_sha256 ||
    snapshot.manifest_sha256 !==
      metadata.next_snapshot.manifest_sha256
  ) {
    fail("STAGE_STORE_SNAPSHOT_MISMATCH", metadata.stage_id);
  }
  const materialized =
    deriveSegmentedJsonlMaterializedAuthorityV1(
      paths.store_root,
      paths.materialized_file,
    );
  if (
    materialized.authority_sha256 !==
      metadata.next_materialized_authority.authority_sha256
  ) {
    fail(
      "STAGE_MATERIALIZED_AUTHORITY_MISMATCH",
      metadata.stage_id,
    );
  }

  return {
    status: "duplicate",
    ...paths,
    metadata,
    publish_input: publishInput(metadata),
    locator_without_durable_root:
      locatorWithoutRoot(metadata),
    filesystem_mutation_performed: false,
    durable_root_publish_performed: false,
    carrier_root_mutation_performed: false,
    runtime_activation_authorized: false,
    apply_activation_authorized: false,
    public_activation_authorized: false,
    transaction_broadcast_performed: false,
    chain2050_write_performed: false,
    funds_movement_performed: false,
    authority:
      VOID_BUY_VOID_HISTORY_SEGMENTED_SUCCESSOR_AUTHORITY_V1,
  };
}

function segmentForRecord(
  manifest: ReturnType<typeof readSegmentedJsonlManifestV1>,
  offset: number,
  length: number,
): { id: number; sha256: string } {
  let cursor = 0;
  for (const segment of manifest.sealed_segments) {
    const end = cursor + segment.bytes;
    if (offset >= cursor && offset + length <= end) {
      return {
        id: segment.id,
        sha256: segment.sha256,
      };
    }
    cursor = end;
  }
  const activeEnd = cursor + manifest.active.bytes;
  if (
    offset >= cursor &&
    offset + length <= activeEnd
  ) {
    return {
      id: VOID_BUY_VOID_HISTORY_CARRIER_ACTIVE_SEGMENT_ID_V1,
      sha256: manifest.active.sha256,
    };
  }
  fail(
    "APPENDED_RECORD_NOT_IN_NEXT_MANIFEST",
    `${offset}:${length}:${manifest.total_bytes}`,
  );
}

export function stageBuyVoidHistorySegmentedSuccessorV1(
  input: BuyVoidHistorySegmentedSuccessorInputV1,
): BuyVoidHistorySegmentedSuccessorStageV1 {
  const parent =
    privateDirectory(input.generation_parent, "GENERATION_PARENT");
  const recordBytes = validateRecordBytes(input.record_bytes);
  const trustedRoot =
    String(input.trusted_current_durable_root_sha256 || "")
      .trim()
      .toLowerCase();
  if (!SHA256.test(trustedRoot)) {
    fail("CURRENT_DURABLE_ROOT_INVALID", trustedRoot || "empty");
  }

  const currentAnchor =
    verifySegmentedJsonlCheckpointAnchorV1(
      input.current_checkpoint_anchor,
    );
  const currentMaterialized =
    deriveSegmentedJsonlMaterializedAuthorityV1(
      input.current_store_root,
      input.current_materialized_file,
    );
  const currentDurable =
    readSegmentedJsonlDurableRootV1(
      input.durable_root_directory,
    );
  if (
    !currentDurable ||
    currentDurable.root_sha256 !== trustedRoot ||
    currentDurable.checkpoint_sha256 !==
      currentAnchor.checkpoint.checkpoint_sha256 ||
    currentDurable.snapshot_sha256 !==
      currentAnchor.snapshot.snapshot_sha256 ||
    currentDurable.materialized_authority_sha256 !==
      currentMaterialized.authority_sha256 ||
    currentDurable.materialized_sha256 !==
      currentMaterialized.materialized_sha256 ||
    currentDurable.store_generation !==
      currentAnchor.snapshot.generation
  ) {
    fail("CURRENT_DURABLE_ROOT_BINDING_INVALID", trustedRoot);
  }
  if (
    currentDurable.total_bytes >
      VOID_BUY_VOID_HISTORY_SEGMENTED_SUCCESSOR_MAX_PREDECESSOR_BYTES_V1
  ) {
    fail(
      "PREDECESSOR_BYTE_CEILING_EXCEEDED",
      String(currentDurable.total_bytes),
    );
  }

  const nextGeneration = currentDurable.store_generation + 1;
  const finalRoot =
    path.join(
      parent,
      String(nextGeneration).padStart(8, "0"),
    );
  if (fs.existsSync(finalRoot)) {
    const duplicate = readStageFile(finalRoot);
    if (
      duplicate.metadata.current_durable_root_sha256 !==
        trustedRoot ||
      duplicate.metadata.appended_record_sha256 !==
        sha256(recordBytes) ||
      duplicate.metadata.appended_record_bytes !==
        recordBytes.length
    ) {
      fail(
        "EXISTING_STAGE_INPUT_MISMATCH",
        duplicate.metadata.stage_id,
      );
    }
    return duplicate;
  }

  const token =
    `${process.pid}-${crypto.randomBytes(8).toString("hex")}`;
  const temporaryRoot =
    path.join(
      parent,
      `.stage-${String(nextGeneration).padStart(8, "0")}-${token}`,
    );
  fs.mkdirSync(temporaryRoot, { mode: 0o700 });
  const tempPaths = stagePaths(temporaryRoot);

  try {
    const materializedFd = fs.openSync(
      tempPaths.materialized_file,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        ((fs.constants as any).O_NOFOLLOW || 0),
      0o600,
    );
    try {
      let writeOffset = 0;
      verifySegmentedJsonlDurableRootMaterializedAtUseV1(
        input.durable_root_directory,
        input.current_store_root,
        input.current_materialized_file,
        currentMaterialized,
        trustedRoot,
        (reader) => {
          let offset = 0;
          while (offset < reader.total_bytes) {
            const length = Math.min(
              READ_CHUNK,
              reader.total_bytes - offset,
            );
            const chunk = reader.read(offset, length);
            let copied = 0;
            while (copied < chunk.length) {
              const n = fs.writeSync(
                materializedFd,
                chunk,
                copied,
                chunk.length - copied,
                writeOffset + copied,
              );
              if (n <= 0) {
                fail("MATERIALIZED_COPY_SHORT_WRITE", String(offset));
              }
              copied += n;
            }
            writeOffset += chunk.length;
            offset += chunk.length;
          }
          return null;
        },
      );
      let recordOffset = 0;
      while (recordOffset < recordBytes.length) {
        const n = fs.writeSync(
          materializedFd,
          recordBytes,
          recordOffset,
          recordBytes.length - recordOffset,
          writeOffset + recordOffset,
        );
        if (n <= 0) {
          fail("APPEND_RECORD_SHORT_WRITE", String(recordOffset));
        }
        recordOffset += n;
      }
      fs.fsyncSync(materializedFd);
    } finally {
      fs.closeSync(materializedFd);
    }

    const nextManifest =
      buildSegmentedJsonlV1FromFile(
        tempPaths.materialized_file,
        tempPaths.store_root,
        {
          segmentTargetBytes:
            VOID_BUY_VOID_HISTORY_SEGMENTED_SUCCESSOR_SEGMENT_TARGET_BYTES_V1,
          maxRecordBytes:
            VOID_SEGMENTED_JSONL_MAX_RECORD_BYTES_V1,
          generation: nextGeneration,
          validateJson: true,
        },
      );
    if (
      nextManifest.total_bytes !==
        currentDurable.total_bytes + recordBytes.length ||
      nextManifest.total_records !==
        currentDurable.total_records + 1
    ) {
      fail(
        "NEXT_MANIFEST_TOTAL_MISMATCH",
        `${nextManifest.total_bytes}:${nextManifest.total_records}`,
      );
    }

    const nextSnapshot =
      deriveSegmentedJsonlSnapshotAuthorityV1(
        nextManifest,
      );
    const nextCheckpoint =
      deriveSegmentedJsonlCheckpointV1(
        nextSnapshot,
        currentAnchor,
      );
    const nextMaterialized =
      deriveSegmentedJsonlMaterializedAuthorityV1(
        tempPaths.store_root,
        tempPaths.materialized_file,
      );
    const witness =
      verifySegmentedJsonlCheckpointAppendOnlyAtUseV1(
        tempPaths.store_root,
        tempPaths.materialized_file,
        nextCheckpoint,
        nextSnapshot,
        currentAnchor,
        currentMaterialized,
        nextMaterialized,
        currentMaterialized.authority_sha256,
      );

    const recordSegment =
      segmentForRecord(
        nextManifest,
        currentDurable.total_bytes,
        recordBytes.length,
      );

    const core = stageCore({
      marker: MARKER,
      version: 1,
      current_durable_root_sha256: trustedRoot,
      current_store_generation:
        currentDurable.store_generation,
      next_store_generation: nextGeneration,
      appended_record_sha256: sha256(recordBytes),
      appended_record_bytes: recordBytes.length,
      appended_record_offset:
        currentDurable.total_bytes,
      record_segment_id: recordSegment.id,
      record_segment_sha256: recordSegment.sha256,
      current_checkpoint_anchor: currentAnchor,
      current_materialized_authority:
        currentMaterialized,
      next_snapshot: nextSnapshot,
      next_checkpoint: nextCheckpoint,
      next_materialized_authority:
        nextMaterialized,
      append_only_witness: witness,
    });
    const metadata: BuyVoidHistorySegmentedSuccessorStageMetadataV1 = {
      ...core,
      stage_id: stageId(core),
    };
    writePrivateNew(
      tempPaths.metadata_file,
      Buffer.from(
        JSON.stringify(metadata) + "\n",
        "utf8",
      ),
      0o400,
    );
    fsyncDirectory(temporaryRoot);
    fs.renameSync(temporaryRoot, finalRoot);
    fsyncDirectory(parent);

    const staged = readStageFile(finalRoot);
    return {
      ...staged,
      status: "staged",
      filesystem_mutation_performed: true,
    };
  } catch (error) {
    throw error;
  }
}

export function materializeBuyVoidHistorySegmentedSuccessorLocatorV1(
  stage: BuyVoidHistorySegmentedSuccessorStageV1,
  publishedRoot: SegmentedJsonlDurableRootV1,
): BuyVoidHistoryRecordLocatorV1 {
  const metadata = validateMetadata(stage.metadata);
  const root = publishedRoot;
  if (
    root.store_generation !== metadata.next_store_generation ||
    root.previous_root_sha256 !==
      metadata.current_durable_root_sha256 ||
    root.checkpoint_sha256 !==
      metadata.next_checkpoint.checkpoint_sha256 ||
    root.snapshot_sha256 !==
      metadata.next_snapshot.snapshot_sha256 ||
    root.manifest_sha256 !==
      metadata.next_snapshot.manifest_sha256 ||
    root.materialized_authority_sha256 !==
      metadata.next_materialized_authority.authority_sha256 ||
    root.materialized_sha256 !==
      metadata.next_materialized_authority.materialized_sha256 ||
    root.append_only_witness_sha256 !==
      metadata.append_only_witness.witness_sha256
  ) {
    fail(
      "PUBLISHED_DURABLE_ROOT_STAGE_MISMATCH",
      root.root_sha256,
    );
  }
  return {
    segmented_durable_root_sha256: root.root_sha256,
    ...locatorWithoutRoot(metadata),
  };
}
