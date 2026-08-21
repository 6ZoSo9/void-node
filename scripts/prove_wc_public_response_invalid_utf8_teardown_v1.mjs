#!/usr/bin/env node

import assert from "node:assert/strict";
import { readBoundedTextOwned } from "../tools/wc-public-response-teardown-v1.mjs";

function headers() {
  return {
    get(name) {
      return name.toLowerCase() === "content-length" ? null : null;
    },
  };
}

function invalidUtf8Body(bytes, cancel) {
  let delivered = false;
  let released = false;
  const reader = {
    async read() {
      if (delivered) return { done: true, value: undefined };
      delivered = true;
      return { done: false, value: new Uint8Array(bytes) };
    },
    cancel,
    releaseLock() {
      released = true;
    },
  };
  return {
    body: { getReader: () => reader },
    released: () => released,
  };
}

function malformedUtf8Body(cancel) {
  return invalidUtf8Body([0xff, 0x61], cancel);
}

function truncatedUtf8Body(cancel) {
  return invalidUtf8Body([0xc2], cancel);
}

async function expectPrimaryInvalidUtf8(body, abort) {
  let observed = null;
  try {
    await readBoundedTextOwned({ headers: headers(), body: body.body }, {
      maximumBytes: 64,
      abort,
    });
  } catch (error) {
    observed = error instanceof Error ? error.message : String(error);
  }
  assert.equal(observed, "response_body_invalid_utf8");
  assert.equal(body.released(), true);
}

async function timed(run) {
  const started = Date.now();
  await run();
  return Date.now() - started;
}

async function proveInvalidUtf8Teardown(label, makeBody) {
  let nonsettlingAbortCount = 0;
  const nonsettling = makeBody(() => new Promise(() => {}));
  const nonsettlingElapsed = await timed(() => expectPrimaryInvalidUtf8(
    nonsettling,
    () => { nonsettlingAbortCount += 1; },
  ));
  assert.equal(nonsettlingAbortCount, 1);
  assert.ok(
    nonsettlingElapsed >= 150,
    `${label} teardown released too early: ${nonsettlingElapsed}ms`,
  );
  assert.ok(
    nonsettlingElapsed < 2500,
    `${label} teardown was not bounded: ${nonsettlingElapsed}ms`,
  );

  let rejectingAbortCount = 0;
  const rejecting = makeBody(() => Promise.reject(new Error("cleanup_failed")));
  await expectPrimaryInvalidUtf8(rejecting, () => { rejectingAbortCount += 1; });
  assert.equal(rejectingAbortCount, 1);

  let repeatedAbortCount = 0;
  const repeatedElapsed = await timed(async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const body = makeBody(() => new Promise(() => {}));
      await expectPrimaryInvalidUtf8(body, () => { repeatedAbortCount += 1; });
    }
  });
  assert.equal(repeatedAbortCount, 3);
  assert.ok(
    repeatedElapsed >= 450,
    `repeated ${label} teardown released too early: ${repeatedElapsed}ms`,
  );
  assert.ok(
    repeatedElapsed < 6000,
    `repeated ${label} teardown was not bounded: ${repeatedElapsed}ms`,
  );
}

async function main() {
  await proveInvalidUtf8Teardown("malformed UTF-8", malformedUtf8Body);
  await proveInvalidUtf8Teardown("truncated UTF-8 finalization", truncatedUtf8Body);

  process.stdout.write("VOID_WC_PUBLIC_RESPONSE_INVALID_UTF8_TEARDOWN_V1_GREEN\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
