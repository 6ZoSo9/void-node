import fs from "node:fs";

const marker =
  "VOID_PROPOSER_AUTO_START_MUTATION_CONFIRMATION_GUARD_V1";

const source = fs.readFileSync("src/index.ts", "utf8");
const legacySource = fs.readFileSync("src/index.js", "utf8");
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const liveWrapper = fs.readFileSync("ops/run-void-node-live-v1.sh", "utf8");
const workflow = fs.readFileSync(
  ".github/workflows/ops-guards-autostart.yml",
  "utf8",
);

const helperPos = source.indexOf("function __voidAutoReqV1");
const stopAllPos = source.indexOf("function __voidAutoStopV1");
const rescuePos = source.indexOf(
  "(function ProposerRescueHarnessV1(){",
);
const firstStartPos = source.indexOf(
  "app.post('/proposer/auto/start'",
  rescuePos,
);
const firstStopPos = source.indexOf(
  "app.post('/proposer/auto/stop'",
  firstStartPos,
);
const switchPos = source.indexOf(
  "(function ProposerAutoSwitchV2(){",
);
const secondStartPos = source.indexOf(
  'app.post("/proposer/auto/start"',
  switchPos,
);
const secondStopPos = source.indexOf(
  'app.post("/proposer/auto/stop"',
  secondStartPos,
);

for (const [name, pos] of Object.entries({
  helperPos,
  stopAllPos,
  rescuePos,
  firstStartPos,
  firstStopPos,
  switchPos,
  secondStartPos,
  secondStopPos,
})) {
  if (pos < 0) throw new Error(`missing boundary: ${name}`);
}

if (!(
  helperPos < stopAllPos &&
  stopAllPos < rescuePos &&
  rescuePos < firstStartPos &&
  firstStartPos < firstStopPos &&
  firstStopPos < switchPos &&
  switchPos < secondStartPos &&
  secondStartPos < secondStopPos
)) {
  throw new Error("auto-start boundaries are misordered");
}

const helperBlock = source.slice(helperPos, stopAllPos);
const stopAllBlock = source.slice(stopAllPos, rescuePos);
const firstStartBlock = source.slice(firstStartPos, firstStopPos);
const firstStopBlock = source.slice(
  firstStopPos,
  source.indexOf("attached = true", firstStopPos),
);
const secondStartBlock = source.slice(secondStartPos, secondStopPos);
const secondStopBlock = source.slice(
  secondStopPos,
  source.indexOf("// exporter bridge", secondStopPos),
);

for (const required of [
  "Math.max(500",
  "process.env.PROPOSER_TICK_MS",
  "req.query?.ms",
  "req.body?.ms",
  "req.query?.dry",
  "req.body?.dry",
  "started:false",
  "req.query?.confirm",
  "req.body?.confirm",
  'c!=="proposerAutoStart"',
  "res.status(428)",
  'error:"explicit_confirmation_required"',
  'requiredConfirmation:"proposerAutoStart"',
]) {
  if (!helperBlock.includes(required)) {
    throw new Error(`request guard missing: ${required}`);
  }
}

if (
  helperBlock.includes("startAutoLoop(") ||
  helperBlock.includes("setInterval(") ||
  helperBlock.includes("start(ms)")
) {
  throw new Error("request guard can start an auto loop");
}

for (const required of [
  "__voidStopAutoRescueV1",
  "__voidStopAutoSwitchV2",
]) {
  if (!stopAllBlock.includes(required)) {
    throw new Error(`stop-all helper missing: ${required}`);
  }
}

for (const [name, block, startCall] of [
  ["rescue", firstStartBlock, "startAutoLoop(ms)"],
  ["switch", secondStartBlock, "start(ms)"],
] as const) {
  for (const required of [
    "__voidAutoReqV1(req,res)",
    "if(ms===null)return",
    "__voidAutoStopV1()",
    startCall,
  ]) {
    if (!block.includes(required)) {
      throw new Error(`${name} start guard missing: ${required}`);
    }
  }

  if (
    block.indexOf("__voidAutoReqV1(req,res)") >=
    block.indexOf(startCall)
  ) {
    throw new Error(`${name} guard does not precede timer start`);
  }
}

for (const [name, block, localStop] of [
  ["rescue", firstStopBlock, "stopAutoLoop()"],
  ["switch", secondStopBlock, "stop()"],
] as const) {
  for (const required of [localStop, "__voidAutoStopV1()"]) {
    if (!block.includes(required)) {
      throw new Error(`${name} stop route missing: ${required}`);
    }
  }
}

for (const required of [
  "__voidStopAutoRescueV1=stopAutoLoop",
  "__voidStopAutoSwitchV2=stop",
  "if (mem.length > 0) await sealOnce()",
  "autoTimer = setInterval(tick, ms)",
]) {
  if (!source.includes(required)) {
    throw new Error(`auto-loop evidence missing: ${required}`);
  }
}

const legacyRetirementMarker =
  "VOID_TRACKED_SRC_INDEX_JS_RUNTIME_RETIREMENT_V1";
const legacyRetirementPos = legacySource.indexOf(
  legacyRetirementMarker,
);
const legacyFirstStartRoutePos = legacySource.indexOf(
  "/proposer/auto/start",
);

if (legacyRetirementPos < 0) {
  throw new Error("tracked src/index.js retirement marker missing");
}
if (legacyFirstStartRoutePos < 0) {
  throw new Error("tracked src/index.js proposer route missing");
}
if (legacyRetirementPos >= legacyFirstStartRoutePos) {
  throw new Error(
    "tracked src/index.js retirement does not precede stale routes",
  );
}
if (!legacySource.includes(
  'throw new Error("src/index.js is a retired tracked legacy artifact; use src/index.ts or dist/index.js")',
)) {
  throw new Error("tracked src/index.js fail-closed retirement missing");
}
if (packageJson?.scripts?.start !== "node dist/index.js") {
  throw new Error("package start no longer targets dist/index.js");
}
if (!String(packageJson?.scripts?.dev || "").includes("tsx src/index.ts")) {
  throw new Error("package dev no longer targets src/index.ts");
}
if (!liveWrapper.includes('"$ROOT/src/index.ts"')) {
  throw new Error("live wrapper no longer targets src/index.ts");
}

const suffix = "&dry=0&confirm=proposerAutoStart";

for (const dryCaller of [
  'base()+"/proposer/auto/start?ms=2000"',
  '`http://127.0.0.1:${process.env.HTTP_PORT||"4100"}/proposer/auto/start?ms=${ms}`',
]) {
  if (!source.includes(dryCaller)) {
    throw new Error(
      `autonomous internal caller is not dry: ${dryCaller}`,
    );
  }
}

if (source.includes(suffix)) {
  throw new Error(
    "autonomous internal caller retains auto-start confirmation",
  );
}

for (const file of [
  "scripts/void_health.sh",
  "scripts/void-heal-ready.sh",
  "ops/bin/void-proposer-auto.sh",
  "ops/bin/void-noop-drip.sh",
  "ops/bin/void-proposer-autostart-http.sh",
]) {
  const text = fs.readFileSync(file, "utf8");
  if (text.split(suffix).length - 1 !== 1) {
    throw new Error(`caller confirmation mismatch: ${file}`);
  }
}

if (!source.includes(
  "process.env.PROPOSER_AUTO||process.env.VOID_PROPOSER_AUTO",
)) {
  throw new Error("boot environment boundary unexpectedly missing");
}

if (!workflow.includes(
  "prove_proposer_auto_start_mutation_confirmation_guard_v1.ts",
)) {
  throw new Error("autostart workflow lacks focused proof");
}

console.log(
  `${marker}_GREEN`,
  JSON.stringify({
    duplicateStartHandlersGuarded:2,
    dryByDefault:true,
    confirmationStatus:428,
    requiredConfirmation:"proposerAutoStart",
    autonomousInternalCallersDry:2,
    autonomousInternalReenableClosed:true,
    shellCallersConfirmed:5,
    stopRoutesStopAllKnownLoops:true,
    splitControlStateClosed:true,
    proposerTickDefaultPreserved:true,
    trackedLegacyCopyRetiredFailClosed:true,
    bootEnvironmentTrackedAsSeparateBoundary:true,
  }),
);
