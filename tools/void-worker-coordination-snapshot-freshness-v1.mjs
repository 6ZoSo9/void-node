#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  loadCoordinationFiles,
  validateCoordinationV3,
} from "./void-worker-coordination-v3.mjs";

export const MARKER = "VOID_WORKER_COORDINATION_SNAPSHOT_FRESHNESS_V1";
export const OUTCOME_MAIN_ANCHOR_MATCH = "MAIN_ANCHOR_MATCH_POINT_IN_TIME";
export const OUTCOME_STALE = "STALE_SNAPSHOT_LIVE_REFRESH_REQUIRED";

const SHA_PATTERN = /^[0-9a-f]{40}$/;
const LIVE_FACTS_REQUIRED = Object.freeze([
  "current_main",
  "canonical_pr_state_head_base",
  "changed_paths",
  "reviews_checks",
  "tracking_issue_state",
  "recent_writes",
  "v1_collision_evidence",
]);

export class CoordinationSnapshotFreshnessError extends Error {
  constructor(message) {
    super(message);
    this.name = "CoordinationSnapshotFreshnessError";
  }
}

function fail(message) {
  throw new CoordinationSnapshotFreshnessError(message);
}

function requireSha(value, label) {
  if (typeof value !== "string" || !SHA_PATTERN.test(value)) {
    fail(`${label} must be a lowercase 40-character SHA-1`);
  }
  return value;
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export function assessCoordinationSnapshotFreshnessV1(roster, state, observedMainShaInput) {
  const base = validateCoordinationV3(roster, state);
  const observedMainSha = requireSha(observedMainShaInput, "observed main SHA");
  const mainAnchorMatches = state.main_sha === observedMainSha;

  const canonicalPrRereads = state.lanes
    .filter((lane) => lane.canonical_pr !== null)
    .map((lane) => ({
      lane_id: lane.id,
      canonical_pr: lane.canonical_pr,
      snapshot_state: lane.state,
    }))
    .sort((a, b) => a.canonical_pr - b.canonical_pr || a.lane_id.localeCompare(b.lane_id));

  const trackingIssues = [...new Set(state.lanes.flatMap((lane) => lane.tracking_issues))]
    .sort((a, b) => a - b);

  return deepFreeze({
    marker: MARKER,
    version: 1,
    outcome: mainAnchorMatches ? OUTCOME_MAIN_ANCHOR_MATCH : OUTCOME_STALE,
    repository: base.repository,
    snapshot: {
      main_sha: state.main_sha,
      updated_at: state.updated_at,
      plan_issue: state.plan_issue,
      lifecycle_scope: "point_in_time_only",
    },
    observed_main_sha: observedMainSha,
    main_anchor_matches: mainAnchorMatches,
    main_refresh_required: !mainAnchorMatches,
    live_refresh_required_before_mutation: true,
    live_facts_required_before_mutation: [...LIVE_FACTS_REQUIRED],
    canonical_prs_requiring_live_reread: canonicalPrRereads,
    tracking_issues_requiring_live_reread: trackingIssues,
    snapshot_lane_count: base.lane_count,
    snapshot_worker_count: base.worker_count,
    source_mutation_authorized: false,
    runtime_mutation_authorized: false,
    merge_authority_granted: false,
    deployment_authority_granted: false,
    authority_granted: false,
  });
}

function parseArgs(argv) {
  const args = {
    rosterPath: "ops/coordination/worker-roster-v1.json",
    statePath: "ops/coordination/worker-coordination-state-v3.json",
    observedMainSha: "",
    outputPath: null,
  };
  const remaining = [...argv];
  while (remaining.length > 0) {
    const flag = remaining.shift();
    const value = remaining.shift();
    if (!value || value.startsWith("--")) fail(`missing value for ${flag}`);
    if (flag === "--roster") args.rosterPath = value;
    else if (flag === "--state") args.statePath = value;
    else if (flag === "--observed-main-sha") args.observedMainSha = value;
    else if (flag === "--output") args.outputPath = value;
    else fail(`unknown argument: ${flag}`);
  }
  requireSha(args.observedMainSha, "--observed-main-sha");
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { roster, state } = await loadCoordinationFiles({
    rosterPath: path.resolve(args.rosterPath),
    statePath: path.resolve(args.statePath),
  });
  const result = assessCoordinationSnapshotFreshnessV1(roster, state, args.observedMainSha);
  const output = `${JSON.stringify(result, null, 2)}\n`;
  if (args.outputPath) {
    await writeFile(path.resolve(args.outputPath), output, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
  }
  process.stdout.write(output);
  if (!result.main_anchor_matches) process.exitCode = 3;
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (invokedDirectly) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${MARKER}=HOLD\n${message}\n`);
    process.exitCode = 2;
  });
}
