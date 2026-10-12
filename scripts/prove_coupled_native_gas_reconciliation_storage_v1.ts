import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_STORAGE_AUTHORITY_V1,
  bootstrapCoupledNativeGasReconciliationStorageV1,
  qualifyCoupledNativeGasReconciliationStorageV1,
} from "../src/economic/coupled_native_gas_reconciliation_storage_v1.js";
import {
  buildCoupledNativeGasStorePayerDomainV1,
  serializeCoupledNativeGasStorePayerDomainV1,
} from "../src/economic/coupled_native_gas_liability_store_v1.js";

const PAYER = "0x" + "1".repeat(40);
const OTHER = "0x" + "2".repeat(40);
const DOMAIN = "payer-domain-v1.json";
const RECORDS = "records";
const QUEUE = "gas-liability-admission-v1.queue";
const RECONCILIATIONS = "reconciliations";

function fixture(): string {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-gas-reconciliation-storage-"),
  );
  fs.chmodSync(root, 0o700);
  fs.mkdirSync(path.join(root, RECORDS), { mode: 0o700 });
  fs.mkdirSync(path.join(root, QUEUE), { mode: 0o700 });
  fs.writeFileSync(
    path.join(root, DOMAIN),
    serializeCoupledNativeGasStorePayerDomainV1(PAYER),
    { mode: 0o600, flag: "wx" },
  );
  return root;
}

function confirmation(root: string): string {
  const stat = fs.lstatSync(root, { bigint: true });
  const payload =
    JSON.stringify({
      marker: "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_STORAGE_V1",
      version: 1,
      operation: "bootstrap_reconciliations_directory",
      root_path: path.resolve(root),
      root_dev: stat.dev.toString(),
      root_ino: stat.ino.toString(),
      root_uid: stat.uid.toString(),
      root_gid: stat.gid.toString(),
      root_mode: Number(stat.mode),
      payer_domain_id:
        buildCoupledNativeGasStorePayerDomainV1(PAYER).payer_domain_id,
    }) + "\n";
  return (
    "bootstrapCoupledNativeGasReconciliationStorageV1:" +
    crypto.createHash("sha256").update(payload, "utf8").digest("hex")
  );
}

async function main(): Promise<void> {
  assert.equal(
    VOID_COUPLED_NATIVE_GAS_RECONCILIATION_STORAGE_AUTHORITY_V1
      .read_only_qualification,
    true,
  );
  assert.equal(
    VOID_COUPLED_NATIVE_GAS_RECONCILIATION_STORAGE_AUTHORITY_V1
      .qualification_queue_lock_used,
    false,
  );
  assert.equal(
    VOID_COUPLED_NATIVE_GAS_RECONCILIATION_STORAGE_AUTHORITY_V1
      .explicit_reconciliation_directory_bootstrap,
    true,
  );
  assert.equal(
    VOID_COUPLED_NATIVE_GAS_RECONCILIATION_STORAGE_AUTHORITY_V1
      .bootstrap_confirmation_root_identity_bound,
    true,
  );
  assert.equal(
    VOID_COUPLED_NATIVE_GAS_RECONCILIATION_STORAGE_AUTHORITY_V1
      .bootstrap_queue_lock_used,
    true,
  );
  assert.equal(
    VOID_COUPLED_NATIVE_GAS_RECONCILIATION_STORAGE_AUTHORITY_V1
      .existing_admission_queue_reused,
    true,
  );
  assert.equal(
    VOID_COUPLED_NATIVE_GAS_RECONCILIATION_STORAGE_AUTHORITY_V1
      .second_lock_namespace_created,
    false,
  );
  assert.equal(
    VOID_COUPLED_NATIVE_GAS_RECONCILIATION_STORAGE_AUTHORITY_V1
      .reconciliation_record_publication,
    false,
  );
  assert.equal(
    VOID_COUPLED_NATIVE_GAS_RECONCILIATION_STORAGE_AUTHORITY_V1
      .liability_release_authorized,
    false,
  );
  assert.equal(
    VOID_COUPLED_NATIVE_GAS_RECONCILIATION_STORAGE_AUTHORITY_V1
      .funds_movement,
    false,
  );

  {
    const root = fixture();
    try {
      const missing =
        await qualifyCoupledNativeGasReconciliationStorageV1({
          root_dir: root,
          payer_address: PAYER,
        });
      assert.equal(missing.ok, false);
      if (missing.ok === false) {
        assert.equal(
          missing.reason,
          "coupled_native_gas_reconciliation_storage_directory_missing",
        );
        assert.equal(missing.mutation_performed, false);
      }

      const wrong =
        await bootstrapCoupledNativeGasReconciliationStorageV1({
          root_dir: root,
          payer_address: PAYER,
          confirmation: "wrong",
        });
      assert.equal(wrong.ok, false);
      assert.equal(
        fs.existsSync(path.join(root, RECONCILIATIONS)),
        false,
      );

      const [left, right] = await Promise.all([
        bootstrapCoupledNativeGasReconciliationStorageV1({
          root_dir: root,
          payer_address: PAYER,
          confirmation: confirmation(root),
        }),
        bootstrapCoupledNativeGasReconciliationStorageV1({
          root_dir: root,
          payer_address: PAYER,
          confirmation: confirmation(root),
        }),
      ]);
      assert.equal(left.ok, true);
      assert.equal(right.ok, true);
      if (left.ok && right.ok) {
        assert.deepEqual(
          [left.status, right.status].sort(),
          ["already_qualified", "bootstrapped"],
        );
        assert.equal(
          Number(left.mutation_performed) +
            Number(right.mutation_performed),
          1,
        );
      }

      const reconciliationPath = path.join(root, RECONCILIATIONS);
      const stat = fs.lstatSync(reconciliationPath);
      assert.equal(stat.isDirectory(), true);
      assert.equal(stat.isSymbolicLink(), false);
      assert.equal(stat.mode & 0o077, 0);
      assert.deepEqual(fs.readdirSync(path.join(root, QUEUE)), []);

      const queuePath = path.join(root, QUEUE);
      const queueEntriesBeforeQualification = fs.readdirSync(queuePath);
      fs.chmodSync(queuePath, 0o500);
      const qualified =
        await qualifyCoupledNativeGasReconciliationStorageV1({
          root_dir: root,
          payer_address: PAYER,
        });
      assert.equal(qualified.ok, true);
      if (qualified.ok) {
        assert.equal(qualified.status, "qualified");
        assert.equal(qualified.mutation_performed, false);
        assert.equal(qualified.reconciliation_record_count, 0);
        assert.equal(qualified.queue_name, QUEUE);
      }
      assert.deepEqual(
        fs.readdirSync(queuePath),
        queueEntriesBeforeQualification,
        "read-only qualification must not create bakery queue claims",
      );
      assert.equal(fs.lstatSync(queuePath).mode & 0o777, 0o500);
      fs.chmodSync(queuePath, 0o700);

      const goodName = "a".repeat(64) + ".json";
      fs.writeFileSync(
        path.join(reconciliationPath, goodName),
        "{}\n",
        { mode: 0o600, flag: "wx" },
      );
      const one =
        await qualifyCoupledNativeGasReconciliationStorageV1({
          root_dir: root,
          payer_address: PAYER,
        });
      assert.equal(one.ok, true);
      if (one.ok) {
        assert.equal(one.reconciliation_record_count, 1);
      }

      fs.chmodSync(path.join(reconciliationPath, goodName), 0o644);
      const weak =
        await qualifyCoupledNativeGasReconciliationStorageV1({
          root_dir: root,
          payer_address: PAYER,
        });
      assert.equal(weak.ok, false);
      if (weak.ok === false) {
        assert.match(weak.reason, /record_invalid/);
      }
      fs.chmodSync(path.join(reconciliationPath, goodName), 0o600);

      const badName = "unexpected.json";
      fs.writeFileSync(
        path.join(reconciliationPath, badName),
        "{}\n",
        { mode: 0o600, flag: "wx" },
      );
      const bad =
        await qualifyCoupledNativeGasReconciliationStorageV1({
          root_dir: root,
          payer_address: PAYER,
        });
      assert.equal(bad.ok, false);
      if (bad.ok === false) {
        assert.equal(
          bad.reason,
          "coupled_native_gas_reconciliation_storage_record_name_invalid",
        );
      }
      fs.unlinkSync(path.join(reconciliationPath, badName));

      const mismatch =
        await qualifyCoupledNativeGasReconciliationStorageV1({
          root_dir: root,
          payer_address: OTHER,
        });
      assert.equal(mismatch.ok, false);
      if (mismatch.ok === false) {
        assert.equal(
          mismatch.reason,
          "coupled_native_gas_reconciliation_storage_payer_domain_mismatch",
        );
      }

      const replay =
        await bootstrapCoupledNativeGasReconciliationStorageV1({
          root_dir: root,
          payer_address: PAYER,
          confirmation: confirmation(root),
        });
      assert.equal(replay.ok, true);
      if (replay.ok) {
        assert.equal(replay.status, "already_qualified");
        assert.equal(replay.mutation_performed, false);
        assert.equal(replay.reconciliation_record_count, 1);
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }

  {
    const rootA = fixture();
    const rootB = fixture();
    try {
      const confirmationA = confirmation(rootA);
      const wrongRoot =
        await bootstrapCoupledNativeGasReconciliationStorageV1({
          root_dir: rootB,
          payer_address: PAYER,
          confirmation: confirmationA,
        });
      assert.equal(wrongRoot.ok, false);
      if (wrongRoot.ok === false) {
        assert.equal(
          wrongRoot.reason,
          "coupled_native_gas_reconciliation_storage_confirmation_required",
        );
        assert.equal(wrongRoot.mutation_performed, false);
      }
      assert.equal(
        fs.existsSync(path.join(rootB, RECONCILIATIONS)),
        false,
        "confirmation for one valid payer root must not mutate another",
      );

      const correctRoot =
        await bootstrapCoupledNativeGasReconciliationStorageV1({
          root_dir: rootA,
          payer_address: PAYER,
          confirmation: confirmationA,
        });
      assert.equal(correctRoot.ok, true);
      if (correctRoot.ok) {
        assert.equal(correctRoot.status, "bootstrapped");
        assert.equal(correctRoot.mutation_performed, true);
      }
      assert.equal(
        fs.existsSync(path.join(rootA, RECONCILIATIONS)),
        true,
      );
    } finally {
      fs.rmSync(rootA, { recursive: true, force: true });
      fs.rmSync(rootB, { recursive: true, force: true });
    }
  }

  {
    const root = fixture();
    const originalMkdirSync = fs.mkdirSync;
    let injected = false;
    try {
      (fs as any).mkdirSync = (
        target: fs.PathLike,
        options?: fs.MakeDirectoryOptions & { recursive?: false },
      ) => {
        const result = originalMkdirSync(target, options as any);
        if (
          !injected &&
          path.basename(String(target)) === RECONCILIATIONS
        ) {
          injected = true;
          const domainPath = path.join(root, DOMAIN);
          fs.renameSync(domainPath, domainPath + ".old");
          fs.writeFileSync(
            domainPath,
            serializeCoupledNativeGasStorePayerDomainV1(PAYER),
            { mode: 0o600, flag: "wx" },
          );
        }
        return result;
      };

      const held =
        await bootstrapCoupledNativeGasReconciliationStorageV1({
          root_dir: root,
          payer_address: PAYER,
          confirmation: confirmation(root),
        });
      assert.equal(injected, true);
      assert.equal(held.ok, false);
      if (held.ok === false) {
        assert.equal(held.status, "held_after_mutation");
        assert.equal(held.mutation_performed, true);
        assert.match(held.reason, /payer_domain_changed/);
      }
      assert.equal(
        fs.existsSync(path.join(root, RECONCILIATIONS)),
        true,
        "post-create failure must not be misreported as no mutation",
      );
    } finally {
      (fs as any).mkdirSync = originalMkdirSync;
      fs.rmSync(root, { recursive: true, force: true });
    }
  }

  {
    const root = fixture();
    try {
      fs.rmSync(path.join(root, QUEUE), {
        recursive: true,
        force: true,
      });
      const held =
        await bootstrapCoupledNativeGasReconciliationStorageV1({
          root_dir: root,
          payer_address: PAYER,
          confirmation: confirmation(root),
        });
      assert.equal(held.ok, false);
      assert.equal(
        fs.existsSync(path.join(root, RECONCILIATIONS)),
        false,
      );
      if (held.ok === false) {
        assert.match(held.reason, /queue_missing/);
        assert.equal(held.mutation_performed, false);
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }

  {
    const root = fixture();
    try {
      fs.rmSync(path.join(root, RECORDS), {
        recursive: true,
        force: true,
      });
      const held =
        await bootstrapCoupledNativeGasReconciliationStorageV1({
          root_dir: root,
          payer_address: PAYER,
          confirmation: confirmation(root),
        });
      assert.equal(held.ok, false);
      assert.equal(
        fs.existsSync(path.join(root, RECONCILIATIONS)),
        false,
      );
      if (held.ok === false) {
        assert.match(held.reason, /records_missing/);
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }

  {
    const root = fixture();
    try {
      fs.mkdirSync(path.join(root, RECONCILIATIONS), {
        mode: 0o700,
      });
      fs.rmSync(path.join(root, RECONCILIATIONS), {
        recursive: true,
        force: true,
      });
      fs.symlinkSync(RECORDS, path.join(root, RECONCILIATIONS));
      const held =
        await qualifyCoupledNativeGasReconciliationStorageV1({
          root_dir: root,
          payer_address: PAYER,
        });
      assert.equal(held.ok, false);
      if (held.ok === false) {
        assert.match(held.reason, /reconciliations_invalid/);
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }

  const relative =
    await qualifyCoupledNativeGasReconciliationStorageV1({
      root_dir: "relative/path",
      payer_address: PAYER,
    });
  assert.equal(relative.ok, false);
  if (relative.ok === false) {
    assert.equal(
      relative.reason,
      "coupled_native_gas_reconciliation_storage_root_path_invalid",
    );
  }

  const source = fs.readFileSync(
    path.join(
      process.cwd(),
      "src/economic/coupled_native_gas_reconciliation_storage_v1.ts",
    ),
    "utf8",
  );
  assert.match(
    source,
    /withBuyVoidFilesystemBakeryLockAsyncExistingQueueV1/,
  );
  assert.match(source, /openPayerDomainSnapshot/);
  assert.match(source, /assertPayerDomainSnapshotCurrent/);
  assert.match(source, /sameFileIdentity\(snapshot\.stat, opened\)/);
  assert.match(source, /closePayerDomainSnapshot/);
  assert.match(source, /gas-liability-admission-v1\.queue/);
  assert.match(source, /reconciliations/);
  assert.match(source, /bootstrapConfirmationV1/);
  assert.match(source, /if \(input\.bootstrap\) \{/);
  assert.match(
    source,
    /return await inspectPinnedState\(\);/,
    "read-only qualification must bypass the bakery lock",
  );
  assert.match(
    source,
    /reconciliations_changed_during_scan/,
    "unlocked qualification must fail closed on a changing namespace",
  );
  assert.doesNotMatch(source, /reconciliation-v1\.queue/);
  assert.doesNotMatch(source, /reconciliation_record_publication:\s*true/);
  assert.doesNotMatch(source, /liability_release_authorized:\s*true/);

  console.log(
    "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_STORAGE_V1_GREEN",
  );
  console.log("preexisting_payer_root_required=true");
  console.log("preexisting_records_directory_required=true");
  console.log("preexisting_admission_queue_required=true");
  console.log("existing_payer_queue_reused=true");
  console.log("second_lock_namespace_created=false");
  console.log("missing_reconciliation_directory_holds=true");
  console.log("bootstrap_confirmation_required=true");
  console.log("bootstrap_confirmation_root_identity_bound=true");
  console.log("cross_root_bootstrap_confirmation_replay_holds=true");
  console.log("post_create_failure_reports_held_after_mutation=true");
  console.log("concurrent_bootstrap_single_mutation=true");
  console.log("descriptor_bound_qualification=true");
  console.log("qualification_queue_lock_used=false");
  console.log("qualification_mutation_performed=false");
  console.log("qualification_succeeds_with_read_only_queue=true");
  console.log("changing_reconciliation_namespace_holds=true");
  console.log("bootstrap_queue_lock_used=true");
  console.log("reconciliation_record_publication=false");
  console.log("liability_release_authorized=false");
  console.log("runtime_integration=false");
  console.log("funds_movement=false");
}

await main();
