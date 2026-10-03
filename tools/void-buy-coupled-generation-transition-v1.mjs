#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import {
  buildBuyLaunchGenerationEventV1,
  buyLaunchGenerationExternalAnchorPathV1,
  classifyBuyLaunchGenerationJournalV1,
} from "../src/economic/buy_void_coupled_launch_gate_v1.mjs";

export const VOID_BUY_COUPLED_GENERATION_TRANSITION_V1 =
  "VOID_BUY_COUPLED_GENERATION_TRANSITION_V1";

export const VOID_BUY_COUPLED_GENERATION_TRANSITION_AUTHORITY_V1 =
  Object.freeze({
    explicit_operator_apply_confirmation_required: true,
    runtime_generation_journal_write: true,
    external_high_water_anchor_write: true,
    anchor_written_before_runtime_journal: true,
    partial_apply_fails_closed: true,
    retry_can_finish_anchor_ahead_partial_apply: true,
    environment_mutation: false,
    systemd_or_service_mutation: false,
    receipt_creation: false,
    signature_creation: false,
    private_key_access: false,
    credential_access: false,
    wallet_or_signer_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    wc_ledger_write: false,
    inventory_funding: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLAN_MARKER =
  "VOID_BUY_COUPLED_GENERATION_TRANSITION_PLAN_V1";
const HEX64 = /^[0-9a-f]{64}$/u;
const BYTES32 = /^0x[0-9a-fA-F]{64}$/u;
const TRANSITION_ID = /^voidbcgt1_[0-9a-f]{64}$/u;
const MAX_STATE_BYTES = 64 * 1024;
const MAX_PLAN_BYTES = 256 * 1024;

function fail(code) {
  throw new Error(code);
}

function plain(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (plain(value)) {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key) + ":" + canonicalJson(value[key]),
        )
        .join(",") +
      "}"
    );
  }
  fail("generation_transition_canonical_value_invalid");
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function prettyBytes(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
}

function stateBytesWithEvent(currentBytes, event) {
  const line = Buffer.from(JSON.stringify(event) + "\n", "utf8");
  if (currentBytes === null) return line;
  if (
    !Buffer.isBuffer(currentBytes) ||
    currentBytes.length < 1 ||
    currentBytes.length > MAX_STATE_BYTES ||
    currentBytes[currentBytes.length - 1] !== 0x0a
  ) {
    fail("generation_transition_current_bytes_invalid");
  }
  const target = Buffer.concat([currentBytes, line]);
  if (target.length > MAX_STATE_BYTES) {
    fail("generation_transition_target_too_large");
  }
  return target;
}

function normalizeCurrentBytes(currentBytes) {
  if (currentBytes === null) return null;
  if (!Buffer.isBuffer(currentBytes)) {
    fail("generation_transition_current_bytes_invalid");
  }
  classifyBuyLaunchGenerationJournalV1(currentBytes);
  return Buffer.from(currentBytes);
}

function planBody(plan) {
  const copy = { ...plan };
  delete copy.transition_id;
  return copy;
}

function transitionId(planWithoutId) {
  return (
    "voidbcgt1_" +
    sha256(Buffer.from(canonicalJson(planWithoutId), "utf8"))
  );
}

export function deriveBuyVoidGenerationTransitionPlanV1({
  current_bytes,
  action,
  generation,
  occurred_at_ms,
  data_dir,
  journal_path,
  anchor_path,
}) {
  const currentBytes = normalizeCurrentBytes(current_bytes);
  if (!["activate", "revoke"].includes(action)) {
    fail("generation_transition_action_invalid");
  }
  if (!BYTES32.test(String(generation || ""))) {
    fail("generation_transition_generation_invalid");
  }
  if (
    !Number.isSafeInteger(occurred_at_ms) ||
    occurred_at_ms <= 0
  ) {
    fail("generation_transition_time_invalid");
  }
  for (const [value, code] of [
    [data_dir, "generation_transition_data_dir_invalid"],
    [journal_path, "generation_transition_journal_path_invalid"],
    [anchor_path, "generation_transition_anchor_path_invalid"],
  ]) {
    if (
      typeof value !== "string" ||
      !path.isAbsolute(value) ||
      path.resolve(value) !== value
    ) {
      fail(code);
    }
  }
  const expectedJournal = path.join(
    data_dir,
    "economic",
    "buy-void-coupled-live-generation-v1.jsonl",
  );
  if (journal_path !== expectedJournal) {
    fail("generation_transition_journal_path_mismatch");
  }
  const anchorRelative = path.relative(data_dir, anchor_path);
  if (
    anchorRelative === "" ||
    (
      anchorRelative !== ".." &&
      !anchorRelative.startsWith(".." + path.sep) &&
      !path.isAbsolute(anchorRelative)
    )
  ) {
    fail("generation_transition_anchor_inside_data_dir");
  }

  let sequence = 1;
  let previousEventSha256 = null;
  if (currentBytes !== null) {
    const current =
      classifyBuyLaunchGenerationJournalV1(currentBytes);
    sequence = current.sequence + 1;
    previousEventSha256 = current.tip_sha256;
    if (action === "revoke") {
      if (
        current.ready !== true ||
        current.generation !== generation
      ) {
        fail("generation_transition_revoke_prestate_invalid");
      }
    } else if (
      current.ready !== false ||
      current.generation === generation
    ) {
      fail("generation_transition_activate_prestate_invalid");
    }
  } else if (action !== "activate") {
    fail("generation_transition_first_action_must_activate");
  }

  const event = buildBuyLaunchGenerationEventV1({
    sequence,
    previous_event_sha256: previousEventSha256,
    generation,
    state: action === "activate" ? "active" : "revoked",
    occurred_at_ms,
  });
  const targetBytes = stateBytesWithEvent(currentBytes, event);
  const targetState =
    classifyBuyLaunchGenerationJournalV1(targetBytes);
  if (
    (action === "activate" && targetState.ready !== true) ||
    (action === "revoke" && targetState.ready !== false) ||
    targetState.generation !== generation ||
    targetState.tip_sha256 !== event.event_sha256
  ) {
    fail("generation_transition_target_state_invalid");
  }

  const body = Object.freeze({
    marker: PLAN_MARKER,
    version: 1,
    action,
    generation,
    occurred_at_ms,
    data_dir,
    journal_path,
    anchor_path,
    expected_prestate_sha256:
      currentBytes === null ? null : sha256(currentBytes),
    expected_prestate_bytes:
      currentBytes === null ? 0 : currentBytes.length,
    target_state_sha256: sha256(targetBytes),
    target_state_bytes: targetBytes.length,
    event,
    target_ready: targetState.ready,
    target_sequence: targetState.sequence,
    target_tip_sha256: targetState.tip_sha256,
    apply_order: "external_anchor_then_runtime_journal",
    partial_apply_policy: "hold_until_byte_identical",
    activation_authority: false,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
  });
  return Object.freeze({
    ...body,
    transition_id: transitionId(body),
  });
}

function validatePlanV1(plan) {
  if (
    !plain(plan) ||
    plan.marker !== PLAN_MARKER ||
    plan.version !== 1 ||
    !TRANSITION_ID.test(String(plan.transition_id || "")) ||
    transitionId(planBody(plan)) !== plan.transition_id ||
    !["activate", "revoke"].includes(plan.action) ||
    !BYTES32.test(String(plan.generation || "")) ||
    !(plan.expected_prestate_sha256 === null ||
      HEX64.test(String(plan.expected_prestate_sha256 || ""))) ||
    !HEX64.test(String(plan.target_state_sha256 || "")) ||
    !plain(plan.event)
  ) {
    fail("generation_transition_plan_invalid");
  }
  return plan;
}

function sameIdentity(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.nlink === right.nlink
  );
}

function openPinnedParent(file, label) {
  if (
    typeof file !== "string" ||
    !path.isAbsolute(file) ||
    path.resolve(file) !== file
  ) {
    fail(label + "_path_invalid");
  }
  const noFollow = Number(fs.constants.O_NOFOLLOW || 0);
  const directory = Number(fs.constants.O_DIRECTORY || 0);
  if (noFollow === 0 || directory === 0) {
    fail(label + "_nofollow_unavailable");
  }
  const parsed = path.parse(file);
  const parts = file
    .slice(parsed.root.length)
    .split(path.sep)
    .filter(Boolean);
  const basename = parts.pop();
  if (
    !basename ||
    basename === "." ||
    basename === ".." ||
    parts.some(
      (part) => !part || part === "." || part === "..",
    )
  ) {
    fail(label + "_path_invalid");
  }

  let fd = fs.openSync(
    parsed.root,
    fs.constants.O_RDONLY | directory | noFollow,
  );
  try {
    for (const part of parts) {
      const next = fs.openSync(
        path.join("/proc/self/fd", String(fd), part),
        fs.constants.O_RDONLY | directory | noFollow,
      );
      fs.closeSync(fd);
      fd = next;
    }
    const fdStat = fs.fstatSync(fd, { bigint: true });
    const parentPath = path.dirname(file);
    const canonical = fs.realpathSync.native(parentPath);
    const pathStat = fs.lstatSync(parentPath, { bigint: true });
    const uid =
      typeof process.getuid === "function"
        ? BigInt(process.getuid())
        : null;
    if (
      canonical !== parentPath ||
      !fdStat.isDirectory() ||
      !pathStat.isDirectory() ||
      pathStat.isSymbolicLink() ||
      !sameIdentity(fdStat, pathStat) ||
      (uid !== null && fdStat.uid !== uid) ||
      (fdStat.mode & 0o077n) !== 0n
    ) {
      fail(label + "_parent_not_private_or_bound");
    }
    return Object.freeze({
      fd,
      parent_path: parentPath,
      parent_stat: fdStat,
      proc_path: path.join("/proc/self/fd", String(fd)),
      basename,
    });
  } catch (error) {
    try {
      fs.closeSync(fd);
    } catch {}
    throw error;
  }
}

function readPrivateMaybe(file, label) {
  const parent = openPinnedParent(file, label);
  let fd = -1;
  try {
    const procFile = path.join(parent.proc_path, parent.basename);
    let listed;
    try {
      listed = fs.lstatSync(procFile, { bigint: true });
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        String(error.code) === "ENOENT"
      ) {
        return null;
      }
      throw error;
    }
    const uid =
      typeof process.getuid === "function"
        ? BigInt(process.getuid())
        : null;
    if (
      !listed.isFile() ||
      listed.isSymbolicLink() ||
      listed.nlink !== 1n ||
      (listed.mode & 0o077n) !== 0n ||
      (uid !== null && listed.uid !== uid) ||
      listed.size < 1n ||
      listed.size > BigInt(MAX_STATE_BYTES)
    ) {
      fail(label + "_file_not_private");
    }
    fd = fs.openSync(
      procFile,
      fs.constants.O_RDONLY |
        Number(fs.constants.O_NOFOLLOW || 0),
    );
    const before = fs.fstatSync(fd, { bigint: true });
    if (!sameIdentity(listed, before)) {
      fail(label + "_identity_changed");
    }
    const bytes = fs.readFileSync(fd);
    const after = fs.fstatSync(fd, { bigint: true });
    const visible = fs.lstatSync(procFile, { bigint: true });
    if (
      bytes.length !== Number(after.size) ||
      !sameIdentity(before, after) ||
      !sameIdentity(after, visible)
    ) {
      fail(label + "_changed_during_read");
    }
    return bytes;
  } finally {
    if (fd >= 0) {
      try {
        fs.closeSync(fd);
      } catch {}
    }
    try {
      fs.closeSync(parent.fd);
    } catch {}
  }
}

function stateClass(bytes, expectedSha, targetSha) {
  if (bytes === null) {
    return expectedSha === null ? "pre" : "other";
  }
  const actual = sha256(bytes);
  if (actual === targetSha) return "target";
  if (expectedSha !== null && actual === expectedSha) {
    return "pre";
  }
  return "other";
}

function atomicReplacePrivateFile(file, bytes, label) {
  const parent = openPinnedParent(file, label);
  let tempFd = -1;
  let renamed = false;
  const suffix =
    sha256(bytes).slice(0, 16) + "." + String(process.pid);
  const tempName = "." + parent.basename + ".next." + suffix;
  const tempProc = path.join(parent.proc_path, tempName);
  const targetProc = path.join(parent.proc_path, parent.basename);
  try {
    tempFd = fs.openSync(
      tempProc,
      fs.constants.O_RDWR |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        Number(fs.constants.O_NOFOLLOW || 0),
      0o600,
    );
    fs.writeFileSync(tempFd, bytes);
    fs.fchmodSync(tempFd, 0o600);
    fs.fsyncSync(tempFd);
    const tempStat = fs.fstatSync(tempFd, { bigint: true });
    if (
      !tempStat.isFile() ||
      tempStat.nlink !== 1n ||
      tempStat.size !== BigInt(bytes.length) ||
      Number(tempStat.mode & 0o777n) !== 0o600
    ) {
      fail(label + "_temp_invalid");
    }

    const parentNow = fs.lstatSync(
      parent.parent_path,
      { bigint: true },
    );
    if (!sameIdentity(parent.parent_stat, parentNow)) {
      fail(label + "_parent_changed_before_rename");
    }

    fs.renameSync(tempProc, targetProc);
    renamed = true;
    fs.fsyncSync(parent.fd);

    const parentAfter = fs.lstatSync(
      parent.parent_path,
      { bigint: true },
    );
    const targetAfter = fs.lstatSync(file, { bigint: true });
    if (
      !sameIdentity(parent.parent_stat, parentAfter) ||
      !targetAfter.isFile() ||
      targetAfter.isSymbolicLink() ||
      targetAfter.nlink !== 1n ||
      targetAfter.size !== BigInt(bytes.length) ||
      Number(targetAfter.mode & 0o777n) !== 0o600
    ) {
      fail(label + "_postwrite_identity_invalid");
    }
  } finally {
    if (tempFd >= 0) {
      try {
        fs.closeSync(tempFd);
      } catch {}
    }
    if (!renamed) {
      try {
        if (fs.existsSync(tempProc)) fs.unlinkSync(tempProc);
      } catch {}
    }
    try {
      fs.closeSync(parent.fd);
    } catch {}
  }
}

function targetBytesForPlan(plan, preBytes) {
  const target = stateBytesWithEvent(preBytes, plan.event);
  if (
    sha256(target) !== plan.target_state_sha256 ||
    target.length !== plan.target_state_bytes
  ) {
    fail("generation_transition_target_digest_mismatch");
  }
  return target;
}

export function applyBuyVoidGenerationTransitionAtPathsV1({
  plan,
  journal_path,
  anchor_path,
}) {
  validatePlanV1(plan);
  if (
    journal_path !== plan.journal_path ||
    anchor_path !== plan.anchor_path
  ) {
    fail("generation_transition_apply_path_mismatch");
  }

  let journal = readPrivateMaybe(journal_path, "generation_journal");
  let anchor = readPrivateMaybe(anchor_path, "generation_anchor");
  const journalClass = stateClass(
    journal,
    plan.expected_prestate_sha256,
    plan.target_state_sha256,
  );
  const anchorClass = stateClass(
    anchor,
    plan.expected_prestate_sha256,
    plan.target_state_sha256,
  );

  if (
    journalClass === "other" ||
    anchorClass === "other" ||
    (journalClass === "target" && anchorClass === "pre")
  ) {
    fail("generation_transition_apply_prestate_mismatch");
  }

  const preBytes =
    journalClass === "pre"
      ? journal
      : anchorClass === "pre"
        ? anchor
        : (() => {
            if (plan.expected_prestate_sha256 === null) return null;
            fail("generation_transition_prestate_unavailable");
          })();
  const targetBytes =
    journalClass === "target" && anchorClass === "target"
      ? journal
      : targetBytesForPlan(plan, preBytes);

  if (anchorClass === "pre") {
    atomicReplacePrivateFile(
      anchor_path,
      targetBytes,
      "generation_anchor",
    );
    anchor = readPrivateMaybe(anchor_path, "generation_anchor");
    if (
      anchor === null ||
      sha256(anchor) !== plan.target_state_sha256
    ) {
      fail("generation_transition_anchor_publish_failed");
    }
  }

  if (journalClass === "pre") {
    atomicReplacePrivateFile(
      journal_path,
      targetBytes,
      "generation_journal",
    );
    journal = readPrivateMaybe(journal_path, "generation_journal");
    if (
      journal === null ||
      sha256(journal) !== plan.target_state_sha256
    ) {
      fail("generation_transition_journal_publish_failed");
    }
  }

  journal = readPrivateMaybe(journal_path, "generation_journal");
  anchor = readPrivateMaybe(anchor_path, "generation_anchor");
  if (
    journal === null ||
    anchor === null ||
    !journal.equals(anchor) ||
    sha256(journal) !== plan.target_state_sha256
  ) {
    fail("generation_transition_final_mirror_mismatch");
  }
  const finalState =
    classifyBuyLaunchGenerationJournalV1(journal);
  if (
    finalState.tip_sha256 !== plan.target_tip_sha256 ||
    finalState.sequence !== plan.target_sequence ||
    finalState.ready !== plan.target_ready
  ) {
    fail("generation_transition_final_state_mismatch");
  }

  return Object.freeze({
    marker: VOID_BUY_COUPLED_GENERATION_TRANSITION_V1,
    status: "GENERATION_TRANSITION_APPLIED",
    transition_id: plan.transition_id,
    action: plan.action,
    generation: plan.generation,
    target_state_sha256: plan.target_state_sha256,
    target_tip_sha256: plan.target_tip_sha256,
    target_sequence: plan.target_sequence,
    target_ready: plan.target_ready,
    mirror_byte_identical: true,
    anchor_published_first: true,
    service_restart: false,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
  });
}

function readPlan(file) {
  const bytes = readPrivateMaybe(file, "generation_plan");
  if (
    bytes === null ||
    bytes.length < 2 ||
    bytes.length > MAX_PLAN_BYTES
  ) {
    fail("generation_transition_plan_file_invalid");
  }
  let plan;
  try {
    plan = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail("generation_transition_plan_json_invalid");
  }
  return validatePlanV1(plan);
}

function writeCreateOnlyPrivate(file, bytes, label) {
  const parent = openPinnedParent(file, label);
  let fd = -1;
  try {
    fd = fs.openSync(
      path.join(parent.proc_path, parent.basename),
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        Number(fs.constants.O_NOFOLLOW || 0),
      0o600,
    );
    fs.writeFileSync(fd, bytes);
    fs.fchmodSync(fd, 0o600);
    fs.fsyncSync(fd);
    fs.fsyncSync(parent.fd);
  } finally {
    if (fd >= 0) fs.closeSync(fd);
    fs.closeSync(parent.fd);
  }
}

function outsideRepository(file) {
  const relative = path.relative(ROOT, file);
  return (
    relative === ".." ||
    relative.startsWith(".." + path.sep) ||
    path.isAbsolute(relative)
  );
}

function requireAbsoluteDataDir(value) {
  if (
    typeof value !== "string" ||
    !path.isAbsolute(value) ||
    path.resolve(value) !== value
  ) {
    fail("generation_transition_data_dir_invalid");
  }
  return value;
}

function currentMirroredBytes(journalPath, anchorPath) {
  const journal = readPrivateMaybe(
    journalPath,
    "generation_journal",
  );
  const anchor = readPrivateMaybe(
    anchorPath,
    "generation_anchor",
  );
  if (journal === null && anchor === null) return null;
  if (
    journal === null ||
    anchor === null ||
    !journal.equals(anchor)
  ) {
    fail("generation_transition_current_mirror_mismatch");
  }
  classifyBuyLaunchGenerationJournalV1(journal);
  return journal;
}

async function main(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      "data-dir": { type: "string" },
      action: { type: "string" },
      generation: { type: "string" },
      output: { type: "string" },
      plan: { type: "string" },
      confirm: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: true,
    strict: true,
  });
  const command = positionals[0] || "";
  if (values.help || command === "help") {
    console.log(
      "plan --data-dir /abs --action activate|revoke " +
      "--generation 0x<64hex> --output /abs/plan.json\n" +
      "apply --data-dir /abs --plan /abs/plan.json " +
      "--confirm <exact-confirmation>",
    );
    return;
  }

  const dataDir = requireAbsoluteDataDir(values["data-dir"]);
  const journalPath = path.join(
    dataDir,
    "economic",
    "buy-void-coupled-live-generation-v1.jsonl",
  );
  const anchorPath = buyLaunchGenerationExternalAnchorPathV1();
  const relativeAnchor = path.relative(dataDir, anchorPath);
  if (
    relativeAnchor === "" ||
    (
      relativeAnchor !== ".." &&
      !relativeAnchor.startsWith(".." + path.sep) &&
      !path.isAbsolute(relativeAnchor)
    )
  ) {
    fail("generation_transition_anchor_inside_data_dir");
  }

  if (command === "plan") {
    if (
      !values.action ||
      !values.generation ||
      !values.output ||
      !path.isAbsolute(values.output) ||
      !outsideRepository(values.output)
    ) {
      fail("generation_transition_plan_arguments_invalid");
    }
    const current = currentMirroredBytes(
      journalPath,
      anchorPath,
    );
    const plan = deriveBuyVoidGenerationTransitionPlanV1({
      current_bytes: current,
      action: values.action,
      generation: values.generation,
      occurred_at_ms: Date.now(),
      data_dir: dataDir,
      journal_path: journalPath,
      anchor_path: anchorPath,
    });
    writeCreateOnlyPrivate(
      values.output,
      prettyBytes(plan),
      "generation_plan_output",
    );
    console.log(VOID_BUY_COUPLED_GENERATION_TRANSITION_V1);
    console.log("status=PLAN_GREEN_NO_AUTHORITY_STATE_WRITE");
    console.log("transition_id=" + plan.transition_id);
    console.log("target_state_sha256=" + plan.target_state_sha256);
    console.log("target_tip_sha256=" + plan.target_tip_sha256);
    console.log(
      "apply_confirmation=" +
        "apply-buy-void-generation-v1:" +
        plan.transition_id +
        ":" +
        plan.target_state_sha256,
    );
    console.log("generation_state_mutation=false");
    console.log("funds_movement=false");
    return;
  }

  if (command === "apply") {
    if (!values.plan || !values.confirm) {
      fail("generation_transition_apply_arguments_invalid");
    }
    const plan = readPlan(values.plan);
    if (
      plan.data_dir !== dataDir ||
      plan.journal_path !== journalPath ||
      plan.anchor_path !== anchorPath
    ) {
      fail("generation_transition_plan_runtime_path_mismatch");
    }
    const confirmation =
      "apply-buy-void-generation-v1:" +
      plan.transition_id +
      ":" +
      plan.target_state_sha256;
    if (values.confirm !== confirmation) {
      fail("generation_transition_confirmation_mismatch");
    }
    const result = applyBuyVoidGenerationTransitionAtPathsV1({
      plan,
      journal_path: journalPath,
      anchor_path: anchorPath,
    });
    console.log(VOID_BUY_COUPLED_GENERATION_TRANSITION_V1);
    for (const [key, value] of Object.entries(result)) {
      if (key === "marker") continue;
      console.log(key + "=" + String(value));
    }
    return;
  }

  fail("generation_transition_command_invalid");
}

const direct =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (direct) {
  try {
    await main(process.argv.slice(2));
  } catch (error) {
    console.error(
      VOID_BUY_COUPLED_GENERATION_TRANSITION_V1 + "_HOLD",
    );
    console.error(
      "reason=" +
        (error instanceof Error ? error.message : String(error)),
    );
    process.exitCode = 2;
  }
}
