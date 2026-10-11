import { types as utilTypes } from "node:util";

export function deferredV1() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

export function immutableJsonSnapshotV1(value, ancestors = new WeakSet()) {
  if (value === null || typeof value === "string" ||
      typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw Error("snapshot_number_invalid");
    return value;
  }
  if (!value || typeof value !== "object" || utilTypes.isProxy(value)) {
    throw Error("snapshot_value_invalid");
  }
  if (ancestors.has(value)) throw Error("snapshot_cycle");
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      if (Reflect.ownKeys(value).length !== value.length + 1) {
        throw Error("snapshot_array_shape");
      }
      const output = [];
      Object.defineProperty(output, "toJSON", {
        value: undefined,
        enumerable: false,
      });
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor || !Object.hasOwn(descriptor, "value") ||
            descriptor.enumerable !== true) throw Error("snapshot_accessor");
        Object.defineProperty(output, String(index), {
          value: immutableJsonSnapshotV1(descriptor.value, ancestors),
          enumerable: true,
          writable: false,
          configurable: false,
        });
      }
      return Object.freeze(output);
    }
    const output = Object.create(null);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string" || key === "toJSON") {
        throw Error("snapshot_key_invalid");
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !Object.hasOwn(descriptor, "value") ||
          descriptor.enumerable !== true) throw Error("snapshot_accessor");
      Object.defineProperty(output, key, {
        value: immutableJsonSnapshotV1(descriptor.value, ancestors),
        enumerable: true,
        writable: false,
        configurable: false,
      });
    }
    return Object.freeze(output);
  } finally {
    ancestors.delete(value);
  }
}
