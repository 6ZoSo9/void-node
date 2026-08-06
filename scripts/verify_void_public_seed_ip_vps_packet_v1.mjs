#!/usr/bin/env node
import process from "node:process";
import { verifyPacket } from "./lib/void_public_seed_ip_vps_packet_v1.mjs";

const MARKER = "VOID_PUBLIC_SEED_IP_VPS_PACKET_VERIFIER_V1";
const packetDir = process.argv[2] || process.env.VOID_PUBLIC_SEED_IP_VPS_PACKET_DIR || "";

if (!packetDir) {
  console.error(`${MARKER}_FAIL: packet directory is required`);
  process.exit(1);
}

try {
  const packet = verifyPacket(packetDir);
  console.log(`${MARKER}_GREEN`);
  console.log(`packet_id=${packet.packet_id}`);
  console.log(`source_head=${packet.source_head}`);
  console.log(`public_https=${packet.public_https}`);
  console.log(`public_p2p=${packet.public_p2p}`);
  console.log("domain_required=false");
  console.log("tailscale_required=false");
  console.log("private_http_exposed=false");
  console.log("credentials_in_packet=false");
  console.log("wallet_authority=false");
  console.log("signer_authority=false");
  console.log("validator_authority=false");
  console.log("money_movement_authority=false");
} catch (error) {
  console.error(`${MARKER}_FAIL: ${error?.message || String(error)}`);
  process.exit(1);
}
