#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENVS_V1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_postgres_admitted_guarded_runtime_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_CONFIRMATION_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLE_ENV_V1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_postgres_claimed_runtime_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_DIRECT_FULL_RUNTIME_RETIRED_ERROR_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_PARENT_ACTION_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_SELECTION_ENV_V1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_postgres_claimed_runtime_parent_contract_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_PARENT_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_PARENT_V1,
  buyVoidPaymentKeyedDispatcherPostgresClaimedRuntimeParentStatusV1,
  handleBuyVoidPaymentKeyedDispatcherPostgresClaimedRuntimeParentCommandV1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_postgres_claimed_runtime_parent_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_CONFIRMATION_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_PARENT_ACTION_V1,
  handleBuyVoidPaymentKeyedFullRuntimeCommandV1,
} from "../src/economic/buy_void_payment_keyed_full_runtime_v1.js";

const ATTEMPT = "1".repeat(64);

function responseBox() {
  let value: { status: number; body: any } | null = null;
  const res: any = {
    statusCode: 200,
    headersSent: false,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: any) {
      value = { status: this.statusCode, body };
      this.headersSent = true;
      return this;
    },
  };
  return {
    res,
    read() {
      assert.ok(value);
      return value;
    },
  };
}

async function callParent(body: any) {
  const box = responseBox();
  await handleBuyVoidPaymentKeyedDispatcherPostgresClaimedRuntimeParentCommandV1(
    { body },
    box.res,
  );
  return box.read();
}

async function callDirectFull(body: any) {
  const box = responseBox();
  await handleBuyVoidPaymentKeyedFullRuntimeCommandV1(
    {
      socket: { remoteAddress: "127.0.0.1" },
      body,
    },
    box.res,
  );
  return box.read();
}

assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_SELECTION_ENV_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLE_ENV_V1,
);

assert.deepEqual(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_PARENT_AUTHORITY_V1,
  {
    source_only_parent_adapter: true,
    standalone_route_mount: false,
    parent_loopback_gate_required: true,
    parent_enable_gate_required: true,
    exact_action_required: true,
    exact_attempt_id_required: true,
    exact_apply_true_required: true,
    exact_confirmation_required: true,
    only_action_attempt_apply_confirmation_allowed: true,
    caller_root_dir_authority: false,
    caller_client_id_authority: false,
    caller_worker_id_authority: false,
    caller_lease_authority: false,
    caller_lease_ttl_authority: false,
    caller_postgres_authority: false,
    caller_pool_authority: false,
    caller_factory_authority: false,
    caller_signer_authority: false,
    caller_broadcaster_authority: false,
    caller_rpc_url_authority: false,
    child_function_fixed: true,
    child_claimed_runtime_required: true,
    automatic_retry: false,
    background_loop: false,
    service_mutation: false,
  },
);

const envKeys = new Set<string>([
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLE_ENV_V1,
  ...Object.values(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENVS_V1,
  ),
  ...Object.values(VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1),
]);
const saved = new Map<string, string | undefined>();
for (const key of envKeys) {
  saved.set(key, process.env[key]);
  delete process.env[key];
}

try {
  {
    const status =
      buyVoidPaymentKeyedDispatcherPostgresClaimedRuntimeParentStatusV1();
    assert.equal(
      status.marker,
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_PARENT_V1,
    );
    assert.equal(status.claimed_runtime_enabled, false);
    assert.equal(status.admitted_runtime_enabled, false);
    assert.equal(status.full_runtime_enabled, false);
    assert.equal(status.full_runtime_apply_enabled, false);
    assert.equal(
      status.parent_action,
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_PARENT_ACTION_V1,
    );
  }

  {
    const extra = await callParent({
      action:
        VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_PARENT_ACTION_V1,
      attempt_id: ATTEMPT,
      apply: true,
      confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_CONFIRMATION_V1,
      worker_id: "caller-forbidden",
    });
    assert.equal(extra.status, 400);
    assert.equal(
      extra.body.error,
      "caller_supplied_claimed_runtime_material_forbidden",
    );
    assert.equal(extra.body.forbidden_key, "worker_id");
  }

  {
    const wrongAction = await callParent({
      action: "run_payment_keyed_fulfillment",
      attempt_id: ATTEMPT,
      apply: true,
      confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_CONFIRMATION_V1,
    });
    assert.equal(wrongAction.status, 400);
    assert.equal(
      wrongAction.body.error,
      "invalid_claimed_runtime_parent_action",
    );
  }

  {
    const wrongConfirmation = await callParent({
      action:
        VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_PARENT_ACTION_V1,
      attempt_id: ATTEMPT,
      apply: true,
      confirmation: "wrong",
    });
    assert.equal(wrongConfirmation.status, 428);
    assert.equal(wrongConfirmation.body.stage, "input");
    assert.equal(wrongConfirmation.body.credential_read_performed, false);
    assert.equal(wrongConfirmation.body.schema_query_performed, false);
    assert.equal(wrongConfirmation.body.child_invoked, false);
  }

  process.env[
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLE_ENV_V1
  ] = "1";
  process.env[VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1.enabled] = "1";

  {
    const direct = await callDirectFull({
      action: VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_PARENT_ACTION_V1,
      attempt_id: ATTEMPT,
      apply: true,
      confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_CONFIRMATION_V1,
    });
    assert.equal(direct.status, 409);
    assert.equal(
      direct.body.error,
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_DIRECT_FULL_RUNTIME_RETIRED_ERROR_V1,
    );
    assert.equal(
      direct.body.replacement_parent_action,
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_PARENT_ACTION_V1,
    );
    assert.equal(direct.body.mutation_performed, false);
    assert.equal(direct.body.signing_performed, false);
    assert.equal(direct.body.transaction_broadcast_performed, false);
    assert.equal(direct.body.money_movement_performed, false);
    assert.equal(direct.body.automatic_retry_allowed, false);
  }

  {
    const exact = await callParent({
      action:
        VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_PARENT_ACTION_V1,
      attempt_id: ATTEMPT,
      apply: true,
      confirmation:
        VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_CONFIRMATION_V1,
    });
    assert.equal(exact.status, 503);
    assert.equal(exact.body.ok, false);
    assert.equal(exact.body.stage, "runtime_gate");
    assert.equal(
      exact.body.reason,
      "admitted_guarded_runtime_disabled",
    );
    assert.equal(exact.body.credential_read_performed, false);
    assert.equal(exact.body.schema_query_performed, false);
    assert.equal(exact.body.dispatcher_database_mutation_may_have_occurred, false);
    assert.equal(exact.body.lease_capability_issued, false);
    assert.equal(exact.body.lease_capability_returned, false);
    assert.equal(exact.body.child_invoked, false);
    assert.equal(exact.body.broadcast_call_performed, false);
    assert.equal(exact.body.money_movement_performed, false);
  }
} finally {
  for (const [key, value] of saved) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

console.log(
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_PARENT_MOUNT_V1_PROOF_GREEN",
);
console.log("parent_action_mounted_source_only=true");
console.log("caller_lease_authority=false");
console.log("caller_worker_authority=false");
console.log("direct_full_runtime_apply_when_claimed_selected=false");
console.log("claimed_exact_command_precredential_hold=true");
console.log("postgres_connect=false");
console.log("transaction_broadcast=false");
console.log("funds_action=false");
