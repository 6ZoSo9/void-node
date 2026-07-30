#!/usr/bin/env node
import http from "node:http";
import https from "node:https";
import process from "node:process";
import { URL } from "node:url";

const MARKER = "VOID_DATANET_REPLICA_BALANCE_NIMO_CANARY_V1";
const CONFIRMATION = "import-one-datanet-replica-to-nimo";
const DEFAULT_TIMEOUT_MS = 10_000;
const DATASET_ID_RE = /^[A-Za-z0-9._:-]{1,200}$/;

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) {
      throw new Error(`unexpected positional argument: ${item}`);
    }
    const separator = item.indexOf("=");
    if (separator !== -1) {
      values[item.slice(2, separator)] = item.slice(separator + 1);
      continue;
    }
    const key = item.slice(2);
    const next = argv[index + 1];
    if (next !== undefined && !next.startsWith("--")) {
      values[key] = next;
      index += 1;
    } else {
      values[key] = "true";
    }
  }
  return values;
}

function normalizeBase(value, label) {
  if (!value) throw new Error(`${label} is required`);
  const parsed = new URL(value);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`${label} must use http or https`);
  }
  if (parsed.username || parsed.password) {
    throw new Error(`${label} must not contain credentials`);
  }
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

function normalizeDatasetId(value) {
  if (!DATASET_ID_RE.test(value || "")) {
    throw new Error("dataset-id must match [A-Za-z0-9._:-] and be 1-200 characters");
  }
  return value;
}

function request(urlValue, { method = "GET", body, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const url = new URL(urlValue);
  const transport = url.protocol === "https:" ? https : http;
  const encoded = body === undefined ? undefined : Buffer.from(JSON.stringify(body));
  const headers = { accept: "application/json" };
  if (encoded !== undefined) {
    headers["content-type"] = "application/json";
    headers["content-length"] = String(encoded.length);
  }

  return new Promise((resolve, reject) => {
    const req = transport.request(
      url,
      { method, headers, timeout: timeoutMs },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          let json = null;
          try {
            json = raw ? JSON.parse(raw) : null;
          } catch {
            json = null;
          }
          resolve({
            method,
            url: url.toString(),
            status: Number(res.statusCode || 0),
            json,
            body: raw,
          });
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error(`request timeout: ${url}`)));
    req.on("error", reject);
    if (encoded !== undefined) req.write(encoded);
    req.end();
  });
}

function compatibilityPayload({ datasetId, sourceBase, who }) {
  return {
    schema: MARKER,
    kind: "datanet_replica_balance_nimo_canary_v1",
    dataset_id: datasetId,
    datasetId,
    id: datasetId,
    peer_http: sourceBase,
    peerHttp: sourceBase,
    source_peer: "precision",
    sourcePeer: "precision",
    source_who: who,
    sourceWho: who,
    who,
  };
}

function compactResponse(value) {
  return {
    method: value.method,
    url: value.url,
    status: value.status,
    json: value.json,
  };
}

async function inspect({ sourceBase, targetBase, datasetId, timeoutMs }) {
  const fetchPath = `/datanet/v1/fetch/${encodeURIComponent(datasetId)}`;
  const [sourceStatus, targetStatus, sourceFetch, targetFetch] = await Promise.all([
    request(`${sourceBase}/datanet/v1/status`, { timeoutMs }),
    request(`${targetBase}/datanet/v1/status`, { timeoutMs }),
    request(`${sourceBase}${fetchPath}`, { timeoutMs }),
    request(`${targetBase}${fetchPath}`, { timeoutMs }),
  ]);
  return {
    sourceStatus,
    targetStatus,
    sourceFetch,
    targetFetch,
    sourceAvailable: sourceFetch.status === 200,
    targetPresent: targetFetch.status === 200,
    targetMissing: [400, 404].includes(targetFetch.status),
  };
}

function emit(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = args.mode || "plan";
  if (!["plan", "execute"].includes(mode)) {
    throw new Error("mode must be plan or execute");
  }

  const sourceBase = normalizeBase(args["source-base"], "source-base");
  const targetBase = normalizeBase(args["target-base"], "target-base");
  const datasetId = normalizeDatasetId(args["dataset-id"]);
  const who = args.who || "void-datanet-replica-balance-nimo-canary-v1";
  const timeoutMs = Number(args["timeout-ms"] || DEFAULT_TIMEOUT_MS);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 120_000) {
    throw new Error("timeout-ms must be an integer between 100 and 120000");
  }

  const payload = compatibilityPayload({ datasetId, sourceBase, who });
  const before = await inspect({ sourceBase, targetBase, datasetId, timeoutMs });

  if (!before.sourceAvailable) {
    throw new Error(`source dataset is not available: status=${before.sourceFetch.status}`);
  }
  if (!before.targetPresent && !before.targetMissing) {
    throw new Error(`target dataset state is ambiguous: status=${before.targetFetch.status}`);
  }

  if (mode === "plan") {
    emit({
      marker: MARKER,
      status: "plan-green",
      mode,
      dataset_id: datasetId,
      source_base: sourceBase,
      target_base: targetBase,
      import_route: "/datanet/v1/import-from-peer",
      import_required: !before.targetPresent,
      already_present: before.targetPresent,
      payload,
      before: {
        source_status: compactResponse(before.sourceStatus),
        target_status: compactResponse(before.targetStatus),
        source_fetch: compactResponse(before.sourceFetch),
        target_fetch: compactResponse(before.targetFetch),
      },
      mutation_attempted: false,
      service_restart: false,
      wallet_or_signer_access: false,
      transaction_submission: false,
      work_credit_write: false,
    });
    return;
  }

  if (args.confirm !== CONFIRMATION) {
    throw new Error(`execute mode requires --confirm=${CONFIRMATION}`);
  }

  if (before.targetPresent) {
    emit({
      marker: MARKER,
      status: "execute-green",
      result: "already-present-noop",
      dataset_id: datasetId,
      import_attempted: false,
      duplicate_safe: true,
      service_restart: false,
      wallet_or_signer_access: false,
      transaction_submission: false,
      work_credit_write: false,
    });
    return;
  }

  const imported = await request(`${targetBase}/datanet/v1/import-from-peer`, {
    method: "POST",
    body: payload,
    timeoutMs,
  });
  if (![200, 201, 202].includes(imported.status)) {
    throw new Error(
      `import-from-peer failed: status=${imported.status} body=${imported.body.slice(0, 500)}`,
    );
  }

  const after = await request(
    `${targetBase}/datanet/v1/fetch/${encodeURIComponent(datasetId)}`,
    { timeoutMs },
  );
  if (after.status !== 200) {
    throw new Error(`post-import target verification failed: status=${after.status}`);
  }

  emit({
    marker: MARKER,
    status: "execute-green",
    result: "imported-and-verified",
    dataset_id: datasetId,
    source_base: sourceBase,
    target_base: targetBase,
    import_response: compactResponse(imported),
    target_fetch_after: compactResponse(after),
    import_attempted: true,
    duplicate_safe: true,
    bounded_single_dataset: true,
    service_restart: false,
    wallet_or_signer_access: false,
    transaction_submission: false,
    work_credit_write: false,
  });
}

main().catch((error) => {
  process.stderr.write(`${MARKER}_HOLD\n`);
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.stderr.write("service_restart=false\n");
  process.stderr.write("wallet_or_signer_access=false\n");
  process.stderr.write("transaction_submission=false\n");
  process.stderr.write("work_credit_write=false\n");
  process.exitCode = 1;
});
