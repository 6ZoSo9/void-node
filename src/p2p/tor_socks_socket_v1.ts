// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import * as net from "node:net";

const ONION_V3_RE = /^[a-z2-7]{56}\.onion$/;
const LOOPBACK_SOCKS_HOSTS = new Set(["127.0.0.1", "::1"]);

export type VoidTorSocksSocketV1 = Readonly<{
  socket: net.Socket;
  initial_bytes: Buffer;
}>;

function boundedPort(value: unknown, label: string): number {
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${label} must be an integer from 1 through 65535`);
  }
  return port;
}

function boundedTimeout(value: unknown): number {
  const timeout = Number(value);
  if (!Number.isSafeInteger(timeout) || timeout < 1_000 || timeout > 60_000) {
    throw new Error("Tor SOCKS timeout must be 1000 through 60000 ms");
  }
  return timeout;
}

export function normalizeVoidOnionV3HostnameV1(raw: unknown): string {
  const hostname = String(raw || "").trim().toLowerCase();
  if (!ONION_V3_RE.test(hostname)) {
    throw new Error("Tor onion hostname must be a canonical v3 .onion name");
  }
  return hostname;
}

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

  const consume = (count: number) => {
    const value = buffer.subarray(0, count);
    buffer = buffer.subarray(count);
    return value;
  };

  const settle = () => {
    if (!pending || buffer.length < pending.count) return;
    const current = pending;
    pending = undefined;
    clearTimeout(current.timer);
    current.resolve(consume(current.count));
  };

  const fail = (error: unknown) => {
    if (!terminalError) {
      terminalError =
        error instanceof Error ? error : new Error(String(error));
    }
    if (!pending) return;
    const current = pending;
    pending = undefined;
    clearTimeout(current.timer);
    current.reject(terminalError);
  };

  const onData = (chunk: Buffer) => {
    buffer =
      buffer.length === 0
        ? Buffer.from(chunk)
        : Buffer.concat([buffer, chunk], buffer.length + chunk.length);
    settle();
  };
  const onError = (error: Error) => fail(error);
  const onEnd = () => fail(new Error("Tor SOCKS connection ended early"));
  const onClose = () => fail(new Error("Tor SOCKS connection closed early"));

  socket.on("data", onData);
  socket.on("error", onError);
  socket.on("end", onEnd);
  socket.on("close", onClose);

  const readExact = (count: number, timeoutMs: number): Promise<Buffer> => {
    if (!Number.isSafeInteger(count) || count < 1) {
      return Promise.reject(new Error("Tor SOCKS read size is invalid"));
    }
    if (buffer.length >= count) return Promise.resolve(consume(count));
    if (terminalError) return Promise.reject(terminalError);
    if (pending) {
      return Promise.reject(
        new Error("concurrent Tor SOCKS reads are not allowed"),
      );
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (!pending) return;
        pending = undefined;
        reject(new Error("Tor SOCKS response timed out"));
      }, timeoutMs);
      pending = { count, resolve, reject, timer };
      settle();
    });
  };

  const detach = (): Buffer => {
    if (pending) throw new Error("cannot detach a pending Tor SOCKS read");
    socket.off("data", onData);
    socket.off("error", onError);
    socket.off("end", onEnd);
    socket.off("close", onClose);
    if (terminalError) throw terminalError;
    const initial = buffer;
    buffer = Buffer.alloc(0);
    return initial;
  };

  return Object.freeze({ readExact, detach });
}

async function connectSocket(socket: net.Socket, timeoutMs: number) {
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(
      () => finish(new Error("Tor SOCKS TCP connect timed out")),
      timeoutMs,
    );

    const cleanup = () => {
      clearTimeout(timer);
      socket.off("connect", onConnect);
      socket.off("error", onError);
    };
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve();
    };
    const onConnect = () => finish();
    const onError = (error: Error) => finish(error);

    socket.once("connect", onConnect);
    socket.once("error", onError);
  });
}

export async function connectVoidTorSocksSocketV1({
  onionHostname,
  onionPort,
  socksHost = "127.0.0.1",
  socksPort = 9050,
  timeoutMs = 30_000,
}: {
  onionHostname: string;
  onionPort: number;
  socksHost?: string;
  socksPort?: number;
  timeoutMs?: number;
}): Promise<VoidTorSocksSocketV1> {
  const hostname = normalizeVoidOnionV3HostnameV1(onionHostname);
  if (!LOOPBACK_SOCKS_HOSTS.has(socksHost)) {
    throw new Error("Tor SOCKS host must be numeric loopback");
  }
  const targetPort = boundedPort(onionPort, "Tor onion port");
  const proxyPort = boundedPort(socksPort, "Tor SOCKS port");
  if (proxyPort < 1024) {
    throw new Error("Tor SOCKS port must be 1024 through 65535");
  }
  const timeout = boundedTimeout(timeoutMs);

  const socket = net.createConnection({ host: socksHost, port: proxyPort });
  socket.setNoDelay(true);

  try {
    await connectSocket(socket, timeout);
    const reader = createBufferedReader(socket);
    try {
      socket.write(Buffer.from([0x05, 0x01, 0x00]));
      const greeting = await reader.readExact(2, timeout);
      if (greeting[0] !== 0x05 || greeting[1] !== 0x00) {
        throw new Error("Tor SOCKS proxy rejected no-auth mode");
      }

      const hostBytes = Buffer.from(hostname, "ascii");
      const request = Buffer.alloc(7 + hostBytes.length);
      request.set([0x05, 0x01, 0x00, 0x03, hostBytes.length], 0);
      hostBytes.copy(request, 5);
      request.writeUInt16BE(targetPort, 5 + hostBytes.length);
      socket.write(request);

      const prefix = await reader.readExact(4, timeout);
      if (prefix[0] !== 0x05 || prefix[1] !== 0x00) {
        throw new Error(
          `Tor SOCKS connect failed with code ${String(prefix[1])}`,
        );
      }

      if (prefix[3] === 0x01) {
        await reader.readExact(6, timeout);
      } else if (prefix[3] === 0x04) {
        await reader.readExact(18, timeout);
      } else if (prefix[3] === 0x03) {
        const length = await reader.readExact(1, timeout);
        await reader.readExact(length[0] + 2, timeout);
      } else {
        throw new Error("Tor SOCKS proxy returned an invalid address type");
      }

      // Pause before detaching the SOCKS reader so a remote VOID HELLO that
      // arrives in the same TCP packet is never lost between listener swaps.
      socket.pause();
      return Object.freeze({
        socket,
        initial_bytes: reader.detach(),
      });
    } catch (error) {
      socket.destroy();
      throw error;
    }
  } catch (error) {
    socket.destroy();
    throw error;
  }
}
