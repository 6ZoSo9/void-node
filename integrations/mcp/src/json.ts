import { createHash } from "node:crypto";

export type JsonPrimitive = null | boolean | number | string;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export function isJsonObject(
  value: unknown,
): value is Record<string, JsonValue> {
  return Boolean(
    value !== null
    && typeof value === "object"
    && !Array.isArray(value),
  );
}

export function sortJson(value: unknown): JsonValue {
  if (value === null) return null;
  if (
    typeof value === "string"
    || typeof value === "boolean"
    || (
      typeof value === "number"
      && Number.isFinite(value)
    )
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((child) => sortJson(child));
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, sortJson(record[key])]),
    );
  }
  throw new Error("value contains a non-JSON member");
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

export function prettyJson(value: unknown): string {
  return `${JSON.stringify(sortJson(value), null, 2)}\n`;
}

export function sha256Text(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function parseJsonObject(
  text: string,
  label: string,
): Record<string, JsonValue> {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    throw new Error(`${label} returned invalid JSON`);
  }
  if (!isJsonObject(value)) {
    throw new Error(`${label} must return a JSON object`);
  }
  return value;
}

export function redactText(
  raw: string,
  secrets: readonly string[],
): string {
  let result = raw;
  for (const secret of secrets) {
    if (!secret) continue;
    result = result.split(secret).join("[REDACTED]");
  }
  return result;
}

export function safeErrorMessage(
  error: unknown,
  secrets: readonly string[] = [],
): string {
  const message = error instanceof Error ? error.message : String(error);
  return redactText(message, secrets)
    .replaceAll(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .slice(0, 4096);
}
