import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  FRESH_DIRECT_QUOTE_MAX_JSON_BYTES,
  readAuthenticatedPaidWorkFreshDirectQuoteJsonV1,
} from "./authenticated_paid_work_fresh_direct_quote_signing_handoff_v1.js";

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}

function expectReject(label: string, callback: () => unknown): void {
  try {
    callback();
  } catch {
    return;
  }
  throw new Error(`expected rejection: ${label}`);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const cliPath = path.join(
  root,
  "scripts/authenticated_paid_work_fresh_direct_quote_signing_handoff_v1.ts",
);
const source = fs.readFileSync(cliPath, "utf8");

for (const fragment of [
  "O_NOFOLLOW",
  "fs.openSync",
  "fs.fstatSync",
  "fs.readSync",
  "fs.closeSync",
]) {
  assertCondition(source.includes(fragment), `secure read primitive missing: ${fragment}`);
}
assertCondition(
  !source.includes("fs.readFileSync(resolved"),
  "path-based reopen remains in secure JSON input reader",
);

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-fresh-direct-quote-io-proof-"),
);
try {
  const regularPath = path.join(temp, "regular.json");
  fs.writeFileSync(regularPath, '{"marker":"regular"}\n', {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
  const regular = readAuthenticatedPaidWorkFreshDirectQuoteJsonV1(
    regularPath,
  ) as { marker?: unknown };
  assertCondition(regular.marker === "regular", "regular JSON read mismatch");

  const symlinkPath = path.join(temp, "symlink.json");
  fs.symlinkSync(regularPath, symlinkPath);
  expectReject("symlink input", () =>
    readAuthenticatedPaidWorkFreshDirectQuoteJsonV1(symlinkPath),
  );

  const directoryPath = path.join(temp, "directory-input");
  fs.mkdirSync(directoryPath, { mode: 0o700 });
  expectReject("directory input", () =>
    readAuthenticatedPaidWorkFreshDirectQuoteJsonV1(directoryPath),
  );

  const oversizedPath = path.join(temp, "oversized.json");
  const oversizedDescriptor = fs.openSync(
    oversizedPath,
    fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL,
    0o600,
  );
  try {
    fs.ftruncateSync(
      oversizedDescriptor,
      FRESH_DIRECT_QUOTE_MAX_JSON_BYTES + 1,
    );
  } finally {
    fs.closeSync(oversizedDescriptor);
  }
  expectReject("oversized input", () =>
    readAuthenticatedPaidWorkFreshDirectQuoteJsonV1(oversizedPath),
  );

  const malformedPath = path.join(temp, "malformed.json");
  fs.writeFileSync(malformedPath, "{not-json}\n", {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
  expectReject("malformed JSON", () =>
    readAuthenticatedPaidWorkFreshDirectQuoteJsonV1(malformedPath),
  );
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log("descriptor_pinned_input_read=true");
console.log("nofollow_symlink_guard=true");
console.log("regular_file_guard=true");
console.log("bounded_stream_read=true");
console.log("malformed_json_rejected=true");
console.log(
  "VOID_AUTHENTICATED_PAID_WORK_FRESH_DIRECT_QUOTE_FILE_IO_HARDENING_V1_PROOF_GREEN=true",
);
