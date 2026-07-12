import fs from "node:fs";

const marker =
  "VOID_REMAINING_SEAL_ONCE_MUTATION_METHOD_CONFIRMATION_GUARD_V1";
const source = fs.readFileSync("src/index.ts", "utf8");

for (const legacy of [
  "__voidDevSealOnce2_SealBlock_EARLY",
  "__voidDevSealOnceRouteV1",
  "__voidDevSealOnceRouteV2",
  "__voidDevSealOnceRouteV3",
  'app.get("/__void/dev/inspect/sealOnce2"',
  'app.post("/__void/dev/sealOnce"',
  'app.get("/__void/dev/sealOnce"',
  'app.get("/__void/dev/inspect/sealOnce"',
  'app.get("/__void/dev/inspect/sealOnce.json"',
]) {
  if (source.includes(legacy)) {
    throw new Error(`legacy bypass remains: ${legacy}`);
  }
}

const sealOnce2Marker = source.indexOf(
  "[VOID_SEAL_ONCE2_MUTATION_METHOD_CONFIRMATION_GUARD_V1]",
);
const sealOnce2Handler = source.indexOf(
  "const sealOnce2HandlerV3",
);
const sealOnce2Get = source.indexOf(
  "app.get(sealOnce2PathV3",
);
const sealOnce2Post = source.indexOf(
  "app.post(sealOnce2PathV3",
);

const familyMarker = source.indexOf(
  "[VOID_SEAL_ONCE_FAMILY_MUTATION_METHOD_CONFIRMATION_GUARD_V1]",
);
const familyHandler = source.indexOf(
  "const sealOnceHandlerV4",
);
const familyLoop = source.indexOf(
  "for (const path of sealOncePathsV4)",
);
const familyGet = source.indexOf(
  "app.get(path",
  familyLoop,
);
const familyPost = source.indexOf(
  "app.post(path",
  familyLoop,
);

for (const [name, pos] of Object.entries({
  sealOnce2Marker,
  sealOnce2Handler,
  sealOnce2Get,
  sealOnce2Post,
  familyMarker,
  familyHandler,
  familyLoop,
  familyGet,
  familyPost,
})) {
  if (pos < 0) {
    throw new Error(`missing boundary: ${name}`);
  }
}

if (!(
  sealOnce2Handler < sealOnce2Marker &&
  sealOnce2Marker < sealOnce2Get &&
  sealOnce2Get < sealOnce2Post
)) {
  throw new Error("sealOnce2 boundaries are misordered");
}

if (!(
  familyHandler < familyMarker &&
  familyMarker < familyLoop &&
  familyLoop < familyGet &&
  familyGet < familyPost
)) {
  throw new Error("sealOnce family boundaries are misordered");
}

const sealOnce2Block = source.slice(
  sealOnce2Handler,
  source.indexOf(
    "// ===== __void dev: sealOnce route v4b",
    sealOnce2Handler,
  ),
);

const familyStart = source.indexOf(
  "// ===== __void dev: canonical guarded sealOnce route family",
);
const familyEnd = source.indexOf(
  "// ===== __void dev: sealOnce route v4b",
  familyStart,
);
const devKillPos = source.indexOf(
  "[dev-kill] runtime gate mounted",
);

if (
  familyStart < 0 ||
  familyEnd < 0 ||
  devKillPos < 0 ||
  familyStart >= familyEnd ||
  familyStart >= devKillPos
) {
  throw new Error(
    "canonical sealOnce family is not mounted before dev-kill",
  );
}

const familyBlock = source.slice(
  familyStart,
  familyEnd,
);

for (const [name, block, confirmation] of [
  ["sealOnce2", sealOnce2Block, "sealOnce2"],
  ["sealOnce", familyBlock, "sealOnce"],
] as const) {
  for (const required of [
    'String(req?.query?.dry ?? "1") !== "0"',
    'res.setHeader("Allow", "GET, POST")',
    "res.status(405)",
    'error:"mutation_requires_post"',
    'method:"GET"',
    'requiredMethod:"POST"',
    "req?.query?.confirm",
    "req?.body?.confirm",
    `confirmation !== "${confirmation}"`,
    "res.status(428)",
    'error:"explicit_confirmation_required"',
    'method:"POST"',
    `requiredConfirmation:"${confirmation}"`,
  ]) {
    if (!block.includes(required)) {
      throw new Error(`${name} guard missing: ${required}`);
    }
  }
}

for (const path of [
  "/__void/dev/sealOnce",
  "/__void/dev/inspect/sealOnce",
  "/__void/dev/inspect/sealOnce.json",
]) {
  if (!familyBlock.includes(`"${path}"`)) {
    throw new Error(`canonical family missing path: ${path}`);
  }
}

const sealOnce2Dry = sealOnce2Block.indexOf(
  'String(req?.query?.dry ?? "1") !== "0"',
);
const sealOnce2Mutation = sealOnce2Block.indexOf(
  "fn.apply(node, pattern.args)",
);

const familyHandlerStart = familyBlock.indexOf(
  "const sealOnceHandlerV4",
);
const familyGuardMarker = familyBlock.indexOf(
  "[VOID_SEAL_ONCE_FAMILY_MUTATION_METHOD_CONFIRMATION_GUARD_V1]",
);

if (
  familyHandlerStart < 0 ||
  familyGuardMarker < 0 ||
  familyHandlerStart >= familyGuardMarker
) {
  throw new Error("sealOnce family handler boundary is invalid");
}

const familyHandlerBlock = familyBlock.slice(
  familyHandlerStart,
  familyGuardMarker,
);
const familyDry = familyHandlerBlock.indexOf(
  'String(req?.query?.dry ?? "1") !== "0"',
);
const familyDispatch = familyHandlerBlock.indexOf(
  "const result = await tryCall(",
);

if (
  sealOnce2Dry < 0 ||
  sealOnce2Mutation < 0 ||
  sealOnce2Dry >= sealOnce2Mutation
) {
  throw new Error("sealOnce2 dry guard does not precede mutation");
}

if (
  familyDry < 0 ||
  familyDispatch < 0 ||
  familyDry >= familyDispatch
) {
  throw new Error(
    "sealOnce family dry guard does not precede mutation dispatch",
  );
}

if (!familyBlock.includes("const out = fn.apply(obj, args)")) {
  throw new Error("sealOnce family mutation helper is missing");
}

console.log(
  `${marker}_GREEN`,
  JSON.stringify({
    sealOnce2GetMutationBlocked:true,
    sealOnce2PostConfirmationRequired:true,
    sealOnceFamilyPaths:3,
    sealOnceFamilyGetMutationBlocked:true,
    sealOnceFamilyPostConfirmationRequired:true,
    plainRequestsDefaultDry:true,
    legacyDirectRegistrationsRemoved:true,
    canonicalFamilyBeforeDevKill:true,
    remoteSensitiveRouteGuardStillApplies:
      source.includes('path.startsWith("/__void/dev/")'),
  }),
);
