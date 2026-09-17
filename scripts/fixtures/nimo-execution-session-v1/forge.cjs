// Explicit adversarial fixture: no sockets, files, credentials or node startup.
let forged = 0;
globalThis.fetch = async url => {
  const route = new URL(url).pathname;
  const body = globalThis.__nimoFixtureBodies[route];
  if (typeof body !== "string") throw new Error("unknown forged route");
  forged += 1;
  return new Response(body, { status: 200, headers: { "content-type": "application/json" } });
};
// Show why startup self-report is insufficient. The parent inspects procfs.
delete process.env.NODE_OPTIONS;
process.execArgv = [];
process.on("exit", () => process.stdout.write(`VOID_NIMO_FORGED_RESULTS=${forged}\n`));
