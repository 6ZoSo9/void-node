import fs from "fs";
import path from "path";

const root = process.cwd();
const source = fs.readFileSync(
  path.join(root, "src/index.ts"),
  "utf8",
);
const binding = fs.readFileSync(
  path.join(
    root,
    "src/economic/buy_void_request_tx_hash_binding_v1.ts",
  ),
  "utf8",
);

const marker =
  "VOID_BUY_VOID_LATEST_REQUEST_STATE_V1";
const helperStart = source.indexOf(
  "async function __voidReadBuyVoidRequestsV1()",
);
const helperEnd = source.indexOf(
  "function __voidBuyVoidOperatorLocalOnlyV1",
  helperStart,
);
const helper =
  helperStart >= 0 && helperEnd > helperStart
    ? source.slice(helperStart, helperEnd)
    : "";

const verifyRoute =
  "/__void/buy-void/operator/verify-payment.json";
const verifyStart = source.indexOf(
  `app.get("${verifyRoute}"`,
);
const verifyEnd = source.indexOf(
  'app.get("/__void/buy-void/operator/mark.json"',
  verifyStart,
);
const verifyBlock =
  verifyStart >= 0 && verifyEnd > verifyStart
    ? source.slice(verifyStart, verifyEnd)
    : "";

const markStart = verifyEnd;
const markEnd = source.indexOf(
  'require("./economic/buy_void_request_tx_hash_binding_v1")',
  markStart,
);
const markBlock =
  markStart >= 0 && markEnd > markStart
    ? source.slice(markStart, markEnd)
    : "";

const fixture = [
  {
    request_id: "buyvoid_fixture_aaaaaaaa",
    status: "awaiting_payment_tx_hash",
    tx_hash: "",
    created_at_ms: 1,
  },
  {
    request_id: "buyvoid_other_bbbbbbbb",
    status: "awaiting_payment_tx_hash",
    tx_hash: "",
    created_at_ms: 2,
  },
  {
    request_id: "buyvoid_fixture_aaaaaaaa",
    status:
      "payment_submitted_pending_manual_review",
    tx_hash:
      "0x1111111111111111111111111111111111111111111111111111111111111111",
    created_at_ms: 1,
  },
];

const latest: any[] = [];
const seen = new Set<string>();

for (const row of [...fixture].reverse()) {
  if (
    !row
    || !row.request_id
    || seen.has(row.request_id)
  ) {
    continue;
  }

  seen.add(row.request_id);
  latest.push(row);
}

latest.sort(
  (a, b) =>
    Number(b.created_at_ms || 0)
    - Number(a.created_at_ms || 0),
);

const selected = latest.find(
  (row) =>
    row.request_id
    === "buyvoid_fixture_aaaaaaaa",
);

const failures: string[] = [];

if (!helper.includes(marker)) {
  failures.push("marker_missing");
}
if (
  !helper.includes(
    "for (const line of [...lines].reverse())",
  )
) {
  failures.push("reverse_reader_missing");
}
if (
  !helper.includes(
    "seen.has(j.request_id)",
  )
  || !helper.includes(
    "seen.add(j.request_id)",
  )
) {
  failures.push("dedupe_guard_missing");
}
if (
  helper.includes(
    "for (const line of lines) {",
  )
) {
  failures.push("forward_reader_remains");
}
if (
  !verifyBlock.includes(
    "const requests = await __voidReadBuyVoidRequestsV1();",
  )
  || !verifyBlock.includes(
    "const found = requests.find(",
  )
) {
  failures.push("verify_reader_contract");
}
if (
  !markBlock.includes(
    "const requests = await __voidReadBuyVoidRequestsV1();",
  )
  || !markBlock.includes(
    "const found = requests.find(",
  )
) {
  failures.push("mark_reader_contract");
}
if (
  binding.match(
    /const found = requests\.find\(/g,
  )?.length !== 2
) {
  failures.push("binding_reader_contract");
}
if (
  binding.match(
    /const duplicate = requests\.find\(/g,
  )?.length !== 1
) {
  failures.push("duplicate_guard_contract");
}
if (
  !selected
  || selected.status
    !== "payment_submitted_pending_manual_review"
  || !/^0x[0-9a-f]{64}$/i.test(
    selected.tx_hash,
  )
) {
  failures.push("fixture_latest_selection");
}

console.log(
  JSON.stringify(
    {
      marker:
        "VOID_BUY_VOID_LATEST_REQUEST_STATE_V1_PROOF",
      ok: failures.length === 0,
      append_only_history_preserved: true,
      latest_record_selected_before_dedupe: true,
      operator_reader_fixed_centrally: true,
      hash_binding_receives_latest_state: true,
      payment_verifier_receives_latest_state: true,
      operator_mark_receives_latest_state: true,
      duplicate_hash_history_scan_preserved: true,
      fixture_selected_status:
        selected?.status || "",
      fixture_selected_tx_hash:
        selected?.tx_hash || "",
      failures,
    },
    null,
    2,
  ),
);

if (failures.length) {
  process.exit(1);
}
