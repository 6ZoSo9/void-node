import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(
  process.cwd(),
  "docs/public/void-public-gateway-foundation-v1",
);

function requireFile(name: string): string {
  const path = resolve(root, name);
  const stat = statSync(path);
  if (!stat.isFile() || stat.size <= 0) {
    throw new Error(`missing_or_empty:${name}`);
  }
  return readFileSync(path, "utf8");
}

const readme = requireFile("README.md");
const tokens = requireFile("design-tokens.css");
const contentRaw = requireFile("site-content.json");
const upgradesRaw = requireFile("upgrade-slots.json");
const checklist = requireFile("public-release-checklist.md");
const manifestRaw = requireFile("migration-manifest.json");

const content = JSON.parse(contentRaw) as Record<string, unknown>;
const upgrades = JSON.parse(upgradesRaw) as {
  slots?: Array<{ id?: string; status?: string }>;
};
const manifest = JSON.parse(manifestRaw) as {
  runtimeImpact?: string;
  routeChanges?: unknown[];
  sourceChanges?: unknown[];
  forbiddenInThisPR?: string[];
};

for (const marker of [
  "VOID Public Gateway Foundation v1",
  "additive, non-runtime foundation",
]) {
  if (!readme.includes(marker)) {
    throw new Error(`readme_marker_missing:${marker}`);
  }
}

for (const token of [
  "--bg:",
  "--panel:",
  "--line:",
  "--text:",
  "--cyan:",
  "--violet:",
  "--green:",
  "--amber:",
  "--red:",
]) {
  if (!tokens.includes(token)) {
    throw new Error(`design_token_missing:${token}`);
  }
}

for (const key of [
  "hero",
  "principles",
  "howItWorks",
  "tokenomics",
  "roadmap",
  "faq",
  "boundaries",
]) {
  if (!(key in content)) {
    throw new Error(`content_key_missing:${key}`);
  }
}

const slots = upgrades.slots;
if (!Array.isArray(slots) || slots.length === 0) {
  throw new Error("upgrade_slots_missing");
}

const allowedStatuses = new Set(["disabled", "preview", "planned", "active"]);
const seen = new Set<string>();

for (const slot of slots) {
  const id = String(slot.id || "");
  const status = String(slot.status || "");

  if (!id) {
    throw new Error("upgrade_slot_id_missing");
  }
  if (seen.has(id)) {
    throw new Error(`upgrade_slot_duplicate:${id}`);
  }
  if (!allowedStatuses.has(status)) {
    throw new Error(`upgrade_slot_status_invalid:${id}:${status}`);
  }
  seen.add(id);
}

if (manifest.runtimeImpact !== "none") {
  throw new Error("runtime_impact_must_be_none");
}
if (!Array.isArray(manifest.routeChanges) || manifest.routeChanges.length !== 0) {
  throw new Error("route_changes_must_be_empty");
}
if (!Array.isArray(manifest.sourceChanges) || manifest.sourceChanges.length !== 0) {
  throw new Error("source_changes_must_be_empty");
}
if (!Array.isArray(manifest.forbiddenInThisPR) || manifest.forbiddenInThisPR.length < 5) {
  throw new Error("forbidden_boundary_missing");
}

for (const marker of [
  "Exact GET proxy allowlist reviewed",
  "POST, PUT, PATCH, and DELETE rejected",
  "Keyboard navigation works",
]) {
  if (!checklist.includes(marker)) {
    throw new Error(`release_checklist_marker_missing:${marker}`);
  }
}

console.log("VOID_PUBLIC_GATEWAY_FOUNDATION_V1_GREEN");
