import {
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_COMMAND_MARKER,
  AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_CONFIG_MARKER,
  AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_CONFIRMATION,
  AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_MAX_RECEIPT_AGE_SECONDS,
  executeAuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesV1,
  validateAuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesConfigV1,
} from "./authenticated_paid_work_runtime_disabled_production_activation_prerequisites_v1.js";

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function sha(pathname: string): string {
  return createHash("sha256").update(readFileSync(pathname)).digest("hex");
}

function expectReject(action: () => unknown, fragment: string): void {
  try {
    action();
  } catch (error) {
    assertCondition(error instanceof Error, "expected Error");
    assertCondition(error.message.includes(fragment), `missing rejection fragment: ${fragment}`);
    return;
  }
  throw new Error(`expected rejection: ${fragment}`);
}

type JsonRecord = Record<string, unknown>;

function schemaAccepts(value: unknown, schemaValue: unknown): boolean {
  if (schemaValue === null || typeof schemaValue !== "object" || Array.isArray(schemaValue)) return false;
  const schema = schemaValue as JsonRecord;
  if (Object.hasOwn(schema, "const") && value !== schema.const) return false;
  if (schema.type === "boolean" && typeof value !== "boolean") return false;
  if (schema.type === "string") {
    if (typeof value !== "string") return false;
    if (typeof schema.minLength === "number" && value.length < schema.minLength) return false;
    if (typeof schema.maxLength === "number" && value.length > schema.maxLength) return false;
    if (typeof schema.pattern === "string" && !new RegExp(schema.pattern, "u").test(value)) return false;
  }
  if (schema.type === "integer") {
    if (!Number.isSafeInteger(value)) return false;
    if (typeof schema.minimum === "number" && (value as number) < schema.minimum) return false;
    if (typeof schema.maximum === "number" && (value as number) > schema.maximum) return false;
  }
  if (schema.type === "object") {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    const object = value as JsonRecord;
    const properties =
      schema.properties !== null && typeof schema.properties === "object" && !Array.isArray(schema.properties)
        ? (schema.properties as JsonRecord)
        : {};
    if (Array.isArray(schema.required)) {
      for (const key of schema.required) {
        if (typeof key !== "string" || !Object.hasOwn(object, key)) return false;
      }
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(object)) {
        if (!Object.hasOwn(properties, key)) return false;
      }
    }
    for (const [key, propertySchema] of Object.entries(properties)) {
      if (Object.hasOwn(object, key) && !schemaAccepts(object[key], propertySchema)) return false;
    }
  }
  return true;
}

function runtimeAcceptsConfig(value: unknown): boolean {
  try {
    validateAuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesConfigV1(value);
    return true;
  } catch {
    return false;
  }
}

function assertConfigParity(
  value: unknown,
  schema: unknown,
  expected: boolean,
  label: string,
): void {
  assertCondition(schemaAccepts(value, schema) === expected, `${label} schema acceptance mismatch`);
  assertCondition(runtimeAcceptsConfig(value) === expected, `${label} runtime acceptance mismatch`);
}

function sealReleaseTree(directory: string, root = directory): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      sealReleaseTree(target, root);
      chmodSync(target, 0o500);
    } else if (entry.isFile()) {
      const relative = path.relative(root, target).split(path.sep).join("/");
      chmodSync(target, relative === "run-disabled.sh" ? 0o500 : 0o400);
    }
  }
  if (directory === root) chmodSync(root, 0o500);
}

function makeReleaseTreeWritable(directory: string): void {
  chmodSync(directory, 0o700);
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) makeReleaseTreeWritable(target);
    else if (!entry.isSymbolicLink()) chmodSync(target, 0o600);
  }
}

const fixture = path.resolve(
  process.env.VOID_ACTIVATION_PREREQUISITES_SOURCE_PACKET_PAYLOAD ??
    path.resolve("fixtures/paid-work-disabled-runtime-activation-prerequisites-v1"),
);
const installedSource = path.join(
  fixture,
  "paid-work-runtime-disabled-v1-3b298bc1e313-64841279f90d",
);
const temporary = mkdtempSync(path.join(tmpdir(), "void-activation-prerequisites-v1-"));
const installRoot = path.join(temporary, "install");
const releaseId = "paid-work-runtime-disabled-v1-3b298bc1e313-64841279f90d";
const release = path.join(installRoot, "releases", releaseId);
const receipts = path.join(temporary, "receipts");

try {
  mkdirSync(path.join(installRoot, "releases"), { recursive: true, mode: 0o700 });
  cpSync(installedSource, release, { recursive: true, preserveTimestamps: true });
  chmodSync(installRoot, 0o700);
  chmodSync(path.join(installRoot, "releases"), 0o700);
  sealReleaseTree(release);
  symlinkSync(`releases/${releaseId}`, path.join(installRoot, "current"));

  mkdirSync(receipts, { mode: 0o700 });
  const installerReceipt = path.join(receipts, "installer.json");
  const executionReceipt = path.join(receipts, "execution.json");
  const sealReceipt = path.join(receipts, "seal.json");
  copyFileSync(path.join(fixture, "installer-receipt.json"), installerReceipt);
  copyFileSync(path.join(fixture, "execution-receipt.json"), executionReceipt);
  copyFileSync(path.join(fixture, "final-seal-receipt.json"), sealReceipt);
  chmodSync(installerReceipt, 0o600);
  chmodSync(executionReceipt, 0o600);
  chmodSync(sealReceipt, 0o600);

  const config = {
    marker: AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_CONFIG_MARKER,
    version: 1,
    enabled: true,
    expected: {
      main_commit: "b9b8189347a12bfe0528f980f4edb7dffd3e6e1a",
      pr894_merge: "3074bd4f253082841630312a8353946321b5a97e",
      install_checkpoint_tag:
        "ckpt-authenticated-paid-work-runtime-disabled-production-install-v1-exact-green-20260731T190348Z",
      install_checkpoint_target: "b9b8189347a12bfe0528f980f4edb7dffd3e6e1a",
      install_mechanism_checkpoint_tag:
        "ckpt-authenticated-paid-work-runtime-disabled-production-install-mechanism-v1-postmerge-exact-green-20260731T184300Z",
      install_mechanism_checkpoint_target: "3074bd4f253082841630312a8353946321b5a97e",
      release_id: releaseId,
      packet_id: "voidapwrdp1_64841279f90db042c455ed8bdd3e865cb9a791b224bffc309acae11696bc9784",
      packet_commit: "eaa41fdf76044c88eb9c078046bd370acb3ee457",
      runtime_source_commit: "3b298bc1e31365aec7a20d03c3f425e22fd2f949",
      runtime_source_sha256: "3248f5720121d699e5ea4fe34554f7c0ee75ae1f751a8ade7f0a93e3ce72f1b7",
      installer_receipt_sha256: sha(installerReceipt),
      execution_receipt_sha256: sha(executionReceipt),
      final_seal_receipt_sha256: sha(sealReceipt),
    },
    max_receipt_age_seconds: 31536000,
  };

  const configSchema = JSON.parse(
    readFileSync(
      path.resolve(
        "schemas/authenticated-paid-work-runtime-disabled-production-activation-prerequisites-v1.schema.json",
      ),
      "utf8",
    ),
  ) as unknown;
  assertConfigParity(config, configSchema, true, "valid config");
  assertConfigParity(
    {
      ...config,
      expected: { ...config.expected, install_checkpoint_tag: "bad tag" },
    },
    configSchema,
    false,
    "invalid ID config",
  );
  assertConfigParity(
    {
      ...config,
      max_receipt_age_seconds:
        AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_MAX_RECEIPT_AGE_SECONDS +
        1,
    },
    configSchema,
    false,
    "excessive receipt age config",
  );

  const command = {
    marker: AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_COMMAND_MARKER,
    version: 1,
    apply: false,
    confirmation: "",
    operation_id: "activation-prerequisites-proof-v1",
    evaluated_at_utc: "2026-07-31T19:04:00Z",
    install_root: installRoot,
    installer_receipt_path: installerReceipt,
    execution_receipt_path: executionReceipt,
    final_seal_receipt_path: sealReceipt,
    output_directory: path.join(temporary, "output"),
    caller_asserted: {
      main_commit: config.expected.main_commit,
      install_checkpoint_tag: config.expected.install_checkpoint_tag,
      install_checkpoint_target: config.expected.install_checkpoint_target,
      install_mechanism_checkpoint_tag: config.expected.install_mechanism_checkpoint_tag,
      install_mechanism_checkpoint_target: config.expected.install_mechanism_checkpoint_target,
    },
  };

  expectReject(
    () =>
      executeAuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesV1(
        {
          ...config,
          expected: {
            ...config.expected,
            main_commit: "a".repeat(64),
          },
        },
        command,
      ),
    "config.expected.main_commit must be lowercase 40-character Git object ID",
  );

  const disabled = executeAuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesV1(
    { ...config, enabled: false },
    command,
  );
  assertCondition(disabled.status === "disabled", "disabled-by-default mismatch");
  assertCondition(disabled.plan === null, "disabled mode built a plan");

  const planned = executeAuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesV1(config, command);
  assertCondition(planned.status === "validated_in_memory", "dry-run status mismatch");
  assertCondition(planned.plan !== null, "dry-run plan missing");
  assertCondition(
    planned.plan.status ===
      "prerequisites_satisfied_activation_forbidden_separate_execution_lane_required",
    "terminal plan status mismatch",
  );
  assertCondition(
    planned.plan.observation_provenance.source === "caller_assertions" &&
      planned.plan.observation_provenance.independently_observed === false,
    "caller-assertion provenance mismatch",
  );
  assertCondition(planned.plan.execution_boundary.separate_activation_execution_lane_required, "separate lane boundary missing");

  for (const [key, value] of Object.entries(planned.authority)) {
    assertCondition(value === false, `dry-run authority enabled: ${key}`);
  }

  expectReject(
    () =>
      executeAuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesV1(config, {
        ...command,
        apply: true,
        confirmation: "wrong",
      }),
    "apply confirmation mismatch",
  );

  const forbiddenOutput = path.join(installRoot, "activation");
  expectReject(
    () =>
      executeAuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesV1(config, {
        ...command,
        apply: true,
        confirmation: AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_CONFIRMATION,
        output_directory: forbiddenOutput,
      }),
    "output directory must be outside the validated install root",
  );
  assertCondition(!existsSync(forbiddenOutput), "forbidden output mutated install root");

  const sumsPath = path.join(release, "SHA256SUMS.txt");
  const originalSums = readFileSync(sumsPath, "utf8");
  chmodSync(sumsPath, 0o600);
  writeFileSync(sumsPath, `${originalSums}${originalSums.trim().split("\n")[0]}\n`);
  chmodSync(sumsPath, 0o400);
  expectReject(
    () => executeAuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesV1(config, command),
    "duplicate release checksum path",
  );
  chmodSync(sumsPath, 0o600);
  writeFileSync(sumsPath, originalSums);
  chmodSync(sumsPath, 0o400);

  const extraFile = path.join(release, "unlisted-extra.txt");
  chmodSync(release, 0o700);
  writeFileSync(extraFile, "unlisted\n", { mode: 0o400 });
  chmodSync(extraFile, 0o400);
  chmodSync(release, 0o500);
  expectReject(
    () => executeAuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesV1(config, command),
    "release tree file set mismatch",
  );
  chmodSync(release, 0o700);
  unlinkSync(extraFile);
  chmodSync(release, 0o500);

  const externalTarget = path.join(temporary, "external-release-target.txt");
  writeFileSync(externalTarget, "external\n", { mode: 0o600 });
  const scriptsDirectory = path.join(release, "dist", "scripts");
  const externalLink = path.join(scriptsDirectory, "external-link.js");
  chmodSync(scriptsDirectory, 0o700);
  symlinkSync(externalTarget, externalLink);
  chmodSync(scriptsDirectory, 0o500);
  expectReject(
    () => executeAuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesV1(config, command),
    "release tree entry must not be symlinked",
  );
  chmodSync(scriptsDirectory, 0o700);
  unlinkSync(externalLink);
  chmodSync(scriptsDirectory, 0o500);

  const specialFile = path.join(scriptsDirectory, "special.fifo");
  chmodSync(scriptsDirectory, 0o700);
  const mkfifo = spawnSync("mkfifo", [specialFile], { encoding: "utf8" });
  assertCondition(mkfifo.status === 0, `mkfifo failed: ${mkfifo.stderr}`);
  chmodSync(specialFile, 0o400);
  chmodSync(scriptsDirectory, 0o500);
  expectReject(
    () => executeAuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesV1(config, command),
    "release tree entry must be a regular file or directory",
  );
  chmodSync(scriptsDirectory, 0o700);
  unlinkSync(specialFile);
  chmodSync(scriptsDirectory, 0o500);

  const applied = executeAuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesV1(config, {
    ...command,
    apply: true,
    confirmation: AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_CONFIRMATION,
  });
  assertCondition(applied.status === "validated_and_written", "apply status mismatch");
  assertCondition(applied.confirmation_verified, "confirmation not verified");
  assertCondition(applied.artifacts.private_files_written, "private artifacts not written");
  assertCondition(lstatSync(applied.artifacts.output_directory!).mode % 0o1000 === 0o700, "output mode mismatch");
  assertCondition(lstatSync(applied.artifacts.plan_path!).mode % 0o1000 === 0o600, "plan mode mismatch");
  assertCondition(lstatSync(applied.artifacts.decision_path!).mode % 0o1000 === 0o600, "decision mode mismatch");

  for (const [key, value] of Object.entries(applied.authority)) {
    if (key === "local_private_plan_write" || key === "local_private_decision_write") {
      assertCondition(value === true, `expected local authority absent: ${key}`);
    } else {
      assertCondition(value === false, `forbidden authority enabled: ${key}`);
    }
  }

  chmodSync(path.join(release, "run-disabled.sh"), 0o700);
  writeFileSync(path.join(release, "run-disabled.sh"), '#!/usr/bin/env bash\necho tampered\n');
  chmodSync(path.join(release, "run-disabled.sh"), 0o500);
  expectReject(
    () => executeAuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesV1(config, command),
    "release checksum mismatch",
  );

  console.log("VOID_AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITES_V1_PROOF_GREEN");
  console.log("disabled_by_default=true");
  console.log("installed_release_binding_exact=true");
  console.log("git_object_id_validation_exact=true");
  console.log("sha256_digest_validation_preserved=true");
  console.log("checkpoint_lineage_exact=true");
  console.log("checkpoint_values_caller_asserted_not_independently_observed=true");
  console.log("receipt_chain_exact=true");
  console.log("schema_runtime_validation_parity=true");
  console.log("release_tree_file_set_exact=true");
  console.log("release_tree_directory_set_exact=true");
  console.log("release_tree_symlinks_rejected=true");
  console.log("release_tree_special_files_rejected=true");
  console.log("duplicate_checksum_paths_rejected=true");
  console.log("executing_user_ownership_enforced=true");
  console.log("output_path_install_root_containment_rejected=true");
  console.log("immutable_release_hashes_enforced=true");
  console.log("activation_persistence_absent=true");
  console.log("explicit_apply_confirmation=true");
  console.log("private_plan_and_hold_decision_written=true");
  console.log("activation_configuration_written=false");
  console.log("credential_or_token_read=false");
  console.log("trusted_context_provider_called=false");
  console.log("service_unit_created=false");
  console.log("service_restart=false");
  console.log("runtime_listener_created=false");
  console.log("quote_accepted=false");
  console.log("payment_authorized=false");
  console.log("payment_executed=false");
  console.log("transaction_broadcast=false");
  console.log("work_dispatched=false");
  console.log("live_ticket_issued=false");
  console.log("work_credit_written=false");
  console.log("wallet_or_signer_accessed=false");
  console.log("void_settled=false");
  console.log("funds_moved=false");
  console.log("activation_forbidden_separate_execution_lane_required=true");
} finally {
  if (existsSync(release)) makeReleaseTreeWritable(release);
  rmSync(temporary, { recursive: true, force: true });
}
