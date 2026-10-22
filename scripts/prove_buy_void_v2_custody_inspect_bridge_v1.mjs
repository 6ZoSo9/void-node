// Real disposable Unix-socket custody V2 integration after the authentic
// V2 bearer and allocation planner, with ZERO customer/ledger mutations.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createVoidBuyAllocationCustodyServiceV2,
} from "../tools/void-buy-allocation-custody-service-v2.mjs";
import {
  deriveBuyVoidAllocationReservationHighWaterV1,
} from "../dist/economic/buy_void_allocation_reservation_high_water_v1.js";
import {
  VOID_BUY_VOID_V2_CUSTODY_INSPECT_BRIDGE,
  VOID_BUY_VOID_V2_CUSTODY_INSPECT_BRIDGE_AUTHORITY,
  inspectAuthenticatedBuyVoidV2CustodyBoundary,
} from "../src/economic/buy_void_v2_custody_inspect_bridge_v1.mjs";
import {
  VOID_BUY_VOID_VERIFIED_PAYMENT_ROUTE_V2,
} from "../dist/economic/buy_void_verified_payment_transport_v2.js";
import {
  VOID_BUY_VOID_ALLOCATION_LEDGER_ROOT_V1,
  VOID_BUY_VOID_ALLOCATION_HIGH_WATER_ROOT_V1,
} from "../dist/economic/buy_void_operator_verified_allocation_dispatch_v1.js";

assert.equal(process.platform, "linux");
assert.ok(process.getuid() > 0 && process.getgid() > 0);
const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-v2-custody-inspect-bridge-"));
const uid = process.getuid(), gid = process.getgid();
const oldCredentials = process.env.CREDENTIALS_DIRECTORY;
const token = "voidbvo1." + "D".repeat(43);
const socketParent = path.join(root, "run");
const socketPath = path.join(socketParent, "custody-v2.sock");
const requests = path.join(root, "requests");
const ledger = path.join(root, "ledger");
const highWater = path.join(root, "custody");
const capacityLock = path.join(root, "capacity-lock");
const creds = path.join(root, "buy-void-operator-capability-v1");
const requestJournal = path.join(requests, "requests.jsonl");
const eventJournal = path.join(requests, "operator-events.jsonl");
const allocationJournal = path.join(ledger, "allocation-reservations-v1.jsonl");
const highWaterPath = path.join(highWater, "allocation-reservation-high-water-v1.json");
let callbacks = 0, cases = 0, service = null;
function http() {
  return {
    route: { path: VOID_BUY_VOID_VERIFIED_PAYMENT_ROUTE_V2 }, method: "POST",
    socket: { remoteAddress: "127.0.0.1" },
    headers: {
      host: "127.0.0.1:4100", authorization: "Bearer " + token,
      "x-void-operator-intent": "VOID_BUY_VOID_OPERATOR_MUTATION_V1",
      "sec-fetch-site": "same-origin", origin: "http://127.0.0.1:4100",
    },
    body: { method: "reserve", payment_id: "untrusted" },
  };
}
function response() {
  const state = { status: null, body: null };
  const res = {
    status(code) { state.status = code; return this; },
    json(v) { state.body = v; return this; },
    setHeader() {},
  };
  return {res, state};
}
function input() {
  const tx = "0x" + "a".repeat(64), buyer = "0x" + "b".repeat(40),
    receiver = "0x" + "c".repeat(40), id = "buyvoid_stage_aaaaaaaa";
  return {
    event: {
      schema: "void_buy_void_verified_payment_event_v2",
      marker: "VOID_BUY_VOID_VERIFIED_PAYMENT_V2",
      request_id: id, operator_status: "payment_verified",
      payment_verified: true, payment_identity_input_complete: true,
      tx_hash: tx, quoted_void: "6",
      payment_verifier: {
        chain: "base", transaction_hash: tx, log_index: "1",
        from_address: buyer, delivery_address: buyer, receive_address: receiver,
      },
    },
    request: {
      request_id: id, source_chain: "base", tx_hash: tx,
      quoted_void: "6", delivery_address: buyer, receive_address: receiver,
    },
    request_dir: requests,
    allocation_ledger_root: VOID_BUY_VOID_ALLOCATION_LEDGER_ROOT_V1,
    allocation_high_water_root: VOID_BUY_VOID_ALLOCATION_HIGH_WATER_ROOT_V1,
    with_launch_authority_mutation: async () => {
      callbacks++; throw Error("unexpected_payment_mutation");
    },
    read_sale_state: async () => {
      callbacks++; throw Error("unexpected_sale_state");
    },
  };
}
function config(patch = {}) {
  return {
    socket_path: socketPath, expected_socket_uid: uid,
    expected_socket_gid: gid, timeout_ms: 4000,
    ...patch,
  };
}
function assertedHeld(receipt, inspected) {
  assert.equal(receipt?.marker, VOID_BUY_VOID_V2_CUSTODY_INSPECT_BRIDGE);
  assert.equal(receipt.ok, false);
  assert.equal(receipt.status, "hold");
  assert.equal(receipt.custody_inspect_reply_validated, inspected);
  for (const key of [
    "socket_peer_credentials_authenticated",
    "installed_cross_uid_roles_verified",
    "custody_reserve_or_recover_enabled", "payment_capacity_lock_verified",
    "durable_payment_append", "allocation_write", "payment_acceptance",
    "presale_activation", "funds_movement",
  ]) assert.equal(receipt[key], false, key);
  cases++;
}
try {
  fs.chmodSync(root, 0o700);
  fs.mkdirSync(socketParent,{mode:0o750});
  fs.chmodSync(socketParent,0o750);
  for(const dir of [requests,ledger,highWater]) {
    fs.mkdirSync(dir,{mode:0o700}); fs.chmodSync(dir,0o700);
  }
  fs.mkdirSync(capacityLock,{mode:0o3770});
  fs.chmodSync(capacityLock,0o3770);
  fs.writeFileSync(creds, token+"\n",{mode:0o600,flag:"wx"});
  process.env.CREDENTIALS_DIRECTORY = root;

  fs.writeFileSync(requestJournal,"{}\n",{mode:0o600});
  fs.writeFileSync(eventJournal,"{}\n",{mode:0o600});
  fs.writeFileSync(allocationJournal,"",{mode:0o600});
  const genesis = deriveBuyVoidAllocationReservationHighWaterV1("");
  assert.equal(genesis.ok,true,genesis.reason);
  fs.writeFileSync(highWaterPath,genesis.high_water_json,{mode:0o600});
  const before = [requestJournal,eventJournal,allocationJournal,highWaterPath]
    .map(file => fs.readFileSync(file));

  // A pre-authorized bearer must not access the socket on an invalid token.
  // Use a poison config to confirm auth returns BEFORE socket-config reads.
  const wrongBearer = http();
  wrongBearer.headers.authorization = "Bearer voidbvo1." + "E".repeat(43);
  let reads = 0;
  const poison = new Proxy(config(), {
    get() {reads++;throw Error("socket_config_getter_called_on_auth_fail");},
  });
  const denial = response();
  assert.equal(await inspectAuthenticatedBuyVoidV2CustodyBoundary(
    wrongBearer,denial.res,input(),poison,
  ),null);
  assert.equal(denial.state.status,401);
  assert.equal(reads,0);
  cases++;

  // No service: even authenticated requests fail closed, not approved.
  const off = await inspectAuthenticatedBuyVoidV2CustodyBoundary(
    http(),response().res,input(),config(),
  );
  assertedHeld(off,false);

  service = createVoidBuyAllocationCustodyServiceV2({
    socket_path:socketPath, request_root:requests,
    ledger_root:ledger, custody_root:highWater,
    socket_group_gid:gid,
    capacity_lock:{
      shared_directory:capacityLock, custody_uid:uid,
      web_uid:uid+10000,shared_gid:gid,
      wait_timeout_ms:5000,poll_interval_ms:10,
    },
  });
  await service.start();

  // This is the actual server's inspect-only wire path. It reads a
  // disposable genesis ledger, but cannot perform reserve or recovery.
  const positive = await inspectAuthenticatedBuyVoidV2CustodyBoundary(
    http(),response().res,input(),config(),
  );
  assertedHeld(positive,true);
  assert.equal(positive.reason,"custody_inspection_only_no_reservation_authority");
  cases++;

  // Valid socket with wrong expected identity is not a custody observation.
  const wrongOwner = await inspectAuthenticatedBuyVoidV2CustodyBoundary(
    http(),response().res,input(),config({expected_socket_uid:uid+1}),
  );
  assertedHeld(wrongOwner,false);

  // Untrusted request status never reaches socket processing.
  const tampered = input();
  tampered.event.operator_status = "reviewed";
  await assert.rejects(
    async()=>inspectAuthenticatedBuyVoidV2CustodyBoundary(
      http(),response().res,tampered,config(),
    ),/legacy_payment_only_writer_forbidden/u
  );
  cases++;

  for(const [i,file] of [
    requestJournal,eventJournal,allocationJournal,highWaterPath
  ].entries()) {
    assert.deepEqual(fs.readFileSync(file),before[i],
      "IPC inspector must not mutate durable economic evidence");
  }
  assert.equal(callbacks,0);
  for(const name of ["source_only_unmounted","inspect_only_unix_socket_client",
    "existing_private_bearer_auth_before_ipc",
    "canonical_allocation_plan_before_ipc"]) {
    assert.equal(VOID_BUY_VOID_V2_CUSTODY_INSPECT_BRIDGE_AUTHORITY[name],true);
  }
  for(const name of ["custody_reserve_or_recover_enabled","payment_acceptance",
    "socket_peer_credentials_authenticated","funds_movement"]) {
    assert.equal(VOID_BUY_VOID_V2_CUSTODY_INSPECT_BRIDGE_AUTHORITY[name],false);
  }
  assert.equal(Object.isFrozen(VOID_BUY_VOID_V2_CUSTODY_INSPECT_BRIDGE_AUTHORITY),true);
} finally {
  if(service) await service.stop();
  if(oldCredentials===undefined) delete process.env.CREDENTIALS_DIRECTORY;
  else process.env.CREDENTIALS_DIRECTORY=oldCredentials;
  fs.rmSync(root,{recursive:true,force:true});
}
console.log("VOID_BUY_VOID_V2_CUSTODY_INSPECT_BRIDGE_REAL_UNIX_PROOF_GREEN");
console.log("cases="+String(cases));
console.log("real_custody_v2_unix_socket_and_existing_client_exercised=true");
console.log("authentication_precedes_socket_config_access=true");
console.log("custody_inspect_never_promotes_reservation_authority=true");
console.log("canonical_payment_and_allocation_journals_unchanged=true");
console.log("source_only_unmounted=true");
console.log("payment_acceptance=false");
console.log("presale_activation=false");
console.log("funds_movement=false");
