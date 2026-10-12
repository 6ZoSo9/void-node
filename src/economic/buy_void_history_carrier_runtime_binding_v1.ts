import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  readBuyVoidHistoryCarrierRootAuthoritySnapshotV1,
  type BuyVoidHistoryCarrierAuthoritySnapshotV1,
} from "./buy_void_history_carrier_root_authority_v1.js";

export const VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_BINDING_V1 =
  "VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_BINDING_V1";

export const VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_AUTHORITY_ROOT_ENV_V1 =
  "VOID_BUY_VOID_HISTORY_CARRIER_AUTHORITY_ROOT";

export const VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_POOL_ID_V1 =
  "buy-void-presale-v1";

export const VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_BINDING_AUTHORITY_V1 = {
  server_owned_authority_root: true,
  production_authority_required: true,
  exact_pool_required: true,
  page_publication_complete_required: true,
  missing_pages_rejected: true,
  bounded_read_only_snapshot: true,
  current_root_from_durable_authority: true,
  current_generation_from_durable_authority: true,
  systemd_root_rotation_required: false,
  service_restart_per_successor_required: false,
  successor_publication_mounted: true,
  runtime_activation_ready: true,
  runtime_enablement: false,
  apply_enablement: false,
  public_activation: false,
  filesystem_write: false,
  credential_content_read: false,
  wallet_or_signer_access: false,
  rpc_call: false,
  transaction_signing: false,
  transaction_broadcast: false,
  chain2050_write: false,
  inventory_mutation: false,
  treasury_or_liquidity_action: false,
  funds_movement: false,
} as const;

const SHA256 = /^[0-9a-f]{64}$/u;

export type BuyVoidHistoryCarrierRuntimeBindingV1 =
  | {
      marker: typeof VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_BINDING_V1;
      version: 1;
      configured: true;
      authority_root: string;
      authority_root_realpath_sha256: string;
      authority_id: string;
      pool_id: typeof VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_POOL_ID_V1;
      carrier_generation: number;
      current_carrier_root_sha256: string;
      current_payment_index_root_sha256: string;
      current_generation_record_id: string;
      page_publication_complete: true;
      missing_page_count: 0;
      successor_publication_mounted: true;
      runtime_activation_ready: true;
      filesystem_write_performed: false;
      runtime_activation_authorized: false;
      apply_activation_authorized: false;
      public_activation_authorized: false;
      authority:
        typeof VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_BINDING_AUTHORITY_V1;
    }
  | {
      marker: typeof VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_BINDING_V1;
      version: 1;
      configured: false;
      reason: string;
      missing_envs: string[];
      invalid_envs: string[];
      filesystem_write_performed: false;
      runtime_activation_authorized: false;
      apply_activation_authorized: false;
      public_activation_authorized: false;
      authority:
        typeof VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_BINDING_AUTHORITY_V1;
    };

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function text(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : String(value ?? "").trim();
}

function held(
  reason: string,
  options: {
    missing_envs?: string[];
    invalid_envs?: string[];
  } = {},
): Extract<
  BuyVoidHistoryCarrierRuntimeBindingV1,
  { configured: false }
> {
  return {
    marker:
      VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_BINDING_V1,
    version: 1,
    configured: false,
    reason,
    missing_envs: [...(options.missing_envs || [])].sort(),
    invalid_envs: [...(options.invalid_envs || [])].sort(),
    filesystem_write_performed: false,
    runtime_activation_authorized: false,
    apply_activation_authorized: false,
    public_activation_authorized: false,
    authority:
      VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_BINDING_AUTHORITY_V1,
  };
}

function canonicalAuthorityRoot(value: unknown): string {
  const raw = text(value);
  if (
    !raw ||
    raw.includes("\0") ||
    !path.isAbsolute(raw)
  ) {
    return "";
  }
  const resolved = path.resolve(raw);
  if (
    resolved === path.parse(resolved).root ||
    path.normalize(raw) !== resolved
  ) {
    return "";
  }
  return resolved;
}

export function validateBuyVoidHistoryCarrierRuntimeSnapshotV1(
  authorityRoot: string,
  snapshot: BuyVoidHistoryCarrierAuthoritySnapshotV1,
): BuyVoidHistoryCarrierRuntimeBindingV1 {
  const root = canonicalAuthorityRoot(authorityRoot);
  if (!root) {
    return held(
      "history_carrier_runtime_authority_root_invalid",
      {
        invalid_envs: [
          VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_AUTHORITY_ROOT_ENV_V1,
        ],
      },
    );
  }

  let realpath: string;
  try {
    realpath = fs.realpathSync(root);
  } catch (error) {
    void error;
    return held(
      "history_carrier_runtime_authority_root_unavailable",
      {
        invalid_envs: [
          VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_AUTHORITY_ROOT_ENV_V1,
        ],
      },
    );
  }
  if (realpath !== root) {
    return held(
      "history_carrier_runtime_authority_root_realpath_mismatch",
      {
        invalid_envs: [
          VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_AUTHORITY_ROOT_ENV_V1,
        ],
      },
    );
  }

  if (
    snapshot.mode !== "production" ||
    snapshot.pool_id !==
      VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_POOL_ID_V1 ||
    snapshot.page_publication_complete !== true ||
    snapshot.missing_page_digests.length !== 0 ||
    !Number.isSafeInteger(snapshot.carrier_generation) ||
    snapshot.carrier_generation < 1 ||
    snapshot.verified_generation_count !==
      snapshot.carrier_generation ||
    snapshot.verified_page_reference_count < 1 ||
    !SHA256.test(snapshot.authority_id) ||
    !SHA256.test(snapshot.current_carrier_root_sha256) ||
    !SHA256.test(snapshot.current_payment_index_root_sha256) ||
    !SHA256.test(snapshot.current_generation_record_id) ||
    snapshot.current_root.carrier_generation !==
      snapshot.carrier_generation ||
    snapshot.current_root.carrier_root_sha256 !==
      snapshot.current_carrier_root_sha256 ||
    snapshot.current_root.payment_index_root_sha256 !==
      snapshot.current_payment_index_root_sha256 ||
    snapshot.runtime_activation_authorized !== false ||
    snapshot.apply_activation_authorized !== false ||
    snapshot.public_activation_authorized !== false
  ) {
    return held(
      "history_carrier_runtime_authority_snapshot_invalid",
      {
        invalid_envs: [
          VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_AUTHORITY_ROOT_ENV_V1,
        ],
      },
    );
  }

  return {
    marker:
      VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_BINDING_V1,
    version: 1,
    configured: true,
    authority_root: root,
    authority_root_realpath_sha256: sha256(realpath),
    authority_id: snapshot.authority_id,
    pool_id:
      VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_POOL_ID_V1,
    carrier_generation: snapshot.carrier_generation,
    current_carrier_root_sha256:
      snapshot.current_carrier_root_sha256,
    current_payment_index_root_sha256:
      snapshot.current_payment_index_root_sha256,
    current_generation_record_id:
      snapshot.current_generation_record_id,
    page_publication_complete: true,
    missing_page_count: 0,
    successor_publication_mounted: true,
    runtime_activation_ready: true,
    filesystem_write_performed: false,
    runtime_activation_authorized: false,
    apply_activation_authorized: false,
    public_activation_authorized: false,
    authority:
      VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_BINDING_AUTHORITY_V1,
  };
}

export function readBuyVoidHistoryCarrierRuntimeBindingV1(
  env: NodeJS.ProcessEnv = process.env,
): BuyVoidHistoryCarrierRuntimeBindingV1 {
  const name =
    VOID_BUY_VOID_HISTORY_CARRIER_RUNTIME_AUTHORITY_ROOT_ENV_V1;
  const root = canonicalAuthorityRoot(env[name]);
  if (!text(env[name])) {
    return held(
      "history_carrier_runtime_authority_root_not_configured",
      { missing_envs: [name] },
    );
  }
  if (!root) {
    return held(
      "history_carrier_runtime_authority_root_invalid",
      { invalid_envs: [name] },
    );
  }

  let snapshot: BuyVoidHistoryCarrierAuthoritySnapshotV1;
  try {
    snapshot =
      readBuyVoidHistoryCarrierRootAuthoritySnapshotV1({
        authority_root: root,
      });
  } catch (error) {
    void error;
    return held(
      "history_carrier_runtime_authority_snapshot_read_failed",
      { invalid_envs: [name] },
    );
  }

  return validateBuyVoidHistoryCarrierRuntimeSnapshotV1(
    root,
    snapshot,
  );
}
