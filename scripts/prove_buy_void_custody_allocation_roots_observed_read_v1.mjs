#!/usr/bin/env node
// Only disposable 0700/0600 Linux fixtures. Never opens live custody roots.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  VOID_BUY_VOID_CUSTODY_ALLOCATION_OBSERVED_READ_AUTHORITY_V1 as AUTH,
  observeBuyVoidCustodyAllocationRootsReadOnlyV1 as observe,
} from "../src/economic/buy_void_custody_allocation_roots_observed_read_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = "src/economic/buy_void_custody_allocation_roots_observed_read_v1.mjs";
const EXPECTED_BLOB = "1bf88a403b1012ac00edaf634c5ed237a898043c";
const bytes = fs.readFileSync(path.join(ROOT, SOURCE));
const gitBlob = crypto.createHash("sha1")
  .update(Buffer.from("blob " + bytes.length + "\0")).update(bytes).digest("hex");
assert.equal(gitBlob, EXPECTED_BLOB, "actual source identity pinned");
assert.equal(process.platform, "linux");
assert.ok(typeof process.getuid === "function" && process.getuid() > 0);
assert.equal(AUTH.source_only_unmounted, true);
assert.equal(AUTH.filesystem_write, false);
assert.equal(AUTH.cross_root_atomic_snapshot_proven, false);
assert.equal(AUTH.production_allocation_mutation_ready, false);

const ledger = Buffer.from(
  '{"schema":"void.allocation.synthetic","sequence":1}\n', "utf8");
const high = Buffer.from('{"synthetic_high_water":true}\n', "utf8");
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-allocation-readonly-"));
  fs.chmodSync(root, 0o700);
  const ledgerRoot = path.join(root, "ledger");
  const highRoot = path.join(root, "high-water");
  for (const dir of [ledgerRoot, highRoot]) {
    fs.mkdirSync(dir, { mode: 0o700 });
    fs.chmodSync(dir, 0o700);
  }
  const ledgerFile = path.join(ledgerRoot, "allocation-reservations-v1.jsonl");
  const highFile = path.join(highRoot, "allocation-reservation-high-water-v1.json");
  for (const [p, data] of [[ledgerFile, ledger], [highFile, high]]) {
    fs.writeFileSync(p, data, { mode: 0o600 });
    fs.chmodSync(p, 0o600);
  }
  return {
    root, ledgerRoot, highRoot, ledgerFile, highFile,
    options: { ledger_root: ledgerRoot, high_water_root: highRoot },
  };
}
function held(value) {
  assert.equal(value.observed, false);
  assert.equal(value.status, "held");
  assert.equal(value.operation_performed, false);
  assert.equal(value.filesystem_write, false);
  assert.equal(value.cross_root_atomic_snapshot_proven, false);
  assert.equal(value.production_allocation_mutation_ready, false);
  assert.equal(value.funds_moved, false);
}
function digest(data) {
  return "sha256:" + crypto.createHash("sha256").update(data).digest("hex");
}
{
  const f = fixture();
  try {
    const oldLedger = fs.statSync(f.ledgerFile);
    const oldHigh = fs.statSync(f.highFile);
    const result = observe(f.options);
    assert.equal(result.observed, true, result.reason);
    assert.equal(result.status, "observed");
    assert.deepEqual(result.allocation_jsonl, ledger);
    assert.deepEqual(result.allocation_high_water_bytes, high);
    assert.equal(result.evidence.allocation_ledger_sha256, digest(ledger));
    assert.equal(result.evidence.high_water_sha256, digest(high));
    assert.equal(result.evidence.separate_root_inodes_observed, true);
    assert.equal(result.evidence.separate_storage_devices_observed, false);
    assert.equal(result.operation_performed, false);
    assert.equal(result.filesystem_write, false);
    assert.equal(result.cross_root_atomic_snapshot_proven, false);
    assert.equal(result.cross_uid_ipc_authenticated, false);
    assert.equal(result.production_allocation_mutation_ready, false);
    assert.equal(fs.statSync(f.ledgerFile).ino, oldLedger.ino);
    assert.equal(fs.statSync(f.highFile).ino, oldHigh.ino);
    assert.deepEqual(fs.readdirSync(f.ledgerRoot), [
      "allocation-reservations-v1.jsonl"]);
    assert.deepEqual(fs.readdirSync(f.highRoot), [
      "allocation-reservation-high-water-v1.json"]);
    // Caller may edit returned Buffer, but never the original private file.
    result.allocation_jsonl[0] ^= 0x1;
    assert.deepEqual(fs.readFileSync(f.ledgerFile), ledger);
    console.log("actual_descriptor_bound_allocation_high_water_read_only=true");
    console.log("no_directory_or_file_mutation=true");
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}
{
  const f = fixture();
  try {
    // A caller cannot forge host path selection or add green claims.
    held(observe({ ...f.options, production_gate_ready: true }));
    held(observe({ ...f.options, high_water_root: f.ledgerRoot }));
    held(observe({
      ledger_root: f.ledgerRoot, high_water_root: f.ledgerRoot + "/nested",
    }));
    let accesses = 0;
    const accessor = { ledger_root: f.ledgerRoot };
    Object.defineProperty(accessor, "high_water_root", {
      enumerable:true,
      get() { accesses++; return f.highRoot; },
    });
    held(observe(accessor));
    const proxy = new Proxy(f.options, {
      ownKeys() { accesses++; throw new Error("proxy_executed"); },
      getPrototypeOf() { accesses++; throw new Error("proxy_executed"); },
    });
    held(observe(proxy));
    assert.equal(accesses, 0, "no Proxy or getter execution");
    held(observe({
      ledger_root: f.ledgerRoot,
      high_water_root: f.highRoot + "/../high-water",
    }));
    console.log("caller_executable_config_and_extra_authority_rejected=true");
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}
{
  const f = fixture();
  try {
    fs.chmodSync(f.ledgerRoot, 0o750);
    held(observe(f.options));
    fs.chmodSync(f.ledgerRoot, 0o700);
    fs.chmodSync(f.highFile, 0o644);
    held(observe(f.options));
    fs.chmodSync(f.highFile, 0o600);
    const extraHardlink = path.join(f.highRoot, "extra-hardlink");
    fs.linkSync(f.highFile, extraHardlink);
    held(observe(f.options));
    fs.unlinkSync(extraHardlink);
    const original = fs.readFileSync(f.highFile);
    fs.unlinkSync(f.highFile);
    fs.symlinkSync(f.ledgerFile, f.highFile);
    held(observe(f.options));
    fs.unlinkSync(f.highFile);
    fs.writeFileSync(f.highFile, original, { mode: 0o600 });
    fs.chmodSync(f.highFile, 0o600);
    fs.unlinkSync(f.ledgerFile);
    held(observe(f.options));
    console.log("private_owner_mode_links_and_symlink_required=true");
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}
{
  const f = fixture();
  try {
    // After the allocation fd is pinned but before it is read, replace the
    // other visible pathname with same bytes and a different inode.
    let injected = false;
    const read = fs.readSync;
    try {
      fs.readSync = function (...args) {
        const count = read(...args);
        if (!injected) {
          injected = true;
          const replacement = f.highFile + ".replacement";
          fs.writeFileSync(replacement, high, { mode: 0o600 });
          fs.chmodSync(replacement, 0o600);
          fs.renameSync(replacement, f.highFile);
        }
        return count;
      };
      held(observe(f.options));
      assert.equal(injected, true);
    } finally { fs.readSync = read; }
    console.log("same_bytes_high_water_inode_swap_rejected=true");
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}
console.log("cross_root_atomic_snapshot_proven=false");
console.log("installed_service_uid_verified=false");
console.log("cross_uid_ipc_authenticated=false");
console.log("allocation_reserve_enabled=false");
console.log("custody_recover_enabled=false");
console.log("production_allocation_mutation_ready=false");
console.log("funds_moved=false");
console.log("VOID_BUY_VOID_CUSTODY_ALLOCATION_OBSERVED_READ_V1_GREEN");
