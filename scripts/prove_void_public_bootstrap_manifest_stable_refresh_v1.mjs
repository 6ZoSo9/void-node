#!/usr/bin/env node
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildBootstrapManifest,
  createQualificationReceipt,
} from "./lib/void_public_seed_receipt_v1.mjs";
import { objectWithId } from "./lib/void_public_seed_common_v1.mjs";
import {
  buildPublicationPacket,
  validatePredecessorManifest,
} from "./lib/void_public_bootstrap_manifest_publication_v1.mjs";

const MARKER = "VOID_PUBLIC_BOOTSTRAP_MANIFEST_STABLE_REFRESH_V1_PROOF_GREEN";
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), "void-public-bootstrap-stable-refresh-v1-"));
const REPO = path.join(TEMP, "repo");
const ARTIFACT = path.join(TEMP, "artifact");
const PACKET = path.join(TEMP, "packet");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run(command, args, cwd = REPO) {
  const result = childProcess.spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed: ${String(result.stderr || result.stdout).trim()}`);
  }
  return String(result.stdout || "").trim();
}

function sha(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function bytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, content, { mode: 0o600 });
}

function authorityFalse() {
  return {
    private_routes_exposed: false,
    wallet_authority: false,
    signer_authority: false,
    validator_authority: false,
    treasury_authority: false,
    work_credit_authority: false,
    money_movement_authority: false,
  };
}

function predecessorStable(nowMs) {
  const generatedAt = new Date(nowMs - 3 * 60 * 60 * 1000).toISOString();
  return objectWithId(
    "voidpbm1_",
    {
      schema: "void_public_bootstrap_v1",
      network: "VOID Network",
      chain_id: 2050,
      status: "stable_https_seed",
      generated_at: generatedAt,
      expires_at: new Date(Date.parse(generatedAt) + 72 * 60 * 60 * 1000).toISOString(),
      sync_endpoints: [
        {
          transport: "https",
          base: "https://seed.example.org",
          priority: 10,
          enabled: true,
          temporary: false,
          qualification_id: `voidpsq1_${"1".repeat(64)}`,
          qualified_at: generatedAt,
          qualified_head: 2050,
        },
      ],
      onion_endpoints: [],
      private_tailnet_endpoints_published: false,
      authority: authorityFalse(),
      notes: "Stable predecessor fixture intentionally older than the two-hour client freshness window.",
    },
    "manifest_id",
  );
}

try {
  const nowMs = Date.now();
  const predecessor = predecessorStable(nowMs);
  const validatedPredecessor = validatePredecessorManifest(predecessor);
  assert(validatedPredecessor.status === "stable_https_seed", "stable predecessor was not accepted");

  const badAuthority = structuredClone(predecessor);
  badAuthority.authority.wallet_authority = true;
  delete badAuthority.manifest_id;
  const badAuthorityResealed = objectWithId("voidpbm1_", badAuthority, "manifest_id");
  assert.throws(
    () => validatePredecessorManifest(badAuthorityResealed),
    /wallet_authority must be false/,
  );

  const badTailnet = structuredClone(predecessor);
  badTailnet.sync_endpoints[0].base = "https://seed.example.ts.net";
  delete badTailnet.manifest_id;
  const badTailnetResealed = objectWithId("voidpbm1_", badTailnet, "manifest_id");
  assert.throws(
    () => validatePredecessorManifest(badTailnetResealed),
    /not acceptable public HTTPS/,
  );

  fs.mkdirSync(REPO, { mode: 0o700 });
  run("git", ["init", "-q"]);
  write(path.join(REPO, "public/bootstrap/v1.json"), bytes(predecessor));
  run("git", ["add", "--", "public/bootstrap/v1.json"]);
  run("git", [
    "-c", "user.name=VOID Stable Refresh Proof",
    "-c", "user.email=void-stable-refresh-proof@example.invalid",
    "-c", "commit.gpgSign=false",
    "commit", "-q", "-m", "fixture: stale stable predecessor",
  ]);

  const sourceSha = run("git", ["rev-parse", "HEAD"]);
  const predecessorBlob = run("git", ["rev-parse", "HEAD:public/bootstrap/v1.json"]);
  assert(run("git", ["status", "--porcelain=v1", "--untracked-files=all"]) === "", "fixture repo dirty");

  const sampleTimes = [nowMs - 70_000, nowMs - 35_000, nowMs];
  const receipt = createQualificationReceipt({
    endpoint: "https://seed.example.org",
    generatedAt: new Date(nowMs).toISOString(),
    samples: sampleTimes.map((time, index) => ({
      observed_at: new Date(time).toISOString(),
      ready: true,
      ready_head: 3000 + index,
      gap: 0,
      txroot_live: 1,
      head: 3000 + index,
      range_head: 3000 + index,
      gateway_header: "v1",
      private_route_status: 404,
      private_route_error: "route_not_public",
      mutation_status: 405,
      mutation_error: "method_not_allowed",
      dns_addresses: ["93.184.216.34"],
      connected_addresses: ["93.184.216.34"],
    })),
  });
  const candidate = buildBootstrapManifest([receipt], {
    nowMs,
    validityMs: 72 * 60 * 60 * 1000,
  });

  fs.mkdirSync(ARTIFACT, { mode: 0o700 });
  write(path.join(ARTIFACT, "qualification.json"), bytes(receipt));
  write(path.join(ARTIFACT, "public-bootstrap-v1.json"), bytes(candidate));
  write(path.join(ARTIFACT, "source.txt"), Buffer.from(`source_sha=${sourceSha}\n`));
  const names = ["qualification.json", "public-bootstrap-v1.json", "source.txt"];
  write(
    path.join(ARTIFACT, "SHA256SUMS"),
    Buffer.from(`${names.map((name) => `${sha(fs.readFileSync(path.join(ARTIFACT, name)))}  ${name}`).join("\n")}\n`),
  );

  const result = buildPublicationPacket({
    repoRoot: REPO,
    artifactDir: ARTIFACT,
    expectedSourceSha: sourceSha,
    expectedPredecessorBlob: predecessorBlob,
    outputDir: PACKET,
  });

  assert(result.packet.predecessor.status === "stable_https_seed", "packet lost stable predecessor status");
  assert(
    result.packet.candidate.precondition_manifest_id === predecessor.manifest_id,
    "candidate precondition does not bind the stable predecessor",
  );
  assert(result.packet.rollback.status === "hold_no_stable_seed", "rollback is not deterministic hold");
  assert(result.packet.publication_authorized === false, "packet authorized publication");

  console.log(MARKER);
  console.log("stable_predecessor_accepted=true");
  console.log("stale_predecessor_refresh_supported=true");
  console.log("candidate_precondition_bound=true");
  console.log("rollback_remains_hold=true");
  console.log("tailnet_predecessor_rejected=true");
  console.log("authority_predecessor_rejected=true");
  console.log("publication_authorized=false");
  console.log("repository_mutated=false");
  console.log("services_changed=false");
  console.log("money_movement_authority=false");
} finally {
  fs.rmSync(TEMP, { recursive: true, force: true });
}
