import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  defaultCandidateWatchNotificationBridgeStateV1,
  evaluateCandidateWatchNotificationBridgeV1,
  type CandidateWatchAlertSourceV1,
  type CandidateWatchNotificationBridgeStateV1,
  type CandidateWatchResultV1,
  type CandidateWatchSystemdObservationV1,
} from "../src/economic/buy_void_observe_and_claim_candidate_watch_notification_bridge_v1.js";

type Args = {
  watchStateDir: string;
  watchOutput: string;
  bridgeStateDir: string;
  healthOutput: string;
};

function parseArgs(argv: string[]): Args {
  let watchStateDir = path.join(
    os.homedir(), ".local", "state",
    "void-buy-void-observe-and-claim-candidate-watch-v1",
  );
  let watchOutput = path.join(
    os.homedir(), "void-precision-smoke",
    "buy-void-observe-and-claim-candidate-watch-latest.json",
  );
  let bridgeStateDir = path.join(
    os.homedir(), ".local", "state",
    "void-buy-void-observe-and-claim-candidate-watch-notification-bridge-v1",
  );
  let healthOutput = path.join(
    bridgeStateDir, "health.json",
  );
  let healthOutputExplicit = false;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    const next = argv[index + 1];
    if (value === "--watch-state-dir") {
      if (!next) throw new Error("--watch-state-dir requires a path");
      watchStateDir = path.resolve(next);
      index += 1;
      continue;
    }
    if (value === "--watch-output") {
      if (!next) throw new Error("--watch-output requires a path");
      watchOutput = path.resolve(next);
      index += 1;
      continue;
    }
    if (value === "--bridge-state-dir") {
      if (!next) throw new Error("--bridge-state-dir requires a path");
      bridgeStateDir = path.resolve(next);
      index += 1;
      continue;
    }
    if (value === "--health-output") {
      if (!next) throw new Error("--health-output requires a path");
      healthOutput = path.resolve(next);
      healthOutputExplicit = true;
      index += 1;
      continue;
    }
    if (value === "--help" || value === "-h") {
      console.log([
        "Usage:",
        "  npx tsx scripts/buy_void_observe_and_claim_candidate_watch_notification_bridge_v1.ts [options]",
        "",
        "Options:",
        "  --watch-state-dir PATH   Candidate-watch operator-local state",
        "  --watch-output PATH      Latest candidate-watch result JSON",
        "  --bridge-state-dir PATH  Notification receipt and bridge state directory",
        "  --health-output PATH     Latest machine-readable bridge health receipt",
        "  --help                   Show this help",
      ].join("\n"));
      process.exit(0);
    }
    throw new Error(`unknown argument: ${value}`);
  }

  if (!healthOutputExplicit) {
    healthOutput = path.join(bridgeStateDir, "health.json");
  }
  return { watchStateDir, watchOutput, bridgeStateDir, healthOutput };
}

function sha256Bytes(value: Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

function writeJsonAtomic(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(
    temporary,
    JSON.stringify(value, null, 2) + "\n",
    { mode: 0o600 },
  );
  fs.renameSync(temporary, file);
}

function writeJsonExclusive(file: string, value: unknown): boolean {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  try {
    fs.writeFileSync(
      file,
      JSON.stringify(value, null, 2) + "\n",
      { mode: 0o600, flag: "wx" },
    );
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EEXIST") return false;
    throw error;
  }
}

function systemctlShow(unit: string, property: string): string {
  const result = spawnSync(
    "systemctl",
    ["--user", "show", unit, "-p", property, "--value"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  return result.status === 0 ? result.stdout.trim() : "not-found";
}

function systemctlState(command: "is-enabled" | "is-active", unit: string): string {
  const result = spawnSync(
    "systemctl",
    ["--user", command, unit],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  return (result.stdout || result.stderr).trim() || "not-found";
}

function readSystemdObservation(): CandidateWatchSystemdObservationV1 {
  const service =
    "void-buy-void-observe-and-claim-candidate-watch-v1.service";
  const timer =
    "void-buy-void-observe-and-claim-candidate-watch-v1.timer";
  return {
    watch_service: {
      load_state: systemctlShow(service, "LoadState"),
      active_state: systemctlShow(service, "ActiveState"),
      sub_state: systemctlShow(service, "SubState"),
      result: systemctlShow(service, "Result"),
      exec_main_status: systemctlShow(service, "ExecMainStatus"),
    },
    watch_timer: {
      load_state: systemctlShow(timer, "LoadState"),
      enabled_state: systemctlState("is-enabled", timer),
      active_state: systemctlState("is-active", timer),
      sub_state: systemctlShow(timer, "SubState"),
      last_trigger: systemctlShow(timer, "LastTriggerUSec"),
      next_elapse_monotonic:
        systemctlShow(timer, "NextElapseUSecMonotonic"),
    },
  };
}

function alertSources(stateDir: string): CandidateWatchAlertSourceV1[] {
  const alertDir = path.join(stateDir, "alerts");
  if (!fs.existsSync(alertDir)) return [];
  return fs.readdirSync(alertDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => {
      const file = path.join(alertDir, entry.name);
      const bytes = fs.readFileSync(file);
      return {
        path: file,
        sha256: sha256Bytes(bytes),
        alert: JSON.parse(bytes.toString("utf8")),
      } as CandidateWatchAlertSourceV1;
    });
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(args.watchOutput)) {
    throw new Error(`candidate-watch output missing: ${args.watchOutput}`);
  }

  const watchBytes = fs.readFileSync(args.watchOutput);
  const watchResult = JSON.parse(
    watchBytes.toString("utf8"),
  ) as CandidateWatchResultV1;
  const watchStatePath = path.join(
    args.watchStateDir, "current-state.json",
  );
  const watchStateSha = fs.existsSync(watchStatePath)
    ? sha256Bytes(fs.readFileSync(watchStatePath))
    : null;
  const statePath = path.join(args.bridgeStateDir, "current-state.json");
  const notificationsDir = path.join(
    args.bridgeStateDir, "notifications",
  );

  let previousState =
    defaultCandidateWatchNotificationBridgeStateV1();
  if (fs.existsSync(statePath)) {
    previousState = readJson<CandidateWatchNotificationBridgeStateV1>(
      statePath,
    );
  }

  const existingNotificationCount = fs.existsSync(notificationsDir)
    ? fs.readdirSync(notificationsDir)
        .filter((name) => name.endsWith(".json")).length
    : 0;

  const decision = evaluateCandidateWatchNotificationBridgeV1({
    watch_result: watchResult,
    watch_result_sha256: sha256Bytes(watchBytes),
    watch_state_sha256: watchStateSha,
    alert_sources: alertSources(args.watchStateDir),
    previous_state: previousState,
    systemd: readSystemdObservation(),
    existing_notification_receipt_count: existingNotificationCount,
    observed_at: new Date().toISOString(),
  });

  let created = 0;
  for (const notification of decision.notifications) {
    const destination = path.join(
      notificationsDir,
      `${notification.notification_id_sha256}.json`,
    );
    if (writeJsonExclusive(destination, notification)) {
      created += 1;
      console.log(
        "VOID_OPERATOR_NOTIFICATION"
        + ` request_id=${notification.request_id}`
        + ` alert_fingerprint=${notification.alert_fingerprint_sha256}`
        + ` receipt=${destination}`,
      );
    }
  }

  if (decision.ok) {
    writeJsonAtomic(statePath, decision.next_state);
  }
  writeJsonAtomic(args.healthOutput, decision.health);

  console.log(`health_output=${args.healthOutput}`);
  console.log(`health_status=${decision.health.health_status}`);
  console.log(`healthy=${decision.health.healthy}`);
  console.log(`watch_status=${decision.health.watch_status}`);
  console.log(`new_notification_count=${decision.notifications.length}`);
  console.log(`notification_receipts_created=${created}`);
  console.log(
    "recommended_request_id="
      + (decision.health.recommended_request_id || "none"),
  );
  console.log("activation_performed=false");
  console.log("network_state_write=false");
  console.log("money_movement=false");

  if (!decision.ok || !decision.health.healthy) {
    process.exitCode = 4;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 2;
});
