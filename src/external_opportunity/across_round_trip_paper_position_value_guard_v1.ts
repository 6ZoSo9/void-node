import {
  composeAcrossRoundTripPaperV1,
  type AcrossRoundTripPaperCompositionReceiptV1,
} from "./across_round_trip_paper_composition_v1.js";

export const VOID_ACROSS_ROUND_TRIP_PAPER_POSITION_VALUE_GUARD_V1 =
  "VOID_ACROSS_ROUND_TRIP_PAPER_POSITION_VALUE_GUARD_V1" as const;

const USD_SCALE = 1_000_000n;

type RecordValue = Record<string, unknown>;

function hold(message: string): never {
  throw new Error(`HOLD: ${message}`);
}

function record(value: unknown, label: string): RecordValue {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    hold(`${label} must be an object`);
  }
  return value as RecordValue;
}

function boundedString(value: unknown, label: string, maximumLength: number): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > maximumLength ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    hold(`${label} must be a bounded printable string`);
  }
  return value;
}

function safeInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    hold(`${label} must be a safe integer in range`);
  }
  return value;
}

function canonicalUnsignedInteger(value: unknown, label: string): bigint {
  const text = boundedString(value, label, 128);
  if (!/^(0|[1-9][0-9]*)$/.test(text)) {
    hold(`${label} must be a canonical unsigned integer string`);
  }
  const parsed = BigInt(text);
  if (parsed < 1n) hold(`${label} must be positive`);
  return parsed;
}

function parseUsdMicros(value: unknown, label: string): bigint {
  const text = boundedString(value, label, 64);
  if (!/^(0|[1-9][0-9]*)(\.[0-9]{1,6})?$/.test(text)) {
    hold(`${label} must be a non-negative USD decimal with at most 6 places`);
  }
  const [whole, fraction = ""] = text.split(".");
  return BigInt(whole) * USD_SCALE + BigInt(`${fraction}000000`.slice(0, 6));
}

function pow10(exponent: number): bigint {
  return 10n ** BigInt(exponent);
}

function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  if (numerator < 0n || denominator <= 0n) {
    hold("ceilDiv received invalid values");
  }
  return (numerator + denominator - 1n) / denominator;
}

export function assertAcrossRoundTripPaperPositionValueConsistentV1(value: unknown): void {
  const input = record(value, "Across round-trip paper composition input");
  const valuation = record(input.valuation, "valuation");
  const selector = record(valuation.selector, "valuation.selector");
  const selectedToken = record(valuation.selected_token, "valuation.selected_token");

  const amount = canonicalUnsignedInteger(selector.amount, "valuation.selector.amount");
  const decimals = safeInteger(
    selectedToken.decimals,
    "valuation.selected_token.decimals",
    0,
    36,
  );
  const sourcePrecisionDigits = safeInteger(
    valuation.price_source_precision_digits,
    "valuation.price_source_precision_digits",
    0,
    36,
  );
  const priceFloorMicros = parseUsdMicros(
    valuation.price_usd_floor,
    "valuation.price_usd_floor",
  );
  const positionValueMicros = parseUsdMicros(
    valuation.position_value_usd_floor,
    "valuation.position_value_usd_floor",
  );

  const tokenUnitScale = pow10(decimals);
  const lowerBoundMicros = (priceFloorMicros * amount) / tokenUnitScale;
  const upperExclusiveMicros =
    sourcePrecisionDigits <= 6
      ? lowerBoundMicros + 1n
      : ceilDiv((priceFloorMicros + 1n) * amount, tokenUnitScale);

  if (
    positionValueMicros < lowerBoundMicros ||
    positionValueMicros >= upperExclusiveMicros
  ) {
    hold(
      "valuation position value is inconsistent with price floor, amount, decimals, and source precision",
    );
  }
}

export function composeAcrossRoundTripPaperPositionGuardedV1(
  value: unknown,
): AcrossRoundTripPaperCompositionReceiptV1 {
  assertAcrossRoundTripPaperPositionValueConsistentV1(value);
  return composeAcrossRoundTripPaperV1(value);
}
