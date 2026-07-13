import fs from "node:fs";

const marker =
  "VOID_DEV_PICK_MUTATION_METHOD_CONFIRMATION_GUARD_V1";

const source = fs.readFileSync("src/index.ts", "utf8");
const callerTs = fs.readFileSync(
  "scripts/dev_proposer_merge.ts",
  "utf8",
);
const callerJs = fs.readFileSync(
  "scripts/dev_proposer_merge.js",
  "utf8",
);

const markerPos = source.indexOf(`[${marker}]`);
const softGateAllowPos = source.indexOf(
  "const localGuardedAllow = new Set([",
);
const softGateMarkerPos = source.indexOf(
  "[VOID_DEV_PICK_SOFT_GATE_LOCAL_ALLOW_V1]",
);
const killSwitchAllowPos = source.indexOf(
  "const guardedLocalDevAllow = new Set([",
);
const killSwitchMarkerPos = source.indexOf(
  "[VOID_DEV_PICK_KILL_SWITCH_LOCAL_ALLOW_V1]",
);
const remoteSensitiveGuardPos = source.indexOf(
  'path.startsWith("/__void/dev/")',
);
const helperPos = source.indexOf(
  "async function pick(max:number)",
);
const getPos = source.indexOf(
  "app.get(pickPathV2",
  markerPos,
);
const postPos = source.indexOf(
  "app.post(pickPathV2",
  getPos,
);
const diagPos = source.indexOf(
  'app.get("/__void/dev/picker/diag"',
  postPos,
);

for (const [name, pos] of Object.entries({
  remoteSensitiveGuardPos,
  softGateAllowPos,
  softGateMarkerPos,
  helperPos,
  killSwitchAllowPos,
  killSwitchMarkerPos,
  markerPos,
  getPos,
  postPos,
  diagPos,
})) {
  if (pos < 0) {
    throw new Error(`missing required boundary: ${name}`);
  }
}

if (!(
  remoteSensitiveGuardPos < softGateAllowPos &&
  softGateAllowPos < softGateMarkerPos &&
  softGateMarkerPos < helperPos &&
  helperPos < markerPos &&
  markerPos < getPos &&
  getPos < postPos &&
  postPos < diagPos &&
  diagPos < killSwitchAllowPos &&
  killSwitchAllowPos < killSwitchMarkerPos
)) {
  throw new Error("dev pick boundaries are misordered");
}

const softGateBlock = source.slice(
  softGateAllowPos,
  helperPos,
);

for (const required of [
  '"/__void/dev/pick"',
  '"/__void/dev/picker/diag"',
  "req?.originalUrl",
  '.split("?")[0]',
  "localGuardedAllow.has(path)",
  "return next()",
  "return res.status(404).end()",
]) {
  if (!softGateBlock.includes(required)) {
    throw new Error(`soft-gate allowance missing: ${required}`);
  }
}

const killSwitchBlock = source.slice(
  killSwitchAllowPos,
  source.indexOf(
    "[dev-kill] runtime gate mounted",
    killSwitchMarkerPos,
  ),
);

for (const required of [
  '"/__void/dev/pick"',
  '"/__void/dev/picker/diag"',
  "guardedLocalDevAllow.has(p)",
  "next();",
  "for (const rx of deny)",
  "res.status(404).end()",
]) {
  if (!killSwitchBlock.includes(required)) {
    throw new Error(`kill-switch allowance missing: ${required}`);
  }
}

const helperBlock = source.slice(helperPos, markerPos);
const getBlock = source.slice(getPos, postPos);
const postBlock = source.slice(postPos, diagPos);

if (!helperBlock.includes("arr.splice(0, n)")) {
  throw new Error("destructive mempool drain helper is missing");
}

for (const required of [
  "request.max > 0",
  'res.setHeader("Allow", "GET, POST")',
  "res.status(405)",
  'error:"mutation_requires_post"',
  'method:"GET"',
  'requiredMethod:"POST"',
  "const out = await pick(0)",
  "dry:true",
]) {
  if (!getBlock.includes(required)) {
    throw new Error(`GET guard missing: ${required}`);
  }
}

if (
  getBlock.includes("pick(request.max)") ||
  getBlock.includes("arr.splice(")
) {
  throw new Error("GET route can reach destructive pick");
}

for (const required of [
  "request.max > 0",
  'request.confirmation !== "voidDevPick"',
  "res.status(428)",
  'error:"explicit_confirmation_required"',
  'method:"POST"',
  'requiredConfirmation:"voidDevPick"',
  "const out = await pick(request.max)",
]) {
  if (!postBlock.includes(required)) {
    throw new Error(`POST guard missing: ${required}`);
  }
}

for (const [name, caller] of [
  ["TypeScript", callerTs],
  ["JavaScript", callerJs],
] as const) {
  if (!caller.includes("confirm=voidDevPick")) {
    throw new Error(`${name} caller lacks confirmation`);
  }

  if (!caller.includes('httpDo("POST", p.path')) {
    throw new Error(`${name} caller lacks POST fallback`);
  }
}

if (
  callerTs.includes(
    'path:`/__void/dev/pick?max=${max}`',
  ) ||
  callerJs.includes(
    'path: "/__void/dev/pick?max=".concat(max) },',
  )
) {
  throw new Error("unconfirmed dev pick caller remains");
}

console.log(
  `${marker}_GREEN`,
  JSON.stringify({
    destructiveDrainIdentified:true,
    getPositiveMaxBlocked:true,
    blockedStatus:405,
    getZeroMaxReadOnly:true,
    postPositiveMaxConfirmationRequired:true,
    confirmationStatus:428,
    requiredConfirmation:"voidDevPick",
    typescriptCallerConfirmed:true,
    javascriptCallerConfirmed:true,
    guardedLocalPickerSoftGateAllowance:true,
    guardedLocalPickerKillSwitchAllowance:true,
    remoteSensitiveGuardPrecedesSoftGate:true,
    asynchronousMountAfterKillSwitchCovered:true,
    remoteSensitiveRouteGuardStillApplies:
      source.includes('path.startsWith("/__void/dev/")'),
  }),
);
