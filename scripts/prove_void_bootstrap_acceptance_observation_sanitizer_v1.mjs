#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  sanitizeVoidBootstrapPeersObservationV1,
  sanitizeVoidBootstrapReadyObservationV1,
  sha256CanonicalObservationV1,
} from "./lib/void_bootstrap_acceptance_observation_sanitizer_v1.mjs";

const MARKER =
  "VOID_BOOTSTRAP_ACCEPTANCE_OBSERVATION_SANITIZER_V1_PROOF_GREEN";

const peerA = "a".repeat(32);
const peerB = "b".repeat(32);
const peerC = "c".repeat(32);

function readyFixture() {
  return {
    ready: true,
    head: 42,
    gap: 0,
    txroot_live: 1,
    reasons: null,
    lastmile_seen: 42,
    operator_private_note: "must-never-survive-sanitization",
    __ready_bridge: {
      v: "12k",
      txroot3_seen_ok: 1,
      txroot3_ok: 1,
      txroot3_age_ms: 1200,
      txroot3_latest: 42,
      txroot3_in_flight: 0,
      txroot3_last_err: "",
    },
  };
}

function peersFixture() {
  return {
    ok: true,
    connected: [
      {
        id: peerB,
        addr: "198.51.100.21:4700",
        listens: ["198.51.100.21:4700"],
        outbound: false,
      },
      {
        id: peerA,
        addr: "[2001:db8::21]:4700",
        listens: ["[2001:db8::21]:4700"],
        outbound: true,
      },
    ],
    knownAddrs: [
      "198.51.100.21:4700",
      "[2001:db8::21]:4700",
    ],
    verifiedPeers: [
      {
        node_id: peerC,
        addresses: ["203.0.113.88:4700"],
        last_authenticated_at_ms: 123456789,
      },
      {
        node_id: peerB,
        addresses: ["198.51.100.21:4700"],
        last_authenticated_at_ms: 123456788,
      },
    ],
    private_key: "must-never-survive-sanitization",
  };
}

const ready = sanitizeVoidBootstrapReadyObservationV1(
  readyFixture(),
);
assert.deepEqual(Object.keys(ready).sort(), [
  "gap",
  "head",
  "ready",
  "schema",
  "txroot3_age_ms",
  "txroot3_latest",
  "txroot3_ok",
  "txroot3_seen_ok",
  "txroot_live",
].sort());
assert.equal(ready.head, 42);
assert.equal(ready.gap, 0);
assert.equal(ready.txroot_live, 1);
assert.equal(ready.txroot3_seen_ok, 1);
assert.equal(ready.txroot3_ok, 1);
assert.equal(ready.txroot3_age_ms, 1200);

const readyJson = JSON.stringify(ready);
assert.equal(readyJson.includes("operator_private_note"), false);
assert.equal(readyJson.includes("must-never-survive"), false);

const changedIncidentalReady = readyFixture();
changedIncidentalReady.reasons = ["different incidental field"];
changedIncidentalReady.operator_private_note = "different private value";
assert.equal(
  sha256CanonicalObservationV1(
    sanitizeVoidBootstrapReadyObservationV1(
      changedIncidentalReady,
    ),
  ),
  sha256CanonicalObservationV1(ready),
);

const bootGrace = readyFixture();
bootGrace.__ready_bridge_boot_grace = 1;
assert.throws(
  () => sanitizeVoidBootstrapReadyObservationV1(bootGrace),
  /boot-grace marker must be absent/,
);

for (const malformedBootGraceMarker of [
  0,
  "1",
  "0",
  true,
  false,
  null,
  2,
]) {
  const malformedBootGrace = readyFixture();
  malformedBootGrace.__ready_bridge_boot_grace =
    malformedBootGraceMarker;
  assert.throws(
    () => sanitizeVoidBootstrapReadyObservationV1(malformedBootGrace),
    /boot-grace marker must be absent/,
  );
}

const unseenTxroot = readyFixture();
unseenTxroot.__ready_bridge.txroot3_seen_ok = 0;
assert.throws(
  () => sanitizeVoidBootstrapReadyObservationV1(unseenTxroot),
  /observed real txroot3 success/,
);

const staleTxroot = readyFixture();
staleTxroot.__ready_bridge.txroot3_age_ms = 5001;
assert.throws(
  () => sanitizeVoidBootstrapReadyObservationV1(staleTxroot),
  /fresh within 5000 ms/,
);

const stringTxroot = readyFixture();
stringTxroot.txroot_live = "1";
assert.throws(
  () => sanitizeVoidBootstrapReadyObservationV1(stringTxroot),
  /must be a JSON integer/,
);

const nonzeroGap = readyFixture();
nonzeroGap.gap = 1;
assert.throws(
  () => sanitizeVoidBootstrapReadyObservationV1(nonzeroGap),
  /gap must equal 0/,
);

const zeroHead = readyFixture();
zeroHead.head = 0;
assert.throws(
  () => sanitizeVoidBootstrapReadyObservationV1(zeroHead),
  /head must be greater than zero/,
);

const peers = sanitizeVoidBootstrapPeersObservationV1(
  peersFixture(),
  {
    phase: "first_node_after_sync",
    firstContactPeerId: peerA,
  },
);

assert.deepEqual(peers.connected_peer_ids, [peerA, peerB]);
assert.deepEqual(peers.verified_peer_ids, [peerB, peerC]);
assert.equal(peers.first_contact_peer_id, peerA);

const peersJson = JSON.stringify(peers);
for (const forbidden of [
  "198.51.100.21",
  "2001:db8",
  "203.0.113.88",
  "knownAddrs",
  "addresses",
  "last_authenticated_at_ms",
  "private_key",
]) {
  assert.equal(peersJson.includes(forbidden), false);
}

const changedAddresses = peersFixture();
changedAddresses.connected[0].addr = "192.0.2.55:9999";
changedAddresses.connected[0].listens = ["192.0.2.55:9999"];
changedAddresses.knownAddrs = ["192.0.2.55:9999"];
changedAddresses.verifiedPeers[0].addresses = ["192.0.2.99:9999"];
changedAddresses.verifiedPeers[0].last_authenticated_at_ms = 999999999;

const changedAddressesSanitized =
  sanitizeVoidBootstrapPeersObservationV1(
    changedAddresses,
    {
      phase: "first_node_after_sync",
      firstContactPeerId: peerA,
    },
  );

assert.equal(
  sha256CanonicalObservationV1(changedAddressesSanitized),
  sha256CanonicalObservationV1(peers),
);

const reorderedPeers = peersFixture();
reorderedPeers.connected.reverse();
reorderedPeers.verifiedPeers.reverse();
assert.equal(
  sha256CanonicalObservationV1(
    sanitizeVoidBootstrapPeersObservationV1(
      reorderedPeers,
      {
        phase: "first_node_after_sync",
        firstContactPeerId: peerA,
      },
    ),
  ),
  sha256CanonicalObservationV1(peers),
);

const noAdditionalVerified = peersFixture();
noAdditionalVerified.verifiedPeers = [
  {
    node_id: peerA,
    addresses: ["198.51.100.1:4700"],
    last_authenticated_at_ms: 1,
  },
];
assert.throws(
  () =>
    sanitizeVoidBootstrapPeersObservationV1(
      noAdditionalVerified,
      {
        phase: "first_node_after_sync",
        firstContactPeerId: peerA,
      },
    ),
  /additional verified peer/,
);

const missingFirstContact = peersFixture();
missingFirstContact.connected = [
  {
    id: peerB,
    addr: "198.51.100.21:4700",
    listens: [],
    outbound: true,
  },
];
assert.throws(
  () =>
    sanitizeVoidBootstrapPeersObservationV1(
      missingFirstContact,
      {
        phase: "first_node_after_sync",
        firstContactPeerId: peerA,
      },
    ),
  /include authenticated first-contact peer/,
);

const afterRemoval = sanitizeVoidBootstrapPeersObservationV1(
  {
    ok: true,
    connected: [
      {
        id: peerB,
        addr: "198.51.100.21:4700",
        listens: ["198.51.100.21:4700"],
        outbound: true,
      },
    ],
    knownAddrs: ["198.51.100.21:4700"],
    verifiedPeers: [
      {
        node_id: peerB,
        addresses: ["198.51.100.21:4700"],
        last_authenticated_at_ms: 555,
      },
    ],
  },
  {
    phase: "first_node_after_first_contact_removal",
    firstContactPeerId: peerA,
  },
);
assert.deepEqual(afterRemoval.connected_peer_ids, [peerB]);

assert.throws(
  () =>
    sanitizeVoidBootstrapPeersObservationV1(
      {
        ok: true,
        connected: [
          {
            id: peerA,
            addr: "198.51.100.10:4700",
            listens: [],
            outbound: true,
          },
        ],
        knownAddrs: [],
        verifiedPeers: [
          {
            node_id: peerA,
            addresses: [],
            last_authenticated_at_ms: 1,
          },
        ],
      },
      {
        phase: "first_node_after_first_contact_removal",
        firstContactPeerId: peerA,
      },
    ),
  /retain a peer other than first contact/,
);

const malformedPeer = peersFixture();
malformedPeer.connected[0].id = "bad";
assert.throws(
  () =>
    sanitizeVoidBootstrapPeersObservationV1(
      malformedPeer,
      {
        phase: "first_node_after_sync",
        firstContactPeerId: peerA,
      },
    ),
  /32 lowercase hex characters/,
);

assert.notEqual(
  sha256CanonicalObservationV1(afterRemoval),
  sha256CanonicalObservationV1(peers),
);

console.log(MARKER);
console.log("ready_head_positive_required=true");
console.log("ready_gap_zero_required=true");
console.log("ready_txroot_live_required=true");
console.log("boot_grace_ready_accepted=false");
console.log("boot_grace_marker_must_be_absent=true");
console.log("type_confused_boot_grace_marker_accepted=false");
console.log("txroot3_seen_ok_required=true");
console.log("txroot3_ok_required=true");
console.log("txroot3_fresh_within_5000ms_required=true");
console.log("peer_ids_cryptographic_only=true");
console.log("addresses_in_sanitized_output=false");
console.log("known_addrs_in_sanitized_output=false");
console.log("peer_timestamps_in_sanitized_output=false");
console.log("private_extra_fields_in_sanitized_output=false");
console.log("address_change_changes_sanitized_hash=false");
console.log("peer_input_order_changes_sanitized_hash=false");
console.log("after_sync_first_contact_connected_required=true");
console.log("after_sync_additional_verified_peer_required=true");
console.log("post_removal_non_first_verified_connectivity_required=true");
console.log("live_network_calls_performed=false");
console.log("external_machine_acceptance_performed=false");
console.log("issue_1005_closure_claimed=false");
console.log("wallet_signer_validator_wc_money_authority=0");
