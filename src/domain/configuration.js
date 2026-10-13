import { newId, addEvent } from "./events.js";
import { availableMachine, dimensions, findById, positive, record, requireValue, text } from "./validation.js";

function saveAttachment(state, attachment) {
  record(attachment, "Design PDF");
  requireValue(typeof attachment.id === "string" && attachment.id.length > 0, "Design PDF identity is required.");
  text(attachment.name, "Design PDF name", true);
  requireValue(Number.isSafeInteger(attachment.size) && attachment.size > 0 && attachment.size <= 750 * 1024, "Design PDF must be no larger than 750 KiB.");
  requireValue(typeof attachment.dataUrl === "string" && /^data:application\/pdf;base64,JVBERi0[A-Za-z0-9+/]*={0,2}$/.test(attachment.dataUrl), "Design must contain a valid, durable PDF data URL.");
  const existing = state.attachments.find((entry) => entry.id === attachment.id);
  requireValue(!existing || (existing.dataUrl === attachment.dataUrl && existing.size === attachment.size && existing.name === attachment.name), "An existing design identity cannot be replaced with different content.");
  if (!existing) state.attachments.push({ id: attachment.id, name: attachment.name, dataUrl: attachment.dataUrl, size: attachment.size });
}

export function saveProduct(state, command) {
  const input = record(command.product, "Product");
  const existing = input.id ? findById(state.products, input.id, "Product") : null;
  if (command.attachment) saveAttachment(state, command.attachment);
  const designId = input.designId ?? command.attachment?.id ?? null;
  if (designId) findById(state.attachments, designId, "Design PDF");
  requireValue(Array.isArray(input.route) && input.route.length > 0, "Choose at least one manufacturing process.");
  const processes = new Set();
  const route = input.route.map((step) => {
    record(step, "Route step");
    findById(state.processes, step.processId, "Route process");
    requireValue(!processes.has(step.processId), "A process can appear only once in a product route.");
    processes.add(step.processId);
    const machineId = step.machineId || null;
    if (machineId) availableMachine(state, machineId, step.processId);
    return { processId: step.processId, machineId };
  });
  requireValue(Number.isSafeInteger(input.numberOfColors) && input.numberOfColors >= 0, "Number of colors must be a non-negative whole number.");
  const product = {
    id: existing?.id ?? newId(), name: text(input.name, "Product name", true),
    standardSheet: dimensions(input.standardSheet, "Standard sheet"),
    boxesPerStandardSheet: positive(input.boxesPerStandardSheet, "Boxes per standard sheet", true),
    numberOfColors: input.numberOfColors, specialColors: text(input.specialColors, "Special colors"), designId, route,
  };
  const area = product.standardSheet.reelSize * product.standardSheet.cuttingSize;
  requireValue(Number.isFinite(area) && area > 0, "Standard sheet area exceeds the supported numeric range.");
  if (existing) state.products[state.products.indexOf(existing)] = product;
  else state.products.push(product);
}

function references(state, id) {
  return {
    defaults: state.products.some((product) => product.route.some((step) => step.machineId === id)),
    unfinished: state.jobs.some((job) => job.operations.some((operation) => operation.machineId === id && operation.status !== "completed")),
    retained: state.jobs.some((job) => job.operations.some((operation) => operation.machineId === id) || job.specification.route.some((step) => step.machineId === id)) || state.events.some((event) => event.machineId === id),
  };
}

export function saveMachine(state, command) {
  const input = record(command.machine, "Machine");
  const existing = input.id ? findById(state.machines, input.id, "Machine") : null;
  const processId = input.processId ?? existing?.processId;
  findById(state.processes, processId, "Machine process");
  const availability = input.availability ?? existing?.availability ?? "available";
  requireValue(["available", "maintenance"].includes(availability), "Choose available or maintenance for machine availability.");
  requireValue(input.retired == null || input.retired === (existing?.retired ?? false), "Use Remove machine to retire a machine after resolving references.");
  if (existing) {
    const refs = references(state, existing.id);
    requireValue(processId === existing.processId || !(refs.defaults || refs.unfinished || refs.retained), "A referenced machine cannot change process. Add a new machine instead.");
    requireValue(availability === "available" || !(refs.unfinished || refs.defaults), "Resolve queued work, future assignments and product defaults before marking this machine unavailable.");
    Object.assign(existing, { name: text(input.name, "Machine name", true), processId, availability });
  } else {
    state.machines.push({ id: newId(), name: text(input.name, "Machine name", true), processId, availability, retired: false, queue: [] });
  }
}

export function removeMachine(state, command, context) {
  const machine = findById(state.machines, command.machineId, "Machine");
  requireValue(!machine.retired, "This machine is already retired.");
  const running = state.jobs.some((job) => job.operations.some((operation) => operation.machineId === machine.id && operation.status === "running"));
  requireValue(!running, "A running operation prevents machine retirement.");
  const refs = references(state, machine.id);
  requireValue(!refs.unfinished && machine.queue.length === 0, "Reassign queued work and all future job-plan assignments before removing this machine.");
  requireValue(!refs.defaults, "Clear or replace product default-machine assignments before removing this machine.");
  if (refs.retained) {
    machine.retired = true;
    addEvent(state, "machine.retire", context, { machine, detail: `${machine.name} retired; retained production references are preserved.` });
  } else state.machines = state.machines.filter((entry) => entry.id !== machine.id);
}
