// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

type GMap = Record<string, number>;

export class Metrics {
  private counters: GMap = Object.create(null);
  public gauges: GMap = Object.create(null);

  inc(name: string, by = 1) {
    this.counters[name] = (this.counters[name] || 0) + by;
  }
  set(name: string, val: number) {
    this.gauges[name] = val;
  }

  renderText(extras?: Partial<GMap>): string {
    const g: GMap = { ...this.gauges, ...(extras || {}) } as GMap;
    const lines: string[] = [];
    // counters
    for (const [k, v] of Object.entries(this.counters)) {
      lines.push(`# TYPE void_${k} counter`);
      lines.push(`void_${k} ${v ?? 0}`);
    }
    // gauges
    for (const [k, v] of Object.entries(g)) {
      lines.push(`# TYPE void_${k} gauge`);
      lines.push(`void_${k} ${v ?? 0}`);
    }
    return lines.join("\n") + "\n";
  }
}

