import fs from "node:fs";

const marker = "VOID_SEAL_BLOCK_COMMIT_ONCE_TRUE_DRY_RUN_V1";
const source = fs.readFileSync("src/index.ts", "utf8");

const markerText = `[${marker}]`;
const markerPos = source.indexOf(markerText);
const routePos = source.indexOf(
  'appAny.get("/__void/dev/inspect/sealBlockCommitOnce"',
);
const dryPos = source.indexOf("if (dry) {", routePos);
const sealPos = source.indexOf(
  "block = await node.sealBlock({ allowEmptyOnce: allowEmpty });",
  routePos,
);

if (markerPos < 0) throw new Error("true dry-run marker missing");
if (routePos < 0) throw new Error("sealBlockCommitOnce route missing");
if (dryPos < 0) throw new Error("dry-run guard missing");
if (sealPos < 0) throw new Error("sealBlock call missing");
if (!(routePos < dryPos && dryPos < sealPos)) {
  throw new Error("dry-run guard does not return before sealBlock");
}

const dryBlock = source.slice(dryPos, sealPos);

for (const required of [
  "return res.json",
  "dry: true",
  "commitUsed: null",
  "number: null",
  "headNow",
]) {
  if (!dryBlock.includes(required)) {
    throw new Error(`dry-run response missing: ${required}`);
  }
}

console.log(
  `${marker}_GREEN`,
  JSON.stringify({
    dryGuardBeforeSealBlock: true,
    dryResponseNonMutating: true,
    commitUsedNull: true,
    numberNull: true,
    headVisible: true,
  }),
);
