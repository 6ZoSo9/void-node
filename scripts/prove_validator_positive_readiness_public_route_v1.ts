import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createHash } from "node:crypto";
import { mountLocalMultiboxRuntimeRouteV1 } from "../src/local-multibox-runtime-route-v1.js";

const proofMarker = "VOID_VALIDATOR_POSITIVE_READINESS_PUBLIC_ROUTE_V1_GREEN";
const routeMarker = "VOID_VALIDATOR_POSITIVE_READINESS_PUBLIC_ROUTE_V1";
const evidenceMarker = "VOID_VALIDATOR_REGISTRATION_POSITIVE_READINESS_PUBLIC_EVIDENCE_V1";
const targetRoute = "/public-node/validators/validator-registration-positive-readiness-public-evidence-v1.json";
const targetRelative = "public/public-node/validators/validator-registration-positive-readiness-public-evidence-v1.json";
const targetSha256 = "5648443249b2e20c6d9247ae8031db16417b2356f4f0ac62f39a1d7060f694a5";

const runtimeSourcePath = path.resolve(
  process.cwd(),
  "src/local-multibox-runtime-route-v1.ts",
);
const indexSourcePath = path.resolve(process.cwd(), "src/index.ts");
const targetPath = path.resolve(process.cwd(), targetRelative);

const runtimeSource = fs.readFileSync(runtimeSourcePath, "utf8");
const indexSource = fs.readFileSync(indexSourcePath, "utf8");
const targetBytes = fs.readFileSync(targetPath);

const count = (text: string, needle: string): number =>
  text.split(needle).length - 1;

assert.equal(count(runtimeSource, routeMarker), 2, "runtime route marker count");
assert.equal(count(runtimeSource, targetRoute), 2, "runtime target route count");
assert.equal(
  count(runtimeSource, "validatorPositiveReadinessPublicEvidencePath"),
  2,
  "runtime target path symbol count",
);
assert.equal(count(indexSource, targetRoute), 1, "route-index target route count");
const routeIndexEntry =
  `{ path: "${targetRoute}", kind: "json", marker: "${evidenceMarker}", use: "public read-only validator registration positive-readiness evidence; live public registration, admission, and active-set mutation remain disabled" },`;

assert.equal(
  count(indexSource, routeIndexEntry),
  1,
  "exact route-index discovery entry count",
);
assert.equal(
  createHash("sha256").update(targetBytes).digest("hex"),
  targetSha256,
  "target evidence SHA",
);

const payload = JSON.parse(targetBytes.toString("utf8"));

assert.equal(payload.marker, evidenceMarker, "target marker");
assert.equal(
  payload.claims.public_validator_registration_enabled_by_this_evidence,
  false,
  "public validator registration remains disabled",
);
assert.equal(
  payload.claims.validator_registration_or_admission_performed,
  false,
  "no validator registration or admission",
);
assert.equal(
  payload.claims.active_validator_set_mutation_performed,
  false,
  "no active validator set mutation",
);

type Handler = (req: any, res: any) => unknown;
const getRoutes = new Map<string, Handler[]>();

const app = {
  get(route: string, handler: Handler): void {
    const handlers = getRoutes.get(route) || [];
    handlers.push(handler);
    getRoutes.set(route, handlers);
  },
};

mountLocalMultiboxRuntimeRouteV1(app);

const targetHandlers = getRoutes.get(targetRoute) || [];

assert.equal(targetHandlers.length, 1, "target GET route mounted exactly once");

const targetHandler = targetHandlers[0];

const server = http.createServer((req, response) => {
  if (req.method !== "GET" || req.url !== targetRoute) {
    response.statusCode = 404;
    response.end("not found");
    return;
  }

  const expressLikeResponse: any = {
    type(contentType: string): any {
      response.setHeader("content-type", contentType);
      return expressLikeResponse;
    },
    sendFile(filePath: string): any {
      assert.equal(
        path.resolve(filePath),
        targetPath,
        "handler serves exact target path",
      );
      response.statusCode = 200;
      response.end(fs.readFileSync(filePath));
      return expressLikeResponse;
    },
  };

  targetHandler({ method: req.method, url: req.url }, expressLikeResponse);
});

await new Promise<void>((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => resolve());
});

try {
  const address = server.address();

  assert.ok(address && typeof address === "object");

  const response = await fetch(
    `http://127.0.0.1:${address.port}${targetRoute}`,
  );
  const body = Buffer.from(await response.arrayBuffer());

  assert.equal(response.status, 200, "preview HTTP status");
  assert.match(
    response.headers.get("content-type") || "",
    /^application\/json/i,
    "preview content type",
  );
  assert.equal(
    createHash("sha256").update(body).digest("hex"),
    targetSha256,
    "preview response SHA",
  );
  assert.deepEqual(
    JSON.parse(body.toString("utf8")),
    payload,
    "preview response exact payload",
  );
} finally {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

console.log("target_get_route_mounted=true");
console.log("target_preview_http_status=200");
console.log(`target_preview_sha256=${targetSha256}`);
console.log("route_index_discovery_entry_exact=true");
console.log("public_validator_registration_enabled=false");
console.log("validator_registration_or_admission_performed=false");
console.log("active_validator_set_mutation_performed=false");
console.log(proofMarker);
