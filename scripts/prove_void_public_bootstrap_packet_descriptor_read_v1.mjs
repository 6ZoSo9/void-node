#!/usr/bin/env node
// No repository or production write. All adversaries act on OS temporary files.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { readBytes } from "./lib/void_public_bootstrap_manifest_publication_contract_v1.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-publication-fd-reader-v1-"));
const nested = path.join(root, "data", "nested");
const file = path.join(nested, "candidate.json");
const outside = path.join(root, "outside");
const write = (name, bytes) => fs.writeFileSync(name, bytes, { mode: 0o600 });
try {
  fs.mkdirSync(nested, { recursive: true });
  fs.mkdirSync(outside, { recursive: true });
  write(file, "SAFE!");
  write(path.join(outside, "candidate.json"), "X".repeat(128 * 1024));
  assert.equal(readBytes(file, "candidate", 64).toString(), "SAFE!");
  assert.throws(() => readBytes(file, "candidate", 4),
    /bounded single-link regular file/);
  assert.throws(() => readBytes(file, "candidate", Number.POSITIVE_INFINITY),
    /invalid maximum byte count/);

  fs.renameSync(file, path.join(nested, "moved.json"));
  fs.symlinkSync(path.join(outside, "candidate.json"), file);
  assert.throws(() => readBytes(file, "candidate", 64));
  fs.rmSync(file);
  fs.renameSync(path.join(nested, "moved.json"), file);

  fs.linkSync(file, path.join(nested, "hardlink.json"));
  assert.throws(() => readBytes(file, "candidate", 64),
    /bounded single-link regular file/);
  fs.rmSync(path.join(nested, "hardlink.json"));

  const originalOpen = fs.openSync;
  let swapped = false;
  // A replaced ancestor cannot change where a pinned directory FD resolves.
  try {
    fs.openSync = function (name, ...args) {
      if (typeof name === "string" && name.endsWith("/nested") && !swapped) {
        swapped = true;
        fs.renameSync(nested, nested + "-held");
        fs.symlinkSync(outside, nested);
      }
      return originalOpen.call(this, name, ...args);
    };
    assert.throws(() => readBytes(file, "candidate", 64));
    assert.equal(swapped, true);
  } finally {
    fs.openSync = originalOpen;
    fs.rmSync(nested, { force: true });
    fs.renameSync(nested + "-held", nested);
  }

  swapped = false;
  try {
    fs.openSync = function (name, ...args) {
      if (typeof name === "string" &&
          name.endsWith("/candidate.json") &&
          name.startsWith("/proc/self/fd/") && !swapped) {
        swapped = true;
        fs.renameSync(nested, nested + "-held");
        fs.symlinkSync(outside, nested);
      }
      return originalOpen.call(this, name, ...args);
    };
    assert.throws(() => readBytes(file, "candidate", 64),
      /changed file\/path identity/);
    assert.equal(swapped, true);
  } finally {
    fs.openSync = originalOpen;
    fs.rmSync(nested, { force: true });
    fs.renameSync(nested + "-held", nested);
  }

  swapped = false;
  try {
    fs.openSync = function (name, ...args) {
      if (typeof name === "string" &&
          name.endsWith("/candidate.json") &&
          name.startsWith("/proc/self/fd/") && !swapped) {
        swapped = true;
        fs.renameSync(file, file + ".held");
        write(file, "EVIL!");
      }
      return originalOpen.call(this, name, ...args);
    };
    assert.throws(() => readBytes(file, "candidate", 64),
      /descriptor changed before reading/);
    assert.equal(swapped, true);
  } finally {
    fs.openSync = originalOpen;
    fs.rmSync(file, { force: true });
    fs.renameSync(file + ".held", file);
  }

  const originalRead = fs.readSync;
  let total = 0;
  let max = 0;
  let grew = false;
  try {
    fs.readSync = function (fd, buffer, offset, length, position) {
      if (!grew) {
        grew = true;
        fs.appendFileSync(file, Buffer.alloc(2 * 1024 * 1024));
      }
      max = Math.max(max, length);
      const n = originalRead.call(this, fd, buffer, offset, length, position);
      total += n;
      return n;
    };
    assert.throws(() => readBytes(file, "candidate", 64),
      /changed size during bounded read/);
    assert.equal(grew, true);
    assert.equal(max, 6);
    assert.equal(total, 6);
  } finally {
    fs.readSync = originalRead;
  }

  console.log("VOID_PUBLICATION_PACKET_DESCRIPTOR_READER_V1_GREEN");
  console.log("positive_read=true");
  console.log("leaf_symlink_rejected=true");
  console.log("hardlink_rejected=true");
  console.log("ancestor_swap_before_open_rejected=true");
  console.log("ancestor_swap_after_pin_rejected=true");
  console.log("same_size_leaf_swap_rejected=true");
  console.log("growth_read_bounded_to_initial_size_plus_one=true");
  console.log("source_repository_mutation=false");
  console.log("live_service_or_network_access=false");
  console.log("funds_movement=false");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
