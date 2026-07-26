import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONFIRMATION_V1,
  authorizeBuyVoidFreshCandidateAutoClaimActivationOperatorApprovalV1,
} from "../src/economic/buy_void_fresh_candidate_auto_claim_activation_operator_approval_envelope_v1.js";

type Args = {
  packetFile: string;
  approvalDir: string;
  outputFile: string | null;
  ttlSeconds: number;
  approve: boolean;
  confirmation: string;
};

const MAX_JSON_BYTES = 4 * 1024 * 1024;

function parseArgs(argv: string[]): Args {
  let packetFile = "";
  let approvalDir = path.join(
    os.homedir(),
    ".local",
    "state",
    "void-buy-void-fresh-candidate-auto-claim-activation-operator-approval-envelope-v1",
    "approvals",
  );
  let outputFile: string | null = null;
  let ttlSeconds = 900;
  let approve = false;
  let confirmation = "";

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    const next = argv[index + 1];

    if (value === "--packet") {
      if (!next) throw new Error("--packet requires a path");
      packetFile = path.resolve(next);
      index += 1;
      continue;
    }
    if (value === "--approval-dir") {
      if (!next) {
        throw new Error("--approval-dir requires a path");
      }
      approvalDir = path.resolve(next);
      index += 1;
      continue;
    }
    if (value === "--output") {
      if (!next) throw new Error("--output requires a path");
      outputFile = path.resolve(next);
      index += 1;
      continue;
    }
    if (value === "--ttl-seconds") {
      if (!next) {
        throw new Error("--ttl-seconds requires a value");
      }
      ttlSeconds = Number(next);
      index += 1;
      continue;
    }
    if (value === "--approve") {
      approve = true;
      continue;
    }
    if (value === "--confirmation") {
      if (!next) {
        throw new Error("--confirmation requires a value");
      }
      confirmation = next;
      index += 1;
      continue;
    }
    if (value === "--help" || value === "-h") {
      console.log([
        "Usage:",
        "  npx tsx scripts/buy_void_fresh_candidate_auto_claim_activation_operator_approval_envelope_v1.ts [options]",
        "",
        "Options:",
        "  --packet PATH                      Exact admission-packet result",
        "  --approval-dir PATH                Private approval directory",
        "  --output PATH                      Optional result JSON",
        "  --ttl-seconds N                    1-900 seconds, default 900",
        "  --approve                          Create one approval envelope",
        "  --confirmation TEXT                Exact operator confirmation",
        "  --help                             Show this help",
      ].join("\n"));
      process.exit(0);
    }
    throw new Error(`unknown argument: ${value}`);
  }

  if (!packetFile) throw new Error("--packet is required");
  if (
    !Number.isSafeInteger(ttlSeconds)
    || ttlSeconds <= 0
    || ttlSeconds > 900
  ) {
    throw new Error("--ttl-seconds must be an integer from 1 to 900");
  }

  return {
    packetFile,
    approvalDir,
    outputFile,
    ttlSeconds,
    approve,
    confirmation,
  };
}

function readJsonRegular(
  file: string,
): {
  raw: Buffer;
  value: Record<string, any>;
} {
  const valueStat = fs.lstatSync(file);
  if (valueStat.isSymbolicLink()) {
    throw new Error("symlink_input_forbidden");
  }
  if (!valueStat.isFile()) throw new Error("regular_file_required");
  if (valueStat.size > MAX_JSON_BYTES) {
    throw new Error("json_input_too_large");
  }

  const raw = fs.readFileSync(file);
  const parsed = JSON.parse(raw.toString("utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("json_object_required");
  }

  return {
    raw,
    value: parsed as Record<string, any>,
  };
}

function sha256Bytes(value: Buffer | string): string {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }

  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${canonicalJson(object[key])}`,
    )
    .join(",")}}`;
}

function writeJsonAtomic(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), {
    recursive: true,
    mode: 0o700,
  });
  const temporary = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(
    temporary,
    JSON.stringify(value, null, 2) + "\n",
    { mode: 0o600 },
  );
  fs.renameSync(temporary, file);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const packetRead = readJsonRegular(args.packetFile);
  const packetSha = sha256Bytes(packetRead.raw);

  const decision =
    authorizeBuyVoidFreshCandidateAutoClaimActivationOperatorApprovalV1({
      admission_packet: packetRead.value,
      admission_packet_sha256: packetSha,
      approve: args.approve,
      confirmation: args.confirmation,
      approval_ttl_seconds: args.ttlSeconds,
    });

  let approvalPath: string | null = null;
  let approvalFingerprint: string | null = null;
  let approvalCreated = false;
  let approvalFileWrite = false;

  if (
    decision.ok
    && decision.status === "approved"
    && decision.approval_file_write_authorized
  ) {
    fs.mkdirSync(args.approvalDir, {
      recursive: true,
      mode: 0o700,
    });
    fs.chmodSync(args.approvalDir, 0o700);

    approvalPath = path.join(
      args.approvalDir,
      `approval-${decision.admission_packet_sha256}.json`,
    );

    const issuedAtMs = Date.now();
    const expiresAtMs =
      issuedAtMs
      + decision.maximum_approval_ttl_seconds * 1000;

    const envelopeWithoutFingerprint = {
      schema:
        "void_buy_void_fresh_candidate_auto_claim_activation_operator_approval_envelope_v1",
      marker:
        "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_ENVELOPE_V1",
      version: 1,
      request_id: decision.request_id,
      admission_packet_sha256:
        decision.admission_packet_sha256,
      plan_fingerprint_sha256:
        decision.plan_fingerprint_sha256,
      activation_plan_fingerprint_sha256:
        decision.activation_plan_fingerprint_sha256,
      alert_fingerprint_sha256:
        decision.alert_fingerprint_sha256,
      persistent_config_sha256:
        decision.persistent_config_sha256,
      ceremony_release_commit:
        decision.ceremony_release_commit,
      issuer_release_commit:
        decision.issuer_release_commit,
      runner_release_commit:
        decision.runner_release_commit,
      executor_release_commit:
        decision.executor_release_commit,
      issued_at_ms: issuedAtMs,
      expires_at_ms: expiresAtMs,
      maximum_approval_ttl_seconds:
        decision.maximum_approval_ttl_seconds,
      maximum_ceremony_invocations: 1,
      maximum_issuer_invocations: 1,
      maximum_runner_invocations: 1,
      required_issuer_confirmation:
        decision.required_issuer_confirmation,
      required_execution_confirmation:
        decision.required_execution_confirmation,
      operator_approved: true,
      automatic_execution: false,
      consumed: false,
    };

    approvalFingerprint = sha256Bytes(
      canonicalJson(envelopeWithoutFingerprint),
    );

    const envelope = {
      ...envelopeWithoutFingerprint,
      approval_fingerprint_sha256:
        approvalFingerprint,
    };

    const fileDescriptor = fs.openSync(
      approvalPath,
      "wx",
      0o600,
    );
    try {
      fs.writeFileSync(
        fileDescriptor,
        JSON.stringify(envelope, null, 2) + "\n",
        { encoding: "utf8" },
      );
      fs.fsyncSync(fileDescriptor);
    } finally {
      fs.closeSync(fileDescriptor);
    }
    fs.chmodSync(approvalPath, 0o600);

    approvalCreated = true;
    approvalFileWrite = true;
  }

  const output = {
    schema:
      "void_buy_void_fresh_candidate_auto_claim_activation_operator_approval_result_v1",
    marker:
      "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_ENVELOPE_V1",
    version: 1,
    generated_at: new Date().toISOString(),
    decision,
    approval_path: approvalPath,
    approval_fingerprint_sha256:
      approvalFingerprint,
    approval_created: approvalCreated,
    approval_file_write: approvalFileWrite,
    approval_content_printed: false,
    sensitive_values_printed: false,
    process_spawn: false,
    ceremony_invocation: false,
    issuer_invocation_count: 0,
    runner_invocation_count: 0,
    credential_created: false,
    credential_consumed: false,
    automatic_retry: false,
    systemd_change: false,
    service_restart: false,
    persistent_config_write: false,
    claim_write: false,
    request_write: false,
    inventory_reservation: false,
    inventory_decrement: false,
    wallet_access: false,
    signing: false,
    transaction_broadcast: false,
    money_movement: false,
  };

  if (args.outputFile) {
    writeJsonAtomic(args.outputFile, output);
    console.log(`result=${args.outputFile}`);
  } else {
    process.stdout.write(
      JSON.stringify(output, null, 2) + "\n",
    );
  }

  console.log(`status=${decision.status}`);
  console.log(`approval_created=${approvalCreated}`);
  console.log(`approval_file_write=${approvalFileWrite}`);
  console.log("approval_content_printed=false");
  console.log("sensitive_values_printed=false");
  console.log("process_spawn=false");
  console.log("ceremony_invocation=false");
  console.log("issuer_invocation_count=0");
  console.log("runner_invocation_count=0");
  console.log("credential_created=false");
  console.log("credential_consumed=false");
  console.log("automatic_retry=false");
  console.log("systemd_change=false");
  console.log("service_restart=false");
  console.log("persistent_config_write=false");
  console.log("claim_write=false");
  console.log("request_write=false");
  console.log("inventory_reservation=false");
  console.log("inventory_decrement=false");
  console.log("wallet_access=false");
  console.log("signing=false");
  console.log("transaction_broadcast=false");
  console.log("money_movement=false");

  if (!decision.ok) process.exitCode = 4;
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      marker:
        "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_ENVELOPE_V1",
      ok: false,
      status: "held",
      reason: String((error as Error)?.message || error),
      approval_created: false,
      approval_file_write: false,
      approval_content_printed: false,
      sensitive_values_printed: false,
      process_spawn: false,
      ceremony_invocation: false,
      issuer_invocation_count: 0,
      runner_invocation_count: 0,
      credential_created: false,
      credential_consumed: false,
      automatic_retry: false,
      systemd_change: false,
      service_restart: false,
      persistent_config_write: false,
      claim_write: false,
      request_write: false,
      inventory_reservation: false,
      inventory_decrement: false,
      wallet_access: false,
      signing: false,
      transaction_broadcast: false,
      money_movement: false,
    }),
  );
  process.exitCode = 4;
});
