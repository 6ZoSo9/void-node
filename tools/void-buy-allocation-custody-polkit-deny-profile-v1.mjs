import crypto from "node:crypto";

import {
  testOnlyBuildBuyVoidAllocationCustodyPolkitDenyRuleV1,
} from "./void-buy-allocation-custody-host-evidence-v1.mjs";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_DENY_PROFILE_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_DENY_PROFILE_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_DENY_TARGET_V1 =
  "/etc/polkit-1/rules.d/00-void-buy-allocation-custody-runtime-deny-v1.rules";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_DENY_SOURCE_V1 =
  "ops/polkit/00-void-buy-allocation-custody-runtime-deny-v1.rules";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_RUNTIME_USER_V1 = "zoso";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_ACTIONS_V1 =
  Object.freeze([
    "org.freedesktop.systemd1.manage-units",
    "org.freedesktop.systemd1.manage-unit-files",
    "org.freedesktop.systemd1.reload-daemon",
    "org.freedesktop.systemd1.set-environment",
  ]);

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_DENY_AUTHORITY_V1 =
  Object.freeze({
    source_profile_only:true,
    exact_rule_bytes_required:true,
    fixed_root_polkit_path_required:true,
    lexically_first_rule_required:true,
    runtime_user_exact:true,
    action_id_only_denial:true,
    explicit_pkcheck_status_one_required_after_install:true,
    installed_rule_verified:false,
    polkit_reload_or_observation_verified:false,
    runtime_control_denial_live_verified:false,
    filesystem_write:false,
    service_mutation:false,
    systemd_mutation:false,
    permission_mutation:false,
    payment_acceptance:false,
    public_presale_activation:false,
    funds_movement:false,
  });

const RULE =
  testOnlyBuildBuyVoidAllocationCustodyPolkitDenyRuleV1(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_RUNTIME_USER_V1,
  );

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_RULE_SHA256_V1 =
  crypto.createHash("sha256").update(RULE,"utf8").digest("hex");

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_DENY_PROFILE_ID_V1 =
  "voidbuycustpol1_"+crypto.createHash("sha256").update(
    JSON.stringify({
      marker:VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_DENY_PROFILE_V1,
      target:VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_DENY_TARGET_V1,
      source:VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_DENY_SOURCE_V1,
      runtime_user:VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_RUNTIME_USER_V1,
      actions:VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_ACTIONS_V1,
      rule_sha256:VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_RULE_SHA256_V1,
      authority:VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_DENY_AUTHORITY_V1,
    }),
    "utf8",
  ).digest("hex");

export function inspectBuyVoidAllocationCustodyPolkitDenyProfileV1(){
  return Object.freeze({
    marker:VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_DENY_PROFILE_V1,
    version:1,
    profile_id:VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_DENY_PROFILE_ID_V1,
    target_path:VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_DENY_TARGET_V1,
    source_path:VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_DENY_SOURCE_V1,
    runtime_user:VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_RUNTIME_USER_V1,
    denied_action_ids:VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_ACTIONS_V1,
    rule_sha256:VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_RULE_SHA256_V1,
    rule_bytes:Buffer.byteLength(RULE,"utf8"),
    authority:VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_DENY_AUTHORITY_V1,
  });
}
