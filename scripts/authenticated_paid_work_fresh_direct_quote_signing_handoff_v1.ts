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

function readJson(file: string): unknown {
  const resolved = path.resolve(file);
  const metadata = fs.lstatSync(resolved);
  freshDirectQuoteAssertV1(
    !metadata.isSymbolicLink(),
    "symlink input forbidden",
  );
  freshDirectQuoteAssertV1(
    metadata.isFile(),
    "regular file input required",
  );
  freshDirectQuoteAssertV1(
    metadata.size <= FRESH_DIRECT_QUOTE_MAX_JSON_BYTES,
    "JSON input too large",
  );
  return JSON.parse(fs.readFileSync(resolved, "utf8")) as unknown;
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
        readJson(args[0]!),
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
        readJson(args[0]!),
        readJson(args[1]!),
        readJson(args[2]!),
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
    const input = readJson(args[0]!);
    const providerHandoff = readJson(args[1]!);
    const providerSignature = readJson(args[2]!);
    const requesterHandoff = readJson(args[3]!);
    const requesterSignature = readJson(args[4]!);
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
        readJson(args[5]!),
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
