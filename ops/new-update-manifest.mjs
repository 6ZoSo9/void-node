#!/usr/bin/env node
// Generate a skeleton update manifest JSON to stdout.

import fs from 'node:fs';

function usage() {
  console.error('Usage: node ops/new-update-manifest.mjs <protocolVersion> <minCompat> [> file.json]');
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length < 2) usage();

const protocolVersion = Number(args[0]);
const minCompat = Number(args[1]);
if (!Number.isInteger(protocolVersion) || !Number.isInteger(minCompat)) {
  console.error('[ERR] protocolVersion and minCompat must be integers');
  process.exit(1);
}

const now = new Date().toISOString();

const manifest = {
  schemaVersion: 1,
  app: "void-node",
  protocol: {
    version: protocolVersion,
    minCompat: minCompat
  },
  chain: {
    chainId: 2050,
    network: "void-mainnet"
  },
  binaries: [
    {
      os: "linux",
      arch: "amd64",
      kind: "node-binary",
      url: "https://updates.voidchain.io/void-node/v" + protocolVersion + "/void-node-linux-amd64",
      sha256: "<fill-me>",
      sig: "<optional-detached-sig>"
    }
  ],
  docker: [
    {
      image: "registry.voidchain.io/void-node:v" + protocolVersion,
      digest: "sha256:<fill-me>"
    }
  ],
  configHints: {
    minNodeVersion: "v" + protocolVersion + ".0.0",
    recommendedFlags: [
      "--enable-wal-v1",
      "--enable-vector7-guard"
    ]
  },
  activation: {
    recommendedHeight: 0,
    earliestHeight: 0,
    emergency: false
  },
  ai: {
    models: [],
    datasets: [],
    breakingBehaviour: false
  },
  changelog: {
    short: "Protocol " + protocolVersion + " upgrade.",
    url: "https://docs.voidchain.io/changelog/v" + protocolVersion
  },
  meta: {
    createdAt: now,
    createdBy: "ops@void",
    ticket: "VOID-XXXX"
  }
};

const out = JSON.stringify(manifest, null, 2);
process.stdout.write(out + "\n");
