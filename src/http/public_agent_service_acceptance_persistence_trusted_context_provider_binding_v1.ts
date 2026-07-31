import { createHash } from "node:crypto";
import {
  type BigIntStats,
  closeSync,
  constants as fsConstants,
  fstatSync,
  openSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import path from "node:path";

export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_CONFIG_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_CONFIG_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_RESULT_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_RESULT_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_V1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_VERSION =
  1 as const;

export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_ENABLED_ENV =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_ENABLED" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_APPLY_ENV =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_APPLY" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_CONFIRMATION_ENV =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_CONFIRMATION" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_BUNDLE_PATH_ENV =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_BUNDLE_PATH" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_CONFIRMATION =
  "installAcceptancePersistenceTrustedContextProviderV1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_GLOBAL =
  "__void_public_agent_service_acceptance_persistence_trusted_context_provider_v1" as const;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_RESULT_GLOBAL =
  "__void_public_agent_service_acceptance_persistence_trusted_context_provider_binding_v1_result" as const;

const MAX_BUNDLE_BYTES = 24 * 1024 * 1024;
const MAX_PATH_BYTES = 4096;

type JsonRecord = Record<string, unknown>;

export interface PublicAgentServiceAcceptancePersistenceTrustedContextV1 {
  catalog: unknown;
  work_order: unknown;
  quote: unknown;
}

export interface PublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingConfigV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_CONFIG_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_VERSION;
  enabled: boolean;
  apply: boolean;
  confirmation: string;
  bundle_path: string | null;
}

export interface PublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingAuthorityV1 {
  provider_global_install: boolean;
  provider_global_replace: false;
  trusted_context_bundle_read: false;
  trusted_context_provider_invocation: false;
  network_listener_creation: false;
  external_http_submission: false;
  production_acceptance_persistence: false;
  production_replay_write: false;
  payment_authorization: false;
  payment_execution: false;
  execution_authorization: false;
  work_dispatch: false;
  work_credit_write: false;
  wallet_access: false;
  production_signing: false;
  transaction_broadcast: false;
  service_restart: false;
  deployment_performed: false;
  money_movement: false;
}

export interface PublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingResultV1 {
  marker:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_RESULT_MARKER;
  version:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_VERSION;
  status:
    | "disabled"
    | "ready"
    | "installed";
  enabled: boolean;
  apply: boolean;
  confirmation_verified: boolean;
  bundle_path_configured: boolean;
  bundle_path_fingerprint_sha256: string | null;
  provider_global:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_GLOBAL;
  provider_installed: boolean;
  provider_invoked: false;
  authority:
    PublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingAuthorityV1;
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return (
    typeof value === "object"
    && value !== null
    && !Array.isArray(value)
  );
}

function requireRecord(
  value: unknown,
  label: string,
): JsonRecord {
  assertCondition(
    isRecord(value),
    `${label} must be an object`,
  );
  return value;
}

function requireExactKeys(
  value: JsonRecord,
  label: string,
  expected: readonly string[],
): void {
  const actualKeys = Object.keys(value).sort();
  const expectedKeys = [...expected].sort();
  assertCondition(
    actualKeys.length === expectedKeys.length
      && actualKeys.every(
        (entry, index) => entry === expectedKeys[index],
      ),
    `${label} keys must be exact`,
  );
}

function requireString(
  value: unknown,
  label: string,
  minimumBytes: number,
  maximumBytes: number,
): string {
  assertCondition(
    typeof value === "string",
    `${label} must be a string`,
  );
  const bytes = Buffer.byteLength(value, "utf8");
  assertCondition(
    bytes >= minimumBytes && bytes <= maximumBytes,
    `${label} length is invalid`,
  );
  return value;
}

function requireBoolean(
  value: unknown,
  label: string,
): boolean {
  assertCondition(
    typeof value === "boolean",
    `${label} must be a boolean`,
  );
  return value;
}

function requireAbsoluteNormalizedPath(
  value: unknown,
  label: string,
): string {
  const pathname = requireString(
    value,
    label,
    1,
    MAX_PATH_BYTES,
  );
  assertCondition(
    path.isAbsolute(pathname),
    `${label} must be absolute`,
  );
  assertCondition(
    path.normalize(pathname) === pathname,
    `${label} must be normalized`,
  );
  return pathname;
}

function parseOptionalBooleanEnvironmentFlag(
  value: string | undefined,
  label: string,
): boolean {
  if (value === undefined || value === "" || value === "0") {
    return false;
  }
  assertCondition(
    value === "1",
    `${label} must be empty, 0, or 1`,
  );
  return true;
}

function sha256Text(value: string): string {
  return createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

function deepFreezeJson<T>(value: T): T {
  if (
    typeof value !== "object"
    || value === null
  ) {
    return value;
  }
  const pending: object[] = [value as object];
  const visited = new WeakSet<object>();
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);
    for (const child of Object.values(current)) {
      if (
        typeof child === "object"
        && child !== null
      ) {
        pending.push(child);
      }
    }
    Object.freeze(current);
  }
  return value;
}

export function validatePublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingConfigV1(
  value: unknown,
): PublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingConfigV1 {
  const root = requireRecord(
    value,
    "trusted context provider binding config",
  );
  requireExactKeys(
    root,
    "trusted context provider binding config",
    [
      "marker",
      "version",
      "enabled",
      "apply",
      "confirmation",
      "bundle_path",
    ],
  );
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_CONFIG_MARKER,
    "trusted context provider binding config marker mismatch",
  );
  assertCondition(
    root.version
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_VERSION,
    "trusted context provider binding config version mismatch",
  );
  const enabled = requireBoolean(
    root.enabled,
    "enabled",
  );
  const apply = requireBoolean(
    root.apply,
    "apply",
  );
  const confirmation = requireString(
    root.confirmation,
    "confirmation",
    0,
    128,
  );

  if (!enabled) {
    assertCondition(
      apply === false,
      "disabled trusted context provider binding cannot apply",
    );
    assertCondition(
      confirmation === "",
      "disabled trusted context provider binding confirmation must be empty",
    );
    assertCondition(
      root.bundle_path === null,
      "disabled trusted context provider binding bundle path must be null",
    );
    return {
      marker:
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_CONFIG_MARKER,
      version:
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_VERSION,
      enabled: false,
      apply: false,
      confirmation: "",
      bundle_path: null,
    };
  }

  const bundlePath = requireAbsoluteNormalizedPath(
    root.bundle_path,
    "bundle_path",
  );
  if (apply) {
    assertCondition(
      confirmation
        === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_CONFIRMATION,
      "applied trusted context provider binding requires exact confirmation",
    );
  } else {
    assertCondition(
      confirmation === "",
      "dry-run trusted context provider binding confirmation must be empty",
    );
  }

  return {
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_CONFIG_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_VERSION,
    enabled: true,
    apply,
    confirmation,
    bundle_path: bundlePath,
  };
}

export function loadPublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingConfigFromEnvironmentV1(
  environment: NodeJS.ProcessEnv,
): PublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingConfigV1 {
  const enabled = parseOptionalBooleanEnvironmentFlag(
    environment[
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_ENABLED_ENV
    ],
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_ENABLED_ENV,
  );
  if (!enabled) {
    return validatePublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingConfigV1({
      marker:
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_CONFIG_MARKER,
      version:
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_VERSION,
      enabled: false,
      apply: false,
      confirmation: "",
      bundle_path: null,
    });
  }

  return validatePublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingConfigV1({
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_CONFIG_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_VERSION,
    enabled: true,
    apply:
      parseOptionalBooleanEnvironmentFlag(
        environment[
          PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_APPLY_ENV
        ],
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_APPLY_ENV,
      ),
    confirmation:
      environment[
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_CONFIRMATION_ENV
      ] ?? "",
    bundle_path:
      environment[
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_BUNDLE_PATH_ENV
      ],
  });
}

function assertStableFileMetadata(
  before: BigIntStats,
  after: BigIntStats,
): void {
  assertCondition(
    before.dev === after.dev
      && before.ino === after.ino
      && before.size === after.size
      && before.mtimeNs === after.mtimeNs
      && before.ctimeNs === after.ctimeNs,
    "trusted context bundle changed while being read",
  );
}

export function readPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1(
  bundlePathValue: unknown,
): PublicAgentServiceAcceptancePersistenceTrustedContextV1 {
  const bundlePath = requireAbsoluteNormalizedPath(
    bundlePathValue,
    "trusted context bundle path",
  );
  assertCondition(
    realpathSync.native(bundlePath) === bundlePath,
    "trusted context bundle path must not contain symlinks",
  );

  const noFollowFlag =
    typeof fsConstants.O_NOFOLLOW === "number"
      ? fsConstants.O_NOFOLLOW
      : 0;
  const descriptor = openSync(
    bundlePath,
    fsConstants.O_RDONLY | noFollowFlag,
  );
  let source: string;
  try {
    const before = fstatSync(
      descriptor,
      {
        bigint: true,
      },
    );
    assertCondition(
      before.isFile(),
      "trusted context bundle must be a regular file",
    );
    assertCondition(
      before.size >= 1n
        && before.size <= BigInt(MAX_BUNDLE_BYTES),
      "trusted context bundle size is invalid",
    );
    assertCondition(
      (before.mode & 0o022n) === 0n,
      "trusted context bundle must not be group or other writable",
    );
    if (typeof process.getuid === "function") {
      const currentUid = BigInt(process.getuid());
      assertCondition(
        before.uid === currentUid || before.uid === 0n,
        "trusted context bundle owner is not trusted",
      );
    }
    source = readFileSync(
      descriptor,
      {
        encoding: "utf8",
      },
    );
    const after = fstatSync(
      descriptor,
      {
        bigint: true,
      },
    );
    assertStableFileMetadata(before, after);
  } finally {
    closeSync(descriptor);
  }

  assertCondition(
    Buffer.byteLength(source, "utf8") <= MAX_BUNDLE_BYTES,
    "trusted context bundle size is invalid",
  );
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error(
      "trusted context bundle must contain valid JSON",
    );
  }
  const root = requireRecord(
    parsed,
    "trusted context bundle",
  );
  requireExactKeys(
    root,
    "trusted context bundle",
    [
      "marker",
      "version",
      "catalog",
      "work_order",
      "quote",
    ],
  );
  assertCondition(
    root.marker
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_MARKER,
    "trusted context bundle marker mismatch",
  );
  assertCondition(
    root.version
      === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_VERSION,
    "trusted context bundle version mismatch",
  );
  return deepFreezeJson({
    catalog: root.catalog,
    work_order: root.work_order,
    quote: root.quote,
  });
}

function resultV1(
  config:
    PublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingConfigV1,
  status:
    PublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingResultV1["status"],
  installed: boolean,
): PublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingResultV1 {
  return Object.freeze({
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_RESULT_MARKER,
    version:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_VERSION,
    status,
    enabled: config.enabled,
    apply: config.apply,
    confirmation_verified:
      !config.apply
      || config.confirmation
        === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_CONFIRMATION,
    bundle_path_configured:
      config.bundle_path !== null,
    bundle_path_fingerprint_sha256:
      config.bundle_path === null
        ? null
        : sha256Text(config.bundle_path),
    provider_global:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_GLOBAL,
    provider_installed: installed,
    provider_invoked: false as const,
    authority: Object.freeze({
      provider_global_install: installed,
      provider_global_replace: false as const,
      trusted_context_bundle_read: false as const,
      trusted_context_provider_invocation: false as const,
      network_listener_creation: false as const,
      external_http_submission: false as const,
      production_acceptance_persistence: false as const,
      production_replay_write: false as const,
      payment_authorization: false as const,
      payment_execution: false as const,
      execution_authorization: false as const,
      work_dispatch: false as const,
      work_credit_write: false as const,
      wallet_access: false as const,
      production_signing: false as const,
      transaction_broadcast: false as const,
      service_restart: false as const,
      deployment_performed: false as const,
      money_movement: false as const,
    }),
  });
}

export function installPublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingV1(
  configValue: unknown,
  target: JsonRecord,
): PublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingResultV1 {
  const config =
    validatePublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingConfigV1(
      configValue,
    );

  if (!config.enabled) {
    return resultV1(
      config,
      "disabled",
      false,
    );
  }
  if (!config.apply) {
    return resultV1(
      config,
      "ready",
      false,
    );
  }

  assertCondition(
    isRecord(target),
    "trusted context provider binding target must be an object",
  );
  assertCondition(
    !(
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_GLOBAL
      in target
    ),
    "trusted context provider global already exists",
  );
  const bundlePath = config.bundle_path!;
  const provider = (): PublicAgentServiceAcceptancePersistenceTrustedContextV1 =>
    readPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1(
      bundlePath,
    );
  Object.defineProperty(
    target,
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_GLOBAL,
    {
      value: provider,
      enumerable: false,
      configurable: false,
      writable: false,
    },
  );
  return resultV1(
    config,
    "installed",
    true,
  );
}

export function installPublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingFromEnvironmentV1(
  environment: NodeJS.ProcessEnv,
  target: JsonRecord,
): PublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingResultV1 {
  return installPublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingV1(
    loadPublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingConfigFromEnvironmentV1(
      environment,
    ),
    target,
  );
}

export function publicAgentServiceAcceptancePersistenceTrustedContextProviderBindingSourceTopologyV1(): {
  live_entrypoint: "src/index.ts";
  provider_global:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_GLOBAL;
  provider_result_global:
    typeof PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_RESULT_GLOBAL;
  bundle_shape:
    readonly ["catalog", "work_order", "quote"];
  disabled_before_path_validation: true;
  install_before_bundle_read: true;
  bundle_read_deferred_until_provider_invocation: true;
  provider_global_non_replaceable: true;
} {
  return Object.freeze({
    live_entrypoint: "src/index.ts" as const,
    provider_global:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_GLOBAL,
    provider_result_global:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_RESULT_GLOBAL,
    bundle_shape:
      Object.freeze([
        "catalog",
        "work_order",
        "quote",
      ]) as readonly ["catalog", "work_order", "quote"],
    disabled_before_path_validation: true as const,
    install_before_bundle_read: true as const,
    bundle_read_deferred_until_provider_invocation: true as const,
    provider_global_non_replaceable: true as const,
  });
}
