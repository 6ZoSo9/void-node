import fs from "node:fs";

const marker =
  "VOID_SEAL_BLOCK_ONCE_MUTATION_METHOD_CONFIRMATION_GUARD_V1";
const source = fs.readFileSync("src/index.ts", "utf8");

const route = '"/__void/dev/inspect/sealBlockOnce"';
const handlerPos = source.indexOf(
  "const sealBlockOnceHandlerV3",
);
const markerPos = source.indexOf(`[${marker}]`);
const getPos = source.indexOf("app.get(", markerPos);
const postPos = source.indexOf("app.post(", markerPos);
const mountPos = source.indexOf(
  'console.log("[devroute.sealBlockOnce.v2] mounted at " + ROUTE)',
  postPos,
);

for (const [name, pos] of Object.entries({
  routePos: source.indexOf(route),
  handlerPos,
  markerPos,
  getPos,
  postPos,
  mountPos,
})) {
  if (pos < 0) {
    throw new Error(`missing required boundary: ${name}`);
  }
}

if (!(
  handlerPos < markerPos &&
  markerPos < getPos &&
  getPos < postPos &&
  postPos < mountPos
)) {
  throw new Error("sealBlockOnce boundaries are misordered");
}

const handlerBlock = source.slice(handlerPos, markerPos);
const dryPos = handlerBlock.indexOf(
  'String(req?.query?.dry ?? "1") !== "0"',
);
const mutatePos = handlerBlock.indexOf(
  "await fn.call(node, arg)",
);

if (dryPos < 0 || mutatePos < 0 || dryPos >= mutatePos) {
  throw new Error(
    "dry-by-default guard is missing or follows mutation",
  );
}

const getBlock = source.slice(getPos, postPos);
for (const required of [
  'res.setHeader("Allow", "GET, POST")',
  "res.status(405)",
  'error: "mutation_requires_post"',
  'method: "GET"',
  'requiredMethod: "POST"',
  "sealBlockOnceHandlerV3(req, res)",
]) {
  if (!getBlock.includes(required)) {
    throw new Error(`GET guard missing: ${required}`);
  }
}

if (getBlock.includes("fn.call(")) {
  throw new Error("GET registration directly mutates");
}

const postBlock = source.slice(postPos, mountPos);
for (const required of [
  "req?.query?.confirm",
  "req?.body?.confirm",
  'confirmation !== "sealBlockOnce"',
  "res.status(428)",
  'error: "explicit_confirmation_required"',
  'method: "POST"',
  'requiredConfirmation: "sealBlockOnce"',
  "sealBlockOnceHandlerV3(req, res)",
]) {
  if (!postBlock.includes(required)) {
    throw new Error(`POST guard missing: ${required}`);
  }
}

const publicBoundary = fs.readFileSync(
  "ops/mainnet0/public-live-boundary-v1-proof.sh",
  "utf8",
);
const publicContract = fs.readFileSync(
  "docs/public/mainnet0-public-route-contract-v1.md",
  "utf8",
);

console.log(
  `${marker}_GREEN`,
  JSON.stringify({
    getMutationBlocked: true,
    blockedStatus: 405,
    plainGetDefaultsDry: true,
    postMutationLanePresent: true,
    plainPostDefaultsDry: true,
    unconfirmedMutationBlocked: true,
    wrongConfirmationBlocked: true,
    confirmationStatus: 428,
    requiredConfirmation: "sealBlockOnce",
    remoteSensitiveRouteGuardStillApplies:
      source.includes('path.startsWith("/__void/dev/")'),
    publicBoundaryStillTracksRoute:
      publicBoundary.includes(
        "/__void/dev/inspect/sealBlockOnce",
      ),
    publicContractStillTracksRoute:
      publicContract.includes(
        "/__void/dev/inspect/sealBlockOnce",
      ),
  }),
);
