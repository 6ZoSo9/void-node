import fs from "node:fs";
import path from "node:path";

// Server-owned request intake only. This is NOT an operator payment,
// custody/allocation, wallet or transaction writer. An ordered tuple keeps
// the enormous index.ts boot entry below its independent size ceiling.
export const VOID_BUY_VOID_PUBLIC_REQUEST_UNDER_LAUNCH_LOCK_V1 =
  "VOID_BUY_VOID_PUBLIC_REQUEST_UNDER_LAUNCH_LOCK_V1";

export type BuyVoidPublicRequestLaunchLockCallbacksV1 = readonly [
  withLaunchMutation: (request: any, operation: () => Promise<any>) => Promise<any>,
  readRequests: () => Promise<any[]>,
  readEvents: () => Promise<any[]>,
  applyEvents: (requests: any[], events: any[]) => any[],
  isTerminal: (status: unknown) => boolean,
  launchMatches: (request: any) => boolean,
];

export async function persistBuyVoidPublicRequestUnderLaunchLockV1(
  reqObj: any,
  callbacks: BuyVoidPublicRequestLaunchLockCallbacksV1,
): Promise<{ dir: string; file: string | null; reused_request: any | null }> {
  const dir = String(process.env.VOID_BUY_REQUEST_DIR ||
    ".runtime/public-buy-void-requests-v1");
  const [
    withLaunchMutation, readRequests, readEvents, applyEvents,
    isTerminal, launchMatches,
  ] = callbacks;
  if (typeof dir !== "string" || !dir || dir.includes("\0")) {
    throw new Error("buy_void_request_directory_not_configured");
  }
  // Directory creation already preceded the original launch write lock.
  // The canonical launch lock callback independently revalidates the request.
  fs.mkdirSync(dir, { recursive: true });
  return withLaunchMutation(reqObj, async () => {
    // Recheck reviewed operator/request history inside the EXISTING
    // cross-process authority lock, before any JSONL or sidecar append.
    const projected = applyEvents(await readRequests(), await readEvents());
    if (!Array.isArray(projected)) {
      throw new Error("buy_void_request_history_projection_unqualified");
    }
    // Never reuse only the first matching request. Old pre-lock versions
    // could create multiple live obligations for one destination. Any such
    // history is ambiguous, even if one row exactly matches this new intent.
    // Walk every projected index rather than a caller-overridable .find().
    let active: any = null;
    const target = String(
      reqObj.void_destination_address || "",
    ).trim().toLowerCase();
    for (let i = 0; i < projected.length; i += 1) {
      if (!Object.hasOwn(projected, i)) {
        throw new Error("buy_void_request_history_projection_sparse");
      }
      const other = projected[i];
      if (!other || typeof other !== "object" || Array.isArray(other)) {
        throw new Error("buy_void_request_history_projection_row_invalid");
      }
      const destination = String(
        other.void_destination_address ||
        other.delivery_address ||
        other.delivery_wallet ||
        "",
      ).trim().toLowerCase();
      if (destination !== target ||
          isTerminal(other.effective_status || other.status) ||
          !launchMatches(other)) continue;
      if (active !== null) {
        throw new Error("buy_void_request_multiple_active_destination_under_lock");
      }
      active = other;
    }
    if (active) {
      const amount = Number(active.usdc_amount ??
        active.requested_amount_usdc ?? 0);
      const chain = String(active.source_chain || "base");
      if (Number.isFinite(amount) &&
          amount === Number(reqObj.usdc_amount) &&
          chain === reqObj.source_chain) {
        return { dir, reused_request: active, file: null };
      }
      throw new Error("buy_void_request_active_destination_changed_during_lock");
    }

    const json = JSON.stringify(reqObj);
    fs.appendFileSync(path.join(dir, "requests.jsonl"), json + "\n");
    const file = path.join(dir, reqObj.request_id + ".json");
    fs.writeFileSync(file, JSON.stringify(reqObj, null, 2));
    return { dir, file, reused_request: null };
  });
}
