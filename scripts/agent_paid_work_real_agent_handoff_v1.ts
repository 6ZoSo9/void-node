#!/usr/bin/env node
import {
  spawnSync,
} from "node:child_process";
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
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  pathToFileURL,
} from "node:url";

import {
  agentPaidWorkTokenSha256V1,
  parseAgentPaidWorkCredentialRegistryV1,
} from "./agent_paid_work_credential_registry_v1.js";

const HANDOFF_MARKER =
  "VOID_AGENT_PAID_WORK_REAL_AGENT_HANDOFF_V1" as const;
const PACKET_MARKER =
  "VOID_EXTERNAL_AGENT_CREDENTIAL_ONBOARDING_PACKET_V1" as const;
const SUBMISSION_ENDPOINT_PATH =
  "/__void/agents/paid-work/submissions/v1" as const;
const AGENT_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const UTC_SECONDS_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

type Flags = Map<string, string>;
type AnyRecord = Record<string, unknown>;

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
): value is AnyRecord {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function requireObject(
  value: unknown,
  label: string,
): AnyRecord {
  assertCondition(
    isRecord(value),
    `${label} must be an object`,
  );
  return value;
}

function requireString(
  value: unknown,
  label: string,
): string {
  assertCondition(
    typeof value === "string" &&
      value.length > 0,
    `${label} must be a non-empty string`,
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

function exactFlagSet(
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

function requiredFlag(
  flags: Flags,
  name: string,
): string {
  const value = flags.get(name);

  assertCondition(
    value !== undefined &&
      value.length > 0,
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

function sha256(
  value: Buffer,
): string {
  return createHash("sha256")
    .update(value)
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
    UTC_SECONDS_PATTERN.test(value),
    `${label} must use YYYY-MM-DDTHH:mm:ssZ`,
  );

  const parsed = Date.parse(value);

  assertCondition(
    Number.isFinite(parsed) &&
      new Date(parsed)
        .toISOString()
        .replace(".000Z", "Z") === value,
    `${label} must be real UTC seconds`,
  );

  return value;
}

function requireHttpsEndpoint(
  value: string,
): string {
  const parsed = new URL(value);

  assertCondition(
    parsed.protocol === "https:",
    "submission endpoint must use HTTPS",
  );
  assertCondition(
    parsed.username === "" &&
      parsed.password === "" &&
      parsed.hash === "" &&
      parsed.search === "",
    "submission endpoint must not include credentials, query, or fragment",
  );
  assertCondition(
    parsed.pathname ===
      SUBMISSION_ENDPOINT_PATH,
    `submission endpoint path must equal ${SUBMISSION_ENDPOINT_PATH}`,
  );

  return parsed.toString();
}

function requirePrivateRegularFile(
  pathname: string,
  label: string,
): void {
  const metadata = lstatSync(pathname);

  assertCondition(
    metadata.isFile() &&
      !metadata.isSymbolicLink(),
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

function requireReadableRegularFile(
  pathname: string,
  label: string,
  executable = false,
): void {
  const metadata = statSync(pathname);

  assertCondition(
    metadata.isFile(),
    `${label} must resolve to a regular file`,
  );

  const descriptor = openSync(
    pathname,
    "r",
  );

  closeSync(descriptor);

  if (executable) {
    assertCondition(
      (metadata.mode & 0o111) !== 0,
      `${label} must be executable`,
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

function writePrivate(
  pathname: string,
  value: Buffer,
  mode = 0o600,
): void {
  const descriptor = openSync(
    pathname,
    "wx",
    mode,
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

  chmodSync(pathname, mode);
  fsyncDirectory(path.dirname(pathname));
}

function createPrivateDirectory(
  pathname: string,
): void {
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
    "private directory",
  );
}

function parseFirstJson(
  text: string,
): AnyRecord {
  const start = text.indexOf("{");

  assertCondition(
    start >= 0,
    "command output contains no JSON object",
  );

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (
    let index = start;
    index < text.length;
    index += 1
  ) {
    const character = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (character === "\\") {
        escaped = true;
        continue;
      }

      if (character === "\"") {
        inString = false;
      }

      continue;
    }

    if (character === "\"") {
      inString = true;
      continue;
    }

    if (character === "{") {
      depth += 1;
      continue;
    }

    if (character === "}") {
      depth -= 1;

      if (depth === 0) {
        return requireObject(
          JSON.parse(
            text.slice(
              start,
              index + 1,
            ),
          ) as unknown,
          "command JSON",
        );
      }
    }
  }

  return fail(
    "command JSON object did not terminate",
  );
}

function run(
  executable: string,
  args: string[],
  label: string,
): {
  stdout: string;
  stderr: string;
} {
  const result = spawnSync(
    executable,
    args,
    {
      encoding: "utf8",
      env: {
        ...process.env,
      },
    },
  );

  assertCondition(
    result.status === 0,
    [
      `${label} failed`,
      result.stdout,
      result.stderr,
    ].join("\n"),
  );

  return {
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function packetClientSource(): string {
  return `#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import http.client
import json
from pathlib import Path
import ssl
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / "onboarding-manifest-v1.json"
TOKEN = ROOT / "credential.token"
REQUEST = ROOT / "sample-request-v1.json"

manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
endpoint = urlparse(str(manifest["submission_endpoint"]))

if endpoint.scheme != "https" or not endpoint.hostname:
    raise RuntimeError("manifest endpoint is not HTTPS")

token = TOKEN.read_text(encoding="utf-8").strip()
body = REQUEST.read_bytes()
payload_sha = hashlib.sha256(body).hexdigest()

connection = http.client.HTTPSConnection(
    endpoint.hostname,
    endpoint.port or 443,
    timeout=20,
    context=ssl.create_default_context(),
)

try:
    connection.request(
        "POST",
        endpoint.path or "/",
        body=body,
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Content-Length": str(len(body)),
            "x-void-payload-sha256": payload_sha,
            "User-Agent": "void-real-agent-handoff-v1",
        },
    )
    response = connection.getresponse()
    response_body = response.read(1024 * 1024)
    headers = {
        key.lower(): value
        for key, value in response.getheaders()
    }
finally:
    connection.close()

if headers.get("location"):
    raise RuntimeError("redirect returned; refusing credential forwarding")

print(
    json.dumps(
        {
            "http_status": response.status,
            "response": json.loads(response_body.decode("utf-8")),
            "request_payload_sha256": payload_sha,
            "raw_token_printed": False,
            "redirect_following": False,
        },
        indent=2,
    )
)

raise SystemExit(
    0
    if response.status in {200, 201, 202}
    else 1
)
`;
}

function packetVerifierSource(): string {
  return `#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import stat
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / "onboarding-manifest-v1.json"
TOKEN = ROOT / "credential.token"
CHECKSUMS = ROOT / "SHA256SUMS.txt"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()

    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)

    return digest.hexdigest()


manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))

if stat.S_IMODE(ROOT.stat().st_mode) != 0o700:
    raise SystemExit("HOLD: packet directory mode is not 0700")

if stat.S_IMODE(TOKEN.stat().st_mode) != 0o600:
    raise SystemExit("HOLD: credential.token mode is not 0600")

if manifest.get("marker") != (
    "VOID_EXTERNAL_AGENT_CREDENTIAL_ONBOARDING_PACKET_V1"
):
    raise SystemExit("HOLD: packet marker mismatch")

if manifest.get("activation_state") != "staged_not_live":
    raise SystemExit("HOLD: packet activation state mismatch")

endpoint = urlparse(str(manifest.get("submission_endpoint") or ""))

if (
    endpoint.scheme != "https"
    or endpoint.path
    != "/__void/agents/paid-work/submissions/v1"
    or endpoint.query
    or endpoint.fragment
):
    raise SystemExit("HOLD: packet endpoint contract mismatch")

token_bytes = TOKEN.read_bytes()

if len(token_bytes) != 43:
    raise SystemExit("HOLD: packet token size is not 43 bytes")

if any(byte in b" \\t\\r\\n\\v\\f" for byte in token_bytes):
    raise SystemExit("HOLD: packet token contains whitespace")

if sha256_file(TOKEN) != manifest.get("credential_token_sha256"):
    raise SystemExit("HOLD: packet token digest mismatch")

for line in CHECKSUMS.read_text(encoding="utf-8").splitlines():
    expected, relative = line.split("  ", 1)

    if sha256_file(ROOT / relative) != expected:
        raise SystemExit(f"HOLD: checksum mismatch: {relative}")

print("REAL_EXTERNAL_AGENT_HANDOFF_PACKET_V1_VERIFIED=true")
print("activation_state=staged_not_live")
print("raw_token_printed=false")
`;
}

function buildRequest(
  fixturePath: string,
  orderModulePath: string,
  agentId: string,
): Promise<{
  request: AnyRecord;
  metadata: AnyRecord;
}> {
  return (async () => {
    const fixture = requireObject(
      JSON.parse(
        readFileSync(
          fixturePath,
          "utf8",
        ),
      ) as unknown,
      "request fixture",
    );
    const fixtureWorkOrder =
      requireObject(
        fixture.work_order,
        "request fixture work_order",
      );
    const fixtureRequester =
      requireObject(
        fixtureWorkOrder.requester,
        "request fixture requester",
      );
    const service =
      requireObject(
        fixtureWorkOrder.service,
        "request fixture service",
      );

    const capabilityId =
      requireString(
        service.capability_id,
        "work_order.service.capability_id",
      );
    const callbackUri =
      requireString(
        fixtureRequester.callback_uri,
        "work_order.requester.callback_uri",
      );

    const moduleObject =
      (await import(
        `${pathToFileURL(orderModulePath).href}?fresh=${Date.now()}`
      )) as AnyRecord;
    const materialize =
      moduleObject.materializeAgentPaidWorkOrder;
    const validateEnvelope =
      moduleObject.validateAgentPaidWorkOrderEnvelope;

    assertCondition(
      typeof materialize === "function",
      "materializeAgentPaidWorkOrder export missing",
    );
    assertCondition(
      typeof validateEnvelope === "function",
      "validateAgentPaidWorkOrderEnvelope export missing",
    );

    const now = new Date(
      Math.floor(Date.now() / 1000) * 1000,
    );
    const expires = new Date(
      now.getTime() +
        60 * 60 * 1000,
    );
    const createdAt =
      now
        .toISOString()
        .replace(".000Z", "Z");
    const expiresAt =
      expires
        .toISOString()
        .replace(".000Z", "Z");
    const suffix =
      `${now.getTime()}-${randomBytes(6).toString("hex")}`;

    const envelope =
      requireObject(
        materialize({
          marker:
            fixtureWorkOrder.marker,
          version:
            fixtureWorkOrder.version,
          created_at_utc:
            createdAt,
          expires_at_utc:
            expiresAt,
          requester: {
            agent_id:
              agentId,
            callback_uri:
              callbackUri,
          },
          service:
            fixtureWorkOrder.service,
          commercial:
            fixtureWorkOrder.commercial,
          execution_limits:
            fixtureWorkOrder.execution_limits,
          nonce:
            `real-agent-handoff-${suffix}`,
        }),
        "materialized work order",
      );

    validateEnvelope(envelope);

    const workOrderId =
      requireString(
        envelope.work_order_id,
        "materialized work_order_id",
      );
    const submissionId =
      `agent-real-handoff-v1-${suffix}`;

    return {
      request: {
        marker:
          "VOID_AGENT_PAID_WORK_SUBMISSION_REQUEST_V1",
        version: 1,
        submission_id:
          submissionId,
        work_order:
          envelope,
      },
      metadata: {
        generated_at_utc:
          createdAt,
        expires_at_utc:
          expiresAt,
        work_order_id:
          workOrderId,
        submission_id:
          submissionId,
        capability_id:
          capabilityId,
        requester_agent_id:
          agentId,
      },
    };
  })();
}

function checksumText(
  directory: string,
  names: string[],
): string {
  return names
    .map(
      (name) =>
        `${sha256(
          readFileSync(
            path.join(
              directory,
              name,
            ),
          ),
        )}  ${name}\n`,
    )
    .join("");
}

async function prepare(
  flags: Flags,
): Promise<void> {
  exactFlagSet(
    flags,
    [
      "--registry",
      "--lifecycle-cli",
      "--tsx",
      "--output-dir",
      "--agent-id",
      "--expires-at-utc",
      "--issued-at-utc",
      "--endpoint",
      "--order-module",
      "--request-fixture",
    ],
  );

  process.umask(0o077);

  const registryPath =
    path.resolve(
      requiredFlag(
        flags,
        "--registry",
      ),
    );
  const lifecycleCliPath =
    path.resolve(
      requiredFlag(
        flags,
        "--lifecycle-cli",
      ),
    );
  const tsxPath =
    path.resolve(
      requiredFlag(
        flags,
        "--tsx",
      ),
    );
  const outputDirectory =
    path.resolve(
      requiredFlag(
        flags,
        "--output-dir",
      ),
    );
  const agentId =
    requiredFlag(
      flags,
      "--agent-id",
    );
  const issuedAt =
    requireUtcSeconds(
      optionalFlag(
        flags,
        "--issued-at-utc",
      ) || utcNowSeconds(),
      "issued_at_utc",
    );
  const expiresAt =
    requireUtcSeconds(
      requiredFlag(
        flags,
        "--expires-at-utc",
      ),
      "expires_at_utc",
    );
  const endpoint =
    requireHttpsEndpoint(
      requiredFlag(
        flags,
        "--endpoint",
      ),
    );
  const orderModulePath =
    path.resolve(
      requiredFlag(
        flags,
        "--order-module",
      ),
    );
  const requestFixturePath =
    path.resolve(
      requiredFlag(
        flags,
        "--request-fixture",
      ),
    );

  assertCondition(
    AGENT_ID_PATTERN.test(agentId),
    "agent_id format invalid",
  );
  assertCondition(
    Date.parse(expiresAt) >
      Date.parse(issuedAt),
    "credential expiry must follow issuance",
  );

  requirePrivateRegularFile(
    registryPath,
    "credential registry",
  );

  for (const [
    pathname,
    label,
    executable,
  ] of [
    [
      lifecycleCliPath,
      "lifecycle CLI",
      false,
    ],
    [
      tsxPath,
      "tsx executable",
      true,
    ],
    [
      orderModulePath,
      "work-order module",
      false,
    ],
    [
      requestFixturePath,
      "request fixture",
      false,
    ],
  ] as const) {
    requireReadableRegularFile(
      pathname,
      label,
      executable,
    );
  }

  assertCondition(
    !existsSync(outputDirectory),
    "output directory already exists",
  );

  const sourceRegistryBytes =
    readFileSync(
      registryPath,
    );
  const sourceRegistry =
    parseAgentPaidWorkCredentialRegistryV1(
      JSON.parse(
        sourceRegistryBytes.toString("utf8"),
      ) as unknown,
    );
  const sourceRegistrySha =
    sha256(
      sourceRegistryBytes,
    );

  let outputCreated = false;

  try {
    createPrivateDirectory(
      outputDirectory,
    );
    outputCreated = true;

    const stageDirectory =
      path.join(
        outputDirectory,
        "stage",
      );
    const packetDirectory =
      path.join(
        outputDirectory,
        "packet",
      );

    const lifecycle = run(
      tsxPath,
      [
        lifecycleCliPath,
        "stage-issue",
        "--registry",
        registryPath,
        "--stage-dir",
        stageDirectory,
        "--agent-id",
        agentId,
        "--issued-at-utc",
        issuedAt,
        "--expires-at-utc",
        expiresAt,
      ],
      "lifecycle stage-issue",
    );

    const stageSummary =
      parseFirstJson(
        lifecycle.stdout,
      );

    assertCondition(
      stageSummary.staged === true &&
        stageSummary.operation === "issue" &&
        stageSummary.registry_mutated === false &&
        stageSummary.live_effect === false &&
        stageSummary.raw_token_printed === false,
      "lifecycle stage result mismatch",
    );

    requirePrivateDirectory(
      stageDirectory,
      "lifecycle stage directory",
    );

    const planPath =
      path.join(
        stageDirectory,
        "plan-v1.json",
      );
    const candidatePath =
      path.join(
        stageDirectory,
        "candidate-registry-v1.json",
      );
    const stageTokenPath =
      path.join(
        stageDirectory,
        "credential.token",
      );

    for (const [
      pathname,
      label,
    ] of [
      [
        planPath,
        "lifecycle plan",
      ],
      [
        candidatePath,
        "candidate registry",
      ],
      [
        stageTokenPath,
        "staged credential token",
      ],
    ]) {
      requirePrivateRegularFile(
        pathname,
        label,
      );
    }

    const plan =
      requireObject(
        JSON.parse(
          readFileSync(
            planPath,
            "utf8",
          ),
        ) as unknown,
        "lifecycle plan",
      );
    const candidateBytes =
      readFileSync(
        candidatePath,
      );
    const candidate =
      parseAgentPaidWorkCredentialRegistryV1(
        JSON.parse(
          candidateBytes.toString("utf8"),
        ) as unknown,
      );
    const tokenBytes =
      readFileSync(
        stageTokenPath,
      );
    const tokenText =
      tokenBytes.toString("utf8");

    assertCondition(
      tokenBytes.length === 43 &&
        tokenText.trim() === tokenText &&
        !/\s/.test(tokenText),
      "staged token must be exactly 43 non-whitespace bytes",
    );
    assertCondition(
      agentPaidWorkTokenSha256V1(
        tokenText,
      ) ===
        plan.new_token_sha256,
      "staged token digest mismatch",
    );
    assertCondition(
      plan.operation === "issue" &&
        plan.source_registry_id ===
          sourceRegistry.registry_id &&
        plan.source_registry_sha256 ===
          sourceRegistrySha &&
        plan.candidate_registry_id ===
          candidate.registry_id &&
        plan.candidate_registry_sha256 ===
          sha256(candidateBytes) &&
        plan.target_agent_id ===
          agentId &&
        typeof plan.new_credential_id ===
          "string" &&
        typeof plan.new_token_sha256 ===
          "string" &&
        plan.receiver_restart_required ===
          true,
      "lifecycle plan identity mismatch",
    );

    const candidateMatches =
      candidate.credentials.filter(
        (credential) =>
          credential.credential_id ===
            plan.new_credential_id &&
          credential.agent_id ===
            agentId &&
          credential.token_sha256 ===
            plan.new_token_sha256 &&
          credential.revoked_at_utc ===
            null,
      );

    assertCondition(
      candidateMatches.length === 1,
      "candidate registry does not contain new active credential exactly once",
    );

    const request =
      await buildRequest(
        requestFixturePath,
        orderModulePath,
        agentId,
      );

    createPrivateDirectory(
      packetDirectory,
    );

    const packetFiles: string[] = [];

    const writePacket = (
      name: string,
      value: Buffer,
      mode = 0o600,
    ): void => {
      writePrivate(
        path.join(
          packetDirectory,
          name,
        ),
        value,
        mode,
      );
      packetFiles.push(name);
    };

    writePacket(
      "credential.token",
      tokenBytes,
    );
    writePacket(
      "sample-request-v1.json",
      Buffer.from(
        `${JSON.stringify(
          request.request,
          null,
          2,
        )}\n`,
        "utf8",
      ),
    );

    const credential =
      candidateMatches[0]!;
    const packetManifest = {
      marker:
        PACKET_MARKER,
      version: 1,
      created_at_utc:
        utcNowSeconds(),
      activation_state:
        "staged_not_live",
      agent_id:
        agentId,
      registry_id_after_activation:
        candidate.registry_id,
      credential_id:
        credential.credential_id,
      credential_token_sha256:
        credential.token_sha256,
      scope:
        "agent_paid_work_submit",
      credential_issued_at_utc:
        credential.issued_at_utc,
      credential_expires_at_utc:
        credential.expires_at_utc,
      submission_endpoint:
        endpoint,
      request_contract:
        request.metadata,
      activation: {
        registry_apply_required:
          true,
        receiver_restart_required:
          true,
        live:
          false,
      },
      authentication: {
        scheme:
          "Bearer",
        raw_token_must_remain_private:
          true,
        raw_token_must_not_be_logged:
          true,
        raw_token_must_not_be_put_in_process_arguments:
          true,
      },
      payload_integrity: {
        header:
          "x-void-payload-sha256",
        algorithm:
          "sha256",
        digest_input:
          "exact HTTP request body bytes",
      },
      authority_boundary: {
        provider_selection_authorized:
          false,
        quote_creation_authorized:
          false,
        payment_authorized:
          false,
        work_execution_authorized:
          false,
        work_dispatch_authorized:
          false,
        wc_ledger_write_authorized:
          false,
        wallet_or_signer_access_authorized:
          false,
        buy_void_fulfillment_authorized:
          false,
      },
    };

    writePacket(
      "onboarding-manifest-v1.json",
      Buffer.from(
        `${JSON.stringify(
          packetManifest,
          null,
          2,
        )}\n`,
        "utf8",
      ),
    );
    writePacket(
      "submit_request_v1.py",
      Buffer.from(
        packetClientSource(),
        "utf8",
      ),
      0o700,
    );
    writePacket(
      "verify_packet_v1.py",
      Buffer.from(
        packetVerifierSource(),
        "utf8",
      ),
      0o700,
    );

    const readme = [
      "# VOID Real External-Agent Credential Handoff V1",
      "",
      `Agent ID: ${agentId}`,
      `Credential ID: ${credential.credential_id}`,
      `Candidate registry ID: ${candidate.registry_id}`,
      `Endpoint: ${endpoint}`,
      "",
      "This packet is private and is not live yet.",
      "",
      "The operator must apply the staged registry and separately restart",
      "the paid-work receiver before this credential can authenticate.",
      "",
      "Verify the packet:",
      "",
      "    python3 verify_packet_v1.py",
      "",
      "After operator activation, submit the sample request once:",
      "",
      "    python3 submit_request_v1.py",
      "",
      "Acceptance means accepted_for_review only. It grants no payment,",
      "execution, dispatch, Work Credit, wallet, signer, or Buy VOID authority.",
      "",
    ].join("\n");

    writePacket(
      "README.md",
      Buffer.from(
        readme,
        "utf8",
      ),
    );

    const checksumTargets =
      [...packetFiles].sort();

    writePrivate(
      path.join(
        packetDirectory,
        "SHA256SUMS.txt",
      ),
      Buffer.from(
        checksumText(
          packetDirectory,
          checksumTargets,
        ),
        "utf8",
      ),
    );

    const operatorManifest = {
      marker:
        HANDOFF_MARKER,
      version: 1,
      created_at_utc:
        utcNowSeconds(),
      activation_state:
        "staged_not_live",
      agent_id:
        agentId,
      source_registry_path:
        registryPath,
      source_registry_id:
        sourceRegistry.registry_id,
      source_registry_sha256:
        sourceRegistrySha,
      stage_directory:
        stageDirectory,
      packet_directory:
        packetDirectory,
      plan_id:
        plan.plan_id,
      candidate_registry_id:
        candidate.registry_id,
      candidate_registry_sha256:
        sha256(candidateBytes),
      credential_id:
        credential.credential_id,
      credential_token_sha256:
        credential.token_sha256,
      credential_expires_at_utc:
        credential.expires_at_utc,
      lifecycle_cli:
        lifecycleCliPath,
      lifecycle_apply_confirmation:
        "apply-agent-paid-work-credential-lifecycle-v1",
      registry_apply_required:
        true,
      receiver_restart_required:
        true,
      live:
        false,
      raw_token_printed:
        false,
    };

    writePrivate(
      path.join(
        outputDirectory,
        "operator-handoff-manifest-v1.json",
      ),
      Buffer.from(
        `${JSON.stringify(
          operatorManifest,
          null,
          2,
        )}\n`,
        "utf8",
      ),
    );

    const verify = run(
      "python3",
      [
        path.join(
          packetDirectory,
          "verify_packet_v1.py",
        ),
      ],
      "packet verifier",
    );

    assertCondition(
      verify.stdout.includes(
        "REAL_EXTERNAL_AGENT_HANDOFF_PACKET_V1_VERIFIED=true",
      ),
      "packet verifier marker missing",
    );

    assertCondition(
      readFileSync(
        registryPath,
      ).equals(
        sourceRegistryBytes,
      ),
      "source registry changed during handoff preparation",
    );

    process.stdout.write(
      `${JSON.stringify(
        {
          prepared: true,
          marker:
            HANDOFF_MARKER,
          activation_state:
            "staged_not_live",
          agent_id:
            agentId,
          output_directory:
            outputDirectory,
          operator_manifest:
            path.join(
              outputDirectory,
              "operator-handoff-manifest-v1.json",
            ),
          stage_directory:
            stageDirectory,
          packet_directory:
            packetDirectory,
          source_registry_id:
            sourceRegistry.registry_id,
          source_registry_sha256:
            sourceRegistrySha,
          candidate_registry_id:
            candidate.registry_id,
          candidate_registry_sha256:
            sha256(candidateBytes),
          plan_id:
            plan.plan_id,
          credential_id:
            credential.credential_id,
          credential_token_sha256:
            credential.token_sha256,
          credential_expires_at_utc:
            credential.expires_at_utc,
          packet_verifier_green:
            true,
          registry_mutated:
            false,
          receiver_restart:
            false,
          live:
            false,
          raw_token_printed:
            false,
          provider_selected:
            false,
          quote_created:
            false,
          payment_authorized:
            false,
          work_execution_authorized:
            false,
          work_dispatched:
            false,
          wc_ledger_write:
            false,
          wallet_access:
            false,
          buy_void_change:
            false,
        },
        null,
        2,
      )}\n`,
    );
    console.log(
      "AGENT_PAID_WORK_REAL_AGENT_HANDOFF_V1_PREPARED_EXACT_GREEN",
    );
  } catch (error) {
    if (
      outputCreated &&
      existsSync(
        outputDirectory,
      )
    ) {
      rmSync(
        outputDirectory,
        {
          recursive: true,
          force: true,
        },
      );
    }

    throw error;
  }
}

function verify(
  flags: Flags,
): void {
  exactFlagSet(
    flags,
    [
      "--handoff-dir",
    ],
  );

  const handoffDirectory =
    path.resolve(
      requiredFlag(
        flags,
        "--handoff-dir",
      ),
    );
  const packetDirectory =
    path.join(
      handoffDirectory,
      "packet",
    );
  const operatorManifestPath =
    path.join(
      handoffDirectory,
      "operator-handoff-manifest-v1.json",
    );

  requirePrivateDirectory(
    handoffDirectory,
    "handoff directory",
  );
  requirePrivateDirectory(
    packetDirectory,
    "packet directory",
  );
  requirePrivateRegularFile(
    operatorManifestPath,
    "operator handoff manifest",
  );

  const operatorManifest =
    requireObject(
      JSON.parse(
        readFileSync(
          operatorManifestPath,
          "utf8",
        ),
      ) as unknown,
      "operator handoff manifest",
    );

  assertCondition(
    operatorManifest.marker ===
      HANDOFF_MARKER &&
      operatorManifest.activation_state ===
        "staged_not_live" &&
      operatorManifest.registry_apply_required ===
        true &&
      operatorManifest.receiver_restart_required ===
        true &&
      operatorManifest.live ===
        false &&
      operatorManifest.raw_token_printed ===
        false,
    "operator handoff manifest mismatch",
  );

  const result = run(
    "python3",
    [
      path.join(
        packetDirectory,
        "verify_packet_v1.py",
      ),
    ],
    "packet verifier",
  );

  assertCondition(
    result.stdout.includes(
      "REAL_EXTERNAL_AGENT_HANDOFF_PACKET_V1_VERIFIED=true",
    ),
    "packet verifier marker missing",
  );

  process.stdout.write(
    `${JSON.stringify(
      {
        verified: true,
        handoff_directory:
          handoffDirectory,
        packet_directory:
          packetDirectory,
        agent_id:
          operatorManifest.agent_id,
        candidate_registry_id:
          operatorManifest.candidate_registry_id,
        credential_id:
          operatorManifest.credential_id,
        activation_state:
          "staged_not_live",
        packet_verifier_green:
          true,
        raw_token_printed:
          false,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    "AGENT_PAID_WORK_REAL_AGENT_HANDOFF_V1_VERIFIED_EXACT_GREEN",
  );
}

function usage(): never {
  return fail(
    [
      "usage:",
      "  tsx scripts/agent_paid_work_real_agent_handoff_v1.ts prepare --registry PATH --lifecycle-cli PATH --tsx PATH --output-dir DIR --agent-id ID --expires-at-utc UTC --endpoint HTTPS_URL --order-module PATH --request-fixture PATH [--issued-at-utc UTC]",
      "  tsx scripts/agent_paid_work_real_agent_handoff_v1.ts verify --handoff-dir DIR",
    ].join("\n"),
  );
}

async function main(): Promise<void> {
  const [
    command,
    ...args
  ] = process.argv.slice(2);

  if (!command) {
    usage();
  }

  const flags = parseFlags(
    args,
  );

  if (command === "prepare") {
    await prepare(flags);
    return;
  }

  if (command === "verify") {
    verify(flags);
    return;
  }

  usage();
}

main().catch(
  (error) => {
    process.stderr.write(
      `${String(
        error instanceof Error
          ? error.stack
          : error,
      )}\n`,
    );
    process.exitCode = 1;
  },
);
