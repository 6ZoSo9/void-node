#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  createHash,
  generateKeyPairSync,
} from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  buildVoidPublicOriginBindingActivationPacketV1,
} from "../tools/void-public-origin-binding-activation-packet-v1.mjs";
import {
  buildVoidPublicOriginBindingSeedServicePlanV1,
} from "../tools/void-public-origin-binding-seed-service-plan-v1.mjs";
import {
  signVoidNodePublicOriginBindingV1,
  verifyVoidNodePublicOriginBindingV1,
} from "../tools/lib/void-node-public-origin-binding-v1.mjs";
import {
  applyVoidPublicOriginBindingSeedServicePlanV1,
  inspectVoidPublicOriginBindingSeedServicePlanV1,
  requiredVoidPublicOriginBindingSeedServiceApplyConfirmationV1,
} from "../ops/public/void-public-origin-binding-seed-service-apply-v1.mjs";

const work = fs.mkdtempSync(
  path.join(
    os.tmpdir(),
    "void-public-origin-binding-seed-service-apply-v1-",
  ),
);

function sha256(value) {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function makeResponse(
  url,
  bytes,
) {
  return {
    status: 200,
    redirected: false,
    url,
    headers: new Headers({
      "content-length":
        String(bytes.length),
      "content-type":
        "application/json",
    }),
    body: new Response(bytes).body,
  };
}

try {
  const home = path.join(
    work,
    "home",
  );
  const userDir = path.join(
    home,
    ".config",
    "systemd",
    "user",
  );
  const unitName =
    "void-public-seed-gateway-v1.service";
  const unitPath = path.join(
    userDir,
    unitName,
  );
  const dropinDir = path.join(
    userDir,
    unitName + ".d",
  );
  const cleanDropin = path.join(
    dropinDir,
    "90-void-nullfeed-clean-environment.conf",
  );
  const targetDropin = path.join(
    dropinDir,
    "95-void-public-origin-binding-v1.conf",
  );

  fs.mkdirSync(
    dropinDir,
    {
      recursive: true,
      mode: 0o700,
    },
  );
  fs.writeFileSync(
    unitPath,
    [
      "[Unit]",
      "Description=fixture",
      "",
      "[Service]",
      "ExecStart=/usr/bin/node fixture.mjs",
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
  fs.writeFileSync(
    cleanDropin,
    [
      "[Service]",
      "UnsetEnvironment=VOID_PUBLIC_SEED_CHECKPOINT_ROOT LEGACY_UNUSED_NAME",
      "",
    ].join("\n"),
    { mode: 0o600 },
  );

  const {
    privateKey,
    publicKey,
  } = generateKeyPairSync("ed25519");
  const fingerprint = sha256(
    publicKey.export({
      type: "spki",
      format: "der",
    }),
  );
  const nowMs = Date.now();
  const issuedAt =
    new Date(nowMs - 60_000).toISOString();
  const expiresAt =
    new Date(
      nowMs + 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

  const binding =
    signVoidNodePublicOriginBindingV1({
      privateKey,
      publicKey,
      nodeId:
        "9d89483769e469e0473b489dc50dba96",
      origin:
        "https://seed.nullfeed.org",
      issuedAt,
      expiresAt,
    });
  const bindingFile = path.join(
    work,
    "signed-binding.json",
  );
  const bindingBytes = Buffer.from(
    JSON.stringify(
      binding,
      null,
      2,
    ) + "\n",
    "utf8",
  );
  fs.writeFileSync(
    bindingFile,
    bindingBytes,
    { mode: 0o600 },
  );

  const verifyEphemeral = (
    value,
    options,
  ) =>
    verifyVoidNodePublicOriginBindingV1(
      value,
      {
        ...options,
        expectedPublicKeyFingerprintSha256:
          fingerprint,
        nowMs:
          Number.isFinite(options?.nowMs)
            ? options.nowMs
            : nowMs,
      },
    );

  const rebuildActivationPacket = ({
    bindingFile: file,
    nowMs: verificationNowMs = nowMs,
  }) =>
    buildVoidPublicOriginBindingActivationPacketV1({
      bindingFile: file,
      nowMs: verificationNowMs,
      verifyBinding:
        verifyEphemeral,
    });

  const packet =
    rebuildActivationPacket({
      bindingFile,
    });
  const activationPacketFile =
    path.join(
      work,
      "activation-packet.json",
    );
  fs.writeFileSync(
    activationPacketFile,
    JSON.stringify(
      packet,
      null,
      2,
    ) + "\n",
    { mode: 0o600 },
  );

  const rebuildPlan = ({
    activationPacketFile: file,
    nowMs: verificationNowMs = nowMs,
  }) =>
    buildVoidPublicOriginBindingSeedServicePlanV1({
      activationPacketFile: file,
      cleanEnvironmentDropin:
        cleanDropin,
      nowMs: verificationNowMs,
      rebuildActivationPacket,
    });

  const plan =
    rebuildPlan({
      activationPacketFile,
    });
  const planFile = path.join(
    work,
    "seed-service-plan.json",
  );
  fs.writeFileSync(
    planFile,
    JSON.stringify(
      plan,
      null,
      2,
    ) + "\n",
    { mode: 0o600 },
  );

  const inspected =
    inspectVoidPublicOriginBindingSeedServicePlanV1({
      planFile,
      nowMs,
      rebuildPlan,
    });
  assert.equal(
    inspected.plan.plan_id,
    plan.plan_id,
  );
  assert.equal(
    inspected.required_confirmation,
    requiredVoidPublicOriginBindingSeedServiceApplyConfirmationV1(
      plan,
    ),
  );

  const badCalls = [];
  const badReceipt =
    path.join(
      work,
      "bad-confirmation-receipt.json",
    );
  await assert.rejects(
    () =>
      applyVoidPublicOriginBindingSeedServicePlanV1({
        planFile,
        receiptFile:
          badReceipt,
        confirmation:
          "wrong",
        homeDir: home,
        rebuildPlan,
        systemctlRunner: (args) => {
          badCalls.push(args);
          return {
            status: 0,
            stdout: "",
            stderr: "",
          };
        },
        fetchImpl: async () => {
          throw new Error(
            "fetch should not run",
          );
        },
      }),
    /exact seed-service apply confirmation mismatch/u,
  );
  assert.deepEqual(
    badCalls,
    [],
  );
  assert.equal(
    fs.existsSync(
      targetDropin,
    ),
    false,
  );
  assert.equal(
    fs.existsSync(
      badReceipt,
    ),
    false,
  );

  let freshnessRebuildCalls = 0;
  const freshnessSystemctlCalls = [];
  const freshnessReceipt = path.join(
    work,
    "freshness-recheck-receipt.json",
  );
  const freshnessRebuildPlan = ({
    activationPacketFile: file,
    nowMs: verificationNowMs,
  }) => {
    freshnessRebuildCalls += 1;
    if (freshnessRebuildCalls === 2) {
      throw new Error(
        "fixture binding expired before mutation",
      );
    }
    return rebuildPlan({
      activationPacketFile: file,
      nowMs: verificationNowMs,
    });
  };
  await assert.rejects(
    () =>
      applyVoidPublicOriginBindingSeedServicePlanV1({
        planFile,
        receiptFile: freshnessReceipt,
        confirmation:
          inspected.required_confirmation,
        homeDir: home,
        rebuildPlan:
          freshnessRebuildPlan,
        systemctlRunner: (args) => {
          freshnessSystemctlCalls.push([...args]);
          if (
            args[0] === "show"
            && args.includes("FragmentPath")
          ) {
            return {
              status: 0,
              stdout: unitPath + "\n",
              stderr: "",
            };
          }
          if (args[0] === "is-active") {
            return {
              status: 0,
              stdout: "",
              stderr: "",
            };
          }
          return {
            status: 1,
            stdout: "",
            stderr:
              "mutation systemctl call must not occur",
          };
        },
        fetchImpl: async () => {
          throw new Error(
            "fetch must not run before fresh recheck",
          );
        },
      }),
    /fixture binding expired before mutation/u,
  );
  assert.equal(freshnessRebuildCalls, 2);
  assert.deepEqual(
    freshnessSystemctlCalls,
    [
      [
        "show",
        unitName,
        "-p",
        "FragmentPath",
        "--value",
      ],
      [
        "is-active",
        unitName,
      ],
    ],
  );
  assert.equal(
    fs.existsSync(targetDropin),
    false,
  );
  assert.equal(
    fs.existsSync(freshnessReceipt),
    false,
  );

  const calls = [];
  const systemctlRunner = (
    args,
  ) => {
    calls.push([...args]);
    if (
      args[0] === "show"
      && args.includes(
        "FragmentPath",
      )
    ) {
      return {
        status: 0,
        stdout:
          unitPath + "\n",
        stderr: "",
      };
    }
    if (
      args[0] === "show"
      && args.includes(
        "Environment",
      )
    ) {
      return {
        status: 0,
        stdout:
          Object.entries(
            plan.environment,
          )
            .map(
              ([key, value]) =>
                `${key}=${value}`,
            )
            .join(" ")
          + "\n",
        stderr: "",
      };
    }
    if (
      args[0] === "is-active"
      || args[0]
        === "daemon-reload"
      || args[0]
        === "restart"
    ) {
      return {
        status: 0,
        stdout: "",
        stderr: "",
      };
    }
    return {
      status: 1,
      stdout: "",
      stderr:
        "unexpected systemctl call",
    };
  };

  const fetched = [];
  const fetchImpl = async (
    url,
  ) => {
    fetched.push(url);
    return makeResponse(
      url,
      bindingBytes,
    );
  };

  const receiptFile =
    path.join(
      work,
      "activation-receipt.json",
    );
  const applied =
    await applyVoidPublicOriginBindingSeedServicePlanV1({
      planFile,
      receiptFile,
      confirmation:
        inspected.required_confirmation,
      homeDir: home,
      rebuildPlan,
      systemctlRunner,
      fetchImpl,
    });

  assert.equal(
    applied.receipt.status,
    "activation_green",
  );
  assert.equal(
    applied.receipt.plan_id,
    plan.plan_id,
  );
  assert.equal(
    applied.receipt.target
      .dropin_changed,
    true,
  );
  assert.equal(
    applied.receipt.authority
      .daemon_reload_performed,
    true,
  );
  assert.equal(
    applied.receipt.authority
      .seed_gateway_restart_performed,
    true,
  );
  assert.equal(
    applied.receipt.authority
      .named_tunnel_restart_performed,
    false,
  );
  assert.equal(
    applied.receipt.authority
      .private_key_access,
    false,
  );
  assert.equal(
    applied.receipt.authority
      .signature_creation,
    false,
  );
  assert.equal(
    applied.receipt.authority
      .funds_movement,
    false,
  );
  assert.equal(
    fs.statSync(
      targetDropin,
    ).mode & 0o777,
    0o600,
  );
  assert.equal(
    fs.readFileSync(
      targetDropin,
      "utf8",
    ),
    plan.dropin.text,
  );
  assert.equal(
    fs.statSync(
      receiptFile,
    ).mode & 0o777,
    0o600,
  );
  assert.equal(
    fetched.length,
    2,
  );
  assert.deepEqual(
    fetched,
    [
      "http://127.0.0.1:4111/.well-known/void-node-public-origin-binding-v1.json",
      "http://127.0.0.1:4111/public-node/identity/public-origin-binding-v1.json",
    ],
  );
  assert.deepEqual(
    calls,
    [
      [
        "show",
        unitName,
        "-p",
        "FragmentPath",
        "--value",
      ],
      [
        "is-active",
        unitName,
      ],
      [
        "daemon-reload",
      ],
      [
        "restart",
        unitName,
      ],
      [
        "is-active",
        unitName,
      ],
      [
        "show",
        unitName,
        "-p",
        "Environment",
        "--value",
      ],
    ],
  );

  const previousText = [
    "[Service]",
    "Environment=LEGACY_FIXTURE=1",
    "",
  ].join("\n");
  fs.writeFileSync(
    targetDropin,
    previousText,
    { mode: 0o600 },
  );

  let restartCount = 0;
  const rollbackCalls = [];
  const failingSystemctl = (
    args,
  ) => {
    rollbackCalls.push([
      ...args,
    ]);
    if (
      args[0] === "show"
      && args.includes(
        "FragmentPath",
      )
    ) {
      return {
        status: 0,
        stdout:
          unitPath + "\n",
        stderr: "",
      };
    }
    if (
      args[0] === "is-active"
    ) {
      return {
        status: 0,
        stdout: "",
        stderr: "",
      };
    }
    if (
      args[0]
        === "daemon-reload"
    ) {
      return {
        status: 0,
        stdout: "",
        stderr: "",
      };
    }
    if (
      args[0] === "restart"
    ) {
      restartCount += 1;
      if (restartCount === 1) {
        return {
          status: 1,
          stdout: "",
          stderr:
            "fixture restart failure",
        };
      }
      return {
        status: 0,
        stdout: "",
        stderr: "",
      };
    }
    return {
      status: 1,
      stdout: "",
      stderr: "unexpected",
    };
  };

  const rollbackReceipt =
    path.join(
      work,
      "rollback-receipt.json",
    );
  await assert.rejects(
    () =>
      applyVoidPublicOriginBindingSeedServicePlanV1({
        planFile,
        receiptFile:
          rollbackReceipt,
        confirmation:
          inspected.required_confirmation,
        homeDir: home,
        rebuildPlan,
        systemctlRunner:
          failingSystemctl,
        fetchImpl,
      }),
    /seed gateway restart failed/u,
  );
  assert.equal(
    fs.readFileSync(
      targetDropin,
      "utf8",
    ),
    previousText,
  );
  assert.equal(
    fs.existsSync(
      rollbackReceipt,
    ),
    false,
  );
  assert.equal(
    restartCount,
    2,
    "failed apply must attempt one rollback restart",
  );
  assert.ok(
    rollbackCalls.some(
      (args) =>
        args[0]
          === "daemon-reload",
    ),
  );

  fs.writeFileSync(
    targetDropin,
    previousText,
    { mode: 0o600 },
  );
  let brokenDaemonCount = 0;
  let brokenRestartCount = 0;
  const brokenRollbackSystemctl = (
    args,
  ) => {
    if (
      args[0] === "show"
      && args.includes(
        "FragmentPath",
      )
    ) {
      return {
        status: 0,
        stdout:
          unitPath + "\n",
        stderr: "",
      };
    }
    if (
      args[0] === "is-active"
    ) {
      return {
        status: 0,
        stdout: "",
        stderr: "",
      };
    }
    if (
      args[0]
        === "daemon-reload"
    ) {
      brokenDaemonCount += 1;
      if (brokenDaemonCount === 1) {
        return {
          status: 0,
          stdout: "",
          stderr: "",
        };
      }
      return {
        status: 1,
        stdout: "",
        stderr:
          "fixture rollback reload failure",
      };
    }
    if (
      args[0] === "restart"
    ) {
      brokenRestartCount += 1;
      return {
        status: 1,
        stdout: "",
        stderr:
          brokenRestartCount === 1
            ? "fixture primary restart failure"
            : "fixture rollback restart failure",
      };
    }
    return {
      status: 1,
      stdout: "",
      stderr: "unexpected",
    };
  };

  const brokenRollbackReceipt =
    path.join(
      work,
      "broken-rollback-receipt.json",
    );
  await assert.rejects(
    () =>
      applyVoidPublicOriginBindingSeedServicePlanV1({
        planFile,
        receiptFile:
          brokenRollbackReceipt,
        confirmation:
          inspected.required_confirmation,
        homeDir: home,
        rebuildPlan,
        systemctlRunner:
          brokenRollbackSystemctl,
        fetchImpl,
      }),
    /rollback_failed:daemon-reload:fixture rollback reload failure\|restart:fixture rollback restart failure/u,
  );
  assert.equal(
    fs.readFileSync(
      targetDropin,
      "utf8",
    ),
    previousText,
  );
  assert.equal(
    fs.existsSync(
      brokenRollbackReceipt,
    ),
    false,
  );

  const source =
    fs.readFileSync(
      path.join(
        process.cwd(),
        "ops/public/void-public-origin-binding-seed-service-apply-v1.mjs",
      ),
      "utf8",
    );
  assert.equal(
    source.includes(
      "--systemctl",
    ),
    false,
  );
  assert.equal(
    source.includes(
      "--home",
    ),
    false,
  );
  assert.equal(
    source.includes(
      "--unit",
    ),
    false,
  );
  assert.equal(
    source.includes(
      "--port",
    ),
    false,
  );
  assert.equal(
    source.includes(
      "--origin",
    ),
    false,
  );
  assert.equal(
    source.includes(
      "--node-id",
    ),
    false,
  );
  assert.ok(
    source.includes(
      'const SYSTEMCTL = "/usr/bin/systemctl"',
    ),
  );
  const applyStart = source.indexOf(
    "export async function applyVoidPublicOriginBindingSeedServicePlanV1",
  );
  const applySignatureEnd = source.indexOf(
    "} = {}) {",
    applyStart,
  );
  const applySignature = source.slice(
    applyStart,
    applySignatureEnd + 8,
  );
  assert.equal(
    applySignature.includes("nowMs"),
    false,
    "live apply must not accept a caller-selected verification clock",
  );
  const firstInspectAt = source.indexOf(
    "inspectVoidPublicOriginBindingSeedServicePlanV1({",
    applyStart,
  );
  const preflightActiveAt = source.indexOf(
    '"seed gateway active preflight"',
    firstInspectAt,
  );
  const freshInspectAt = source.indexOf(
    "const freshInspected =",
    preflightActiveAt,
  );
  const previousDropinAt = source.indexOf(
    "const previous =",
    freshInspectAt,
  );
  const installAt = source.indexOf(
    "atomicInstallDropin(",
    previousDropinAt,
  );
  assert.ok(firstInspectAt > applyStart);
  assert.ok(preflightActiveAt > firstInspectAt);
  assert.ok(freshInspectAt > preflightActiveAt);
  assert.ok(previousDropinAt > freshInspectAt);
  assert.ok(installAt > previousDropinAt);

  console.log(
    "VOID_PUBLIC_ORIGIN_BINDING_SEED_SERVICE_APPLY_V1_PROOF_GREEN",
  );
  console.log(
    "exact_plan_confirmation_before_systemctl=true",
  );
  console.log(
    "fresh_plan_recheck_before_dropin_mutation=true",
  );
  console.log(
    "caller_selected_apply_clock=false",
  );
  console.log(
    "canonical_seed_unit_fixed=true",
  );
  console.log(
    "canonical_seed_port=4111",
  );
  console.log(
    "atomic_dropin_mode=0600",
  );
  console.log(
    "daemon_reload_performed_fixture=true",
  );
  console.log(
    "seed_gateway_restart_performed_fixture=true",
  );
  console.log(
    "binding_alias_count=2",
  );
  console.log(
    "binding_aliases_byte_identical=true",
  );
  console.log(
    "binding_artifact_sha_verified=true",
  );
  console.log(
    "rollback_restores_previous_dropin=true",
  );
  console.log(
    "rollback_restart_attempted=true",
  );
  console.log(
    "rollback_failures_visible=true",
  );
  console.log(
    "named_tunnel_restart=false",
  );
  console.log(
    "production_private_key_access=false",
  );
  console.log(
    "production_signature_creation=false",
  );
  console.log(
    "funds_movement=false",
  );
} finally {
  fs.rmSync(
    work,
    {
      recursive: true,
      force: true,
    },
  );
}
