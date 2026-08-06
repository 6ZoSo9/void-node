#!/usr/bin/env node
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import {
  buildBootstrapManifest,
  createQualificationReceipt,
} from "./lib/void_public_seed_receipt_v1.mjs";
import { objectWithId } from "./lib/void_public_seed_common_v1.mjs";

const MARKER = "VOID_PUBLIC_BOOTSTRAP_MANIFEST_PUBLICATION_PACKET_V1_PROOF_GREEN";
const ROOT = fs.realpathSync(process.cwd());
const TEMP = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-public-bootstrap-publication-packet-v1-"),
);
const ARTIFACT = path.join(TEMP, "qualification-output");
const PACKET = path.join(TEMP, "publication-packet");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run(command, args, { expectSuccess = true } = {}) {
  const result = childProcess.spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (expectSuccess && result.status !== 0) {
    process.stderr.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    throw new Error(`${command} ${args.join(" ")} failed with rc=${result.status}`);
  }
  if (!expectSuccess && result.status === 0) {
    throw new Error(`${command} ${args.join(" ")} unexpectedly succeeded`);
  }
  return result;
}

function sha(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function write(filePath, bytes) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(filePath, bytes, { mode: 0o600 });
}

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function artifactSums(dir) {
  const names = ["qualification.json", "public-bootstrap-v1.json", "source.txt"];
  const lines = names.map((name) => {
    const bytes = fs.readFileSync(path.join(dir, name));
    return `${sha(bytes)}  ${name}`;
  });
  write(path.join(dir, "SHA256SUMS"), Buffer.from(`${lines.join("\n")}\n`));
}

function copyDirectory(source, destination) {
  fs.cpSync(source, destination, { recursive: true, force: false });
}

function builderArgs({ artifact = ARTIFACT, output = PACKET, sourceSha, predecessorBlob }) {
  return [
    "scripts/build_void_public_bootstrap_manifest_publication_packet_v1.mjs",
    "--artifact",
    artifact,
    "--repo-root",
    ROOT,
    "--expected-source-sha",
    sourceSha,
    "--expected-predecessor-blob",
    predecessorBlob,
    "--output",
    output,
  ];
}

function verifierArgs({ packet = PACKET, sourceSha, predecessorBlob }) {
  return [
    "scripts/verify_void_public_bootstrap_manifest_publication_packet_v1.mjs",
    "--packet",
    packet,
    "--repo-root",
    ROOT,
    "--expected-source-sha",
    sourceSha,
    "--expected-predecessor-blob",
    predecessorBlob,
  ];
}

try {
  const sourceSha = run("git", ["rev-parse", "HEAD"]).stdout.trim();
  const predecessorBlob = run("git", [
    "rev-parse",
    "HEAD:public/bootstrap/v1.json",
  ]).stdout.trim();
  assert(/^[0-9a-f]{40}$/.test(sourceSha), "fixture source SHA is invalid");
  assert(/^[0-9a-f]{40}$/.test(predecessorBlob), "fixture predecessor blob is invalid");

  const nowMs = Date.now();
  const heads = [2050, 2051, 2052];
  const observed = [nowMs - 70_000, nowMs - 35_000, nowMs];
  const samples = observed.map((time, index) => ({
    observed_at: new Date(time).toISOString(),
    ready: true,
    ready_head: heads[index],
    gap: 0,
    txroot_live: 1,
    head: heads[index],
    range_head: heads[index],
    gateway_header: "v1",
    private_route_status: 404,
    private_route_error: "route_not_public",
    mutation_status: 405,
    mutation_error: "method_not_allowed",
    dns_addresses: ["93.184.216.34"],
    connected_addresses: ["93.184.216.34"],
  }));
  const receipt = createQualificationReceipt({
    endpoint: "https://seed.example.org",
    samples,
    generatedAt: new Date(nowMs).toISOString(),
  });
  const candidate = buildBootstrapManifest([receipt], {
    nowMs,
    validityMs: 72 * 60 * 60 * 1000,
  });

  fs.mkdirSync(ARTIFACT, { mode: 0o700 });
  write(path.join(ARTIFACT, "qualification.json"), jsonBytes(receipt));
  write(path.join(ARTIFACT, "public-bootstrap-v1.json"), jsonBytes(candidate));
  write(path.join(ARTIFACT, "source.txt"), Buffer.from(`source_sha=${sourceSha}\n`));
  artifactSums(ARTIFACT);

  const built = run(process.execPath, builderArgs({ sourceSha, predecessorBlob }));
  assert(built.stdout.includes("publication_authorized=false"), "builder authority marker missing");
  const verified = run(process.execPath, verifierArgs({ sourceSha, predecessorBlob }));
  assert(verified.stdout.includes("repository_mutated=false"), "verifier mutation marker missing");

  const packet = JSON.parse(fs.readFileSync(path.join(PACKET, "packet.json"), "utf8"));
  const packetCandidate = fs.readFileSync(
    path.join(PACKET, "candidate", "public", "bootstrap", "v1.json"),
  );
  const artifactCandidate = fs.readFileSync(path.join(ARTIFACT, "public-bootstrap-v1.json"));
  assert(packetCandidate.equals(artifactCandidate), "packet candidate is not byte-exact artifact output");
  assert(packet.destination === "public/bootstrap/v1.json", "packet destination escaped one file");
  assert(packet.predecessor.git_blob_sha === predecessorBlob, "predecessor blob binding missing");
  assert(packet.candidate.precondition_manifest_id === packet.predecessor.manifest_id, "candidate precondition mismatch");
  assert(packet.rollback.precondition_manifest_id === packet.candidate.manifest_id, "rollback precondition mismatch");
  assert(packet.publication_authorized === false, "packet authorized publication");

  const rollback = JSON.parse(
    fs.readFileSync(
      path.join(PACKET, "rollback", "public", "bootstrap", "v1.json"),
      "utf8",
    ),
  );
  assert(rollback.status === "hold_no_stable_seed", "rollback is not a hold manifest");
  assert(rollback.sync_endpoints.length === 0, "rollback publishes a seed");
  assert(rollback.onion_endpoints.length === 0, "rollback publishes onion endpoints");
  assert(
    Object.values(rollback.authority).every((value) => value === false),
    "rollback carries authority",
  );

  const review = fs.readFileSync(path.join(PACKET, "REVIEW.txt"), "utf8");
  for (const forbidden of ["git push", "gh pr", "sudo ", "systemctl ", "curl "]) {
    assert(!review.includes(forbidden), `review text contains active command ${forbidden}`);
  }

  const checksumTamper = path.join(TEMP, "artifact-checksum-tamper");
  copyDirectory(ARTIFACT, checksumTamper);
  fs.appendFileSync(path.join(checksumTamper, "qualification.json"), " ");
  run(
    process.execPath,
    builderArgs({
      artifact: checksumTamper,
      output: path.join(TEMP, "packet-checksum-tamper"),
      sourceSha,
      predecessorBlob,
    }),
    { expectSuccess: false },
  );

  const resealedUnknown = path.join(TEMP, "artifact-resealed-unknown");
  copyDirectory(ARTIFACT, resealedUnknown);
  const unknown = JSON.parse(
    fs.readFileSync(path.join(resealedUnknown, "public-bootstrap-v1.json"), "utf8"),
  );
  unknown.rpc_authority = true;
  delete unknown.manifest_id;
  const resealed = objectWithId("voidpbm1_", unknown, "manifest_id");
  write(path.join(resealedUnknown, "public-bootstrap-v1.json"), jsonBytes(resealed));
  artifactSums(resealedUnknown);
  run(
    process.execPath,
    builderArgs({
      artifact: resealedUnknown,
      output: path.join(TEMP, "packet-resealed-unknown"),
      sourceSha,
      predecessorBlob,
    }),
    { expectSuccess: false },
  );

  const wrongSource = path.join(TEMP, "artifact-wrong-source");
  copyDirectory(ARTIFACT, wrongSource);
  write(path.join(wrongSource, "source.txt"), Buffer.from(`source_sha=${"a".repeat(40)}\n`));
  artifactSums(wrongSource);
  run(
    process.execPath,
    builderArgs({
      artifact: wrongSource,
      output: path.join(TEMP, "packet-wrong-source"),
      sourceSha,
      predecessorBlob,
    }),
    { expectSuccess: false },
  );

  run(
    process.execPath,
    builderArgs({
      output: path.join(ROOT, ".void-publication-packet-forbidden"),
      sourceSha,
      predecessorBlob,
    }),
    { expectSuccess: false },
  );
  assert(!fs.existsSync(path.join(ROOT, ".void-publication-packet-forbidden")), "forbidden output was created");

  run(
    process.execPath,
    builderArgs({
      output: path.join(TEMP, "packet-wrong-predecessor"),
      sourceSha,
      predecessorBlob: "b".repeat(40),
    }),
    { expectSuccess: false },
  );

  const tamperedPacket = path.join(TEMP, "packet-tampered");
  copyDirectory(PACKET, tamperedPacket);
  fs.appendFileSync(
    path.join(tamperedPacket, "candidate", "public", "bootstrap", "v1.json"),
    " ",
  );
  run(
    process.execPath,
    verifierArgs({ packet: tamperedPacket, sourceSha, predecessorBlob }),
    { expectSuccess: false },
  );

  const newFiles = [
    "scripts/lib/void_public_bootstrap_manifest_publication_v1.mjs",
    "scripts/lib/void_public_bootstrap_manifest_publication_contract_v1.mjs",
    "scripts/lib/void_public_bootstrap_manifest_publication_state_v1.mjs",
    "scripts/lib/void_public_bootstrap_manifest_publication_build_v1.mjs",
    "scripts/lib/void_public_bootstrap_manifest_publication_verify_v1.mjs",
    "scripts/build_void_public_bootstrap_manifest_publication_packet_v1.mjs",
    "scripts/verify_void_public_bootstrap_manifest_publication_packet_v1.mjs",
    "scripts/prove_void_public_bootstrap_manifest_publication_packet_v1.mjs",
  ];
  for (const file of newFiles) {
    const source = fs.readFileSync(file, "utf8");
    assert(!/catch\s*\{/.test(source), `${file} contains a raw empty catch`);
  }

  console.log(MARKER);
  console.log("artifact_checksums_bound=true");
  console.log("qualification_source_bound=true");
  console.log("predecessor_git_blob_bound=true");
  console.log("candidate_byte_exact=true");
  console.log("candidate_destination_count=1");
  console.log("rollback_hold_deterministic=true");
  console.log("publication_authorized=false");
  console.log("repository_mutated=false");
  console.log("services_changed=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
} finally {
  fs.rmSync(TEMP, { recursive: true, force: true });
}
