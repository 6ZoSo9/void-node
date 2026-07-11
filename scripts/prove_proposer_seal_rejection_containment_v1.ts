// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as crypto from "node:crypto";

import { Node } from "../src/node_core.js";
import { nodeIdFromPubPEM } from "../src/chain/block.js";

const marker = "VOID_PROPOSER_SEAL_REJECTION_CONTAINMENT_V1";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

function makeKp() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const pubPEM = publicKey.export({ type: "spki", format: "pem" }).toString();
  const nodeId = nodeIdFromPubPEM(pubPEM);
  return { privateKey, publicKey, pubPEM, nodeId };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function proveSealAwaitsRejectedPersistence(): Promise<void> {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-proposer-await-reject-"));
  process.env.DATA_DIR = tmp;
  fs.writeFileSync(path.join(tmp, "head.txt"), "-1\n");

  const kp = makeKp();
  const node = new Node(0, kp, { allowEmptyBlocks: true });
  const rejection = "VOID_TEST_SAVE_BLOCK_REJECTION";

  (node.store as any).saveBlock = async () => {
    throw new Error(rejection);
  };

  let rejected = false;
  let message = "";

  try {
    await node.sealBlock({ allowEmptyOnce: true });
  } catch (err: any) {
    rejected = true;
    message = String(err?.message || err);
  }

  assert(rejected, "sealBlock resolved even though persistence rejected");
  assert(
    message.includes(rejection),
    `sealBlock rejection did not preserve persistence error: ${message}`,
  );
  assert(
    node.store.loadHeadNumber() === -1,
    "rejected persistence unexpectedly advanced the head",
  );
}

async function proveTimerContainsRejectedSeal(): Promise<void> {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-proposer-timer-reject-"));
  process.env.DATA_DIR = tmp;
  fs.writeFileSync(path.join(tmp, "head.txt"), "-1\n");

  const kp = makeKp();
  const node = new Node(0, kp, { allowEmptyBlocks: true });
  const rejection = "VOID_TEST_PROPOSER_TIMER_REJECTION";
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;

  (node as any).sealBlock = async () => {
    throw new Error(rejection);
  };

  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };

  try {
    const started = node.startProposer(300);
    assert(started.ok === true, "proposer timer did not start");

    await delay(450);

    const stopped = node.stopProposer();
    assert(stopped.ok === true, "proposer timer did not stop");
  } finally {
    node.stopProposer();
    console.warn = originalWarn;
  }

  const visible = warnings.some((args) => {
    if (args[0] !== "VOID_REMAINING_RUNTIME_BEST_EFFORT_FAILURE_VISIBLE") {
      return false;
    }

    const detail = args[1] as Record<string, unknown> | undefined;
    return (
      detail?.scope === "proposer-interval-seal" &&
      String(detail?.message || "").includes(rejection)
    );
  });

  assert(
    visible,
    "proposer timer rejection was not contained by the visible runtime-failure logger",
  );
}

async function main(): Promise<void> {
  await proveSealAwaitsRejectedPersistence();
  await proveTimerContainsRejectedSeal();

  console.log(
    `${marker}_GREEN`,
    JSON.stringify({
      sealAwaitedRejectedPersistence: true,
      proposerTimerRejectionContained: true,
      visibleFailureMarker:
        "VOID_REMAINING_RUNTIME_BEST_EFFORT_FAILURE_VISIBLE",
      visibleFailureScope: "proposer-interval-seal",
    }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
