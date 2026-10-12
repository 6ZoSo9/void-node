#!/usr/bin/env node
import {
  createHash,
  randomBytes,
} from "node:crypto";
import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import {
  AGENT_PAID_WORK_SUBMIT_SCOPE,
  agentPaidWorkTokenSha256V1,
  materializeAgentPaidWorkCredentialRegistryV1,
  materializeAgentPaidWorkCredentialV1,
  parseAgentPaidWorkCredentialRegistryV1,
  type AgentPaidWorkCredentialRecordV1,
  type AgentPaidWorkCredentialRegistryV1,
} from "./agent_paid_work_credential_registry_v1.js";
import {
  canonicalJson,
} from "./agent_paid_work_order_envelope_v1.js";

const PLAN_MARKER =
  "VOID_AGENT_PAID_WORK_CREDENTIAL_LIFECYCLE_PLAN_V1" as const;
const PLAN_VERSION = 1 as const;
const PLAN_ID_PREFIX = "voidapwclp1_" as const;
const APPLY_CONFIRMATION =
  "apply-agent-paid-work-credential-lifecycle-v1" as const;

type Operation =
  | "issue"
  | "rotate"
  | "revoke";

type LifecyclePlanDraftV1 = {
  marker: typeof PLAN_MARKER;
  version: typeof PLAN_VERSION;
  operation: Operation;
  created_at_utc: string;
  source_registry_sha256: string;
  source_registry_id: string;
  candidate_registry_sha256: string;
  candidate_registry_id: string;
  target_agent_id: string;
  target_credential_id: string | null;
  new_credential_id: string | null;
  new_token_sha256: string | null;
  token_file: "credential.token" | null;
  token_destination_filename: string | null;
  receiver_restart_required: true;
};

type LifecyclePlanV1 =
  LifecyclePlanDraftV1 & {
    plan_id: string;
  };

type Flags = Map<string, string>;

function fail(message: string): never {
  throw new Error(message);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    fail(message);
  }
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function sha256Bytes(
  value: Buffer,
): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function sha256Text(
  value: string,
): string {
  return createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

function utcNowSeconds(): string {
  return new Date(
    Math.floor(Date.now() / 1000) * 1000,
  )
    .toISOString()
    .replace(".000Z", "Z");
}

function requireUtcSeconds(
  value: string,
  label: string,
): string {
  assertCondition(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value),
    `${label} must use YYYY-MM-DDTHH:mm:ssZ`,
  );
  const parsed = Date.parse(value);
  assertCondition(
    Number.isFinite(parsed),
    `${label} must be valid UTC`,
  );
  assertCondition(
    new Date(parsed)
      .toISOString()
      .replace(".000Z", "Z") === value,
    `${label} must be real UTC seconds`,
  );
  return value;
}

function requireSha256(
  value: string,
  label: string,
): string {
  assertCondition(
    /^[0-9a-f]{64}$/.test(value),
    `${label} must be lowercase SHA-256`,
  );
  return value;
}

function parseFlags(
  args: string[],
): Flags {
  const flags = new Map<string, string>();

  for (
    let index = 0;
    index < args.length;
    index += 2
  ) {
    const name = args[index];
    const value = args[index + 1];

    assertCondition(
      name?.startsWith("--"),
      `expected --flag at argument ${index + 1}`,
    );
    assertCondition(
      value !== undefined,
      `${name} requires a value`,
    );
    assertCondition(
      !flags.has(name),
      `duplicate flag ${name}`,
    );

    flags.set(name, value);
  }

  return flags;
}

function requiredFlag(
  flags: Flags,
  name: string,
): string {
  const value = flags.get(name);
  assertCondition(
    value !== undefined && value.length > 0,
    `${name} is required`,
  );
  return value;
}

function optionalFlag(
  flags: Flags,
  name: string,
): string | undefined {
  return flags.get(name);
}

function assertExactFlagSet(
  flags: Flags,
  allowed: readonly string[],
): void {
  const allowedSet = new Set(allowed);

  for (const name of flags.keys()) {
    assertCondition(
      allowedSet.has(name),
      `unexpected flag ${name}`,
    );
  }
}

function requireOwnerPrivateRegularFile(
  pathname: string,
  label: string,
): void {
  const metadata = lstatSync(pathname);

  assertCondition(
    metadata.isFile() && !metadata.isSymbolicLink(),
    `${label} must be a regular file`,
  );
  assertCondition(
    (metadata.mode & 0o077) === 0,
    `${label} must not be group/world accessible`,
  );

  if (
    typeof process.getuid === "function"
  ) {
    assertCondition(
      metadata.uid === process.getuid(),
      `${label} must be owned by the current user`,
    );
  }
}

function requirePrivateDirectory(
  pathname: string,
  label: string,
): void {
  const metadata = lstatSync(pathname);

  assertCondition(
    metadata.isDirectory() &&
      !metadata.isSymbolicLink(),
    `${label} must be a directory`,
  );
  assertCondition(
    (metadata.mode & 0o077) === 0,
    `${label} must not be group/world accessible`,
  );

  if (
    typeof process.getuid === "function"
  ) {
    assertCondition(
      metadata.uid === process.getuid(),
      `${label} must be owned by the current user`,
    );
  }
}

function fsyncDirectory(
  directory: string,
): void {
  const descriptor = openSync(
    directory,
    "r",
  );
  try {
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

function writeExclusivePrivate(
  pathname: string,
  value: Buffer,
): void {
  const descriptor = openSync(
    pathname,
    "wx",
    0o600,
  );

  try {
    writeFileSync(
      descriptor,
      value,
    );
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }

  chmodSync(pathname, 0o600);
  fsyncDirectory(path.dirname(pathname));
}

function writeAtomicPrivate(
  pathname: string,
  value: Buffer,
): void {
  const directory = path.dirname(pathname);
  const temporary = path.join(
    directory,
    `.${path.basename(pathname)}.tmp-${process.pid}-${randomBytes(8).toString("hex")}`,
  );

  writeExclusivePrivate(
    temporary,
    value,
  );

  try {
    renameSync(
      temporary,
      pathname,
    );
    chmodSync(pathname, 0o600);
    fsyncDirectory(directory);
  } catch (error) {
    rmSync(
      temporary,
      {
        force: true,
      },
    );
    throw error;
  }
}

function readRegistry(
  pathname: string,
): {
  bytes: Buffer;
  sha256: string;
  registry: AgentPaidWorkCredentialRegistryV1;
} {
  requireOwnerPrivateRegularFile(
    pathname,
    "credential registry",
  );

  const bytes = readFileSync(pathname);
  const registry =
    parseAgentPaidWorkCredentialRegistryV1(
      JSON.parse(
        bytes.toString("utf8"),
      ) as unknown,
    );

  return {
    bytes,
    sha256: sha256Bytes(bytes),
    registry,
  };
}

function registryBytes(
  registry: AgentPaidWorkCredentialRegistryV1,
): Buffer {
  return Buffer.from(
    `${JSON.stringify(registry, null, 2)}\n`,
    "utf8",
  );
}

function planId(
  draft: LifecyclePlanDraftV1,
): string {
  return (
    PLAN_ID_PREFIX +
    sha256Text(
      canonicalJson(draft),
    )
  );
}

function materializePlan(
  draft: LifecyclePlanDraftV1,
): LifecyclePlanV1 {
  return {
    ...draft,
    plan_id: planId(draft),
  };
}

function parsePlan(
  value: unknown,
): LifecyclePlanV1 {
  assertCondition(
    isRecord(value),
    "lifecycle plan must be an object",
  );

  const expectedKeys = [
    "marker",
    "version",
    "operation",
    "created_at_utc",
    "source_registry_sha256",
    "source_registry_id",
    "candidate_registry_sha256",
    "candidate_registry_id",
    "target_agent_id",
    "target_credential_id",
    "new_credential_id",
    "new_token_sha256",
    "token_file",
    "token_destination_filename",
    "receiver_restart_required",
    "plan_id",
  ].sort();

  assertCondition(
    JSON.stringify(
      Object.keys(value).sort(),
    ) === JSON.stringify(expectedKeys),
    "lifecycle plan keys mismatch",
  );

  assertCondition(
    value.marker === PLAN_MARKER,
    "lifecycle plan marker mismatch",
  );
  assertCondition(
    value.version === PLAN_VERSION,
    "lifecycle plan version mismatch",
  );
  assertCondition(
    value.operation === "issue" ||
      value.operation === "rotate" ||
      value.operation === "revoke",
    "lifecycle plan operation invalid",
  );

  const operation =
    value.operation as Operation;
  const createdAt = requireUtcSeconds(
    String(value.created_at_utc),
    "plan.created_at_utc",
  );
  const sourceRegistrySha = requireSha256(
    String(value.source_registry_sha256),
    "plan.source_registry_sha256",
  );
  const candidateRegistrySha = requireSha256(
    String(value.candidate_registry_sha256),
    "plan.candidate_registry_sha256",
  );

  assertCondition(
    typeof value.source_registry_id === "string" &&
      /^voidapwcr1_[0-9a-f]{64}$/.test(
        value.source_registry_id,
      ),
    "plan.source_registry_id invalid",
  );
  assertCondition(
    typeof value.candidate_registry_id === "string" &&
      /^voidapwcr1_[0-9a-f]{64}$/.test(
        value.candidate_registry_id,
      ),
    "plan.candidate_registry_id invalid",
  );
  assertCondition(
    typeof value.target_agent_id === "string" &&
      /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/.test(
        value.target_agent_id,
      ),
    "plan.target_agent_id invalid",
  );
  assertCondition(
    value.target_credential_id === null ||
      (
        typeof value.target_credential_id === "string" &&
        /^voidapwc1_[0-9a-f]{64}$/.test(
          value.target_credential_id,
        )
      ),
    "plan.target_credential_id invalid",
  );
  assertCondition(
    value.new_credential_id === null ||
      (
        typeof value.new_credential_id === "string" &&
        /^voidapwc1_[0-9a-f]{64}$/.test(
          value.new_credential_id,
        )
      ),
    "plan.new_credential_id invalid",
  );
  assertCondition(
    value.new_token_sha256 === null ||
      (
        typeof value.new_token_sha256 === "string" &&
        /^[0-9a-f]{64}$/.test(
          value.new_token_sha256,
        )
      ),
    "plan.new_token_sha256 invalid",
  );
  assertCondition(
    value.token_file === null ||
      value.token_file === "credential.token",
    "plan.token_file invalid",
  );
  assertCondition(
    value.token_destination_filename === null ||
      (
        typeof value.token_destination_filename === "string" &&
        /^credential-voidapwc1_[0-9a-f]{64}\.token$/.test(
          value.token_destination_filename,
        )
      ),
    "plan.token_destination_filename invalid",
  );
  assertCondition(
    value.receiver_restart_required === true,
    "plan must require receiver restart",
  );

  if (operation === "revoke") {
    assertCondition(
      value.target_credential_id !== null,
      "revoke plan target credential missing",
    );
    assertCondition(
      value.new_credential_id === null &&
        value.new_token_sha256 === null &&
        value.token_file === null &&
        value.token_destination_filename === null,
      "revoke plan must not contain a new token",
    );
  } else {
    assertCondition(
      value.new_credential_id !== null &&
        value.new_token_sha256 !== null &&
        value.token_file === "credential.token" &&
        value.token_destination_filename !== null,
      `${operation} plan new credential fields missing`,
    );
  }

  const draft: LifecyclePlanDraftV1 = {
    marker: PLAN_MARKER,
    version: PLAN_VERSION,
    operation,
    created_at_utc: createdAt,
    source_registry_sha256:
      sourceRegistrySha,
    source_registry_id:
      value.source_registry_id as string,
    candidate_registry_sha256:
      candidateRegistrySha,
    candidate_registry_id:
      value.candidate_registry_id as string,
    target_agent_id:
      value.target_agent_id as string,
    target_credential_id:
      value.target_credential_id as string | null,
    new_credential_id:
      value.new_credential_id as string | null,
    new_token_sha256:
      value.new_token_sha256 as string | null,
    token_file:
      value.token_file as "credential.token" | null,
    token_destination_filename:
      value.token_destination_filename as string | null,
    receiver_restart_required: true,
  };

  const expectedPlanId =
    planId(draft);

  assertCondition(
    value.plan_id === expectedPlanId,
    "lifecycle plan_id mismatch",
  );

  return {
    ...draft,
    plan_id: expectedPlanId,
  };
}

function createStageDirectory(
  pathname: string,
): void {
  assertCondition(
    !existsSync(pathname),
    "stage directory already exists",
  );

  mkdirSync(
    pathname,
    {
      recursive: false,
      mode: 0o700,
    },
  );
  chmodSync(pathname, 0o700);
  requirePrivateDirectory(
    pathname,
    "stage directory",
  );
}

function checksumLines(
  directory: string,
  filenames: string[],
): string {
  return filenames
    .map((filename) => {
      const value = readFileSync(
        path.join(
          directory,
          filename,
        ),
      );
      return (
        `${sha256Bytes(value)}  ${filename}\n`
      );
    })
    .join("");
}

function writeStage(
  stageDirectory: string,
  sourceRegistryBytes: Buffer,
  candidateRegistry: AgentPaidWorkCredentialRegistryV1,
  plan: LifecyclePlanV1,
  rawToken: string | null,
): void {
  createStageDirectory(
    stageDirectory,
  );

  const filenames = [
    "source-registry-v1.json",
    "candidate-registry-v1.json",
    "plan-v1.json",
  ];

  try {
    writeExclusivePrivate(
      path.join(
        stageDirectory,
        "source-registry-v1.json",
      ),
      sourceRegistryBytes,
    );
    writeExclusivePrivate(
      path.join(
        stageDirectory,
        "candidate-registry-v1.json",
      ),
      registryBytes(candidateRegistry),
    );
    writeExclusivePrivate(
      path.join(
        stageDirectory,
        "plan-v1.json",
      ),
      Buffer.from(
        `${JSON.stringify(plan, null, 2)}\n`,
        "utf8",
      ),
    );

    if (rawToken !== null) {
      filenames.push(
        "credential.token",
      );
      writeExclusivePrivate(
        path.join(
          stageDirectory,
          "credential.token",
        ),
        Buffer.from(
          rawToken,
          "utf8",
        ),
      );
    }

    writeExclusivePrivate(
      path.join(
        stageDirectory,
        "SHA256SUMS.txt",
      ),
      Buffer.from(
        checksumLines(
          stageDirectory,
          filenames,
        ),
        "utf8",
      ),
    );
  } catch (error) {
    rmSync(
      stageDirectory,
      {
        recursive: true,
        force: true,
      },
    );
    throw error;
  }
}

function findCredential(
  registry: AgentPaidWorkCredentialRegistryV1,
  credentialId: string,
): AgentPaidWorkCredentialRecordV1 {
  const matches =
    registry.credentials.filter(
      (credential) =>
        credential.credential_id ===
        credentialId,
    );

  assertCondition(
    matches.length === 1,
    `credential ${credentialId} not found exactly once`,
  );

  return matches[0]!;
}

function planOutput(
  plan: LifecyclePlanV1,
  stageDirectory: string,
): void {
  process.stdout.write(
    `${JSON.stringify(
      {
        staged: true,
        operation: plan.operation,
        plan_id: plan.plan_id,
        stage_directory:
          path.resolve(stageDirectory),
        source_registry_id:
          plan.source_registry_id,
        source_registry_sha256:
          plan.source_registry_sha256,
        candidate_registry_id:
          plan.candidate_registry_id,
        candidate_registry_sha256:
          plan.candidate_registry_sha256,
        target_agent_id:
          plan.target_agent_id,
        target_credential_id:
          plan.target_credential_id,
        new_credential_id:
          plan.new_credential_id,
        new_token_sha256:
          plan.new_token_sha256,
        raw_token_printed: false,
        registry_mutated: false,
        receiver_restart_required: true,
        live_effect: false,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    "VOID_AGENT_PAID_WORK_CREDENTIAL_LIFECYCLE_PLAN_V1_STAGED",
  );
}

function stageIssue(
  flags: Flags,
): void {
  assertExactFlagSet(
    flags,
    [
      "--registry",
      "--stage-dir",
      "--agent-id",
      "--expires-at-utc",
      "--issued-at-utc",
    ],
  );

  const registryPath = path.resolve(
    requiredFlag(flags, "--registry"),
  );
  const stageDirectory = path.resolve(
    requiredFlag(flags, "--stage-dir"),
  );
  const agentId =
    requiredFlag(flags, "--agent-id");
  const issuedAt = requireUtcSeconds(
    optionalFlag(
      flags,
      "--issued-at-utc",
    ) || utcNowSeconds(),
    "issued_at_utc",
  );
  const expiresAt = requireUtcSeconds(
    requiredFlag(
      flags,
      "--expires-at-utc",
    ),
    "expires_at_utc",
  );

  assertCondition(
    Date.parse(expiresAt) >
      Date.parse(issuedAt),
    "credential expiry must follow issuance",
  );

  const source = readRegistry(
    registryPath,
  );
  const token = randomBytes(32)
    .toString("base64url");
  const tokenSha =
    agentPaidWorkTokenSha256V1(
      token,
    );
  const newCredential =
    materializeAgentPaidWorkCredentialV1({
      agent_id: agentId,
      token_sha256: tokenSha,
      scopes: [
        AGENT_PAID_WORK_SUBMIT_SCOPE,
      ],
      issued_at_utc: issuedAt,
      expires_at_utc: expiresAt,
      revoked_at_utc: null,
    });
  const candidate =
    materializeAgentPaidWorkCredentialRegistryV1({
      created_at_utc: issuedAt,
      credentials: [
        ...source.registry.credentials,
        newCredential,
      ],
    });
  const candidateBytes =
    registryBytes(candidate);

  const draft: LifecyclePlanDraftV1 = {
    marker: PLAN_MARKER,
    version: PLAN_VERSION,
    operation: "issue",
    created_at_utc: issuedAt,
    source_registry_sha256:
      source.sha256,
    source_registry_id:
      source.registry.registry_id,
    candidate_registry_sha256:
      sha256Bytes(candidateBytes),
    candidate_registry_id:
      candidate.registry_id,
    target_agent_id: agentId,
    target_credential_id: null,
    new_credential_id:
      newCredential.credential_id,
    new_token_sha256: tokenSha,
    token_file: "credential.token",
    token_destination_filename:
      `credential-${newCredential.credential_id}.token`,
    receiver_restart_required: true,
  };

  const plan = materializePlan(
    draft,
  );

  writeStage(
    stageDirectory,
    source.bytes,
    candidate,
    plan,
    token,
  );
  planOutput(
    plan,
    stageDirectory,
  );
}

function stageRotate(
  flags: Flags,
): void {
  assertExactFlagSet(
    flags,
    [
      "--registry",
      "--stage-dir",
      "--credential-id",
      "--expires-at-utc",
      "--effective-at-utc",
    ],
  );

  const registryPath = path.resolve(
    requiredFlag(flags, "--registry"),
  );
  const stageDirectory = path.resolve(
    requiredFlag(flags, "--stage-dir"),
  );
  const credentialId =
    requiredFlag(
      flags,
      "--credential-id",
    );
  const effectiveAt = requireUtcSeconds(
    optionalFlag(
      flags,
      "--effective-at-utc",
    ) || utcNowSeconds(),
    "effective_at_utc",
  );
  const expiresAt = requireUtcSeconds(
    requiredFlag(
      flags,
      "--expires-at-utc",
    ),
    "expires_at_utc",
  );

  assertCondition(
    Date.parse(expiresAt) >
      Date.parse(effectiveAt),
    "new credential expiry must follow rotation time",
  );

  const source = readRegistry(
    registryPath,
  );
  const oldCredential = findCredential(
    source.registry,
    credentialId,
  );

  assertCondition(
    oldCredential.revoked_at_utc === null,
    "credential is already revoked",
  );
  assertCondition(
    Date.parse(effectiveAt) >=
      Date.parse(
        oldCredential.issued_at_utc,
      ),
    "rotation precedes original issuance",
  );
  assertCondition(
    Date.parse(effectiveAt) <
      Date.parse(
        oldCredential.expires_at_utc,
      ),
    "rotate requires a currently unexpired credential",
  );

  const token = randomBytes(32)
    .toString("base64url");
  const tokenSha =
    agentPaidWorkTokenSha256V1(
      token,
    );
  const newCredential =
    materializeAgentPaidWorkCredentialV1({
      agent_id:
        oldCredential.agent_id,
      token_sha256: tokenSha,
      scopes: [
        AGENT_PAID_WORK_SUBMIT_SCOPE,
      ],
      issued_at_utc: effectiveAt,
      expires_at_utc: expiresAt,
      revoked_at_utc: null,
    });

  const credentials =
    source.registry.credentials.map(
      (credential) =>
        credential.credential_id ===
        oldCredential.credential_id
          ? {
              ...credential,
              revoked_at_utc:
                effectiveAt,
            }
          : credential,
    );

  const candidate =
    materializeAgentPaidWorkCredentialRegistryV1({
      created_at_utc: effectiveAt,
      credentials: [
        ...credentials,
        newCredential,
      ],
    });
  const candidateBytes =
    registryBytes(candidate);

  const draft: LifecyclePlanDraftV1 = {
    marker: PLAN_MARKER,
    version: PLAN_VERSION,
    operation: "rotate",
    created_at_utc: effectiveAt,
    source_registry_sha256:
      source.sha256,
    source_registry_id:
      source.registry.registry_id,
    candidate_registry_sha256:
      sha256Bytes(candidateBytes),
    candidate_registry_id:
      candidate.registry_id,
    target_agent_id:
      oldCredential.agent_id,
    target_credential_id:
      oldCredential.credential_id,
    new_credential_id:
      newCredential.credential_id,
    new_token_sha256: tokenSha,
    token_file: "credential.token",
    token_destination_filename:
      `credential-${newCredential.credential_id}.token`,
    receiver_restart_required: true,
  };

  const plan = materializePlan(
    draft,
  );

  writeStage(
    stageDirectory,
    source.bytes,
    candidate,
    plan,
    token,
  );
  planOutput(
    plan,
    stageDirectory,
  );
}

function stageRevoke(
  flags: Flags,
): void {
  assertExactFlagSet(
    flags,
    [
      "--registry",
      "--stage-dir",
      "--credential-id",
      "--effective-at-utc",
    ],
  );

  const registryPath = path.resolve(
    requiredFlag(flags, "--registry"),
  );
  const stageDirectory = path.resolve(
    requiredFlag(flags, "--stage-dir"),
  );
  const credentialId =
    requiredFlag(
      flags,
      "--credential-id",
    );
  const effectiveAt = requireUtcSeconds(
    optionalFlag(
      flags,
      "--effective-at-utc",
    ) || utcNowSeconds(),
    "effective_at_utc",
  );

  const source = readRegistry(
    registryPath,
  );
  const target = findCredential(
    source.registry,
    credentialId,
  );

  assertCondition(
    target.revoked_at_utc === null,
    "credential is already revoked",
  );
  assertCondition(
    Date.parse(effectiveAt) >=
      Date.parse(target.issued_at_utc),
    "revocation precedes issuance",
  );

  const candidate =
    materializeAgentPaidWorkCredentialRegistryV1({
      created_at_utc: effectiveAt,
      credentials:
        source.registry.credentials.map(
          (credential) =>
            credential.credential_id ===
            target.credential_id
              ? {
                  ...credential,
                  revoked_at_utc:
                    effectiveAt,
                }
              : credential,
        ),
    });
  const candidateBytes =
    registryBytes(candidate);

  const draft: LifecyclePlanDraftV1 = {
    marker: PLAN_MARKER,
    version: PLAN_VERSION,
    operation: "revoke",
    created_at_utc: effectiveAt,
    source_registry_sha256:
      source.sha256,
    source_registry_id:
      source.registry.registry_id,
    candidate_registry_sha256:
      sha256Bytes(candidateBytes),
    candidate_registry_id:
      candidate.registry_id,
    target_agent_id:
      target.agent_id,
    target_credential_id:
      target.credential_id,
    new_credential_id: null,
    new_token_sha256: null,
    token_file: null,
    token_destination_filename:
      null,
    receiver_restart_required: true,
  };

  const plan = materializePlan(
    draft,
  );

  writeStage(
    stageDirectory,
    source.bytes,
    candidate,
    plan,
    null,
  );
  planOutput(
    plan,
    stageDirectory,
  );
}

function verifyChecksumFile(
  stageDirectory: string,
): void {
  const checksumPath = path.join(
    stageDirectory,
    "SHA256SUMS.txt",
  );

  requireOwnerPrivateRegularFile(
    checksumPath,
    "stage checksum file",
  );

  const lines = readFileSync(
    checksumPath,
    "utf8",
  )
    .trim()
    .split("\n")
    .filter(Boolean);

  assertCondition(
    lines.length >= 3,
    "stage checksum file is incomplete",
  );

  for (const line of lines) {
    const match =
      /^([0-9a-f]{64})  ([A-Za-z0-9._-]+)$/.exec(
        line,
      );

    assertCondition(
      match,
      `invalid checksum line ${line}`,
    );

    const expected = match[1]!;
    const filename = match[2]!;
    const pathname = path.join(
      stageDirectory,
      filename,
    );

    requireOwnerPrivateRegularFile(
      pathname,
      `stage file ${filename}`,
    );

    assertCondition(
      sha256Bytes(
        readFileSync(pathname),
      ) === expected,
      `stage checksum mismatch for ${filename}`,
    );
  }
}

function applyPlan(
  flags: Flags,
): void {
  assertExactFlagSet(
    flags,
    [
      "--registry",
      "--stage-dir",
      "--token-dir",
      "--expected-source-sha256",
      "--confirm",
    ],
  );

  const registryPath = path.resolve(
    requiredFlag(flags, "--registry"),
  );
  const stageDirectory = path.resolve(
    requiredFlag(flags, "--stage-dir"),
  );
  const expectedSourceSha =
    requireSha256(
      requiredFlag(
        flags,
        "--expected-source-sha256",
      ),
      "--expected-source-sha256",
    );
  const confirmation =
    requiredFlag(flags, "--confirm");

  assertCondition(
    confirmation === APPLY_CONFIRMATION,
    `--confirm must equal ${APPLY_CONFIRMATION}`,
  );

  requirePrivateDirectory(
    stageDirectory,
    "stage directory",
  );
  verifyChecksumFile(
    stageDirectory,
  );

  const planPath = path.join(
    stageDirectory,
    "plan-v1.json",
  );
  const sourceSnapshotPath =
    path.join(
      stageDirectory,
      "source-registry-v1.json",
    );
  const candidatePath =
    path.join(
      stageDirectory,
      "candidate-registry-v1.json",
    );

  requireOwnerPrivateRegularFile(
    planPath,
    "lifecycle plan",
  );
  requireOwnerPrivateRegularFile(
    sourceSnapshotPath,
    "source registry snapshot",
  );
  requireOwnerPrivateRegularFile(
    candidatePath,
    "candidate registry",
  );

  const plan = parsePlan(
    JSON.parse(
      readFileSync(
        planPath,
        "utf8",
      ),
    ) as unknown,
  );

  const current = readRegistry(
    registryPath,
  );

  assertCondition(
    current.sha256 ===
      expectedSourceSha,
    "live registry SHA does not match operator expectation",
  );
  assertCondition(
    current.sha256 ===
      plan.source_registry_sha256,
    "live registry SHA does not match staged plan",
  );
  assertCondition(
    current.registry.registry_id ===
      plan.source_registry_id,
    "live registry ID does not match staged plan",
  );

  const sourceSnapshot =
    readFileSync(
      sourceSnapshotPath,
    );

  assertCondition(
    sha256Bytes(sourceSnapshot) ===
      plan.source_registry_sha256,
    "source registry snapshot mismatch",
  );
  assertCondition(
    sourceSnapshot.equals(
      current.bytes,
    ),
    "source registry snapshot differs from live registry",
  );

  const candidateBytes =
    readFileSync(candidatePath);
  const candidate =
    parseAgentPaidWorkCredentialRegistryV1(
      JSON.parse(
        candidateBytes.toString("utf8"),
      ) as unknown,
    );

  assertCondition(
    sha256Bytes(candidateBytes) ===
      plan.candidate_registry_sha256,
    "candidate registry SHA mismatch",
  );
  assertCondition(
    candidate.registry_id ===
      plan.candidate_registry_id,
    "candidate registry ID mismatch",
  );

  const backupPath = path.join(
    stageDirectory,
    "applied-source-registry-backup-v1.json",
  );
  const receiptPath = path.join(
    stageDirectory,
    "apply-receipt-v1.json",
  );

  assertCondition(
    !existsSync(backupPath),
    "stage has already been applied or contains an apply backup",
  );
  assertCondition(
    !existsSync(receiptPath),
    "stage already contains an apply receipt",
  );

  let tokenFinalPath: string | null =
    null;
  let registryReplaced = false;

  try {
    writeExclusivePrivate(
      backupPath,
      current.bytes,
    );

    if (plan.token_file !== null) {
      const tokenDirectoryValue =
        requiredFlag(
          flags,
          "--token-dir",
        );
      const tokenDirectory =
        path.resolve(
          tokenDirectoryValue,
        );

      if (!existsSync(tokenDirectory)) {
        mkdirSync(
          tokenDirectory,
          {
            recursive: true,
            mode: 0o700,
          },
        );
        chmodSync(
          tokenDirectory,
          0o700,
        );
      }

      requirePrivateDirectory(
        tokenDirectory,
        "token directory",
      );

      const tokenStagePath =
        path.join(
          stageDirectory,
          plan.token_file,
        );

      requireOwnerPrivateRegularFile(
        tokenStagePath,
        "staged credential token",
      );

      const tokenText =
        readFileSync(
          tokenStagePath,
          "utf8",
        );

      assertCondition(
        tokenText.trim() === tokenText,
        "staged token must not contain surrounding whitespace",
      );
      assertCondition(
        agentPaidWorkTokenSha256V1(
          tokenText,
        ) === plan.new_token_sha256,
        "staged token digest mismatch",
      );

      tokenFinalPath = path.join(
        tokenDirectory,
        plan.token_destination_filename!,
      );

      assertCondition(
        !existsSync(tokenFinalPath),
        "token destination already exists",
      );

      writeExclusivePrivate(
        tokenFinalPath,
        Buffer.from(
          tokenText,
          "utf8",
        ),
      );
    } else {
      assertCondition(
        optionalFlag(
          flags,
          "--token-dir",
        ) === undefined ||
          optionalFlag(
            flags,
            "--token-dir",
          ) === "-",
        "revoke apply must use --token-dir - or omit it",
      );
    }

    writeAtomicPrivate(
      registryPath,
      candidateBytes,
    );
    registryReplaced = true;

    const applied = readRegistry(
      registryPath,
    );

    assertCondition(
      applied.sha256 ===
        plan.candidate_registry_sha256,
      "applied registry SHA mismatch",
    );
    assertCondition(
      applied.registry.registry_id ===
        plan.candidate_registry_id,
      "applied registry ID mismatch",
    );

    const receipt = {
      marker:
        "VOID_AGENT_PAID_WORK_CREDENTIAL_LIFECYCLE_APPLY_RECEIPT_V1",
      version: 1,
      applied_at_utc:
        utcNowSeconds(),
      plan_id: plan.plan_id,
      operation: plan.operation,
      registry_path:
        registryPath,
      source_registry_sha256:
        plan.source_registry_sha256,
      source_registry_id:
        plan.source_registry_id,
      candidate_registry_sha256:
        plan.candidate_registry_sha256,
      candidate_registry_id:
        plan.candidate_registry_id,
      target_agent_id:
        plan.target_agent_id,
      target_credential_id:
        plan.target_credential_id,
      new_credential_id:
        plan.new_credential_id,
      new_token_sha256:
        plan.new_token_sha256,
      token_path:
        tokenFinalPath,
      raw_token_printed: false,
      receiver_restart_required: true,
      live_effect: false,
      provider_selected: false,
      quote_created: false,
      payment_authorized: false,
      work_execution_authorized: false,
      work_dispatched: false,
      wc_ledger_write: false,
      wallet_access: false,
      buy_void_change: false,
    };

    writeExclusivePrivate(
      receiptPath,
      Buffer.from(
        `${JSON.stringify(receipt, null, 2)}\n`,
        "utf8",
      ),
    );

    process.stdout.write(
      `${JSON.stringify(receipt, null, 2)}\n`,
    );
    console.log(
      "credential_registry_applied=true",
    );
    console.log(
      "receiver_restart_required=true",
    );
    console.log(
      "live_effect=false",
    );
    console.log(
      "raw_token_printed=false",
    );
    console.log(
      "VOID_AGENT_PAID_WORK_CREDENTIAL_LIFECYCLE_APPLY_V1_EXACT_GREEN",
    );
  } catch (error) {
    if (registryReplaced) {
      writeAtomicPrivate(
        registryPath,
        current.bytes,
      );
    }

    if (
      tokenFinalPath !== null &&
      existsSync(tokenFinalPath)
    ) {
      rmSync(
        tokenFinalPath,
        {
          force: true,
        },
      );
      fsyncDirectory(
        path.dirname(
          tokenFinalPath,
        ),
      );
    }

    throw error;
  }
}

function inspectRegistry(
  flags: Flags,
): void {
  assertExactFlagSet(
    flags,
    [
      "--registry",
      "--evaluated-at-utc",
    ],
  );

  const registryPath = path.resolve(
    requiredFlag(flags, "--registry"),
  );
  const evaluatedAt =
    requireUtcSeconds(
      optionalFlag(
        flags,
        "--evaluated-at-utc",
      ) || utcNowSeconds(),
      "evaluated_at_utc",
    );
  const value = readRegistry(
    registryPath,
  );

  const credentials =
    value.registry.credentials.map(
      (credential) => {
        let state:
          | "not_yet_valid"
          | "active"
          | "expired"
          | "revoked";

        if (
          Date.parse(evaluatedAt) <
          Date.parse(
            credential.issued_at_utc,
          )
        ) {
          state = "not_yet_valid";
        } else if (
          Date.parse(evaluatedAt) >=
          Date.parse(
            credential.expires_at_utc,
          )
        ) {
          state = "expired";
        } else if (
          credential.revoked_at_utc !== null &&
          Date.parse(evaluatedAt) >=
            Date.parse(
              credential.revoked_at_utc,
            )
        ) {
          state = "revoked";
        } else {
          state = "active";
        }

        return {
          credential_id:
            credential.credential_id,
          agent_id:
            credential.agent_id,
          token_sha256:
            credential.token_sha256,
          scopes:
            credential.scopes,
          issued_at_utc:
            credential.issued_at_utc,
          expires_at_utc:
            credential.expires_at_utc,
          revoked_at_utc:
            credential.revoked_at_utc,
          state,
        };
      },
    );

  process.stdout.write(
    `${JSON.stringify(
      {
        registry_path:
          registryPath,
        registry_sha256:
          value.sha256,
        registry_id:
          value.registry.registry_id,
        registry_created_at_utc:
          value.registry.created_at_utc,
        evaluated_at_utc:
          evaluatedAt,
        credential_count:
          credentials.length,
        credentials,
        raw_token_read: false,
        receiver_restart_required_after_mutation:
          true,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    "VOID_AGENT_PAID_WORK_CREDENTIAL_LIFECYCLE_INSPECT_V1_COMPLETE",
  );
}

function usage(): never {
  return fail(
    [
      "usage:",
      "  tsx scripts/agent_paid_work_credential_lifecycle_cli_v1.ts inspect --registry PATH [--evaluated-at-utc UTC]",
      "  tsx scripts/agent_paid_work_credential_lifecycle_cli_v1.ts stage-issue --registry PATH --stage-dir DIR --agent-id ID --expires-at-utc UTC [--issued-at-utc UTC]",
      "  tsx scripts/agent_paid_work_credential_lifecycle_cli_v1.ts stage-rotate --registry PATH --stage-dir DIR --credential-id ID --expires-at-utc UTC [--effective-at-utc UTC]",
      "  tsx scripts/agent_paid_work_credential_lifecycle_cli_v1.ts stage-revoke --registry PATH --stage-dir DIR --credential-id ID [--effective-at-utc UTC]",
      `  tsx scripts/agent_paid_work_credential_lifecycle_cli_v1.ts apply --registry PATH --stage-dir DIR --token-dir DIR_OR_DASH --expected-source-sha256 HEX --confirm ${APPLY_CONFIRMATION}`,
    ].join("\n"),
  );
}

function main(): void {
  const [
    command,
    ...rest
  ] = process.argv.slice(2);

  if (!command) {
    usage();
  }

  const flags = parseFlags(
    rest,
  );

  if (command === "inspect") {
    inspectRegistry(flags);
    return;
  }
  if (command === "stage-issue") {
    stageIssue(flags);
    return;
  }
  if (command === "stage-rotate") {
    stageRotate(flags);
    return;
  }
  if (command === "stage-revoke") {
    stageRevoke(flags);
    return;
  }
  if (command === "apply") {
    applyPlan(flags);
    return;
  }

  usage();
}

main();
