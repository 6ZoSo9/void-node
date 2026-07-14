import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const indexPath = path.join(root, "src", "index.ts");
const legacyProofPath = path.join(root, "ops", "participant-economic-proof.sh");
const source = fs.readFileSync(indexPath, "utf8");
const retiredPath = ["/wc", "credit"].join("/");

const fail = (message: string): never => {
  throw new Error(`VOID_WC_GENERIC_CREDIT_ROUTE_RETIRED_V1_FAIL: ${message}`);
};

const routePatterns = [
  `app.post("${retiredPath}"`,
  `app.post('${retiredPath}'`,
  `.post("${retiredPath}"`,
  `.post('${retiredPath}'`,
];

for (const pattern of routePatterns) {
  if (source.includes(pattern)) {
    fail(`retired generic credit route remains: ${pattern}`);
  }
}

if (fs.existsSync(legacyProofPath)) {
  fail("legacy participant proof still depends on caller-selected WC credit");
}

if (!source.includes('app.post("/__void/jobs-and-datanet-worker/run-once"')) {
  fail("verified worker run-once route is missing");
}

if (!source.includes("appendJsonl(ledgerFile(), creditEvt);")) {
  fail("verified worker receipt credit append is missing");
}

if (!source.includes('"/jobs/submit": "jobsSubmit"')) {
  fail("job submission containment rule is missing");
}

if (!source.includes('"/__void/jobs-and-datanet-worker/run-once": "jobsWorkerRunOnce"')) {
  fail("worker run-once containment rule is missing");
}

console.log("VOID_WC_GENERIC_CREDIT_ROUTE_RETIRED_V1_GREEN");
