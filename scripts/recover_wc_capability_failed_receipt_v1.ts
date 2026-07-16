import {
  recoverFailedCapabilityReceiptOnce,
  VerifiedReceiptAcceptanceError,
} from "../src/economic/wc_verified_receipt_acceptance_v1.js";

function valueFor(name: string): string {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return "";
}

const options = {
  dataDir: valueFor("data-dir") || undefined,
  ticketId: valueFor("ticket-id"),
  account: valueFor("account"),
  jobId: valueFor("job-id"),
  receiptId: valueFor("receipt-id"),
  apply: process.argv.includes("--apply"),
  confirmation: valueFor("confirm") || undefined,
};

try {
  const result = await recoverFailedCapabilityReceiptOnce(options);
  console.log(JSON.stringify(result, null, 2));
  console.log(
    options.apply
      ? "VOID_WC_CAPABILITY_FAILED_RECEIPT_RECOVERY_V1_APPLY_GREEN"
      : "VOID_WC_CAPABILITY_FAILED_RECEIPT_RECOVERY_V1_DRY_GREEN",
  );
} catch (error: any) {
  const code =
    error instanceof VerifiedReceiptAcceptanceError
      ? error.code
      : String(error?.message || error);
  console.error(
    JSON.stringify(
      {
        ok: false,
        marker: "VOID_WC_CAPABILITY_FAILED_RECEIPT_RECOVERY_V1",
        error: code,
        dry: !options.apply,
        mutated: false,
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}
