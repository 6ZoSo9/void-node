import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");

const startMarker =
  "// [saveblock.finalize.v1] stamp SegStore.prototype.saveBlock to avoid wrap storms / recursion loops";
const endMarker =
  "// [saveblock.finalize.inspector.v1] expose in-process finalize state + saveBlock flags";
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);

assert.ok(start >= 0, "saveblock.finalize.v1 start marker missing");
assert.ok(end > start, "saveblock.finalize.v1 end marker missing");

const block = source.slice(start, end);
const patched = `        for (const s of syms){
          if ((fn as any)[s] !== true) (fn as any)[s] = true;
        }`;

assert.equal(
  block.split(patched).length - 1,
  1,
  "patched exact-true marker stamping must appear exactly once in finalize.v1",
);
assert.ok(
  !block.includes("try { (fn as any)[s] = true; }"),
  "finalize.v1 must not suppress a failed marker write",
);

const marker = Symbol.for("__void_forensics_wrapped");

function stamp(fn, s) {
  if (fn[s] !== true) fn[s] = true;
}

// Existing locked true: exact true is an idempotent no-op.
{
  const fn = function lockedTrue() {};
  Object.defineProperty(fn, marker, {
    value: true,
    writable: false,
    configurable: false,
  });
  assert.doesNotThrow(() => stamp(fn, marker));
  assert.equal(fn[marker], true);
}

// Existing locked false: assignment is attempted and throws.
{
  const fn = function lockedFalse() {};
  Object.defineProperty(fn, marker, {
    value: false,
    writable: false,
    configurable: false,
  });
  assert.throws(() => stamp(fn, marker), TypeError);
  assert.equal(fn[marker], false);
}

// Absent marker: it is stamped true.
{
  const fn = function absentMarker() {};
  assert.equal(fn[marker], undefined);
  stamp(fn, marker);
  assert.equal(fn[marker], true);
}

console.log("VOID_SAVEBLOCK_FORENSICS_MARKER_IDEMPOTENCE_V1_PROOF_GREEN");
