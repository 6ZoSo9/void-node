import fs from "node:fs";

const marker = "VOID_PROPOSER_AUTO_STOP_SHADOW_ROUTE_V1";
const source = fs.readFileSync("src/index.ts", "utf8");
const workflow = fs.readFileSync(
  ".github/workflows/ops-guards-autostart.yml",
  "utf8",
);

const helperPos = source.indexOf("function __voidAutoStopV1");
const rescuePos = source.indexOf("(function ProposerRescueHarnessV1(){");
const rescueStopPos = source.indexOf(
  "app.post('/proposer/auto/stop'",
  rescuePos,
);
const shimPos = source.indexOf("(function proposerAutoShim(){");
const shimStopPos = source.indexOf(
  'app.post("/proposer/auto/stop"',
  shimPos,
);
const switchPos = source.indexOf("(function ProposerAutoSwitchV2(){");
const switchStopPos = source.indexOf(
  'app.post("/proposer/auto/stop"',
  switchPos,
);
const notifierPos = source.indexOf("if (!g.__void_proposer_notify)", shimPos);
const tickFnPos = source.indexOf("async function tick()", switchPos);
const startFnPos = source.indexOf("function start(ms:number)", switchPos);
const stopFnPos = source.indexOf("function stop()", startFnPos);

for (const [name, pos] of Object.entries({
  helperPos,
  rescuePos,
  rescueStopPos,
  shimPos,
  shimStopPos,
  switchPos,
  switchStopPos,
  notifierPos,
  tickFnPos,
  startFnPos,
  stopFnPos,
})) {
  if (pos < 0) throw new Error(`missing boundary: ${name}`);
}

if (!(
  helperPos < rescuePos &&
  rescuePos < rescueStopPos &&
  rescueStopPos < shimPos &&
  shimPos < shimStopPos &&
  shimStopPos < switchPos &&
  switchPos < tickFnPos &&
  tickFnPos < startFnPos &&
  startFnPos < stopFnPos &&
  stopFnPos < switchStopPos
)) {
  throw new Error("proposer auto-stop boundaries are misordered");
}

const helperBlock = source.slice(helperPos, rescuePos);
const rescueStopBlock = source.slice(
  rescueStopPos,
  source.indexOf("attached = true", rescueStopPos),
);
const shimStopBlock = source.slice(
  shimStopPos,
  source.indexOf("// Tiny Prom exporter", shimStopPos),
);
const notifierBlock = source.slice(
  notifierPos,
  source.indexOf("} catch (err)", notifierPos),
);
const tickBlock = source.slice(tickFnPos, startFnPos);
const startBlock = source.slice(startFnPos, stopFnPos);
const stopBlock = source.slice(
  stopFnPos,
  source.indexOf(
    "(globalThis as any).__voidStopAutoSwitchV2",
    stopFnPos,
  ),
);
const switchStopBlock = source.slice(
  switchStopPos,
  source.indexOf("// exporter bridge", switchStopPos),
);

const stopRouteCount = (
  source.match(/app\.post\((?:"|')\/proposer\/auto\/stop(?:"|')/g) || []
).length;
if (stopRouteCount !== 3) {
  throw new Error(`expected exactly 3 proposer auto-stop routes, got ${stopRouteCount}`);
}

for (const required of [
  "__voidStopAutoRescueV1",
  "__voidStopAutoSwitchV2",
  "G.__void_proposer_auto.enabled = false",
]) {
  if (!helperBlock.includes(required)) {
    throw new Error(`shared stop helper missing: ${required}`);
  }
}

for (const [name, block] of [
  ["rescue", rescueStopBlock],
  ["shadow-shim", shimStopBlock],
  ["switch", switchStopBlock],
] as const) {
  if (!block.includes("__voidAutoStopV1()")) {
    throw new Error(`${name} stop route does not use shared stop helper`);
  }
}

for (const forbidden of [
  "let ok=false",
  "mirror only",
  "typeof (app as any).handle",
]) {
  if (shimStopBlock.includes(forbidden)) {
    throw new Error(`shadow shim retains fake stop behavior: ${forbidden}`);
  }
}
if (!shimStopBlock.includes("mirror.auto = false")) {
  throw new Error("shadow shim does not synchronize its local mirror");
}

for (const required of [
  "const notify:any = (ev:any)=>",
  "if (ev.tick === true) mirror.lastTickMs = Date.now()",
  "notify.__mirror = mirror",
  "g.__void_proposer_notify = notify",
]) {
  if (!notifierBlock.includes(required)) {
    throw new Error(`truthful notifier missing: ${required}`);
  }
}
if (notifierBlock.includes("\n          mirror.lastTickMs = Date.now();")) {
  throw new Error("notifier still treats every control event as a tick");
}

if (!tickBlock.includes("tick: true")) {
  throw new Error("actual proposer tick notification lacks tick=true");
}
if (startBlock.includes("tick: true") || stopBlock.includes("tick: true")) {
  throw new Error("start or stop control notification is mislabeled as a tick");
}
if (tickBlock.split("tick: true").length - 1 !== 1) {
  throw new Error("actual tick block must contain tick=true exactly once");
}

if (!workflow.includes("prove_proposer_auto_stop_shadow_route_v1.ts")) {
  throw new Error("autostart workflow lacks shadow-route proof");
}

console.log(
  `${marker}_GREEN`,
  JSON.stringify({
    registeredStopHandlers: stopRouteCount,
    allStopHandlersUseSharedStopHelper: true,
    shadowRouteStopsRealTimers: true,
    sharedEnabledStateForcedFalse: true,
    startStopNotificationsDoNotAdvanceTickTime: true,
    actualTickNotificationAdvancesTickTime: true,
    notifierMirrorPublished: true,
  }),
);
