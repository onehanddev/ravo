import { saveProduct, saveMachine, removeMachine } from "./configuration.js";
import { undoOperation } from "./corrections.js";
import { createJob, editJob } from "./jobs.js";
import { dispatchJob, productionAction } from "./lifecycle.js";
import { reorderQueue, synchronizeQueues } from "./queues.js";
import { record, requireValue, validateState } from "./validation.js";

export { createInitialState } from "./seed.js";
export { calculateSheets, suggestBoxesPerSheet, areaRatio, formatAreaRatio } from "./validation.js";
export { validateState } from "./validation.js";
export { getMachineView, getDepartmentView, getJobStatus, getIncomingWork } from "./selectors.js";
export { getUndoReason } from "./corrections.js";

const handlers = {
  "product.save": saveProduct,
  "machine.save": saveMachine,
  "machine.remove": removeMachine,
  "job.create": createJob,
  "job.edit": editJob,
  "operation.start": productionAction,
  "operation.complete": productionAction,
  "queue.reorder": reorderQueue,
  "operation.undo": undoOperation,
  "job.dispatch": dispatchJob,
};

export function applyCommand(state, command, { actor = "owner", now = new Date().toISOString() } = {}) {
  record(command, "Command");
  requireValue(Object.hasOwn(handlers, command.type), "Unknown manufacturing command.");
  requireValue(["owner", "supervisor", "worker"].includes(actor), "Unknown production role.");
  const production = ["operation.start", "operation.complete"].includes(command.type);
  requireValue(actor === "owner" || production || (actor === "supervisor" && command.type === "queue.reorder"), "Only the owner can perform this action. Supervisors may reorder queues; workers may Start and Complete production.");
  requireValue(typeof now === "string" && Number.isFinite(Date.parse(now)), "A valid production timestamp is required.");
  validateState(state);
  const next = structuredClone(state);
  handlers[command.type](next, command, { actor, now: new Date(now).toISOString() });
  synchronizeQueues(next);
  next.revision += 1;
  validateState(next);
  return next;
}
