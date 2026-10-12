import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { canonicalJson, } from "./agent_paid_work_order_envelope_v1.js";
import { materializePublicAgentServiceOrderSubmissionV1, validatePublicAgentServiceOrderSubmissionV1, } from "./public_agent_service_order_submission_v1.js";
export const PUBLIC_AGENT_SERVICE_SUBMISSION_QUOTE_HANDOFF_MARKER = "VOID_PUBLIC_AGENT_SERVICE_SUBMISSION_QUOTE_HANDOFF_V1";
export const PUBLIC_AGENT_SERVICE_SUBMISSION_QUOTE_HANDOFF_PACKET_MARKER = "VOID_PUBLIC_AGENT_SERVICE_SUBMISSION_QUOTE_HANDOFF_PACKET_V1";
export const PUBLIC_AGENT_SERVICE_SUBMISSION_QUOTE_HANDOFF_VERSION = 1;
export const PUBLIC_AGENT_SERVICE_SUBMISSION_QUOTE_HANDOFF_ID_PREFIX = "voidawqh1_";
export const AGENT_PAID_WORK_QUOTE_MARKER = "VOID_AGENT_PAID_WORK_QUOTE_ENVELOPE_V1";
const MAX_JSON_BYTES = 8 * 1024 * 1024;
const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const NONCE_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;
const RECEIPT_ID_PATTERN = /^voidawsi1_[0-9a-f]{64}$/;
const ADMISSION_ID_PATTERN = /^voidawsa1_[0-9a-f]{64}$/;
const REGISTRY_ID_PATTERN = /^voidapwcr1_[0-9a-f]{64}$/;
const CREDENTIAL_ID_PATTERN = /^voidapwc1_[0-9a-f]{64}$/;
const WORK_ORDER_ID_PATTERN = /^voidawo1_[0-9a-f]{64}$/;
const SUBMISSION_ID_PATTERN = /^voidawsr1_[0-9a-f]{64}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const AUTHORITY_KEYS = [
    "provider_selected",
    "quote_created",
    "payment_authorized",
    "work_execution_authorized",
    "work_dispatched",
    "wc_award_authorized",
    "wc_ledger_write_authorized",
    "mutation_authority_granted",
    "wallet_or_signer_access_granted",
    "buy_void_fulfillment_authority_granted",
];
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
function assertExactKeys(value, keys, label) {
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
function requireInteger(value, label, minimum) {
    assertCondition(Number.isSafeInteger(value) && Number(value) >= minimum, `${label} must be a safe integer >= ${minimum}`);
    return Number(value);
}
function requireIsoUtc(value, label) {
    const parsed = requireString(value, label, ISO_UTC_PATTERN, 20, 20);
    assertCondition(Number.isFinite(Date.parse(parsed)), `${label} is not a valid UTC timestamp`);
    return parsed;
}
function sha256Text(value) {
    return crypto.createHash("sha256").update(value).digest("hex");
}
function validateAllFalseAuthority(value, label) {
    const authority = requireRecord(value, label);
    assertExactKeys(authority, AUTHORITY_KEYS, label);
    for (const key of AUTHORITY_KEYS) {
        assertCondition(authority[key] === false, `${label}.${key} must be false`);
    }
    return authority;
}
function validateIntakeReceipt(value, expected) {
    const receipt = requireRecord(value, "intake_receipt");
    assertExactKeys(receipt, [
        "marker",
        "version",
        "receipt_id",
        "submission_id",
        "work_order_id",
        "request_payload_sha256",
        "canonical_request_sha256",
        "admission_id",
        "admission",
        "received_at_utc",
        "authorization_verified",
        "authentication",
        "loopback_source",
        "duplicate",
        "authority",
    ], "intake_receipt");
    assertCondition(receipt.marker
        === "VOID_AGENT_PAID_WORK_SUBMISSION_INTAKE_RECEIPT_V1", "intake receipt marker mismatch");
    assertCondition(receipt.version === 1, "intake receipt version mismatch");
    const receiptId = requireString(receipt.receipt_id, "intake_receipt.receipt_id", RECEIPT_ID_PATTERN, 74, 74);
    const submissionId = requireString(receipt.submission_id, "intake_receipt.submission_id", SUBMISSION_ID_PATTERN, 74, 74);
    const workOrderId = requireString(receipt.work_order_id, "intake_receipt.work_order_id", WORK_ORDER_ID_PATTERN, 73, 73);
    requireString(receipt.request_payload_sha256, "intake_receipt.request_payload_sha256", SHA256_PATTERN, 64, 64);
    const canonicalRequestSha256 = requireString(receipt.canonical_request_sha256, "intake_receipt.canonical_request_sha256", SHA256_PATTERN, 64, 64);
    const admissionId = requireString(receipt.admission_id, "intake_receipt.admission_id", ADMISSION_ID_PATTERN, 74, 74);
    const receivedAt = requireIsoUtc(receipt.received_at_utc, "intake_receipt.received_at_utc");
    assertCondition(submissionId === expected.submission_id, "intake receipt submission_id mismatch");
    assertCondition(workOrderId === expected.work_order_id, "intake receipt work_order_id mismatch");
    assertCondition(canonicalRequestSha256 === expected.request_sha256, "intake receipt canonical request SHA mismatch");
    assertCondition(receipt.authorization_verified === true, "intake receipt authorization was not verified");
    assertCondition(receipt.loopback_source === true, "intake receipt must be loopback sourced");
    assertCondition(typeof receipt.duplicate === "boolean", "intake receipt duplicate must be boolean");
    validateAllFalseAuthority(receipt.authority, "intake_receipt.authority");
    const authentication = requireRecord(receipt.authentication, "intake_receipt.authentication");
    assertExactKeys(authentication, [
        "mode",
        "registry_id",
        "credential_id",
        "agent_id",
        "scope",
    ], "intake_receipt.authentication");
    assertCondition(authentication.mode === "credential_registry", "quote handoff requires credential-registry authentication");
    requireString(authentication.registry_id, "intake_receipt.authentication.registry_id", REGISTRY_ID_PATTERN, 75, 75);
    requireString(authentication.credential_id, "intake_receipt.authentication.credential_id", CREDENTIAL_ID_PATTERN, 74, 74);
    requireString(authentication.agent_id, "intake_receipt.authentication.agent_id", /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/, 3, 128);
    assertCondition(authentication.scope === "agent_paid_work_submit", "intake receipt authentication scope mismatch");
    const admission = requireRecord(receipt.admission, "intake_receipt.admission");
    assertExactKeys(admission, [
        "marker",
        "version",
        "admission_id",
        "work_order_id",
        "policy_id",
        "evaluated_at_utc",
        "decision",
        "reason_codes",
        "normalized",
        "authority",
    ], "intake_receipt.admission");
    assertCondition(admission.marker
        === "VOID_AGENT_PAID_WORK_SUBMISSION_ADMISSION_V1", "admission marker mismatch");
    assertCondition(admission.version === 1, "admission version mismatch");
    assertCondition(admission.admission_id === admissionId, "nested admission_id mismatch");
    assertCondition(admission.work_order_id === expected.work_order_id, "nested admission work_order_id mismatch");
    assertCondition(admission.decision === "accepted_for_review", "submission was not accepted for review");
    assertCondition(Array.isArray(admission.reason_codes)
        && admission.reason_codes.length === 0, "accepted admission must have no reason codes");
    validateAllFalseAuthority(admission.authority, "intake_receipt.admission.authority");
    const normalized = requireRecord(admission.normalized, "intake_receipt.admission.normalized");
    assertExactKeys(normalized, [
        "capability_id",
        "quote_asset",
        "max_total",
        "max_runtime_seconds",
        "max_output_bytes",
        "input_ref_count",
        "expected_output_count",
        "callback_scheme",
        "callback_host",
        "ttl_seconds",
    ], "intake_receipt.admission.normalized");
    assertCondition(normalized.capability_id
        === expected.work_order.service.capability_id, "normalized capability_id mismatch");
    assertCondition(normalized.quote_asset
        === expected.work_order.commercial.quote_asset, "normalized quote_asset mismatch");
    assertCondition(normalized.max_total
        === expected.work_order.commercial.max_total, "normalized max_total mismatch");
    assertCondition(normalized.max_runtime_seconds
        === expected.work_order.execution_limits.max_runtime_seconds, "normalized max_runtime_seconds mismatch");
    assertCondition(normalized.max_output_bytes
        === expected.work_order.execution_limits.max_output_bytes, "normalized max_output_bytes mismatch");
    assertCondition(normalized.input_ref_count
        === expected.work_order.service.input_refs.length, "normalized input_ref_count mismatch");
    assertCondition(normalized.expected_output_count
        === expected.work_order.service.expected_outputs.length, "normalized expected_output_count mismatch");
    assertCondition(normalized.callback_scheme === "https", "normalized callback scheme must be https");
    requireString(normalized.callback_host, "normalized.callback_host", /^[A-Za-z0-9.-]{1,253}$/, 1, 253);
    requireInteger(normalized.ttl_seconds, "normalized.ttl_seconds", 1);
    return {
        receipt_id: receiptId,
        admission_id: admissionId,
        received_at_utc: receivedAt,
    };
}
export function validatePublicAgentServiceSubmissionQuoteHandoffV1(value) {
    const root = requireRecord(value, "quote handoff");
    assertExactKeys(root, [
        "marker",
        "version",
        "evidence_mode",
        "created_at_utc",
        "expires_at_utc",
        "handoff_nonce",
        "submission_input",
        "intake_receipt",
    ], "quote handoff");
    assertCondition(root.marker === PUBLIC_AGENT_SERVICE_SUBMISSION_QUOTE_HANDOFF_MARKER, "quote handoff marker mismatch");
    assertCondition(root.version === 1, "quote handoff version mismatch");
    assertCondition(root.evidence_mode === "example_fixture"
        || root.evidence_mode === "external_receiver_receipt", "unsupported evidence_mode");
    const createdAt = requireIsoUtc(root.created_at_utc, "created_at_utc");
    const expiresAt = requireIsoUtc(root.expires_at_utc, "expires_at_utc");
    assertCondition(Date.parse(expiresAt) > Date.parse(createdAt), "handoff expiry must follow creation");
    const nonce = requireString(root.handoff_nonce, "handoff_nonce", NONCE_PATTERN, 8, 128);
    const submissionInput = validatePublicAgentServiceOrderSubmissionV1(root.submission_input);
    return {
        marker: PUBLIC_AGENT_SERVICE_SUBMISSION_QUOTE_HANDOFF_MARKER,
        version: PUBLIC_AGENT_SERVICE_SUBMISSION_QUOTE_HANDOFF_VERSION,
        evidence_mode: root.evidence_mode,
        created_at_utc: createdAt,
        expires_at_utc: expiresAt,
        handoff_nonce: nonce,
        submission_input: submissionInput,
        intake_receipt: requireRecord(root.intake_receipt, "intake_receipt"),
    };
}
export function materializePublicAgentServiceSubmissionQuoteHandoffV1(inputValue, catalogValue) {
    const input = validatePublicAgentServiceSubmissionQuoteHandoffV1(inputValue);
    const submission = materializePublicAgentServiceOrderSubmissionV1(input.submission_input, catalogValue);
    const workOrder = submission.request.work_order;
    assertCondition(Date.parse(input.created_at_utc)
        >= Date.parse(workOrder.created_at_utc), "handoff cannot predate the work order");
    assertCondition(Date.parse(input.expires_at_utc)
        <= Date.parse(workOrder.expires_at_utc), "handoff cannot outlive the work order");
    const receipt = validateIntakeReceipt(input.intake_receipt, {
        submission_id: submission.submission_id,
        work_order_id: submission.work_order_id,
        request_sha256: submission.request_sha256,
        work_order: workOrder,
    });
    const source = {
        catalog_fingerprint_sha256: submission.catalog_fingerprint_sha256,
        service_id: submission.service_id,
        capability_id: submission.capability_id,
        work_order_id: submission.work_order_id,
        submission_id: submission.submission_id,
        request_sha256: submission.request_sha256,
        receipt_id: receipt.receipt_id,
        admission_id: receipt.admission_id,
        received_at_utc: receipt.received_at_utc,
        authorization_verified: true,
        authentication_mode: "credential_registry",
        authentication_scope: "agent_paid_work_submit",
        admission_decision: "accepted_for_review",
    };
    const quoteConstraints = {
        work_order_id: workOrder.work_order_id,
        capability_id: workOrder.service.capability_id,
        quote_asset: workOrder.commercial.quote_asset,
        max_total: workOrder.commercial.max_total,
        max_runtime_seconds: workOrder.execution_limits.max_runtime_seconds,
        max_output_bytes: workOrder.execution_limits.max_output_bytes,
        output_labels: [...workOrder.service.expected_outputs],
        external_side_effects_allowed: false,
        wallet_access_allowed: false,
        money_movement_allowed: false,
        separate_acceptance_required: true,
        payment_required_before_execution: true,
        quote_grants_no_execution_authority: true,
        provider_authentication_required: true,
        quote_is_not_payment_instruction: true,
        total_must_not_exceed_max_total: true,
        quote_created_no_earlier_than_work_order: true,
        quote_expires_no_later_than_work_order: true,
    };
    const packetWithoutId = {
        marker: PUBLIC_AGENT_SERVICE_SUBMISSION_QUOTE_HANDOFF_PACKET_MARKER,
        version: PUBLIC_AGENT_SERVICE_SUBMISSION_QUOTE_HANDOFF_VERSION,
        status: input.evidence_mode === "external_receiver_receipt"
            ? "ready_for_provider_quote"
            : "example_only",
        created_at_utc: input.created_at_utc,
        expires_at_utc: input.expires_at_utc,
        source,
        quote_contract: {
            marker: AGENT_PAID_WORK_QUOTE_MARKER,
            schema_path: "schemas/agent-paid-work-quote-envelope-v1.schema.json",
            materializer_path: "scripts/agent_paid_work_quote_envelope_v1.ts",
            materializer_export: "materializeAgentPaidWorkQuote",
            provider_supplied_fields: [
                "created_at_utc",
                "expires_at_utc",
                "provider.provider_id",
                "commercial.total",
                "commercial.payment_rail_id",
                "execution_commitment.max_runtime_seconds",
                "execution_commitment.max_output_bytes",
                "nonce",
            ],
        },
        quote_constraints: quoteConstraints,
        authority: {
            provider_selection: false,
            quote_generation: false,
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
    const handoffId = PUBLIC_AGENT_SERVICE_SUBMISSION_QUOTE_HANDOFF_ID_PREFIX
        + sha256Text(canonicalJson({
            ...packetWithoutId,
            handoff_nonce: input.handoff_nonce,
        }));
    return {
        ...packetWithoutId,
        handoff_id: handoffId,
    };
}
export function verifyPublicAgentServiceSubmissionQuoteHandoffV1(inputValue, catalogValue, packetValue) {
    const expected = materializePublicAgentServiceSubmissionQuoteHandoffV1(inputValue, catalogValue);
    assertCondition(isRecord(packetValue), "quote handoff packet must be an object");
    assertCondition(canonicalJson(packetValue) === canonicalJson(expected), "quote handoff packet does not match its source evidence");
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
        "  tsx scripts/public_agent_service_submission_quote_handoff_v1.ts materialize <input.json> <handoff-packet.json>",
        "  tsx scripts/public_agent_service_submission_quote_handoff_v1.ts verify <input.json> <handoff-packet.json>",
    ].join("\n"));
}
function main() {
    const [mode, inputPath, packetPath, ...extra] = process.argv.slice(2);
    assertCondition(extra.length === 0, "unexpected arguments");
    assertCondition(Boolean(inputPath && packetPath), "input and packet paths are required");
    const catalog = readJson("ops/public/agent-services-v1/catalog.json");
    const input = readJson(inputPath);
    if (mode === "materialize") {
        const packet = materializePublicAgentServiceSubmissionQuoteHandoffV1(input, catalog);
        fs.writeFileSync(path.resolve(packetPath), `${JSON.stringify(packet, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
        console.log(`marker=${packet.marker}`);
        console.log(`handoff_id=${packet.handoff_id}`);
        console.log(`status=${packet.status}`);
        console.log(`work_order_id=${packet.source.work_order_id}`);
        console.log(`submission_id=${packet.source.submission_id}`);
        console.log(`request_sha256=${packet.source.request_sha256}`);
        console.log(`receipt_id=${packet.source.receipt_id}`);
        console.log(`quote_marker=${packet.quote_contract.marker}`);
        console.log(`output=${path.resolve(packetPath)}`);
        console.log("provider_selection=false");
        console.log("quote_generation=false");
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
    if (mode === "verify") {
        const packet = readJson(packetPath);
        const result = verifyPublicAgentServiceSubmissionQuoteHandoffV1(input, catalog, packet);
        console.log(`marker=${result.marker}`);
        console.log(`handoff_id=${result.handoff_id}`);
        console.log(`status=${result.status}`);
        console.log("evidence_bound_quote_handoff=yes");
        console.log("provider_selection=false");
        console.log("quote_generation=false");
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
