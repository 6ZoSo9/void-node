import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { canonicalJson, } from "./agent_paid_work_order_envelope_v1.js";
import { materializePublicAgentServiceOrderSubmissionV1, } from "./public_agent_service_order_submission_v1.js";
import { materializePublicAgentServiceSubmissionQuoteHandoffV1, validatePublicAgentServiceSubmissionQuoteHandoffV1, } from "./public_agent_service_submission_quote_handoff_v1.js";
export const PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_MARKER = "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_V1";
export const PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_PACKET_MARKER = "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_PACKET_V1";
export const PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_VERSION = 1;
export const PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_ID_PREFIX = "voidawqr1_";
export const AGENT_PAID_WORK_QUOTE_MARKER = "VOID_AGENT_PAID_WORK_QUOTE_ENVELOPE_V1";
const MAX_JSON_BYTES = 8 * 1024 * 1024;
const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const CAPABILITY_PATTERN = /^[a-z0-9][a-z0-9._:-]{2,127}$/;
const PAYMENT_RAIL_PATTERN = /^[a-z0-9][a-z0-9._-]{2,127}$/;
const OUTPUT_LABEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,255}$/;
const NONCE_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const DECIMAL_PATTERN = /^(?:0|[1-9]\d{0,31})(?:\.\d{1,18})?$/;
const QUOTE_ID_PATTERN = /^voidawq1_[0-9a-f]{64}$/;
const RESPONSE_ID_PATTERN = /^voidawqr1_[0-9a-f]{64}$/;
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
function requireString(value, label, pattern, minimum = 1, maximum = 4096) {
    assertCondition(typeof value === "string", `${label} must be a string`);
    assertCondition(value === value.trim(), `${label} must be trimmed`);
    assertCondition(value.length >= minimum && value.length <= maximum, `${label} length is outside bounds`);
    if (pattern) {
        assertCondition(pattern.test(value), `${label} has invalid format`);
    }
    return value;
}
function requireInteger(value, label, minimum, maximum) {
    assertCondition(Number.isSafeInteger(value)
        && Number(value) >= minimum
        && Number(value) <= maximum, `${label} must be a safe integer within bounds`);
    return Number(value);
}
function requireIsoUtc(value, label) {
    const result = requireString(value, label, ISO_UTC_PATTERN, 20, 20);
    assertCondition(Number.isFinite(Date.parse(result)), `${label} is not a valid UTC timestamp`);
    return result;
}
function decimalUnits(value, label) {
    assertCondition(DECIMAL_PATTERN.test(value), `${label} is invalid`);
    const [whole, fraction = ""] = value.split(".");
    return BigInt(`${whole}${fraction.padEnd(18, "0")}`);
}
function sha256Text(value) {
    return crypto.createHash("sha256").update(value).digest("hex");
}
function validateQuoteEnvelope(value, workOrder, handoffPacket) {
    const root = requireRecord(value, "quote_envelope");
    requireExactKeys(root, "quote_envelope", [
        "marker",
        "version",
        "work_order_id",
        "created_at_utc",
        "expires_at_utc",
        "provider",
        "commercial",
        "execution_commitment",
        "terms",
        "nonce",
        "quote_id",
    ]);
    assertCondition(root.marker === AGENT_PAID_WORK_QUOTE_MARKER, "quote marker mismatch");
    assertCondition(root.version === 1, "quote version mismatch");
    const workOrderId = requireString(root.work_order_id, "quote_envelope.work_order_id", /^voidawo1_[0-9a-f]{64}$/, 73, 73);
    const createdAt = requireIsoUtc(root.created_at_utc, "quote_envelope.created_at_utc");
    const expiresAt = requireIsoUtc(root.expires_at_utc, "quote_envelope.expires_at_utc");
    assertCondition(Date.parse(expiresAt) > Date.parse(createdAt), "quote expiry must follow quote creation");
    const provider = requireRecord(root.provider, "quote_envelope.provider");
    requireExactKeys(provider, "quote_envelope.provider", ["provider_id", "capability_id"]);
    const providerId = requireString(provider.provider_id, "quote_envelope.provider.provider_id", IDENTIFIER_PATTERN, 3, 128);
    const capabilityId = requireString(provider.capability_id, "quote_envelope.provider.capability_id", CAPABILITY_PATTERN, 3, 128);
    const commercial = requireRecord(root.commercial, "quote_envelope.commercial");
    requireExactKeys(commercial, "quote_envelope.commercial", ["quote_asset", "total", "payment_rail_id"]);
    const quoteAsset = requireString(commercial.quote_asset, "quote_envelope.commercial.quote_asset", /^[A-Z][A-Z0-9._:-]{0,31}$/, 1, 32);
    const total = requireString(commercial.total, "quote_envelope.commercial.total", DECIMAL_PATTERN, 1, 51);
    const paymentRailId = requireString(commercial.payment_rail_id, "quote_envelope.commercial.payment_rail_id", PAYMENT_RAIL_PATTERN, 3, 128);
    const commitment = requireRecord(root.execution_commitment, "quote_envelope.execution_commitment");
    requireExactKeys(commitment, "quote_envelope.execution_commitment", [
        "max_runtime_seconds",
        "max_output_bytes",
        "output_labels",
        "external_side_effects_allowed",
        "wallet_access_allowed",
        "money_movement_allowed",
    ]);
    const maxRuntime = requireInteger(commitment.max_runtime_seconds, "quote_envelope.execution_commitment.max_runtime_seconds", 1, 604800);
    const maxOutput = requireInteger(commitment.max_output_bytes, "quote_envelope.execution_commitment.max_output_bytes", 1, 1073741824);
    assertCondition(Array.isArray(commitment.output_labels)
        && commitment.output_labels.length >= 1
        && commitment.output_labels.length <= 64, "quote output_labels must be a bounded array");
    const outputLabels = commitment.output_labels.map((entry, index) => requireString(entry, `quote_envelope.execution_commitment.output_labels[${index}]`, OUTPUT_LABEL_PATTERN, 1, 256));
    assertCondition(new Set(outputLabels).size === outputLabels.length, "quote output_labels must be unique");
    assertCondition(commitment.external_side_effects_allowed === false, "quote external side effects must remain false");
    assertCondition(commitment.wallet_access_allowed === false, "quote wallet access must remain false");
    assertCondition(commitment.money_movement_allowed === false, "quote money movement must remain false");
    const terms = requireRecord(root.terms, "quote_envelope.terms");
    requireExactKeys(terms, "quote_envelope.terms", [
        "separate_acceptance_required",
        "payment_required_before_execution",
        "quote_grants_no_execution_authority",
        "provider_authentication_required",
        "quote_is_not_payment_instruction",
    ]);
    for (const key of [
        "separate_acceptance_required",
        "payment_required_before_execution",
        "quote_grants_no_execution_authority",
        "provider_authentication_required",
        "quote_is_not_payment_instruction",
    ]) {
        assertCondition(terms[key] === true, `quote_envelope.terms.${key} must be true`);
    }
    const nonce = requireString(root.nonce, "quote_envelope.nonce", NONCE_PATTERN, 1, 128);
    const quoteId = requireString(root.quote_id, "quote_envelope.quote_id", QUOTE_ID_PATTERN, 73, 73);
    const draft = {
        marker: AGENT_PAID_WORK_QUOTE_MARKER,
        version: 1,
        work_order_id: workOrderId,
        created_at_utc: createdAt,
        expires_at_utc: expiresAt,
        provider: {
            provider_id: providerId,
            capability_id: capabilityId,
        },
        commercial: {
            quote_asset: quoteAsset,
            total,
            payment_rail_id: paymentRailId,
        },
        execution_commitment: {
            max_runtime_seconds: maxRuntime,
            max_output_bytes: maxOutput,
            output_labels: outputLabels,
            external_side_effects_allowed: false,
            wallet_access_allowed: false,
            money_movement_allowed: false,
        },
        terms: {
            separate_acceptance_required: true,
            payment_required_before_execution: true,
            quote_grants_no_execution_authority: true,
            provider_authentication_required: true,
            quote_is_not_payment_instruction: true,
        },
        nonce,
    };
    const expectedQuoteId = `voidawq1_${sha256Text(canonicalJson(draft))}`;
    assertCondition(quoteId === expectedQuoteId, "quote_id does not match canonical quote payload");
    assertCondition(workOrderId === workOrder.work_order_id, "quote work_order_id does not match the supplied work order");
    assertCondition(workOrderId === handoffPacket.source.work_order_id, "quote work_order_id does not match the quote handoff");
    assertCondition(capabilityId === workOrder.service.capability_id, "quote capability does not match the work order");
    assertCondition(capabilityId === handoffPacket.quote_constraints.capability_id, "quote capability does not match the handoff constraints");
    assertCondition(quoteAsset === workOrder.commercial.quote_asset, "quote asset does not match the work-order quote asset");
    assertCondition(decimalUnits(total, "quote total")
        <= decimalUnits(workOrder.commercial.max_total, "work-order maximum total"), "quote total exceeds the work-order maximum");
    assertCondition(maxRuntime <= workOrder.execution_limits.max_runtime_seconds, "quote runtime exceeds the work-order maximum");
    assertCondition(maxOutput <= workOrder.execution_limits.max_output_bytes, "quote output bytes exceed the work-order maximum");
    assertCondition(JSON.stringify(outputLabels)
        === JSON.stringify(workOrder.service.expected_outputs), "quote output labels do not match the work order");
    assertCondition(Date.parse(createdAt) >= Date.parse(workOrder.created_at_utc), "quote cannot predate the work order");
    assertCondition(Date.parse(createdAt) >= Date.parse(handoffPacket.created_at_utc), "quote cannot predate the quote handoff");
    assertCondition(Date.parse(expiresAt) <= Date.parse(workOrder.expires_at_utc), "quote cannot outlive the work order");
    assertCondition(Date.parse(expiresAt) <= Date.parse(handoffPacket.expires_at_utc), "quote cannot outlive the quote handoff");
    return {
        ...draft,
        quote_id: quoteId,
    };
}
export function validatePublicAgentServiceProviderQuoteResponseV1(value) {
    const root = requireRecord(value, "provider quote response");
    requireExactKeys(root, "provider quote response", [
        "marker",
        "version",
        "response_nonce",
        "quote_handoff_input",
        "quote_envelope",
    ]);
    assertCondition(root.marker === PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_MARKER, "provider quote response marker mismatch");
    assertCondition(root.version === 1, "provider quote response version mismatch");
    const responseNonce = requireString(root.response_nonce, "response_nonce", /^[A-Za-z0-9._:-]{8,128}$/, 8, 128);
    const handoffInput = validatePublicAgentServiceSubmissionQuoteHandoffV1(root.quote_handoff_input);
    return {
        marker: PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_MARKER,
        version: PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_VERSION,
        response_nonce: responseNonce,
        quote_handoff_input: handoffInput,
        quote_envelope: root.quote_envelope,
    };
}
export function materializePublicAgentServiceProviderQuoteResponseV1(inputValue, catalogValue) {
    const input = validatePublicAgentServiceProviderQuoteResponseV1(inputValue);
    const handoffPacket = materializePublicAgentServiceSubmissionQuoteHandoffV1(input.quote_handoff_input, catalogValue);
    const submission = materializePublicAgentServiceOrderSubmissionV1(input.quote_handoff_input.submission_input, catalogValue);
    const workOrder = submission.request.work_order;
    const quote = validateQuoteEnvelope(input.quote_envelope, workOrder, handoffPacket);
    const packetWithoutId = {
        marker: PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_PACKET_MARKER,
        version: PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_VERSION,
        status: handoffPacket.status === "example_only"
            ? "example_only"
            : "provider_authentication_required",
        response_nonce: input.response_nonce,
        source: {
            catalog_fingerprint_sha256: handoffPacket.source.catalog_fingerprint_sha256,
            handoff_id: handoffPacket.handoff_id,
            work_order_id: handoffPacket.source.work_order_id,
            submission_id: handoffPacket.source.submission_id,
            request_sha256: handoffPacket.source.request_sha256,
            receipt_id: handoffPacket.source.receipt_id,
            quote_id: quote.quote_id,
        },
        provider_claim: {
            provider_id: quote.provider.provider_id,
            capability_id: quote.provider.capability_id,
        },
        quote_envelope: quote,
        authentication: {
            mode: "unverified_declarative_provider",
            provider_authentication_verified: false,
            separately_authenticated_transport_required: true,
        },
        acceptance_gate: {
            eligible_for_acceptance: false,
            reason: "provider_authentication_required",
            separate_acceptance_required: true,
            requester_authentication_required: true,
            provider_authentication_required: true,
        },
        authority: {
            provider_selection: false,
            provider_authentication: false,
            quote_generation: false,
            quote_submission: false,
            quote_acceptance: false,
            payment_authorization: false,
            payment_execution: false,
            work_execution_authorization: false,
            work_dispatch: false,
            wallet_access: false,
            signing: false,
            transaction_broadcast: false,
            work_credit_write: false,
            runtime_mutation: false,
            money_movement: false,
        },
    };
    return {
        ...packetWithoutId,
        response_id: PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_ID_PREFIX
            + sha256Text(canonicalJson(packetWithoutId)),
    };
}
export function verifyPublicAgentServiceProviderQuoteResponseV1(inputValue, catalogValue, packetValue) {
    const expected = materializePublicAgentServiceProviderQuoteResponseV1(inputValue, catalogValue);
    assertCondition(isRecord(packetValue), "provider quote response packet must be an object");
    assertCondition(canonicalJson(packetValue) === canonicalJson(expected), "provider quote response packet does not match its source evidence");
    assertCondition(RESPONSE_ID_PATTERN.test(expected.response_id), "provider quote response ID format mismatch");
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
        "  tsx scripts/public_agent_service_provider_quote_response_v1.ts materialize <input.json> <response-packet.json>",
        "  tsx scripts/public_agent_service_provider_quote_response_v1.ts verify <input.json> <response-packet.json>",
    ].join("\n"));
}
function main() {
    const [mode, inputPath, packetPath, ...extra] = process.argv.slice(2);
    assertCondition(extra.length === 0, "unexpected arguments");
    assertCondition(Boolean(inputPath && packetPath), "input and packet paths are required");
    const catalog = readJson("ops/public/agent-services-v1/catalog.json");
    const input = readJson(inputPath);
    if (mode === "materialize") {
        const packet = materializePublicAgentServiceProviderQuoteResponseV1(input, catalog);
        fs.writeFileSync(path.resolve(packetPath), `${JSON.stringify(packet, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
        console.log(`marker=${packet.marker}`);
        console.log(`response_id=${packet.response_id}`);
        console.log(`status=${packet.status}`);
        console.log(`handoff_id=${packet.source.handoff_id}`);
        console.log(`quote_id=${packet.source.quote_id}`);
        console.log(`provider_id=${packet.provider_claim.provider_id}`);
        console.log("provider_authentication_verified=false");
        console.log("eligible_for_acceptance=false");
        console.log("provider_selection=false");
        console.log("provider_authentication=false");
        console.log("quote_generation=false");
        console.log("quote_submission=false");
        console.log("quote_acceptance=false");
        console.log("payment_authorization=false");
        console.log("payment_execution=false");
        console.log("work_dispatch=false");
        console.log("http_submission=false");
        console.log("credential_change=false");
        console.log("runtime_mutation=false");
        console.log("money_movement=false");
        console.log(`output=${path.resolve(packetPath)}`);
        return;
    }
    if (mode === "verify") {
        const packet = readJson(packetPath);
        const result = verifyPublicAgentServiceProviderQuoteResponseV1(input, catalog, packet);
        console.log(`marker=${result.marker}`);
        console.log(`response_id=${result.response_id}`);
        console.log(`status=${result.status}`);
        console.log("quote_response_bound=yes");
        console.log("provider_authentication_verified=false");
        console.log("eligible_for_acceptance=false");
        console.log("provider_selection=false");
        console.log("provider_authentication=false");
        console.log("quote_generation=false");
        console.log("quote_submission=false");
        console.log("quote_acceptance=false");
        console.log("payment_authorization=false");
        console.log("payment_execution=false");
        console.log("work_dispatch=false");
        console.log("http_submission=false");
        console.log("credential_change=false");
        console.log("runtime_mutation=false");
        console.log("money_movement=false");
        return;
    }
    usage();
}
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
