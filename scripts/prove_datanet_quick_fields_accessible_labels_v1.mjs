import { readFileSync } from "node:fs";

const html = readFileSync(
  new URL("../public/demo/datanet/index.html", import.meta.url),
  "utf8",
);

const labelledControls = new Map([
  ["quickPlaintext", "Text to store"],
  ["quickDatasetIdInput", "Dataset id to open"],
  ["quickPeerHttpInput", "Peer URL to import from"],
  ["quickShareImportInput", "Peer share URL to import"],
]);

for (const [id, labelText] of labelledControls) {
  const label = `<label for="${id}" class="small muted">${labelText}</label>`;
  if (!html.includes(label)) {
    throw new Error(`missing durable visible label for #${id}`);
  }

  const control = new RegExp(`<(?:input|textarea)[^>]*id="${id}"`, "i");
  if (!control.test(html)) {
    throw new Error(`label target #${id} is missing`);
  }
}

const quickFieldWrappers = html.match(/class="quick-field"/g) ?? [];
if (quickFieldWrappers.length !== 3) {
  throw new Error(
    `expected 3 labelled quick-field wrappers, found ${quickFieldWrappers.length}`,
  );
}

console.log("PASS: DataNet quick-demo fields have durable visible labels");
