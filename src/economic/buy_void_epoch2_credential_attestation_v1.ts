import crypto from "node:crypto";
import path from "node:path";
import { Interface, Transaction, getAddress } from "ethers";
import type {
  BuyVoidDeliveryUnsignedTransactionV1,
} from "./buy_void_delivery_sign_broadcast_adapter_v1.js";
import {
  VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1,
  VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1,
  buyVoidPresaleAccessListExactV1,
  buyVoidPresaleRequiredAccessListV1,
} from "./buy_void_epoch2_fulfillment_access_list_v1.js";
import {
  VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_ID_V1,
} from "./buy_void_epoch2_credential_source_binding_v1.js";

export const VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_V1 =
  "VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_V1";
export const VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_CONFIRMATION_V1 =
  "probeBuyVoidEpoch2InstalledCredentialSigningCapabilityV1";
export const VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_PROBE_NONCE_V1 =
  Number.MAX_SAFE_INTEGER;
export const VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_PROBE_GAS_LIMIT_V1 =
  231_582n;

export const VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_AUTHORITY_V1 =
  Object.freeze({
    credential_content_read: true,
    local_signing_probe: true,
    raw_private_key_output: false,
    raw_signed_transaction_output: false,
    rpc_call: false,
    transaction_broadcast: false,
    transaction_submission: false,
    filesystem_write: false,
    dependency_assignment: false,
    runtime_enablement: false,
    service_restart: false,
    public_payment_acceptance: false,
    presale_activation: false,
    wc_void_market_activation: false,
    funds_movement: false,
  } as const);

const FULFILL = new Interface([
  "function fulfill(bytes32 paymentDeliveryId,address recipient,uint256 amountAtoms)",
]);
const HEX64 = /^[0-9a-f]{64}$/u;
const SHA40 = /^[0-9a-f]{40}$/u;

const HEX32 = /^[0-9a-f]{32}$/u;
export const VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_SERVICE_V1 =
  "void-node-live.service";
export const VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_CREDENTIAL_ID_V1 =
  "buy-void-epoch2-fulfiller-v1";

export type BuyVoidEpoch2SystemdCredentialObservationV1 = {
  service: typeof VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_SERVICE_V1;
  main_pid: number;
  invocation_id: string;
  credential_id:
    typeof VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_CREDENTIAL_ID_V1;
  credentials_directory: string;
  loadcredential_binding_sha256: string;
  credentials_directory_sha256: string;
  process_source_commit: string;
  process_source_tree: string;
  process_source_branch: "main";
};

export function observeBuyVoidEpoch2SystemdCredentialBindingV1(input: {
  systemctl_show: string;
  process_environ: Buffer;
}): BuyVoidEpoch2SystemdCredentialObservationV1 {
  const show = String(input?.systemctl_show || "");
  if (show.length < 1 || show.length > 65_536) {
    throw new Error("epoch2_systemd_show_size_invalid");
  }
  if (!Buffer.isBuffer(input?.process_environ) ||
      input.process_environ.length < 1 ||
      input.process_environ.length > 1_048_576) {
    throw new Error("epoch2_service_environ_size_invalid");
  }
  const props = new Map<string, string>();
  for (const line of show.split(/\r?\n/u)) {
    if (!line) continue;
    const at = line.indexOf("=");
    if (at <= 0) throw new Error("epoch2_systemd_show_line_invalid");
    const key = line.slice(0, at);
    if (props.has(key)) throw new Error("epoch2_systemd_show_duplicate_property");
    props.set(key, line.slice(at + 1));
  }
  if (props.get("ActiveState") !== "active" ||
      props.get("SubState") !== "running") {
    throw new Error("epoch2_service_not_active_running");
  }
  const pid = Number(props.get("MainPID"));
  if (!Number.isSafeInteger(pid) || pid <= 1) {
    throw new Error("epoch2_service_main_pid_invalid");
  }
  const invocation = String(props.get("InvocationID") || "").toLowerCase();
  if (!HEX32.test(invocation)) {
    throw new Error("epoch2_service_invocation_id_invalid");
  }
  const loads = String(props.get("LoadCredential") || "")
    .split(/\s+/u).filter(Boolean);
  const expectedPrefix =
    VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_CREDENTIAL_ID_V1 + ":";
  const e2Loads = loads.filter((row) => row.startsWith(expectedPrefix));
  if (e2Loads.length !== 1) {
    throw new Error("epoch2_loadcredential_binding_cardinality_invalid");
  }
  const sourcePath = e2Loads[0].slice(expectedPrefix.length);
  if (!path.isAbsolute(sourcePath) || path.normalize(sourcePath) !== sourcePath) {
    throw new Error("epoch2_loadcredential_source_path_invalid");
  }

  const envText = input.process_environ.toString("utf8");
  const envRows = envText.split("\0").filter(Boolean);
  const exactEnv = (name: string, cardinalityReason: string): string => {
    const prefix = name + "=";
    const values = envRows
      .filter((row) => row.startsWith(prefix))
      .map((row) => row.slice(prefix.length));
    if (values.length !== 1) throw new Error(cardinalityReason);
    return values[0];
  };
  const credentialsDirectory = exactEnv(
    "CREDENTIALS_DIRECTORY",
    "epoch2_credentials_directory_env_cardinality_invalid",
  );
  if (!path.isAbsolute(credentialsDirectory) ||
      path.normalize(credentialsDirectory) !== credentialsDirectory ||
      !(
        /^\/run\/credentials\/void-node-live[.]service$/u
          .test(credentialsDirectory) ||
        /^\/run\/user\/[0-9]+\/credentials\/void-node-live[.]service$/u
          .test(credentialsDirectory)
      )) {
    throw new Error("epoch2_credentials_directory_not_systemd_managed");
  }
  const processSourceCommit = exactEnv(
    "VOID_PROCESS_SOURCE_COMMIT",
    "epoch2_process_source_commit_env_cardinality_invalid",
  ).toLowerCase();
  const processSourceTree = exactEnv(
    "VOID_PROCESS_SOURCE_TREE",
    "epoch2_process_source_tree_env_cardinality_invalid",
  ).toLowerCase();
  const processSourceBranch = exactEnv(
    "VOID_PROCESS_SOURCE_BRANCH",
    "epoch2_process_source_branch_env_cardinality_invalid",
  );
  if (!SHA40.test(processSourceCommit)) {
    throw new Error("epoch2_process_source_commit_invalid");
  }
  if (!SHA40.test(processSourceTree)) {
    throw new Error("epoch2_process_source_tree_invalid");
  }
  if (processSourceBranch !== "main") {
    throw new Error("epoch2_process_source_branch_invalid");
  }
  return Object.freeze({
    service: VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_SERVICE_V1,
    main_pid: pid,
    invocation_id: invocation,
    credential_id:
      VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_CREDENTIAL_ID_V1,
    credentials_directory: credentialsDirectory,
    loadcredential_binding_sha256:
      crypto.createHash("sha256").update(e2Loads[0], "utf8").digest("hex"),
    credentials_directory_sha256:
      crypto.createHash("sha256")
        .update(credentialsDirectory, "utf8").digest("hex"),
    process_source_commit: processSourceCommit,
    process_source_tree: processSourceTree,
    process_source_branch: processSourceBranch,
  });
}

export function buyVoidEpoch2SystemdCredentialObservationStableV1(
  before: BuyVoidEpoch2SystemdCredentialObservationV1,
  after: BuyVoidEpoch2SystemdCredentialObservationV1,
): boolean {
  return before.service === after.service &&
    before.main_pid === after.main_pid &&
    before.invocation_id === after.invocation_id &&
    before.credential_id === after.credential_id &&
    before.credentials_directory === after.credentials_directory &&
    before.loadcredential_binding_sha256 ===
      after.loadcredential_binding_sha256 &&
    before.credentials_directory_sha256 ===
      after.credentials_directory_sha256 &&
    before.process_source_commit === after.process_source_commit &&
    before.process_source_tree === after.process_source_tree &&
    before.process_source_branch === after.process_source_branch;
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizedAddress(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    return getAddress(value).toLowerCase();
  } catch {
    return null;
  }
}

export type BuyVoidEpoch2CredentialProbeV1 =
  Readonly<BuyVoidDeliveryUnsignedTransactionV1> & {
    accessList: Array<{ address: string; storageKeys: string[] }>;
  };

export function buildBuyVoidEpoch2CredentialCapabilityProbeV1(input: {
  source_head: string;
  challenge_hex: string;
}): BuyVoidEpoch2CredentialProbeV1 {
  const sourceHead = String(input?.source_head || "").toLowerCase();
  const challenge = String(input?.challenge_hex || "").toLowerCase();
  if (!SHA40.test(sourceHead)) throw new Error("epoch2_probe_source_head_invalid");
  if (!HEX64.test(challenge)) throw new Error("epoch2_probe_challenge_invalid");

  const paymentDeliveryId = "0x" + sha256([
    VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_V1,
    sourceHead,
    challenge,
  ].join("\0"));
  const data = FULFILL.encodeFunctionData("fulfill", [
    paymentDeliveryId,
    VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1,
    1n,
  ]);
  return Object.freeze({
    type: 2 as const,
    chainId: 2050n,
    nonce: VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_PROBE_NONCE_V1,
    gasLimit: VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_PROBE_GAS_LIMIT_V1,
    maxFeePerGas: 0n,
    maxPriorityFeePerGas: 0n,
    to: VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1,
    value: 0n as const,
    data,
    accessList: buyVoidPresaleRequiredAccessListV1(
      VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1,
    ),
  });
}

export function buyVoidEpoch2CredentialProbeFingerprintV1(
  probe: Readonly<BuyVoidEpoch2CredentialProbeV1>,
): string {
  return sha256(JSON.stringify({
    type: probe.type,
    chain_id: probe.chainId.toString(),
    nonce: probe.nonce,
    gas_limit: probe.gasLimit.toString(),
    max_fee_per_gas: probe.maxFeePerGas.toString(),
    max_priority_fee_per_gas: probe.maxPriorityFeePerGas.toString(),
    to: probe.to.toLowerCase(),
    value: probe.value.toString(),
    data: probe.data.toLowerCase(),
    access_list: probe.accessList.map((row) => ({
      address: row.address.toLowerCase(),
      storage_keys: row.storageKeys.map((key) => key.toLowerCase()),
    })),
  }));
}

export function verifyBuyVoidEpoch2CredentialSignedProbeV1(input: {
  raw_signed_transaction: string;
  expected_signer: string;
  probe: Readonly<BuyVoidEpoch2CredentialProbeV1>;
}): {
  ok: true;
  signer: string;
  transaction_hash: string;
  raw_signed_transaction_sha256: string;
} | {
  ok: false;
  reason: string;
} {
  const raw = String(input?.raw_signed_transaction || "");
  if (!/^0x[0-9a-fA-F]+$/u.test(raw) || raw.length < 4 || raw.length > 8192) {
    return { ok: false, reason: "epoch2_probe_signed_transaction_shape_invalid" };
  }
  const expectedSigner = normalizedAddress(input?.expected_signer);
  if (!expectedSigner) {
    return { ok: false, reason: "epoch2_probe_expected_signer_invalid" };
  }

  let tx: Transaction;
  try {
    tx = Transaction.from(raw);
  } catch {
    return { ok: false, reason: "epoch2_probe_signed_transaction_parse_failed" };
  }
  const signer = normalizedAddress(tx.from);
  const target = normalizedAddress(tx.to);
  if (!signer || signer !== expectedSigner) {
    return { ok: false, reason: "epoch2_probe_signer_mismatch" };
  }
  if (
    tx.type !== 2 ||
    tx.chainId !== 2050n ||
    tx.nonce !== input.probe.nonce ||
    tx.gasLimit !== input.probe.gasLimit ||
    tx.maxFeePerGas !== input.probe.maxFeePerGas ||
    tx.maxPriorityFeePerGas !== input.probe.maxPriorityFeePerGas ||
    target !== VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1 ||
    tx.value !== 0n ||
    tx.data.toLowerCase() !== input.probe.data.toLowerCase() ||
    !buyVoidPresaleAccessListExactV1(tx.accessList, tx.to)
  ) {
    return { ok: false, reason: "epoch2_probe_signed_envelope_mismatch" };
  }
  if (!tx.hash || !/^0x[0-9a-f]{64}$/u.test(tx.hash.toLowerCase())) {
    return { ok: false, reason: "epoch2_probe_transaction_hash_invalid" };
  }
  return {
    ok: true,
    signer,
    transaction_hash: tx.hash.toLowerCase(),
    raw_signed_transaction_sha256:
      crypto.createHash("sha256").update(Buffer.from(raw, "utf8")).digest("hex"),
  };
}

export function buildBuyVoidEpoch2CredentialAttestationEvidenceV1(input: {
  source_head: string;
  source_tree: string;
  source_branch: "main";
  source_qualifier_blob: string;
  signer_source_blob: string;
  full_runtime_source_blob: string;
  attestation_source_blob: string;
  expected_signer: string;
  probe: Readonly<BuyVoidEpoch2CredentialProbeV1>;
  raw_signed_transaction: string;
  systemd_observation: BuyVoidEpoch2SystemdCredentialObservationV1;
}): Record<string, unknown> {
  const sourceHead = String(input?.source_head || "").toLowerCase();
  const sourceTree = String(input?.source_tree || "").toLowerCase();
  const sourceBranch = String(input?.source_branch || "");
  const blobs = [
    input?.source_qualifier_blob,
    input?.signer_source_blob,
    input?.full_runtime_source_blob,
    input?.attestation_source_blob,
  ].map((value) => String(value || "").toLowerCase());
  if (!SHA40.test(sourceHead) || !SHA40.test(sourceTree) ||
      sourceBranch !== "main" ||
      blobs.some((value) => !SHA40.test(value))) {
    throw new Error("epoch2_attestation_source_identity_invalid");
  }
  const expectedSigner = normalizedAddress(input.expected_signer);
  if (!expectedSigner ||
      expectedSigner !== VOID_BUY_VOID_EPOCH2_FULFILLER_ADDRESS_V1) {
    throw new Error("epoch2_attestation_signer_invalid");
  }
  const systemd = input.systemd_observation;
  if (
    !systemd ||
    systemd.service !== VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_SERVICE_V1 ||
    systemd.credential_id !==
      VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_CREDENTIAL_ID_V1 ||
    !Number.isSafeInteger(systemd.main_pid) || systemd.main_pid <= 1 ||
    !HEX32.test(systemd.invocation_id) ||
    !HEX64.test(systemd.loadcredential_binding_sha256) ||
    !HEX64.test(systemd.credentials_directory_sha256) ||
    !SHA40.test(systemd.process_source_commit) ||
    !SHA40.test(systemd.process_source_tree) ||
    systemd.process_source_branch !== "main"
  ) {
    throw new Error("epoch2_attestation_systemd_observation_invalid");
  }
  if (systemd.process_source_commit !== sourceHead ||
      systemd.process_source_tree !== sourceTree ||
      systemd.process_source_branch !== sourceBranch) {
    throw new Error("epoch2_attestation_process_source_identity_mismatch");
  }

  const verified = verifyBuyVoidEpoch2CredentialSignedProbeV1({
    raw_signed_transaction: input.raw_signed_transaction,
    expected_signer: expectedSigner,
    probe: input.probe,
  });
  if ("reason" in verified) throw new Error(verified.reason);

  const body = {
    marker: VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_V1,
    version: 1,
    status: "EPOCH2_INSTALLED_CREDENTIAL_SIGNING_CAPABILITY_GREEN",
    chain_id: 2050,
    execution_epoch: 2,
    source_head: sourceHead,
    source_identity: {
      source_tree: sourceTree,
      source_branch: sourceBranch,
      epoch2_source_qualifier_git_blob: blobs[0],
      epoch2_credential_signer_git_blob: blobs[1],
      epoch2_full_runtime_git_blob: blobs[2],
      credential_attestation_git_blob: blobs[3],
      credential_source_binding_id:
        VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_ID_V1,
    },
    credential_id:
      VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_CREDENTIAL_ID_V1,
    systemd: {
      service: systemd.service,
      main_pid: systemd.main_pid,
      invocation_id: systemd.invocation_id,
      loadcredential_binding_sha256:
        systemd.loadcredential_binding_sha256,
      credentials_directory_sha256:
        systemd.credentials_directory_sha256,
      process_source_commit: systemd.process_source_commit,
      process_source_tree: systemd.process_source_tree,
      process_source_branch: systemd.process_source_branch,
      raw_loadcredential_source_path_output: false,
      raw_credentials_directory_output: false,
    },
    immutable_fulfiller: expectedSigner,
    fulfillment_contract: VOID_BUY_VOID_EPOCH2_PRESALE_ADDRESS_V1,
    probe: {
      nonce: input.probe.nonce,
      amount_atoms: "1",
      max_fee_per_gas_wei: "0",
      max_priority_fee_per_gas_wei: "0",
      probe_envelope_sha256:
        buyVoidEpoch2CredentialProbeFingerprintV1(input.probe),
      transaction_hash: verified.transaction_hash,
      raw_signed_transaction_sha256: verified.raw_signed_transaction_sha256,
      raw_signed_transaction_output: false,
    },
    credential_content_read: true,
    systemd_credential_identity_proven: true,
    immutable_fulfiller_identity_proven: true,
    active_signing_capability_proven: true,
    transaction_broadcast_performed: false,
    rpc_call_performed: false,
    runtime_activation_authorized: false,
    public_payment_acceptance_authorized: false,
    presale_activation_authorized: false,
    funds_movement: false,
    authority: VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_AUTHORITY_V1,
  };
  return Object.freeze({
    ...body,
    evidence_id: "voide2cred1_" + sha256(JSON.stringify(body)),
  });
}
