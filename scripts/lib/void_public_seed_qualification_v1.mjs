import net from "node:net";

// Qualification iterates explicitly pinned DNS addresses itself. Disable Node's
// independent address-family racing so its custom single-address lookup contract
// remains deterministic on supported Node.js majors 22, 24, and 26.
if (typeof net.setDefaultAutoSelectFamily === "function") {
  net.setDefaultAutoSelectFamily(false);
}

export * from "./void_public_seed_common_v1.mjs";
export * from "./void_public_seed_receipt_v1.mjs";
export * from "./void_public_seed_probe_v1.mjs";
