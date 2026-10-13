import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(
  path.join(root, "src/diag/datanet_publish_encrypt_preload_v1.cjs"),
  "utf8",
);
const beginMarker = "/* __VOID_DATANET_NONENC_RECEIPTS_V1__ BEGIN */";
const endMarker = "/* __VOID_DATANET_NONENC_RECEIPTS_V1__ END */";
const begin = source.indexOf(beginMarker);
const end = source.indexOf(endMarker, begin);
assert.ok(begin >= 0 && end > begin, "non-encrypted receipt middleware block missing");
const installBlock = source.slice(begin, end + endMarker.length);

function createHarness(app) {
  const timers = [];
  const fakeFs = {
    appendFileSync() {},
    mkdirSync() {},
  };
  const sandbox = {
    __void_http_app: app,
    Buffer,
    Date,
    Uint8Array,
    console: { error() {} },
    process: { env: {} },
    require(specifier) {
      if (specifier === "fs") return fakeFs;
      if (specifier === "path") return path;
      throw new Error(`unexpected require: ${specifier}`);
    },
    setTimeout(callback, delayMs) {
      timers.push({ callback, delayMs });
      return timers.length;
    },
  };
  const context = vm.createContext(sandbox);
  const script = new vm.Script(installBlock, {
    filename: "datanet-nonenc-receipts-install-block.cjs",
  });
  script.runInContext(context);
  return {
    context,
    rerun() {
      script.runInContext(context);
    },
    sandbox,
    timers,
  };
}

let getterReads = 0;
let getterThrows = true;
let transientUseCalls = 0;
let transientMiddleware = null;
const transientApp = {};
Object.defineProperty(transientApp, "use", {
  configurable: true,
  get() {
    getterReads += 1;
    if (getterThrows) throw new Error("synthetic_transient_use_getter");
    return function use(middleware) {
      assert.equal(this, transientApp, "captured use receiver changed");
      transientUseCalls += 1;
      transientMiddleware = middleware;
    };
  },
});

const transient = createHarness(transientApp);
assert.equal(getterReads, 1);
assert.equal(transientUseCalls, 0);
assert.equal(transient.sandbox.__void_datanet_nonenc_receipts_v1_installed, undefined);
assert.equal(transient.sandbox.__void_datanet_nonenc_receipts_v1_mount_state, undefined);
assert.deepEqual(
  transient.timers.map(({ delayMs }) => delayMs),
  [250, 1500],
  "transient getter failure must retain bounded retries",
);

getterThrows = false;
assert.doesNotThrow(() => transient.timers[0].callback());
assert.equal(getterReads, 2);
assert.equal(transientUseCalls, 1);
assert.equal(typeof transientMiddleware, "function");
assert.equal(transient.sandbox.__void_datanet_nonenc_receipts_v1_installed, true);
assert.equal(transient.sandbox.__void_datanet_nonenc_receipts_v1_mount_state, "mounted");

assert.doesNotThrow(() => transient.timers[1].callback());
assert.equal(getterReads, 2, "mounted retry re-read app.use");
assert.equal(transientUseCalls, 1, "mounted retry duplicated middleware");

let partialUseCalls = 0;
let retainedMiddleware = null;
const partialApp = {
  use(middleware) {
    partialUseCalls += 1;
    retainedMiddleware = middleware;
    throw new Error("synthetic_install_then_throw");
  },
};
const partial = createHarness(partialApp);
assert.equal(partialUseCalls, 1);
assert.equal(typeof retainedMiddleware, "function");
assert.equal(partial.timers.length, 0, "indeterminate registration scheduled a retry");
assert.equal(partial.sandbox.__void_datanet_nonenc_receipts_v1_installed, undefined);
assert.equal(partial.sandbox.__void_datanet_nonenc_receipts_v1_mount_state, "indeterminate");

assert.doesNotThrow(() => partial.rerun());
assert.equal(partialUseCalls, 1, "indeterminate registration duplicated middleware");
assert.equal(partial.timers.length, 0, "indeterminate reload scheduled a retry");


const request = { originalUrl: "/datanet/v1/publish", method: "POST" };
function makeResponse() {
  return {
    json(body) { return body; },
    send(body) { return body; },
    write(chunk) { return chunk; },
    end(chunk) { return chunk; },
    statusCode: 200,
  };
}
const inertResponse = makeResponse();
const originalMethods = Object.fromEntries(
  ["json", "send", "write", "end"].map(name => [name, inertResponse[name]]),
);
let inertNextCalls = 0;
assert.doesNotThrow(() => retainedMiddleware(
  request, inertResponse, () => { inertNextCalls += 1; },
));
assert.equal(inertNextCalls, 1, "indeterminate handler must pass through");
for (const [name, original] of Object.entries(originalMethods)) {
  assert.equal(inertResponse[name], original,
    `indeterminate handler must not wrap res.${name}`);
}

const activeResponse = makeResponse();
const originalActiveJson = activeResponse.json;
let activeNextCalls = 0;
assert.doesNotThrow(() => transientMiddleware(
  request, activeResponse, () => { activeNextCalls += 1; },
));
assert.equal(activeNextCalls, 1, "mounted handler must pass through");
assert.notEqual(activeResponse.json, originalActiveJson,
  "successfully mounted middleware must still instrument responses");


console.log("void_datanet_nonenc_receipts_mount_state_v1=PASS");
console.log("transient_use_getter_retry_preserved=true");
console.log("captured_use_receiver_preserved=true");
console.log("mounted_retry_skips_use_getter=true");
console.log("install_then_throw_state=indeterminate");
console.log("indeterminate_retry_refused=true");
console.log("runtime_mutation=false");
