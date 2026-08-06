#!/usr/bin/env node
import process from "node:process";
import { buildPacket } from "./lib/void_public_seed_ip_vps_packet_v1.mjs";

const MARKER = "VOID_PUBLIC_SEED_IP_VPS_PACKET_BUILDER_V1";

function fail(message) {
  console.error(`${MARKER}_FAIL: ${message}`);
  process.exit(1);
}

function parse(argv) {
  const out = {
    publicIp: "",
    repoRoot: process.cwd(),
    expectedHead: "",
    output: "",
    serviceUser: "voidseed",
    targetRepoRoot: "/opt/void/void-node",
    dataDir: "/var/lib/void-node/data_a",
    nodeIdentityPath: "/var/lib/void-node/.nodekey",
    acmeWebroot: "/var/lib/void-public-seed/acme",
    nodePath: "/usr/bin/node",
    continuityOrigin: "http://127.0.0.1:4199",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) fail(`missing value after ${arg}`);
      return argv[index];
    };
    if (arg === "--public-ip") out.publicIp = next();
    else if (arg === "--repo-root") out.repoRoot = next();
    else if (arg === "--expected-head") out.expectedHead = next();
    else if (arg === "--output") out.output = next();
    else if (arg === "--service-user") out.serviceUser = next();
    else if (arg === "--target-repo-root") out.targetRepoRoot = next();
    else if (arg === "--data-dir") out.dataDir = next();
    else if (arg === "--node-identity-path") out.nodeIdentityPath = next();
    else if (arg === "--acme-webroot") out.acmeWebroot = next();
    else if (arg === "--node-path") out.nodePath = next();
    else if (arg === "--continuity-origin") out.continuityOrigin = next();
    else if (arg === "--help" || arg === "-h") {
      console.log("Usage: node scripts/build_void_public_seed_ip_vps_packet_v1.mjs --public-ip IPv4 --expected-head SHA --output DIR [--continuity-origin http://127.0.0.1:PORT] [options]");
      process.exit(0);
    } else fail(`unknown argument ${arg}`);
  }
  for (const key of ["publicIp", "expectedHead", "output"]) {
    if (!out[key]) fail(`missing required option: ${key}`);
  }
  return out;
}

try {
  const packet = buildPacket(parse(process.argv.slice(2)));
  console.log(`${MARKER}_GREEN`);
  console.log(`packet_id=${packet.packet_id}`);
  console.log(`source_head=${packet.source_head}`);
  console.log(`public_ip=${packet.public_ip}`);
  console.log(`continuity_origin=${packet.continuity.origin}`);
  console.log("snapshot_only_publication_allowed=false");
  console.log("domain_required=false");
  console.log("tailscale_required=false");
  console.log("credentials_in_packet=false");
  console.log("certificate_issued=false");
  console.log("manifest_published=false");
  console.log("services_started=false");
} catch (error) {
  fail(error?.message || String(error));
}
