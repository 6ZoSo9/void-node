#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const MARKER = "VOID_WORKCREDITS_DEVNET_UI_HOST_NAVIGATION_V1";
const sourcePath = "ops/void-workcredits-devnet-http.cjs";
const source = fs.readFileSync(sourcePath, "utf8");

assert.equal(
  source.includes("100.122.79.39"),
  false,
  "retired Alienware IP remains in Work Credits helper UI source",
);

for (const token of [
  'id="voidParticipantNavLink"',
  'id="voidDatanetNavLink"',
  'id="voidWalletNavLink"',
  'var nodeBase = window.location.protocol + "//" + window.location.hostname + ":4100";',
  'participantNav.href = nodeBase + "/participant";',
  'datanetNav.href = nodeBase + "/datanet-demo";',
  'walletNav.href = nodeBase + "/participant#wallet";',
  'var base = window.location.protocol + "//" + window.location.hostname + ":4312/workcredits/devnet/ui";',
  'var pool = window.location.protocol + "//" + window.location.hostname + ":4312/workcredits/devnet/pool.json";',
]) {
  assert.ok(source.includes(token), `missing host-derived navigation contract token: ${token}`);
}

for (const retiredUrl of [
  "http://100.122.79.39:4100/participant",
  "http://100.122.79.39:4100/datanet-demo",
  "http://100.122.79.39:4100/participant#wallet",
]) {
  assert.equal(source.includes(retiredUrl), false, `retired URL remains: ${retiredUrl}`);
}

console.log(`${MARKER}_PROOF_GREEN`);
console.log("node_navigation_host_derived=true");
console.log("helper_navigation_host_derived=true");
console.log("retired_alienware_navigation_present=false");
console.log("runtime_mutation=false");
console.log("wallet_signing=false");
console.log("funds_movement=false");
