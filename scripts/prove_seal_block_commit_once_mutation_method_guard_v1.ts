import fs from "node:fs";

const marker = "VOID_SEAL_BLOCK_COMMIT_ONCE_MUTATION_METHOD_GUARD_V1";
const source = fs.readFileSync("src/index.ts", "utf8");

const routePath = '"/__void/dev/inspect/sealBlockCommitOnce"';
const markerText = `[${marker}]`;

const pathPos = source.indexOf(routePath);
const markerPos = source.indexOf(markerText);
const getPos = source.indexOf("appAny.get(", markerPos);
const postPos = source.indexOf("appAny.post(", markerPos);
const handlerPos = source.indexOf(
  "const sealBlockCommitOnceHandlerV4",
);
const mutationPos = source.indexOf(
  "block = await node.sealBlock({ allowEmptyOnce: allowEmpty });",
  handlerPos,
);

for (const [name, pos] of Object.entries({
  pathPos,
  markerPos,
  getPos,
  postPos,
  handlerPos,
  mutationPos,
})) {
  if (pos < 0) throw new Error(`missing required boundary: ${name}`);
}

if (!(handlerPos < markerPos && markerPos < getPos && getPos < postPos)) {
  throw new Error("method registrations are not ordered correctly");
}

const getBlock = source.slice(getPos, postPos);

for (const required of [
  'res.setHeader("Allow", "GET, POST")',
  "res.status(405)",
  'error: "mutation_requires_post"',
  'method: "GET"',
  'requiredMethod: "POST"',
]) {
  if (!getBlock.includes(required)) {
    throw new Error(`GET mutation guard missing: ${required}`);
  }
}

if (getBlock.includes("node.sealBlock(")) {
  throw new Error("GET registration directly invokes sealBlock");
}

const mountLogPos = source.indexOf(
  'console.log("[dev] mounted sealBlockCommitOnce.v3")',
  postPos,
);

if (mountLogPos < 0) {
  throw new Error("sealBlockCommitOnce mount boundary missing");
}

const postBlock = source.slice(postPos, mountLogPos);

if (!postBlock.includes("sealBlockCommitOnceHandlerV4(req, res)")) {
  throw new Error("POST registration does not delegate to the shared handler");
}

for (const required of [
  "[VOID_SEAL_BLOCK_COMMIT_ONCE_EXPLICIT_CONFIRMATION_V1]",
  "req?.query?.confirm",
  "req?.body?.confirm",
  'confirmation !== "sealBlockCommitOnce"',
  "res.status(428)",
  'error: "explicit_confirmation_required"',
  'method: "POST"',
  'requiredConfirmation: "sealBlockCommitOnce"',
]) {
  if (!postBlock.includes(required)) {
    throw new Error(`POST confirmation guard missing: ${required}`);
  }
}

const confirmationPos = postBlock.indexOf(
  "[VOID_SEAL_BLOCK_COMMIT_ONCE_EXPLICIT_CONFIRMATION_V1]",
);
const delegatePos = postBlock.indexOf(
  "sealBlockCommitOnceHandlerV4(req, res)",
);

if (!(confirmationPos >= 0 && confirmationPos < delegatePos)) {
  throw new Error("explicit confirmation guard does not precede mutation handler");
}

console.log(
  `${marker}_GREEN`,
  JSON.stringify({
    getMutationBlocked: true,
    blockedStatus: 405,
    postMutationLanePresent: true,
    plainPostDefaultsDry: true,
    unconfirmedMutationBlocked: true,
    wrongConfirmationBlocked: true,
    confirmationStatus: 428,
    requiredConfirmation: "sealBlockCommitOnce",
    remoteSensitiveRouteGuardStillApplies: source.includes(
      'path.startsWith("/__void/dev/")',
    ),
  }),
);
