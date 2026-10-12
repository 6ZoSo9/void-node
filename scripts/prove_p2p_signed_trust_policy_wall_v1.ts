// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { chmod, lstat, readFile, rm, symlink, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs/promises";
import {
  activateVoidP2pSignedTrustPolicyV1,
  canonicalVoidP2pTrustJsonV1,
  createVoidP2pTrustRootSetV1,
  loadActiveVoidP2pTrustPolicyV1,
  parseVoidP2pSignedTrustPolicyV1,
  signVoidP2pTrustPolicyV1,
  verifyVoidP2pSignedTrustPolicyV1,
  VoidP2pTrustPolicyHoldV1,
  VOID_P2P_SIGNED_TRUST_POLICY_ENVELOPE_SCHEMA_V1,
  VOID_P2P_SIGNED_TRUST_POLICY_SCHEMA_V1,
  VOID_P2P_SIGNED_TRUST_POLICY_WALL_V1_MARKER,
  type VoidP2pSignedTrustPolicyV1,
} from "../src/p2p/signed_trust_policy_wall_v1.js";

const NOW = Date.parse("2026-07-22T12:00:00.000Z");
const NETWORK = "void-mainnet0-chain2050";
const NODE_1 = "1".repeat(64);
const NODE_2 = "2".repeat(64);
const NODE_3 = "3".repeat(64);

function keyPair(): Readonly<{ private_key_pem: string; public_key_pem: string }> {
  const generated = generateKeyPairSync("ed25519");
  return Object.freeze({
    private_key_pem: generated.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    public_key_pem: generated.publicKey.export({ type: "spki", format: "pem" }).toString(),
  });
}

function policy(overrides: Partial<VoidP2pSignedTrustPolicyV1> = {}): VoidP2pSignedTrustPolicyV1 {
  return parseVoidP2pSignedTrustPolicyV1({
    schema: VOID_P2P_SIGNED_TRUST_POLICY_SCHEMA_V1,
    network_id: NETWORK,
    epoch: "1",
    issued_at: "2026-07-22T11:00:00.000Z",
    not_before: "2026-07-22T11:30:00.000Z",
    expires_at: "2026-07-22T13:30:00.000Z",
    allow_node_ids: [NODE_1, NODE_2],
    deny_node_ids: [NODE_3],
    peers: [
      { host: "198.51.100.10", port: 4790, expected_node_id: NODE_1 },
      { host: "peer2.example", port: 4790, expected_node_id: NODE_2 },
    ],
    ...overrides,
  });
}

function signTwice(
  document: VoidP2pSignedTrustPolicyV1,
  first: Readonly<{ private_key_pem: string }>,
  second: Readonly<{ private_key_pem: string }>,
) {
  const one = signVoidP2pTrustPolicyV1({
    policy: document,
    private_key_pem: first.private_key_pem,
  });
  return signVoidP2pTrustPolicyV1({
    policy: document,
    private_key_pem: second.private_key_pem,
    existing_signatures: one.signatures,
  });
}

function expectHold(fn: () => unknown, code: string): void {
  assert.throws(fn, (error: unknown) => {
    assert(error instanceof VoidP2pTrustPolicyHoldV1);
    assert.equal(error.code, code);
    return true;
  });
}

async function expectHoldAsync(fn: () => Promise<unknown>, code: string): Promise<void> {
  await assert.rejects(fn, (error: unknown) => {
    assert(error instanceof VoidP2pTrustPolicyHoldV1);
    assert.equal(error.code, code);
    return true;
  });
}

async function main(): Promise<void> {
  const key1 = keyPair();
  const key2 = keyPair();
  const key3 = keyPair();
  const outsider = keyPair();
  const roots = createVoidP2pTrustRootSetV1({
    network_id: NETWORK,
    threshold: 2,
    public_key_pems: [key1.public_key_pem, key2.public_key_pem, key3.public_key_pem],
  });
  assert.equal(roots.keys.length, 3);
  assert.equal(roots.threshold, 2);

  const firstPolicy = policy();
  const firstEnvelope = signTwice(firstPolicy, key1, key2);
  assert.equal(firstEnvelope.schema, VOID_P2P_SIGNED_TRUST_POLICY_ENVELOPE_SCHEMA_V1);
  assert.equal(firstEnvelope.signatures.length, 2);
  const verified = verifyVoidP2pSignedTrustPolicyV1({
    envelope: firstEnvelope,
    root_set: roots,
    options: { expected_network_id: NETWORK, now_ms: NOW },
  });
  assert.equal(verified.marker, VOID_P2P_SIGNED_TRUST_POLICY_WALL_V1_MARKER);
  assert.equal(verified.threshold, 2);
  assert.equal(verified.signer_key_ids.length, 2);
  assert.equal(verified.derived_edge_environment.VOID_P2P_EDGE_WALL_PERMISSIONLESS, "0");
  assert.equal(
    verified.derived_edge_environment.VOID_P2P_EDGE_WALL_ALLOW_NODE_IDS,
    `${NODE_1},${NODE_2}`,
  );
  assert.deepEqual(
    JSON.parse(verified.derived_edge_environment.VOID_P2P_EDGE_WALL_PEERS_JSON),
    firstPolicy.peers,
  );
  assert.equal(
    canonicalVoidP2pTrustJsonV1({ b: 2, a: 1 }),
    '{"a":1,"b":2}',
  );

  const oneSignature = signVoidP2pTrustPolicyV1({
    policy: firstPolicy,
    private_key_pem: key1.private_key_pem,
  });
  expectHold(
    () =>
      verifyVoidP2pSignedTrustPolicyV1({
        envelope: oneSignature,
        root_set: roots,
        options: { expected_network_id: NETWORK, now_ms: NOW },
      }),
    "threshold_not_met",
  );

  const outsiderEnvelope = signVoidP2pTrustPolicyV1({
    policy: firstPolicy,
    private_key_pem: outsider.private_key_pem,
    existing_signatures: oneSignature.signatures,
  });
  expectHold(
    () =>
      verifyVoidP2pSignedTrustPolicyV1({
        envelope: outsiderEnvelope,
        root_set: roots,
        options: { expected_network_id: NETWORK, now_ms: NOW },
      }),
    "unknown_signer",
  );

  const tamperedSignature = {
    ...firstEnvelope,
    signatures: firstEnvelope.signatures.map((entry, index) =>
      index === 0
        ? {
            ...entry,
            signature_base64: Buffer.concat([
              Buffer.from([Buffer.from(entry.signature_base64, "base64")[0]! ^ 1]),
              Buffer.from(entry.signature_base64, "base64").subarray(1),
            ]).toString("base64"),
          }
        : entry,
    ),
  };
  expectHold(
    () =>
      verifyVoidP2pSignedTrustPolicyV1({
        envelope: tamperedSignature,
        root_set: roots,
        options: { expected_network_id: NETWORK, now_ms: NOW },
      }),
    "invalid_signature",
  );

  expectHold(
    () =>
      verifyVoidP2pSignedTrustPolicyV1({
        envelope: firstEnvelope,
        root_set: roots,
        options: { expected_network_id: "void-othernet", now_ms: NOW },
      }),
    "root_network_mismatch",
  );

  const expired = signTwice(
    policy({
      issued_at: "2026-07-20T10:00:00.000Z",
      not_before: "2026-07-20T10:30:00.000Z",
      expires_at: "2026-07-20T11:00:00.000Z",
    }),
    key1,
    key2,
  );
  expectHold(
    () =>
      verifyVoidP2pSignedTrustPolicyV1({
        envelope: expired,
        root_set: roots,
        options: { expected_network_id: NETWORK, now_ms: NOW, max_clock_skew_ms: 0 },
      }),
    "policy_expired",
  );

  const emptyAllow = signTwice(policy({ allow_node_ids: [], peers: [] }), key1, key2);
  expectHold(
    () =>
      verifyVoidP2pSignedTrustPolicyV1({
        envelope: emptyAllow,
        root_set: roots,
        options: { expected_network_id: NETWORK, now_ms: NOW },
      }),
    "fail_closed_empty_allowlist",
  );

  expectHold(
    () => policy({ allow_node_ids: [NODE_2, NODE_1] }),
    "noncanonical_order",
  );
  expectHold(
    () => policy({ deny_node_ids: [NODE_1, NODE_3] }),
    "ambiguous_policy",
  );
  expectHold(
    () =>
      policy({
        peers: [{ host: "peer3.example", port: 4790, expected_node_id: NODE_3 }],
      }),
    "peer_not_allowlisted",
  );
  expectHold(
    () =>
      policy({
        peers: [{ host: "https://peer.example", port: 4790, expected_node_id: NODE_1 }],
      }),
    "invalid_peer_host",
  );

  const temporary = await mkdtemp(path.join(tmpdir(), "void-p2p-trust-wall-proof-"));
  try {
    const stateDir = path.join(temporary, "state");
    const activated1 = await activateVoidP2pSignedTrustPolicyV1({
      envelope: firstEnvelope,
      root_set: roots,
      options: { expected_network_id: NETWORK, now_ms: NOW },
      state_dir: stateDir,
    });
    assert.equal(activated1.already_active, false);
    assert.equal(activated1.activation.epoch, "1");
    assert.equal((await lstat(path.join(stateDir, "current"))).isSymbolicLink(), true);
    const loaded1 = await loadActiveVoidP2pTrustPolicyV1(stateDir);
    assert(loaded1);
    assert.equal(loaded1.activation.policy_sha256, verified.policy_sha256);
    assert.equal(loaded1.environment.VOID_P2P_EDGE_WALL_PERMISSIONLESS, "0");

    const idempotent = await activateVoidP2pSignedTrustPolicyV1({
      envelope: firstEnvelope,
      root_set: roots,
      options: { expected_network_id: NETWORK, now_ms: NOW },
      state_dir: stateDir,
    });
    assert.equal(idempotent.already_active, true);

    const activationJournal = path.join(stateDir, "activation.ndjson");
    const canonicalActivationLine = (
      await readFile(activationJournal, "utf8")
    ).trim();
    const canonicalActivation = JSON.parse(
      canonicalActivationLine,
    ) as Record<string, unknown>;
    const expectRejectedActivationJournal = async (
      value: Record<string, unknown>,
      expectedCode: string,
    ): Promise<void> => {
      const rejectedBytes = `${canonicalVoidP2pTrustJsonV1(
        value as unknown as Parameters<
          typeof canonicalVoidP2pTrustJsonV1
        >[0],
      )}\n`;
      await writeFile(
        activationJournal,
        rejectedBytes,
        { mode: 0o600 },
      );
      await expectHoldAsync(
        () =>
          activateVoidP2pSignedTrustPolicyV1({
            envelope: firstEnvelope,
            root_set: roots,
            options: { expected_network_id: NETWORK, now_ms: NOW },
            state_dir: stateDir,
          }),
        expectedCode,
      );
      assert.equal(await readFile(activationJournal, "utf8"), rejectedBytes);
    };

    const missingGeneration = { ...canonicalActivation };
    delete missingGeneration.generation;
    await expectRejectedActivationJournal(
      missingGeneration,
      "missing_field",
    );
    await expectRejectedActivationJournal(
      { ...canonicalActivation, unexpected: true },
      "unexpected_field",
    );
    await expectRejectedActivationJournal(
      { ...canonicalActivation, policy_sha256: "0".repeat(63) },
      "invalid_sha256",
    );
    await expectRejectedActivationJournal(
      { ...canonicalActivation, envelope_sha256: "f".repeat(63) },
      "invalid_sha256",
    );
    const signerKeyIds = canonicalActivation.signer_key_ids as string[];
    await expectRejectedActivationJournal(
      {
        ...canonicalActivation,
        signer_key_ids: [signerKeyIds[0], signerKeyIds[0]],
      },
      "noncanonical_order",
    );
    await expectRejectedActivationJournal(
      { ...canonicalActivation, threshold: 0 },
      "invalid_activation",
    );
    await expectRejectedActivationJournal(
      { ...canonicalActivation, activated_at: "not-an-instant" },
      "invalid_time",
    );
    await expectRejectedActivationJournal(
      { ...canonicalActivation, generation: "unbound-generation" },
      "invalid_activation",
    );
    await expectRejectedActivationJournal(
      { ...canonicalActivation, network_id: "other-network" },
      "invalid_activation_journal",
    );
    await expectRejectedActivationJournal(
      { ...canonicalActivation, epoch: "00" },
      "invalid_epoch",
    );
    await writeFile(
      activationJournal,
      `${canonicalActivationLine}\n`,
      { mode: 0o600 },
    );

    const sameEpochDifferent = signTwice(
      policy({ deny_node_ids: [] }),
      key1,
      key2,
    );
    await expectHoldAsync(
      () =>
        activateVoidP2pSignedTrustPolicyV1({
          envelope: sameEpochDifferent,
          root_set: roots,
          options: { expected_network_id: NETWORK, now_ms: NOW },
          state_dir: stateDir,
        }),
      "epoch_reuse",
    );

    const sameEpochDifferentVerified = verifyVoidP2pSignedTrustPolicyV1({
      envelope: sameEpochDifferent,
      root_set: roots,
      options: { expected_network_id: NETWORK, now_ms: NOW },
    });
    const missingCurrentStateDir = path.join(
      temporary,
      "missing-current-state",
    );
    const missingCurrentActivation = await activateVoidP2pSignedTrustPolicyV1({
      envelope: firstEnvelope,
      root_set: roots,
      options: { expected_network_id: NETWORK, now_ms: NOW },
      state_dir: missingCurrentStateDir,
    });
    const missingCurrentJournal = path.join(
      missingCurrentStateDir,
      "activation.ndjson",
    );
    const missingCurrentJournalBefore = await readFile(
      missingCurrentJournal,
      "utf8",
    );
    const retainedGenerationDir = path.join(
      missingCurrentStateDir,
      "generations",
      missingCurrentActivation.activation.generation,
    );
    const rejectedGenerationDir = path.join(
      missingCurrentStateDir,
      "generations",
      `${sameEpochDifferent.policy.epoch.padStart(40, "0")}-${sameEpochDifferentVerified.policy_sha256}`,
    );
    const missingCurrentLink = path.join(missingCurrentStateDir, "current");
    await rm(missingCurrentLink);
    const expectMissingCurrentHoldWithoutMutation = async (
      envelope: unknown,
    ): Promise<void> => {
      await expectHoldAsync(
        () =>
          activateVoidP2pSignedTrustPolicyV1({
            envelope,
            root_set: roots,
            options: { expected_network_id: NETWORK, now_ms: NOW },
            state_dir: missingCurrentStateDir,
          }),
        "missing_current_with_history",
      );
      assert.equal(
        await readFile(missingCurrentJournal, "utf8"),
        missingCurrentJournalBefore,
      );
      assert.equal((await lstat(retainedGenerationDir)).isDirectory(), true);
      await assert.rejects(
        lstat(missingCurrentLink),
        (error: unknown) =>
          (error as NodeJS.ErrnoException)?.code === "ENOENT",
      );
    };
    await expectMissingCurrentHoldWithoutMutation(sameEpochDifferent);
    await assert.rejects(
      lstat(rejectedGenerationDir),
      (error: unknown) =>
        (error as NodeJS.ErrnoException)?.code === "ENOENT",
    );
    await expectMissingCurrentHoldWithoutMutation(firstEnvelope);

    const retainedOnlyStateDir = path.join(
      temporary,
      "missing-current-retained-generation-state",
    );
    const retainedOnlyActivation = await activateVoidP2pSignedTrustPolicyV1({
      envelope: firstEnvelope,
      root_set: roots,
      options: { expected_network_id: NETWORK, now_ms: NOW },
      state_dir: retainedOnlyStateDir,
    });
    const retainedOnlyJournal = path.join(
      retainedOnlyStateDir,
      "activation.ndjson",
    );
    const retainedOnlyCurrent = path.join(retainedOnlyStateDir, "current");
    const retainedOnlyGeneration = path.join(
      retainedOnlyStateDir,
      "generations",
      retainedOnlyActivation.activation.generation,
    );
    const retainedOnlyRejectedGeneration = path.join(
      retainedOnlyStateDir,
      "generations",
      `${sameEpochDifferent.policy.epoch.padStart(40, "0")}-${sameEpochDifferentVerified.policy_sha256}`,
    );
    await rm(retainedOnlyCurrent);
    await rm(retainedOnlyJournal);
    await expectHoldAsync(
      () =>
        activateVoidP2pSignedTrustPolicyV1({
          envelope: sameEpochDifferent,
          root_set: roots,
          options: { expected_network_id: NETWORK, now_ms: NOW },
          state_dir: retainedOnlyStateDir,
        }),
      "missing_current_with_history",
    );
    assert.equal((await lstat(retainedOnlyGeneration)).isDirectory(), true);
    await assert.rejects(
      lstat(retainedOnlyCurrent),
      (error: unknown) =>
        (error as NodeJS.ErrnoException)?.code === "ENOENT",
    );
    await assert.rejects(
      lstat(retainedOnlyJournal),
      (error: unknown) =>
        (error as NodeJS.ErrnoException)?.code === "ENOENT",
    );
    await assert.rejects(
      lstat(retainedOnlyRejectedGeneration),
      (error: unknown) =>
        (error as NodeJS.ErrnoException)?.code === "ENOENT",
    );

    const epoch2MissingLink = signTwice(policy({ epoch: "2" }), key1, key2);
    await expectHoldAsync(
      () =>
        activateVoidP2pSignedTrustPolicyV1({
          envelope: epoch2MissingLink,
          root_set: roots,
          options: { expected_network_id: NETWORK, now_ms: NOW },
          state_dir: stateDir,
        }),
      "broken_policy_chain",
    );

    const secondPolicy = policy({
      epoch: "2",
      previous_policy_sha256: verified.policy_sha256,
      allow_node_ids: [NODE_1],
      deny_node_ids: [NODE_2, NODE_3],
      peers: [{ host: "198.51.100.10", port: 4790, expected_node_id: NODE_1 }],
    });
    const secondEnvelope = signTwice(secondPolicy, key2, key3);
    const activateThroughEpoch2 = async (name: string): Promise<string> => {
      const fixtureStateDir = path.join(temporary, name);
      await activateVoidP2pSignedTrustPolicyV1({
        envelope: firstEnvelope,
        root_set: roots,
        options: { expected_network_id: NETWORK, now_ms: NOW },
        state_dir: fixtureStateDir,
      });
      await activateVoidP2pSignedTrustPolicyV1({
        envelope: secondEnvelope,
        root_set: roots,
        options: { expected_network_id: NETWORK, now_ms: NOW },
        state_dir: fixtureStateDir,
      });
      return fixtureStateDir;
    };
    const expectJournalHoldWithoutMutation = async (
      fixtureStateDir: string,
      envelope: unknown,
    ): Promise<void> => {
      const fixtureJournal = path.join(
        fixtureStateDir,
        "activation.ndjson",
      );
      const before = await readFile(fixtureJournal, "utf8");
      await expectHoldAsync(
        () =>
          activateVoidP2pSignedTrustPolicyV1({
            envelope,
            root_set: roots,
            options: { expected_network_id: NETWORK, now_ms: NOW },
            state_dir: fixtureStateDir,
          }),
        "invalid_activation_journal",
      );
      assert.equal(await readFile(fixtureJournal, "utf8"), before);
    };

    const recoveryStateDir = path.join(temporary, "recovery-state");
    await activateVoidP2pSignedTrustPolicyV1({
      envelope: firstEnvelope,
      root_set: roots,
      options: { expected_network_id: NETWORK, now_ms: NOW },
      state_dir: recoveryStateDir,
    });
    const recoveryJournal = path.join(
      recoveryStateDir,
      "activation.ndjson",
    );
    const recoveryJournalBeforeSecondActivation = await readFile(
      recoveryJournal,
      "utf8",
    );
    if (process.getuid?.() === 0) {
      await activateVoidP2pSignedTrustPolicyV1({
        envelope: secondEnvelope,
        root_set: roots,
        options: { expected_network_id: NETWORK, now_ms: NOW },
        state_dir: recoveryStateDir,
      });
      await writeFile(
        recoveryJournal,
        recoveryJournalBeforeSecondActivation,
        { mode: 0o600 },
      );
    } else {
      await chmod(recoveryJournal, 0o400);
      await assert.rejects(
        activateVoidP2pSignedTrustPolicyV1({
          envelope: secondEnvelope,
          root_set: roots,
          options: { expected_network_id: NETWORK, now_ms: NOW },
          state_dir: recoveryStateDir,
        }),
        (error: unknown) =>
          (error as NodeJS.ErrnoException)?.code === "EACCES",
      );
    }
    const partiallyActivated =
      await loadActiveVoidP2pTrustPolicyV1(recoveryStateDir);
    assert(partiallyActivated);
    assert.equal(partiallyActivated.activation.epoch, "2");
    assert.equal(
      (await readFile(recoveryJournal, "utf8")).trim().split("\n")
        .length,
      1,
    );
    if (process.getuid?.() !== 0) await chmod(recoveryJournal, 0o600);
    const recoveryJournalPrefix = await readFile(recoveryJournal, "utf8");
    const expectedRecoveryLine = canonicalVoidP2pTrustJsonV1(
      partiallyActivated.activation as unknown as Parameters<
        typeof canonicalVoidP2pTrustJsonV1
      >[0],
    );
    await writeFile(
      recoveryJournal,
      `${recoveryJournalPrefix}!arbitrary-torn-tail`,
      { mode: 0o600 },
    );
    await expectHoldAsync(
      () =>
        activateVoidP2pSignedTrustPolicyV1({
          envelope: secondEnvelope,
          root_set: roots,
          options: { expected_network_id: NETWORK, now_ms: NOW },
          state_dir: recoveryStateDir,
        }),
      "invalid_activation_journal",
    );
    assert.equal(
      await readFile(recoveryJournal, "utf8"),
      `${recoveryJournalPrefix}!arbitrary-torn-tail`,
    );
    const expectedRecoveryPrefix = expectedRecoveryLine.slice(
      0,
      Math.floor(expectedRecoveryLine.length / 2),
    );
    await writeFile(
      recoveryJournal,
      `${recoveryJournalPrefix}${expectedRecoveryPrefix}`,
      { mode: 0o600 },
    );
    const recoveredActivation =
      await activateVoidP2pSignedTrustPolicyV1({
        envelope: secondEnvelope,
        root_set: roots,
        options: { expected_network_id: NETWORK, now_ms: NOW },
        state_dir: recoveryStateDir,
      });
    assert.equal(recoveredActivation.already_active, true);
    const recoveredJournalLines = (
      await readFile(recoveryJournal, "utf8")
    ).trim().split("\n");
    assert.equal(recoveredJournalLines.length, 2);
    assert.equal(
      recoveredJournalLines.at(-1),
      expectedRecoveryLine,
    );

    const missingEpoch1JournalStateDir = path.join(
      temporary,
      "missing-epoch1-journal-state",
    );
    const missingEpoch1Activation = await activateVoidP2pSignedTrustPolicyV1({
      envelope: firstEnvelope,
      root_set: roots,
      options: { expected_network_id: NETWORK, now_ms: NOW },
      state_dir: missingEpoch1JournalStateDir,
    });
    assert.equal(missingEpoch1Activation.activation.epoch, "1");
    const missingEpoch1Journal = path.join(
      missingEpoch1JournalStateDir,
      "activation.ndjson",
    );
    await rm(missingEpoch1Journal);
    const recoveredMissingEpoch1 =
      await activateVoidP2pSignedTrustPolicyV1({
        envelope: firstEnvelope,
        root_set: roots,
        options: { expected_network_id: NETWORK, now_ms: NOW },
        state_dir: missingEpoch1JournalStateDir,
      });
    assert.equal(recoveredMissingEpoch1.already_active, true);
    assert.equal(
      (await readFile(missingEpoch1Journal, "utf8")).trim().split("\n")
        .length,
      1,
    );

    const lostHistoryStateDir = path.join(
      temporary,
      "lost-history-state",
    );
    await activateVoidP2pSignedTrustPolicyV1({
      envelope: firstEnvelope,
      root_set: roots,
      options: { expected_network_id: NETWORK, now_ms: NOW },
      state_dir: lostHistoryStateDir,
    });
    const lostHistoryActivation =
      await activateVoidP2pSignedTrustPolicyV1({
        envelope: secondEnvelope,
        root_set: roots,
        options: { expected_network_id: NETWORK, now_ms: NOW },
        state_dir: lostHistoryStateDir,
      });
    assert.equal(lostHistoryActivation.activation.epoch, "2");
    const lostHistoryJournal = path.join(
      lostHistoryStateDir,
      "activation.ndjson",
    );
    assert.equal(
      (await readFile(lostHistoryJournal, "utf8")).trim().split("\n")
        .length,
      2,
    );
    await rm(lostHistoryJournal);
    await expectHoldAsync(
      () =>
        activateVoidP2pSignedTrustPolicyV1({
          envelope: secondEnvelope,
          root_set: roots,
          options: { expected_network_id: NETWORK, now_ms: NOW },
          state_dir: lostHistoryStateDir,
        }),
      "invalid_activation_journal",
    );
    await assert.rejects(
      readFile(lostHistoryJournal, "utf8"),
      (error: unknown) =>
        (error as NodeJS.ErrnoException)?.code === "ENOENT",
    );

    const activated2 = await activateVoidP2pSignedTrustPolicyV1({
      envelope: secondEnvelope,
      root_set: roots,
      options: { expected_network_id: NETWORK, now_ms: NOW },
      state_dir: stateDir,
    });
    assert.equal(activated2.activation.epoch, "2");
    assert.equal(activated2.already_active, false);
    const loaded2 = await loadActiveVoidP2pTrustPolicyV1(stateDir);
    assert(loaded2);
    assert.equal(loaded2.activation.epoch, "2");
    assert.equal(loaded2.environment.VOID_P2P_EDGE_WALL_ALLOW_NODE_IDS, NODE_1);
    assert.equal(loaded2.environment.VOID_P2P_EDGE_WALL_DENY_NODE_IDS, `${NODE_2},${NODE_3}`);
    assert.equal((await readFile(path.join(stateDir, "activation.ndjson"), "utf8")).trim().split("\n").length, 2);

    const fakePriorStateDir = await activateThroughEpoch2(
      "fake-prior-record-state",
    );
    const fakePriorJournal = path.join(
      fakePriorStateDir,
      "activation.ndjson",
    );
    const fakePriorLines = (await readFile(fakePriorJournal, "utf8"))
      .trim()
      .split("\n");
    const fakePrior = JSON.parse(fakePriorLines[0]!) as Record<
      string,
      unknown
    >;
    const fakePolicySha256 = "a".repeat(64);
    fakePrior.policy_sha256 = fakePolicySha256;
    fakePrior.envelope_sha256 = "b".repeat(64);
    fakePrior.generation = `${"1".padStart(40, "0")}-${fakePolicySha256}`;
    await writeFile(
      fakePriorJournal,
      `${canonicalVoidP2pTrustJsonV1(
        fakePrior as unknown as Parameters<
          typeof canonicalVoidP2pTrustJsonV1
        >[0]
      )}\n${fakePriorLines[1]}\n`,
      { mode: 0o600 },
    );
    await expectJournalHoldWithoutMutation(fakePriorStateDir, secondEnvelope);

    const missingGenerationStateDir = await activateThroughEpoch2(
      "missing-generation-state",
    );
    const missingGenerationJournal = path.join(
      missingGenerationStateDir,
      "activation.ndjson",
    );
    const missingGenerationLines = (
      await readFile(missingGenerationJournal, "utf8")
    ).trim().split("\n");
    const missingGenerationRecord = JSON.parse(
      missingGenerationLines[0]!,
    ) as Record<string, unknown>;
    await rm(
      path.join(
        missingGenerationStateDir,
        "generations",
        String(missingGenerationRecord.generation),
      ),
      { recursive: true },
    );
    await expectJournalHoldWithoutMutation(
      missingGenerationStateDir,
      secondEnvelope,
    );

    const wrongGenerationStateDir = await activateThroughEpoch2(
      "wrong-generation-state",
    );
    const wrongGenerationJournal = path.join(
      wrongGenerationStateDir,
      "activation.ndjson",
    );
    const wrongGenerationLines = (
      await readFile(wrongGenerationJournal, "utf8")
    ).trim().split("\n");
    const wrongGenerationRecord = JSON.parse(
      wrongGenerationLines[0]!,
    ) as Record<string, unknown>;
    wrongGenerationRecord.activated_at = "2026-07-22T12:00:00.001Z";
    await writeFile(
      wrongGenerationJournal,
      `${canonicalVoidP2pTrustJsonV1(
        wrongGenerationRecord as unknown as Parameters<
          typeof canonicalVoidP2pTrustJsonV1
        >[0]
      )}\n${wrongGenerationLines[1]}\n`,
      { mode: 0o600 },
    );
    await expectJournalHoldWithoutMutation(
      wrongGenerationStateDir,
      secondEnvelope,
    );

    const symlinkGenerationStateDir = await activateThroughEpoch2(
      "symlink-generation-state",
    );
    const symlinkGenerationJournal = path.join(
      symlinkGenerationStateDir,
      "activation.ndjson",
    );
    const symlinkGenerationLines = (
      await readFile(symlinkGenerationJournal, "utf8")
    ).trim().split("\n");
    const symlinkPrior = JSON.parse(symlinkGenerationLines[0]!) as Record<
      string,
      unknown
    >;
    const symlinkCurrent = JSON.parse(symlinkGenerationLines[1]!) as Record<
      string,
      unknown
    >;
    const symlinkPriorDir = path.join(
      symlinkGenerationStateDir,
      "generations",
      String(symlinkPrior.generation),
    );
    await rm(symlinkPriorDir, { recursive: true });
    await symlink(String(symlinkCurrent.generation), symlinkPriorDir);
    await expectJournalHoldWithoutMutation(
      symlinkGenerationStateDir,
      secondEnvelope,
    );

    const thirdPolicy = policy({
      epoch: "3",
      previous_policy_sha256: activated2.activation.policy_sha256,
      allow_node_ids: [NODE_1],
      deny_node_ids: [NODE_2, NODE_3],
      peers: [
        {
          host: "198.51.100.10",
          port: 4790,
          expected_node_id: NODE_1,
        },
      ],
    });
    const thirdEnvelope = signTwice(thirdPolicy, key1, key3);
    const brokenPredecessorStateDir = await activateThroughEpoch2(
      "broken-predecessor-state",
    );
    await activateVoidP2pSignedTrustPolicyV1({
      envelope: thirdEnvelope,
      root_set: roots,
      options: { expected_network_id: NETWORK, now_ms: NOW },
      state_dir: brokenPredecessorStateDir,
    });
    const brokenPredecessorJournal = path.join(
      brokenPredecessorStateDir,
      "activation.ndjson",
    );
    const brokenPredecessorLines = (
      await readFile(brokenPredecessorJournal, "utf8")
    ).trim().split("\n");
    await writeFile(
      brokenPredecessorJournal,
      `${brokenPredecessorLines[0]}\n${brokenPredecessorLines[2]}\n`,
      { mode: 0o600 },
    );
    await expectJournalHoldWithoutMutation(
      brokenPredecessorStateDir,
      thirdEnvelope,
    );

    await expectHoldAsync(
      () =>
        activateVoidP2pSignedTrustPolicyV1({
          envelope: firstEnvelope,
          root_set: roots,
          options: { expected_network_id: NETWORK, now_ms: NOW },
          state_dir: stateDir,
        }),
      "policy_rollback",
    );

    await writeFile(path.join(stateDir, "activation.lock"), "held\n", { mode: 0o600 });
    await expectHoldAsync(
      () =>
        activateVoidP2pSignedTrustPolicyV1({
          envelope: thirdEnvelope,
          root_set: roots,
          options: { expected_network_id: NETWORK, now_ms: NOW },
          state_dir: stateDir,
        }),
      "activation_locked",
    );
    await rm(path.join(stateDir, "activation.lock"));

    const unsafeState = path.join(temporary, "unsafe-state");
    await writeFile(path.join(temporary, "outside.json"), "{}\n");
    await rm(unsafeState, { recursive: true, force: true });
    await import("node:fs/promises").then(({ mkdir }) => mkdir(unsafeState, { recursive: true }));
    await symlink("../outside", path.join(unsafeState, "current"));
    await expectHoldAsync(
      () => loadActiveVoidP2pTrustPolicyV1(unsafeState),
      "unsafe_current_pointer",
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }

  console.log("VOID_P2P_SIGNED_TRUST_POLICY_WALL_V1_GREEN");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
