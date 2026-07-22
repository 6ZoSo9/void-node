// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import { generateKeyPairSync } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import {
  VOID_P2P_ACTIVATION_RUNTIME_PROFILE_SCHEMA_V1,
  VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_ENVELOPE_SCHEMA_V1,
  VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_SCHEMA_V1,
  VoidP2pActivationPermitHoldV1,
  canonicalVoidP2pActivationPermitJsonV1,
  consumeVoidP2pNodeBoundActivationPermitV1,
  createVoidP2pActivationPermitRootSetV1,
  deriveVoidP2pEdgeEnvironmentFromRuntimeProfileV1,
  hashVoidP2pActivationPermitDocumentV1,
  hashVoidP2pActivationRuntimeProfileV1,
  parseVoidP2pActivationRuntimeProfileV1,
  signVoidP2pNodeBoundActivationPermitV1,
  verifyVoidP2pNodeBoundActivationPermitV1,
  type VoidP2pActivationRuntimeProfileV1,
  type VoidP2pNodeBoundActivationPermitEnvelopeV1,
  type VoidP2pNodeBoundActivationPermitV1,
} from "../src/p2p/node_bound_activation_permit_wall_v1.js";

const GREEN = "VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_WALL_V1_GREEN";
const NETWORK = "void-mainnet0-chain2050";
const NODE = "1".repeat(64);
const POLICY = "2".repeat(64);
const NOW = Date.parse("2026-07-22T22:30:00.000Z");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function expectHold(code: string, action: () => unknown | Promise<unknown>): Promise<void> {
  try {
    await action();
  } catch (error) {
    if (error instanceof VoidP2pActivationPermitHoldV1 && error.code === code) return;
    throw new Error(`expected hold ${code}; received ${error instanceof Error ? `${error.name}:${error.message}` : String(error)}`);
  }
  throw new Error(`expected hold ${code}; action succeeded`);
}

function keyPair() {
  const pair = generateKeyPairSync("ed25519");
  return {
    private_key_pem: pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    public_key_pem: pair.publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
}

function profile(stateDir: string): VoidP2pActivationRuntimeProfileV1 {
  return parseVoidP2pActivationRuntimeProfileV1({
    schema: VOID_P2P_ACTIVATION_RUNTIME_PROFILE_SCHEMA_V1,
    network_id: NETWORK,
    control: {
      activation_permit_state_dir: stateDir,
      trust_policy_state_dir: path.join(path.dirname(stateDir), "trust-policy-state"),
    },
    edge: {
      mode: "both",
      listen_host: "0.0.0.0",
      listen_port: 4790,
      backend_host: "127.0.0.1",
      backend_port: 4700,
      status_host: "::1",
      status_port: 4190,
      key_file: path.join(path.dirname(stateDir), "identity.key.pem"),
      cert_file: path.join(path.dirname(stateDir), "identity.cert.pem"),
      audit_log: path.join(path.dirname(stateDir), "edge-audit.ndjson"),
    },
    limits: {
      handshake_timeout_ms: 10_000,
      max_clock_skew_ms: 60_000,
      idle_timeout_ms: 120_000,
      backend_connect_timeout_ms: 5_000,
      max_connections: 128,
      max_connections_per_ip: 8,
      max_pending_handshakes: 32,
      max_auth_line_bytes: 16_384,
      quarantine_threshold: 3,
      quarantine_base_ms: 30_000,
      quarantine_max_ms: 3_600_000,
      reconnect_min_ms: 1_000,
      reconnect_max_ms: 30_000,
    },
  });
}

function permit(input: Readonly<{
  sequence: string;
  previous?: string;
  profile_sha256: string;
  envelope_sha256: string;
  trust_root_set_sha256: string;
}>): VoidP2pNodeBoundActivationPermitV1 {
  return {
    schema: VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_SCHEMA_V1,
    network_id: NETWORK,
    edge_node_id: NODE,
    sequence: input.sequence,
    issued_at: new Date(NOW - 1_000).toISOString(),
    not_before: new Date(NOW - 500).toISOString(),
    expires_at: new Date(NOW + 60_000).toISOString(),
    ...(input.previous ? { previous_permit_sha256: input.previous } : {}),
    policy_epoch: "7",
    policy_sha256: POLICY,
    policy_envelope_sha256: input.envelope_sha256,
    trust_root_set_sha256: input.trust_root_set_sha256,
    runtime_profile_sha256: input.profile_sha256,
  };
}

function signTwice(
  permitDocument: VoidP2pNodeBoundActivationPermitV1,
  first: ReturnType<typeof keyPair>,
  second: ReturnType<typeof keyPair>,
): VoidP2pNodeBoundActivationPermitEnvelopeV1 {
  const once = signVoidP2pNodeBoundActivationPermitV1({
    permit: permitDocument,
    private_key_pem: first.private_key_pem,
  });
  return signVoidP2pNodeBoundActivationPermitV1({
    permit: once.permit,
    private_key_pem: second.private_key_pem,
    existing_signatures: once.signatures,
  });
}

async function main(): Promise<void> {
  const root = await mkdtemp(path.join(tmpdir(), "void-p2p-activation-permit-proof-"));
  try {
    const authorityA = keyPair();
    const authorityB = keyPair();
    const authorityC = keyPair();
    const outsider = keyPair();
    const rootSet = createVoidP2pActivationPermitRootSetV1({
      network_id: NETWORK,
      threshold: 2,
      public_key_pems: [authorityA.public_key_pem, authorityB.public_key_pem, authorityC.public_key_pem],
    });
    assert(rootSet.threshold === 2 && rootSet.keys.length === 3, "2-of-3 root set was not created");

    const trustRootSet = {
      schema: "void-p2p-trust-root-set-v1",
      network_id: NETWORK,
      threshold: 2,
      keys: [{ key_id: "3".repeat(64), public_key_pem: "proof-only" }],
    };
    const trustEnvelope = {
      schema: "void-p2p-signed-trust-policy-envelope-v1",
      policy: { schema: "proof-policy", network_id: NETWORK, epoch: "7", payload: "proof" },
      signatures: [],
    };
    const trustRootHash = hashVoidP2pActivationPermitDocumentV1(trustRootSet);
    const trustEnvelopeHash = hashVoidP2pActivationPermitDocumentV1(trustEnvelope);
    const state1 = path.join(root, "permit-state-1");
    const runtime = hashVoidP2pActivationRuntimeProfileV1(profile(state1));
    const permit1 = permit({
      sequence: "1",
      profile_sha256: runtime.profile_sha256,
      envelope_sha256: trustEnvelopeHash,
      trust_root_set_sha256: trustRootHash,
    });
    const envelope1 = signTwice(permit1, authorityA, authorityB);
    const options = {
      expected_network_id: NETWORK,
      expected_edge_node_id: NODE,
      expected_policy_epoch: "7",
      expected_policy_sha256: POLICY,
      expected_policy_envelope_sha256: trustEnvelopeHash,
      expected_trust_root_set_sha256: trustRootHash,
      expected_runtime_profile_sha256: runtime.profile_sha256,
      now_ms: NOW,
      max_clock_skew_ms: 0,
      max_permit_lifetime_ms: 120_000,
    };
    const verified1 = verifyVoidP2pNodeBoundActivationPermitV1({
      envelope: envelope1,
      root_set: rootSet,
      options,
    });
    assert(verified1.signer_key_ids.length === 2, "threshold signers were not retained");
    assert(verified1.threshold === 2, "threshold changed during verification");
    assert(verified1.permit_sha256 === hashVoidP2pActivationPermitDocumentV1(permit1), "permit hash mismatch");
    assert(canonicalVoidP2pActivationPermitJsonV1(envelope1).length > 0, "canonical encoding missing");

    const edgeEnvironment = deriveVoidP2pEdgeEnvironmentFromRuntimeProfileV1(runtime.profile);
    assert(edgeEnvironment.VOID_P2P_EDGE_WALL_BACKEND_HOST === "127.0.0.1", "backend environment changed");
    assert(edgeEnvironment.VOID_P2P_EDGE_WALL_STATUS_HOST === "::1", "status environment changed");
    assert(!("VOID_P2P_EDGE_WALL_ALLOW_NODE_IDS" in edgeEnvironment), "runtime profile gained membership authority");

    await expectHold("insufficient_signatures", () => verifyVoidP2pNodeBoundActivationPermitV1({
      envelope: signVoidP2pNodeBoundActivationPermitV1({ permit: permit1, private_key_pem: authorityA.private_key_pem }),
      root_set: rootSet,
      options,
    }));
    await expectHold("unknown_signer", () => verifyVoidP2pNodeBoundActivationPermitV1({
      envelope: signVoidP2pNodeBoundActivationPermitV1({ permit: permit1, private_key_pem: outsider.private_key_pem }),
      root_set: rootSet,
      options,
    }));
    const badSignature: VoidP2pNodeBoundActivationPermitEnvelopeV1 = {
      schema: VOID_P2P_NODE_BOUND_ACTIVATION_PERMIT_ENVELOPE_SCHEMA_V1,
      permit: envelope1.permit,
      signatures: envelope1.signatures.map((entry, index) => index === 0
        ? { ...entry, signature_base64: Buffer.alloc(64).toString("base64") }
        : entry),
    };
    await expectHold("invalid_signature", () => verifyVoidP2pNodeBoundActivationPermitV1({
      envelope: badSignature,
      root_set: rootSet,
      options,
    }));
    for (const [code, patch] of [
      ["wrong_network", { expected_network_id: "void-testnet-chain2050" }],
      ["wrong_edge_node", { expected_edge_node_id: "4".repeat(64) }],
      ["wrong_policy_epoch", { expected_policy_epoch: "8" }],
      ["wrong_policy", { expected_policy_sha256: "5".repeat(64) }],
      ["wrong_policy_envelope", { expected_policy_envelope_sha256: "6".repeat(64) }],
      ["wrong_trust_root_set", { expected_trust_root_set_sha256: "7".repeat(64) }],
      ["wrong_runtime_profile", { expected_runtime_profile_sha256: "8".repeat(64) }],
    ] as const) {
      await expectHold(code, () => verifyVoidP2pNodeBoundActivationPermitV1({
        envelope: envelope1,
        root_set: rootSet,
        options: { ...options, ...patch },
      }));
    }
    await expectHold("permit_expired", () => verifyVoidP2pNodeBoundActivationPermitV1({
      envelope: envelope1,
      root_set: rootSet,
      options: { ...options, now_ms: NOW + 60_000 },
    }));
    const futureWindowPermit: VoidP2pNodeBoundActivationPermitV1 = {
      ...permit1,
      issued_at: new Date(NOW - 20_000).toISOString(),
      not_before: new Date(NOW - 500).toISOString(),
    };
    const futureWindowEnvelope = signTwice(futureWindowPermit, authorityA, authorityB);
    await expectHold("permit_not_yet_valid", () => verifyVoidP2pNodeBoundActivationPermitV1({
      envelope: futureWindowEnvelope,
      root_set: rootSet,
      options: { ...options, now_ms: NOW - 10_000 },
    }));
    await expectHold("permit_lifetime_exceeded", () => verifyVoidP2pNodeBoundActivationPermitV1({
      envelope: envelope1,
      root_set: rootSet,
      options: { ...options, max_permit_lifetime_ms: 10_000 },
    }));
    await expectHold("invalid_runtime_profile", () => parseVoidP2pActivationRuntimeProfileV1({
      ...runtime.profile,
      edge: { ...runtime.profile.edge, backend_host: "192.0.2.10" },
    }));
    await expectHold("invalid_runtime_profile", () => parseVoidP2pActivationRuntimeProfileV1({
      ...runtime.profile,
      edge: { ...runtime.profile.edge, status_host: "0.0.0.0" },
    }));

    const consumed1 = await consumeVoidP2pNodeBoundActivationPermitV1({
      verified: verified1,
      trust_policy_envelope: trustEnvelope,
      trust_root_set: trustRootSet,
      runtime_profile: runtime.profile,
      state_dir: state1,
      now_ms: NOW,
    });
    assert(consumed1.consumption.sequence === "1", "first permit was not consumed");
    for (const file of [
      consumed1.sealed_policy_envelope_file,
      consumed1.sealed_trust_root_set_file,
      consumed1.sealed_runtime_profile_file,
      path.join(consumed1.generation_dir, "activation-permit-root-set.json"),
      path.join(consumed1.generation_dir, "permit-envelope.json"),
      path.join(consumed1.generation_dir, "consumption.json"),
    ]) {
      assert((await readFile(file)).length > 0, `sealed file missing: ${file}`);
    }
    await expectHold("permit_replay", () => consumeVoidP2pNodeBoundActivationPermitV1({
      verified: verified1,
      trust_policy_envelope: trustEnvelope,
      trust_root_set: trustRootSet,
      runtime_profile: runtime.profile,
      state_dir: state1,
      now_ms: NOW,
    }));
    await expectHold("wrong_state_directory", () => consumeVoidP2pNodeBoundActivationPermitV1({
      verified: verified1,
      trust_policy_envelope: trustEnvelope,
      trust_root_set: trustRootSet,
      runtime_profile: runtime.profile,
      state_dir: path.join(root, "wrong-state"),
      now_ms: NOW,
    }));
    await expectHold("wrong_trust_root_set", () => consumeVoidP2pNodeBoundActivationPermitV1({
      verified: verified1,
      trust_policy_envelope: trustEnvelope,
      trust_root_set: { ...trustRootSet, threshold: 1 },
      runtime_profile: runtime.profile,
      state_dir: state1,
      now_ms: NOW,
    }));
    await expectHold("permit_expired", () => consumeVoidP2pNodeBoundActivationPermitV1({
      verified: verified1,
      trust_policy_envelope: trustEnvelope,
      trust_root_set: trustRootSet,
      runtime_profile: runtime.profile,
      state_dir: state1,
      now_ms: NOW + 60_000,
    }));

    const permitGap = permit({
      sequence: "3",
      previous: verified1.permit_sha256,
      profile_sha256: runtime.profile_sha256,
      envelope_sha256: trustEnvelopeHash,
      trust_root_set_sha256: trustRootHash,
    });
    const verifiedGap = verifyVoidP2pNodeBoundActivationPermitV1({
      envelope: signTwice(permitGap, authorityA, authorityB),
      root_set: rootSet,
      options,
    });
    await expectHold("permit_sequence_gap", () => consumeVoidP2pNodeBoundActivationPermitV1({
      verified: verifiedGap,
      trust_policy_envelope: trustEnvelope,
      trust_root_set: trustRootSet,
      runtime_profile: runtime.profile,
      state_dir: state1,
      now_ms: NOW,
    }));

    const wrongPredecessor = permit({
      sequence: "2",
      previous: "9".repeat(64),
      profile_sha256: runtime.profile_sha256,
      envelope_sha256: trustEnvelopeHash,
      trust_root_set_sha256: trustRootHash,
    });
    const verifiedWrongPredecessor = verifyVoidP2pNodeBoundActivationPermitV1({
      envelope: signTwice(wrongPredecessor, authorityA, authorityB),
      root_set: rootSet,
      options,
    });
    await expectHold("wrong_predecessor", () => consumeVoidP2pNodeBoundActivationPermitV1({
      verified: verifiedWrongPredecessor,
      trust_policy_envelope: trustEnvelope,
      trust_root_set: trustRootSet,
      runtime_profile: runtime.profile,
      state_dir: state1,
      now_ms: NOW,
    }));

    const permit2 = permit({
      sequence: "2",
      previous: verified1.permit_sha256,
      profile_sha256: runtime.profile_sha256,
      envelope_sha256: trustEnvelopeHash,
      trust_root_set_sha256: trustRootHash,
    });
    const verified2 = verifyVoidP2pNodeBoundActivationPermitV1({
      envelope: signTwice(permit2, authorityB, authorityC),
      root_set: rootSet,
      options,
    });
    const consumed2 = await consumeVoidP2pNodeBoundActivationPermitV1({
      verified: verified2,
      trust_policy_envelope: trustEnvelope,
      trust_root_set: trustRootSet,
      runtime_profile: runtime.profile,
      state_dir: state1,
      now_ms: NOW,
    });
    assert(consumed2.consumption.sequence === "2", "successor permit was not consumed");

    const concurrentState = path.join(root, "concurrent-state");
    const concurrentRuntime = hashVoidP2pActivationRuntimeProfileV1(profile(concurrentState));
    const concurrentPermit = permit({
      sequence: "1",
      profile_sha256: concurrentRuntime.profile_sha256,
      envelope_sha256: trustEnvelopeHash,
      trust_root_set_sha256: trustRootHash,
    });
    const concurrentVerified = verifyVoidP2pNodeBoundActivationPermitV1({
      envelope: signTwice(concurrentPermit, authorityA, authorityC),
      root_set: rootSet,
      options: { ...options, expected_runtime_profile_sha256: concurrentRuntime.profile_sha256 },
    });
    const attempt = () => consumeVoidP2pNodeBoundActivationPermitV1({
      verified: concurrentVerified,
      trust_policy_envelope: trustEnvelope,
      trust_root_set: trustRootSet,
      runtime_profile: concurrentRuntime.profile,
      state_dir: concurrentState,
      now_ms: NOW,
    });
    const results = await Promise.allSettled([attempt(), attempt()]);
    assert(results.filter((entry) => entry.status === "fulfilled").length === 1, "concurrent consumption did not admit exactly one caller");
    const rejected = results.find((entry): entry is PromiseRejectedResult => entry.status === "rejected");
    assert(rejected?.reason instanceof VoidP2pActivationPermitHoldV1, "concurrent loser did not fail closed");
    assert(
      ["activation_in_progress", "permit_replay", "permit_already_consumed"].includes(rejected.reason.code),
      `unexpected concurrent rejection: ${rejected.reason.code}`,
    );

    const corruptState = path.join(root, "corrupt-state");
    const corruptRuntime = hashVoidP2pActivationRuntimeProfileV1(profile(corruptState));
    const corruptPermit = permit({
      sequence: "1",
      profile_sha256: corruptRuntime.profile_sha256,
      envelope_sha256: trustEnvelopeHash,
      trust_root_set_sha256: trustRootHash,
    });
    const corruptVerified = verifyVoidP2pNodeBoundActivationPermitV1({
      envelope: signTwice(corruptPermit, authorityA, authorityB),
      root_set: rootSet,
      options: { ...options, expected_runtime_profile_sha256: corruptRuntime.profile_sha256 },
    });
    await mkdir(corruptState, { recursive: true });
    await symlink("../escape", path.join(corruptState, "current"));
    await expectHold("corrupt_state", () => consumeVoidP2pNodeBoundActivationPermitV1({
      verified: corruptVerified,
      trust_policy_envelope: trustEnvelope,
      trust_root_set: trustRootSet,
      runtime_profile: corruptRuntime.profile,
      state_dir: corruptState,
      now_ms: NOW,
    }));

    const symlinkState = path.join(root, "symlink-state");
    const symlinkTarget = path.join(root, "symlink-target");
    await mkdir(symlinkTarget);
    await symlink(symlinkTarget, symlinkState);
    const symlinkRuntime = hashVoidP2pActivationRuntimeProfileV1(profile(symlinkState));
    const symlinkPermit = permit({
      sequence: "1",
      profile_sha256: symlinkRuntime.profile_sha256,
      envelope_sha256: trustEnvelopeHash,
      trust_root_set_sha256: trustRootHash,
    });
    const symlinkVerified = verifyVoidP2pNodeBoundActivationPermitV1({
      envelope: signTwice(symlinkPermit, authorityA, authorityB),
      root_set: rootSet,
      options: { ...options, expected_runtime_profile_sha256: symlinkRuntime.profile_sha256 },
    });
    await expectHold("unsafe_state_path", () => consumeVoidP2pNodeBoundActivationPermitV1({
      verified: symlinkVerified,
      trust_policy_envelope: trustEnvelope,
      trust_root_set: trustRootSet,
      runtime_profile: symlinkRuntime.profile,
      state_dir: symlinkState,
      now_ms: NOW,
    }));

    const auditLines = (await readFile(path.join(state1, "consumed.ndjson"), "utf8")).trim().split("\n");
    assert(auditLines.length === 2, "append-only consumption audit did not retain both generations");
    const currentTarget = await readFile(path.join(consumed2.generation_dir, "consumption.json"), "utf8");
    assert(currentTarget.includes(`"sequence": "2"`), "current generation is not the successor permit");

    console.log(GREEN);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
