import { test, expect, chromium } from "@playwright/test";
import { jsPDF } from "jspdf";
import { readFile } from "node:fs/promises";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

function pdfFile(name = "carton-design.pdf", text = "Original carton design") {
  const doc = new jsPDF();
  doc.text(text, 20, 20);
  return { name, mimeType: "application/pdf", buffer: Buffer.from(doc.output("arraybuffer")) };
}

async function createProduct(page, { name = "Demo carton", processes = ["Printing", "Corrugation"], design = false } = {}) {
  await page.getByRole("button", { name: "Configuration", exact: true }).click();
  await page.getByRole("button", { name: "New product", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "New product", exact: true });
  await dialog.getByLabel("Product name", { exact: true }).fill(name);
  await dialog.getByLabel("Number of colors", { exact: true }).fill("6");
  await dialog.getByLabel("Special colors", { exact: false }).fill("Red, Yellow");
  for (const process of ["Reel cutting", "Corrugation", "Printing", "UV coating", "Sheet pasting", "Punching", "Window patching", "Box pasting"]) {
    await dialog.getByRole("button", { name: `Remove ${process}`, exact: true }).click();
  }
  for (const process of processes) {
    await dialog.getByLabel("Add manufacturing process").selectOption({ label: process });
    await dialog.getByRole("button", { name: "Add process", exact: true }).click();
  }
  if (design) await dialog.getByLabel("Design PDF", { exact: false }).setInputFiles(pdfFile());
  await dialog.getByRole("button", { name: "Save product", exact: true }).click();
  await expect(dialog).not.toBeVisible();
}

async function createJob(page, { product = "Demo carton", assignments = ["Printing press 1", "Corrugator 1"], quantity = "10001", yieldPerSheet = "8", number = "JOB-1001", invalidFirst = false } = {}) {
  await page.getByRole("button", { name: "New job", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "New job", exact: true });
  await dialog.getByLabel("Product", { exact: true }).selectOption({ label: product });
  await dialog.getByLabel("Ordered boxes", { exact: true }).fill(quantity);
  await dialog.getByLabel("Actual boxes per sheet", { exact: false }).fill(yieldPerSheet);
  await dialog.getByLabel("Job reel size", { exact: true }).fill("38");
  await dialog.getByLabel("Sales order reference", { exact: true }).fill("SO-42");
  await dialog.getByLabel("Customer", { exact: true }).fill("Acme Packaging");
  await dialog.getByLabel("Job notes", { exact: true }).fill("Keep the approved design.");
  if (invalidFirst) {
    await dialog.getByRole("button", { name: "Create & release job", exact: true }).click();
    await expect(dialog).toBeVisible();
  }
  const selects = dialog.getByRole("region", { name: "Job machine plan" }).getByRole("combobox");
  for (const [index, machine] of assignments.entries()) await selects.nth(index).selectOption({ label: machine });
  await dialog.getByRole("button", { name: "Create & release job", exact: true }).click();
  await expect(page.getByRole("dialog", { name: `${number} · ${product}`, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
}

async function view(page, name) { await page.getByRole("button", { name, exact: true }).click(); }
async function details(page, number = "JOB-1001") {
  await page.getByRole("button", { name: `View ${number}`, exact: true }).first().click();
  return page.getByRole("dialog");
}

test("configuration → both production views → dispatch → durable PDF receipt", async ({ page }, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await createProduct(page, { design: true });
  await createJob(page, { invalidFirst: true });
  await view(page, "Workstation");
  await page.getByRole("button", { name: "Start JOB-1001 on Printing press 1", exact: true }).click();
  await page.getByRole("button", { name: "Complete JOB-1001 on Printing press 1", exact: true }).click();
  await page.getByLabel("Department", { exact: true }).selectOption({ label: "Corrugation" });
  await expect(page.getByRole("heading", { name: "Corrugation sheet requirement" })).toBeVisible();
  await expect(page.getByText("1,251", { exact: true })).toBeVisible();
  await expect(page.getByText("10,008", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start JOB-1001 on Corrugator 1", exact: true })).toBeVisible();
  await view(page, "Machines");
  await page.getByRole("button", { name: "Start JOB-1001 on Corrugator 1", exact: true }).click();
  await page.getByRole("button", { name: "Complete JOB-1001 on Corrugator 1", exact: true }).click();
  await view(page, "Dispatch & history");
  await expect(page.getByRole("button", { name: "Mark dispatched", exact: true })).toBeVisible();
  await expect(page.getByText("No dispatched jobs yet.")).toBeVisible();
  await page.getByRole("button", { name: "Mark dispatched", exact: true }).click();
  await expect(page.getByRole("button", { name: "Mark dispatched", exact: true })).toHaveCount(0);
  await page.reload();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download JOB-1001 PDF" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("JOB-1001-production-receipt.pdf");
  const content = new Uint8Array(await readFile(await download.path()));
  const pdf = await getDocument({ data: content, useSystemFonts: true }).promise;
  let text = "";
  for (let index = 1; index <= pdf.numPages; index += 1) text += (await (await pdf.getPage(index)).getTextContent()).items.map((item) => item.str).join(" ");
  expect(text).toContain("Production receipt");
  for (const expected of ["Demo carton", "10001", "1251", "Calculated required sheets", "SO-42", "Acme Packaging", "carton-design.pdf", "Printing press 1", "Corrugator 1", "Dispatched"]) expect(text).toContain(expected);
  await page.screenshot({ path: testInfo.outputPath("dispatch.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("job specification and design survive product edits; actual yield overrides area ratio", async ({ page }) => {
  await page.goto("/");
  await createProduct(page, { design: true });
  await createJob(page, { quantity: "10000", yieldPerSheet: "5" });
  await view(page, "Configuration");
  await page.getByRole("button", { name: "Edit Demo carton", exact: true }).click();
  const form = page.getByRole("dialog", { name: "Edit product", exact: true });
  await form.getByLabel("Standard reel size").fill("99");
  await form.getByLabel("Number of colors").fill("2");
  await form.getByLabel("Design PDF", { exact: false }).setInputFiles(pdfFile("new-design.pdf", "Revised design"));
  await form.getByRole("button", { name: "Save product" }).click();
  await view(page, "Machines");
  const job = await details(page);
  await expect(job.getByText("19 × 36", { exact: true })).toBeVisible();
  await expect(job.getByText("2,000", { exact: true })).toBeVisible();
  await expect(job.getByRole("link", { name: "carton-design.pdf", exact: true })).toBeVisible();
  await expect(job.getByText("6 · Red, Yellow", { exact: true })).toBeVisible();
  await job.getByRole("button", { name: "Close dialog" }).click();
  await createJob(page, { number: "JOB-1002", assignments: ["Printing press 2", "Corrugator 1"] });
  const next = await details(page, "JOB-1002");
  await expect(next.getByText("99 × 36", { exact: true })).toBeVisible();
  await expect(next.getByRole("link", { name: "new-design.pdf", exact: true })).toBeVisible();
});

test("owner corrections restore state and are blocked by later production", async ({ page }) => {
  await page.goto("/");
  await createProduct(page);
  await createJob(page);
  await page.getByRole("button", { name: "Start JOB-1001 on Printing press 1", exact: true }).click();
  let job = await details(page);
  await job.getByText("Job activity & corrections", { exact: true }).click();
  await job.getByRole("button", { name: "Undo Start", exact: true }).click();
  await page.getByRole("button", { name: "Confirm correction" }).click();
  await expect(job.getByText("Operation started · corrected", { exact: true })).toBeVisible();
  await job.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Start JOB-1001 on Printing press 1", exact: true }).click();
  await page.getByRole("button", { name: "Complete JOB-1001 on Printing press 1", exact: true }).click();
  job = await details(page);
  await job.getByText("Job activity & corrections", { exact: true }).click();
  await job.getByRole("button", { name: "Undo Complete", exact: true }).click();
  await page.getByRole("button", { name: "Confirm correction" }).click();
  await job.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.getByRole("button", { name: "Complete JOB-1001 on Printing press 1", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start JOB-1001 on Corrugator 1", exact: true })).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Complete JOB-1001 on Printing press 1", exact: true }).click();
  await page.getByRole("button", { name: "Start JOB-1001 on Corrugator 1", exact: true }).click();
  job = await details(page);
  await job.getByRole("button", { name: "Edit job" }).click();
  const edit = page.getByRole("dialog", { name: "Edit JOB-1001" });
  await expect(edit.getByLabel("Ordered boxes", { exact: true })).toBeDisabled();
  await edit.getByLabel("Job notes", { exact: true }).fill("Running job note correction");
  await edit.getByRole("button", { name: "Save job" }).click();
  job = await details(page);
  await expect(job.getByText("Running job note correction", { exact: true })).toBeVisible();
  await job.getByText("Job activity & corrections", { exact: true }).click();
  await expect(job.getByRole("button", { name: "Undo Complete", exact: true })).toBeDisabled();
});

test("queues can be reprioritized and reassigned without changing the product", async ({ page }) => {
  await page.goto("/");
  await createProduct(page, { processes: ["Printing"] });
  await createJob(page, { assignments: ["Printing press 1"] });
  await createJob(page, { assignments: ["Printing press 1"], number: "JOB-1002" });
  const machine = page.getByTestId("machine-Printing press 1");
  await machine.getByRole("button", { name: "Queue & details" }).click();
  await page.getByRole("button", { name: "Move JOB-1002 up", exact: true }).click();
  await expect(machine.getByRole("button", { name: "Start JOB-1002 on Printing press 1", exact: true })).toBeVisible();
  const job = await details(page, "JOB-1002");
  await job.getByRole("button", { name: "Edit job" }).click();
  const edit = page.getByRole("dialog", { name: "Edit JOB-1002" });
  await edit.getByLabel("1. Printing machine").selectOption({ label: "Printing press 2" });
  await edit.getByRole("button", { name: "Save job" }).click();
  await expect(page.getByTestId("machine-Printing press 2").getByRole("button", { name: "Start JOB-1002 on Printing press 2" })).toBeVisible();
  await expect(machine.getByRole("button", { name: "Start JOB-1001 on Printing press 1" })).toBeVisible();
  await view(page, "Workstation");
  await expect(page.getByRole("button", { name: "New job", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "View JOB-1001", exact: true }).click();
  await expect(page.getByRole("button", { name: "Edit job", exact: true })).toHaveCount(0);
});

test("machine configuration refuses dangling references and preserves retired history", async ({ page }) => {
  await page.goto("/");
  await view(page, "Configuration");
  await page.getByRole("button", { name: "New machine", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "New machine" });
  await dialog.getByLabel("Machine name").fill("Demo printer");
  await dialog.getByLabel("Process / department").selectOption({ label: "Printing" });
  await dialog.getByRole("button", { name: "Save machine" }).click();
  await createProduct(page, { processes: ["Printing"] });
  await createJob(page, { assignments: ["Demo printer"] });
  await view(page, "Configuration");
  await page.getByRole("button", { name: "Remove Demo printer", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Remove Demo printer?" });
  await dialog.getByRole("button", { name: "Confirm removal" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Reassign queued work");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await view(page, "Machines");
  await page.getByRole("button", { name: "Start JOB-1001 on Demo printer" }).click();
  await page.getByRole("button", { name: "Complete JOB-1001 on Demo printer" }).click();
  await view(page, "Configuration");
  await page.getByRole("button", { name: "Remove Demo printer", exact: true }).click();
  await page.getByRole("button", { name: "Confirm removal" }).click();
  const row = page.locator(".compact-row").filter({ hasText: "Demo printer" });
  await expect(row.getByText("Retired", { exact: true })).toBeVisible();
  await row.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.getByRole("dialog").getByText("Operation completed", { exact: true })).toBeVisible();
});

test("storage failure keeps form inputs and last persisted state", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException("Storage full", "QuotaExceededError"); }; });
  await page.getByRole("button", { name: "New job", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "New job", exact: true });
  await dialog.getByLabel("Sales order reference", { exact: true }).fill("DO-NOT-LOSE");
  await dialog.getByRole("button", { name: "Create & release job" }).click();
  await expect(dialog.getByRole("alert")).toContainText("change was not applied");
  await expect(dialog.getByLabel("Sales order reference", { exact: true })).toHaveValue("DO-NOT-LOSE");
  await page.reload();
  await expect(page.getByRole("heading", { name: "From product setup to dispatch" })).toBeVisible();
  await expect(page.getByRole("button", { name: "View JOB-1001", exact: true })).toHaveCount(0);
});

test("browser restart retains configuration, PDF attachment and active work", async ({ browserName }, testInfo) => {
  test.skip(browserName !== "chromium", "Persistent-profile check uses Chromium.");
  const profile = testInfo.outputPath("persistent-profile");
  let context = await chromium.launchPersistentContext(profile, { headless: true });
  let page = await context.newPage();
  await page.goto("http://127.0.0.1:4185/");
  await createProduct(page, { design: true });
  await createJob(page);
  await page.getByRole("button", { name: "Start JOB-1001 on Printing press 1" }).click();
  await context.close();
  context = await chromium.launchPersistentContext(profile, { headless: true });
  try {
    page = await context.newPage();
    await page.goto("http://127.0.0.1:4185/");
    await expect(page.getByRole("button", { name: "Complete JOB-1001 on Printing press 1" })).toBeVisible();
    const job = await details(page);
    const downloadPromise = page.waitForEvent("download");
    await job.getByRole("link", { name: "carton-design.pdf", exact: true }).click();
    const saved = await downloadPromise;
    expect((await readFile(await saved.path())).subarray(0, 5).toString()).toBe("%PDF-");
  } finally { await context.close(); }
});

test("mobile views and dialogs stay within the viewport", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await createProduct(page, { processes: ["Corrugation"] });
  await createJob(page, { assignments: ["Corrugator 1"] });
  await view(page, "Workstation");
  await page.getByLabel("Department", { exact: true }).selectOption({ label: "Corrugation" });
  await expect(page.getByRole("button", { name: "Start JOB-1001 on Corrugator 1" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("mobile-workstation.png"), fullPage: true });
});

test("incoming planning anticipates upstream jobs and visible undo restores their previous machine", async ({ page }, testInfo) => {
  await page.goto("/");
  await createProduct(page);
  await createJob(page);
  await createJob(page, { assignments: ["Printing press 2", "Corrugator 1"], number: "JOB-1002" });
  await page.getByRole("button", { name: "Start JOB-1001 on Printing press 1", exact: true }).click();
  await page.getByRole("button", { name: "View Corrugator 1 planning", exact: true }).click();
  const incoming = page.locator(".incoming-work");
  await incoming.getByText("Incoming work · 2", { exact: true }).click();
  await expect(incoming.getByRole("button", { name: "View JOB-1001", exact: true })).toBeVisible();
  await expect(incoming.getByRole("button", { name: "View JOB-1002", exact: true })).toBeVisible();
  await expect(incoming.getByText("Running", { exact: true })).toBeVisible();
  await expect(incoming.getByText("Ready", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start JOB-1001 on Corrugator 1", exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("incoming-work.png"), fullPage: true });
  await page.getByRole("button", { name: "Complete JOB-1001 on Printing press 1", exact: true }).click();
  await expect(incoming.getByText("Incoming work · 1", { exact: true })).toBeVisible();
  await expect(incoming.getByRole("button", { name: "View JOB-1001", exact: true })).toHaveCount(0);
  let job = await details(page);
  await job.getByRole("button", { name: "Undo previous completion", exact: true }).click();
  await page.getByRole("button", { name: "Confirm correction", exact: true }).click();
  await job.getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect(page.getByRole("button", { name: "Complete JOB-1001 on Printing press 1", exact: true })).toBeVisible();
  await expect(incoming.getByText("Incoming work · 2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Complete JOB-1001 on Printing press 1", exact: true }).click();
  await page.getByRole("button", { name: "View Printing press 1 planning", exact: true }).click();
  await page.getByRole("button", { name: "Undo last completion", exact: true }).click();
  await page.getByRole("button", { name: "Confirm correction", exact: true }).click();
  await view(page, "Configuration");
  await page.getByRole("button", { name: "New machine", exact: true }).click();
  const machineForm = page.getByRole("dialog", { name: "New machine", exact: true });
  await machineForm.getByLabel("Machine name").fill("Corrugator 2");
  await machineForm.getByLabel("Process / department").selectOption({ label: "Corrugation" });
  await machineForm.getByRole("button", { name: "Save machine" }).click();
  await view(page, "Machines");
  job = await details(page);
  await job.getByRole("button", { name: "Edit job" }).click();
  const edit = page.getByRole("dialog", { name: "Edit JOB-1001" });
  await edit.getByLabel("2. Corrugation machine").selectOption({ label: "Corrugator 2" });
  await edit.getByRole("button", { name: "Save job" }).click();
  await view(page, "Workstation");
  await page.getByLabel("Department", { exact: true }).selectOption({ label: "Corrugation" });
  await page.getByRole("button", { name: "View Corrugator 2 planning", exact: true }).click();
  await page.locator(".incoming-work").getByText("Incoming work · 1", { exact: true }).click();
  await expect(page.locator(".incoming-work").getByRole("button", { name: "View JOB-1001", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start JOB-1001 on Corrugator 2", exact: true })).toHaveCount(0);
});

test("job sheet scaling suggests yield without overriding entered values", async ({ page }) => {
  await page.goto("/");
  await createProduct(page, { name: "Scaling carton", processes: ["Printing", "Corrugation"] });
  await page.getByRole("button", { name: "New job", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "New job", exact: true });
  await dialog.getByLabel("Product", { exact: true }).selectOption({ label: "Scaling carton" });
  // Untouched yield tracks sheet scaling automatically: doubling the reel doubles the area.
  await dialog.getByLabel("Job reel size", { exact: true }).fill("38");
  await expect(dialog.getByLabel("Actual boxes per sheet", { exact: true })).toHaveValue("8");
  // A hand-edited yield is never overwritten; the estimate becomes an apply-able nudge.
  await dialog.getByLabel("Actual boxes per sheet", { exact: true }).fill("5");
  await dialog.getByLabel("Job cutting size", { exact: true }).fill("72");
  const nudge = dialog.getByRole("status");
  await expect(nudge).toContainText("Suggested 16 boxes per sheet from 4× sheet area");
  await nudge.getByRole("button", { name: "Apply suggestion", exact: true }).click();
  await expect(dialog.getByLabel("Actual boxes per sheet", { exact: true })).toHaveValue("16");
  await expect(dialog.getByText("625", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
});
