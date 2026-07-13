import fs from "node:fs";

const marker =
  "VOID_PROPOSER_SEAL_ONCE_MUTATION_METHOD_CONFIRMATION_GUARD_V1";

const source = fs.readFileSync("src/index.ts", "utf8");
const rescueProof = fs.readFileSync(
  "ops/proposer-rescue-ping-proof.sh",
  "utf8",
);
const workflow = fs.readFileSync(
  ".github/workflows/ops-guards-proposer-loop.yml",
  "utf8",
);

const sealOnceStart = source.indexOf(
  "async function sealOnce()",
);
const sealOnceEnd = source.indexOf(
  "function startAutoLoop",
  sealOnceStart,
);

if (
  sealOnceStart < 0 ||
  sealOnceEnd < 0 ||
  sealOnceStart >= sealOnceEnd
) {
  throw new Error("sealOnce implementation boundary is missing");
}

const sealOnceBlock = source.slice(
  sealOnceStart,
  sealOnceEnd,
);

for (const required of [
  "const picked = mem.slice(0, 1)",
  "await s.saveBlockCommit(block)",
  "await s.saveBlock(block)",
  "const drainArr = (arr:any[])",
  "G.__void_head_number = nextNum",
  "fs.writeFileSync(headFile",
]) {
  if (!sealOnceBlock.includes(required)) {
    throw new Error(
      `destructive sealOnce evidence missing: ${required}`,
    );
  }
}

const pathsPos = source.indexOf(
  "const proposerSealOncePathsV1",
);
const dryStatusPos = source.indexOf(
  "function proposerSealDryStatusV1",
  pathsPos,
);
const runnerPos = source.indexOf(
  "async function runProposerSealOnceV1",
  dryStatusPos,
);
const markerPos = source.indexOf(
  `[${marker}]`,
  runnerPos,
);
const loopPos = source.indexOf(
  "for (const path of proposerSealOncePathsV1)",
  markerPos,
);
const getPos = source.indexOf(
  "app.get(path",
  loopPos,
);
const postPos = source.indexOf(
  "app.post(path",
  getPos,
);
const attachedPos = source.indexOf(
  "attached = true",
  postPos,
);

for (const [name, pos] of Object.entries({
  pathsPos,
  dryStatusPos,
  runnerPos,
  markerPos,
  loopPos,
  getPos,
  postPos,
  attachedPos,
})) {
  if (pos < 0) {
    throw new Error(`missing boundary: ${name}`);
  }
}

if (!(
  pathsPos < dryStatusPos &&
  dryStatusPos < runnerPos &&
  runnerPos < markerPos &&
  markerPos < loopPos &&
  loopPos < getPos &&
  getPos < postPos &&
  postPos < attachedPos
)) {
  throw new Error(
    "proposer seal guard boundaries are misordered",
  );
}

const familyBlock = source.slice(
  pathsPos,
  attachedPos,
);
const dryStatusBlock = source.slice(
  dryStatusPos,
  runnerPos,
);
const runnerBlock = source.slice(
  runnerPos,
  markerPos,
);
const getBlock = source.slice(
  getPos,
  postPos,
);
const postBlock = source.slice(
  postPos,
  attachedPos,
);

for (const path of [
  "/proposer/tick",
  "/proposer/seal-now",
  "/dev/proposer/seal",
  "/__void/rescue/proposer/seal-now",
  "/__void/rescue/proposer/tick",
]) {
  if (!familyBlock.includes(`"${path}"`)) {
    throw new Error(`guard family missing route: ${path}`);
  }
}

for (const required of [
  "ok:true",
  "dry:true",
  "sealOnceAvailable:true",
  "mempoolAvailable:Array.isArray(mem)",
  "mempoolLength:Array.isArray(mem) ? mem.length : null",
  "auto:Boolean(autoTimer)",
  "lastSeal",
]) {
  if (!dryStatusBlock.includes(required)) {
    throw new Error(`dry status missing: ${required}`);
  }
}

if (
  dryStatusBlock.includes("await sealOnce()") ||
  dryStatusBlock.includes("saveBlock") ||
  dryStatusBlock.includes("mem.slice(") ||
  dryStatusBlock.includes("splice(")
) {
  throw new Error("dry status can reach mutation");
}

if (!runnerBlock.includes("const r:any = await sealOnce()")) {
  throw new Error("mutation runner no longer reaches sealOnce");
}

for (const required of [
  'req?.query?.dry ??',
  'req?.body?.dry ??',
  'res.setHeader("Allow", "GET, POST")',
  "res.status(405)",
  'error:"mutation_requires_post"',
  'method:"GET"',
  'requiredMethod:"POST"',
  "proposerSealDryStatusV1(req)",
]) {
  if (!getBlock.includes(required)) {
    throw new Error(`GET guard missing: ${required}`);
  }
}

if (
  getBlock.includes("runProposerSealOnceV1") ||
  getBlock.includes("await sealOnce()")
) {
  throw new Error("GET route can reach mutation");
}

for (const required of [
  'req?.query?.dry ??',
  'req?.body?.dry ??',
  "if (dry)",
  "proposerSealDryStatusV1(req)",
  "req?.query?.confirm",
  "req?.body?.confirm",
  'confirmation !== "proposerSealOnce"',
  "res.status(428)",
  'error:"explicit_confirmation_required"',
  'method:"POST"',
  'requiredConfirmation:"proposerSealOnce"',
  "return runProposerSealOnceV1(req, res)",
]) {
  if (!postBlock.includes(required)) {
    throw new Error(`POST guard missing: ${required}`);
  }
}

const postDryPos = postBlock.indexOf("if (dry)");
const postConfirmPos = postBlock.indexOf(
  'confirmation !== "proposerSealOnce"',
);
const postDispatchPos = postBlock.indexOf(
  "return runProposerSealOnceV1(req, res)",
);

if (
  postDryPos < 0 ||
  postConfirmPos < 0 ||
  postDispatchPos < 0 ||
  postDryPos >= postConfirmPos ||
  postConfirmPos >= postDispatchPos
) {
  throw new Error(
    "POST dry/confirmation/mutation ordering is invalid",
  );
}

for (const legacy of [
  "app.get('/dev/proposer/seal', async",
  "app.post('/__void/rescue/proposer/seal-now', async",
  "app.post('/__void/rescue/proposer/tick', async",
]) {
  if (source.includes(legacy)) {
    throw new Error(`legacy direct registration remains: ${legacy}`);
  }
}

const confirmedCaller =
  "$BASE/__void/rescue/proposer/seal-now" +
  "?dry=0&confirm=proposerSealOnce";

if (rescueProof.split(confirmedCaller).length - 1 !== 2) {
  throw new Error(
    "rescue proof does not contain exactly two confirmed seal calls",
  );
}

if (
  rescueProof.includes(
    'curl -fsS -X POST "$BASE/__void/rescue/proposer/seal-now"',
  ) ||
  rescueProof.includes(
    'post_json_to_file "$BASE/__void/rescue/proposer/seal-now" ',
  )
) {
  throw new Error("unconfirmed rescue proof caller remains");
}

for (const required of [
  "app.post('/proposer/auto/start'",
  "startAutoLoop(ms)",
  "app.post('/proposer/auto/stop'",
  "__voidAutoStopV1()",
]) {
  if (!familyBlock.includes(required)) {
    throw new Error(
      `separate auto-loop control boundary missing: ${required}`,
    );
  }
}

const confirmedTickCaller =
  "/proposer/tick?dry=0&confirm=proposerSealOnce";

if (
  source.split(confirmedTickCaller).length - 1 !== 2
) {
  throw new Error(
    "expected exactly two confirmed automatic tick callers",
  );
}

for (const unconfirmed of [
  '"http://127.0.0.1:" + port + "/proposer/tick"',
  "`http://127.0.0.1:${port}/proposer/tick`",
]) {
  if (source.includes(unconfirmed)) {
    throw new Error(
      `unconfirmed automatic tick caller remains: ${unconfirmed}`,
    );
  }
}

if (!workflow.includes(
  "prove_proposer_seal_once_mutation_method_confirmation_guard_v1.ts",
)) {
  throw new Error("workflow does not run focused proposer seal proof");
}

console.log(
  `${marker}_GREEN`,
  JSON.stringify({
    destructiveSealOnceIdentified:true,
    routeFamilyPaths:5,
    plainGetDefaultsDry:true,
    getMutationBlocked:true,
    blockedStatus:405,
    plainPostDefaultsDry:true,
    postMutationConfirmationRequired:true,
    confirmationStatus:428,
    requiredConfirmation:"proposerSealOnce",
    rescueProofCallersConfirmed:true,
    internalAutoTickCallersConfirmed:true,
    directLegacyRegistrationsRemoved:true,
    dryStatusCannotReachMutation:true,
    autoStartTrackedAsSeparateBoundary:true,
  }),
);
