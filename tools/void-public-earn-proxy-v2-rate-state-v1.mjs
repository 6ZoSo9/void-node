#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import {
  VOID_PUBLIC_EARN_PROXY_V2_EDGE_CONTRACT_V1,
  classifyVoidPublicEarnProxyV2EdgeContractV1,
} from "./void-public-earn-proxy-v2-edge-contract-v1.mjs";

export const VOID_PUBLIC_EARN_PROXY_V2_RATE_STATE_V1 =
  "VOID_PUBLIC_EARN_PROXY_V2_RATE_STATE_V1";

export const VOID_PUBLIC_EARN_PROXY_V2_RATE_STATE_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    exact_public_earn_edge_contract_reused: true,
    single_process_admission_serialized: true,
    claim_submit_separate_rate_buckets: true,
    admitted_event_persisted_before_return: true,
    atomic_state_replacement: true,
    file_fsync_required: true,
    parent_directory_fsync_required: true,
    nofollow_state_read_required: true,
    retained_parent_descriptor_required: true,
    private_state_file_required: true,
    private_state_directory_required: true,
    state_replay_after_restart: true,
    crash_after_persist_before_forward_is_conservative_rate_debit: true,
    source_identity_forwarded_downstream: false,
    self_issued_executor_identity_used_for_rate_authority: false,
    bearer_capability_used_for_rate_authority: false,
    multi_process_lock_proven: false,
    live_state_custody_proven: false,
    http_parser_stream_binding_proven: false,
    connector_process_identity_proven: false,
    local_transport_trust_proven: false,
    tailscale_funnel_configuration_verified: false,
    runtime_integration: false,
    paid_work_dispatch: false,
    work_credit_write: false,
    wallet_or_signer_access: false,
    transaction_broadcast: false,
    public_presale_activation: false,
    funds_movement: false,
    nat_independent_participant_isolation_proven: false,
  });

const MAX_RATE_EVENTS = 4096;
const MAX_STATE_BYTES = 1024 * 1024;
const SOURCE_KEY = /^voidcrsrc1_[0-9a-f]{64}$/u;
let tempSequence = 0;

function fail(code) {
  throw new Error(code);
}

function currentUid() {
  if (typeof process.getuid !== "function") {
    fail("public_earn_rate_state_uid_unavailable");
  }
  return process.getuid();
}

function sameMeta(a, b) {
  return (
    a.dev === b.dev &&
    a.ino === b.ino &&
    a.uid === b.uid &&
    a.gid === b.gid &&
    a.mode === b.mode &&
    a.nlink === b.nlink &&
    a.size === b.size &&
    a.mtimeMs === b.mtimeMs &&
    a.ctimeMs === b.ctimeMs
  );
}

function sameDirectoryIdentity(a, b) {
  return (
    a.dev === b.dev &&
    a.ino === b.ino &&
    a.uid === b.uid &&
    a.gid === b.gid &&
    a.mode === b.mode
  );
}

function openPrivateParent(stateFile) {
  if (
    typeof stateFile !== "string" ||
    !path.isAbsolute(stateFile) ||
    path.resolve(stateFile) !== stateFile
  ) {
    fail("public_earn_rate_state_path_invalid");
  }
  const parent = path.dirname(stateFile);
  const leaf = path.basename(stateFile);
  if (
    !leaf ||
    leaf === "." ||
    leaf === ".." ||
    leaf.includes("/") ||
    leaf.includes("\0")
  ) {
    fail("public_earn_rate_state_leaf_invalid");
  }

  let real;
  let visible;
  let fd;
  try {
    real = fs.realpathSync.native(parent);
    visible = fs.lstatSync(parent);
  } catch {
    fail("public_earn_rate_state_parent_unavailable");
  }
  if (
    real !== parent ||
    !visible.isDirectory() ||
    visible.isSymbolicLink() ||
    visible.uid !== currentUid() ||
    (visible.mode & 0o077) !== 0
  ) {
    fail("public_earn_rate_state_parent_invalid");
  }

  try {
    fd = fs.openSync(
      parent,
      fs.constants.O_RDONLY |
        fs.constants.O_DIRECTORY |
        fs.constants.O_NOFOLLOW,
    );
  } catch {
    fail("public_earn_rate_state_parent_open_failed");
  }

  try {
    const opened = fs.fstatSync(fd);
    if (!sameDirectoryIdentity(visible, opened)) {
      fail("public_earn_rate_state_parent_open_identity_mismatch");
    }
    const visibleAfter = fs.lstatSync(parent);
    if (
      !sameDirectoryIdentity(opened, visibleAfter) ||
      fs.realpathSync.native(parent) !== parent
    ) {
      fail("public_earn_rate_state_parent_visible_identity_changed");
    }
    return Object.freeze({
      parent,
      leaf,
      fd,
      dev: opened.dev,
      ino: opened.ino,
      uid: opened.uid,
      gid: opened.gid,
      mode: opened.mode,
    });
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
}

function closePrivateParent(binding) {
  fs.closeSync(binding.fd);
}

function assertPrivateParentStable(binding) {
  const opened = fs.fstatSync(binding.fd);
  if (
    opened.dev !== binding.dev ||
    opened.ino !== binding.ino ||
    opened.uid !== binding.uid ||
    opened.gid !== binding.gid ||
    opened.mode !== binding.mode ||
    !opened.isDirectory()
  ) {
    fail("public_earn_rate_state_parent_descriptor_changed");
  }

  let visible;
  let real;
  try {
    visible = fs.lstatSync(binding.parent);
    real = fs.realpathSync.native(binding.parent);
  } catch {
    fail("public_earn_rate_state_parent_visible_identity_changed");
  }
  if (
    real !== binding.parent ||
    visible.isSymbolicLink() ||
    !visible.isDirectory() ||
    !sameDirectoryIdentity(opened, visible)
  ) {
    fail("public_earn_rate_state_parent_visible_identity_changed");
  }
}

function viaPrivateParent(binding, leaf = binding.leaf) {
  if (
    typeof leaf !== "string" ||
    !leaf ||
    leaf.includes("/") ||
    leaf.includes("\0")
  ) {
    fail("public_earn_rate_state_leaf_invalid");
  }
  return "/proc/self/fd/" + String(binding.fd) + "/" + leaf;
}

function inspectExistingFile(binding) {
  const stateVia = viaPrivateParent(binding);
  let meta;
  try {
    meta = fs.lstatSync(stateVia);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    fail("public_earn_rate_state_path_lstat_failed");
  }
  if (
    !meta.isFile() ||
    meta.isSymbolicLink() ||
    meta.nlink !== 1 ||
    meta.uid !== currentUid() ||
    (meta.mode & 0o077) !== 0 ||
    meta.size < 2 ||
    meta.size > MAX_STATE_BYTES
  ) {
    fail("public_earn_rate_state_file_invalid");
  }
  return meta;
}

function validateEvents(events) {
  if (!Array.isArray(events) || events.length > MAX_RATE_EVENTS) {
    fail("public_earn_rate_state_events_invalid");
  }
  return events.map((event) => {
    if (
      !event ||
      typeof event !== "object" ||
      Array.isArray(event) ||
      Object.keys(event).sort().join("\n") !==
        "at_ms\nroute\nsource_key" ||
      !SOURCE_KEY.test(String(event.source_key || "")) ||
      (event.route !== "claim" && event.route !== "submit") ||
      !Number.isSafeInteger(event.at_ms) ||
      event.at_ms < 0
    ) {
      fail("public_earn_rate_state_event_invalid");
    }
    return Object.freeze({
      source_key: event.source_key,
      route: event.route,
      at_ms: event.at_ms,
    });
  });
}

function decodeState(bytes) {
  if (
    !Buffer.isBuffer(bytes) ||
    bytes.length < 2 ||
    bytes.length > MAX_STATE_BYTES
  ) {
    fail("public_earn_rate_state_bytes_invalid");
  }
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail("public_earn_rate_state_json_invalid");
  }
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).sort().join("\n") !== "events\nmarker\nversion" ||
    value.marker !== VOID_PUBLIC_EARN_PROXY_V2_RATE_STATE_V1 ||
    value.version !== 1
  ) {
    fail("public_earn_rate_state_shape_invalid");
  }
  return Object.freeze(validateEvents(value.events));
}

function encodeState(events) {
  const body = {
    marker: VOID_PUBLIC_EARN_PROXY_V2_RATE_STATE_V1,
    version: 1,
    events: validateEvents(events),
  };
  const bytes = Buffer.from(JSON.stringify(body) + "\n", "utf8");
  if (bytes.length > MAX_STATE_BYTES) {
    fail("public_earn_rate_state_bytes_exceeded");
  }
  return bytes;
}

function readBoundRateState(binding) {
  assertPrivateParentStable(binding);
  const existing = inspectExistingFile(binding);
  if (!existing) return Object.freeze([]);

  const stateVia = viaPrivateParent(binding);
  let fd;
  try {
    fd = fs.openSync(
      stateVia,
      fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW,
    );
  } catch {
    fail("public_earn_rate_state_open_failed");
  }

  try {
    const before = fs.fstatSync(fd);
    if (
      !before.isFile() ||
      before.nlink !== 1 ||
      before.uid !== currentUid() ||
      (before.mode & 0o077) !== 0 ||
      before.size < 2 ||
      before.size > MAX_STATE_BYTES ||
      !sameMeta(existing, before)
    ) {
      fail("public_earn_rate_state_descriptor_invalid");
    }

    const bytes = fs.readFileSync(fd);
    const after = fs.fstatSync(fd);
    let visibleAfter;
    try {
      visibleAfter = fs.lstatSync(stateVia);
    } catch {
      fail("public_earn_rate_state_visible_changed_during_read");
    }
    if (
      !sameMeta(before, after) ||
      !sameMeta(after, visibleAfter) ||
      bytes.length !== before.size
    ) {
      fail("public_earn_rate_state_changed_during_read");
    }
    assertPrivateParentStable(binding);
    return decodeState(bytes);
  } finally {
    fs.closeSync(fd);
  }
}

export function readVoidPublicEarnProxyV2RateStateV1(stateFile) {
  const binding = openPrivateParent(stateFile);
  try {
    return readBoundRateState(binding);
  } finally {
    closePrivateParent(binding);
  }
}

function writeBoundStateAtomic(binding, events) {
  const bytes = encodeState(events);
  tempSequence += 1;
  const tempName =
    "." +
    binding.leaf +
    ".tmp." +
    String(process.pid) +
    "." +
    String(Date.now()) +
    "." +
    String(tempSequence);
  const tempVia = viaPrivateParent(binding, tempName);
  const stateVia = viaPrivateParent(binding);

  let fd;
  let created = false;
  let tempIdentity = null;
  try {
    assertPrivateParentStable(binding);
    inspectExistingFile(binding);

    fd = fs.openSync(
      tempVia,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        fs.constants.O_NOFOLLOW,
      0o600,
    );
    created = true;
    tempIdentity = fs.fstatSync(fd);
    if (
      !tempIdentity.isFile() ||
      tempIdentity.nlink !== 1 ||
      tempIdentity.uid !== currentUid() ||
      (tempIdentity.mode & 0o077) !== 0
    ) {
      fail("public_earn_rate_state_temp_descriptor_invalid");
    }

    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
    const written = fs.fstatSync(fd);
    if (
      written.dev !== tempIdentity.dev ||
      written.ino !== tempIdentity.ino ||
      written.uid !== tempIdentity.uid ||
      written.gid !== tempIdentity.gid
    ) {
      fail("public_earn_rate_state_temp_descriptor_changed");
    }
    fs.closeSync(fd);
    fd = undefined;

    const tempVisible = fs.lstatSync(tempVia);
    if (
      tempVisible.dev !== tempIdentity.dev ||
      tempVisible.ino !== tempIdentity.ino ||
      tempVisible.uid !== tempIdentity.uid ||
      tempVisible.gid !== tempIdentity.gid
    ) {
      fail("public_earn_rate_state_temp_visible_identity_changed");
    }

    assertPrivateParentStable(binding);
    fs.renameSync(tempVia, stateVia);
    created = false;
    fs.fsyncSync(binding.fd);
    assertPrivateParentStable(binding);

    const reread = readBoundRateState(binding);
    if (
      JSON.stringify(reread) !==
      JSON.stringify(validateEvents(events))
    ) {
      fail("public_earn_rate_state_postwrite_mismatch");
    }
  } catch (error) {
    const cleanupErrors = [];
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
    }
    if (created && tempIdentity) {
      try {
        const visible = fs.lstatSync(tempVia);
        if (
          visible.dev === tempIdentity.dev &&
          visible.ino === tempIdentity.ino
        ) {
          fs.unlinkSync(tempVia);
          fs.fsyncSync(binding.fd);
        }
      } catch (cleanupError) {
        if (cleanupError?.code !== "ENOENT") {
          cleanupErrors.push(cleanupError);
        }
      }
    }
    if (cleanupErrors.length) {
      throw new AggregateError(
        [error, ...cleanupErrors],
        "public_earn_rate_state_cleanup_failed",
      );
    }
    throw error;
  }
}

function integer(value, min, max, code) {
  if (
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  ) {
    fail(code);
  }
  return value;
}

export function createVoidPublicEarnProxyV2RateStateV1({
  state_file,
} = {}) {
  const initialBinding = openPrivateParent(state_file);
  closePrivateParent(initialBinding);
  let queue = Promise.resolve();

  const admitUnlocked = async ({
    connection_prefix,
    headers,
    now_ms,
  } = {}) => {
    integer(
      now_ms,
      0,
      Number.MAX_SAFE_INTEGER,
      "public_earn_rate_state_now_invalid",
    );
    const binding = openPrivateParent(state_file);
    try {
      const prior = readBoundRateState(binding);
      const planned =
        classifyVoidPublicEarnProxyV2EdgeContractV1({
          connection_prefix,
          headers,
          now_ms,
          prior_events: prior,
        });

      if (planned.ok !== true) {
        if (planned.status === "RATE_LIMITED") {
          assertPrivateParentStable(binding);
          return Object.freeze({
            ...planned,
            rate_state_durable: true,
            state_file,
            state_event_count: prior.length,
            forwarded: false,
          });
        }
        fail(
          "public_earn_rate_state_planner_hold:" +
            String(planned.reason || "unknown"),
        );
      }

      if (
        planned.marker !==
          VOID_PUBLIC_EARN_PROXY_V2_EDGE_CONTRACT_V1 ||
        planned.rate_event_state_mutation_required !== true ||
        !Array.isArray(planned.next_rate_events)
      ) {
        fail("public_earn_rate_state_planner_contract_invalid");
      }

      writeBoundStateAtomic(binding, planned.next_rate_events);
      return Object.freeze({
        ...planned,
        rate_state_durable: true,
        admitted_event_persisted_before_return: true,
        state_file,
        state_event_count: planned.next_rate_events.length,
        forwarded: false,
        http_parser_stream_binding_proven: false,
        connector_process_identity_proven: false,
        live_state_custody_proven: false,
        local_transport_trust_proven: false,
        tailscale_funnel_configuration_verified: false,
        runtime_integration: false,
        work_credit_write: false,
        funds_movement: false,
        authority:
          VOID_PUBLIC_EARN_PROXY_V2_RATE_STATE_AUTHORITY_V1,
      });
    } finally {
      closePrivateParent(binding);
    }
  };

  return Object.freeze({
    marker: VOID_PUBLIC_EARN_PROXY_V2_RATE_STATE_V1,
    source_marker: VOID_PUBLIC_EARN_PROXY_V2_EDGE_CONTRACT_V1,
    state_file,
    admit(input) {
      const result = queue.then(() => admitUnlocked(input));
      queue = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
    authority:
      VOID_PUBLIC_EARN_PROXY_V2_RATE_STATE_AUTHORITY_V1,
  });
}
