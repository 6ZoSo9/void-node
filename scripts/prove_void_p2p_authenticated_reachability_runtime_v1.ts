// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { Node } from "../src/node_core.js";
import { deriveVoidNodeIdFromPublicPemV1 } from "../src/p2p/auth_v1.js";
import {
  classifyVoidP2PReachabilityRuntimeV1,
  createVoidP2PReachabilityObservationV1,
  isVoidPublicDirectCandidateV1,
} from "../src/p2p/reachability_runtime_v1.js";

function keypair() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const pubPEM = publicKey
    .export({ type: "spki", format: "pem" })
    .toString();
  const nodeId = deriveVoidNodeIdFromPublicPemV1(pubPEM);
  assert(nodeId);
  return { privateKey, publicKey, pubPEM, nodeId };
}

async function waitFor(
  predicate: () => boolean,
  timeoutMs = 7_500,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("timed out waiting for reachability runtime condition");
}

function stopQuietly(node: Node | undefined) {
  if (!node) return;
  try {
    node.stop();
  } catch {
    for (const peer of node.peers.values()) {
      try { peer.socket.destroy(); } catch {}
    }
  }
}

async function startNode(input: {
  root: string;
  name: string;
  failureDomain: string;
  bootstrap?: string;
  allowNonPublicProbeForTest?: boolean;
}): Promise<Node> {
  process.env.DATA_DIR = path.join(input.root, input.name);
  process.env.P2P_BIND_HOST = "127.0.0.1";
  process.env.P2P_ADVERTISE_HOST = "127.0.0.1";
  process.env.BOOTSTRAP_ADDRS = input.bootstrap || "";
  process.env.VOID_P2P_REACHABILITY_FAILURE_DOMAIN = input.failureDomain;

  const node = new Node(0, keypair(), {
    reachabilityTestAllowNonPublicProbe:
      input.allowNonPublicProbeForTest === true,
  });
  await node.start();
  return node;
}

const now = Date.now();
const observedAtA = new Date(now).toISOString();
const observedAtB = new Date(now + 1).toISOString();
const subjectKeys = keypair();
const observerA = keypair();
const observerB = keypair();

const runtimeObservationA = createVoidP2PReachabilityObservationV1({
  subjectNodeId: subjectKeys.nodeId,
  observerNodeId: observerA.nodeId,
  observerFailureDomain: "failure-domain-a",
  observedAt: observedAtA,
  kind: "authenticated_dialback",
  candidateAddress: "1.1.1.1:4700",
  outcome: "success",
  authenticatedSubjectId: subjectKeys.nodeId,
  latencyMs: 12,
});
const runtimeObservationB = createVoidP2PReachabilityObservationV1({
  subjectNodeId: subjectKeys.nodeId,
  observerNodeId: observerB.nodeId,
  observerFailureDomain: "failure-domain-b",
  observedAt: observedAtB,
  kind: "authenticated_dialback",
  candidateAddress: "1.1.1.1:4700",
  outcome: "success",
  authenticatedSubjectId: subjectKeys.nodeId,
  latencyMs: 13,
});

const runtimeDirect = classifyVoidP2PReachabilityRuntimeV1(
  [runtimeObservationA, runtimeObservationB],
  { nowMs: now + 5 },
);
assert.equal(runtimeDirect.classification, "direct_confirmed");
assert.equal(runtimeDirect.counts.independent_success_observers, 2);
assert.equal(runtimeDirect.counts.independent_success_domains, 2);

const sourceContract: any = await import(
  "./lib/void_p2p_reachability_classification_contract_v1.mjs"
);
const sourceObservationA = sourceContract.createReachabilityObservation({
  subjectNodeId: subjectKeys.nodeId,
  observerNodeId: observerA.nodeId,
  observerFailureDomain: "failure-domain-a",
  observedAt: observedAtA,
  kind: "authenticated_dialback",
  candidateAddress: "1.1.1.1:4700",
  outcome: "success",
  authenticatedSubjectId: subjectKeys.nodeId,
  latencyMs: 12,
});
assert.deepEqual(runtimeObservationA, sourceObservationA);

const sourceObservationB = sourceContract.createReachabilityObservation({
  subjectNodeId: subjectKeys.nodeId,
  observerNodeId: observerB.nodeId,
  observerFailureDomain: "failure-domain-b",
  observedAt: observedAtB,
  kind: "authenticated_dialback",
  candidateAddress: "1.1.1.1:4700",
  outcome: "success",
  authenticatedSubjectId: subjectKeys.nodeId,
  latencyMs: 13,
});
const sourceDirect = sourceContract.classifyReachability(
  [sourceObservationA, sourceObservationB],
  { nowMs: now + 5 },
);
assert.equal(sourceDirect.classification, runtimeDirect.classification);
assert.deepEqual(sourceDirect.counts, runtimeDirect.counts);

assert.throws(
  () =>
    createVoidP2PReachabilityObservationV1({
      subjectNodeId: subjectKeys.nodeId,
      observerNodeId: observerA.nodeId,
      observerFailureDomain: "failure-domain-a",
      observedAt: observedAtA,
      kind: "authenticated_dialback",
      candidateAddress: "1.1.1.1:4700",
      outcome: "success",
      authenticatedSubjectId: observerA.nodeId,
      latencyMs: 1,
    }),
  /exact subject identity/,
);

assert.equal(isVoidPublicDirectCandidateV1("127.0.0.1:4700"), false);
assert.equal(isVoidPublicDirectCandidateV1("10.0.0.1:4700"), false);
assert.equal(isVoidPublicDirectCandidateV1("1.1.1.1:4700"), true);

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-p2p-authenticated-reachability-runtime-v1-"),
);

let observer: Node | undefined;
let subject: Node | undefined;
let failureObserver: Node | undefined;
let failureSubject: Node | undefined;
let productionObserver: Node | undefined;
let productionSubject: Node | undefined;

try {
  observer = await startNode({
    root,
    name: "observer",
    failureDomain: "observer-domain-a",
    allowNonPublicProbeForTest: true,
  });
  subject = await startNode({
    root,
    name: "subject",
    failureDomain: "subject-domain",
    bootstrap: observer.listenAddrs[0],
    allowNonPublicProbeForTest: true,
  });

  await waitFor(
    () =>
      subject!.peers.get(observer!.id)?.handshakeDone === true &&
      observer!.peers.get(subject!.id)?.handshakeDone === true,
  );

  await waitFor(() =>
    subject!.reachabilitySnapshot().observations.some(
      (entry) =>
        entry.kind === "authenticated_outbound_seen" &&
        entry.subject_node_id === subject!.id &&
        entry.observer_node_id === observer!.id,
    ),
  );

  const subjectControlSocket = subject.peers.get(observer.id)?.socket;
  const observerControlSocket = observer.peers.get(subject.id)?.socket;
  assert(subjectControlSocket);
  assert(observerControlSocket);

  const beforeDialback = subject.reachabilitySnapshot().observations;
  assert.equal(
    beforeDialback.some((entry) => entry.kind === "authenticated_dialback"),
    false,
  );

  const badTarget = subject.requestReachabilityDialback(
    observer.id,
    "127.0.0.1:9",
  );
  assert.equal(badTarget.ok, false);
  assert.equal(badTarget.error, "candidate_not_authenticated_listen");

  const requested = subject.requestReachabilityDialback(
    observer.id,
    subject.listenAddrs[0],
  );
  assert.equal(requested.ok, true);

  await waitFor(() =>
    subject!.reachabilitySnapshot().observations.some(
      (entry) =>
        entry.kind === "authenticated_dialback" &&
        entry.outcome === "success" &&
        entry.subject_node_id === subject!.id &&
        entry.observer_node_id === observer!.id,
    ),
  );

  assert.equal(subject.peers.get(observer.id)?.socket, subjectControlSocket);
  assert.equal(observer.peers.get(subject.id)?.socket, observerControlSocket);

  const subjectSnapshot = subject.reachabilitySnapshot();
  const subjectCandidate = subject.listenAddrs[0];
  const loopbackClassification = subjectSnapshot.classifications.find(
    (entry) =>
      entry.subject_node_id === subject!.id &&
      entry.candidate_address === subjectCandidate,
  );
  assert(loopbackClassification);
  assert.equal(loopbackClassification.classification, "non_public_address");

  failureObserver = await startNode({
    root,
    name: "failure-observer",
    failureDomain: "observer-domain-b",
    allowNonPublicProbeForTest: true,
  });
  failureSubject = await startNode({
    root,
    name: "failure-subject",
    failureDomain: "failure-subject-domain",
    bootstrap: failureObserver.listenAddrs[0],
    allowNonPublicProbeForTest: true,
  });

  await waitFor(
    () =>
      failureSubject!.peers.get(failureObserver!.id)?.handshakeDone === true &&
      failureObserver!.peers.get(failureSubject!.id)?.handshakeDone === true,
  );

  failureSubject.server.close();
  await new Promise((resolve) => setTimeout(resolve, 75));

  const failedRequest = failureSubject.requestReachabilityDialback(
    failureObserver.id,
    failureSubject.listenAddrs[0],
  );
  assert.equal(failedRequest.ok, true);

  await waitFor(() =>
    failureSubject!.reachabilitySnapshot().observations.some(
      (entry) =>
        entry.kind === "authenticated_dialback" &&
        entry.outcome === "failure" &&
        entry.observer_node_id === failureObserver!.id,
    ),
  );

  const failureObservation =
    failureSubject.reachabilitySnapshot().observations.find(
      (entry) =>
        entry.kind === "authenticated_dialback" &&
        entry.outcome === "failure" &&
        entry.observer_node_id === failureObserver!.id,
    );
  assert(failureObservation);
  assert.equal(failureObservation.authenticated_subject_id, null);
  assert.equal(failureObservation.latency_ms, null);

  productionObserver = await startNode({
    root,
    name: "production-observer",
    failureDomain: "observer-domain-c",
  });
  productionSubject = await startNode({
    root,
    name: "production-subject",
    failureDomain: "production-subject-domain",
    bootstrap: productionObserver.listenAddrs[0],
  });

  await waitFor(
    () =>
      productionSubject!.peers.get(productionObserver!.id)?.handshakeDone ===
        true &&
      productionObserver!.peers.get(productionSubject!.id)?.handshakeDone ===
        true,
  );

  const productionPrivateProbe =
    productionSubject.requestReachabilityDialback(
      productionObserver.id,
      productionSubject.listenAddrs[0],
    );
  assert.equal(productionPrivateProbe.ok, false);
  assert.equal(productionPrivateProbe.error, "candidate_not_public");

  console.log("[PASS] runtime observation bytes match source contract v1");
  console.log("[PASS] independent observer/domain semantics match source classifier");
  console.log("[PASS] outbound-seen evidence is emitted after authenticated session completion");
  console.log("[PASS] dialback uses a separate authenticated probe connection");
  console.log("[PASS] dialback probe preserves the existing control session");
  console.log("[PASS] arbitrary targets outside authenticated listen state are rejected");
  console.log("[PASS] production mode refuses loopback/private dialback targets");
  console.log("[PASS] isolated test-only loopback probe authenticates exact subject identity");
  console.log("[PASS] failed dialback carries no identity or latency claim");
  console.log("[PASS] non-public success never becomes direct reachability");

  console.log("VOID_P2P_AUTHENTICATED_REACHABILITY_RUNTIME_V1_PROOF_GREEN");
  console.log("source_contract_parity=true");
  console.log("authenticated_outbound_observation_transport_bound=true");
  console.log("dialback_probe_separate_connection=true");
  console.log("dialback_probe_preserved_control_session=true");
  console.log("dialback_exact_subject_identity_required=true");
  console.log("dialback_failure_no_identity_claim=true");
  console.log("arbitrary_target_probe_allowed=false");
  console.log("non_public_probe_allowed_without_test_override=false");
  console.log("non_public_probe_direct_confirmed=false");
  console.log("independent_observers_direct_confirmed=true");
  console.log("nat_type_inferred=false");
  console.log("relay_requirement_inferred=false");
  console.log("runtime_network_probe_exercised=true");
  console.log("deployment_performed=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
} finally {
  stopQuietly(productionSubject);
  stopQuietly(productionObserver);
  stopQuietly(failureSubject);
  stopQuietly(failureObserver);
  stopQuietly(subject);
  stopQuietly(observer);
  fs.rmSync(root, { recursive: true, force: true });
}
