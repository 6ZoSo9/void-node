import { createConnection } from 'node:net';

import {
  decodeBrokerResponseV1,
  encodeBrokerRequestV1,
} from './apollyon_openrouter_broker_ipc_protocol_v1.mjs';

const MAX_WIRE_BYTES = 4 * 1024 * 1024;

function fail(message) {
  throw new Error(`VOID_APOLLYON_OPENROUTER_BROKER_CLIENT_V1: ${message}`);
}

export async function runBrokerClientV1(socketPath, request) {
  if (typeof socketPath !== 'string' || socketPath.length < 2 || socketPath.length > 256
      || !socketPath.startsWith('/') || socketPath.includes('\0')) {
    fail('socket path is invalid');
  }
  const requestBytes = encodeBrokerRequestV1(request);
  const waitMs = Math.min(310000, Number(request.timeout_ms) + 10000);

  return new Promise((resolve, reject) => {
    const socket = createConnection({ path: socketPath });
    let chunks = [];
    let total = 0;
    let settled = false;

    const finishReject = (error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(error);
    };

    socket.setTimeout(waitMs, () => finishReject(new Error('broker response timed out')));
    socket.once('error', finishReject);
    socket.once('connect', () => { socket.write(requestBytes); });
    socket.on('data', (chunk) => {
      if (settled) return;
      if (!(chunk instanceof Uint8Array) || chunk.byteLength > MAX_WIRE_BYTES - total) {
        finishReject(new Error('broker response exceeded bounds'));
        return;
      }
      chunks.push(Buffer.from(chunk));
      total += chunk.byteLength;
    });
    socket.once('end', () => {
      if (settled) return;
      settled = true;
      try {
        const response = decodeBrokerResponseV1(Buffer.concat(chunks, total));
        if (response.request_id !== request.request_id) fail('response request_id mismatch');
        resolve(response);
      } catch (error) {
        reject(error);
      }
    });
  });
}
