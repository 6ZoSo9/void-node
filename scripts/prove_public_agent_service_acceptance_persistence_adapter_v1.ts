import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_ADAPTER_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_CONFIRMATION,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_REQUEST_MARKER,
  canonicalJsonV1,
  inspectPublicAgentServiceAcceptancePersistenceStoreV1,
  persistVerifiedPublicAgentServiceAcceptanceV1,
  validateVerifiedAcceptanceReplayConsumerPacketV1,
  type PublicAgentServiceAcceptancePersistenceConfigV1,
  type PublicAgentServiceAcceptancePersistenceRequestV1,
} from "./public_agent_service_acceptance_persistence_adapter_v1.js";

const SOURCE_PACK_SHA256 =
  "4c9c495e74d12aa8b07383ee5af55694773f03d654385f9f6296aef5c5d853ec";
const SOURCE_COMMIT =
  "182228a1a9c4b31ec5ce9dc4b0fa1383938913df";
const SEALED_MERGE_COMMIT =
  "525e1c8f6200f1a590de42270d5a08ad21c6281b";
const SEALED_CHECKPOINT_TAG =
  "ckpt-public-agent-service-acceptance-materialization-replay-consumer-v1-pr800-post-merge-exact-green-525e1c8f6200";
const EMPTY_STATE_ID =
  "voidawrs1_09fcfb20aa71c21c83beddec7ca3965d2bcd98d13c08d9f0e70842e0f255d678";

function fail(message: string): never {
  throw new Error(message);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) fail(message);
}

function sha256Hex(value: string | Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readText(relative: string): string {
  const resolved = path.resolve(relative);
  const stat = fs.lstatSync(resolved);
  assertCondition(!stat.isSymbolicLink(), `symlink forbidden: ${relative}`);
  assertCondition(stat.isFile(), `regular file required: ${relative}`);
  return fs.readFileSync(resolved, "utf8");
}

function readJson(relative: string): unknown {
  return JSON.parse(readText(relative)) as unknown;
}

function expectReject(
  label: string,
  action: () => unknown,
  expectedFragment?: string,
): void {
  let rejected = false;
  try {
    action();
  } catch (error) {
    rejected = true;
    if (expectedFragment) {
      assertCondition(
        error instanceof Error && error.message.includes(expectedFragment),
        `${label} rejection did not include ${expectedFragment}`,
      );
    }
  }
  assertCondition(rejected, `${label} was not rejected`);
}

function replayStateId(draft: Record<string, unknown>): string {
  return `voidawrs1_${sha256Hex(canonicalJsonV1(draft))}`;
}

function acceptanceId(envelope: Record<string, unknown>): string {
  const draft = { ...envelope };
  delete draft.acceptance_id;
  return `voidawa1_${sha256Hex(canonicalJsonV1(draft))}`;
}

function transactionId(draft: Record<string, unknown>): string {
  return `voidawact1_${sha256Hex(canonicalJsonV1(draft))}`;
}

function planId(
  requesterAuthenticationId: string,
  providerAuthenticationId: string,
  acceptanceIdValue: string,
  beforeStateId: string,
  beforeRevision: number,
): string {
  return `voidawacp1_${sha256Hex(canonicalJsonV1({
    marker:
      "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_PLAN_V1",
    version: 1,
    mode: "external_requester_evidence",
    requester_authentication_id: requesterAuthenticationId,
    provider_authentication_id: providerAuthenticationId,
    acceptance_id: acceptanceIdValue,
    replay_state_id: beforeStateId,
    expected_state_revision: beforeRevision,
  }))}`;
}

function emptyState(): Record<string, unknown> {
  const draft = {
    marker: "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_STATE_V1",
    version: 1,
    revision: 0,
    consumed_requester_authentication_ids: [],
    consumed_provider_authentication_ids: [],
    consumed_acceptance_ids: [],
    active_acceptance_by_quote: {},
  };
  return { ...draft, state_id: replayStateId(draft) };
}

function makePacket(
  seed: string,
  beforeStateValue: Record<string, unknown>,
  quoteIdValue?: string,
  allowActiveConflict = false,
): Record<string, unknown> {
  const requesterAuthenticationId =
    `voidawra1_${sha256Hex(`requester:${seed}`)}`;
  const providerAuthenticationId =
    `voidawqa1_${sha256Hex(`provider:${seed}`)}`;
  const quoteId = quoteIdValue
    ?? `voidawq1_${sha256Hex(`quote:${seed}`)}`;
  const workOrderId =
    `voidawo1_${sha256Hex(`work-order:${seed}`)}`;
  const requesterAgentId = `agent.persistence.${seed}`;
  const providerId = `void.provider.persistence.${seed}`;
  const acceptanceNonce = `acceptance-persistence-proof-${seed}-0001`;
  const acceptanceDraft: Record<string, unknown> = {
    marker: "VOID_AGENT_PAID_WORK_ACCEPTANCE_ENVELOPE_V1",
    version: 1,
    work_order_id: workOrderId,
    quote_id: quoteId,
    created_at_utc: "2030-01-01T00:07:00Z",
    expires_at_utc: "2030-01-01T19:00:00Z",
    requester: { agent_id: requesterAgentId },
    provider: {
      provider_id: providerId,
      capability_id: "datanet.fetch_verify",
    },
    commercial: {
      quote_asset: "USD",
      total: "3.50",
      payment_rail_id: "void.external.prepaid.v1",
    },
    terms: {
      quote_terms_accepted: true,
      requester_authentication_required: true,
      provider_authentication_required: true,
      separate_payment_authorization_required: true,
      separate_execution_authorization_required: true,
      acceptance_is_not_payment_instruction: true,
      acceptance_is_not_execution_instruction: true,
      acceptance_replay_protection_required: true,
      single_active_acceptance_per_quote_required: true,
      acceptance_is_not_funds_reservation: true,
      payment_authorization_granted: false,
      execution_authorization_granted: false,
    },
    nonce: acceptanceNonce,
  };
  const acceptanceIdValue = acceptanceId(acceptanceDraft);
  const acceptance = {
    ...acceptanceDraft,
    acceptance_id: acceptanceIdValue,
  };

  const beforeState = JSON.parse(JSON.stringify(beforeStateValue)) as Record<string, unknown>;
  const beforeRequester = beforeState.consumed_requester_authentication_ids as string[];
  const beforeProvider = beforeState.consumed_provider_authentication_ids as string[];
  const beforeAcceptance = beforeState.consumed_acceptance_ids as string[];
  const beforeActive = beforeState.active_acceptance_by_quote as Record<string, string>;
  if (!allowActiveConflict) {
    assertCondition(beforeActive[quoteId] === undefined, "proof packet quote already active");
  }
  const nextDraft = {
    marker: "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_STATE_V1",
    version: 1,
    revision: (beforeState.revision as number) + 1,
    consumed_requester_authentication_ids:
      [...beforeRequester, requesterAuthenticationId].sort(),
    consumed_provider_authentication_ids:
      [...beforeProvider, providerAuthenticationId].sort(),
    consumed_acceptance_ids:
      [...beforeAcceptance, acceptanceIdValue].sort(),
    active_acceptance_by_quote: Object.fromEntries(
      Object.entries({
        ...beforeActive,
        [quoteId]: acceptanceIdValue,
      }).sort(([left], [right]) => left.localeCompare(right)),
    ),
  };
  const nextState = {
    ...nextDraft,
    state_id: replayStateId(nextDraft),
  };
  const transactionDraft = {
    marker: "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_TRANSACTION_V1",
    version: 1,
    before_state_id: beforeState.state_id,
    after_state_id: nextState.state_id,
    before_revision: beforeState.revision,
    after_revision: nextState.revision,
    requester_authentication_id: requesterAuthenticationId,
    provider_authentication_id: providerAuthenticationId,
    acceptance_id: acceptanceIdValue,
    quote_id: quoteId,
    work_order_id: workOrderId,
    requester_agent_id: requesterAgentId,
    atomic_consumption_count: 3,
    requester_authentication_consumed: true,
    provider_authentication_consumed: true,
    acceptance_id_consumed: true,
    single_active_acceptance_per_quote_enforced: true,
  };
  const transaction = {
    ...transactionDraft,
    transaction_id: transactionId(transactionDraft),
  };
  const authority = {
    acceptance_persistence: false,
    quote_acceptance: false,
    requester_authentication_replay_write: false,
    provider_authentication_replay_write: false,
    acceptance_replay_write: false,
    payment_authorization: false,
    payment_execution: false,
    execution_authorization: false,
    work_dispatch: false,
    credential_issue: false,
    credential_change: false,
    provider_selection: false,
    requester_key_registry_write: false,
    provider_key_registry_write: false,
    wallet_access: false,
    production_signing: false,
    transaction_broadcast: false,
    work_credit_write: false,
    http_submission: false,
    runtime_mutation: false,
    money_movement: false,
  };
  return {
    marker:
      "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_CONSUMER_PACKET_V1",
    version: 1,
    plan_id: planId(
      requesterAuthenticationId,
      providerAuthenticationId,
      acceptanceIdValue,
      beforeState.state_id as string,
      beforeState.revision as number,
    ),
    status: "acceptance_materialization_planned",
    source_evidence: {
      source_pack_sha256: SOURCE_PACK_SHA256,
      source_commit: SOURCE_COMMIT,
      diagnostic_correction:
        "acceptance_specific_persistent_replay_consumer_not_found",
      canonical_acceptance_materializer_verified: true,
      declarative_replay_requirements_verified: true,
      production_persistence_consumer_verified: false,
    },
    source: {
      requester_authentication_id: requesterAuthenticationId,
      provider_authentication_id: providerAuthenticationId,
      handoff_id: `voidawah1_${sha256Hex(`handoff:${seed}`)}`,
      quote_id: quoteId,
      work_order_id: workOrderId,
      requester_agent_id: requesterAgentId,
      provider_id: providerId,
      acceptance_nonce: acceptanceNonce,
    },
    acceptance: {
      preview_acceptance_id: acceptanceIdValue,
      acceptance_id: acceptanceIdValue,
      acceptance_materialized_in_memory: true,
      acceptance_created_in_durable_state: false,
      acceptance_envelope: acceptance,
    },
    replay: {
      before_state: beforeState,
      next_state: nextState,
      transaction,
      requester_authentication_replay_checked: true,
      provider_authentication_replay_checked: true,
      acceptance_replay_checked: true,
      single_active_acceptance_per_quote_checked: true,
      expected_revision_checked: true,
      all_or_nothing_transition_verified: true,
      production_persistence_consumer_verified: false,
    },
    authority,
  };
}

function configFor(
  root: string,
  maxGenerationCount = 32,
): PublicAgentServiceAcceptancePersistenceConfigV1 {
  return {
    marker: PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_ADAPTER_MARKER,
    version: 1,
    allowed_root: root,
    max_pointer_bytes: 64 * 1024,
    max_generation_file_bytes: 4 * 1024 * 1024,
    max_generation_count: maxGenerationCount,
    recover_exact_orphaned_generation: true,
  };
}

function request(
  timestamp: string,
  confirmation = PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_CONFIRMATION,
): PublicAgentServiceAcceptancePersistenceRequestV1 {
  return {
    marker: PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_REQUEST_MARKER,
    version: 1,
    recorded_at_utc: timestamp,
    confirmation,
  };
}

function assertFileMode(
  file: string,
  expected: number,
): void {
  assertCondition(
    (fs.lstatSync(file).mode & 0o777) === expected,
    `${file} mode changed`,
  );
}

async function main(): Promise<void> {
  const examplePath =
    "examples/public-agent-service-acceptance-persistence-adapter-v1.example.json";
  const schemaPath =
    "schemas/public-agent-service-acceptance-persistence-adapter-v1.schema.json";
  const docsPath =
    "docs/public-agent/public-agent-service-acceptance-persistence-adapter-v1.md";
  const adapterPath =
    "scripts/public_agent_service_acceptance_persistence_adapter_v1.ts";
  const workflowPath =
    ".github/workflows/public-agent-service-acceptance-persistence-adapter-v1.yml";

  const example = readJson(examplePath) as Record<string, unknown>;
  const schema = readJson(schemaPath) as Record<string, unknown>;
  const docs = readText(docsPath).replace(/\s+/g, " ");
  const adapterSource = readText(adapterPath);
  const workflow = readText(workflowPath);

  assertCondition(example.marker === PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_ADAPTER_MARKER, "example marker changed");
  assertCondition(example.example_only === true, "example is not explicitly non-authoritative");
  assertCondition(schema.$id === "https://void.network/schemas/public-agent-service-acceptance-persistence-adapter-v1.schema.json", "schema ID changed");
  for (const marker of [
    SOURCE_PACK_SHA256,
    SEALED_MERGE_COMMIT,
    SEALED_CHECKPOINT_TAG,
    "immutable generation",
    "atomic current pointer",
    "persistVerifiedAcceptanceReplayTransitionV1",
    "payment authorization remains false",
    "work dispatch remains false",
  ]) {
    assertCondition(docs.toLowerCase().includes(marker.toLowerCase()), `documentation boundary missing: ${marker}`);
  }
  for (const forbidden of [
    "node:http",
    "node:https",
    "node:net",
    "node:tls",
    "child_process",
    "fetch(",
  ]) {
    assertCondition(!adapterSource.includes(forbidden), `adapter gained forbidden dependency: ${forbidden}`);
  }
  assertCondition(workflow.includes("prove_public_agent_service_acceptance_persistence_adapter_v1.ts"), "workflow proof target changed");

  const initial = emptyState();
  assertCondition(initial.state_id === EMPTY_STATE_ID, "empty replay state ID changed");
  const packet1 = makePacket("alpha", initial);
  const verified1 = validateVerifiedAcceptanceReplayConsumerPacketV1(packet1);
  const packet2 = makePacket("beta", verified1.nextState as unknown as Record<string, unknown>);
  const verified2 = validateVerifiedAcceptanceReplayConsumerPacketV1(packet2);

  const temporaryParents: string[] = [];
  const temporaryRoot = (): string => {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), "void-acceptance-persistence-proof-"));
    fs.chmodSync(parent, 0o700);
    const root = path.join(parent, "store");
    fs.mkdirSync(root, { mode: 0o700 });
    temporaryParents.push(parent);
    return root;
  };

  try {
    const nonexistent = path.join(os.tmpdir(), `void-nonexistent-${crypto.randomUUID()}`);
    expectReject(
      "missing confirmation before filesystem access",
      () => persistVerifiedPublicAgentServiceAcceptanceV1(
        configFor(nonexistent),
        request("2030-01-01T00:10:00Z", "notProvided"),
        () => { throw new Error("packet provider must not run before confirmation"); },
      ),
      "confirmation must be",
    );

    const root = temporaryRoot();
    const config = configFor(root);
    const first = persistVerifiedPublicAgentServiceAcceptanceV1(
      config,
      request("2030-01-01T00:10:00Z"),
      () => packet1,
    );
    assertCondition(first.status === "committed", "first transition was not committed");
    assertCondition(first.before_revision === 0 && first.after_revision === 1, "first revision transition changed");
    assertCondition(first.atomic_consumption_count === 3, "first transition did not consume three identities");
    assertCondition(first.authority.acceptance_persistence === true, "persistence authority was not explicit");
    assertCondition(first.authority.quote_acceptance_recorded === true, "quote acceptance was not recorded");
    assertCondition(first.authority.payment_authorization === false, "payment authorization was granted");
    assertCondition(first.authority.execution_authorization === false, "execution authorization was granted");
    assertCondition(first.authority.work_dispatch === false, "work dispatch was granted");

    const afterFirst = inspectPublicAgentServiceAcceptancePersistenceStoreV1(config);
    assertCondition(afterFirst.current?.replayState.revision === 1, "first current revision changed");
    assertCondition(afterFirst.current?.acceptance.acceptance_id === verified1.acceptance.acceptance_id, "first acceptance was not persisted");

    const second = persistVerifiedPublicAgentServiceAcceptanceV1(
      config,
      request("2030-01-01T00:11:00Z"),
      () => packet2,
    );
    assertCondition(second.status === "committed", "second transition was not committed");
    assertCondition(second.before_revision === 1 && second.after_revision === 2, "second revision transition changed");
    assertCondition(second.parent_generation_id === first.generation_id, "generation chain parent changed");

    const duplicate = persistVerifiedPublicAgentServiceAcceptanceV1(
      config,
      request("2030-01-01T00:12:00Z"),
      () => packet2,
    );
    assertCondition(duplicate.status === "duplicate", "exact duplicate was not suppressed");
    assertCondition(duplicate.generation_id === second.generation_id, "duplicate generation changed");
    const afterSecond = inspectPublicAgentServiceAcceptancePersistenceStoreV1(config);
    assertCondition(afterSecond.current?.replayState.revision === 2, "second current revision changed");
    assertCondition(afterSecond.generation_count === 2, "generation count changed after duplicate");

    const currentFile = path.join(root, "current.json");
    assertFileMode(currentFile, 0o600);
    assertCondition(fs.readFileSync(currentFile).at(-1) === 0x0a, "current pointer lacks complete newline");
    assertFileMode(path.join(root, "generations"), 0o700);
    assertFileMode(path.join(root, ".staging"), 0o700);
    for (const filename of ["acceptance.json", "replay-state.json", "transaction.json", "commit.json"]) {
      const file = path.join(root, "generations", second.generation_id, filename);
      assertFileMode(file, 0o600);
      assertCondition(fs.readFileSync(file).at(-1) === 0x0a, `${filename} lacks complete newline`);
    }

    const stalePacket = makePacket("stale", initial);
    expectReject(
      "stale compare-and-swap state",
      () => persistVerifiedPublicAgentServiceAcceptanceV1(
        config,
        request("2030-01-01T00:13:00Z"),
        () => stalePacket,
      ),
      "compare-and-swap before replay state mismatch",
    );

    expectReject(
      "active quote conflict",
      () => validateVerifiedAcceptanceReplayConsumerPacketV1(
        makePacket(
          "active-conflict",
          verified2.nextState as unknown as Record<string, unknown>,
          verified1.acceptance.quote_id,
          true,
        ),
      ),
      "quote already has an active acceptance",
    );

    const lockFile = path.join(root, "acceptance-persistence-v1.lock");
    fs.writeFileSync(lockFile, "{}\n", { mode: 0o600, flag: "wx" });
    expectReject(
      "exclusive lock contention",
      () => persistVerifiedPublicAgentServiceAcceptanceV1(
        config,
        request("2030-01-01T00:14:00Z"),
        () => packet2,
      ),
      "lock_busy",
    );
    fs.unlinkSync(lockFile);

    const recoveryRoot = temporaryRoot();
    const recoveryConfig = configFor(recoveryRoot);
    expectReject(
      "simulated crash after generation publish",
      () => persistVerifiedPublicAgentServiceAcceptanceV1(
        recoveryConfig,
        request("2030-01-01T00:20:00Z"),
        () => packet1,
        {
          after_generation_published: () => {
            throw new Error("simulated_after_generation_publish");
          },
        },
      ),
      "simulated_after_generation_publish",
    );
    const beforeRecovery = inspectPublicAgentServiceAcceptancePersistenceStoreV1(recoveryConfig);
    assertCondition(beforeRecovery.current === null, "orphan generation became visible before pointer publish");
    assertCondition(beforeRecovery.generation_count === 1, "orphan generation was not retained for recovery");
    const recovered = persistVerifiedPublicAgentServiceAcceptanceV1(
      recoveryConfig,
      request("2030-01-01T00:21:00Z"),
      () => packet1,
    );
    assertCondition(recovered.status === "recovered", "exact orphaned generation was not recovered");
    assertCondition(recovered.generation_recovered === true, "recovery receipt changed");

    const tamperRoot = temporaryRoot();
    const tamperConfig = configFor(tamperRoot);
    let tamperGeneration = "";
    expectReject(
      "prepare tampered orphan",
      () => persistVerifiedPublicAgentServiceAcceptanceV1(
        tamperConfig,
        request("2030-01-01T00:30:00Z"),
        () => packet1,
        {
          after_generation_published: (directory) => {
            tamperGeneration = directory;
            throw new Error("simulated_tamper_crash");
          },
        },
      ),
      "simulated_tamper_crash",
    );
    fs.appendFileSync(path.join(tamperGeneration, "acceptance.json"), " ");
    expectReject(
      "tampered orphan recovery",
      () => persistVerifiedPublicAgentServiceAcceptanceV1(
        tamperConfig,
        request("2030-01-01T00:31:00Z"),
        () => packet1,
      ),
      "existing generation acceptance must end in one complete newline",
    );

    const symlinkParent = fs.mkdtempSync(path.join(os.tmpdir(), "void-acceptance-persistence-symlink-"));
    fs.chmodSync(symlinkParent, 0o700);
    temporaryParents.push(symlinkParent);
    const realRoot = path.join(symlinkParent, "real");
    const rootLink = path.join(symlinkParent, "root-link");
    fs.mkdirSync(realRoot, { mode: 0o700 });
    fs.symlinkSync(realRoot, rootLink, "dir");
    expectReject(
      "root symlink",
      () => persistVerifiedPublicAgentServiceAcceptanceV1(
        configFor(rootLink),
        request("2030-01-01T00:40:00Z"),
        () => packet1,
      ),
      "allowed_root must not be a symlink",
    );

    const partialRoot = temporaryRoot();
    fs.mkdirSync(path.join(partialRoot, "generations"), { mode: 0o700 });
    fs.mkdirSync(path.join(partialRoot, ".staging"), { mode: 0o700 });
    fs.writeFileSync(path.join(partialRoot, "current.json"), "{", { mode: 0o600 });
    expectReject(
      "partial current pointer",
      () => persistVerifiedPublicAgentServiceAcceptanceV1(
        configFor(partialRoot),
        request("2030-01-01T00:41:00Z"),
        () => packet1,
      ),
      "current pointer must end in one complete newline",
    );

    const currentSymlinkRoot = temporaryRoot();
    const currentTarget = path.join(currentSymlinkRoot, "target.json");
    fs.writeFileSync(currentTarget, "{}\n", { mode: 0o600 });
    fs.symlinkSync(currentTarget, path.join(currentSymlinkRoot, "current.json"));
    expectReject(
      "current pointer symlink",
      () => persistVerifiedPublicAgentServiceAcceptanceV1(
        configFor(currentSymlinkRoot),
        request("2030-01-01T00:42:00Z"),
        () => packet1,
      ),
      "current pointer must not be a symlink",
    );

    const stagingRoot = temporaryRoot();
    fs.mkdirSync(path.join(stagingRoot, "generations"), { mode: 0o700 });
    fs.mkdirSync(path.join(stagingRoot, ".staging"), { mode: 0o700 });
    fs.mkdirSync(path.join(stagingRoot, ".staging", "unresolved"), { mode: 0o700 });
    expectReject(
      "unresolved staging state",
      () => persistVerifiedPublicAgentServiceAcceptanceV1(
        configFor(stagingRoot),
        request("2030-01-01T00:43:00Z"),
        () => packet1,
      ),
      "unresolved staging directory requires operator review",
    );

    const boundedRoot = temporaryRoot();
    const boundedConfig = configFor(boundedRoot, 1);
    persistVerifiedPublicAgentServiceAcceptanceV1(
      boundedConfig,
      request("2030-01-01T00:50:00Z"),
      () => packet1,
    );
    expectReject(
      "generation-count bound",
      () => persistVerifiedPublicAgentServiceAcceptanceV1(
        boundedConfig,
        request("2030-01-01T00:51:00Z"),
        () => packet2,
      ),
      "generation count reached configured bound",
    );

    const summary = {
      marker:
        "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_ADAPTER_V1_PROOF_GREEN",
      source_pack_sha256: SOURCE_PACK_SHA256,
      source_commit: SOURCE_COMMIT,
      sealed_transition_merge_commit: SEALED_MERGE_COMMIT,
      sealed_transition_checkpoint_tag: SEALED_CHECKPOINT_TAG,
      empty_state_id: EMPTY_STATE_ID,
      first_generation_id: first.generation_id,
      second_generation_id: second.generation_id,
      first_acceptance_id: verified1.acceptance.acceptance_id,
      second_acceptance_id: verified2.acceptance.acceptance_id,
      first_transaction_id: verified1.transaction.transaction_id,
      second_transaction_id: verified2.transaction.transaction_id,
      first_commit_verified: true,
      second_commit_verified: true,
      exact_duplicate_suppressed: true,
      stale_compare_and_swap_rejected: true,
      active_quote_conflict_rejected: true,
      exclusive_lock_contention_rejected: true,
      crash_before_pointer_not_visible: true,
      exact_orphaned_generation_recovered: true,
      tampered_orphan_rejected: true,
      root_symlink_rejected: true,
      current_pointer_symlink_rejected: true,
      partial_pointer_rejected: true,
      unresolved_staging_rejected: true,
      generation_count_bound_enforced: true,
      generation_files_mode_0600: true,
      store_directories_mode_0700: true,
      atomic_current_pointer_verified: true,
      immutable_generation_chain_verified: true,
      temporary_acceptance_persistence_performed: true,
      temporary_requester_authentication_replay_write_performed: true,
      temporary_provider_authentication_replay_write_performed: true,
      temporary_acceptance_replay_write_performed: true,
      production_acceptance_persistence_performed: false,
      production_replay_write_performed: false,
      payment_authorization: false,
      payment_execution: false,
      execution_authorization: false,
      work_dispatch: false,
      production_signing: false,
      http_submission: false,
      runtime_mutation: false,
      service_change: false,
      money_movement: false,
      proof: "green",
    };
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } finally {
    for (const parent of temporaryParents.reverse()) {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  }
}

await main();
