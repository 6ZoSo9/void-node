import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import {
  PUBLIC_AGENT_SERVICE_PROVIDER_KEY_BINDING_MARKER,
  providerKeyBindingIdV1,
  providerQuoteResponseAuthenticationKeyIdV1,
} from "./public_agent_service_provider_quote_response_authentication_v1.js";
import {
  PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_MARKER,
  PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_BODY_MARKER,
  PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_AUTHENTICATION_MARKER,
  PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_ROOT_MARKER,
  PROVIDER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_SCHEME,
  PROVIDER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_DOMAIN,
  PROVIDER_TRUST_REGISTRY_SNAPSHOT_CANONICALIZATION,
  providerTrustRootIdV1,
  providerTrustRegistrySnapshotIdV1,
  providerTrustRegistrySnapshotSigningBytesV1,
  providerTrustRegistrySnapshotAuthenticationIdV1,
} from "./public_agent_service_provider_trust_registry_snapshot_v1.js";
import {
  DATANET_PROMOTION_INDEPENDENT_ATTESTATION_SET_MARKER,
  DATANET_PROMOTION_INDEPENDENT_ATTESTATION_MARKER,
  DATANET_PROMOTION_INDEPENDENT_ATTESTATION_SIGNATURE_DOMAIN,
  DATANET_PROMOTION_INDEPENDENT_ATTESTATION_CANONICALIZATION,
  datanetPromotionIndependentAttestationSigningBytesV1,
  datanetPromotionIndependentAttestationIdV1,
  datanetPromotionCanonicalJsonV1,
} from "./datanet_promotion_independent_attestation_set_v1.js";
import {
  DATANET_PROMOTION_PUBLISHER_PROVENANCE_MARKER,
  DATANET_PROMOTION_PUBLISHER_PROVENANCE_SIGNATURE_DOMAIN,
  DATANET_PROMOTION_PUBLISHER_PROVENANCE_CANONICALIZATION,
  datanetPromotionPublisherProvenanceSigningBytesV1,
  datanetPromotionPublisherProvenanceIdV1,
} from "./datanet_promotion_publisher_provenance_separation_v1.js";
import {
  assembleDatanetPromotionPacketV1,
} from "./datanet_promotion_packet_assembly_v1.js";

function sha256(value: string | Uint8Array): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function publicPem(key: crypto.KeyObject): string {
  return key.export({ type: "spki", format: "pem" }).toString();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function writeJson(file: string, value: unknown): void {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

function makeProviderBinding(
  providerId: string,
  publicKey: crypto.KeyObject,
  nonce: string,
) {
  const draft = {
    marker: PUBLIC_AGENT_SERVICE_PROVIDER_KEY_BINDING_MARKER,
    version: 1 as const,
    binding_status: "operator_approved_snapshot" as const,
    provider_id: providerId,
    authority_scope: "provider_quote_response_authenticate" as const,
    key_id: providerQuoteResponseAuthenticationKeyIdV1(publicPem(publicKey)),
    public_key_pem: publicPem(publicKey),
    valid_from_utc: "2026-09-21T22:00:00Z",
    expires_at_utc: "2026-09-22T22:00:00Z",
    revoked_at_utc: null,
    binding_nonce: nonce,
  };
  return { ...draft, binding_id: providerKeyBindingIdV1(draft) };
}

function makeTrustSnapshot(
  rootKeys: crypto.KeyPairKeyObjectResult,
  bindings: ReturnType<typeof makeProviderBinding>[],
) {
  const rootDraft = {
    marker: PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_ROOT_MARKER,
    version: 1 as const,
    trust_status: "operator_pinned_trust_root" as const,
    authority_scope: "provider_trust_registry_snapshot_verify" as const,
    key_id: providerQuoteResponseAuthenticationKeyIdV1(publicPem(rootKeys.publicKey)),
    public_key_pem: publicPem(rootKeys.publicKey),
    valid_from_utc: "2026-09-21T21:00:00Z",
    expires_at_utc: "2026-09-23T00:00:00Z",
    revoked_at_utc: null,
    root_nonce: "datanet-packet-assembly-root-20260921",
  };
  const trustRoot = { ...rootDraft, root_id: providerTrustRootIdV1(rootDraft) };
  const snapshotBody = {
    marker: PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_BODY_MARKER,
    version: 1 as const,
    snapshot_status: "operator_approved_snapshot" as const,
    registry_id: "void.provider.registry.datanet-packet-assembly.v1",
    sequence: 1,
    previous_snapshot_id: null,
    generated_at_utc: "2026-09-21T22:00:00Z",
    expires_at_utc: "2026-09-22T22:00:00Z",
    snapshot_nonce: "datanet-packet-assembly-snapshot-20260921",
    provider_key_bindings: [...bindings].sort((a,b)=>a.provider_id.localeCompare(b.provider_id)),
  };
  const snapshotId = providerTrustRegistrySnapshotIdV1(snapshotBody);
  const authBody = {
    marker: PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_AUTHENTICATION_MARKER,
    version: 1 as const,
    signature_scheme: PROVIDER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_SCHEME,
    signature_domain: PROVIDER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_DOMAIN,
    canonicalization: PROVIDER_TRUST_REGISTRY_SNAPSHOT_CANONICALIZATION,
    snapshot_id: snapshotId,
    trust_root_id: trustRoot.root_id,
    key_id: trustRoot.key_id,
    signed_at_utc: "2026-09-21T22:01:00Z",
  };
  const signatureBase64 = crypto.sign(
    null,
    providerTrustRegistrySnapshotSigningBytesV1(snapshotBody, authBody),
    rootKeys.privateKey,
  ).toString("base64");
  return {
    marker: PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_MARKER,
    version: 1 as const,
    evidence_mode: "operator_signed_snapshot" as const,
    trust_root: trustRoot,
    snapshot_body: snapshotBody,
    authentication_envelope: {
      ...authBody,
      signature_base64: signatureBase64,
      authentication_id: providerTrustRegistrySnapshotAuthenticationIdV1({
        ...authBody,
        signature_base64: signatureBase64,
      }),
    },
  };
}

function makeAttestation(
  kind: "corroboration" | "reproducibility",
  providerId: string,
  binding: ReturnType<typeof makeProviderBinding>,
  privateKey: crypto.KeyObject,
  index: number,
  objectId: string,
  contentSha256: string,
  byteLength: number,
) {
  const body = {
    marker: DATANET_PROMOTION_INDEPENDENT_ATTESTATION_MARKER,
    version: 1 as const,
    kind,
    provider_id: providerId,
    provider_key_binding_id: binding.binding_id,
    signing_key_id: binding.key_id,
    object_id: objectId,
    content_sha256: contentSha256,
    byte_length: byteLength,
    attested_at_utc: `2026-09-21T22:3${index}:00Z`,
    verification_run_id: `void.datanet.packet-assembly.verify.${index}`,
    evidence_sha256: sha256(`packet-assembly-evidence-${index}`),
    exact_bytes_verified: true,
    conflict_detected: false,
    replay_verified: kind === "reproducibility",
    signature_scheme: "ed25519" as const,
    signature_domain: DATANET_PROMOTION_INDEPENDENT_ATTESTATION_SIGNATURE_DOMAIN,
    canonicalization: DATANET_PROMOTION_INDEPENDENT_ATTESTATION_CANONICALIZATION,
    nonce: `packet-assembly-attestation-${index}-20260921`,
  };
  const signatureBase64 = crypto.sign(
    null,
    datanetPromotionIndependentAttestationSigningBytesV1(body),
    privateKey,
  ).toString("base64");
  const withoutId = { ...body, signature_base64: signatureBase64 };
  return {
    ...withoutId,
    attestation_id: datanetPromotionIndependentAttestationIdV1(withoutId),
  };
}

function makeProvenance(
  publisherKeys: crypto.KeyPairKeyObjectResult,
  localReceipt: Record<string, unknown>,
) {
  const publicKeyPem = publicPem(publisherKeys.publicKey);
  const keyId = providerQuoteResponseAuthenticationKeyIdV1(publicKeyPem);
  const body = {
    marker: DATANET_PROMOTION_PUBLISHER_PROVENANCE_MARKER,
    version: 1 as const,
    publisher_subject_id: "void.publisher.packet-assembly.demo",
    publisher_key_id: keyId,
    publisher_public_key_pem: publicKeyPem,
    object_id: localReceipt.object_id,
    content_sha256: localReceipt.sha256,
    byte_length: localReceipt.bytes,
    imported_at_utc: localReceipt.imported_at,
    local_receipt_sha256: sha256(datanetPromotionCanonicalJsonV1(localReceipt)),
    signature_scheme: "ed25519" as const,
    signature_domain: DATANET_PROMOTION_PUBLISHER_PROVENANCE_SIGNATURE_DOMAIN,
    canonicalization: DATANET_PROMOTION_PUBLISHER_PROVENANCE_CANONICALIZATION,
    signed_at_utc: "2026-09-21T22:20:00Z",
    nonce: "packet-assembly-publisher-provenance-20260921",
    authority: {
      evidence_only: true,
      chain2050_write_authorized: false,
      datanet_mutation_authorized: false,
      validator_authority_granted: false,
      governance_mutation_authorized: false,
      signer_or_wallet_access: false,
      work_credit_award_authorized: false,
      runtime_service_action: false,
      funds_action: false,
    },
  };
  const signatureBase64 = crypto.sign(
    null,
    datanetPromotionPublisherProvenanceSigningBytesV1(body),
    publisherKeys.privateKey,
  ).toString("base64");
  const withoutId = { ...body, signature_base64: signatureBase64 };
  return {
    ...withoutId,
    publisher_provenance_id:
      datanetPromotionPublisherProvenanceIdV1(withoutId),
  };
}

const objectId = "packet-assembly-demo.bin";
const content = Buffer.from("VOID DataNet promotion packet assembly v1\n", "utf8");
const contentSha256 = sha256(content);
const byteLength = content.length;
const observedAt = "2026-09-21T22:45:00Z";

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-datanet-packet-assembly-v1-"),
);
const inputDir = path.join(root, "inputs");
fs.mkdirSync(inputDir);
const serverStatePath = path.join(root, "server-state.json");

const state = {
  contentBySha: content,
  contentById: content,
  freshness: "fresh",
};

function writeServerState(): void {
  writeJson(serverStatePath, {
    content_by_sha_base64: state.contentBySha.toString("base64"),
    content_by_id_base64: state.contentById.toString("base64"),
    freshness: state.freshness,
  });
}

const localReceipt = {
  marker: "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1",
  object_id: objectId,
  bytes: byteLength,
  sha256: contentSha256,
  imported_at: "2026-09-21T22:10:00Z",
  storage_class: "operator_local_public_read_only",
  public_upload: false,
  operator_local_import_only: true,
  trusted_as_network_truth: false,
};

writeServerState();

const serverScript = `
const fs = require("node:fs");
const http = require("node:http");

const statePath = process.argv[1];
const objectId = process.argv[2];
const contentSha256 = process.argv[3];
const byteLength = Number(process.argv[4]);

function readState() {
  return JSON.parse(fs.readFileSync(statePath, "utf8"));
}

function weightedDoc(state) {
  return {
    marker: "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1",
    object_count: 1,
    weighted_records: [{
      object_id: objectId,
      sha256: contentSha256,
      verification_state: "verified",
      freshness_state: state.freshness,
      suspicion_state: "clean",
      tombstone_state: "active",
      source_id: "operator_local_data_drop",
      promotion_eligible: true,
    }],
  };
}

function manifestDoc() {
  return {
    marker: "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_MANIFEST_V1",
    manifest_root_marker: "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_MANIFEST_ROOT_V1",
    object_count: 1,
    objects: [{
      object_id: objectId,
      sha256: contentSha256,
      bytes: byteLength,
      receipt_marker: "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1",
      receipt_valid_for_current_object: true,
    }],
  };
}

function proofDoc() {
  return {
    marker: "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_PROOF_V1",
    proof_type: "operator_local_public_read_only_object_proof",
    object_id: objectId,
    sha256: contentSha256,
    bytes: byteLength,
    receipt_marker: "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1",
    receipt_sha256: contentSha256,
    receipt_valid_for_current_object: true,
    public_upload: false,
    operator_local_import_only: true,
    public_read_only: true,
    trusted_as_network_truth: false,
  };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const state = readState();

  function json(value) {
    const body = Buffer.from(JSON.stringify(value), "utf8");
    res.writeHead(200, {
      "content-type": "application/json",
      "content-length": String(body.length),
    });
    res.end(body);
  }

  function bytes(value) {
    res.writeHead(200, {
      "content-type": "application/octet-stream",
      "content-length": String(value.length),
    });
    res.end(value);
  }

  if (url.pathname === "/public-node/local-data-drop/weighted.json") {
    return json(weightedDoc(state));
  }
  if (url.pathname === "/public-node/local-data-drop/manifest.json") {
    return json(manifestDoc());
  }
  if (
    url.pathname
      === "/public-node/local-data-drop/proof/" + contentSha256 + ".json"
  ) {
    return json(proofDoc());
  }
  if (
    url.pathname
      === "/public-node/local-data-drop/by-sha256/" + contentSha256
  ) {
    return bytes(Buffer.from(state.content_by_sha_base64, "base64"));
  }
  if (
    url.pathname
      === "/public-node/local-data-drop/" + encodeURIComponent(objectId)
  ) {
    return bytes(Buffer.from(state.content_by_id_base64, "base64"));
  }

  res.writeHead(404, { "content-type": "text/plain" });
  res.end("not found");
});

server.listen(0, "127.0.0.1", () => {
  const address = server.address();
  if (!address || typeof address !== "object") {
    process.stderr.write("server address unavailable\\n");
    process.exit(2);
  }
  process.stdout.write("PORT=" + String(address.port) + "\\n");
});
`;

const server = spawn(
  process.execPath,
  [
    "-e",
    serverScript,
    serverStatePath,
    objectId,
    contentSha256,
    String(byteLength),
  ],
  {
    stdio: ["ignore", "pipe", "inherit"],
  },
);

assert.ok(server.stdout, "child HTTP server stdout unavailable");
server.stdout.setEncoding("utf8");

const base = await new Promise<string>((resolve, reject) => {
  let stdout = "";
  const timeout = setTimeout(() => {
    reject(new Error("child HTTP server startup timed out"));
  }, 5_000);

  const cleanup = () => {
    clearTimeout(timeout);
    server.stdout?.off("data", onData);
    server.off("exit", onExit);
  };

  const onData = (chunk: string) => {
    stdout += chunk;
    const match = stdout.match(/(?:^|\\n)PORT=(\\d+)(?:\\n|$)/);
    if (!match) return;
    cleanup();
    resolve(`http://127.0.0.1:${match[1]}`);
  };

  const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
    cleanup();
    reject(
      new Error(
        "child HTTP server exited before ready code="
          + String(code)
          + " signal="
          + String(signal),
      ),
    );
  };

  server.stdout.on("data", onData);
  server.once("exit", onExit);
});

const publisherKeys = crypto.generateKeyPairSync("ed25519");
const provenance = makeProvenance(publisherKeys, localReceipt);

const providerKeys = [
  crypto.generateKeyPairSync("ed25519"),
  crypto.generateKeyPairSync("ed25519"),
  crypto.generateKeyPairSync("ed25519"),
];
const providerIds = [
  "void.provider.packet-assembly.alpha",
  "void.provider.packet-assembly.beta",
  "void.provider.packet-assembly.gamma",
];
const bindings = providerKeys.map((keys, index) =>
  makeProviderBinding(
    providerIds[index]!,
    keys.publicKey,
    `packet-assembly-provider-${index + 1}-20260921`,
  )
);
const trustInput = makeTrustSnapshot(
  crypto.generateKeyPairSync("ed25519"),
  bindings,
);
const attestationSet = {
  marker: DATANET_PROMOTION_INDEPENDENT_ATTESTATION_SET_MARKER,
  version: 1,
  object: {
    object_id: objectId,
    content_sha256: contentSha256,
    byte_length: byteLength,
  },
  trust_snapshot_id: trustInput.authentication_envelope.snapshot_id,
  attestations: [
    makeAttestation("corroboration", providerIds[0]!, bindings[0]!, providerKeys[0]!.privateKey, 1, objectId, contentSha256, byteLength),
    makeAttestation("corroboration", providerIds[1]!, bindings[1]!, providerKeys[1]!.privateKey, 2, objectId, contentSha256, byteLength),
    makeAttestation("reproducibility", providerIds[2]!, bindings[2]!, providerKeys[2]!.privateKey, 3, objectId, contentSha256, byteLength),
  ],
  authority: {
    evidence_only: true,
    chain2050_write_authorized: false,
    validator_authority_granted: false,
    governance_mutation_authorized: false,
    signer_or_wallet_access: false,
    work_credit_award_authorized: false,
    runtime_service_action: false,
    funds_action: false,
  },
};

const receiptPath = path.join(inputDir, "receipt.json");
const provenancePath = path.join(inputDir, "publisher-provenance.json");
const trustPath = path.join(inputDir, "provider-trust.json");
const attestationPath = path.join(inputDir, "attestation-set.json");
writeJson(receiptPath, localReceipt);
writeJson(provenancePath, provenance);
writeJson(trustPath, trustInput);
writeJson(attestationPath, attestationSet);

function assemblyInput(outputDir: string) {
  return {
    base_url: base,
    observed_at_utc: observedAt,
    local_receipt_path: receiptPath,
    expected_publisher_key_id: provenance.publisher_key_id,
    publisher_provenance_path: provenancePath,
    provider_trust_snapshot_path: trustPath,
    expected_trust_root_id: trustInput.trust_root.root_id,
    attestation_set_path: attestationPath,
    output_dir: outputDir,
  };
}

function expectRejectNoOutput(
  label: string,
  outputDir: string,
  fn: () => unknown,
  pattern: RegExp,
) {
  assert.throws(fn, pattern, label);
  assert.equal(fs.existsSync(outputDir), false, label + " left completed output");
}

try {
  const greenDir = path.join(root, "green-packet");
  const manifest = assembleDatanetPromotionPacketV1(assemblyInput(greenDir));
  assert.equal(manifest.marker, "VOID_DATANET_PROMOTION_PACKET_ASSEMBLY_V1");
  assert.match(String(manifest.assembly_id), /^voiddppa1_[0-9a-f]{64}$/);
  assert.deepEqual(
    fs.readdirSync(greenDir).sort(),
    [
      "assembly-manifest.json",
      "evidence-map.json",
      "external-evidence.json",
      "promotion-candidate.json",
      "source-bundle.json",
    ],
  );
  const candidate = JSON.parse(
    fs.readFileSync(path.join(greenDir, "promotion-candidate.json"), "utf8"),
  );
  assert.equal(candidate.phase_context.phase, 0);
  assert.equal(candidate.admission.disposition, "PHASE0_OPERATOR_REVIEW_ONLY");
  assert.equal(candidate.admission.canonical_write_authorized, false);
  assert.equal(candidate.admission.automatic_promotion, false);

  const existingOutput = () =>
    assembleDatanetPromotionPacketV1(assemblyInput(greenDir));
  assert.throws(existingOutput, /output directory already exists/);

  state.contentBySha = Buffer.alloc(content.length, 0x58);
  writeServerState();
  const hashFailDir = path.join(root, "hash-fail");
  expectRejectNoOutput(
    "live hash tamper",
    hashFailDir,
    () => assembleDatanetPromotionPacketV1(assemblyInput(hashFailDir)),
    /content_address_sha256_mismatch/,
  );
  state.contentBySha = content;
  writeServerState();

  state.freshness = "stale";
  writeServerState();
  const staleDir = path.join(root, "stale-fail");
  expectRejectNoOutput(
    "stale ranking evidence",
    staleDir,
    () => assembleDatanetPromotionPacketV1(assemblyInput(staleDir)),
    /freshness_not_fresh/,
  );
  state.freshness = "fresh";
  writeServerState();

  const wrongPinDir = path.join(root, "wrong-pin-fail");
  const wrongPin = {
    ...assemblyInput(wrongPinDir),
    expected_publisher_key_id: "ed25519:" + "f".repeat(64),
  };
  expectRejectNoOutput(
    "wrong publisher pin",
    wrongPinDir,
    () => assembleDatanetPromotionPacketV1(wrongPin),
    /separately pinned expected key/,
  );

  const collidingProviderKeys = [
    { publicKey: publisherKeys.publicKey, privateKey: publisherKeys.privateKey },
    crypto.generateKeyPairSync("ed25519"),
    crypto.generateKeyPairSync("ed25519"),
  ] as crypto.KeyPairKeyObjectResult[];
  const collidingProviderIds = [
    "void.provider.packet-assembly.publisher-collision",
    "void.provider.packet-assembly.delta",
    "void.provider.packet-assembly.epsilon",
  ];
  const collidingBindings = collidingProviderKeys.map((keys, index) =>
    makeProviderBinding(
      collidingProviderIds[index]!,
      keys.publicKey,
      `packet-assembly-collision-${index + 1}-20260921`,
    )
  );
  const collidingTrust = makeTrustSnapshot(
    crypto.generateKeyPairSync("ed25519"),
    collidingBindings,
  );
  const collidingSet = {
    ...attestationSet,
    trust_snapshot_id: collidingTrust.authentication_envelope.snapshot_id,
    attestations: [
      makeAttestation("corroboration", collidingProviderIds[0]!, collidingBindings[0]!, collidingProviderKeys[0]!.privateKey, 1, objectId, contentSha256, byteLength),
      makeAttestation("corroboration", collidingProviderIds[1]!, collidingBindings[1]!, collidingProviderKeys[1]!.privateKey, 2, objectId, contentSha256, byteLength),
      makeAttestation("reproducibility", collidingProviderIds[2]!, collidingBindings[2]!, collidingProviderKeys[2]!.privateKey, 3, objectId, contentSha256, byteLength),
    ],
  };
  const collidingTrustPath = path.join(inputDir, "colliding-trust.json");
  const collidingSetPath = path.join(inputDir, "colliding-set.json");
  writeJson(collidingTrustPath, collidingTrust);
  writeJson(collidingSetPath, collidingSet);
  const collisionDir = path.join(root, "collision-fail");
  const collisionInput = {
    ...assemblyInput(collisionDir),
    provider_trust_snapshot_path: collidingTrustPath,
    expected_trust_root_id: collidingTrust.trust_root.root_id,
    attestation_set_path: collidingSetPath,
  };
  expectRejectNoOutput(
    "publisher/attester collision",
    collisionDir,
    () => assembleDatanetPromotionPacketV1(collisionInput),
    /collides with publisher signing key/,
  );

  console.log("VOID_DATANET_PROMOTION_PACKET_ASSEMBLY_V1_PROOF_GREEN");
  console.log("atomic_completed_packet=true");
  console.log("completed_file_count=5");
  console.log("publisher_provenance_required=true");
  console.log("publisher_attester_key_separation_required=true");
  console.log("independent_signed_attestations_required=true");
  console.log("live_datanet_bytes_reverified=true");
  console.log("evidence_map_required=true");
  console.log("phase0_candidate_required=true");
  console.log("live_hash_tamper_leaves_no_completed_packet=true");
  console.log("stale_evidence_leaves_no_completed_packet=true");
  console.log("wrong_publisher_pin_leaves_no_completed_packet=true");
  console.log("publisher_attester_collision_leaves_no_completed_packet=true");
  console.log("operator_review_required=true");
  console.log("canonical_write_authorized=false");
  console.log("automatic_promotion=false");
  console.log("datanet_mutation_authorized=false");
  console.log("validator_authority_granted=false");
  console.log("publisher_private_key_access=false");
} finally {
  if (server.exitCode === null && server.signalCode === null) {
    server.kill("SIGTERM");
    await new Promise<void>((resolve) => {
      server.once("exit", () => resolve());
    });
  }
  fs.rmSync(root, { recursive: true, force: true });
}
