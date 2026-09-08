import dns from "node:dns";

const DEFAULT_DNS_HARD_TIMEOUT_MS_V1 = 10_000;

function boundedTimeoutMsV1(raw) {
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 50 || value > 60_000) {
    throw new Error("public bootstrap DNS timeout must be an integer from 50 through 60000 ms");
  }
  return value;
}

function createDefaultResolverV1(queryTimeoutMs) {
  return new dns.promises.Resolver({
    timeout: queryTimeoutMs,
    tries: 1,
  });
}

function normalizeResolverRecordsV1(results) {
  const records = [];
  const failures = [];

  for (const [index, result] of results.entries()) {
    const family = index === 0 ? 4 : 6;
    if (result.status === "rejected") {
      failures.push(result.reason);
      continue;
    }
    if (!Array.isArray(result.value)) {
      failures.push(new Error(`DNS IPv${family} result is not an array`));
      continue;
    }
    for (const rawAddress of result.value) {
      records.push({
        address: String(rawAddress),
        family,
      });
    }
  }

  if (records.length > 0) return records;

  const preferredFailure =
    failures.find((error) => {
      const code = String(error?.code || "");
      return code && code !== "ENODATA" && code !== "ENOTFOUND";
    }) ||
    failures[0];

  if (preferredFailure instanceof Error) throw preferredFailure;
  throw new Error("public bootstrap DNS resolver returned no address records");
}

export async function lookupDnsRecordsBoundedV1(
  hostname,
  {
    timeoutMs = DEFAULT_DNS_HARD_TIMEOUT_MS_V1,
    resolverFactory = createDefaultResolverV1,
  } = {},
) {
  const host = String(hostname || "").trim();
  if (!host) throw new Error("public bootstrap DNS hostname is empty");

  const hardTimeoutMs = boundedTimeoutMsV1(timeoutMs);
  // Let c-ares reach its own terminal result before the outer hard wall where
  // possible. The outer wall is still authoritative and invokes cancel().
  const queryTimeoutMs =
    hardTimeoutMs <= 200
      ? Math.max(1, hardTimeoutMs - 1)
      : Math.max(100, Math.floor(hardTimeoutMs * 0.75));

  const resolver = resolverFactory(queryTimeoutMs);
  if (
    !resolver ||
    typeof resolver.resolve4 !== "function" ||
    typeof resolver.resolve6 !== "function" ||
    typeof resolver.cancel !== "function"
  ) {
    throw new Error("public bootstrap DNS resolver factory returned an invalid resolver");
  }

  let timeoutHandle = null;
  const cancel = () => {
    try {
      resolver.cancel();
    } catch {
      // Cancellation is best-effort cleanup; the outer deadline remains the
      // authoritative application-level result.
    }
  };

  const query = Promise.allSettled([
    Promise.resolve().then(() => resolver.resolve4(host)),
    Promise.resolve().then(() => resolver.resolve6(host)),
  ]).then(normalizeResolverRecordsV1);

  const hardDeadline = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      cancel();
      const error = new Error(
        `public bootstrap DNS lookup timed out after ${hardTimeoutMs} ms`,
      );
      error.code = "ETIMEDOUT";
      reject(error);
    }, hardTimeoutMs);
  });

  try {
    return await Promise.race([query, hardDeadline]);
  } finally {
    if (timeoutHandle !== null) clearTimeout(timeoutHandle);
    cancel();
  }
}
