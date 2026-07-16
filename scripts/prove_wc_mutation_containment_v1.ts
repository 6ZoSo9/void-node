import fs from "node:fs";

function need(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const indexText = fs.readFileSync("src/index.ts", "utf8");
const datanetText = fs.readFileSync("src/http/datanet_routes.ts", "utf8");

need(indexText.includes("// === wc-mutation-containment-v1 BEGIN ==="), "missing containment begin marker");
need(indexText.includes("// === wc-mutation-containment-v1 END ==="), "missing containment end marker");
need(indexText.includes('error: "loopback_required"'), "missing loopback rejection");
need(indexText.includes('error: "explicit_confirmation_required"'), "missing confirmation rejection");
need(indexText.includes("const pathnameRaw ="), "missing raw path normalization input");
need(indexText.includes('pathnameRaw.replace(/\\/+$/, "")'), "missing trailing-slash normalization");
need(indexText.includes(").toLowerCase();"), "missing case normalization");

const rules: Record<string,string> = {
  "/wc/runner/set": "wcRunnerSet",
  "/wc/runner/config": "wcRunnerConfig",
  "/wc/runner/tick": "wcRunnerTick",
  "/__void/operator/wc-public-capability-v1/issue": "wcPublicCapabilityIssue",
  "/wc/redeem": "wcRedeem",
  "/wc/send": "wcSend",
  "/jobs/submit": "jobsSubmit",
  "/__void/jobs-and-datanet-worker/run-once": "jobsWorkerRunOnce",
};

for (const [route, confirmation] of Object.entries(rules)) {
  need(indexText.includes(`"${route}": "${confirmation}"`), `missing guarded route ${route}`);
}

const receiptStart = datanetText.indexOf('router.post("/receipt"');
const receiptEnd = datanetText.indexOf('router.get("/metrics/receipts.prom"', receiptStart);
need(receiptStart >= 0, "missing DataNet receipt route");
need(receiptEnd > receiptStart, "missing DataNet receipt route end");
const receiptSegment = datanetText.slice(receiptStart, receiptEnd);

need(receiptSegment.includes("VOID_DATANET_RECEIPT_ONLY_NO_WC_MUTATION_V1"), "missing receipt-only marker");
need(receiptSegment.includes("const wc_eligible = 0;"), "wc eligibility is not forced to zero");
need(receiptSegment.includes("const wc_award = 0;"), "wc award is not forced to zero");
need(
  receiptSegment.includes("VOID_DATANET_RECEIPT_WC_BRIDGE_DISABLED_V1"),
  "legacy receipt-to-WC bridge is not explicitly disabled"
);
need(
  !receiptSegment.includes("fs.appendFileSync(ledgerFile2"),
  "legacy receipt route can still append to a WC ledger"
);
need(
  !receiptSegment.includes("const wcDir2"),
  "legacy receipt-to-WC bridge implementation remains"
);
need(
  !receiptSegment.includes("if (false)"),
  "dead receipt-to-WC implementation remains behind a false condition"
);

for (const forbidden of [
  "b?.accepted === true",
  "b?.verified === true",
  "Number(b.wc_award",
  "wc_award = Math.min(1_000_000",
]) {
  need(!receiptSegment.includes(forbidden), `caller-controlled WC issuance remains: ${forbidden}`);
}

console.log("VOID_WC_MUTATION_CONTAINMENT_V1_GREEN");
