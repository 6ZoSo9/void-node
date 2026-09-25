// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import crypto from "node:crypto";
import net from "node:net";

import {
  VOID_P2P_AUTH_PROTOCOL_VERSION_V1,
  buildVoidPeerAuthV1,
  deriveVoidNodeIdFromPublicPemV1,
  newVoidPeerChallengeV1,
  normalizeVoidPeerHelloV1,
  verifyVoidPeerAuthV1,
} from "../src/p2p/auth_v1.js";

const MARKER = "VOID_NIMO_TOR_P2P_AUTH_V1";
const ONION =
  "6a4r6osb37sp2t6nbx7dpdnq5wfdzdrn5axt7t33kduzuznarqqpnkid.onion";
const ONION_PORT = 4700;
const SOCKS_HOST = "127.0.0.1";
const SOCKS_PORT = 19051;
const EXPECTED_NODE_ID = "12babb04b0f88de7b74e17d04b343007";
const MAX_FRAME = 64 * 1024;
const TIMEOUT_MS = 30_000;

function readExact(socket: net.Socket, count: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    const timer = setTimeout(
      () => finish(new Error("socket read timed out")),
      TIMEOUT_MS,
    );

    function cleanup() {
      clearTimeout(timer);
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("close", onClose);
    }
    function finish(error?: Error, value?: Buffer) {
      cleanup();
      if (error) reject(error);
      else resolve(value!);
    }
    function onData(chunk: Buffer) {
      buffer = Buffer.concat([buffer, chunk]);
      if (buffer.length < count) return;
      if (buffer.length > count) {
        finish(new Error("unexpected surplus bytes during SOCKS handshake"));
        return;
      }
      finish(undefined, buffer);
    }
    function onError(error: Error) {
      finish(error);
    }
    function onClose() {
      finish(new Error("socket closed during read"));
    }

    socket.on("data", onData);
    socket.once("error", onError);
    socket.once("close", onClose);
  });
}

async function connectTorP2P(): Promise<net.Socket> {
  const socket = net.createConnection({
    host: SOCKS_HOST,
    port: SOCKS_PORT,
  });
  socket.setNoDelay(true);

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("SOCKS TCP connect timed out")),
      TIMEOUT_MS,
    );
    socket.once("connect", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

  socket.write(Buffer.from([0x05, 0x01, 0x00]));
  const greeting = await readExact(socket, 2);
  assert.equal(greeting[0], 0x05);
  assert.equal(greeting[1], 0x00);

  const host = Buffer.from(ONION, "ascii");
  const request = Buffer.alloc(7 + host.length);
  request.set([0x05, 0x01, 0x00, 0x03, host.length], 0);
  host.copy(request, 5);
  request.writeUInt16BE(ONION_PORT, 5 + host.length);
  socket.write(request);

  const prefix = await readExact(socket, 4);
  assert.equal(prefix[0], 0x05);
  assert.equal(prefix[1], 0x00);

  if (prefix[3] === 0x01) {
    await readExact(socket, 6);
  } else if (prefix[3] === 0x04) {
    await readExact(socket, 18);
  } else if (prefix[3] === 0x03) {
    const length = await readExact(socket, 1);
    await readExact(socket, length[0] + 2);
  } else {
    throw new Error("SOCKS response address type is invalid");
  }

  return socket;
}

function encode(message: unknown): Buffer {
  const body = Buffer.from(JSON.stringify(message), "utf8");
  assert(body.length <= MAX_FRAME);
  const header = Buffer.alloc(4);
  header.writeUInt32BE(body.length, 0);
  return Buffer.concat([header, body]);
}

async function main() {
  const socket = await connectTorP2P();
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const pubPEM = publicKey
    .export({ type: "spki", format: "pem" })
    .toString();
  const localId = deriveVoidNodeIdFromPublicPemV1(pubPEM);
  assert(localId);

  const localChallenge = newVoidPeerChallengeV1();
  const localIdentity = {
    id: localId,
    listen: [] as string[],
    proto: VOID_P2P_AUTH_PROTOCOL_VERSION_V1,
    pubkey: pubPEM,
  };

  let buffer = Buffer.alloc(0);
  let remoteHello: ReturnType<typeof normalizeVoidPeerHelloV1> | undefined;
  let authenticated = false;
  let peerListObserved = false;

  const done = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("VOID P2P authentication timed out"));
    }, TIMEOUT_MS);

    function finish(error?: Error) {
      clearTimeout(timer);
      if (error) reject(error);
      else resolve();
    }

    socket.on("error", finish);
    socket.on("close", () => {
      if (!authenticated) finish(new Error("socket closed before authentication"));
    });

    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      try {
        while (buffer.length >= 4) {
          const length = buffer.readUInt32BE(0);
          if (length > MAX_FRAME) throw new Error("oversized VOID frame");
          if (buffer.length < length + 4) break;
          const raw = JSON.parse(
            buffer.subarray(4, 4 + length).toString("utf8"),
          );
          buffer = buffer.subarray(4 + length);

          if (raw?.type === "HELLO") {
            const hello = normalizeVoidPeerHelloV1(raw);
            if (!hello) throw new Error("Nimo HELLO failed normalization");
            if (hello.id !== EXPECTED_NODE_ID) {
              throw new Error(
                `Nimo node ID mismatch: ${hello.id} != ${EXPECTED_NODE_ID}`,
              );
            }
            remoteHello = hello;
            const auth = buildVoidPeerAuthV1(
              localIdentity,
              hello.challenge,
              localChallenge,
              privateKey,
            );
            socket.write(encode(auth));
            continue;
          }

          if (raw?.type === "AUTH") {
            if (!remoteHello) throw new Error("AUTH arrived before valid HELLO");
            const auth = verifyVoidPeerAuthV1(
              raw,
              localChallenge,
              remoteHello,
            );
            if (!auth) throw new Error("Nimo AUTH failed verification");
            if (auth.id !== EXPECTED_NODE_ID) {
              throw new Error("verified AUTH node ID mismatch");
            }
            authenticated = true;
            if (peerListObserved) finish();
            continue;
          }

          if (raw?.type === "PEERS") {
            if (!authenticated) {
              throw new Error("PEERS arrived before authentication");
            }
            peerListObserved = true;
            finish();
          }
        }
      } catch (error) {
        finish(error instanceof Error ? error : new Error(String(error)));
      }
    });
  });

  socket.write(
    encode({
      type: "HELLO",
      ...localIdentity,
      challenge: localChallenge,
    }),
  );

  await done;
  socket.destroy();

  console.log(MARKER);
  console.log(`onion_hostname=${ONION}`);
  console.log(`onion_virtual_p2p_port=${ONION_PORT}`);
  console.log(`authenticated_nimo_node_id=${EXPECTED_NODE_ID}`);
  console.log("tor_socks_remote_dns=true");
  console.log("void_hello_verified=true");
  console.log("void_auth_verified=true");
  console.log("peer_list_after_auth_observed=true");
  console.log("tailnet_required=false");
  console.log("dns_registrar_required=false");
  console.log("commercial_cloud_provider_required=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
  console.log(`${MARKER}_GREEN`);
}

await main();
