#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Transaction, AbiCoder } from "ethers";

import {
  EXPECTED,
  AUTHORITY_V1,
  verifyRoleAuthoritySingleTransactionSigningAuthorizationV1,
} from "../tools/chain2050-role-authority-single-transaction-signing-authorization-v1.mjs";

const auth = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/chain2050-role-authority-single-transaction-signing-authorization-v1.json",
    "utf8",
  ),
);

const verified =
  verifyRoleAuthoritySingleTransactionSigningAuthorizationV1(auth);

assert.equal(verified.ok, true);
assert.match(
  verified.authorization_id,
  /^voidcrasta1_[0-9a-f]{64}$/,
);
assert.equal(
  verified.exact_unsigned_transaction_hash,
  EXPECTED.unsigned_transaction_hash,
);
assert.equal(
  verified.authority.transaction_broadcast_authorized,
  false,
);
assert.equal(
  verified.authority.deployment_authorized,
  false,
);

const CONTRACT_PATH =
  "contracts/mainnet0/VoidChain2050RoleAuthorityRegistryV1.sol";
const source = fs.readFileSync(CONTRACT_PATH, "utf8");
const tmp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-role-auth-authorized-signing-v1-"),
);
let creation;
try {
  const input = {
    language: "Solidity",
    sources: {
      [CONTRACT_PATH]: { content: source },
    },
    settings: {
      remappings: [],
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "paris",
      viaIR: true,
      debug: { revertStrings: "default" },
      metadata: {
        appendCBOR: true,
        useLiteralContent: true,
        bytecodeHash: "ipfs",
      },
      libraries: {},
      outputSelection: {
        [CONTRACT_PATH]: {
          VoidChain2050RoleAuthorityRegistryV1: [
            "evm.bytecode.object",
          ],
        },
      },
    },
  };
  const env = {
    ...process.env,
    npm_config_cache: path.join(tmp, "npm-cache"),
    npm_config_audit: "false",
    npm_config_fund: "false",
  };
  const install = spawnSync(
    "npm",
    ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--prefix", tmp, "--save-exact", "solc@0.8.20"],
    { encoding: "utf8", timeout: 120000 },
  );
  assert.equal(install.status, 0, install.stderr);

  const compiled = spawnSync(
    path.join(tmp, "node_modules", ".bin", "solcjs"),
    ["--standard-json"],
    {
      input: JSON.stringify(input),
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      timeout: 120000,
    },
  );
  assert.equal(compiled.status, 0, compiled.stderr);
  const raw = compiled.stdout + compiled.stderr;
  const start = raw.indexOf("{");
  assert.ok(start >= 0);
  const output = JSON.parse(raw.slice(start));
  creation =
    "0x" +
    output.contracts[CONTRACT_PATH]
      .VoidChain2050RoleAuthorityRegistryV1
      .evm.bytecode.object.toLowerCase();
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

const creationSha = crypto
  .createHash("sha256")
  .update(Buffer.from(creation.slice(2), "hex"))
  .digest("hex");
assert.equal(
  creationSha,
  "c0844cd0718ed2dc345bbc01107b57dbb2c2129e325066bff399502031a14733",
);

const args = AbiCoder.defaultAbiCoder().encode(
  ["address"],
  ["0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b"],
);
const data = creation + args.slice(2);

const tx = Transaction.from({
  type: 2,
  chainId: 2050,
  nonce: 0,
  gasLimit: 2402981n,
  maxFeePerGas: 3000000000n,
  maxPriorityFeePerGas: 1000000000n,
  to: null,
  value: 0,
  data,
});

assert.equal(
  tx.unsignedHash,
  EXPECTED.unsigned_transaction_hash,
);
assert.equal(tx.signature, null);

const sourceTool = fs.readFileSync(
  "tools/chain2050-role-authority-single-transaction-signing-authorization-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "broadcastTransaction",
  "sendTransaction(",
  "signTransaction(",
  "privateKey",
  "mnemonic",
]) {
  assert.equal(sourceTool.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_CHAIN2050_ROLE_AUTHORITY_SINGLE_TRANSACTION_SIGNING_AUTHORIZATION_V1_GREEN",
);
console.log(
  "authorization_id=" + verified.authorization_id,
);
console.log(
  "signing_request_id=" + verified.signing_request_id,
);
console.log(
  "unsigned_transaction_hash=" + tx.unsignedHash,
);
console.log(
  "unsigned_serialized_transaction=" + tx.unsignedSerialized,
);
console.log("signing_authorized=true");
console.log("one_transaction_only=true");
console.log("broadcast_authorized=false");
console.log("deployment_authorized=false");
