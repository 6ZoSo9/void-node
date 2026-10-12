import net from "node:net";
import {
  resolvePublicDns as resolvePublicDnsCommonV1,
} from "./void_public_seed_common_v1.mjs";

// Qualification iterates explicitly pinned DNS addresses itself. Disable Node's
// independent address-family racing so its custom single-address lookup contract
// remains deterministic on supported Node.js majors 22, 24, and 26.
if (typeof net.setDefaultAutoSelectFamily === "function") {
  net.setDefaultAutoSelectFamily(false);
}

export * from "./void_public_seed_common_v1.mjs";
export * from "./void_public_seed_receipt_v1.mjs";
export * from "./void_public_seed_probe_v1.mjs";

// Preserve explicit trust-validation errors from the common resolver, but
// normalize structured DNS transport failures before they reach callers. Node
// DNS errors commonly include the queried hostname in error.message; callers
// must not infer trust invalidity from words that merely occur in that hostname.
export async function resolvePublicDns(hostname, options = {}) {
  try {
    return await resolvePublicDnsCommonV1(hostname, options);
  } catch (error) {
    const code = typeof error?.code === "string" ? error.code.trim() : "";
    if (!code) throw error;

    const normalized = new Error(
      `public seed DNS lookup failed (${code || "unknown"})`,
      { cause: error },
    );
    normalized.code = code;
    throw normalized;
  }
}
