#!/usr/bin/env node
// Source-only regression proof for immutable release symlink containment.
import fs from "node:fs";
import path from "node:path";

const MARKER = "VOID_IMMUTABLE_RELEASE_SYMLINK_CONTAINMENT_V1";
const root = fs.realpathSync(process.cwd());
let symlinkCount = 0;
let nodeCount = 0;
const failures = [];

function under(base, target) {
  return target === base || target.startsWith(base + path.sep);
}

const pending = [root];
while (pending.length) {
  const dir = pending.pop();
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const location = path.join(dir, entry.name);
    nodeCount++;
    const st = fs.lstatSync(location);

    if (st.isSymbolicLink()) {
      symlinkCount++;
      let resolved;
      try {
        resolved = fs.realpathSync(location);
      } catch {
        failures.push({
          kind: "broken_symlink",
          path: path.relative(root, location),
          target: fs.readlinkSync(location),
        });
        continue;
      }
      if (!under(root, resolved)) {
        failures.push({
          kind: "escaping_symlink",
          path: path.relative(root, location),
          target: fs.readlinkSync(location),
          resolved,
        });
      }
      continue;
    }

    if (st.isDirectory()) pending.push(location);
  }
}

if (failures.length) {
  for (const failure of failures) {
    process.stderr.write(
      MARKER + "_HOLD " + JSON.stringify(failure) + "\n",
    );
  }
  process.exit(2);
}

console.log(MARKER + "_GREEN");
console.log("source_nodes_checked=" + nodeCount);
console.log("symlink_count=" + symlinkCount);
console.log("broken_symlink_count=0");
console.log("escaping_symlink_count=0");
console.log("source_or_runtime_mutation=false");
