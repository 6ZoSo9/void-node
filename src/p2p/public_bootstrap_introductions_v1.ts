// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import * as fs from "node:fs";
import * as path from "node:path";

import {
  isPublicLearnedPeerAddressV1,
  parsePeerAddress,
} from "../types/p2p.js";
import {
  normalizeVoidOnionV3HostnameV1,
} from "./tor_socks_socket_v1.js";

export const VOID_PUBLIC_P2P_BOOTSTRAP_INTRODUCTIONS_SCHEMA_V1 =
  "void_public_p2p_bootstrap_introductions_v1";
export const VOID_PUBLIC_P2P_BOOTSTRAP_INTRODUCTIONS_PATH_V1 =
  "config/void-public-p2p-bootstrap-introductions-v1.json";

const NODE_ID_RE = /^[0-9a-f]{32}$/;
const LABEL_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const ROOT_KEYS = Object.freeze([
  "schema",
  "network",
  "chain_id",
  "entries",
  "requirements",
  "authority",
]);
const ENTRY_KEYS = Object.freeze([
  "id",
  "priority",
  "transport",
  "endpoint",
  "expected_node_id",
  "failure_domain",
]);
const REQUIREMENT_KEYS = Object.freeze([
  "manual_operator_address_copy_required",
  "private_tailnet_dependency",
  "commercial_cloud_provider_required",
  "dns_provider_required",
  "tunnel_provider_required",
  "single_required_introduction",
]);
const AUTHORITY_KEYS = Object.freeze([
  "private_routes_exposed",
  "wallet_authority",
  "signer_authority",
  "validator_authority",
  "treasury_authority",
  "work_credit_authority",
  "money_movement_authority",
]);

export type VoidPublicP2PDirectIntroductionV1 = Readonly<{
  id: string;
  priority: number;
  transport: "direct_ipv4_seed";
  endpoint: string;
  expected_node_id: string;
  failure_domain: string;
  address: string;
}>;

export type VoidPublicP2PTorIntroductionV1 = Readonly<{
  id: string;
  priority: number;
  transport: "tor_sync_seed";
  endpoint: string;
  expected_node_id: string;
  failure_domain: string;
  onion_hostname: string;
  onion_port: number;
}>;

export type VoidPublicP2PIntroductionV1 =
  | VoidPublicP2PDirectIntroductionV1
  | VoidPublicP2PTorIntroductionV1;

export type VoidPublicP2PBootstrapIntroductionsV1 = Readonly<{
  schema: typeof VOID_PUBLIC_P2P_BOOTSTRAP_INTRODUCTIONS_SCHEMA_V1;
  network: "VOID Network";
  chain_id: 2050;
  entries: readonly VoidPublicP2PIntroductionV1[];
  requirements: Readonly<Record<string, false>>;
  authority: Readonly<Record<string, false>>;
}>;

function plainObject(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  value: unknown,
  expected: readonly string[],
  label: string,
): Record<string, unknown> {
  const object = plainObject(value, label);
  const actual = Object.keys(object).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label} keys mismatch`);
  }
  return object;
}

function boundedLabel(value: unknown, label: string): string {
  const text = String(value || "");
  if (!LABEL_RE.test(text)) throw new Error(`${label} is invalid`);
  return text;
}

function nodeId(value: unknown): string {
  const text = String(value || "");
  if (!NODE_ID_RE.test(text)) {
    throw new Error(
      "public P2P introduction expected_node_id must be 32 lowercase hex",
    );
  }
  return text;
}

function falseMap(
  raw: unknown,
  keys: readonly string[],
  label: string,
): Readonly<Record<string, false>> {
  const object = exactKeys(raw, keys, label);
  const normalized: Record<string, false> = {};
  for (const key of keys) {
    if (object[key] !== false) {
      throw new Error(`${label} ${key} must be false`);
    }
    normalized[key] = false;
  }
  return Object.freeze(normalized);
}

function directEndpoint(raw: unknown): string {
  const endpoint = String(raw || "");
  const parsed = parsePeerAddress(endpoint);
  if (
    !parsed ||
    parsed.canonical !== endpoint ||
    parsed.family !== 4 ||
    !isPublicLearnedPeerAddressV1(endpoint)
  ) {
    throw new Error(
      "direct_ipv4_seed endpoint must be a canonical globally routable IPv4 peer address",
    );
  }
  return parsed.canonical;
}

function torEndpoint(raw: unknown): {
  endpoint: string;
  onion_hostname: string;
  onion_port: number;
} {
  const endpoint = String(raw || "");
  const match = /^tor:\/\/([a-z2-7]{56}\.onion):(\d{1,5})$/.exec(
    endpoint,
  );
  if (!match) {
    throw new Error(
      "tor_sync_seed endpoint must be tor://<v3-onion>:<port>",
    );
  }
  const hostname = normalizeVoidOnionV3HostnameV1(match[1]);
  const port = Number(match[2]);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error("tor_sync_seed port is invalid");
  }
  return {
    endpoint: `tor://${hostname}:${port}`,
    onion_hostname: hostname,
    onion_port: port,
  };
}

export function validateVoidPublicP2PBootstrapIntroductionsV1(
  raw: unknown,
): VoidPublicP2PBootstrapIntroductionsV1 {
  const root = exactKeys(
    raw,
    ROOT_KEYS,
    "public P2P bootstrap introductions",
  );
  if (
    root.schema !==
    VOID_PUBLIC_P2P_BOOTSTRAP_INTRODUCTIONS_SCHEMA_V1
  ) {
    throw new Error("public P2P bootstrap introductions schema mismatch");
  }
  if (root.network !== "VOID Network" || root.chain_id !== 2050) {
    throw new Error("public P2P bootstrap introductions network mismatch");
  }
  if (
    !Array.isArray(root.entries) ||
    root.entries.length < 2 ||
    root.entries.length > 8
  ) {
    throw new Error(
      "public P2P bootstrap introductions require 2 through 8 entries",
    );
  }

  const ids = new Set<string>();
  const endpoints = new Set<string>();
  const nodeIds = new Set<string>();
  const domains = new Set<string>();
  const priorities = new Set<number>();
  const entries: VoidPublicP2PIntroductionV1[] = [];

  for (let index = 0; index < root.entries.length; index += 1) {
    const rawEntry = exactKeys(
      root.entries[index],
      ENTRY_KEYS,
      `public P2P bootstrap introduction ${index}`,
    );

    const id = boundedLabel(rawEntry.id, "introduction ID");
    const failureDomain = boundedLabel(
      rawEntry.failure_domain,
      "introduction failure domain",
    );
    const expectedNodeId = nodeId(rawEntry.expected_node_id);
    const priority = Number(rawEntry.priority);
    if (
      !Number.isSafeInteger(priority) ||
      priority < 1 ||
      priority > 1000
    ) {
      throw new Error("public P2P bootstrap introduction priority is invalid");
    }

    const transport = String(rawEntry.transport || "");
    let normalized: VoidPublicP2PIntroductionV1;
    if (transport === "direct_ipv4_seed") {
      const endpoint = directEndpoint(rawEntry.endpoint);
      normalized = Object.freeze({
        id,
        priority,
        transport,
        endpoint,
        expected_node_id: expectedNodeId,
        failure_domain: failureDomain,
        address: endpoint,
      });
    } else if (transport === "tor_sync_seed") {
      const tor = torEndpoint(rawEntry.endpoint);
      normalized = Object.freeze({
        id,
        priority,
        transport,
        endpoint: tor.endpoint,
        expected_node_id: expectedNodeId,
        failure_domain: failureDomain,
        onion_hostname: tor.onion_hostname,
        onion_port: tor.onion_port,
      });
    } else {
      throw new Error("public P2P bootstrap introduction transport is invalid");
    }

    if (ids.has(id)) throw new Error("duplicate introduction ID");
    if (endpoints.has(normalized.endpoint)) {
      throw new Error("duplicate introduction endpoint");
    }
    if (nodeIds.has(expectedNodeId)) {
      throw new Error("duplicate expected introduction node ID");
    }
    if (domains.has(failureDomain)) {
      throw new Error("duplicate introduction failure domain");
    }
    if (priorities.has(priority)) {
      throw new Error("duplicate introduction priority");
    }

    ids.add(id);
    endpoints.add(normalized.endpoint);
    nodeIds.add(expectedNodeId);
    domains.add(failureDomain);
    priorities.add(priority);
    entries.push(normalized);
  }

  const sorted = [...entries].sort((a, b) => a.priority - b.priority);
  if (JSON.stringify(entries) !== JSON.stringify(sorted)) {
    throw new Error(
      "public P2P bootstrap introductions must be priority-sorted",
    );
  }

  const transports = new Set(entries.map((entry) => entry.transport));
  if (!transports.has("direct_ipv4_seed") || !transports.has("tor_sync_seed")) {
    throw new Error(
      "public P2P bootstrap introductions require direct IPv4 and Tor classes",
    );
  }

  return Object.freeze({
    schema: VOID_PUBLIC_P2P_BOOTSTRAP_INTRODUCTIONS_SCHEMA_V1,
    network: "VOID Network",
    chain_id: 2050,
    entries: Object.freeze(sorted),
    requirements: falseMap(
      root.requirements,
      REQUIREMENT_KEYS,
      "public P2P bootstrap requirement",
    ),
    authority: falseMap(
      root.authority,
      AUTHORITY_KEYS,
      "public P2P bootstrap authority",
    ),
  });
}

export function loadVoidPublicP2PBootstrapIntroductionsV1(
  repoRoot = process.cwd(),
): VoidPublicP2PBootstrapIntroductionsV1 {
  const root = path.resolve(repoRoot);
  const target = path.resolve(
    root,
    VOID_PUBLIC_P2P_BOOTSTRAP_INTRODUCTIONS_PATH_V1,
  );
  if (
    target === root ||
    !target.startsWith(root + path.sep)
  ) {
    throw new Error(
      "public P2P bootstrap introductions path escaped repository root",
    );
  }
  const stat = fs.lstatSync(target);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(
      "public P2P bootstrap introductions must be a non-symlink regular file",
    );
  }
  return validateVoidPublicP2PBootstrapIntroductionsV1(
    JSON.parse(fs.readFileSync(target, "utf8")),
  );
}

function exactBooleanFlag(
  environment: NodeJS.ProcessEnv,
  key: string,
): boolean {
  const raw = String(environment[key] || "").trim();
  if (raw === "" || raw === "0") return false;
  if (raw === "1") return true;
  throw new Error(`${key} must be exactly 0 or 1`);
}

export function voidPublicP2PBootstrapIntroductionsEnabledV1(
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    exactBooleanFlag(environment, "VOID_PUBLIC_BOOTSTRAP_REQUIRE") ||
    exactBooleanFlag(
      environment,
      "VOID_PUBLIC_BOOTSTRAP_REQUIRE_MULTIPATH",
    )
  );
}

export function voidTorP2PSocksOptionsFromEnvV1(
  environment: NodeJS.ProcessEnv = process.env,
) {
  const socksHost = String(
    environment.VOID_TOR_SOCKS_HOST || "127.0.0.1",
  ).trim();
  if (!["127.0.0.1", "::1"].includes(socksHost)) {
    throw new Error("VOID_TOR_SOCKS_HOST must be numeric loopback");
  }

  const portRaw = String(environment.VOID_TOR_SOCKS_PORT || "9050").trim();
  if (!/^\d{1,5}$/.test(portRaw)) {
    throw new Error("VOID_TOR_SOCKS_PORT must be an integer");
  }
  const socksPort = Number(portRaw);
  if (
    !Number.isSafeInteger(socksPort) ||
    socksPort < 1024 ||
    socksPort > 65535
  ) {
    throw new Error("VOID_TOR_SOCKS_PORT must be 1024 through 65535");
  }

  const timeoutRaw = String(
    environment.VOID_TOR_BOOTSTRAP_TIMEOUT_MS || "30000",
  ).trim();
  if (!/^\d{4,5}$/.test(timeoutRaw)) {
    throw new Error(
      "VOID_TOR_BOOTSTRAP_TIMEOUT_MS must be a decimal integer",
    );
  }
  const timeoutMs = Number(timeoutRaw);
  if (
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1_000 ||
    timeoutMs > 60_000
  ) {
    throw new Error(
      "VOID_TOR_BOOTSTRAP_TIMEOUT_MS must be 1000 through 60000",
    );
  }

  return Object.freeze({ socksHost, socksPort, timeoutMs });
}
