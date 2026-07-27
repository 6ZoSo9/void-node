import fs from "node:fs";
import {
  acceptPaidWorkEntitlementOnce,
  PaidWorkEntitlementAcceptanceError,
} from "../src/economic/wc_verified_receipt_acceptance_v1.js";

function valueFor(name: string): string {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }
  return "";
}

function required(name: string): string {
  const value = valueFor(name);
  if (!value) throw new Error(`missing --${name}`);
  return value;
}

const reviewPath = required("review");
const entitlementPath = required("entitlement");
const publicKeyPath = required("public-key");

const authority = {
  reviewRaw: fs.readFileSync(reviewPath, "utf8"),
  entitlementRaw: fs.readFileSync(entitlementPath, "utf8"),
  servicePublicKeyPem: fs.readFileSync(publicKeyPath, "utf8"),
};

const options = {
  dataDir: valueFor("data-dir") || undefined,
  expectedSubmissionId: valueFor("submission-id") || undefined,
  expectedTaskId: valueFor("task-id") || undefined,
  expectedAgentId: valueFor("account") || undefined,
  expectedAgentKeyFingerprintSha256:
    valueFor("agent-key-fingerprint-sha256") || undefined,
  expectedReviewSha256:
    valueFor("expected-review-sha256") || undefined,
  expectedEntitlementSha256:
    valueFor("expected-entitlement-sha256") || undefined,
  apply: process.argv.includes("--apply"),
  confirmation: valueFor("confirm") || undefined,
  source: valueFor("source") || "accept_wc_paid_work_entitlement_v1_cli",
};

try {
  const result = await acceptPaidWorkEntitlementOnce(authority, options);
  console.log(JSON.stringify(result, null, 2));
} catch (error: any) {
  if (error instanceof PaidWorkEntitlementAcceptanceError) {
    console.error(JSON.stringify({
      ok: false,
      error: error.code,
      message: error.message,
    }, null, 2));
    process.exitCode = 1;
  } else {
    throw error;
  }
}
