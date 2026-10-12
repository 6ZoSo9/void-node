"use strict";
// VOID_CANONICAL_PRODUCER_SOURCE_CUSTODY_V1
// Linux-only, read-only, fail-closed source tree custody qualification.
// This protects *against nonprivileged same-UID checkout writers* when the
// reviewed source is installed beneath root-owned, non-writable ancestors.
// It does not authorize creating that installation, deploying or restarting.
const fs = require("node:fs");
const path = require("node:path");
const MARKER = "VOID_CANONICAL_PRODUCER_SOURCE_CUSTODY_V1";
const REQUIRED = Object.freeze([
  ".git",
  "src/index.ts",
  "ops/run-void-node-live-v1.sh",
  "runtime/canonical-producer-self-http-guard-v1.cjs",
  "runtime/canonical-producer-self-http-guard-v2.cjs",
  "runtime/canonical-producer-self-http-guard-v3.cjs",
  "runtime/canonical-producer-source-custody-v1.cjs",
  "node_modules/tsx/dist/preflight.cjs",
  "node_modules/tsx/dist/loader.mjs",
]);
function hold(reason) {
  const error = new Error(MARKER + "_HOLD " + reason);
  error.code = "VOID_CANONICAL_SOURCE_CUSTODY_HOLD";
  throw error;
}
function under(root, target) {
  return target === root || target.startsWith(root + path.sep);
}
function parentChain(location) {
  const chain = [];
  for (let current = location; ; current = path.dirname(current)) {
    chain.push(current);
    if (current === path.dirname(current)) break;
  }
  return chain.reverse();
}
function capStateFree(api) {
  // An elevated capability could override root-owned file permissions.
  let txt;
  try { txt = api.readFileSync("/proc/self/status", "utf8"); }
  catch { hold("capability_state_unavailable"); }
  for (const name of ["CapInh", "CapPrm", "CapEff", "CapBnd", "CapAmb"]) {
    // Bounding is an upper limit, not an acquired capability. A typical
    // unprivileged systemd service still has CapBnd populated.
    if (name === "CapBnd") continue;
    const found = new RegExp("^" + name + ":\\s*([0-9a-fA-F]+)\\s*$", "m").exec(txt);
    if (!found) hold("capability_state_unavailable");
    if (BigInt("0x" + found[1]) !== 0n) hold("privileged_capability_present");
  }
}
function qualifySourceCustody(root, api = fs, identity = process) {
  if (process.platform !== "linux") hold("linux_required");
  if (typeof identity.getuid !== "function" ||
      typeof identity.geteuid !== "function" ||
      identity.getuid() === 0 || identity.geteuid() === 0 ||
      identity.getuid() !== identity.geteuid()) hold("unprivileged_uid_required");
  capStateFree(api);
  if (!path.isAbsolute(root) || root.includes("\0")) hold("absolute_root_required");
  let resolved;
  try { resolved = api.realpathSync(root); }
  catch { hold("root_unavailable"); }
  if (resolved !== path.resolve(root)) hold("root_alias_forbidden");
  let checked = 0;
  function inspect(location, expected = null) {
    let st;
    try { st = api.lstatSync(location); }
    catch { hold("source_metadata_unavailable"); }
    const locationClass = location === resolved ? "root" :
      (under(resolved, location) ? "descendant" : "ancestor");
    if (st.uid !== 0) {
      hold("source_mutable_or_untrusted_owner_" + locationClass + "_owner");
    }
    if (expected === "directory" && !st.isDirectory()) hold("directory_required");
    if (expected === "file" && !st.isFile()) hold("file_required");
    // Linux symlink mode 0777 is intentionally ignored by the kernel.
    // Its parent controls replacement, and its real target must stay inside
    // the trusted recursively checked tree; don't falsely reject safe
    // package-manager symlinks on their meaningless mode bits.
    if (!st.isSymbolicLink()) {
      if ((st.mode & 0o022) !== 0) {
        hold("source_mutable_or_untrusted_owner_" + locationClass + "_mode");
      }
      try {
        api.accessSync(location, fs.constants.W_OK);
        hold("source_writable_by_runtime");
      } catch (e) {
        if (e?.code === "VOID_CANONICAL_SOURCE_CUSTODY_HOLD") throw e;
        if (e?.code !== "EACCES" && e?.code !== "EPERM") {
          hold("writability_qualification_unavailable");
        }
      }
    }
    if (st.isSymbolicLink()) {
      let target;
      try { target = api.realpathSync(location); }
      catch { hold("symlink_target_unavailable"); }
      if (!under(resolved, target)) hold("symlink_outside_source_tree");
    } else if (!st.isDirectory() && !st.isFile()) {
      hold("unreviewed_source_node_kind");
    }
    checked++;
    if (checked > 250000) hold("source_tree_oversize");
    return st;
  }
  for (const ancestor of parentChain(resolved)) inspect(ancestor, "directory");
  const gitStat = inspect(path.join(resolved, ".git"), "directory");
  if (!gitStat.isDirectory()) hold("git_directory_required");
  for (const file of REQUIRED) {
    inspect(path.join(resolved, file), file === ".git" ? "directory" : "file");
  }
  const pending = [{dir: resolved, depth: 0}];
  while (pending.length) {
    const {dir, depth} = pending.pop();
    if (depth > 80) hold("source_depth_limit");
    let entries;
    try { entries = api.readdirSync(dir, { withFileTypes: true }); }
    catch { hold("source_enumeration_unavailable"); }
    for (const entry of entries) {
      const name = entry.name;
      if (name === "." || name === ".." || name.includes("\0")) hold("invalid_source_entry");
      const location = path.join(dir, name);
      const stat = inspect(location);
      if (stat.isDirectory()) pending.push({ dir: location, depth: depth + 1 });
    }
  }
  return Object.freeze({
    marker: MARKER,
    runtime_uid: identity.getuid(),
    source_nodes_checked: checked,
    source_root_nonwritable_by_runtime: true,
    source_ancestor_nonwritable_by_runtime: true,
    service_runtime_or_deployment_changed: false,
  });
}
module.exports = { MARKER, qualifySourceCustody };
if (require.main === module) {
  try {
    const root = process.argv[2];
    const result = qualifySourceCustody(root);
    process.stdout.write(result.marker + "_GREEN source_nodes_checked=" +
      String(result.source_nodes_checked) + "\n");
  } catch (e) {
    process.stderr.write(MARKER + "_HOLD " +
      String(e?.code === "VOID_CANONICAL_SOURCE_CUSTODY_HOLD"
        ? e.message.slice(MARKER.length + 6) : "uncertain_error") + "\n");
    process.exitCode = 2;
  }
}
