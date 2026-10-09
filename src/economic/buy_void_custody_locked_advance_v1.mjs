import { types as utilTypes } from "node:util";
import {
  createBuyVoidCustodyLaunchHighWaterWriterV1,
  createBuyVoidCustodyLaunchHighWaterPermanentlyFencedWriterV1,
  testOnlyCreateBuyVoidCustodyPermanentlyFencedWriterV1,
} from "./buy_void_custody_launch_high_water_writer_v1.mjs";
import {
  withBuyVoidCustodyHighWaterExclusiveLockV1,
} from "./buy_void_custody_high_water_exclusive_lock_v1.mjs";

// Source-only composition. This module is not mounted into any production service.
export const VOID_BUY_VOID_CUSTODY_LOCKED_ADVANCE_V1 =
  "VOID_BUY_VOID_CUSTODY_LOCKED_ADVANCE_V1";
export const VOID_BUY_VOID_CUSTODY_LOCKED_ADVANCE_AUTHORITY_V1 = Object.freeze({
  source_only_unmounted: true,
  single_private_directory_lock_around_advance: true,
  inspect_remains_read_only: true,
  lock_collision_fails_closed: true,
  callback_failure_retains_lock_for_recovery: true,
  stale_lock_automatic_takeover: false,
  uncertain_release_recovery_qualified: false,
  production_uid_path_and_ipc_qualified: false,
  payment_allocation_runtime_mounted: false,
  production_allocation_mutation_ready: false,
  presale_activation: false,
  funds_movement: false,
});
const FIELDS = [
  "activation_receipt_path", "custody_root", "generation_journal_path",
];

function snapshotTrustedConfig(raw) {
  if (!raw || typeof raw !== "object" || utilTypes.isProxy(raw) ||
      Array.isArray(raw)) {
    throw new Error("custody_locked_advance_config_invalid");
  }
  const proto = Object.getPrototypeOf(raw);
  if (proto !== Object.prototype && proto !== null) {
    throw new Error("custody_locked_advance_config_invalid");
  }
  const keys = Reflect.ownKeys(raw);
  if (keys.length !== FIELDS.length ||
      keys.some((value) => typeof value !== "string" ||
        !FIELDS.includes(value))) {
    throw new Error("custody_locked_advance_config_invalid");
  }
  const out = Object.create(null);
  for (const key of FIELDS) {
    const desc = Object.getOwnPropertyDescriptor(raw, key);
    if (!desc || !Object.hasOwn(desc, "value") ||
        typeof desc.value !== "string") {
      throw new Error("custody_locked_advance_config_invalid");
    }
    out[key] = desc.value;
  }
  return Object.freeze(out);
}

function plainOwnValue(value, key) {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor || !Object.hasOwn(descriptor, "value")) {
    throw new Error("custody_locked_advance_writer_result_invalid");
  }
  return descriptor.value;
}

function writerMutationTruth(value) {
  if (!value || typeof value !== "object" || utilTypes.isProxy(value) ||
      Array.isArray(value)) {
    return null;
  }
  const descriptor = Object.getOwnPropertyDescriptor(value, "operation_performed");
  return descriptor && Object.hasOwn(descriptor, "value") &&
    typeof descriptor.value === "boolean" ? descriptor.value : null;
}

function requireSuccessfulWriterResult(value) {
  if (!value || typeof value !== "object" || utilTypes.isProxy(value) ||
      Array.isArray(value)) {
    throw new Error("custody_locked_advance_writer_result_invalid");
  }
  const ok = plainOwnValue(value, "ok");
  const status = plainOwnValue(value, "status");
  const operationPerformed = plainOwnValue(value, "operation_performed");
  if (ok !== true ||
      !((status === "current" && operationPerformed === false) ||
        (status === "advanced" && operationPerformed === true))) {
    // Never release a private lock after an unsuccessful or ambiguous writer.
    throw new Error("custody_locked_advance_writer_held_lock_retained");
  }
  return Object.freeze({
    ok: true,
    status,
    operation_performed: operationPerformed,
  });
}

function compose(rawConfig, writer) {
  const config = snapshotTrustedConfig(rawConfig);
  return Object.freeze({
    authority: VOID_BUY_VOID_CUSTODY_LOCKED_ADVANCE_AUTHORITY_V1,
    inspect() {
      // Inspect does not acquire, create, reap, or remove the private lock.
      return writer.inspect();
    },
    advance() {
      let entered = false;
      let writerResult;
      try {
        const session = withBuyVoidCustodyHighWaterExclusiveLockV1(
          { private_directory: config.custody_root },
          () => {
            entered = true;
            writerResult = writer.advance();
            return requireSuccessfulWriterResult(writerResult);
          },
        );
        return Object.freeze({
          ...session.result,
          marker: VOID_BUY_VOID_CUSTODY_LOCKED_ADVANCE_V1,
          exclusive_lock_release_fsynced: session.lock_release_fsynced === true,
          source_only_unmounted: true,
          production_allocation_mutation_ready: false,
          funds_movement: false,
        });
      } catch {
        // A callback failure retains the lock, while a post-rmdir fsync
        // failure may leave an UNCERTAIN RELEASE. Never claim exclusivity or
        // clean recovery from an exception; preserve known mutation truth.
        const performed = !entered ? false : writerMutationTruth(writerResult);
        return Object.freeze({
          ok: false,
          status: "held",
          marker: VOID_BUY_VOID_CUSTODY_LOCKED_ADVANCE_V1,
          reason: "exclusive_advance_unavailable_or_recovery_required",
          operation_performed: performed,
          mutation_truth_known: performed !== null,
          exclusive_lock_release_fsynced: false,
          source_only_unmounted: true,
          production_allocation_mutation_ready: false,
          funds_movement: false,
        });
      }
    },
  });
}

export function createBuyVoidCustodyLockedAdvanceV1(trustedStartupConfig) {
  const config = snapshotTrustedConfig(trustedStartupConfig);
  const writer = createBuyVoidCustodyLaunchHighWaterWriterV1(config);
  return compose(config, writer);
}

// Explicitly test-only: inject an inert stand-in writer under OS-temp fixtures.
export function testOnlyCreateBuyVoidCustodyLockedAdvanceV1(
  fixtureConfig, stubWriter,
) {
  if (!stubWriter || typeof stubWriter !== "object" ||
      utilTypes.isProxy(stubWriter) || Array.isArray(stubWriter)) {
    throw new Error("custody_locked_advance_test_writer_invalid");
  }
  const inspect = Object.getOwnPropertyDescriptor(stubWriter, "inspect");
  const advance = Object.getOwnPropertyDescriptor(stubWriter, "advance");
  if (!inspect || !advance || !Object.hasOwn(inspect, "value") ||
      !Object.hasOwn(advance, "value") ||
      typeof inspect.value !== "function" ||
      typeof advance.value !== "function") {
    throw new Error("custody_locked_advance_test_writer_invalid");
  }
  return compose(fixtureConfig, Object.freeze({
    inspect: inspect.value,
    advance: advance.value,
  }));
}

// SOURCE ONLY. Compose permanent prior-state fence, synchronous high-water
// writer and private exclusive lock. No installed custody service or launcher.
export function createBuyVoidCustodyPermanentlyFencedLockedAdvanceV1(
  trustedStartupConfig,
) {
  const config = snapshotTrustedConfig(trustedStartupConfig);
  return compose(
    config,
    createBuyVoidCustodyLaunchHighWaterPermanentlyFencedWriterV1(config),
  );
}

// Actual writer plus test-only classifier and post-fence interruption seam.
// This is NOT a path for production callers or untrusted supplied authority.
export function testOnlyCreateBuyVoidCustodyPermanentlyFencedLockedAdvanceV1(
  fixtureConfig,
  classifier,
  afterFenceHook = null,
) {
  const config = snapshotTrustedConfig(fixtureConfig);
  const writer = testOnlyCreateBuyVoidCustodyPermanentlyFencedWriterV1(
    config,
    classifier,
    afterFenceHook,
  );
  return compose(config, writer);
}
