// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

/** Additive shim: widen Response.json() to Promise<any> for Node/TS combos that type it as unknown. */
declare interface Response { json(): Promise<any>; }
