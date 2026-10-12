import fs from "node:fs";
import path from "node:path";
import { mountAiAgentDiscoveryRuntimeRouteV1 } from "./ai-agent-discovery-runtime-route-v1.js";

/* VOID_LOCAL_MULTIBOX_RUNTIME_ROUTE_V1
 * Public-safe read-only exact route exposure for the local multi-box runtime status artifact.
 * Authority: GET-only file visibility; no mutation, wallet send, money movement, validator mutation,
 * buy-VOID fulfillment, WC-to-VOID execution, or public internet mesh claim.
 */
export function mountLocalMultiboxRuntimeRouteV1(app: any): void {
  // VOID_AI_AGENT_DISCOVERY_RUNTIME_ROUTE_V1
  mountAiAgentDiscoveryRuntimeRouteV1(app);
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
  const smokePackRoute = "/public-node/runtime/smoke-pack-v1.json";
  const smokeScriptRoute = "/public-node/runtime/smoke-pack-v1.sh";
  const smokePackPath = path.resolve(process.cwd(), "public/public-node/runtime/smoke-pack-v1.json");
  const smokeScriptPath = path.resolve(process.cwd(), "public/public-node/runtime/smoke-pack-v1.sh");
  const closeoutJsonRoute = "/public-node/runtime/local-multibox-runtime-discovery-closeout-rollup-v1.json";
  const closeoutHtmlRoute = "/public-node/runtime/local-multibox-runtime-discovery-closeout-rollup-v1.html";
  const closeoutJsonPath = path.resolve(process.cwd(), "public/public-node/runtime/local-multibox-runtime-discovery-closeout-rollup-v1.json");
  const closeoutHtmlPath = path.resolve(process.cwd(), "public/public-node/runtime/local-multibox-runtime-discovery-closeout-rollup-v1.html");
  const peerRejoinJsonRoute = "/public-node/runtime/local-multibox-runtime-peer-rejoin-card-v1.json";
  const peerRejoinHtmlRoute = "/public-node/runtime/local-multibox-runtime-peer-rejoin-card-v1.html";
  const peerRejoinJsonPath = path.resolve(process.cwd(), "public/public-node/runtime/local-multibox-runtime-peer-rejoin-card-v1.json");
  const peerRejoinHtmlPath = path.resolve(process.cwd(), "public/public-node/runtime/local-multibox-runtime-peer-rejoin-card-v1.html");
  const nimoRunbookJsonRoute = "/public-node/runtime/local-multibox-nimo-rejoin-operator-runbook-v1.json";
  const nimoRunbookHtmlRoute = "/public-node/runtime/local-multibox-nimo-rejoin-operator-runbook-v1.html";
  const nimoRunbookJsonPath = path.resolve(process.cwd(), "public/public-node/runtime/local-multibox-nimo-rejoin-operator-runbook-v1.json");
  const nimoRunbookHtmlPath = path.resolve(process.cwd(), "public/public-node/runtime/local-multibox-nimo-rejoin-operator-runbook-v1.html");
  const publicNodeConnectRoute = "/public-node/connect";
  const publicNodeConnectJsonRoute = "/public-node/connect/public-node-connect-pack-v1.json";
  const publicNodeConnectHtmlRoute = "/public-node/connect/public-node-connect-pack-v1.html";
  // VOID_VALIDATOR_POSITIVE_READINESS_PUBLIC_ROUTE_V1
  const validatorPositiveReadinessPublicEvidenceRoute = "/public-node/validators/validator-registration-positive-readiness-public-evidence-v1.json";
  const publicNodeConnectPagePath = path.resolve(process.cwd(), "public/public-node/connect/index.html");
  const publicNodeConnectJsonPath = path.resolve(process.cwd(), "public/public-node/connect/public-node-connect-pack-v1.json");
  const publicNodeConnectHtmlPath = path.resolve(process.cwd(), "public/public-node/connect/public-node-connect-pack-v1.html");
  const validatorPositiveReadinessPublicEvidencePath = path.resolve(process.cwd(), "public/public-node/validators/validator-registration-positive-readiness-public-evidence-v1.json");
  const publicNodeOperatorQuickstartPageRoute = "/public-node/operator-quickstart-v1";
  const publicNodeOperatorQuickstartJsonRoute = "/public-node/public-node-operator-quickstart-v1.json";
  const publicNodeOperatorQuickstartHtmlRoute = "/public-node/public-node-operator-quickstart-v1.html";
  const publicNodeOperatorQuickstartPagePath = path.resolve(process.cwd(), "public/public-node/operator-quickstart-v1.html");
  const publicNodeOperatorQuickstartJsonPath = path.resolve(process.cwd(), "public/public-node/public-node-operator-quickstart-v1.json");
  const publicNodeOperatorQuickstartHtmlPath = path.resolve(process.cwd(), "public/public-node/public-node-operator-quickstart-v1.html");
  const publicNodeOperatorStatusRollupPageRoute = "/public-node/operator-status-rollup-v1";
  const publicNodeOperatorStatusRollupJsonRoute = "/public-node/public-node-operator-status-rollup-v1.json";
  const publicNodeOperatorStatusRollupHtmlRoute = "/public-node/public-node-operator-status-rollup-v1.html";
  const publicNodeOperatorStatusRollupPagePath = path.resolve(process.cwd(), "public/public-node/operator-status-rollup-v1.html");
  const publicNodeOperatorStatusRollupJsonPath = path.resolve(process.cwd(), "public/public-node/public-node-operator-status-rollup-v1.json");
  const publicNodeOperatorStatusRollupHtmlPath = path.resolve(process.cwd(), "public/public-node/public-node-operator-status-rollup-v1.html");
  const publicNodeOperatorHandoffPacketPageRoute = "/public-node/operator-handoff-packet-v1";
  const publicNodeOperatorHandoffPacketJsonRoute = "/public-node/public-node-operator-handoff-packet-v1.json";
  const publicNodeOperatorHandoffPacketHtmlRoute = "/public-node/public-node-operator-handoff-packet-v1.html";
  const publicNodeOperatorHandoffPacketPagePath = path.resolve(process.cwd(), "public/public-node/operator-handoff-packet-v1.html");
  const publicNodeOperatorHandoffPacketJsonPath = path.resolve(process.cwd(), "public/public-node/public-node-operator-handoff-packet-v1.json");
  const publicNodeOperatorHandoffPacketHtmlPath = path.resolve(process.cwd(), "public/public-node/public-node-operator-handoff-packet-v1.html");
  const publicNodeOperatorReceiptExamplePageRoute = "/public-node/operator-receipt-example-v1";
  const publicNodeOperatorReceiptExampleJsonRoute = "/public-node/public-node-operator-receipt-example-v1.json";
  const publicNodeOperatorReceiptExampleHtmlRoute = "/public-node/public-node-operator-receipt-example-v1.html";
  const publicNodeOperatorReceiptExamplePagePath = path.resolve(process.cwd(), "public/public-node/operator-receipt-example-v1.html");
  const publicNodeOperatorReceiptExampleJsonPath = path.resolve(process.cwd(), "public/public-node/public-node-operator-receipt-example-v1.json");
  const publicNodeOperatorReceiptExampleHtmlPath = path.resolve(process.cwd(), "public/public-node/public-node-operator-receipt-example-v1.html");
  const publicNodeOperatorReceiptReviewChecklistPageRoute = "/public-node/operator-receipt-review-checklist-v1";
  const publicNodeOperatorReceiptReviewChecklistJsonRoute = "/public-node/public-node-operator-receipt-review-checklist-v1.json";
  const publicNodeOperatorReceiptReviewChecklistHtmlRoute = "/public-node/public-node-operator-receipt-review-checklist-v1.html";
  const publicNodeOperatorReceiptReviewChecklistPagePath = path.resolve(process.cwd(), "public/public-node/operator-receipt-review-checklist-v1.html");
  const publicNodeOperatorReceiptReviewChecklistJsonPath = path.resolve(process.cwd(), "public/public-node/public-node-operator-receipt-review-checklist-v1.json");
  const publicNodeOperatorReceiptReviewChecklistHtmlPath = path.resolve(process.cwd(), "public/public-node/public-node-operator-receipt-review-checklist-v1.html");
  const publicNodeOperatorReceiptReviewDecisionTemplatePageRoute = "/public-node/operator-receipt-review-decision-template-v1";
  const publicNodeOperatorReceiptReviewDecisionTemplateJsonRoute = "/public-node/public-node-operator-receipt-review-decision-template-v1.json";
  const publicNodeOperatorReceiptReviewDecisionTemplateHtmlRoute = "/public-node/public-node-operator-receipt-review-decision-template-v1.html";
  const publicNodeOperatorReceiptReviewDecisionTemplatePagePath = path.resolve(process.cwd(), "public/public-node/operator-receipt-review-decision-template-v1.html");
  const publicNodeOperatorReceiptReviewDecisionTemplateJsonPath = path.resolve(process.cwd(), "public/public-node/public-node-operator-receipt-review-decision-template-v1.json");
  const publicNodeOperatorReceiptReviewDecisionTemplateHtmlPath = path.resolve(process.cwd(), "public/public-node/public-node-operator-receipt-review-decision-template-v1.html");
  const publicNodeOperatorReceiptReviewDecisionExamplePageRoute = "/public-node/operator-receipt-review-decision-example-v1";
  const publicNodeOperatorReceiptReviewDecisionExampleJsonRoute = "/public-node/public-node-operator-receipt-review-decision-example-v1.json";
  const publicNodeOperatorReceiptReviewDecisionExampleHtmlRoute = "/public-node/public-node-operator-receipt-review-decision-example-v1.html";
  const publicNodeOperatorReceiptReviewDecisionExamplePagePath = path.resolve(process.cwd(), "public/public-node/operator-receipt-review-decision-example-v1.html");
  const publicNodeOperatorReceiptReviewDecisionExampleJsonPath = path.resolve(process.cwd(), "public/public-node/public-node-operator-receipt-review-decision-example-v1.json");
  const publicNodeOperatorReceiptReviewDecisionExampleHtmlPath = path.resolve(process.cwd(), "public/public-node/public-node-operator-receipt-review-decision-example-v1.html");

  const publicNodeOperatorReviewLaneRollupPageRoute = "/public-node/operator-review-lane-rollup-v1";
  const publicNodeOperatorReviewLaneRollupJsonRoute = "/public-node/public-node-operator-review-lane-rollup-v1.json";
  const publicNodeOperatorReviewLaneRollupHtmlRoute = "/public-node/public-node-operator-review-lane-rollup-v1.html";
  const publicNodeOperatorReviewLaneRollupPagePath = path.resolve(process.cwd(), "public/public-node/operator-review-lane-rollup-v1.html");
  const publicNodeOperatorReviewLaneRollupJsonPath = path.resolve(process.cwd(), "public/public-node/public-node-operator-review-lane-rollup-v1.json");
  const publicNodeOperatorReviewLaneRollupHtmlPath = path.resolve(process.cwd(), "public/public-node/public-node-operator-review-lane-rollup-v1.html");

  const publicNodeOperatorDashboardPageRoute = "/public-node/operator-dashboard-v1";
  const publicNodeOperatorDashboardJsonRoute = "/public-node/public-node-operator-dashboard-v1.json";
  const publicNodeOperatorDashboardHtmlRoute = "/public-node/public-node-operator-dashboard-v1.html";
  const publicNodeOperatorDashboardPagePath = path.resolve(process.cwd(), "public/public-node/operator-dashboard-v1.html");
  const publicNodeOperatorDashboardJsonPath = path.resolve(process.cwd(), "public/public-node/public-node-operator-dashboard-v1.json");
  const publicNodeOperatorDashboardHtmlPath = path.resolve(process.cwd(), "public/public-node/public-node-operator-dashboard-v1.html");
  const publicNodeConnectReceiptPageRoute = "/public-node/connect/receipt-template-v1";
  const publicNodeConnectReceiptJsonRoute = "/public-node/connect/public-node-connect-receipt-template-v1.json";
  const publicNodeConnectReceiptHtmlRoute = "/public-node/connect/public-node-connect-receipt-template-v1.html";
  const publicNodeConnectReceiptPagePath = path.resolve(process.cwd(), "public/public-node/connect/receipt-template-v1.html");
  const publicNodeConnectReceiptJsonPath = path.resolve(process.cwd(), "public/public-node/connect/public-node-connect-receipt-template-v1.json");
  const publicNodeConnectReceiptHtmlPath = path.resolve(process.cwd(), "public/public-node/connect/public-node-connect-receipt-template-v1.html");

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

  /* VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_ROUTE_V1 */
  app.get(smokePackRoute, (_req: any, res: any) => {
    try {
      if (!fs.existsSync(smokePackPath)) {
        return res.status(404).json({ ok: false, marker: "VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_ROUTE_V1", error: "missing_smoke_pack_json", path: smokePackPath });
      }
      const raw = fs.readFileSync(smokePackPath, "utf8");
      JSON.parse(raw);
      return res.status(200).set("content-type", "application/json; charset=utf-8").send(raw);
    } catch (e: any) {
      return res.status(500).json({ ok: false, marker: "VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_ROUTE_V1", route: smokePackRoute, error: String(e?.message || e) });
    }
  });

  app.get(smokeScriptRoute, (_req: any, res: any) => {
    try {
      if (!fs.existsSync(smokeScriptPath)) {
        return res.status(404).type("text/plain").send("VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_ROUTE_V1 missing script artifact: " + smokeScriptPath);
      }
      const raw = fs.readFileSync(smokeScriptPath, "utf8");
      return res.status(200).set("content-type", "text/x-shellscript; charset=utf-8").send(raw);
    } catch (e: any) {
      return res.status(500).json({ ok: false, marker: "VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_ROUTE_V1", route: smokeScriptRoute, error: String(e?.message || e) });
    }
  });

  // VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_CLOSEOUT_ROLLUP_ROUTE_V1
  app.get(closeoutJsonRoute, (_req: any, res: any) => {
    res.type("application/json");
    res.sendFile(closeoutJsonPath);
  });

  app.get(closeoutHtmlRoute, (_req: any, res: any) => {
    res.type("text/html");
    res.sendFile(closeoutHtmlPath);
  });

  app.get("/__void/diag/local-multibox-runtime-route-v1.json", (_req: any, res: any) => {
    res.json({
      ok: true,
      marker: "VOID_LOCAL_MULTIBOX_RUNTIME_ROUTE_V1",
      routes: [publicNodeRootIndexRoute, indexAliasRoute, indexRoute, indexHtmlRoute, jsonRoute, htmlRoute, smokePackRoute, smokeScriptRoute,
        closeoutJsonRoute,
        closeoutHtmlRoute,
        peerRejoinJsonRoute,
        peerRejoinHtmlRoute,
        nimoRunbookJsonRoute,
        nimoRunbookHtmlRoute,
        publicNodeConnectRoute,
        publicNodeConnectJsonRoute,
        publicNodeConnectHtmlRoute,
        validatorPositiveReadinessPublicEvidenceRoute,
        publicNodeConnectReceiptPageRoute,
        publicNodeConnectReceiptJsonRoute,
        publicNodeConnectReceiptHtmlRoute],
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
        publicNodeRootIndexExists: fs.existsSync(publicNodeRootIndexPath),
        smokePackPath,
        smokeScriptPath,
        smokePackExists: fs.existsSync(smokePackPath),
        smokeScriptExists: fs.existsSync(smokeScriptPath)
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

  app.get(peerRejoinJsonRoute, (_req: any, res: any) => {
    res.sendFile(peerRejoinJsonPath);
  });

  app.get(peerRejoinHtmlRoute, (_req: any, res: any) => {
    res.sendFile(peerRejoinHtmlPath);
  });


  app.get(nimoRunbookJsonRoute, (_req: any, res: any) => {
    res.sendFile(nimoRunbookJsonPath);
  });

  app.get(nimoRunbookHtmlRoute, (_req: any, res: any) => {
    res.sendFile(nimoRunbookHtmlPath);
  });


  app.get(publicNodeConnectRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeConnectPagePath);
  });

  app.get(publicNodeConnectJsonRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeConnectJsonPath);
  });

  app.get(publicNodeConnectHtmlRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeConnectHtmlPath);
  });

  // VOID_VALIDATOR_POSITIVE_READINESS_PUBLIC_ROUTE_V1
  app.get(validatorPositiveReadinessPublicEvidenceRoute, (_req: any, res: any) => {
    res.type("application/json");
    res.sendFile(validatorPositiveReadinessPublicEvidencePath);
  });


  app.get(publicNodeConnectReceiptPageRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeConnectReceiptPagePath);
  });

  app.get(publicNodeConnectReceiptJsonRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeConnectReceiptJsonPath);
  });

  app.get(publicNodeConnectReceiptHtmlRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeConnectReceiptHtmlPath);
  });


  app.get(publicNodeOperatorQuickstartPageRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeOperatorQuickstartPagePath);
  });

  app.get(publicNodeOperatorQuickstartJsonRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeOperatorQuickstartJsonPath);
  });

  app.get(publicNodeOperatorQuickstartHtmlRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeOperatorQuickstartHtmlPath);
  });


  app.get(publicNodeOperatorStatusRollupPageRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeOperatorStatusRollupPagePath);
  });

  app.get(publicNodeOperatorStatusRollupJsonRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeOperatorStatusRollupJsonPath);
  });

  app.get(publicNodeOperatorStatusRollupHtmlRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeOperatorStatusRollupHtmlPath);
  });

  app.get(publicNodeOperatorHandoffPacketPageRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeOperatorHandoffPacketPagePath);
  });

  app.get(publicNodeOperatorHandoffPacketJsonRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeOperatorHandoffPacketJsonPath);
  });

  app.get(publicNodeOperatorHandoffPacketHtmlRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeOperatorHandoffPacketHtmlPath);
  });

  app.get(publicNodeOperatorReceiptExamplePageRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeOperatorReceiptExamplePagePath);
  });

  app.get(publicNodeOperatorReceiptExampleJsonRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeOperatorReceiptExampleJsonPath);
  });

  app.get(publicNodeOperatorReceiptExampleHtmlRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeOperatorReceiptExampleHtmlPath);
  });

  app.get(publicNodeOperatorReceiptReviewChecklistPageRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeOperatorReceiptReviewChecklistPagePath);
  });

  app.get(publicNodeOperatorReceiptReviewChecklistJsonRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeOperatorReceiptReviewChecklistJsonPath);
  });

  app.get(publicNodeOperatorReceiptReviewChecklistHtmlRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeOperatorReceiptReviewChecklistHtmlPath);
  });

  app.get(publicNodeOperatorReceiptReviewDecisionTemplatePageRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeOperatorReceiptReviewDecisionTemplatePagePath);
  });

  app.get(publicNodeOperatorReceiptReviewDecisionTemplateJsonRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeOperatorReceiptReviewDecisionTemplateJsonPath);
  });

  app.get(publicNodeOperatorReceiptReviewDecisionTemplateHtmlRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeOperatorReceiptReviewDecisionTemplateHtmlPath);
  });

  app.get(publicNodeOperatorReceiptReviewDecisionExamplePageRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeOperatorReceiptReviewDecisionExamplePagePath);
  });

  app.get(publicNodeOperatorReceiptReviewDecisionExampleJsonRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeOperatorReceiptReviewDecisionExampleJsonPath);
  });

  app.get(publicNodeOperatorReceiptReviewDecisionExampleHtmlRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeOperatorReceiptReviewDecisionExampleHtmlPath);
  });

app.get(publicNodeOperatorReviewLaneRollupPageRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeOperatorReviewLaneRollupPagePath);
  });

app.get(publicNodeOperatorReviewLaneRollupJsonRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeOperatorReviewLaneRollupJsonPath);
  });

app.get(publicNodeOperatorReviewLaneRollupHtmlRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeOperatorReviewLaneRollupHtmlPath);
  });

app.get(publicNodeOperatorDashboardPageRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeOperatorDashboardPagePath);
  });

app.get(publicNodeOperatorDashboardJsonRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeOperatorDashboardJsonPath);
  });

app.get(publicNodeOperatorDashboardHtmlRoute, (_req: any, res: any) => {
    res.sendFile(publicNodeOperatorDashboardHtmlPath);
  });

}
