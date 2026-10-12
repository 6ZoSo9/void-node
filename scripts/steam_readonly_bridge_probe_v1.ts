import {
  VOID_STEAM_READONLY_FETCH_CONFIRMATION,
  executeSteamReadonlyRequest,
  steamReadonlyBridgeStatus,
  SteamReadonlyBridgeError,
  type SteamReadonlyInput,
} from "../src/integrations/steam_readonly_bridge_v1.js";

function valueAfter(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index < 0) return undefined;
  return args[index + 1];
}

function fail(code: string, message: string): never {
  process.stderr.write(`${JSON.stringify({ ok: false, code, message })}\n`);
  process.exit(1);
}

const args = process.argv.slice(2);
const command = args[0] || "status";

if (command === "status") {
  process.stdout.write(
    `${JSON.stringify(steamReadonlyBridgeStatus(), null, 2)}\n`,
  );
  process.exit(0);
}

const confirmation = valueAfter(args, "--confirm");
if (confirmation !== VOID_STEAM_READONLY_FETCH_CONFIRMATION) {
  fail(
    "confirmation_required",
    `pass --confirm ${VOID_STEAM_READONLY_FETCH_CONFIRMATION}`,
  );
}

let input: SteamReadonlyInput;

if (command === "player-summaries") {
  const raw = valueAfter(args, "--steamids");
  if (!raw) fail("steamids_required", "pass --steamids id1,id2");
  input = {
    operation: "player_summaries",
    steamids: raw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  };
} else if (command === "owned-games") {
  const steamid = valueAfter(args, "--steamid");
  if (!steamid) fail("steamid_required", "pass --steamid SteamID64");
  input = {
    operation: "owned_games",
    steamid,
  };
} else {
  fail(
    "unknown_command",
    "use status, player-summaries, or owned-games",
  );
}

try {
  const result = await executeSteamReadonlyRequest(input);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  if (error instanceof SteamReadonlyBridgeError) {
    fail(error.code, error.message);
  }
  fail("unexpected_error", "unexpected Steam bridge failure");
}
