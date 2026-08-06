#!/usr/bin/env node
import process from "node:process";
import { buildPublicationPacket } from "./lib/void_public_bootstrap_manifest_publication_v1.mjs";

const MARKER = "VOID_PUBLIC_BOOTSTRAP_MANIFEST_PUBLICATION_PACKET_V1";

function fail(message) {
  console.error(`${MARKER}_FAIL: ${message}`);
  process.exit(1);
}

function args(argv) {
  const values = { artifact: "", repoRoot: "", sourceSha: "", predecessorBlob: "", output: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) fail(`missing value after ${argument}`);
      return argv[index];
    };
    if (argument === "--artifact") values.artifact = next();
    else if (argument === "--repo-root") values.repoRoot = next();
    else if (argument === "--expected-source-sha") values.sourceSha = next();
    else if (argument === "--expected-predecessor-blob") values.predecessorBlob = next();
    else if (argument === "--output") values.output = next();
    else if (argument === "--help" || argument === "-h") {
      console.log("Usage: node scripts/build_void_public_bootstrap_manifest_publication_packet_v1.mjs --artifact /outside/qualification-output --repo-root /exact/void-node --expected-source-sha <40hex> --expected-predecessor-blob <40hex> --output /outside/publication-packet");
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
  const result = buildPublicationPacket({
    repoRoot: options.repoRoot,
    artifactDir: options.artifact,
    expectedSourceSha: options.sourceSha,
    expectedPredecessorBlob: options.predecessorBlob,
    outputDir: options.output,
  });
  console.log(`${MARKER}_GREEN`);
  console.log(`packet_id=${result.packet.packet_id}`);
  console.log(`candidate_manifest_id=${result.packet.candidate.manifest_id}`);
  console.log(`rollback_manifest_id=${result.packet.rollback.manifest_id}`);
  console.log(`output=${result.output}`);
  console.log("publication_authorized=false");
  console.log("repository_mutated=false");
  console.log("services_changed=false");
  console.log("money_movement_authority=false");
} catch (error) {
  fail(error?.stack || error?.message || String(error));
}
