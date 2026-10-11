#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import {
  VOID_BUY_VOID_CUSTODY_INSPECT_CLIENT_AUTHORITY_V1,
  VOID_BUY_VOID_CUSTODY_INSPECT_CLIENT_V1,
  inspectVoidBuyAllocationCustodyServiceV2ReadOnlyV1,
} from "../tools/void-buy-allocation-custody-inspect-client-v1.mjs";

const full = process.argv.length === 2;
assert.equal(process.argv.length === 2 ||
  (process.argv.length === 3 && process.argv[2] === "--protocol-only"), true);
assert.equal(process.platform, "linux");
assert.ok(process.getuid() > 0 && process.getgid() > 0);
assert.equal(VOID_BUY_VOID_CUSTODY_INSPECT_CLIENT_AUTHORITY_V1.inspect_only, true);
for (const key of ["socket_peer_credentials_authenticated",
  "cross_uid_principal_separation_verified", "protected_custody_verified",
  "payment_acceptance", "runtime_integration", "presale_activation", "funds_movement"]) {
  assert.equal(VOID_BUY_VOID_CUSTODY_INSPECT_CLIENT_AUTHORITY_V1[key], false);
}
const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-custody-inspect-ipc-v1-"));
const socketParent = path.join(root, "run");
fs.mkdirSync(socketParent, { mode: 0o750 });
fs.chmodSync(socketParent, 0o750);
const socketPath = path.join(socketParent, "custody-v2.sock");
const uid = process.getuid();
const gid = process.getgid();
const config = () => ({
  socket_path: socketPath,
  expected_socket_uid: uid,
  expected_socket_gid: gid,
  timeout_ms: 150,
});
const MARKER = "VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_V2";
const sha = input => "sha256:" + crypto.createHash("sha256")
  .update(Buffer.from(input, "utf8")).digest("hex");
function canonical(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean" ||
      typeof value === "number") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return "{" + Object.keys(value).sort().map(k => JSON.stringify(k) + ":" +
    canonical(value[k])).join(",") + "}";
}
const envelope = {
  schema: "void_buy_void_allocation_custody_service_request_v2",
  marker: MARKER, version: 2, method: "inspect", request: {},
};
const decision = Object.freeze({
  ok: true, status: "inspected", record_id: null,
  allocation_record_hash: null, record_count: 0,
  tip_hash: "sha256:" + "0".repeat(64), operation_performed: false,
  custody_cross_uid_lock_participation_verified: false,
  web_payment_writer_cross_uid_lock_participation_verified: false,
  payment_capacity_lock_verified: false,
  allocation_handoff_atomicity_proven: false,
  runtime_integration: false, payment_acceptance: false,
  transaction_broadcast: false, funds_movement: false,
});
const baseline = Object.freeze({
  schema: "void_buy_void_allocation_custody_service_response_v2",
  marker: MARKER, version: 2,
  request_sha256: sha(canonical(envelope)), decision,
});
function held(value) {
  assert.equal(value.marker, VOID_BUY_VOID_CUSTODY_INSPECT_CLIENT_V1);
  assert.equal(value.ok, false);
  assert.equal(value.status, "held");
  assert.equal(value.socket_peer_credentials_authenticated, false);
  assert.equal(value.payment_acceptance, false);
  assert.equal(value.production_gate_ready, false);
  assert.equal(value.funds_movement, false);
}
async function withServer(write, check) {
  const sockets = new Set();
  const server = net.createServer({ allowHalfOpen: true }, socket => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
    let input = "";
    socket.on("data", bytes => { input += bytes.toString("utf8"); });
    socket.on("end", () => {
      // Real custody V2 rejects unsorted but semantically identical JSON.
      assert.equal(input, canonical(envelope) + "\n");
      const req = JSON.parse(input);
      assert.equal(req.method, "inspect");
      assert.deepEqual(req.request, {});
      write(socket, req);
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(socketPath, resolve);
  });
  fs.chmodSync(socketPath, 0o660);
  try { await check(); }
  finally {
    for (const socket of sockets) socket.destroy();
    await new Promise(resolve => server.close(resolve));
    if (fs.existsSync(socketPath)) fs.unlinkSync(socketPath);
  }
}
async function fake(write, accepted) {
  await withServer(write, async () => {
    const result = await inspectVoidBuyAllocationCustodyServiceV2ReadOnlyV1(config());
    if (accepted) {
      assert.equal(result.status, "source_inspected");
      assert.equal(result.ok, true);
      assert.equal(result.record_count, 0);
      assert.equal(result.tip_hash, decision.tip_hash);
      assert.equal(result.socket_peer_credentials_authenticated, false);
      assert.equal(result.cross_uid_principal_separation_verified, false);
      assert.equal(result.protected_custody_verified, false);
      assert.equal(result.operation_performed, false);
      assert.equal(result.allocation_write, false);
      assert.equal(result.lock_release_authorized, false);
      assert.equal(result.production_gate_ready, false);
      assert.equal(result.presale_activation, false);
      assert.equal(result.funds_movement, false);
    } else held(result);
  });
}
const deliver = (socket, value) => socket.end(JSON.stringify(value) + "\n");
try {
  // Malformed config must fail before touching the socket or running hooks.
  let traps = 0;
  held(await inspectVoidBuyAllocationCustodyServiceV2ReadOnlyV1(new Proxy(config(), {
    get() { traps++; throw Error("proxy_get_forbidden"); },
  })));
  assert.equal(traps, 0);
  const accessor = config();
  Object.defineProperty(accessor, "socket_path", { enumerable: true,
    get() { traps++; throw Error("accessor_forbidden"); } });
  held(await inspectVoidBuyAllocationCustodyServiceV2ReadOnlyV1(accessor));
  assert.equal(traps, 0);
  held(await inspectVoidBuyAllocationCustodyServiceV2ReadOnlyV1({
    ...config(), timeout_ms: 0,
  }));
  held(await inspectVoidBuyAllocationCustodyServiceV2ReadOnlyV1({
    ...config(), extra: "unreviewed",
  }));
  held(await inspectVoidBuyAllocationCustodyServiceV2ReadOnlyV1(config()));

  await fake(socket => deliver(socket, baseline), true);
  // Canonical custody/high-water identity: count is bounded and the digest
  // must be lowercase SHA-256; zero count has exactly the zero-genesis tip.
  await fake(socket => deliver(socket, { ...baseline, decision: { ...decision,
    record_count: 100_001 } }), false);
  await fake(socket => deliver(socket, { ...baseline, decision: { ...decision,
    record_count: -1 } }), false);
  await fake(socket => deliver(socket, { ...baseline, decision: { ...decision,
    tip_hash: "INVALID-TIP" } }), false);
  await fake(socket => deliver(socket, { ...baseline, decision: { ...decision,
    tip_hash: "sha256:" + "A".repeat(64) } }), false);
  await fake(socket => deliver(socket, { ...baseline, decision: { ...decision,
    tip_hash: "sha256:" + "0".repeat(63) } }), false);
  await fake(socket => deliver(socket, { ...baseline, decision: { ...decision,
    tip_hash: "sha256:" + "1".repeat(64) } }), false);
  // The inclusive count ceiling is allowed with a canonical nonzero tip.
  await withServer(socket => deliver(socket, { ...baseline, decision: {
    ...decision, record_count: 100_000, tip_hash: "sha256:" + "a".repeat(64),
  } }), async () => {
    const seen = await inspectVoidBuyAllocationCustodyServiceV2ReadOnlyV1(config());
    assert.equal(seen.ok, true);
    assert.equal(seen.status, "source_inspected");
    assert.equal(seen.record_count, 100_000);
    assert.equal(seen.tip_hash, "sha256:" + "a".repeat(64));
    assert.equal(seen.payment_acceptance, false);
    assert.equal(seen.production_gate_ready, false);
  });
  await fake(socket => deliver(socket, { ...baseline, request_sha256: sha("other") }), false);
  await fake(socket => deliver(socket, { ...baseline, decision: { ...decision,
    operation_performed: true } }), false);
  await fake(socket => deliver(socket, { ...baseline, decision: { ...decision,
    payment_acceptance: true } }), false);
  await fake(socket => deliver(socket, { ...baseline, decision: { ...decision,
    status: "reserved" } }), false);
  await fake(socket => deliver(socket, { ...baseline, extra: "forged" }), false);
  await fake(socket => socket.end(JSON.stringify(baseline).replace(
    '"version":2', '"version":2,"version":2') + "\n"), false);
  await fake(socket => socket.end("{broken}\n"), false);
  await fake(socket => socket.end(JSON.stringify(baseline) + "\n{}\n"), false);
  await fake(socket => socket.end(Buffer.alloc(65537, 0x61)), false);
  await fake(() => {}, false); // total deadline, not socket inactivity.
  await withServer(socket => deliver(socket, baseline), async () => {
    held(await inspectVoidBuyAllocationCustodyServiceV2ReadOnlyV1({
      ...config(), expected_socket_uid: uid + 1,
    }));
    held(await inspectVoidBuyAllocationCustodyServiceV2ReadOnlyV1({
      ...config(), expected_socket_gid: gid + 1,
    }));
  });

  if (full) {
    // A real *disposable same-UID* custody service exercises the complete
    // server protocol without starting production, paying or writing ledgers.
    const [{createVoidBuyAllocationCustodyServiceV2},
      {deriveBuyVoidAllocationReservationHighWaterV1}] = await Promise.all([
      import("../tools/void-buy-allocation-custody-service-v2.mjs"),
      import("../dist/economic/buy_void_allocation_reservation_high_water_v1.js"),
    ]);
    const requestRoot = path.join(root, "requests");
    const ledgerRoot = path.join(root, "ledger");
    const custodyRoot = path.join(root, "custody");
    const lockRoot = path.join(root, "capacity-lock");
    for (const name of [requestRoot, ledgerRoot, custodyRoot]) {
      fs.mkdirSync(name, { mode: 0o700 });
      fs.chmodSync(name, 0o700);
    }
    fs.mkdirSync(lockRoot, { mode: 0o3770 });
    fs.chmodSync(lockRoot, 0o3770);
    fs.writeFileSync(path.join(requestRoot, "requests.jsonl"), "{}\n", {mode:0o600});
    fs.writeFileSync(path.join(requestRoot, "operator-events.jsonl"), "{}\n", {mode:0o600});
    fs.writeFileSync(path.join(ledgerRoot, "allocation-reservations-v1.jsonl"), "", {mode:0o600});
    const genesis = deriveBuyVoidAllocationReservationHighWaterV1("");
    assert.equal(genesis.ok, true, genesis.reason);
    fs.writeFileSync(path.join(custodyRoot, "allocation-reservation-high-water-v1.json"),
      genesis.high_water_json, {mode:0o600});
    const service = createVoidBuyAllocationCustodyServiceV2({
      socket_path: socketPath,
      request_root: requestRoot,
      ledger_root: ledgerRoot,
      custody_root: custodyRoot,
      socket_group_gid: gid,
      capacity_lock: {
        shared_directory: lockRoot,
        custody_uid: uid,
        web_uid: uid + 10000,
        shared_gid: gid,
        wait_timeout_ms: 5000,
        poll_interval_ms: 10,
      },
    });
    await service.start();
    try {
      // Actual server parsing and descriptor census can take longer than
      // a synthetic 150ms adversarial peer deadline on hosted runners.
      const actual = await inspectVoidBuyAllocationCustodyServiceV2ReadOnlyV1({
        ...config(), timeout_ms: 3000,
      });
      assert.equal(actual.ok, true, actual.reason);
      assert.equal(actual.status, "source_inspected");
      assert.equal(actual.record_count, 0);
      assert.equal(actual.operation_performed, false);
      assert.equal(actual.payment_acceptance, false);
      assert.equal(actual.production_gate_ready, false);
    } finally { await service.stop(); }
  }
  console.log("VOID_BUY_VOID_CUSTODY_INSPECT_IPC_V1_PROOF_GREEN");
  console.log("bounded_socket_request_and_reply=true");
  console.log("request_digest_bound=true");
  console.log("malformed_and_oversize_replies_hold=true");
  console.log("positive_decision_authority_false=true");
  console.log("socket_path_and_metadata_preflight=true");
  console.log("absolute_deadline_enforced=true");
  console.log("config_proxy_and_accessors_not_executed=true");
  console.log("actual_custody_v2_server_protocol_proven=" + full);
  console.log("cross_uid_principal_separation_verified=false");
  console.log("protected_custody_verified=false");
  console.log("runtime_integration=false");
  console.log("payment_acceptance=false");
  console.log("presale_activation=false");
  console.log("funds_movement=false");
} finally {
  fs.rmSync(root, {recursive:true, force:true});
}
