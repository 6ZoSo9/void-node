#!/usr/bin/env node
import fs from "node:fs";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i];
  const value = process.argv[i + 1];
  if (!key?.startsWith("--") || value === undefined) {
    throw new Error("invalid arguments");
  }
  args.set(key, value);
}
const peersPath = args.get("--peers");
const helloPath = args.get("--hello");
if (!peersPath || !helloPath) throw new Error("--peers and --hello are required");

const peers = JSON.parse(fs.readFileSync(peersPath, "utf8"));
const hello = JSON.parse(fs.readFileSync(helloPath, "utf8"));
const connected = Array.isArray(peers.connected) ? peers.connected : [];
const verified = Array.isArray(peers.verifiedPeers) ? peers.verifiedPeers : [];

const validId = (value) => /^[0-9a-f]{32}$/.test(String(value || ""));
const connectedIds = [...new Set(connected.map((entry) => String(entry?.id || "")).filter(validId))].sort();
const verifiedIds = [...new Set(verified.map((entry) => String(entry?.node_id || "")).filter(validId))].sort();
const verifiedConnected = connectedIds.filter((id) => verifiedIds.includes(id));
const additionalVerified = verifiedIds.filter((id) => !verifiedConnected.includes(id));

console.log(`fresh_node_id=${String(hello?.id || "")}`);
console.log(`connected_peer_count=${connected.length}`);
console.log(`verified_peer_count=${verified.length}`);
console.log(`connected_peer_ids=${JSON.stringify(connectedIds)}`);
console.log(`verified_peer_ids=${JSON.stringify(verifiedIds)}`);
console.log(`verified_connected_peer_ids=${JSON.stringify(verifiedConnected)}`);
console.log(`verified_connected_peer_count=${verifiedConnected.length}`);
console.log(`additional_verified_peer_ids=${JSON.stringify(additionalVerified)}`);
console.log(`additional_verified_peer_exists=${additionalVerified.length > 0}`);
console.log(`first_contact_removal_prerequisite=${connectedIds.length >= 2 && verifiedConnected.length >= 1}`);
console.log("private_addresses_emitted=false");
console.log("VOID_BOOTSTRAP_N_MINUS_ONE_PEER_OBSERVATION_V1_GREEN");
