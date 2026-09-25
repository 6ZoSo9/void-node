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

function createBufferedReader(socket: net.Socket) {
  let buffer = Buffer.alloc(0);
  let terminalError: Error | undefined;
  let pending:
    | {
        count: number;
        resolve: (value: Buffer) => void;
        reject: (error: Error) => void;
        timer: NodeJS.Timeout;
      }
    | undefined;

  function consume(count: number) {
    const value = buffer.subarray(0, count);
    buffer = buffer.subarray(count);
    return value;
  }

  function settle() {
    if (!pending || buffer.length < pending.count) return;
    const current = pending;
    pending = undefined;
    clearTimeout(current.timer);
    current.resolve(consume(current.count));
  }

  function fail(error: unknown) {
    terminalError =
      error instanceof Error ? error : new Error(String(error));
    if (!pending) return;
    const current = pending;
    pending = undefined;
    clearTimeout(current.timer);
    current.reject(terminalError);
  }

  const onData = (chunk: Buffer) => {
    buffer =
      buffer.length === 0
        ? Buffer.from(chunk)
        : Buffer.concat([buffer, chunk]);
    settle();
  };
  const onError = (error: Error) => fail(error);
  const onClose = () => fail(new Error("socket closed during read"));

  socket.on("data", onData);
  socket.on("error", onError);
  socket.on("close", onClose);

  function readExact(count: number): Promise<Buffer> {
    if (!Number.isSafeInteger(count) || count < 1) {
      return Promise.reject(new Error("invalid buffered read size"));
    }
    if (buffer.length >= count) return Promise.resolve(consume(count));
    if (terminalError) return Promise.reject(terminalError);
    if (pending) {
      return Promise.reject(new Error("concurrent buffered reads are not allowed"));
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (!pending) return;
        pending = undefined;
        reject(new Error("socket read timed out"));
      }, TIMEOUT_MS);
      pending = { count, resolve, reject, timer };
      settle();
    });
  }

  function detach(): Buffer {
    if (pending) throw new Error("cannot detach while a read is pending");
    socket.off("data", onData);
    socket.off("error", onError);
    socket.off("close", onClose);
    if (terminalError) throw terminalError;
    const leftover = buffer;
    buffer = Buffer.alloc(0);
    return leftover;
  }

  return { readExact, detach };
}

async function connectTorP2P(): Promise<{ socket: net.Socket; leftover: Buffer }> {
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

  const reader = createBufferedReader(socket);

  socket.write(Buffer.from([0x05, 0x01, 0x00]));
  const greeting = await reader.readExact(2);
  assert.equal(greeting[0], 0x05);
  assert.equal(greeting[1], 0x00);

  const host = Buffer.from(ONION, "ascii");
  const request = Buffer.alloc(7 + host.length);
  request.set([0x05, 0x01, 0x00, 0x03, host.length], 0);
  host.copy(request, 5);
  request.writeUInt16BE(ONION_PORT, 5 + host.length);
  socket.write(request);

  const prefix = await reader.readExact(4);
  assert.equal(prefix[0], 0x05);
  assert.equal(prefix[1], 0x00);

  if (prefix[3] === 0x01) {
    await reader.readExact(6);
  } else if (prefix[3] === 0x04) {
    await reader.readExact(18);
  } else if (prefix[3] === 0x03) {
    const length = await reader.readExact(1);
    await reader.readExact(length[0] + 2);
  } else {
    throw new Error("SOCKS response address type is invalid");
  }

  return { socket, leftover: reader.detach() };
}

function encode(message: unknown): Buffer {
  const body = Buffer.from(JSON.stringify(message), "utf8");
  assert(body.length <= MAX_FRAME);
  const header = Buffer.alloc(4);
  header.writeUInt32BE(body.length, 0);
  return Buffer.concat([header, body]);
}

async function main() {
  const { socket, leftover } = await connectTorP2P();
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

    const feed = (chunk: Buffer) => {
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
    };

    socket.on("data", feed);
    if (leftover.length > 0) queueMicrotask(() => feed(leftover));
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
