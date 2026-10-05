import fs from "node:fs";
import path from "node:path";

import {
  withBuyVoidFilesystemBakeryLockAsyncExistingQueueV1,
} from "./buy_void_filesystem_bakery_lock_v1.js";
import {
  buildCoupledNativeGasStorePayerDomainV1,
  serializeCoupledNativeGasStorePayerDomainV1,
} from "./coupled_native_gas_liability_store_v1.js";

export const VOID_COUPLED_NATIVE_GAS_RECONCILIATION_STORAGE_V1 =
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_STORAGE_V1";

export const VOID_COUPLED_NATIVE_GAS_RECONCILIATION_STORAGE_AUTHORITY_V1 =
  Object.freeze({
    source_storage_contract: true,
    payer_domain_binding_required: true,
    preexisting_root_required: true,
    preexisting_records_directory_required: true,
    preexisting_admission_queue_required: true,
    reconciliation_directory_qualification: true,
    read_only_qualification: true,
    qualification_queue_lock_used: false,
    explicit_reconciliation_directory_bootstrap: true,
    bootstrap_confirmation_required: true,
    bootstrap_queue_lock_used: true,
    existing_admission_queue_reused: true,
    second_lock_namespace_created: false,
    descriptor_bound_custody: true,
    reconciliation_record_structural_scan: true,
    reconciliation_record_content_authority: false,
    reconciliation_record_publication: false,
    terminal_evidence_provenance: false,
    effective_open_census_postcheck: false,
    liability_release_authorized: false,
    liability_store_mutation: false,
    runtime_integration: false,
    rpc_read: false,
    rpc_write: false,
    wallet_access: false,
    private_key_access: false,
    signing: false,
    transaction_construction: false,
    transaction_broadcast: false,
    chain2050_write: false,
    gas_spend: false,
    market_activation: false,
    public_presale_activation: false,
    inventory_movement: false,
    treasury_or_liquidity_movement: false,
    funds_movement: false,
  });

const DOMAIN_FILE = "payer-domain-v1.json";
const RECORDS_DIRECTORY = "records";
const QUEUE_DIRECTORY = "gas-liability-admission-v1.queue";
const RECONCILIATIONS_DIRECTORY = "reconciliations";
const MAX_DOMAIN_BYTES = 64 * 1024;
const MAX_RECONCILIATION_BYTES = 64 * 1024;
const MAX_RECONCILIATION_RECORDS = 100_000;
const RECONCILIATION_NAME = /^[0-9a-f]{64}\.json$/u;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const O_NOFOLLOW = fs.constants.O_NOFOLLOW;
const O_DIRECTORY = fs.constants.O_DIRECTORY;

type PinnedDirectoryV1 = {
  path: string;
  fd: number;
  stat: fs.BigIntStats;
  proc_path: string;
};

type PayerDomainSnapshotV1 = {
  path: string;
  fd: number;
  stat: fs.BigIntStats;
  bytes: Buffer;
  payer_domain_id: string;
};

export type CoupledNativeGasReconciliationStorageDecisionV1 =
  | {
      ok: true;
      status: "qualified" | "bootstrapped" | "already_qualified";
      mutation_performed: boolean;
      payer_address: string;
      payer_domain_id: string;
      reconciliation_directory: string;
      reconciliation_record_count: number;
      queue_name: typeof QUEUE_DIRECTORY;
      authority:
        typeof VOID_COUPLED_NATIVE_GAS_RECONCILIATION_STORAGE_AUTHORITY_V1;
    }
  | {
      ok: false;
      status: "held" | "held_after_mutation";
      reason: string;
      mutation_performed: boolean;
      authority:
        typeof VOID_COUPLED_NATIVE_GAS_RECONCILIATION_STORAGE_AUTHORITY_V1;
    };

function held(
  reason: string,
  mutationPerformed = false,
): Extract<CoupledNativeGasReconciliationStorageDecisionV1, { ok: false }> {
  return Object.freeze({
    ok: false,
    status: mutationPerformed ? "held_after_mutation" : "held",
    reason,
    mutation_performed: mutationPerformed,
    authority:
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_STORAGE_AUTHORITY_V1,
  });
}

function fail(code: string): never {
  throw new Error(code);
}

function normalizedAddress(value: unknown): string {
  const address = String(value ?? "").trim().toLowerCase();
  return ADDRESS.test(address) ? address : "";
}

function isMissing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === "ENOENT";
}

function requireDescriptorSafety(): void {
  if (
    typeof O_NOFOLLOW !== "number" ||
    typeof O_DIRECTORY !== "number" ||
    !fs.existsSync("/proc/self/fd")
  ) {
    fail("coupled_native_gas_reconciliation_storage_descriptor_safety_unavailable");
  }
}

function sameDirectoryIdentity(
  left: fs.BigIntStats,
  right: fs.BigIntStats,
): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode
  );
}

function sameDirectorySnapshot(
  left: fs.BigIntStats,
  right: fs.BigIntStats,
): boolean {
  return (
    sameDirectoryIdentity(left, right) &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs &&
    left.nlink === right.nlink
  );
}

function sameFileIdentity(
  left: fs.BigIntStats,
  right: fs.BigIntStats,
): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode &&
    left.nlink === right.nlink
  );
}

function validatePrivateDirectory(
  stat: fs.BigIntStats,
  code: string,
): void {
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    (
      typeof process.getuid === "function" &&
      stat.uid !== BigInt(process.getuid())
    ) ||
    (Number(stat.mode) & 0o077) !== 0
  ) {
    fail(code);
  }
}

function validatePrivateFile(
  stat: fs.BigIntStats,
  code: string,
  maxBytes: number,
): void {
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.nlink !== 1n ||
    stat.size < 2n ||
    stat.size > BigInt(maxBytes) ||
    (
      typeof process.getuid === "function" &&
      stat.uid !== BigInt(process.getuid())
    ) ||
    (Number(stat.mode) & 0o077) !== 0
  ) {
    fail(code);
  }
}

function openPinnedDirectory(
  rawPath: string,
  code: string,
): PinnedDirectoryV1 {
  requireDescriptorSafety();
  const raw = String(rawPath || "").trim();
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
    fail(code + "_path_invalid");
  }
  const resolved = path.resolve(raw);
  let visible: fs.BigIntStats;
  try {
    visible = fs.lstatSync(resolved, { bigint: true });
  } catch (error) {
    if (isMissing(error)) fail(code + "_missing");
    throw error;
  }
  validatePrivateDirectory(visible, code + "_invalid");
  const fd = fs.openSync(
    resolved,
    fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
  );
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    validatePrivateDirectory(opened, code + "_invalid");
    if (!sameDirectoryIdentity(visible, opened)) {
      fail(code + "_changed");
    }
    return {
      path: resolved,
      fd,
      stat: opened,
      proc_path: "/proc/self/fd/" + String(fd),
    };
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
}

function assertPinnedDirectoryVisible(
  directory: PinnedDirectoryV1,
  code: string,
): void {
  const opened = fs.fstatSync(directory.fd, { bigint: true });
  const visible = fs.lstatSync(directory.path, { bigint: true });
  validatePrivateDirectory(opened, code + "_invalid");
  validatePrivateDirectory(visible, code + "_invalid");
  if (
    !sameDirectoryIdentity(directory.stat, opened) ||
    !sameDirectoryIdentity(opened, visible)
  ) {
    fail(code + "_changed");
  }
}

function openPinnedChildDirectory(
  parent: PinnedDirectoryV1,
  name: string,
  code: string,
): PinnedDirectoryV1 {
  assertPinnedDirectoryVisible(parent, code + "_parent");
  const visiblePath = path.join(parent.path, name);
  const pinnedPath = path.join(parent.proc_path, name);
  let visible: fs.BigIntStats;
  try {
    visible = fs.lstatSync(visiblePath, { bigint: true });
  } catch (error) {
    if (isMissing(error)) fail(code + "_missing");
    throw error;
  }
  validatePrivateDirectory(visible, code + "_invalid");
  const fd = fs.openSync(
    pinnedPath,
    fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
  );
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    validatePrivateDirectory(opened, code + "_invalid");
    if (!sameDirectoryIdentity(visible, opened)) {
      fail(code + "_path_not_bound");
    }
    assertPinnedDirectoryVisible(parent, code + "_parent");
    return {
      path: visiblePath,
      fd,
      stat: opened,
      proc_path: "/proc/self/fd/" + String(fd),
    };
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
}

function closePinned(directory: PinnedDirectoryV1 | null): void {
  if (!directory) return;
  try {
    fs.closeSync(directory.fd);
  } catch (error) {
    void error;
  }
}

function readPinnedFileBytes(
  fd: number,
  size: bigint,
  code: string,
): Buffer {
  const length = Number(size);
  if (!Number.isSafeInteger(length) || length < 2) {
    fail(code + "_size_invalid");
  }
  const bytes = Buffer.alloc(length);
  let offset = 0;
  while (offset < bytes.length) {
    const count = fs.readSync(
      fd,
      bytes,
      offset,
      bytes.length - offset,
      offset,
    );
    if (count <= 0) fail(code + "_short_read");
    offset += count;
  }
  return bytes;
}

function openPayerDomainSnapshot(
  root: PinnedDirectoryV1,
  payerAddress: string,
): PayerDomainSnapshotV1 {
  assertPinnedDirectoryVisible(
    root,
    "coupled_native_gas_reconciliation_storage_root",
  );
  const visiblePath = path.join(root.path, DOMAIN_FILE);
  const pinnedPath = path.join(root.proc_path, DOMAIN_FILE);
  let visible: fs.BigIntStats;
  try {
    visible = fs.lstatSync(visiblePath, { bigint: true });
  } catch (error) {
    if (isMissing(error)) {
      fail("coupled_native_gas_reconciliation_storage_payer_domain_missing");
    }
    throw error;
  }
  validatePrivateFile(
    visible,
    "coupled_native_gas_reconciliation_storage_payer_domain_invalid",
    MAX_DOMAIN_BYTES,
  );
  const fd = fs.openSync(
    pinnedPath,
    fs.constants.O_RDONLY | O_NOFOLLOW,
  );
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    validatePrivateFile(
      opened,
      "coupled_native_gas_reconciliation_storage_payer_domain_invalid",
      MAX_DOMAIN_BYTES,
    );
    if (!sameFileIdentity(visible, opened)) {
      fail(
        "coupled_native_gas_reconciliation_storage_payer_domain_path_not_bound",
      );
    }
    const bytes = readPinnedFileBytes(
      fd,
      opened.size,
      "coupled_native_gas_reconciliation_storage_payer_domain",
    );
    const after = fs.fstatSync(fd, { bigint: true });
    const visibleAfter = fs.lstatSync(visiblePath, { bigint: true });
    if (
      !sameFileIdentity(opened, after) ||
      !sameFileIdentity(after, visibleAfter)
    ) {
      fail(
        "coupled_native_gas_reconciliation_storage_payer_domain_changed",
      );
    }
    const expected = Buffer.from(
      serializeCoupledNativeGasStorePayerDomainV1(payerAddress),
      "utf8",
    );
    if (!bytes.equals(expected)) {
      fail(
        "coupled_native_gas_reconciliation_storage_payer_domain_mismatch",
      );
    }
    const domain = buildCoupledNativeGasStorePayerDomainV1(payerAddress);
    return {
      path: visiblePath,
      fd,
      stat: after,
      bytes,
      payer_domain_id: domain.payer_domain_id,
    };
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
}

function assertPayerDomainSnapshotCurrent(
  root: PinnedDirectoryV1,
  snapshot: PayerDomainSnapshotV1,
  payerAddress: string,
): void {
  assertPinnedDirectoryVisible(
    root,
    "coupled_native_gas_reconciliation_storage_root",
  );
  const opened = fs.fstatSync(snapshot.fd, { bigint: true });
  const visible = fs.lstatSync(snapshot.path, { bigint: true });
  validatePrivateFile(
    opened,
    "coupled_native_gas_reconciliation_storage_payer_domain_invalid",
    MAX_DOMAIN_BYTES,
  );
  validatePrivateFile(
    visible,
    "coupled_native_gas_reconciliation_storage_payer_domain_invalid",
    MAX_DOMAIN_BYTES,
  );
  if (
    !sameFileIdentity(snapshot.stat, opened) ||
    !sameFileIdentity(opened, visible)
  ) {
    fail(
      "coupled_native_gas_reconciliation_storage_payer_domain_changed",
    );
  }
  const bytes = readPinnedFileBytes(
    snapshot.fd,
    opened.size,
    "coupled_native_gas_reconciliation_storage_payer_domain",
  );
  const after = fs.fstatSync(snapshot.fd, { bigint: true });
  const visibleAfter = fs.lstatSync(snapshot.path, { bigint: true });
  if (
    !sameFileIdentity(opened, after) ||
    !sameFileIdentity(after, visibleAfter) ||
    !bytes.equals(snapshot.bytes) ||
    !bytes.equals(
      Buffer.from(
        serializeCoupledNativeGasStorePayerDomainV1(payerAddress),
        "utf8",
      ),
    )
  ) {
    fail(
      "coupled_native_gas_reconciliation_storage_payer_domain_changed",
    );
  }
}

function closePayerDomainSnapshot(
  snapshot: PayerDomainSnapshotV1 | null,
): void {
  if (!snapshot) return;
  try {
    fs.closeSync(snapshot.fd);
  } catch (error) {
    void error;
  }
}

function reconciliationDirectoryExists(
  root: PinnedDirectoryV1,
): boolean {
  try {
    fs.lstatSync(
      path.join(root.proc_path, RECONCILIATIONS_DIRECTORY),
      { bigint: true },
    );
    return true;
  } catch (error) {
    if (isMissing(error)) return false;
    throw error;
  }
}

function scanReconciliationDirectory(
  directory: PinnedDirectoryV1,
): number {
  assertPinnedDirectoryVisible(
    directory,
    "coupled_native_gas_reconciliation_storage_reconciliations",
  );
  const before = fs.fstatSync(directory.fd, { bigint: true });
  validatePrivateDirectory(
    before,
    "coupled_native_gas_reconciliation_storage_reconciliations_invalid",
  );
  if (!sameDirectoryIdentity(directory.stat, before)) {
    fail(
      "coupled_native_gas_reconciliation_storage_reconciliations_changed",
    );
  }

  const names = fs.readdirSync(directory.proc_path).sort();
  if (names.length > MAX_RECONCILIATION_RECORDS) {
    fail("coupled_native_gas_reconciliation_storage_record_count_exceeded");
  }
  for (const name of names) {
    if (!RECONCILIATION_NAME.test(name)) {
      fail("coupled_native_gas_reconciliation_storage_record_name_invalid");
    }
    const visiblePath = path.join(directory.path, name);
    const pinnedPath = path.join(directory.proc_path, name);
    const visible = fs.lstatSync(visiblePath, { bigint: true });
    validatePrivateFile(
      visible,
      "coupled_native_gas_reconciliation_storage_record_invalid",
      MAX_RECONCILIATION_BYTES,
    );
    const fd = fs.openSync(
      pinnedPath,
      fs.constants.O_RDONLY | O_NOFOLLOW,
    );
    try {
      const opened = fs.fstatSync(fd, { bigint: true });
      validatePrivateFile(
        opened,
        "coupled_native_gas_reconciliation_storage_record_invalid",
        MAX_RECONCILIATION_BYTES,
      );
      if (!sameFileIdentity(visible, opened)) {
        fail("coupled_native_gas_reconciliation_storage_record_path_not_bound");
      }
      const after = fs.fstatSync(fd, { bigint: true });
      const visibleAfter = fs.lstatSync(visiblePath, { bigint: true });
      if (
        !sameFileIdentity(opened, after) ||
        !sameFileIdentity(after, visibleAfter)
      ) {
        fail("coupled_native_gas_reconciliation_storage_record_changed");
      }
    } finally {
      fs.closeSync(fd);
    }
  }

  const after = fs.fstatSync(directory.fd, { bigint: true });
  const visibleAfter = fs.lstatSync(directory.path, { bigint: true });
  validatePrivateDirectory(
    after,
    "coupled_native_gas_reconciliation_storage_reconciliations_invalid",
  );
  validatePrivateDirectory(
    visibleAfter,
    "coupled_native_gas_reconciliation_storage_reconciliations_invalid",
  );
  if (
    !sameDirectorySnapshot(before, after) ||
    !sameDirectorySnapshot(after, visibleAfter)
  ) {
    fail(
      "coupled_native_gas_reconciliation_storage_reconciliations_changed_during_scan",
    );
  }
  return names.length;
}

async function inspectStorage(input: {
  root_dir: string;
  payer_address: string;
  bootstrap: boolean;
  confirmation?: string;
}): Promise<CoupledNativeGasReconciliationStorageDecisionV1> {
  let root: PinnedDirectoryV1 | null = null;
  let records: PinnedDirectoryV1 | null = null;
  let queue: PinnedDirectoryV1 | null = null;
  let reconciliation: PinnedDirectoryV1 | null = null;
  let payerDomain: PayerDomainSnapshotV1 | null = null;
  let mutationPerformed = false;
  try {
    const payerAddress = normalizedAddress(input?.payer_address);
    if (!payerAddress) {
      fail("coupled_native_gas_reconciliation_storage_payer_address_invalid");
    }

    root = openPinnedDirectory(
      String(input?.root_dir || "").trim(),
      "coupled_native_gas_reconciliation_storage_root",
    );
    records = openPinnedChildDirectory(
      root,
      RECORDS_DIRECTORY,
      "coupled_native_gas_reconciliation_storage_records",
    );
    queue = openPinnedChildDirectory(
      root,
      QUEUE_DIRECTORY,
      "coupled_native_gas_reconciliation_storage_queue",
    );

    const inspectPinnedState = async () => {
        assertPinnedDirectoryVisible(
          root!,
          "coupled_native_gas_reconciliation_storage_root",
        );
        assertPinnedDirectoryVisible(
          records!,
          "coupled_native_gas_reconciliation_storage_records",
        );
        assertPinnedDirectoryVisible(
          queue!,
          "coupled_native_gas_reconciliation_storage_queue",
        );

        payerDomain = openPayerDomainSnapshot(root!, payerAddress);

        if (!reconciliationDirectoryExists(root!)) {
          if (!input.bootstrap) {
            return held(
              "coupled_native_gas_reconciliation_storage_directory_missing",
            );
          }
          const requiredConfirmation =
            "bootstrapCoupledNativeGasReconciliationStorageV1:" +
            payerDomain.payer_domain_id;
          if (input.confirmation !== requiredConfirmation) {
            return held(
              "coupled_native_gas_reconciliation_storage_confirmation_required",
            );
          }
          fs.mkdirSync(
            path.join(root!.proc_path, RECONCILIATIONS_DIRECTORY),
            { mode: 0o700 },
          );
          mutationPerformed = true;
          fs.fsyncSync(root!.fd);
        }

        reconciliation = openPinnedChildDirectory(
          root!,
          RECONCILIATIONS_DIRECTORY,
          "coupled_native_gas_reconciliation_storage_reconciliations",
        );
        const count = scanReconciliationDirectory(reconciliation);

        assertPinnedDirectoryVisible(
          root!,
          "coupled_native_gas_reconciliation_storage_root",
        );
        assertPinnedDirectoryVisible(
          records!,
          "coupled_native_gas_reconciliation_storage_records",
        );
        assertPinnedDirectoryVisible(
          queue!,
          "coupled_native_gas_reconciliation_storage_queue",
        );
        assertPinnedDirectoryVisible(
          reconciliation,
          "coupled_native_gas_reconciliation_storage_reconciliations",
        );
        assertPayerDomainSnapshotCurrent(
          root!,
          payerDomain!,
          payerAddress,
        );

        return Object.freeze({
          ok: true,
          status: mutationPerformed
            ? "bootstrapped"
            : input.bootstrap
              ? "already_qualified"
              : "qualified",
          mutation_performed: mutationPerformed,
          payer_address: payerAddress,
          payer_domain_id: payerDomain.payer_domain_id,
          reconciliation_directory: reconciliation.path,
          reconciliation_record_count: count,
          queue_name: QUEUE_DIRECTORY,
          authority:
            VOID_COUPLED_NATIVE_GAS_RECONCILIATION_STORAGE_AUTHORITY_V1,
        });
    };

    if (input.bootstrap) {
      return await withBuyVoidFilesystemBakeryLockAsyncExistingQueueV1(
        queue.proc_path,
        inspectPinnedState,
      );
    }
    return await inspectPinnedState();
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "coupled_native_gas_reconciliation_storage_failed",
      mutationPerformed,
    );
  } finally {
    closePayerDomainSnapshot(payerDomain);
    closePinned(reconciliation);
    closePinned(queue);
    closePinned(records);
    closePinned(root);
  }
}

export async function qualifyCoupledNativeGasReconciliationStorageV1(input: {
  root_dir: string;
  payer_address: string;
}): Promise<CoupledNativeGasReconciliationStorageDecisionV1> {
  return inspectStorage({
    root_dir: input?.root_dir,
    payer_address: input?.payer_address,
    bootstrap: false,
  });
}

export async function bootstrapCoupledNativeGasReconciliationStorageV1(input: {
  root_dir: string;
  payer_address: string;
  confirmation: string;
}): Promise<CoupledNativeGasReconciliationStorageDecisionV1> {
  return inspectStorage({
    root_dir: input?.root_dir,
    payer_address: input?.payer_address,
    bootstrap: true,
    confirmation: input?.confirmation,
  });
}
