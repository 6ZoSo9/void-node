import fs from "node:fs";
import path from "node:path";

/* VOID_LOCAL_MULTIBOX_RUNTIME_ROUTE_V1
 * Public-safe read-only exact route exposure for the local multi-box runtime status artifact.
 * Authority: GET-only file visibility; no mutation, wallet send, money movement, validator mutation,
 * buy-VOID fulfillment, WC-to-VOID execution, or public internet mesh claim.
 */
export function mountLocalMultiboxRuntimeRouteV1(app: any): void {
  const jsonRoute = "/public-node/runtime/local-multibox-status-v1.json";
  const htmlRoute = "/public-node/runtime/local-multibox-status-v1.html";
  const jsonPath = path.resolve(process.cwd(), "public/public-node/runtime/local-multibox-status-v1.json");
  const htmlPath = path.resolve(process.cwd(), "public/public-node/runtime/local-multibox-status-v1.html");
  const indexRoute = "/public-node/runtime/index.json";
  const indexHtmlRoute = "/public-node/runtime/index.html";
  const indexAliasRoute = "/public-node/runtime";
  const indexPath = path.resolve(process.cwd(), "public/public-node/runtime/index.json");
  const indexHtmlPath = path.resolve(process.cwd(), "public/public-node/runtime/index.html");
  const publicNodeRootIndexRoute = "/public-node/index.json";
  const publicNodeRootIndexPath = path.resolve(process.cwd(), "public/public-node/index.json");

  app.get(jsonRoute, (_req: any, res: any) => {
    try {
      if (!fs.existsSync(jsonPath)) {
        return res.status(404).json({
          ok: false,
          marker: "VOID_LOCAL_MULTIBOX_RUNTIME_ROUTE_V1",
          error: "missing_json_artifact",
          path: jsonPath
        });
      }

      const raw = fs.readFileSync(jsonPath, "utf8");
      JSON.parse(raw);
      return res.status(200).set("content-type", "application/json; charset=utf-8").send(raw);
    } catch (e: any) {
      return res.status(500).json({
        ok: false,
        marker: "VOID_LOCAL_MULTIBOX_RUNTIME_ROUTE_V1",
        route: jsonRoute,
        error: String(e?.message || e)
      });
    }
  });

  app.get(htmlRoute, (_req: any, res: any) => {
    try {
      if (!fs.existsSync(htmlPath)) {
        return res.status(404).type("text/plain").send("VOID_LOCAL_MULTIBOX_RUNTIME_ROUTE_V1 missing html artifact: " + htmlPath);
      }

      const raw = fs.readFileSync(htmlPath, "utf8");
      return res.status(200).set("content-type", "text/html; charset=utf-8").send(raw);
    } catch (e: any) {
      return res.status(500).json({
        ok: false,
        marker: "VOID_LOCAL_MULTIBOX_RUNTIME_ROUTE_V1",
        route: htmlRoute,
        error: String(e?.message || e)
      });
    }
  });


  /* VOID_LOCAL_MULTIBOX_RUNTIME_ROOT_INDEX_ROUTE_V1 */
  app.get(publicNodeRootIndexRoute, (_req: any, res: any) => {
    try {
      if (!fs.existsSync(publicNodeRootIndexPath)) {
        return res.status(404).json({
          ok: false,
          marker: "VOID_LOCAL_MULTIBOX_RUNTIME_ROOT_INDEX_ROUTE_V1",
          error: "missing_public_node_root_index_json",
          path: publicNodeRootIndexPath
        });
      }

      const raw = fs.readFileSync(publicNodeRootIndexPath, "utf8");
      JSON.parse(raw);
      return res.status(200).set("content-type", "application/json; charset=utf-8").send(raw);
    } catch (e: any) {
      return res.status(500).json({
        ok: false,
        marker: "VOID_LOCAL_MULTIBOX_RUNTIME_ROOT_INDEX_ROUTE_V1",
        route: publicNodeRootIndexRoute,
        error: String(e?.message || e)
      });
    }
  });

  /* VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_INDEX_V1 */
  app.get(indexRoute, (_req: any, res: any) => {
    try {
      if (!fs.existsSync(indexPath)) {
        return res.status(404).json({
          ok: false,
          marker: "VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_INDEX_V1",
          error: "missing_runtime_index_json",
          path: indexPath
        });
      }

      const raw = fs.readFileSync(indexPath, "utf8");
      JSON.parse(raw);
      return res.status(200).set("content-type", "application/json; charset=utf-8").send(raw);
    } catch (e: any) {
      return res.status(500).json({
        ok: false,
        marker: "VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_INDEX_V1",
        route: indexRoute,
        error: String(e?.message || e)
      });
    }
  });

  app.get([indexHtmlRoute, indexAliasRoute], (_req: any, res: any) => {
    try {
      if (!fs.existsSync(indexHtmlPath)) {
        return res.status(404).type("text/plain").send("VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_INDEX_V1 missing html artifact: " + indexHtmlPath);
      }

      const raw = fs.readFileSync(indexHtmlPath, "utf8");
      return res.status(200).set("content-type", "text/html; charset=utf-8").send(raw);
    } catch (e: any) {
      return res.status(500).json({
        ok: false,
        marker: "VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_INDEX_V1",
        route: indexHtmlRoute,
        error: String(e?.message || e)
      });
    }
  });

  app.get("/__void/diag/local-multibox-runtime-route-v1.json", (_req: any, res: any) => {
    res.json({
      ok: true,
      marker: "VOID_LOCAL_MULTIBOX_RUNTIME_ROUTE_V1",
      routes: [publicNodeRootIndexRoute, indexAliasRoute, indexRoute, indexHtmlRoute, jsonRoute, htmlRoute],
      files: {
        cwd: process.cwd(),
        jsonPath,
        htmlPath,
        jsonExists: fs.existsSync(jsonPath),
        htmlExists: fs.existsSync(htmlPath),
        indexPath,
        indexHtmlPath,
        indexExists: fs.existsSync(indexPath),
        indexHtmlExists: fs.existsSync(indexHtmlPath),
        publicNodeRootIndexPath,
        publicNodeRootIndexExists: fs.existsSync(publicNodeRootIndexPath)
      },
      boundary: {
        read_only: true,
        mutation_route_enabled: false,
        wallet_send_enabled: false,
        money_movement_enabled: false,
        buy_void_fulfillment_enabled: false,
        wc_to_void_swap_enabled: false,
        validator_mutation_enabled: false,
        validator_admission_enabled: false,
        public_internet_mesh_claim: false
      }
    });
  });
}
