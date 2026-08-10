import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  blockHash,
  blockHeaderBytes,
  computeRoots,
  nodeIdFromPubPEM,
  ZERO_HASH_64,
} from "../src/chain/block.js";
import type { Block } from "../src/chain/block.js";
import { SegStore } from "../src/chain/seg_store.js";

const SEGMENT_SPAN = 10_000;
const LAST_BLOCK_NUMBER = SEGMENT_SPAN;
const AUTHORITY_ENV_KEYS = [
  "VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED",
  "VOID_REQUIRE_TRUSTED_BLOCK_PROPOSER",
] as const;

const authorityEnvBefore = new Map(
  AUTHORITY_ENV_KEYS.map((key) => [key, process.env[key]]),
);
for (const key of AUTHORITY_ENV_KEYS) delete process.env[key];

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "void-segstore-rollover-"));

try {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const proposerPubkey = publicKey.export({ type: "spki", format: "pem" }).toString();
  const proposer = nodeIdFromPubPEM(proposerPubkey);
  const roots = computeRoots([], []);
  const store = new SegStore(dataDir, { sparseEvery: 256 });

  let parentHash = ZERO_HASH_64;
  for (let number = 0; number <= LAST_BLOCK_NUMBER; number += 1) {
    const block: Block = {
      number,
      parentHash,
      timestamp: 1_800_000_000_000 + number,
      txRoot: roots.txRoot,
      blobRoot: roots.blobRoot,
      txs: [],
      blobs: [],
      proposer,
      proposerPubkey,
      sig: "",
    };
    block.sig = crypto.sign(null, blockHeaderBytes(block), privateKey).toString("hex");
    store.saveBlock(block);
    parentHash = blockHash(block);

    if (number > 0 && number % 1_000 === 0) {
      console.log(`[rollover] persisted through block ${number}`);
    }
  }

  const segments = fs
    .readdirSync(path.join(dataDir, "segments"))
    .filter((entry) => /^\d{8}$/.test(entry))
    .sort();
  const expectedSegments = ["00000000", "00010000"];
  if (JSON.stringify(segments) !== JSON.stringify(expectedSegments)) {
    throw new Error(
      `expected segments ${expectedSegments.join(", ")}, got ${segments.join(", ")}`,
    );
  }
  console.log("[rollover] crossed fixed segment boundary:", segments.join(", "));

  const head = store.loadHeadNumber();
  if (head !== LAST_BLOCK_NUMBER) {
    throw new Error(`expected head ${LAST_BLOCK_NUMBER}, got ${head}`);
  }
  console.log("[rollover] head:", head);

  const samples = [0, SEGMENT_SPAN - 1, SEGMENT_SPAN];
  for (const number of samples) {
    const block = store.loadBlock(number);
    if (!block || block.number !== number) {
      throw new Error(`failed to read block ${number}`);
    }
  }
  console.log("[rollover] boundary reads ok:", samples.join(", "));

  let count = 0;
  for (let number = 0; number <= head; number += 1) {
    if (!store.loadBlock(number)) throw new Error(`range missing block ${number}`);
    count += 1;
  }
  if (count !== head + 1) throw new Error(`range expected ${head + 1} got ${count}`);
  console.log("[rollover] range 0..head ok, count=", count);

  const restartedStore = new SegStore(dataDir, { sparseEvery: 256 });
  if (restartedStore.loadHeadNumber() !== head) {
    throw new Error("head mismatch after restart");
  }
  for (const number of samples) {
    if (!restartedStore.loadBlock(number)) {
      throw new Error(`post-restart read failed for block ${number}`);
    }
  }
  console.log("[rollover] restart boundary reads ok");
  console.log("[OK] rollover test passed.");
} finally {
  fs.rmSync(dataDir, { recursive: true, force: true });
  for (const [key, value] of authorityEnvBefore) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
