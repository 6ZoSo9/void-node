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

function assertAccessibleLabels(candidateHtml) {
  for (const [id, labelText] of labelledControls) {
    const label = `<label for="${id}" class="small muted">${labelText}</label>`;
    if (!candidateHtml.includes(label)) {
      throw new Error(`missing durable visible label for #${id}`);
    }

    const control = new RegExp(`<(?:input|textarea)[^>]*id="${id}"`, "i");
    if (!control.test(candidateHtml)) {
      throw new Error(`label target #${id} is missing`);
    }
  }

  const quickFieldWrappers = candidateHtml.match(/class="quick-field"/g) ?? [];
  if (quickFieldWrappers.length !== 3) {
    throw new Error(
      `expected 3 labelled quick-field wrappers, found ${quickFieldWrappers.length}`,
    );
  }
}

assertAccessibleLabels(html);

for (const [id] of labelledControls) {
  const association = `for="${id}"`;
  const mutated = html.replace(association, `for="${id}-missing"`);
  if (mutated === html) {
    throw new Error(`mutation fixture did not change label for #${id}`);
  }

  let rejected = false;
  try {
    assertAccessibleLabels(mutated);
  } catch (error) {
    if (error instanceof Error && error.message === `missing durable visible label for #${id}`) {
      rejected = true;
    } else {
      throw error;
    }
  }

  if (!rejected) {
    throw new Error(`broken label/control association accepted for #${id}`);
  }
}

console.log("PASS: DataNet quick-demo fields have durable visible labels");
console.log("PASS: removing any label/control association fails the proof");
