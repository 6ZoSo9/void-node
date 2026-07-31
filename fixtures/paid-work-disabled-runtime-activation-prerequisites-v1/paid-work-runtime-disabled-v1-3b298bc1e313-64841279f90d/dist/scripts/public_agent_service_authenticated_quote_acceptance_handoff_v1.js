import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { canonicalJson, } from "./agent_paid_work_order_envelope_v1.js";
import { materializePublicAgentServiceProviderQuoteResponseAuthenticationV1, validatePublicAgentServiceProviderQuoteResponseAuthenticationV1, } from "./public_agent_service_provider_quote_response_authentication_v1.js";
export const PUBLIC_AGENT_SERVICE_AUTHENTICATED_QUOTE_ACCEPTANCE_HANDOFF_MARKER = "VOID_PUBLIC_AGENT_SERVICE_AUTHENTICATED_QUOTE_ACCEPTANCE_HANDOFF_V1";
export const PUBLIC_AGENT_SERVICE_AUTHENTICATED_QUOTE_ACCEPTANCE_HANDOFF_PACKET_MARKER = "VOID_PUBLIC_AGENT_SERVICE_AUTHENTICATED_QUOTE_ACCEPTANCE_HANDOFF_PACKET_V1";
export const PUBLIC_AGENT_SERVICE_AUTHENTICATED_QUOTE_ACCEPTANCE_HANDOFF_VERSION = 1;
export const PUBLIC_AGENT_SERVICE_AUTHENTICATED_QUOTE_ACCEPTANCE_HANDOFF_ID_PREFIX = "voidawah1_";
export const PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_SCOPE = "agent_paid_work_accept";
const MAX_JSON_BYTES = 8 * 1024 * 1024;
const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const NONCE_PATTERN = /^[A-Za-z0-9._:-]{16,128}$/;
const HANDOFF_ID_PATTERN = /^voidawah1_[0-9a-f]{64}$/;
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
    assertCondition(JSON.stringify(actual) === JSON.stringify(expected), `${label} must contain exactly: ${expected.join(", ")}`);
}
function requireString(value, label, pattern, minimum, maximum) {
    assertCondition(typeof value === "string", `${label} must be a string`);
    assertCondition(value === value.trim(), `${label} must be trimmed`);
    assertCondition(value.length >= minimum
        && value.length <= maximum, `${label} length is outside bounds`);
    assertCondition(pattern.test(value), `${label} has invalid format`);
    return value;
}
function requireIsoUtc(value, label) {
    const result = requireString(value, label, ISO_UTC_PATTERN, 20, 20);
    assertCondition(Number.isFinite(Date.parse(result)), `${label} is not a valid UTC timestamp`);
    return result;
}
function sha256Hex(value) {
    return crypto
        .createHash("sha256")
        .update(value, "utf8")
        .digest("hex");
}
function requesterFromAuthenticationInput(input) {
    const orderRequest = input.provider_quote_response_input
        .quote_handoff_input
        .submission_input
        .order_request;
    return orderRequest.requester.agent_id;
}
export function authenticatedQuoteAcceptanceHandoffIdV1(packetWithoutId) {
    return `${PUBLIC_AGENT_SERVICE_AUTHENTICATED_QUOTE_ACCEPTANCE_HANDOFF_ID_PREFIX}${sha256Hex(canonicalJson(packetWithoutId))}`;
}
export function validatePublicAgentServiceAuthenticatedQuoteAcceptanceHandoffV1(value) {
    const root = requireRecord(value, "authenticated quote acceptance handoff input");
    requireExactKeys(root, "authenticated quote acceptance handoff input", [
        "marker",
        "version",
        "provider_authentication_input",
        "requester_intent",
    ]);
    assertCondition(root.marker
        === PUBLIC_AGENT_SERVICE_AUTHENTICATED_QUOTE_ACCEPTANCE_HANDOFF_MARKER, "authenticated acceptance handoff marker mismatch");
    assertCondition(root.version
        === PUBLIC_AGENT_SERVICE_AUTHENTICATED_QUOTE_ACCEPTANCE_HANDOFF_VERSION, "authenticated acceptance handoff version mismatch");
    const providerAuthenticationInput = validatePublicAgentServiceProviderQuoteResponseAuthenticationV1(root.provider_authentication_input);
    const requesterIntent = requireRecord(root.requester_intent, "requester_intent");
    requireExactKeys(requesterIntent, "requester_intent", [
        "requester_agent_id",
        "created_at_utc",
        "expires_at_utc",
        "acceptance_nonce",
        "requester_authentication",
    ]);
    const requesterAgentId = requireString(requesterIntent.requester_agent_id, "requester_intent.requester_agent_id", IDENTIFIER_PATTERN, 3, 128);
    const createdAtUtc = requireIsoUtc(requesterIntent.created_at_utc, "requester_intent.created_at_utc");
    const expiresAtUtc = requireIsoUtc(requesterIntent.expires_at_utc, "requester_intent.expires_at_utc");
    assertCondition(Date.parse(expiresAtUtc)
        > Date.parse(createdAtUtc), "requester intent expiry must follow creation");
    const acceptanceNonce = requireString(requesterIntent.acceptance_nonce, "requester_intent.acceptance_nonce", NONCE_PATTERN, 16, 128);
    const authentication = requireRecord(requesterIntent.requester_authentication, "requester_intent.requester_authentication");
    requireExactKeys(authentication, "requester_intent.requester_authentication", [
        "mode",
        "required_scope",
        "verified",
    ]);
    assertCondition(authentication.mode === "not_provided", "requester authentication mode must remain not_provided");
    assertCondition(authentication.required_scope
        === PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_SCOPE, "requester authentication scope must be agent_paid_work_accept");
    assertCondition(authentication.verified === false, "requester authentication must remain unverified in this handoff");
    const workOrderRequester = requesterFromAuthenticationInput(providerAuthenticationInput);
    assertCondition(requesterAgentId === workOrderRequester, "requester intent does not match work-order requester");
    const providerEvidence = providerAuthenticationInput.authentication_envelope;
    const quote = providerAuthenticationInput
        .provider_quote_response_input
        .quote_envelope;
    const workOrder = providerAuthenticationInput
        .provider_quote_response_input
        .quote_handoff_input
        .submission_input
        .order_request;
    assertCondition(Date.parse(createdAtUtc)
        >= Date.parse(providerEvidence.created_at_utc), "requester intent cannot predate provider authentication");
    assertCondition(Date.parse(expiresAtUtc)
        <= Date.parse(providerEvidence.expires_at_utc), "requester intent cannot outlive provider authentication");
    assertCondition(Date.parse(expiresAtUtc)
        <= Date.parse(quote.expires_at_utc), "requester intent cannot outlive quote");
    assertCondition(Date.parse(expiresAtUtc)
        <= Date.parse(workOrder.expires_at_utc), "requester intent cannot outlive work order");
    return {
        marker: PUBLIC_AGENT_SERVICE_AUTHENTICATED_QUOTE_ACCEPTANCE_HANDOFF_MARKER,
        version: PUBLIC_AGENT_SERVICE_AUTHENTICATED_QUOTE_ACCEPTANCE_HANDOFF_VERSION,
        provider_authentication_input: providerAuthenticationInput,
        requester_intent: {
            requester_agent_id: requesterAgentId,
            created_at_utc: createdAtUtc,
            expires_at_utc: expiresAtUtc,
            acceptance_nonce: acceptanceNonce,
            requester_authentication: {
                mode: "not_provided",
                required_scope: PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_SCOPE,
                verified: false,
            },
        },
    };
}
export function materializePublicAgentServiceAuthenticatedQuoteAcceptanceHandoffV1(inputValue, catalogValue) {
    const input = validatePublicAgentServiceAuthenticatedQuoteAcceptanceHandoffV1(inputValue);
    const authenticationPacket = materializePublicAgentServiceProviderQuoteResponseAuthenticationV1(input.provider_authentication_input, catalogValue);
    assertCondition(authenticationPacket.verification
        .provider_authentication_verified === true, "provider authentication must verify");
    assertCondition(authenticationPacket.acceptance_gate
        .authentication_replay_protection_required === true, "provider authentication replay protection must remain required");
    assertCondition(authenticationPacket.acceptance_gate
        .authentication_id_consumption_required === true, "provider authentication ID consumption must remain required");
    assertCondition(authenticationPacket.acceptance_gate
        .single_active_acceptance_per_quote_required === true, "single-active acceptance requirement must remain true");
    const external = input.provider_authentication_input.evidence_mode
        === "external_provider_evidence";
    if (external) {
        assertCondition(authenticationPacket.status
            === "provider_authenticated_for_acceptance", "external evidence must produce authenticated-for-acceptance status");
        assertCondition(authenticationPacket.acceptance_gate
            .eligible_for_acceptance === true, "external provider evidence must be acceptance eligible");
    }
    else {
        assertCondition(authenticationPacket.status === "example_only", "fixture provider authentication must remain example-only");
        assertCondition(authenticationPacket.acceptance_gate
            .eligible_for_acceptance === false, "fixture provider authentication must remain acceptance-ineligible");
    }
    const packetWithoutId = {
        marker: PUBLIC_AGENT_SERVICE_AUTHENTICATED_QUOTE_ACCEPTANCE_HANDOFF_PACKET_MARKER,
        version: PUBLIC_AGENT_SERVICE_AUTHENTICATED_QUOTE_ACCEPTANCE_HANDOFF_VERSION,
        status: external
            ? "requester_authentication_required"
            : "example_only",
        source: {
            catalog_fingerprint_sha256: authenticationPacket.source.catalog_fingerprint_sha256,
            authentication_id: authenticationPacket.authentication_id,
            provider_key_binding_id: authenticationPacket.source.provider_key_binding_id,
            key_id: authenticationPacket.source.key_id,
            response_id: authenticationPacket.source.response_id,
            quote_id: authenticationPacket.source.quote_id,
            quote_handoff_id: authenticationPacket.source.handoff_id,
            work_order_id: authenticationPacket.source.work_order_id,
            submission_id: authenticationPacket.source.submission_id,
            request_sha256: authenticationPacket.source.request_sha256,
            receipt_id: authenticationPacket.source.receipt_id,
            provider_id: authenticationPacket.source.provider_id,
            requester_agent_id: input.requester_intent.requester_agent_id,
        },
        requester_intent: {
            requester_agent_id: input.requester_intent.requester_agent_id,
            created_at_utc: input.requester_intent.created_at_utc,
            expires_at_utc: input.requester_intent.expires_at_utc,
            acceptance_nonce: input.requester_intent.acceptance_nonce,
            requester_authentication_mode: "not_provided",
            requester_authentication_scope: PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_SCOPE,
            requester_authentication_verified: false,
        },
        provider_authentication_gate: {
            provider_authentication_verified: true,
            evidence_mode: input.provider_authentication_input.evidence_mode,
            external_provider_evidence_verified: external,
            provider_packet_eligible_for_acceptance: external,
        },
        acceptance_gate: {
            eligible_for_requester_authentication: external,
            requester_authentication_required: true,
            requester_authentication_verified: false,
            requester_authentication_scope: PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_SCOPE,
            submit_credential_reuse_forbidden: true,
            acceptance_materialization_allowed: false,
            acceptance_id: null,
            authentication_replay_protection_required: true,
            authentication_id_consumption_required: true,
            acceptance_replay_protection_required: true,
            acceptance_id_consumption_required: true,
            single_active_acceptance_per_quote_required: true,
            acceptance_replay_consumer_verified: false,
            reason: external
                ? "requester_authentication_and_acceptance_replay_consumer_required"
                : "example_fixture_not_live_trust",
            next_action: external
                ? "authenticate_requester_then_run_separate_acceptance_replay_consumer"
                : "supply_external_provider_evidence_then_authenticate_requester",
        },
        authority: {
            acceptance_creation: false,
            quote_acceptance: false,
            authentication_replay_write: false,
            acceptance_replay_write: false,
            credential_issue: false,
            credential_change: false,
            provider_selection: false,
            provider_key_binding_creation: false,
            provider_key_registry_write: false,
            payment_authorization: false,
            payment_execution: false,
            execution_authorization: false,
            work_dispatch: false,
            wallet_access: false,
            production_signing: false,
            transaction_broadcast: false,
            work_credit_write: false,
            http_submission: false,
            runtime_mutation: false,
            money_movement: false,
        },
    };
    return {
        ...packetWithoutId,
        handoff_id: authenticatedQuoteAcceptanceHandoffIdV1(packetWithoutId),
    };
}
export function verifyPublicAgentServiceAuthenticatedQuoteAcceptanceHandoffV1(inputValue, catalogValue, packetValue) {
    const expected = materializePublicAgentServiceAuthenticatedQuoteAcceptanceHandoffV1(inputValue, catalogValue);
    assertCondition(isRecord(packetValue), "authenticated acceptance handoff packet must be an object");
    const packetId = packetValue.handoff_id;
    assertCondition(typeof packetId === "string"
        && HANDOFF_ID_PATTERN.test(packetId), "authenticated acceptance handoff ID format mismatch");
    assertCondition(canonicalJson(packetValue)
        === canonicalJson(expected), "authenticated acceptance handoff packet does not match source input");
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
        "  tsx scripts/public_agent_service_authenticated_quote_acceptance_handoff_v1.ts materialize <input.json> <handoff-packet.json>",
        "  tsx scripts/public_agent_service_authenticated_quote_acceptance_handoff_v1.ts verify <input.json> <handoff-packet.json>",
    ].join("\n"));
}
function main() {
    const [mode, inputPath, packetPath, ...extra] = process.argv.slice(2);
    assertCondition(extra.length === 0, "unexpected arguments");
    assertCondition(Boolean(inputPath && packetPath), "input and packet paths are required");
    const catalog = readJson("ops/public/agent-services-v1/catalog.json");
    const input = readJson(inputPath);
    if (mode === "materialize") {
        const packet = materializePublicAgentServiceAuthenticatedQuoteAcceptanceHandoffV1(input, catalog);
        fs.writeFileSync(path.resolve(packetPath), `${JSON.stringify(packet, null, 2)}\n`, {
            encoding: "utf8",
            flag: "wx",
            mode: 0o600,
        });
        console.log(`marker=${packet.marker}`);
        console.log(`handoff_id=${packet.handoff_id}`);
        console.log(`status=${packet.status}`);
        console.log(`authentication_id=${packet.source.authentication_id}`);
        console.log(`requester_agent_id=${packet.source.requester_agent_id}`);
        console.log(`eligible_for_requester_authentication=${packet.acceptance_gate.eligible_for_requester_authentication}`);
        console.log("requester_authentication_verified=false");
        console.log("acceptance_materialization_allowed=false");
        console.log("acceptance_created=false");
        console.log("quote_acceptance=false");
        console.log("payment_authorization=false");
        console.log("execution_authorization=false");
        console.log("work_dispatch=false");
        console.log("runtime_mutation=false");
        console.log("money_movement=false");
        console.log(`output=${path.resolve(packetPath)}`);
        return;
    }
    if (mode === "verify") {
        const packet = readJson(packetPath);
        const result = verifyPublicAgentServiceAuthenticatedQuoteAcceptanceHandoffV1(input, catalog, packet);
        console.log(`marker=${result.marker}`);
        console.log(`handoff_id=${result.handoff_id}`);
        console.log(`status=${result.status}`);
        console.log(`eligible_for_requester_authentication=${result.acceptance_gate.eligible_for_requester_authentication}`);
        console.log("requester_authentication_verified=false");
        console.log("acceptance_created=false");
        console.log("quote_acceptance=false");
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
