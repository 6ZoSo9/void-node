import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  PAID_DATANET_PUBLIC_PILOT_TRIAGE_CLI_V1_MARKER,
  PAID_DATANET_PUBLIC_PILOT_TRIAGE_V1_SCHEMA,
  runPaidDatanetPublicPilotTriageCliV1,
  triagePaidDatanetPublicPilotIssueV1,
  type PaidDatanetPublicPilotIssueExportV1,
  type PaidDatanetPublicPilotTriageCliIoV1,
} from "./paid_datanet_public_pilot_triage_cli_v1.js";

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
  if (typeof actual === "string") {
    assert.ok(actual.includes(expected), message);
  } else {
    assert.ok(actual.includes(expected), message);
  }
  assertions += 1;
}

function notIncludes(
  actual: readonly string[] | string,
  expected: string,
  message?: string,
): void {
  if (typeof actual === "string") {
    assert.ok(!actual.includes(expected), message);
  } else {
    assert.ok(!actual.includes(expected), message);
  }
  assertions += 1;
}

function checkedBody(overrides: Readonly<Record<string, string>> = {}): string {
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
    "Additional public context": "Public pilot fixture.",
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
  };
}

function packetFor(issue: PaidDatanetPublicPilotIssueExportV1) {
  const text = JSON.stringify(issue);
  return triagePaidDatanetPublicPilotIssueV1(issue, text);
}

const ready = packetFor(readyIssue());
equal(ready.schema, PAID_DATANET_PUBLIC_PILOT_TRIAGE_V1_SCHEMA);
equal(ready.marker, PAID_DATANET_PUBLIC_PILOT_TRIAGE_CLI_V1_MARKER);
equal(ready.disposition, "READY_FOR_QUOTE");
matches(ready.triage_id, /^[0-9a-f]{64}$/);
matches(ready.source.issue_export_sha256, /^[0-9a-f]{64}$/);
matches(ready.source.issue_body_sha256, /^[0-9a-f]{64}$/);
equal(ready.source.issue_number, 718);
equal(
  ready.source.issue_url,
  "https://github.com/6ZoSo9/void-node/issues/718",
);
equal(ready.source.author_login, "public-customer-example");
equal(ready.source.created_at, "2026-07-24T22:30:00.000Z");
equal(ready.request.service_code, "datanet.object-integrity-check.v1");
equal(ready.request.service_name, "DataNet Object Integrity Check");
equal(ready.request.public_project_name, "Open Research Archive");
equal(ready.request.requester_reference, "open-research-archive-pilot-001");
equal(ready.request.object_count, 2);
equal(ready.request.total_bytes, 1048577);
equal(ready.request.public_object_references.length, 2);
equal(
  ready.request.public_object_references[0],
  "https://example.org/public-object-1",
);
equal(ready.request.desired_completion_window, "Within 3 days");
equal(
  ready.request.quote_readiness,
  "Ready to receive a deterministic quote",
);
equal(ready.service_bounds.max_object_count, 32);
equal(ready.service_bounds.max_total_bytes, 268435456);
equal(ready.service_bounds.within_object_count_limit, true);
equal(ready.service_bounds.within_total_bytes_limit, true);
equal(
  ready.quote_request_seed.request_id,
  `pilot-718-${ready.source.issue_body_sha256.slice(0, 16)}`,
);
equal(
  ready.quote_request_seed.requester_id,
  "open-research-archive-pilot-001",
);
equal(ready.quote_request_seed.operator_cost_basis_cents_required, true);
equal(ready.quote_request_seed.requested_at_ms_required, true);
equal(ready.checks.title_prefix_valid, true);
equal(ready.checks.issue_number_valid, true);
equal(ready.checks.issue_url_valid, true);
equal(ready.checks.issue_author_present, true);
equal(ready.checks.issue_created_at_valid, true);
equal(ready.checks.required_sections_unique, true);
equal(ready.checks.service_recognized, true);
equal(ready.checks.requester_reference_valid, true);
equal(ready.checks.object_count_valid, true);
equal(ready.checks.total_bytes_valid, true);
equal(ready.checks.public_references_valid, true);
equal(ready.checks.quote_readiness_recognized, true);
equal(ready.checks.all_acknowledgements_checked, true);
equal(ready.checks.potential_secret_detected, false);
deepEqual(ready.missing_fields, []);
deepEqual(ready.hold_reasons, []);
equal(ready.controls.deterministic_triage_packet, true);
equal(ready.controls.local_issue_export_input_only, true);
equal(ready.controls.stdout_output_only, true);
equal(ready.controls.github_api_access_enabled, false);
equal(ready.controls.network_access_enabled, false);
equal(ready.controls.filesystem_write_enabled, false);
equal(ready.controls.operator_review_required, true);
equal(ready.controls.quote_issued_by_cli, false);
equal(ready.controls.automatic_quote_approval_enabled, false);
equal(ready.controls.payment_collection_enabled, false);
equal(ready.controls.execution_enabled, false);
equal(ready.controls.wc_mutation_enabled, false);
equal(ready.controls.treasury_access_enabled, false);
equal(Object.isFrozen(ready), true);
equal(Object.isFrozen(ready.request), true);
equal(Object.isFrozen(ready.request.public_object_references), true);
equal(Object.isFrozen(ready.hold_reasons), true);

const repeated = packetFor(readyIssue());
deepEqual(repeated, ready);
equal(repeated.triage_id, ready.triage_id);

const exploring = packetFor(
  readyIssue(
    checkedBody({
      "Quote readiness": "Exploring pricing before deciding",
    }),
  ),
);
equal(exploring.disposition, "READY_FOR_QUOTE");
equal(
  exploring.request.quote_readiness,
  "Exploring pricing before deciding",
);

const retrieval = packetFor(
  readyIssue(
    checkedBody({
      "Paid DataNet service":
        "datanet.public-retrieval-evidence.v1 — DataNet Public Retrieval Evidence",
      "Estimated object count": "16",
      "Estimated total bytes": String(128 * 1024 * 1024),
    }),
  ),
);
equal(retrieval.disposition, "READY_FOR_QUOTE");
equal(retrieval.service_bounds.max_object_count, 16);
equal(retrieval.service_bounds.max_total_bytes, 134217728);

const replication = packetFor(
  readyIssue(
    checkedBody({
      "Paid DataNet service":
        "datanet.dataset-replication-audit.v1 — DataNet Dataset Replication Audit",
      "Estimated object count": "256",
      "Estimated total bytes": String(2048 * 1024 * 1024),
    }),
  ),
);
equal(replication.disposition, "READY_FOR_QUOTE");
equal(replication.service_bounds.max_object_count, 256);
equal(replication.service_bounds.max_total_bytes, 2147483648);

const missingOutcome = packetFor(
  readyIssue(checkedBody({ "Desired outcome": "" })),
);
equal(missingOutcome.disposition, "HOLD_FOR_CLARIFICATION");
includes(missingOutcome.missing_fields, "Desired outcome");
includes(missingOutcome.hold_reasons, "MISSING_REQUIRED_FIELDS");
includes(missingOutcome.hold_reasons, "DESIRED_OUTCOME_OUT_OF_BOUNDS");

const invalidTitle = packetFor({
  ...readyIssue(),
  title: "Open Research Archive",
});
equal(invalidTitle.disposition, "HOLD_FOR_CLARIFICATION");
includes(invalidTitle.hold_reasons, "INVALID_PILOT_ISSUE_TITLE");

const invalidUrl = packetFor({
  ...readyIssue(),
  url: "https://github.com/6ZoSo9/void-node/issues/999",
});
equal(invalidUrl.disposition, "HOLD_FOR_CLARIFICATION");
includes(invalidUrl.hold_reasons, "INVALID_OR_UNBOUND_ISSUE_IDENTITY");

const missingMetadata = packetFor({
  ...readyIssue(),
  author: null,
  createdAt: undefined,
});
equal(missingMetadata.disposition, "HOLD_FOR_CLARIFICATION");
includes(missingMetadata.hold_reasons, "INCOMPLETE_ISSUE_EXPORT_METADATA");

const invalidRequester = packetFor(
  readyIssue(
    checkedBody({
      "Public requester reference": "contains spaces",
    }),
  ),
);
equal(invalidRequester.disposition, "HOLD_FOR_CLARIFICATION");
includes(invalidRequester.hold_reasons, "INVALID_REQUESTER_REFERENCE");
equal(invalidRequester.quote_request_seed.requester_id, null);

for (const invalid of ["0", "-1", "1.5", "01", "abc", "9007199254740992"]) {
  const packet = packetFor(
    readyIssue(checkedBody({ "Estimated object count": invalid })),
  );
  equal(packet.disposition, "HOLD_FOR_CLARIFICATION");
  includes(packet.hold_reasons, "INVALID_DECLARED_SCOPE_NUMBERS");
  equal(packet.request.object_count, null);
}

const tooManyObjects = packetFor(
  readyIssue(checkedBody({ "Estimated object count": "33" })),
);
equal(tooManyObjects.disposition, "HOLD_FOR_CLARIFICATION");
includes(tooManyObjects.hold_reasons, "OBJECT_COUNT_EXCEEDS_SERVICE_LIMIT");
equal(tooManyObjects.service_bounds.within_object_count_limit, false);

const tooManyBytes = packetFor(
  readyIssue(
    checkedBody({
      "Estimated total bytes": String(256 * 1024 * 1024 + 1),
    }),
  ),
);
equal(tooManyBytes.disposition, "HOLD_FOR_CLARIFICATION");
includes(tooManyBytes.hold_reasons, "TOTAL_BYTES_EXCEEDS_SERVICE_LIMIT");
equal(tooManyBytes.service_bounds.within_total_bytes_limit, false);

for (const reference of [
  "http://127.0.0.1/private",
  "http://10.0.0.2/private",
  "http://192.168.1.4/private",
  "http://172.16.0.2/private",
  "http://localhost/private",
  "https://user:password@example.org/object",
  "file:///etc/passwd",
  "not-a-reference",
]) {
  const packet = packetFor(
    readyIssue(checkedBody({ "Public object references": reference })),
  );
  equal(packet.disposition, "HOLD_FOR_CLARIFICATION");
  includes(
    packet.hold_reasons,
    "PUBLIC_OBJECT_REFERENCES_INVALID_OR_PRIVATE",
  );
  equal(packet.checks.public_references_valid, false);
}

for (const secret of [
  "-----BEGIN " + "PRIVATE KEY-----",
  "AK" + "IA1234567890ABCDEF",
  "gh" + "p_abcdefghijklmnopqrstuvwxyz123456",
  "github_" + "pat_abcdefghijklmnopqrstuvwxyz123456",
  "s" + "k-abcdefghijklmnopqrstuvwxyz123456",
  "xo" + "xb-1234567890-abcdefghijklmnop",
  "password" + ": hunter2",
  "seed phrase" + " = abandon abandon abandon",
]) {
  const packet = packetFor(
    readyIssue(
      checkedBody({
        "Additional public context": secret,
      }),
    ),
  );
  equal(packet.disposition, "HOLD_FOR_CLARIFICATION");
  includes(
    packet.hold_reasons,
    "POTENTIAL_SECRET_OR_CREDENTIAL_DETECTED",
  );
  equal(packet.checks.potential_secret_detected, true);
}

const uncheckedBody = checkedBody({
  "Required acknowledgements": [
    "- [x] I understand this issue and everything I post in it may be publicly visible.",
    "- [ ] I confirm I have not included passwords, API keys, private keys, seed phrases, payment credentials, personal data, confidential data, or private dataset contents.",
    "- [x] I have the right to submit every referenced object, URL, manifest, and dataset reference for this requested service.",
    "- [x] I understand submission does not create a contract, collect payment, guarantee acceptance, or authorize work.",
    "- [x] I understand an operator must review the request, issue the deterministic quote, provide approved payment instructions separately, verify payment evidence, and explicitly admit the work before execution.",
  ].join("\n"),
});
const unchecked = packetFor(readyIssue(uncheckedBody));
equal(unchecked.disposition, "HOLD_FOR_CLARIFICATION");
includes(unchecked.hold_reasons, "REQUIRED_ACKNOWLEDGEMENTS_INCOMPLETE");
equal(unchecked.checks.all_acknowledgements_checked, false);

const unknownService = packetFor(
  readyIssue(
    checkedBody({ "Paid DataNet service": "datanet.unknown.v1" }),
  ),
);
equal(unknownService.disposition, "HOLD_FOR_CLARIFICATION");
includes(unknownService.hold_reasons, "UNKNOWN_SERVICE_CODE");
equal(unknownService.request.service_code, null);
equal(unknownService.service_bounds.max_object_count, null);

const unknownReadiness = packetFor(
  readyIssue(checkedBody({ "Quote readiness": "Charge me now" })),
);
equal(unknownReadiness.disposition, "HOLD_FOR_CLARIFICATION");
includes(unknownReadiness.hold_reasons, "QUOTE_READINESS_UNRECOGNIZED");

const duplicate = packetFor(
  readyIssue(
    `${checkedBody()}\n\n### Estimated object count\n\n3`,
  ),
);
equal(duplicate.disposition, "HOLD_FOR_CLARIFICATION");
includes(duplicate.hold_reasons, "AMBIGUOUS_DUPLICATE_FORM_SECTIONS");
equal(duplicate.checks.required_sections_unique, false);

const changedBody = packetFor(
  readyIssue(
    checkedBody({ "Desired completion window": "Within 4 days" }),
  ),
);
notIncludes(changedBody.hold_reasons, "MISSING_REQUIRED_FIELDS");
equal(changedBody.disposition, "READY_FOR_QUOTE");
equal(changedBody.triage_id === ready.triage_id, false);
equal(
  changedBody.source.issue_body_sha256 === ready.source.issue_body_sha256,
  false,
);

function makeIo(text: string): {
  readonly io: PaidDatanetPublicPilotTriageCliIoV1;
  readonly stdout: string[];
  readonly stderr: string[];
} {
  const stdout: string[] = [];
  const stderr: string[] = [];

  return {
    stdout,
    stderr,
    io: {
      readTextFile: () => text,
      statFile: () => ({
        isFile: true,
        size: Buffer.byteLength(text, "utf8"),
      }),
      stdout: (value: string): void => {
        stdout.push(value);
      },
      stderr: (value: string): void => {
        stderr.push(value);
      },
    },
  };
}

const readyText = JSON.stringify(readyIssue());
const cliReady = makeIo(readyText);
equal(
  runPaidDatanetPublicPilotTriageCliV1(
    ["--input-json", "issue.json", "--format", "pretty"],
    cliReady.io,
  ),
  0,
);
equal(cliReady.stderr.length, 0);
equal(cliReady.stdout.length, 1);
const cliReadyPacket = JSON.parse(cliReady.stdout[0] ?? "null") as {
  disposition?: string;
  triage_id?: string;
};
equal(cliReadyPacket.disposition, "READY_FOR_QUOTE");
equal(cliReadyPacket.triage_id, ready.triage_id);

const cliHelp = makeIo(readyText);
equal(
  runPaidDatanetPublicPilotTriageCliV1(["--help"], cliHelp.io),
  0,
);
equal(cliHelp.stderr.length, 0);
equal(cliHelp.stdout.length, 1);
includes(cliHelp.stdout[0] ?? "", PAID_DATANET_PUBLIC_PILOT_TRIAGE_CLI_V1_MARKER);
includes(cliHelp.stdout[0] ?? "", "performs no GitHub API or network access");

const cliBadJson = makeIo("{");
equal(
  runPaidDatanetPublicPilotTriageCliV1(
    ["--input-json", "bad.json"],
    cliBadJson.io,
  ),
  1,
);
equal(cliBadJson.stdout.length, 0);
equal(cliBadJson.stderr.length, 1);
includes(
  cliBadJson.stderr[0] ?? "",
  PAID_DATANET_PUBLIC_PILOT_TRIAGE_CLI_V1_MARKER,
);

const cliUnknown = makeIo(readyText);
equal(
  runPaidDatanetPublicPilotTriageCliV1(
    ["--input-json", "issue.json", "--unknown", "x"],
    cliUnknown.io,
  ),
  1,
);
includes(cliUnknown.stderr[0] ?? "", "unknown option");

const cliNotFile = makeIo(readyText);
const notFileIo: PaidDatanetPublicPilotTriageCliIoV1 = {
  ...cliNotFile.io,
  statFile: () => ({ isFile: false, size: readyText.length }),
};
equal(
  runPaidDatanetPublicPilotTriageCliV1(
    ["--input-json", "directory"],
    notFileIo,
  ),
  1,
);
includes(cliNotFile.stderr[0] ?? "", "not a regular file");

const cliTooLarge = makeIo(readyText);
const tooLargeIo: PaidDatanetPublicPilotTriageCliIoV1 = {
  ...cliTooLarge.io,
  statFile: () => ({ isFile: true, size: 2 * 1024 * 1024 + 1 }),
};
equal(
  runPaidDatanetPublicPilotTriageCliV1(
    ["--input-json", "large.json"],
    tooLargeIo,
  ),
  1,
);
includes(cliTooLarge.stderr[0] ?? "", "input file exceeds");

const cliSource = readFileSync(
  "scripts/paid_datanet_public_pilot_triage_cli_v1.ts",
  "utf8",
);
const proofSource = readFileSync(
  "scripts/prove_paid_datanet_public_pilot_triage_cli_v1.ts",
  "utf8",
);
const issueForm = readFileSync(
  ".github/ISSUE_TEMPLATE/paid-datanet-pilot-intake-v1.yml",
  "utf8",
);
const workflow = readFileSync(
  ".github/workflows/paid-datanet-public-pilot-triage-cli-v1.yml",
  "utf8",
);
const documentation = readFileSync(
  "docs/operators/paid-datanet-public-pilot-triage-cli-v1.md",
  "utf8",
);

for (const fragment of [
  "VOID_PAID_DATANET_PUBLIC_PILOT_TRIAGE_CLI_V1",
  "READY_FOR_QUOTE",
  "HOLD_FOR_CLARIFICATION",
  "local_issue_export_input_only: true",
  "github_api_access_enabled: false",
  "network_access_enabled: false",
  "filesystem_write_enabled: false",
  "quote_issued_by_cli: false",
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
]) {
  notIncludes(cliSource, forbidden);
}

for (const label of [
  "Paid DataNet service",
  "Public project or organization name",
  "Public requester reference",
  "Estimated object count",
  "Estimated total bytes",
  "Public object references",
  "Desired outcome",
  "Desired completion window",
  "Quote readiness",
  "Required acknowledgements",
]) {
  includes(issueForm, `label: ${label}`);
  includes(cliSource, label);
}

for (const serviceCode of [
  "datanet.object-integrity-check.v1",
  "datanet.public-retrieval-evidence.v1",
  "datanet.dataset-replication-audit.v1",
]) {
  includes(issueForm, serviceCode);
  includes(proofSource, serviceCode);
}

for (const fragment of [
  "npx --no-install tsx",
  "scripts/prove_paid_datanet_public_pilot_triage_cli_v1.ts",
  "permissions:",
  "contents: read",
]) {
  includes(workflow, fragment);
}

for (const fragment of [
  "READY_FOR_QUOTE",
  "HOLD_FOR_CLARIFICATION",
  "gh issue view",
  "local JSON export",
  "No network access",
  "does not issue a quote",
]) {
  includes(documentation, fragment);
}

console.log(
  JSON.stringify(
    {
      marker: PAID_DATANET_PUBLIC_PILOT_TRIAGE_CLI_V1_MARKER,
      schema: PAID_DATANET_PUBLIC_PILOT_TRIAGE_V1_SCHEMA,
      assertion_count: assertions,
      ready_triage_id: ready.triage_id,
      ready_issue_export_sha256: ready.source.issue_export_sha256,
      ready_issue_body_sha256: ready.source.issue_body_sha256,
      ready_disposition: ready.disposition,
      hold_disposition: missingOutcome.disposition,
      service_count: 3,
      local_issue_export_input_only: true,
      deterministic_triage_packet_enabled: true,
      github_api_access_enabled: false,
      network_access_enabled: false,
      filesystem_write_enabled: false,
      quote_issued_by_cli: false,
      automatic_quote_approval_enabled: false,
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
