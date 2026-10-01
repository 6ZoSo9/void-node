#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  DEFAULT_EXPECTED_HOSTNAME,
  MARKER,
  OBSERVATION_MARKER,
  OBSERVATION_MAX_AGE_MS,
  OBSERVATION_MAX_FUTURE_SKEW_MS,
  PrecisionWebRecoveryHostObserverError,
  evaluateCollectedPrecisionWebObservationV1,
  findProcessSourceByDigestV1,
  observerCommandEnvV1,
  parseSsListenersV1,
  parseSystemctlShowV1,
  requireExactLoopbackListenerV1,
  serviceSnapshotFromSystemctlV1,
} from "../tools/void-precision-web-recovery-host-observer-v1.mjs";
import {
  prepareVoidPrecisionWebRecoveryPlanV1,
} from "../tools/void-precision-web-recovery-evidence-v1.mjs";

const PROOF_MARKER =
  "VOID_PRECISION_WEB_RECOVERY_HOST_OBSERVER_V1_PROOF_GREEN";
const PROOF_NOW_MS = Date.now();
const OBSERVED_AT = new Date(
  Math.floor(PROOF_NOW_MS / 1000) * 1000,
).toISOString().replace(".000Z", "Z");

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function expectRejected(operation, pattern) {
  assert.throws(
    operation,
    (error) =>
      error instanceof PrecisionWebRecoveryHostObserverError &&
      pattern.test(error.message),
  );
}

const plan = prepareVoidPrecisionWebRecoveryPlanV1();
const units = {
  adapter: "void-public-seed-adapter.service",
  composition: "void-public-app-composition-gateway-v1.service",
  frontdoor: "void-public-frontdoor-v1.service",
  node: "void-node-live.service",
};
const hardening = {
  no_new_privileges: true,
  restrict_suid_sgid: true,
  lock_personality: true,
  private_tmp: false,
  protect_home: false,
  protect_system: false,
};

const processEnvironment = {
  adapter: {
    VOID_SEED_UPSTREAM: "http://127.0.0.1:4100",
    VOID_ADAPTER_HOST: "127.0.0.1",
    VOID_ADAPTER_PORT: "8080",
  },
  composition: {
    VOID_COMPOSITION_HOST: "127.0.0.1",
    VOID_COMPOSITION_PORT: "8082",
    VOID_PUBLIC_GATEWAY_UPSTREAM: "http://127.0.0.1:8080",
    VOID_NODE_UPSTREAM: "http://127.0.0.1:4100",
    VOID_PUBLIC_NODE_LABEL: "Precision public seed",
    VOID_PUBLIC_NETWORK_NAME: "Mainnet-0",
  },
  frontdoor: {
    VOID_PUBLIC_FRONTDOOR_BIND: "127.0.0.1",
    VOID_PUBLIC_FRONTDOOR_PORT: "8083",
    VOID_PUBLIC_FRONTDOOR_UPSTREAM_PORT: "8082",
  },
};

function service(name, pid, port, planSource, overrides = {}) {
  return {
    unit: units[name],
    active_state: "active",
    sub_state: "running",
    main_pid: pid,
    hardening: { ...hardening },
    process_environment: { ...processEnvironment[name] },
    listener: {
      address: "127.0.0.1:" + port,
      pid,
    },
    process_source_path: "/tmp/" + name + ".mjs",
    process_source_sha256: plan.source_file_sha256[planSource],
    process_entry_arg_index: 1,
    node_executable_path: "/usr/bin/node",
    ...overrides,
  };
}

function collected(overrides = {}) {
  const value = {
    marker: OBSERVATION_MARKER,
    version: 1,
    hostname: DEFAULT_EXPECTED_HOSTNAME,
    units: { ...units },
    services: {
      adapter: service(
        "adapter",
        1001,
        8080,
        "ops/public/public-seed-adapter-v1.mjs",
      ),
      composition: service(
        "composition",
        1002,
        8082,
        "ops/public/void-public-app-composition-gateway-v1.mjs",
      ),
      frontdoor: service(
        "frontdoor",
        1003,
        8083,
        "ops/public/void-public-frontdoor-v1.mjs",
      ),
    },
    http: {
      adapter_manifest: {
        adapter: "void_public_seed_adapter",
        version: 1,
        upstream_private: true,
        private_rpc_public: false,
      },
      composition_status: {
        ok: true,
        marker: "VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1",
        runtime_truth_marker: "VOID_PUBLIC_APP_RUNTIME_TRUTH_WALL_V1",
        strict_ready: true,
        ready: true,
        network_name: "Mainnet-0",
        node: {
          label: "Precision public seed",
          role: "public-seed",
          public: true,
        },
      },
      frontdoor_status: {
        marker: "VOID_PUBLIC_FRONTDOOR_V1",
        ready: true,
        upstream_strict_ready: true,
        upstream_marker: "VOID_PUBLIC_APP_COMPOSITION_GATEWAY_V1",
        upstream_runtime_truth_marker:
          "VOID_PUBLIC_APP_RUNTIME_TRUTH_WALL_V1",
      },
    },
    node_invocation_id_before: "a".repeat(32),
    node_invocation_id_after: "a".repeat(32),
    tailscale_serve_sha256_before: "b".repeat(64),
    tailscale_serve_sha256_after: "b".repeat(64),
    tailscale_funnel_sha256_before: "c".repeat(64),
    tailscale_funnel_sha256_after: "c".repeat(64),
    observed_at_utc: OBSERVED_AT,
  };
  return Object.assign(value, overrides);
}

assert.equal(MARKER, "VOID_PRECISION_WEB_RECOVERY_HOST_OBSERVER_V1");
assert.equal(
  OBSERVATION_MARKER,
  "VOID_PRECISION_WEB_RECOVERY_HOST_OBSERVATION_V1",
);
assert.equal(DEFAULT_EXPECTED_HOSTNAME, "zoso-Precision-Tower-7810");
assert.equal(OBSERVATION_MAX_AGE_MS, 300_000);
assert.equal(OBSERVATION_MAX_FUTURE_SKEW_MS, 5_000);

{
  const env = observerCommandEnvV1({
    PATH: "/tmp/attacker-bin",
    LD_PRELOAD: "/tmp/attacker.so",
    LD_LIBRARY_PATH: "/tmp/attacker-lib",
    TAILSCALE_SOCKET: "/tmp/attacker.sock",
    SYSTEMD_EDITOR: "/tmp/attacker-editor",
    TS_DEBUG_FAKE: "1",
    TAILSCALE_DEBUG_FAKE: "1",
    DBUS_SESSION_BUS_ADDRESS: "unix:path=/tmp/attacker-bus",
    XDG_RUNTIME_DIR: "/tmp/attacker-runtime",
    PRESERVE_ME: "yes",
  });
  const uid = process.getuid();
  assert.equal(env.PATH, "/usr/bin:/bin");
  assert.equal(env.LD_PRELOAD, undefined);
  assert.equal(env.LD_LIBRARY_PATH, undefined);
  assert.equal(env.TAILSCALE_SOCKET, undefined);
  assert.equal(env.SYSTEMD_EDITOR, undefined);
  assert.equal(env.TS_DEBUG_FAKE, undefined);
  assert.equal(env.TAILSCALE_DEBUG_FAKE, undefined);
  assert.equal(env.XDG_RUNTIME_DIR, "/run/user/" + uid);
  assert.equal(
    env.DBUS_SESSION_BUS_ADDRESS,
    "unix:path=/run/user/" + uid + "/bus",
  );
  assert.equal(env.PRESERVE_ME, "yes");
}

const accepted = evaluateCollectedPrecisionWebObservationV1({
  plan,
  collected: collected(),
  trustedNowMs: PROOF_NOW_MS,
});
assert.equal(accepted.marker, MARKER);
assert.equal(
  accepted.status,
  "PRECISION_WEB_RECOVERY_HOST_OBSERVATION_STRUCTURALLY_VERIFIED_LIVE_RUN_REQUIRED",
);
assert.equal(accepted.hostname, DEFAULT_EXPECTED_HOSTNAME);
assert.equal(accepted.plan_id, plan.plan_id);
assert.match(accepted.recovery_evidence_id, /^voidpwre1_[0-9a-f]{64}$/u);
assert.match(accepted.observation_id, /^voidpwro1_[0-9a-f]{64}$/u);
assert.equal(accepted.live_host_observation_performed, false);
assert.equal(accepted.services_active_and_exact, true);
assert.equal(accepted.loopback_listeners_exact, true);
assert.equal(accepted.running_source_bytes_bound, true);
assert.equal(accepted.precision_hardening_profile_observed, true);
assert.equal(accepted.composition_strict_ready_observed, true);
assert.equal(accepted.frontdoor_strict_ready_observed, true);
assert.equal(accepted.node_invocation_stable_during_observation, true);
assert.equal(accepted.tailscale_serve_stable_during_observation, true);
assert.equal(accepted.tailscale_funnel_stable_during_observation, true);
assert.equal(accepted.observer_read_only, true);
assert.equal(accepted.negative_action_scope, "observer_process_only");
assert.equal(accepted.historical_mutation_absence_not_inferred, true);
assert.equal(accepted.independent_host_acceptance, false);
assert.equal(accepted.ingress_activation_authorized, false);
assert.equal(accepted.service_mutation_authorized, false);
assert.equal(accepted.routing_mutation_authorized, false);
assert.equal(accepted.dns_mutation_authorized, false);
assert.equal(accepted.tailscale_mutation_authorized, false);
assert.equal(accepted.node_restart_authorized, false);
assert.equal(accepted.credential_access, false);
assert.equal(accepted.wallet_or_signer_access, false);
assert.equal(accepted.transaction_performed, false);
assert.equal(accepted.validator_mutation, false);
assert.equal(accepted.work_credit_mutation, false);
assert.equal(accepted.funds_moved, false);
assert.equal(Object.isFrozen(accepted), true);

const repeated = evaluateCollectedPrecisionWebObservationV1({
  plan,
  collected: collected(),
  trustedNowMs: PROOF_NOW_MS,
});
assert.equal(repeated.observation_id, accepted.observation_id);
assert.deepEqual(repeated, accepted);

{
  const raw = [
    "ActiveState=active",
    "SubState=running",
    "MainPID=4242",
    "NoNewPrivileges=yes",
    "RestrictSUIDSGID=yes",
    "LockPersonality=yes",
    "PrivateTmp=no",
    "ProtectHome=no",
    "ProtectSystem=no",
    "",
  ].join("\n");
  const parsed = parseSystemctlShowV1(raw);
  assert.equal(parsed.MainPID, "4242");
  const snapshot = serviceSnapshotFromSystemctlV1(
    "void-proof.service",
    raw,
  );
  assert.equal(snapshot.main_pid, 4242);
  assert.deepEqual(snapshot.hardening, hardening);
}

expectRejected(
  () => parseSystemctlShowV1("ActiveState=active\nActiveState=active\n"),
  /duplicate systemctl property/,
);
expectRejected(
  () => serviceSnapshotFromSystemctlV1(
    "void-proof.service",
    [
      "ActiveState=inactive",
      "SubState=dead",
      "MainPID=0",
      "NoNewPrivileges=yes",
      "RestrictSUIDSGID=yes",
      "LockPersonality=yes",
      "PrivateTmp=no",
      "ProtectHome=no",
      "ProtectSystem=no",
    ].join("\n"),
  ),
  /service_not_active_running/,
);

{
  const rows = parseSsListenersV1(
    [
      'LISTEN 0 511 127.0.0.1:8080 0.0.0.0:* users:(("node",pid=1001,fd=21))',
      'LISTEN 0 511 127.0.0.1:8082 0.0.0.0:* users:(("node",pid=1002,fd=22))',
      "",
    ].join("\n"),
  );
  assert.deepEqual(
    requireExactLoopbackListenerV1(rows, 8080, 1001),
    { address: "127.0.0.1:8080", pid: 1001 },
  );
  expectRejected(
    () => requireExactLoopbackListenerV1(rows, 8080, 9999),
    /listener_pid_mismatch/,
  );
}
expectRejected(
  () => requireExactLoopbackListenerV1(
    parseSsListenersV1(
      'LISTEN 0 511 0.0.0.0:8080 0.0.0.0:* users:(("node",pid=1001,fd=21))\n',
    ),
    8080,
    1001,
  ),
  /listener_not_ipv4_loopback/,
);

{
  const temp = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-precision-observer-source-"),
  );
  try {
    const sourcePath = path.join(temp, "frontdoor.mjs");
    const bytes = Buffer.from("console.log('proof');\n", "utf8");
    fs.writeFileSync(sourcePath, bytes);
    const found = findProcessSourceByDigestV1({
      pid: 999,
      expectedSha256: sha256(bytes),
      cmdlineBytes: Buffer.from(
        "/usr/bin/node\0" + sourcePath + "\0",
        "utf8",
      ),
      cwd: temp,
      exePath: "/usr/bin/node",
    });
    assert.equal(found.path, sourcePath);
    assert.equal(found.sha256, sha256(bytes));
    assert.equal(found.argv_index, 1);
    assert.equal(found.node_executable_path, "/usr/bin/node");

    expectRejected(
      () => findProcessSourceByDigestV1({
        pid: 999,
        expectedSha256: "f".repeat(64),
        cmdlineBytes: Buffer.from(
          "/usr/bin/node\0" + sourcePath + "\0",
          "utf8",
        ),
        cwd: temp,
        exePath: "/usr/bin/node",
      }),
      /process_entry_script_digest_mismatch/,
    );

    expectRejected(
      () => findProcessSourceByDigestV1({
        pid: 999,
        expectedSha256: sha256(bytes),
        cmdlineBytes: Buffer.from(
          "/usr/bin/node\0--inspect\0" + sourcePath + "\0",
          "utf8",
        ),
        cwd: temp,
        exePath: "/usr/bin/node",
      }),
      /process_entry_script_unavailable/,
    );

    expectRejected(
      () => findProcessSourceByDigestV1({
        pid: 999,
        expectedSha256: sha256(bytes),
        cmdlineBytes: Buffer.from(
          "/usr/bin/node\0" + sourcePath + "\0",
          "utf8",
        ),
        cwd: temp,
        exePath: "/usr/bin/python3",
      }),
      /process_executable_is_not_node/,
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

expectRejected(
  () => evaluateCollectedPrecisionWebObservationV1({
    plan,
    collected: collected({ hostname: "wrong-host" }),
    trustedNowMs: PROOF_NOW_MS,
  }),
  /precision_hostname_mismatch/,
);

{
  const bad = collected();
  bad.units.node = "void-dummy-node.service";
  expectRejected(
    () => evaluateCollectedPrecisionWebObservationV1({
      plan,
      collected: bad,
      trustedNowMs: PROOF_NOW_MS,
    }),
    /node_unit_identity_mismatch/,
  );
}
{
  const bad = collected();
  bad.services.adapter.unit = "void-other-adapter.service";
  expectRejected(
    () => evaluateCollectedPrecisionWebObservationV1({
      plan,
      collected: bad,
      trustedNowMs: PROOF_NOW_MS,
    }),
    /service_unit_identity_mismatch/,
  );
}

{
  const bad = collected();
  bad.node_invocation_id_after = "d".repeat(32);
  expectRejected(
    () => evaluateCollectedPrecisionWebObservationV1({
      plan,
      collected: bad,
      trustedNowMs: PROOF_NOW_MS,
    }),
    /node_invocation_changed/,
  );
}
{
  const bad = collected();
  bad.tailscale_serve_sha256_after = "d".repeat(64);
  expectRejected(
    () => evaluateCollectedPrecisionWebObservationV1({
      plan,
      collected: bad,
      trustedNowMs: PROOF_NOW_MS,
    }),
    /tailscale_serve_changed/,
  );
}
{
  const bad = collected();
  bad.tailscale_funnel_sha256_after = "d".repeat(64);
  expectRejected(
    () => evaluateCollectedPrecisionWebObservationV1({
      plan,
      collected: bad,
      trustedNowMs: PROOF_NOW_MS,
    }),
    /tailscale_funnel_changed/,
  );
}
{
  const bad = collected();
  bad.services.adapter.listener = {
    address: "0.0.0.0:8080",
    pid: 1001,
  };
  expectRejected(
    () => evaluateCollectedPrecisionWebObservationV1({
      plan,
      collected: bad,
      trustedNowMs: PROOF_NOW_MS,
    }),
    /service_listener_mismatch/,
  );
}
{
  const bad = collected();
  bad.services.composition.hardening.private_tmp = true;
  expectRejected(
    () => evaluateCollectedPrecisionWebObservationV1({
      plan,
      collected: bad,
      trustedNowMs: PROOF_NOW_MS,
    }),
    /service_hardening_mismatch/,
  );
}
{
  const bad = collected();
  bad.services.composition.process_environment.VOID_PUBLIC_NODE_LABEL =
    "Alienware public seed";
  expectRejected(
    () => evaluateCollectedPrecisionWebObservationV1({
      plan,
      collected: bad,
      trustedNowMs: PROOF_NOW_MS,
    }),
    /process_environment_mismatch:composition:VOID_PUBLIC_NODE_LABEL/,
  );
}
{
  const bad = collected();
  bad.services.frontdoor.process_source_sha256 = "e".repeat(64);
  expectRejected(
    () => evaluateCollectedPrecisionWebObservationV1({
      plan,
      collected: bad,
      trustedNowMs: PROOF_NOW_MS,
    }),
    /service_process_source_mismatch/,
  );
}
{
  const bad = collected();
  bad.http.adapter_manifest.adapter = "wrong";
  expectRejected(
    () => evaluateCollectedPrecisionWebObservationV1({
      plan,
      collected: bad,
      trustedNowMs: PROOF_NOW_MS,
    }),
    /adapter_http_identity_mismatch/,
  );
}
{
  const bad = collected();
  bad.http.composition_status.strict_ready = false;
  expectRejected(
    () => evaluateCollectedPrecisionWebObservationV1({
      plan,
      collected: bad,
      trustedNowMs: PROOF_NOW_MS,
    }),
    /composition_http_identity_or_readiness_mismatch/,
  );
}
{
  const bad = collected();
  bad.http.frontdoor_status.upstream_marker = "wrong";
  expectRejected(
    () => evaluateCollectedPrecisionWebObservationV1({
      plan,
      collected: bad,
      trustedNowMs: PROOF_NOW_MS,
    }),
    /frontdoor_http_identity_or_readiness_mismatch/,
  );
}

{
  const stale = collected({
    observed_at_utc: new Date(
      Math.floor((PROOF_NOW_MS - OBSERVATION_MAX_AGE_MS - 1_000) / 1000) *
        1000,
    ).toISOString().replace(".000Z", "Z"),
  });
  expectRejected(
    () => evaluateCollectedPrecisionWebObservationV1({
      plan,
      collected: stale,
      trustedNowMs: PROOF_NOW_MS,
    }),
    /observation_timestamp_stale/,
  );
}
{
  const future = collected({
    observed_at_utc: new Date(
      Math.ceil((PROOF_NOW_MS + OBSERVATION_MAX_FUTURE_SKEW_MS + 2_000) / 1000) *
        1000,
    ).toISOString().replace(".000Z", "Z"),
  });
  expectRejected(
    () => evaluateCollectedPrecisionWebObservationV1({
      plan,
      collected: future,
      trustedNowMs: PROOF_NOW_MS,
    }),
    /observation_timestamp_too_far_in_future/,
  );
}

console.log(PROOF_MARKER);
console.log("current_plan_bound=true");
console.log("host_identity_bound=true");
console.log("node_unit_identity_pinned=true");
console.log("web_service_unit_identity_bound=true");
console.log("active_systemd_services_required=true");
console.log("loopback_listener_pid_binding_proved=true");
console.log("running_source_digest_binding_proved=true");
console.log("node_entry_script_argv1_binding_proved=true");
console.log("observer_command_environment_isolated=true");
console.log("precision_hardening_profile_required=true");
console.log("service_process_environment_bound=true");
console.log("adapter_composition_frontdoor_http_truth_bound=true");
console.log("node_invocation_stability_required=true");
console.log("tailscale_status_stability_required=true");
console.log("observation_freshness_window_ms=300000");
console.log("future_skew_window_ms=5000");
console.log("independent_host_acceptance_requires_live_collector_run=true");
console.log("ingress_activation_authorized=false");
console.log("service_mutation_authorized=false");
console.log("routing_mutation_authorized=false");
console.log("funds_moved=false");
