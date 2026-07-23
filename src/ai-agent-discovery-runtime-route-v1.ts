import fs from "node:fs";
import path from "node:path";

export const VOID_AI_AGENT_DISCOVERY_RUNTIME_ROUTE_V1 =
  "VOID_AI_AGENT_DISCOVERY_RUNTIME_ROUTE_V1" as const;

export const voidAiAgentDiscoveryRuntimeRoutesV1 = [
  {
    route: "/public-node/agents/discovery-v1.json",
    relativePath: "public/public-node/agents/discovery-v1.json",
  },
  {
    route: "/public-node/agents/discovery-v1.schema.json",
    relativePath: "public/public-node/agents/discovery-v1.schema.json",
  },
  {
    route: "/.well-known/void-agent-discovery.json",
    relativePath: "public/.well-known/void-agent-discovery.json",
  },
  {
    route: "/.well-known/void-agent-discovery.schema.json",
    relativePath: "public/.well-known/void-agent-discovery.schema.json",
  },
] as const;

type JsonResponse = {
  status(code: number): JsonResponse;
  set(field: string, value: string): JsonResponse;
  json(payload: unknown): unknown;
  send(payload: string | Buffer): unknown;
};

function mountJsonFileRoute(
  app: any,
  route: string,
  relativePath: string,
): void {
  const resolvedPath = path.resolve(process.cwd(), relativePath);

  app.get(route, (_req: any, res: JsonResponse) => {
    try {
      if (!fs.existsSync(resolvedPath)) {
        return res.status(404).json({
          ok: false,
          marker: VOID_AI_AGENT_DISCOVERY_RUNTIME_ROUTE_V1,
          route,
          error: "missing_public_artifact",
        });
      }

      const raw = fs.readFileSync(resolvedPath, "utf8");
      JSON.parse(raw);

      return res
        .status(200)
        .set("Cache-Control", "no-store")
        .set("content-type", "application/json; charset=utf-8")
        .send(raw);
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        marker: VOID_AI_AGENT_DISCOVERY_RUNTIME_ROUTE_V1,
        route,
        error: String(error?.message || error),
      });
    }
  });
}

export function mountAiAgentDiscoveryRuntimeRouteV1(app: any): void {
  if (!app || typeof app.get !== "function") {
    throw new TypeError(
      "VOID_AI_AGENT_DISCOVERY_RUNTIME_ROUTE_V1 requires an Express-like app.get",
    );
  }

  if ((app as any).__void_ai_agent_discovery_runtime_route_v1_mounted) {
    return;
  }
  (app as any).__void_ai_agent_discovery_runtime_route_v1_mounted = true;

  for (const entry of voidAiAgentDiscoveryRuntimeRoutesV1) {
    mountJsonFileRoute(app, entry.route, entry.relativePath);
  }
}
