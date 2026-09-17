// Single-process scheduling boundary around exact supervisor/observer source.
// This fixture never validates recovery: the external controller owns census.
import childProcess from "node:child_process";
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
const cut = Number(process.env.VOID_LOSS_FIXTURE_CUT);
const report = value => process.send?.(value);
let authorized = false, paused = false, firstOwned = false, complete = 0;
let heldAuthority, heldRequest, nodeChild;
const realSpawn = childProcess.spawn.bind(childProcess);
childProcess.spawn = (...args) => {
  const child = realSpawn(...args); nodeChild = child;
  report({ fixture: "child", pid: child.pid });
  const send = child.send.bind(child);
  child.send = (message, ...rest) => {
    if (message?.type === "authority" && message.schema === "void_public_bootstrap_adapter_authority_message_v1") {
      // Generated fixture HMAC material remains in controller memory only.
      report({ fixture: "authority-material", authority: message.generation, secret: message.secret_hex });
      report({ fixture: "phase", phase: 1 });
      if (cut === 1) { heldAuthority = () => send(message, ...rest); return true; }
    }
    return send(message, ...rest);
  };
  child.on("message", message => {
    if (message?.schema === "void_public_bootstrap_child_lifetime_v1") report({ fixture: "armed" });
    if (["entry-started", "acquired-data", "acquired-listeners"].includes(message?.fixture)) report({ fixture: message.fixture });
    if (message?.fixture === "authority-delivered") {
      authorized = true; report({ fixture: "phase", phase: 2 });
      if (cut === 2) paused = true;
      else { const release = heldRequest; heldRequest = null; release?.(); }
    }
  });
  return child;
};
const realRequest = http.request.bind(http);
http.request = (...args) => {
  const request = realRequest(...args), end = request.end.bind(request);
  request.end = (...values) => {
    const release = () => {
      if (paused) { heldRequest = () => end(...values); return; }
      if (!firstOwned) {
        firstOwned = true; report({ fixture: "phase", phase: 3 });
        if (cut === 3) { paused = true; heldRequest = () => end(...values); return; }
      }
      end(...values);
    };
    if (!authorized || paused) heldRequest = release; else release();
    return request;
  };
  request.prependListener("response", response => response.prependOnceListener("end", () => {
    complete++;
    const phase = complete === 1 ? 4 : complete === 5 ? 5 : null;
    if (phase === cut) paused = true;
    // The actual observer's terminal ownership callback runs before this task.
    if (phase) queueMicrotask(() => report({ fixture: "phase", phase }));
  }));
  return request;
};
process.on("message", message => {
  if (message === "release-child") { nodeChild?.send("fixture-continue"); return; }
  if (message !== "release") return;
  paused = false; const authority = heldAuthority, request = heldRequest;
  heldAuthority = heldRequest = null; authority?.(); request?.();
});
await import(pathToFileURL(path.resolve("scripts/run_void_public_bootstrap_supervisor_v1.mjs")).href);
