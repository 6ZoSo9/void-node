#!/usr/bin/env node
import {
  chmodSync,
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  AGENT_PAID_WORK_WC_EARNING_ADAPTER_ACCEPTANCE_SOURCE_SHA256,
  AGENT_PAID_WORK_WC_EARNING_ADAPTER_EXECUTE_CONFIRMATION,
  AGENT_PAID_WORK_WC_EARNING_ADAPTER_PARTICIPANT_CLI_SHA256,
  AGENT_PAID_WORK_WC_EARNING_ADAPTER_PILOT_SOURCE_SHA256,
  AGENT_PAID_WORK_WC_EARNING_ADAPTER_SELECTED_CONTRACT_RECEIPT_SHA256,
  deriveAgentPaidWorkWcEarningAdapterPlanV1,
  materializeAgentPaidWorkWcEarningAdapterReceiptV1,
  validateAgentPaidWorkWcEarningAdapterPlanV1,
  validateAgentPaidWorkWcEarningAdapterReceiptV1,
  type AgentPaidWorkWcEarningAdapterPlanV1,
  type JsonObject,
} from "../src/economic/agent_paid_work_wc_earning_adapter_v1.js";

type Flags = Map<string, string>;

function fail(message: string): never {
  throw new Error(message);
}

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

function parseFlags(args: string[]): Flags {
  assertCondition(args.length % 2 === 0, "flags require values");
  const flags = new Map<string, string>();

  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];
    assertCondition(name?.startsWith("--"), `expected --flag at argument ${index + 1}`);
    assertCondition(value !== undefined, `${name} requires a value`);
    assertCondition(!flags.has(name), `duplicate flag ${name}`);
    flags.set(name, value);
  }

  return flags;
}

function exactFlagSet(flags: Flags, expected: readonly string[]): void {
  const actual = [...flags.keys()].sort();
  const wanted = [...expected].sort();
  assertCondition(
    JSON.stringify(actual) === JSON.stringify(wanted),
    `flags differ expected=${JSON.stringify(wanted)} actual=${JSON.stringify(actual)}`,
  );
}

function requiredFlag(flags: Flags, name: string): string {
  const value = flags.get(name);
  assertCondition(value !== undefined && value !== "", `${name} is required`);
  return value;
}

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, "utf8")) as unknown;
}

function sha256Bytes(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(file: string): string {
  return sha256Bytes(readFileSync(file));
}

function utcNow(): string {
  return new Date(Math.floor(Date.now() / 1000) * 1000)
    .toISOString()
    .replace(".000Z", "Z");
}

function requireCurrentUserRegularFile(
  file: string,
  label: string,
  privateOnly = false,
): void {
  const metadata = lstatSync(file);
  assertCondition(!metadata.isSymbolicLink() && metadata.isFile(), `${label} is unsafe`);
  assertCondition(metadata.uid === process.getuid?.(), `${label} owner mismatch`);
  const mode = statSync(file).mode & 0o777;
  assertCondition((mode & 0o022) === 0, `${label} is group/world writable`);
  if (privateOnly) {
    assertCondition((mode & 0o077) === 0, `${label} is not private`);
  }
}

function requirePrivateDirectory(directory: string, label: string): void {
  const metadata = lstatSync(directory);
  assertCondition(!metadata.isSymbolicLink() && metadata.isDirectory(), `${label} is unsafe`);
  assertCondition(metadata.uid === process.getuid?.(), `${label} owner mismatch`);
  const mode = statSync(directory).mode & 0o777;
  assertCondition((mode & 0o077) === 0, `${label} is not private`);
}

function writeExclusivePrivate(file: string, value: unknown): void {
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const descriptor = openSync(file, "wx", 0o600);

  try {
    writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  } finally {
    closeSync(descriptor);
  }

  chmodSync(file, 0o600);
}

function writeAtomicPrivate(file: string, value: unknown): void {
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
  chmodSync(temp, 0o600);
  renameSync(temp, file);
}

function validateSelectedContractReceipt(file: string): JsonObject {
  requireCurrentUserRegularFile(file, "selected contract receipt", true);
  assertCondition(
    sha256File(file) ===
      AGENT_PAID_WORK_WC_EARNING_ADAPTER_SELECTED_CONTRACT_RECEIPT_SHA256,
    "selected contract receipt SHA mismatch",
  );
  const value = readJson(file);
  assertCondition(
    typeof value === "object" && value !== null && !Array.isArray(value),
    "selected contract receipt must be an object",
  );
  const root = value as JsonObject;
  assertCondition(
    root.marker ===
      "VOID_SELECTED_LIVE_PAID_WORK_WC_LEDGER_ADAPTER_CONTRACT_CAPTURE_V1",
    "selected contract receipt marker mismatch",
  );
  assertCondition(
    root.next_action ===
      "build_bounded_live_paid_work_execution_and_wc_earning_adapter_v1_from_selected_exact_pilot_and_verified_receipt_contracts",
    "selected contract receipt next_action mismatch",
  );
  return root;
}

function validateRuntimeFiles(plan: AgentPaidWorkWcEarningAdapterPlanV1): void {
  const files: Array<[string, string, string]> = [
    [
      plan.runtime.participant_cli_path,
      AGENT_PAID_WORK_WC_EARNING_ADAPTER_PARTICIPANT_CLI_SHA256,
      "participant CLI",
    ],
    [
      plan.runtime.pilot_source_path,
      AGENT_PAID_WORK_WC_EARNING_ADAPTER_PILOT_SOURCE_SHA256,
      "pilot source",
    ],
    [
      plan.runtime.acceptance_source_path,
      AGENT_PAID_WORK_WC_EARNING_ADAPTER_ACCEPTANCE_SOURCE_SHA256,
      "acceptance source",
    ],
  ];

  for (const [file, expectedSha, label] of files) {
    requireCurrentUserRegularFile(file, label);
    assertCondition(sha256File(file) === expectedSha, `${label} SHA mismatch`);
  }

  validateSelectedContractReceipt(plan.selected_contract_capture.receipt_path);
}

function validateCurrentBindingRegistry(
  plan: AgentPaidWorkWcEarningAdapterPlanV1,
  registryPath: string,
): void {
  requireCurrentUserRegularFile(registryPath, "binding registry", true);
  assertCondition(
    sha256File(registryPath) === plan.binding.binding_registry_sha256,
    "binding registry SHA changed after plan staging",
  );
  const registry = readJson(registryPath) as JsonObject;
  assertCondition(
    registry.registry_id === plan.binding.binding_registry_id,
    "binding registry ID changed after plan staging",
  );
  assertCondition(Array.isArray(registry.bindings), "binding registry bindings missing");
  const matches = (registry.bindings as unknown[]).filter((item) => {
    const binding = item as JsonObject;
    return (
      typeof binding === "object" &&
      binding !== null &&
      binding.binding_id === plan.binding.binding_id &&
      binding.credential_id === plan.submission.credential_id &&
      binding.agent_id === plan.submission.agent_id &&
      binding.destination_wc_account === plan.binding.destination_wc_account &&
      binding.status === "active" &&
      binding.revoked_at === null
    );
  });
  assertCondition(matches.length === 1, "staged binding is not uniquely active");
}

function participantReceiptFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((name) => /^participant-receipt-.+\.json$/.test(name))
    .map((name) => path.join(directory, name))
    .sort();
}

function chooseParticipantReceipt(
  directory: string,
  destinationAccount: string,
): { file: string; value: JsonObject } | null {
  const matches: Array<{ file: string; value: JsonObject }> = [];

  for (const file of participantReceiptFiles(directory)) {
    requireCurrentUserRegularFile(file, "participant receipt", true);
    const value = readJson(file);
    if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      (value as JsonObject).account === destinationAccount
    ) {
      matches.push({ file, value: value as JsonObject });
    }
  }

  assertCondition(matches.length <= 1, "multiple matching participant receipts exist");
  return matches[0] || null;
}

function stage(flags: Flags): void {
  exactFlagSet(flags, [
    "--submission-receipt",
    "--work-order",
    "--binding-registry",
    "--selected-contract-receipt",
    "--ticket",
    "--participant-cli",
    "--pilot-source",
    "--acceptance-source",
    "--coordinator-base",
    "--coordinator-node-id",
    "--output-dir",
    "--created-at-utc",
    "--expires-at-utc",
    "--nonce",
  ]);

  const submissionReceiptPath = path.resolve(requiredFlag(flags, "--submission-receipt"));
  const workOrderPath = path.resolve(requiredFlag(flags, "--work-order"));
  const registryPath = path.resolve(requiredFlag(flags, "--binding-registry"));
  const selectedReceiptPath = path.resolve(requiredFlag(flags, "--selected-contract-receipt"));
  const ticketPath = path.resolve(requiredFlag(flags, "--ticket"));
  const participantCliPath = path.resolve(requiredFlag(flags, "--participant-cli"));
  const pilotSourcePath = path.resolve(requiredFlag(flags, "--pilot-source"));
  const acceptanceSourcePath = path.resolve(requiredFlag(flags, "--acceptance-source"));
  const outputDirectory = path.resolve(requiredFlag(flags, "--output-dir"));

  assertCondition(!existsSync(outputDirectory), "output directory already exists");

  for (const [file, label, privateOnly] of [
    [submissionReceiptPath, "submission receipt", true],
    [workOrderPath, "work order", false],
    [registryPath, "binding registry", true],
    [selectedReceiptPath, "selected contract receipt", true],
    [ticketPath, "capability ticket", true],
    [participantCliPath, "participant CLI", false],
    [pilotSourcePath, "pilot source", false],
    [acceptanceSourcePath, "acceptance source", false],
  ] as Array<[string, string, boolean]>) {
    requireCurrentUserRegularFile(file, label, privateOnly);
  }

  validateSelectedContractReceipt(selectedReceiptPath);
  assertCondition(
    sha256File(participantCliPath) ===
      AGENT_PAID_WORK_WC_EARNING_ADAPTER_PARTICIPANT_CLI_SHA256,
    "participant CLI SHA mismatch",
  );
  assertCondition(
    sha256File(pilotSourcePath) ===
      AGENT_PAID_WORK_WC_EARNING_ADAPTER_PILOT_SOURCE_SHA256,
    "pilot source SHA mismatch",
  );
  assertCondition(
    sha256File(acceptanceSourcePath) ===
      AGENT_PAID_WORK_WC_EARNING_ADAPTER_ACCEPTANCE_SOURCE_SHA256,
    "acceptance source SHA mismatch",
  );

  const plan = deriveAgentPaidWorkWcEarningAdapterPlanV1({
    submission_receipt: readJson(submissionReceiptPath),
    work_order: readJson(workOrderPath),
    binding_registry: readJson(registryPath),
    binding_registry_sha256: sha256File(registryPath),
    selected_contract_capture_receipt_path: selectedReceiptPath,
    participant_cli_path: participantCliPath,
    pilot_source_path: pilotSourcePath,
    acceptance_source_path: acceptanceSourcePath,
    ticket_path: ticketPath,
    private_output_dir: outputDirectory,
    coordinator_base_url: requiredFlag(flags, "--coordinator-base"),
    coordinator_node_id: requiredFlag(flags, "--coordinator-node-id"),
    created_at_utc: requiredFlag(flags, "--created-at-utc"),
    expires_at_utc: requiredFlag(flags, "--expires-at-utc"),
    nonce: requiredFlag(flags, "--nonce"),
  });

  validateAgentPaidWorkWcEarningAdapterPlanV1(plan);

  mkdirSync(outputDirectory, { recursive: false, mode: 0o700 });
  chmodSync(outputDirectory, 0o700);
  const planPath = path.join(outputDirectory, "plan-v1.json");
  writeExclusivePrivate(planPath, plan);
  writeExclusivePrivate(path.join(outputDirectory, "stage-receipt-v1.json"), {
    marker: "VOID_AGENT_PAID_WORK_WC_EARNING_ADAPTER_STAGE_RECEIPT_V1",
    version: 1,
    staged_at_utc: utcNow(),
    plan_id: plan.plan_id,
    plan_path: planPath,
    plan_sha256: sha256File(planPath),
    binding_registry_sha256: plan.binding.binding_registry_sha256,
    live_work_execution: false,
    wc_ledger_write: false,
    raw_capability_token_read: false,
    service_restart: false,
  });

  process.stdout.write(
    `${JSON.stringify({
      marker: "VOID_AGENT_PAID_WORK_WC_EARNING_ADAPTER_STAGE_V1",
      plan_id: plan.plan_id,
      plan_path: planPath,
      destination_wc_account: plan.binding.destination_wc_account,
      execute_confirmation:
        AGENT_PAID_WORK_WC_EARNING_ADAPTER_EXECUTE_CONFIRMATION,
      live_work_execution: false,
      wc_ledger_write: false,
      raw_capability_token_read: false,
    })}\n`,
  );
}

function inspect(flags: Flags): void {
  exactFlagSet(flags, ["--plan", "--binding-registry"]);
  const planPath = path.resolve(requiredFlag(flags, "--plan"));
  const registryPath = path.resolve(requiredFlag(flags, "--binding-registry"));
  requireCurrentUserRegularFile(planPath, "adapter plan", true);
  const plan = readJson(planPath);
  validateAgentPaidWorkWcEarningAdapterPlanV1(plan);
  const typed = plan as AgentPaidWorkWcEarningAdapterPlanV1;

  validateRuntimeFiles(typed);
  validateCurrentBindingRegistry(typed, registryPath);
  requirePrivateDirectory(typed.execution.private_output_dir, "private output directory");

  const receiptPath = path.join(
    typed.execution.private_output_dir,
    "adapter-execution-receipt-v1.json",
  );
  const completed = existsSync(receiptPath);

  if (completed) {
    requireCurrentUserRegularFile(receiptPath, "adapter receipt", true);
    const receipt = readJson(receiptPath);
    validateAgentPaidWorkWcEarningAdapterReceiptV1(receipt);
    assertCondition(
      (receipt as JsonObject).plan_id === typed.plan_id,
      "adapter receipt belongs to a different plan",
    );
  } else {
    requireCurrentUserRegularFile(typed.execution.ticket_path, "capability ticket", true);
    assertCondition(
      Date.now() <= Date.parse(typed.expires_at_utc),
      "adapter plan has expired",
    );
  }

  process.stdout.write(
    `${JSON.stringify({
      marker: "VOID_AGENT_PAID_WORK_WC_EARNING_ADAPTER_INSPECTION_V1",
      valid: true,
      plan_id: typed.plan_id,
      completed,
      ready_to_execute: !completed,
      destination_wc_account: typed.binding.destination_wc_account,
      fixed_award_wc: typed.runtime.fixed_award_wc,
      execute_confirmation:
        AGENT_PAID_WORK_WC_EARNING_ADAPTER_EXECUTE_CONFIRMATION,
      raw_capability_token_read: false,
      live_work_execution: false,
      wc_ledger_write: false,
    })}\n`,
  );
}

function execute(flags: Flags): void {
  exactFlagSet(flags, [
    "--plan",
    "--binding-registry",
    "--receipt",
    "--confirm",
  ]);

  const planPath = path.resolve(requiredFlag(flags, "--plan"));
  const registryPath = path.resolve(requiredFlag(flags, "--binding-registry"));
  const receiptPath = path.resolve(requiredFlag(flags, "--receipt"));
  const confirmation = requiredFlag(flags, "--confirm");

  assertCondition(
    confirmation === AGENT_PAID_WORK_WC_EARNING_ADAPTER_EXECUTE_CONFIRMATION,
    `--confirm must equal ${AGENT_PAID_WORK_WC_EARNING_ADAPTER_EXECUTE_CONFIRMATION}`,
  );

  requireCurrentUserRegularFile(planPath, "adapter plan", true);
  const planValue = readJson(planPath);
  validateAgentPaidWorkWcEarningAdapterPlanV1(planValue);
  const plan = planValue as AgentPaidWorkWcEarningAdapterPlanV1;
  assertCondition(
    receiptPath ===
      path.join(plan.execution.private_output_dir, "adapter-execution-receipt-v1.json"),
    "receipt path must be inside the staged private output directory",
  );

  validateRuntimeFiles(plan);
  validateCurrentBindingRegistry(plan, registryPath);
  requirePrivateDirectory(plan.execution.private_output_dir, "private output directory");

  if (existsSync(receiptPath)) {
    requireCurrentUserRegularFile(receiptPath, "adapter receipt", true);
    const existing = readJson(receiptPath);
    validateAgentPaidWorkWcEarningAdapterReceiptV1(existing);
    assertCondition(
      (existing as JsonObject).plan_id === plan.plan_id,
      "stored adapter receipt belongs to a different plan",
    );
    process.stdout.write(
      `${JSON.stringify({
        ok: true,
        duplicate: true,
        participant_invoked: false,
        receipt: existing,
      })}\n`,
    );
    return;
  }

  assertCondition(
    Date.now() <= Date.parse(plan.expires_at_utc),
    "adapter plan has expired",
  );

  const lockDirectory = path.join(
    plan.execution.private_output_dir,
    `.execute-${plan.plan_id}.lock`,
  );
  mkdirSync(lockDirectory, { mode: 0o700 });

  try {
    const participantStateDirectory = path.join(
      plan.execution.private_output_dir,
      "participant-state",
    );
    if (!existsSync(participantStateDirectory)) {
      mkdirSync(participantStateDirectory, { recursive: true, mode: 0o700 });
      chmodSync(participantStateDirectory, 0o700);
    } else {
      requirePrivateDirectory(participantStateDirectory, "participant state directory");
    }

    let participant = chooseParticipantReceipt(
      participantStateDirectory,
      plan.binding.destination_wc_account,
    );
    let recovered = participant !== null;
    let stdout = "";
    let stderr = "";

    if (!participant) {
      requireCurrentUserRegularFile(plan.execution.ticket_path, "capability ticket", true);
      const result = spawnSync(
        "bash",
        [
          plan.runtime.participant_cli_path,
          plan.execution.ticket_path,
          plan.coordinator.base_url,
          plan.coordinator.node_id,
        ],
        {
          cwd: path.dirname(plan.runtime.participant_cli_path),
          encoding: "utf8",
          timeout: 180_000,
          env: {
            ...process.env,
            VOID_WC_PARTICIPANT_STATE_DIR: participantStateDirectory,
          },
          maxBuffer: 4 * 1024 * 1024,
        },
      );

      stdout = String(result.stdout || "");
      stderr = String(result.stderr || "");
      assertCondition(
        result.error === undefined && result.status === 0,
        `participant CLI failed exit=${String(result.status)} stdout_sha256=${sha256Bytes(stdout)} stderr_sha256=${sha256Bytes(stderr)}`,
      );

      participant = chooseParticipantReceipt(
        participantStateDirectory,
        plan.binding.destination_wc_account,
      );
      assertCondition(participant !== null, "participant CLI produced no matching receipt");
      recovered = false;
    }

    assertCondition(
      !existsSync(plan.execution.ticket_path),
      "participant exact-green result did not consume the ticket file",
    );

    const evidence = {
      participant_receipt_path: participant.file,
      participant_receipt_sha256: sha256File(participant.file),
      participant_stdout_sha256: sha256Bytes(stdout),
      participant_stderr_sha256: sha256Bytes(stderr),
      ticket_deleted: true as const,
      recovered_from_existing_participant_receipt: recovered,
    };

    const adapterReceipt = materializeAgentPaidWorkWcEarningAdapterReceiptV1(
      plan,
      participant.value,
      evidence,
      utcNow(),
    );
    validateAgentPaidWorkWcEarningAdapterReceiptV1(adapterReceipt);
    writeAtomicPrivate(receiptPath, adapterReceipt);
    requireCurrentUserRegularFile(receiptPath, "adapter receipt", true);

    process.stdout.write(
      `${JSON.stringify({
        ok: true,
        duplicate: false,
        participant_invoked: !recovered,
        recovered_from_existing_participant_receipt: recovered,
        adapter_receipt_id: adapterReceipt.adapter_receipt_id,
        plan_id: adapterReceipt.plan_id,
        account: adapterReceipt.binding.destination_wc_account,
        wc: adapterReceipt.wc,
        authority: adapterReceipt.authority,
        receipt_path: receiptPath,
        receipt_sha256: sha256File(receiptPath),
        raw_capability_token_printed: false,
      })}\n`,
    );
  } finally {
    rmSync(lockDirectory, { recursive: true, force: true });
  }
}

function usage(): never {
  return fail(
    [
      "usage:",
      "  tsx scripts/agent_paid_work_wc_earning_adapter_cli_v1.ts stage --submission-receipt PATH --work-order PATH --binding-registry PATH --selected-contract-receipt PATH --ticket PATH --participant-cli PATH --pilot-source PATH --acceptance-source PATH --coordinator-base URL --coordinator-node-id NODE --output-dir DIR --created-at-utc UTC --expires-at-utc UTC --nonce NONCE",
      "  tsx scripts/agent_paid_work_wc_earning_adapter_cli_v1.ts inspect --plan PATH --binding-registry PATH",
      `  tsx scripts/agent_paid_work_wc_earning_adapter_cli_v1.ts execute --plan PATH --binding-registry PATH --receipt PATH --confirm ${AGENT_PAID_WORK_WC_EARNING_ADAPTER_EXECUTE_CONFIRMATION}`,
    ].join("\n"),
  );
}

function main(): void {
  const [command, ...rest] = process.argv.slice(2);
  if (!command) usage();
  const flags = parseFlags(rest);

  if (command === "stage") {
    stage(flags);
    return;
  }
  if (command === "inspect") {
    inspect(flags);
    return;
  }
  if (command === "execute") {
    execute(flags);
    return;
  }

  usage();
}

try {
  main();
} catch (error) {
  process.stderr.write(
    `HOLD: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(2);
}
