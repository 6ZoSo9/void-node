#!/usr/bin/env node
import process from "node:process";
import { verifyPublicationPacket } from "./lib/void_public_bootstrap_manifest_publication_v1.mjs";

const MARKER = "VOID_PUBLIC_BOOTSTRAP_MANIFEST_PUBLICATION_PACKET_VERIFY_V1";

function fail(message) {
  console.error(`${MARKER}_FAIL: ${message}`);
  process.exit(1);
}

function args(argv) {
  const values = { packet: "", repoRoot: "", sourceSha: "", predecessorBlob: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) fail(`missing value after ${argument}`);
      return argv[index];
    };
    if (argument === "--packet") values.packet = next();
    else if (argument === "--repo-root") values.repoRoot = next();
    else if (argument === "--expected-source-sha") values.sourceSha = next();
    else if (argument === "--expected-predecessor-blob") values.predecessorBlob = next();
    else if (argument === "--help" || argument === "-h") {
      console.log("Usage: node scripts/verify_void_public_bootstrap_manifest_publication_packet_v1.mjs --packet /outside/publication-packet --repo-root /exact/void-node --expected-source-sha <40hex> --expected-predecessor-blob <40hex>");
      process.exit(0);
    } else fail(`unknown argument ${argument}`);
  }
  for (const [key, value] of Object.entries(values)) {
    if (!value) fail(`missing required ${key}`);
  }
  return values;
}

try {
  const options = args(process.argv.slice(2));
  const result = verifyPublicationPacket({
    repoRoot: options.repoRoot,
    packetDir: options.packet,
    expectedSourceSha: options.sourceSha,
    expectedPredecessorBlob: options.predecessorBlob,
  });
  console.log(`${MARKER}_GREEN`);
  console.log(`packet_id=${result.packet.packet_id}`);
  console.log(`source_sha=${result.packet.source_sha}`);
  console.log(`predecessor_manifest_id=${result.packet.predecessor.manifest_id}`);
  console.log(`candidate_manifest_id=${result.packet.candidate.manifest_id}`);
  console.log(`rollback_manifest_id=${result.packet.rollback.manifest_id}`);
  console.log("publication_authorized=false");
  console.log("repository_mutated=false");
} catch (error) {
  fail(error?.stack || error?.message || String(error));
}
