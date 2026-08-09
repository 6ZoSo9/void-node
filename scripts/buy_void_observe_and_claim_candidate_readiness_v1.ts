import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  summarizeBuyVoidObserveAndClaimCandidateReadinessV1,
  type BuyVoidObserveAndClaimCandidateRecordV1,
} from "../src/economic/buy_void_observe_and_claim_candidate_readiness_v1.js";

type ParsedArgs = {
  output: string | null;
  requireExactOne: boolean;
  repoRoot: string;
  runtimeRoot: string | null;
};

type RuntimeRootResolutionV1 = {
  root_dir: string | null;
  source:
    | "cli_runtime_root"
    | "VOID_BUY_VOID_RUNTIME_DIR"
    | "DATA_DIR"
    | "VOID_DATA_DIR"
    | "unique_repo_runtime_root"
    | "not_required_no_canonical_requests";
};

function parseArgs(argv: string[]): ParsedArgs {
  let output: string | null = null;
  let requireExactOne = false;
  let repoRoot = process.cwd();
  let runtimeRoot: string | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--output") {
      const next = argv[index + 1];
      if (!next) {
        throw new Error("--output requires a path");
      }
      output = path.resolve(next);
      index += 1;
      continue;
    }
    if (value === "--repo-root") {
      const next = argv[index + 1];
      if (!next) {
        throw new Error("--repo-root requires a path");
      }
      repoRoot = path.resolve(next);
      index += 1;
      continue;
    }
    if (value === "--runtime-root") {
      const next = argv[index + 1];
      if (!next) {
        throw new Error("--runtime-root requires a path");
      }
      runtimeRoot = next;
      index += 1;
      continue;
    }
    if (value === "--require-exact-one") {
      requireExactOne = true;
      continue;
    }
    if (value === "--help" || value === "-h") {
      console.log(
        [
          "Usage:",
          "  npx tsx scripts/buy_void_observe_and_claim_candidate_readiness_v1.ts [options]",
          "",
          "Options:",
          "  --repo-root PATH       Repository root containing .runtime request records",
          "  --runtime-root PATH    Exact Buy VOID runtime-integration journal root",
          "  --output PATH          Write the JSON report to an operator-selected file",
          "  --require-exact-one    Exit 3 for no candidate or 4 for multiple candidates",
          "  --help                 Show this help",
        ].join("\n"),
      );
      process.exit(0);
    }
    throw new Error(`unknown argument: ${value}`);
  }

  return {
    output,
    requireExactOne,
    repoRoot,
    runtimeRoot,
  };
}

function resolveAgainstRepo(
  repoRoot: string,
  configured: string,
): string {
  return path.isAbsolute(configured)
    ? path.normalize(configured)
    : path.resolve(repoRoot, configured);
}

function dataRuntimeRoot(
  repoRoot: string,
  configuredDataDir: string,
): string {
  const dataDir = resolveAgainstRepo(repoRoot, configuredDataDir);
  return path.join(dataDir, "buy_void_v1", "runtime-integration-v1");
}

function discoverRepoRuntimeRoots(repoRoot: string): string[] {
  if (!fs.existsSync(repoRoot)) return [];

  const roots: string[] = [];
  for (const entry of fs.readdirSync(repoRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(
      repoRoot,
      entry.name,
      "buy_void_v1",
      "runtime-integration-v1",
    );
    try {
      const stat = fs.lstatSync(candidate);
      if (stat.isDirectory() && !stat.isSymbolicLink()) {
        roots.push(path.resolve(candidate));
      }
    } catch {
      // Missing candidate directories are not runtime roots.
    }
  }
  return roots.sort();
}

function resolveRuntimeRootV1(input: {
  repoRoot: string;
  runtimeRoot: string | null;
  canonicalRequestCount: number;
}): RuntimeRootResolutionV1 {
  const cliRoot = String(input.runtimeRoot || "").trim();
  if (cliRoot) {
    return {
      root_dir: resolveAgainstRepo(input.repoRoot, cliRoot),
      source: "cli_runtime_root",
    };
  }

  const runtimeEnv = String(
    process.env.VOID_BUY_VOID_RUNTIME_DIR || "",
  ).trim();
  if (runtimeEnv) {
    return {
      root_dir: resolveAgainstRepo(input.repoRoot, runtimeEnv),
      source: "VOID_BUY_VOID_RUNTIME_DIR",
    };
  }

  const dataDirEnv = String(process.env.DATA_DIR || "").trim();
  if (dataDirEnv) {
    return {
      root_dir: dataRuntimeRoot(input.repoRoot, dataDirEnv),
      source: "DATA_DIR",
    };
  }

  const voidDataDirEnv = String(process.env.VOID_DATA_DIR || "").trim();
  if (voidDataDirEnv) {
    return {
      root_dir: dataRuntimeRoot(input.repoRoot, voidDataDirEnv),
      source: "VOID_DATA_DIR",
    };
  }

  if (input.canonicalRequestCount === 0) {
    return {
      root_dir: null,
      source: "not_required_no_canonical_requests",
    };
  }

  const discovered = discoverRepoRuntimeRoots(input.repoRoot);
  if (discovered.length === 1) {
    return {
      root_dir: discovered[0],
      source: "unique_repo_runtime_root",
    };
  }
  if (discovered.length === 0) {
    throw new Error("runtime_root_authority_required");
  }
  throw new Error(`runtime_root_ambiguous:${discovered.length}`);
}

function walkJsonFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const values: string[] = [];
  for (const entry of fs.readdirSync(directory, {
    withFileTypes: true,
  })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      values.push(...walkJsonFiles(absolute));
      continue;
    }
    if (
      entry.isFile()
      && entry.name.toLowerCase().endsWith(".json")
    ) {
      values.push(absolute);
    }
  }
  return values.sort();
}

function safeReason(
  decision: Record<string, unknown>,
): string | null {
  const reason = String(decision.reason || "").trim();
  return reason || null;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const sourceRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );

  const snapshotModule = await import(
    pathToFileURL(
      path.join(
        sourceRoot,
        "src/economic/"
          + "buy_void_bounded_orchestrator_server_snapshot_v1.ts",
      ),
    ).href
  );
  const orchestratorModule = await import(
    pathToFileURL(
      path.join(
        sourceRoot,
        "src/economic/"
          + "buy_void_bounded_auto_fulfillment_orchestrator_v1.ts",
      ),
    ).href
  );
  const activationModule = await import(
    pathToFileURL(
      path.join(
        sourceRoot,
        "src/economic/"
          + "buy_void_bounded_orchestrator_apply_activation_gate_v1.ts",
      ),
    ).href
  );

  const requestDir = path.join(
    args.repoRoot,
    ".runtime",
    "public-buy-void-requests-v1",
  );

  const requestIds = new Set<string>();
  const operatorEventRequestIds = new Set<string>();
  const parseFailures: string[] = [];
  const requestFiles = walkJsonFiles(requestDir);
  let canonicalRequestJsonFileCount = 0;
  let operatorEventJsonFileCount = 0;
  let ignoredNoncanonicalJsonFileCount = 0;

  for (const file of requestFiles) {
    const relative = path.relative(requestDir, file);
    try {
      const value = JSON.parse(
        fs.readFileSync(file, "utf8"),
      ) as Record<string, unknown>;
      const requestId = String(
        value.request_id || "",
      ).trim();

      if (!/^[A-Za-z0-9._:-]{3,160}$/.test(requestId)) {
        ignoredNoncanonicalJsonFileCount += 1;
        continue;
      }

      const basename = path.basename(file);
      if (basename === `${requestId}.json`) {
        requestIds.add(requestId);
        canonicalRequestJsonFileCount += 1;
        continue;
      }

      if (
        basename.startsWith(`operator-event-${requestId}-`)
        && basename.endsWith(".json")
      ) {
        operatorEventRequestIds.add(requestId);
        operatorEventJsonFileCount += 1;
        continue;
      }

      ignoredNoncanonicalJsonFileCount += 1;
    } catch {
      parseFailures.push(relative);
    }
  }

  const runtimeRoot = resolveRuntimeRootV1({
    repoRoot: args.repoRoot,
    runtimeRoot: args.runtimeRoot,
    canonicalRequestCount: requestIds.size,
  });
  const rootDir = runtimeRoot.root_dir;

  const orphanOperatorEventRequestIds =
    [...operatorEventRequestIds]
      .filter((requestId) => !requestIds.has(requestId))
      .sort();

  const records: BuyVoidObserveAndClaimCandidateRecordV1[] = [];

  for (const requestId of [...requestIds].sort()) {
    if (!rootDir) {
      throw new Error("runtime_root_authority_required");
    }

    const derived =
      snapshotModule
        .deriveBuyVoidBoundedOrchestratorServerSnapshotV1({
          root_dir: rootDir,
          request_dir: requestDir,
          request_id: requestId,
        });

    if (derived.status === "held") {
      records.push({
        request_id: requestId,
        public_status: null,
        claim_status: null,
        attempt_status: null,
        broadcast_status: null,
        orchestrator_status: "not_run",
        orchestrator_reason: null,
        selected_stage: null,
        activation_status: "not_run",
        activation_reason: String(
          derived.reason || "server_snapshot_held",
        ),
        plan_fingerprint_sha256: null,
        required_orchestrator_confirmation: null,
        required_delegated_confirmation: null,
        required_stage_confirmation: null,
        eligible_observe_and_claim: false,
        wallet_access_authorized: false,
        signing_authorized: false,
        transaction_broadcast_authorized: false,
        money_movement_authorized: false,
      });
      continue;
    }

    const stageCommand = {
      action: "verify_and_claim",
      request_id: requestId,
    };

    const decision =
      await orchestratorModule
        .runBuyVoidBoundedAutoFulfillmentOrchestratorV1({
          root_dir: rootDir,
          request_dir: requestDir,
          snapshot: derived.snapshot,
          stage_command: stageCommand,
          apply: false,
        });

    const activation =
      activationModule
        .evaluateBuyVoidBoundedOrchestratorApplyActivationV1({
          policy:
            activationModule
              .VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ACTIVATION_DEFAULT_POLICY_V1,
          request_id: requestId,
          derived_snapshot: derived.snapshot,
          snapshot_evidence: derived.evidence,
          dry_run_decision: decision,
          stage_command: stageCommand,
          apply: false,
        });

    const selectedStage =
      decision.status === "dry_run"
        ? String(decision.selected_stage || "")
        : null;
    const plan =
      activation.status === "planned"
        ? activation.plan
        : null;

    const publicStatus =
      String(derived.snapshot.public_status || "") || null;

    const eligible =
      publicStatus === "payment_verified"
      && decision.status === "dry_run"
      && selectedStage === "observe_and_claim"
      && activation.status === "planned"
      && plan?.selected_stage === "observe_and_claim";

    records.push({
      request_id: requestId,
      public_status: publicStatus,
      claim_status:
        String(derived.snapshot.claim_status || "") || null,
      attempt_status:
        String(derived.snapshot.attempt_status || "") || null,
      broadcast_status:
        String(derived.snapshot.broadcast_status || "") || null,
      orchestrator_status: String(decision.status),
      orchestrator_reason:
        decision.status === "held"
          ? safeReason(decision as Record<string, unknown>)
          : null,
      selected_stage: selectedStage,
      activation_status: String(activation.status),
      activation_reason:
        activation.status === "held"
          ? safeReason(activation as Record<string, unknown>)
          : null,
      plan_fingerprint_sha256:
        String(plan?.plan_fingerprint_sha256 || "") || null,
      required_orchestrator_confirmation:
        String(
          plan?.required_orchestrator_confirmation || "",
        ) || null,
      required_delegated_confirmation:
        String(
          plan?.required_delegated_confirmation || "",
        ) || null,
      required_stage_confirmation:
        String(plan?.required_stage_confirmation || "")
        || null,
      eligible_observe_and_claim: eligible,
      wallet_access_authorized:
        plan?.wallet_access_authorized === true,
      signing_authorized:
        plan?.signing_authorized === true,
      transaction_broadcast_authorized:
        plan?.transaction_broadcast_authorized === true,
      money_movement_authorized:
        plan?.money_movement_authorized === true,
    });
  }

  const summary =
    summarizeBuyVoidObserveAndClaimCandidateReadinessV1(
      records,
    );

  const payload = {
    ...summary,
    repository_root: args.repoRoot,
    request_directory: requestDir,
    runtime_root: rootDir,
    runtime_root_source: runtimeRoot.source,
    request_json_file_count: requestFiles.length,
    canonical_request_json_file_count:
      canonicalRequestJsonFileCount,
    operator_event_json_file_count:
      operatorEventJsonFileCount,
    ignored_noncanonical_json_file_count:
      ignoredNoncanonicalJsonFileCount,
    request_id_count: requestIds.size,
    orphan_operator_event_request_id_count:
      orphanOperatorEventRequestIds.length,
    orphan_operator_event_request_ids:
      orphanOperatorEventRequestIds,
    parse_failure_count: parseFailures.length,
    parse_failures: parseFailures.sort(),
    generated_at: new Date().toISOString(),
    activation_performed: false,
    runtime_mutation_performed: false,
  };

  const rendered = JSON.stringify(payload, null, 2) + "\n";

  if (args.output) {
    fs.mkdirSync(path.dirname(args.output), {
      recursive: true,
      mode: 0o700,
    });
    fs.writeFileSync(args.output, rendered, {
      mode: 0o600,
    });
    console.log(`report=${args.output}`);
  } else {
    process.stdout.write(rendered);
  }

  console.log(
    `readiness_status=${summary.readiness_status}`,
  );
  console.log(
    `eligible_candidate_count=${summary.eligible_candidate_count}`,
  );
  console.log(
    "recommended_request_id="
      + (summary.recommended_request_id || "none"),
  );
  console.log(
    "orphan_operator_event_request_id_count="
      + orphanOperatorEventRequestIds.length,
  );
  console.log(`runtime_root_source=${runtimeRoot.source}`);
  console.log("activation_performed=false");
  console.log("runtime_mutation_performed=false");
  console.log("money_movement=false");

  if (args.requireExactOne) {
    if (summary.readiness_status === "none") {
      process.exitCode = 3;
    } else if (summary.readiness_status === "multiple") {
      process.exitCode = 4;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 2;
});
