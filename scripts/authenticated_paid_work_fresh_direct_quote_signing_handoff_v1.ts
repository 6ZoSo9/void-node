import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  freshDirectQuoteAssertV1,
  freshDirectQuoteFailV1,
} from "./authenticated_paid_work_fresh_direct_quote_signing_handoff_base_v1.js";
import {
  advanceAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1,
  finalizeAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1,
  prepareAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1,
  verifyAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffFinalV1,
} from "./authenticated_paid_work_fresh_direct_quote_signing_handoff_stages_v1.js";
import {
  FRESH_DIRECT_QUOTE_MAX_JSON_BYTES,
} from "./authenticated_paid_work_fresh_direct_quote_signing_handoff_types_v1.js";

export * from "./authenticated_paid_work_fresh_direct_quote_signing_handoff_types_v1.js";
export * from "./authenticated_paid_work_fresh_direct_quote_signing_handoff_stages_v1.js";

export function readAuthenticatedPaidWorkFreshDirectQuoteJsonV1(
  file: string,
): unknown {
  const resolved = path.resolve(file);
  const noFollow = fs.constants.O_NOFOLLOW;
  freshDirectQuoteAssertV1(
    Number.isInteger(noFollow) && noFollow !== 0,
    "O_NOFOLLOW is unavailable on this platform",
  );

  let descriptor: number;
  try {
    descriptor = fs.openSync(
      resolved,
      fs.constants.O_RDONLY | noFollow,
    );
  } catch (error: unknown) {
    const code =
      error instanceof Error && "code" in error
        ? String((error as NodeJS.ErrnoException).code ?? "")
        : "";
    if (code === "ELOOP") {
      return freshDirectQuoteFailV1("symlink input forbidden");
    }
    throw error;
  }

  try {
    const metadata = fs.fstatSync(descriptor);
    freshDirectQuoteAssertV1(
      metadata.isFile(),
      "regular file input required",
    );
    freshDirectQuoteAssertV1(
      metadata.size <= FRESH_DIRECT_QUOTE_MAX_JSON_BYTES,
      "JSON input too large",
    );

    const chunks: Buffer[] = [];
    const buffer = Buffer.allocUnsafe(64 * 1024);
    let totalBytes = 0;
    for (;;) {
      const remaining = FRESH_DIRECT_QUOTE_MAX_JSON_BYTES - totalBytes;
      const bytesRead = fs.readSync(
        descriptor,
        buffer,
        0,
        Math.min(buffer.length, remaining + 1),
        null,
      );
      if (bytesRead === 0) break;
      totalBytes += bytesRead;
      freshDirectQuoteAssertV1(
        totalBytes <= FRESH_DIRECT_QUOTE_MAX_JSON_BYTES,
        "JSON input too large",
      );
      chunks.push(Buffer.from(buffer.subarray(0, bytesRead)));
    }

    return JSON.parse(
      Buffer.concat(chunks, totalBytes).toString("utf8"),
    ) as unknown;
  } finally {
    fs.closeSync(descriptor);
  }
}

function writeJson(file: string, value: unknown): void {
  fs.writeFileSync(path.resolve(file), `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
}

function usage(): never {
  return freshDirectQuoteFailV1(
    [
      "usage:",
      "  tsx scripts/authenticated_paid_work_fresh_direct_quote_signing_handoff_v1.ts prepare <input.json> <provider-handoff.json>",
      "  tsx scripts/authenticated_paid_work_fresh_direct_quote_signing_handoff_v1.ts advance <input.json> <provider-handoff.json> <provider-signature.json> <requester-handoff.json>",
      "  tsx scripts/authenticated_paid_work_fresh_direct_quote_signing_handoff_v1.ts finalize <input.json> <provider-handoff.json> <provider-signature.json> <requester-handoff.json> <requester-signature.json> <final-handoff.json>",
      "  tsx scripts/authenticated_paid_work_fresh_direct_quote_signing_handoff_v1.ts verify-final <input.json> <provider-handoff.json> <provider-signature.json> <requester-handoff.json> <requester-signature.json> <final-handoff.json>",
    ].join("\n"),
  );
}

function main(): void {
  const [mode, ...args] = process.argv.slice(2);
  if (mode === "prepare") {
    freshDirectQuoteAssertV1(
      args.length === 2,
      "prepare requires input and output paths",
    );
    const packet =
      prepareAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1(
        readAuthenticatedPaidWorkFreshDirectQuoteJsonV1(args[0]!),
      );
    writeJson(args[1]!, packet);
    console.log(`marker=${packet.marker}`);
    console.log(`handoff_id=${packet.handoff_id}`);
    console.log(`status=${packet.status}`);
    console.log(
      `signing_bytes_sha256=${packet.provider_signing_request.signing_bytes_sha256}`,
    );
    console.log("private_key_access=false");
    console.log("quote_acceptance=false");
    console.log("payment_authorization=false");
    console.log("payment_execution=false");
    console.log("money_movement=false");
    return;
  }
  if (mode === "advance") {
    freshDirectQuoteAssertV1(
      args.length === 4,
      "advance requires four paths",
    );
    const packet =
      advanceAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1(
        readAuthenticatedPaidWorkFreshDirectQuoteJsonV1(args[0]!),
        readAuthenticatedPaidWorkFreshDirectQuoteJsonV1(args[1]!),
        readAuthenticatedPaidWorkFreshDirectQuoteJsonV1(args[2]!),
      );
    writeJson(args[3]!, packet);
    console.log(`marker=${packet.marker}`);
    console.log(`handoff_id=${packet.handoff_id}`);
    console.log(`status=${packet.status}`);
    console.log("provider_signature_verified=true");
    console.log(
      `signing_bytes_sha256=${packet.requester_signing_request.signing_bytes_sha256}`,
    );
    console.log("quote_acceptance=false");
    console.log("payment_execution=false");
    console.log("money_movement=false");
    return;
  }
  if (mode === "finalize" || mode === "verify-final") {
    freshDirectQuoteAssertV1(
      args.length === 6,
      `${mode} requires six paths`,
    );
    const input = readAuthenticatedPaidWorkFreshDirectQuoteJsonV1(args[0]!);
    const providerHandoff =
      readAuthenticatedPaidWorkFreshDirectQuoteJsonV1(args[1]!);
    const providerSignature =
      readAuthenticatedPaidWorkFreshDirectQuoteJsonV1(args[2]!);
    const requesterHandoff =
      readAuthenticatedPaidWorkFreshDirectQuoteJsonV1(args[3]!);
    const requesterSignature =
      readAuthenticatedPaidWorkFreshDirectQuoteJsonV1(args[4]!);
    if (mode === "finalize") {
      const packet =
        finalizeAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1(
          input,
          providerHandoff,
          providerSignature,
          requesterHandoff,
          requesterSignature,
        );
      writeJson(args[5]!, packet);
      console.log(`marker=${packet.marker}`);
      console.log(`handoff_id=${packet.handoff_id}`);
      console.log(`status=${packet.status}`);
      console.log(
        `direct_authentication_packet_id=${packet.direct_authentication_packet.packet_id}`,
      );
      console.log("eligible_for_atomic_activation_persistence=true");
      console.log("effective_quote_acceptance=false");
      console.log("effective_payment_authorization=false");
      console.log("payment_execution=false");
      console.log("work_dispatch=false");
      console.log("wallet_access=false");
      console.log("money_movement=false");
      return;
    }
    const result =
      verifyAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffFinalV1(
        input,
        providerHandoff,
        providerSignature,
        requesterHandoff,
        requesterSignature,
        readAuthenticatedPaidWorkFreshDirectQuoteJsonV1(args[5]!),
      );
    console.log(`marker=${result.marker}`);
    console.log(`handoff_id=${result.handoff_id}`);
    console.log(`status=${result.status}`);
    console.log("canonical_final_handoff_verified=true");
    console.log("payment_execution=false");
    console.log("money_movement=false");
    return;
  }
  usage();
}

const invokedUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedUrl) {
  try {
    main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`HOLD: ${message}`);
    process.exitCode = 1;
  }
}
