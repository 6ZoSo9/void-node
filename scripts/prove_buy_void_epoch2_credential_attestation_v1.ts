#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { Wallet } from "ethers";
import {
  VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_WORKTREE_PATHS_V1,
  assessBuyVoidEpoch2CredentialAttestationWorktreeV1,
} from "./void_buy_void_epoch2_credential_attestation_v1.js";
import {
  VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1,
} from "../src/economic/buy_void_epoch2_fulfillment_access_list_v1.js";
import {
  VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_AUTHORITY_V1,
  VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_CONFIRMATION_V1,
  VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_PROBE_NONCE_V1,
  VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_PROBE_GAS_LIMIT_V1,
  VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_MIN_EVM_INTRINSIC_GAS_V1,
  buildBuyVoidEpoch2CredentialCapabilityProbeV1,
  buyVoidEpoch2CredentialProbeSemanticsExactV1,
  buyVoidEpoch2CredentialProbeIntrinsicallyNonExecutableV1,
  buildBuyVoidEpoch2CredentialAttestationEvidenceV1,
  buyVoidEpoch2SystemdCredentialObservationStableV1,
  observeBuyVoidEpoch2SystemdCredentialBindingV1,
  verifyBuyVoidEpoch2CredentialSignedProbeV1,
} from "../src/economic/buy_void_epoch2_credential_attestation_v1.js";

const HEAD = "a".repeat(40);
const TREE = "d".repeat(40);
const CHALLENGE = "b".repeat(64);
const CLEAN_BLOB = "1".repeat(40);
const cleanWorktreeEntries = () =>
  VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_WORKTREE_PATHS_V1.map(
    (worktreePath) => ({
      path: worktreePath,
      index_tag: "H",
      head_blob: CLEAN_BLOB,
      worktree_blob: CLEAN_BLOB,
    }),
  );
const assessWorktree = (overrides: {
  tracked_status?: string;
  sparse_checkout?: boolean;
  entries?: ReturnType<typeof cleanWorktreeEntries>;
} = {}) => assessBuyVoidEpoch2CredentialAttestationWorktreeV1({
  tracked_status: overrides.tracked_status ?? "",
  sparse_checkout: overrides.sparse_checkout ?? false,
  entries: overrides.entries ?? cleanWorktreeEntries(),
});
assert.deepEqual(assessWorktree(), { ok: true });
assert.deepEqual(
  assessWorktree({ tracked_status: " M src/economic/example.ts" }),
  { ok: false, reason: "epoch2_attestation_tracked_worktree_dirty" },
);
assert.deepEqual(
  assessWorktree({ sparse_checkout: true }),
  { ok: false, reason: "epoch2_attestation_sparse_checkout_forbidden" },
);
for (const unsafeTag of ["h", "S"]) {
  const entries = cleanWorktreeEntries();
  entries[0] = { ...entries[0], index_tag: unsafeTag };
  assert.deepEqual(
    assessWorktree({ entries }),
    { ok: false, reason: "epoch2_attestation_worktree_index_flag_unsafe" },
  );
}
{
  const entries = cleanWorktreeEntries();
  entries[1] = { ...entries[1], worktree_blob: "2".repeat(40) };
  assert.deepEqual(
    assessWorktree({ entries }),
    { ok: false, reason: "epoch2_attestation_worktree_blob_mismatch" },
  );
}
{
  const entries = cleanWorktreeEntries().slice(1);
  assert.deepEqual(
    assessWorktree({ entries }),
    { ok: false, reason: "epoch2_attestation_worktree_entry_cardinality_invalid" },
  );
}
{
  const entries = cleanWorktreeEntries();
  entries[1] = { ...entries[1], path: entries[0].path };
  assert.deepEqual(
    assessWorktree({ entries }),
    { ok: false, reason: "epoch2_attestation_worktree_entry_duplicate_or_invalid" },
  );
}

const probe = buildBuyVoidEpoch2CredentialCapabilityProbeV1({
  source_head: HEAD,
  challenge_hex: CHALLENGE,
});
assert.equal(probe.type, 2);
assert.equal(probe.chainId, 2050n);
assert.equal(
  probe.nonce,
  VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_PROBE_NONCE_V1,
);
assert.equal(probe.nonce, Number.MAX_SAFE_INTEGER);
assert.equal(
  probe.gasLimit,
  VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_PROBE_GAS_LIMIT_V1,
);
assert.equal(probe.gasLimit, 1n);
assert.equal(
  VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_MIN_EVM_INTRINSIC_GAS_V1,
  21_000n,
);
assert.equal(
  buyVoidEpoch2CredentialProbeIntrinsicallyNonExecutableV1(probe),
  true,
);
assert.equal(probe.maxFeePerGas, 0n);
assert.equal(probe.maxPriorityFeePerGas, 0n);
assert.equal(probe.value, 0n);
assert.equal(probe.accessList.length, 1);
assert.equal(buyVoidEpoch2CredentialProbeSemanticsExactV1(probe), true);

const unsafeNonceProbe = { ...probe, nonce: 0 };
assert.equal(
  buyVoidEpoch2CredentialProbeSemanticsExactV1(unsafeNonceProbe),
  false,
);
const unsafeFeeProbe = { ...probe, maxFeePerGas: 1n };
assert.equal(
  buyVoidEpoch2CredentialProbeSemanticsExactV1(unsafeFeeProbe),
  false,
);
const unsafeGasProbe = { ...probe, gasLimit: 21_000n };
assert.equal(
  buyVoidEpoch2CredentialProbeSemanticsExactV1(unsafeGasProbe),
  false,
);
assert.equal(
  buyVoidEpoch2CredentialProbeIntrinsicallyNonExecutableV1(unsafeGasProbe),
  false,
);
const unsafeAmountProbe = {
  ...probe,
  data: probe.data.slice(0, -64) + (2n).toString(16).padStart(64, "0"),
};
assert.equal(
  buyVoidEpoch2CredentialProbeSemanticsExactV1(unsafeAmountProbe),
  false,
);

const dummy = new Wallet("0x" + "11".repeat(32));
const raw = await dummy.signTransaction({ ...probe });
const verified = verifyBuyVoidEpoch2CredentialSignedProbeV1({
  raw_signed_transaction: raw,
  expected_signer: dummy.address,
  probe,
});
assert.equal(verified.ok, true);
if (!verified.ok) throw new Error(verified.reason);
assert.equal(verified.signer, dummy.address.toLowerCase());
assert.match(verified.transaction_hash, /^0x[0-9a-f]{64}$/u);
assert.match(verified.raw_signed_transaction_sha256, /^[0-9a-f]{64}$/u);

const unsafeGasRaw = await dummy.signTransaction({ ...unsafeGasProbe });
assert.deepEqual(
  verifyBuyVoidEpoch2CredentialSignedProbeV1({
    raw_signed_transaction: unsafeGasRaw,
    expected_signer: dummy.address,
    probe: unsafeGasProbe,
  }),
  { ok: false, reason: "epoch2_probe_expected_envelope_invalid" },
);

const unsafeNonceRaw = await dummy.signTransaction({ ...unsafeNonceProbe });
assert.deepEqual(
  verifyBuyVoidEpoch2CredentialSignedProbeV1({
    raw_signed_transaction: unsafeNonceRaw,
    expected_signer: dummy.address,
    probe: unsafeNonceProbe,
  }),
  { ok: false, reason: "epoch2_probe_expected_envelope_invalid" },
);

const wrongSigner = verifyBuyVoidEpoch2CredentialSignedProbeV1({
  raw_signed_transaction: raw,
  expected_signer: VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1,
  probe,
});
assert.deepEqual(wrongSigner, {
  ok: false,
  reason: "epoch2_probe_signer_mismatch",
});

const wrongAccessRaw = await dummy.signTransaction({
  ...probe,
  accessList: [],
});
const wrongAccess = verifyBuyVoidEpoch2CredentialSignedProbeV1({
  raw_signed_transaction: wrongAccessRaw,
  expected_signer: dummy.address,
  probe,
});
assert.deepEqual(wrongAccess, {
  ok: false,
  reason: "epoch2_probe_signed_envelope_mismatch",
});

const systemdShow = [
  "ActiveState=active",
  "SubState=running",
  "MainPID=4242",
  "InvocationID=" + "c".repeat(32),
  "LoadCredential=other-public-test:/private/other " +
    "buy-void-epoch2-fulfiller-v1:/private/epoch2.key",
].join("\n") + "\n";
const environ = Buffer.from([
  "PATH=/usr/bin",
  "CREDENTIALS_DIRECTORY=/run/user/1000/credentials/void-node-live.service",
  "VOID_PROCESS_SOURCE_COMMIT=" + HEAD,
  "VOID_PROCESS_SOURCE_TREE=" + TREE,
  "VOID_PROCESS_SOURCE_BRANCH=main",
  "HOME=/home/zoso",
  "",
].join("\0"), "utf8");
const observed = observeBuyVoidEpoch2SystemdCredentialBindingV1({
  systemctl_show: systemdShow,
  process_environ: environ,
});
assert.equal(observed.service, "void-node-live.service");
assert.equal(observed.main_pid, 4242);
assert.equal(observed.invocation_id, "c".repeat(32));
assert.equal(observed.credential_id, "buy-void-epoch2-fulfiller-v1");
assert.match(observed.loadcredential_binding_sha256, /^[0-9a-f]{64}$/u);
assert.match(observed.credentials_directory_sha256, /^[0-9a-f]{64}$/u);
assert.equal(observed.process_source_commit, HEAD);
assert.equal(observed.process_source_tree, TREE);
assert.equal(observed.process_source_branch, "main");
assert.equal(
  buyVoidEpoch2SystemdCredentialObservationStableV1(observed, observed),
  true,
);
assert.equal(
  buyVoidEpoch2SystemdCredentialObservationStableV1(
    observed,
    { ...observed, invocation_id: "e".repeat(32) },
  ),
  false,
);
assert.equal(
  buyVoidEpoch2SystemdCredentialObservationStableV1(
    observed,
    { ...observed, main_pid: observed.main_pid + 1 },
  ),
  false,
);

assert.throws(
  () => observeBuyVoidEpoch2SystemdCredentialBindingV1({
    systemctl_show: systemdShow.replace(
      "LoadCredential=",
      "LoadCredential=buy-void-epoch2-fulfiller-v1:/private/duplicate ",
    ),
    process_environ: environ,
  }),
  /epoch2_loadcredential_binding_cardinality_invalid/u,
);
assert.throws(
  () => observeBuyVoidEpoch2SystemdCredentialBindingV1({
    systemctl_show: systemdShow.replace("ActiveState=active", "ActiveState=inactive"),
    process_environ: environ,
  }),
  /epoch2_service_not_active_running/u,
);
assert.throws(
  () => observeBuyVoidEpoch2SystemdCredentialBindingV1({
    systemctl_show: systemdShow,
    process_environ: Buffer.from(
      "CREDENTIALS_DIRECTORY=/tmp/not-systemd\0",
      "utf8",
    ),
  }),
  /epoch2_credentials_directory_not_systemd_managed/u,
);
assert.throws(
  () => observeBuyVoidEpoch2SystemdCredentialBindingV1({
    systemctl_show: systemdShow,
    process_environ: Buffer.from(
      "CREDENTIALS_DIRECTORY=/run/user/1000/credentials/void-node-live.service\0" +
      "CREDENTIALS_DIRECTORY=/run/user/1000/credentials/void-node-live.service\0",
      "utf8",
    ),
  }),
  /epoch2_credentials_directory_env_cardinality_invalid/u,
);
assert.throws(
  () => observeBuyVoidEpoch2SystemdCredentialBindingV1({
    systemctl_show: systemdShow,
    process_environ: Buffer.from([
      "CREDENTIALS_DIRECTORY=/run/user/1000/credentials/void-node-live.service",
      "VOID_PROCESS_SOURCE_TREE=" + TREE,
      "VOID_PROCESS_SOURCE_BRANCH=main",
      "",
    ].join("\0"), "utf8"),
  }),
  /epoch2_process_source_commit_env_cardinality_invalid/u,
);
assert.throws(
  () => observeBuyVoidEpoch2SystemdCredentialBindingV1({
    systemctl_show: systemdShow,
    process_environ: Buffer.from([
      "CREDENTIALS_DIRECTORY=/run/user/1000/credentials/void-node-live.service",
      "VOID_PROCESS_SOURCE_COMMIT=" + HEAD,
      "VOID_PROCESS_SOURCE_TREE=" + TREE,
      "VOID_PROCESS_SOURCE_BRANCH=other",
      "",
    ].join("\0"), "utf8"),
  }),
  /epoch2_process_source_branch_invalid/u,
);

// No dummy or caller-selected signer can ever produce a GREEN production
// evidence record, even though the generic signed-envelope parser is tested.
assert.throws(
  () => buildBuyVoidEpoch2CredentialAttestationEvidenceV1({
    source_head: HEAD,
    source_tree: TREE,
    source_branch: "main",
    source_qualifier_blob: "1".repeat(40),
    signer_source_blob: "2".repeat(40),
    full_runtime_source_blob: "3".repeat(40),
    attestation_source_blob: "4".repeat(40),
    expected_signer: dummy.address,
    probe,
    raw_signed_transaction: raw,
    systemd_observation: observed,
  }),
  /epoch2_attestation_signer_invalid/u,
);

assert.equal(
  VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_CONFIRMATION_V1,
  "probeBuyVoidEpoch2InstalledCredentialSigningCapabilityV1",
);
for (const key of [
  "rpc_call",
  "transaction_broadcast",
  "transaction_submission",
  "filesystem_write",
  "dependency_assignment",
  "runtime_enablement",
  "service_restart",
  "public_payment_acceptance",
  "presale_activation",
  "wc_void_market_activation",
  "funds_movement",
] as const) {
  assert.equal(VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_AUTHORITY_V1[key], false);
}

const root = process.cwd();
const cli = fs.readFileSync(
  path.join(root, "scripts/void_buy_void_epoch2_credential_attestation_v1.ts"),
  "utf8",
);
const dropin = fs.readFileSync(
  path.join(
    root,
    "ops/systemd/void-node-live.service.d/" +
      "97-buy-void-epoch2-fulfiller-credential-v1.conf.example",
  ),
  "utf8",
);
for (const required of [
  "systemctl",
  "\"--user\"",
  "void-node-live.service",
  "/proc/",
  "createBuyVoidEpoch2FulfillerCredentialSignerV1",
  "VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1",
  "VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_ID_V1",
  "VOID_PROCESS_SOURCE_COMMIT",
  "VOID_PROCESS_SOURCE_TREE",
  "VOID_PROCESS_SOURCE_BRANCH",
  "buyVoidEpoch2SystemdCredentialObservationStableV1",
  "assessBuyVoidEpoch2CredentialAttestationWorktreeV1",
  "sanitizedGitEnvironment",
  "GIT_CONFIG_NOSYSTEM",
  "core.fsmonitor=false",
  "status\", \"--porcelain=v1\", \"--untracked-files=no",
  "ls-files\", \"-v",
  "worktreeGitBlob(relative)",
  "const source = assertSourceGeneration();",
  "import(\"../src/economic/buy_void_native_fulfillment_wallet_credential_signer_v1.js\")",
  "raw = \"\"",
]) {
  assert.equal(cli.includes(required), true, "CLI missing " + required);
}
for (const forbidden of [
  "--credentials-directory",
  "buy-void-native-fulfillment-wallet-v1",
  "eth_sendRawTransaction",
  "sendTransaction(",
  "broadcast_signed_transaction",
  "writeFileSync(",
  "appendFileSync(",
  "import {\n  VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1",
]) {
  assert.equal(cli.includes(forbidden), false, "CLI contains " + forbidden);
}
assert.equal(
  (dropin.match(/LoadCredential=/gu) || []).length,
  1,
);
assert.match(
  dropin,
  /LoadCredential=buy-void-epoch2-fulfiller-v1:\/ABSOLUTE\/OPERATOR\/PRIVATE\/PATH\/buy-void-epoch2-fulfiller-v1[.]key/u,
);
assert.equal(dropin.includes("buy-void-native-fulfillment-wallet-v1"), false);
assert.equal(dropin.includes("ENABLED=1"), false);

console.log("VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_V1_PROOF_GREEN");
console.log("distinct_epoch2_systemd_credential_required=true");
console.log("live_user_service_binding_parser_proven=true");
console.log("systemd_managed_credentials_directory_required=true");
console.log("live_process_source_commit_tree_branch_bound=true");
console.log("systemd_invocation_stable_across_signing_required=true");
console.log("worktree_authority_bytes_bound=true");
console.log("dirty_or_sparse_worktree_held=true");
console.log("assume_unchanged_or_skip_worktree_held=true");
console.log("worktree_blob_substitution_held=true");
console.log("git_environment_sanitized=true");
console.log("authority_modules_imported_after_source_preflight=true");
console.log("canonical_probe_semantics_bound=true");
console.log("probe_intrinsically_non_executable=true");
console.log("probe_gas_limit=1");
console.log("minimum_evm_intrinsic_gas=21000");
console.log("caller_selected_executable_probe_rejected=true");
console.log("probe_nonce_number_max_safe_integer=true");
console.log("probe_zero_fee=true");
console.log("probe_amount_atoms=1");
console.log("synthetic_signature_parser_positive=true");
console.log("dummy_signer_production_evidence_rejected=true");
console.log("raw_private_key_output=false");
console.log("raw_signed_transaction_output=false");
console.log("rpc_call=false");
console.log("transaction_broadcast=false");
console.log("runtime_activation=false");
console.log("presale_activation=false");
console.log("funds_movement=false");
