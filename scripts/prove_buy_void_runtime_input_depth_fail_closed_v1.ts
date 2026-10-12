import assert from "node:assert/strict";
import {
  handleBuyVoidRuntimeCommandV1,
} from "../src/economic/buy_void_runtime_integration_v1.js";

const MARKER = "VOID_BUY_VOID_RUNTIME_INPUT_DEPTH_FAIL_CLOSED_V1";
const ENABLE_ENV = "VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED";
const ROOT_ENV = "VOID_BUY_VOID_RUNTIME_DIR";

type CapturedResponse = {
  code: number;
  body: Record<string, unknown>;
};

function invoke(
  body: Record<string, unknown>,
  remoteAddress = "127.0.0.1",
): CapturedResponse {
  let code = 200;
  let responseBody: Record<string, unknown> = {};
  const response = {
    status(value: number) {
      code = value;
      return this;
    },
    json(value: Record<string, unknown>) {
      responseBody = value;
      return value;
    },
  };

  handleBuyVoidRuntimeCommandV1(
    {
      socket: { remoteAddress },
      body,
    },
    response,
  );

  return { code, body: responseBody };
}

function deeplyNestedExecutionMaterial(): Record<string, unknown> {
  let value: Record<string, unknown> = {
    private_key: "must-never-reach-a-pipeline-handler",
  };
  for (let depth = 0; depth < 20; depth += 1) {
    value = { nested: value };
  }
  return value;
}

function main(): void {
  const savedEnable = process.env[ENABLE_ENV];
  const savedRoot = process.env[ROOT_ENV];

  try {
    process.env[ENABLE_ENV] = "1";
    process.env[ROOT_ENV] = "/tmp/void-buy-runtime-input-depth-proof-v1";

    const deeplyNested = invoke({
      action: "verify_and_claim",
      request_id: "depth-proof-request-v1",
      stage_command: deeplyNestedExecutionMaterial(),
    });
    assert.equal(deeplyNested.code, 400);
    assert.equal(deeplyNested.body.error, "input_nesting_depth_exceeded");
    assert.equal(
      deeplyNested.body.forbidden_key,
      "__input_nesting_depth_exceeded__",
    );
    assert.equal(deeplyNested.body.max_input_nesting_depth, 12);

    const shallowForbidden = invoke({
      action: "verify_and_claim",
      private_key: "must-never-reach-a-pipeline-handler",
    });
    assert.equal(shallowForbidden.code, 400);
    assert.equal(
      shallowForbidden.body.error,
      "forbidden_execution_material",
    );
    assert.equal(shallowForbidden.body.forbidden_key, "private_key");

    const remote = invoke(
      { action: "verify_and_claim" },
      "203.0.113.9",
    );
    assert.equal(remote.code, 403);
    assert.equal(remote.body.error, "operator_loopback_only");
  } finally {
    if (savedEnable === undefined) delete process.env[ENABLE_ENV];
    else process.env[ENABLE_ENV] = savedEnable;

    if (savedRoot === undefined) delete process.env[ROOT_ENV];
    else process.env[ROOT_ENV] = savedRoot;
  }

  console.log(`${MARKER}_PROOF_GREEN`);
  console.log("deeply_nested_execution_material_reaches_pipeline=false");
  console.log("wallet_signer_rpc_transaction_authority=false");
}

main();
