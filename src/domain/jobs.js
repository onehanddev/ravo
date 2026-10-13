import { addEvent, newId } from "./events.js";
import { withdraw } from "./queues.js";
import { availableMachine, calculateSheets, currentOperation, dimensions, findById, record, requireValue, text } from "./validation.js";

function validateAssignments(state, route, assignments) {
  requireValue(Array.isArray(assignments) && assignments.length === route.length, "Assign an available machine to every manufacturing operation before releasing the job.");
  assignments.forEach((id, index) => availableMachine(state, id, route[index].processId));
}

export function createJob(state, command, context) {
  const product = findById(state.products, command.productId, "Product");
  requireValue(Array.isArray(product.route) && product.route.length > 0, "Product needs a manufacturing route before a job can be created.");
  validateAssignments(state, product.route, command.assignments);
  calculateSheets({ ...command, standardSheet: product.standardSheet });
  // The complete retained collection (including dispatched jobs) guards against
  // false reuse even when a saved state predates the optional sequence counter.
  const retainedMaximum = state.jobs.reduce((maximum, job) => Math.max(maximum, Number(String(job.number).replace(/^JOB-/, "")) || 0), 1000);
  const sequence = Math.max(state.nextJobNumber ?? 1001, retainedMaximum + 1);
  requireValue(Number.isSafeInteger(sequence) && sequence < Number.MAX_SAFE_INTEGER, "Job number sequence is exhausted.");
  state.nextJobNumber = sequence + 1;
  const specification = structuredClone(product);
  specification.route = specification.route.map((step, index) => {
    const machine = findById(state.machines, command.assignments[index], "Assigned machine");
    const process = findById(state.processes, step.processId, "Route process");
    return { ...step, machineId: machine.id, machineName: machine.name, processName: process.name };
  });
  const job = {
    id: newId(), number: `JOB-${sequence}`, productId: product.id, specification,
    quantity: command.quantity, sheet: dimensions(command.sheet, "Job sheet"), boxesPerSheet: command.boxesPerSheet,
    orderReference: text(command.orderReference, "Order reference"), customer: text(command.customer, "Customer"), notes: text(command.notes, "Notes"),
    createdAt: context.now, productionCompletedAt: null, dispatchedAt: null, status: "active",
    operations: specification.route.map((step) => ({
      id: newId(), processId: step.processId, machineId: step.machineId,
      status: "pending", startedAt: null, completedAt: null,
    })),
  };
  state.jobs.push(job);
  findById(state.machines, job.operations[0].machineId, "First machine").queue.push(job.id);
  addEvent(state, "job.create", context, { job, detail: `${job.number} · ${specification.name} released with ${job.operations.length} planned operations.` });
}

export function editJob(state, command, context) {
  const job = findById(state.jobs, command.jobId, "Job");
  requireValue(job.status !== "dispatched", "Dispatched jobs are retained history and cannot be edited.");
  const changes = record(command.changes, "Job changes");
  const allowed = ["quantity", "sheet", "boxesPerSheet", "assignments", "orderReference", "customer", "notes"];
  requireValue(Object.keys(changes).every((key) => allowed.includes(key)), "Only job quantities, sheet details, metadata and unstarted assignments can be edited.");
  const sheet = changes.sheet === undefined ? job.sheet : dimensions(changes.sheet, "Job sheet");
  const quantity = changes.quantity === undefined ? job.quantity : changes.quantity;
  const boxesPerSheet = changes.boxesPerSheet === undefined ? job.boxesPerSheet : changes.boxesPerSheet;
  const specificationChanged = quantity !== job.quantity || boxesPerSheet !== job.boxesPerSheet || sheet.reelSize !== job.sheet.reelSize || sheet.cuttingSize !== job.sheet.cuttingSize;
  const everStarted = state.events.some((event) => event.jobId === job.id && event.type === "start") || job.operations.some((operation) => operation.startedAt);
  requireValue(!specificationChanged || !everStarted, "Production specification cannot change after production has started, including a corrected Start.");
  calculateSheets({ quantity, boxesPerSheet, sheet, standardSheet: job.specification.standardSheet });
  if (changes.assignments !== undefined) {
    requireValue(Array.isArray(changes.assignments) && changes.assignments.length === job.operations.length, "The job needs a complete machine plan for every operation.");
    const current = currentOperation(job);
    changes.assignments.forEach((id, index) => {
      const operation = job.operations[index];
      if (id === operation.machineId) return;
      requireValue(!operation.startedAt && operation.status !== "completed", "Running or completed operations cannot be reassigned.");
      const destination = availableMachine(state, id, operation.processId);
      if (operation === current) {
        withdraw(state, job.id);
        destination.queue.push(job.id);
      }
      operation.machineId = id;
    });
  }
  Object.assign(job, { quantity, sheet: { ...sheet }, boxesPerSheet });
  for (const key of ["orderReference", "customer", "notes"]) {
    if (changes[key] !== undefined) job[key] = text(changes[key], key);
  }
  addEvent(state, "job.edit", context, { job, detail: `${job.number} job details or unstarted machine plan updated.` });
}
