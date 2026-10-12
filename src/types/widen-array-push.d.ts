declare global {
  interface Array<T> {
    // Accept any item type for push to avoid never[] push errors in additive exporters
    push(...items: any[]): number;
  }
}
export {};
