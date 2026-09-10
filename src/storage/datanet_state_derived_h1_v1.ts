// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as net from "node:net";
import * as path from "node:path";

export const VOID_DATANET_STATE_DERIVED_H1_V1 = "VOID_DATANET_STATE_DERIVED_H1_V1";
export const VOID_DATANET_OBJECT_QUOTA_DOMAIN_V1 = "VOID-DATANET-OBJECT-QUOTA-V1\0";
export const VOID_DATANET_PAYLOAD_BYTES_V1 = 64 * 1024 * 1024;
export const VOID_DATANET_PAYLOAD_READ_BYTES_V1 = 64 * 1024;
export const VOID_DATANET_SLOT_NAMES_V1 = ["S0", "S1"] as const;

const CAPABILITY_DOMAIN = "VOID-DATANET-V25-ADMISSION-CAPABILITY-V1\0";
const ABSTRACT_SOCKET_PREFIX = "\0void-datanet-v25-";
const O_DIRECTORY = (fs.constants as any).O_DIRECTORY || 0;
const O_NOFOLLOW = (fs.constants as any).O_NOFOLLOW || 0;

export type DataNetQuotaTupleV1 = {
  chainId: bigint;
  genesisHash: string;
  commitmentType: number;
  payloadSha256: string;
};

export type DataNetRootIdentityV1 = {
  dev: string;
  ino: string;
};

export type DataNetLeafStateV1 = "missing" | "valid" | "invalid";
export type DataNetH1DecisionV1 = "AUTHORIZE_H1" | "DENY_H1" | "HOLD";

export type DataNetStateObservationV1 = {
  s0: DataNetLeafStateV1;
  s1: DataNetLeafStateV1;
  extraLeafCount: number;
};

export type DataNetStateReductionV1 = {
  decision: DataNetH1DecisionV1;
  reason:
    | "CANONICAL_S0_ONLY"
    | "CANONICAL_S0_S1_FULL"
    | "EXTRA_LEAF"
    | "S0_REQUIRED"
    | "S0_INVALID"
    | "S1_INVALID";
};

export type DataNetReadLedgerV1 = {
  calls: number;
  requested: number;
  completed: number;
};

export type DataNetLeafObservationV1 = {
  name: "S0" | "S1";
  state: DataNetLeafStateV1;
  identity: DataNetRootIdentityV1 | null;
  sha256: string | null;
  detail: string | null;
  ledger: DataNetReadLedgerV1;
};

export type DataNetStateClassificationV1 = {
  marker: typeof VOID_DATANET_STATE_DERIVED_H1_V1;
  rootIdentity: DataNetRootIdentityV1;
  key: string;
  payloadSha256: string;
  decision: DataNetH1DecisionV1;
  reason: string;
  namespace: string[];
  s0: DataNetLeafObservationV1;
  s1: DataNetLeafObservationV1;
  ledger: DataNetReadLedgerV1;
};

export type DataNetAdmissionCapabilityV1 = {
  readonly rootIdentity: DataNetRootIdentityV1;
  readonly key: string;
  readonly payloadSha256: string;
  readonly addressDigest: string;
  release(): Promise<void>;
};

type RootAuthorityV1 = {
  fd: number;
  publicPath: string;
  stablePath: string;
  identity: DataNetRootIdentityV1;
};

type InternalCapabilityV1 = {
  authority: RootAuthorityV1;
  tuple: DataNetQuotaTupleV1;
  server: net.Server;
  released: boolean;
};

const INTERNAL_CAPABILITIES = new WeakMap<DataNetAdmissionCapabilityV1, InternalCapabilityV1>();

function fail(code: string, detail: string): never {
  throw new Error(`${VOID_DATANET_STATE_DERIVED_H1_V1}:${code}:${detail}`);
}

function isHex64(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

function currentUid(): bigint {
  if (typeof process.getuid !== "function") fail("UID_UNAVAILABLE", "process.getuid");
  return BigInt(process.getuid());
}

function sameIdentity(a: DataNetRootIdentityV1, b: DataNetRootIdentityV1): boolean {
  return a.dev === b.dev && a.ino === b.ino;
}

function identityFromStat(st: any): DataNetRootIdentityV1 {
  return { dev: String(st.dev), ino: String(st.ino) };
}

function requireRootIdentity(value: DataNetRootIdentityV1): DataNetRootIdentityV1 {
  if (
    !value || typeof value !== "object" ||
    typeof value.dev !== "string" || !/^[0-9]+$/.test(value.dev) ||
    typeof value.ino !== "string" || !/^[0-9]+$/.test(value.ino)
  ) {
    fail("INVALID_ROOT_IDENTITY", JSON.stringify(value));
  }
  return { dev: value.dev, ino: value.ino };
}

function requireTuple(input: DataNetQuotaTupleV1): DataNetQuotaTupleV1 {
  if (typeof input?.chainId !== "bigint" || input.chainId < 0n || input.chainId > 0xffffffffffffffffn) {
    fail("INVALID_CHAIN_ID", String(input?.chainId));
  }
  if (!isHex64(input.genesisHash)) fail("INVALID_GENESIS_HASH", String(input.genesisHash));
  if (!Number.isSafeInteger(input.commitmentType) || input.commitmentType < 0 || input.commitmentType > 0xffff) {
    fail("INVALID_COMMITMENT_TYPE", String(input.commitmentType));
  }
  if (!isHex64(input.payloadSha256)) fail("INVALID_PAYLOAD_SHA256", String(input.payloadSha256));
  return {
    chainId: input.chainId,
    genesisHash: input.genesisHash,
    commitmentType: input.commitmentType,
    payloadSha256: input.payloadSha256,
  };
}

export function deriveDataNetObjectQuotaKeyV1(input: DataNetQuotaTupleV1): string {
  const tuple = requireTuple(input);
  const chainId = Buffer.alloc(8);
  chainId.writeBigUInt64BE(tuple.chainId);
  const commitmentType = Buffer.alloc(2);
  commitmentType.writeUInt16BE(tuple.commitmentType);
  return crypto.createHash("sha256")
    .update(Buffer.from(VOID_DATANET_OBJECT_QUOTA_DOMAIN_V1, "utf8"))
    .update(chainId)
    .update(Buffer.from(tuple.genesisHash, "hex"))
    .update(commitmentType)
    .update(Buffer.from(tuple.payloadSha256, "hex"))
    .digest("hex");
}

export function reduceDataNetStateDerivedH1V1(input: DataNetStateObservationV1): DataNetStateReductionV1 {
  if (!Number.isSafeInteger(input.extraLeafCount) || input.extraLeafCount < 0) {
    fail("INVALID_EXTRA_LEAF_COUNT", String(input.extraLeafCount));
  }
  if (input.extraLeafCount !== 0) return { decision: "HOLD", reason: "EXTRA_LEAF" };
  if (input.s0 === "missing") return { decision: "HOLD", reason: "S0_REQUIRED" };
  if (input.s0 === "invalid") return { decision: "HOLD", reason: "S0_INVALID" };
  if (input.s1 === "invalid") return { decision: "HOLD", reason: "S1_INVALID" };
  if (input.s1 === "missing") return { decision: "AUTHORIZE_H1", reason: "CANONICAL_S0_ONLY" };
  return { decision: "DENY_H1", reason: "CANONICAL_S0_S1_FULL" };
}

function assertPrivateRoot(st: any, label: string): void {
  const mode = Number(st.mode) & 0o777;
  if (
    !st.isDirectory() || BigInt(st.uid) !== currentUid() ||
    (mode & 0o022) !== 0 || (mode & 0o300) !== 0o300
  ) {
    fail("ROOT_AUTHORITY_MISMATCH", `${label}:uid=${String(st.uid)}:mode=${mode.toString(8)}`);
  }
}

function openRootAuthority(directoryInput: string, expected?: DataNetRootIdentityV1): RootAuthorityV1 {
  const publicPath = path.resolve(String(directoryInput || ""));
  if (!publicPath || publicPath === path.parse(publicPath).root) fail("INVALID_ROOT", publicPath || "empty");
  let fd = -1;
  try {
    fd = fs.openSync(publicPath, fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW);
    const opened = fs.fstatSync(fd, { bigint: true } as any);
    const visible = fs.lstatSync(publicPath, { bigint: true } as any);
    if (!opened.isDirectory() || !visible.isDirectory() || visible.isSymbolicLink()) {
      fail("ROOT_NOT_DIRECTORY", publicPath);
    }
    const identity = identityFromStat(opened);
    const visibleIdentity = identityFromStat(visible);
    if (!sameIdentity(identity, visibleIdentity)) fail("ROOT_PATH_MISMATCH", publicPath);
    assertPrivateRoot(opened, publicPath);
    assertPrivateRoot(visible, publicPath);
    if (expected && !sameIdentity(identity, requireRootIdentity(expected))) {
      fail("ROOT_IDENTITY_MISMATCH", `${identity.dev}:${identity.ino}`);
    }
    return { fd, publicPath, stablePath: `/proc/self/fd/${fd}`, identity };
  } catch (error) {
    if (fd >= 0) fs.closeSync(fd);
    throw error;
  }
}

function assertRootAuthority(authority: RootAuthorityV1): void {
  const opened = fs.fstatSync(authority.fd, { bigint: true } as any);
  const visible = fs.lstatSync(authority.publicPath, { bigint: true } as any);
  const openedIdentity = identityFromStat(opened);
  const visibleIdentity = identityFromStat(visible);
  if (
    !opened.isDirectory() || !visible.isDirectory() || visible.isSymbolicLink() ||
    !sameIdentity(openedIdentity, authority.identity) || !sameIdentity(openedIdentity, visibleIdentity)
  ) {
    fail("ROOT_CHANGED", authority.publicPath);
  }
  assertPrivateRoot(opened, authority.publicPath);
  assertPrivateRoot(visible, authority.publicPath);
}

export function bindDataNetRootIdentityV1(directoryInput: string): DataNetRootIdentityV1 {
  const authority = openRootAuthority(directoryInput);
  try {
    return { ...authority.identity };
  } finally {
    fs.closeSync(authority.fd);
  }
}

function capabilityAddressDigest(rootIdentity: DataNetRootIdentityV1, key: string): string {
  if (!isHex64(key)) fail("INVALID_QUOTA_KEY", key);
  return crypto.createHash("sha256")
    .update(CAPABILITY_DOMAIN)
    .update(rootIdentity.dev)
    .update(":")
    .update(rootIdentity.ino)
    .update(":")
    .update(key)
    .digest("hex");
}

export function deriveDataNetAdmissionCapabilityAddressDigestV1(
  rootIdentityInput: DataNetRootIdentityV1,
  key: string,
): string {
  return capabilityAddressDigest(requireRootIdentity(rootIdentityInput), key);
}

export async function acquireDataNetAdmissionCapabilityV1(
  directoryInput: string,
  expectedRootIdentityInput: DataNetRootIdentityV1,
  tupleInput: DataNetQuotaTupleV1,
): Promise<DataNetAdmissionCapabilityV1> {
  const expectedRootIdentity = requireRootIdentity(expectedRootIdentityInput);
  const tuple = requireTuple(tupleInput);
  const key = deriveDataNetObjectQuotaKeyV1(tuple);
  const authority = openRootAuthority(directoryInput, expectedRootIdentity);
  const addressDigest = capabilityAddressDigest(authority.identity, key);
  const socketPath = `${ABSTRACT_SOCKET_PREFIX}${addressDigest}`;
  const server = net.createServer(socket => socket.destroy());

  try {
    await new Promise<void>((resolve, reject) => {
      const onError = (error: NodeJS.ErrnoException): void => {
        server.off("listening", onListening);
        reject(error);
      };
      const onListening = (): void => {
        server.off("error", onError);
        resolve();
      };
      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(socketPath);
    });
  } catch (error: any) {
    try { if (server.listening) server.close(); } catch { /* fail path */ }
    fs.closeSync(authority.fd);
    if (error?.code === "EADDRINUSE") fail("CAPABILITY_BUSY", addressDigest);
    fail("CAPABILITY_ACQUIRE_FAILED", String(error?.code || error));
  }

  server.on("error", () => { /* classifier rechecks server.listening */ });
  server.unref();
  assertRootAuthority(authority);

  let handle!: DataNetAdmissionCapabilityV1;
  handle = Object.freeze({
    rootIdentity: Object.freeze({ ...authority.identity }),
    key,
    payloadSha256: tuple.payloadSha256,
    addressDigest,
    release: async (): Promise<void> => releaseDataNetAdmissionCapabilityV1(handle),
  });
  INTERNAL_CAPABILITIES.set(handle, { authority, tuple, server, released: false });
  return handle;
}

export async function releaseDataNetAdmissionCapabilityV1(capability: DataNetAdmissionCapabilityV1): Promise<void> {
  const internal = INTERNAL_CAPABILITIES.get(capability);
  if (!internal) fail("CAPABILITY_FOREIGN", "unknown-handle");
  if (internal.released) return;
  internal.released = true;
  await new Promise<void>((resolve, reject) => {
    if (!internal.server.listening) {
      resolve();
      return;
    }
    internal.server.close(error => error ? reject(error) : resolve());
  });
  fs.closeSync(internal.authority.fd);
}

function requireHeldCapability(capability: DataNetAdmissionCapabilityV1): InternalCapabilityV1 {
  const internal = INTERNAL_CAPABILITIES.get(capability);
  if (!internal) fail("CAPABILITY_FOREIGN", "unknown-handle");
  if (internal.released || !internal.server.listening) fail("CAPABILITY_NOT_HELD", capability.addressDigest);
  assertRootAuthority(internal.authority);
  if (
    capability.key !== deriveDataNetObjectQuotaKeyV1(internal.tuple) ||
    capability.payloadSha256 !== internal.tuple.payloadSha256 ||
    !sameIdentity(capability.rootIdentity, internal.authority.identity)
  ) {
    fail("CAPABILITY_BINDING_MISMATCH", capability.addressDigest);
  }
  return internal;
}

function zeroLedger(): DataNetReadLedgerV1 {
  return { calls: 0, requested: 0, completed: 0 };
}

function addLedger(a: DataNetReadLedgerV1, b: DataNetReadLedgerV1): DataNetReadLedgerV1 {
  return {
    calls: a.calls + b.calls,
    requested: a.requested + b.requested,
    completed: a.completed + b.completed,
  };
}

function inspectLeaf(
  authority: RootAuthorityV1,
  name: "S0" | "S1",
  expectedSha256: string,
): DataNetLeafObservationV1 {
  const stablePath = path.join(authority.stablePath, name);
  let fd = -1;
  try {
    try {
      fd = fs.openSync(stablePath, fs.constants.O_RDONLY | O_NOFOLLOW);
    } catch (error: any) {
      if (error?.code === "ENOENT") {
        return { name, state: "missing", identity: null, sha256: null, detail: null, ledger: zeroLedger() };
      }
      return { name, state: "invalid", identity: null, sha256: null, detail: String(error?.code || "open"), ledger: zeroLedger() };
    }

    const before = fs.fstatSync(fd, { bigint: true } as any);
    const identity = identityFromStat(before);
    const mode = Number(before.mode) & 0o777;
    if (
      !before.isFile() || BigInt(before.uid) !== currentUid() || mode !== 0o600 ||
      Number(before.nlink) !== 1 || Number(before.size) !== VOID_DATANET_PAYLOAD_BYTES_V1
    ) {
      return {
        name,
        state: "invalid",
        identity,
        sha256: null,
        detail: `authority:uid=${String(before.uid)}:mode=${mode.toString(8)}:nlink=${String(before.nlink)}:size=${String(before.size)}`,
        ledger: zeroLedger(),
      };
    }

    const visibleBefore = fs.lstatSync(path.join(authority.publicPath, name), { bigint: true } as any);
    if (visibleBefore.isSymbolicLink() || !sameIdentity(identity, identityFromStat(visibleBefore))) {
      return { name, state: "invalid", identity, sha256: null, detail: "visible-identity", ledger: zeroLedger() };
    }

    const digest = crypto.createHash("sha256");
    const block = Buffer.alloc(VOID_DATANET_PAYLOAD_READ_BYTES_V1);
    const ledger = zeroLedger();
    for (let offset = 0; offset < VOID_DATANET_PAYLOAD_BYTES_V1; offset += block.length) {
      const requested = Math.min(block.length, VOID_DATANET_PAYLOAD_BYTES_V1 - offset);
      const completed = fs.readSync(fd, block, 0, requested, offset);
      ledger.calls += 1;
      ledger.requested += requested;
      ledger.completed += completed;
      if (completed !== requested) {
        return { name, state: "invalid", identity, sha256: null, detail: `short-read:${offset}:${requested}:${completed}`, ledger };
      }
      digest.update(block.subarray(0, completed));
    }
    const eofProbe = Buffer.alloc(1);
    const eofCompleted = fs.readSync(fd, eofProbe, 0, 1, VOID_DATANET_PAYLOAD_BYTES_V1);
    ledger.calls += 1;
    ledger.requested += 1;
    ledger.completed += eofCompleted;
    if (eofCompleted !== 0) {
      return { name, state: "invalid", identity, sha256: null, detail: `eof:${eofCompleted}`, ledger };
    }

    const after = fs.fstatSync(fd, { bigint: true } as any);
    const visibleAfter = fs.lstatSync(path.join(authority.publicPath, name), { bigint: true } as any);
    if (
      !sameIdentity(identity, identityFromStat(after)) ||
      visibleAfter.isSymbolicLink() || !sameIdentity(identity, identityFromStat(visibleAfter)) ||
      Number(after.size) !== VOID_DATANET_PAYLOAD_BYTES_V1
    ) {
      return { name, state: "invalid", identity, sha256: null, detail: "changed-during-read", ledger };
    }
    const observedSha256 = digest.digest("hex");
    if (observedSha256 !== expectedSha256) {
      return { name, state: "invalid", identity, sha256: observedSha256, detail: "sha256", ledger };
    }
    return { name, state: "valid", identity, sha256: observedSha256, detail: null, ledger };
  } catch (error: any) {
    return { name, state: "invalid", identity: null, sha256: null, detail: String(error?.code || error), ledger: zeroLedger() };
  } finally {
    if (fd >= 0) fs.closeSync(fd);
  }
}

export function classifyDataNetStateDerivedH1V1(capability: DataNetAdmissionCapabilityV1): DataNetStateClassificationV1 {
  const internal = requireHeldCapability(capability);
  const authority = internal.authority;
  assertRootAuthority(authority);
  const namespaceBefore = fs.readdirSync(authority.stablePath).sort();
  const extraNames = namespaceBefore.filter(name => !VOID_DATANET_SLOT_NAMES_V1.includes(name as "S0" | "S1"));

  let s0: DataNetLeafObservationV1;
  let s1: DataNetLeafObservationV1;
  if (extraNames.length !== 0) {
    s0 = { name: "S0", state: namespaceBefore.includes("S0") ? "invalid" : "missing", identity: null, sha256: null, detail: "classification-skipped-extra-leaf", ledger: zeroLedger() };
    s1 = { name: "S1", state: namespaceBefore.includes("S1") ? "invalid" : "missing", identity: null, sha256: null, detail: "classification-skipped-extra-leaf", ledger: zeroLedger() };
  } else {
    s0 = inspectLeaf(authority, "S0", internal.tuple.payloadSha256);
    s1 = inspectLeaf(authority, "S1", internal.tuple.payloadSha256);
  }

  assertRootAuthority(authority);
  const namespaceAfter = fs.readdirSync(authority.stablePath).sort();
  if (namespaceBefore.length !== namespaceAfter.length || namespaceBefore.some((name, index) => name !== namespaceAfter[index])) {
    return {
      marker: VOID_DATANET_STATE_DERIVED_H1_V1,
      rootIdentity: { ...authority.identity },
      key: capability.key,
      payloadSha256: internal.tuple.payloadSha256,
      decision: "HOLD",
      reason: "NAMESPACE_CHANGED",
      namespace: namespaceAfter,
      s0,
      s1,
      ledger: addLedger(s0.ledger, s1.ledger),
    };
  }

  const reduction = reduceDataNetStateDerivedH1V1({
    s0: s0.state,
    s1: s1.state,
    extraLeafCount: extraNames.length,
  });
  return {
    marker: VOID_DATANET_STATE_DERIVED_H1_V1,
    rootIdentity: { ...authority.identity },
    key: capability.key,
    payloadSha256: internal.tuple.payloadSha256,
    decision: reduction.decision,
    reason: reduction.reason,
    namespace: namespaceAfter,
    s0,
    s1,
    ledger: addLedger(s0.ledger, s1.ledger),
  };
}
