#!/usr/bin/env node
import process from "node:process";
import { verifyPacket } from "./lib/void_public_seed_ip_vps_packet_v1.mjs";

const MARKER = "VOID_PUBLIC_SEED_IP_VPS_PACKET_VERIFIER_V1";

function fail(message) {
  console.error(`${MARKER}_FAIL: ${message}`);
  process.exit(1);
}

function parse(argv) {
  const out = {
    packetDir: process.env.VOID_PUBLIC_SEED_IP_VPS_PACKET_DIR || "",
    repoRoot: process.env.VOID_PUBLIC_SEED_IP_VPS_REPO_ROOT || "",
    expectedHead: process.env.VOID_PUBLIC_SEED_IP_VPS_EXPECTED_HEAD || "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) fail(`missing value after ${arg}`);
      return argv[index];
    };

    if (arg === "--packet-dir") out.packetDir = next();
    else if (arg === "--repo-root") out.repoRoot = next();
    else if (arg === "--expected-head") out.expectedHead = next();
    else if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: node scripts/verify_void_public_seed_ip_vps_packet_v1.mjs PACKET_DIR --repo-root REPO --expected-head SHA",
      );
      process.exit(0);
    } else if (!arg.startsWith("-") && !out.packetDir) {
      out.packetDir = arg;
    } else {
      fail(`unknown argument ${arg}`);
    }
  }

  if (!out.packetDir) fail("packet directory is required");
  if (!out.repoRoot) fail("source repository root is required");
  if (!out.expectedHead) fail("expected source head is required");
  return out;
}

try {
  const options = parse(process.argv.slice(2));
  const packet = verifyPacket(options.packetDir, {
    repoRoot: options.repoRoot,
    expectedHead: options.expectedHead,
  });
  console.log(`${MARKER}_GREEN`);
  console.log(`packet_id=${packet.packet_id}`);
  console.log(`source_head=${packet.source_head}`);
  console.log(`public_https=${packet.public_https}`);
  console.log(`public_p2p=${packet.public_p2p}`);
  console.log("source_checkout_required=true");
  console.log("source_checkout_clean=true");
  console.log("source_head_bound_to_checkout=true");
  console.log("gateway_source_hash_bound_to_checkout=true");
  console.log("domain_required=false");
  console.log("tailscale_required=false");
  console.log("private_http_exposed=false");
  console.log("credentials_in_packet=false");
  console.log("wallet_authority=false");
  console.log("signer_authority=false");
  console.log("validator_authority=false");
  console.log("money_movement_authority=false");
} catch (error) {
  fail(error?.message || String(error));
}
