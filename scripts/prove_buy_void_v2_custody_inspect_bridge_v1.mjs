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
  buildBuyVoidVerifiedPaymentEventV2,
} from "../dist/economic/buy_void_verified_payment_v2.js";
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
  const nativeUsdc = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
  const launchAuthority = Object.freeze({
    marker: "VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1",
    version: 1,
    coupled_launch_id: "sha256:" + "1".repeat(64),
    source_composition_id: "sha256:" + "2".repeat(64),
    activation_generation: "0x" + "3".repeat(64),
    generation_tip_sha256: "sha256:" + "4".repeat(64),
    activation_receipt_id: "voidbclive1_" + "5".repeat(64),
    activation_receipt_sha256: "6".repeat(64),
    expires_at_ms: 1_900_000_000_000,
  });
  const transferTopic =
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  const topicAddress = address => "0x" + "0".repeat(24) + address.slice(2);
  const original = {
    request_id: id, source_chain: "base", payment_chain: "base",
    payment_chain_id: 8453, tx_hash: tx,
    usdc_amount: "3", quoted_void: "6",
    rate_void_per_usdc: "2", price_usdc_per_void: "0.50",
    usdc_contract: nativeUsdc,
    launch_authority: launchAuthority,
    delivery_address: buyer, receive_address: receiver,
    payment_instructions: {
      send_chain: "base", send_chain_id: 8453,
      token_contract: nativeUsdc, token_decimals: 6,
      send_from: buyer, send_to: receiver, amount: "3",
    },
  };
  const verified = buildBuyVoidVerifiedPaymentEventV2({
    request: original,
    receipt: {
      status: "0x1", transactionHash: tx, blockNumber: "0x64",
      logs: [{
        address: nativeUsdc,
        topics: [transferTopic, topicAddress(buyer), topicAddress(receiver)],
        data: "0x2dc6c0", logIndex: "0x1",
        transactionHash: tx, blockNumber: "0x64",
      }],
    },
    policy: {
      allowed_chains: ["base"],
      usdc_contract_by_chain: { base: nativeUsdc },
      receive_address_by_chain: { base: receiver },
      current_block_number_by_chain: { base: "0x65" },
    },
  });
  assert.equal(verified.ok, true, verified.reason);
  assert.equal(Object.hasOwn(verified.event, "quoted_void"), false);
  return {
    event: verified.event,
    request: original,
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
function lineage(stageInput = input()) {
  return {
    requests_jsonl: Buffer.from(
      JSON.stringify(stageInput.request) + "\n", "utf8",
    ),
    prior_operator_events_jsonl: Buffer.alloc(0),
    allocation_jsonl: Buffer.alloc(0),
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
  let socketReads = 0, historyReads = 0;
  const poison = new Proxy(config(), {
    get() {
      socketReads++;
      throw Error("socket_config_getter_called_on_auth_fail");
    },
  });
  const poisonHistory = new Proxy(lineage(), {
    get() {
      historyReads++;
      throw Error("lineage_history_getter_called_on_auth_fail");
    },
  });
  const denial = response();
  assert.equal(await inspectAuthenticatedBuyVoidV2CustodyBoundary(
    wrongBearer, denial.res, input(), poisonHistory, poison,
  ), null);
  assert.equal(denial.state.status,401);
  assert.equal(socketReads,0);
  assert.equal(historyReads,0);
  cases++;

  // No service: even authenticated requests fail closed, not approved.
  const off = await inspectAuthenticatedBuyVoidV2CustodyBoundary(
    http(),response().res,input(),lineage(),config(),
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
    http(),response().res,input(),lineage(),config(),
  );
  assertedHeld(positive,true);
  assert.equal(positive.reason,"custody_inspection_only_no_reservation_authority");
  cases++;

  // Valid socket with wrong expected identity is not a custody observation.
  const wrongOwner = await inspectAuthenticatedBuyVoidV2CustodyBoundary(
    http(),response().res,input(),lineage(),config({expected_socket_uid:uid+1}),
  );
  assertedHeld(wrongOwner,false);

  // Untrusted request status never reaches socket processing.
  const tampered = input();
  tampered.event.operator_status = "reviewed";
  await assert.rejects(
    async()=>inspectAuthenticatedBuyVoidV2CustodyBoundary(
      http(),response().res,tampered,lineage(tampered),config(),
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
    "canonical_allocation_plan_before_ipc",
    "payment_instruction_amount_bound_before_ipc",
    "canonical_first_request_lineage_preflight_before_ipc"]) {
    assert.equal(VOID_BUY_VOID_V2_CUSTODY_INSPECT_BRIDGE_AUTHORITY[name],true);
  }
  for(const name of ["request_history_source_authenticated",
    "custody_reserve_or_recover_enabled","payment_acceptance",
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
console.log("real_v2_verifier_event_used_without_invented_quote=true");
console.log("authentication_precedes_history_and_socket_config_access=true");
console.log("canonical_first_request_lineage_preflight_before_ipc=true");
console.log("payment_instruction_amount_bound_before_ipc=true");
console.log("request_history_source_authenticated=false");
console.log("custody_inspect_never_promotes_reservation_authority=true");
console.log("canonical_payment_and_allocation_journals_unchanged=true");
console.log("source_only_unmounted=true");
console.log("payment_acceptance=false");
console.log("presale_activation=false");
console.log("funds_movement=false");
