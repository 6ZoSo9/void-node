// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import assert from "node:assert/strict";
import * as childProcess from "node:child_process";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import fsMutable from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import * as os from "node:os";
import * as path from "node:path";

import {
  buildSegmentedJsonlV1FromFile,
  reconstructSegmentedJsonlV1ToFile,
} from "../src/storage/segmented_jsonl_v1.js";
import {
  deriveSegmentedJsonlSnapshotAuthorityV1,
  deriveSegmentedJsonlCheckpointV1,
  type SegmentedJsonlCheckpointAnchorV1,
} from "../src/storage/segmented_jsonl_snapshot_authority_v1.js";
import {
  deriveSegmentedJsonlMaterializedAuthorityV1,
  type SegmentedJsonlMaterializedAuthorityV1,
} from "../src/storage/segmented_jsonl_materialized_authority_v1.js";
import {
  verifySegmentedJsonlCheckpointAppendOnlyAtUseV1,
  type SegmentedJsonlAppendOnlyCheckpointWitnessV1,
} from "../src/storage/segmented_jsonl_checkpoint_materialized_authority_v1.js";
import {
  publishSegmentedJsonlDurableRootV1,
  readSegmentedJsonlDurableRootV1,
  verifySegmentedJsonlDurableRootMaterializedAtUseV1,
  type SegmentedJsonlDurableRootSlotV1,
  type SegmentedJsonlDurableRootV1,
} from "../src/storage/segmented_jsonl_durable_root_v1.js";

const namespacedSelfStatPath = `/proc/${process.pid}/stat`;
try {
  fs.readFileSync(namespacedSelfStatPath, "utf8");
} catch (error: any) {
  if (error?.code !== "ENOENT") throw error;
  fs.readFileSync("/proc/self/stat", "utf8");
  const originalReadFileSync = fsMutable.readFileSync;
  fsMutable.readFileSync = ((file: fs.PathOrFileDescriptor, options?: any) =>
    typeof file === "string" && file === namespacedSelfStatPath
      ? originalReadFileSync("/proc/self/stat", options)
      : originalReadFileSync(file, options)
  ) as typeof fsMutable.readFileSync;
  syncBuiltinESMExports();
}

function expectFailure(fn: () => unknown, fragment: string): void {
  let seen = "";
  try { fn(); } catch (error) { seen = error instanceof Error ? error.message : String(error); }
  assert.ok(seen.includes(fragment), `expected ${fragment}, got ${seen}`);
}

function sha256(data: Buffer | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(value);
}

function sourceBytes(records: number): Buffer {
  return Buffer.from(
    Array.from({ length: records }, (_, index) => JSON.stringify({ v: 1, index, value: `row-${index}` }) + "\n").join(""),
    "utf8",
  );
}

function processBootId(): string {
  const bootId = fs.readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim().toLowerCase();
  assert.match(bootId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  return bootId;
}

function processStartTicks(pid: number): string {
  const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
  const close = stat.lastIndexOf(")");
  assert.ok(close >= 0);
  const fields = stat.slice(close + 1).trim().split(/\s+/);
  assert.match(fields[19] || "", /^[0-9]+$/);
  return fields[19];
}

function writePublishOwner(lockDir: string, pid: number, startTicks: string, token: string, bootId = processBootId()): void {
  const ownerPath = path.join(lockDir, "owner.v1.json");
  const witnessPath = path.join(lockDir, `owner-witness-${token}.v1`);
  fs.writeFileSync(
    ownerPath,
    JSON.stringify({ v: 1, boot_id: bootId, pid, start_ticks: startTicks, token, state: "held" }) + "\n",
    { flag: "wx", mode: 0o600 },
  );
  fs.linkSync(ownerPath, witnessPath);
  fsyncDirectory(lockDir);
  const owner = fs.statSync(ownerPath, { bigint: true } as any);
  const witness = fs.statSync(witnessPath, { bigint: true } as any);
  assert.equal(owner.dev, witness.dev);
  assert.equal(owner.ino, witness.ino);
  assert.equal(owner.nlink, 2n);
}

function ownerWitnessPathForProof(lockDir: string, token: string): string {
  return path.join(lockDir, `owner-witness-${token}.v1`);
}

function removePublishOwnerForProof(lockDir: string, token: string): void {
  fs.unlinkSync(path.join(lockDir, "owner.v1.json"));
  fs.unlinkSync(ownerWitnessPathForProof(lockDir, token));
  fsyncDirectory(lockDir);
}

function writeOwnerReleaseForProof(lockDir: string, token: string): string {
  const owner = fs.statSync(path.join(lockDir, "owner.v1.json"), { bigint: true } as any);
  const witness = fs.statSync(ownerWitnessPathForProof(lockDir, token), { bigint: true } as any);
  assert.equal(owner.dev, witness.dev);
  assert.equal(owner.ino, witness.ino);
  const releasePath = path.join(lockDir, `owner-release-${token}.v1`);
  fs.writeFileSync(
    releasePath,
    JSON.stringify({
      v: 1,
      owner_token: token,
      owner_dev: String(owner.dev),
      owner_ino: String(owner.ino),
      witness_dev: String(witness.dev),
      witness_ino: String(witness.ino),
    }) + "\n",
    { flag: "wx", mode: 0o600 },
  );
  fsyncDirectory(lockDir);
  return releasePath;
}

function writeReclaimWinnerForProof(
  lockDir: string,
  staleToken: string,
  claimantToken: string,
  claimantIdentity: { bootId: string; pid: number; startTicks: string } | null = null,
): void {
  const owner = fs.statSync(path.join(lockDir, "owner.v1.json"), { bigint: true } as any);
  const ownerPath = path.join(lockDir, "owner.v1.json");
  const witnessPath = ownerWitnessPathForProof(lockDir, staleToken);
  const witness = fs.statSync(witnessPath, { bigint: true } as any);
  const ownerSha256 = sha256(fs.readFileSync(ownerPath));
  const witnessSha256 = sha256(fs.readFileSync(witnessPath));
  assert.equal(owner.dev, witness.dev);
  assert.equal(owner.ino, witness.ino);
  fs.writeFileSync(
    path.join(lockDir, "reclaim-winner.v1"),
    JSON.stringify({
      v: 1,
      claimant_boot_id: claimantIdentity?.bootId || processBootId(),
      claimant_pid: claimantIdentity?.pid || process.pid,
      claimant_start_ticks: claimantIdentity?.startTicks || processStartTicks(process.pid),
      claimant_token: claimantToken,
      stale_owner_token: staleToken,
      stale_owner_dev: String(owner.dev),
      stale_owner_ino: String(owner.ino),
      stale_owner_sha256: ownerSha256,
      stale_witness_dev: String(witness.dev),
      stale_witness_ino: String(witness.ino),
      stale_witness_sha256: witnessSha256,
    }) + "\n",
    { flag: "wx", mode: 0o600 },
  );
  fsyncDirectory(lockDir);
}

function rewriteReclaimWinnerForProof(lockDir: string, staleToken: string, claimantToken: string): void {
  const winnerPath = path.join(lockDir, "reclaim-winner.v1");
  const owner = fs.statSync(path.join(lockDir, "owner.v1.json"), { bigint: true } as any);
  const ownerPath = path.join(lockDir, "owner.v1.json");
  const witnessPath = ownerWitnessPathForProof(lockDir, staleToken);
  const witness = fs.statSync(witnessPath, { bigint: true } as any);
  const ownerSha256 = sha256(fs.readFileSync(ownerPath));
  const witnessSha256 = sha256(fs.readFileSync(witnessPath));
  assert.equal(owner.dev, witness.dev);
  assert.equal(owner.ino, witness.ino);
  const body = Buffer.from(JSON.stringify({
    v: 1,
    claimant_boot_id: processBootId(),
    claimant_pid: process.pid,
    claimant_start_ticks: processStartTicks(process.pid),
    claimant_token: claimantToken,
    stale_owner_token: staleToken,
    stale_owner_dev: String(owner.dev),
    stale_owner_ino: String(owner.ino),
    stale_owner_sha256: ownerSha256,
    stale_witness_dev: String(witness.dev),
    stale_witness_ino: String(witness.ino),
    stale_witness_sha256: witnessSha256,
  }) + "\n", "utf8");
  const noFollow = (fs.constants as typeof fs.constants & { O_NOFOLLOW?: number }).O_NOFOLLOW || 0;
  const fd = fs.openSync(winnerPath, fs.constants.O_WRONLY | fs.constants.O_TRUNC | noFollow);
  try {
    let offset = 0;
    while (offset < body.length) {
      const written = fs.writeSync(fd, body, offset, body.length - offset, offset);
      assert.ok(written > 0);
      offset += written;
    }
    fs.fsyncSync(fd);
  } finally { fs.closeSync(fd); }
  fsyncDirectory(lockDir);
}

function readReclaimWinnerChainForProof(lockDir: string): Array<{
  name: string;
  path: string;
  bytes: Buffer;
  sha256: string;
  value: {
    claimant_pid: number;
    claimant_start_ticks: string;
    claimant_token: string;
    stale_owner_token: string;
  };
}> {
  const chain: Array<{
    name: string;
    path: string;
    bytes: Buffer;
    sha256: string;
    value: {
      claimant_pid: number;
      claimant_start_ticks: string;
      claimant_token: string;
      stale_owner_token: string;
    };
  }> = [];
  let name = "reclaim-winner.v1";
  for (let depth = 0; depth < 64; depth += 1) {
    const winnerPath = path.join(lockDir, name);
    if (!fs.existsSync(winnerPath)) return chain;
    const bytes = fs.readFileSync(winnerPath);
    const digest = sha256(bytes);
    chain.push({
      name,
      path: winnerPath,
      bytes,
      sha256: digest,
      value: JSON.parse(bytes.toString("utf8")),
    });
    name = "reclaim-winner-successor-" + digest + ".v1";
  }
  throw new Error("proof reclaim winner chain exceeds bound");
}

function reclaimWinnerRetirementPathForProof(lockDir: string, terminalSha256: string): string {
  assert.match(terminalSha256, /^[0-9a-f]{64}$/);
  return path.join(lockDir, "reclaim-winner-retired-" + terminalSha256 + ".v1");
}

function removeReclaimEvidenceForProof(lockDir: string): void {
  for (const name of fs.readdirSync(lockDir)) {
    if (
      name === "reclaim-winner.v1" ||
      /^reclaim-winner-successor-[0-9a-f]{64}\.v1$/.test(name) ||
      /^reclaim-winner-retired-[0-9a-f]{64}\.v1$/.test(name)
    ) fs.unlinkSync(path.join(lockDir, name));
  }
  fsyncDirectory(lockDir);
}

function fsyncDirectory(directory: string): void {
  const fd = fs.openSync(directory, "r");
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}

function proveAnonymousStageCrashLeavesNoName(lockDir: string): void {
  const before = fs.readdirSync(lockDir).sort();
  const fd = fs.openSync(lockDir, fs.constants.O_RDWR | 0o20200000, 0o600);
  try {
    fs.writeSync(fd, Buffer.from("anonymous-stage-crash", "utf8"));
    fs.fsyncSync(fd);
  } finally { fs.closeSync(fd); }
  assert.deepEqual(fs.readdirSync(lockDir).sort(), before, "anonymous prepublication crash must leave zero persistent stage names");
}

function proveAnonymousReclaimRaceHasOnePersistentWinner(lockDir: string): void {
  const directoryFd = fs.openSync(lockDir, "r");
  const winnerName = "reclaim-winner.v1";
  let successfulLinks = 0;
  try {
    for (let contender = 0; contender < 100; contender += 1) {
      const fd = fs.openSync(lockDir, fs.constants.O_RDWR | 0o20200000, 0o600);
      try {
        const body = Buffer.from(`contender-${contender}\n`, "utf8");
        fs.writeSync(fd, body);
        fs.fsyncSync(fd);
        const linked = childProcess.spawnSync(
          "/usr/bin/ln",
          ["-L", "-T", "--", "/proc/self/fd/3", `/proc/self/fd/4/${winnerName}`],
          {
            cwd: "/",
            env: { PATH: "/usr/bin:/bin", LANG: "C", LC_ALL: "C" },
            stdio: ["ignore", "ignore", "pipe", fd, directoryFd],
          },
        );
        if (linked.status === 0) successfulLinks += 1;
      } finally { fs.closeSync(fd); }
    }
    fsyncDirectory(lockDir);
    assert.equal(successfulLinks, 1, "exactly one anonymous reclaimer may publish the fixed winner name");
    assert.deepEqual(fs.readdirSync(lockDir), [winnerName], "losing reclaimers must leave zero persistent claim names");
    assert.equal(fs.readFileSync(path.join(lockDir, winnerName), "utf8"), "contender-0\n");
    fs.unlinkSync(path.join(lockDir, winnerName));
    fsyncDirectory(lockDir);
  } finally { fs.closeSync(directoryFd); }
}

function encodeSlotForProof(slot: SegmentedJsonlDurableRootSlotV1): Buffer {
  const json = Buffer.from(canonicalJson(slot), "utf8");
  assert.ok(json.length + 1 <= 8192);
  const body = Buffer.alloc(8192, 0x20);
  json.copy(body, 0);
  body[json.length] = 0x0a;
  return body;
}

function slotForProof(
  index: 0 | 1,
  identity: { dev: string; ino: string },
  peer: { dev: string; ino: string } | null,
  root: SegmentedJsonlDurableRootV1,
): SegmentedJsonlDurableRootSlotV1 {
  const core = {
    v: 1 as const,
    format: "VOID_SEGMENTED_JSONL_DURABLE_ROOT_SLOT_V1" as const,
    slot_index: index,
    slot_dev: identity.dev,
    slot_ino: identity.ino,
    peer_slot_dev: peer?.dev ?? null,
    peer_slot_ino: peer?.ino ?? null,
    root,
  };
  return { ...core, slot_sha256: sha256(canonicalJson(core)) };
}

function stageIntentNameForProof(
  index: 0 | 1,
  publisherToken: string,
  ownerWitness: { dev: string; ino: string },
  identity: { dev: string; ino: string },
  slot: SegmentedJsonlDurableRootSlotV1,
): string {
  const intentSha = sha256(canonicalJson({
    v: 1,
    target_slot: index,
    publisher_token: publisherToken,
    owner_witness_dev: ownerWitness.dev,
    owner_witness_ino: ownerWitness.ino,
    predecessor_root_sha256: slot.root.previous_root_sha256,
    candidate_root_sha256: slot.root.root_sha256,
    stage_dev: identity.dev,
    stage_ino: identity.ino,
    slot_sha256: slot.slot_sha256,
  }));
  return `slot-stage-${index}-${publisherToken}-${intentSha}.v1`;
}

function createStageIntentForProof(
  lockDir: string,
  index: 0 | 1,
  publisherToken: string,
  root: SegmentedJsonlDurableRootV1,
  peer: { dev: string; ino: string } | null,
): { path: string; identity: { dev: string; ino: string }; slot: SegmentedJsonlDurableRootSlotV1 } {
  const witnessStat = fs.statSync(ownerWitnessPathForProof(lockDir, publisherToken), { bigint: true } as any);
  const ownerWitness = { dev: String(witnessStat.dev), ino: String(witnessStat.ino) };
  const tempPath = path.join(lockDir, `proof-stage-${index}-${publisherToken}.tmp`);
  const fd = fs.openSync(tempPath, "wx+", 0o600);
  try {
    const stat = fs.fstatSync(fd, { bigint: true } as any);
    const identity = { dev: String(stat.dev), ino: String(stat.ino) };
    const slot = slotForProof(index, identity, peer, root);
    const body = encodeSlotForProof(slot);
    let off = 0;
    while (off < body.length) {
      const n = fs.writeSync(fd, body, off, body.length - off, off);
      assert.ok(n > 0);
      off += n;
    }
    fs.fchmodSync(fd, 0o600);
    fs.fsyncSync(fd);
    const intentName = stageIntentNameForProof(index, publisherToken, ownerWitness, identity, slot);
    const intentPath = path.join(lockDir, intentName);
    fs.linkSync(tempPath, intentPath);
    fsyncDirectory(lockDir);
    fs.unlinkSync(tempPath);
    fsyncDirectory(lockDir);
    return { path: intentPath, identity, slot };
  } finally { fs.closeSync(fd); }
}

function buildGeneration(
  tmp: string,
  generation: number,
): {
  root: string;
  materializedPath: string;
  snapshot: ReturnType<typeof deriveSegmentedJsonlSnapshotAuthorityV1>;
  materialized: SegmentedJsonlMaterializedAuthorityV1;
} {
  const source = path.join(tmp, `source-${generation}.jsonl`);
  const root = path.join(tmp, `store-${generation}`);
  const materializedPath = path.join(tmp, `materialized-${generation}.jsonl`);
  fs.writeFileSync(source, sourceBytes(generation + 2), { mode: 0o600 });
  const manifest = buildSegmentedJsonlV1FromFile(source, root, {
    segmentTargetBytes: 1024,
    maxRecordBytes: 256,
    generation,
  });
  reconstructSegmentedJsonlV1ToFile(root, materializedPath);
  const snapshot = deriveSegmentedJsonlSnapshotAuthorityV1(manifest);
  const materialized = deriveSegmentedJsonlMaterializedAuthorityV1(root, materializedPath);
  return {
    root,
    materializedPath,
    snapshot,
    materialized,
  };
}

type DurableRootPublishInputForProof = Parameters<typeof publishSegmentedJsonlDurableRootV1>[1];

const DURABLE_ROOT_CHILD_MODE = process.env.VOID_DURABLE_ROOT_CHILD_MODE || "";

function requiredChildEnvironment(name: string): string {
  const value = process.env[name] || "";
  assert.ok(value, `missing child proof environment: ${name}`);
  return value;
}

function writeCrashBoundaryTrace(tracePath: string, value: Record<string, unknown>): void {
  const body = Buffer.from(JSON.stringify(value) + "\n", "utf8");
  const fd = fs.openSync(tracePath, "wx", 0o600);
  try {
    fs.writeFileSync(fd, body);
    fs.fsyncSync(fd);
  } finally { fs.closeSync(fd); }
  fsyncDirectory(path.dirname(tracePath));
}

function runDurableRootChildMode(): never {
  const durableDir = requiredChildEnvironment("VOID_DURABLE_ROOT_CHILD_DIR");
  const inputPath = requiredChildEnvironment("VOID_DURABLE_ROOT_CHILD_INPUT");
  const input = JSON.parse(fs.readFileSync(inputPath, "utf8")) as DurableRootPublishInputForProof;
  const lockDir = path.join(durableDir, ".durable-root-publish-v1.lock");

  if (DURABLE_ROOT_CHILD_MODE === "recover_abandoned_winner") {
    const originalUnlinkSync = fsMutable.unlinkSync;
    let recovererClaimantToken: string | null = null;
    fsMutable.unlinkSync = ((file: fs.PathLike) => {
      if (path.basename(String(file)) === "owner.v1.json") {
        const owner = JSON.parse(fs.readFileSync(String(file), "utf8")) as {
          pid?: number;
          start_ticks?: string;
          token?: string;
        };
        if (
          owner.pid === process.pid &&
          owner.start_ticks === processStartTicks(process.pid) &&
          typeof owner.token === "string"
        ) recovererClaimantToken = owner.token;
      }
      return originalUnlinkSync(file);
    }) as typeof fsMutable.unlinkSync;
    syncBuiltinESMExports();
    let result: SegmentedJsonlDurableRootV1;
    try {
      result = publishSegmentedJsonlDurableRootV1(durableDir, input);
    } finally {
      fsMutable.unlinkSync = originalUnlinkSync;
      syncBuiltinESMExports();
    }
    assert.match(recovererClaimantToken || "", /^[0-9a-f]{32}$/);
    process.stdout.write(JSON.stringify({
      mode: DURABLE_ROOT_CHILD_MODE,
      pid: process.pid,
      start_ticks: processStartTicks(process.pid),
      claimant_token: recovererClaimantToken,
      root_sha256: result.root_sha256,
    }) + "\n");
    process.exit(0);
  }

  if (DURABLE_ROOT_CHILD_MODE === "crash_after_successor_owner_durable") {
    const tracePath = requiredChildEnvironment("VOID_DURABLE_ROOT_CHILD_TRACE");
    const ownerPath = path.join(lockDir, "owner.v1.json");
    const predecessor = JSON.parse(fs.readFileSync(ownerPath, "utf8")) as {
      token: string;
    };
    const originalReaddirSync = fsMutable.readdirSync;
    let crashBoundaries = 0;
    fsMutable.readdirSync = ((directory: fs.PathLike, options?: any) => {
      let directoryAuthority = path.resolve(String(directory));
      try { directoryAuthority = path.resolve(fs.realpathSync(String(directory))); } catch {}
      if (
        crashBoundaries === 0 &&
        directoryAuthority === path.resolve(lockDir) &&
        fs.existsSync(ownerPath)
      ) {
        const owner = JSON.parse(fs.readFileSync(ownerPath, "utf8")) as {
          pid: number;
          start_ticks: string;
          token: string;
        };
        const witnessPath = ownerWitnessPathForProof(lockDir, owner.token);
        const chain = readReclaimWinnerChainForProof(lockDir);
        const terminal = chain[chain.length - 1];
        if (
          owner.token !== predecessor.token &&
          owner.pid === process.pid &&
          owner.start_ticks === processStartTicks(process.pid) &&
          fs.existsSync(witnessPath) &&
          terminal?.value.claimant_token === owner.token &&
          terminal.value.stale_owner_token === predecessor.token
        ) {
          const ownerStat = fs.statSync(ownerPath, { bigint: true } as any);
          const witnessStat = fs.statSync(witnessPath, { bigint: true } as any);
          assert.equal(ownerStat.dev, witnessStat.dev);
          assert.equal(ownerStat.ino, witnessStat.ino);
          assert.equal(ownerStat.nlink, 2n);
          crashBoundaries += 1;
          writeCrashBoundaryTrace(tracePath, {
            v: 1,
            pid: process.pid,
            start_ticks: processStartTicks(process.pid),
            claimant_token: owner.token,
            predecessor_token: predecessor.token,
            owner_dev: String(ownerStat.dev),
            owner_ino: String(ownerStat.ino),
            witness_dev: String(witnessStat.dev),
            witness_ino: String(witnessStat.ino),
            terminal_name: terminal.name,
            terminal_sha256: terminal.sha256,
            crash_boundaries: crashBoundaries,
          });
          process.kill(process.pid, "SIGKILL");
          throw new Error("unreachable_after_sigkill");
        }
      }
      return (originalReaddirSync as any)(directory, options);
    }) as typeof fsMutable.readdirSync;
    syncBuiltinESMExports();
    publishSegmentedJsonlDurableRootV1(durableDir, input);
    throw new Error("successor-owner crash boundary was not reached");
  }

  assert.equal(DURABLE_ROOT_CHILD_MODE, "crash_after_owner_restore");
  const tracePath = requiredChildEnvironment("VOID_DURABLE_ROOT_CHILD_TRACE");
  const ownerPath = path.join(lockDir, "owner.v1.json");
  const predecessor = JSON.parse(fs.readFileSync(ownerPath, "utf8")) as {
    token: string;
  };
  const originalOpenSync = fsMutable.openSync;
  const originalUnlinkSync = fsMutable.unlinkSync;
  let acquisitionFaults = 0;
  let crashBoundaries = 0;

  fsMutable.openSync = ((file: fs.PathLike, flags: fs.OpenMode, mode?: fs.Mode) => {
    const descriptorWinner = /^\/proc\/self\/fd\/([0-9]+)\/reclaim-winner(?:-successor-[0-9a-f]{64})?\.v1$/.exec(String(file));
    if (acquisitionFaults === 0 && descriptorWinner && fs.existsSync(ownerPath)) {
      const descriptorAuthority = fs.realpathSync(`/proc/self/fd/${descriptorWinner[1]}`);
      const currentOwner = JSON.parse(fs.readFileSync(ownerPath, "utf8")) as { token: string };
      if (
        path.resolve(descriptorAuthority) === path.resolve(lockDir) &&
        currentOwner.token !== predecessor.token
      ) {
        acquisitionFaults += 1;
        const injected = new Error("injected_real_process_acquire_failure") as NodeJS.ErrnoException;
        injected.code = "EIO";
        throw injected;
      }
    }
    return originalOpenSync(file, flags, mode as fs.Mode);
  }) as typeof fsMutable.openSync;

  fsMutable.unlinkSync = ((file: fs.PathLike) => {
    const descriptorWinner = /^\/proc\/self\/fd\/([0-9]+)\/reclaim-winner(?:-successor-[0-9a-f]{64})?\.v1$/.exec(String(file));
    if (acquisitionFaults === 1 && crashBoundaries === 0 && descriptorWinner) {
      const descriptorAuthority = fs.realpathSync(`/proc/self/fd/${descriptorWinner[1]}`);
      const restoredOwner = fs.statSync(ownerPath, { bigint: true } as any);
      const restoredWitness = fs.statSync(
        ownerWitnessPathForProof(lockDir, predecessor.token),
        { bigint: true } as any,
      );
      const winner = JSON.parse(fs.readFileSync(String(file), "utf8")) as {
        claimant_pid: number;
        claimant_start_ticks: string;
        claimant_token: string;
      };
      assert.equal(path.resolve(descriptorAuthority), path.resolve(lockDir));
      assert.equal(restoredOwner.dev, restoredWitness.dev);
      assert.equal(restoredOwner.ino, restoredWitness.ino);
      assert.equal(restoredOwner.nlink, 2n);
      assert.equal(winner.claimant_pid, process.pid);
      assert.equal(winner.claimant_start_ticks, processStartTicks(process.pid));
      crashBoundaries += 1;
      writeCrashBoundaryTrace(tracePath, {
        v: 1,
        pid: process.pid,
        start_ticks: processStartTicks(process.pid),
        claimant_token: winner.claimant_token,
        owner_dev: String(restoredOwner.dev),
        owner_ino: String(restoredOwner.ino),
        witness_dev: String(restoredWitness.dev),
        witness_ino: String(restoredWitness.ino),
        acquisition_faults: acquisitionFaults,
        crash_boundaries: crashBoundaries,
      });
      process.kill(process.pid, "SIGKILL");
      throw new Error("unreachable_after_sigkill");
    }
    return originalUnlinkSync(file);
  }) as typeof fsMutable.unlinkSync;
  syncBuiltinESMExports();

  publishSegmentedJsonlDurableRootV1(durableDir, input);
  throw new Error("real process crash boundary was not reached");
}

if (DURABLE_ROOT_CHILD_MODE) runDurableRootChildMode();

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-segmented-jsonl-durable-root-v1-"));
try {
  fs.chmodSync(tmp, 0o700);
  const durableDir = path.join(tmp, "durable-root");
  fs.mkdirSync(durableDir, { mode: 0o700 });

  const publishLockDir = path.join(durableDir, ".durable-root-publish-v1.lock");
  fs.mkdirSync(publishLockDir, { mode: 0o700 });
  proveAnonymousStageCrashLeavesNoName(publishLockDir);
  proveAnonymousReclaimRaceHasOnePersistentWinner(publishLockDir);
  const slot0 = path.join(durableDir, "durable-root-slot-0.v1.json");
  const slot1 = path.join(durableDir, "durable-root-slot-1.v1.json");
  const foreignStaticStage0 = path.join(publishLockDir, "slot-stage-0.v1");
  const foreignStaticStage0Bytes = Buffer.from("{foreign-static-stage-0", "utf8");
  fs.writeFileSync(foreignStaticStage0, foreignStaticStage0Bytes, { mode: 0o600 });
  const foreignStaticStage0Stat = fs.statSync(foreignStaticStage0, { bigint: true } as any);

  const g1 = buildGeneration(tmp, 1);
  const c1 = deriveSegmentedJsonlCheckpointV1(g1.snapshot, null);
  const a1: SegmentedJsonlCheckpointAnchorV1 = {
    checkpoint: c1,
    snapshot: g1.snapshot,
    trusted_checkpoint_sha256: c1.checkpoint_sha256,
  };
  const r1Input = {
    checkpoint: c1,
    snapshot: g1.snapshot,
    materialized: g1.materialized,
  };
  const r1 = publishSegmentedJsonlDurableRootV1(durableDir, r1Input);
  assert.equal(r1.store_generation, 1);
  assert.equal(r1.previous_root_sha256, null);
  assert.equal(r1.append_only_witness_sha256, null);
  assert.equal(readSegmentedJsonlDurableRootV1(durableDir)?.root_sha256, r1.root_sha256);
  assert.equal(fs.existsSync(publishLockDir), true, "publication coordination directory is lifetime-bounded and retained");
  assert.equal(fs.existsSync(path.join(publishLockDir, "owner.v1.json")), false, "genesis publication owner must release");
  const foreignStaticStage0After = fs.statSync(foreignStaticStage0, { bigint: true } as any);
  assert.equal(foreignStaticStage0After.dev, foreignStaticStage0Stat.dev);
  assert.equal(foreignStaticStage0After.ino, foreignStaticStage0Stat.ino);
  assert.deepEqual(fs.readFileSync(foreignStaticStage0), foreignStaticStage0Bytes, "legacy/static foreign stage must never be adopted or rewritten");

  const recoveryDir = path.join(tmp, "durable-root-intent-recovery");
  fs.mkdirSync(recoveryDir, { mode: 0o700 });
  const recoveryLockDir = path.join(recoveryDir, ".durable-root-publish-v1.lock");
  fs.mkdirSync(recoveryLockDir, { mode: 0o700 });
  const recoveryToken = "aa".repeat(16);
  writePublishOwner(recoveryLockDir, process.pid, processStartTicks(process.pid), recoveryToken);
  const recoveryReleasePath = writeOwnerReleaseForProof(recoveryLockDir, recoveryToken);
  const ownedRecoveryIntent = createStageIntentForProof(recoveryLockDir, 0, recoveryToken, r1, null);
  assert.equal(fs.existsSync(path.join(recoveryDir, "durable-root-slot-0.v1.json")), false);
  const recoveredR1 = publishSegmentedJsonlDurableRootV1(recoveryDir, r1Input);
  assert.equal(recoveredR1.root_sha256, r1.root_sha256, "intent-bound owned stage must recover to canonical genesis");
  assert.equal(fs.existsSync(ownedRecoveryIntent.path), false, "recovered intent alias must retire");
  assert.equal(fs.existsSync(recoveryReleasePath), false, "immutable release marker must retire with the recovered owner generation");
  assert.equal(fs.statSync(path.join(recoveryDir, "durable-root-slot-0.v1.json"), { bigint: true } as any).nlink, 1n);

  const r1Retry = publishSegmentedJsonlDurableRootV1(durableDir, r1Input);
  assert.equal(r1Retry.root_sha256, r1.root_sha256, "exact genesis retry must be idempotent");

  const g2 = buildGeneration(tmp, 2);
  const c2 = deriveSegmentedJsonlCheckpointV1(g2.snapshot, a1);
  const w2 = verifySegmentedJsonlCheckpointAppendOnlyAtUseV1(
    g2.root,
    g2.materializedPath,
    c2,
    g2.snapshot,
    a1,
    g1.materialized,
    g2.materialized,
    g1.materialized.authority_sha256,
  );
  const r2Input = {
    checkpoint: c2,
    snapshot: g2.snapshot,
    materialized: g2.materialized,
    previousAnchor: a1,
    previousMaterialized: g1.materialized,
    appendOnlyWitness: w2,
    trustedAppendOnlyWitnessSha256: w2.witness_sha256,
  };

  const foreignIntentToken = "bb".repeat(16);
  writePublishOwner(publishLockDir, 99999999, "1", foreignIntentToken);
  const foreignIntentPath = path.join(publishLockDir, `slot-stage-1-${foreignIntentToken}-${"0".repeat(64)}.v1`);
  const foreignIntentBytes = Buffer.from("{foreign-intent-stage", "utf8");
  fs.writeFileSync(foreignIntentPath, foreignIntentBytes, { flag: "wx", mode: 0o600 });
  const foreignIntentStat = fs.statSync(foreignIntentPath, { bigint: true } as any);
  expectFailure(() => publishSegmentedJsonlDurableRootV1(durableDir, r2Input), "DURABLE_ROOT_STAGE_INTENT_TORN");
  const foreignIntentAfter = fs.statSync(foreignIntentPath, { bigint: true } as any);
  assert.equal(foreignIntentAfter.dev, foreignIntentStat.dev);
  assert.equal(foreignIntentAfter.ino, foreignIntentStat.ino);
  assert.deepEqual(fs.readFileSync(foreignIntentPath), foreignIntentBytes, "foreign stage intent must survive rejection unchanged");
  fs.unlinkSync(foreignIntentPath);
  fs.unlinkSync(path.join(publishLockDir, "reclaim-winner.v1"));
  fs.unlinkSync(ownerWitnessPathForProof(publishLockDir, foreignIntentToken));
  fsyncDirectory(publishLockDir);

  const slot0IdentityStat = fs.statSync(slot0, { bigint: true } as any);
  const slot0Peer = { dev: String(slot0IdentityStat.dev), ino: String(slot0IdentityStat.ino) };
  const { root_sha256: _r1Digest, ...fakeRootBase } = r1;
  const fakeRootCore = {
    ...fakeRootBase,
    store_generation: 2,
    append_only_witness_sha256: "33".repeat(32),
    previous_root_sha256: "44".repeat(32),
  };
  const wrongPredecessorRoot: SegmentedJsonlDurableRootV1 = {
    ...fakeRootCore,
    root_sha256: sha256(canonicalJson(fakeRootCore)),
  };
  const wrongPredecessorToken = "cc".repeat(16);
  writePublishOwner(publishLockDir, 99999999, "1", wrongPredecessorToken);
  const wrongPredecessorIntent = createStageIntentForProof(
    publishLockDir,
    1,
    wrongPredecessorToken,
    wrongPredecessorRoot,
    slot0Peer,
  );
  const wrongPredecessorBytes = fs.readFileSync(wrongPredecessorIntent.path);
  const wrongPredecessorStat = fs.statSync(wrongPredecessorIntent.path, { bigint: true } as any);
  expectFailure(() => publishSegmentedJsonlDurableRootV1(durableDir, r2Input), "DURABLE_ROOT_STAGE_INTENT_PREDECESSOR_MISMATCH");
  const wrongPredecessorAfter = fs.statSync(wrongPredecessorIntent.path, { bigint: true } as any);
  assert.equal(wrongPredecessorAfter.dev, wrongPredecessorStat.dev);
  assert.equal(wrongPredecessorAfter.ino, wrongPredecessorStat.ino);
  assert.deepEqual(fs.readFileSync(wrongPredecessorIntent.path), wrongPredecessorBytes, "wrong-predecessor intent must survive rejection unchanged");
  fs.unlinkSync(wrongPredecessorIntent.path);
  fs.unlinkSync(path.join(publishLockDir, "reclaim-winner.v1"));
  fs.unlinkSync(ownerWitnessPathForProof(publishLockDir, wrongPredecessorToken));
  fsyncDirectory(publishLockDir);

  const foreignStaticStage1 = path.join(publishLockDir, "slot-stage-1.v1");
  const foreignStaticStage1Bytes = Buffer.from("{foreign-static-stage-1", "utf8");
  fs.writeFileSync(foreignStaticStage1, foreignStaticStage1Bytes, { mode: 0o600 });
  const foreignStaticStage1Stat = fs.statSync(foreignStaticStage1, { bigint: true } as any);

  const r2 = publishSegmentedJsonlDurableRootV1(durableDir, r2Input);
  assert.equal(r2.store_generation, 2);
  assert.equal(r2.previous_root_sha256, r1.root_sha256);
  assert.equal(r2.append_only_witness_sha256, w2.witness_sha256);
  assert.equal(fs.existsSync(path.join(publishLockDir, "owner.v1.json")), false, "first peer publication owner must release");
  const foreignStaticStage1After = fs.statSync(foreignStaticStage1, { bigint: true } as any);
  assert.equal(foreignStaticStage1After.dev, foreignStaticStage1Stat.dev);
  assert.equal(foreignStaticStage1After.ino, foreignStaticStage1Stat.ino);
  assert.deepEqual(fs.readFileSync(foreignStaticStage1), foreignStaticStage1Bytes, "second legacy/static foreign stage must never be adopted or rewritten");
  assert.equal(
    publishSegmentedJsonlDurableRootV1(durableDir, r2Input).root_sha256,
    r2.root_sha256,
    "exact successor retry must be idempotent",
  );

  const trustedR2Bytes = verifySegmentedJsonlDurableRootMaterializedAtUseV1(
    durableDir,
    g2.root,
    g2.materializedPath,
    g2.materialized,
    r2.root_sha256,
    reader => reader.read(0, reader.total_bytes),
  );
  assert.deepEqual(
    trustedR2Bytes,
    sourceBytes(4),
    "externally trusted durable root must consume only its exact materialized bytes",
  );
  expectFailure(
    () => verifySegmentedJsonlDurableRootMaterializedAtUseV1(
      durableDir,
      g2.root,
      g2.materializedPath,
      g2.materialized,
      r1.root_sha256,
      reader => reader.read(0, reader.total_bytes),
    ),
    "DURABLE_ROOT_TRUST_ROOT_MISMATCH",
  );
  expectFailure(
    () => verifySegmentedJsonlDurableRootMaterializedAtUseV1(
      recoveryDir,
      g1.root,
      g1.materializedPath,
      g1.materialized,
      r2.root_sha256,
      reader => reader.read(0, reader.total_bytes),
    ),
    "DURABLE_ROOT_TRUST_ROOT_MISMATCH",
  );
  expectFailure(
    () => verifySegmentedJsonlDurableRootMaterializedAtUseV1(
      durableDir,
      g1.root,
      g1.materializedPath,
      g1.materialized,
      r2.root_sha256,
      reader => reader.read(0, reader.total_bytes),
    ),
    "DURABLE_ROOT_MATERIALIZED_AUTHORITY_MISMATCH",
  );

  const ownerPath = path.join(publishLockDir, "owner.v1.json");
  const reclaimPath = path.join(publishLockDir, "reclaim-winner.v1");
  const bootId = processBootId();
  const startTicks = processStartTicks(process.pid);

  const liveToken = "11".repeat(16);
  writePublishOwner(publishLockDir, process.pid, startTicks, liveToken);
  expectFailure(() => publishSegmentedJsonlDurableRootV1(durableDir, r2Input), "DURABLE_ROOT_PUBLISH_BUSY");
  removePublishOwnerForProof(publishLockDir, liveToken);

  const differentBootId = bootId === "00000000-0000-0000-0000-000000000000"
    ? "ffffffff-ffff-ffff-ffff-ffffffffffff"
    : "00000000-0000-0000-0000-000000000000";
  writePublishOwner(publishLockDir, process.pid, startTicks, "12".repeat(16), differentBootId);
  assert.equal(
    publishSegmentedJsonlDurableRootV1(durableDir, r2Input).root_sha256,
    r2.root_sha256,
    "same pid/start ticks from a different boot epoch must be stale and reclaimable",
  );
  assert.equal(fs.existsSync(ownerPath), false);
  const bootEpochChain = readReclaimWinnerChainForProof(publishLockDir);
  assert.equal(bootEpochChain.length, 1);
  assert.equal(
    fs.existsSync(reclaimWinnerRetirementPathForProof(
      publishLockDir,
      bootEpochChain[0].sha256,
    )),
    true,
    "completed reclaim evidence must retire append-only rather than be unlinked",
  );

  writePublishOwner(publishLockDir, 99999999, "1", "22".repeat(16));
  assert.equal(
    publishSegmentedJsonlDurableRootV1(durableDir, r2Input).root_sha256,
    r2.root_sha256,
    "stale publisher lock must be recoverable without changing committed truth",
  );
  assert.equal(fs.existsSync(ownerPath), false, "stale publisher owner must be reclaimed and released");
  const stalePublisherChain = readReclaimWinnerChainForProof(publishLockDir);
  assert.equal(stalePublisherChain.length, 2, "retired chain must accept one create-only successor");
  assert.equal(
    fs.existsSync(reclaimWinnerRetirementPathForProof(
      publishLockDir,
      stalePublisherChain[1].sha256,
    )),
    true,
    "new terminal must receive an exact append-only retirement marker",
  );

  const failedAcquireToken = "21".repeat(16);
  writePublishOwner(publishLockDir, 99999999, "1", failedAcquireToken);
  const failedAcquireWitnessPath = ownerWitnessPathForProof(publishLockDir, failedAcquireToken);
  const failedAcquireOwnerBefore = fs.statSync(ownerPath, { bigint: true } as any);
  const snapshotPublishLock = (): Record<string, {
    dev: string;
    ino: string;
    nlink: string;
    size: string;
    sha256: string;
  }> => Object.fromEntries(
    fs.readdirSync(publishLockDir).sort().map(name => {
      const file = path.join(publishLockDir, name);
      const stat = fs.statSync(file, { bigint: true } as any);
      return [name, {
        dev: String(stat.dev),
        ino: String(stat.ino),
        nlink: String(stat.nlink),
        size: String(stat.size),
        sha256: sha256(fs.readFileSync(file)),
      }];
    }),
  );
  const failedAcquireLockBefore = snapshotPublishLock();
  const originalOpenSync = fsMutable.openSync;
  let acquisitionRecheckInjectionCount = 0;
  let acquisitionRecheckDescriptorPath = "";
  let acquisitionRecheckDescriptorAuthority = "";
  let failedAcquireSuccessorToken: string | null = null;
  fsMutable.openSync = ((file: fs.PathLike, flags: fs.OpenMode, mode?: fs.Mode) => {
    const descriptorReclaimMatch =
      /^\/proc\/self\/fd\/([0-9]+)\/reclaim-winner\.v1$/.exec(String(file));
    if (acquisitionRecheckInjectionCount === 0 && descriptorReclaimMatch && fs.existsSync(ownerPath)) {
      const descriptorAuthority = fs.realpathSync(
        `/proc/self/fd/${descriptorReclaimMatch[1]}`,
      );
      const currentOwner = JSON.parse(fs.readFileSync(ownerPath, "utf8"));
      if (
        path.resolve(descriptorAuthority) === path.resolve(publishLockDir) &&
        currentOwner.token !== failedAcquireToken &&
        fs.existsSync(ownerWitnessPathForProof(publishLockDir, currentOwner.token))
      ) {
        acquisitionRecheckInjectionCount += 1;
        acquisitionRecheckDescriptorPath = String(file);
        acquisitionRecheckDescriptorAuthority = descriptorAuthority;
        failedAcquireSuccessorToken = currentOwner.token;
        const injected = new Error("injected_acquire_recheck_failure") as NodeJS.ErrnoException;
        injected.code = "EIO";
        throw injected;
      }
    }
    return originalOpenSync(file, flags, mode as fs.Mode);
  }) as typeof fsMutable.openSync;
  syncBuiltinESMExports();
  try {
    expectFailure(
      () => publishSegmentedJsonlDurableRootV1(durableDir, r2Input),
      "injected_acquire_recheck_failure",
    );
  } finally {
    fsMutable.openSync = originalOpenSync;
    syncBuiltinESMExports();
  }
  assert.equal(acquisitionRecheckInjectionCount, 1, "fault must execute exactly once through descriptor authority");
  assert.match(
    acquisitionRecheckDescriptorPath,
    /^\/proc\/self\/fd\/[0-9]+\/reclaim-winner\.v1$/,
    "fault must target the production descriptor-stable reclaim path",
  );
  assert.equal(
    path.resolve(acquisitionRecheckDescriptorAuthority),
    path.resolve(publishLockDir),
    "fault descriptor must retain the exact publish-lock directory",
  );
  assert.ok(failedAcquireSuccessorToken, "fault must observe the exact successor owner generation");
  assert.equal(
    readReclaimWinnerChainForProof(publishLockDir).at(-1)?.sha256,
    stalePublisherChain.at(-1)?.sha256,
    "failed claimant successor must retire while the previously retired chain remains exact",
  );
  const failedAcquireOwnerAfter = fs.statSync(ownerPath, { bigint: true } as any);
  const failedAcquireWitnessAfter = fs.statSync(failedAcquireWitnessPath, { bigint: true } as any);
  assert.equal(failedAcquireOwnerAfter.dev, failedAcquireOwnerBefore.dev);
  assert.equal(failedAcquireOwnerAfter.ino, failedAcquireOwnerBefore.ino, "failed acquisition must restore exact predecessor owner");
  assert.equal(failedAcquireOwnerAfter.dev, failedAcquireWitnessAfter.dev);
  assert.equal(failedAcquireOwnerAfter.ino, failedAcquireWitnessAfter.ino);
  assert.equal(failedAcquireOwnerAfter.nlink, 2n, "restored predecessor must recover its two-link witness authority");
  assert.deepEqual(
    snapshotPublishLock(),
    failedAcquireLockBefore,
    "rollback must restore the exact predecessor namespace without successor residue",
  );
  const failedAcquireSuccessor = failedAcquireSuccessorToken as string;
  assert.deepEqual(
    fs.readdirSync(publishLockDir).filter(name => name.includes(failedAcquireSuccessor)),
    [],
    "failed successor must retain zero token-scoped artifacts",
  );
  assert.equal(
    publishSegmentedJsonlDurableRootV1(durableDir, r2Input).root_sha256,
    r2.root_sha256,
    "one natural retry must converge after acquisition recheck failure rollback",
  );
  assert.equal(fs.existsSync(ownerPath), false);
  assert.equal(fs.existsSync(failedAcquireWitnessPath), false);
  assert.deepEqual(
    fs.readdirSync(publishLockDir).filter(name => name.includes(failedAcquireSuccessor)),
    [],
    "successful retry must not resurrect failed-successor artifacts",
  );
  const completedRetryChain = readReclaimWinnerChainForProof(publishLockDir);
  assert.ok(completedRetryChain.length >= 3, "successful retry must append without replacing prior evidence");
  assert.equal(
    fs.existsSync(reclaimWinnerRetirementPathForProof(
      publishLockDir,
      completedRetryChain.at(-1)!.sha256,
    )),
    true,
    "successful retry must retire its exact terminal append-only",
  );
  removeReclaimEvidenceForProof(publishLockDir);

  const abandonedRollbackToken = "31".repeat(16);
  writePublishOwner(publishLockDir, 99999999, "1", abandonedRollbackToken);
  const abandonedRollbackWitnessPath = ownerWitnessPathForProof(
    publishLockDir,
    abandonedRollbackToken,
  );
  const abandonedRollbackOwnerBefore = fs.statSync(ownerPath, { bigint: true } as any);
  const abandonedRollbackWitnessBefore = fs.statSync(
    abandonedRollbackWitnessPath,
    { bigint: true } as any,
  );
  const abandonedRollbackForeignToken = "4f".repeat(16);
  const abandonedRollbackForeignWitnessPath = ownerWitnessPathForProof(
    publishLockDir,
    abandonedRollbackForeignToken,
  );
  const abandonedRollbackForeignWitnessBytes = Buffer.from(
    "foreign-generation-witness-must-remain-exact\n",
    "utf8",
  );
  fs.writeFileSync(
    abandonedRollbackForeignWitnessPath,
    abandonedRollbackForeignWitnessBytes,
    { flag: "wx", mode: 0o600 },
  );
  fsyncDirectory(publishLockDir);
  const abandonedRollbackForeignWitnessBefore = fs.statSync(
    abandonedRollbackForeignWitnessPath,
    { bigint: true } as any,
  );
  const abandonedRollbackInputPath = path.join(tmp, "abandoned-rollback-input.json");
  const abandonedRollbackTracePath = path.join(tmp, "abandoned-rollback-crash.json");
  fs.writeFileSync(abandonedRollbackInputPath, JSON.stringify(r2Input) + "\n", {
    flag: "wx",
    mode: 0o600,
  });
  const childEntry = path.resolve(process.argv[1] || "");
  assert.ok(childEntry, "durable root proof child entry must resolve");
  const childArgs = [...process.execArgv, childEntry];
  const childEnvironment = (mode: string): NodeJS.ProcessEnv => ({
    PATH: process.env.PATH || "/usr/bin:/bin",
    LANG: "C",
    LC_ALL: "C",
    VOID_DURABLE_ROOT_CHILD_MODE: mode,
    VOID_DURABLE_ROOT_CHILD_DIR: durableDir,
    VOID_DURABLE_ROOT_CHILD_INPUT: abandonedRollbackInputPath,
    VOID_DURABLE_ROOT_CHILD_TRACE: abandonedRollbackTracePath,
  });
  const childA = childProcess.spawnSync(process.execPath, childArgs, {
    cwd: process.cwd(),
    env: childEnvironment("crash_after_owner_restore"),
    encoding: "utf8",
    timeout: 30_000,
  });
  assert.equal(childA.error, undefined, `child A spawn failed: ${String(childA.error)}`);
  assert.equal(childA.status, null, `child A must not exit normally: ${childA.stderr}`);
  assert.equal(childA.signal, "SIGKILL", `child A must cross a real SIGKILL boundary: ${childA.stderr}`);
  const childATrace = JSON.parse(fs.readFileSync(abandonedRollbackTracePath, "utf8")) as {
    pid: number;
    start_ticks: string;
    claimant_token: string;
    owner_dev: string;
    owner_ino: string;
    witness_dev: string;
    witness_ino: string;
    acquisition_faults: number;
    crash_boundaries: number;
  };
  assert.notEqual(childATrace.pid, process.pid, "child A must have an independent process identity");
  assert.equal(childATrace.acquisition_faults, 1);
  assert.equal(childATrace.crash_boundaries, 1);
  assert.equal(childATrace.owner_dev, String(abandonedRollbackOwnerBefore.dev));
  assert.equal(childATrace.owner_ino, String(abandonedRollbackOwnerBefore.ino));
  assert.equal(childATrace.witness_dev, String(abandonedRollbackWitnessBefore.dev));
  assert.equal(childATrace.witness_ino, String(abandonedRollbackWitnessBefore.ino));
  const abandonedRollbackWinnerBefore = fs.statSync(reclaimPath, { bigint: true } as any);
  const abandonedRollbackWinnerValue = JSON.parse(fs.readFileSync(reclaimPath, "utf8")) as {
    claimant_pid: number;
    claimant_start_ticks: string;
    claimant_token: string;
  };
  assert.equal(abandonedRollbackWinnerValue.claimant_pid, childATrace.pid);
  assert.equal(abandonedRollbackWinnerValue.claimant_start_ticks, childATrace.start_ticks);
  assert.equal(abandonedRollbackWinnerValue.claimant_token, childATrace.claimant_token);
  assert.equal(
    abandonedRollbackOwnerBefore.dev,
    abandonedRollbackWitnessBefore.dev,
  );
  assert.equal(
    abandonedRollbackOwnerBefore.ino,
    abandonedRollbackWitnessBefore.ino,
    "rollback-interrupted owner and witness must begin as one exact predecessor inode",
  );
  assert.ok(
    abandonedRollbackWinnerBefore.ino !== abandonedRollbackOwnerBefore.ino ||
      abandonedRollbackWinnerBefore.dev !== abandonedRollbackOwnerBefore.dev,
    "rollback-interrupted winner must remain separate from predecessor authority",
  );
  const childB = childProcess.spawnSync(process.execPath, childArgs, {
    cwd: process.cwd(),
    env: childEnvironment("recover_abandoned_winner"),
    encoding: "utf8",
    timeout: 30_000,
  });
  assert.equal(childB.error, undefined, `child B spawn failed: ${String(childB.error)}`);
  assert.equal(childB.signal, null, `child B must not terminate by signal: ${childB.stderr}`);
  assert.equal(childB.status, 0, `child B must converge naturally: ${childB.stderr}`);
  const childBResult = JSON.parse(childB.stdout.trim()) as {
    mode: string;
    pid: number;
    start_ticks: string;
    claimant_token: string;
    root_sha256: string;
  };
  assert.equal(childBResult.mode, "recover_abandoned_winner");
  assert.notEqual(childBResult.pid, process.pid, "child B must be independent from the parent");
  assert.notEqual(childBResult.pid, childATrace.pid, "child B must be independent from child A");
  assert.notEqual(childBResult.start_ticks, childATrace.start_ticks, "child B must have a new process start identity");
  assert.match(childBResult.claimant_token, /^[0-9a-f]{32}$/);
  assert.notEqual(childBResult.claimant_token, childATrace.claimant_token, "child B must own a distinct claimant generation");
  assert.equal(childBResult.root_sha256, r2.root_sha256);
  assert.equal(fs.existsSync(ownerPath), false, "child B must release its completed owner");
  assert.equal(
    fs.existsSync(abandonedRollbackWitnessPath),
    false,
    "child B must retire the exact predecessor witness after convergence",
  );
  const abandonedRollbackChainAfter = readReclaimWinnerChainForProof(publishLockDir);
  assert.equal(abandonedRollbackChainAfter.length, 2, "child B must append one successor to child A evidence");
  assert.equal(
    fs.existsSync(reclaimWinnerRetirementPathForProof(
      publishLockDir,
      abandonedRollbackChainAfter[1].sha256,
    )),
    true,
    "child B must retire its exact successor without deleting either winner generation",
  );
  const abandonedRollbackWinnerAfter = fs.statSync(reclaimPath, { bigint: true } as any);
  assert.equal(abandonedRollbackWinnerAfter.dev, abandonedRollbackWinnerBefore.dev);
  assert.equal(abandonedRollbackWinnerAfter.ino, abandonedRollbackWinnerBefore.ino);
  const abandonedRollbackForeignWitnessAfter = fs.statSync(
    abandonedRollbackForeignWitnessPath,
    { bigint: true } as any,
  );
  assert.equal(
    abandonedRollbackForeignWitnessAfter.dev,
    abandonedRollbackForeignWitnessBefore.dev,
  );
  assert.equal(
    abandonedRollbackForeignWitnessAfter.ino,
    abandonedRollbackForeignWitnessBefore.ino,
    "foreign-generation witness identity must remain exact across child recovery",
  );
  assert.deepEqual(
    fs.readFileSync(abandonedRollbackForeignWitnessPath),
    abandonedRollbackForeignWitnessBytes,
    "foreign-generation witness bytes must remain exact across child recovery",
  );
  const abandonedRollbackOwnedTokens = [
    childATrace.claimant_token,
    childBResult.claimant_token,
    abandonedRollbackToken,
  ];
  assert.equal(new Set(abandonedRollbackOwnedTokens).size, 3, "real-process recovery generations must be distinct");
  const abandonedRollbackChildBResidueFalsifierName =
    `proof-owned-residue-${childBResult.claimant_token}.v1`;
  const abandonedRollbackChildBResidueFalsifierPath = path.join(
    publishLockDir,
    abandonedRollbackChildBResidueFalsifierName,
  );
  fs.writeFileSync(abandonedRollbackChildBResidueFalsifierPath, "owned\n", { flag: "wx", mode: 0o600 });
  fsyncDirectory(publishLockDir);
  assert.deepEqual(
    fs.readdirSync(publishLockDir).filter(name =>
      abandonedRollbackOwnedTokens.some(token => name.includes(token))
    ),
    [abandonedRollbackChildBResidueFalsifierName],
    "child B owned-residue falsifier must be detected before zero-residue success",
  );
  fs.unlinkSync(abandonedRollbackChildBResidueFalsifierPath);
  fsyncDirectory(publishLockDir);
  assert.deepEqual(
    fs.readdirSync(publishLockDir).filter(name =>
      abandonedRollbackOwnedTokens.some(token => name.includes(token))
    ),
    [],
    "child B, child A, and predecessor generations must leave zero owned residue",
  );
  fs.unlinkSync(abandonedRollbackForeignWitnessPath);
  fsyncDirectory(publishLockDir);
  removeReclaimEvidenceForProof(publishLockDir);

  const successorCrashPredecessorToken = "32".repeat(16);
  writePublishOwner(publishLockDir, 99999999, "1", successorCrashPredecessorToken);
  const successorCrashPredecessorWitnessPath = ownerWitnessPathForProof(
    publishLockDir,
    successorCrashPredecessorToken,
  );
  const successorCrashPredecessorWitnessBefore = fs.statSync(
    successorCrashPredecessorWitnessPath,
    { bigint: true } as any,
  );
  const successorCrashPredecessorWitnessBytes = fs.readFileSync(
    successorCrashPredecessorWitnessPath,
  );
  fs.rmSync(abandonedRollbackTracePath, { force: true });
  const successorCrashChildA = childProcess.spawnSync(process.execPath, childArgs, {
    cwd: process.cwd(),
    env: childEnvironment("crash_after_successor_owner_durable"),
    encoding: "utf8",
    timeout: 30_000,
  });
  assert.equal(
    successorCrashChildA.error,
    undefined,
    `successor-owner child A spawn failed: ${String(successorCrashChildA.error)}`,
  );
  assert.equal(
    successorCrashChildA.status,
    null,
    `successor-owner child A must not exit normally: ${successorCrashChildA.stderr}`,
  );
  assert.equal(
    successorCrashChildA.signal,
    "SIGKILL",
    `successor-owner child A must cross the exact durable-owner boundary: ${successorCrashChildA.stderr}`,
  );
  const successorCrashTrace = JSON.parse(
    fs.readFileSync(abandonedRollbackTracePath, "utf8"),
  ) as {
    pid: number;
    start_ticks: string;
    claimant_token: string;
    predecessor_token: string;
    owner_dev: string;
    owner_ino: string;
    witness_dev: string;
    witness_ino: string;
    terminal_name: string;
    terminal_sha256: string;
    crash_boundaries: number;
  };
  assert.equal(successorCrashTrace.predecessor_token, successorCrashPredecessorToken);
  assert.equal(successorCrashTrace.crash_boundaries, 1);
  assert.notEqual(successorCrashTrace.pid, process.pid);
  assert.match(successorCrashTrace.claimant_token, /^[0-9a-f]{32}$/);
  const successorCrashChainBefore = readReclaimWinnerChainForProof(publishLockDir);
  assert.equal(successorCrashChainBefore.length, 1);
  assert.equal(successorCrashChainBefore[0].name, successorCrashTrace.terminal_name);
  assert.equal(successorCrashChainBefore[0].sha256, successorCrashTrace.terminal_sha256);
  const successorCrashRootBefore = fs.statSync(reclaimPath, { bigint: true } as any);
  const successorCrashRootBytes = fs.readFileSync(reclaimPath);
  const successorCrashChildB = childProcess.spawnSync(process.execPath, childArgs, {
    cwd: process.cwd(),
    env: childEnvironment("recover_abandoned_winner"),
    encoding: "utf8",
    timeout: 30_000,
  });
  assert.equal(
    successorCrashChildB.error,
    undefined,
    `successor-owner child B spawn failed: ${String(successorCrashChildB.error)}`,
  );
  assert.equal(successorCrashChildB.signal, null, successorCrashChildB.stderr);
  assert.equal(successorCrashChildB.status, 0, successorCrashChildB.stderr);
  const successorCrashRecovery = JSON.parse(successorCrashChildB.stdout.trim()) as {
    pid: number;
    start_ticks: string;
    claimant_token: string;
    root_sha256: string;
  };
  assert.notEqual(successorCrashRecovery.pid, successorCrashTrace.pid);
  assert.notEqual(successorCrashRecovery.claimant_token, successorCrashTrace.claimant_token);
  assert.equal(successorCrashRecovery.root_sha256, r2.root_sha256);
  assert.equal(fs.existsSync(ownerPath), false);
  assert.equal(
    fs.existsSync(ownerWitnessPathForProof(publishLockDir, successorCrashTrace.claimant_token)),
    false,
    "fresh recoverer must retire the crashed successor owner's witness",
  );
  const successorCrashChainAfter = readReclaimWinnerChainForProof(publishLockDir);
  assert.equal(successorCrashChainAfter.length, 2, "fresh recoverer must append one exact transition successor");
  const successorCrashRootAfter = fs.statSync(reclaimPath, { bigint: true } as any);
  assert.equal(successorCrashRootAfter.dev, successorCrashRootBefore.dev);
  assert.equal(successorCrashRootAfter.ino, successorCrashRootBefore.ino);
  assert.deepEqual(
    fs.readFileSync(reclaimPath),
    successorCrashRootBytes,
    "fresh recovery must preserve the crashed claimant's root winner bytes exactly",
  );
  assert.equal(
    fs.existsSync(reclaimWinnerRetirementPathForProof(
      publishLockDir,
      successorCrashChainAfter[1].sha256,
    )),
    true,
    "fresh recovery must publish one exact terminal retirement marker",
  );
  const successorCrashPredecessorWitnessAfter = fs.statSync(
    successorCrashPredecessorWitnessPath,
    { bigint: true } as any,
  );
  assert.equal(
    successorCrashPredecessorWitnessAfter.dev,
    successorCrashPredecessorWitnessBefore.dev,
  );
  assert.equal(
    successorCrashPredecessorWitnessAfter.ino,
    successorCrashPredecessorWitnessBefore.ino,
    "nested transition recovery must retain the exact earlier predecessor witness authority",
  );
  assert.deepEqual(
    fs.readFileSync(successorCrashPredecessorWitnessPath),
    successorCrashPredecessorWitnessBytes,
  );
  removeReclaimEvidenceForProof(publishLockDir);
  fs.unlinkSync(successorCrashPredecessorWitnessPath);
  fsyncDirectory(publishLockDir);

  const staleClaimToken = "23".repeat(16);
  writePublishOwner(publishLockDir, 99999999, "1", staleClaimToken);
  writeReclaimWinnerForProof(publishLockDir, staleClaimToken, "33".repeat(16));
  const staleClaimWitnessPath = ownerWitnessPathForProof(publishLockDir, staleClaimToken);
  const staleClaimOwnerBefore = fs.statSync(ownerPath, { bigint: true } as any);
  const staleClaimWitnessBefore = fs.statSync(staleClaimWitnessPath, { bigint: true } as any);
  const staleClaimWinnerBefore = fs.statSync(reclaimPath, { bigint: true } as any);
  const staleClaimWinnerBytesBefore = fs.readFileSync(reclaimPath);
  rewriteReclaimWinnerForProof(publishLockDir, staleClaimToken, "36".repeat(16));
  const staleClaimWinnerMutated = fs.statSync(reclaimPath, { bigint: true } as any);
  assert.equal(staleClaimWinnerMutated.dev, staleClaimWinnerBefore.dev);
  assert.equal(staleClaimWinnerMutated.ino, staleClaimWinnerBefore.ino, "adversary must retain the winner inode while changing its authority bytes");
  assert.notDeepEqual(fs.readFileSync(reclaimPath), staleClaimWinnerBytesBefore, "same-inode winner rewrite must change exact authority bytes");
  expectFailure(
    () => publishSegmentedJsonlDurableRootV1(durableDir, r2Input),
    "DURABLE_ROOT_RECLAIM_WINNER_CLAIMANT_MISMATCH",
  );
  const staleClaimOwnerAfter = fs.statSync(ownerPath, { bigint: true } as any);
  const staleClaimWitnessAfter = fs.statSync(staleClaimWitnessPath, { bigint: true } as any);
  const staleClaimWinnerAfter = fs.statSync(reclaimPath, { bigint: true } as any);
  assert.equal(staleClaimOwnerAfter.dev, staleClaimOwnerBefore.dev);
  assert.equal(staleClaimOwnerAfter.ino, staleClaimOwnerBefore.ino, "loser must not unlink the predecessor owner");
  assert.equal(staleClaimWitnessAfter.dev, staleClaimWitnessBefore.dev);
  assert.equal(staleClaimWitnessAfter.ino, staleClaimWitnessBefore.ino, "loser must preserve the predecessor witness");
  assert.equal(staleClaimWinnerAfter.dev, staleClaimWinnerBefore.dev);
  assert.equal(staleClaimWinnerAfter.ino, staleClaimWinnerBefore.ino, "loser must preserve the actual winner record");
  fs.unlinkSync(reclaimPath);
  removePublishOwnerForProof(publishLockDir, staleClaimToken);

  const exactBytePredecessorToken = "2a".repeat(16);
  writePublishOwner(publishLockDir, 99999999, "1", exactBytePredecessorToken);
  writeReclaimWinnerForProof(
    publishLockDir,
    exactBytePredecessorToken,
    "3a".repeat(16),
    { bootId: processBootId(), pid: 99999998, startTicks: "1" },
  );
  const exactByteWitnessPath = ownerWitnessPathForProof(
    publishLockDir,
    exactBytePredecessorToken,
  );
  const exactByteOwnerBefore = fs.statSync(ownerPath, { bigint: true } as any);
  const exactByteWitnessBefore = fs.statSync(exactByteWitnessPath, { bigint: true } as any);
  const exactByteWinnerBefore = fs.statSync(reclaimPath, { bigint: true } as any);
  const exactByteWinnerBytesBefore = fs.readFileSync(reclaimPath);
  fs.writeFileSync(
    ownerPath,
    JSON.stringify({
      v: 1,
      boot_id: processBootId(),
      pid: 99999997,
      start_ticks: "2",
      token: exactBytePredecessorToken,
      state: "held",
    }) + "\n",
    { mode: 0o600 },
  );
  const exactByteOwnerFd = fs.openSync(ownerPath, "r");
  try { fs.fsyncSync(exactByteOwnerFd); } finally { fs.closeSync(exactByteOwnerFd); }
  fsyncDirectory(publishLockDir);
  const exactByteOwnerMutated = fs.statSync(ownerPath, { bigint: true } as any);
  const exactByteWitnessMutated = fs.statSync(exactByteWitnessPath, { bigint: true } as any);
  assert.equal(exactByteOwnerMutated.dev, exactByteOwnerBefore.dev);
  assert.equal(exactByteOwnerMutated.ino, exactByteOwnerBefore.ino);
  assert.equal(exactByteWitnessMutated.dev, exactByteWitnessBefore.dev);
  assert.equal(exactByteWitnessMutated.ino, exactByteWitnessBefore.ino);
  expectFailure(
    () => publishSegmentedJsonlDurableRootV1(durableDir, r2Input),
    "DURABLE_ROOT_RECLAIM_WINNER_BINDING_MISMATCH",
  );
  const exactByteWinnerAfter = fs.statSync(reclaimPath, { bigint: true } as any);
  assert.equal(exactByteWinnerAfter.dev, exactByteWinnerBefore.dev);
  assert.equal(exactByteWinnerAfter.ino, exactByteWinnerBefore.ino);
  assert.deepEqual(
    fs.readFileSync(reclaimPath),
    exactByteWinnerBytesBefore,
    "exact-byte predecessor rejection must preserve the abandoned winner",
  );
  fs.unlinkSync(reclaimPath);
  removePublishOwnerForProof(publishLockDir, exactBytePredecessorToken);

  const staleUnlinkedToken = "24".repeat(16);
  writePublishOwner(publishLockDir, 99999999, "1", staleUnlinkedToken);
  writeReclaimWinnerForProof(publishLockDir, staleUnlinkedToken, "34".repeat(16));
  const staleUnlinkedWitnessPath = ownerWitnessPathForProof(publishLockDir, staleUnlinkedToken);
  fs.unlinkSync(ownerPath);
  fsyncDirectory(publishLockDir);
  const staleUnlinkedWitnessBefore = fs.statSync(staleUnlinkedWitnessPath, { bigint: true } as any);
  const staleUnlinkedWinnerBefore = fs.statSync(reclaimPath, { bigint: true } as any);
  expectFailure(
    () => publishSegmentedJsonlDurableRootV1(durableDir, r2Input),
    "DURABLE_ROOT_RECLAIM_WINNER_CLAIMANT_MISMATCH",
  );
  assert.equal(fs.existsSync(ownerPath), false, "loser must not install itself after another claimant won");
  const staleUnlinkedWitnessAfter = fs.statSync(staleUnlinkedWitnessPath, { bigint: true } as any);
  const staleUnlinkedWinnerAfter = fs.statSync(reclaimPath, { bigint: true } as any);
  assert.equal(staleUnlinkedWitnessAfter.dev, staleUnlinkedWitnessBefore.dev);
  assert.equal(staleUnlinkedWitnessAfter.ino, staleUnlinkedWitnessBefore.ino, "winner-owned predecessor witness must survive");
  assert.equal(staleUnlinkedWinnerAfter.dev, staleUnlinkedWinnerBefore.dev);
  assert.equal(staleUnlinkedWinnerAfter.ino, staleUnlinkedWinnerBefore.ino, "winner record must remain exact");
  fs.unlinkSync(reclaimPath);
  fs.unlinkSync(staleUnlinkedWitnessPath);
  fsyncDirectory(publishLockDir);

  const liveReclaimToken = "25".repeat(16);
  writePublishOwner(publishLockDir, process.pid, startTicks, liveReclaimToken);
  writeReclaimWinnerForProof(publishLockDir, liveReclaimToken, "35".repeat(16));
  expectFailure(() => publishSegmentedJsonlDurableRootV1(durableDir, r2Input), "DURABLE_ROOT_PUBLISH_BUSY");
  const liveOwnerStat = fs.statSync(ownerPath, { bigint: true } as any);
  const liveWitnessStat = fs.statSync(ownerWitnessPathForProof(publishLockDir, liveReclaimToken), { bigint: true } as any);
  assert.equal(liveOwnerStat.dev, liveWitnessStat.dev);
  assert.equal(liveOwnerStat.ino, liveWitnessStat.ino, "live exact owner witness must never be stolen");
  fs.unlinkSync(reclaimPath);
  removePublishOwnerForProof(publishLockDir, liveReclaimToken);

  const replacedWitnessToken = "26".repeat(16);
  writePublishOwner(publishLockDir, 99999999, "1", replacedWitnessToken);
  const replacedWitnessPath = ownerWitnessPathForProof(publishLockDir, replacedWitnessToken);
  const copiedOwnerBytes = fs.readFileSync(ownerPath);
  fs.unlinkSync(replacedWitnessPath);
  fs.writeFileSync(replacedWitnessPath, copiedOwnerBytes, { flag: "wx", mode: 0o600 });
  const replacementBefore = fs.statSync(replacedWitnessPath, { bigint: true } as any);
  expectFailure(
    () => publishSegmentedJsonlDurableRootV1(durableDir, r2Input),
    "DURABLE_ROOT_PUBLISH_LOCK_RECLAIM_WITNESS_MISMATCH",
  );
  const replacementAfter = fs.statSync(replacedWitnessPath, { bigint: true } as any);
  assert.equal(replacementAfter.dev, replacementBefore.dev);
  assert.equal(replacementAfter.ino, replacementBefore.ino, "replaced witness must survive rejection untouched");
  fs.unlinkSync(ownerPath);
  fs.unlinkSync(replacedWitnessPath);
  fsyncDirectory(publishLockDir);

  assert.deepEqual(
    fs.readdirSync(durableDir).sort(),
    [path.basename(slot0), path.basename(slot1), path.basename(publishLockDir)].sort(),
    "durable authority remains bounded to two root slots plus one private coordination directory",
  );
  const slot0Before = fs.statSync(slot0, { bigint: true } as any);
  const slot0Identity = `${slot0Before.dev}:${slot0Before.ino}`;
  const corrupt = Buffer.alloc(8192, 0x20);
  Buffer.from("{broken\n", "utf8").copy(corrupt, 0);
  fs.writeFileSync(slot0, corrupt);
  const corruptFd = fs.openSync(slot0, "r");
  try { fs.fsyncSync(corruptFd); } finally { fs.closeSync(corruptFd); }
  expectFailure(
    () => readSegmentedJsonlDurableRootV1(durableDir),
    "DURABLE_ROOT_DEGRADED_SLOT_REQUIRES_RECOVERY",
  );

  const a2: SegmentedJsonlCheckpointAnchorV1 = {
    checkpoint: c2,
    snapshot: g2.snapshot,
    trusted_checkpoint_sha256: c2.checkpoint_sha256,
  };
  const g3 = buildGeneration(tmp, 3);
  const c3 = deriveSegmentedJsonlCheckpointV1(g3.snapshot, a2);
  const w3 = verifySegmentedJsonlCheckpointAppendOnlyAtUseV1(
    g3.root,
    g3.materializedPath,
    c3,
    g3.snapshot,
    a2,
    g2.materialized,
    g3.materialized,
    g2.materialized.authority_sha256,
  );
  const r3 = publishSegmentedJsonlDurableRootV1(durableDir, {
    checkpoint: c3,
    snapshot: g3.snapshot,
    materialized: g3.materialized,
    previousAnchor: a2,
    previousMaterialized: g2.materialized,
    appendOnlyWitness: w3,
    trustedAppendOnlyWitnessSha256: w3.witness_sha256,
  });
  const slot0After = fs.statSync(slot0, { bigint: true } as any);
  assert.equal(`${slot0After.dev}:${slot0After.ino}`, slot0Identity, "torn target slot must recover in-place on the same durable slot inode");
  assert.equal(r3.previous_root_sha256, r2.root_sha256);
  assert.equal(readSegmentedJsonlDurableRootV1(durableDir)?.root_sha256, r3.root_sha256);
  assert.equal(fs.readdirSync(durableDir).length, 3, "durable authority must remain lifetime-bounded to two slot files plus one lock directory");

  const a3: SegmentedJsonlCheckpointAnchorV1 = {
    checkpoint: c3,
    snapshot: g3.snapshot,
    trusted_checkpoint_sha256: c3.checkpoint_sha256,
  };
  const g4 = buildGeneration(tmp, 4);
  const c4 = deriveSegmentedJsonlCheckpointV1(g4.snapshot, a3);
  const w4: SegmentedJsonlAppendOnlyCheckpointWitnessV1 = verifySegmentedJsonlCheckpointAppendOnlyAtUseV1(
    g4.root,
    g4.materializedPath,
    c4,
    g4.snapshot,
    a3,
    g3.materialized,
    g4.materialized,
    g3.materialized.authority_sha256,
  );

  const savedSlot1 = `${slot1}.owned`;
  fs.renameSync(slot1, savedSlot1);
  const foreign = Buffer.alloc(8192, 0x51);
  fs.writeFileSync(slot1, foreign, { flag: "wx", mode: 0o600 });
  expectFailure(
    () => publishSegmentedJsonlDurableRootV1(durableDir, {
      checkpoint: c4,
      snapshot: g4.snapshot,
      materialized: g4.materialized,
      previousAnchor: a3,
      previousMaterialized: g3.materialized,
      appendOnlyWitness: w4,
      trustedAppendOnlyWitnessSha256: w4.witness_sha256,
    }),
    "DURABLE_ROOT_TARGET_IDENTITY_MISMATCH",
  );
  assert.deepEqual(fs.readFileSync(slot1), foreign, "foreign slot replacement must survive failed publication unchanged");
  expectFailure(
    () => readSegmentedJsonlDurableRootV1(durableDir),
    "DURABLE_ROOT_DEGRADED_SLOT_REQUIRES_RECOVERY",
  );

  console.log("durable_root_owned_stage_intent_retry_converges=true");
  console.log("durable_root_owner_hardlink_witness_required=true");
  console.log("durable_root_anonymous_stage_prepublication_crash_residue=0");
  console.log("durable_root_stage_intent_binds_physical_owner_witness=true");
  console.log("durable_root_foreign_static_stage_preserved=true");
  console.log("durable_root_foreign_stage_intent_preserved=true");
  console.log("durable_root_wrong_predecessor_intent_preserved=true");
  console.log("durable_root_exact_retry_idempotent=true");
  console.log("durable_root_trusted_materialized_use_exact_bytes=true");
  console.log("durable_root_external_trust_root_rejects_local_rollback=true");
  console.log("durable_root_rejects_self_consistent_foreign_materialized_authority=true");
  console.log("durable_root_live_publish_lock_excludes_writer=true");
  console.log("durable_root_boot_epoch_prevents_pid_start_alias=true");
  console.log("durable_root_stale_publish_lock_recoverable=true");
  console.log("durable_root_failed_acquire_descriptor_fault_count=1");
  console.log("durable_root_failed_acquire_predecessor_descriptor_linked=true");
  console.log("durable_root_failed_acquire_lock_namespace_restored=true");
  console.log("durable_root_failed_acquire_successor_residue=0");
  console.log("durable_root_failed_acquire_predecessor_restored=true");
  console.log("durable_root_failed_acquire_single_retry_converges=true");
  console.log("durable_root_abandoned_reclaim_child_a_signal=SIGKILL");
  console.log("durable_root_abandoned_reclaim_child_processes_executed=2");
  console.log("durable_root_abandoned_reclaim_real_pid_start_bound=true");
  console.log("durable_root_abandoned_reclaim_foreign_generation_preserved=true");
  console.log("durable_root_abandoned_reclaim_owned_residue=0");
  console.log("durable_root_abandoned_reclaim_winner_fresh_process_converges=true");
  console.log("durable_root_reclaim_chain_retirement_append_only=true");
  console.log("durable_root_successor_owner_crash_fresh_process_converges=true");
  console.log("durable_root_reclaim_winner_claimant_mismatch_preserved=true");
  console.log("durable_root_reclaim_winner_same_inode_rewrite_rejected=true");
  console.log("durable_root_reclaim_predecessor_exact_bytes_bound=true");
  console.log("durable_root_reclaim_winner_owner_unlink_requires_exact_claimant=true");
  console.log("durable_root_owner_release_immutable_marker=true");
  console.log("durable_root_live_released_owner_stage_recovery=true");
  console.log("durable_root_reclaim_winner_separate_from_owner_inode=true");
  console.log("durable_root_reclaim_race_exact_winners=1");
  console.log("durable_root_reclaim_race_persistent_losers=0");
  console.log("durable_root_live_owner_witness_not_stolen=true");
  console.log("durable_root_replaced_owner_witness_preserved_on_hold=true");
  console.log("durable_root_two_slot_lifetime_bound=true");
  console.log("durable_root_torn_target_retry_converges=true");
  console.log("durable_root_degraded_slot_never_rolls_back=true");
  console.log("durable_root_foreign_replacement_preserved=true");
  console.log("durable_root_checkpoint_witness_materialized_binding=true");
  console.log("VOID_SEGMENTED_JSONL_DURABLE_ROOT_V1_PROOF_GREEN=true");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
