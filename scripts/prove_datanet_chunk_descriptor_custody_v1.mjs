import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { syncBuiltinESMExports } from "node:module";

import express from "express";
import { registerDataNetRoutes } from "../dist/http/datanet_routes.js";

const ROOT = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-datanet-chunk-descriptor-v1-"),
);
const dataDir = path.join(ROOT, "data");
const chunksDir = path.join(dataDir, "datanet", "chunks");
const victim = path.join(ROOT, "victim.txt");
const secret = path.join(ROOT, "secret.txt");

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function request(port, method, route, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path: route,
        method,
        headers: body
          ? {
              "content-type": "application/octet-stream",
              "content-length": String(body.length),
            }
          : {},
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.once("end", () => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body: Buffer.concat(chunks),
          });
        });
      },
    );
    req.once("error", reject);
    if (body) req.end(body);
    else req.end();
  });
}

const app = express();
registerDataNetRoutes(app, { dataDir });
const server = http.createServer(app);

try {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const port = address.port;

  const body = Buffer.from("descriptor-bound-datanet-chunk-v1", "utf8");
  const leaf = sha256(body);
  const route = "/datanet/v1/chunks/" + leaf;

  const created = await request(port, "PUT", route, body);
  assert.equal(created.status, 200);
  const createdJson = JSON.parse(created.body.toString("utf8"));
  assert.equal(createdJson.ok, true);
  assert.equal(createdJson.reused, false);
  assert.equal(createdJson.leaf, leaf);
  assert.equal(createdJson.bytes, body.length);

  const chunkPath = path.join(chunksDir, leaf + ".bin");
  const chunkStat = fs.lstatSync(chunkPath);
  assert.equal(chunkStat.isFile(), true);
  assert.equal(chunkStat.isSymbolicLink(), false);
  assert.equal(chunkStat.mode & 0o077, 0);
  assert.equal(fs.readFileSync(chunkPath).equals(body), true);
  assert.equal(
    fs.readdirSync(chunksDir).some((name) => name.includes(".tmp-")),
    false,
  );

  const reused = await request(port, "PUT", route, body);
  assert.equal(reused.status, 200);
  const reusedJson = JSON.parse(reused.body.toString("utf8"));
  assert.equal(reusedJson.ok, true);
  assert.equal(reusedJson.reused, true);

  const ordinaryGet = await request(port, "GET", route);
  assert.equal(ordinaryGet.status, 200);
  assert.equal(ordinaryGet.body.equals(body), true);
  assert.equal(Number(ordinaryGet.headers["content-length"]), body.length);

  // Mutate the pathname only after the route has snapshotted and verified the
  // retained descriptor. The response must use the already-verified bytes.
  fs.writeFileSync(secret, "path-swap-secret-never-served", { mode: 0o600 });
  const backup = path.join(ROOT, "original-chunk.bin");
  const realCloseSync = fs.closeSync;
  let swapped = false;
  try {
    fs.closeSync = function injectedCloseSync(fd) {
      if (!swapped) {
        let target = "";
        try {
          target = fs.readlinkSync("/proc/self/fd/" + String(fd));
        } catch {}
        if (path.resolve(target.replace(/ \(deleted\)$/u, "")) === path.resolve(chunkPath)) {
          fs.renameSync(chunkPath, backup);
          fs.symlinkSync(secret, chunkPath);
          swapped = true;
        }
      }
      return realCloseSync.call(fs, fd);
    };
    syncBuiltinESMExports();

    const heldGeneration = await request(port, "GET", route);
    assert.equal(heldGeneration.status, 200);
    assert.equal(heldGeneration.body.equals(body), true);
    assert.equal(
      heldGeneration.body.includes(Buffer.from("path-swap-secret-never-served")),
      false,
    );
    assert.equal(swapped, true);
  } finally {
    fs.closeSync = realCloseSync;
    syncBuiltinESMExports();
    if (fs.existsSync(chunkPath)) fs.unlinkSync(chunkPath);
    if (fs.existsSync(backup)) fs.renameSync(backup, chunkPath);
  }

  // A second same-UID descriptor can mutate the *same inode* after the route's
  // verification completes. Serving the verified snapshot, not the file again,
  // must keep those later bytes out of the response.
  const postVerifyMutation = Buffer.from(
    "same-inode-post-verify-mutation-never-served",
    "utf8",
  );
  const attackerFd = fs.openSync(chunkPath, fs.constants.O_WRONLY);
  let sameInodeMutated = false;
  try {
    fs.closeSync = function injectedCloseSync(fd) {
      if (!sameInodeMutated && fd !== attackerFd) {
        let target = "";
        try {
          target = fs.readlinkSync("/proc/self/fd/" + String(fd));
        } catch {}
        if (path.resolve(target.replace(/ \(deleted\)$/u, "")) === path.resolve(chunkPath)) {
          fs.ftruncateSync(attackerFd, 0);
          let offset = 0;
          while (offset < postVerifyMutation.length) {
            const written = fs.writeSync(
              attackerFd,
              postVerifyMutation,
              offset,
              postVerifyMutation.length - offset,
              offset,
            );
            assert.ok(written > 0, "same-inode mutation made no progress");
            offset += written;
          }
          fs.fsyncSync(attackerFd);
          sameInodeMutated = true;
        }
      }
      return realCloseSync.call(fs, fd);
    };
    syncBuiltinESMExports();

    const snapshotGet = await request(port, "GET", route);
    assert.equal(snapshotGet.status, 200);
    assert.equal(snapshotGet.body.equals(body), true);
    assert.equal(snapshotGet.body.includes(postVerifyMutation), false);
    assert.equal(sameInodeMutated, true);
    assert.equal(fs.readFileSync(chunkPath).equals(postVerifyMutation), true);
  } finally {
    fs.closeSync = realCloseSync;
    syncBuiltinESMExports();
    fs.ftruncateSync(attackerFd, 0);
    let offset = 0;
    while (offset < body.length) {
      const written = fs.writeSync(
        attackerFd,
        body,
        offset,
        body.length - offset,
        offset,
      );
      assert.ok(written > 0, "chunk restore made no progress");
      offset += written;
    }
    fs.fsyncSync(attackerFd);
    realCloseSync.call(fs, attackerFd);
  }

  // Even if the request leaf is the exact hash of a target's bytes, a symlink
  // is not an admitted chunk object.
  const secretBytes = Buffer.from("known-secret-content", "utf8");
  fs.writeFileSync(secret, secretBytes, { mode: 0o600 });
  const secretLeaf = sha256(secretBytes);
  const secretChunk = path.join(chunksDir, secretLeaf + ".bin");
  fs.symlinkSync(secret, secretChunk);
  const symlinkGet = await request(
    port,
    "GET",
    "/datanet/v1/chunks/" + secretLeaf,
  );
  assert.equal(symlinkGet.status, 409);
  assert.equal(symlinkGet.body.includes(secretBytes), false);
  fs.unlinkSync(secretChunk);

  // A same-directory substitution of the staged pathname after its bytes were
  // verified must not publish the substituted inode under the content leaf.
  const raceBody = Buffer.from("staging-race-original-body", "utf8");
  const raceLeaf = sha256(raceBody);
  const raceRoute = "/datanet/v1/chunks/" + raceLeaf;
  const raceFinal = path.join(chunksDir, raceLeaf + ".bin");
  const realLinkSync = fs.linkSync;
  const foreignStagingBody = Buffer.from("foreign-staging-generation", "utf8");
  let substitutedTemporary = "";
  let retainedOriginal = "";
  let stagingSwapExercised = false;
  try {
    fs.linkSync = function injectedLinkSync(existingPath, newPath) {
      if (
        !stagingSwapExercised &&
        path.resolve(String(newPath)) === path.resolve(raceFinal)
      ) {
        substitutedTemporary = String(existingPath);
        retainedOriginal = substitutedTemporary + ".retained-original";
        fs.renameSync(substitutedTemporary, retainedOriginal);
        fs.writeFileSync(
          substitutedTemporary,
          foreignStagingBody,
          { mode: 0o600 },
        );
        stagingSwapExercised = true;
      }
      return realLinkSync.call(fs, existingPath, newPath);
    };
    syncBuiltinESMExports();

    const race = await request(port, "PUT", raceRoute, raceBody);
    assert.equal(race.status, 500);
    assert.equal(stagingSwapExercised, true);
    assert.equal(fs.existsSync(raceFinal), true);
    assert.equal(fs.readFileSync(raceFinal).equals(foreignStagingBody), true);
    assert.equal(fs.existsSync(substitutedTemporary), true);
    assert.equal(
      fs.readFileSync(substitutedTemporary).equals(foreignStagingBody),
      true,
    );
    assert.equal(fs.existsSync(retainedOriginal), true);

    const rejectedForeign = await request(port, "GET", raceRoute);
    assert.equal(rejectedForeign.status, 500);
    assert.equal(rejectedForeign.body.includes(foreignStagingBody), false);
  } finally {
    fs.linkSync = realLinkSync;
    syncBuiltinESMExports();
  }

  // Public PUT must never follow an existing symlink and overwrite its target.
  const victimOriginal = Buffer.from("victim-must-remain-unchanged", "utf8");
  fs.writeFileSync(victim, victimOriginal, { mode: 0o600 });
  const attackerBody = Buffer.from("attacker-selected-public-body", "utf8");
  const attackerLeaf = sha256(attackerBody);
  const attackerChunk = path.join(chunksDir, attackerLeaf + ".bin");
  fs.symlinkSync(victim, attackerChunk);
  const symlinkPut = await request(
    port,
    "PUT",
    "/datanet/v1/chunks/" + attackerLeaf,
    attackerBody,
  );
  assert.equal(symlinkPut.status, 409);
  assert.equal(fs.readFileSync(victim).equals(victimOriginal), true);
  assert.equal(fs.lstatSync(attackerChunk).isSymbolicLink(), true);

  const source = fs.readFileSync(
    new URL("../src/http/datanet_routes.ts", import.meta.url),
    "utf8",
  );
  assert.match(
    source,
    /const DATANET_CHUNK_MAX_BYTES = 64 \* 1024 \* 1024;/u,
  );
  assert.match(
    source,
    /express\.raw\(\{ type: "\*\/\*", limit: DATANET_CHUNK_MAX_BYTES \}\)/u,
  );
  assert.doesNotMatch(source, /MAX_PACK_CHUNK_BYTES/u);

  const getStart = source.indexOf('router.get("/chunks/:leaf"');
  const putStart = source.indexOf('router.put("/chunks/:leaf"');
  const proofStart = source.indexOf('router.get("/proof/:root/:index"');
  assert.ok(getStart >= 0 && putStart > getStart && proofStart > putStart);
  const chunkRoutes = source.slice(getStart, proofStart);
  assert.match(chunkRoutes, /readVerifiedDataNetChunkSnapshotV1/u);
  assert.match(chunkRoutes, /publishDataNetChunkCreateOnlyV1/u);
  assert.doesNotMatch(chunkRoutes, /fs\.createReadStream/u);
  assert.match(chunkRoutes, /res\.status\(200\)\.end\(opened\.bytes\)/u);
  assert.doesNotMatch(chunkRoutes, /fs\.writeFileSync\(p,\s*body\)/u);

  console.log("VOID_DATANET_CHUNK_DESCRIPTOR_CUSTODY_V1_GREEN");
  console.log("chunk_get_descriptor_bound=true");
  console.log("chunk_get_hash_revalidated=true");
  console.log("chunk_get_verified_snapshot_served=true");
  console.log("same_inode_mutation_after_verification_not_served=true");
  console.log("path_swap_after_verification_not_served=true");
  console.log("symlink_get_rejected=true");
  console.log("chunk_put_create_only=true");
  console.log("staging_descriptor_retained_through_publish=true");
  console.log("staging_path_substitution_rejected=true");
  console.log("foreign_substitution_preserved_not_accepted=true");
  console.log("path_cleanup_atomic_same_uid_race_proven=false");
  console.log("symlink_put_target_unchanged=true");
  console.log("existing_valid_chunk_idempotent=true");
  console.log("chunk_route_bound_self_contained=true");
  console.log("wallet_signer_validator_wc_money_authority=0");
} finally {
  await new Promise((resolve) => server.close(() => resolve()));
  fs.rmSync(ROOT, { recursive: true, force: true });
}
