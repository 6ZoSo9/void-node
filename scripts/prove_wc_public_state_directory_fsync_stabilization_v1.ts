import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const authority = await import(
  "../src/economic/wc_public_state_directory_authority_v1.js"
);

function fixture(label: string): {
  parent: string;
  root: string;
  target: string;
} {
  const parent = fs.mkdtempSync(
    path.join(os.tmpdir(), `void-wc-dir-fsync-${label}-`),
  );
  fs.chmodSync(parent, 0o700);
  const root = path.join(parent, "data");
  fs.mkdirSync(root, { mode: 0o700 });
  const target = path.join(root, "wc_v1", "proof");
  return { parent, root, target };
}

const metadata = fixture("metadata");
const originalFsyncSync = fs.fsyncSync;
let metadataEpochInjectionCount = 0;

try {
  (fs as any).fsyncSync = (fd: number): void => {
    originalFsyncSync(fd);
    if (metadataEpochInjectionCount !== 0) return;
    metadataEpochInjectionCount += 1;
    const future = new Date(Date.now() + 60_000);
    fs.futimesSync(fd, future, future);
  };

  const identity =
    authority.ensureWcPublicStateDurableDirectoryV1(
      metadata.target,
      metadata.root,
    );
  assert.equal(metadataEpochInjectionCount, 1);
  assert.match(identity.dev, /^\d+$/u);
  assert.match(identity.ino, /^\d+$/u);
  assert.equal(fs.lstatSync(metadata.target).isDirectory(), true);
} finally {
  (fs as any).fsyncSync = originalFsyncSync;
}

const replacement = fixture("replacement");
let replacementTriggered = false;
const retired = `${replacement.target}.retired`;

assert.throws(
  () =>
    authority.ensureWcPublicStateDurableDirectoryV1(
      replacement.target,
      replacement.root,
      (phase, _parent, child) => {
        if (
          phase !== "after"
          || child !== replacement.target
          || replacementTriggered
        ) {
          return;
        }
        replacementTriggered = true;
        fs.renameSync(replacement.target, retired);
        fs.mkdirSync(replacement.target, { mode: 0o700 });
      },
    ),
  /wc_public_state_directory_generation_changed/u,
);
assert.equal(replacementTriggered, true);
assert.equal(fs.lstatSync(retired).isDirectory(), true);
assert.equal(fs.lstatSync(replacement.target).isDirectory(), true);

fs.rmSync(metadata.parent, { recursive: true, force: true });
fs.rmSync(replacement.parent, { recursive: true, force: true });

console.log(
  "VOID_WC_PUBLIC_STATE_DIRECTORY_FSYNC_STABILIZATION_V1_GREEN",
);
console.log("metadata_only_post_fsync_epoch_change_recovered=true");
console.log("actual_child_replacement_rejected=true");
console.log("bounded_fsync_stabilization=true");
console.log("directory_generation_authority_preserved=true");
console.log("work_credit_mutation=false");
console.log("wallet_or_signer_access=false");
console.log("settlement_or_funds_movement=false");
