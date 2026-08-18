import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

async function main(): Promise<void> {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-wc-remote-evidence-body-bound-v1-"),
  );
  process.env.DATA_DIR = root;
  process.env.VOID_DATA_DIR = root;
  process.env.VOID_WC_PUBLIC_EARNING_PILOT_ENABLED = "1";

  const pilot = await import(
    "../src/economic/wc_public_earning_pilot_v1.js"
  );
  const block = await import("../src/chain/block.js");

  const limit = pilot.VOID_WC_PUBLIC_REMOTE_EVIDENCE_MAX_JSON_BYTES_V1;
  assert.equal(limit, 1024 * 1024);

  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const pubPEM = publicKey
    .export({ type: "spki", format: "pem" })
    .toString();
  const executorNodeId = block.nodeIdFromPubPEM(pubPEM);

  type Target = "health" | "job" | "receipts";
  type Kind = "declared" | "streamed";
  let active: {
    target: Target;
    kind: Kind;
    job: any;
    receipt: any;
  } | null = null;

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const route: Target = url.pathname === "/health"
      ? "health"
      : url.pathname.startsWith("/jobs/")
        ? "job"
        : "receipts";
    const current = active;
    if (!current) {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "no_active_fixture" }));
      return;
    }

    if (route === current.target) {
      if (current.kind === "declared") {
        res.writeHead(200, {
          "content-type": "application/json",
          "content-length": String(limit + 1),
        });
        res.end();
        return;
      }

      res.writeHead(200, { "content-type": "application/json" });
      const chunk = "x".repeat(64 * 1024);
      let sent = 0;
      const pump = () => {
        if (res.destroyed || sent > limit + 64 * 1024) {
          if (!res.destroyed) res.end();
          return;
        }
        res.write(chunk);
        sent += chunk.length;
        setImmediate(pump);
      };
      pump();
      return;
    }

    res.writeHead(200, { "content-type": "application/json" });
    if (route === "health") {
      res.end(JSON.stringify({ ok: true, nodeId: executorNodeId }));
    } else if (route === "job") {
      res.end(JSON.stringify(current.job));
    } else {
      res.end(JSON.stringify({ receipts: [current.receipt] }));
    }
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("evidence_server_address_missing");
  }
  const base = `http://127.0.0.1:${address.port}`;

  const makeResponse = () => {
    const state: any = { statusCode: 0, payload: null };
    state.status = (code: number) => {
      state.statusCode = code;
      return state;
    };
    state.json = (payload: any) => {
      state.payload = payload;
      return payload;
    };
    return state;
  };

  let seq = 0;
  const setup = (target: Target, kind: Kind) => {
    seq += 1;
    const suffix = `${target}-${kind}-${seq}`;
    const ticketId = crypto
      .createHash("md5")
      .update(suffix)
      .digest("hex");
    const token = `wcep1.${ticketId}.${"s".repeat(43)}`;
    const account = `remote-evidence-${target}-${kind}-${seq}`;
    const now = Date.now();
    const datasetId = `ds-${suffix}`;
    const expectedInputHash = "a".repeat(64);
    const envelope = {
      ticket_id: ticketId,
      account,
      task_class: "datanet_fetch_verify",
      executor_node_id: executorNodeId,
      executor_pubkey: pubPEM,
      executor_http_base: base,
      transport_mode: "inbound_fetch" as const,
      dataset_id: datasetId,
      expected_input_hash: expectedInputHash,
      job_id: `job-${suffix}`,
      receipt_id: `rcpt-${suffix}`,
      input_hash: expectedInputHash,
      output_hash: "b".repeat(64),
      fetched_input_hash: expectedInputHash,
      receipt_ts_ms: now,
    };
    const signed = pilot.signPilotResultEnvelope(envelope, privateKey);
    const issuedFile = path.join(
      root,
      "wc_v1",
      "public-earning-pilot-v1",
      "issued",
      `${ticketId}.json`,
    );
    fs.mkdirSync(path.dirname(issuedFile), { recursive: true });
    fs.writeFileSync(
      issuedFile,
      JSON.stringify({
        marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
        version: 1,
        ticket_id: ticketId,
        account,
        task_class: "datanet_fetch_verify",
        executor_node_id: executorNodeId,
        executor_http_base: base,
        transport_mode: "inbound_fetch",
        dataset_id: datasetId,
        expected_input_hash: expectedInputHash,
        token_sha256: crypto.createHash("sha256").update(token).digest("hex"),
        nonce: "f".repeat(32),
        issued_at_ms: now - 1000,
        expires_at_ms: now + 60_000,
        max_uses: 1,
        status: "issued",
        public_submit_route: "/wc/public-earning-pilot-v1/submit-result",
        local_execute_route: "/wc/public-earning-pilot-v1/execute-local",
      }) + "\n",
      { mode: 0o600 },
    );

    const job = {
      job_id: envelope.job_id,
      account,
      kind: "datanet_fetch_verify",
      dataset_id: datasetId,
      plaintext: JSON.stringify({
        dataset_id: datasetId,
        expected_input_hash: expectedInputHash,
        capability_ticket_id: ticketId,
        executor_node_id: executorNodeId,
      }),
      meta: {
        selected_dataset_id: datasetId,
        capability_ticket_id: ticketId,
        executor_node_id: executorNodeId,
      },
    };
    const receipt = {
      receipt_id: envelope.receipt_id,
      job_id: envelope.job_id,
      account,
      kind: "datanet_fetch_verify",
      status: "completed",
      dataset_id: datasetId,
      input_hash: expectedInputHash,
      output_hash: envelope.output_hash,
      output: {
        verified: true,
        fetched_input_hash: expectedInputHash,
      },
      ts_ms: now,
    };
    active = { target, kind, job, receipt };
    return {
      ticketId,
      req: {
        headers: { authorization: `Bearer ${token}` },
        body: {
          envelope: signed.envelope,
          signature: signed.signature,
        },
      },
    };
  };

  let timerTicks = 0;
  const timer = setInterval(() => {
    timerTicks += 1;
  }, 1);

  try {
    for (const target of ["health", "job", "receipts"] as const) {
      for (const kind of ["declared", "streamed"] as const) {
        const fx = setup(target, kind);
        const response = makeResponse();
        await pilot.submitRemoteResult(fx.req, response);
        assert.equal(
          response.statusCode,
          413,
          `${target}/${kind} did not reject oversize evidence`,
        );
        assert.equal(
          response.payload.error,
          "remote_evidence_body_too_large",
        );
        const publicText = JSON.stringify(response.payload);
        assert.equal(publicText.includes(base), false);
        assert.equal(publicText.includes(root), false);
        assert.equal(
          fs.existsSync(
            path.join(
              root,
              "wc_v1",
              "public-earning-pilot-v1",
              "result-transactions",
              `${fx.ticketId}.json`,
            ),
          ),
          false,
          `${target}/${kind} reached durable result transaction`,
        );
      }
    }
  } finally {
    clearInterval(timer);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  assert.ok(timerTicks > 0, "event loop timer did not advance under streamed oversize evidence");
  assert.equal(fs.existsSync(path.join(root, "wc_v1", "ledger.jsonl")), false);
  for (const file of [
    path.join(root, "agent_v1", "receipts.jsonl"),
    path.join(root, "agent", "jobs.jsonl"),
    path.join(root, "agent_v1", "job_state.jsonl"),
  ]) {
    assert.equal(fs.existsSync(file), false, `oversize evidence reached import: ${file}`);
  }

  console.log("VOID_WC_PUBLIC_REMOTE_EVIDENCE_BODY_BOUND_V1_GREEN");
  console.log(`max_json_bytes=${limit}`);
  console.log("declared_oversize_health_job_receipts_rejected=true");
  console.log("streamed_oversize_health_job_receipts_rejected=true");
  console.log("remote_truth_import_performed=false");
  console.log("wc_credit_performed=false");
  console.log(`event_loop_timer_ticks=${timerTicks}`);
  fs.rmSync(root, { recursive: true, force: true });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
