import crypto from "node:crypto";
import fs from "node:fs";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import {
  buildOperatorWebhookDeliveryHealthV1,
  defaultOperatorWebhookDeliveryStateV1,
  planOperatorWebhookDeliveryV1,
  recordOperatorWebhookDeliveryOutcomeV1,
  type CandidateNotificationSourceV1,
  type OperatorWebhookDeliveryConfigV1,
  type OperatorWebhookDeliveryStateV1,
  type OperatorWebhookTransportOutcomeV1,
} from "../src/economic/buy_void_candidate_watch_operator_webhook_delivery_v1.js";

type Args = {
  notificationDir: string;
  stateDir: string;
  config: string;
  healthOutput: string;
  mode: "dry_run" | "apply";
  confirmation: string | null;
};

function parseArgs(argv: string[]): Args {
  const home = os.homedir();
  const args: Args = {
    notificationDir: path.join(
      home,
      ".local/state",
      "void-buy-void-observe-and-claim-candidate-watch-notification-bridge-v1",
      "notifications",
    ),
    stateDir: path.join(
      home,
      ".local/state",
      "void-buy-void-candidate-operator-webhook-delivery-v1",
    ),
    config: path.join(
      home,
      ".config",
      "void",
      "buy-void-candidate-operator-webhook-delivery-v1.json",
    ),
    healthOutput: path.join(
      home,
      "void-precision-smoke",
      "buy-void-candidate-operator-webhook-delivery-health-v1.json",
    ),
    mode: "dry_run",
    confirmation: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key === "--notification-dir" && value) {
      args.notificationDir = path.resolve(value);
      index += 1;
    } else if (key === "--state-dir" && value) {
      args.stateDir = path.resolve(value);
      index += 1;
    } else if (key === "--config" && value) {
      args.config = path.resolve(value);
      index += 1;
    } else if (key === "--health-output" && value) {
      args.healthOutput = path.resolve(value);
      index += 1;
    } else if (key === "--mode" && value) {
      if (value !== "dry_run" && value !== "apply") {
        throw new Error("mode must be dry_run or apply");
      }
      args.mode = value;
      index += 1;
    } else if (key === "--confirm" && value) {
      args.confirmation = value;
      index += 1;
    } else {
      throw new Error(`unknown or incomplete argument: ${key}`);
    }
  }

  return args;
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
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      return false;
    }
    throw error;
  }
}

function notificationSources(
  directory: string,
): CandidateNotificationSourceV1[] {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => {
      const file = path.join(directory, entry.name);
      const bytes = fs.readFileSync(file);
      return {
        path: file,
        sha256: sha256Bytes(bytes),
        notification: JSON.parse(bytes.toString("utf8")),
      } as CandidateNotificationSourceV1;
    });
}

function readSecureToken(file: string | null): string | null {
  if (file === null) return null;
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error("bearer token path must be a regular non-symlink file");
  }
  if ((stat.mode & 0o077) !== 0) {
    throw new Error("bearer token file permissions are too broad");
  }
  if (stat.size < 1 || stat.size > 8192) {
    throw new Error("bearer token file size is invalid");
  }
  const token = fs.readFileSync(file, "utf8").trim();
  if (!token || /[\r\n]/.test(token)) {
    throw new Error("bearer token is empty or multiline");
  }
  return token;
}

function performWebhookRequest(input: {
  config: OperatorWebhookDeliveryConfigV1;
  payload: unknown;
  bearerToken: string | null;
}): Promise<OperatorWebhookTransportOutcomeV1> {
  const body = Buffer.from(JSON.stringify(input.payload), "utf8");
  if (body.length > input.config.maximum_payload_bytes) {
    return Promise.resolve({
      outcome: "transport_failed",
      http_status: null,
      response_body_sha256: null,
      response_body_bytes: 0,
      request_bytes_submitted: false,
      failure_class: "payload_too_large",
    });
  }

  const endpoint = new URL(input.config.endpoint_url);
  return new Promise((resolve) => {
    let bytesSubmitted = false;
    let settled = false;

    const finish = (
      value: OperatorWebhookTransportOutcomeV1,
    ): void => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const headers: Record<string, string> = {
      "content-type": "application/json",
      "content-length": String(body.length),
      "user-agent": "VOID-Candidate-Operator-Delivery/1",
      "x-void-payload-sha256": sha256Bytes(body),
    };
    if (input.bearerToken) {
      headers.authorization = `Bearer ${input.bearerToken}`;
    }

    const request = https.request(
      {
        protocol: "https:",
        hostname: endpoint.hostname,
        port: endpoint.port || 443,
        method: "POST",
        path: `${endpoint.pathname}${endpoint.search}`,
        headers,
        timeout: input.config.request_timeout_ms,
        agent: false,
        servername: endpoint.hostname,
      },
      (response) => {
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          if (size < 65536) {
            const remaining = 65536 - size;
            const sliced = chunk.subarray(0, remaining);
            chunks.push(sliced);
            size += sliced.length;
          }
        });
        response.on("end", () => {
          const responseBody = Buffer.concat(chunks);
          const status = response.statusCode ?? 0;
          finish({
            outcome:
              status >= 200 && status < 300
                ? "delivered"
                : "http_rejected",
            http_status: status || null,
            response_body_sha256:
              responseBody.length > 0
                ? sha256Bytes(responseBody)
                : null,
            response_body_bytes: responseBody.length,
            request_bytes_submitted: true,
            failure_class:
              status >= 200 && status < 300
                ? null
                : "http_non_2xx",
          });
        });
      },
    );

    request.on("timeout", () => {
      request.destroy(new Error("request_timeout"));
    });
    request.on("error", (error) => {
      finish({
        outcome: bytesSubmitted
          ? "possible_delivery"
          : "transport_failed",
        http_status: null,
        response_body_sha256: null,
        response_body_bytes: 0,
        request_bytes_submitted: bytesSubmitted,
        failure_class:
          (error as NodeJS.ErrnoException).code ??
          error.message ??
          "transport_error",
      });
    });

    request.end(body, () => {
      bytesSubmitted = true;
    });
  });
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const config = readJson<OperatorWebhookDeliveryConfigV1>(args.config);
  const notifications = notificationSources(args.notificationDir);
  const statePath = path.join(args.stateDir, "current-state.json");
  const receiptDir = path.join(args.stateDir, "receipts");
  const previousState = fs.existsSync(statePath)
    ? readJson<OperatorWebhookDeliveryStateV1>(statePath)
    : defaultOperatorWebhookDeliveryStateV1();

  const observedAt = new Date().toISOString();
  const plan = planOperatorWebhookDeliveryV1({
    config,
    notifications,
    previous_state: previousState,
    mode: args.mode,
    exact_confirmation: args.confirmation,
    observed_at: observedAt,
  });

  if (!plan.ok) {
    const health = buildOperatorWebhookDeliveryHealthV1({
      config,
      notifications,
      state: previousState,
      plan,
      observed_at: observedAt,
    });
    writeJsonAtomic(args.healthOutput, health);
    console.log(`health_output=${args.healthOutput}`);
    console.log(`health_status=${health.health_status}`);
    console.log(`pending_notification_count=${health.pending_notification_count}`);
    console.log("delivery_performed=false");
    console.log("automatic_retry=false");
    process.exitCode = 4;
    return;
  }

  if (plan.status === "idle" || plan.status === "dry_run") {
    const health = buildOperatorWebhookDeliveryHealthV1({
      config,
      notifications,
      state: previousState,
      plan,
      observed_at: observedAt,
    });
    writeJsonAtomic(args.healthOutput, health);
    console.log(`health_output=${args.healthOutput}`);
    console.log(`health_status=${health.health_status}`);
    console.log(`plan_status=${plan.status}`);
    console.log(`pending_notification_count=${plan.pending_notification_count}`);
    console.log(
      "selected_notification_id="
        + (
          plan.selected_notification?.notification
            .notification_id_sha256 ?? "none"
        ),
    );
    console.log("delivery_performed=false");
    console.log("automatic_retry=false");
    console.log("activation_performed=false");
    console.log("money_movement=false");
    return;
  }

  const token = readSecureToken(config.bearer_token_file);
  const transport = await performWebhookRequest({
    config,
    payload: plan.payload,
    bearerToken: token,
  });
  const attemptedAt = new Date().toISOString();
  const result = recordOperatorWebhookDeliveryOutcomeV1({
    plan,
    previous_state: previousState,
    transport,
    attempted_at: attemptedAt,
  });

  const receiptPath = path.join(
    receiptDir,
    `${result.receipt.delivery_id_sha256}.json`,
  );
  if (!writeJsonExclusive(receiptPath, result.receipt)) {
    throw new Error("delivery receipt already exists");
  }
  writeJsonAtomic(statePath, result.next_state);

  const health = buildOperatorWebhookDeliveryHealthV1({
    config,
    notifications,
    state: result.next_state,
    plan,
    last_outcome: transport.outcome,
    observed_at: attemptedAt,
  });
  writeJsonAtomic(args.healthOutput, health);

  console.log(
    "VOID_OPERATOR_DELIVERY"
      + ` notification_id=${result.receipt.notification_id_sha256}`
      + ` outcome=${result.receipt.outcome}`
      + ` receipt=${receiptPath}`,
  );
  console.log(`health_output=${args.healthOutput}`);
  console.log(`delivery_receipt=${receiptPath}`);
  console.log(`delivery_outcome=${result.receipt.outcome}`);
  console.log(`http_status=${result.receipt.http_status ?? "none"}`);
  console.log(
    `request_bytes_submitted=${result.receipt.request_bytes_submitted}`,
  );
  console.log("automatic_retry=false");
  console.log("activation_performed=false");
  console.log("money_movement=false");

  if (transport.outcome !== "delivered") {
    process.exitCode = 5;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 2;
});
