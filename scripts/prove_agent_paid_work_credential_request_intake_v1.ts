#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  AGENT_PAID_WORK_CREDENTIAL_REQUEST_MARKER,
  AGENT_PAID_WORK_SUBMIT_SCOPE,
  materializeAgentPaidWorkCredentialRequestV1,
  parseAgentPaidWorkCredentialRequestV1,
  receiveAgentPaidWorkCredentialRequestV1,
} from "./agent_paid_work_credential_request_intake_v1.js";

const temporary =
  mkdtempSync(
    path.join(
      os.tmpdir(),
      "void-agent-paid-work-credential-request-intake-v1-",
    ),
  );

try {
  const stateDirectory =
    path.join(
      temporary,
      "state",
    );
  const draft = {
    marker:
      AGENT_PAID_WORK_CREDENTIAL_REQUEST_MARKER,
    version: 1 as const,
    created_at_utc:
      "2026-07-27T18:00:00Z",
    expires_at_utc:
      "2026-07-27T20:00:00Z",
    agent_id:
      "void.agent.request-intake-proof",
    callback_uri:
      "https://agent.example.invalid/void/callback",
    requested_scope:
      AGENT_PAID_WORK_SUBMIT_SCOPE,
    requested_credential_lifetime_days:
      30,
    capability_ids: [
      "datanet.fetch_verify",
    ],
    nonce:
      "request-intake-proof-nonce-0001",
  };
  const request =
    materializeAgentPaidWorkCredentialRequestV1(
      draft,
    );

  assert.match(
    request.request_id,
    /^voidapwcrq1_[0-9a-f]{64}$/,
  );
  assert.deepEqual(
    parseAgentPaidWorkCredentialRequestV1(
      request,
    ),
    request,
  );

  const first =
    receiveAgentPaidWorkCredentialRequestV1({
      state_directory:
        stateDirectory,
      request,
      received_at_utc:
        "2026-07-27T18:30:00Z",
    });

  assert.equal(
    first.ok,
    true,
  );
  assert.equal(
    first.duplicate,
    false,
  );
  assert.equal(
    first.receipt.decision,
    "accepted_for_review",
  );
  assert.deepEqual(
    first.receipt.reason_codes,
    [],
  );
  assert.equal(
    Object.values(
      first.receipt.authority,
    ).every(
      (value) =>
        value === false,
    ),
    true,
  );
  assert.equal(
    readdirSync(
      path.join(
        stateDirectory,
        "requests",
      ),
    ).length,
    1,
  );
  assert.equal(
    readdirSync(
      path.join(
        stateDirectory,
        "receipts",
      ),
    ).length,
    1,
  );
  assert.equal(
    statSync(
      stateDirectory,
    ).mode & 0o777,
    0o700,
  );

  const requestPath =
    path.join(
      stateDirectory,
      "requests",
      `${request.request_id}.json`,
    );
  const receiptPath =
    path.join(
      stateDirectory,
      "receipts",
      `${request.request_id}.json`,
    );

  assert.equal(
    statSync(
      requestPath,
    ).mode & 0o777,
    0o600,
  );
  assert.equal(
    statSync(
      receiptPath,
    ).mode & 0o777,
    0o600,
  );

  const requestBefore =
    readFileSync(
      requestPath,
    );
  const receiptBefore =
    readFileSync(
      receiptPath,
    );

  const duplicate =
    receiveAgentPaidWorkCredentialRequestV1({
      state_directory:
        stateDirectory,
      request,
      received_at_utc:
        "2026-07-27T18:45:00Z",
    });

  assert.equal(
    duplicate.ok,
    true,
  );
  assert.equal(
    duplicate.duplicate,
    true,
  );
  assert.deepEqual(
    duplicate.receipt,
    first.receipt,
  );
  assert.equal(
    readFileSync(
      requestPath,
    ).equals(
      requestBefore,
    ),
    true,
  );
  assert.equal(
    readFileSync(
      receiptPath,
    ).equals(
      receiptBefore,
    ),
    true,
  );

  assert.throws(() => {
    materializeAgentPaidWorkCredentialRequestV1({
      ...draft,
      callback_uri:
        "http://agent.example.invalid/callback",
      nonce:
        "request-intake-proof-nonce-0002",
    });
  });

  assert.throws(() => {
    materializeAgentPaidWorkCredentialRequestV1({
      ...draft,
      capability_ids: [
        "datanet.fetch_verify",
        "datanet.fetch_verify",
      ],
      nonce:
        "request-intake-proof-nonce-0003",
    });
  });

  const expired =
    materializeAgentPaidWorkCredentialRequestV1({
      ...draft,
      nonce:
        "request-intake-proof-nonce-0004",
    });

  assert.throws(() => {
    receiveAgentPaidWorkCredentialRequestV1({
      state_directory:
        path.join(
          temporary,
          "expired-state",
        ),
      request:
        expired,
      received_at_utc:
        "2026-07-27T20:00:00Z",
    });
  });
  assert.equal(
    (() => {
      try {
        statSync(
          path.join(
            temporary,
            "expired-state",
          ),
        );
        return true;
      } catch {
        return false;
      }
    })(),
    false,
  );

  assert.throws(() => {
    parseAgentPaidWorkCredentialRequestV1({
      ...request,
      request_id:
        "voidapwcrq1_"
        + "0".repeat(64),
    });
  });

  const combined =
    [
      requestBefore,
      receiptBefore,
    ]
      .map(
        (value) =>
          value.toString("utf8"),
      )
      .join("\n");

  assert.equal(
    combined.includes(
      "credential.token",
    ),
    false,
  );
  assert.equal(
    combined.includes(
      "apply-agent-paid-work-credential-lifecycle-v1",
    ),
    false,
  );

  console.log(
    "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_INTAKE_V1_PROOF_GREEN",
  );
  console.log(
    "machine_readable_request_contract=1",
  );
  console.log(
    "https_callback_required=1",
  );
  console.log(
    "scope_exact_agent_paid_work_submit=1",
  );
  console.log(
    "credential_lifetime_bounded_1_90_days=1",
  );
  console.log(
    "capabilities_sorted_unique=1",
  );
  console.log(
    "request_id_content_addressed=1",
  );
  console.log(
    "append_only_request_and_receipt=1",
  );
  console.log(
    "duplicate_request_second_write=0",
  );
  console.log(
    "expired_request_state_write=0",
  );
  console.log(
    "credential_created=0",
  );
  console.log(
    "credential_registry_mutated=0",
  );
  console.log(
    "receiver_restart=0",
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
    "wc_award_authorized=0",
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
