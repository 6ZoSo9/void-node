import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { TxIndex } from "../dist/chain/txindex.js";
import { ReceiptsStore } from "../dist/chain/receipts.js";
import { SegStore } from "../dist/chain/seg_store.js";
import {
  computeVoidSegStoreContentSealV1,
  registerVoidSegStoreProcFdRootV1,
} from "../dist/chain/segstore_path_confinement_v1.js";

const MARKER = "VOID_CHECKPOINT_RESTORE_NODE_INIT_SEAL_V1";
const classSource = fs.readFileSync("src/node_core.ts", "utf8");
const restoredSource = fs.readFileSync(
  "scripts/run_void_public_checkpoint_restore_v1.mjs", "utf8",
);

// The class's instance-field initializers run before its constructor body,
// in declaration order. The real SegStore must be initialized first.
const declarations = [
  "readonly store = new SegStore(",
  "readonly txIndex = new TxIndex(",
  "readonly receipts = new ReceiptsStore(",
];
const locations = declarations.map((marker) => {
  const at = classSource.indexOf(marker);
  assert.ok(at > classSource.indexOf("export class Node {"), marker);
  assert.equal(classSource.indexOf(marker, at + marker.length), -1, marker);
  return at;
});
assert.ok(
  locations[0] < locations[1] && locations[1] < locations[2],
  "SegStore must verify the inherited seal before derived index constructors",
);

const begin = restoredSource.indexOf("function exactPostRepairTopLevel(dataDir) {");
const end = restoredSource.indexOf("\nasync function main() {", begin);
assert.ok(begin >= 0 && end > begin, "restore top-level contract missing");
const topLevelContract = restoredSource.slice(begin, end);
for (const name of ["checkpoint.json", "head.txt", "heads.json", "segments"]) {
  assert.ok(topLevelContract.includes(JSON.stringify(name)), name);
}
for (const derived of ["index", "receipts", "blobs", "wal"]) {
  assert.equal(topLevelContract.includes(JSON.stringify(derived)), false, derived);
}

const keys = [
  "VOID_SEGSTORE_INHERITED_DATA_AUTHORITY_V1",
  "VOID_SEGSTORE_INHERITED_DATA_FD_V1",
  "VOID_SEGSTORE_INHERITED_DATA_DEV_V1",
  "VOID_SEGSTORE_INHERITED_DATA_INO_V1",
  "VOID_SEGSTORE_INHERITED_DATA_CONTENT_SEAL_V1",
];
const prior = new Map(keys.map((key) => [key, process.env[key]]));
const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-checkpoint-seal-node-init-"));
let fillerFd = null;
let rootFd = null;
let unregister = null;

try {
  assert.equal(process.platform, "linux", "inherited checkpoint FD requires Linux");
  fs.writeFileSync(path.join(root, "checkpoint.json"), '{"synthetic":true}\n', { mode: 0o600 });
  fs.writeFileSync(
    path.join(root, "heads.json"),
    '{"head":-1,"number":-1,"hash":"0x0"}\n',
    { mode: 0o600 },
  );
  fs.writeFileSync(path.join(root, "head.txt"), "-1\n", { mode: 0o600 });
  fs.mkdirSync(path.join(root, "segments"), { mode: 0o700 });
  assert.deepEqual(fs.readdirSync(root).sort(),
    ["checkpoint.json", "head.txt", "heads.json", "segments"].sort());

  // Keep an inert spare descriptor so the live root FD is >= 4.
  fillerFd = fs.openSync("/dev/null", "r");
  rootFd = fs.openSync(root,
    fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
  assert.ok(rootFd >= 4);
  const fdRoot = "/proc/self/fd/" + rootFd;
  const rootStat = fs.fstatSync(rootFd, { bigint: true });
  unregister = registerVoidSegStoreProcFdRootV1(fdRoot);
  const acceptedSeal = computeVoidSegStoreContentSealV1(fdRoot);
  unregister();
  unregister = null;
  process.env.VOID_SEGSTORE_INHERITED_DATA_AUTHORITY_V1 = "1";
  process.env.VOID_SEGSTORE_INHERITED_DATA_FD_V1 = String(rootFd);
  process.env.VOID_SEGSTORE_INHERITED_DATA_DEV_V1 = String(rootStat.dev);
  process.env.VOID_SEGSTORE_INHERITED_DATA_INO_V1 = String(rootStat.ino);
  process.env.VOID_SEGSTORE_INHERITED_DATA_CONTENT_SEAL_V1 = acceptedSeal;

  // Reproduce the OLD Node field order with the actual derived constructors.
  new TxIndex(path.join(fdRoot, "index"));
  new ReceiptsStore(path.join(fdRoot, "receipts"), { shardSpan: 10_000 });
  assert.deepEqual(fs.readdirSync(root).sort(), [
    "checkpoint.json", "head.txt", "heads.json",
    "index", "receipts", "segments",
  ].sort());
  assert.notEqual(computeVoidSegStoreContentSealV1(fdRoot), acceptedSeal);
  assert.throws(
    () => new SegStore(fdRoot),
    /VOID_SEGSTORE_PATH_CONFINEMENT_V1: inherited proc-fd content seal mismatch/,
  );

  // Restore the exact sealed root; with SegStore FIRST, admission succeeds.
  fs.rmdirSync(path.join(root, "index"));
  fs.rmdirSync(path.join(root, "receipts"));
  assert.equal(computeVoidSegStoreContentSealV1(fdRoot), acceptedSeal);
  const store = new SegStore(fdRoot, { sparseEvery: 512 });
  assert.equal(store.loadHeadNumber(), -1);
  new TxIndex(path.join(fdRoot, "index"));
  new ReceiptsStore(path.join(fdRoot, "receipts"), { shardSpan: 10_000 });
  assert.equal(fs.existsSync(path.join(root, "index")), true);
  assert.equal(fs.existsSync(path.join(root, "receipts")), true);

  console.log(MARKER + "_GREEN");
  console.log("real_segstore_content_seal_guard_preserved=true");
  console.log("original_constructor_order_holds=true");
  console.log("segstore_first_inherited_admission_succeeds=true");
  console.log("derived_indexes_created_only_after_seal=true");
  console.log("outside_machine_runner_performed=false");
  console.log("real_runtime_or_customer_data_access=false");
  console.log("wallet_signer_funds_access=false");
} finally {
  if (unregister) unregister();
  for (const [key, value] of prior) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  if (rootFd !== null) fs.closeSync(rootFd);
  if (fillerFd !== null) fs.closeSync(fillerFd);
  fs.rmSync(root, { recursive: true, force: true });
}
