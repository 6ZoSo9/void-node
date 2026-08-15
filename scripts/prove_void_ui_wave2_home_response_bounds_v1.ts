import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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

const sha256File = (relative: string): string =>
  createHash("sha256")
    .update(fs.readFileSync(path.join(root, relative)))
    .digest("hex");

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

  const wave2ManifestPath =
    "docs/public/void-ui-wave2-home-readonly-v1/source-manifest.json";
  const wave3ManifestPath =
    "docs/public/void-ui-wave3-wallet-readonly-v1/source-manifest.json";
  const wave4ManifestPath =
    "docs/public/void-ui-wave4-earn-readonly-v1/source-manifest.json";
  const homeSourcePath = "src/ui/void_app_wave2_home_readonly_v1.ts";
  const boundedFetchPath = "src/ui/void_app_wave2_home_source_fetch_v1.ts";

  const wave2Manifest = JSON.parse(
    fs.readFileSync(path.join(root, wave2ManifestPath), "utf8")
  );
  const wave3Manifest = JSON.parse(
    fs.readFileSync(path.join(root, wave3ManifestPath), "utf8")
  );
  const wave4Manifest = JSON.parse(
    fs.readFileSync(path.join(root, wave4ManifestPath), "utf8")
  );

  assert.equal(
    wave2Manifest.repository_hashes?.[homeSourcePath],
    sha256File(homeSourcePath)
  );
  assert.equal(
    wave2Manifest.repository_hashes?.[boundedFetchPath],
    sha256File(boundedFetchPath)
  );
  assert.equal(
    wave3Manifest.repository_hashes?.[wave2ManifestPath],
    sha256File(wave2ManifestPath)
  );
  assert.equal(
    wave3Manifest.repository_hashes?.[homeSourcePath],
    sha256File(homeSourcePath)
  );
  assert.equal(
    wave3Manifest.repository_hashes?.[boundedFetchPath],
    sha256File(boundedFetchPath)
  );
  assert.equal(
    wave4Manifest.repository_hashes?.[wave2ManifestPath],
    sha256File(wave2ManifestPath)
  );
  assert.equal(
    wave4Manifest.repository_hashes?.[wave3ManifestPath],
    sha256File(wave3ManifestPath)
  );

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
  const deadlineKeepAlive = setTimeout(() => {}, 200);
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
  clearTimeout(deadlineKeepAlive);
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
  console.log("owned_integrity_chain_verified=true");
  console.log("authority_added=false");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
