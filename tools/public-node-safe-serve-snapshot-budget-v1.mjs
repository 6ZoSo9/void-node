#!/usr/bin/env node

export const VOID_PUBLIC_NODE_SAFE_SERVE_SNAPSHOT_BUDGET_V1 =
  "VOID_PUBLIC_NODE_SAFE_SERVE_SNAPSHOT_BUDGET_V1";
export const PUBLIC_NODE_SAFE_SERVE_SNAPSHOT_AGGREGATE_BYTES_V1 =
  32 * 1024 * 1024;
export const PUBLIC_NODE_SAFE_SERVE_SNAPSHOT_MAX_IN_FLIGHT_V1 = 8;

export class PublicNodeSafeServeSnapshotBudgetV1 {
  #maxAggregateBytes;
  #maxReservationBytes;
  #maxReservations;
  #inFlightBytes = 0;
  #activeReservations = new Map();

  constructor({
    maxAggregateBytes,
    maxReservationBytes,
    maxReservations,
  }) {
    if (
      !Number.isSafeInteger(maxAggregateBytes) ||
      maxAggregateBytes <= 0 ||
      !Number.isSafeInteger(maxReservationBytes) ||
      maxReservationBytes <= 0 ||
      maxReservationBytes > maxAggregateBytes ||
      !Number.isSafeInteger(maxReservations) ||
      maxReservations <= 0 ||
      maxReservations > 1024
    ) {
      throw new RangeError("public_safe_serve_snapshot_budget_invalid");
    }

    this.#maxAggregateBytes = maxAggregateBytes;
    this.#maxReservationBytes = maxReservationBytes;
    this.#maxReservations = maxReservations;
  }

  get maxAggregateBytes() {
    return this.#maxAggregateBytes;
  }

  get maxReservationBytes() {
    return this.#maxReservationBytes;
  }

  get maxReservations() {
    return this.#maxReservations;
  }

  tryReserve(bytes) {
    if (
      !Number.isSafeInteger(bytes) ||
      bytes <= 0 ||
      bytes > this.#maxReservationBytes
    ) {
      throw new RangeError(
        "public_safe_serve_snapshot_reservation_size_invalid",
      );
    }

    if (
      this.#activeReservations.size >= this.#maxReservations ||
      this.#inFlightBytes > this.#maxAggregateBytes - bytes
    ) {
      return null;
    }

    const id = Symbol("public_safe_serve_snapshot_reservation_v1");
    this.#activeReservations.set(id, bytes);
    this.#inFlightBytes += bytes;

    let released = false;
    const release = () => {
      if (released) return false;

      const ownedBytes = this.#activeReservations.get(id);
      if (ownedBytes !== bytes) {
        throw new Error(
          "public_safe_serve_snapshot_reservation_ownership_invalid",
        );
      }

      this.#activeReservations.delete(id);
      this.#inFlightBytes -= bytes;
      if (this.#inFlightBytes < 0) {
        throw new Error("public_safe_serve_snapshot_budget_underflow");
      }
      released = true;
      return true;
    };

    return Object.freeze({ bytes, release });
  }

  snapshot() {
    return Object.freeze({
      marker: VOID_PUBLIC_NODE_SAFE_SERVE_SNAPSHOT_BUDGET_V1,
      in_flight_bytes: this.#inFlightBytes,
      in_flight_reservations: this.#activeReservations.size,
      max_aggregate_bytes: this.#maxAggregateBytes,
      max_reservation_bytes: this.#maxReservationBytes,
      max_reservations: this.#maxReservations,
    });
  }
}

export function armPublicNodeSafeServeSnapshotReservationV1(
  req,
  res,
  reservation,
) {
  if (
    !req ||
    typeof req.once !== "function" ||
    !res ||
    typeof res.once !== "function" ||
    !reservation ||
    typeof reservation.release !== "function"
  ) {
    throw new TypeError(
      "public_safe_serve_snapshot_lifecycle_input_invalid",
    );
  }

  let released = false;
  const releaseOnce = () => {
    if (released) return false;
    released = true;
    return reservation.release();
  };

  req.once("aborted", releaseOnce);
  res.once("finish", releaseOnce);
  res.once("close", releaseOnce);
  res.once("error", releaseOnce);

  if (req.aborted === true || res.destroyed === true) {
    releaseOnce();
  }

  return releaseOnce;
}
