// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { TextDecoder } from "node:util";

import {
  verifySegmentedJsonlCheckpointAnchorV1,
  verifySegmentedJsonlCheckpointIncrementalV1,
  verifySegmentedJsonlSnapshotAuthorityObjectV1,
  type SegmentedJsonlCheckpointAnchorV1,
  type SegmentedJsonlCheckpointV1,
  type SegmentedJsonlSnapshotAuthorityV1,
} from "./segmented_jsonl_snapshot_authority_v1.js";
import {
  verifySegmentedJsonlMaterializedAuthorityObjectV1,
  type SegmentedJsonlMaterializedAuthorityV1,
} from "./segmented_jsonl_materialized_authority_v1.js";
import {
  verifySegmentedJsonlCheckpointAppendOnlyBoundedV1,
  type SegmentedJsonlAppendOnlyCheckpointWitnessV1,
} from "./segmented_jsonl_checkpoint_materialized_authority_v1.js";

export const VOID_SEGMENTED_JSONL_DURABLE_ROOT_V1 = "VOID_SEGMENTED_JSONL_DURABLE_ROOT_V1";
export const VOID_SEGMENTED_JSONL_DURABLE_ROOT_SLOT_V1 = "VOID_SEGMENTED_JSONL_DURABLE_ROOT_SLOT_V1";
export const VOID_SEGMENTED_JSONL_DURABLE_ROOT_SLOT_BYTES_V1 = 8192;

const SLOT_NAMES = ["durable-root-slot-0.v1.json", "durable-root-slot-1.v1.json"] as const;
const FATAL_UTF8 = new TextDecoder("utf-8", { fatal: true });

export type SegmentedJsonlDurableRootV1 = {
  v: 1;
  format: typeof VOID_SEGMENTED_JSONL_DURABLE_ROOT_V1;
  store_generation: number;
  checkpoint_sha256: string;
  snapshot_sha256: string;
  manifest_sha256: string;
  materialized_authority_sha256: string;
  materialized_sha256: string;
  append_only_witness_sha256: string | null;
  previous_root_sha256: string | null;
  total_bytes: number;
  total_records: number;
  root_sha256: string;
};

export type SegmentedJsonlDurableRootSlotV1 = {
  v: 1;
  format: typeof VOID_SEGMENTED_JSONL_DURABLE_ROOT_SLOT_V1;
  slot_index: 0 | 1;
  slot_dev: string;
  slot_ino: string;
  peer_slot_dev: string | null;
  peer_slot_ino: string | null;
  root: SegmentedJsonlDurableRootV1;
  slot_sha256: string;
};

export type SegmentedJsonlDurableRootPublishInputV1 = {
  checkpoint: SegmentedJsonlCheckpointV1;
  snapshot: SegmentedJsonlSnapshotAuthorityV1;
  materialized: SegmentedJsonlMaterializedAuthorityV1;
  previousAnchor?: SegmentedJsonlCheckpointAnchorV1 | null;
  previousMaterialized?: SegmentedJsonlMaterializedAuthorityV1 | null;
  appendOnlyWitness?: SegmentedJsonlAppendOnlyCheckpointWitnessV1 | null;
  trustedAppendOnlyWitnessSha256?: string | null;
};

type DirectoryAuthorityV1 = {
  fd: number;
  publicPath: string;
  stablePath: string;
  dev: string;
  ino: string;
};

type SlotIdentityV1 = { dev: string; ino: string };
type SlotReadV1 = {
  index: 0 | 1;
  path: string;
  exists: boolean;
  identity: SlotIdentityV1 | null;
  value: SegmentedJsonlDurableRootSlotV1 | null;
};

function fail(code: string, detail: string): never {
  throw new Error(`${VOID_SEGMENTED_JSONL_DURABLE_ROOT_V1}:${code}:${detail}`);
}

function sha256(data: Buffer | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(value);
}

function isHex64(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

function requireExactKeys(value: object, expected: readonly string[], code: string): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail(code, actual.join(","));
  }
}

function currentUid(): bigint {
  if (typeof process.getuid !== "function") fail("UID_UNAVAILABLE", "process.getuid");
  return BigInt(process.getuid());
}

function directoryFlags(): number {
  return fs.constants.O_RDONLY | ((fs.constants as any).O_DIRECTORY || 0) | ((fs.constants as any).O_NOFOLLOW || 0);
}

function assertPrivateDirectory(st: any, label: string): void {
  const mode = Number(st.mode) & 0o777;
  if (!st.isDirectory() || st.uid !== currentUid() || (mode & 0o022) !== 0 || (mode & 0o300) !== 0o300) {
    fail("DURABLE_ROOT_DIRECTORY_AUTHORITY_MISMATCH", `${label}:uid=${String(st.uid)}:mode=${mode.toString(8)}`);
  }
}

function openDirectoryAuthority(dirInput: string): DirectoryAuthorityV1 {
  const publicPath = path.resolve(String(dirInput || ""));
  if (!publicPath || publicPath === path.parse(publicPath).root) fail("INVALID_DURABLE_ROOT_DIRECTORY", publicPath || "empty");
  const parsed = path.parse(publicPath);
  let fd = fs.openSync(parsed.root, directoryFlags());
  let visible = parsed.root;
  try {
    for (const component of publicPath.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
      const stableChild = path.join(`/proc/self/fd/${fd}`, component);
      const nextFd = fs.openSync(stableChild, directoryFlags());
      try {
        const opened = fs.fstatSync(nextFd, { bigint: true } as any);
        visible = path.join(visible, component);
        const current = fs.lstatSync(visible, { bigint: true } as any);
        if (!opened.isDirectory() || !current.isDirectory() || current.isSymbolicLink() || opened.dev !== current.dev || opened.ino !== current.ino) {
          fail("DURABLE_ROOT_DIRECTORY_NAMESPACE_MISMATCH", visible);
        }
      } catch (error) {
        fs.closeSync(nextFd);
        throw error;
      }
      fs.closeSync(fd);
      fd = nextFd;
    }
    const opened = fs.fstatSync(fd, { bigint: true } as any);
    const current = fs.lstatSync(publicPath, { bigint: true } as any);
    if (!opened.isDirectory() || !current.isDirectory() || current.isSymbolicLink() || opened.dev !== current.dev || opened.ino !== current.ino) {
      fail("DURABLE_ROOT_DIRECTORY_NAMESPACE_MISMATCH", publicPath);
    }
    assertPrivateDirectory(opened, publicPath);
    assertPrivateDirectory(current, publicPath);
    return { fd, publicPath, stablePath: `/proc/self/fd/${fd}`, dev: String(opened.dev), ino: String(opened.ino) };
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
}

function assertDirectoryAuthority(authority: DirectoryAuthorityV1): void {
  const opened = fs.fstatSync(authority.fd, { bigint: true } as any);
  const current = fs.lstatSync(authority.publicPath, { bigint: true } as any);
  if (!opened.isDirectory() || !current.isDirectory() || current.isSymbolicLink() || String(opened.dev) !== authority.dev || String(opened.ino) !== authority.ino || opened.dev !== current.dev || opened.ino !== current.ino) {
    fail("DURABLE_ROOT_DIRECTORY_CHANGED", authority.publicPath);
  }
  assertPrivateDirectory(opened, authority.publicPath);
  assertPrivateDirectory(current, authority.publicPath);
}

function slotIdentityFromStat(st: any, label: string): SlotIdentityV1 {
  const mode = Number(st.mode) & 0o777;
  if (!st.isFile() || st.uid !== currentUid() || mode !== 0o600 || Number(st.nlink) !== 1) {
    fail("DURABLE_ROOT_SLOT_AUTHORITY_MISMATCH", `${label}:uid=${String(st.uid)}:mode=${mode.toString(8)}:nlink=${String(st.nlink)}`);
  }
  return { dev: String(st.dev), ino: String(st.ino) };
}

function sameIdentity(a: SlotIdentityV1, b: SlotIdentityV1): boolean {
  return a.dev === b.dev && a.ino === b.ino;
}

function verifyRootObject(rootInput: SegmentedJsonlDurableRootV1): SegmentedJsonlDurableRootV1 {
  const root = rootInput as SegmentedJsonlDurableRootV1;
  if (!root || typeof root !== "object") fail("INVALID_DURABLE_ROOT", "not-object");
  requireExactKeys(root, [
    "v", "format", "store_generation", "checkpoint_sha256", "snapshot_sha256",
    "manifest_sha256", "materialized_authority_sha256", "materialized_sha256",
    "append_only_witness_sha256", "previous_root_sha256", "total_bytes", "total_records", "root_sha256",
  ], "INVALID_DURABLE_ROOT_KEYS");
  if (
    root.v !== 1 || root.format !== VOID_SEGMENTED_JSONL_DURABLE_ROOT_V1 ||
    !Number.isSafeInteger(root.store_generation) || root.store_generation <= 0 ||
    !isHex64(root.checkpoint_sha256) || !isHex64(root.snapshot_sha256) || !isHex64(root.manifest_sha256) ||
    !isHex64(root.materialized_authority_sha256) || !isHex64(root.materialized_sha256) ||
    !(root.append_only_witness_sha256 === null || isHex64(root.append_only_witness_sha256)) ||
    !(root.previous_root_sha256 === null || isHex64(root.previous_root_sha256)) ||
    !Number.isSafeInteger(root.total_bytes) || root.total_bytes < 0 ||
    !Number.isSafeInteger(root.total_records) || root.total_records < 0 || !isHex64(root.root_sha256)
  ) fail("INVALID_DURABLE_ROOT", "shape");
  if (root.store_generation === 1) {
    if (root.previous_root_sha256 !== null || root.append_only_witness_sha256 !== null) fail("DURABLE_ROOT_GENESIS_PREDECESSOR", root.root_sha256);
  } else if (root.previous_root_sha256 === null || root.append_only_witness_sha256 === null) {
    fail("DURABLE_ROOT_PREDECESSOR_REQUIRED", root.root_sha256);
  }
  const { root_sha256: _digest, ...core } = root;
  if (sha256(canonicalJson(core)) !== root.root_sha256) fail("DURABLE_ROOT_DIGEST_MISMATCH", root.root_sha256);
  return root;
}

function verifySlotObject(slotInput: SegmentedJsonlDurableRootSlotV1): SegmentedJsonlDurableRootSlotV1 {
  const slot = slotInput as SegmentedJsonlDurableRootSlotV1;
  if (!slot || typeof slot !== "object") fail("INVALID_DURABLE_ROOT_SLOT", "not-object");
  requireExactKeys(slot, [
    "v", "format", "slot_index", "slot_dev", "slot_ino", "peer_slot_dev", "peer_slot_ino", "root", "slot_sha256",
  ], "INVALID_DURABLE_ROOT_SLOT_KEYS");
  if (
    slot.v !== 1 || slot.format !== VOID_SEGMENTED_JSONL_DURABLE_ROOT_SLOT_V1 ||
    (slot.slot_index !== 0 && slot.slot_index !== 1) ||
    typeof slot.slot_dev !== "string" || !/^[0-9]+$/.test(slot.slot_dev) ||
    typeof slot.slot_ino !== "string" || !/^[0-9]+$/.test(slot.slot_ino) ||
    !((slot.peer_slot_dev === null && slot.peer_slot_ino === null) ||
      (typeof slot.peer_slot_dev === "string" && /^[0-9]+$/.test(slot.peer_slot_dev) && typeof slot.peer_slot_ino === "string" && /^[0-9]+$/.test(slot.peer_slot_ino))) ||
    !isHex64(slot.slot_sha256)
  ) fail("INVALID_DURABLE_ROOT_SLOT", "shape");
  const root = verifyRootObject(slot.root);
  if ((root.store_generation - 1) % 2 !== slot.slot_index) fail("DURABLE_ROOT_SLOT_PARITY_MISMATCH", String(root.store_generation));
  const { slot_sha256: _digest, ...core } = slot;
  if (sha256(canonicalJson(core)) !== slot.slot_sha256) fail("DURABLE_ROOT_SLOT_DIGEST_MISMATCH", slot.slot_sha256);
  return { ...slot, root };
}

function encodeSlot(slot: SegmentedJsonlDurableRootSlotV1): Buffer {
  const json = Buffer.from(canonicalJson(slot), "utf8");
  if (json.length + 1 > VOID_SEGMENTED_JSONL_DURABLE_ROOT_SLOT_BYTES_V1) fail("DURABLE_ROOT_SLOT_TOO_LARGE", String(json.length));
  const body = Buffer.alloc(VOID_SEGMENTED_JSONL_DURABLE_ROOT_SLOT_BYTES_V1, 0x20);
  json.copy(body, 0);
  body[json.length] = 0x0a;
  return body;
}

function decodeSlot(body: Buffer): SegmentedJsonlDurableRootSlotV1 {
  let end = body.indexOf(0x0a);
  if (end < 0) fail("INVALID_DURABLE_ROOT_SLOT_ENCODING", "newline");
  for (let i = end + 1; i < body.length; i += 1) if (body[i] !== 0x20) fail("INVALID_DURABLE_ROOT_SLOT_ENCODING", `padding=${i}`);
  let text: string;
  try { text = FATAL_UTF8.decode(body.subarray(0, end)); }
  catch { fail("INVALID_DURABLE_ROOT_SLOT_UTF8", "decode"); }
  let parsed: unknown;
  try { parsed = JSON.parse(text); }
  catch { fail("INVALID_DURABLE_ROOT_SLOT_JSON", "parse"); }
  return verifySlotObject(parsed as SegmentedJsonlDurableRootSlotV1);
}

function readSlot(authority: DirectoryAuthorityV1, index: 0 | 1): SlotReadV1 {
  assertDirectoryAuthority(authority);
  const publicPath = path.join(authority.publicPath, SLOT_NAMES[index]);
  const stablePath = path.join(authority.stablePath, SLOT_NAMES[index]);
  let fd = -1;
  try {
    try { fd = fs.openSync(stablePath, fs.constants.O_RDONLY | ((fs.constants as any).O_NOFOLLOW || 0)); }
    catch (error: any) {
      if (error?.code === "ENOENT") return { index, path: publicPath, exists: false, identity: null, value: null };
      throw error;
    }
    const beforeStat = fs.fstatSync(fd, { bigint: true } as any);
    const identity = slotIdentityFromStat(beforeStat, publicPath);
    const visible = fs.lstatSync(publicPath, { bigint: true } as any);
    const visibleIdentity = slotIdentityFromStat(visible, publicPath);
    if (!sameIdentity(identity, visibleIdentity)) fail("DURABLE_ROOT_SLOT_PATH_MISMATCH", publicPath);
    if (Number(beforeStat.size) !== VOID_SEGMENTED_JSONL_DURABLE_ROOT_SLOT_BYTES_V1) {
      return { index, path: publicPath, exists: true, identity, value: null };
    }
    const body = Buffer.alloc(VOID_SEGMENTED_JSONL_DURABLE_ROOT_SLOT_BYTES_V1);
    let off = 0;
    while (off < body.length) {
      const n = fs.readSync(fd, body, off, body.length - off, null);
      if (n <= 0) return { index, path: publicPath, exists: true, identity, value: null };
      off += n;
    }
    const afterStat = fs.fstatSync(fd, { bigint: true } as any);
    const afterIdentity = slotIdentityFromStat(afterStat, publicPath);
    const visibleAfter = slotIdentityFromStat(fs.lstatSync(publicPath, { bigint: true } as any), publicPath);
    if (!sameIdentity(identity, afterIdentity) || !sameIdentity(afterIdentity, visibleAfter)) fail("DURABLE_ROOT_SLOT_CHANGED_DURING_READ", publicPath);
    let value: SegmentedJsonlDurableRootSlotV1 | null = null;
    try { value = decodeSlot(body); } catch { value = null; }
    if (value && (value.slot_dev !== identity.dev || value.slot_ino !== identity.ino || value.slot_index !== index)) {
      value = null;
    }
    return { index, path: publicPath, exists: true, identity, value };
  } finally {
    if (fd >= 0) fs.closeSync(fd);
  }
}

function selectCurrent(slots: [SlotReadV1, SlotReadV1]): SlotReadV1 | null {
  const valid = slots.filter(slot => slot.value !== null) as Array<SlotReadV1 & { value: SegmentedJsonlDurableRootSlotV1 }>;
  if (valid.length === 0) return null;
  valid.sort((a, b) => a.value.root.store_generation - b.value.root.store_generation);
  if (valid.length === 2) {
    const older = valid[0], newer = valid[1];
    if (newer.value.root.store_generation !== older.value.root.store_generation + 1 || newer.value.root.previous_root_sha256 !== older.value.root.root_sha256) {
      fail("DURABLE_ROOT_SLOT_CHAIN_MISMATCH", `${older.value.root.store_generation}:${newer.value.root.store_generation}`);
    }
    if (
      !older.identity || !newer.identity ||
      newer.value.peer_slot_dev !== older.identity.dev || newer.value.peer_slot_ino !== older.identity.ino ||
      (older.value.root.store_generation !== 1 &&
        (older.value.peer_slot_dev !== newer.identity.dev || older.value.peer_slot_ino !== newer.identity.ino))
    ) fail("DURABLE_ROOT_SLOT_PEER_IDENTITY_MISMATCH", `${older.index}:${newer.index}`);
  }
  return valid[valid.length - 1];
}

function assertMaterializedSnapshotBinding(snapshot: SegmentedJsonlSnapshotAuthorityV1, materialized: SegmentedJsonlMaterializedAuthorityV1): void {
  if (
    materialized.snapshot_sha256 !== snapshot.snapshot_sha256 || materialized.manifest_sha256 !== snapshot.manifest_sha256 ||
    materialized.store_generation !== snapshot.generation || materialized.total_bytes !== snapshot.total_bytes || materialized.total_records !== snapshot.total_records
  ) fail("DURABLE_ROOT_MATERIALIZED_BINDING_MISMATCH", snapshot.snapshot_sha256);
}

function deriveRoot(input: SegmentedJsonlDurableRootPublishInputV1, current: SegmentedJsonlDurableRootV1 | null): SegmentedJsonlDurableRootV1 {
  const snapshot = verifySegmentedJsonlSnapshotAuthorityObjectV1(input.snapshot);
  const materialized = verifySegmentedJsonlMaterializedAuthorityObjectV1(input.materialized);
  assertMaterializedSnapshotBinding(snapshot, materialized);
  const previousAnchor = input.previousAnchor ? verifySegmentedJsonlCheckpointAnchorV1(input.previousAnchor) : null;
  const checkpoint = verifySegmentedJsonlCheckpointIncrementalV1(input.checkpoint, snapshot, previousAnchor);
  let witnessSha: string | null = null;
  let previousRootSha: string | null = null;

  if (current === null) {
    if (snapshot.generation !== 1 || previousAnchor || input.previousMaterialized || input.appendOnlyWitness || input.trustedAppendOnlyWitnessSha256) {
      fail("DURABLE_ROOT_GENESIS_INPUT_MISMATCH", String(snapshot.generation));
    }
  } else {
    if (snapshot.generation !== current.store_generation + 1 || !previousAnchor || !input.previousMaterialized || !input.appendOnlyWitness || !isHex64(input.trustedAppendOnlyWitnessSha256)) {
      fail("DURABLE_ROOT_SUCCESSOR_INPUT_MISMATCH", `${current.store_generation}:${snapshot.generation}`);
    }
    const previousMaterialized = verifySegmentedJsonlMaterializedAuthorityObjectV1(input.previousMaterialized);
    if (
      current.checkpoint_sha256 !== previousAnchor.checkpoint.checkpoint_sha256 ||
      current.snapshot_sha256 !== previousAnchor.snapshot.snapshot_sha256 ||
      current.materialized_authority_sha256 !== previousMaterialized.authority_sha256 ||
      current.materialized_sha256 !== previousMaterialized.materialized_sha256
    ) fail("DURABLE_ROOT_PREDECESSOR_BINDING_MISMATCH", current.root_sha256);
    const witness = verifySegmentedJsonlCheckpointAppendOnlyBoundedV1(
      checkpoint, snapshot, previousAnchor, previousMaterialized, materialized,
      input.appendOnlyWitness, current.materialized_authority_sha256, input.trustedAppendOnlyWitnessSha256,
    );
    witnessSha = witness.witness_sha256;
    previousRootSha = current.root_sha256;
  }

  const core = {
    v: 1 as const,
    format: VOID_SEGMENTED_JSONL_DURABLE_ROOT_V1 as typeof VOID_SEGMENTED_JSONL_DURABLE_ROOT_V1,
    store_generation: snapshot.generation,
    checkpoint_sha256: checkpoint.checkpoint_sha256,
    snapshot_sha256: snapshot.snapshot_sha256,
    manifest_sha256: snapshot.manifest_sha256,
    materialized_authority_sha256: materialized.authority_sha256,
    materialized_sha256: materialized.materialized_sha256,
    append_only_witness_sha256: witnessSha,
    previous_root_sha256: previousRootSha,
    total_bytes: snapshot.total_bytes,
    total_records: snapshot.total_records,
  };
  return verifyRootObject({ ...core, root_sha256: sha256(canonicalJson(core)) });
}

function buildSlotValue(index: 0 | 1, identity: SlotIdentityV1, peer: SlotIdentityV1 | null, root: SegmentedJsonlDurableRootV1): SegmentedJsonlDurableRootSlotV1 {
  const core = {
    v: 1 as const,
    format: VOID_SEGMENTED_JSONL_DURABLE_ROOT_SLOT_V1 as typeof VOID_SEGMENTED_JSONL_DURABLE_ROOT_SLOT_V1,
    slot_index: index,
    slot_dev: identity.dev,
    slot_ino: identity.ino,
    peer_slot_dev: peer?.dev ?? null,
    peer_slot_ino: peer?.ino ?? null,
    root,
  };
  return verifySlotObject({ ...core, slot_sha256: sha256(canonicalJson(core)) });
}

export function readSegmentedJsonlDurableRootV1(directoryInput: string): SegmentedJsonlDurableRootV1 | null {
  const authority = openDirectoryAuthority(directoryInput);
  try {
    const slots: [SlotReadV1, SlotReadV1] = [readSlot(authority, 0), readSlot(authority, 1)];
    const current = selectCurrent(slots);
    if (!current) {
      if (slots.some(slot => slot.exists)) fail("DURABLE_ROOT_NO_VALID_SLOT", authority.publicPath);
      return null;
    }
    const validCount = slots.filter(slot => slot.value !== null).length;
    // Never silently roll authority back to the surviving slot after a later
    // slot becomes torn or unverifiable. A single-slot register is accepted
    // only for the initial generation before the second slot has ever existed.
    if (
      validCount !== 2 &&
      (
        current.value!.root.store_generation !== 1 ||
        current.value!.peer_slot_dev !== null ||
        current.value!.peer_slot_ino !== null ||
        slots.some(slot => slot.exists && slot.value === null)
      )
    ) {
      fail(
        "DURABLE_ROOT_DEGRADED_SLOT_REQUIRES_RECOVERY",
        `${current.value!.root.store_generation}:${slots.map(slot => `${slot.index}:${slot.exists ? (slot.value ? "valid" : "invalid") : "missing"}`).join(",")}`,
      );
    }
    return current.value!.root;
  } finally { fs.closeSync(authority.fd); }
}

export function publishSegmentedJsonlDurableRootV1(
  directoryInput: string,
  input: SegmentedJsonlDurableRootPublishInputV1,
): SegmentedJsonlDurableRootV1 {
  const authority = openDirectoryAuthority(directoryInput);
  try {
    assertDirectoryAuthority(authority);
    const slots: [SlotReadV1, SlotReadV1] = [readSlot(authority, 0), readSlot(authority, 1)];
    const currentSlot = selectCurrent(slots);
    if (!currentSlot && slots.some(slot => slot.exists)) fail("DURABLE_ROOT_NO_VALID_SLOT", authority.publicPath);
    const currentRoot = currentSlot?.value?.root ?? null;
    const nextRoot = deriveRoot(input, currentRoot);
    const targetIndex = ((nextRoot.store_generation - 1) % 2) as 0 | 1;
    const target = slots[targetIndex];
    const peer = currentSlot?.identity ?? null;
    if (currentSlot && currentSlot.index === targetIndex) fail("DURABLE_ROOT_TARGET_IS_CURRENT", String(targetIndex));

    let fd = -1;
    let created = false;
    try {
      const stablePath = path.join(authority.stablePath, SLOT_NAMES[targetIndex]);
      if (!target.exists) {
        fd = fs.openSync(stablePath, fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_EXCL | ((fs.constants as any).O_NOFOLLOW || 0), 0o600);
        created = true;
      } else {
        if (!target.identity) fail("DURABLE_ROOT_TARGET_IDENTITY_UNAVAILABLE", target.path);
        if (!currentSlot?.value || currentSlot.value.peer_slot_dev === null || currentSlot.value.peer_slot_ino === null) {
          fail("DURABLE_ROOT_TARGET_NOT_EXPECTED", target.path);
        }
        if (currentSlot.value.peer_slot_dev !== target.identity.dev || currentSlot.value.peer_slot_ino !== target.identity.ino) {
          fail("DURABLE_ROOT_TARGET_IDENTITY_MISMATCH", `${target.path}:${target.identity.dev}:${target.identity.ino}`);
        }
        fd = fs.openSync(stablePath, fs.constants.O_RDWR | ((fs.constants as any).O_NOFOLLOW || 0));
      }
      const opened = fs.fstatSync(fd, { bigint: true } as any);
      const identity = slotIdentityFromStat(opened, target.path);
      const visibleIdentity = slotIdentityFromStat(fs.lstatSync(target.path, { bigint: true } as any), target.path);
      if (!sameIdentity(identity, visibleIdentity)) fail("DURABLE_ROOT_TARGET_PATH_MISMATCH", target.path);
      if (target.identity && !sameIdentity(identity, target.identity)) fail("DURABLE_ROOT_TARGET_IDENTITY_MISMATCH", target.path);
      const slotValue = buildSlotValue(targetIndex, identity, peer, nextRoot);
      const body = encodeSlot(slotValue);
      fs.ftruncateSync(fd, 0);
      let off = 0;
      while (off < body.length) {
        const n = fs.writeSync(fd, body, off, body.length - off, off);
        if (n <= 0) fail("DURABLE_ROOT_SLOT_SHORT_WRITE", `${target.path}:${off}`);
        off += n;
      }
      fs.fchmodSync(fd, 0o600);
      fs.fsyncSync(fd);
      const after = slotIdentityFromStat(fs.fstatSync(fd, { bigint: true } as any), target.path);
      const visibleAfter = slotIdentityFromStat(fs.lstatSync(target.path, { bigint: true } as any), target.path);
      if (!sameIdentity(identity, after) || !sameIdentity(after, visibleAfter)) fail("DURABLE_ROOT_TARGET_CHANGED_DURING_WRITE", target.path);
      fs.fsyncSync(authority.fd);
      assertDirectoryAuthority(authority);
      if (created) {
        const currentAfterCreate = slotIdentityFromStat(fs.lstatSync(target.path, { bigint: true } as any), target.path);
        if (!sameIdentity(identity, currentAfterCreate)) fail("DURABLE_ROOT_CREATED_SLOT_CHANGED", target.path);
      }
    } finally {
      if (fd >= 0) fs.closeSync(fd);
    }

    const finalSlots: [SlotReadV1, SlotReadV1] = [readSlot(authority, 0), readSlot(authority, 1)];
    const finalCurrent = selectCurrent(finalSlots);
    if (!finalCurrent?.value || finalCurrent.value.root.root_sha256 !== nextRoot.root_sha256) {
      fail("DURABLE_ROOT_PUBLICATION_NOT_CURRENT", nextRoot.root_sha256);
    }
    return finalCurrent.value.root;
  } finally { fs.closeSync(authority.fd); }
}
