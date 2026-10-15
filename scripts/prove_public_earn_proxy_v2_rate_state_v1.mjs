#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_PUBLIC_EARN_CLAIM_PATH_V1,
  VOID_PUBLIC_EARN_SUBMIT_PATH_V1,
} from "../tools/void-public-earn-proxy-v2-edge-contract-v1.mjs";
import {
  VOID_PUBLIC_EARN_PROXY_V2_RATE_STATE_AUTHORITY_V1,
  VOID_PUBLIC_EARN_PROXY_V2_RATE_STATE_V1,
  createVoidPublicEarnProxyV2RateStateV1,
  readVoidPublicEarnProxyV2RateStateV1,
} from "../tools/void-public-earn-proxy-v2-rate-state-v1.mjs";

const SIGNATURE = Buffer.from([
  0x0d, 0x0a, 0x0d, 0x0a, 0x00, 0x0d,
  0x0a, 0x51, 0x55, 0x49, 0x54, 0x0a,
]);

function proxy4(source, sourcePort = 50000) {
  const octets = source.split(".").map(Number);
  assert.equal(octets.length, 4);
  const address = Buffer.alloc(12);
  address.set(octets, 0);
  address.set([127, 0, 0, 1], 4);
  address.writeUInt16BE(sourcePort, 8);
  address.writeUInt16BE(443, 10);
  const header = Buffer.alloc(16);
  SIGNATURE.copy(header, 0);
  header[12] = 0x21;
  header[13] = 0x11;
  header.writeUInt16BE(address.length, 14);
  return Buffer.concat([header, address]);
}

function input({
  source,
  sourcePort = 50000,
  route = "claim",
  nowMs,
  headers = {},
}) {
  const target =
    route === "claim"
      ? VOID_PUBLIC_EARN_CLAIM_PATH_V1
      : VOID_PUBLIC_EARN_SUBMIT_PATH_V1;
  return {
    connection_prefix: Buffer.concat([
      proxy4(source, sourcePort),
      Buffer.from(
        "POST " + target + " HTTP/1.1\r\n",
        "ascii",
      ),
    ]),
    headers: {
      Host: "voidchain.org",
      "Content-Type": "application/json",
      ...headers,
    },
    now_ms: nowMs,
  };
}

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-public-earn-rate-state-v1-"),
);
fs.chmodSync(root, 0o700);

try {
  const stateFile = path.join(root, "rate-state.json");
  const store = createVoidPublicEarnProxyV2RateStateV1({
    state_file: stateFile,
  });

  const claimResults = [];
  for (let index = 0; index < 6; index += 1) {
    claimResults.push(
      await store.admit(
        input({
          source: "203.0.113.10",
          sourcePort: 50000 + index,
          route: "claim",
          nowMs: 1_000 + index,
          headers: {
            "X-Forwarded-For": "198.51.100.9",
          },
        }),
      ),
    );
  }
  assert.equal(claimResults.every((x) => x.ok === true), true);
  assert.equal(
    new Set(
      claimResults.map((x) => x.edge_limiter_source_key),
    ).size,
    1,
    "ephemeral source-port changes must remain one source bucket",
  );

  const claimLimited = await store.admit(
    input({
      source: "203.0.113.10",
      sourcePort: 59999,
      route: "claim",
      nowMs: 1_010,
    }),
  );
  assert.equal(claimLimited.ok, false);
  assert.equal(claimLimited.status, "RATE_LIMITED");
  assert.equal(
    claimLimited.reason,
    "public_earn_claim_proxy_source_rate_limited",
  );

  const sourceB = await store.admit(
    input({
      source: "203.0.113.11",
      route: "claim",
      nowMs: 1_010,
      headers: {
        Forwarded: "for=203.0.113.10",
      },
    }),
  );
  assert.equal(sourceB.ok, true);
  assert.notEqual(
    sourceB.edge_limiter_source_key,
    claimResults[0].edge_limiter_source_key,
  );

  const submitIndependent = await store.admit(
    input({
      source: "203.0.113.10",
      route: "submit",
      nowMs: 1_010,
      headers: {
        Authorization: "Bearer shape_only_downstream_authority",
      },
    }),
  );
  assert.equal(submitIndependent.ok, true);
  assert.equal(submitIndependent.route, "submit");
  assert.equal(submitIndependent.source_request_count_before, 0);
  assert.equal(
    submitIndependent.sanitized_headers.authorization,
    "Bearer shape_only_downstream_authority",
  );

  let events = readVoidPublicEarnProxyV2RateStateV1(stateFile);
  assert.equal(events.length, 8);
  assert.equal(events.filter((x) => x.route === "claim").length, 7);
  assert.equal(events.filter((x) => x.route === "submit").length, 1);

  const stateMeta = fs.lstatSync(stateFile);
  assert.equal(stateMeta.isFile(), true);
  assert.equal(stateMeta.isSymbolicLink(), false);
  assert.equal(stateMeta.nlink, 1);
  assert.equal(stateMeta.uid, process.getuid());
  assert.equal(stateMeta.mode & 0o077, 0);

  const restarted = createVoidPublicEarnProxyV2RateStateV1({
    state_file: stateFile,
  });
  const replay = await restarted.admit(
    input({
      source: "203.0.113.10",
      sourcePort: 61000,
      route: "claim",
      nowMs: 1_011,
    }),
  );
  assert.equal(replay.ok, false);
  assert.equal(replay.status, "RATE_LIMITED");

  const afterWindow = await restarted.admit(
    input({
      source: "203.0.113.10",
      route: "claim",
      nowMs: 61_100,
    }),
  );
  assert.equal(afterWindow.ok, true);
  events = readVoidPublicEarnProxyV2RateStateV1(stateFile);
  assert.equal(
    events.some((x) => x.at_ms < 1_100),
    false,
    "successful later admission must compact expired events",
  );

  const concurrentFile = path.join(root, "concurrent.json");
  const concurrent = createVoidPublicEarnProxyV2RateStateV1({
    state_file: concurrentFile,
  });
  const concurrentClaims = await Promise.all(
    Array.from({ length: 7 }, (_unused, index) =>
      concurrent.admit(
        input({
          source: "203.0.113.20",
          sourcePort: 52000 + index,
          route: "claim",
          nowMs: 20_000,
        }),
      ),
    ),
  );
  assert.equal(
    concurrentClaims.filter((x) => x.ok === true).length,
    6,
  );
  assert.equal(
    concurrentClaims.filter((x) => x.status === "RATE_LIMITED").length,
    1,
  );
  assert.equal(
    readVoidPublicEarnProxyV2RateStateV1(concurrentFile).length,
    6,
  );

  const corrupt = path.join(root, "corrupt.json");
  fs.writeFileSync(corrupt, "{bad}\n", { mode: 0o600 });
  await assert.rejects(
    () =>
      createVoidPublicEarnProxyV2RateStateV1({
        state_file: corrupt,
      }).admit(
        input({
          source: "203.0.113.30",
          route: "claim",
          nowMs: 30_000,
        }),
      ),
    /public_earn_rate_state_json_invalid/u,
  );

  const parentRaceRoot = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      "void-public-earn-rate-parent-race-v1-",
    ),
  );
  fs.chmodSync(parentRaceRoot, 0o700);
  try {
    const parent = path.join(parentRaceRoot, "state");
    const detached = path.join(parentRaceRoot, "state-detached");
    const redirect = path.join(parentRaceRoot, "redirect");
    fs.mkdirSync(parent, { mode: 0o700 });
    fs.mkdirSync(redirect, { mode: 0o700 });
    const raceState = path.join(parent, "rate-state.json");
    const raceStore = createVoidPublicEarnProxyV2RateStateV1({
      state_file: raceState,
    });

    const originalOpen = fs.openSync;
    const originalRename = fs.renameSync;
    const originalSymlink = fs.symlinkSync;
    let swapped = false;
    fs.openSync = function patchedOpen(file, ...args) {
      const fd = originalOpen.call(fs, file, ...args);
      if (
        !swapped &&
        typeof file === "string" &&
        file.includes("/proc/self/fd/") &&
        file.includes(".rate-state.json.tmp.")
      ) {
        swapped = true;
        originalRename.call(fs, parent, detached);
        originalSymlink.call(fs, redirect, parent, "dir");
      }
      return fd;
    };
    try {
      await assert.rejects(
        () =>
          raceStore.admit(
            input({
              source: "203.0.113.31",
              route: "submit",
              nowMs: 31_000,
            }),
          ),
        /public_earn_rate_state_parent_visible_identity_changed/u,
      );
    } finally {
      fs.openSync = originalOpen;
    }
    assert.equal(swapped, true);
    assert.equal(
      fs.existsSync(path.join(redirect, "rate-state.json")),
      false,
    );
    assert.equal(
      fs.readdirSync(detached).some((name) => name.includes(".tmp.")),
      false,
    );
  } finally {
    fs.rmSync(parentRaceRoot, {
      recursive: true,
      force: true,
    });
  }

  for (const [key, expected] of Object.entries({
    single_process_admission_serialized: true,
    claim_submit_separate_rate_buckets: true,
    admitted_event_persisted_before_return: true,
    retained_parent_descriptor_required: true,
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
    work_credit_write: false,
    funds_movement: false,
    nat_independent_participant_isolation_proven: false,
  })) {
    assert.equal(
      VOID_PUBLIC_EARN_PROXY_V2_RATE_STATE_AUTHORITY_V1[key],
      expected,
      key,
    );
  }

  console.log("VOID_PUBLIC_EARN_PROXY_V2_RATE_STATE_V1_GREEN");
  console.log("claim_submit_buckets_independent=true");
  console.log("source_port_rotation_does_not_reset_bucket=true");
  console.log("source_a_exhaustion_does_not_deny_source_b=true");
  console.log("concurrent_admission_serialized=true");
  console.log("accepted_event_persisted_before_return=true");
  console.log("restart_replay_preserved=true");
  console.log("expired_events_compacted_on_success=true");
  console.log("retained_parent_descriptor_bound=true");
  console.log("parent_namespace_substitution_rejected=true");
  console.log("self_issued_executor_rate_authority=false");
  console.log("bearer_capability_rate_authority=false");
  console.log("live_state_custody_proven=false");
  console.log("runtime_integration=false");
  console.log("work_credit_write=false");
  console.log("funds_movement=false");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
