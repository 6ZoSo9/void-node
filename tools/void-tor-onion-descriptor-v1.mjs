#!/usr/bin/env node

import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import {
  VOID_TOR_ONION_TRANSPORT_MARKER,
  buildVoidTorDescriptorV1,
  writeJsonAtomic,
} from "./lib/void-tor-onion-descriptor-v1.mjs";

function fail(message) {
  console.error("VOID_TOR_ONION_DESCRIPTOR_V1_FAIL");
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const options = {
    hostnameFile: "",
    output: "",
    localPort: 18088,
    virtualPort: 80,
    generatedAt: "",
    status: "active",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`missing value for ${argument}`);
      return argv[index];
    };
    if (argument === "--hostname-file") options.hostnameFile = next();
    else if (argument === "--output") options.output = next();
    else if (argument === "--local-port") options.localPort = Number(next());
    else if (argument === "--virtual-port") options.virtualPort = Number(next());
    else if (argument === "--generated-at") options.generatedAt = next();
    else if (argument === "--status") options.status = next();
    else if (argument === "--help" || argument === "-h") options.help = true;
    else throw new Error(`unknown argument: ${argument}`);
  }
  return options;
}

function usage() {
  console.log(`Usage:
  node tools/void-tor-onion-descriptor-v1.mjs \\
    --hostname-file PATH [--output PATH] \\
    [--local-port 18088] [--virtual-port 80] \\
    [--generated-at ISO8601] [--status active]

The command reads only Tor's public hostname file. It never reads or emits an
Onion Service private key.`);
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    process.exit(0);
  }
  if (!options.hostnameFile) throw new Error("--hostname-file is required");

  const hostnamePath = resolve(options.hostnameFile);
  const hostname = readFileSync(hostnamePath, "utf8").trim();
  const generatedAt = options.generatedAt || statSync(hostnamePath).mtime.toISOString();
  const descriptor = buildVoidTorDescriptorV1({
    onionHostname: hostname,
    localPort: options.localPort,
    virtualPort: options.virtualPort,
    generatedAt,
    status: options.status,
  });

  if (options.output) {
    const outputPath = writeJsonAtomic(options.output, descriptor);
    console.log("VOID_TOR_ONION_DESCRIPTOR_V1_GREEN");
    console.log(`marker=${VOID_TOR_ONION_TRANSPORT_MARKER}`);
    console.log(`onion_uri=${descriptor.transport.uri}`);
    console.log(`descriptor=${outputPath}`);
  } else {
    process.stdout.write(`${JSON.stringify(descriptor, null, 2)}\n`);
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
