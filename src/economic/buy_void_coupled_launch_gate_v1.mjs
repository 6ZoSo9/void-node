import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  getAddress,
  keccak256,
  toUtf8Bytes,
  verifyTypedData,
} from "ethers";

import {
  VOID_WC_VOID_COUPLED_LAUNCH_READINESS_V1,
  classifyVoidWcVoidCoupledLaunchReadinessV1,
} from "../../tools/void-wc-void-coupled-launch-readiness-v1.mjs";

export const VOID_BUY_COUPLED_LAUNCH_ID_V1 =
  "sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26";
export const VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_V1 =
  "VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_V1";
export const VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1 =
  "0x2f1e0005e865b772b268bd8c797bf3eaa901d97e";
export const VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1 =
  "0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b";
export const VOID_BUY_COUPLED_LIVE_ACTIVATION_DOMAIN_V1 =
  Object.freeze({
    name: "VOID Coupled Public Launch Activation",
    version: "1",
    chainId: 2050,
    salt: keccak256(
      toUtf8Bytes(VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_V1),
    ),
  });
export const VOID_BUY_COUPLED_LIVE_ACTIVATION_TYPES_V1 =
  Object.freeze({
    CoupledPublicLaunchActivation: Object.freeze([
      Object.freeze({ name: "execution_epoch", type: "uint64" }),
      Object.freeze({ name: "role_id", type: "bytes32" }),
      Object.freeze({ name: "activation_signer", type: "address" }),
      Object.freeze({ name: "sovereign_signer", type: "address" }),
      Object.freeze({ name: "coupled_launch_id", type: "bytes32" }),
      Object.freeze({ name: "source_composition_id", type: "bytes32" }),
      Object.freeze({ name: "activation_receipt_id", type: "string" }),
      Object.freeze({ name: "activation_nonce", type: "bytes32" }),
      Object.freeze({ name: "activation_generation", type: "bytes32" }),
      Object.freeze({ name: "generation_tip_sha256", type: "bytes32" }),
      Object.freeze({ name: "activated_at_ms", type: "uint64" }),
      Object.freeze({ name: "expires_at_ms", type: "uint64" }),
      Object.freeze({ name: "buy_void_private_runtime_active", type: "bool" }),
      Object.freeze({ name: "wc_void_market_active", type: "bool" }),
      Object.freeze({ name: "public_presale_active", type: "bool" }),
      Object.freeze({ name: "same_launch_ceremony", type: "bool" }),
      Object.freeze({
        name: "public_buy_request_intake_authorized",
        type: "bool",
      }),
      Object.freeze({ name: "runtime_or_launch_evidence", type: "bool" }),
      Object.freeze({ name: "source_ready_only", type: "bool" }),
    ]),
  });

const LIVE_ACTIVATION_ROLE_ID_V1 =
  keccak256(toUtf8Bytes("VOID_WC_VOID_MARKET_VAULT_LAUNCH_CONTROLLER_V1"));
const BYTES32 = /^0x[0-9a-fA-F]{64}$/u;
const SIGNATURE = /^0x[0-9a-fA-F]{130}$/u;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PRODUCTION = "ops/mainnet0/wc-void-production-candidate-v1.json";
const COUPLED = "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const SUCCESSOR = "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json";
const LIVE_RECEIPT_MAX_BYTES = 64 * 1024;
const LIVE_GENERATION_JOURNAL_MAX_BYTES = 64 * 1024;
const LIVE_GENERATION_JOURNAL_MAX_EVENTS = 128;
const LIVE_ACTIVATION_MAX_LEASE_MS = 5 * 60 * 1000;
const HEX64 = /^[0-9a-f]{64}$/u;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
export const VOID_BUY_COUPLED_LIVE_GENERATION_EVENT_V1 =
  "VOID_BUY_COUPLED_LIVE_GENERATION_EVENT_V1";

const LIVE_GENERATION_EVENT_KEYS = Object.freeze([
  "event_sha256",
  "generation",
  "marker",
  "occurred_at_ms",
  "previous_event_sha256",
  "sequence",
  "state",
  "version",
]);

const LIVE_KEYS = Object.freeze([
  "activated_at_ms",
  "activation_generation",
  "activation_nonce",
  "activation_receipt_id",
  "activation_signature",
  "activation_signer",
  "buy_void_private_runtime_active",
  "coupled_launch_id",
  "expires_at_ms",
  "generation_tip_sha256",
  "marker",
  "public_buy_request_intake_authorized",
  "public_presale_active",
  "runtime_or_launch_evidence",
  "same_launch_ceremony",
  "sovereign_signature",
  "sovereign_signer",
  "source_composition_id",
  "source_ready_only",
  "status",
  "version",
  "wc_void_market_active",
]);

function read(relativePath) {
  const value = JSON.parse(
    fs.readFileSync(path.join(ROOT, relativePath), "utf8"),
  );
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("buy_launch_source_invalid");
  }
  return value;
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map(
      key => JSON.stringify(key) + ":" + canonicalJson(value[key]),
    ).join(",") + "}";
  }
  throw new Error("buy_launch_live_receipt_noncanonical");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function buyLaunchLiveActivationReceiptIdV1(receiptWithoutId) {
  return "voidbclive1_" + sha256(
    Buffer.from(canonicalJson(receiptWithoutId), "utf8"),
  );
}

export function buildBuyLaunchGenerationEventV1({
  sequence,
  previous_event_sha256,
  generation,
  state,
  occurred_at_ms,
}) {
  if (
    !Number.isSafeInteger(sequence) ||
    sequence < 1 ||
    !(previous_event_sha256 === null ||
      SHA256_ID.test(String(previous_event_sha256 || ""))) ||
    !BYTES32.test(String(generation || "")) ||
    !["active", "revoked"].includes(state) ||
    !Number.isSafeInteger(occurred_at_ms) ||
    occurred_at_ms <= 0
  ) {
    throw new Error("buy_launch_generation_event_invalid");
  }
  const body = Object.freeze({
    marker: VOID_BUY_COUPLED_LIVE_GENERATION_EVENT_V1,
    version: 1,
    sequence,
    previous_event_sha256,
    generation,
    state,
    occurred_at_ms,
  });
  return Object.freeze({
    ...body,
    event_sha256:
      "sha256:" + sha256(Buffer.from(canonicalJson(body), "utf8")),
  });
}

export function classifyBuyLaunchGenerationJournalV1(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 1 ||
      bytes.length > LIVE_GENERATION_JOURNAL_MAX_BYTES) {
    throw new Error("buy_launch_generation_journal_size_invalid");
  }
  const text = bytes.toString("utf8");
  const lines = text.endsWith("\n")
    ? text.slice(0, -1).split("\n")
    : text.split("\n");
  if (
    lines.length < 1 ||
    lines.length > LIVE_GENERATION_JOURNAL_MAX_EVENTS ||
    lines.some(line => line.length === 0)
  ) {
    throw new Error("buy_launch_generation_journal_lines_invalid");
  }

  let previous = null;
  for (let index = 0; index < lines.length; index += 1) {
    const raw = JSON.parse(lines[index]);
    if (
      !raw ||
      typeof raw !== "object" ||
      Array.isArray(raw) ||
      Object.keys(raw).sort().join("\n") !==
        [...LIVE_GENERATION_EVENT_KEYS].sort().join("\n")
    ) {
      throw new Error("buy_launch_generation_event_shape_invalid");
    }
    const expected = buildBuyLaunchGenerationEventV1({
      sequence: raw.sequence,
      previous_event_sha256: raw.previous_event_sha256,
      generation: raw.generation,
      state: raw.state,
      occurred_at_ms: raw.occurred_at_ms,
    });
    if (
      raw.marker !== VOID_BUY_COUPLED_LIVE_GENERATION_EVENT_V1 ||
      raw.version !== 1 ||
      raw.sequence !== index + 1 ||
      raw.event_sha256 !== expected.event_sha256 ||
      raw.previous_event_sha256 !==
        (previous ? previous.event_sha256 : null)
    ) {
      throw new Error("buy_launch_generation_event_chain_invalid");
    }
    if (previous) {
      if (
        previous.state === "active" &&
        !(raw.state === "revoked" &&
          raw.generation === previous.generation)
      ) {
        throw new Error("buy_launch_generation_active_must_revoke");
      }
      if (
        previous.state === "revoked" &&
        !(raw.state === "active" &&
          raw.generation !== previous.generation)
      ) {
        throw new Error("buy_launch_generation_revoke_must_rotate");
      }
      if (raw.occurred_at_ms < previous.occurred_at_ms) {
        throw new Error("buy_launch_generation_time_regression");
      }
    } else if (raw.state !== "active") {
      throw new Error("buy_launch_generation_first_event_must_activate");
    }
    previous = Object.freeze({ ...raw });
  }

  return Object.freeze({
    ready: previous?.state === "active",
    generation: previous?.generation || null,
    tip_sha256: previous?.event_sha256 || null,
    sequence: previous?.sequence || 0,
    reason:
      previous?.state === "active"
        ? null
        : "live_coupled_activation_generation_revoked",
  });
}

export function readBuyLaunchGenerationJournalV1(env = process.env) {
  const dataDirRaw = String(env.DATA_DIR || "").trim();
  if (!dataDirRaw) {
    throw new Error("buy_launch_generation_data_dir_missing");
  }
  const dataDir = path.resolve(dataDirRaw);
  const journalPath = path.join(
    dataDir,
    "economic",
    "buy-void-coupled-live-generation-v1.jsonl",
  );
  return classifyBuyLaunchGenerationJournalV1(
    readStablePrivateFile(journalPath),
  );
}

function sha256IdBytes32(value) {
  if (!SHA256_ID.test(String(value || ""))) {
    throw new Error("buy_launch_live_activation_sha256_id_invalid");
  }
  return "0x" + String(value).slice("sha256:".length);
}

export function buyLaunchLiveActivationTypedDataV1(receipt) {
  if (
    !receipt ||
    typeof receipt !== "object" ||
    Array.isArray(receipt) ||
    !/^voidbclive1_[0-9a-f]{64}$/u.test(
      String(receipt.activation_receipt_id || ""),
    ) ||
    !BYTES32.test(String(receipt.activation_nonce || "")) ||
    !BYTES32.test(String(receipt.activation_generation || "")) ||
    !SHA256_ID.test(String(receipt.generation_tip_sha256 || "")) ||
    !Number.isSafeInteger(receipt.activated_at_ms) ||
    receipt.activated_at_ms <= 0 ||
    !Number.isSafeInteger(receipt.expires_at_ms) ||
    receipt.expires_at_ms <= receipt.activated_at_ms
  ) {
    throw new Error("buy_launch_live_activation_typed_data_invalid");
  }
  return Object.freeze({
    domain: VOID_BUY_COUPLED_LIVE_ACTIVATION_DOMAIN_V1,
    types: VOID_BUY_COUPLED_LIVE_ACTIVATION_TYPES_V1,
    value: Object.freeze({
      execution_epoch: 2n,
      role_id: LIVE_ACTIVATION_ROLE_ID_V1,
      activation_signer: getAddress(receipt.activation_signer),
      sovereign_signer: getAddress(receipt.sovereign_signer),
      coupled_launch_id: sha256IdBytes32(receipt.coupled_launch_id),
      source_composition_id:
        sha256IdBytes32(receipt.source_composition_id),
      activation_receipt_id: receipt.activation_receipt_id,
      activation_nonce: receipt.activation_nonce,
      activation_generation: receipt.activation_generation,
      generation_tip_sha256:
        sha256IdBytes32(receipt.generation_tip_sha256),
      activated_at_ms: BigInt(receipt.activated_at_ms),
      expires_at_ms: BigInt(receipt.expires_at_ms),
      buy_void_private_runtime_active:
        receipt.buy_void_private_runtime_active === true,
      wc_void_market_active: receipt.wc_void_market_active === true,
      public_presale_active: receipt.public_presale_active === true,
      same_launch_ceremony: receipt.same_launch_ceremony === true,
      public_buy_request_intake_authorized:
        receipt.public_buy_request_intake_authorized === true,
      runtime_or_launch_evidence:
        receipt.runtime_or_launch_evidence === true,
      source_ready_only: receipt.source_ready_only === true,
    }),
  });
}

export function verifyBuyLaunchLiveActivationSignatureV1(
  receipt,
  expectedSigner = VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1,
) {
  try {
    if (!SIGNATURE.test(String(receipt?.activation_signature || ""))) {
      throw new Error("buy_launch_live_activation_signature_invalid");
    }
    const expected = getAddress(expectedSigner);
    const typed = buyLaunchLiveActivationTypedDataV1(receipt);
    const recovered = getAddress(
      verifyTypedData(
        typed.domain,
        typed.types,
        typed.value,
        receipt.activation_signature,
      ),
    );
    if (recovered !== expected) {
      throw new Error("buy_launch_live_activation_signer_mismatch");
    }
    return Object.freeze({
      verified: true,
      recovered_signer: recovered.toLowerCase(),
    });
  } catch {
    return Object.freeze({
      verified: false,
      recovered_signer: null,
    });
  }
}

export function verifyBuyLaunchLiveActivationSovereignSignatureV1(
  receipt,
  expectedSigner = VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1,
) {
  try {
    if (!SIGNATURE.test(String(receipt?.sovereign_signature || ""))) {
      throw new Error("buy_launch_live_sovereign_signature_invalid");
    }
    const expected = getAddress(expectedSigner);
    const typed = buyLaunchLiveActivationTypedDataV1(receipt);
    const recovered = getAddress(
      verifyTypedData(
        typed.domain,
        typed.types,
        typed.value,
        receipt.sovereign_signature,
      ),
    );
    if (recovered !== expected) {
      throw new Error("buy_launch_live_sovereign_signer_mismatch");
    }
    return Object.freeze({
      verified: true,
      recovered_signer: recovered.toLowerCase(),
    });
  } catch {
    return Object.freeze({
      verified: false,
      recovered_signer: null,
    });
  }
}

function sameStat(a, b) {
  return (
    a.dev === b.dev &&
    a.ino === b.ino &&
    a.size === b.size &&
    a.mtimeNs === b.mtimeNs &&
    a.ctimeNs === b.ctimeNs &&
    a.mode === b.mode &&
    a.uid === b.uid &&
    a.gid === b.gid &&
    a.nlink === b.nlink
  );
}

function readStablePrivateFile(filePath) {
  if (
    typeof filePath !== "string" ||
    !path.isAbsolute(filePath) ||
    path.resolve(filePath) !== filePath
  ) {
    throw new Error("buy_launch_live_receipt_path_invalid");
  }
  const noFollow = fs.constants.O_NOFOLLOW;
  const directory = fs.constants.O_DIRECTORY;
  if (typeof noFollow !== "number" || typeof directory !== "number") {
    throw new Error("buy_launch_live_receipt_nofollow_unavailable");
  }
  if (typeof process.geteuid !== "function") {
    throw new Error("buy_launch_live_receipt_euid_unavailable");
  }
  const euid = BigInt(process.geteuid());
  const parsed = path.parse(filePath);
  const parts = filePath.slice(parsed.root.length).split(path.sep).filter(Boolean);
  const name = parts.pop();
  if (!name || name === "." || name === "..") {
    throw new Error("buy_launch_live_receipt_name_invalid");
  }

  let dirFd = fs.openSync(parsed.root, fs.constants.O_RDONLY | directory | noFollow);
  let fileFd = -1;
  try {
    for (const part of parts) {
      if (!part || part === "." || part === "..") {
        throw new Error("buy_launch_live_receipt_ancestor_invalid");
      }
      const next = fs.openSync(
        path.join("/proc/self/fd", String(dirFd), part),
        fs.constants.O_RDONLY | directory | noFollow,
      );
      const st = fs.fstatSync(next, { bigint: true });
      if (
        !st.isDirectory() ||
        st.isSymbolicLink() ||
        (st.uid !== euid && st.uid !== 0n) ||
        ((st.mode & 0o022n) !== 0n && (st.mode & 0o1000n) === 0n)
      ) {
        fs.closeSync(next);
        throw new Error("buy_launch_live_receipt_ancestor_unsafe");
      }
      fs.closeSync(dirFd);
      dirFd = next;
    }

    const parent = fs.fstatSync(dirFd, { bigint: true });
    if (
      !parent.isDirectory() ||
      parent.isSymbolicLink() ||
      parent.uid !== euid ||
      (parent.mode & 0o022n) !== 0n
    ) {
      throw new Error("buy_launch_live_receipt_parent_unsafe");
    }

    const procPath = path.join("/proc/self/fd", String(dirFd), name);
    const listed = fs.lstatSync(procPath, { bigint: true });
    if (
      !listed.isFile() ||
      listed.isSymbolicLink() ||
      listed.uid !== euid ||
      listed.nlink !== 1n ||
      (listed.mode & 0o077n) !== 0n ||
      listed.size <= 0n ||
      listed.size > BigInt(LIVE_RECEIPT_MAX_BYTES)
    ) {
      throw new Error("buy_launch_live_receipt_file_unsafe");
    }
    fileFd = fs.openSync(procPath, fs.constants.O_RDONLY | noFollow);
    const opened = fs.fstatSync(fileFd, { bigint: true });
    if (!sameStat(listed, opened)) {
      throw new Error("buy_launch_live_receipt_identity_changed");
    }
    const bytes = fs.readFileSync(fileFd);
    const after = fs.fstatSync(fileFd, { bigint: true });
    const visible = fs.lstatSync(procPath, { bigint: true });
    if (
      bytes.length !== Number(after.size) ||
      !sameStat(opened, after) ||
      !sameStat(after, visible)
    ) {
      throw new Error("buy_launch_live_receipt_changed_during_read");
    }
    return bytes;
  } finally {
    if (fileFd >= 0) {
      try { fs.closeSync(fileFd); } catch {}
    }
    try { fs.closeSync(dirFd); } catch {}
  }
}

export function classifyBuyLaunchGateV1({ production, coupled, successor }) {
  let decision = null;
  try {
    decision = classifyVoidWcVoidCoupledLaunchReadinessV1({
      production_candidate: production,
      coupled_candidate: coupled,
      successor_migration_candidate: successor,
    });
  } catch {
    decision = null;
  }

  const ready =
    decision?.ok === true &&
    decision.status === "SOURCE_READY" &&
    decision.marker === VOID_WC_VOID_COUPLED_LAUNCH_READINESS_V1 &&
    SHA256_ID.test(String(decision.composition_id || "")) &&
    decision.activation_authority === false &&
    decision.funding_authority === false &&
    decision.market_activation_authorized === false &&
    decision.public_presale_activation_authorized === false &&
    decision.funds_movement_authorized === false &&
    coupled?.shared_post_discovery_reconciliation?.coupled_launch_id ===
      VOID_BUY_COUPLED_LAUNCH_ID_V1;

  return Object.freeze({
    ready,
    id: VOID_BUY_COUPLED_LAUNCH_ID_V1,
    composition_id: ready ? decision.composition_id : null,
    reason: ready ? null : "canonical_coupled_launch_source_not_ready",
  });
}

export function readBuyLaunchSourceGateV1() {
  try {
    return classifyBuyLaunchGateV1({
      production: read(PRODUCTION),
      coupled: read(COUPLED),
      successor: read(SUCCESSOR),
    });
  } catch {
    return Object.freeze({
      ready: false,
      id: VOID_BUY_COUPLED_LAUNCH_ID_V1,
      composition_id: null,
      reason: "canonical_coupled_launch_source_unavailable",
    });
  }
}

export function classifyBuyLaunchLiveActivationLeaseV1(
  receipt,
  generationState,
  nowMs,
) {
  const ready =
    receipt &&
    typeof receipt === "object" &&
    !Array.isArray(receipt) &&
    generationState?.ready === true &&
    BYTES32.test(String(generationState.generation || "")) &&
    SHA256_ID.test(String(generationState.tip_sha256 || "")) &&
    BYTES32.test(String(receipt.activation_generation || "")) &&
    SHA256_ID.test(String(receipt.generation_tip_sha256 || "")) &&
    receipt.activation_generation === generationState.generation &&
    receipt.generation_tip_sha256 === generationState.tip_sha256 &&
    Number.isSafeInteger(nowMs) &&
    nowMs > 0 &&
    Number.isSafeInteger(receipt.activated_at_ms) &&
    Number.isSafeInteger(receipt.expires_at_ms) &&
    receipt.activated_at_ms > 0 &&
    receipt.activated_at_ms <= nowMs &&
    receipt.expires_at_ms > nowMs &&
    receipt.expires_at_ms > receipt.activated_at_ms &&
    receipt.expires_at_ms - receipt.activated_at_ms <=
      LIVE_ACTIVATION_MAX_LEASE_MS;
  return Object.freeze({
    ready,
    reason: ready ? null : "live_coupled_activation_lease_not_ready",
  });
}

function readBuyLaunchLiveActivationCoreV1(
  sourceGate,
  env,
  nowMs,
) {
  try {
    if (
      sourceGate?.ready !== true ||
      sourceGate.id !== VOID_BUY_COUPLED_LAUNCH_ID_V1 ||
      !SHA256_ID.test(String(sourceGate.composition_id || ""))
    ) {
      throw new Error("buy_launch_source_gate_not_ready");
    }

    const filePath = env.VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_PATH;
    const expectedSha256 =
      env.VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_SHA256;
    if (
      !HEX64.test(String(expectedSha256 || "")) ||
      !Number.isSafeInteger(nowMs) ||
      nowMs <= 0
    ) {
      throw new Error("buy_launch_live_receipt_runtime_binding_invalid");
    }
    const generationState = readBuyLaunchGenerationJournalV1(env);
    if (!generationState.ready) {
      throw new Error(generationState.reason);
    }

    const bytes = readStablePrivateFile(filePath);
    const actualSha256 = sha256(bytes);
    if (actualSha256 !== expectedSha256) {
      throw new Error("buy_launch_live_receipt_sha256_mismatch");
    }

    const receipt = JSON.parse(bytes.toString("utf8"));
    if (
      !receipt ||
      typeof receipt !== "object" ||
      Array.isArray(receipt) ||
      Object.keys(receipt).sort().join("\n") !== [...LIVE_KEYS].sort().join("\n")
    ) {
      throw new Error("buy_launch_live_receipt_shape_invalid");
    }

    const lease = classifyBuyLaunchLiveActivationLeaseV1(
      receipt,
      generationState,
      nowMs,
    );
    if (!lease.ready) {
      throw new Error(lease.reason);
    }

    const body = { ...receipt };
    delete body.activation_receipt_id;
    delete body.activation_signature;
    delete body.sovereign_signature;
    const expectedReceiptId = buyLaunchLiveActivationReceiptIdV1(body);
    if (
      receipt.marker !== VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_V1 ||
      receipt.version !== 1 ||
      receipt.status !== "COUPLED_PUBLIC_LAUNCH_ACTIVE" ||
      receipt.coupled_launch_id !== VOID_BUY_COUPLED_LAUNCH_ID_V1 ||
      receipt.source_composition_id !== sourceGate.composition_id ||
      receipt.activation_receipt_id !== expectedReceiptId ||
      String(receipt.activation_signer || "").toLowerCase() !==
        VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1 ||
      String(receipt.sovereign_signer || "").toLowerCase() !==
        VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1 ||
      !BYTES32.test(String(receipt.activation_nonce || "")) ||
      !SIGNATURE.test(String(receipt.activation_signature || "")) ||
      !SIGNATURE.test(String(receipt.sovereign_signature || "")) ||
      receipt.buy_void_private_runtime_active !== true ||
      receipt.wc_void_market_active !== true ||
      receipt.public_presale_active !== true ||
      receipt.same_launch_ceremony !== true ||
      receipt.public_buy_request_intake_authorized !== true ||
      receipt.runtime_or_launch_evidence !== true ||
      receipt.source_ready_only !== false
    ) {
      throw new Error("buy_launch_live_receipt_semantics_invalid");
    }

    const signed = verifyBuyLaunchLiveActivationSignatureV1(
      receipt,
      VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1,
    );
    const sovereignSigned =
      verifyBuyLaunchLiveActivationSovereignSignatureV1(
        receipt,
        VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1,
      );
    if (signed.verified !== true || sovereignSigned.verified !== true) {
      throw new Error("buy_launch_live_receipt_signature_invalid");
    }

    const confirmation =
      "activate-coupled-public-buy-v1:" +
      receipt.activation_generation +
      ":" +
      receipt.generation_tip_sha256 +
      ":" +
      receipt.activation_receipt_id +
      ":" +
      actualSha256;
    if (env.VOID_BUY_COUPLED_LIVE_ACTIVATION_CONFIRM !== confirmation) {
      throw new Error("buy_launch_live_receipt_confirmation_invalid");
    }

    return Object.freeze({
      ready: true,
      receipt_id: receipt.activation_receipt_id,
      receipt_sha256: actualSha256,
      source_composition_id: receipt.source_composition_id,
      activation_signer: signed.recovered_signer,
      sovereign_signer: sovereignSigned.recovered_signer,
      reason: null,
    });
  } catch {
    return Object.freeze({
      ready: false,
      receipt_id: null,
      receipt_sha256: null,
      source_composition_id:
        typeof sourceGate?.composition_id === "string"
          ? sourceGate.composition_id
          : null,
      activation_signer: null,
      sovereign_signer: null,
      reason: "live_coupled_activation_evidence_not_ready",
    });
  }
}

export function readBuyLaunchLiveActivationV1(
  sourceGate,
  env = process.env,
  nowMs = Date.now(),
) {
  return readBuyLaunchLiveActivationCoreV1(
    sourceGate,
    env,
    nowMs,
  );
}

export function readBuyLaunchGateV1(
  env = process.env,
  nowMs = Date.now(),
) {
  const source = readBuyLaunchSourceGateV1();
  if (!source.ready) {
    return Object.freeze({
      ...source,
      source_ready: false,
      live_activation_ready: false,
      live_activation_receipt_id: null,
      live_activation_signer: null,
      live_activation_sovereign_signer: null,
    });
  }
  const live = readBuyLaunchLiveActivationV1(source, env, nowMs);
  return Object.freeze({
    ready: source.ready && live.ready,
    id: source.id,
    composition_id: source.composition_id,
    source_ready: true,
    live_activation_ready: live.ready,
    live_activation_receipt_id: live.receipt_id,
    live_activation_signer: live.activation_signer,
    live_activation_sovereign_signer: live.sovereign_signer,
    reason: live.ready ? null : live.reason,
  });
}
