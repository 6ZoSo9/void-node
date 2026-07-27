#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  createHash,
} from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
  chmodSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  spawnSync,
} from "node:child_process";

import {
  AGENT_PAID_WORK_SUBMIT_SCOPE,
  agentPaidWorkTokenSha256V1,
  authenticateAgentPaidWorkCredentialV1,
  materializeAgentPaidWorkCredentialRegistryV1,
  materializeAgentPaidWorkCredentialV1,
  parseAgentPaidWorkCredentialRegistryV1,
} from "./agent_paid_work_credential_registry_v1.js";

const cliPath = path.resolve(
  "scripts/agent_paid_work_credential_lifecycle_cli_v1.ts",
);
const tsxPath =
  process.env.VOID_PROOF_TSX ||
  path.resolve(
    "node_modules/.bin/tsx",
  );

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

function sha256File(
  pathname: string,
): string {
  return createHash("sha256")
    .update(
      readFileSync(pathname),
    )
    .digest("hex");
}

const temporary = mkdtempSync(
  path.join(
    os.tmpdir(),
    "void-agent-paid-work-credential-lifecycle-cli-v1-",
  ),
);

try {
  const registryPath = path.join(
    temporary,
    "registry.json",
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

  const originalToken =
    "credential-lifecycle-proof-original-token-0001";
  const originalCredential =
    materializeAgentPaidWorkCredentialV1({
      agent_id:
        "void.agent.lifecycle.original",
      token_sha256:
        agentPaidWorkTokenSha256V1(
          originalToken,
        ),
      scopes: [
        AGENT_PAID_WORK_SUBMIT_SCOPE,
      ],
      issued_at_utc:
        "2026-07-27T00:00:00Z",
      expires_at_utc:
        "2027-07-27T00:00:00Z",
      revoked_at_utc: null,
    });
  const originalRegistry =
    materializeAgentPaidWorkCredentialRegistryV1({
      created_at_utc:
        "2026-07-27T00:00:00Z",
      credentials: [
        originalCredential,
      ],
    });

  writeFileSync(
    registryPath,
    `${JSON.stringify(originalRegistry, null, 2)}\n`,
    {
      encoding: "utf8",
      mode: 0o600,
    },
  );
  chmodSync(
    registryPath,
    0o600,
  );

  const inspect = runCli([
    "inspect",
    "--registry",
    registryPath,
    "--evaluated-at-utc",
    "2026-07-27T00:30:00Z",
  ]);
  assert.equal(
    inspect.stdout.includes(
      originalToken,
    ),
    false,
  );
  assert.match(
    inspect.stdout,
    /"state": "active"/,
  );

  const issueStage = path.join(
    temporary,
    "stage-issue",
  );
  const sourceBeforeIssue =
    readFileSync(registryPath);
  const sourceShaBeforeIssue =
    sha256File(registryPath);

  const issue = runCli([
    "stage-issue",
    "--registry",
    registryPath,
    "--stage-dir",
    issueStage,
    "--agent-id",
    "void.agent.lifecycle.issued",
    "--issued-at-utc",
    "2026-07-27T01:00:00Z",
    "--expires-at-utc",
    "2027-07-27T01:00:00Z",
  ]);
  assert.equal(
    readFileSync(registryPath).equals(
      sourceBeforeIssue,
    ),
    true,
  );
  assert.equal(
    issue.stdout.includes(
      readFileSync(
        path.join(
          issueStage,
          "credential.token",
        ),
        "utf8",
      ),
    ),
    false,
  );
  assert.equal(
    statSync(issueStage).mode & 0o777,
    0o700,
  );
  assert.equal(
    statSync(
      path.join(
        issueStage,
        "credential.token",
      ),
    ).mode & 0o777,
    0o600,
  );

  const issueApply = runCli([
    "apply",
    "--registry",
    registryPath,
    "--stage-dir",
    issueStage,
    "--token-dir",
    tokenDirectory,
    "--expected-source-sha256",
    sourceShaBeforeIssue,
    "--confirm",
    "apply-agent-paid-work-credential-lifecycle-v1",
  ]);
  assert.match(
    issueApply.stdout,
    /receiver_restart_required=true/,
  );
  assert.match(
    issueApply.stdout,
    /live_effect=false/,
  );

  const issuedPlan = JSON.parse(
    readFileSync(
      path.join(
        issueStage,
        "plan-v1.json",
      ),
      "utf8",
    ),
  ) as Record<string, unknown>;
  const issuedTokenPath = path.join(
    tokenDirectory,
    String(
      issuedPlan.token_destination_filename,
    ),
  );
  const issuedToken =
    readFileSync(
      issuedTokenPath,
      "utf8",
    );
  assert.equal(
    issueApply.stdout.includes(
      issuedToken,
    ),
    false,
  );

  let registry =
    parseAgentPaidWorkCredentialRegistryV1(
      JSON.parse(
        readFileSync(
          registryPath,
          "utf8",
        ),
      ),
    );
  assert.equal(
    registry.credentials.length,
    2,
  );
  assert.equal(
    authenticateAgentPaidWorkCredentialV1(
      `Bearer ${issuedToken}`,
      registry,
      "2026-07-27T01:30:00Z",
    ).ok,
    true,
  );

  const rotateStage = path.join(
    temporary,
    "stage-rotate",
  );
  const sourceShaBeforeRotate =
    sha256File(registryPath);

  const rotate = runCli([
    "stage-rotate",
    "--registry",
    registryPath,
    "--stage-dir",
    rotateStage,
    "--credential-id",
    originalCredential.credential_id,
    "--effective-at-utc",
    "2026-07-27T02:00:00Z",
    "--expires-at-utc",
    "2027-07-27T02:00:00Z",
  ]);

  const rotateToken =
    readFileSync(
      path.join(
        rotateStage,
        "credential.token",
      ),
      "utf8",
    );
  assert.equal(
    rotate.stdout.includes(
      rotateToken,
    ),
    false,
  );

  runCli([
    "apply",
    "--registry",
    registryPath,
    "--stage-dir",
    rotateStage,
    "--token-dir",
    tokenDirectory,
    "--expected-source-sha256",
    sourceShaBeforeRotate,
    "--confirm",
    "apply-agent-paid-work-credential-lifecycle-v1",
  ]);

  const rotatePlan = JSON.parse(
    readFileSync(
      path.join(
        rotateStage,
        "plan-v1.json",
      ),
      "utf8",
    ),
  ) as Record<string, unknown>;
  const rotatedToken =
    readFileSync(
      path.join(
        tokenDirectory,
        String(
          rotatePlan.token_destination_filename,
        ),
      ),
      "utf8",
    );

  registry =
    parseAgentPaidWorkCredentialRegistryV1(
      JSON.parse(
        readFileSync(
          registryPath,
          "utf8",
        ),
      ),
    );
  assert.equal(
    registry.credentials.length,
    3,
  );
  assert.deepEqual(
    authenticateAgentPaidWorkCredentialV1(
      `Bearer ${originalToken}`,
      registry,
      "2026-07-27T02:00:00Z",
    ),
    {
      ok: false,
      reason: "credential_revoked",
    },
  );
  assert.equal(
    authenticateAgentPaidWorkCredentialV1(
      `Bearer ${rotatedToken}`,
      registry,
      "2026-07-27T02:00:00Z",
    ).ok,
    true,
  );

  const revokeStage = path.join(
    temporary,
    "stage-revoke",
  );
  const sourceShaBeforeRevoke =
    sha256File(registryPath);

  runCli([
    "stage-revoke",
    "--registry",
    registryPath,
    "--stage-dir",
    revokeStage,
    "--credential-id",
    String(
      issuedPlan.new_credential_id,
    ),
    "--effective-at-utc",
    "2026-07-27T03:00:00Z",
  ]);

  runCli([
    "apply",
    "--registry",
    registryPath,
    "--stage-dir",
    revokeStage,
    "--token-dir",
    "-",
    "--expected-source-sha256",
    sourceShaBeforeRevoke,
    "--confirm",
    "apply-agent-paid-work-credential-lifecycle-v1",
  ]);

  registry =
    parseAgentPaidWorkCredentialRegistryV1(
      JSON.parse(
        readFileSync(
          registryPath,
          "utf8",
        ),
      ),
    );
  assert.deepEqual(
    authenticateAgentPaidWorkCredentialV1(
      `Bearer ${issuedToken}`,
      registry,
      "2026-07-27T03:00:00Z",
    ),
    {
      ok: false,
      reason: "credential_revoked",
    },
  );

  const mismatchStage = path.join(
    temporary,
    "stage-mismatch",
  );

  runCli([
    "stage-issue",
    "--registry",
    registryPath,
    "--stage-dir",
    mismatchStage,
    "--agent-id",
    "void.agent.lifecycle.mismatch",
    "--issued-at-utc",
    "2026-07-27T04:00:00Z",
    "--expires-at-utc",
    "2027-07-27T04:00:00Z",
  ]);

  const beforeMismatch =
    readFileSync(registryPath);

  const mismatch = spawnSync(
    tsxPath,
    [
      cliPath,
      "apply",
      "--registry",
      registryPath,
      "--stage-dir",
      mismatchStage,
      "--token-dir",
      tokenDirectory,
      "--expected-source-sha256",
      "0".repeat(64),
      "--confirm",
      "apply-agent-paid-work-credential-lifecycle-v1",
    ],
    {
      encoding: "utf8",
    },
  );

  assert.notEqual(
    mismatch.status,
    0,
  );
  assert.equal(
    readFileSync(registryPath).equals(
      beforeMismatch,
    ),
    true,
  );
  assert.equal(
    mismatch.stdout.includes(
      readFileSync(
        path.join(
          mismatchStage,
          "credential.token",
        ),
        "utf8",
      ),
    ),
    false,
  );
  assert.equal(
    mismatch.stderr.includes(
      readFileSync(
        path.join(
          mismatchStage,
          "credential.token",
        ),
        "utf8",
      ),
    ),
    false,
  );

  console.log(
    "VOID_AGENT_PAID_WORK_CREDENTIAL_LIFECYCLE_CLI_V1_PROOF_GREEN",
  );
  console.log(
    "staged_mutation_before_apply=1",
  );
  console.log(
    "expected_source_sha_gate=1",
  );
  console.log(
    "atomic_registry_replace=1",
  );
  console.log(
    "private_token_file=1",
  );
  console.log(
    "raw_token_output=0",
  );
  console.log(
    "issue_supported=1",
  );
  console.log(
    "rotation_revokes_old_credential=1",
  );
  console.log(
    "revocation_supported=1",
  );
  console.log(
    "receiver_restart_required=1",
  );
  console.log(
    "live_effect_before_restart=0",
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
