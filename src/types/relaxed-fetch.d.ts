/** Additive shim: widen Response.json() to Promise<any> for Node/TS combos that type it as unknown. */
declare interface Response { json(): Promise<any>; }
