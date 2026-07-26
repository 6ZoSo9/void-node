import {
  createHash,
  timingSafeEqual,
} from "node:crypto";

import {
  canonicalJson,
} from "./agent_paid_work_order_envelope_v1.js";

export const AGENT_PAID_WORK_CREDENTIAL_REGISTRY_MARKER =
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REGISTRY_V1" as const;
export const AGENT_PAID_WORK_CREDENTIAL_ID_PREFIX =
  "voidapwc1_" as const;
export const AGENT_PAID_WORK_CREDENTIAL_REGISTRY_ID_PREFIX =
  "voidapwcr1_" as const;
export const AGENT_PAID_WORK_SUBMIT_SCOPE =
  "agent_paid_work_submit" as const;

export type AgentPaidWorkCredentialScope =
  typeof AGENT_PAID_WORK_SUBMIT_SCOPE;

export type AgentPaidWorkCredentialRecordDraftV1 = {
  agent_id: string;
  token_sha256: string;
  scopes: [AgentPaidWorkCredentialScope];
  issued_at_utc: string;
  expires_at_utc: string;
  revoked_at_utc: string | null;
};

export type AgentPaidWorkCredentialRecordV1 =
  AgentPaidWorkCredentialRecordDraftV1 & {
    credential_id: string;
  };

export type AgentPaidWorkCredentialRegistryDraftV1 = {
  marker:
    typeof AGENT_PAID_WORK_CREDENTIAL_REGISTRY_MARKER;
  version: 1;
  created_at_utc: string;
  credentials:
    AgentPaidWorkCredentialRecordV1[];
};

export type AgentPaidWorkCredentialRegistryV1 =
  AgentPaidWorkCredentialRegistryDraftV1 & {
    registry_id: string;
  };

export type AgentPaidWorkCredentialAuthenticationV1 = {
  mode: "credential_registry";
  registry_id: string;
  credential_id: string;
  agent_id: string;
  scope: AgentPaidWorkCredentialScope;
};

export type AgentPaidWorkCredentialAuthenticationResultV1 =
  | {
      ok: true;
      authentication:
        AgentPaidWorkCredentialAuthenticationV1;
    }
  | {
      ok: false;
      reason:
        | "authorization_format_invalid"
        | "credential_not_found"
        | "credential_not_yet_valid"
        | "credential_expired"
        | "credential_revoked"
        | "scope_not_granted";
    };

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const AGENT_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const UTC_SECONDS_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const MAX_CREDENTIALS = 1024;

function fail(message: string): never {
  throw new Error(message);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) fail(message);
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function assertExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  assertCondition(
    actual.length === wanted.length &&
      actual.every(
        (item, index) => item === wanted[index],
      ),
    `${label} must contain exactly: ${wanted.join(", ")}`,
  );
}

function requireString(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
  pattern?: RegExp,
): string {
  assertCondition(
    typeof value === "string",
    `${label} must be a string`,
  );
  assertCondition(
    value.length >= minimum &&
      value.length <= maximum,
    `${label} length out of range`,
  );
  if (pattern) {
    assertCondition(
      pattern.test(value),
      `${label} format invalid`,
    );
  }
  return value;
}

function requireUtcSeconds(
  value: unknown,
  label: string,
): string {
  const text = requireString(
    value,
    label,
    20,
    20,
    UTC_SECONDS_PATTERN,
  );
  assertCondition(
    new Date(Date.parse(text))
      .toISOString()
      .replace(".000Z", "Z") === text,
    `${label} must be real UTC seconds`,
  );
  return text;
}

function sha256(value: string): string {
  return createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

export function agentPaidWorkTokenSha256V1(
  token: string,
): string {
  assertCondition(
    /^[^\s]{16,8192}$/.test(token),
    "credential token format invalid",
  );
  return sha256(token);
}

function credentialDraftForId(
  value: AgentPaidWorkCredentialRecordDraftV1,
): Omit<
  AgentPaidWorkCredentialRecordDraftV1,
  "revoked_at_utc"
> {
  return {
    agent_id: value.agent_id,
    token_sha256: value.token_sha256,
    scopes: value.scopes,
    issued_at_utc: value.issued_at_utc,
    expires_at_utc: value.expires_at_utc,
  };
}

export function agentPaidWorkCredentialIdV1(
  value: AgentPaidWorkCredentialRecordDraftV1,
): string {
  return (
    AGENT_PAID_WORK_CREDENTIAL_ID_PREFIX +
    sha256(
      canonicalJson(
        credentialDraftForId(value),
      ),
    )
  );
}

export function agentPaidWorkCredentialRegistryIdV1(
  value: AgentPaidWorkCredentialRegistryDraftV1,
): string {
  return (
    AGENT_PAID_WORK_CREDENTIAL_REGISTRY_ID_PREFIX +
    sha256(canonicalJson(value))
  );
}

export function materializeAgentPaidWorkCredentialV1(
  value: AgentPaidWorkCredentialRecordDraftV1,
): AgentPaidWorkCredentialRecordV1 {
  const parsed = parseCredentialDraft(value);
  return {
    ...parsed,
    credential_id:
      agentPaidWorkCredentialIdV1(parsed),
  };
}

export function materializeAgentPaidWorkCredentialRegistryV1(
  value: Omit<
    AgentPaidWorkCredentialRegistryDraftV1,
    "marker" | "version"
  >,
): AgentPaidWorkCredentialRegistryV1 {
  const draft:
    AgentPaidWorkCredentialRegistryDraftV1 = {
      marker:
        AGENT_PAID_WORK_CREDENTIAL_REGISTRY_MARKER,
      version: 1,
      created_at_utc:
        requireUtcSeconds(
          value.created_at_utc,
          "registry.created_at_utc",
        ),
      credentials:
        value.credentials.map(
          (credential) =>
            parseCredentialRecord(
              credential,
            ),
        ),
    };
  validateCredentialSet(draft.credentials);
  return {
    ...draft,
    registry_id:
      agentPaidWorkCredentialRegistryIdV1(
        draft,
      ),
  };
}

function parseCredentialDraft(
  input: unknown,
): AgentPaidWorkCredentialRecordDraftV1 {
  assertCondition(
    isRecord(input),
    "credential must be an object",
  );
  assertExactKeys(
    input,
    [
      "agent_id",
      "token_sha256",
      "scopes",
      "issued_at_utc",
      "expires_at_utc",
      "revoked_at_utc",
    ],
    "credential draft",
  );
  const agentId = requireString(
    input.agent_id,
    "credential.agent_id",
    3,
    128,
    AGENT_ID_PATTERN,
  );
  const tokenSha = requireString(
    input.token_sha256,
    "credential.token_sha256",
    64,
    64,
    SHA256_PATTERN,
  );
  assertCondition(
    Array.isArray(input.scopes) &&
      input.scopes.length === 1 &&
      input.scopes[0] ===
        AGENT_PAID_WORK_SUBMIT_SCOPE,
    "credential scopes must contain only agent_paid_work_submit",
  );
  const issuedAt = requireUtcSeconds(
    input.issued_at_utc,
    "credential.issued_at_utc",
  );
  const expiresAt = requireUtcSeconds(
    input.expires_at_utc,
    "credential.expires_at_utc",
  );
  assertCondition(
    Date.parse(expiresAt) >
      Date.parse(issuedAt),
    "credential expiry must follow issuance",
  );
  let revokedAt: string | null = null;
  if (input.revoked_at_utc !== null) {
    revokedAt = requireUtcSeconds(
      input.revoked_at_utc,
      "credential.revoked_at_utc",
    );
    assertCondition(
      Date.parse(revokedAt) >=
        Date.parse(issuedAt),
      "credential revocation precedes issuance",
    );
  }
  return {
    agent_id: agentId,
    token_sha256: tokenSha,
    scopes: [
      AGENT_PAID_WORK_SUBMIT_SCOPE,
    ],
    issued_at_utc: issuedAt,
    expires_at_utc: expiresAt,
    revoked_at_utc: revokedAt,
  };
}

function parseCredentialRecord(
  input: unknown,
): AgentPaidWorkCredentialRecordV1 {
  assertCondition(
    isRecord(input),
    "credential record must be an object",
  );
  assertExactKeys(
    input,
    [
      "credential_id",
      "agent_id",
      "token_sha256",
      "scopes",
      "issued_at_utc",
      "expires_at_utc",
      "revoked_at_utc",
    ],
    "credential record",
  );
  const credentialId = requireString(
    input.credential_id,
    "credential.credential_id",
    AGENT_PAID_WORK_CREDENTIAL_ID_PREFIX.length +
      64,
    AGENT_PAID_WORK_CREDENTIAL_ID_PREFIX.length +
      64,
    /^voidapwc1_[0-9a-f]{64}$/,
  );
  const draft = parseCredentialDraft({
    agent_id: input.agent_id,
    token_sha256: input.token_sha256,
    scopes: input.scopes,
    issued_at_utc:
      input.issued_at_utc,
    expires_at_utc:
      input.expires_at_utc,
    revoked_at_utc:
      input.revoked_at_utc,
  });
  assertCondition(
    credentialId ===
      agentPaidWorkCredentialIdV1(draft),
    "credential_id mismatch",
  );
  return {
    ...draft,
    credential_id: credentialId,
  };
}

function validateCredentialSet(
  credentials:
    AgentPaidWorkCredentialRecordV1[],
): void {
  assertCondition(
    credentials.length >= 1 &&
      credentials.length <=
        MAX_CREDENTIALS,
    "credential count out of range",
  );
  const credentialIds = new Set<string>();
  const tokenDigests = new Set<string>();
  for (const credential of credentials) {
    assertCondition(
      !credentialIds.has(
        credential.credential_id,
      ),
      "duplicate credential_id",
    );
    assertCondition(
      !tokenDigests.has(
        credential.token_sha256,
      ),
      "duplicate token_sha256",
    );
    credentialIds.add(
      credential.credential_id,
    );
    tokenDigests.add(
      credential.token_sha256,
    );
  }
}

export function parseAgentPaidWorkCredentialRegistryV1(
  input: unknown,
): AgentPaidWorkCredentialRegistryV1 {
  assertCondition(
    isRecord(input),
    "credential registry must be an object",
  );
  assertExactKeys(
    input,
    [
      "marker",
      "version",
      "registry_id",
      "created_at_utc",
      "credentials",
    ],
    "credential registry",
  );
  assertCondition(
    input.marker ===
      AGENT_PAID_WORK_CREDENTIAL_REGISTRY_MARKER,
    "credential registry marker mismatch",
  );
  assertCondition(
    input.version === 1,
    "credential registry version mismatch",
  );
  const registryId = requireString(
    input.registry_id,
    "credential registry.registry_id",
    AGENT_PAID_WORK_CREDENTIAL_REGISTRY_ID_PREFIX.length +
      64,
    AGENT_PAID_WORK_CREDENTIAL_REGISTRY_ID_PREFIX.length +
      64,
    /^voidapwcr1_[0-9a-f]{64}$/,
  );
  const createdAt = requireUtcSeconds(
    input.created_at_utc,
    "credential registry.created_at_utc",
  );
  assertCondition(
    Array.isArray(input.credentials),
    "credential registry.credentials must be an array",
  );
  const credentials =
    input.credentials.map(
      (credential) =>
        parseCredentialRecord(
          credential,
        ),
    );
  validateCredentialSet(credentials);
  const draft:
    AgentPaidWorkCredentialRegistryDraftV1 = {
      marker:
        AGENT_PAID_WORK_CREDENTIAL_REGISTRY_MARKER,
      version: 1,
      created_at_utc: createdAt,
      credentials,
    };
  assertCondition(
    registryId ===
      agentPaidWorkCredentialRegistryIdV1(
        draft,
      ),
    "credential registry_id mismatch",
  );
  return {
    ...draft,
    registry_id: registryId,
  };
}

export function authenticateAgentPaidWorkCredentialV1(
  authorization: string,
  registry:
    AgentPaidWorkCredentialRegistryV1,
  evaluatedAtUtc: string,
): AgentPaidWorkCredentialAuthenticationResultV1 {
  const prefix = "Bearer ";
  if (
    !authorization.startsWith(prefix) ||
    !/^[^\s]{16,8192}$/.test(
      authorization.slice(
        prefix.length,
      ),
    )
  ) {
    return {
      ok: false,
      reason:
        "authorization_format_invalid",
    };
  }
  const evaluatedAt = requireUtcSeconds(
    evaluatedAtUtc,
    "credential authentication.evaluated_at_utc",
  );
  const suppliedDigest =
    agentPaidWorkTokenSha256V1(
      authorization.slice(
        prefix.length,
      ),
    );
  const suppliedBuffer = Buffer.from(
    suppliedDigest,
    "hex",
  );
  let matched:
    AgentPaidWorkCredentialRecordV1
    | null = null;

  for (const credential of registry.credentials) {
    const candidate = Buffer.from(
      credential.token_sha256,
      "hex",
    );
    const equal =
      candidate.length ===
        suppliedBuffer.length &&
      timingSafeEqual(
        suppliedBuffer,
        candidate,
      );
    if (equal) {
      matched = credential;
    }
  }

  if (!matched) {
    return {
      ok: false,
      reason: "credential_not_found",
    };
  }
  if (
    Date.parse(evaluatedAt) <
    Date.parse(matched.issued_at_utc)
  ) {
    return {
      ok: false,
      reason:
        "credential_not_yet_valid",
    };
  }
  if (
    Date.parse(evaluatedAt) >=
    Date.parse(matched.expires_at_utc)
  ) {
    return {
      ok: false,
      reason: "credential_expired",
    };
  }
  if (
    matched.revoked_at_utc !== null &&
    Date.parse(evaluatedAt) >=
      Date.parse(
        matched.revoked_at_utc,
      )
  ) {
    return {
      ok: false,
      reason: "credential_revoked",
    };
  }
  if (
    !matched.scopes.includes(
      AGENT_PAID_WORK_SUBMIT_SCOPE,
    )
  ) {
    return {
      ok: false,
      reason: "scope_not_granted",
    };
  }
  return {
    ok: true,
    authentication: {
      mode: "credential_registry",
      registry_id:
        registry.registry_id,
      credential_id:
        matched.credential_id,
      agent_id: matched.agent_id,
      scope:
        AGENT_PAID_WORK_SUBMIT_SCOPE,
    },
  };
}
