#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  CONFIRMATION,
  EXPECTED_HOST,
  MARKER,
  collectAuthenticatedPaidWorkRuntimeListenerCgroupEvidenceV1,
} from "../tools/authenticated-paid-work-runtime-listener-cgroup-operator-collector-v1.mjs";

const CGROUP =
  "/user.slice/user-1000.slice/user@1000.service/app.slice/void-agent-paid-work-submission-receiver-v1.service";
const MAIN_PID = 4812;
const OWNER_PID = 4820;
const FOREIGN_PID = 6000;
const SOCKET_INODE = 81726354;
const NET_NS_INODE = 4026531840;
const UID = 1000;

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function statLine(pid, comm, startTime) {
  const fields = [
    "S",
    "1",
    "1",
    "1",
    "0",
    "-1",
    "4194304",
    "0",
    "0",
    "0",
    "0",
    "0",
    "0",
    "0",
    "0",
    "20",
    "0",
    "1",
    "0",
    String(startTime),
    "0",
    "0",
  ];
  return `${pid} (${comm}) ${fields.join(" ")}\n`;
}

function tcpTable({ addressHex = "0100007F", inode = SOCKET_INODE, uid = UID } = {}) {
  return [
    "  sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode",
    `   0: ${addressHex}:105B 00000000:0000 0A 00000000:00000000 00:00000000 00000000 ${uid} 0 ${inode}`,
    "",
  ].join("\n");
}

function expectThrow(fn, pattern, label) {
  let error = null;
  try {
    fn();
  } catch (caught) {
    error = caught;
  }
  assert.ok(error, `${label}: expected throw`);
  assert.match(String(error.message || error), pattern, `${label}: wrong error`);
}

function makeAdapters(overrides = {}) {
  const access = [];
  const times = [
    new Date("2026-08-05T13:10:00.000Z"),
    new Date("2026-08-05T13:10:04.000Z"),
  ];
  const showValues = overrides.showValues ?? [
    { active_state: "active", main_pid: MAIN_PID, control_group: CGROUP },
    { active_state: "active", main_pid: MAIN_PID, control_group: CGROUP },
  ];
  const cgroupValues = overrides.cgroupValues ?? [
    `${MAIN_PID}\n${OWNER_PID}\n`,
    `${MAIN_PID}\n${OWNER_PID}\n`,
  ];
  const tcpValues = overrides.tcpValues ?? [tcpTable(), tcpTable()];
  const tcp6Values = overrides.tcp6Values ?? ["header\n", "header\n"];
  const startTimes = {
    [MAIN_PID]: overrides.mainStartTimes ?? [99100221, 99100221],
    [OWNER_PID]: overrides.ownerStartTimes ?? [99100243, 99100243, 99100243],
    [FOREIGN_PID]: [88110001, 88110001],
  };
  const cgroupReads = new Map();
  const statReads = new Map();
  let showIndex = 0;
  let cgroupIndex = 0;
  let tcpIndex = 0;
  let tcp6Index = 0;
  let timeIndex = 0;

  const fdLinks = overrides.fdLinks ?? {
    [MAIN_PID]: [],
    [OWNER_PID]: [`socket:[${SOCKET_INODE}]`],
    [FOREIGN_PID]: [],
  };

  const adapters = {
    hostname: () => overrides.hostname ?? EXPECTED_HOST,
    uid: () => UID,
    now: () => times[Math.min(timeIndex++, times.length - 1)],
    systemctlShow: () => {
      access.push("systemctl-show");
      return structuredClone(showValues[Math.min(showIndex++, showValues.length - 1)]);
    },
    readText: (path) => {
      access.push(path);
      if (path.endsWith("/cgroup.procs")) {
        return cgroupValues[Math.min(cgroupIndex++, cgroupValues.length - 1)];
      }
      if (path === `/proc/${MAIN_PID}/net/tcp`) {
        return tcpValues[Math.min(tcpIndex++, tcpValues.length - 1)];
      }
      if (path === `/proc/${MAIN_PID}/net/tcp6`) {
        return tcp6Values[Math.min(tcp6Index++, tcp6Values.length - 1)];
      }
      const statMatch = /^\/proc\/(\d+)\/stat$/.exec(path);
      if (statMatch) {
        const pid = Number(statMatch[1]);
        const count = statReads.get(pid) ?? 0;
        statReads.set(pid, count + 1);
        const sequence = startTimes[pid];
        if (!sequence) throw new Error(`unexpected stat pid ${pid}`);
        const value = sequence[Math.min(count, sequence.length - 1)];
        return statLine(pid, `proof-${pid}`, value);
      }
      const cgroupMatch = /^\/proc\/(\d+)\/cgroup$/.exec(path);
      if (cgroupMatch) {
        const pid = Number(cgroupMatch[1]);
        const count = cgroupReads.get(pid) ?? 0;
        cgroupReads.set(pid, count + 1);
        const replacement = overrides.changedCgroupPid === pid && count > 0
          ? `${CGROUP}-changed`
          : CGROUP;
        return `0::${replacement}\n`;
      }
      throw new Error(`unexpected read path ${path}`);
    },
    statInode: (path) => {
      access.push(path);
      if (!/^\/proc\/(4812|4820)\/ns\/net$/.test(path)) {
        throw new Error(`unexpected namespace path ${path}`);
      }
      return NET_NS_INODE;
    },
    listSameUidPids: () => {
      access.push("same-uid-pid-scan");
      return [MAIN_PID, OWNER_PID, FOREIGN_PID];
    },
    listFdLinks: (pid) => {
      access.push(`/proc/${pid}/fd/*`);
      return [...(fdLinks[pid] ?? [])].sort();
    },
    writePrivateReceipt: (_path, _text) => {
      access.push("write-private-receipt");
    },
  };
  return { adapters, access };
}

const valid = makeAdapters();
const result = collectAuthenticatedPaidWorkRuntimeListenerCgroupEvidenceV1({
  confirmation: CONFIRMATION,
  adapters: valid.adapters,
});
assert.equal(result.marker, MARKER);
assert.equal(result.output_written, false);
assert.equal(result.receipt.service.main_pid, MAIN_PID);
assert.equal(result.receipt.listeners[0].owner_pid, OWNER_PID);
assert.notEqual(result.receipt.service.main_pid, result.receipt.listeners[0].owner_pid);
assert.equal(result.receipt.service.manager_control_group_path_sha256, sha256(CGROUP));
assert.equal(result.receipt.decision.listener_cgroup_binding_verified, true);
assert.equal(result.receipt.decision.current_runtime_state_established, false);
assert.equal(result.receipt.decision.execution_authorized, false);
assert.equal(result.receipt.safety.network_request_performed, false);
assert.equal(result.receipt.safety.credential_access_performed, false);
assert.ok(valid.access.every((path) => !/environ|cmdline|token|credential/i.test(path)));

expectThrow(
  () => collectAuthenticatedPaidWorkRuntimeListenerCgroupEvidenceV1({
    confirmation: "wrong",
    adapters: makeAdapters().adapters,
  }),
  /confirmation_mismatch/,
  "wrong confirmation",
);

expectThrow(
  () => collectAuthenticatedPaidWorkRuntimeListenerCgroupEvidenceV1({
    confirmation: CONFIRMATION,
    adapters: makeAdapters({ hostname: "wrong-host" }).adapters,
  }),
  /hostname_mismatch/,
  "wrong hostname",
);

expectThrow(
  () => collectAuthenticatedPaidWorkRuntimeListenerCgroupEvidenceV1({
    confirmation: CONFIRMATION,
    adapters: makeAdapters({
      fdLinks: {
        [MAIN_PID]: [],
        [OWNER_PID]: [`socket:[${SOCKET_INODE}]`],
        [FOREIGN_PID]: [`socket:[${SOCKET_INODE}]`],
      },
    }).adapters,
  }),
  /exactly_one_same_uid_socket_owner_required/,
  "shared foreign owner",
);

expectThrow(
  () => collectAuthenticatedPaidWorkRuntimeListenerCgroupEvidenceV1({
    confirmation: CONFIRMATION,
    adapters: makeAdapters({
      fdLinks: {
        [MAIN_PID]: [],
        [OWNER_PID]: [],
        [FOREIGN_PID]: [`socket:[${SOCKET_INODE}]`],
      },
    }).adapters,
  }),
  /listener_owner_outside_service_cgroup/,
  "foreign-only owner",
);

expectThrow(
  () => collectAuthenticatedPaidWorkRuntimeListenerCgroupEvidenceV1({
    confirmation: CONFIRMATION,
    adapters: makeAdapters({
      tcpValues: [
        tcpTable({ addressHex: "00000000" }),
        tcpTable({ addressHex: "00000000" }),
      ],
    }).adapters,
  }),
  /listener_local_address_mismatch/,
  "wildcard listener",
);

expectThrow(
  () => collectAuthenticatedPaidWorkRuntimeListenerCgroupEvidenceV1({
    confirmation: CONFIRMATION,
    adapters: makeAdapters({
      tcp6Values: [
        "header\n0: 00000000000000000000000000000000:105B 00000000000000000000000000000000:0000 0A 0 0 0 1000 0 90001\n",
      ],
    }).adapters,
  }),
  /unexpected_ipv6_target_listener/,
  "IPv6 target listener",
);

expectThrow(
  () => collectAuthenticatedPaidWorkRuntimeListenerCgroupEvidenceV1({
    confirmation: CONFIRMATION,
    adapters: makeAdapters({
      cgroupValues: [
        `${MAIN_PID}\n${OWNER_PID}\n`,
        `${MAIN_PID}\n${OWNER_PID}\n7000\n`,
      ],
    }).adapters,
  }),
  /cgroup_snapshot_changed/,
  "cgroup race",
);

expectThrow(
  () => collectAuthenticatedPaidWorkRuntimeListenerCgroupEvidenceV1({
    confirmation: CONFIRMATION,
    adapters: makeAdapters({ ownerStartTimes: [99100243, 99100244] }).adapters,
  }),
  /cgroup_member_process_identity_changed/,
  "owner PID reuse",
);

const source = readFileSync(
  new URL("../tools/authenticated-paid-work-runtime-listener-cgroup-operator-collector-v1.mjs", import.meta.url),
  "utf8",
);
for (const forbidden of [
  "/environ",
  "/cmdline",
  "Authorization:",
  "fetch(",
  "http://127.0.0.1:4187",
  "systemctl restart",
  "systemctl start",
  "systemctl stop",
]) {
  assert.equal(source.includes(forbidden), false, `source contains forbidden ${forbidden}`);
}
for (const required of [
  "systemctl",
  "/cgroup.procs",
  "/net/tcp",
  "/net/tcp6",
  "/ns/net",
  "socket:[",
  "HOLD_PENDING_COMPOSED_RUNTIME_REVALIDATION",
]) {
  assert.equal(source.includes(required), true, `source missing ${required}`);
}

console.log(JSON.stringify({
  marker: MARKER,
  wrapper_main_pid_supported: true,
  child_listener_owner_supported: true,
  stable_double_read_required: true,
  same_uid_socket_owner_scan_required: true,
  wildcard_listener_rejected: true,
  ipv6_target_listener_rejected: true,
  environment_read: false,
  command_line_read: false,
  network_request: false,
  service_mutation: false,
  credential_access: false,
  paid_work_submission: false,
  work_credit_write: false,
  wallet_or_signer_access: false,
  transaction_broadcast: false,
  fund_movement: false,
  decision: "HOLD_PENDING_COMPOSED_RUNTIME_REVALIDATION",
  status: "GREEN",
}, null, 2));
console.log(`${MARKER}_PROOF_GREEN`);
