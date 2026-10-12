#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const MARKER = "VOID_PUBLIC_DISCOVERY_PACK_V1";
const repo = process.cwd();
const gateway = path.join(
  repo,
  "ops/public/void-public-app-composition-gateway-v1.mjs",
);
const temporaryRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-public-discovery-pack-proof-"),
);
const packRoot = path.join(temporaryRoot, "public");
const indexnowKey = "4859a4423b0590fb9a979bff9ede9ed6";
const indexnowName = `${indexnowKey}.txt`;
const bodies = new Map([
  [`/${indexnowName}`, Buffer.from(`${indexnowKey}\n`)],
  ["/discovery/", Buffer.from("<!doctype html><title>VOID Discovery</title>\n")],
  [
    "/discovery/void-datanet-dataset-v1.jsonld",
    Buffer.from('{"@context":"https://schema.org","@type":"Dataset"}\n'),
  ],
  ["/robots.txt", Buffer.from("User-agent: *\nAllow: /\n")],
  ["/sitemap.xml", Buffer.from("<?xml version=\"1.0\"?><urlset></urlset>\n")],
]);

fs.mkdirSync(path.join(packRoot, "discovery"), { recursive: true });
fs.writeFileSync(path.join(packRoot, indexnowName), bodies.get(`/${indexnowName}`));
fs.writeFileSync(path.join(packRoot, "discovery/index.html"), bodies.get("/discovery/"));
fs.writeFileSync(
  path.join(packRoot, "discovery/void-datanet-dataset-v1.jsonld"),
  bodies.get("/discovery/void-datanet-dataset-v1.jsonld"),
);
fs.writeFileSync(path.join(packRoot, "robots.txt"), bodies.get("/robots.txt"));
fs.writeFileSync(path.join(packRoot, "sitemap.xml"), bodies.get("/sitemap.xml"));

const listen = async (server) => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server.address().port;
};

const send = (req, res, status, body) => {
  const bytes = Buffer.from(body);
  res.writeHead(status, {
    "content-length": String(bytes.length),
    "content-type": "text/plain; charset=utf-8",
  });
  if (req.method === "HEAD") return res.end();
  res.end(bytes);
};

let publicFallbackHits = 0;
const publicServer = http.createServer((req, res) => {
  publicFallbackHits += 1;
  send(req, res, 404, "public_fallback\n");
});
const nodeServer = http.createServer((req, res) => {
  send(req, res, 404, "node_fallback\n");
});

let child;
try {
  const publicPort = await listen(publicServer);
  const nodePort = await listen(nodeServer);
  const portProbe = http.createServer();
  const compositionPort = await listen(portProbe);
  await new Promise((resolve) => portProbe.close(resolve));

  child = spawn(process.execPath, [gateway], {
    cwd: repo,
    env: {
      ...process.env,
      VOID_COMPOSITION_HOST: "127.0.0.1",
      VOID_COMPOSITION_PORT: String(compositionPort),
      VOID_PUBLIC_GATEWAY_UPSTREAM: `http://127.0.0.1:${publicPort}`,
      VOID_NODE_UPSTREAM: `http://127.0.0.1:${nodePort}`,
      VOID_PUBLIC_DISCOVERY_ROOT: packRoot,
      VOID_PUBLIC_DISCOVERY_INDEXNOW_KEY_NAME: indexnowName,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  let lastStartupError = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const base = `http://127.0.0.1:${compositionPort}`;
  let started = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`${base}/__void/public-app/status.json`);
      if (response.status === 200) {
        started = true;
        break;
      }
    } catch (error) {
      lastStartupError = String(error?.message || error);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.equal(
    started,
    true,
    `gateway failed to start\nlast_startup_error=${lastStartupError}\n`
      + `stdout=${stdout}\nstderr=${stderr}`,
  );

  {
    const response = await fetch(`${base}/__void/public-app/status.json`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.public_discovery_pack_configured, true);
    assert.equal(body.public_discovery_pack_marker, MARKER);
    assert.equal(body.public_discovery_pack_file_count, 5);
    assert.deepEqual(new Set(body.public_discovery_pack_routes), new Set(bodies.keys()));
    assert.equal(JSON.stringify(body).includes(packRoot), false);
  }

  const expectedContentTypes = new Map([
    [`/${indexnowName}`, /^text\/plain/i],
    ["/discovery/", /^text\/html/i],
    ["/discovery/void-datanet-dataset-v1.jsonld", /^application\/ld\+json/i],
    ["/robots.txt", /^text\/plain/i],
    ["/sitemap.xml", /^application\/xml/i],
  ]);

  for (const [route, expectedBody] of bodies) {
    const response = await fetch(base + route, { redirect: "manual" });
    const body = Buffer.from(await response.arrayBuffer());
    assert.equal(response.status, 200, route);
    assert.deepEqual(body, expectedBody, route);
    assert.equal(response.headers.get("x-void-marker"), MARKER, route);
    assert.equal(response.headers.get("x-void-public-discovery-pack"), "v1", route);
    assert.match(response.headers.get("content-type") || "", expectedContentTypes.get(route), route);
    assert.match(response.headers.get("etag") || "", /^"[a-f0-9]{64}"$/, route);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff", route);

    const head = await fetch(base + route, { method: "HEAD", redirect: "manual" });
    assert.equal(head.status, 200, route + " HEAD");
    assert.equal((await head.arrayBuffer()).byteLength, 0, route + " HEAD body");

    const query = await fetch(base + route + "?x=1", { redirect: "manual" });
    assert.equal(query.status, 400, route + " query");
    assert.equal((await query.json()).error, "public_discovery_query_not_allowed");

    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const denied = await fetch(base + route, { method, redirect: "manual" });
      assert.equal(denied.status, 405, route + " " + method);
      assert.equal(denied.headers.get("allow"), "GET, HEAD", route + " " + method);
    }
  }

  {
    const alias = await fetch(base + "/discovery", { redirect: "manual" });
    assert.equal(alias.status, 308);
    assert.equal(alias.headers.get("location"), "/discovery/");
    assert.equal(alias.headers.get("x-void-marker"), MARKER);
    const query = await fetch(base + "/discovery?x=1", { redirect: "manual" });
    assert.equal(query.status, 400);
  }

  {
    const before = publicFallbackHits;
    const response = await fetch(base + "/discovery/not-allowlisted.txt");
    assert.equal(response.status, 404);
    assert.equal((await response.text()).trim(), "public_fallback");
    assert.equal(publicFallbackHits, before + 1);
  }

  {
    const incompleteRoot = path.join(temporaryRoot, "incomplete-public");
    fs.mkdirSync(path.join(incompleteRoot, "discovery"), { recursive: true });
    fs.copyFileSync(
      path.join(packRoot, indexnowName),
      path.join(incompleteRoot, indexnowName),
    );
    fs.copyFileSync(
      path.join(packRoot, "discovery/index.html"),
      path.join(incompleteRoot, "discovery/index.html"),
    );
    fs.copyFileSync(
      path.join(packRoot, "discovery/void-datanet-dataset-v1.jsonld"),
      path.join(incompleteRoot, "discovery/void-datanet-dataset-v1.jsonld"),
    );
    fs.copyFileSync(
      path.join(packRoot, "robots.txt"),
      path.join(incompleteRoot, "robots.txt"),
    );

    const invalidPortProbe = http.createServer();
    const invalidPort = await listen(invalidPortProbe);
    await new Promise((resolve) => invalidPortProbe.close(resolve));
    const invalidChild = spawn(process.execPath, [gateway], {
      cwd: repo,
      env: {
        ...process.env,
        VOID_COMPOSITION_HOST: "127.0.0.1",
        VOID_COMPOSITION_PORT: String(invalidPort),
        VOID_PUBLIC_GATEWAY_UPSTREAM: `http://127.0.0.1:${publicPort}`,
        VOID_NODE_UPSTREAM: `http://127.0.0.1:${nodePort}`,
        VOID_PUBLIC_DISCOVERY_ROOT: incompleteRoot,
        VOID_PUBLIC_DISCOVERY_INDEXNOW_KEY_NAME: indexnowName,
      },
      stdio: ["ignore", "ignore", "pipe"],
    });
    let invalidStderr = "";
    invalidChild.stderr.on("data", (chunk) => { invalidStderr += chunk; });
    const [invalidCode] = await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("incomplete pack did not fail startup")),
        5000,
      );
      invalidChild.once("exit", (code, signal) => {
        clearTimeout(timer);
        resolve([code, signal]);
      });
    });
    assert.notEqual(invalidCode, 0);
    assert.match(invalidStderr, /sitemap\\.xml|ENOENT/);
  }

  console.log("VOID_PUBLIC_DISCOVERY_PACK_SERVING_V1_PROOF_GREEN");
  console.log("configured_file_count=5");
  console.log("exact_route_allowlist=true");
  console.log("indexnow_key_outside_repository=true");
  console.log("immutable_root_preloaded=true");
  console.log("get_head_only=true");
  console.log("query_rejected=400");
  console.log("mutation_methods=405");
  console.log("unknown_paths_fall_through=true");
  console.log("incomplete_pack_fails_startup=true");
  console.log("filesystem_root_not_disclosed=true");
} finally {
  if (child && child.exitCode === null) {
    const exited = once(child, "exit");
    child.kill("SIGTERM");
    await exited;
  }
  await Promise.all([
    new Promise((resolve) => publicServer.close(resolve)),
    new Promise((resolve) => nodeServer.close(resolve)),
  ]);
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
