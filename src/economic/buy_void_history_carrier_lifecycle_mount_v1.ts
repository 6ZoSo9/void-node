import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  lookupBuyVoidHistoryIndexV1,
  planBuyVoidHistoryCarrierCommitV1,
  planBuyVoidHistoryCarrierRefreshV1,
  type BuyVoidHistoryCarrierCommitPlanV1,
} from "./buy_void_history_carrier_v1.js";
import {
  readBuyVoidHistoryCarrierRootAuthorityPageV1,
  readBuyVoidHistoryCarrierRootAuthoritySnapshotV1,
} from "./buy_void_history_carrier_root_authority_v1.js";
import {
  VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_CONFIRMATION_V1,
  runBuyVoidHistoryCarrierSuccessorPublicationV1,
  type BuyVoidHistoryCarrierSuccessorPublicationTransitionV1,
} from "./buy_void_history_carrier_successor_publication_v1.js";
import {
  materializeBuyVoidHistorySegmentedSuccessorLocatorV1,
  readBuyVoidHistorySegmentedSuccessorStageV1,
  stageBuyVoidHistorySegmentedSuccessorV1,
  type BuyVoidHistorySegmentedSuccessorStageV1,
} from "./buy_void_history_segmented_successor_v1.js";
import {
  VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_POOL_ID_V1,
} from "./buy_void_history_carrier_runtime_binding_v1.js";
import {
  VOID_BUY_VOID_LEGACY_ALIAS_CARRIER_GENESIS_EXPECTED_PLAN_SHA256_V1,
} from "./buy_void_legacy_alias_carrier_genesis_v1.js";
import {
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_DURABLE_ROOT_NAME_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_GENERATIONS_NAME_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_MATERIALIZED_NAME_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_STORE_NAME_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_STORE_ROOT_NAME_V1,
} from "./buy_void_legacy_history_migration_apply_v1.js";
import {
  readSegmentedJsonlManifestV1,
} from "../storage/segmented_jsonl_v1.js";
import {
  deriveSegmentedJsonlCheckpointV1,
  deriveSegmentedJsonlSnapshotAuthorityV1,
  type SegmentedJsonlCheckpointAnchorV1,
} from "../storage/segmented_jsonl_snapshot_authority_v1.js";
import {
  deriveSegmentedJsonlMaterializedAuthorityV1,
} from "../storage/segmented_jsonl_materialized_authority_v1.js";
import {
  publishSegmentedJsonlDurableRootV1,
  readSegmentedJsonlDurableRootV1,
  type SegmentedJsonlDurableRootV1,
} from "../storage/segmented_jsonl_durable_root_v1.js";

export const VOID_BUY_VOID_HISTORY_CARRIER_LIFECYCLE_MOUNT_V1 =
  "VOID_BUY_VOID_HISTORY_CARRIER_LIFECYCLE_MOUNT_V1";

export const VOID_BUY_VOID_HISTORY_CARRIER_LIVE_ROOT_NAME_V1 =
  "buy-void-payment-history-segmented-live-v1";

export const VOID_BUY_VOID_HISTORY_CARRIER_LIFECYCLE_MOUNT_AUTHORITY_V1 =
  Object.freeze({
    reservation_lifecycle_mount: true,
    paid_unreservable_obligation_lifecycle_mount: true,
    terminal_closeout_refresh_mount: true,
    durable_journal_before_carrier_publication_required: true,
    carrier_publication_before_claim_persistence_required: true,
    live_segmented_namespace_separate_from_legacy: true,
    legacy_migration_namespace_mutation: false,
    live_durable_root_bootstrap_from_verified_generation_one: true,
    exactly_one_primary_record_append_per_new_payment: true,
    duplicate_primary_record_append_forbidden: true,
    crash_between_segmented_root_and_carrier_recoverable: true,
    stale_carrier_predecessor_rejected: true,
    carrier_page_revalidation_at_publication: true,
    terminal_refresh_zero_unit: true,
    runtime_enablement: false,
    apply_enablement: false,
    public_activation: false,
    service_action: false,
    credential_content_read: false,
    wallet_or_signer_access: false,
    rpc_call: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    inventory_mutation_by_this_module: false,
    treasury_or_liquidity_action: false,
    funds_movement: false,
    automatic_retry: false,
  });

const SHA256 = /^[0-9a-f]{64}$/u;
const LIVE_GENERATIONS_NAME = "generations";
const LIVE_DURABLE_ROOT_NAME = "durable-root";

type PrimaryRecordV1 = Record<string, unknown> & {
  payment_key_sha256: string;
  pool_id: string;
};

type CurrentSegmentedStateV1 = {
  durable_root: SegmentedJsonlDurableRootV1;
  durable_root_directory: string;
  generation_parent: string;
  store_root: string;
  materialized_file: string;
  materialized_authority: ReturnType<
    typeof deriveSegmentedJsonlMaterializedAuthorityV1
  >;
  checkpoint_anchor: SegmentedJsonlCheckpointAnchorV1;
};

export type BuyVoidHistoryCarrierLifecycleDecisionV1 =
  | {
      ok: true;
      status: "created" | "duplicate" | "recovered";
      transition:
        BuyVoidHistoryCarrierSuccessorPublicationTransitionV1;
      payment_key_sha256: string;
      carrier_generation: number;
      carrier_root_sha256: string;
      segmented_durable_root_sha256: string;
      segmented_store_generation: number;
      carrier_mutation_performed: boolean;
      segmented_root_mutation_performed: boolean;
      recovered_segmented_publication: boolean;
      runtime_activation_authorized: false;
      apply_activation_authorized: false;
      public_activation_authorized: false;
      transaction_broadcast_performed: false;
      funds_movement_performed: false;
      authority:
        typeof VOID_BUY_VOID_HISTORY_CARRIER_LIFECYCLE_MOUNT_AUTHORITY_V1;
    }
  | {
      ok: false;
      status: "held";
      transition:
        BuyVoidHistoryCarrierSuccessorPublicationTransitionV1;
      payment_key_sha256: string;
      reason: string;
      detail?: Record<string, unknown>;
      carrier_mutation_performed: false;
      runtime_activation_authorized: false;
      apply_activation_authorized: false;
      public_activation_authorized: false;
      transaction_broadcast_performed: false;
      funds_movement_performed: false;
      authority:
        typeof VOID_BUY_VOID_HISTORY_CARRIER_LIFECYCLE_MOUNT_AUTHORITY_V1;
    };

function sha256(value: Buffer | string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new Error("non_canonical_number");
    }
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(record)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key) +
            ":" +
            canonicalJson(record[key]),
        )
        .join(",") +
      "}"
    );
  }
  throw new Error("non_canonical_value");
}

function currentUid(): number {
  const getuid = process.getuid;
  if (typeof getuid !== "function") {
    throw new Error("history_carrier_lifecycle_uid_unavailable");
  }
  return getuid();
}

function ensurePrivateDirectory(directoryInput: string): string {
  const directory = path.resolve(directoryInput);
  if (
    !directory ||
    directory === path.parse(directory).root ||
    directory.includes("\0")
  ) {
    throw new Error("history_carrier_lifecycle_directory_invalid");
  }
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { mode: 0o700 });
  }
  const st = fs.lstatSync(directory);
  if (
    !st.isDirectory() ||
    st.isSymbolicLink() ||
    st.uid !== currentUid() ||
    (st.mode & 0o077) !== 0 ||
    fs.realpathSync(directory) !== directory
  ) {
    throw new Error(
      "history_carrier_lifecycle_directory_authority_mismatch",
    );
  }
  return directory;
}

function layout(rootDirInput: string) {
  const rootDir = path.resolve(rootDirInput);
  const liveRoot = ensurePrivateDirectory(
    path.join(
      ensurePrivateDirectory(rootDir),
      VOID_BUY_VOID_HISTORY_CARRIER_LIVE_ROOT_NAME_V1,
    ),
  );
  const generationParent = ensurePrivateDirectory(
    path.join(liveRoot, LIVE_GENERATIONS_NAME),
  );
  const durableRootDirectory = ensurePrivateDirectory(
    path.join(liveRoot, LIVE_DURABLE_ROOT_NAME),
  );
  const legacyGenerationRoot = path.join(
    rootDir,
    VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_STORE_ROOT_NAME_V1,
    VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_GENERATIONS_NAME_V1,
    VOID_BUY_VOID_LEGACY_ALIAS_CARRIER_GENESIS_EXPECTED_PLAN_SHA256_V1,
  );
  return {
    root_dir: rootDir,
    live_root: liveRoot,
    generation_parent: generationParent,
    durable_root_directory: durableRootDirectory,
    legacy_generation_root: legacyGenerationRoot,
  };
}

function anchorFor(
  snapshot: ReturnType<
    typeof deriveSegmentedJsonlSnapshotAuthorityV1
  >,
  checkpoint: ReturnType<
    typeof deriveSegmentedJsonlCheckpointV1
  >,
): SegmentedJsonlCheckpointAnchorV1 {
  return {
    checkpoint,
    snapshot,
    trusted_checkpoint_sha256:
      checkpoint.checkpoint_sha256,
  };
}

function legacyGenerationOneState(
  rootDir: string,
): Omit<CurrentSegmentedStateV1, "durable_root" | "durable_root_directory" | "generation_parent"> & {
  legacy_durable_root: SegmentedJsonlDurableRootV1;
} {
  const paths = layout(rootDir);
  const generationRoot =
    ensurePrivateDirectory(paths.legacy_generation_root);
  const storeRoot = ensurePrivateDirectory(
    path.join(
      generationRoot,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_STORE_NAME_V1,
    ),
  );
  const materializedFile = path.join(
    generationRoot,
    VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_MATERIALIZED_NAME_V1,
  );
  const legacyDurableRootDirectory =
    ensurePrivateDirectory(
      path.join(
        generationRoot,
        VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_DURABLE_ROOT_NAME_V1,
      ),
    );
  const manifest =
    readSegmentedJsonlManifestV1(storeRoot);
  const snapshot =
    deriveSegmentedJsonlSnapshotAuthorityV1(manifest);
  const checkpoint =
    deriveSegmentedJsonlCheckpointV1(snapshot, null);
  const materialized =
    deriveSegmentedJsonlMaterializedAuthorityV1(
      storeRoot,
      materializedFile,
    );
  const legacyDurableRoot =
    readSegmentedJsonlDurableRootV1(
      legacyDurableRootDirectory,
    );
  if (
    !legacyDurableRoot ||
    legacyDurableRoot.store_generation !== 1 ||
    legacyDurableRoot.checkpoint_sha256 !==
      checkpoint.checkpoint_sha256 ||
    legacyDurableRoot.snapshot_sha256 !==
      snapshot.snapshot_sha256 ||
    legacyDurableRoot.manifest_sha256 !==
      snapshot.manifest_sha256 ||
    legacyDurableRoot.materialized_authority_sha256 !==
      materialized.authority_sha256 ||
    legacyDurableRoot.materialized_sha256 !==
      materialized.materialized_sha256
  ) {
    throw new Error(
      "history_carrier_lifecycle_legacy_generation_one_mismatch",
    );
  }
  return {
    store_root: storeRoot,
    materialized_file: materializedFile,
    materialized_authority: materialized,
    checkpoint_anchor: anchorFor(snapshot, checkpoint),
    legacy_durable_root: legacyDurableRoot,
  };
}

function stageGenerationRoot(
  generationParent: string,
  generation: number,
): string {
  if (
    !Number.isSafeInteger(generation) ||
    generation < 2
  ) {
    throw new Error(
      "history_carrier_lifecycle_live_generation_invalid",
    );
  }
  return path.join(
    generationParent,
    String(generation).padStart(8, "0"),
  );
}

function stateForPublishedRoot(
  rootDir: string,
  durableRoot: SegmentedJsonlDurableRootV1,
): CurrentSegmentedStateV1 {
  const paths = layout(rootDir);
  if (durableRoot.store_generation === 1) {
    const legacy = legacyGenerationOneState(rootDir);
    return {
      durable_root: durableRoot,
      durable_root_directory:
        paths.durable_root_directory,
      generation_parent: paths.generation_parent,
      store_root: legacy.store_root,
      materialized_file: legacy.materialized_file,
      materialized_authority:
        legacy.materialized_authority,
      checkpoint_anchor: legacy.checkpoint_anchor,
    };
  }
  const stage =
    readBuyVoidHistorySegmentedSuccessorStageV1(
      stageGenerationRoot(
        paths.generation_parent,
        durableRoot.store_generation,
      ),
    );
  if (
    stage.metadata.next_store_generation !==
      durableRoot.store_generation ||
    stage.metadata.next_checkpoint.checkpoint_sha256 !==
      durableRoot.checkpoint_sha256 ||
    stage.metadata.next_snapshot.snapshot_sha256 !==
      durableRoot.snapshot_sha256 ||
    stage.metadata.next_snapshot.manifest_sha256 !==
      durableRoot.manifest_sha256 ||
    stage.metadata.next_materialized_authority
      .authority_sha256 !==
      durableRoot.materialized_authority_sha256 ||
    stage.metadata.next_materialized_authority
      .materialized_sha256 !==
      durableRoot.materialized_sha256
  ) {
    throw new Error(
      "history_carrier_lifecycle_live_stage_root_mismatch",
    );
  }
  return {
    durable_root: durableRoot,
    durable_root_directory:
      paths.durable_root_directory,
    generation_parent: paths.generation_parent,
    store_root: stage.store_root,
    materialized_file: stage.materialized_file,
    materialized_authority:
      stage.metadata.next_materialized_authority,
    checkpoint_anchor: anchorFor(
      stage.metadata.next_snapshot,
      stage.metadata.next_checkpoint,
    ),
  };
}

function ensureLiveSegmentedState(
  rootDir: string,
  expectedCarrierSegmentedRootSha256: string,
  expectedCarrierStoreGeneration: number,
): CurrentSegmentedStateV1 {
  const paths = layout(rootDir);
  let durableRoot =
    readSegmentedJsonlDurableRootV1(
      paths.durable_root_directory,
    );
  if (!durableRoot) {
    if (expectedCarrierStoreGeneration !== 1) {
      throw new Error(
        "history_carrier_lifecycle_live_root_missing_after_genesis",
      );
    }
    const legacy = legacyGenerationOneState(rootDir);
    if (
      legacy.legacy_durable_root.root_sha256 !==
        expectedCarrierSegmentedRootSha256
    ) {
      throw new Error(
        "history_carrier_lifecycle_genesis_carrier_root_mismatch",
      );
    }
    durableRoot =
      publishSegmentedJsonlDurableRootV1(
        paths.durable_root_directory,
        {
          checkpoint:
            legacy.checkpoint_anchor.checkpoint,
          snapshot:
            legacy.checkpoint_anchor.snapshot,
          materialized:
            legacy.materialized_authority,
        },
      );
    if (
      durableRoot.root_sha256 !==
        expectedCarrierSegmentedRootSha256
    ) {
      throw new Error(
        "history_carrier_lifecycle_live_genesis_publish_mismatch",
      );
    }
  }
  return stateForPublishedRoot(rootDir, durableRoot);
}

function primaryRecordFingerprint(
  record: PrimaryRecordV1,
): string {
  return sha256(canonicalJson(record));
}

function readCarrierPage(
  authorityRoot: string,
  digest: string,
): Buffer {
  return readBuyVoidHistoryCarrierRootAuthorityPageV1({
    authority_root: authorityRoot,
    sha256: digest,
  });
}

function carrierAlreadyContainsPrimary(
  authorityRoot: string,
  carrierRoot: any,
  record: PrimaryRecordV1,
): boolean {
  const lookup = lookupBuyVoidHistoryIndexV1(
    String(carrierRoot.payment_index_root_sha256),
    record.payment_key_sha256,
    (digest) => readCarrierPage(authorityRoot, digest),
  );
  if (!lookup.found || !lookup.entry) return false;
  if (
    lookup.entry.primary_record_fingerprint_sha256 !==
      primaryRecordFingerprint(record)
  ) {
    throw new Error(
      "history_carrier_lifecycle_primary_record_conflict",
    );
  }
  return true;
}

function applyCarrierPlan(
  authorityRoot: string,
  transition:
    BuyVoidHistoryCarrierSuccessorPublicationTransitionV1,
  expectedCurrentCarrierRootSha256: string,
  plan: BuyVoidHistoryCarrierCommitPlanV1,
) {
  const dry =
    runBuyVoidHistoryCarrierSuccessorPublicationV1({
      authority_root: authorityRoot,
      transition,
      expected_current_carrier_root_sha256:
        expectedCurrentCarrierRootSha256,
      plan,
      apply: false,
    });
  if (dry.ok === false) {
    throw new Error(
      "history_carrier_lifecycle_publication_preview_held:" +
        dry.reason,
    );
  }
  const applied =
    runBuyVoidHistoryCarrierSuccessorPublicationV1({
      authority_root: authorityRoot,
      transition,
      expected_current_carrier_root_sha256:
        expectedCurrentCarrierRootSha256,
      plan,
      apply: true,
      confirmation:
        VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_CONFIRMATION_V1,
      publication_fingerprint_sha256:
        dry.publication_fingerprint_sha256,
    });
  if (applied.ok === false) {
    throw new Error(
      "history_carrier_lifecycle_publication_held:" +
        applied.reason,
    );
  }
  return applied;
}

function recordBytes(record: PrimaryRecordV1): Buffer {
  return Buffer.from(canonicalJson(record) + "\n", "utf8");
}

function recoverPublishedStage(
  current: CurrentSegmentedStateV1,
  carrierRoot: any,
  desiredRecordBytes: Buffer,
): BuyVoidHistorySegmentedSuccessorStageV1 | null {
  const durableRoot = current.durable_root;
  if (
    durableRoot.store_generation !==
      Number(carrierRoot.active_segmented_store_generation) + 1 ||
    durableRoot.previous_root_sha256 !==
      String(
        carrierRoot.active_segmented_durable_root_sha256,
      )
  ) {
    return null;
  }
  const stage =
    readBuyVoidHistorySegmentedSuccessorStageV1(
      stageGenerationRoot(
        current.generation_parent,
        durableRoot.store_generation,
      ),
    );
  if (
    stage.metadata.current_durable_root_sha256 !==
      String(
        carrierRoot.active_segmented_durable_root_sha256,
      ) ||
    stage.metadata.appended_record_sha256 !==
      sha256(desiredRecordBytes) ||
    stage.metadata.appended_record_bytes !==
      desiredRecordBytes.length
  ) {
    throw new Error(
      "history_carrier_lifecycle_recovery_stage_mismatch",
    );
  }
  const idempotent =
    publishSegmentedJsonlDurableRootV1(
      current.durable_root_directory,
      stage.publish_input,
    );
  if (
    idempotent.root_sha256 !==
      durableRoot.root_sha256
  ) {
    throw new Error(
      "history_carrier_lifecycle_recovery_root_mismatch",
    );
  }
  return stage;
}

function held(
  transition:
    BuyVoidHistoryCarrierSuccessorPublicationTransitionV1,
  paymentKey: string,
  error: unknown,
): BuyVoidHistoryCarrierLifecycleDecisionV1 {
  return {
    ok: false,
    status: "held",
    transition,
    payment_key_sha256: paymentKey,
    reason: String((error as Error)?.message || error),
    carrier_mutation_performed: false,
    runtime_activation_authorized: false,
    apply_activation_authorized: false,
    public_activation_authorized: false,
    transaction_broadcast_performed: false,
    funds_movement_performed: false,
    authority:
      VOID_BUY_VOID_HISTORY_CARRIER_LIFECYCLE_MOUNT_AUTHORITY_V1,
  };
}

export function publishBuyVoidHistoryCarrierPrimaryRecordV1(
  input: {
    root_dir: string;
    authority_root: string;
    pool_id: string;
    transition:
      | "reservation"
      | "paid_unreservable_obligation";
    record: PrimaryRecordV1;
  },
): BuyVoidHistoryCarrierLifecycleDecisionV1 {
  const paymentKey =
    String(input.record?.payment_key_sha256 || "")
      .trim()
      .toLowerCase();
  try {
    if (
      !SHA256.test(paymentKey) ||
      input.pool_id !==
        VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_POOL_ID_V1 ||
      input.record.pool_id !== input.pool_id
    ) {
      throw new Error(
        "history_carrier_lifecycle_primary_input_invalid",
      );
    }
    const before =
      readBuyVoidHistoryCarrierRootAuthoritySnapshotV1({
        authority_root: input.authority_root,
      });
    const carrierRoot = before.current_root;
    if (
      carrierAlreadyContainsPrimary(
        input.authority_root,
        carrierRoot,
        input.record,
      )
    ) {
      return {
        ok: true,
        status: "duplicate",
        transition: input.transition,
        payment_key_sha256: paymentKey,
        carrier_generation:
          before.carrier_generation,
        carrier_root_sha256:
          before.current_carrier_root_sha256,
        segmented_durable_root_sha256:
          carrierRoot.active_segmented_durable_root_sha256,
        segmented_store_generation:
          carrierRoot.active_segmented_store_generation,
        carrier_mutation_performed: false,
        segmented_root_mutation_performed: false,
        recovered_segmented_publication: false,
        runtime_activation_authorized: false,
        apply_activation_authorized: false,
        public_activation_authorized: false,
        transaction_broadcast_performed: false,
        funds_movement_performed: false,
        authority:
          VOID_BUY_VOID_HISTORY_CARRIER_LIFECYCLE_MOUNT_AUTHORITY_V1,
      };
    }

    const current =
      ensureLiveSegmentedState(
        input.root_dir,
        carrierRoot.active_segmented_durable_root_sha256,
        carrierRoot.active_segmented_store_generation,
      );
    const bytes = recordBytes(input.record);
    let stage: BuyVoidHistorySegmentedSuccessorStageV1;
    let recovered = false;
    let segmentedMutation = false;

    if (
      current.durable_root.root_sha256 ===
        carrierRoot.active_segmented_durable_root_sha256 &&
      current.durable_root.store_generation ===
        carrierRoot.active_segmented_store_generation
    ) {
      stage =
        stageBuyVoidHistorySegmentedSuccessorV1({
          durable_root_directory:
            current.durable_root_directory,
          current_store_root: current.store_root,
          current_materialized_file:
            current.materialized_file,
          current_checkpoint_anchor:
            current.checkpoint_anchor,
          trusted_current_durable_root_sha256:
            current.durable_root.root_sha256,
          generation_parent:
            current.generation_parent,
          record_bytes: bytes,
        });
      segmentedMutation =
        stage.filesystem_mutation_performed;
    } else {
      const recoveredStage =
        recoverPublishedStage(
          current,
          carrierRoot,
          bytes,
        );
      if (!recoveredStage) {
        throw new Error(
          "history_carrier_lifecycle_segmented_carrier_divergence",
        );
      }
      stage = recoveredStage;
      recovered = true;
    }

    const published =
      publishSegmentedJsonlDurableRootV1(
        current.durable_root_directory,
        stage.publish_input,
      );
    const locator =
      materializeBuyVoidHistorySegmentedSuccessorLocatorV1(
        stage,
        published,
      );
    const manifest =
      readSegmentedJsonlManifestV1(stage.store_root);
    const plan =
      planBuyVoidHistoryCarrierCommitV1({
        previous_carrier_root: carrierRoot,
        current_index_root_sha256:
          carrierRoot.payment_index_root_sha256,
        durable_root_directory:
          current.durable_root_directory,
        store_root: stage.store_root,
        materialized_file:
          stage.materialized_file,
        materialized_authority:
          stage.metadata.next_materialized_authority,
        manifest,
        trusted_segmented_durable_root_sha256:
          published.root_sha256,
        payment_runtime_root_dir:
          path.resolve(input.root_dir),
        pool_id: input.pool_id,
        record_locator: locator,
        read_page: (digest) =>
          readCarrierPage(
            input.authority_root,
            digest,
          ),
      });
    if (plan.status !== "planned") {
      throw new Error(
        "history_carrier_lifecycle_primary_plan_not_planned:" +
          plan.status,
      );
    }
    const applied = applyCarrierPlan(
      input.authority_root,
      input.transition,
      before.current_carrier_root_sha256,
      plan,
    );
    return {
      ok: true,
      status: recovered
        ? "recovered"
        : applied.status === "duplicate"
          ? "duplicate"
          : "created",
      transition: input.transition,
      payment_key_sha256: paymentKey,
      carrier_generation:
        applied.carrier_generation,
      carrier_root_sha256:
        applied.carrier_root_sha256,
      segmented_durable_root_sha256:
        published.root_sha256,
      segmented_store_generation:
        published.store_generation,
      carrier_mutation_performed:
        applied.mutation_performed,
      segmented_root_mutation_performed:
        segmentedMutation ||
        published.root_sha256 !==
          current.durable_root.root_sha256,
      recovered_segmented_publication: recovered,
      runtime_activation_authorized: false,
      apply_activation_authorized: false,
      public_activation_authorized: false,
      transaction_broadcast_performed: false,
      funds_movement_performed: false,
      authority:
        VOID_BUY_VOID_HISTORY_CARRIER_LIFECYCLE_MOUNT_AUTHORITY_V1,
    };
  } catch (error) {
    return held(input.transition, paymentKey, error);
  }
}

export function refreshBuyVoidHistoryCarrierAfterTerminalV1(
  input: {
    root_dir: string;
    authority_root: string;
    pool_id: string;
    payment_key_sha256: string;
  },
): BuyVoidHistoryCarrierLifecycleDecisionV1 {
  const paymentKey =
    String(input.payment_key_sha256 || "")
      .trim()
      .toLowerCase();
  try {
    if (
      !SHA256.test(paymentKey) ||
      input.pool_id !==
        VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_POOL_ID_V1
    ) {
      throw new Error(
        "history_carrier_lifecycle_refresh_input_invalid",
      );
    }
    const before =
      readBuyVoidHistoryCarrierRootAuthoritySnapshotV1({
        authority_root: input.authority_root,
      });
    const carrierRoot = before.current_root;
    const current =
      ensureLiveSegmentedState(
        input.root_dir,
        carrierRoot.active_segmented_durable_root_sha256,
        carrierRoot.active_segmented_store_generation,
      );
    if (
      current.durable_root.root_sha256 !==
        carrierRoot.active_segmented_durable_root_sha256 ||
      current.durable_root.store_generation !==
        carrierRoot.active_segmented_store_generation
    ) {
      throw new Error(
        "history_carrier_lifecycle_refresh_requires_primary_recovery",
      );
    }
    const plan =
      planBuyVoidHistoryCarrierRefreshV1({
        previous_carrier_root: carrierRoot,
        durable_root_directory:
          current.durable_root_directory,
        trusted_segmented_durable_root_sha256:
          current.durable_root.root_sha256,
        payment_runtime_root_dir:
          path.resolve(input.root_dir),
        pool_id: input.pool_id,
        payment_key_sha256: paymentKey,
        read_page: (digest) =>
          readCarrierPage(
            input.authority_root,
            digest,
          ),
      });
    if (plan.status === "duplicate") {
      return {
        ok: true,
        status: "duplicate",
        transition: "history_refresh",
        payment_key_sha256: paymentKey,
        carrier_generation:
          before.carrier_generation,
        carrier_root_sha256:
          before.current_carrier_root_sha256,
        segmented_durable_root_sha256:
          current.durable_root.root_sha256,
        segmented_store_generation:
          current.durable_root.store_generation,
        carrier_mutation_performed: false,
        segmented_root_mutation_performed: false,
        recovered_segmented_publication: false,
        runtime_activation_authorized: false,
        apply_activation_authorized: false,
        public_activation_authorized: false,
        transaction_broadcast_performed: false,
        funds_movement_performed: false,
        authority:
          VOID_BUY_VOID_HISTORY_CARRIER_LIFECYCLE_MOUNT_AUTHORITY_V1,
      };
    }
    const applied = applyCarrierPlan(
      input.authority_root,
      "history_refresh",
      before.current_carrier_root_sha256,
      plan,
    );
    return {
      ok: true,
      status:
        applied.status === "duplicate"
          ? "duplicate"
          : "created",
      transition: "history_refresh",
      payment_key_sha256: paymentKey,
      carrier_generation:
        applied.carrier_generation,
      carrier_root_sha256:
        applied.carrier_root_sha256,
      segmented_durable_root_sha256:
        current.durable_root.root_sha256,
      segmented_store_generation:
        current.durable_root.store_generation,
      carrier_mutation_performed:
        applied.mutation_performed,
      segmented_root_mutation_performed: false,
      recovered_segmented_publication: false,
      runtime_activation_authorized: false,
      apply_activation_authorized: false,
      public_activation_authorized: false,
      transaction_broadcast_performed: false,
      funds_movement_performed: false,
      authority:
        VOID_BUY_VOID_HISTORY_CARRIER_LIFECYCLE_MOUNT_AUTHORITY_V1,
    };
  } catch (error) {
    return held("history_refresh", paymentKey, error);
  }
}
