import {
  VOID_BUY_VOID_PRODUCTION_CANDIDATE_RESERVATION_OPERATOR_V1,
  parseBuyVoidProductionCandidateReservationOperatorArgsV1,
  runBuyVoidProductionCandidateReservationOperatorV1,
} from "../src/economic/buy_void_production_candidate_reservation_operator_v1.js";

function help(): string {
  return [
    "Usage:",
    "  npx tsx scripts/buy_void_production_candidate_reservation_operator_v1.ts --request-id ID [apply echoes]",
    "",
    "Default mode performs one candidate-only runtime dry run.",
    "It may plan reserve_inventory or reserve_execution_attempt, or report a clean candidate ready at prepare_transaction.",
    "It never claims payment and never prepares, signs, broadcasts, decrements inventory, or closes fulfillment.",
    "",
    "Selector:",
    "  --request-id VALUE                    The only business selector",
    "",
    "Apply one planned reservation stage:",
    "  --apply                               Explicit one-stage apply intent",
    "  --saga-id VALUE                       Exact saga ID emitted by the dry run",
    "  --runtime-confirm VALUE                Exact runtime confirmation emitted by the dry run",
    "  --saga-confirm VALUE                   Exact saga confirmation emitted by the dry run",
    "  --action-confirm VALUE                 Exact action confirmation emitted by the dry run",
    "  --policy-fingerprint-sha256 VALUE      Exact server-policy fingerprint emitted by the dry run",
    "  --delegated-confirm VALUE              Exact delegated confirmation when the dry run requires one",
    "",
    "Listener location is local/server process configuration only (HTTP_PORT; default 4100).",
    "No root, request directory, policy, wallet, RPC URL, signer, broadcaster, socket, receipt, payment observation, or transaction input is accepted.",
  ].join("\n");
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(help());
    return;
  }
  const args = parseBuyVoidProductionCandidateReservationOperatorArgsV1(argv);
  const decision = await runBuyVoidProductionCandidateReservationOperatorV1(args);
  console.log(JSON.stringify(decision, null, 2));
  if (!decision.ok) process.exitCode = 2;
}

main().catch((error) => {
  const errorClass = String((error as any)?.name || "Error");
  console.error(JSON.stringify({
    marker: VOID_BUY_VOID_PRODUCTION_CANDIDATE_RESERVATION_OPERATOR_V1,
    ok: false,
    status: "held",
    reason: "production_candidate_reservation_operator_cli_failed",
    error_class: /^[A-Za-z0-9._:-]{1,80}$/.test(errorClass)
      ? errorClass
      : "Error",
    mutation_performed: false,
    rpc_call_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  }, null, 2));
  process.exitCode = 1;
});
