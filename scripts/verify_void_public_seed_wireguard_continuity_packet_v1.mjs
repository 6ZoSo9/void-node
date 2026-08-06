#!/usr/bin/env node
import process from "node:process";
import {
  verifyPacket,
} from "./lib/void_public_seed_wireguard_continuity_packet_v1.mjs";

const MARKER = "VOID_PUBLIC_SEED_WIREGUARD_CONTINUITY_PACKET_VERIFIER_V1";

const packetDir = process.argv[2];
if (!packetDir) {
  console.error(`${MARKER}_FAIL: packet directory is required`);
  process.exit(1);
}

try {
  const packet = verifyPacket(packetDir);
  console.log(`${MARKER}_GREEN`);
  console.log(`packet_id=${packet.packet_id}`);
  console.log(`public_vps_ip=${packet.public_vps_ip}`);
  console.log(`public_udp_port=${packet.transport.public_udp_port}`);
  console.log(`continuity_origin=${packet.continuity.vps_origin}`);
  console.log("private_keys_embedded=false");
  console.log("activation_flags=false");
} catch (error) {
  console.error(`${MARKER}_FAIL: ${error?.message || String(error)}`);
  process.exit(1);
}
