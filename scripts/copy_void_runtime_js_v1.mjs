#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const MARKER = "VOID_NODE_RUNTIME_JS_COPY_V1";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "src", "wal", "wal_v1.js");
const DESTINATION_DIRECTORY = path.join(ROOT, "dist", "wal");
const DESTINATION = path.join(DESTINATION_DIRECTORY, "wal_v1.js");
const TEMPORARY = path.join(
  DESTINATION_DIRECTORY,
  `.wal_v1.js.tmp-${process.pid}-${Date.now()}`,
);

function fail(message) {
  console.error(`${MARKER}_FAIL: ${message}`);
  process.exit(1);
}

let sourceStat;
try {
  sourceStat = fs.lstatSync(SOURCE);
} catch (error) {
  fail(`source runtime module is unavailable: ${error.message}`);
}

if (!sourceStat.isFile() || sourceStat.isSymbolicLink()) {
  fail("source runtime module must be one regular non-symlink file");
}

const sourceBytes = fs.readFileSync(SOURCE);
fs.mkdirSync(DESTINATION_DIRECTORY, { recursive: true, mode: 0o755 });

const destinationDirectoryStat = fs.lstatSync(DESTINATION_DIRECTORY);
if (!destinationDirectoryStat.isDirectory() || destinationDirectoryStat.isSymbolicLink()) {
  fail("destination runtime directory must be one real directory");
}

try {
  fs.writeFileSync(TEMPORARY, sourceBytes, {
    flag: "wx",
    mode: 0o644,
  });
  fs.renameSync(TEMPORARY, DESTINATION);
} finally {
  fs.rmSync(TEMPORARY, { force: true });
}

const destinationStat = fs.lstatSync(DESTINATION);
if (!destinationStat.isFile() || destinationStat.isSymbolicLink()) {
  fail("destination runtime module must be one regular non-symlink file");
}

const destinationBytes = fs.readFileSync(DESTINATION);
if (!sourceBytes.equals(destinationBytes)) {
  fail("destination runtime module differs from its source bytes");
}

console.log(`marker=${MARKER}`);
console.log(`source=${path.relative(ROOT, SOURCE)}`);
console.log(`destination=${path.relative(ROOT, DESTINATION)}`);
console.log(`bytes=${destinationBytes.length}`);
console.log("VOID_NODE_RUNTIME_JS_COPY_V1_GREEN");
