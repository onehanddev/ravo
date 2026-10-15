import { calculateSheets, formatAreaRatio } from "../domain/index.js";

const date = (value) => value ? new Date(value).toLocaleString() : "Not recorded";
const dimensions = (sheet) => `${sheet.reelSize} x ${sheet.cuttingSize}`;

function receipt(state, jobId) {
  const job = state.jobs.find((entry) => entry.id === jobId);
  if (!job || job.status !== "dispatched") throw new Error("Confirm dispatch before exporting a Production receipt.");
  const calculation = calculateSheets({ ...job, standardSheet: job.specification.standardSheet });
  const ratio = formatAreaRatio({ sheet: job.sheet, standardSheet: job.specification.standardSheet });
  const rows = [
    ["Job", job.number], ["Product / box name", job.specification.name],
    ["Sales order reference", job.orderReference || "—"], ["Customer", job.customer || "—"],
    ["Ordered boxes", String(job.quantity)], ["Job sheet (reel x cutting)", dimensions(job.sheet)],
    ["Calculated required sheets", String(calculation.requiredSheets)], ["Box capacity", String(calculation.boxCapacity)],
    ["Actual boxes per sheet", String(job.boxesPerSheet)],
    ["Standard sheet (reel x cutting)", dimensions(job.specification.standardSheet)],
    ["Boxes per standard sheet", String(job.specification.boxesPerStandardSheet)],
    ["Job sheet area vs standard", ratio === null ? "—" : ratio],
    ["Number of colors", String(job.specification.numberOfColors)], ["Special colors", job.specification.specialColors || "None"],
    ["Design PDF", state.attachments.find((item) => item.id === job.specification.designId)?.name || "Not attached"],
    ["Job entered", date(job.createdAt)],
    ["Production started", date(job.operations[0]?.startedAt)],
    ["Manufacturing completed", date(job.productionCompletedAt)], ["Dispatched", date(job.dispatchedAt)],
    ["Job notes", job.notes || "—"],
  ];
  for (const [index, operation] of job.operations.entries()) {
    const event = state.events.findLast((entry) => entry.operationId === operation.id && entry.type === "complete" && !entry.undoneBy);
    const process = event?.processName || job.specification.route[index].processName;
    const machine = event?.machineName || state.machines.find((entry) => entry.id === operation.machineId)?.name;
    rows.push([`Operation ${index + 1}: ${process}`, `${machine}\nStarted: ${date(operation.startedAt)}\nCompleted: ${date(operation.completedAt)}`]);
  }
  const corrections = state.events.filter((entry) => entry.jobId === job.id && entry.type === "undo");
  if (corrections.length) rows.push(["Recorded corrections", corrections.map((entry) => `${date(entry.at)}: ${entry.detail}`).join("\n")]);
  return { job, rows };
}

export async function downloadReceipt(state, jobId) {
  const { job, rows } = receipt(state, jobId);
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  pdf.setProperties({ title: `${job.number} · Production receipt`, author: "Ravo", creator: "Ravo · Production in flow" });
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(37, 99, 235);
  pdf.text("Ravo", 18, 20);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139);
  pdf.text("Production in flow", 38, 20);
  pdf.setTextColor(15, 23, 42);
  let y = 34;
  const page = () => { pdf.addPage(); y = 22; };
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text("Production receipt", 18, y);
  y += 10;
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("Packaging factory / Confirmed dispatch", 18, y);
  y += 12;
  for (const [label, value] of rows) {
    if (y > 266) page();
    pdf.setFont("helvetica", "bold");
    pdf.text(label, 18, y);
    y += 5;
    pdf.setFont("helvetica", "normal");
    for (const line of pdf.splitTextToSize(value, 172)) {
      if (y > 276) page();
      pdf.text(line, 18, y);
      y += 5;
    }
    y += 4;
  }
  if (y > 259) page();
  pdf.setTextColor(80, 90, 85);
  pdf.text(pdf.splitTextToSize("Sheet count is a calculated production requirement, not measured material consumption. Dimensions are recorded as entered; no unit conversion is applied.", 172), 18, y + 3);
  const count = pdf.getNumberOfPages();
  for (let index = 1; index <= count; index += 1) {
    pdf.setPage(index);
    pdf.setFontSize(9);
    pdf.text(`Ravo / ${job.number} / Page ${index} of ${count}`, 18, 288);
  }
  pdf.save(`${job.number}-production-receipt.pdf`);
}

export function printReceipt(state, jobId) {
  const { job, rows } = receipt(state, jobId);
  const popup = window.open("", "_blank");
  if (!popup) throw new Error("Allow the print window in your browser, or download the PDF instead.");
  popup.opener = null;
  popup.document.title = `${job.number} · Production receipt · Ravo`;
  const style = popup.document.createElement("style");
  style.textContent = "body{font:14px system-ui,sans-serif;max-width:780px;margin:32px auto;padding:0 20px;color:#172026}h1{font-size:26px}dl{margin:20px 0}dl>div{border-bottom:1px solid #ddd;padding:10px 0;break-inside:avoid}dt{font-weight:700}dd{margin:4px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}p{color:#45554d}@page{margin:18mm}@media print{button{display:none}body{margin:0;padding:0}}";
  popup.document.head.append(style);
  const brand = popup.document.createElement("p");
  brand.textContent = "Ravo · Production in flow";
  const heading = popup.document.createElement("h1");
  heading.textContent = "Production receipt";
  const print = popup.document.createElement("button");
  print.textContent = "Print receipt";
  print.onclick = () => popup.print();
  popup.document.body.append(brand, heading, print);
  const list = popup.document.createElement("dl");
  rows.forEach(([label, value]) => {
    const row = popup.document.createElement("div");
    const term = popup.document.createElement("dt");
    const description = popup.document.createElement("dd");
    term.textContent = label;
    description.textContent = value;
    row.append(term, description);
    list.append(row);
  });
  const note = popup.document.createElement("p");
  note.textContent = "Calculated required sheets are a production requirement, not measured material consumption. Dimensions are shown as entered.";
  popup.document.body.append(list, note);
  popup.focus();
  popup.print();
}
