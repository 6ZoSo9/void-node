#!/usr/bin/env node
import process from "node:process";
import {
  buildPacket,
} from "./lib/void_public_seed_wireguard_continuity_packet_v1.mjs";

const MARKER = "VOID_PUBLIC_SEED_WIREGUARD_CONTINUITY_PACKET_BUILDER_V1";

function fail(message) {
  console.error(`${MARKER}_FAIL: ${message}`);
  process.exit(1);
}

function parse(argv) {
  const values = {
    publicIp: "",
    vpsPublicKey: "",
    precisionPublicKey: "",
    repoRoot: process.cwd(),
    expectedHead: "",
    output: "",
    vpsPrivateKeyPath:
      "/var/lib/void-public-seed-continuity/vps-wireguard.key",
    precisionPrivateKeyPath:
      "/var/lib/void-public-seed-continuity/precision-wireguard.key",
    socketProxydPath: "/usr/lib/systemd/systemd-socket-proxyd",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) fail(`missing value after ${argument}`);
      return argv[index];
    };
    if (argument === "--public-ip") values.publicIp = next();
    else if (argument === "--vps-public-key") values.vpsPublicKey = next();
    else if (argument === "--precision-public-key") values.precisionPublicKey = next();
    else if (argument === "--repo-root") values.repoRoot = next();
    else if (argument === "--expected-head") values.expectedHead = next();
    else if (argument === "--output") values.output = next();
    else if (argument === "--vps-private-key-path") {
      values.vpsPrivateKeyPath = next();
    } else if (argument === "--precision-private-key-path") {
      values.precisionPrivateKeyPath = next();
    } else if (argument === "--socket-proxyd-path") {
      values.socketProxydPath = next();
    } else if (argument === "--help" || argument === "-h") {
      console.log(
        "Usage: node scripts/build_void_public_seed_wireguard_continuity_packet_v1.mjs " +
          "--public-ip IPv4 --vps-public-key KEY --precision-public-key KEY " +
          "--expected-head SHA --output DIR [options]",
      );
      process.exit(0);
    } else {
      fail(`unknown argument ${argument}`);
    }
  }
  for (const key of [
    "publicIp",
    "vpsPublicKey",
    "precisionPublicKey",
    "repoRoot",
    "expectedHead",
    "output",
  ]) {
    if (!values[key]) fail(`missing required option: ${key}`);
  }
  return values;
}

try {
  const packet = buildPacket(parse(process.argv.slice(2)));
  console.log(`${MARKER}_GREEN`);
  console.log(`packet_id=${packet.packet_id}`);
  console.log(`source_head=${packet.source_head}`);
  console.log(`public_vps_ip=${packet.public_vps_ip}`);
  console.log(`public_udp_port=${packet.transport.public_udp_port}`);
  console.log("additional_public_tcp_ports=0");
  console.log(`continuity_origin=${packet.continuity.vps_origin}`);
  console.log("private_keys_embedded=false");
  console.log("private_keys_generated=false");
  console.log("private_keys_read=false");
  console.log("vps_accessed=false");
  console.log("firewall_mutated=false");
  console.log("interfaces_created=false");
  console.log("services_started=false");
  console.log("deployment_performed=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
} catch (error) {
  fail(error?.message || String(error));
}
