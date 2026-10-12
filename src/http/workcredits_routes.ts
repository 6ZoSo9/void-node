import type { Express, Request, Response } from "express";
import { execFile } from "node:child_process";

/**
 * WorkCredits devnet HTTP routes.
 *
 * GET /workcredits/devnet/pool
 *   -> JSON from ops/void-workcredits-devnet-pool-json.sh
 */
export function registerWorkCreditsRoutes(app: Express): void {
  const anyApp = app as any;
  if (anyApp.__void_workcredits_routes_bound) return;
  anyApp.__void_workcredits_routes_bound = true;

  app.get("/workcredits/devnet/pool", (_req: Request, res: Response) => {
    const script = "ops/void-workcredits-devnet-pool-json.sh";
    const cwd = process.cwd();

    execFile("bash", [script], { cwd, timeout: 5000 }, (err, stdout, stderr) => {
      if (err) {
        console.error("[workcredits] pool-json script failed", err, stderr?.toString?.() ?? "");
        res.status(500).json({
          ok: false,
          error: "workcredits devnet pool unavailable"
        });
        return;
      }

      let payload: any;
      try {
        payload = JSON.parse(stdout.toString());
      } catch (e) {
        console.error("[workcredits] failed to parse pool-json output", e, stdout.toString());
        res.status(500).json({
          ok: false,
          error: "invalid workcredits devnet pool JSON"
        });
        return;
      }

      if (payload && typeof payload === "object" && payload.ok === undefined) {
        payload.ok = true;
      }

      res.json(payload);
    });
  });
}
