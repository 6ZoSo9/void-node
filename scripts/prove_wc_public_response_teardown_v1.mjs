#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  RESPONSE_REJECTION_TEARDOWN_MS,
  readBoundedBytesOwned,
  readBoundedTextOwned,
} from "../tools/wc-public-response-teardown-v1.mjs";

const encoder = new TextEncoder();

function headers(contentLength = null) {
  return {
    get(name) {
      if (name.toLowerCase() !== "content-length") return null;
      return contentLength;
    },
  };
}

function bodyWithCancel(cancel) {
  return {
    cancel,
    getReader() {
      throw new Error("reader_should_not_be_requested");
    },
  };
}

function streamedBody({ chunks, cancel }) {
  let index = 0;
  let released = false;
  const reader = {
    async read() {
      if (index >= chunks.length) return { done: true, value: undefined };
      const value = chunks[index];
      index += 1;
      return { done: false, value };
    },
    cancel,
    releaseLock() {
      released = true;
    },
  };
  return {
    body: { getReader: () => reader },
    reader,
    released: () => released,
  };
}

async function expectPrimaryError(run, expected) {
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

const adapterErrorOptions = {
  maximumBytes: 8,
  trimContentLength: false,
  invalidContentLengthError: "upstream_response_invalid_content_length",
  bodyTooLargeError: "upstream_response_too_large",
  invalidChunkError: "upstream_response_invalid_chunk",
  bodyUnavailableError: "upstream_response_body_unavailable",
  bodyUnavailableAsEmpty: true,
};

async function main() {
  assert.equal(RESPONSE_REJECTION_TEARDOWN_MS, 250);

  for (const path of [
    "tools/wc-public-opportunity-discovery-v1.mjs",
    "tools/wc-public-coordinator-readiness-v1.mjs",
  ]) {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
    assert.match(source, /readBoundedTextOwned/u, `${path} must use owned response teardown helper`);
    assert.match(source, /controller\.abort\(reason\)/u, `${path} must abort rejected requests before teardown wait`);
  }

  const adapterSource = readFileSync(
    new URL("../ops/public/public-seed-adapter-v1.mjs", import.meta.url),
    "utf8",
  );
  assert.match(
    adapterSource,
    /readBoundedBytesOwned/u,
    "public adapter must use the shared owned byte-response helper",
  );
  assert.match(
    adapterSource,
    /return \{ response, abort, release \};/u,
    "public adapter request owner must retain an explicit abort handle",
  );
  assert.match(
    adapterSource,
    /request\.abort/u,
    "public adapter bounded body must bind rejection teardown to its request owner",
  );
  assert.match(
    adapterSource,
    /bodyUnavailableAsEmpty: true/u,
    "public adapter must preserve its pre-existing absent-body empty-buffer contract",
  );

  let invalidAbortCount = 0;
  const invalidElapsed = await timed(async () => {
    await expectPrimaryError(
      () => readBoundedTextOwned({
        headers: headers("not-a-number"),
        body: bodyWithCancel(() => new Promise(() => {})),
      }, {
        maximumBytes: 8,
        abort: () => { invalidAbortCount += 1; },
      }),
      "response_content_length_invalid",
    );
  });
  assert.equal(invalidAbortCount, 1);
  assert.ok(invalidElapsed >= 150, `invalid teardown released too early: ${invalidElapsed}ms`);
  assert.ok(invalidElapsed < 2500, `invalid teardown was not bounded: ${invalidElapsed}ms`);

  let oversizeAbortCount = 0;
  const oversizeElapsed = await timed(async () => {
    await expectPrimaryError(
      () => readBoundedTextOwned({
        headers: headers("9"),
        body: bodyWithCancel(() => new Promise(() => {})),
      }, {
        maximumBytes: 8,
        abort: () => { oversizeAbortCount += 1; },
      }),
      "response_body_too_large",
    );
  });
  assert.equal(oversizeAbortCount, 1);
  assert.ok(oversizeElapsed >= 150, `declared oversize teardown released too early: ${oversizeElapsed}ms`);
  assert.ok(oversizeElapsed < 2500, `declared oversize teardown was not bounded: ${oversizeElapsed}ms`);

  let streamAbortCount = 0;
  const streamed = streamedBody({
    chunks: [encoder.encode("1234"), encoder.encode("56789")],
    cancel: () => new Promise(() => {}),
  });
  const streamElapsed = await timed(async () => {
    await expectPrimaryError(
      () => readBoundedTextOwned({ headers: headers(), body: streamed.body }, {
        maximumBytes: 8,
        abort: () => { streamAbortCount += 1; },
      }),
      "response_body_too_large",
    );
  });
  assert.equal(streamAbortCount, 1);
  assert.equal(streamed.released(), true);
  assert.ok(streamElapsed >= 150, `streamed oversize teardown released too early: ${streamElapsed}ms`);
  assert.ok(streamElapsed < 2500, `streamed oversize teardown was not bounded: ${streamElapsed}ms`);

  let rejectionAbortCount = 0;
  await expectPrimaryError(
    () => readBoundedTextOwned({
      headers: headers("bad"),
      body: bodyWithCancel(() => Promise.reject(new Error("cleanup_failed"))),
    }, {
      maximumBytes: 8,
      abort: () => { rejectionAbortCount += 1; },
    }),
    "response_content_length_invalid",
  );
  assert.equal(rejectionAbortCount, 1);

  const repeatedElapsed = await timed(async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await expectPrimaryError(
        () => readBoundedTextOwned({
          headers: headers("99"),
          body: bodyWithCancel(() => new Promise(() => {})),
        }, {
          maximumBytes: 8,
          abort: () => {},
        }),
        "response_body_too_large",
      );
    }
  });
  assert.ok(repeatedElapsed >= 450, `repeated hostile teardown released too early: ${repeatedElapsed}ms`);
  assert.ok(repeatedElapsed < 6000, `repeated hostile teardown was not bounded: ${repeatedElapsed}ms`);

  const normal = streamedBody({
    chunks: [encoder.encode("hello"), encoder.encode(" world")],
    cancel: () => Promise.resolve(),
  });
  const normalText = await readBoundedTextOwned({
    headers: headers("11"),
    body: normal.body,
  }, {
    maximumBytes: 64,
    abort: () => { throw new Error("abort_should_not_run"); },
  });
  assert.equal(normalText, "hello world");
  assert.equal(normal.released(), true);

  let adapterInvalidAbortCount = 0;
  const adapterInvalidElapsed = await timed(async () => {
    await expectPrimaryError(
      () => readBoundedBytesOwned({
        headers: headers(" 9 "),
        body: bodyWithCancel(() => new Promise(() => {})),
      }, {
        ...adapterErrorOptions,
        abort: () => { adapterInvalidAbortCount += 1; },
      }),
      "upstream_response_invalid_content_length",
    );
  });
  assert.equal(adapterInvalidAbortCount, 1);
  assert.ok(
    adapterInvalidElapsed >= 150,
    `adapter invalid-length teardown released too early: ${adapterInvalidElapsed}ms`,
  );
  assert.ok(
    adapterInvalidElapsed < 2500,
    `adapter invalid-length teardown was not bounded: ${adapterInvalidElapsed}ms`,
  );

  let adapterStreamAbortCount = 0;
  const adapterStream = streamedBody({
    chunks: [encoder.encode("1234"), encoder.encode("56789")],
    cancel: () => Promise.reject(new Error("adapter_cleanup_failed")),
  });
  await expectPrimaryError(
    () => readBoundedBytesOwned({ headers: headers(), body: adapterStream.body }, {
      ...adapterErrorOptions,
      abort: () => { adapterStreamAbortCount += 1; },
    }),
    "upstream_response_too_large",
  );
  assert.equal(adapterStreamAbortCount, 1);
  assert.equal(adapterStream.released(), true);

  let adapterRepeatedAbortCount = 0;
  const adapterRepeatedElapsed = await timed(async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await expectPrimaryError(
        () => readBoundedBytesOwned({
          headers: headers("99"),
          body: bodyWithCancel(() => new Promise(() => {})),
        }, {
          ...adapterErrorOptions,
          abort: () => { adapterRepeatedAbortCount += 1; },
        }),
        "upstream_response_too_large",
      );
    }
  });
  assert.equal(adapterRepeatedAbortCount, 3);
  assert.ok(
    adapterRepeatedElapsed >= 450,
    `adapter repeated hostile teardown released too early: ${adapterRepeatedElapsed}ms`,
  );
  assert.ok(
    adapterRepeatedElapsed < 6000,
    `adapter repeated hostile teardown was not bounded: ${adapterRepeatedElapsed}ms`,
  );

  const adapterNormal = streamedBody({
    chunks: [encoder.encode("hello"), encoder.encode(" adapter")],
    cancel: () => Promise.resolve(),
  });
  const adapterBytes = await readBoundedBytesOwned({
    headers: headers("13"),
    body: adapterNormal.body,
  }, {
    ...adapterErrorOptions,
    maximumBytes: 64,
    abort: () => { throw new Error("adapter_abort_should_not_run"); },
  });
  assert.equal(adapterBytes.toString("utf8"), "hello adapter");
  assert.equal(adapterNormal.released(), true);

  const adapterAbsentBody = await readBoundedBytesOwned({
    headers: headers(),
    body: null,
  }, {
    ...adapterErrorOptions,
    abort: () => { throw new Error("adapter_abort_should_not_run_for_absent_body"); },
  });
  assert.equal(adapterAbsentBody.length, 0);

  await expectPrimaryError(
    () => readBoundedBytesOwned({
      headers: headers(" 0 "),
      body: null,
    }, {
      ...adapterErrorOptions,
      abort: () => {},
    }),
    "upstream_response_invalid_content_length",
  );

  process.stdout.write("VOID_WC_PUBLIC_RESPONSE_TEARDOWN_V1_GREEN\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
