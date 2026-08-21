import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createRequire, syncBuiltinESMExports } from "node:module";
import {
  buildSegmentedJsonlV1FromFile,
  verifySegmentedJsonlV1,
  reconstructSegmentedJsonlV1ToFile,
} from "../src/storage/segmented_jsonl_v1.js";

function expectFailure(fn: () => unknown, fragment: string): void {
  let seen = "";
  try { fn(); } catch (error) { seen = error instanceof Error ? error.message : String(error); }
  assert.ok(seen.includes(fragment), `expected ${fragment}, got ${seen}`);
}

function fixture(count = 300): Buffer {
  return Buffer.from(Array.from({ length: count }, (_, i) => JSON.stringify({ v: 1, i, payload: "x".repeat(128) })).join("\n") + "\n", "utf8");
}

const require = createRequire(import.meta.url);
const mutableFs = require("node:fs") as typeof fs;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-segmented-parent-authority-"));
try {
  const source = path.join(tmp, "source.jsonl");
  fs.writeFileSync(source, fixture(), { mode: 0o600 });
  const store = path.join(tmp, "store");
  buildSegmentedJsonlV1FromFile(source, store, { segmentTargetBytes: 4096, maxRecordBytes: 1024 });
  assert.equal(verifySegmentedJsonlV1(store).total_records_verified, 300);
  const rebuilt = path.join(tmp, "rebuilt.jsonl");
  reconstructSegmentedJsonlV1ToFile(store, rebuilt);
  assert.deepEqual(fs.readFileSync(rebuilt), fs.readFileSync(source));

  // A pre-existing destination is authoritative only when the current UID owns
  // it and group/other principals cannot mutate its child namespace.
  const broadStore = path.join(tmp, "broad-store");
  fs.mkdirSync(broadStore, { mode: 0o700 });
  fs.chmodSync(broadStore, 0o777);
  const broadBefore = fs.lstatSync(broadStore, { bigint: true } as any);
  expectFailure(
    () => buildSegmentedJsonlV1FromFile(source, broadStore, { segmentTargetBytes: 4096, maxRecordBytes: 1024 }),
    "DIRECTORY_WRITE_AUTHORITY_MISMATCH",
  );
  const broadAfter = fs.lstatSync(broadStore, { bigint: true } as any);
  assert.equal(broadAfter.dev, broadBefore.dev);
  assert.equal(broadAfter.ino, broadBefore.ino);
  assert.deepEqual(fs.readdirSync(broadStore), [], "broadly writable destination must remain untouched");

  // A new authoritative store root must not be published into a namespace that
  // another local principal can rename or remove.
  const broadNewParent = path.join(tmp, "broad-new-parent");
  fs.mkdirSync(broadNewParent, { mode: 0o700 });
  fs.chmodSync(broadNewParent, 0o777);
  const broadNewStore = path.join(broadNewParent, "store");
  expectFailure(
    () => buildSegmentedJsonlV1FromFile(source, broadNewStore, { segmentTargetBytes: 4096, maxRecordBytes: 1024 }),
    "DIRECTORY_WRITE_AUTHORITY_MISMATCH",
  );
  assert.equal(fs.existsSync(broadNewStore), false, "broadly writable parent must not receive a new store root");

  // Write-authority metadata is part of the retained store generation. Widening
  // permissions without replacing the inode must make later admission fail.
  const modeStore = path.join(tmp, "mode-store");
  buildSegmentedJsonlV1FromFile(source, modeStore, { segmentTargetBytes: 4096, maxRecordBytes: 1024 });
  const modeRootBefore = fs.lstatSync(modeStore, { bigint: true } as any);
  fs.chmodSync(modeStore, 0o777);
  const modeRootAfter = fs.lstatSync(modeStore, { bigint: true } as any);
  assert.equal(modeRootAfter.dev, modeRootBefore.dev);
  assert.equal(modeRootAfter.ino, modeRootBefore.ino);
  expectFailure(() => verifySegmentedJsonlV1(modeStore), "DIRECTORY_WRITE_AUTHORITY_MISMATCH");
  fs.chmodSync(modeStore, 0o700);
  fs.chmodSync(path.join(modeStore, "segments"), 0o777);
  expectFailure(() => verifySegmentedJsonlV1(modeStore), "DIRECTORY_WRITE_AUTHORITY_MISMATCH");
  fs.chmodSync(path.join(modeStore, "segments"), 0o700);
  assert.equal(verifySegmentedJsonlV1(modeStore).total_records_verified, 300);

  const broadOutputParent = path.join(tmp, "broad-output-parent");
  fs.mkdirSync(broadOutputParent, { mode: 0o700 });
  fs.chmodSync(broadOutputParent, 0o777);
  const broadOutput = path.join(broadOutputParent, "out.jsonl");
  expectFailure(
    () => reconstructSegmentedJsonlV1ToFile(store, broadOutput),
    "DIRECTORY_WRITE_AUTHORITY_MISMATCH",
  );
  assert.equal(fs.existsSync(broadOutput), false, "broadly writable output parent must not receive reconstruction output");

  // Intermediate symlink ancestry must never become an accepted store authority.
  const realParent = path.join(tmp, "real-parent");
  const aliasParent = path.join(tmp, "alias-parent");
  fs.mkdirSync(realParent);
  fs.symlinkSync(realParent, aliasParent, "dir");
  const realStore = path.join(realParent, "store");
  buildSegmentedJsonlV1FromFile(source, realStore, { segmentTargetBytes: 4096, maxRecordBytes: 1024 });
  expectFailure(() => verifySegmentedJsonlV1(path.join(aliasParent, "store")), "DIRECTORY_COMPONENT_OPEN_FAILED");

  const redirectedDestination = path.join(aliasParent, "new-store");
  expectFailure(
    () => buildSegmentedJsonlV1FromFile(source, redirectedDestination, { segmentTargetBytes: 4096, maxRecordBytes: 1024 }),
    "DIRECTORY_COMPONENT_OPEN_FAILED",
  );
  assert.equal(fs.existsSync(path.join(realParent, "new-store")), false, "build must not publish through symlink ancestry");

  const realOutputParent = path.join(tmp, "real-output");
  const aliasOutputParent = path.join(tmp, "alias-output");
  fs.mkdirSync(realOutputParent);
  fs.symlinkSync(realOutputParent, aliasOutputParent, "dir");
  expectFailure(
    () => reconstructSegmentedJsonlV1ToFile(store, path.join(aliasOutputParent, "out.jsonl")),
    "DIRECTORY_COMPONENT_OPEN_FAILED",
  );
  assert.equal(fs.existsSync(path.join(realOutputParent, "out.jsonl")), false, "reconstruct must not publish through symlink ancestry");

  // After the exact segments directory is retained, replacing its public name
  // must not redirect the first sealed write into an attacker-controlled tree.
  const racedStore = path.join(tmp, "raced-store");
  const detachedSegments = path.join(tmp, "detached-segments");
  const foreignSegments = path.join(tmp, "foreign-segments");
  fs.mkdirSync(foreignSegments);
  const originalOpenSync = (mutableFs as any).openSync;
  let swapped = false;
  try {
    (mutableFs as any).openSync = (...args: any[]) => {
      const candidate = typeof args[0] === "string" ? String(args[0]) : "";
      const flags = typeof args[1] === "number" ? args[1] : 0;
      if (!swapped && candidate.includes("/proc/self/fd/") && candidate.endsWith("/000000000000.jsonl") && (flags & fs.constants.O_EXCL) !== 0) {
        fs.renameSync(path.join(racedStore, "segments"), detachedSegments);
        fs.symlinkSync(foreignSegments, path.join(racedStore, "segments"), "dir");
        swapped = true;
      }
      return originalOpenSync(...args);
    };
    syncBuiltinESMExports();
    expectFailure(
      () => buildSegmentedJsonlV1FromFile(source, racedStore, { segmentTargetBytes: 4096, maxRecordBytes: 1024 }),
      "DIRECTORY_AUTHORITY_CHANGED",
    );
  } finally {
    (mutableFs as any).openSync = originalOpenSync;
    syncBuiltinESMExports();
  }
  assert.equal(swapped, true, "segments public name must be swapped at the retained-fd write boundary");
  assert.deepEqual(fs.readdirSync(foreignSegments), [], "retained directory fd must prevent redirected sealed writes");

  // Replacing the segments entry with a symlink before read admission must fail.
  const readStore = path.join(tmp, "read-store");
  buildSegmentedJsonlV1FromFile(source, readStore, { segmentTargetBytes: 4096, maxRecordBytes: 1024 });
  const readDetached = path.join(tmp, "read-detached");
  const readForeign = path.join(tmp, "read-foreign");
  fs.mkdirSync(readForeign);
  fs.renameSync(path.join(readStore, "segments"), readDetached);
  fs.symlinkSync(readForeign, path.join(readStore, "segments"), "dir");
  expectFailure(() => verifySegmentedJsonlV1(readStore), "DIRECTORY_CHILD_OPEN_FAILED");

  console.log("broadly_writable_store_rejected=true");
  console.log("broadly_writable_new_root_parent_rejected=true");
  console.log("store_write_authority_mode_bound=true");
  console.log("segments_write_authority_mode_bound=true");
  console.log("broadly_writable_output_parent_rejected=true");
  console.log("intermediate_symlink_store_rejected=true");
  console.log("intermediate_symlink_build_rejected=true");
  console.log("intermediate_symlink_output_rejected=true");
  console.log("retained_segments_generation_prevents_redirected_write=true");
  console.log("symlinked_segments_read_rejected=true");
  console.log("VOID_SEGMENTED_JSONL_PARENT_NAMESPACE_V1_PROOF_GREEN");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
