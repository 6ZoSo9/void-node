import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  PAID_DATANET_PUBLIC_PILOT_QUOTE_BRIDGE_CLI_V1_MARKER,
  PAID_DATANET_PUBLIC_PILOT_QUOTE_BRIDGE_V1_SCHEMA,
  bridgePaidDatanetPublicPilotQuoteV1,
  runPaidDatanetPublicPilotQuoteBridgeCliV1,
  type PaidDatanetPublicPilotQuoteBridgeCliIoV1,
  type PaidDatanetPublicPilotQuoteBridgeOperatorInputV1,
} from "./paid_datanet_public_pilot_quote_bridge_cli_v1.js";
import {
  triagePaidDatanetPublicPilotIssueV1,
  type PaidDatanetPublicPilotIssueExportV1,
  type PaidDatanetPublicPilotTriagePacketV1,
} from "./paid_datanet_public_pilot_triage_cli_v1.js";
import {
  PAID_DATANET_QUOTE_PACKET_V1_MARKER,
  PAID_DATANET_QUOTE_PACKET_V1_SCHEMA,
  createPaidDatanetQuotePacketV1,
  verifyPaidDatanetQuotePacketV1,
} from "./paid_datanet_quote_packet_v1.js";

let assertions = 0;

function equal<T>(actual: T, expected: T, message?: string): void {
  assert.equal(actual, expected, message);
  assertions += 1;
}

function deepEqual(
  actual: unknown,
  expected: unknown,
  message?: string,
): void {
  assert.deepEqual(actual, expected, message);
  assertions += 1;
}

function matches(
  actual: string,
  expected: RegExp,
  message?: string,
): void {
  assert.match(actual, expected, message);
  assertions += 1;
}

function includes(
  actual: readonly string[] | string,
  expected: string,
  message?: string,
): void {
  assert.ok(actual.includes(expected), message);
  assertions += 1;
}

function notIncludes(
  actual: readonly string[] | string,
  expected: string,
  message?: string,
): void {
  assert.ok(!actual.includes(expected), message);
  assertions += 1;
}

function checkedBody(
  overrides: Readonly<Record<string, string>> = {},
): string {
  const sections: Readonly<Record<string, string>> = {
    "Paid DataNet service":
      "datanet.object-integrity-check.v1 — DataNet Object Integrity Check",
    "Public project or organization name": "Open Research Archive",
    "Public requester reference": "open-research-archive-pilot-001",
    "Estimated object count": "2",
    "Estimated total bytes": "1048577",
    "Public object references":
      "https://example.org/public-object-1\nsha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    "Desired outcome":
      "Verify that the listed public objects match their published SHA-256 digests.",
    "Desired completion window": "Within 3 days",
    "Quote readiness": "Ready to receive a deterministic quote",
    "Additional public context": "Public quote bridge fixture.",
    "Required acknowledgements": [
      "- [x] I understand this issue and everything I post in it may be publicly visible.",
      "- [x] I confirm I have not included passwords, API keys, private keys, seed phrases, payment credentials, personal data, confidential data, or private dataset contents.",
      "- [x] I have the right to submit every referenced object, URL, manifest, and dataset reference for this requested service.",
      "- [x] I understand submission does not create a contract, collect payment, guarantee acceptance, or authorize work.",
      "- [x] I understand an operator must review the request, issue the deterministic quote, provide approved payment instructions separately, verify payment evidence, and explicitly admit the work before execution.",
    ].join("\n"),
    ...overrides,
  };

  return Object.entries(sections)
    .map(([label, value]) => `### ${label}\n\n${value}`)
    .join("\n\n");
}

function readyIssue(
  overrides: Partial<PaidDatanetPublicPilotIssueExportV1> = {},
  body = checkedBody(),
): PaidDatanetPublicPilotIssueExportV1 {
  return {
    number: 718,
    title: "[Paid DataNet Pilot]: Open Research Archive",
    body,
    url: "https://github.com/6ZoSo9/void-node/issues/718",
    author: {
      login: "public-customer-example",
    },
    createdAt: "2026-07-24T22:30:00.000Z",
    labels: [],
    ...overrides,
  };
}

function triagePacket(
  issue: PaidDatanetPublicPilotIssueExportV1 = readyIssue(),
): PaidDatanetPublicPilotTriagePacketV1 {
  const text = JSON.stringify(issue);
  return triagePaidDatanetPublicPilotIssueV1(issue, text);
}

function bridge(
  packet: unknown = triagePacket(),
  operatorInput: PaidDatanetPublicPilotQuoteBridgeOperatorInputV1 = {
    issuer_name: "VOID Network",
    operator_cost_basis_cents: 500,
    requested_at_ms: 1780000000000,
  },
) {
  const text = JSON.stringify(packet);
  return bridgePaidDatanetPublicPilotQuoteV1(packet, text, operatorInput);
}

function mutableClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const ready = bridge();
equal(ready.schema, PAID_DATANET_PUBLIC_PILOT_QUOTE_BRIDGE_V1_SCHEMA);
equal(ready.marker, PAID_DATANET_PUBLIC_PILOT_QUOTE_BRIDGE_CLI_V1_MARKER);
equal(ready.disposition, "DRAFT_QUOTE_INPUT");
matches(ready.bridge_id, /^[0-9a-f]{64}$/);
matches(ready.source.triage_packet_sha256, /^[0-9a-f]{64}$/);
matches(ready.source.triage_id ?? "", /^[0-9a-f]{64}$/);
matches(ready.source.issue_export_sha256 ?? "", /^[0-9a-f]{64}$/);
matches(ready.source.issue_body_sha256 ?? "", /^[0-9a-f]{64}$/);
equal(ready.source.issue_number, 718);
equal(
  ready.source.issue_url,
  "https://github.com/6ZoSo9/void-node/issues/718",
);
equal(ready.target.quote_packet_schema, PAID_DATANET_QUOTE_PACKET_V1_SCHEMA);
equal(ready.target.quote_packet_marker, PAID_DATANET_QUOTE_PACKET_V1_MARKER);
equal(ready.operator_input.issuer_name, "VOID Network");
equal(ready.operator_input.currency, "USD_CENTS");
equal(ready.operator_input.operator_cost_basis_cents, 500);
equal(ready.operator_input.requested_at_ms, 1780000000000);
assert.ok(ready.draft_quote_input !== null);
assertions += 1;
const draft = ready.draft_quote_input;
equal(draft.issuer_name, "VOID Network");
equal(draft.customer_name, "Open Research Archive");
equal(draft.customer_reference, "open-research-archive-pilot-001");
equal(
  draft.quote_request.request_id.startsWith("pilot-718-"),
  true,
);
equal(draft.quote_request.requester_id, "open-research-archive-pilot-001");
equal(
  draft.quote_request.service_code,
  "datanet.object-integrity-check.v1",
);
equal(draft.quote_request.object_count, 2);
equal(draft.quote_request.total_bytes, 1048577);
equal(draft.quote_request.operator_cost_basis_cents, 500);
equal(draft.quote_request.requested_at_ms, 1780000000000);
equal(ready.quote_packet_cli_argv.length, 22);
deepEqual(ready.quote_packet_cli_argv.slice(0, 4), [
  "--issuer-name",
  "VOID Network",
  "--customer-name",
  "Open Research Archive",
]);
includes(ready.quote_packet_cli_argv, "--customer-reference");
includes(ready.quote_packet_cli_argv, "--operator-cost-basis-cents");
includes(ready.quote_packet_cli_argv, "500");
includes(ready.quote_packet_cli_argv, "--requested-at-ms");
includes(ready.quote_packet_cli_argv, "1780000000000");
equal(ready.checks.triage_schema_valid, true);
equal(ready.checks.triage_marker_valid, true);
equal(ready.checks.triage_disposition_ready, true);
equal(ready.checks.triage_id_valid, true);
equal(ready.checks.triage_source_binding_valid, true);
equal(ready.checks.triage_request_complete, true);
equal(ready.checks.triage_quote_seed_complete, true);
equal(ready.checks.triage_controls_valid, true);
equal(ready.checks.triage_has_no_hold_reasons, true);
equal(ready.checks.service_recognized, true);
equal(ready.checks.service_scope_within_catalog_bounds, true);
equal(ready.checks.operator_issuer_valid, true);
equal(ready.checks.operator_cost_basis_valid, true);
equal(ready.checks.requested_at_ms_valid, true);
deepEqual(ready.hold_reasons, []);
equal(ready.controls.deterministic_quote_bridge, true);
equal(ready.controls.triage_packet_input_only, true);
equal(ready.controls.stdout_output_only, true);
equal(ready.controls.triage_binding_required, true);
equal(ready.controls.operator_pricing_input_required, true);
equal(ready.controls.operator_review_required, true);
equal(ready.controls.canonical_draft_quote_input_enabled, true);
equal(ready.controls.quote_issued_by_cli, false);
equal(ready.controls.quote_approved_by_cli, false);
equal(ready.controls.github_api_access_enabled, false);
equal(ready.controls.network_access_enabled, false);
equal(ready.controls.filesystem_write_enabled, false);
equal(ready.controls.payment_collection_enabled, false);
equal(ready.controls.execution_enabled, false);
equal(ready.controls.wc_mutation_enabled, false);
equal(ready.controls.treasury_access_enabled, false);
equal(Object.isFrozen(ready), true);
equal(Object.isFrozen(ready.source), true);
equal(Object.isFrozen(ready.target), true);
equal(Object.isFrozen(ready.operator_input), true);
equal(Object.isFrozen(ready.draft_quote_input), true);
equal(Object.isFrozen(ready.draft_quote_input?.quote_request), true);
equal(Object.isFrozen(ready.quote_packet_cli_argv), true);
equal(Object.isFrozen(ready.checks), true);
equal(Object.isFrozen(ready.hold_reasons), true);
equal(Object.isFrozen(ready.controls), true);

const repeated = bridge();
deepEqual(repeated, ready);
equal(repeated.bridge_id, ready.bridge_id);

const quotePacket = createPaidDatanetQuotePacketV1(draft);
equal(verifyPaidDatanetQuotePacketV1(quotePacket), true);
equal(quotePacket.issuer.display_name, "VOID Network");
equal(quotePacket.customer.display_name, "Open Research Archive");
equal(
  quotePacket.customer.customer_reference,
  "open-research-archive-pilot-001",
);
equal(quotePacket.quote.service_code, "datanet.object-integrity-check.v1");
equal(quotePacket.quote.request.object_count, 2);
equal(quotePacket.quote.request.total_bytes, 1048577);
equal(quotePacket.quote.pricing.operator_cost_basis_cents, 500);
equal(quotePacket.quote.requested_at_ms, 1780000000000);
equal(quotePacket.terms.quote_only, true);
equal(quotePacket.terms.operator_approval_required, true);
equal(quotePacket.terms.payment_collection_enabled, false);
equal(quotePacket.terms.execution_authorized, false);

const zeroCost = bridge(triagePacket(), {
  issuer_name: "VOID Network",
  operator_cost_basis_cents: 0,
  requested_at_ms: 0,
});
equal(zeroCost.disposition, "DRAFT_QUOTE_INPUT");
equal(zeroCost.operator_input.operator_cost_basis_cents, 0);
equal(zeroCost.operator_input.requested_at_ms, 0);
equal(zeroCost.draft_quote_input?.quote_request.operator_cost_basis_cents, 0);
equal(zeroCost.draft_quote_input?.quote_request.requested_at_ms, 0);

const maxPricing = bridge(triagePacket(), {
  issuer_name: "VOID Commercial Operations",
  operator_cost_basis_cents: 100000000,
  requested_at_ms: 8000000000000000,
});
equal(maxPricing.disposition, "DRAFT_QUOTE_INPUT");
equal(maxPricing.checks.operator_cost_basis_valid, true);
equal(maxPricing.checks.requested_at_ms_valid, true);

for (const [serviceCode, serviceName, objects, bytes] of [
  [
    "datanet.object-integrity-check.v1",
    "DataNet Object Integrity Check",
    32,
    256 * 1024 * 1024,
  ],
  [
    "datanet.public-retrieval-evidence.v1",
    "DataNet Public Retrieval Evidence",
    16,
    128 * 1024 * 1024,
  ],
  [
    "datanet.dataset-replication-audit.v1",
    "DataNet Dataset Replication Audit",
    64,
    1024 * 1024 * 1024,
  ],
] as const) {
  const issue = readyIssue(
    {},
    checkedBody({
      "Paid DataNet service": `${serviceCode} — ${serviceName}`,
      "Estimated object count": String(objects),
      "Estimated total bytes": String(bytes),
    }),
  );
  const result = bridge(triagePacket(issue));
  equal(result.disposition, "DRAFT_QUOTE_INPUT");
  equal(result.checks.service_recognized, true);
  equal(result.checks.service_scope_within_catalog_bounds, true);
  equal(result.draft_quote_input?.quote_request.service_code, serviceCode);
  equal(result.draft_quote_input?.quote_request.object_count, objects);
  equal(result.draft_quote_input?.quote_request.total_bytes, bytes);
}

function held(
  mutate: (packet: Record<string, any>) => void,
  reason: string,
) {
  const packet = mutableClone(triagePacket()) as Record<string, any>;
  mutate(packet);
  const result = bridge(packet);
  equal(result.disposition, "HOLD_FOR_OPERATOR_REVIEW");
  equal(result.draft_quote_input, null);
  equal(result.quote_packet_cli_argv.length, 0);
  includes(result.hold_reasons, reason);
  return result;
}

const badSchema = held(
  (packet) => {
    packet.schema = "wrong-schema";
  },
  "triage_schema_invalid",
);
equal(badSchema.checks.triage_schema_valid, false);

const badMarker = held(
  (packet) => {
    packet.marker = "WRONG_MARKER";
  },
  "triage_marker_invalid",
);
equal(badMarker.checks.triage_marker_valid, false);

const notReady = held(
  (packet) => {
    packet.disposition = "HOLD_FOR_CLARIFICATION";
  },
  "triage_not_ready_for_quote",
);
equal(notReady.checks.triage_disposition_ready, false);

const badTriageId = held(
  (packet) => {
    packet.triage_id = "not-a-sha";
  },
  "triage_id_invalid",
);
equal(badTriageId.checks.triage_id_valid, false);

for (const field of ["issue_export_sha256", "issue_body_sha256"] as const) {
  const result = held(
    (packet) => {
      packet.source[field] = "not-a-sha";
    },
    "triage_source_binding_invalid",
  );
  equal(result.checks.triage_source_binding_valid, false);
}

const badIssueNumber = held(
  (packet) => {
    packet.source.issue_number = 0;
  },
  "triage_source_binding_invalid",
);
equal(badIssueNumber.checks.triage_source_binding_valid, false);

const badIssueUrl = held(
  (packet) => {
    packet.source.issue_url = "https://example.org/issues/718";
  },
  "triage_source_binding_invalid",
);
equal(badIssueUrl.checks.triage_source_binding_valid, false);

for (const field of [
  "public_project_name",
  "requester_reference",
  "object_count",
  "total_bytes",
] as const) {
  const result = held(
    (packet) => {
      packet.request[field] = null;
    },
    "triage_request_incomplete",
  );
  equal(result.checks.triage_request_complete, false);
}

for (const field of [
  "request_id",
  "requester_id",
  "service_code",
  "object_count",
  "total_bytes",
] as const) {
  const result = held(
    (packet) => {
      packet.quote_request_seed[field] = null;
    },
    "triage_quote_seed_incomplete",
  );
  equal(result.checks.triage_quote_seed_complete, false);
}

const mismatchedRequester = held(
  (packet) => {
    packet.quote_request_seed.requester_id = "different-requester";
  },
  "triage_quote_seed_incomplete",
);
equal(mismatchedRequester.checks.triage_quote_seed_complete, false);

const mismatchedService = held(
  (packet) => {
    packet.quote_request_seed.service_code =
      "datanet.public-retrieval-evidence.v1";
  },
  "triage_quote_seed_incomplete",
);
equal(mismatchedService.checks.triage_quote_seed_complete, false);

const badControls = held(
  (packet) => {
    packet.controls.quote_issued_by_cli = true;
  },
  "triage_controls_invalid",
);
equal(badControls.checks.triage_controls_valid, false);

const existingHold = held(
  (packet) => {
    packet.hold_reasons = ["customer clarification required"];
  },
  "triage_hold_reasons_present",
);
equal(existingHold.checks.triage_has_no_hold_reasons, false);

const unknownService = held(
  (packet) => {
    packet.request.service_code = "datanet.unknown.v1";
    packet.quote_request_seed.service_code = "datanet.unknown.v1";
  },
  "service_unrecognized",
);
equal(unknownService.checks.service_recognized, false);

const oversizedObjects = held(
  (packet) => {
    packet.request.object_count = 33;
    packet.quote_request_seed.object_count = 33;
  },
  "service_scope_outside_catalog_bounds",
);
equal(oversizedObjects.checks.service_scope_within_catalog_bounds, false);

const badBoundMirror = held(
  (packet) => {
    packet.service_bounds.max_object_count = 999;
  },
  "service_scope_outside_catalog_bounds",
);
equal(badBoundMirror.checks.service_scope_within_catalog_bounds, false);

for (const issuer of ["", " A", "A", "A\nB"] as const) {
  const result = bridge(triagePacket(), {
    issuer_name: issuer,
    operator_cost_basis_cents: 500,
    requested_at_ms: 1780000000000,
  });
  equal(result.disposition, "HOLD_FOR_OPERATOR_REVIEW");
  equal(result.checks.operator_issuer_valid, false);
  includes(result.hold_reasons, "operator_issuer_invalid");
}

for (const cost of [-1, 100000001, Number.NaN] as const) {
  const result = bridge(triagePacket(), {
    issuer_name: "VOID Network",
    operator_cost_basis_cents: cost,
    requested_at_ms: 1780000000000,
  });
  equal(result.disposition, "HOLD_FOR_OPERATOR_REVIEW");
  equal(result.checks.operator_cost_basis_valid, false);
  equal(result.operator_input.operator_cost_basis_cents, null);
  includes(result.hold_reasons, "operator_cost_basis_invalid");
}

for (const requestedAt of [-1, 8000000000000001, Number.NaN] as const) {
  const result = bridge(triagePacket(), {
    issuer_name: "VOID Network",
    operator_cost_basis_cents: 500,
    requested_at_ms: requestedAt,
  });
  equal(result.disposition, "HOLD_FOR_OPERATOR_REVIEW");
  equal(result.checks.requested_at_ms_valid, false);
  equal(result.operator_input.requested_at_ms, null);
  includes(result.hold_reasons, "requested_at_ms_invalid");
}

const nullPacket = bridge(null);
equal(nullPacket.disposition, "HOLD_FOR_OPERATOR_REVIEW");
includes(nullPacket.hold_reasons, "triage_schema_invalid");
includes(nullPacket.hold_reasons, "triage_marker_invalid");
includes(nullPacket.hold_reasons, "triage_not_ready_for_quote");
includes(nullPacket.hold_reasons, "triage_id_invalid");
includes(nullPacket.hold_reasons, "triage_source_binding_invalid");
includes(nullPacket.hold_reasons, "triage_request_incomplete");
includes(nullPacket.hold_reasons, "triage_quote_seed_incomplete");
includes(nullPacket.hold_reasons, "triage_controls_invalid");
includes(nullPacket.hold_reasons, "triage_hold_reasons_present");
includes(nullPacket.hold_reasons, "service_unrecognized");
includes(nullPacket.hold_reasons, "service_scope_outside_catalog_bounds");

const memoryFiles = new Map<string, string>();
const cliPacket = triagePacket();
memoryFiles.set("ready-triage.json", JSON.stringify(cliPacket));
const stdout: string[] = [];
const stderr: string[] = [];
const io: PaidDatanetPublicPilotQuoteBridgeCliIoV1 = {
  readTextFile: (path) => {
    const value = memoryFiles.get(path);
    if (value === undefined) throw new Error(`missing fixture: ${path}`);
    return value;
  },
  statFile: (path) => {
    const value = memoryFiles.get(path);
    return {
      isFile: value !== undefined,
      size: value === undefined ? 0 : Buffer.byteLength(value, "utf8"),
    };
  },
  stdout: (value) => stdout.push(value),
  stderr: (value) => stderr.push(value),
};

const cliExit = runPaidDatanetPublicPilotQuoteBridgeCliV1(
  [
    "--triage-json",
    "ready-triage.json",
    "--issuer-name",
    "VOID Network",
    "--operator-cost-basis-cents",
    "500",
    "--requested-at-ms",
    "1780000000000",
    "--format",
    "pretty",
  ],
  io,
);
equal(cliExit, 0);
equal(stderr.length, 0);
equal(stdout.length, 1);
const cliOutput = JSON.parse(stdout[0] ?? "null");
equal(cliOutput.disposition, "DRAFT_QUOTE_INPUT");
equal(cliOutput.draft_quote_input.issuer_name, "VOID Network");
equal(cliOutput.draft_quote_input.quote_request.operator_cost_basis_cents, 500);
equal(cliOutput.draft_quote_input.quote_request.requested_at_ms, 1780000000000);

stdout.length = 0;
stderr.length = 0;
const compactExit = runPaidDatanetPublicPilotQuoteBridgeCliV1(
  [
    "--triage-json",
    "ready-triage.json",
    "--issuer-name",
    "VOID Network",
    "--operator-cost-basis-cents",
    "0",
    "--requested-at-ms",
    "0",
  ],
  io,
);
equal(compactExit, 0);
equal(stdout.length, 1);
notIncludes(stdout[0] ?? "", "\n  ");

stdout.length = 0;
stderr.length = 0;
const helpExit = runPaidDatanetPublicPilotQuoteBridgeCliV1(["--help"], io);
equal(helpExit, 0);
equal(stderr.length, 0);
equal(stdout.length, 1);
includes(stdout[0] ?? "", PAID_DATANET_PUBLIC_PILOT_QUOTE_BRIDGE_CLI_V1_MARKER);
includes(stdout[0] ?? "", "DRAFT_QUOTE_INPUT");
includes(stdout[0] ?? "", "HOLD_FOR_OPERATOR_REVIEW");
includes(stdout[0] ?? "", "does not issue or approve a quote");

for (const argv of [
  ["--triage-json"],
  ["--unknown", "value"],
  ["--help", "--format", "pretty"],
  ["--triage-json", "ready-triage.json"],
  [
    "--triage-json",
    "ready-triage.json",
    "--issuer-name",
    "VOID Network",
    "--operator-cost-basis-cents",
    "not-an-integer",
    "--requested-at-ms",
    "1",
  ],
  [
    "--triage-json",
    "ready-triage.json",
    "--issuer-name",
    "VOID Network",
    "--operator-cost-basis-cents",
    "1",
    "--requested-at-ms",
    "1",
    "--format",
    "yaml",
  ],
] as const) {
  stdout.length = 0;
  stderr.length = 0;
  const exit = runPaidDatanetPublicPilotQuoteBridgeCliV1(argv, io);
  equal(exit, 1);
  equal(stdout.length, 0);
  equal(stderr.length, 1);
  includes(
    stderr[0] ?? "",
    PAID_DATANET_PUBLIC_PILOT_QUOTE_BRIDGE_CLI_V1_MARKER,
  );
}

stdout.length = 0;
stderr.length = 0;
const missingFileExit = runPaidDatanetPublicPilotQuoteBridgeCliV1(
  [
    "--triage-json",
    "missing.json",
    "--issuer-name",
    "VOID Network",
    "--operator-cost-basis-cents",
    "1",
    "--requested-at-ms",
    "1",
  ],
  io,
);
equal(missingFileExit, 1);
includes(stderr[0] ?? "", "not a regular file");

const malformedIo: PaidDatanetPublicPilotQuoteBridgeCliIoV1 = {
  readTextFile: () => "{not-json",
  statFile: () => ({ isFile: true, size: 9 }),
  stdout: (value) => stdout.push(value),
  stderr: (value) => stderr.push(value),
};
stdout.length = 0;
stderr.length = 0;
const malformedExit = runPaidDatanetPublicPilotQuoteBridgeCliV1(
  [
    "--triage-json",
    "bad.json",
    "--issuer-name",
    "VOID Network",
    "--operator-cost-basis-cents",
    "1",
    "--requested-at-ms",
    "1",
  ],
  malformedIo,
);
equal(malformedExit, 1);
equal(stdout.length, 0);
equal(stderr.length, 1);

const oversizedIo: PaidDatanetPublicPilotQuoteBridgeCliIoV1 = {
  readTextFile: () => "{}",
  statFile: () => ({ isFile: true, size: 2 * 1024 * 1024 + 1 }),
  stdout: (value) => stdout.push(value),
  stderr: (value) => stderr.push(value),
};
stdout.length = 0;
stderr.length = 0;
const oversizedExit = runPaidDatanetPublicPilotQuoteBridgeCliV1(
  [
    "--triage-json",
    "large.json",
    "--issuer-name",
    "VOID Network",
    "--operator-cost-basis-cents",
    "1",
    "--requested-at-ms",
    "1",
  ],
  oversizedIo,
);
equal(oversizedExit, 1);
includes(stderr[0] ?? "", "exceeds 2097152 bytes");

const cliSource = readFileSync(
  "scripts/paid_datanet_public_pilot_quote_bridge_cli_v1.ts",
  "utf8",
);
const proofSource = readFileSync(
  "scripts/prove_paid_datanet_public_pilot_quote_bridge_cli_v1.ts",
  "utf8",
);
const workflow = readFileSync(
  ".github/workflows/paid-datanet-public-pilot-quote-bridge-cli-v1.yml",
  "utf8",
);
const documentation = readFileSync(
  "docs/operators/paid-datanet-public-pilot-quote-bridge-cli-v1.md",
  "utf8",
);

for (const fragment of [
  "VOID_PAID_DATANET_PUBLIC_PILOT_QUOTE_BRIDGE_CLI_V1",
  "void-paid-datanet-public-pilot-quote-bridge-v1",
  "DRAFT_QUOTE_INPUT",
  "HOLD_FOR_OPERATOR_REVIEW",
  "operator_pricing_input_required: true",
  "quote_issued_by_cli: false",
  "quote_approved_by_cli: false",
  "github_api_access_enabled: false",
  "network_access_enabled: false",
  "filesystem_write_enabled: false",
  "payment_collection_enabled: false",
  "execution_enabled: false",
  "wc_mutation_enabled: false",
  "treasury_access_enabled: false",
]) {
  includes(cliSource, fragment);
}

for (const forbidden of [
  "fetch(",
  "node:http",
  "node:https",
  "child_process",
  "writeFileSync",
  "appendFileSync",
  "createWriteStream",
  "execSync",
  "spawnSync",
  "createPaidDatanetQuotePacketV1(",
  "quotePaidDatanetServiceV1(",
]) {
  notIncludes(cliSource, forbidden);
}

for (const fragment of [
  "scripts/paid_datanet_public_pilot_quote_bridge_cli_v1.ts",
  "scripts/prove_paid_datanet_public_pilot_quote_bridge_cli_v1.ts",
  "npx --no-install tsx",
  "permissions:",
  "contents: read",
]) {
  includes(workflow, fragment);
}

for (const fragment of [
  "READY_FOR_QUOTE",
  "DRAFT_QUOTE_INPUT",
  "HOLD_FOR_OPERATOR_REVIEW",
  "operator cost basis",
  "requested-at-ms",
  "does not issue or approve a quote",
  "No GitHub API access",
  "No network access",
  "stdout",
]) {
  includes(documentation, fragment);
}

for (const serviceCode of [
  "datanet.object-integrity-check.v1",
  "datanet.public-retrieval-evidence.v1",
  "datanet.dataset-replication-audit.v1",
]) {
  includes(proofSource, serviceCode);
}

console.log(
  JSON.stringify(
    {
      marker: PAID_DATANET_PUBLIC_PILOT_QUOTE_BRIDGE_CLI_V1_MARKER,
      schema: PAID_DATANET_PUBLIC_PILOT_QUOTE_BRIDGE_V1_SCHEMA,
      assertion_count: assertions,
      ready_bridge_id: ready.bridge_id,
      ready_triage_packet_sha256: ready.source.triage_packet_sha256,
      ready_triage_id: ready.source.triage_id,
      ready_disposition: ready.disposition,
      hold_disposition: badSchema.disposition,
      service_count: 3,
      triage_packet_input_only: true,
      operator_pricing_input_required: true,
      canonical_draft_quote_input_enabled: true,
      triage_binding_required: true,
      quote_issued_by_cli: false,
      quote_approved_by_cli: false,
      github_api_access_enabled: false,
      network_access_enabled: false,
      filesystem_write_enabled: false,
      payment_collection_enabled: false,
      execution_enabled: false,
      wc_mutation_enabled: false,
      treasury_access_enabled: false,
      status: "GREEN",
    },
    null,
    2,
  ),
);
