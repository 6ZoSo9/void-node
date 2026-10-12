// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const MARKER = "VOID_WC_PUBLIC_EARNING_PILOT_V1";
const OUTBOUND_MARKER =
  "VOID_WC_PUBLIC_EARNING_OUTBOUND_PARTICIPANT_V1_GREEN";

function need(condition: unknown, message: string): asserts condition {
  assert.ok(condition, message);
}

async function main(): Promise<void> {
  const root = process.cwd();
  const modulePath = path.join(
    root,
    "src",
    "economic",
    "wc_public_earning_pilot_v1.ts",
  );
  const cliPath = path.join(
    root,
    "ops",
    "mainnet0",
    "wc-public-earning-participant-v1.sh",
  );
  const workflowPath = path.join(
    root,
    ".github",
    "workflows",
    "wc-public-earning-outbound-participant-v1.yml",
  );

  const moduleText = fs.readFileSync(modulePath, "utf8");
  const cliText = fs.readFileSync(cliPath, "utf8");
  const workflowText = fs.readFileSync(workflowPath, "utf8");

  for (const marker of [
    'export type PilotTransportMode = "inbound_fetch" | "outbound_bundle"',
    'transport_mode: PilotTransportMode',
    'transportMode === "outbound_bundle"',
    "outbound_executor_http_base_forbidden",
    "outbound_proof_bundle_invalid",
    "outbound_health_node_id_mismatch",
    "export async function verifyPilotSubmissionEvidence(",
    "coordinatorInboundFetch: false",
    "participantOutboundBundle: true",
    "proof_bundle: proofBundle",
    "inbound_executor_reachability_required_for_outbound: false",
    "outbound_evidence_bound_to_signed_envelope: true",
  ]) {
    need(moduleText.includes(marker), `module marker missing: ${marker}`);
  }

  for (const marker of [
    "tickets require no inbound participant port or coordinator callback",
    "TRANSPORT_MODE=",
    '"inbound_fetch"',
    '"outbound_bundle"',
    "coordinator_inbound_fetch",
    "participant_outbound_bundle",
    'inbound_executor_reachability_required:($transport_mode == "inbound_fetch")',
    "inbound_executor_reachability_required=%s",
    "transport_mode=%s",
  ]) {
    need(cliText.includes(marker), `participant CLI marker missing: ${marker}`);
  }

  need(
    workflowText.includes(
      "npx tsx scripts/prove_wc_public_earning_outbound_participant_v1.ts",
    ),
    "outbound workflow does not execute its proof",
  );
  need(
    workflowText.includes(
      "npx tsx scripts/prove_wc_public_earning_participant_cli_v1.ts",
    ),
    "outbound workflow does not preserve participant CLI proof",
  );
  need(
    workflowText.includes(
      "npx tsx scripts/prove_wc_public_earning_pilot_runtime_v1.ts",
    ),
    "outbound workflow does not preserve legacy pilot runtime proof",
  );
  need(
    workflowText.includes("tools/check_index_size.sh"),
    "outbound workflow does not guard index size",
  );

  const helperStart = moduleText.indexOf(
    "export async function verifyPilotSubmissionEvidence(",
  );
  const outboundStart = moduleText.indexOf(
    'if (transportMode === "outbound_bundle")',
    helperStart,
  );
  const outboundNoFetchReturn = moduleText.indexOf(
    "coordinatorInboundFetch: false",
    outboundStart,
  );
  const inboundHealthFetch = moduleText.indexOf(
    "`${record.executor_http_base}/health`",
    helperStart,
  );

  need(helperStart >= 0, "submission-evidence helper missing");
  need(outboundStart > helperStart, "outbound evidence branch missing");
  need(
    outboundNoFetchReturn > outboundStart,
    "outbound no-fetch result marker missing",
  );
  need(
    inboundHealthFetch > outboundNoFetchReturn,
    "inbound callback must be isolated after the outbound return",
  );

  const tmp = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-wc-outbound-participant-v1-"),
  );
  process.env.DATA_DIR = tmp;
  process.env.VOID_DATA_DIR = tmp;

  const pilot = await import(
    "../src/economic/wc_public_earning_pilot_v1.js"
  );
  const block = await import("../src/chain/block.js");

  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const pubPEM = publicKey
    .export({ type: "spki", format: "pem" })
    .toString();
  const executorNodeId = block.nodeIdFromPubPEM(pubPEM);
  const now = Date.now();

  const outboundEnvelopeInput = {
    ticket_id: "1".repeat(32),
    account: "outbound-participant-proof-v1",
    task_class: "datanet_fetch_verify",
    executor_node_id: executorNodeId,
    executor_pubkey: pubPEM,
    executor_http_base: "",
    transport_mode: "outbound_bundle" as const,
    dataset_id: "ds_outbound_participant_proof_v1",
    expected_input_hash: "2".repeat(64),
    job_id: "job_outbound_participant_proof_v1",
    receipt_id: "rcpt_outbound_participant_proof_v1",
    input_hash: "2".repeat(64),
    output_hash: "3".repeat(64),
    fetched_input_hash: "2".repeat(64),
    receipt_ts_ms: now,
  };

  const outboundSigned = pilot.signPilotResultEnvelope(
    outboundEnvelopeInput,
    privateKey,
  );
  const outboundEnvelope = pilot.verifyPilotResultEnvelope(
    outboundSigned.envelope,
    outboundSigned.signature,
  );

  assert.equal(outboundEnvelope.transport_mode, "outbound_bundle");
  assert.equal(outboundEnvelope.executor_http_base, "");

  const outboundTicket = {
    marker: MARKER,
    version: 1 as const,
    ticket_id: outboundEnvelope.ticket_id,
    account: outboundEnvelope.account,
    task_class: outboundEnvelope.task_class,
    executor_node_id: outboundEnvelope.executor_node_id,
    executor_http_base: "",
    transport_mode: "outbound_bundle" as const,
    dataset_id: outboundEnvelope.dataset_id,
    expected_input_hash: outboundEnvelope.expected_input_hash,
    token_sha256: "4".repeat(64),
    nonce: "5".repeat(32),
    issued_at_ms: now - 1_000,
    expires_at_ms: now + 60_000,
    max_uses: 1 as const,
    status: "issued",
    public_submit_route: "/wc/public-earning-pilot-v1/submit-result",
    local_execute_route: "/wc/public-earning-pilot-v1/execute-local",
  };

  pilot.assertPilotTicketEnvelopeMatch(
    outboundTicket,
    outboundEnvelope,
  );

  const outboundJob = {
    job_id: outboundEnvelope.job_id,
    account: outboundEnvelope.account,
    kind: outboundEnvelope.task_class,
    dataset_id: outboundEnvelope.dataset_id,
    plaintext: JSON.stringify({
      dataset_id: outboundEnvelope.dataset_id,
      expected_input_hash: outboundEnvelope.expected_input_hash,
      capability_ticket_id: outboundEnvelope.ticket_id,
      executor_node_id: outboundEnvelope.executor_node_id,
    }),
    meta: {
      selected_dataset_id: outboundEnvelope.dataset_id,
      capability_ticket_id: outboundEnvelope.ticket_id,
      executor_node_id: outboundEnvelope.executor_node_id,
    },
  };

  const outboundReceipt = {
    receipt_id: outboundEnvelope.receipt_id,
    job_id: outboundEnvelope.job_id,
    account: outboundEnvelope.account,
    kind: outboundEnvelope.task_class,
    status: "completed",
    dataset_id: outboundEnvelope.dataset_id,
    input_hash: outboundEnvelope.input_hash,
    output_hash: outboundEnvelope.output_hash,
    output: {
      verified: true,
      fetched_input_hash: outboundEnvelope.fetched_input_hash,
    },
    ts_ms: outboundEnvelope.receipt_ts_ms,
  };

  const outboundBundle = {
    marker: MARKER,
    version: 1,
    transport_mode: "outbound_bundle",
    ticket_id: outboundEnvelope.ticket_id,
    executor_node_id: outboundEnvelope.executor_node_id,
    job_id: outboundEnvelope.job_id,
    receipt_id: outboundEnvelope.receipt_id,
    health: {
      ok: true,
      nodeId: outboundEnvelope.executor_node_id,
      peers: [],
    },
    job: outboundJob,
    receipt: outboundReceipt,
  };

  const originalFetch = globalThis.fetch;
  let fetchCount = 0;

  try {
    globalThis.fetch = (async () => {
      fetchCount += 1;
      throw new Error("outbound verification attempted an inbound fetch");
    }) as typeof fetch;

    const outboundEvidence =
      await pilot.verifyPilotSubmissionEvidence(
        outboundTicket,
        outboundEnvelope,
        outboundBundle,
      );

    assert.equal(fetchCount, 0);
    assert.equal(outboundEvidence.transportMode, "outbound_bundle");
    assert.equal(outboundEvidence.coordinatorInboundFetch, false);
    assert.equal(outboundEvidence.participantOutboundBundle, true);
    assert.equal(
      outboundEvidence.health.nodeId,
      outboundEnvelope.executor_node_id,
    );

    await assert.rejects(
      () =>
        pilot.verifyPilotSubmissionEvidence(
          outboundTicket,
          outboundEnvelope,
          {
            ...outboundBundle,
            ticket_id: "6".repeat(32),
          },
        ),
      /outbound_proof_bundle_invalid/,
    );

    await assert.rejects(
      () =>
        pilot.verifyPilotSubmissionEvidence(
          outboundTicket,
          outboundEnvelope,
          {
            ...outboundBundle,
            health: {
              ...outboundBundle.health,
              nodeId: "7".repeat(32),
            },
          },
        ),
      /outbound_health_node_id_mismatch/,
    );

    await assert.rejects(
      () =>
        pilot.verifyPilotSubmissionEvidence(
          outboundTicket,
          outboundEnvelope,
          {
            ...outboundBundle,
            job: {
              ...outboundJob,
              plaintext: JSON.stringify({
                dataset_id: outboundEnvelope.dataset_id,
                expected_input_hash: "8".repeat(64),
                capability_ticket_id: outboundEnvelope.ticket_id,
                executor_node_id: outboundEnvelope.executor_node_id,
              }),
            },
          },
        ),
      /remote_job_expected_input_hash_mismatch/,
    );

    await assert.rejects(
      () =>
        pilot.verifyPilotSubmissionEvidence(
          outboundTicket,
          outboundEnvelope,
          {
            ...outboundBundle,
            receipt: {
              ...outboundReceipt,
              output_hash: "9".repeat(64),
            },
          },
        ),
      /remote_receipt_output_hash_mismatch/,
    );

    await assert.rejects(
      () =>
        pilot.verifyPilotSubmissionEvidence(
          outboundTicket,
          outboundEnvelope,
          [] as unknown as Record<string, unknown>,
        ),
      /outbound_proof_bundle_invalid/,
    );

    const inboundEnvelopeInput = {
      ...outboundEnvelopeInput,
      ticket_id: "a".repeat(32),
      executor_http_base: "https://executor.example",
      transport_mode: "inbound_fetch" as const,
      job_id: "job_inbound_compatibility_proof_v1",
      receipt_id: "rcpt_inbound_compatibility_proof_v1",
      receipt_ts_ms: now + 1,
    };
    const inboundSigned = pilot.signPilotResultEnvelope(
      inboundEnvelopeInput,
      privateKey,
    );
    const inboundEnvelope = pilot.verifyPilotResultEnvelope(
      inboundSigned.envelope,
      inboundSigned.signature,
    );
    const inboundTicket = {
      marker: MARKER,
      version: 1 as const,
      ticket_id: inboundEnvelope.ticket_id,
      account: inboundEnvelope.account,
      task_class: inboundEnvelope.task_class,
      executor_node_id: inboundEnvelope.executor_node_id,
      executor_http_base: inboundEnvelope.executor_http_base,
      transport_mode: "inbound_fetch" as const,
      dataset_id: inboundEnvelope.dataset_id,
      expected_input_hash: inboundEnvelope.expected_input_hash,
      token_sha256: "b".repeat(64),
      nonce: "c".repeat(32),
      issued_at_ms: now - 1_000,
      expires_at_ms: now + 60_000,
      max_uses: 1 as const,
      status: "issued",
      public_submit_route: "/wc/public-earning-pilot-v1/submit-result",
      local_execute_route: "/wc/public-earning-pilot-v1/execute-local",
    };

    pilot.assertPilotTicketEnvelopeMatch(
      inboundTicket,
      inboundEnvelope,
    );

    const inboundJob = {
      ...outboundJob,
      job_id: inboundEnvelope.job_id,
      plaintext: JSON.stringify({
        dataset_id: inboundEnvelope.dataset_id,
        expected_input_hash: inboundEnvelope.expected_input_hash,
        capability_ticket_id: inboundEnvelope.ticket_id,
        executor_node_id: inboundEnvelope.executor_node_id,
      }),
      meta: {
        selected_dataset_id: inboundEnvelope.dataset_id,
        capability_ticket_id: inboundEnvelope.ticket_id,
        executor_node_id: inboundEnvelope.executor_node_id,
      },
    };
    const inboundReceipt = {
      ...outboundReceipt,
      receipt_id: inboundEnvelope.receipt_id,
      job_id: inboundEnvelope.job_id,
      ts_ms: inboundEnvelope.receipt_ts_ms,
    };

    fetchCount = 0;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      fetchCount += 1;
      const url = String(input);
      let body: unknown;

      if (url.endsWith("/health")) {
        body = {
          ok: true,
          nodeId: inboundEnvelope.executor_node_id,
        };
      } else if (
        url.endsWith(
          `/jobs/${encodeURIComponent(inboundEnvelope.job_id)}`,
        )
      ) {
        body = inboundJob;
      } else if (url.includes("/receipts?")) {
        body = { receipts: [inboundReceipt] };
      } else {
        throw new Error(`unexpected inbound compatibility URL: ${url}`);
      }

      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    const inboundEvidence =
      await pilot.verifyPilotSubmissionEvidence(
        inboundTicket,
        inboundEnvelope,
      );

    assert.equal(fetchCount, 3);
    assert.equal(inboundEvidence.transportMode, "inbound_fetch");
    assert.equal(inboundEvidence.coordinatorInboundFetch, true);
    assert.equal(inboundEvidence.participantOutboundBundle, false);

    const invalidInboundReceiptTimestamps: Array<
      [string, unknown, boolean]
    > = [
      ["missing", undefined, true],
      ["null", null, false],
      ["string", String(inboundEnvelope.receipt_ts_ms), false],
      ["boolean", true, false],
      ["array", [inboundEnvelope.receipt_ts_ms], false],
      ["fractional", inboundEnvelope.receipt_ts_ms + 0.5, false],
      ["unsafe", Number.MAX_SAFE_INTEGER + 1, false],
    ];
    for (const [label, timestamp, remove] of invalidInboundReceiptTimestamps) {
      const hostileReceipt: Record<string, unknown> = {
        ...inboundReceipt,
      };
      if (remove) delete hostileReceipt.ts_ms;
      else hostileReceipt.ts_ms = timestamp;
      fetchCount = 0;
      globalThis.fetch = (async (input: RequestInfo | URL) => {
        fetchCount += 1;
        const url = String(input);
        const body = url.endsWith("/health")
          ? {
              ok: true,
              nodeId: inboundEnvelope.executor_node_id,
            }
          : url.endsWith(
                `/jobs/${encodeURIComponent(inboundEnvelope.job_id)}`,
              )
            ? inboundJob
            : url.includes("/receipts?")
              ? { receipts: [hostileReceipt] }
              : null;
        if (body === null) {
          throw new Error(`unexpected inbound timestamp URL: ${url}`);
        }
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }) as typeof fetch;
      await assert.rejects(
        () =>
          pilot.verifyPilotSubmissionEvidence(
            inboundTicket,
            inboundEnvelope,
          ),
        (error: any) =>
          String(error?.message || error).includes(
            "remote_receipt_timestamp_invalid",
          ),
        `${label} inbound receipt timestamp was accepted`,
      );
      assert.equal(fetchCount, 3);
    }
  } finally {
    globalThis.fetch = originalFetch;
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  console.log(OUTBOUND_MARKER);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
