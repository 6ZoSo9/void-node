// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import fs from "node:fs";
import path from "node:path";

import {
  isPublicLearnedPeerAddressV1,
  parsePeerAddress,
} from "../types/p2p.js";

export const VOID_PUBLIC_P2P_BOOTSTRAP_INTRODUCTIONS_SCHEMA_V1 =
  "void_public_p2p_bootstrap_introductions_v1";
export const VOID_PUBLIC_P2P_BOOTSTRAP_INTRODUCTIONS_PATH_V1 =
  "config/void-public-p2p-bootstrap-introductions-v1.json";

const NODE_ID_RE = /^[0-9a-f]{32}$/;
const LABEL_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const INTRODUCTION_TRANSPORTS = new Set([
  "direct_ipv4_seed",
  "direct_ipv6_seed",
  "relay",
]);
const ENTRY_KEYS = Object.freeze([
  "id",
  "priority",
  "address",
  "expected_node_id",
  "introduction_transport",
  "failure_domain",
]);
const ROOT_KEYS = Object.freeze([
  "schema",
  "network",
  "chain_id",
  "entries",
  "requirements",
  "authority",
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

export type VoidPublicP2PBootstrapIntroductionV1 = Readonly<{
  id: string;
  priority: number;
  address: string;
  expected_node_id: string;
  introduction_transport: "direct_ipv4_seed" | "direct_ipv6_seed" | "relay";
  failure_domain: string;
}>;

export type VoidPublicP2PBootstrapIntroductionsV1 = Readonly<{
  schema: typeof VOID_PUBLIC_P2P_BOOTSTRAP_INTRODUCTIONS_SCHEMA_V1;
  network: "VOID Network";
  chain_id: 2050;
  entries: readonly VoidPublicP2PBootstrapIntroductionV1[];
  requirements: Readonly<Record<(typeof REQUIREMENT_KEYS)[number], false>>;
  authority: Readonly<Record<(typeof AUTHORITY_KEYS)[number], false>>;
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

function label(value: unknown, what: string): string {
  const text = String(value || "");
  if (!LABEL_RE.test(text)) throw new Error(`${what} is invalid`);
  return text;
}

function nodeId(value: unknown, what: string): string {
  const text = String(value || "");
  if (!NODE_ID_RE.test(text)) {
    throw new Error(`${what} must be 32 lowercase hex characters`);
  }
  return text;
}

function falseMap(
  raw: unknown,
  keys: readonly string[],
  what: string,
): Record<string, false> {
  const object = exactKeys(raw, keys, what);
  const result: Record<string, false> = {};
  for (const key of keys) {
    if (object[key] !== false) {
      throw new Error(`${what} ${key} must be false`);
    }
    result[key] = false;
  }
  return Object.freeze(result);
}

function publicPinnedAddress(raw: unknown, transport: string): string {
  const address = String(raw || "");
  const parsed = parsePeerAddress(address);
  if (!parsed || parsed.canonical !== address) {
    throw new Error("pinned bootstrap address must be canonical");
  }

  if (parsed.family === 4 || parsed.family === 6) {
    if (!isPublicLearnedPeerAddressV1(address)) {
      throw new Error("pinned numeric bootstrap address must be globally routable");
    }
  } else {
    const host = parsed.host.toLowerCase();
    if (
      !host.includes(".") ||
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host.endsWith(".lan") ||
      host.endsWith(".home") ||
      host.endsWith(".test") ||
      host.endsWith(".invalid") ||
      host.endsWith(".example")
    ) {
      throw new Error("pinned DNS bootstrap host must be public-shaped");
    }
  }

  if (transport === "direct_ipv4_seed" && parsed.family !== 4) {
    throw new Error("direct_ipv4_seed requires a numeric IPv4 address");
  }
  if (transport === "direct_ipv6_seed" && parsed.family !== 6) {
    throw new Error("direct_ipv6_seed requires a numeric IPv6 address");
  }

  return parsed.canonical;
}

export function validateVoidPublicP2PBootstrapIntroductionsV1(
  raw: unknown,
): VoidPublicP2PBootstrapIntroductionsV1 {
  const root = exactKeys(raw, ROOT_KEYS, "public P2P bootstrap introductions");
  if (root.schema !== VOID_PUBLIC_P2P_BOOTSTRAP_INTRODUCTIONS_SCHEMA_V1) {
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
    throw new Error("public P2P bootstrap introductions require 2 through 8 entries");
  }

  const ids = new Set<string>();
  const addresses = new Set<string>();
  const nodeIds = new Set<string>();
  const failureDomains = new Set<string>();
  const priorities = new Set<number>();

  const entries = root.entries.map((rawEntry, index) => {
    const entry = exactKeys(
      rawEntry,
      ENTRY_KEYS,
      `public P2P bootstrap introduction ${index}`,
    );
    const id = label(entry.id, "introduction ID");
    const expectedNodeId = nodeId(
      entry.expected_node_id,
      "expected introduction node ID",
    );
    const transport = String(entry.introduction_transport || "");
    if (!INTRODUCTION_TRANSPORTS.has(transport)) {
      throw new Error("public P2P bootstrap introduction transport is invalid");
    }
    const failureDomain = label(
      entry.failure_domain,
      "introduction failure domain",
    );
    const priority = Number(entry.priority);
    if (
      !Number.isSafeInteger(priority) ||
      priority < 1 ||
      priority > 1000
    ) {
      throw new Error("public P2P bootstrap introduction priority is invalid");
    }
    const address = publicPinnedAddress(entry.address, transport);

    for (const [set, value, what] of [
      [ids, id, "introduction ID"],
      [addresses, address, "introduction address"],
      [nodeIds, expectedNodeId, "expected introduction node ID"],
      [failureDomains, failureDomain, "introduction failure domain"],
      [priorities, priority, "introduction priority"],
    ] as const) {
      if (set.has(value as never)) {
        throw new Error(`duplicate ${what}`);
      }
      (set as Set<any>).add(value);
    }

    return Object.freeze({
      id,
      priority,
      address,
      expected_node_id: expectedNodeId,
      introduction_transport:
        transport as VoidPublicP2PBootstrapIntroductionV1["introduction_transport"],
      failure_domain: failureDomain,
    });
  });

  const sorted = [...entries].sort((a, b) => a.priority - b.priority);
  if (JSON.stringify(entries) !== JSON.stringify(sorted)) {
    throw new Error("public P2P bootstrap introductions must be priority-sorted");
  }

  const requirements = falseMap(
    root.requirements,
    REQUIREMENT_KEYS,
    "public P2P bootstrap requirement",
  ) as VoidPublicP2PBootstrapIntroductionsV1["requirements"];
  const authority = falseMap(
    root.authority,
    AUTHORITY_KEYS,
    "public P2P bootstrap authority",
  ) as VoidPublicP2PBootstrapIntroductionsV1["authority"];

  return Object.freeze({
    schema: VOID_PUBLIC_P2P_BOOTSTRAP_INTRODUCTIONS_SCHEMA_V1,
    network: "VOID Network",
    chain_id: 2050,
    entries: Object.freeze(sorted),
    requirements,
    authority,
  });
}

export function loadVoidPublicP2PBootstrapIntroductionsV1(
  repoRoot = process.cwd(),
): VoidPublicP2PBootstrapIntroductionsV1 {
  const target = path.resolve(
    repoRoot,
    VOID_PUBLIC_P2P_BOOTSTRAP_INTRODUCTIONS_PATH_V1,
  );
  const expectedRoot = path.resolve(repoRoot) + path.sep;
  if (!target.startsWith(expectedRoot)) {
    throw new Error("public P2P bootstrap introductions path escaped repository root");
  }
  const stat = fs.lstatSync(target);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error("public P2P bootstrap introductions file must be a regular file");
  }
  return validateVoidPublicP2PBootstrapIntroductionsV1(
    JSON.parse(fs.readFileSync(target, "utf8")),
  );
}

function exactFlag(
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
    exactFlag(environment, "VOID_PUBLIC_BOOTSTRAP_REQUIRE") ||
    exactFlag(environment, "VOID_PUBLIC_BOOTSTRAP_REQUIRE_MULTIPATH")
  );
}
