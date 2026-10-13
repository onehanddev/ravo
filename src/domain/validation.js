export function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

export function record(value, label) {
  requireValue(value && typeof value === "object" && !Array.isArray(value), `${label} is required.`);
  return value;
}

export function text(value, label, required = false) {
  requireValue(value == null || typeof value === "string", `${label} must be text.`);
  const result = (value ?? "").trim();
  requireValue(!required || result.length > 0, `${label} is required.`);
  return result;
}

export function positive(value, label, whole = false) {
  requireValue(typeof value === "number" && Number.isFinite(value) && value > 0 && (!whole || Number.isSafeInteger(value)), `${label} must be a positive ${whole ? "whole number" : "finite number"}.`);
  return value;
}

export function dimensions(value, label) {
  record(value, label);
  return {
    reelSize: positive(value.reelSize, `${label}: Reel size`),
    cuttingSize: positive(value.cuttingSize, `${label}: Cutting size`),
  };
}

export function calculateSheets({ quantity, boxesPerSheet, sheet, standardSheet } = {}) {
  positive(quantity, "Ordered box quantity", true);
  positive(boxesPerSheet, "Actual boxes per sheet", true);
  const actual = dimensions(sheet, "Job sheet");
  const standard = dimensions(standardSheet, "Standard sheet");
  const requiredSheets = Math.ceil(quantity / boxesPerSheet);
  const boxCapacity = requiredSheets * boxesPerSheet;
  const actualArea = actual.reelSize * actual.cuttingSize;
  const standardArea = standard.reelSize * standard.cuttingSize;
  const multiplier = actualArea / standardArea;
  requireValue(Number.isSafeInteger(requiredSheets) && Number.isSafeInteger(boxCapacity) && Number.isFinite(actualArea) && actualArea > 0 && Number.isFinite(standardArea) && standardArea > 0 && Number.isFinite(multiplier) && multiplier > 0, "Sheet calculation exceeds the supported numeric range.");
  return { requiredSheets, boxCapacity, multiplier };
}

export function findById(items, id, label) {
  const item = items.find((entry) => entry.id === id);
  requireValue(item, `${label} was not found. Refresh the selection and try again.`);
  return item;
}

export function availableMachine(state, id, processId) {
  const machine = findById(state.machines, id, "Assigned machine");
  requireValue(machine.processId === processId, "Assigned machine must belong to the operation's process.");
  requireValue(!machine.retired && machine.availability === "available", `${machine.name} is unavailable. Choose an available machine.`);
  return machine;
}

export function currentOperation(job) {
  return job.operations.find((operation) => operation.status !== "completed") ?? null;
}

// Check structural workflow invariants at the command boundary, including data
// restored from storage. In particular, an empty/malformed route is never done.
export function validateState(state) {
  requireValue(state?.version === 1 && Number.isSafeInteger(state.revision) && state.revision >= 0, "Unsupported or invalid manufacturing data.");
  for (const key of ["processes", "machines", "products", "jobs", "attachments", "events"]) {
    requireValue(Array.isArray(state[key]), `Manufacturing data is missing ${key}.`);
    requireValue(state[key].every((item) => typeof item.id === "string" && item.id) && new Set(state[key].map((item) => item.id)).size === state[key].length, `Invalid or duplicate identities in ${key}.`);
  }
  requireValue(state.processes.length > 0, "The factory needs a process catalog.");
  state.processes.forEach((process) => text(process.name, "Process name", true));
  for (const attachment of state.attachments) {
    text(attachment.name, "Design PDF name", true);
    requireValue(Number.isSafeInteger(attachment.size) && attachment.size > 0 && attachment.size <= 750 * 1024, "Invalid stored design PDF size.");
    requireValue(typeof attachment.dataUrl === "string" && /^data:application\/pdf;base64,JVBERi0[A-Za-z0-9+/]*={0,2}$/.test(attachment.dataUrl), "Invalid stored design PDF.");
  }
  const validateSpecification = (product, retained = false) => {
    record(product, "Production specification");
    text(product.name, "Product name", true);
    const sheet = dimensions(product.standardSheet, "Standard sheet");
    requireValue(Number.isFinite(sheet.reelSize * sheet.cuttingSize) && sheet.reelSize * sheet.cuttingSize > 0, "Invalid standard sheet area.");
    positive(product.boxesPerStandardSheet, "Boxes per standard sheet", true);
    requireValue(Number.isSafeInteger(product.numberOfColors) && product.numberOfColors >= 0, "Invalid color count.");
    text(product.specialColors, "Special colors");
    if (product.designId) findById(state.attachments, product.designId, "Retained design PDF");
    requireValue(Array.isArray(product.route) && product.route.length > 0, "Product needs a manufacturing route.");
    const unique = new Set();
    for (const step of product.route) {
      findById(state.processes, step.processId, "Route process");
      requireValue(!unique.has(step.processId), "Duplicate process in product route.");
      unique.add(step.processId);
      if (step.machineId) {
        const machine = findById(state.machines, step.machineId, "Route machine");
        requireValue(machine.processId === step.processId, "Route machine belongs to the wrong process.");
        if (!retained) requireValue(!machine.retired && machine.availability === "available", "A product default machine is unavailable.");
      } else requireValue(!retained, "Retained route machine is missing.");
    }
  };
  state.products.forEach((product) => validateSpecification(product));
  const queued = new Set();
  for (const machine of state.machines) {
    text(machine.name, "Machine name", true);
    findById(state.processes, machine.processId, "Machine process");
    requireValue(["available", "maintenance"].includes(machine.availability) && typeof machine.retired === "boolean" && Array.isArray(machine.queue), "Invalid machine configuration.");
    requireValue(!machine.queue.length || (!machine.retired && machine.availability === "available"), "Unavailable machines cannot have queued work.");
    machine.queue.forEach((jobId, index) => {
      requireValue(!queued.has(jobId), "A job cannot appear in more than one queue position.");
      queued.add(jobId);
      const job = findById(state.jobs, jobId, "Queued job");
      requireValue(Array.isArray(job.operations), "Job operations are missing.");
      const operation = currentOperation(job);
      requireValue(job.status === "active" && operation?.machineId === machine.id, "Machine queue does not match the job's current operation.");
      requireValue(index === 0 ? ["ready", "running"].includes(operation.status) : operation.status === "waiting", "Machine queue has an invalid ready or running position.");
    });
  }
  const operationIds = new Set();
  const numbers = new Set();
  for (const job of state.jobs) {
    validateSpecification(job.specification, true);
    findById(state.products, job.productId, "Job product");
    text(job.number, "Job number", true);
    for (const key of ["orderReference", "customer", "notes"]) text(job[key], key);
    for (const key of ["createdAt", "productionCompletedAt", "dispatchedAt"]) {
      requireValue(key !== "createdAt" && job[key] === null || typeof job[key] === "string" && Number.isFinite(Date.parse(job[key])), "Invalid retained job date.");
    }
    requireValue(!numbers.has(job.number), "Job numbers must be unique.");
    numbers.add(job.number);
    requireValue(Array.isArray(job.operations) && job.operations.length > 0 && job.specification?.route?.length === job.operations.length, "Job has an incomplete manufacturing route.");
    calculateSheets({ quantity: job.quantity, boxesPerSheet: job.boxesPerSheet, sheet: job.sheet, standardSheet: job.specification.standardSheet });
    const current = currentOperation(job);
    let unfinished = false;
    job.operations.forEach((operation, index) => {
      requireValue(typeof operation.id === "string" && !operationIds.has(operation.id), "Operation identities must be unique.");
      operationIds.add(operation.id);
      const machine = findById(state.machines, operation.machineId, "Planned machine");
      requireValue(operation.processId === job.specification.route[index].processId && machine.processId === operation.processId, "Job plan does not match its retained process route.");
      requireValue(["pending", "waiting", "ready", "running", "completed"].includes(operation.status), "Invalid operation status.");
      if (operation.status === "completed") {
        requireValue(!unfinished && operation.startedAt && operation.completedAt, "Completed operations must follow route order and have production dates.");
      } else {
        requireValue(!machine.retired && machine.availability === "available", "An unfinished operation needs an available machine.");
        requireValue(operation === current || operation.status === "pending", "Future operations cannot execute before their predecessors.");
        requireValue(operation.completedAt === null && (operation.status === "running" ? !!operation.startedAt : operation.startedAt === null), "Operation dates do not match its status.");
        unfinished = true;
      }
    });
    requireValue(["active", "ready-for-dispatch", "dispatched"].includes(job.status), "Invalid job status.");
    requireValue(current ? job.status === "active" && queued.has(job.id) && !job.productionCompletedAt && !job.dispatchedAt : job.status !== "active" && !!job.productionCompletedAt && !queued.has(job.id), "Job status does not match its production route.");
    requireValue(job.status === "dispatched" ? !!job.dispatchedAt : job.dispatchedAt === null, "Dispatch date does not match job status.");
  }
}
