import {
  listBuyVoidPaidUnreservableObligationsV1,
} from "./buy_void_inventory_reservation_journal_v1.js";
import {
  runBuyVoidPipelineCommandV1,
  type BuyVoidPipelineCommandV1,
  type BuyVoidPipelineCoordinatorDecisionV1,
  type BuyVoidPipelineCoordinatorDependenciesV1,
} from "./buy_void_pipeline_coordinator_v1.js";
import {
  VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_AUTHORITY_ROOT_ENV_V1,
} from "./buy_void_history_carrier_runtime_binding_v1.js";
import {
  publishBuyVoidHistoryCarrierPrimaryRecordV1,
} from "./buy_void_history_carrier_lifecycle_mount_v1.js";

export const VOID_BUY_VOID_HISTORY_CARRIER_PIPELINE_MOUNT_V1 =
  "VOID_BUY_VOID_HISTORY_CARRIER_PIPELINE_MOUNT_V1";

export const VOID_BUY_VOID_HISTORY_CARRIER_PIPELINE_MOUNT_AUTHORITY_V1 =
  Object.freeze({
    verify_reserve_and_claim_mounted: true,
    reservation_after_durable_inventory_before_claim: true,
    paid_unreservable_after_durable_obligation: true,
    exact_server_authority_root_env: true,
    missing_authority_root_holds_before_inventory_mutation: true,
    generic_pipeline_semantics_preserved_for_other_actions: true,
    runtime_enablement: false,
    apply_enablement: false,
    public_activation: false,
    credential_content_read: false,
    wallet_or_signer_access: false,
    rpc_call: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    funds_movement: false,
  });

function heldBeforeMutation(
  reason: string,
): BuyVoidPipelineCoordinatorDecisionV1 {
  return {
    ok: false,
    status: "held",
    action: "verify_reserve_and_claim",
    applied: true,
    mutation_performed: false,
    reason,
  };
}

function historyDependencies(
  authorityRoot: string,
): BuyVoidPipelineCoordinatorDependenciesV1 {
  return {
    publish_durable_inventory_history: (input) => {
      let transition:
        | "reservation"
        | "paid_unreservable_obligation";
      let record: Record<string, unknown>;

      if (!("reason" in input.inventory)) {
        transition = "reservation";
        record = input.inventory.reservation;
      } else {
        if (
          input.inventory.detail
            ?.terminal_recovery_obligation_recorded !== true
        ) {
          return {
            ok: false,
            reason:
              "history_carrier_nonterminal_inventory_hold_not_publishable",
          };
        }
        const obligationId = String(
          input.inventory.detail
            ?.terminal_recovery_obligation_id || "",
        ).trim().toLowerCase();
        const obligation =
          listBuyVoidPaidUnreservableObligationsV1({
            root_dir: input.root_dir,
            pool_id: input.pool_id,
          }).find(
            (candidate) =>
              candidate.obligation_id === obligationId,
          );
        if (
          !obligation ||
          obligation.payment_key_sha256 !==
            input.intent.payment_key_sha256
        ) {
          return {
            ok: false,
            reason:
              "history_carrier_paid_unreservable_obligation_not_found",
          };
        }
        transition =
          "paid_unreservable_obligation";
        record = obligation;
      }

      const decision =
        publishBuyVoidHistoryCarrierPrimaryRecordV1({
          root_dir: input.root_dir,
          authority_root: authorityRoot,
          pool_id: input.pool_id,
          transition,
          record: record as any,
        });
      if (decision.ok === false) {
        return {
          ok: false,
          reason: decision.reason,
          detail: {
            transition,
            payment_key_sha256:
              decision.payment_key_sha256,
          },
        };
      }
      return {
        ok: true,
        status: decision.status,
        detail: {
          transition,
          payment_key_sha256:
            decision.payment_key_sha256,
          carrier_generation:
            decision.carrier_generation,
          carrier_root_sha256:
            decision.carrier_root_sha256,
          segmented_durable_root_sha256:
            decision.segmented_durable_root_sha256,
          recovered_segmented_publication:
            decision.recovered_segmented_publication,
        },
      };
    },
  };
}

export function runBuyVoidPipelineCommandWithHistoryCarrierV1(
  command: BuyVoidPipelineCommandV1,
  env: NodeJS.ProcessEnv = process.env,
): BuyVoidPipelineCoordinatorDecisionV1 {
  if (
    command.action !== "verify_reserve_and_claim" ||
    command.apply !== true
  ) {
    return runBuyVoidPipelineCommandV1(command);
  }
  const authorityRoot = String(
    env[
      VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_AUTHORITY_ROOT_ENV_V1
    ] || "",
  ).trim();
  if (!authorityRoot) {
    return heldBeforeMutation(
      "history_carrier_authority_root_required_before_inventory_mutation",
    );
  }
  return runBuyVoidPipelineCommandV1(
    command,
    historyDependencies(authorityRoot),
  );
}
