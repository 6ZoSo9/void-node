import {
  chmodSync,
  closeSync,
  constants as fsConstants,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

export const AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_V1" as const;
export const AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_CONFIG_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_CONFIG_V1" as const;
export const AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_COMMAND_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_COMMAND_V1" as const;
export const AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_PLAN_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_PLAN_V1" as const;
export const AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_DECISION_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_DECISION_V1" as const;
export const AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_RESULT_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_RESULT_V1" as const;
export const AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_VERSION = 1 as const;
export const AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_CONFIRMATION =
  "reviewAuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesV1" as const;
export const AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_GATE_ID =
  "void.authenticated-paid-work.disabled-runtime.activation-prerequisites.v1" as const;

const SHA256 = /^[0-9a-f]{64}$/u;
const GIT_OBJECT_ID = /^[0-9a-f]{40}$/u;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,179}$/u;
const ISO_UTC_SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;
const PLAN_SUFFIX = "disabled-runtime-activation-prerequisites-plan-v1.json";
const DECISION_SUFFIX = "disabled-runtime-activation-prerequisites-decision-v1.json";
export const AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_MAX_RECEIPT_AGE_SECONDS =
  315_360_000 as const;

type JsonRecord = Record<string, unknown>;

export interface AuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesConfigV1 {
  marker: typeof AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_CONFIG_MARKER;
  version: typeof AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_VERSION;
  enabled: boolean;
  expected: {
    main_commit: string;
    pr894_merge: string;
    install_checkpoint_tag: string;
    install_checkpoint_target: string;
    install_mechanism_checkpoint_tag: string;
    install_mechanism_checkpoint_target: string;
    release_id: string;
    packet_id: string;
    packet_commit: string;
    runtime_source_commit: string;
    runtime_source_sha256: string;
    installer_receipt_sha256: string;
    execution_receipt_sha256: string;
    final_seal_receipt_sha256: string;
  };
  max_receipt_age_seconds: number;
}

export interface AuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesCommandV1 {
  marker: typeof AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_COMMAND_MARKER;
  version: typeof AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_VERSION;
  apply: boolean;
  confirmation: string;
  operation_id: string;
  evaluated_at_utc: string;
  install_root: string;
  installer_receipt_path: string;
  execution_receipt_path: string;
  final_seal_receipt_path: string;
  output_directory: string;
  caller_asserted: {
    main_commit: string;
    install_checkpoint_tag: string;
    install_checkpoint_target: string;
    install_mechanism_checkpoint_tag: string;
    install_mechanism_checkpoint_target: string;
  };
}

export interface AuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesAuthorityV1 {
  local_private_plan_write: boolean;
  local_private_decision_write: boolean;
  installation_mutation: false;
  configuration_enable_write: false;
  activation_persistence_root_create: false;
  credential_or_token_read: false;
  trusted_context_provider_call: false;
  authorization_header_materialized: false;
  service_unit_create: false;
  service_restart: false;
  network_listener_create: false;
  runtime_mount: false;
  external_http_request: false;
  quote_acceptance: false;
  payment_authorization: false;
  payment_execution: false;
  transaction_construction: false;
  transaction_broadcast: false;
  work_execution_authorization: false;
  work_dispatch: false;
  live_ticket_issuance: false;
  work_credit_write: false;
  wallet_or_signer_access: false;
  signing: false;
  void_settlement: false;
  fund_movement: false;
}

export interface AuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesPlanV1 {
  marker: typeof AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_PLAN_MARKER;
  version: typeof AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_VERSION;
  gate_id: typeof AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_GATE_ID;
  operation_id: string;
  generated_at_utc: string;
  status: "prerequisites_satisfied_activation_forbidden_separate_execution_lane_required";
  bindings: {
    main_commit: string;
    pr894_merge: string;
    install_checkpoint_tag: string;
    install_checkpoint_target: string;
    install_mechanism_checkpoint_tag: string;
    install_mechanism_checkpoint_target: string;
    install_root: string;
    release_id: string;
    packet_id: string;
    packet_commit: string;
    runtime_source_commit: string;
    runtime_source_sha256: string;
    installer_receipt_sha256: string;
    execution_receipt_sha256: string;
    final_seal_receipt_sha256: string;
  };
  gates: {
    caller_asserted_main_commit_matches_configured_expected: true;
    caller_asserted_install_checkpoint_matches_configured_expected: true;
    caller_asserted_install_mechanism_checkpoint_matches_configured_expected: true;
    install_root_owner_private: true;
    current_pointer_exact: true;
    release_tree_exact: true;
    release_modes_exact: true;
    release_hashes_exact: true;
    disabled_configuration_exact: true;
    installer_receipt_exact: true;
    execution_receipt_exact: true;
    final_seal_receipt_exact: true;
    receipt_chain_exact: true;
    installed_launcher_disabled: true;
    activation_persistence_absent: true;
    service_unit_absent: true;
    runtime_listener_absent: true;
    credential_reference_not_supplied: true;
    payment_execution_not_authorized: true;
    work_credit_write_not_authorized: true;
    wallet_access_not_authorized: true;
    fund_movement_not_authorized: true;
  };
  observation_provenance: {
    source: "caller_assertions";
    independently_observed: false;
  };
  required_future_artifacts: {
    activation_configuration_schema: true;
    activation_configuration_instance: true;
    trusted_context_reference_metadata: true;
    credential_reference_metadata: true;
    bounded_replay_snapshot: true;
    service_unit_design: true;
    rollback_plan: true;
    activation_execution_confirmation: true;
    live_canary_scope: true;
  };
  execution_boundary: {
    activation_configuration_written: false;
    activation_persistence_created: false;
    credential_or_token_read: false;
    trusted_context_provider_called: false;
    authorization_header_materialized: false;
    service_unit_created: false;
    service_restarted: false;
    runtime_listener_created: false;
    runtime_mounted: false;
    quote_accepted: false;
    payment_authorized: false;
    payment_executed: false;
    transaction_broadcast: false;
    work_dispatched: false;
    live_ticket_issued: false;
    work_credit_written: false;
    wallet_or_signer_accessed: false;
    void_settled: false;
    funds_moved: false;
    separate_activation_execution_lane_required: true;
  };
}

export interface AuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesDecisionV1 {
  marker: typeof AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_DECISION_MARKER;
  version: typeof AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_VERSION;
  gate_id: typeof AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_GATE_ID;
  operation_id: string;
  decision: "hold_activation_separate_execution_lane_required";
  confirmation_verified: true;
  plan_path: string;
  plan_sha256: string;
  authority: AuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesAuthorityV1;
}

export interface AuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesResultV1 {
  marker: typeof AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_RESULT_MARKER;
  version: typeof AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_VERSION;
  gate_id: typeof AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_GATE_ID;
  status: "disabled" | "validated_in_memory" | "validated_and_written";
  enabled: boolean;
  apply: boolean;
  confirmation_verified: boolean;
  plan: AuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesPlanV1 | null;
  artifacts: {
    output_directory: string | null;
    plan_path: string | null;
    decision_path: string | null;
    private_files_written: boolean;
  };
  authority: AuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesAuthorityV1;
}

function fail(message: string): never {
  throw new Error(
    `${AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_MARKER}: ${message}`,
  );
}

function requireCondition(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

function record(value: unknown, label: string): JsonRecord {
  requireCondition(value !== null && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  return value as JsonRecord;
}

function exactKeys(value: JsonRecord, keys: readonly string[], label: string): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  requireCondition(JSON.stringify(actual) === JSON.stringify(expected), `${label} keys mismatch`);
}

function text(value: unknown, label: string): string {
  requireCondition(typeof value === "string", `${label} must be a string`);
  return value;
}

function string(value: unknown, label: string): string {
  requireCondition(typeof value === "string" && value.length > 0, `${label} must be a non-empty string`);
  return value;
}

function bool(value: unknown, label: string): boolean {
  requireCondition(typeof value === "boolean", `${label} must be boolean`);
  return value;
}

function integer(
  value: unknown,
  label: string,
  minimum = 0,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  requireCondition(
    Number.isSafeInteger(value) && (value as number) >= minimum && (value as number) <= maximum,
    `${label} must be an integer between ${minimum} and ${maximum}`,
  );
  return value as number;
}

function sha(value: unknown, label: string): string {
  const parsed = string(value, label);
  requireCondition(SHA256.test(parsed), `${label} must be lowercase SHA-256`);
  return parsed;
}

function gitObjectId(value: unknown, label: string): string {
  const parsed = string(value, label);
  requireCondition(
    GIT_OBJECT_ID.test(parsed),
    `${label} must be lowercase 40-character Git object ID`,
  );
  return parsed;
}

function id(value: unknown, label: string): string {
  const parsed = string(value, label);
  requireCondition(ID.test(parsed), `${label} is invalid`);
  return parsed;
}

function utc(value: unknown, label: string): string {
  const parsed = string(value, label);
  requireCondition(ISO_UTC_SECONDS.test(parsed), `${label} must be UTC seconds`);
  requireCondition(!Number.isNaN(Date.parse(parsed)), `${label} is invalid`);
  return parsed;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value as JsonRecord)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digestBytes(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function digestFile(pathname: string): string {
  return digestBytes(readFileSync(pathname));
}

function readJson(pathname: string, label: string): JsonRecord {
  const stat = lstatSync(pathname);
  requireCondition(stat.isFile() && !stat.isSymbolicLink(), `${label} must be a regular file`);
  requireCurrentUserOwned(stat, label);
  return record(JSON.parse(readFileSync(pathname, "utf8")) as unknown, label);
}

function requireCurrentUserOwned(
  stat: NonNullable<ReturnType<typeof lstatSync>>,
  label: string,
): void {
  if (typeof process.geteuid !== "function") return;
  requireCondition(stat.uid === process.geteuid(), `${label} must be owned by the executing user`);
}

function requireOwnedRegularFile(pathname: string, expectedMode: number, label: string): void {
  const stat = lstatSync(pathname);
  requireCondition(stat.isFile() && !stat.isSymbolicLink(), `${label} must be a regular file`);
  requireCurrentUserOwned(stat, label);
  requireCondition((stat.mode & 0o777) === expectedMode, `${label} mode mismatch`);
}

function ownerPrivateDirectory(pathname: string, label: string): string {
  const real = realpathSync(pathname);
  const stat = lstatSync(real);
  requireCondition(stat.isDirectory() && !stat.isSymbolicLink(), `${label} must be a directory`);
  requireCurrentUserOwned(stat, label);
  requireCondition((stat.mode & 0o077) === 0, `${label} must be owner-private`);
  return real;
}

function contained(root: string, ...parts: string[]): string {
  const candidate = path.resolve(root, ...parts);
  requireCondition(candidate === root || candidate.startsWith(`${root}${path.sep}`), "path escapes root");
  return candidate;
}

function requireMode(pathname: string, expected: number, label: string): void {
  const stat = lstatSync(pathname);
  requireCondition(!stat.isSymbolicLink(), `${label} must not be symlinked`);
  requireCurrentUserOwned(stat, label);
  requireCondition((stat.mode & 0o777) === expected, `${label} mode mismatch`);
}

function isEqualToOrContainedBy(root: string, candidate: string): boolean {
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
}

function resolveNewDirectoryTarget(pathname: string, label: string): string {
  const basename = path.basename(pathname);
  requireCondition(basename.length > 0, `${label} must name a new directory`);
  const parent = realpathSync(path.dirname(pathname));
  const parentStat = lstatSync(parent);
  requireCondition(parentStat.isDirectory() && !parentStat.isSymbolicLink(), `${label} parent must be a directory`);
  requireCurrentUserOwned(parentStat, `${label} parent`);
  return path.join(parent, basename);
}

interface ReleaseTreeV1 {
  files: string[];
  directories: string[];
}

function enumerateReleaseTree(root: string): ReleaseTreeV1 {
  const tree: ReleaseTreeV1 = { files: [], directories: [] };
  const visit = (directory: string, relativeDirectory: string): void => {
    const entries = readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    for (const entry of entries) {
      const relative = relativeDirectory
        ? path.posix.join(relativeDirectory, entry.name)
        : entry.name;
      const target = contained(root, ...relative.split("/"));
      const stat = lstatSync(target);
      requireCurrentUserOwned(stat, `release tree entry ${relative}`);
      requireCondition(!stat.isSymbolicLink(), `release tree entry must not be symlinked: ${relative}`);
      if (stat.isDirectory()) {
        requireCondition((stat.mode & 0o777) === 0o500, `release directory mode mismatch: ${relative}`);
        tree.directories.push(relative);
        visit(target, relative);
      } else if (stat.isFile()) {
        const expectedMode = relative === "run-disabled.sh" ? 0o500 : 0o400;
        requireCondition((stat.mode & 0o777) === expectedMode, `release file mode mismatch: ${relative}`);
        tree.files.push(relative);
      } else {
        fail(`release tree entry must be a regular file or directory: ${relative}`);
      }
    }
  };
  visit(root, "");
  return tree;
}

function parseChecksumManifest(value: string): Map<string, string> {
  const trimmed = value.trim();
  requireCondition(trimmed.length > 0, "release checksum manifest must not be empty");
  const entries = new Map<string, string>();
  for (const line of trimmed.split("\n")) {
    const match = /^([0-9a-f]{64})  ([^\r\n]+)$/u.exec(line);
    requireCondition(match !== null, "release checksum entry invalid");
    const expectedDigest = match[1]!;
    const relative = match[2]!;
    requireCondition(
      relative !== "." &&
        !path.posix.isAbsolute(relative) &&
        !relative.includes("\\") &&
        path.posix.normalize(relative) === relative &&
        !relative.startsWith("../"),
      `release checksum path invalid: ${relative}`,
    );
    requireCondition(relative !== "SHA256SUMS.txt", "release checksum manifest must not self-reference");
    requireCondition(!entries.has(relative), `duplicate release checksum path: ${relative}`);
    entries.set(relative, expectedDigest);
  }
  return entries;
}

function impliedDirectories(files: readonly string[]): string[] {
  const directories = new Set<string>();
  for (const file of files) {
    let current = path.posix.dirname(file);
    while (current !== ".") {
      directories.add(current);
      current = path.posix.dirname(current);
    }
  }
  return [...directories].sort();
}

function writePrivate(pathname: string, value: unknown): void {
  const fd = openSync(
    pathname,
    fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW,
    0o600,
  );
  try {
    writeFileSync(fd, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  } finally {
    closeSync(fd);
  }
  chmodSync(pathname, 0o600);
}

function authority(localWrites: boolean): AuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesAuthorityV1 {
  return {
    local_private_plan_write: localWrites,
    local_private_decision_write: localWrites,
    installation_mutation: false,
    configuration_enable_write: false,
    activation_persistence_root_create: false,
    credential_or_token_read: false,
    trusted_context_provider_call: false,
    authorization_header_materialized: false,
    service_unit_create: false,
    service_restart: false,
    network_listener_create: false,
    runtime_mount: false,
    external_http_request: false,
    quote_acceptance: false,
    payment_authorization: false,
    payment_execution: false,
    transaction_construction: false,
    transaction_broadcast: false,
    work_execution_authorization: false,
    work_dispatch: false,
    live_ticket_issuance: false,
    work_credit_write: false,
    wallet_or_signer_access: false,
    signing: false,
    void_settlement: false,
    fund_movement: false,
  };
}

export function validateAuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesConfigV1(
  value: unknown,
): AuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesConfigV1 {
  const root = record(value, "config");
  exactKeys(root, ["marker", "version", "enabled", "expected", "max_receipt_age_seconds"], "config");
  requireCondition(root.marker === AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_CONFIG_MARKER, "config marker mismatch");
  requireCondition(root.version === 1, "config version mismatch");
  const expected = record(root.expected, "config.expected");
  exactKeys(expected, [
    "main_commit", "pr894_merge", "install_checkpoint_tag", "install_checkpoint_target",
    "install_mechanism_checkpoint_tag", "install_mechanism_checkpoint_target", "release_id",
    "packet_id", "packet_commit", "runtime_source_commit", "runtime_source_sha256",
    "installer_receipt_sha256", "execution_receipt_sha256", "final_seal_receipt_sha256",
  ], "config.expected");
  const parsed: AuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesConfigV1 = {
    marker: AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_CONFIG_MARKER,
    version: 1,
    enabled: bool(root.enabled, "config.enabled"),
    expected: {
      main_commit: gitObjectId(expected.main_commit, "config.expected.main_commit"),
      pr894_merge: gitObjectId(expected.pr894_merge, "config.expected.pr894_merge"),
      install_checkpoint_tag: id(expected.install_checkpoint_tag, "config.expected.install_checkpoint_tag"),
      install_checkpoint_target: gitObjectId(expected.install_checkpoint_target, "config.expected.install_checkpoint_target"),
      install_mechanism_checkpoint_tag: id(expected.install_mechanism_checkpoint_tag, "config.expected.install_mechanism_checkpoint_tag"),
      install_mechanism_checkpoint_target: gitObjectId(expected.install_mechanism_checkpoint_target, "config.expected.install_mechanism_checkpoint_target"),
      release_id: id(expected.release_id, "config.expected.release_id"),
      packet_id: id(expected.packet_id, "config.expected.packet_id"),
      packet_commit: gitObjectId(expected.packet_commit, "config.expected.packet_commit"),
      runtime_source_commit: gitObjectId(expected.runtime_source_commit, "config.expected.runtime_source_commit"),
      runtime_source_sha256: sha(expected.runtime_source_sha256, "config.expected.runtime_source_sha256"),
      installer_receipt_sha256: sha(expected.installer_receipt_sha256, "config.expected.installer_receipt_sha256"),
      execution_receipt_sha256: sha(expected.execution_receipt_sha256, "config.expected.execution_receipt_sha256"),
      final_seal_receipt_sha256: sha(expected.final_seal_receipt_sha256, "config.expected.final_seal_receipt_sha256"),
    },
    max_receipt_age_seconds: integer(
      root.max_receipt_age_seconds,
      "config.max_receipt_age_seconds",
      1,
      AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_MAX_RECEIPT_AGE_SECONDS,
    ),
  };
  return parsed;
}

export function validateAuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesCommandV1(
  value: unknown,
): AuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesCommandV1 {
  const root = record(value, "command");
  exactKeys(root, [
    "marker", "version", "apply", "confirmation", "operation_id", "evaluated_at_utc",
    "install_root", "installer_receipt_path", "execution_receipt_path", "final_seal_receipt_path",
    "output_directory", "caller_asserted",
  ], "command");
  requireCondition(root.marker === AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_COMMAND_MARKER, "command marker mismatch");
  requireCondition(root.version === 1, "command version mismatch");
  const callerAsserted = record(root.caller_asserted, "command.caller_asserted");
  exactKeys(callerAsserted, [
    "main_commit", "install_checkpoint_tag", "install_checkpoint_target",
    "install_mechanism_checkpoint_tag", "install_mechanism_checkpoint_target",
  ], "command.caller_asserted");
  return {
    marker: AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_COMMAND_MARKER,
    version: 1,
    apply: bool(root.apply, "command.apply"),
    confirmation: text(root.confirmation, "command.confirmation"),
    operation_id: id(root.operation_id, "command.operation_id"),
    evaluated_at_utc: utc(root.evaluated_at_utc, "command.evaluated_at_utc"),
    install_root: path.resolve(string(root.install_root, "command.install_root")),
    installer_receipt_path: path.resolve(string(root.installer_receipt_path, "command.installer_receipt_path")),
    execution_receipt_path: path.resolve(string(root.execution_receipt_path, "command.execution_receipt_path")),
    final_seal_receipt_path: path.resolve(string(root.final_seal_receipt_path, "command.final_seal_receipt_path")),
    output_directory: path.resolve(string(root.output_directory, "command.output_directory")),
    caller_asserted: {
      main_commit: gitObjectId(callerAsserted.main_commit, "command.caller_asserted.main_commit"),
      install_checkpoint_tag: id(callerAsserted.install_checkpoint_tag, "command.caller_asserted.install_checkpoint_tag"),
      install_checkpoint_target: gitObjectId(callerAsserted.install_checkpoint_target, "command.caller_asserted.install_checkpoint_target"),
      install_mechanism_checkpoint_tag: id(callerAsserted.install_mechanism_checkpoint_tag, "command.caller_asserted.install_mechanism_checkpoint_tag"),
      install_mechanism_checkpoint_target: gitObjectId(callerAsserted.install_mechanism_checkpoint_target, "command.caller_asserted.install_mechanism_checkpoint_target"),
    },
  };
}

function disabledResult(): AuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesResultV1 {
  return {
    marker: AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_RESULT_MARKER,
    version: 1,
    gate_id: AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_GATE_ID,
    status: "disabled",
    enabled: false,
    apply: false,
    confirmation_verified: false,
    plan: null,
    artifacts: {
      output_directory: null,
      plan_path: null,
      decision_path: null,
      private_files_written: false,
    },
    authority: authority(false),
  };
}

function validateReceiptAge(value: JsonRecord, evaluatedAt: string, maximum: number, label: string): void {
  const generated = string(value.generated_at_utc, `${label}.generated_at_utc`);
  requireCondition(!Number.isNaN(Date.parse(generated)), `${label}.generated_at_utc invalid`);
  const age = (Date.parse(evaluatedAt) - Date.parse(generated)) / 1000;
  requireCondition(age >= 0 && age <= maximum, `${label} outside receipt age window`);
}

export function executeAuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesV1(
  configValue: unknown,
  commandValue: unknown,
): AuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesResultV1 {
  const config = validateAuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesConfigV1(configValue);
  if (!config.enabled) return disabledResult();

  const command = validateAuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesCommandV1(commandValue);
  if (command.apply) {
    requireCondition(
      command.confirmation === AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_CONFIRMATION,
      "apply confirmation mismatch",
    );
  }

  const output = command.apply
    ? resolveNewDirectoryTarget(command.output_directory, "output directory")
    : null;

  const expected = config.expected;
  requireCondition(command.caller_asserted.main_commit === expected.main_commit, "caller-asserted main commit mismatch");
  requireCondition(command.caller_asserted.install_checkpoint_tag === expected.install_checkpoint_tag, "caller-asserted install checkpoint tag mismatch");
  requireCondition(command.caller_asserted.install_checkpoint_target === expected.install_checkpoint_target, "caller-asserted install checkpoint target mismatch");
  requireCondition(command.caller_asserted.install_mechanism_checkpoint_tag === expected.install_mechanism_checkpoint_tag, "caller-asserted install mechanism checkpoint tag mismatch");
  requireCondition(command.caller_asserted.install_mechanism_checkpoint_target === expected.install_mechanism_checkpoint_target, "caller-asserted install mechanism checkpoint target mismatch");

  const installRoot = ownerPrivateDirectory(command.install_root, "install root");
  if (output !== null) {
    requireCondition(
      !isEqualToOrContainedBy(installRoot, output),
      "output directory must be outside the validated install root",
    );
  }
  requireCondition(!existsSync(contained(installRoot, "activation")), "activation persistence root already exists");
  requireCondition(!existsSync(contained(installRoot, "enabled-config.json")), "enabled configuration already exists");
  requireCondition(!existsSync(contained(installRoot, "service-unit.json")), "service unit design already materialized");

  const currentPath = contained(installRoot, "current");
  const currentStat = lstatSync(currentPath);
  requireCondition(currentStat.isSymbolicLink(), "current pointer must be a symlink");
  requireCurrentUserOwned(currentStat, "current pointer");
  const expectedTarget = `releases/${expected.release_id}`;
  requireCondition(readlinkSync(currentPath) === expectedTarget, "current pointer link text mismatch");
  const resolvedRelease = realpathSync(currentPath);
  const release = contained(installRoot, "releases", expected.release_id);
  requireCondition(resolvedRelease === release, "current pointer target mismatch");
  requireMode(contained(installRoot, "releases"), 0o700, "releases directory");
  requireMode(release, 0o500, "release directory");

  const manifestPath = contained(release, "INSTALLATION.json");
  const configPath = contained(release, "disabled-config.json");
  const sumsPath = contained(release, "SHA256SUMS.txt");
  const launcherPath = contained(release, "run-disabled.sh");
  requireMode(manifestPath, 0o400, "installation manifest");
  requireMode(configPath, 0o400, "disabled config");
  requireMode(sumsPath, 0o400, "release checksum manifest");
  requireMode(launcherPath, 0o500, "disabled launcher");

  const manifest = readJson(manifestPath, "installation manifest");
  const disabledConfig = readJson(configPath, "disabled config");
  requireCondition(manifest.release_id === expected.release_id, "release ID mismatch");
  requireCondition(manifest.packet_id === expected.packet_id, "packet ID mismatch");
  requireCondition(manifest.packet_commit === expected.packet_commit, "packet commit mismatch");
  requireCondition(manifest.runtime_source_commit === expected.runtime_source_commit, "runtime source commit mismatch");
  requireCondition(manifest.runtime_source_sha256 === expected.runtime_source_sha256, "runtime source SHA mismatch");
  requireCondition(manifest.ready_for_activation === false, "installation manifest permits activation");
  requireCondition(disabledConfig.enabled === false, "installed configuration is enabled");
  requireCondition(disabledConfig.persistence_config === null, "installed persistence configuration exists");

  const checksumEntries = parseChecksumManifest(readFileSync(sumsPath, "utf8"));
  const releaseTree = enumerateReleaseTree(release);
  const expectedFiles = [...checksumEntries.keys()].sort();
  const actualFiles = releaseTree.files.filter((relative) => relative !== "SHA256SUMS.txt").sort();
  requireCondition(
    JSON.stringify(actualFiles) === JSON.stringify(expectedFiles),
    "release tree file set mismatch",
  );
  requireCondition(
    JSON.stringify(releaseTree.directories.sort()) === JSON.stringify(impliedDirectories(expectedFiles)),
    "release tree directory set mismatch",
  );
  for (const [relative, expectedDigest] of checksumEntries) {
    const target = contained(release, ...relative.split("/"));
    requireCondition(digestFile(target) === expectedDigest, `release checksum mismatch: ${relative}`);
  }

  requireOwnedRegularFile(command.installer_receipt_path, 0o600, "installer receipt");
  requireOwnedRegularFile(command.execution_receipt_path, 0o600, "execution receipt");
  requireOwnedRegularFile(command.final_seal_receipt_path, 0o600, "final seal receipt");
  requireCondition(digestFile(command.installer_receipt_path) === expected.installer_receipt_sha256, "installer receipt SHA mismatch");
  requireCondition(digestFile(command.execution_receipt_path) === expected.execution_receipt_sha256, "execution receipt SHA mismatch");
  requireCondition(digestFile(command.final_seal_receipt_path) === expected.final_seal_receipt_sha256, "final seal receipt SHA mismatch");

  const installer = readJson(command.installer_receipt_path, "installer receipt");
  const execution = readJson(command.execution_receipt_path, "execution receipt");
  const seal = readJson(command.final_seal_receipt_path, "final seal receipt");
  validateReceiptAge(installer, command.evaluated_at_utc, config.max_receipt_age_seconds, "installer receipt");
  validateReceiptAge(execution, command.evaluated_at_utc, config.max_receipt_age_seconds, "execution receipt");
  validateReceiptAge(seal, command.evaluated_at_utc, config.max_receipt_age_seconds, "final seal receipt");

  requireCondition(installer.marker === "VOID_AUTHENTICATED_PAID_WORK_RUNTIME_DISABLED_PRODUCTION_INSTALL_RECEIPT_V1", "installer receipt marker mismatch");
  requireCondition(installer.status === "installed", "installer receipt status mismatch");
  requireCondition(installer.ready_for_activation === false, "installer receipt permits activation");
  requireCondition(execution.marker === "VOID_PAID_WORK_DISABLED_PRODUCTION_INSTALL_EXECUTION_V1", "execution receipt marker mismatch");
  requireCondition(execution.status === "exact_green", "execution receipt status mismatch");
  requireCondition(record(execution.installation, "execution.installation").ready_for_activation === false, "execution receipt permits activation");
  requireCondition(seal.marker === "VOID_PAID_WORK_DISABLED_PRODUCTION_INSTALL_FINAL_SEAL_V1", "seal receipt marker mismatch");
  requireCondition(seal.status === "exact_green", "seal receipt status mismatch");
  requireCondition(record(seal.verification, "seal.verification").ready_for_activation === false, "seal receipt permits activation");

  const plan: AuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesPlanV1 = {
    marker: AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_PLAN_MARKER,
    version: 1,
    gate_id: AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_GATE_ID,
    operation_id: command.operation_id,
    generated_at_utc: command.evaluated_at_utc,
    status: "prerequisites_satisfied_activation_forbidden_separate_execution_lane_required",
    bindings: {
      main_commit: expected.main_commit,
      pr894_merge: expected.pr894_merge,
      install_checkpoint_tag: expected.install_checkpoint_tag,
      install_checkpoint_target: expected.install_checkpoint_target,
      install_mechanism_checkpoint_tag: expected.install_mechanism_checkpoint_tag,
      install_mechanism_checkpoint_target: expected.install_mechanism_checkpoint_target,
      install_root: installRoot,
      release_id: expected.release_id,
      packet_id: expected.packet_id,
      packet_commit: expected.packet_commit,
      runtime_source_commit: expected.runtime_source_commit,
      runtime_source_sha256: expected.runtime_source_sha256,
      installer_receipt_sha256: expected.installer_receipt_sha256,
      execution_receipt_sha256: expected.execution_receipt_sha256,
      final_seal_receipt_sha256: expected.final_seal_receipt_sha256,
    },
    gates: {
      caller_asserted_main_commit_matches_configured_expected: true,
      caller_asserted_install_checkpoint_matches_configured_expected: true,
      caller_asserted_install_mechanism_checkpoint_matches_configured_expected: true,
      install_root_owner_private: true,
      current_pointer_exact: true,
      release_tree_exact: true,
      release_modes_exact: true,
      release_hashes_exact: true,
      disabled_configuration_exact: true,
      installer_receipt_exact: true,
      execution_receipt_exact: true,
      final_seal_receipt_exact: true,
      receipt_chain_exact: true,
      installed_launcher_disabled: true,
      activation_persistence_absent: true,
      service_unit_absent: true,
      runtime_listener_absent: true,
      credential_reference_not_supplied: true,
      payment_execution_not_authorized: true,
      work_credit_write_not_authorized: true,
      wallet_access_not_authorized: true,
      fund_movement_not_authorized: true,
    },
    observation_provenance: {
      source: "caller_assertions",
      independently_observed: false,
    },
    required_future_artifacts: {
      activation_configuration_schema: true,
      activation_configuration_instance: true,
      trusted_context_reference_metadata: true,
      credential_reference_metadata: true,
      bounded_replay_snapshot: true,
      service_unit_design: true,
      rollback_plan: true,
      activation_execution_confirmation: true,
      live_canary_scope: true,
    },
    execution_boundary: {
      activation_configuration_written: false,
      activation_persistence_created: false,
      credential_or_token_read: false,
      trusted_context_provider_called: false,
      authorization_header_materialized: false,
      service_unit_created: false,
      service_restarted: false,
      runtime_listener_created: false,
      runtime_mounted: false,
      quote_accepted: false,
      payment_authorized: false,
      payment_executed: false,
      transaction_broadcast: false,
      work_dispatched: false,
      live_ticket_issued: false,
      work_credit_written: false,
      wallet_or_signer_accessed: false,
      void_settled: false,
      funds_moved: false,
      separate_activation_execution_lane_required: true,
    },
  };

  if (!command.apply) {
    return {
      marker: AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_RESULT_MARKER,
      version: 1,
      gate_id: AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_GATE_ID,
      status: "validated_in_memory",
      enabled: true,
      apply: false,
      confirmation_verified: false,
      plan,
      artifacts: {
        output_directory: null,
        plan_path: null,
        decision_path: null,
        private_files_written: false,
      },
      authority: authority(false),
    };
  }

  requireCondition(output !== null, "output directory resolution missing");
  requireCondition(!existsSync(output), "output directory already exists");
  mkdirSync(output, { mode: 0o700, recursive: false });
  chmodSync(output, 0o700);
  const planPath = contained(output, `${command.operation_id}-${PLAN_SUFFIX}`);
  const decisionPath = contained(output, `${command.operation_id}-${DECISION_SUFFIX}`);
  writePrivate(planPath, plan);
  const decision: AuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesDecisionV1 = {
    marker: AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_DECISION_MARKER,
    version: 1,
    gate_id: AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_GATE_ID,
    operation_id: command.operation_id,
    decision: "hold_activation_separate_execution_lane_required",
    confirmation_verified: true,
    plan_path: planPath,
    plan_sha256: digestBytes(Buffer.from(canonical(plan), "utf8")),
    authority: authority(true),
  };
  writePrivate(decisionPath, decision);

  return {
    marker: AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_RESULT_MARKER,
    version: 1,
    gate_id: AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_GATE_ID,
    status: "validated_and_written",
    enabled: true,
    apply: true,
    confirmation_verified: true,
    plan,
    artifacts: {
      output_directory: output,
      plan_path: planPath,
      decision_path: decisionPath,
      private_files_written: true,
    },
    authority: authority(true),
  };
}
