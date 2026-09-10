#!/usr/bin/env node
// Cooperative parent-lifetime coupling. Register before importing node code.
import process from "node:process";
import path from "node:path";
import { pathToFileURL } from "node:url";

const exit = process.exit.bind(process);
process.once("disconnect", () => exit(76));
if (!process.connected || typeof process.send !== "function" || process.argv.length !== 3) exit(76);
const entry = path.resolve(process.argv[2]);
// Keep the direct-entry convention in JS; procfs retains wrapper/entry argv.
process.argv = [process.execPath, entry];
process.send({ schema: "void_public_bootstrap_child_lifetime_v1", type: "armed" }, error => {
  if (error) exit(76);
});
try {
  if (Object.hasOwn(process.env, "VOID_NIMO_BUILD_RECEIPT_SHA256_V1")) {
    const { admitBoundChild } = await import("./lib/void_nimo_build_admission_v1.mjs");
    const admission = admitBoundChild(process, process.cwd(), entry);
    process.send({ schema: "void_nimo_build_startup_admission_v1", admission }, error => { if (error) exit(76); });
  }
  await import(pathToFileURL(entry).href);
}
catch { console.error("VOID_PUBLIC_BOOTSTRAP_CHILD_IMPORT_HOLD"); exit(1); }
