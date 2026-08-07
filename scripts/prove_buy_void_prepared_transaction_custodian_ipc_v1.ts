import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { pathToFileURL } from "node:url";
import { Transaction, Wallet } from "ethers";
import {
  createBuyVoidPreparedTransactionCustodianIpcV1,
  VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_IPC_AUTHORITY_V1,
} from "../src/economic/buy_void_prepared_transaction_custodian_ipc_v1.js";

const ROOT = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-prepared-custodian-ipc-v1-"),
);
const SERVICE_PATH = path.resolve(
  "tools/buy-void-prepared-transaction-custodian-service-v1.mjs",
);
const SERVICE_SOURCE = fs.readFileSync(SERVICE_PATH, "utf8");
const WORKFLOW_SOURCE = fs.readFileSync(
  path.resolve(".github/workflows/buy-void-prepared-transaction-custodian-ipc-v1.yml"),
  "utf8",
);
for (const dependency of [
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "tsconfig.build.json",
]) {
  assert.ok(
    WORKFLOW_SOURCE.includes(`- "${dependency}"`),
    `focused workflow missing trigger dependency ${dependency}`,
  );
}
assert.match(SERVICE_SOURCE, /durable_intent_before_signer: true/);
assert.match(SERVICE_SOURCE, /signer_prepare_once_idempotency_required: true/);
assert.match(SERVICE_SOURCE, /await options\.signer\.prepare_once/);
assert.match(SERVICE_SOURCE, /Transaction\.from\(rawSigned\)/);
assert.match(SERVICE_SOURCE, /prepared_custodian_signed_transaction_binding_mismatch/);
assert.match(SERVICE_SOURCE, /custodyHandleFor/);
assert.match(SERVICE_SOURCE, /expected_signer_fingerprint_sha256/);
assert.match(SERVICE_SOURCE, /IDEMPOTENCY_DOMAIN/);
assert.match(SERVICE_SOURCE, /expectedIdempotencyKey/);
assert.doesNotMatch(SERVICE_SOURCE, /options\.signer\.prepare_transaction/);
assert.match(SERVICE_SOURCE, /prepared_custodian_service_failed/);
assert.doesNotMatch(
  SERVICE_SOURCE,
  /return Object\.freeze\(\{[\s\S]{0,200}prepare_once:/,
);
const TEST_PRIVATE_KEY = `0x${"11".repeat(32)}`;
const WRONG_PRIVATE_KEY = `0x${"22".repeat(32)}`;
const WALLET = new Wallet(TEST_PRIVATE_KEY).address.toLowerCase();
const DELIVERY = "0x2222222222222222222222222222222222222222";
const SIGNER_FP = crypto
  .createHash("sha256")
  .update("fixture-prepared-custodian-signer-v1")
  .digest("hex");
const CHILDREN = new Set<ChildProcess>();

function h(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function ipcCustodian(options: {
  socket_path: string;
  timeout_ms?: number;
  max_request_bytes?: number;
  max_response_bytes?: number;
}) {
  return createBuyVoidPreparedTransactionCustodianIpcV1({
    ...options,
    expected_signer_fingerprint_sha256: SIGNER_FP,
  });
}

function request(seed: string) {
  const sagaId = `voidbvfsg1_${h(`saga:${seed}`)}`;
  const attemptId = h(`attempt:${seed}`);
  const reservationId = h(`reservation:${seed}`);
  const planFingerprint = h(`plan:${seed}`);
  const idempotencyKey = h(
    [
      "void-buy-prepared-transaction-custody-v1",
      sagaId,
      attemptId,
      reservationId,
      planFingerprint,
    ].join("\n"),
  );
  return {
    idempotency_key_sha256: idempotencyKey,
    saga_id: sagaId,
    attempt_id: attemptId,
    plan_reservation_id: reservationId,
    transaction_plan_fingerprint_sha256: planFingerprint,
    chain_id: "2050" as const,
    wallet_address: WALLET,
    nonce: 7,
    delivery_address: DELIVERY,
    native_value_wei: "1000000000000",
    gas_limit: "21000",
    max_fee_per_gas_wei: "100",
    max_priority_fee_per_gas_wei: "2",
  };
}

function readCount(file: string): number {
  try {
    return Number(fs.readFileSync(file, "utf8").trim() || "0");
  } catch (error: any) {
    if (error?.code === "ENOENT") return 0;
    throw error;
  }
}

function privateMode(file: string): number {
  return fs.lstatSync(file).mode & 0o777;
}

async function waitForReady(
  child: ChildProcess,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => {
      reject(new Error(`service_ready_timeout:${output}`));
    }, 5_000);
    child.stdout?.on("data", (chunk) => {
      output += String(chunk);
      if (output.includes("READY\n")) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      reject(
        new Error(
          `service_exited_before_ready:code=${code} signal=${signal} output=${output}`,
        ),
      );
    });
  });
}

function serviceCode(input: {
  socket: string;
  store: string;
  counter: string;
  faultStage?: string;
  badSigner?: boolean;
  wrongTransaction?: boolean;
  wrongSender?: boolean;
}): string {
  return `
    import crypto from "node:crypto";
    import fs from "node:fs";
    import path from "node:path";
    import { Wallet } from "ethers";
    import { createPreparedTransactionCustodianServiceV1 } from ${JSON.stringify(
      pathToFileURL(SERVICE_PATH).href,
    )};

    const prepareCounterFile = ${JSON.stringify(input.counter)};
    const signCounterFile = prepareCounterFile + ".sign-events";
    const signerStore = ${JSON.stringify(input.store)} + ".signer";
    const signerRecords = path.join(signerStore, "records");

    function count(file) {
      try { return Number(fs.readFileSync(file, "utf8").trim() || "0"); }
      catch (error) { if (error?.code === "ENOENT") return 0; throw error; }
    }
    function increment(file) {
      fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
      fs.writeFileSync(file, String(count(file) + 1) + "\\n", "utf8");
    }
    function ensurePrivate(directory) {
      fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
      fs.chmodSync(directory, 0o700);
    }
    function signerFile(key) {
      return path.join(signerRecords, key + ".json");
    }
    function readSigner(key) {
      try {
        const file = signerFile(key);
        const metadata = fs.lstatSync(file);
        if (!metadata.isFile() || metadata.isSymbolicLink() || (metadata.mode & 0o077) !== 0) {
          throw new Error("fixture_signer_record_invalid");
        }
        return JSON.parse(fs.readFileSync(file, "utf8"));
      } catch (error) {
        if (error?.code === "ENOENT") return null;
        throw error;
      }
    }
    function signerResult(record, status) {
      return {
        status,
        raw_signed_transaction: record.raw_signed_transaction,
        wallet_address: record.wallet_address,
        signer_fingerprint_sha256: record.signer_fingerprint_sha256,
        transaction_plan_fingerprint_sha256: record.transaction_plan_fingerprint_sha256,
      };
    }
    function sameRequest(left, right) {
      return JSON.stringify(left) === JSON.stringify(right);
    }
    async function buildSignerRecord(request) {
      const signerWallet = new Wallet(
        ${JSON.stringify(input.wrongSender ? WRONG_PRIVATE_KEY : TEST_PRIVATE_KEY)}
      );
      const signedValue = ${input.wrongTransaction ? "(BigInt(request.native_value_wei) + 1n)" : "BigInt(request.native_value_wei)"};
      const raw = await signerWallet.signTransaction({
        type: 2,
        chainId: BigInt(request.chain_id),
        nonce: request.nonce,
        gasLimit: BigInt(request.gas_limit),
        maxFeePerGas: BigInt(request.max_fee_per_gas_wei),
        maxPriorityFeePerGas: BigInt(request.max_priority_fee_per_gas_wei),
        to: request.delivery_address,
        value: signedValue,
        data: "0x",
      });
      return {
        request: { ...request },
        raw_signed_transaction: raw,
        wallet_address: request.wallet_address,
        signer_fingerprint_sha256: ${JSON.stringify(SIGNER_FP)},
        transaction_plan_fingerprint_sha256: request.transaction_plan_fingerprint_sha256,
      };
    }

    ensurePrivate(signerStore);
    ensurePrivate(signerRecords);
    const inFlight = new Map();

    const signer = {
      async prepare_once(request) {
        increment(prepareCounterFile);
        const existing = readSigner(request.idempotency_key_sha256);
        if (existing) {
          if (!sameRequest(existing.request, request)) {
            throw new Error("fixture_signer_idempotency_conflict");
          }
          return signerResult(existing, "duplicate");
        }
        const pending = inFlight.get(request.idempotency_key_sha256);
        if (pending) return pending;

        const operation = (async () => {
          const racedExisting = readSigner(request.idempotency_key_sha256);
          if (racedExisting) {
            if (!sameRequest(racedExisting.request, request)) {
              throw new Error("fixture_signer_idempotency_conflict");
            }
            return signerResult(racedExisting, "duplicate");
          }
          increment(signCounterFile);
          const record = await buildSignerRecord(request);

          if (${input.badSigner ? "true" : "false"}) {
            return { ...signerResult(record, "prepared"), private_key: "forbidden" };
          }
          const file = signerFile(request.idempotency_key_sha256);
          let created = false;
          try {
            const descriptor = fs.openSync(file, "wx", 0o600);
            try {
              fs.writeFileSync(descriptor, JSON.stringify(record) + "\\n", "utf8");
              fs.fsyncSync(descriptor);
            } finally {
              fs.closeSync(descriptor);
            }
            created = true;
          } catch (error) {
            if (error?.code !== "EEXIST") throw error;
          }
          const durable = readSigner(request.idempotency_key_sha256);
          if (!durable) throw new Error("fixture_signer_record_missing");
          if (!sameRequest(durable.request, request)) {
            throw new Error("fixture_signer_idempotency_conflict");
          }
          return signerResult(durable, created ? "prepared" : "duplicate");
        })();
        inFlight.set(request.idempotency_key_sha256, operation);
        try {
          return await operation;
        } finally {
          inFlight.delete(request.idempotency_key_sha256);
        }
      }
    };

    const service = createPreparedTransactionCustodianServiceV1({
      socket_path: ${JSON.stringify(input.socket)},
      store_dir: ${JSON.stringify(input.store)},
      signer,
      expected_signer_fingerprint_sha256: ${JSON.stringify(SIGNER_FP)},
      fault_inject: async (stage) => {
        if (stage === ${JSON.stringify(input.faultStage || "")}) {
          if (stage === "after_record_persisted_before_reply") process.exit(91);
          if (stage === "after_signer_before_persist") process.exit(92);
          process.exit(93);
        }
      }
    });
    await service.start();
    console.log("READY");
    const stop = async () => { try { await service.stop(); } finally { process.exit(0); } };
    process.on("SIGTERM", stop);
    process.on("SIGINT", stop);
    setInterval(() => {}, 1_000);
  `;
}

async function startService(input: {
  socket: string;
  store: string;
  counter: string;
  faultStage?: string;
  badSigner?: boolean;
  wrongTransaction?: boolean;
  wrongSender?: boolean;
}): Promise<ChildProcess> {
  fs.mkdirSync(path.dirname(input.socket), { recursive: true, mode: 0o700 });
  fs.chmodSync(path.dirname(input.socket), 0o700);
  fs.mkdirSync(input.store, { recursive: true, mode: 0o700 });
  fs.chmodSync(input.store, 0o700);
  try {
    fs.unlinkSync(input.socket);
  } catch (error: any) {
    if (error?.code !== "ENOENT") throw error;
  }
  const child = spawn(
    process.execPath,
    ["--input-type=module", "-e", serviceCode(input)],
    {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  CHILDREN.add(child);
  child.once("exit", () => CHILDREN.delete(child));
  child.stderr?.on("data", () => {});
  await waitForReady(child);
  return child;
}

async function stopService(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await new Promise<void>((resolve) => {
    child.once("exit", () => resolve());
    setTimeout(() => {
      if (child.exitCode === null) child.kill("SIGKILL");
      resolve();
    }, 2_000).unref();
  });
}

async function waitForExit(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolve) => child.once("exit", () => resolve()));
}

async function expectTransportFailure(promise: Promise<unknown>): Promise<void> {
  await assert.rejects(
    promise,
    /prepared_custodian_ipc_(response_incomplete|transport_failed|response_timeout)/,
  );
}

async function rawServicePrepare(
  socketPath: string,
  prepareRequest: Record<string, unknown>,
): Promise<any> {
  const requestId = h(`raw-service:${JSON.stringify(prepareRequest)}`);
  const envelope = {
    schema: "void_buy_void_prepared_transaction_custodian_ipc_request_v1",
    marker: "VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_IPC_V1",
    version: 1,
    request_id_sha256: requestId,
    method: "prepare_once",
    request: prepareRequest,
  };
  return await new Promise<any>((resolve, reject) => {
    const socket = net.createConnection({ path: socketPath });
    socket.setEncoding("utf8");
    let response = "";
    socket.on("connect", () => socket.write(`${JSON.stringify(envelope)}\n`));
    socket.on("data", (chunk) => {
      response += chunk;
      const newline = response.indexOf("\n");
      if (newline < 0) return;
      try {
        resolve(JSON.parse(response.slice(0, newline)));
      } catch (error) {
        reject(error);
      } finally {
        socket.destroy();
      }
    });
    socket.on("error", reject);
    socket.on("end", () => {
      if (!response.includes("\n")) reject(new Error("raw_service_response_incomplete"));
    });
  });
}

async function maliciousServer(
  socketPath: string,
  responseFactory: (requestId: string) => string,
): Promise<{ close: () => Promise<void> }> {
  fs.mkdirSync(path.dirname(socketPath), { recursive: true, mode: 0o700 });
  fs.chmodSync(path.dirname(socketPath), 0o700);
  try {
    fs.unlinkSync(socketPath);
  } catch (error: any) {
    if (error?.code !== "ENOENT") throw error;
  }
  const server = net.createServer((socket) => {
    socket.setEncoding("utf8");
    let input = "";
    socket.on("data", (chunk) => {
      input += chunk;
      const newline = input.indexOf("\n");
      if (newline < 0) return;
      let requestId = "0".repeat(64);
      try {
        requestId = String(
          JSON.parse(input.slice(0, newline))?.request_id_sha256 || requestId,
        );
      } catch {}
      socket.end(responseFactory(requestId));
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(socketPath, () => resolve());
  });
  fs.chmodSync(socketPath, 0o600);
  return {
    close: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      try {
        fs.unlinkSync(socketPath);
      } catch (error: any) {
        if (error?.code !== "ENOENT") throw error;
      }
    },
  };
}

try {
  assert.equal(
    VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_IPC_AUTHORITY_V1
      .transaction_broadcast,
    false,
  );
  assert.equal(
    VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_IPC_AUTHORITY_V1
      .application_private_key_access,
    false,
  );

  const normalDir = path.join(ROOT, "normal");
  const normalSocket = path.join(normalDir, "socket", "custodian.sock");
  const normalStore = path.join(normalDir, "store");
  const normalCounter = path.join(normalDir, "signer-count.txt");
  const normalRequest = request("normal");
  const normalChild = await startService({
    socket: normalSocket,
    store: normalStore,
    counter: normalCounter,
  });
  try {
    assert.equal(privateMode(path.dirname(normalSocket)), 0o700);
    assert.equal(privateMode(normalSocket), 0o600);
    const custodian = ipcCustodian({
      socket_path: normalSocket,
      timeout_ms: 2_000,
    });
    const first = await custodian.prepare_once(normalRequest);
    assert.equal(first.ok, true);
    assert.equal(first.status, "prepared");
    if (!first.ok) throw new Error("normal_prepare_held");
    assert.equal(first.wallet_address, WALLET);
    assert.equal(
      first.transaction_plan_fingerprint_sha256,
      normalRequest.transaction_plan_fingerprint_sha256,
    );
    assert.equal("raw_signed_transaction" in first, false);
    assert.equal(readCount(normalCounter), 1);
    assert.equal(readCount(`${normalCounter}.sign-events`), 1);

    const duplicate = await custodian.prepare_once(normalRequest);
    assert.equal(duplicate.ok, true);
    assert.equal(duplicate.status, "duplicate");
    assert.equal(readCount(normalCounter), 1);
    assert.equal(readCount(`${normalCounter}.sign-events`), 1);

    const inspected = await custodian.inspect_prepared({
      idempotency_key_sha256: normalRequest.idempotency_key_sha256,
      attempt_id: normalRequest.attempt_id,
      custody_handle: first.custody_handle,
    });
    assert.equal(inspected.ok, true);
    assert.equal(inspected.status, "duplicate");
    assert.equal(readCount(normalCounter), 1);
    assert.equal(readCount(`${normalCounter}.sign-events`), 1);

    const wrongKeyRequest = {
      ...request("wrong-idempotency-key"),
      idempotency_key_sha256: h("alternate-valid-looking-idempotency-key"),
    };
    await assert.rejects(
      custodian.prepare_once(wrongKeyRequest),
      /idempotency_key_mismatch/,
    );
    assert.equal(readCount(normalCounter), 1);
    assert.equal(readCount(`${normalCounter}.sign-events`), 1);

    const rawWrongKey = await rawServicePrepare(normalSocket, wrongKeyRequest);
    assert.equal(rawWrongKey?.decision?.ok, false);
    assert.equal(rawWrongKey?.decision?.status, "held");
    assert.equal(rawWrongKey?.decision?.reason, "prepared_custodian_service_failed");
    assert.equal(readCount(normalCounter), 1);
    assert.equal(readCount(`${normalCounter}.sign-events`), 1);

    const recordFile = path.join(
      normalStore,
      "records",
      `${normalRequest.idempotency_key_sha256}.json`,
    );
    assert.equal(privateMode(normalStore), 0o700);
    assert.equal(privateMode(path.dirname(recordFile)), 0o700);
    assert.equal(privateMode(recordFile), 0o600);
    const privateRecord = JSON.parse(fs.readFileSync(recordFile, "utf8"));
    const parsedPrivate = Transaction.from(privateRecord.raw_signed_transaction);
    assert.equal(parsedPrivate.from?.toLowerCase(), WALLET);
    assert.equal(parsedPrivate.to?.toLowerCase(), DELIVERY);
    assert.equal(parsedPrivate.type, 2);
    assert.equal(parsedPrivate.chainId, 2050n);
    assert.equal(parsedPrivate.nonce, normalRequest.nonce);
    assert.equal(parsedPrivate.gasLimit, BigInt(normalRequest.gas_limit));
    assert.equal(parsedPrivate.maxFeePerGas, BigInt(normalRequest.max_fee_per_gas_wei));
    assert.equal(
      parsedPrivate.maxPriorityFeePerGas,
      BigInt(normalRequest.max_priority_fee_per_gas_wei),
    );
    assert.equal(parsedPrivate.value, BigInt(normalRequest.native_value_wei));
    assert.equal(String(parsedPrivate.data || "").toLowerCase(), "0x");
    assert.equal(first.signed_transaction_hash, parsedPrivate.hash?.toLowerCase());
    assert.equal(privateRecord.transaction_broadcast_authorized, false);
    assert.equal(privateRecord.money_movement_authorized, false);

    const conflict = await custodian.prepare_once({
      ...normalRequest,
      delivery_address: "0x3333333333333333333333333333333333333333",
    });
    assert.equal(conflict.ok, false);
    if (conflict.ok) throw new Error("idempotency_conflict_unexpected_success");
    assert.match(conflict.reason, /idempotency_conflict/);
    assert.equal(readCount(normalCounter), 1);
    assert.equal(readCount(`${normalCounter}.sign-events`), 1);
  } finally {
    await stopService(normalChild);
  }

  const preSignerDir = path.join(ROOT, "pre-signer-crash");
  const preSignerSocket = path.join(preSignerDir, "socket", "custodian.sock");
  const preSignerStore = path.join(preSignerDir, "store");
  const preSignerCounter = path.join(preSignerDir, "signer-count.txt");
  const preSignerRequest = request("pre-signer");
  const preSignerCrash = await startService({
    socket: preSignerSocket,
    store: preSignerStore,
    counter: preSignerCounter,
    faultStage: "after_intent_before_signer",
  });
  await expectTransportFailure(
    ipcCustodian({
      socket_path: preSignerSocket,
      timeout_ms: 2_000,
    }).prepare_once(preSignerRequest),
  );
  await waitForExit(preSignerCrash);
  assert.equal(readCount(preSignerCounter), 0);
  assert.equal(readCount(`${preSignerCounter}.sign-events`), 0);
  assert.equal(
    fs.existsSync(
      path.join(
        preSignerStore,
        "intents",
        `${preSignerRequest.idempotency_key_sha256}.json`,
      ),
    ),
    true,
  );
  const preSignerRecovery = await startService({
    socket: preSignerSocket,
    store: preSignerStore,
    counter: preSignerCounter,
  });
  try {
    const recovered = await ipcCustodian({
      socket_path: preSignerSocket,
      timeout_ms: 2_000,
    }).prepare_once(preSignerRequest);
    assert.equal(recovered.ok, true);
    assert.equal(recovered.status, "duplicate");
    assert.equal(readCount(preSignerCounter), 1);
    assert.equal(readCount(`${preSignerCounter}.sign-events`), 1);
  } finally {
    await stopService(preSignerRecovery);
  }

  const prePersistDir = path.join(ROOT, "pre-persist-crash");
  const prePersistSocket = path.join(prePersistDir, "socket", "custodian.sock");
  const prePersistStore = path.join(prePersistDir, "store");
  const prePersistCounter = path.join(prePersistDir, "signer-count.txt");
  const prePersistRequest = request("pre-persist");
  const preCrash = await startService({
    socket: prePersistSocket,
    store: prePersistStore,
    counter: prePersistCounter,
    faultStage: "after_signer_before_persist",
  });
  const preCustodian = ipcCustodian({
    socket_path: prePersistSocket,
    timeout_ms: 2_000,
  });
  await expectTransportFailure(preCustodian.prepare_once(prePersistRequest));
  await waitForExit(preCrash);
  assert.equal(readCount(prePersistCounter), 1);
  assert.equal(readCount(`${prePersistCounter}.sign-events`), 1);
  assert.equal(
    fs.existsSync(
      path.join(
        prePersistStore,
        "records",
        `${prePersistRequest.idempotency_key_sha256}.json`,
      ),
    ),
    false,
  );
  const preRecovery = await startService({
    socket: prePersistSocket,
    store: prePersistStore,
    counter: prePersistCounter,
  });
  try {
    const recovered = await ipcCustodian({
      socket_path: prePersistSocket,
      timeout_ms: 2_000,
    }).prepare_once(prePersistRequest);
    assert.equal(recovered.ok, true);
    assert.equal(recovered.status, "duplicate");
    assert.equal(readCount(prePersistCounter), 2);
    assert.equal(readCount(`${prePersistCounter}.sign-events`), 1);
  } finally {
    await stopService(preRecovery);
  }

  const postPersistDir = path.join(ROOT, "post-persist-crash");
  const postPersistSocket = path.join(postPersistDir, "socket", "custodian.sock");
  const postPersistStore = path.join(postPersistDir, "store");
  const postPersistCounter = path.join(postPersistDir, "signer-count.txt");
  const postPersistRequest = request("post-persist");
  const postCrash = await startService({
    socket: postPersistSocket,
    store: postPersistStore,
    counter: postPersistCounter,
    faultStage: "after_record_persisted_before_reply",
  });
  const postCustodian = ipcCustodian({
    socket_path: postPersistSocket,
    timeout_ms: 2_000,
  });
  await expectTransportFailure(postCustodian.prepare_once(postPersistRequest));
  await waitForExit(postCrash);
  assert.equal(readCount(postPersistCounter), 1);
  assert.equal(readCount(`${postPersistCounter}.sign-events`), 1);
  const durableFile = path.join(
    postPersistStore,
    "records",
    `${postPersistRequest.idempotency_key_sha256}.json`,
  );
  assert.equal(fs.existsSync(durableFile), true);
  const postRecovery = await startService({
    socket: postPersistSocket,
    store: postPersistStore,
    counter: postPersistCounter,
  });
  try {
    const recovered = await ipcCustodian({
      socket_path: postPersistSocket,
      timeout_ms: 2_000,
    }).prepare_once(postPersistRequest);
    assert.equal(recovered.ok, true);
    assert.equal(recovered.status, "duplicate");
    assert.equal(readCount(postPersistCounter), 1);
    assert.equal(readCount(`${postPersistCounter}.sign-events`), 1);
  } finally {
    await stopService(postRecovery);
  }

  const concurrentDir = path.join(ROOT, "concurrent");
  const concurrentSocket = path.join(concurrentDir, "socket", "custodian.sock");
  const concurrentStore = path.join(concurrentDir, "store");
  const concurrentCounter = path.join(concurrentDir, "signer-count.txt");
  const concurrentRequest = request("concurrent");
  const concurrentChild = await startService({
    socket: concurrentSocket,
    store: concurrentStore,
    counter: concurrentCounter,
  });
  try {
    const custodian = ipcCustodian({
      socket_path: concurrentSocket,
      timeout_ms: 2_000,
    });
    const [left, right] = await Promise.all([
      custodian.prepare_once(concurrentRequest),
      custodian.prepare_once(concurrentRequest),
    ]);
    assert.equal(left.ok, true);
    assert.equal(right.ok, true);
    if (!left.ok || !right.ok) throw new Error("concurrent_prepare_held");
    assert.equal(left.custody_handle, right.custody_handle);
    assert.equal(left.signed_transaction_hash, right.signed_transaction_hash);
    assert.equal(readCount(`${concurrentCounter}.sign-events`), 1);
    assert.ok(readCount(concurrentCounter) >= 1);
    assert.ok(readCount(concurrentCounter) <= 2);
  } finally {
    await stopService(concurrentChild);
  }

  const wrongTxDir = path.join(ROOT, "wrong-transaction");
  const wrongTxSocket = path.join(wrongTxDir, "socket", "custodian.sock");
  const wrongTxStore = path.join(wrongTxDir, "store");
  const wrongTxCounter = path.join(wrongTxDir, "signer-count.txt");
  const wrongTxChild = await startService({
    socket: wrongTxSocket,
    store: wrongTxStore,
    counter: wrongTxCounter,
    wrongTransaction: true,
  });
  try {
    const wrongRequest = request("wrong-transaction");
    const decision = await ipcCustodian({
      socket_path: wrongTxSocket,
      timeout_ms: 2_000,
    }).prepare_once(wrongRequest);
    assert.equal(decision.ok, false);
    if (decision.ok) throw new Error("wrong_transaction_unexpected_success");
    assert.equal(decision.reason, "prepared_custodian_service_failed");
    assert.equal(
      fs.existsSync(
        path.join(
          wrongTxStore,
          "records",
          `${wrongRequest.idempotency_key_sha256}.json`,
        ),
      ),
      false,
    );
  } finally {
    await stopService(wrongTxChild);
  }

  const wrongSenderDir = path.join(ROOT, "wrong-sender");
  const wrongSenderSocket = path.join(wrongSenderDir, "socket", "custodian.sock");
  const wrongSenderStore = path.join(wrongSenderDir, "store");
  const wrongSenderCounter = path.join(wrongSenderDir, "signer-count.txt");
  const wrongSenderChild = await startService({
    socket: wrongSenderSocket,
    store: wrongSenderStore,
    counter: wrongSenderCounter,
    wrongSender: true,
  });
  try {
    const wrongRequest = request("wrong-sender");
    const decision = await ipcCustodian({
      socket_path: wrongSenderSocket,
      timeout_ms: 2_000,
    }).prepare_once(wrongRequest);
    assert.equal(decision.ok, false);
    if (decision.ok) throw new Error("wrong_sender_unexpected_success");
    assert.equal(decision.reason, "prepared_custodian_service_failed");
  } finally {
    await stopService(wrongSenderChild);
  }

  const badDir = path.join(ROOT, "bad-signer");
  const badSocket = path.join(badDir, "socket", "custodian.sock");
  const badStore = path.join(badDir, "store");
  const badCounter = path.join(badDir, "signer-count.txt");
  const badChild = await startService({
    socket: badSocket,
    store: badStore,
    counter: badCounter,
    badSigner: true,
  });
  try {
    const decision = await ipcCustodian({
      socket_path: badSocket,
      timeout_ms: 2_000,
    }).prepare_once(request("bad-signer"));
    assert.equal(decision.ok, false);
    if (decision.ok) throw new Error("bad_signer_unexpected_success");
    assert.equal(decision.reason, "prepared_custodian_service_failed");
    assert.equal(JSON.stringify(decision).includes("private_key"), false);
  } finally {
    await stopService(badChild);
  }

  const permissionDir = path.join(ROOT, "permission");
  const permissionSocket = path.join(permissionDir, "socket", "custodian.sock");
  const permissionStore = path.join(permissionDir, "store");
  const permissionCounter = path.join(permissionDir, "signer-count.txt");
  const permissionChild = await startService({
    socket: permissionSocket,
    store: permissionStore,
    counter: permissionCounter,
  });
  try {
    fs.chmodSync(permissionSocket, 0o666);
    await assert.rejects(
      ipcCustodian({
        socket_path: permissionSocket,
      }).prepare_once(request("permission")),
      /socket_must_be_private/,
    );
    fs.chmodSync(permissionSocket, 0o600);
  } finally {
    await stopService(permissionChild);
  }

  const symlinkRealDir = path.join(ROOT, "symlink-real");
  const symlinkAliasDir = path.join(ROOT, "symlink-alias");
  const symlinkRealSocket = path.join(symlinkRealDir, "custodian.sock");
  const symlinkServer = await maliciousServer(
    symlinkRealSocket,
    (requestId) =>
      `${JSON.stringify({
        schema: "void_buy_void_prepared_transaction_custodian_ipc_response_v1",
        marker: "VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_IPC_V1",
        version: 1,
        request_id_sha256: requestId,
        decision: { ok: false, status: "held", reason: "synthetic_hold" },
      })}\n`,
  );
  fs.symlinkSync(symlinkRealDir, symlinkAliasDir, "dir");
  try {
    await assert.rejects(
      ipcCustodian({
        socket_path: path.join(symlinkAliasDir, "custodian.sock"),
      }).prepare_once(request("symlink-parent")),
      /symlink_ancestor_rejected/,
    );
  } finally {
    fs.unlinkSync(symlinkAliasDir);
    await symlinkServer.close();
  }

  const maliciousDir = path.join(ROOT, "malicious");

  const wrongFingerprintSocket = path.join(maliciousDir, "wrong-fingerprint.sock");
  const wrongFingerprintServer = await maliciousServer(
    wrongFingerprintSocket,
    (requestId) =>
      `${JSON.stringify({
        schema: "void_buy_void_prepared_transaction_custodian_ipc_response_v1",
        marker: "VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_IPC_V1",
        version: 1,
        request_id_sha256: requestId,
        decision: {
          ok: true,
          status: "prepared",
          custody_handle: `custody:void-buy:ipc-v1/${request("wrong-fingerprint").idempotency_key_sha256}`,
          signed_transaction_hash: `0x${"1".repeat(64)}`,
          wallet_address: WALLET,
          signer_fingerprint_sha256: "ab".repeat(32),
          transaction_plan_fingerprint_sha256:
            request("wrong-fingerprint").transaction_plan_fingerprint_sha256,
        },
      })}\n`,
  );
  try {
    await assert.rejects(
      ipcCustodian({ socket_path: wrongFingerprintSocket }).prepare_once(
        request("wrong-fingerprint"),
      ),
      /signer_fingerprint_mismatch/,
    );
  } finally {
    await wrongFingerprintServer.close();
  }

  const wrongHandleSocket = path.join(maliciousDir, "wrong-handle.sock");
  const wrongHandleServer = await maliciousServer(
    wrongHandleSocket,
    (requestId) =>
      `${JSON.stringify({
        schema: "void_buy_void_prepared_transaction_custodian_ipc_response_v1",
        marker: "VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_IPC_V1",
        version: 1,
        request_id_sha256: requestId,
        decision: {
          ok: true,
          status: "prepared",
          custody_handle: "custody:void-buy:ipc-v1/not-the-idempotency-key",
          signed_transaction_hash: `0x${"1".repeat(64)}`,
          wallet_address: WALLET,
          signer_fingerprint_sha256: SIGNER_FP,
          transaction_plan_fingerprint_sha256:
            request("wrong-handle").transaction_plan_fingerprint_sha256,
        },
      })}\n`,
  );
  try {
    await assert.rejects(
      ipcCustodian({ socket_path: wrongHandleSocket }).prepare_once(
        request("wrong-handle"),
      ),
      /prepare_response_binding_invalid/,
    );
  } finally {
    await wrongHandleServer.close();
  }

  const secretSocket = path.join(maliciousDir, "secret.sock");
  const secretServer = await maliciousServer(
    secretSocket,
    (requestId) =>
      `${JSON.stringify({
        schema: "void_buy_void_prepared_transaction_custodian_ipc_response_v1",
        marker: "VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_IPC_V1",
        version: 1,
        request_id_sha256: requestId,
        decision: {
          ok: true,
          status: "prepared",
          custody_handle: "custody:void-buy:ipc-v1/x",
          signed_transaction_hash: `0x${"1".repeat(64)}`,
          wallet_address: WALLET,
          signer_fingerprint_sha256: SIGNER_FP,
          transaction_plan_fingerprint_sha256: h("malicious"),
          raw_signed_transaction: "0xdeadbeef",
        },
      })}\n`,
  );
  try {
    await assert.rejects(
      ipcCustodian({
        socket_path: secretSocket,
      }).prepare_once(request("secret-response")),
      /secret_response_rejected/,
    );
  } finally {
    await secretServer.close();
  }

  const secretReasonSocket = path.join(maliciousDir, "secret-reason.sock");
  const secretReasonServer = await maliciousServer(
    secretReasonSocket,
    (requestId) =>
      `${JSON.stringify({
        schema: "void_buy_void_prepared_transaction_custodian_ipc_response_v1",
        marker: "VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_IPC_V1",
        version: 1,
        request_id_sha256: requestId,
        decision: {
          ok: false,
          status: "held",
          reason: `${"ab".repeat(32)}`,
        },
      })}\n`,
  );
  try {
    await assert.rejects(
      ipcCustodian({
        socket_path: secretReasonSocket,
      }).prepare_once(request("secret-reason")),
      /held_invalid/,
    );
  } finally {
    await secretReasonServer.close();
  }

  const hugeSocket = path.join(maliciousDir, "huge.sock");
  const hugeServer = await maliciousServer(
    hugeSocket,
    () => `${"x".repeat(70 * 1024)}\n`,
  );
  try {
    await assert.rejects(
      ipcCustodian({
        socket_path: hugeSocket,
        max_response_bytes: 64 * 1024,
      }).prepare_once(request("huge-response")),
      /response_too_large/,
    );
  } finally {
    await hugeServer.close();
  }

  console.log("VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_IPC_V1_PROOF_GREEN");
  console.log("unix_socket_only=true");
  console.log("socket_mode_0600=true");
  console.log("private_store_mode_0700=true");
  console.log("private_record_mode_0600=true");
  console.log("raw_signed_transaction_crossed_application_ipc=false");
  console.log("prepare_once_idempotent=true");
  console.log("inspect_prepared_read_only=true");
  console.log("durable_intent_before_signer=true");
  console.log("pre_sign_crash_recovery_signs_once=true");
  console.log("pre_persist_crash_recovered_without_resigning=true");
  console.log("post_persist_crash_recovered_without_resigning=true");
  console.log("concurrent_prepare_single_signing_event=true");
  console.log("signer_prepare_once_idempotency_required=true");
  console.log("idempotency_conflict_rejected=true");
  console.log("deterministic_idempotency_key_verified=true");
  console.log("alternate_idempotency_key_rejected_before_signer=true");
  console.log("signed_transaction_plan_binding_verified=true");
  console.log("signed_transaction_sender_verified=true");
  console.log("persisted_record_transaction_revalidated=true");
  console.log("server_controlled_signer_fingerprint=true");
  console.log("opaque_handle_exactly_bound_to_idempotency_key=true");
  console.log("focused_trigger_dependencies_closed=true");
  console.log("secret_bearing_signer_result_returned=false");
  console.log("secret_bearing_ipc_response_accepted=false");
  console.log("oversized_ipc_response_accepted=false");
  console.log("secret_bearing_held_reason_accepted=false");
  console.log("symlink_socket_ancestor_accepted=false");
  console.log("direct_in_process_prepare_interface=false");
  console.log("transaction_broadcast_interface=false");
  console.log("application_private_key_access=false");
  console.log("application_wallet_access=false");
  console.log("production_signer_use=false");
  console.log("synthetic_test_signing=true");
  console.log("money_movement=false");
} finally {
  for (const child of CHILDREN) {
    if (child.exitCode === null) child.kill("SIGKILL");
  }
  fs.rmSync(ROOT, { recursive: true, force: true });
}
