import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { userInfo } from "node:os";
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
export const VOID_BUY_COUPLED_GENERATION_MAX_FUTURE_SKEW_MS_V1 = 30_000;
const HEX64 = /^[0-9a-f]{64}$/u;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
export const VOID_BUY_COUPLED_LIVE_GENERATION_EVENT_V1 =
  "VOID_BUY_COUPLED_LIVE_GENERATION_EVENT_V1";
export const VOID_BUY_COUPLED_LIVE_GENERATION_EXTERNAL_ANCHOR_V1 =
  "VOID_BUY_COUPLED_LIVE_GENERATION_EXTERNAL_ANCHOR_V1";

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

export function classifyBuyLaunchGenerationAuthorityV1(
  journalBytes,
  externalAnchorBytes,
) {
  if (
    !Buffer.isBuffer(journalBytes) ||
    !Buffer.isBuffer(externalAnchorBytes) ||
    !journalBytes.equals(externalAnchorBytes)
  ) {
    throw new Error("buy_launch_generation_external_anchor_mismatch");
  }
  const state = classifyBuyLaunchGenerationJournalV1(journalBytes);
  return Object.freeze({
    ...state,
    external_anchor_verified: true,
    external_anchor_sha256:
      "sha256:" + sha256(externalAnchorBytes),
  });
}

export function buyLaunchGenerationExternalAnchorPathV1() {
  const home = path.resolve(String(userInfo().homedir || ""));
  if (!home || home === path.parse(home).root) {
    throw new Error("buy_launch_generation_home_invalid");
  }
  return path.join(
    home,
    ".local",
    "state",
    "void-node-authority-v1",
    "buy-void-coupled-live-generation-anchor-v1.jsonl",
  );
}

export function buyLaunchGenerationAuthorityLockPathV1() {
  return path.join(
    path.dirname(buyLaunchGenerationExternalAnchorPathV1()),
    "buy-void-coupled-live-generation-authority-v1",
  );
}

function buyLaunchGenerationPathsV1(env = process.env) {
  const dataDirRaw = String(env.DATA_DIR || env.VOID_DATA_DIR || "").trim();
  if (!dataDirRaw) {
    throw new Error("buy_launch_generation_data_dir_missing");
  }
  const dataDir = path.resolve(dataDirRaw);
  const journalPath = path.join(
    dataDir,
    "economic",
    "buy-void-coupled-live-generation-v1.jsonl",
  );
  const anchorPath = buyLaunchGenerationExternalAnchorPathV1();
  const relativeAnchor = path.relative(dataDir, anchorPath);
  if (
    relativeAnchor === "" ||
    (!relativeAnchor.startsWith(".." + path.sep) &&
      relativeAnchor !== ".." &&
      !path.isAbsolute(relativeAnchor))
  ) {
    throw new Error("buy_launch_generation_anchor_inside_data_dir");
  }
  const intentPath = path.join(
    path.dirname(anchorPath),
    "buy-void-coupled-live-generation-publication-intent-v1.json",
  );
  return Object.freeze({
    dataDir,
    journalPath,
    anchorPath,
    intentPath,
  });
}

async function withBuyLaunchGenerationAuthorityLockV1(operation) {
  if (typeof operation !== "function") {
    throw new Error("buy_launch_generation_lock_operation_required");
  }
  let lockModule;
  try {
    lockModule = await import(
      "../../dist/economic/buy_void_filesystem_bakery_lock_v1.js"
    );
  } catch (error) {
    void error;
    throw new Error("buy_launch_generation_authority_lock_unavailable");
  }
  if (
    typeof lockModule?.withBuyVoidFilesystemBakeryLockAsyncV1 !== "function"
  ) {
    throw new Error("buy_launch_generation_authority_lock_invalid");
  }
  return lockModule.withBuyVoidFilesystemBakeryLockAsyncV1(
    buyLaunchGenerationAuthorityLockPathV1(),
    operation,
  );
}

async function withBuyLaunchGenerationTransitionPublicationV1(
  operation,
) {
  return withBuyLaunchGenerationAuthorityLockV1(operation);
}

function ensurePrivateGenerationDirectoryV1(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true, mode: 0o700 });
  const stat = fs.lstatSync(directoryPath, { bigint: true });
  const euid =
    typeof process.geteuid === "function"
      ? BigInt(process.geteuid())
      : null;
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    euid === null ||
    (stat.uid !== euid && stat.uid !== 0n) ||
    (stat.mode & 0o022n) !== 0n
  ) {
    throw new Error("buy_launch_generation_publish_directory_unsafe");
  }
}

function atomicWritePrivateGenerationBytesV1(filePath, bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 1) {
    throw new Error("buy_launch_generation_publish_bytes_invalid");
  }
  const parent = path.dirname(filePath);
  ensurePrivateGenerationDirectoryV1(parent);
  const tempPath = path.join(
    parent,
    "." + path.basename(filePath) +
      ".tmp-" + process.pid + "-" + randomBytes(8).toString("hex"),
  );
  let fd = -1;
  try {
    fd = fs.openSync(
      tempPath,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        fs.constants.O_NOFOLLOW,
      0o600,
    );
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = -1;
    fs.renameSync(tempPath, filePath);
    fs.chmodSync(filePath, 0o600);
    const dirFd = fs.openSync(
      parent,
      fs.constants.O_RDONLY | fs.constants.O_DIRECTORY,
    );
    try {
      fs.fsyncSync(dirFd);
    } finally {
      fs.closeSync(dirFd);
    }
  } finally {
    if (fd >= 0) {
      try {
        fs.closeSync(fd);
      } catch (error) {
        void error;
      }
    }
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch (error) {
      void error;
    }
  }
}


export const VOID_BUY_COUPLED_GENERATION_PUBLICATION_INTENT_V1 =
  "VOID_BUY_COUPLED_GENERATION_PUBLICATION_INTENT_V1";
const GENERATION_PUBLICATION_INTENT_MAX_BYTES = 256 * 1024;
const GENERATION_PUBLICATION_INTENT_KEYS = Object.freeze([
  "generation",
  "marker",
  "next_bytes_base64",
  "next_sha256",
  "occurred_at_ms",
  "prior_sha256",
  "sequence",
  "state",
  "tip_sha256",
  "version",
]);

export function buildBuyLaunchGenerationPublicationIntentV1({
  previous_bytes,
  next_bytes,
  state,
  generation,
  occurred_at_ms,
}) {
  if (
    !Buffer.isBuffer(previous_bytes) ||
    !Buffer.isBuffer(next_bytes) ||
    next_bytes.length < 1 ||
    next_bytes.length > LIVE_GENERATION_JOURNAL_MAX_BYTES ||
    !["active", "revoked"].includes(state) ||
    !BYTES32.test(String(generation || "")) ||
    !Number.isSafeInteger(occurred_at_ms) ||
    occurred_at_ms <= 0
  ) {
    throw new Error("buy_launch_generation_publish_intent_input_invalid");
  }
  const nextState = classifyBuyLaunchGenerationJournalV1(next_bytes);
  const nextText = next_bytes.toString("utf8");
  const nextLines = nextText.endsWith("\n")
    ? nextText.slice(0, -1).split("\n")
    : nextText.split("\n");
  const finalEvent = JSON.parse(nextLines[nextLines.length - 1]);
  const derivedPreviousBytes =
    nextLines.length === 1
      ? Buffer.alloc(0)
      : Buffer.from(nextLines.slice(0, -1).join("\n") + "\n", "utf8");
  if (
    !derivedPreviousBytes.equals(previous_bytes) ||
    nextState.generation !== generation ||
    nextState.ready !== (state === "active") ||
    finalEvent.generation !== generation ||
    finalEvent.state !== state ||
    finalEvent.occurred_at_ms !== occurred_at_ms ||
    finalEvent.sequence !== nextState.sequence ||
    finalEvent.event_sha256 !== nextState.tip_sha256
  ) {
    throw new Error("buy_launch_generation_publish_intent_state_mismatch");
  }
  const body = Object.freeze({
    marker: VOID_BUY_COUPLED_GENERATION_PUBLICATION_INTENT_V1,
    version: 1,
    state,
    generation,
    occurred_at_ms,
    sequence: nextState.sequence,
    tip_sha256: nextState.tip_sha256,
    prior_sha256:
      previous_bytes.length > 0
        ? "sha256:" + sha256(previous_bytes)
        : null,
    next_sha256: "sha256:" + sha256(next_bytes),
    next_bytes_base64: next_bytes.toString("base64"),
  });
  return Buffer.from(JSON.stringify(body, null, 2) + "\n", "utf8");
}

export function parseBuyLaunchGenerationPublicationIntentV1(bytes) {
  if (
    !Buffer.isBuffer(bytes) ||
    bytes.length < 1 ||
    bytes.length > GENERATION_PUBLICATION_INTENT_MAX_BYTES
  ) {
    throw new Error("buy_launch_generation_publish_intent_size_invalid");
  }
  const raw = JSON.parse(bytes.toString("utf8"));
  if (
    !raw ||
    typeof raw !== "object" ||
    Array.isArray(raw) ||
    Object.keys(raw).sort().join("\n") !==
      [...GENERATION_PUBLICATION_INTENT_KEYS].sort().join("\n") ||
    raw.marker !== VOID_BUY_COUPLED_GENERATION_PUBLICATION_INTENT_V1 ||
    raw.version !== 1 ||
    !["active", "revoked"].includes(raw.state) ||
    !BYTES32.test(String(raw.generation || "")) ||
    !Number.isSafeInteger(raw.occurred_at_ms) ||
    raw.occurred_at_ms <= 0 ||
    !Number.isSafeInteger(raw.sequence) ||
    raw.sequence < 1 ||
    !SHA256_ID.test(String(raw.tip_sha256 || "")) ||
    !(raw.prior_sha256 === null ||
      SHA256_ID.test(String(raw.prior_sha256 || ""))) ||
    !SHA256_ID.test(String(raw.next_sha256 || "")) ||
    typeof raw.next_bytes_base64 !== "string" ||
    raw.next_bytes_base64.length < 1
  ) {
    throw new Error("buy_launch_generation_publish_intent_shape_invalid");
  }
  const nextBytes = Buffer.from(raw.next_bytes_base64, "base64");
  if (
    nextBytes.length < 1 ||
    nextBytes.length > LIVE_GENERATION_JOURNAL_MAX_BYTES ||
    nextBytes.toString("base64") !== raw.next_bytes_base64 ||
    "sha256:" + sha256(nextBytes) !== raw.next_sha256
  ) {
    throw new Error("buy_launch_generation_publish_intent_bytes_invalid");
  }
  const nextState = classifyBuyLaunchGenerationJournalV1(nextBytes);
  const nextText = nextBytes.toString("utf8");
  const nextLines = nextText.endsWith("\n")
    ? nextText.slice(0, -1).split("\n")
    : nextText.split("\n");
  const finalEvent = JSON.parse(nextLines[nextLines.length - 1]);
  const priorBytes =
    nextLines.length === 1
      ? Buffer.alloc(0)
      : Buffer.from(nextLines.slice(0, -1).join("\n") + "\n", "utf8");
  if (priorBytes.length > 0) {
    classifyBuyLaunchGenerationJournalV1(priorBytes);
  }
  const derivedPriorSha =
    priorBytes.length > 0 ? "sha256:" + sha256(priorBytes) : null;
  if (
    nextState.sequence !== raw.sequence ||
    nextState.tip_sha256 !== raw.tip_sha256 ||
    nextState.generation !== raw.generation ||
    nextState.ready !== (raw.state === "active") ||
    finalEvent.sequence !== raw.sequence ||
    finalEvent.event_sha256 !== raw.tip_sha256 ||
    finalEvent.generation !== raw.generation ||
    finalEvent.state !== raw.state ||
    finalEvent.occurred_at_ms !== raw.occurred_at_ms ||
    derivedPriorSha !== raw.prior_sha256
  ) {
    throw new Error("buy_launch_generation_publish_intent_state_invalid");
  }
  return Object.freeze({
    intent: Object.freeze({ ...raw }),
    prior_bytes: priorBytes,
    next_bytes: nextBytes,
    next_state: nextState,
  });
}

function generationPublicationObservedBytesV1(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return readStablePrivateFile(filePath);
}

export function classifyBuyLaunchGenerationPublicationRecoveryV1({
  intent_bytes,
  journal_bytes,
  anchor_bytes,
}) {
  const parsed = parseBuyLaunchGenerationPublicationIntentV1(intent_bytes);
  const priorSha = parsed.intent.prior_sha256;
  const nextSha = parsed.intent.next_sha256;
  const journalSha =
    journal_bytes === null
      ? null
      : Buffer.isBuffer(journal_bytes)
        ? "sha256:" + sha256(journal_bytes)
        : (() => {
            throw new Error(
              "buy_launch_generation_publish_recovery_observation_invalid",
            );
          })();
  const anchorSha =
    anchor_bytes === null
      ? null
      : Buffer.isBuffer(anchor_bytes)
        ? "sha256:" + sha256(anchor_bytes)
        : (() => {
            throw new Error(
              "buy_launch_generation_publish_recovery_observation_invalid",
            );
          })();

  let phase = null;
  if (priorSha === null) {
    if (journalSha === null && anchorSha === null) {
      phase = "intent_only";
    } else if (journalSha === nextSha && anchorSha === null) {
      phase = "journal_committed";
    } else if (journalSha === nextSha && anchorSha === nextSha) {
      phase = "pair_committed";
    }
  } else {
    if (journalSha === priorSha && anchorSha === priorSha) {
      phase = "intent_only";
    } else if (journalSha === nextSha && anchorSha === priorSha) {
      phase = "journal_committed";
    } else if (journalSha === nextSha && anchorSha === nextSha) {
      phase = "pair_committed";
    }
  }
  if (phase === null) {
    throw new Error("buy_launch_generation_publish_recovery_order_invalid");
  }

  for (const [observed, observedSha] of [
    [journal_bytes, journalSha],
    [anchor_bytes, anchorSha],
  ]) {
    if (observedSha === priorSha && Buffer.isBuffer(observed)) {
      if (!observed.equals(parsed.prior_bytes)) {
        throw new Error("buy_launch_generation_publish_recovery_prior_mismatch");
      }
    }
    if (observedSha === nextSha && Buffer.isBuffer(observed)) {
      if (!observed.equals(parsed.next_bytes)) {
        throw new Error("buy_launch_generation_publish_recovery_next_mismatch");
      }
    }
  }

  return Object.freeze({
    ...parsed,
    phase,
  });
}

function fsyncGenerationDirectoryV1(directoryPath) {
  const fd = fs.openSync(
    directoryPath,
    fs.constants.O_RDONLY | fs.constants.O_DIRECTORY,
  );
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function removeBuyLaunchGenerationPublicationIntentV1(intentPath) {
  if (!fs.existsSync(intentPath)) return;
  fs.unlinkSync(intentPath);
  fsyncGenerationDirectoryV1(path.dirname(intentPath));
}

function recoverBuyLaunchGenerationPublicationV1({
  journalPath,
  anchorPath,
  intentPath,
  input,
}) {
  if (!fs.existsSync(intentPath)) return null;
  const recovery = classifyBuyLaunchGenerationPublicationRecoveryV1({
    intent_bytes: readStablePrivateFile(
      intentPath,
      GENERATION_PUBLICATION_INTENT_MAX_BYTES,
    ),
    journal_bytes: generationPublicationObservedBytesV1(journalPath),
    anchor_bytes: generationPublicationObservedBytesV1(anchorPath),
  });
  if (
    recovery.intent.state !== input?.state ||
    recovery.intent.generation !== input?.generation ||
    recovery.intent.occurred_at_ms !== input?.occurred_at_ms
  ) {
    throw new Error("buy_launch_generation_publish_recovery_input_mismatch");
  }
  if (recovery.phase === "intent_only") {
    atomicWritePrivateGenerationBytesV1(
      journalPath,
      recovery.next_bytes,
    );
  }
  if (
    recovery.phase === "intent_only" ||
    recovery.phase === "journal_committed"
  ) {
    atomicWritePrivateGenerationBytesV1(
      anchorPath,
      recovery.next_bytes,
    );
  }
  const verified = classifyBuyLaunchGenerationAuthorityV1(
    readStablePrivateFile(journalPath),
    readStablePrivateFile(anchorPath),
  );
  if (
    verified.sequence !== recovery.next_state.sequence ||
    verified.tip_sha256 !== recovery.next_state.tip_sha256 ||
    verified.generation !== recovery.next_state.generation ||
    verified.ready !== recovery.next_state.ready
  ) {
    throw new Error("buy_launch_generation_publish_recovery_postcheck_failed");
  }
  removeBuyLaunchGenerationPublicationIntentV1(intentPath);
  return Object.freeze({
    ...verified,
    state: recovery.intent.state,
    occurred_at_ms: recovery.intent.occurred_at_ms,
    recovered_publication: true,
  });
}

export function validateBuyLaunchGenerationPublicationTimeV1(
  occurredAtMs,
  nowMs = Date.now(),
) {
  if (
    !Number.isSafeInteger(occurredAtMs) ||
    occurredAtMs <= 0 ||
    !Number.isSafeInteger(nowMs) ||
    nowMs <= 0 ||
    occurredAtMs >
      nowMs + VOID_BUY_COUPLED_GENERATION_MAX_FUTURE_SKEW_MS_V1
  ) {
    throw new Error("buy_launch_generation_publish_time_invalid");
  }
  return occurredAtMs;
}

export async function publishBuyLaunchGenerationTransitionV1(
  input,
  env = process.env,
) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    input.confirmation !== "publishBuyLaunchGenerationTransitionV1" ||
    !BYTES32.test(String(input.generation || "")) ||
    !["active", "revoked"].includes(input.state)
  ) {
    throw new Error("buy_launch_generation_publish_input_invalid");
  }
  validateBuyLaunchGenerationPublicationTimeV1(
    input.occurred_at_ms,
    Date.now(),
  );

  return withBuyLaunchGenerationTransitionPublicationV1(() => {
    const { journalPath, anchorPath, intentPath } =
      buyLaunchGenerationPathsV1(env);

    const recovered = recoverBuyLaunchGenerationPublicationV1({
      journalPath,
      anchorPath,
      intentPath,
      input,
    });
    if (recovered) {
      if (
        recovered.state === input.state &&
        recovered.generation === input.generation &&
        recovered.occurred_at_ms === input.occurred_at_ms
      ) {
        return Object.freeze({
          marker: "VOID_BUY_COUPLED_LIVE_GENERATION_PUBLISH_V1",
          version: 1,
          state: recovered.state,
          generation: recovered.generation,
          sequence: recovered.sequence,
          tip_sha256: recovered.tip_sha256,
          external_anchor_sha256: recovered.external_anchor_sha256,
          journal_path: journalPath,
          anchor_path: anchorPath,
          publication_locked: true,
          async_aware_shared_lock: true,
          crash_recovered: true,
          funds_movement: false,
        });
      }
      throw new Error(
        "buy_launch_generation_pending_publication_recovered_retry_required",
      );
    }

    const journalExists = fs.existsSync(journalPath);
    const anchorExists = fs.existsSync(anchorPath);
    if (journalExists !== anchorExists) {
      throw new Error("buy_launch_generation_publish_partial_state");
    }

    let previousBytes = Buffer.alloc(0);
    let previousState = null;
    if (journalExists) {
      const journalBytes = readStablePrivateFile(journalPath);
      const anchorBytes = readStablePrivateFile(anchorPath);
      previousState = classifyBuyLaunchGenerationAuthorityV1(
        journalBytes,
        anchorBytes,
      );
      previousBytes = journalBytes;
    }

    const event = buildBuyLaunchGenerationEventV1({
      sequence: previousState ? previousState.sequence + 1 : 1,
      previous_event_sha256:
        previousState ? previousState.tip_sha256 : null,
      generation: input.generation,
      state: input.state,
      occurred_at_ms: input.occurred_at_ms,
    });
    const nextBytes = Buffer.concat([
      previousBytes,
      Buffer.from(JSON.stringify(event) + "\n", "utf8"),
    ]);
    const nextState = classifyBuyLaunchGenerationJournalV1(nextBytes);
    const intentBytes = buildBuyLaunchGenerationPublicationIntentV1({
      previous_bytes: previousBytes,
      next_bytes: nextBytes,
      state: input.state,
      generation: input.generation,
      occurred_at_ms: input.occurred_at_ms,
    });

    atomicWritePrivateGenerationBytesV1(intentPath, intentBytes);
    atomicWritePrivateGenerationBytesV1(journalPath, nextBytes);
    atomicWritePrivateGenerationBytesV1(anchorPath, nextBytes);

    const verified = classifyBuyLaunchGenerationAuthorityV1(
      readStablePrivateFile(journalPath),
      readStablePrivateFile(anchorPath),
    );
    if (
      verified.sequence !== nextState.sequence ||
      verified.tip_sha256 !== nextState.tip_sha256 ||
      verified.generation !== nextState.generation ||
      verified.ready !== nextState.ready
    ) {
      throw new Error("buy_launch_generation_publish_postcheck_failed");
    }
    removeBuyLaunchGenerationPublicationIntentV1(intentPath);
    return Object.freeze({
      marker: "VOID_BUY_COUPLED_LIVE_GENERATION_PUBLISH_V1",
      version: 1,
      state: input.state,
      generation: input.generation,
      sequence: verified.sequence,
      tip_sha256: verified.tip_sha256,
      external_anchor_sha256: verified.external_anchor_sha256,
      journal_path: journalPath,
      anchor_path: anchorPath,
      publication_locked: true,
      async_aware_shared_lock: true,
      crash_recovered: false,
      funds_movement: false,
    });
  });
}

export function readBuyLaunchGenerationJournalV1(env = process.env) {
  const { journalPath, anchorPath, intentPath } =
    buyLaunchGenerationPathsV1(env);
  if (fs.existsSync(intentPath)) {
    throw new Error("buy_launch_generation_publication_pending");
  }
  return classifyBuyLaunchGenerationAuthorityV1(
    readStablePrivateFile(journalPath),
    readStablePrivateFile(anchorPath),
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

function readStablePrivateFile(
  filePath,
  maxBytes = LIVE_RECEIPT_MAX_BYTES,
) {
  if (
    typeof filePath !== "string" ||
    !path.isAbsolute(filePath) ||
    path.resolve(filePath) !== filePath
  ) {
    throw new Error("buy_launch_live_receipt_path_invalid");
  }
  if (
    !Number.isSafeInteger(maxBytes) ||
    maxBytes < 1 ||
    maxBytes > GENERATION_PUBLICATION_INTENT_MAX_BYTES
  ) {
    throw new Error("buy_launch_live_receipt_max_bytes_invalid");
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
      listed.size > BigInt(maxBytes)
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
      try { fs.closeSync(fileFd); } catch (closeError) { void closeError; }
    }
    try { fs.closeSync(dirFd); } catch (closeError) { void closeError; }
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

export function sameBuyLaunchGenerationAuthorityV1(
  first,
  second,
) {
  return (
    first?.ready === true &&
    second?.ready === true &&
    first?.external_anchor_verified === true &&
    second?.external_anchor_verified === true &&
    BYTES32.test(String(first.generation || "")) &&
    first.generation === second.generation &&
    SHA256_ID.test(String(first.tip_sha256 || "")) &&
    first.tip_sha256 === second.tip_sha256 &&
    Number.isSafeInteger(first.sequence) &&
    first.sequence >= 1 &&
    first.sequence === second.sequence &&
    SHA256_ID.test(String(first.external_anchor_sha256 || "")) &&
    first.external_anchor_sha256 === second.external_anchor_sha256
  );
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
    generationState?.external_anchor_verified === true &&
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

    const finalGenerationState = readBuyLaunchGenerationJournalV1(env);
    if (
      !sameBuyLaunchGenerationAuthorityV1(
        generationState,
        finalGenerationState,
      ) ||
      classifyBuyLaunchLiveActivationLeaseV1(
        receipt,
        finalGenerationState,
        nowMs,
      ).ready !== true
    ) {
      throw new Error(
        "buy_launch_generation_changed_during_activation_verification",
      );
    }

    return Object.freeze({
      ready: true,
      receipt_id: receipt.activation_receipt_id,
      receipt_sha256: actualSha256,
      source_composition_id: receipt.source_composition_id,
      activation_generation: receipt.activation_generation,
      generation_tip_sha256: receipt.generation_tip_sha256,
      expires_at_ms: receipt.expires_at_ms,
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
      activation_generation: null,
      generation_tip_sha256: null,
      expires_at_ms: null,
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

export const VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1 =
  "VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1";

const REQUEST_AUTHORITY_KEYS = Object.freeze([
  "activation_generation",
  "activation_receipt_id",
  "activation_receipt_sha256",
  "coupled_launch_id",
  "expires_at_ms",
  "generation_tip_sha256",
  "marker",
  "source_composition_id",
  "version",
]);

export function buyLaunchRequestAuthorityMatchesV1(
  request,
  currentGate,
  nowMs = Date.now(),
) {
  try {
    const bound = request?.launch_authority;
    const current = currentGate?.request_authority;
    if (
      currentGate?.ready !== true ||
      !bound ||
      typeof bound !== "object" ||
      Array.isArray(bound) ||
      !current ||
      typeof current !== "object" ||
      Array.isArray(current) ||
      Object.keys(bound).sort().join("\n") !==
        [...REQUEST_AUTHORITY_KEYS].sort().join("\n") ||
      Object.keys(current).sort().join("\n") !==
        [...REQUEST_AUTHORITY_KEYS].sort().join("\n") ||
      bound.marker !== VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1 ||
      current.marker !== VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1 ||
      bound.version !== 1 ||
      current.version !== 1 ||
      bound.coupled_launch_id !== VOID_BUY_COUPLED_LAUNCH_ID_V1 ||
      current.coupled_launch_id !== VOID_BUY_COUPLED_LAUNCH_ID_V1 ||
      bound.source_composition_id !== current.source_composition_id ||
      bound.activation_generation !== current.activation_generation ||
      bound.generation_tip_sha256 !== current.generation_tip_sha256 ||
      !/^voidbclive1_[0-9a-f]{64}$/u.test(
        String(bound.activation_receipt_id || ""),
      ) ||
      !/^voidbclive1_[0-9a-f]{64}$/u.test(
        String(current.activation_receipt_id || ""),
      ) ||
      !HEX64.test(String(bound.activation_receipt_sha256 || "")) ||
      !HEX64.test(String(current.activation_receipt_sha256 || "")) ||
      !Number.isSafeInteger(bound.expires_at_ms) ||
      !Number.isSafeInteger(current.expires_at_ms) ||
      !Number.isSafeInteger(nowMs) ||
      nowMs <= 0 ||
      bound.expires_at_ms <= nowMs ||
      current.expires_at_ms <= nowMs
    ) {
      return false;
    }
    const sameReceipt =
      bound.activation_receipt_id === current.activation_receipt_id &&
      bound.activation_receipt_sha256 === current.activation_receipt_sha256 &&
      bound.expires_at_ms === current.expires_at_ms;
    const coherentRenewal =
      bound.activation_receipt_id !== current.activation_receipt_id &&
      bound.activation_receipt_sha256 !== current.activation_receipt_sha256 &&
      current.expires_at_ms > bound.expires_at_ms;
    return sameReceipt || coherentRenewal;
  } catch (error) {
    void error;
    return false;
  }
}

export function classifyBuyLaunchRequestMutationAdmissionV1(
  request,
  currentGate,
  gateReadStartedAtMs,
  mutationAdmissionNowMs,
) {
  const ready =
    Number.isSafeInteger(gateReadStartedAtMs) &&
    gateReadStartedAtMs > 0 &&
    Number.isSafeInteger(mutationAdmissionNowMs) &&
    mutationAdmissionNowMs >= gateReadStartedAtMs &&
    buyLaunchRequestAuthorityMatchesV1(
      request,
      currentGate,
      mutationAdmissionNowMs,
    );
  return Object.freeze({
    ready,
    gate_read_started_at_ms: gateReadStartedAtMs,
    mutation_admission_at_ms: mutationAdmissionNowMs,
    reason: ready
      ? null
      : "request_launch_authority_expired_or_superseded",
  });
}

export async function withBuyLaunchRequestAuthorityMutationV1(
  request,
  operation,
  env = process.env,
  now = Date.now,
) {
  if (
    typeof operation !== "function" ||
    typeof now !== "function"
  ) {
    throw new Error("buy_launch_request_authority_operation_required");
  }
  return withBuyLaunchGenerationAuthorityLockV1(() => {
    const gateReadStartedAtMs = now();
    const currentGate = readBuyLaunchGateV1(
      env,
      gateReadStartedAtMs,
    );
    const mutationAdmissionNowMs = now();
    const admission =
      classifyBuyLaunchRequestMutationAdmissionV1(
        request,
        currentGate,
        gateReadStartedAtMs,
        mutationAdmissionNowMs,
      );
    if (!admission.ready) {
      throw new Error(admission.reason);
    }
    return operation();
  });
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
      request_authority: null,
    });
  }
  const live = readBuyLaunchLiveActivationV1(source, env, nowMs);
  const requestAuthority = live.ready
    ? Object.freeze({
        marker: VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1,
        version: 1,
        coupled_launch_id: source.id,
        source_composition_id: source.composition_id,
        activation_generation: live.activation_generation,
        generation_tip_sha256: live.generation_tip_sha256,
        activation_receipt_id: live.receipt_id,
        activation_receipt_sha256: live.receipt_sha256,
        expires_at_ms: live.expires_at_ms,
      })
    : null;
  return Object.freeze({
    ready: source.ready && live.ready,
    id: source.id,
    composition_id: source.composition_id,
    source_ready: true,
    live_activation_ready: live.ready,
    live_activation_receipt_id: live.receipt_id,
    live_activation_signer: live.activation_signer,
    live_activation_sovereign_signer: live.sovereign_signer,
    request_authority: requestAuthority,
    reason: live.ready ? null : live.reason,
  });
}
