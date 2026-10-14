export const DATANET_PUBLIC_CHUNK_SNAPSHOT_AGGREGATE_BYTES_V1 =
  128 * 1024 * 1024;
export const DATANET_PUBLIC_CHUNK_SNAPSHOT_MAX_IN_FLIGHT_V1 = 8;
export const DATANET_CHUNK_SNAPSHOT_CAPACITY_CODE_V1 =
  "DATANET_CHUNK_SNAPSHOT_CAPACITY_V1";

export class DataNetChunkSnapshotCapacityErrorV1 extends Error {
  readonly code = DATANET_CHUNK_SNAPSHOT_CAPACITY_CODE_V1;

  constructor() {
    super("datanet_chunk_snapshot_capacity_exceeded");
    this.name = "DataNetChunkSnapshotCapacityErrorV1";
  }
}

export type DataNetChunkSnapshotReservationV1 = Readonly<{
  bytes: number;
  release: () => boolean;
}>;

export type DataNetChunkSnapshotBudgetSnapshotV1 = Readonly<{
  in_flight_bytes: number;
  in_flight_reservations: number;
  max_aggregate_bytes: number;
  max_reservation_bytes: number;
  max_reservations: number;
}>;

export class DataNetChunkSnapshotBudgetV1 {
  readonly maxAggregateBytes: number;
  readonly maxReservationBytes: number;
  readonly maxReservations: number;

  private inFlightBytes = 0;
  private readonly activeReservations = new Map<symbol, number>();

  constructor(opts: {
    maxAggregateBytes: number;
    maxReservationBytes: number;
    maxReservations: number;
  }) {
    if (
      !Number.isSafeInteger(opts.maxAggregateBytes) ||
      opts.maxAggregateBytes <= 0 ||
      !Number.isSafeInteger(opts.maxReservationBytes) ||
      opts.maxReservationBytes <= 0 ||
      opts.maxReservationBytes > opts.maxAggregateBytes ||
      !Number.isSafeInteger(opts.maxReservations) ||
      opts.maxReservations <= 0 ||
      opts.maxReservations > 1024
    ) {
      throw new RangeError("datanet_chunk_snapshot_budget_invalid");
    }

    this.maxAggregateBytes = opts.maxAggregateBytes;
    this.maxReservationBytes = opts.maxReservationBytes;
    this.maxReservations = opts.maxReservations;
  }

  tryReserve(bytes: number): DataNetChunkSnapshotReservationV1 | null {
    if (
      !Number.isSafeInteger(bytes) ||
      bytes <= 0 ||
      bytes > this.maxReservationBytes
    ) {
      throw new RangeError("datanet_chunk_snapshot_reservation_size_invalid");
    }

    if (
      this.activeReservations.size >= this.maxReservations ||
      this.inFlightBytes > this.maxAggregateBytes - bytes
    ) {
      return null;
    }

    const id = Symbol("datanet_chunk_snapshot_reservation_v1");
    this.activeReservations.set(id, bytes);
    this.inFlightBytes += bytes;

    let released = false;
    const release = (): boolean => {
      if (released) return false;

      const ownedBytes = this.activeReservations.get(id);
      if (ownedBytes !== bytes) {
        throw new Error("datanet_chunk_snapshot_reservation_ownership_invalid");
      }

      this.activeReservations.delete(id);
      this.inFlightBytes -= bytes;
      if (this.inFlightBytes < 0) {
        throw new Error("datanet_chunk_snapshot_budget_underflow");
      }
      released = true;
      return true;
    };

    return Object.freeze({
      bytes,
      release,
    });
  }

  snapshot(): DataNetChunkSnapshotBudgetSnapshotV1 {
    return Object.freeze({
      in_flight_bytes: this.inFlightBytes,
      in_flight_reservations: this.activeReservations.size,
      max_aggregate_bytes: this.maxAggregateBytes,
      max_reservation_bytes: this.maxReservationBytes,
      max_reservations: this.maxReservations,
    });
  }
}
