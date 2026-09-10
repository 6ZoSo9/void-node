// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  canonicalDatanetRootIdentityV1,
  classifyDatanetH1StateV1,
  datanetReplicaLeafNameV1,
  type DatanetH1ClassificationV1,
  type DatanetReplicaSlotObservationV1,
} from "./datanet_state_derived_h1_v1.js";

export const VOID_DATANET_H1_FILESYSTEM_CLASSIFIER_V1 = "VOID_DATANET_H1_FILESYSTEM_CLASSIFIER_V1";
export const VOID_DATANET_H1_READ_BLOCK_BYTES_V1 = 65_536;

const HEX64 = /^[0-9a-f]{64}$/;
const ROOT_IDENTITY = /^(0|[1-9][0-9]*):(0|[1-9][0-9]*)$/;

type RootAuthorityV1 = {
  fd: number;
  stablePath: string;
  dev: string;
  ino: string;
  identity: string;
};

type ReadLedgerV1 = {
  calls: number;
  requested_bytes: number;
  returned_bytes: number;
};

type SlotInspectionV1 = {
  observation: DatanetReplicaSlotObservationV1;
  read_ledger: ReadLedgerV1;
};

export type DatanetH1FilesystemClassifierInputV1 = {
  store_root_fd: number;
  expected_root_identity: string;
  quota_key: string;
  expected_sha256: string;
  expected_bytes: number;
  mutation_custody_retired: boolean;
};

export type DatanetH1FilesystemClassificationV1 = {
  v: 1;
  format: typeof VOID_DATANET_H1_FILESYSTEM_CLASSIFIER_V1;
  root_identity: string;
  quota_key: string;
  s0_name: string;
  s1_name: string;
  extra_leaf_count: number;
  s0_read_ledger: ReadLedgerV1;
  s1_read_ledger: ReadLedgerV1;
  classification: DatanetH1ClassificationV1;
};

function fail(code: string, detail: string): never {
  throw new Error(`${VOID_DATANET_H1_FILESYSTEM_CLASSIFIER_V1}:${code}:${detail}`);
}

function exactKeys(value: object, expected: readonly string[], code: string): void {
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

function requireHex64(value: unknown, code: string): string {
  if (typeof value !== "string" || !HEX64.test(value)) fail(code, String(value));
  return value;
}

function requireRootIdentity(value: unknown): string {
  if (typeof value !== "string" || !ROOT_IDENTITY.test(value)) fail("EXPECTED_ROOT_IDENTITY_INVALID", String(value));
  return value;
}

function requireExpectedBytes(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) fail("EXPECTED_BYTES_INVALID", String(value));
  return Number(value);
}

function requireFd(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) fail("STORE_ROOT_FD_INVALID", String(value));
  return Number(value);
}

function directoryFlags(): number {
  return fs.constants.O_RDONLY | ((fs.constants as any).O_DIRECTORY || 0);
}

function leafFlags(): number {
  return fs.constants.O_RDONLY | ((fs.constants as any).O_NOFOLLOW || 0);
}

function statIdentity(st: any): { dev: string; ino: string } {
  return { dev: String(st.dev), ino: String(st.ino) };
}

function sameIdentity(a: { dev: string; ino: string }, b: { dev: string; ino: string }): boolean {
  return a.dev === b.dev && a.ino === b.ino;
}

function statFingerprint(st: any): string {
  return [
    String(st.dev), String(st.ino), String(st.mode), String(st.nlink), String(st.uid), String(st.gid),
    String(st.size), String(st.mtimeNs), String(st.ctimeNs),
  ].join(":");
}

function openRootAuthority(rootFdInput: number, expectedRootIdentity: string): RootAuthorityV1 {
  let source: any;
  try {
    source = fs.fstatSync(rootFdInput, { bigint: true } as any);
  } catch (error: any) {
    fail("STORE_ROOT_FD_UNAVAILABLE", String(error?.code || "fstat"));
  }
  if (!source.isDirectory()) fail("STORE_ROOT_NOT_DIRECTORY", String(rootFdInput));
  const sourceIdentity = statIdentity(source);
  const sourceCanonical = canonicalDatanetRootIdentityV1(sourceIdentity.dev, sourceIdentity.ino);
  if (sourceCanonical !== expectedRootIdentity) {
    fail("STORE_ROOT_IDENTITY_MISMATCH", `${expectedRootIdentity}:${sourceCanonical}`);
  }

  let fd = -1;
  try {
    fd = fs.openSync(`/proc/self/fd/${rootFdInput}`, directoryFlags());
    const opened = fs.fstatSync(fd, { bigint: true } as any);
    if (!opened.isDirectory()) fail("STORE_ROOT_NOT_DIRECTORY", String(rootFdInput));
    const openedIdentity = statIdentity(opened);
    if (!sameIdentity(sourceIdentity, openedIdentity)) {
      fail("STORE_ROOT_DUPLICATE_MISMATCH", `${sourceCanonical}:${canonicalDatanetRootIdentityV1(openedIdentity.dev, openedIdentity.ino)}`);
    }
    return {
      fd,
      stablePath: `/proc/self/fd/${fd}`,
      dev: openedIdentity.dev,
      ino: openedIdentity.ino,
      identity: sourceCanonical,
    };
  } catch (error) {
    if (fd >= 0) fs.closeSync(fd);
    throw error;
  }
}

function assertRootAuthority(root: RootAuthorityV1): void {
  const opened = fs.fstatSync(root.fd, { bigint: true } as any);
  const openedIdentity = statIdentity(opened);
  if (
    !opened.isDirectory() ||
    openedIdentity.dev !== root.dev || openedIdentity.ino !== root.ino
  ) {
    fail("STORE_ROOT_CHANGED", root.identity);
  }
}

function inventory(root: RootAuthorityV1): string[] {
  assertRootAuthority(root);
  return fs.readdirSync(root.stablePath, { encoding: "utf8" }).slice().sort();
}

function zeroLedger(): ReadLedgerV1 {
  return { calls: 0, requested_bytes: 0, returned_bytes: 0 };
}

function foreign(detail: string, ledger = zeroLedger()): SlotInspectionV1 {
  return { observation: { status: "foreign", detail }, read_ledger: ledger };
}

function invalid(detail: string, ledger = zeroLedger()): SlotInspectionV1 {
  return { observation: { status: "invalid", detail }, read_ledger: ledger };
}

function inspectSlot(
  root: RootAuthorityV1,
  name: string,
  expectedBytes: number,
  expectedSha256: string,
): SlotInspectionV1 {
  assertRootAuthority(root);
  const stablePath = path.join(root.stablePath, name);
  let fd = -1;
  try {
    try {
      fd = fs.openSync(stablePath, leafFlags());
    } catch (error: any) {
      if (error?.code === "ENOENT") return { observation: { status: "missing" }, read_ledger: zeroLedger() };
      return foreign(`open:${String(error?.code || "error")}`);
    }

    const before = fs.fstatSync(fd, { bigint: true } as any);
    let visible: any;
    try {
      visible = fs.lstatSync(stablePath, { bigint: true } as any);
    } catch (error: any) {
      return invalid(`namespace:${String(error?.code || "error")}`);
    }
    if (!before.isFile() || !visible.isFile() || visible.isSymbolicLink()) return foreign("nonregular");
    const beforeIdentity = statIdentity(before);
    const visibleIdentity = statIdentity(visible);
    if (!sameIdentity(beforeIdentity, visibleIdentity)) return invalid("identity-before");
    if (BigInt(before.uid) !== currentUid()) return foreign("uid");
    if (Number(before.nlink) !== 1) return foreign(`nlink:${String(before.nlink)}`);
    if ((Number(before.mode) & 0o022) !== 0) return foreign("writable-by-nonowner");
    if (Number(before.size) !== expectedBytes) return foreign(`length:${String(before.size)}`);

    const ledger = zeroLedger();
    const hash = createHash("sha256");
    const buffer = Buffer.alloc(VOID_DATANET_H1_READ_BLOCK_BYTES_V1);
    for (let offset = 0; offset < expectedBytes; offset += VOID_DATANET_H1_READ_BLOCK_BYTES_V1) {
      const requested = Math.min(VOID_DATANET_H1_READ_BLOCK_BYTES_V1, expectedBytes - offset);
      let returned: number;
      try {
        returned = fs.readSync(fd, buffer, 0, requested, offset);
      } catch (error: any) {
        return invalid(`read:${String(error?.code || "error")}`, ledger);
      }
      ledger.calls += 1;
      ledger.requested_bytes += requested;
      ledger.returned_bytes += returned;
      if (returned !== requested) return invalid(`short-read:${offset}:${requested}:${returned}`, ledger);
      hash.update(buffer.subarray(0, returned));
    }

    const eof = Buffer.alloc(1);
    let eofReturned: number;
    try {
      eofReturned = fs.readSync(fd, eof, 0, 1, expectedBytes);
    } catch (error: any) {
      return invalid(`eof-read:${String(error?.code || "error")}`, ledger);
    }
    ledger.calls += 1;
    ledger.requested_bytes += 1;
    ledger.returned_bytes += eofReturned;
    if (eofReturned !== 0) return invalid(`eof:${eofReturned}`, ledger);

    const after = fs.fstatSync(fd, { bigint: true } as any);
    let visibleAfter: any;
    try {
      visibleAfter = fs.lstatSync(stablePath, { bigint: true } as any);
    } catch (error: any) {
      return invalid(`namespace-after:${String(error?.code || "error")}`, ledger);
    }
    if (
      !after.isFile() || !visibleAfter.isFile() || visibleAfter.isSymbolicLink() ||
      statFingerprint(after) !== statFingerprint(before) ||
      statFingerprint(visibleAfter) !== statFingerprint(before)
    ) {
      return invalid("metadata-changed", ledger);
    }

    const digest = hash.digest("hex");
    if (digest !== expectedSha256) return foreign(`sha256:${digest}`, ledger);
    return {
      observation: {
        status: "valid",
        dev: beforeIdentity.dev,
        ino: beforeIdentity.ino,
        bytes: expectedBytes,
        sha256: digest,
      },
      read_ledger: ledger,
    };
  } finally {
    if (fd >= 0) fs.closeSync(fd);
  }
}

export function classifyDatanetH1FilesystemV1(
  input: DatanetH1FilesystemClassifierInputV1,
): DatanetH1FilesystemClassificationV1 {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("INPUT_INVALID", "not-object");
  exactKeys(input, [
    "store_root_fd",
    "expected_root_identity",
    "quota_key",
    "expected_sha256",
    "expected_bytes",
    "mutation_custody_retired",
  ], "INPUT_KEYS_INVALID");
  const rootFd = requireFd(input.store_root_fd);
  const expectedRootIdentity = requireRootIdentity(input.expected_root_identity);
  const quotaKey = requireHex64(input.quota_key, "QUOTA_KEY_INVALID");
  const expectedSha256 = requireHex64(input.expected_sha256, "EXPECTED_SHA256_INVALID");
  const expectedBytes = requireExpectedBytes(input.expected_bytes);
  if (typeof input.mutation_custody_retired !== "boolean") {
    fail("MUTATION_CUSTODY_STATE_INVALID", String(input.mutation_custody_retired));
  }
  const s0Name = datanetReplicaLeafNameV1(quotaKey, 0);
  const s1Name = datanetReplicaLeafNameV1(quotaKey, 1);
  const prefix = `datanet-${quotaKey}-`;

  const root = openRootAuthority(rootFd, expectedRootIdentity);
  try {
    const beforeNames = inventory(root);
    const colliding = beforeNames.filter(name => name.startsWith(prefix) && name !== s0Name && name !== s1Name);
    const s0 = inspectSlot(root, s0Name, expectedBytes, expectedSha256);
    const s1 = inspectSlot(root, s1Name, expectedBytes, expectedSha256);
    const afterNames = inventory(root);
    if (JSON.stringify(afterNames) !== JSON.stringify(beforeNames)) {
      fail("NAMESPACE_CHANGED_DURING_CLASSIFICATION", root.identity);
    }
    assertRootAuthority(root);

    const classification = classifyDatanetH1StateV1({
      v: 1,
      root_identity: root.identity,
      quota_key: quotaKey,
      expected_sha256: expectedSha256,
      expected_bytes: expectedBytes,
      mutation_custody_retired: input.mutation_custody_retired,
      extra_leaf_count: colliding.length,
      s0: s0.observation,
      s1: s1.observation,
    });

    return Object.freeze({
      v: 1,
      format: VOID_DATANET_H1_FILESYSTEM_CLASSIFIER_V1,
      root_identity: root.identity,
      quota_key: quotaKey,
      s0_name: s0Name,
      s1_name: s1Name,
      extra_leaf_count: colliding.length,
      s0_read_ledger: Object.freeze({ ...s0.read_ledger }),
      s1_read_ledger: Object.freeze({ ...s1.read_ledger }),
      classification,
    });
  } finally {
    fs.closeSync(root.fd);
  }
}
