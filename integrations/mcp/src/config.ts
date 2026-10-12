import { constants as fsConstants } from "node:fs";
import { access, lstat, realpath } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const REQUIRED_REPO_FILES = [
  "tools/void-ai-agent-bootstrap-client-v1.mjs",
  "tools/void-ai-agent-paid-work-client-v1.mjs",
  "scripts/public_agent_service_order_submission_v1.ts",
  "ops/public/agent-services-v1/catalog.json",
] as const;

export type VoidMcpConfig = Readonly<{
  repoRoot: string;
  baseUrl: string;
  allowSubmit: boolean;
  tokenFile: string | null;
  timeoutMs: number;
  maxResponseBytes: number;
  nodeExecutable: string;
  tsxExecutable: string;
}>;

function parsePositiveInteger(
  raw: string | undefined,
  fallback: number,
  label: string,
  maximum: number,
): number {
  if (raw === undefined || raw === "") return fallback;
  if (!/^[1-9]\d*$/.test(raw)) {
    throw new Error(`${label} must be a positive decimal integer`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value > maximum) {
    throw new Error(`${label} must be 1..${maximum}`);
  }
  return value;
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return (
    normalized === "localhost"
    || normalized === "127.0.0.1"
    || normalized === "::1"
    || normalized === "[::1]"
  );
}

export function normalizeVoidMcpBaseUrl(raw: string | undefined): string {
  if (!raw) throw new Error("VOID_MCP_BASE_URL is required");
  const value = new URL(raw);
  if (value.username || value.password) {
    throw new Error("VOID_MCP_BASE_URL credentials are forbidden");
  }
  if (
    value.protocol !== "https:"
    && !(value.protocol === "http:" && isLoopbackHostname(value.hostname))
  ) {
    throw new Error(
      "VOID_MCP_BASE_URL must use HTTPS or loopback HTTP",
    );
  }
  if (value.search || value.hash) {
    throw new Error(
      "VOID_MCP_BASE_URL query and fragment are forbidden",
    );
  }
  return new URL("/", value).href;
}

async function looksLikeRepoRoot(candidate: string): Promise<boolean> {
  for (const relative of REQUIRED_REPO_FILES) {
    try {
      const metadata = await lstat(path.join(candidate, relative));
      if (!metadata.isFile() || metadata.isSymbolicLink()) return false;
    } catch {
      return false;
    }
  }
  return true;
}

async function walkForRepoRoot(start: string): Promise<string | null> {
  let current = path.resolve(start);
  for (let depth = 0; depth < 12; depth += 1) {
    if (await looksLikeRepoRoot(current)) return await realpath(current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

async function resolveRepoRoot(
  raw: string | undefined,
): Promise<string> {
  if (raw) {
    const candidate = await realpath(path.resolve(raw));
    if (!(await looksLikeRepoRoot(candidate))) {
      throw new Error(
        "VOID_MCP_REPO_ROOT does not contain the required VOID agent files",
      );
    }
    return candidate;
  }

  const moduleDirectory = fileURLToPath(new URL(".", import.meta.url));
  for (const start of [process.cwd(), moduleDirectory]) {
    const discovered = await walkForRepoRoot(start);
    if (discovered) return discovered;
  }
  throw new Error(
    "VOID repository root was not found; set VOID_MCP_REPO_ROOT",
  );
}

async function requirePrivateTokenFile(raw: string): Promise<string> {
  const resolved = path.resolve(raw);
  const metadata = await lstat(resolved);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error(
      "VOID_MCP_TOKEN_FILE must be a regular non-symlink file",
    );
  }
  if (metadata.size < 1 || metadata.size > 8193) {
    throw new Error("VOID_MCP_TOKEN_FILE size must be 1..8193 bytes");
  }
  if (process.platform !== "win32" && (metadata.mode & 0o077) !== 0) {
    throw new Error(
      "VOID_MCP_TOKEN_FILE must not grant group or other permissions",
    );
  }
  await access(resolved, fsConstants.R_OK);
  return resolved;
}

export async function loadVoidMcpConfig(
  env: NodeJS.ProcessEnv = process.env,
): Promise<VoidMcpConfig> {
  const repoRoot = await resolveRepoRoot(env.VOID_MCP_REPO_ROOT);
  const baseUrl = normalizeVoidMcpBaseUrl(env.VOID_MCP_BASE_URL);
  const allowSubmit = env.VOID_MCP_ALLOW_SUBMIT === "1";
  const timeoutMs = parsePositiveInteger(
    env.VOID_MCP_TIMEOUT_MS,
    10_000,
    "VOID_MCP_TIMEOUT_MS",
    60_000,
  );
  const maxResponseBytes = parsePositiveInteger(
    env.VOID_MCP_MAX_RESPONSE_BYTES,
    1_048_576,
    "VOID_MCP_MAX_RESPONSE_BYTES",
    4_194_304,
  );
  if (allowSubmit && !env.VOID_MCP_TOKEN_FILE) {
    throw new Error(
      "VOID_MCP_TOKEN_FILE is required when VOID_MCP_ALLOW_SUBMIT=1",
    );
  }
  const tokenFile = allowSubmit
    ? await requirePrivateTokenFile(env.VOID_MCP_TOKEN_FILE!)
    : null;

  const tsxExecutable = path.join(repoRoot, "node_modules", ".bin", "tsx");
  await access(tsxExecutable, fsConstants.X_OK);

  return Object.freeze({
    repoRoot,
    baseUrl,
    allowSubmit,
    tokenFile,
    timeoutMs,
    maxResponseBytes,
    nodeExecutable: process.execPath,
    tsxExecutable,
  });
}
