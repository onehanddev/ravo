import { addEvent } from "./events.js";
import { availableMachine, currentOperation, findById, requireValue } from "./validation.js";

export function productionAction(state, command, context) {
  const job = findById(state.jobs, command.jobId, "Job");
  requireValue(job.status === "active", "This job has no active manufacturing operation.");
  const operation = currentOperation(job);
  requireValue(operation, "Job has no valid current operation.");
  const machine = availableMachine(state, operation.machineId, operation.processId);
  requireValue(machine.queue[0] === job.id, "Only the first ready or running job in the machine queue can be updated.");
  const process = findById(state.processes, operation.processId, "Operation process");
  if (command.type === "operation.start") {
    requireValue(operation.status === "ready", "Only a ready operation can be started.");
    operation.status = "running";
    operation.startedAt = context.now;
    addEvent(state, "start", context, { job, operation, machine, detail: `${job.number} · ${job.specification.name}: ${process.name} started on ${machine.name}.` });
    return;
  }
  requireValue(operation.status === "running", "Start the current operation before marking it complete.");
  requireValue(Date.parse(context.now) >= Date.parse(operation.startedAt), "Completion cannot be recorded before the operation's Start time.");
  const next = job.operations[job.operations.indexOf(operation) + 1];
  const destination = next ? availableMachine(state, next.machineId, next.processId) : null;
  if (next) requireValue(next.status === "pending", "The next operation is not a valid pending handoff.");
  operation.status = "completed";
  operation.completedAt = context.now;
  machine.queue.shift();
  if (destination) destination.queue.push(job.id);
  else {
    job.status = "ready-for-dispatch";
    job.productionCompletedAt = context.now;
  }
  addEvent(state, "complete", context, {
    job, operation, machine,
    ...(next && { nextOperationId: next.id, destinationMachineId: destination.id, destinationMachineName: destination.name }),
    detail: `${job.number} · ${job.specification.name}: ${process.name} completed on ${machine.name}. ${destination ? `Sent to ${destination.name}.` : "Manufacturing complete; ready for dispatch."}`,
  });
}

export function dispatchJob(state, command, context) {
  const job = findById(state.jobs, command.jobId, "Job");
  requireValue(job.status === "ready-for-dispatch" && job.operations.length > 0 && job.operations.every((operation) => operation.status === "completed"), "Only a job with all manufacturing complete and awaiting dispatch can be dispatched.");
  requireValue(Date.parse(context.now) >= Date.parse(job.productionCompletedAt), "Dispatch cannot be recorded before production completion.");
  job.status = "dispatched";
  job.dispatchedAt = context.now;
  addEvent(state, "dispatch", context, { job, detail: `${job.number} · ${job.specification.name} dispatched.` });
}
