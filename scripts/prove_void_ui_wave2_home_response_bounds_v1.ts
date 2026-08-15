import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_UI_WAVE2_HOME_SOURCE_MAX_RESPONSE_BYTES_V1,
  fetchVoidUiWave2HomeSourceJsonV1,
} from "../src/ui/void_app_wave2_home_source_fetch_v1.js";

const root = process.cwd();
const encoder = new TextEncoder();

const fetchLike = (
  responseFactory: (init?: RequestInit) => Response
) => async (
  _input: string | URL | Request,
  init?: RequestInit
): Promise<Response> => responseFactory(init);

async function main(): Promise<void> {
  const homeSource = fs.readFileSync(
    path.join(root, "src/ui/void_app_wave2_home_readonly_v1.ts"),
    "utf8"
  );
  const fetchSource = fs.readFileSync(
    path.join(root, "src/ui/void_app_wave2_home_source_fetch_v1.ts"),
    "utf8"
  );

  assert.match(homeSource, /fetchVoidUiWave2HomeSourceJsonV1/);
  assert.equal(homeSource.includes("response.text()"), false);
  assert.equal(fetchSource.includes("response.text()"), false);
  assert.match(fetchSource, /redirect: "error"/);
  assert.equal(VOID_UI_WAVE2_HOME_SOURCE_MAX_RESPONSE_BYTES_V1, 128 * 1024);

  const validPayload = { ok: true, ready: true, value: 7 };
  const validText = JSON.stringify(validPayload);
  let validRedirectMode: RequestRedirect | undefined;
  const valid = await fetchVoidUiWave2HomeSourceJsonV1(
    "http://127.0.0.1:4100",
    "/health",
    {
      fetchImpl: async (
        _input: string | URL | Request,
        init?: RequestInit
      ): Promise<Response> => {
        validRedirectMode = init?.redirect;
        return new Response(validText, {
          status: 200,
          headers: { "content-length": String(Buffer.byteLength(validText)) },
        });
      },
    }
  );
  assert.equal(valid.ok, true);
  assert.equal(valid.status, 200);
  assert.deepEqual(valid.body, validPayload);
  assert.equal(validRedirectMode, "error");

  let declaredCancelled = false;
  const declaredOversize = await fetchVoidUiWave2HomeSourceJsonV1(
    "http://127.0.0.1:4100",
    "/health",
    {
      fetchImpl: fetchLike(
        () =>
          new Response(
            new ReadableStream<Uint8Array>({
              start(controller) {
                controller.enqueue(encoder.encode("{}"));
              },
              cancel() {
                declaredCancelled = true;
              },
            }),
            {
              status: 200,
              headers: {
                "content-length": String(
                  VOID_UI_WAVE2_HOME_SOURCE_MAX_RESPONSE_BYTES_V1 + 1
                ),
              },
            }
          )
      ),
    }
  );
  await Promise.resolve();
  assert.equal(declaredOversize.ok, false);
  assert.equal(declaredOversize.error, "source_body_too_large");
  assert.equal(declaredCancelled, true);

  let streamedCancelled = false;
  const streamedOversize = await fetchVoidUiWave2HomeSourceJsonV1(
    "http://127.0.0.1:4100",
    "/p2p/peers",
    {
      fetchImpl: fetchLike(
        () =>
          new Response(
            new ReadableStream<Uint8Array>({
              start(controller) {
                controller.enqueue(new Uint8Array(64 * 1024));
                controller.enqueue(new Uint8Array(64 * 1024));
                controller.enqueue(new Uint8Array(1));
              },
              cancel() {
                streamedCancelled = true;
              },
            }),
            { status: 200 }
          )
      ),
    }
  );
  await Promise.resolve();
  assert.equal(streamedOversize.ok, false);
  assert.equal(streamedOversize.error, "source_body_too_large");
  assert.equal(streamedCancelled, true);

  let deadlineObserved = false;
  const deadlineStart = Date.now();
  const stalled = await fetchVoidUiWave2HomeSourceJsonV1(
    "http://127.0.0.1:4100",
    "/__void/ready.json",
    {
      timeoutMs: 25,
      fetchImpl: async (
        _input: string | URL | Request,
        init?: RequestInit
      ): Promise<Response> => {
        const signal = init?.signal;
        return new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(encoder.encode('{"ready":'));
              signal?.addEventListener(
                "abort",
                () => {
                  deadlineObserved = true;
                  controller.error(new DOMException("aborted", "AbortError"));
                },
                { once: true }
              );
            },
          }),
          { status: 200 }
        );
      },
    }
  );
  const deadlineElapsed = Date.now() - deadlineStart;
  assert.equal(stalled.ok, false);
  assert.equal(deadlineObserved, true);
  assert.ok(deadlineElapsed < 500, `deadline settled too slowly: ${deadlineElapsed}ms`);

  console.log("VOID_UI_WAVE2_HOME_RESPONSE_BOUNDS_V1_PROOF_GREEN");
  console.log(`max_response_bytes=${VOID_UI_WAVE2_HOME_SOURCE_MAX_RESPONSE_BYTES_V1}`);
  console.log("declared_oversize_rejected=true");
  console.log("streamed_oversize_rejected=true");
  console.log("source_deadline_through_body=true");
  console.log("redirects_rejected=true");
  console.log("authority_added=false");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
