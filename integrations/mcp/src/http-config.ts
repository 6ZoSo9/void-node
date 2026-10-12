import process from "node:process";

import {
  loadVoidMcpConfig,
  type VoidMcpConfig,
} from "./config.js";

const DEFAULT_HTTP_HOST = "127.0.0.1" as const;
const DEFAULT_HTTP_PORT = 4114;
const DEFAULT_HTTP_PATH = "/mcp" as const;
const DEFAULT_MAX_REQUEST_BYTES = 65_536;
const DEFAULT_MAX_CONCURRENT_REQUESTS = 8;
const DEFAULT_ALLOWED_HOSTNAMES = [
  "localhost",
  "127.0.0.1",
  "[::1]",
] as const;

export type VoidMcpHttpConfig = Readonly<{
  bridge: VoidMcpConfig;
  host: typeof DEFAULT_HTTP_HOST;
  port: number;
  path: typeof DEFAULT_HTTP_PATH;
  allowedHostnames: readonly string[];
  allowedOriginHostnames: readonly string[];
  maxRequestBytes: number;
  maxConcurrentRequests: number;
}>;

function parseBoundedInteger(
  raw: string | undefined,
  fallback: number,
  label: string,
  minimum: number,
  maximum: number,
): number {
  if (raw === undefined || raw === "") return fallback;
  if (!/^[1-9]\d*$/.test(raw)) {
    throw new Error(`${label} must be a positive decimal integer`);
  }

  const value = Number(raw);
  if (
    !Number.isSafeInteger(value)
    || value < minimum
    || value > maximum
  ) {
    throw new Error(`${label} must be ${minimum}..${maximum}`);
  }

  return value;
}

function normalizeHostname(raw: string, label: string): string {
  if (raw === "" || raw !== raw.trim() || raw.includes("*")) {
    throw new Error(`${label} contains an invalid hostname`);
  }
  if (
    raw.includes("://")
    || raw.includes("/")
    || raw.includes("@")
    || raw.includes("?")
    || raw.includes("#")
  ) {
    throw new Error(`${label} must contain hostnames only`);
  }

  let parsed: URL;
  try {
    parsed = new URL(`http://${raw}/`);
  } catch {
    throw new Error(`${label} contains an invalid hostname`);
  }

  if (
    parsed.username
    || parsed.password
    || parsed.port
    || parsed.pathname !== "/"
    || parsed.search
    || parsed.hash
  ) {
    throw new Error(`${label} must contain hostnames without ports`);
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "" || hostname.length > 253) {
    throw new Error(`${label} contains an invalid hostname`);
  }

  return hostname;
}

function parseHostnameList(
  raw: string | undefined,
  label: string,
): readonly string[] {
  const values = raw === undefined || raw === ""
    ? [...DEFAULT_ALLOWED_HOSTNAMES]
    : raw.split(",");
  if (values.length < 1 || values.length > 32) {
    throw new Error(`${label} must contain 1..32 hostnames`);
  }

  const normalized = values.map((value) =>
    normalizeHostname(value, label)
  );
  if (new Set(normalized).size !== normalized.length) {
    throw new Error(`${label} contains duplicate hostnames`);
  }

  return Object.freeze(normalized);
}

export async function loadVoidMcpHttpConfig(
  env: NodeJS.ProcessEnv = process.env,
): Promise<VoidMcpHttpConfig> {
  if (
    env.VOID_MCP_ALLOW_SUBMIT !== undefined
    && env.VOID_MCP_ALLOW_SUBMIT !== ""
    && env.VOID_MCP_ALLOW_SUBMIT !== "0"
  ) {
    throw new Error(
      "VOID MCP HTTP transport is read-only; VOID_MCP_ALLOW_SUBMIT must be unset or 0",
    );
  }
  if (env.VOID_MCP_TOKEN_FILE !== undefined) {
    throw new Error(
      "VOID MCP HTTP transport forbids VOID_MCP_TOKEN_FILE",
    );
  }

  const host = env.VOID_MCP_HTTP_HOST ?? DEFAULT_HTTP_HOST;
  if (host !== DEFAULT_HTTP_HOST) {
    throw new Error(
      "VOID_MCP_HTTP_HOST must be exact loopback 127.0.0.1; expose it only through a trusted TLS reverse proxy",
    );
  }

  const bridgeEnvironment: NodeJS.ProcessEnv = {
    ...env,
    VOID_MCP_ALLOW_SUBMIT: "0",
  };
  delete bridgeEnvironment.VOID_MCP_TOKEN_FILE;
  const bridge = await loadVoidMcpConfig(bridgeEnvironment);
  if (bridge.allowSubmit || bridge.tokenFile !== null) {
    throw new Error("VOID MCP HTTP read-only bridge invariant failed");
  }

  return Object.freeze({
    bridge,
    host: DEFAULT_HTTP_HOST,
    port: parseBoundedInteger(
      env.VOID_MCP_HTTP_PORT,
      DEFAULT_HTTP_PORT,
      "VOID_MCP_HTTP_PORT",
      1024,
      65_535,
    ),
    path: DEFAULT_HTTP_PATH,
    allowedHostnames: parseHostnameList(
      env.VOID_MCP_HTTP_ALLOWED_HOSTS,
      "VOID_MCP_HTTP_ALLOWED_HOSTS",
    ),
    allowedOriginHostnames: parseHostnameList(
      env.VOID_MCP_HTTP_ALLOWED_ORIGINS,
      "VOID_MCP_HTTP_ALLOWED_ORIGINS",
    ),
    maxRequestBytes: parseBoundedInteger(
      env.VOID_MCP_HTTP_MAX_REQUEST_BYTES,
      DEFAULT_MAX_REQUEST_BYTES,
      "VOID_MCP_HTTP_MAX_REQUEST_BYTES",
      1,
      1_048_576,
    ),
    maxConcurrentRequests: parseBoundedInteger(
      env.VOID_MCP_HTTP_MAX_CONCURRENT_REQUESTS,
      DEFAULT_MAX_CONCURRENT_REQUESTS,
      "VOID_MCP_HTTP_MAX_CONCURRENT_REQUESTS",
      1,
      64,
    ),
  });
}
