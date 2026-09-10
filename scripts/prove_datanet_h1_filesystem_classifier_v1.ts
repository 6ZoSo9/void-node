// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  VOID_DATANET_H1_FILESYSTEM_CLASSIFIER_V1,
  classifyDatanetH1FilesystemV1,
} from "../src/storage/datanet_h1_filesystem_classifier_v1.js";
import { datanetReplicaLeafNameV1 } from "../src/storage/datanet_state_derived_h1_v1.js";

const K = "ab".repeat(32);
const OTHER_K = "cd".repeat(32);
const PAYLOAD = Buffer.alloc(256 * 1024, 0x5a);
const H = createHash("sha256").update(PAYLOAD).digest("hex");
const S0 = datanetReplicaLeafNameV1(K, 0);
const S1 = datanetReplicaLeafNameV1(K, 1);
const EXPECTED_CALLS = PAYLOAD.length / 65_536 + 1;
const EXPECTED_REQUESTED = PAYLOAD.length + 1;

let cases = 0;
function check(name: string, body: () => void): void {
  body();
  cases += 1;
  process.stdout.write(`ok ${cases} - ${name}\n`);
}

function withRoot(body: (root: string) => void): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-datanet-h1-"));
  try {
    body(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function writeLeaf(root: string, name: string, bytes: Buffer = PAYLOAD): string {
  const target = path.join(root, name);
  fs.writeFileSync(target, bytes, { mode: 0o600, flag: "wx" });
  fs.chmodSync(target, 0o600);
  return target;
}

function openRootFd(root: string): number {
  return fs.openSync(root, fs.constants.O_RDONLY | ((fs.constants as any).O_DIRECTORY || 0));
}

function rootIdentityFromFd(fd: number): string {
  const st = fs.fstatSync(fd, { bigint: true } as any) as any;
  return `${String(st.dev)}:${String(st.ino)}`;
}

function classify(root: string, retired = true, expectedRootIdentity?: string) {
  const fd = openRootFd(root);
  try {
    return classifyDatanetH1FilesystemV1({
      store_root_fd: fd,
      expected_root_identity: expectedRootIdentity ?? rootIdentityFromFd(fd),
      quota_key: K,
      expected_sha256: H,
      expected_bytes: PAYLOAD.length,
      mutation_custody_retired: retired,
    });
  } finally {
    fs.closeSync(fd);
  }
}

check("S0-only exact bytes authorize H1 with fixed read ledger", () => withRoot(root => {
  writeLeaf(root, S0);
  const fd = openRootFd(root);
  const expectedRoot = rootIdentityFromFd(fd);
  fs.closeSync(fd);
  const result = classify(root, true, expectedRoot);
  assert.equal(result.format, VOID_DATANET_H1_FILESYSTEM_CLASSIFIER_V1);
  assert.deepEqual([result.classification.decision, result.classification.reason], ["AUTHORIZE_H1", "S0_ONLY_VERIFIED"]);
  assert.equal(result.s0_name, S0);
  assert.equal(result.s1_name, S1);
  assert.deepEqual(result.s0_read_ledger, {
    calls: EXPECTED_CALLS,
    requested_bytes: EXPECTED_REQUESTED,
    returned_bytes: PAYLOAD.length,
  });
  assert.deepEqual(result.s1_read_ledger, { calls: 0, requested_bytes: 0, returned_bytes: 0 });
  assert.equal(result.root_identity, expectedRoot);
}));

check("distinct S0+S1 exact bytes deny another H1", () => withRoot(root => {
  writeLeaf(root, S0);
  writeLeaf(root, S1);
  const result = classify(root);
  assert.deepEqual([result.classification.decision, result.classification.reason], ["DENY_H1", "S0_S1_VERIFIED_CAP_REACHED"]);
  assert.equal(result.s0_read_ledger.calls, EXPECTED_CALLS);
  assert.equal(result.s1_read_ledger.calls, EXPECTED_CALLS);
}));

check("unrelated K namespace does not count as S2", () => withRoot(root => {
  writeLeaf(root, S0);
  writeLeaf(root, datanetReplicaLeafNameV1(OTHER_K, 0));
  const result = classify(root);
  assert.equal(result.extra_leaf_count, 0);
  assert.equal(result.classification.decision, "AUTHORIZE_H1");
}));

check("same-K third-path collision fails closed before H1 consumption", () => withRoot(root => {
  writeLeaf(root, S0);
  writeLeaf(root, `datanet-${K}-s2.v1`);
  const result = classify(root);
  assert.equal(result.extra_leaf_count, 1);
  assert.deepEqual([result.classification.decision, result.classification.reason], ["HOLD", "EXTRA_LEAF_PRESENT"]);
}));

check("symlink occupant is preserved foreign state", () => withRoot(root => {
  writeLeaf(root, S0);
  fs.symlinkSync(S0, path.join(root, S1));
  const result = classify(root);
  assert.deepEqual([result.classification.decision, result.classification.reason], ["HOLD", "S1_FOREIGN"]);
  assert.equal(result.s1_read_ledger.calls, 0);
}));

check("hard-link alias cannot count as two replicas", () => withRoot(root => {
  const s0 = writeLeaf(root, S0);
  fs.linkSync(s0, path.join(root, S1));
  const result = classify(root);
  assert.deepEqual([result.classification.decision, result.classification.reason], ["HOLD", "S0_FOREIGN"]);
  assert.equal(result.s0_read_ledger.calls, 0);
}));

check("wrong S0 hash is fully read then preserved foreign", () => withRoot(root => {
  writeLeaf(root, S0, Buffer.alloc(PAYLOAD.length, 0x33));
  const result = classify(root);
  assert.deepEqual([result.classification.decision, result.classification.reason], ["HOLD", "S0_FOREIGN"]);
  assert.equal(result.s0_read_ledger.calls, EXPECTED_CALLS);
  assert.equal(result.s0_read_ledger.requested_bytes, EXPECTED_REQUESTED);
}));

check("wrong S0 length fails before payload reads", () => withRoot(root => {
  writeLeaf(root, S0, PAYLOAD.subarray(0, PAYLOAD.length - 1));
  const result = classify(root);
  assert.deepEqual([result.classification.decision, result.classification.reason], ["HOLD", "S0_FOREIGN"]);
  assert.equal(result.s0_read_ledger.calls, 0);
}));

check("lexical root aliases are outside classifier authority but bind to same inode", () => withRoot(root => {
  writeLeaf(root, S0);
  const alias = `${root}-alias`;
  try {
    fs.symlinkSync(root, alias, "dir");
    const directFd = openRootFd(root);
    const aliasFd = openRootFd(alias);
    try {
      const expectedRoot = rootIdentityFromFd(directFd);
      assert.equal(rootIdentityFromFd(aliasFd), expectedRoot);
      const direct = classifyDatanetH1FilesystemV1({
        store_root_fd: directFd,
        expected_root_identity: expectedRoot,
        quota_key: K,
        expected_sha256: H,
        expected_bytes: PAYLOAD.length,
        mutation_custody_retired: true,
      });
      const throughAlias = classifyDatanetH1FilesystemV1({
        store_root_fd: aliasFd,
        expected_root_identity: expectedRoot,
        quota_key: K,
        expected_sha256: H,
        expected_bytes: PAYLOAD.length,
        mutation_custody_retired: true,
      });
      assert.equal(throughAlias.root_identity, direct.root_identity);
      assert.deepEqual(throughAlias.classification, direct.classification);
    } finally {
      fs.closeSync(directFd);
      fs.closeSync(aliasFd);
    }
  } finally {
    fs.rmSync(alias, { force: true });
  }
}));

check("wrong prebound root identity is rejected before classification", () => withRoot(root => {
  writeLeaf(root, S0);
  assert.throws(() => classify(root, true, "1:1"), /STORE_ROOT_IDENTITY_MISMATCH/);
}));

check("active mutation custody remains HOLD even with valid S0", () => withRoot(root => {
  writeLeaf(root, S0);
  const result = classify(root, false);
  assert.deepEqual([result.classification.decision, result.classification.reason], ["HOLD", "MUTATION_CUSTODY_ACTIVE"]);
}));

check("missing S0 never authorizes H1", () => withRoot(root => {
  const result = classify(root);
  assert.deepEqual([result.classification.decision, result.classification.reason], ["HOLD", "S0_MISSING"]);
  assert.equal(result.s0_read_ledger.calls, 0);
}));

check("group-writable S0 is not admitted as owned stable custody", () => withRoot(root => {
  const s0 = writeLeaf(root, S0);
  fs.chmodSync(s0, 0o620);
  const result = classify(root);
  assert.deepEqual([result.classification.decision, result.classification.reason], ["HOLD", "S0_FOREIGN"]);
  assert.equal(result.s0_read_ledger.calls, 0);
}));

check("nonregular S1 occupant is preserved foreign state", () => withRoot(root => {
  writeLeaf(root, S0);
  fs.mkdirSync(path.join(root, S1), { mode: 0o700 });
  const result = classify(root);
  assert.deepEqual([result.classification.decision, result.classification.reason], ["HOLD", "S1_FOREIGN"]);
}));

check("classifier rejects schedule/history metadata instead of ignoring it", () => withRoot(root => {
  writeLeaf(root, S0);
  const fd = openRootFd(root);
  try {
    assert.throws(() => classifyDatanetH1FilesystemV1({
      store_root_fd: fd,
      expected_root_identity: rootIdentityFromFd(fd),
      quota_key: K,
      expected_sha256: H,
      expected_bytes: PAYLOAD.length,
      mutation_custody_retired: true,
      schedule_label: "R0",
    } as any), /INPUT_KEYS_INVALID/);
  } finally {
    fs.closeSync(fd);
  }
}));

assert.equal(cases, 15);
process.stdout.write(
  `VOID_DATANET_H1_FILESYSTEM_CLASSIFIER_V1_GREEN cases=${cases} read_calls=${EXPECTED_CALLS} requested=${EXPECTED_REQUESTED} returned=${PAYLOAD.length}\n`,
);
