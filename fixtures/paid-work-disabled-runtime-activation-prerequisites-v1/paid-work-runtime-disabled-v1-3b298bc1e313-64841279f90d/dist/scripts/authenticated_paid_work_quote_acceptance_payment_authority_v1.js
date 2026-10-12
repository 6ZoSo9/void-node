import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { canonicalJson, validateAgentPaidWorkOrderEnvelope, } from "./agent_paid_work_order_envelope_v1.js";
import { validateAgentPaidWorkQuoteEnvelope, } from "./agent_paid_work_quote_envelope_v1.js";
import { materializeAgentPaidWorkAcceptance, validateAgentPaidWorkAcceptanceEnvelope, } from "./agent_paid_work_acceptance_envelope_v1.js";
import { materializeAgentPaidWorkPaymentIntent, validateAgentPaidWorkPaymentIntentEnvelope, } from "./agent_paid_work_payment_intent_envelope_v1.js";
export const AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_MARKER = "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_V1";
export const AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_PACKET_MARKER = "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_PACKET_V1";
export const AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_ID_PREFIX = "voidawqapa1_";
const MAX_JSON_BYTES = 4 * 1024 * 1024;
const ID_PATTERN = /^voidawqapa1_[0-9a-f]{64}$/;
function fail(message) {
    throw new Error(message);
}
function assertCondition(condition, message) {
    if (!condition)
        fail(message);
}
function requireRecord(value, label) {
    assertCondition(typeof value === "object" && value !== null && !Array.isArray(value), `${label} must be an object`);
    return value;
}
function requireExactKeys(value, label, keys) {
    const actual = Object.keys(value).sort();
    const expected = [...keys].sort();
    assertCondition(JSON.stringify(actual) === JSON.stringify(expected), `${label} keys must be exactly: ${expected.join(", ")}`);
}
function requireTrimmedString(value, label, minLength, maxLength) {
    assertCondition(typeof value === "string", `${label} must be a string`);
    assertCondition(value === value.trim(), `${label} must not have surrounding whitespace`);
    assertCondition(value.length >= minLength && value.length <= maxLength, `${label} length must be ${minLength}..${maxLength}`);
    return value;
}
function requirePattern(value, label, pattern, minLength, maxLength) {
    const text = requireTrimmedString(value, label, minLength, maxLength);
    assertCondition(pattern.test(text), `${label} has invalid format`);
    return text;
}
function requireUtc(value, label) {
    const text = requireTrimmedString(value, label, 20, 20);
    assertCondition(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(text), `${label} must be second-precision UTC`);
    const milliseconds = Date.parse(text);
    assertCondition(Number.isFinite(milliseconds), `${label} is invalid`);
    assertCondition(new Date(milliseconds).toISOString() === text.replace("Z", ".000Z"), `${label} is not canonical UTC`);
    return text;
}
function requireDecimal(value, label) {
    const text = requireTrimmedString(value, label, 1, 51);
    assertCondition(/^(0|[1-9]\d{0,31})(?:\.\d{1,18})?$/.test(text), `${label} must be a bounded non-negative decimal string`);
    return text;
}
function requireTrue(record, key, label) {
    assertCondition(record[key] === true, `${label}.${key} must be true`);
}
function validateInputShape(value) {
    const root = requireRecord(value, "input");
    requireExactKeys(root, "input", [
        "marker",
        "version",
        "work_order",
        "quote",
        "acceptance_plan",
        "payment_authority_plan",
        "controls",
        "nonce",
    ]);
    assertCondition(root.marker ===
        AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_MARKER, `marker must be ${AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_MARKER}`);
    assertCondition(root.version === 1, "version must be 1");
    validateAgentPaidWorkOrderEnvelope(root.work_order);
    validateAgentPaidWorkQuoteEnvelope(root.work_order, root.quote);
    const acceptancePlan = requireRecord(root.acceptance_plan, "acceptance_plan");
    requireExactKeys(acceptancePlan, "acceptance_plan", [
        "created_at_utc",
        "expires_at_utc",
        "nonce",
    ]);
    const acceptanceCreatedAt = requireUtc(acceptancePlan.created_at_utc, "acceptance_plan.created_at_utc");
    const acceptanceExpiresAt = requireUtc(acceptancePlan.expires_at_utc, "acceptance_plan.expires_at_utc");
    const acceptanceNonce = requirePattern(acceptancePlan.nonce, "acceptance_plan.nonce", /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/, 1, 128);
    const paymentPlan = requireRecord(root.payment_authority_plan, "payment_authority_plan");
    requireExactKeys(paymentPlan, "payment_authority_plan", [
        "created_at_utc",
        "expires_at_utc",
        "max_fee_total",
        "nonce",
    ]);
    const paymentCreatedAt = requireUtc(paymentPlan.created_at_utc, "payment_authority_plan.created_at_utc");
    const paymentExpiresAt = requireUtc(paymentPlan.expires_at_utc, "payment_authority_plan.expires_at_utc");
    const maxFeeTotal = requireDecimal(paymentPlan.max_fee_total, "payment_authority_plan.max_fee_total");
    const paymentNonce = requirePattern(paymentPlan.nonce, "payment_authority_plan.nonce", /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/, 1, 128);
    const controls = requireRecord(root.controls, "controls");
    const controlKeys = [
        "prepare_only",
        "authenticated_atomic_activation_required",
        "requester_authentication_required",
        "provider_authentication_required",
        "requester_authentication_id_consumption_required",
        "provider_authentication_id_consumption_required",
        "acceptance_id_consumption_required",
        "payment_intent_id_consumption_required",
        "atomic_persistence_receipt_required",
        "single_active_acceptance_per_quote_required",
        "single_active_payment_intent_per_acceptance_required",
        "separate_payment_execution_authorization_required",
        "separate_work_execution_authorization_required",
    ];
    requireExactKeys(controls, "controls", controlKeys);
    for (const key of controlKeys) {
        requireTrue(controls, key, "controls");
    }
    const nonce = requirePattern(root.nonce, "nonce", /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/, 1, 128);
    return {
        marker: AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_MARKER,
        version: 1,
        work_order: root.work_order,
        quote: root.quote,
        acceptance_plan: {
            created_at_utc: acceptanceCreatedAt,
            expires_at_utc: acceptanceExpiresAt,
            nonce: acceptanceNonce,
        },
        payment_authority_plan: {
            created_at_utc: paymentCreatedAt,
            expires_at_utc: paymentExpiresAt,
            max_fee_total: maxFeeTotal,
            nonce: paymentNonce,
        },
        controls: {
            prepare_only: true,
            authenticated_atomic_activation_required: true,
            requester_authentication_required: true,
            provider_authentication_required: true,
            requester_authentication_id_consumption_required: true,
            provider_authentication_id_consumption_required: true,
            acceptance_id_consumption_required: true,
            payment_intent_id_consumption_required: true,
            atomic_persistence_receipt_required: true,
            single_active_acceptance_per_quote_required: true,
            single_active_payment_intent_per_acceptance_required: true,
            separate_payment_execution_authorization_required: true,
            separate_work_execution_authorization_required: true,
        },
        nonce,
    };
}
function buildAcceptanceDraft(input) {
    return {
        marker: "VOID_AGENT_PAID_WORK_ACCEPTANCE_ENVELOPE_V1",
        version: 1,
        work_order_id: input.work_order.work_order_id,
        quote_id: input.quote.quote_id,
        created_at_utc: input.acceptance_plan.created_at_utc,
        expires_at_utc: input.acceptance_plan.expires_at_utc,
        requester: {
            agent_id: input.work_order.requester.agent_id,
        },
        provider: {
            provider_id: input.quote.provider.provider_id,
            capability_id: input.quote.provider.capability_id,
        },
        commercial: {
            quote_asset: input.quote.commercial.quote_asset,
            total: input.quote.commercial.total,
            payment_rail_id: input.quote.commercial.payment_rail_id,
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
        nonce: input.acceptance_plan.nonce,
    };
}
function buildPaymentIntentDraft(input, acceptance) {
    return {
        marker: "VOID_AGENT_PAID_WORK_PAYMENT_INTENT_ENVELOPE_V1",
        version: 1,
        work_order_id: input.work_order.work_order_id,
        quote_id: input.quote.quote_id,
        acceptance_id: acceptance.acceptance_id,
        created_at_utc: input.payment_authority_plan.created_at_utc,
        expires_at_utc: input.payment_authority_plan.expires_at_utc,
        requester: {
            agent_id: input.work_order.requester.agent_id,
        },
        provider: {
            provider_id: input.quote.provider.provider_id,
        },
        commercial: {
            quote_asset: input.quote.commercial.quote_asset,
            total: input.quote.commercial.total,
            max_fee_total: input.payment_authority_plan.max_fee_total,
            payment_rail_id: input.quote.commercial.payment_rail_id,
        },
        authorization: {
            payment_authorization_requested: true,
            exact_quote_total_only: true,
            max_fee_enforced: true,
            max_fee_is_ceiling_not_charge: true,
            actual_fee_evidence_required: true,
            unused_fee_must_not_be_charged: true,
            one_time_use_required: true,
            replay_protection_required: true,
            single_active_payment_intent_per_acceptance_required: true,
            requester_authentication_required: true,
            provider_authentication_required: true,
            destination_resolution_required: true,
            allowlisted_payment_rail_required: true,
            provider_destination_binding_required: true,
            rail_asset_compatibility_required: true,
            separate_payment_execution_required: true,
            payment_amount_cap_enforced: true,
            payment_confirmation_required_before_work_execution: true,
            separate_work_execution_authorization_required: true,
            payment_execution_granted: false,
            work_execution_authorization_granted: false,
            intent_is_not_payment_receipt: true,
            intent_is_not_funds_transfer: true,
            intent_is_not_funds_reservation: true,
        },
        nonce: input.payment_authority_plan.nonce,
    };
}
export function authenticatedPaidWorkQuoteAcceptancePaymentAuthorityIdV1(packet) {
    return `${AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_ID_PREFIX}${createHash("sha256")
        .update(canonicalJson(packet))
        .digest("hex")}`;
}
export function materializeAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1(inputValue) {
    const input = validateInputShape(inputValue);
    const acceptance = materializeAgentPaidWorkAcceptance(input.work_order, input.quote, buildAcceptanceDraft(input));
    validateAgentPaidWorkAcceptanceEnvelope(input.work_order, input.quote, acceptance);
    const paymentIntent = materializeAgentPaidWorkPaymentIntent(input.work_order, input.quote, acceptance, buildPaymentIntentDraft(input, acceptance));
    validateAgentPaidWorkPaymentIntentEnvelope(input.work_order, input.quote, acceptance, paymentIntent);
    const packetWithoutId = {
        marker: AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_PACKET_MARKER,
        version: 1,
        status: "prepared_requires_authenticated_atomic_activation",
        source: {
            work_order_id: input.work_order.work_order_id,
            quote_id: input.quote.quote_id,
            requester_agent_id: input.work_order.requester.agent_id,
            provider_id: input.quote.provider.provider_id,
            capability_id: input.quote.provider.capability_id,
            quote_asset: input.quote.commercial.quote_asset,
            service_total: input.quote.commercial.total,
            max_fee_total: input.payment_authority_plan.max_fee_total,
            payment_rail_id: input.quote.commercial.payment_rail_id,
        },
        prepared_artifacts: {
            acceptance_envelope: acceptance,
            payment_intent_envelope: paymentIntent,
        },
        acceptance_gate: {
            acceptance_candidate_materialized: true,
            quote_terms_recorded_as_accepted: true,
            effective_quote_acceptance: false,
            requester_authentication_verified: false,
            provider_authentication_verified: false,
            requester_authentication_id_consumed: false,
            provider_authentication_id_consumed: false,
            acceptance_id_consumed: false,
            single_active_acceptance_enforced: false,
            atomic_persistence_verified: false,
        },
        payment_authority_gate: {
            payment_intent_candidate_materialized: true,
            payment_authorization_requested: true,
            effective_payment_authorization: false,
            payment_intent_id_consumed: false,
            single_active_payment_intent_enforced: false,
            destination_resolved: false,
            provider_destination_binding_verified: false,
            allowlisted_payment_rail_verified: false,
            rail_asset_compatibility_verified: false,
            payment_execution_authorization_id: null,
            payment_execution_authorized: false,
        },
        next_gate: {
            reason: "requester_provider_authentication_replay_consumption_and_atomic_persistence_required",
            next_action: "authenticate_then_atomically_consume_and_persist_acceptance_and_payment_intent",
            payment_execution_authorization_required_after_activation: true,
            payment_confirmation_required_before_work_execution: true,
            separate_work_execution_authorization_required: true,
        },
        authority: {
            quote_acceptance: false,
            payment_authorization: false,
            payment_execution: false,
            work_execution_authorization: false,
            work_dispatch: false,
            wallet_access: false,
            production_signing: false,
            transaction_construction: false,
            transaction_broadcast: false,
            payment_receipt_creation: false,
            work_credit_write: false,
            void_settlement: false,
            runtime_mutation: false,
            money_movement: false,
        },
        nonce: input.nonce,
    };
    return {
        ...packetWithoutId,
        packet_id: authenticatedPaidWorkQuoteAcceptancePaymentAuthorityIdV1(packetWithoutId),
    };
}
export function verifyAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1(inputValue, packetValue) {
    const expected = materializeAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1(inputValue);
    const packet = requireRecord(packetValue, "packet");
    assertCondition(typeof packet.packet_id === "string" && ID_PATTERN.test(packet.packet_id), "packet_id format mismatch");
    assertCondition(canonicalJson(packetValue) === canonicalJson(expected), "packet does not match source input");
    return expected;
}
function readJson(file) {
    const resolved = path.resolve(file);
    const metadata = fs.lstatSync(resolved);
    assertCondition(!metadata.isSymbolicLink(), "symlink input forbidden");
    assertCondition(metadata.isFile(), "regular file input required");
    assertCondition(metadata.size <= MAX_JSON_BYTES, "JSON input too large");
    return JSON.parse(fs.readFileSync(resolved, "utf8"));
}
function usage() {
    return fail([
        "usage:",
        "  tsx scripts/authenticated_paid_work_quote_acceptance_payment_authority_v1.ts materialize <input.json> <packet.json>",
        "  tsx scripts/authenticated_paid_work_quote_acceptance_payment_authority_v1.ts verify <input.json> <packet.json>",
    ].join("\n"));
}
function main() {
    const [mode, inputPath, packetPath, ...extra] = process.argv.slice(2);
    assertCondition(extra.length === 0, "unexpected arguments");
    assertCondition(Boolean(inputPath && packetPath), "input and packet paths are required");
    const input = readJson(inputPath);
    if (mode === "materialize") {
        const packet = materializeAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1(input);
        fs.writeFileSync(path.resolve(packetPath), `${JSON.stringify(packet, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
        console.log(`marker=${packet.marker}`);
        console.log(`packet_id=${packet.packet_id}`);
        console.log(`status=${packet.status}`);
        console.log(`acceptance_id=${packet.prepared_artifacts.acceptance_envelope.acceptance_id}`);
        console.log(`payment_intent_id=${packet.prepared_artifacts.payment_intent_envelope.payment_intent_id}`);
        console.log("acceptance_candidate_materialized=true");
        console.log("payment_intent_candidate_materialized=true");
        console.log("effective_quote_acceptance=false");
        console.log("effective_payment_authorization=false");
        console.log("payment_execution_authorized=false");
        console.log("work_execution_authorization=false");
        console.log("work_dispatch=false");
        console.log("wallet_access=false");
        console.log("money_movement=false");
        console.log(`output=${path.resolve(packetPath)}`);
        return;
    }
    if (mode === "verify") {
        const packet = readJson(packetPath);
        const result = verifyAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1(input, packet);
        console.log(`marker=${result.marker}`);
        console.log(`packet_id=${result.packet_id}`);
        console.log(`status=${result.status}`);
        console.log("effective_quote_acceptance=false");
        console.log("effective_payment_authorization=false");
        console.log("payment_execution_authorized=false");
        console.log("work_execution_authorization=false");
        console.log("work_dispatch=false");
        console.log("wallet_access=false");
        console.log("money_movement=false");
        return;
    }
    usage();
}
const invokedUrl = process.argv[1]
    ? pathToFileURL(path.resolve(process.argv[1])).href
    : "";
if (import.meta.url === invokedUrl) {
    main();
}
