import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  acceptanceReplayStateIdV1,
  planPublicAgentServiceAcceptanceMaterializationReplayConsumerV1,
  verifyPublicAgentServiceAcceptanceMaterializationReplayConsumerV1,
  type AcceptanceReplayStateV1,
} from "./public_agent_service_acceptance_materialization_replay_consumer_v1.js";
import {
  validateAgentPaidWorkOrderEnvelope,
} from "./agent_paid_work_order_envelope_v1.js";
import {
  validateAgentPaidWorkQuoteEnvelope,
} from "./agent_paid_work_quote_envelope_v1.js";
import {
  materializePublicAgentServiceAuthenticatedQuoteAcceptanceHandoffV1,
} from "./public_agent_service_authenticated_quote_acceptance_handoff_v1.js";
import {
  materializePublicAgentServiceProviderQuoteResponseV1,
} from "./public_agent_service_provider_quote_response_v1.js";
import {
  providerKeyBindingIdV1,
  providerQuoteResponseAuthenticationIdV1,
  providerQuoteResponseAuthenticationKeyIdV1,
  providerQuoteResponseAuthenticationSigningBytesV1,
  type ProviderKeyBindingDraftV1,
  type ProviderQuoteResponseAuthenticationBodyV1,
} from "./public_agent_service_provider_quote_response_authentication_v1.js";
import {
  materializePublicAgentServiceRequesterAcceptanceAuthenticationV1,
  requesterAcceptanceAuthenticationIdV1,
  requesterAcceptanceAuthenticationKeyIdV1,
  requesterAcceptanceAuthenticationSigningBytesV1,
  requesterAcceptanceKeyBindingIdV1,
  type RequesterAcceptanceAuthenticationBodyV1,
  type RequesterAcceptanceKeyBindingDraftV1,
} from "./public_agent_service_requester_acceptance_authentication_v1.js";
import {
  canonicalJson,
} from "./agent_paid_work_order_envelope_v1.js";

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
  return Boolean(
    value
      && typeof value === "object"
      && !Array.isArray(value),
  );
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function readJson(relative: string): unknown {
  const resolved = path.resolve(relative);
  const fileStat = fs.lstatSync(resolved);
  assertCondition(
    !fileStat.isSymbolicLink(),
    `symlink forbidden: ${relative}`,
  );
  assertCondition(
    fileStat.isFile(),
    `regular file required: ${relative}`,
  );
  return JSON.parse(
    fs.readFileSync(resolved, "utf8"),
  ) as unknown;
}

function readText(relative: string): string {
  const resolved = path.resolve(relative);
  const fileStat = fs.lstatSync(resolved);
  assertCondition(
    !fileStat.isSymbolicLink(),
    `symlink forbidden: ${relative}`,
  );
  assertCondition(
    fileStat.isFile(),
    `regular file required: ${relative}`,
  );
  return fs.readFileSync(resolved, "utf8");
}

function expectReject(
  label: string,
  action: () => unknown,
): void {
  let rejected = false;
  try {
    action();
  } catch {
    rejected = true;
  }
  assertCondition(
    rejected,
    `${label} was not rejected`,
  );
}

function findWorkOrderEnvelope(
  value: unknown,
  expectedWorkOrderId: string,
  depth = 0,
): unknown | null {
  if (depth > 6) return null;
  if (isRecord(value)) {
    if (
      value.work_order_id === expectedWorkOrderId
      && value.marker
        === "VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1"
    ) {
      try {
        validateAgentPaidWorkOrderEnvelope(value);
        return value;
      } catch {
        // Continue looking for a nested valid envelope.
      }
    }
    for (const child of Object.values(value)) {
      const found = findWorkOrderEnvelope(
        child,
        expectedWorkOrderId,
        depth + 1,
      );
      if (found !== null) return found;
    }
  } else if (Array.isArray(value)) {
    for (const child of value) {
      const found = findWorkOrderEnvelope(
        child,
        expectedWorkOrderId,
        depth + 1,
      );
      if (found !== null) return found;
    }
  }
  return null;
}

async function discoverCanonicalWorkOrder(
  requesterInput: Record<string, unknown>,
  catalog: unknown,
): Promise<unknown> {
  const handoffInput = requesterInput
    .authenticated_quote_acceptance_handoff_input as Record<string, unknown>;
  const providerAuthenticationInput = handoffInput
    .provider_authentication_input as Record<string, unknown>;
  const responseInput = providerAuthenticationInput
    .provider_quote_response_input as Record<string, unknown>;
  const quoteHandoffInput = responseInput
    .quote_handoff_input as Record<string, unknown>;
  const submissionInput = quoteHandoffInput
    .submission_input as Record<string, unknown>;
  const orderRequest = submissionInput
    .order_request as Record<string, unknown>;
  const requesterAuthenticationEnvelope = (
    requesterInput.requester_authentication_envelope
  ) as Record<string, unknown>;
  const expectedWorkOrderId =
    requesterAuthenticationEnvelope.work_order_id as string;

  const scriptsDir = path.resolve("scripts");
  const files = fs
    .readdirSync(scriptsDir)
    .filter(
      (name) =>
        name.endsWith(".ts")
        && !name.startsWith("prove_")
        && /public_agent_service.*order/i.test(name),
    )
    .sort();

  const attempted: string[] = [];

  for (const name of files) {
    const file = path.join(scriptsDir, name);
    const source = fs.readFileSync(file, "utf8");
    if (
      !source.includes("VOID_PUBLIC_AGENT_SERVICE_ORDER")
      && !source.includes("work_order_id")
    ) {
      continue;
    }
    if (
      /node:(?:http|https|net|tls|child_process)/.test(source)
      || /\bfetch\s*\(/.test(source)
    ) {
      continue;
    }

    const module = await import(
      `${pathToFileURL(file).href}?void-proof=1`
    );
    const candidates = Object.entries(module)
      .filter(
        ([exportName, exported]) =>
          typeof exported === "function"
          && /(?:adapt|materialize|build|create).*(?:order|work)/i.test(
            exportName,
          ),
      )
      .sort(([left], [right]) =>
        left.localeCompare(right),
      );

    for (const [exportName, exported] of candidates) {
      const fn = exported as (...args: unknown[]) => unknown;
      const argumentSets: unknown[][] = [
        [orderRequest, catalog],
        [orderRequest],
        [submissionInput, catalog],
        [submissionInput],
        [catalog, orderRequest],
      ];
      for (const args of argumentSets) {
        attempted.push(
          `${name}:${exportName}/${args.length}`,
        );
        try {
          const result = await fn(...args);
          const found = findWorkOrderEnvelope(
            result,
            expectedWorkOrderId,
          );
          if (found !== null) return found;
        } catch {
          // A pure candidate with a different signature is not authoritative.
        }
      }
    }
  }

  fail(
    "canonical public-agent service work-order adapter was not discovered: "
      + attempted.join(","),
  );
}

function emptyReplayState(): AcceptanceReplayStateV1 {
  const draft = {
    marker:
      "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_STATE_V1" as const,
    version: 1 as const,
    revision: 0,
    consumed_requester_authentication_ids: [],
    consumed_provider_authentication_ids: [],
    consumed_acceptance_ids: [],
    active_acceptance_by_quote: {},
  };
  return {
    ...draft,
    state_id:
      acceptanceReplayStateIdV1(draft),
  };
}

async function buildExternalRequesterInput(
  fixtureInput: Record<string, unknown>,
  catalog: unknown,
): Promise<Record<string, unknown>> {
  const externalInput = clone(fixtureInput);
  externalInput.mode =
    "external_requester_evidence";

  const requesterAuthenticationInput = externalInput
    .requester_authentication_input as Record<string, unknown>;
  requesterAuthenticationInput.evidence_mode =
    "external_requester_evidence";

  const handoffInput = requesterAuthenticationInput
    .authenticated_quote_acceptance_handoff_input as Record<string, unknown>;
  const providerAuthenticationInput = handoffInput
    .provider_authentication_input as Record<string, unknown>;
  providerAuthenticationInput.evidence_mode =
    "external_provider_evidence";

  const responseInput = providerAuthenticationInput
    .provider_quote_response_input as Record<string, unknown>;
  const quoteHandoffInput = responseInput
    .quote_handoff_input as Record<string, unknown>;
  quoteHandoffInput.evidence_mode =
    "external_receiver_receipt";

  const responsePacket =
    materializePublicAgentServiceProviderQuoteResponseV1(
      responseInput,
      catalog,
    );
  assertCondition(
    responsePacket.status
      === "provider_authentication_required",
    "external response did not require provider authentication",
  );

  const providerGenerated =
    crypto.generateKeyPairSync("ed25519");
  const providerPublicPem =
    providerGenerated.publicKey
      .export({
        type: "spki",
        format: "pem",
      })
      .toString();
  const providerKeyId =
    providerQuoteResponseAuthenticationKeyIdV1(
      providerPublicPem,
    );
  const providerBindingDraft:
    ProviderKeyBindingDraftV1 = {
      marker:
        "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_KEY_BINDING_V1",
      version: 1,
      binding_status:
        "operator_approved_snapshot",
      provider_id:
        responsePacket.provider_claim.provider_id,
      authority_scope:
        "provider_quote_response_authenticate",
      key_id:
        providerKeyId,
      public_key_pem:
        providerPublicPem,
      valid_from_utc:
        "2030-01-01T00:00:00Z",
      expires_at_utc:
        "2030-02-01T00:00:00Z",
      revoked_at_utc:
        null,
      binding_nonce:
        "acceptance-consumer-external-provider-binding-0001",
    };
  const providerBinding = {
    ...providerBindingDraft,
    binding_id:
      providerKeyBindingIdV1(
        providerBindingDraft,
      ),
  };
  providerAuthenticationInput.provider_key_binding =
    providerBinding;

  const providerBody:
    ProviderQuoteResponseAuthenticationBodyV1 = {
      marker:
        "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_EVIDENCE_V1",
      version: 1,
      signature_scheme:
        "ed25519-spki-sha256-v1",
      signature_domain:
        "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_V1",
      canonicalization:
        "void-canonical-json-v1",
      response_id:
        responsePacket.response_id,
      quote_id:
        responsePacket.source.quote_id,
      handoff_id:
        responsePacket.source.handoff_id,
      work_order_id:
        responsePacket.source.work_order_id,
      submission_id:
        responsePacket.source.submission_id,
      request_sha256:
        responsePacket.source.request_sha256,
      receipt_id:
        responsePacket.source.receipt_id,
      provider_id:
        responsePacket.provider_claim.provider_id,
      catalog_fingerprint_sha256:
        responsePacket.source
          .catalog_fingerprint_sha256,
      provider_key_binding_id:
        providerBinding.binding_id,
      authentication_nonce:
        "acceptance-consumer-external-provider-auth-0001",
      created_at_utc:
        "2030-01-01T00:04:00Z",
      expires_at_utc:
        "2030-01-01T21:00:00Z",
    };
  const providerSignature =
    crypto.sign(
      null,
      providerQuoteResponseAuthenticationSigningBytesV1(
        providerBody,
      ),
      providerGenerated.privateKey,
    ).toString("base64");
  const providerEnvelopeWithoutId = {
    ...providerBody,
    signature_base64:
      providerSignature,
  };
  providerAuthenticationInput.authentication_envelope = {
    ...providerEnvelopeWithoutId,
    authentication_id:
      providerQuoteResponseAuthenticationIdV1(
        providerEnvelopeWithoutId,
      ),
  };

  const handoffPacket =
    materializePublicAgentServiceAuthenticatedQuoteAcceptanceHandoffV1(
      handoffInput,
      catalog,
    );
  assertCondition(
    handoffPacket.status
      === "requester_authentication_required",
    "external handoff did not require requester authentication",
  );

  const requesterGenerated =
    crypto.generateKeyPairSync("ed25519");
  const requesterPublicPem =
    requesterGenerated.publicKey
      .export({
        type: "spki",
        format: "pem",
      })
      .toString();
  const requesterKeyId =
    requesterAcceptanceAuthenticationKeyIdV1(
      requesterPublicPem,
    );
  const requesterBindingDraft:
    RequesterAcceptanceKeyBindingDraftV1 = {
      marker:
        "VOID_PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_KEY_BINDING_V1",
      version: 1,
      binding_status:
        "operator_approved_snapshot",
      requester_agent_id:
        handoffPacket.source.requester_agent_id,
      authority_scope:
        "agent_paid_work_accept",
      key_id:
        requesterKeyId,
      public_key_pem:
        requesterPublicPem,
      valid_from_utc:
        "2030-01-01T00:00:00Z",
      expires_at_utc:
        "2030-02-01T00:00:00Z",
      revoked_at_utc:
        null,
      binding_nonce:
        "acceptance-consumer-external-requester-binding-0001",
    };
  const requesterBinding = {
    ...requesterBindingDraft,
    binding_id:
      requesterAcceptanceKeyBindingIdV1(
        requesterBindingDraft,
      ),
  };
  requesterAuthenticationInput.requester_key_binding =
    requesterBinding;

  const requesterBody:
    RequesterAcceptanceAuthenticationBodyV1 = {
      marker:
        "VOID_PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_EVIDENCE_V1",
      version: 1,
      signature_scheme:
        "ed25519-spki-sha256-v1",
      signature_domain:
        "VOID_PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_V1",
      canonicalization:
        "void-canonical-json-v1",
      handoff_id:
        handoffPacket.handoff_id,
      provider_authentication_id:
        handoffPacket.source.authentication_id,
      provider_key_binding_id:
        handoffPacket.source.provider_key_binding_id,
      provider_key_id:
        handoffPacket.source.key_id,
      response_id:
        handoffPacket.source.response_id,
      quote_id:
        handoffPacket.source.quote_id,
      quote_handoff_id:
        handoffPacket.source.quote_handoff_id,
      work_order_id:
        handoffPacket.source.work_order_id,
      requester_agent_id:
        handoffPacket.source.requester_agent_id,
      provider_id:
        handoffPacket.source.provider_id,
      catalog_fingerprint_sha256:
        handoffPacket.source.catalog_fingerprint_sha256,
      requester_key_binding_id:
        requesterBinding.binding_id,
      acceptance_nonce:
        handoffPacket.requester_intent.acceptance_nonce,
      authentication_nonce:
        "acceptance-consumer-external-requester-auth-0001",
      created_at_utc:
        "2030-01-01T00:06:00Z",
      expires_at_utc:
        "2030-01-01T19:30:00Z",
    };
  const requesterSignature =
    crypto.sign(
      null,
      requesterAcceptanceAuthenticationSigningBytesV1(
        requesterBody,
      ),
      requesterGenerated.privateKey,
    ).toString("base64");
  const requesterEnvelopeWithoutId = {
    ...requesterBody,
    signature_base64:
      requesterSignature,
  };
  requesterAuthenticationInput.requester_authentication_envelope = {
    ...requesterEnvelopeWithoutId,
    requester_authentication_id:
      requesterAcceptanceAuthenticationIdV1(
        requesterEnvelopeWithoutId,
      ),
  };

  const requesterPacket =
    materializePublicAgentServiceRequesterAcceptanceAuthenticationV1(
      requesterAuthenticationInput,
      catalog,
    );
  assertCondition(
    requesterPacket.status
      === "requester_authenticated_for_acceptance",
    "external requester authentication status changed",
  );

  return externalInput;
}

async function main(): Promise<void> {
  const examplePath =
    "examples/public-agent-service-acceptance-materialization-replay-consumer-v1.example.json";
  const schemaPath =
    "schemas/public-agent-service-acceptance-materialization-replay-consumer-v1.schema.json";
  const docsPath =
    "docs/public-agent/public-agent-service-acceptance-materialization-replay-consumer-v1.md";
  const adapterPath =
    "scripts/public_agent_service_acceptance_materialization_replay_consumer_v1.ts";
  const workflowPath =
    ".github/workflows/public-agent-service-acceptance-materialization-replay-consumer-v1.yml";
  const catalogPath =
    "ops/public/agent-services-v1/catalog.json";

  const input =
    readJson(examplePath) as Record<string, unknown>;
  const catalog = readJson(catalogPath);
  const requesterInput = input
    .requester_authentication_input as Record<string, unknown>;
  const workOrder =
    await discoverCanonicalWorkOrder(
      requesterInput,
      catalog,
    );
  validateAgentPaidWorkOrderEnvelope(
    workOrder,
  );

  const authenticatedHandoffInput = (
    requesterInput
      .authenticated_quote_acceptance_handoff_input
  ) as Record<string, unknown>;
  const providerAuthenticationInput = (
    authenticatedHandoffInput.provider_authentication_input
  ) as Record<string, unknown>;
  const providerQuoteResponseInput = (
    providerAuthenticationInput.provider_quote_response_input
  ) as Record<string, unknown>;
  const quote = providerQuoteResponseInput.quote_envelope;
  validateAgentPaidWorkQuoteEnvelope(
    workOrder,
    quote,
  );

  const fixturePacket =
    planPublicAgentServiceAcceptanceMaterializationReplayConsumerV1(
      input,
      catalog,
      workOrder,
      quote,
    );
  verifyPublicAgentServiceAcceptanceMaterializationReplayConsumerV1(
    input,
    catalog,
    workOrder,
    quote,
    fixturePacket,
  );

  assertCondition(
    fixturePacket.plan_id
      === "voidawacp1_62b9b14f0878a08dab78ff92eeaea7faa6c89208bb6195914f5fc0cc705b06a2",
    "fixture plan_id changed",
  );
  assertCondition(
    fixturePacket.status === "example_only",
    "fixture status changed",
  );
  assertCondition(
    fixturePacket.acceptance.preview_acceptance_id
      === "voidawa1_c4006bf27c11858ca3bd702379923abd4c0878ad7058332605480128bd1f94d3",
    "fixture preview acceptance ID changed",
  );
  assertCondition(
    fixturePacket.acceptance.acceptance_id
      === null,
    "fixture created an authoritative acceptance ID",
  );
  assertCondition(
    fixturePacket.acceptance
      .acceptance_materialized_in_memory
      === false,
    "fixture materialized an acceptance",
  );
  assertCondition(
    fixturePacket.replay.next_state
      === null
      && fixturePacket.replay.transaction
        === null,
    "fixture planned a replay-state mutation",
  );
  assertCondition(
    fixturePacket.replay.before_state.state_id
      === "voidawrs1_09fcfb20aa71c21c83beddec7ca3965d2bcd98d13c08d9f0e70842e0f255d678",
    "fixture replay state ID changed",
  );
  assertCondition(
    Object.values(
      fixturePacket.authority,
    ).every((value) => value === false),
    "fixture gained authority",
  );

  const externalInput =
    await buildExternalRequesterInput(
      input,
      catalog,
    );
  const externalPacket =
    planPublicAgentServiceAcceptanceMaterializationReplayConsumerV1(
      externalInput,
      catalog,
      workOrder,
      quote,
    );
  verifyPublicAgentServiceAcceptanceMaterializationReplayConsumerV1(
    externalInput,
    catalog,
    workOrder,
    quote,
    externalPacket,
  );

  assertCondition(
    externalPacket.status
      === "acceptance_materialization_planned",
    "external consumer status changed",
  );
  assertCondition(
    externalPacket.acceptance.acceptance_id
      === "voidawa1_c4006bf27c11858ca3bd702379923abd4c0878ad7058332605480128bd1f94d3",
    "external acceptance ID changed",
  );
  assertCondition(
    externalPacket.acceptance
      .acceptance_materialized_in_memory
      === true,
    "external acceptance was not materialized in memory",
  );
  assertCondition(
    externalPacket.acceptance
      .acceptance_created_in_durable_state
      === false,
    "external acceptance was persisted",
  );
  assertCondition(
    externalPacket.replay.next_state
      ?.revision === 1,
    "external replay state revision did not advance once",
  );
  assertCondition(
    externalPacket.replay.transaction
      ?.atomic_consumption_count === 3,
    "external replay transaction did not consume three IDs",
  );
  assertCondition(
    externalPacket.replay.transaction
      ?.requester_authentication_consumed
      === true
      && externalPacket.replay.transaction
        .provider_authentication_consumed
        === true
      && externalPacket.replay.transaction
        .acceptance_id_consumed
        === true,
    "external replay transaction is not all-or-nothing",
  );
  assertCondition(
    externalPacket.replay.next_state
      ?.active_acceptance_by_quote[
        "voidawq1_c3ccb95c186dbd39557a0356bd77cabf3949a6544e93653e738074e69d9b701f"
      ] === "voidawa1_c4006bf27c11858ca3bd702379923abd4c0878ad7058332605480128bd1f94d3",
    "single active acceptance was not recorded",
  );
  assertCondition(
    externalPacket.replay
      .production_persistence_consumer_verified
      === false,
    "external proof claimed production persistence",
  );
  assertCondition(
    Object.values(
      externalPacket.authority,
    ).every((value) => value === false),
    "external plan gained runtime authority",
  );

  const initialState = (
    externalInput.replay_state_snapshot
  ) as AcceptanceReplayStateV1;
  const initialCanonical =
    canonicalJson(initialState);
  const nextState = externalPacket.replay
    .next_state as AcceptanceReplayStateV1;

  const replaySame = clone(externalInput);
  replaySame.replay_state_snapshot =
    nextState;
  replaySame.expected_state_revision =
    nextState.revision;
  expectReject(
    "complete replay",
    () =>
      planPublicAgentServiceAcceptanceMaterializationReplayConsumerV1(
        replaySame,
        catalog,
        workOrder,
        quote,
      ),
  );

  for (const replayCase of [
    "requester",
    "provider",
    "acceptance",
    "active_quote",
  ] as const) {
    const tampered = clone(externalInput);
    const state = emptyReplayState();

    if (replayCase === "requester") {
      state.consumed_requester_authentication_ids = [
        externalPacket.source
          .requester_authentication_id,
      ];
    } else if (replayCase === "provider") {
      state.consumed_provider_authentication_ids = [
        externalPacket.source
          .provider_authentication_id,
      ];
    } else if (replayCase === "acceptance") {
      state.consumed_acceptance_ids = [
        "voidawa1_c4006bf27c11858ca3bd702379923abd4c0878ad7058332605480128bd1f94d3",
      ];
    } else {
      state.active_acceptance_by_quote = {
        ["voidawq1_c3ccb95c186dbd39557a0356bd77cabf3949a6544e93653e738074e69d9b701f"]:
          "voidawa1_0000000000000000000000000000000000000000000000000000000000000000",
      };
    }

    const stateDraft = {
      marker: state.marker,
      version: state.version,
      revision: state.revision,
      consumed_requester_authentication_ids:
        state.consumed_requester_authentication_ids,
      consumed_provider_authentication_ids:
        state.consumed_provider_authentication_ids,
      consumed_acceptance_ids:
        state.consumed_acceptance_ids,
      active_acceptance_by_quote:
        state.active_acceptance_by_quote,
    };
    state.state_id =
      acceptanceReplayStateIdV1(stateDraft);
    tampered.replay_state_snapshot =
      state;
    tampered.expected_state_revision =
      0;

    const before = canonicalJson(state);
    expectReject(
      `${replayCase} replay conflict`,
      () =>
        planPublicAgentServiceAcceptanceMaterializationReplayConsumerV1(
          tampered,
          catalog,
          workOrder,
          quote,
        ),
    );
    assertCondition(
      canonicalJson(state) === before,
      `${replayCase} rejection partially mutated replay state`,
    );
  }

  const staleRevision = clone(externalInput);
  staleRevision.expected_state_revision = 1;
  expectReject(
    "stale revision",
    () =>
      planPublicAgentServiceAcceptanceMaterializationReplayConsumerV1(
        staleRevision,
        catalog,
        workOrder,
        quote,
      ),
  );
  assertCondition(
    canonicalJson(
      externalInput.replay_state_snapshot,
    ) === initialCanonical,
    "failed plans mutated the source state",
  );

  const schema =
    readJson(schemaPath) as Record<string, unknown>;
  assertCondition(
    schema.x_void_marker
      === "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_CONSUMER_SCHEMA_V1",
    "consumer schema marker changed",
  );
  const docs = readText(docsPath).replace(
    /\s+/g,
    " ",
  );
  const docsCasefolded = docs.toLowerCase();
  const adapter = readText(adapterPath);
  const workflow = readText(workflowPath);

  for (const required of [
    "4c9c495e74d12aa8b07383ee5af55694773f03d654385f9f6296aef5c5d853ec",
    "acceptance_specific_persistent_replay_consumer_not_found",
    "pure atomic transition",
    "production persistence is disabled",
  ]) {
    assertCondition(
      docsCasefolded.includes(
        required.toLowerCase(),
      ),
      `consumer documentation boundary missing: ${required}`,
    );
  }

  const atomicConsumptionSection =
    docsCasefolded
      .split("## atomic consumption contract")[1]
      ?.split("## single-active acceptance rule")[0]
      ?? "";
  for (const requiredIdentity of [
    "requester authentication id",
    "provider authentication id",
    "acceptance id",
  ]) {
    assertCondition(
      atomicConsumptionSection.includes(
        requiredIdentity,
      ),
      `atomic consumption documentation identity missing: ${requiredIdentity}`,
    );
  }
  assertCondition(
    adapter.includes(
      "materializeAgentPaidWorkAcceptance",
    ),
    "consumer is not bound to the canonical acceptance materializer",
  );
  assertCondition(
    !adapter.includes("writeFileSync(")
      && !adapter.includes("appendFileSync(")
      && !adapter.includes("renameSync("),
    "consumer adapter contains persistence writes",
  );
  assertCondition(
    !/from\s+["']node:(?:http|https|net|tls|child_process)["']/.test(
      adapter,
    ),
    "consumer imports network or subprocess authority",
  );
  assertCondition(
    !/\bfetch\s*\(/.test(adapter),
    "consumer performs HTTP",
  );
  assertCondition(
    !adapter.includes("crypto.sign("),
    "consumer performs production signing",
  );
  assertCondition(
    workflow.includes(
      "prove_public_agent_service_acceptance_materialization_replay_consumer_v1.ts",
    ),
    "consumer workflow proof command missing",
  );
  assertCondition(
    /uses:\s*actions\/checkout@v4\s+with:\s+fetch-depth:\s*0/.test(
      workflow,
    ),
    "consumer workflow must use full-history checkout",
  );

  console.log(
    JSON.stringify(
      {
        marker:
          "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_CONSUMER_ADAPTER_V1",
        input_marker:
          "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_CONSUMER_V1",
        output_marker:
          "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_CONSUMER_PACKET_V1",
        source_pack_sha256:
          "4c9c495e74d12aa8b07383ee5af55694773f03d654385f9f6296aef5c5d853ec",
        source_commit:
          "182228a1a9c4b31ec5ce9dc4b0fa1383938913df",
        diagnostic_correction:
          "acceptance_specific_persistent_replay_consumer_not_found",
        canonical_acceptance_materializer_verified:
          true,
        declarative_replay_requirements_verified:
          true,
        production_persistence_consumer_verified:
          false,
        fixture_plan_id:
          fixturePacket.plan_id,
        fixture_status:
          fixturePacket.status,
        fixture_preview_acceptance_id:
          fixturePacket.acceptance
            .preview_acceptance_id,
        fixture_acceptance_id:
          fixturePacket.acceptance.acceptance_id,
        fixture_acceptance_materialized:
          fixturePacket.acceptance
            .acceptance_materialized_in_memory,
        fixture_state_id:
          fixturePacket.replay.before_state
            .state_id,
        fixture_state_transition:
          false,
        external_status:
          externalPacket.status,
        external_acceptance_id:
          externalPacket.acceptance.acceptance_id,
        external_acceptance_materialized_in_memory:
          externalPacket.acceptance
            .acceptance_materialized_in_memory,
        external_acceptance_created_in_durable_state:
          false,
        external_next_state_revision:
          externalPacket.replay.next_state
            ?.revision,
        external_atomic_consumption_count:
          externalPacket.replay.transaction
            ?.atomic_consumption_count,
        external_requester_authentication_consumed:
          true,
        external_provider_authentication_consumed:
          true,
        external_acceptance_id_consumed:
          true,
        external_single_active_acceptance_per_quote_enforced:
          true,
        complete_replay_rejected:
          true,
        requester_replay_rejected:
          true,
        provider_replay_rejected:
          true,
        acceptance_replay_rejected:
          true,
        active_quote_conflict_rejected:
          true,
        stale_revision_rejected:
          true,
        failed_transition_partial_write:
          false,
        requester_authentication_replay_write:
          false,
        provider_authentication_replay_write:
          false,
        acceptance_replay_write:
          false,
        quote_acceptance:
          false,
        payment_authorization:
          false,
        payment_execution:
          false,
        execution_authorization:
          false,
        work_dispatch:
          false,
        production_signing:
          false,
        http_submission:
          false,
        runtime_mutation:
          false,
        money_movement:
          false,
        ephemeral_provider_test_signing_performed:
          true,
        ephemeral_requester_test_signing_performed:
          true,
        proof:
          "green",
      },
      null,
      2,
    ),
  );
}

await main();
