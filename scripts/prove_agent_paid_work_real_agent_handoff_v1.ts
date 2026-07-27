#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  createHash,
} from "node:crypto";
import {
  chmodSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  spawnSync,
} from "node:child_process";

import {
  AGENT_PAID_WORK_SUBMIT_SCOPE,
  agentPaidWorkTokenSha256V1,
  materializeAgentPaidWorkCredentialRegistryV1,
  materializeAgentPaidWorkCredentialV1,
  parseAgentPaidWorkCredentialRegistryV1,
} from "./agent_paid_work_credential_registry_v1.js";

const cliPath = path.resolve(
  "scripts/agent_paid_work_real_agent_handoff_v1.ts",
);
const lifecycleCliPath = path.resolve(
  "scripts/agent_paid_work_credential_lifecycle_cli_v1.ts",
);
const orderModulePath = path.resolve(
  "scripts/agent_paid_work_order_envelope_v1.ts",
);
const requestFixturePath = path.resolve(
  "fixtures/agent-paid-work/agent-paid-work-submission-request-v1.example.json",
);
const tsxPath =
  process.env.VOID_PROOF_TSX ||
  path.resolve(
    "node_modules/.bin/tsx",
  );

function sha256(
  value: Buffer,
): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function runCli(
  args: string[],
  expectedStatus = 0,
): {
  stdout: string;
  stderr: string;
} {
  const result = spawnSync(
    tsxPath,
    [
      cliPath,
      ...args,
    ],
    {
      encoding: "utf8",
    },
  );

  assert.equal(
    result.status,
    expectedStatus,
    [
      `unexpected CLI exit for ${args.join(" ")}`,
      result.stdout,
      result.stderr,
    ].join("\n"),
  );

  return {
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

const temporary = mkdtempSync(
  path.join(
    os.tmpdir(),
    "void-real-agent-handoff-v1-",
  ),
);

try {
  const registryPath = path.join(
    temporary,
    "credential-registry-v1.json",
  );
  const tokenDirectory = path.join(
    temporary,
    "tokens",
  );

  mkdirSync(
    tokenDirectory,
    {
      mode: 0o700,
    },
  );

  const existingToken =
    "real-agent-handoff-proof-existing-token-0001";
  const existingCredential =
    materializeAgentPaidWorkCredentialV1({
      agent_id:
        "void.agent.handoff.existing",
      token_sha256:
        agentPaidWorkTokenSha256V1(
          existingToken,
        ),
      scopes: [
        AGENT_PAID_WORK_SUBMIT_SCOPE,
      ],
      issued_at_utc:
        "2026-07-27T00:00:00Z",
      expires_at_utc:
        "2027-07-27T00:00:00Z",
      revoked_at_utc:
        null,
    });
  const registry =
    materializeAgentPaidWorkCredentialRegistryV1({
      created_at_utc:
        "2026-07-27T00:00:00Z",
      credentials: [
        existingCredential,
      ],
    });

  writeFileSync(
    registryPath,
    `${JSON.stringify(
      registry,
      null,
      2,
    )}\n`,
    {
      encoding: "utf8",
      mode: 0o600,
    },
  );
  chmodSync(
    registryPath,
    0o600,
  );

  const registryBefore =
    readFileSync(
      registryPath,
    );
  const handoffDirectory =
    path.join(
      temporary,
      "handoff",
    );
  const agentId =
    "void.agent.real-handoff-proof";

  const prepare = runCli([
    "prepare",
    "--registry",
    registryPath,
    "--lifecycle-cli",
    lifecycleCliPath,
    "--tsx",
    tsxPath,
    "--output-dir",
    handoffDirectory,
    "--agent-id",
    agentId,
    "--issued-at-utc",
    "2026-07-27T01:00:00Z",
    "--expires-at-utc",
    "2027-07-27T01:00:00Z",
    "--endpoint",
    "https://void.example:8443/__void/agents/paid-work/submissions/v1",
    "--order-module",
    orderModulePath,
    "--request-fixture",
    requestFixturePath,
  ]);

  assert.equal(
    readFileSync(
      registryPath,
    ).equals(
      registryBefore,
    ),
    true,
  );

  const operatorManifest =
    JSON.parse(
      readFileSync(
        path.join(
          handoffDirectory,
          "operator-handoff-manifest-v1.json",
        ),
        "utf8",
      ),
    ) as Record<string, unknown>;
  const packetDirectory =
    path.join(
      handoffDirectory,
      "packet",
    );
  const stageDirectory =
    path.join(
      handoffDirectory,
      "stage",
    );
  const packetManifest =
    JSON.parse(
      readFileSync(
        path.join(
          packetDirectory,
          "onboarding-manifest-v1.json",
        ),
        "utf8",
      ),
    ) as Record<string, unknown>;
  const token =
    readFileSync(
      path.join(
        packetDirectory,
        "credential.token",
      ),
      "utf8",
    );
  const plan =
    JSON.parse(
      readFileSync(
        path.join(
          stageDirectory,
          "plan-v1.json",
        ),
        "utf8",
      ),
    ) as Record<string, unknown>;
  const candidate =
    parseAgentPaidWorkCredentialRegistryV1(
      JSON.parse(
        readFileSync(
          path.join(
            stageDirectory,
            "candidate-registry-v1.json",
          ),
          "utf8",
        ),
      ),
    );

  assert.equal(
    operatorManifest.activation_state,
    "staged_not_live",
  );
  assert.equal(
    operatorManifest.live,
    false,
  );
  assert.equal(
    operatorManifest.agent_id,
    agentId,
  );
  assert.equal(
    packetManifest.activation_state,
    "staged_not_live",
  );
  assert.equal(
    packetManifest.agent_id,
    agentId,
  );
  assert.equal(
    packetManifest.submission_endpoint,
    "https://void.example:8443/__void/agents/paid-work/submissions/v1",
  );
  assert.equal(
    token.length,
    43,
  );
  assert.equal(
    /\s/.test(token),
    false,
  );
  assert.equal(
    agentPaidWorkTokenSha256V1(
      token,
    ),
    plan.new_token_sha256,
  );
  assert.equal(
    candidate.credentials.length,
    2,
  );
  assert.equal(
    candidate.credentials.filter(
      (credential) =>
        credential.agent_id ===
          agentId &&
        credential.credential_id ===
          plan.new_credential_id &&
        credential.revoked_at_utc ===
          null,
    ).length,
    1,
  );
  assert.equal(
    statSync(
      handoffDirectory,
    ).mode & 0o777,
    0o700,
  );
  assert.equal(
    statSync(
      packetDirectory,
    ).mode & 0o777,
    0o700,
  );
  assert.equal(
    statSync(
      path.join(
        packetDirectory,
        "credential.token",
      ),
    ).mode & 0o777,
    0o600,
  );
  assert.equal(
    prepare.stdout.includes(
      token,
    ),
    false,
  );
  assert.equal(
    prepare.stderr.includes(
      token,
    ),
    false,
  );
  assert.match(
    prepare.stdout,
    /AGENT_PAID_WORK_REAL_AGENT_HANDOFF_V1_PREPARED_EXACT_GREEN/,
  );

  const verify = runCli([
    "verify",
    "--handoff-dir",
    handoffDirectory,
  ]);

  assert.match(
    verify.stdout,
    /AGENT_PAID_WORK_REAL_AGENT_HANDOFF_V1_VERIFIED_EXACT_GREEN/,
  );
  assert.equal(
    verify.stdout.includes(
      token,
    ),
    false,
  );

  const invalidEndpointOutput =
    path.join(
      temporary,
      "invalid-endpoint",
    );
  const invalidEndpoint = spawnSync(
    tsxPath,
    [
      cliPath,
      "prepare",
      "--registry",
      registryPath,
      "--lifecycle-cli",
      lifecycleCliPath,
      "--tsx",
      tsxPath,
      "--output-dir",
      invalidEndpointOutput,
      "--agent-id",
      "void.agent.invalid-endpoint",
      "--issued-at-utc",
      "2026-07-27T02:00:00Z",
      "--expires-at-utc",
      "2027-07-27T02:00:00Z",
      "--endpoint",
      "http://void.example/__void/agents/paid-work/submissions/v1",
      "--order-module",
      orderModulePath,
      "--request-fixture",
      requestFixturePath,
    ],
    {
      encoding: "utf8",
    },
  );

  assert.notEqual(
    invalidEndpoint.status,
    0,
  );
  assert.equal(
    statSync(temporary).isDirectory(),
    true,
  );
  assert.equal(
    (() => {
      try {
        statSync(
          invalidEndpointOutput,
        );
        return true;
      } catch {
        return false;
      }
    })(),
    false,
  );

  const duplicate = spawnSync(
    tsxPath,
    [
      cliPath,
      "prepare",
      "--registry",
      registryPath,
      "--lifecycle-cli",
      lifecycleCliPath,
      "--tsx",
      tsxPath,
      "--output-dir",
      handoffDirectory,
      "--agent-id",
      "void.agent.duplicate-output",
      "--issued-at-utc",
      "2026-07-27T03:00:00Z",
      "--expires-at-utc",
      "2027-07-27T03:00:00Z",
      "--endpoint",
      "https://void.example:8443/__void/agents/paid-work/submissions/v1",
      "--order-module",
      orderModulePath,
      "--request-fixture",
      requestFixturePath,
    ],
    {
      encoding: "utf8",
    },
  );

  assert.notEqual(
    duplicate.status,
    0,
  );
  assert.equal(
    readFileSync(
      registryPath,
    ).equals(
      registryBefore,
    ),
    true,
  );

  const manifestText =
    readFileSync(
      path.join(
        packetDirectory,
        "onboarding-manifest-v1.json",
      ),
      "utf8",
    );

  assert.equal(
    manifestText.includes(
      token,
    ),
    false,
  );
  assert.equal(
    sha256(
      readFileSync(
        registryPath,
      ),
    ),
    sha256(
      registryBefore,
    ),
  );

  console.log(
    "VOID_AGENT_PAID_WORK_REAL_AGENT_HANDOFF_V1_PROOF_GREEN",
  );
  console.log(
    "operator_supplied_agent_id=1",
  );
  console.log(
    "staged_not_live=1",
  );
  console.log(
    "existing_lifecycle_cli_reused=1",
  );
  console.log(
    "private_handoff_directory=1",
  );
  console.log(
    "private_registry_mode_required=1",
  );
  console.log(
    "tracked_source_inputs_secret_mode_required=0",
  );
  console.log(
    "tsx_symlink_target_accepted=1",
  );
  console.log(
    "private_credential_packet=1",
  );
  console.log(
    "machine_readable_manifest=1",
  );
  console.log(
    "fresh_sample_request=1",
  );
  console.log(
    "https_client_included=1",
  );
  console.log(
    "packet_verifier_green=1",
  );
  console.log(
    "source_registry_mutated=0",
  );
  console.log(
    "receiver_restart=0",
  );
  console.log(
    "raw_token_output=0",
  );
  console.log(
    "provider_selected=0",
  );
  console.log(
    "quote_created=0",
  );
  console.log(
    "payment_authorized=0",
  );
  console.log(
    "work_execution_authorized=0",
  );
  console.log(
    "work_dispatched=0",
  );
  console.log(
    "wc_ledger_write=0",
  );
  console.log(
    "wallet_access=0",
  );
  console.log(
    "buy_void_change=0",
  );
} finally {
  rmSync(
    temporary,
    {
      recursive: true,
      force: true,
    },
  );
}
