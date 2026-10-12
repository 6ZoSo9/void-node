#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  RESPONSE_REJECTION_TEARDOWN_MS,
  readBoundedBytesOwned,
  readBoundedTextOwned,
} from "../tools/wc-public-response-teardown-v1.mjs";

function headers() {
  return { get: () => null };
}

function rejectingReadBody(cancel) {
  let released = false;
  let cancelCalls = 0;
  const reader = {
    async read() {
      throw new Error("transport_read_failed");
    },
    cancel() {
      cancelCalls += 1;
      return cancel();
    },
    releaseLock() {
      released = true;
    },
  };
  return {
    body: { getReader: () => reader },
    released: () => released,
    cancelCalls: () => cancelCalls,
  };
}

async function expectPrimary(run, expected) {
  let observed = null;
  try {
    await run();
  } catch (error) {
    observed = error instanceof Error ? error.message : String(error);
  }
  assert.equal(observed, expected);
}

async function timed(run) {
  const started = Date.now();
  await run();
  return Date.now() - started;
}

async function exerciseText(cancelFactory) {
  let aborts = 0;
  const stream = rejectingReadBody(cancelFactory);
  await expectPrimary(
    () => readBoundedTextOwned({ headers: headers(), body: stream.body }, {
      maximumBytes: 64,
      abort: () => { aborts += 1; },
    }),
    "response_body_read_failed",
  );
  assert.equal(aborts, 1);
  assert.equal(stream.cancelCalls(), 1);
  assert.equal(stream.released(), true);
}

async function exerciseBytes(cancelFactory) {
  let aborts = 0;
  const stream = rejectingReadBody(cancelFactory);
  await expectPrimary(
    () => readBoundedBytesOwned({ headers: headers(), body: stream.body }, {
      maximumBytes: 64,
      abort: () => { aborts += 1; },
    }),
    "response_body_read_failed",
  );
  assert.equal(aborts, 1);
  assert.equal(stream.cancelCalls(), 1);
  assert.equal(stream.released(), true);
}

async function main() {
  assert.equal(RESPONSE_REJECTION_TEARDOWN_MS, 250);

  await exerciseText(() => Promise.reject(new Error("cancel_rejected")));
  await exerciseBytes(() => Promise.reject(new Error("cancel_rejected")));

  const textNonsettling = await timed(() => exerciseText(() => new Promise(() => {})));
  assert.ok(textNonsettling >= 150, `text read teardown released too early: ${textNonsettling}ms`);
  assert.ok(textNonsettling < 2500, `text read teardown was not bounded: ${textNonsettling}ms`);

  const bytesNonsettling = await timed(() => exerciseBytes(() => new Promise(() => {})));
  assert.ok(bytesNonsettling >= 150, `byte read teardown released too early: ${bytesNonsettling}ms`);
  assert.ok(bytesNonsettling < 2500, `byte read teardown was not bounded: ${bytesNonsettling}ms`);

  const repeated = await timed(async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await exerciseText(() => new Promise(() => {}));
      await exerciseBytes(() => new Promise(() => {}));
    }
  });
  assert.ok(repeated >= 900, `repeated read teardown released too early: ${repeated}ms`);
  assert.ok(repeated < 8000, `repeated read teardown was not bounded: ${repeated}ms`);

  process.stdout.write("VOID_WC_PUBLIC_RESPONSE_READER_READ_TEARDOWN_V1_GREEN\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
