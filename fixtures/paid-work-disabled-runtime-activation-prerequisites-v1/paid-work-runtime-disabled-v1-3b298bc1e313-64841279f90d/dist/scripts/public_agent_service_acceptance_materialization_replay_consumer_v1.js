import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { canonicalJson, } from "./agent_paid_work_order_envelope_v1.js";
import { materializeAgentPaidWorkAcceptance, } from "./agent_paid_work_acceptance_envelope_v1.js";
import { materializePublicAgentServiceRequesterAcceptanceAuthenticationV1, validatePublicAgentServiceRequesterAcceptanceAuthenticationV1, } from "./public_agent_service_requester_acceptance_authentication_v1.js";
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_CONSUMER_MARKER = "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_CONSUMER_V1";
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_CONSUMER_PACKET_MARKER = "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_CONSUMER_PACKET_V1";
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_STATE_MARKER = "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_STATE_V1";
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_PLAN_MARKER = "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_PLAN_V1";
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_TRANSACTION_MARKER = "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_TRANSACTION_V1";
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_CONSUMER_VERSION = 1;
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_STATE_ID_PREFIX = "voidawrs1_";
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_PLAN_ID_PREFIX = "voidawacp1_";
export const PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_TRANSACTION_ID_PREFIX = "voidawact1_";
const MAX_JSON_BYTES = 32 * 1024 * 1024;
const REQUESTER_AUTHENTICATION_ID_PATTERN = /^voidawra1_[0-9a-f]{64}$/;
const PROVIDER_AUTHENTICATION_ID_PATTERN = /^voidawqa1_[0-9a-f]{64}$/;
const ACCEPTANCE_ID_PATTERN = /^voidawa1_[0-9a-f]{64}$/;
const QUOTE_ID_PATTERN = /^voidawq1_[0-9a-f]{64}$/;
const STATE_ID_PATTERN = /^voidawrs1_[0-9a-f]{64}$/;
function fail(message) {
    throw new Error(message);
}
function assertCondition(condition, message) {
    if (!condition)
        fail(message);
}
function isRecord(value) {
    return Boolean(value
        && typeof value === "object"
        && !Array.isArray(value));
}
function requireRecord(value, label) {
    assertCondition(isRecord(value), `${label} must be an object`);
    return value;
}
function requireExactKeys(value, label, keys) {
    const actual = Object.keys(value).sort();
    const expected = [...keys].sort();
    assertCondition(JSON.stringify(actual)
        === JSON.stringify(expected), `${label} must contain exactly: ${expected.join(", ")}`);
}
function requireInteger(value, label) {
    assertCondition(typeof value === "number"
        && Number.isSafeInteger(value)
        && value >= 0, `${label} must be a non-negative safe integer`);
    return value;
}
function requirePattern(value, label, pattern, length) {
    assertCondition(typeof value === "string", `${label} must be a string`);
    assertCondition(value.length === length
        && pattern.test(value), `${label} has invalid format`);
    return value;
}
function sha256Hex(value) {
    return crypto
        .createHash("sha256")
        .update(value, "utf8")
        .digest("hex");
}
function sortedUnique(values, label) {
    const sorted = [...values].sort();
    assertCondition(JSON.stringify(values)
        === JSON.stringify(sorted), `${label} must be sorted`);
    assertCondition(new Set(values).size === values.length, `${label} must be unique`);
    return values;
}
export function acceptanceReplayStateIdV1(draft) {
    return `${PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_STATE_ID_PREFIX}${sha256Hex(canonicalJson(draft))}`;
}
function validateReplayStateV1(value) {
    const root = requireRecord(value, "replay_state_snapshot");
    requireExactKeys(root, "replay_state_snapshot", [
        "marker",
        "version",
        "revision",
        "consumed_requester_authentication_ids",
        "consumed_provider_authentication_ids",
        "consumed_acceptance_ids",
        "active_acceptance_by_quote",
        "state_id",
    ]);
    assertCondition(root.marker
        === PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_STATE_MARKER, "replay state marker mismatch");
    assertCondition(root.version
        === PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_CONSUMER_VERSION, "replay state version mismatch");
    const revision = requireInteger(root.revision, "replay_state_snapshot.revision");
    assertCondition(Array.isArray(root.consumed_requester_authentication_ids), "consumed requester-authentication IDs must be an array");
    const consumedRequester = sortedUnique(root.consumed_requester_authentication_ids.map((item, index) => requirePattern(item, `consumed_requester_authentication_ids[${index}]`, REQUESTER_AUTHENTICATION_ID_PATTERN, 74)), "consumed requester-authentication IDs");
    assertCondition(Array.isArray(root.consumed_provider_authentication_ids), "consumed provider-authentication IDs must be an array");
    const consumedProvider = sortedUnique(root.consumed_provider_authentication_ids.map((item, index) => requirePattern(item, `consumed_provider_authentication_ids[${index}]`, PROVIDER_AUTHENTICATION_ID_PATTERN, 74)), "consumed provider-authentication IDs");
    assertCondition(Array.isArray(root.consumed_acceptance_ids), "consumed acceptance IDs must be an array");
    const consumedAcceptance = sortedUnique(root.consumed_acceptance_ids.map((item, index) => requirePattern(item, `consumed_acceptance_ids[${index}]`, ACCEPTANCE_ID_PATTERN, 73)), "consumed acceptance IDs");
    const activeRoot = requireRecord(root.active_acceptance_by_quote, "active_acceptance_by_quote");
    const active = {};
    for (const quoteId of Object.keys(activeRoot).sort()) {
        const normalizedQuote = requirePattern(quoteId, "active acceptance quote ID", QUOTE_ID_PATTERN, 73);
        active[normalizedQuote] = requirePattern(activeRoot[quoteId], `active acceptance for ${quoteId}`, ACCEPTANCE_ID_PATTERN, 73);
    }
    assertCondition(JSON.stringify(Object.keys(activeRoot))
        === JSON.stringify(Object.keys(active)), "active_acceptance_by_quote keys must be sorted");
    const stateId = requirePattern(root.state_id, "replay_state_snapshot.state_id", STATE_ID_PATTERN, 74);
    const draft = {
        marker: PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_STATE_MARKER,
        version: PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_CONSUMER_VERSION,
        revision,
        consumed_requester_authentication_ids: consumedRequester,
        consumed_provider_authentication_ids: consumedProvider,
        consumed_acceptance_ids: consumedAcceptance,
        active_acceptance_by_quote: active,
    };
    assertCondition(stateId === acceptanceReplayStateIdV1(draft), "replay state_id mismatch");
    return {
        ...draft,
        state_id: stateId,
    };
}
function validateInputV1(value) {
    const root = requireRecord(value, "acceptance replay-consumer input");
    requireExactKeys(root, "acceptance replay-consumer input", [
        "marker",
        "version",
        "mode",
        "requester_authentication_input",
        "acceptance_draft",
        "replay_state_snapshot",
        "expected_state_revision",
    ]);
    assertCondition(root.marker
        === PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_CONSUMER_MARKER, "acceptance replay-consumer marker mismatch");
    assertCondition(root.version
        === PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_CONSUMER_VERSION, "acceptance replay-consumer version mismatch");
    assertCondition(root.mode === "example_fixture"
        || root.mode === "external_requester_evidence", "acceptance replay-consumer mode mismatch");
    validatePublicAgentServiceRequesterAcceptanceAuthenticationV1(root.requester_authentication_input);
    const acceptanceDraft = requireRecord(root.acceptance_draft, "acceptance_draft");
    return {
        marker: PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_CONSUMER_MARKER,
        version: PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_CONSUMER_VERSION,
        mode: root.mode,
        requester_authentication_input: root.requester_authentication_input,
        acceptance_draft: acceptanceDraft,
        replay_state_snapshot: validateReplayStateV1(root.replay_state_snapshot),
        expected_state_revision: requireInteger(root.expected_state_revision, "expected_state_revision"),
    };
}
function planIdV1(mode, requesterAuthenticationId, providerAuthenticationId, acceptanceId, replayStateId, expectedStateRevision) {
    const draft = {
        marker: PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_PLAN_MARKER,
        version: PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_CONSUMER_VERSION,
        mode,
        requester_authentication_id: requesterAuthenticationId,
        provider_authentication_id: providerAuthenticationId,
        acceptance_id: acceptanceId,
        replay_state_id: replayStateId,
        expected_state_revision: expectedStateRevision,
    };
    return `${PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_PLAN_ID_PREFIX}${sha256Hex(canonicalJson(draft))}`;
}
function transactionIdV1(value) {
    return `${PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_TRANSACTION_ID_PREFIX}${sha256Hex(canonicalJson(value))}`;
}
function appendSortedUnique(values, value) {
    assertCondition(!values.includes(value), `replay detected for ${value}`);
    return [...values, value].sort();
}
function bindAcceptanceToAuthentication(requesterPacket, acceptance, input) {
    const checks = [
        [
            acceptance.work_order_id,
            requesterPacket.source.work_order_id,
            "work_order_id",
        ],
        [
            acceptance.quote_id,
            requesterPacket.source.quote_id,
            "quote_id",
        ],
        [
            acceptance.requester.agent_id,
            requesterPacket.source.requester_agent_id,
            "requester_agent_id",
        ],
        [
            acceptance.provider.provider_id,
            requesterPacket.source.provider_id,
            "provider_id",
        ],
        [
            acceptance.nonce,
            requesterPacket.source.acceptance_nonce,
            "acceptance_nonce",
        ],
    ];
    for (const [actual, expected, label] of checks) {
        assertCondition(actual === expected, `acceptance ${label} does not match requester authentication`);
    }
    const authEnvelope = input.requester_authentication_input
        .requester_authentication_envelope;
    assertCondition(Date.parse(acceptance.created_at_utc)
        >= Date.parse(authEnvelope.created_at_utc), "acceptance predates requester authentication");
    assertCondition(Date.parse(acceptance.expires_at_utc)
        <= Date.parse(authEnvelope.expires_at_utc), "acceptance outlives requester authentication");
}
export function planPublicAgentServiceAcceptanceMaterializationReplayConsumerV1(inputValue, catalogValue, workOrderValue, quoteValue) {
    const input = validateInputV1(inputValue);
    const requesterPacket = materializePublicAgentServiceRequesterAcceptanceAuthenticationV1(input.requester_authentication_input, catalogValue);
    const acceptance = materializeAgentPaidWorkAcceptance(workOrderValue, quoteValue, input.acceptance_draft);
    bindAcceptanceToAuthentication(requesterPacket, acceptance, input);
    const state = input.replay_state_snapshot;
    assertCondition(state.revision === input.expected_state_revision, "replay state revision mismatch");
    const planId = planIdV1(input.mode, requesterPacket.requester_authentication_id, requesterPacket.source.provider_authentication_id, acceptance.acceptance_id, state.state_id, input.expected_state_revision);
    const common = {
        marker: PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_CONSUMER_PACKET_MARKER,
        version: PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_CONSUMER_VERSION,
        plan_id: planId,
        source_evidence: {
            source_pack_sha256: "4c9c495e74d12aa8b07383ee5af55694773f03d654385f9f6296aef5c5d853ec",
            source_commit: "182228a1a9c4b31ec5ce9dc4b0fa1383938913df",
            diagnostic_correction: "acceptance_specific_persistent_replay_consumer_not_found",
            canonical_acceptance_materializer_verified: true,
            declarative_replay_requirements_verified: true,
            production_persistence_consumer_verified: false,
        },
        source: {
            requester_authentication_id: requesterPacket.requester_authentication_id,
            provider_authentication_id: requesterPacket.source.provider_authentication_id,
            handoff_id: requesterPacket.source.handoff_id,
            quote_id: requesterPacket.source.quote_id,
            work_order_id: requesterPacket.source.work_order_id,
            requester_agent_id: requesterPacket.source.requester_agent_id,
            provider_id: requesterPacket.source.provider_id,
            acceptance_nonce: requesterPacket.source.acceptance_nonce,
        },
        authority: {
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
        },
    };
    if (input.mode === "example_fixture") {
        assertCondition(input.requester_authentication_input.evidence_mode
            === "example_fixture", "fixture consumer mode requires fixture requester evidence");
        assertCondition(requesterPacket.status === "example_only", "fixture requester packet status changed");
        assertCondition(requesterPacket.acceptance_gate
            .eligible_for_acceptance_materialization
            === false, "fixture requester authentication became live");
        return {
            ...common,
            status: "example_only",
            acceptance: {
                preview_acceptance_id: acceptance.acceptance_id,
                acceptance_id: null,
                acceptance_materialized_in_memory: false,
                acceptance_created_in_durable_state: false,
                acceptance_envelope: null,
            },
            replay: {
                before_state: state,
                next_state: null,
                transaction: null,
                requester_authentication_replay_checked: true,
                provider_authentication_replay_checked: true,
                acceptance_replay_checked: true,
                single_active_acceptance_per_quote_checked: true,
                expected_revision_checked: true,
                all_or_nothing_transition_verified: true,
                production_persistence_consumer_verified: false,
            },
        };
    }
    assertCondition(input.requester_authentication_input.evidence_mode
        === "external_requester_evidence", "external consumer mode requires external requester evidence");
    assertCondition(requesterPacket.status
        === "requester_authenticated_for_acceptance", "requester is not authenticated for acceptance");
    assertCondition(requesterPacket.acceptance_gate
        .eligible_for_acceptance_materialization
        === true, "requester authentication is not acceptance-materialization eligible");
    assertCondition(requesterPacket.acceptance_gate
        .acceptance_replay_consumer_verified
        === false, "upstream requester packet unexpectedly claims replay consumer verification");
    const requesterIds = appendSortedUnique(state.consumed_requester_authentication_ids, requesterPacket.requester_authentication_id);
    const providerIds = appendSortedUnique(state.consumed_provider_authentication_ids, requesterPacket.source.provider_authentication_id);
    const acceptanceIds = appendSortedUnique(state.consumed_acceptance_ids, acceptance.acceptance_id);
    assertCondition(state.active_acceptance_by_quote[acceptance.quote_id] === undefined, "quote already has an active acceptance");
    const nextDraft = {
        marker: PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_STATE_MARKER,
        version: PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_CONSUMER_VERSION,
        revision: state.revision + 1,
        consumed_requester_authentication_ids: requesterIds,
        consumed_provider_authentication_ids: providerIds,
        consumed_acceptance_ids: acceptanceIds,
        active_acceptance_by_quote: {
            ...state.active_acceptance_by_quote,
            [acceptance.quote_id]: acceptance.acceptance_id,
        },
    };
    const nextState = {
        ...nextDraft,
        state_id: acceptanceReplayStateIdV1(nextDraft),
    };
    const transactionWithoutId = {
        marker: PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_TRANSACTION_MARKER,
        version: PUBLIC_AGENT_SERVICE_ACCEPTANCE_MATERIALIZATION_REPLAY_CONSUMER_VERSION,
        before_state_id: state.state_id,
        after_state_id: nextState.state_id,
        before_revision: state.revision,
        after_revision: nextState.revision,
        requester_authentication_id: requesterPacket.requester_authentication_id,
        provider_authentication_id: requesterPacket.source.provider_authentication_id,
        acceptance_id: acceptance.acceptance_id,
        quote_id: acceptance.quote_id,
        work_order_id: acceptance.work_order_id,
        requester_agent_id: acceptance.requester.agent_id,
        atomic_consumption_count: 3,
        requester_authentication_consumed: true,
        provider_authentication_consumed: true,
        acceptance_id_consumed: true,
        single_active_acceptance_per_quote_enforced: true,
    };
    const transaction = {
        ...transactionWithoutId,
        transaction_id: transactionIdV1(transactionWithoutId),
    };
    return {
        ...common,
        status: "acceptance_materialization_planned",
        acceptance: {
            preview_acceptance_id: acceptance.acceptance_id,
            acceptance_id: acceptance.acceptance_id,
            acceptance_materialized_in_memory: true,
            acceptance_created_in_durable_state: false,
            acceptance_envelope: acceptance,
        },
        replay: {
            before_state: state,
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
    };
}
export function verifyPublicAgentServiceAcceptanceMaterializationReplayConsumerV1(inputValue, catalogValue, workOrderValue, quoteValue, packetValue) {
    const expected = planPublicAgentServiceAcceptanceMaterializationReplayConsumerV1(inputValue, catalogValue, workOrderValue, quoteValue);
    assertCondition(isRecord(packetValue), "acceptance replay-consumer packet must be an object");
    assertCondition(canonicalJson(packetValue)
        === canonicalJson(expected), "acceptance replay-consumer packet does not match source input");
    return expected;
}
function readJson(file) {
    const resolved = path.resolve(file);
    const fileStat = fs.lstatSync(resolved);
    assertCondition(!fileStat.isSymbolicLink(), "symlink input forbidden");
    assertCondition(fileStat.isFile(), "regular file input required");
    assertCondition(fileStat.size <= MAX_JSON_BYTES, "JSON input too large");
    return JSON.parse(fs.readFileSync(resolved, "utf8"));
}
function usage() {
    return fail([
        "usage:",
        "  tsx scripts/public_agent_service_acceptance_materialization_replay_consumer_v1.ts plan <input.json> <catalog.json> <work-order.json> <quote.json>",
        "  tsx scripts/public_agent_service_acceptance_materialization_replay_consumer_v1.ts verify <input.json> <catalog.json> <work-order.json> <quote.json> <packet.json>",
    ].join("\n"));
}
function main() {
    const [mode, inputPath, catalogPath, workOrderPath, quotePath, packetPath, ...extra] = process.argv.slice(2);
    assertCondition(extra.length === 0, "unexpected arguments");
    if (mode === "plan") {
        assertCondition(Boolean(inputPath
            && catalogPath
            && workOrderPath
            && quotePath)
            && packetPath === undefined, "plan requires input, catalog, work-order, and quote paths");
        const packet = planPublicAgentServiceAcceptanceMaterializationReplayConsumerV1(readJson(inputPath), readJson(catalogPath), readJson(workOrderPath), readJson(quotePath));
        process.stdout.write(`${JSON.stringify(packet, null, 2)}\n`);
        return;
    }
    if (mode === "verify") {
        assertCondition(Boolean(inputPath
            && catalogPath
            && workOrderPath
            && quotePath
            && packetPath), "verify requires input, catalog, work-order, quote, and packet paths");
        const packet = verifyPublicAgentServiceAcceptanceMaterializationReplayConsumerV1(readJson(inputPath), readJson(catalogPath), readJson(workOrderPath), readJson(quotePath), readJson(packetPath));
        console.log(`marker=${packet.marker}`);
        console.log(`plan_id=${packet.plan_id}`);
        console.log(`status=${packet.status}`);
        console.log(`acceptance_id=${packet.acceptance.acceptance_id}`);
        console.log("production_persistence_consumer_verified=false");
        console.log("requester_authentication_replay_write=false");
        console.log("provider_authentication_replay_write=false");
        console.log("acceptance_replay_write=false");
        console.log("payment_authorization=false");
        console.log("execution_authorization=false");
        console.log("work_dispatch=false");
        console.log("runtime_mutation=false");
        console.log("money_movement=false");
        return;
    }
    usage();
}
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
