import { addEvent } from "./events.js";
import { withdraw } from "./queues.js";
import { requireValue } from "./validation.js";

export function getUndoReason(state, eventId) {
  const index = state.events.findIndex((event) => event.id === eventId);
  const event = state.events[index];
  if (!event) return "This production event was not found.";
  if (!["start", "complete"].includes(event.type)) return "Only Start and Complete events can be undone.";
  if (event.undoneBy) return "This event has already been corrected.";
  const job = state.jobs.find((entry) => entry.id === event.jobId);
  const operationIndex = job?.operations.findIndex((entry) => entry.id === event.operationId) ?? -1;
  const operation = job?.operations[operationIndex];
  if (!operation) return "The original job operation was not found.";
  if (job.status === "dispatched") return "Dispatched production cannot be undone.";
  const machine = state.machines.find((entry) => entry.id === event.machineId);
  if (!machine || machine.retired || machine.availability !== "available") return "The source machine is unavailable or retired.";
  if (operation.machineId !== machine.id) return "The operation has since been assigned to a different machine.";
  const downstreamIds = new Set(job.operations.slice(operationIndex + 1).map((entry) => entry.id));
  // Event order, rather than timestamps or only current statuses, is the causal
  // source of truth. Correcting or completing dependent work never erases it.
  const laterStarts = state.events.slice(index + 1).filter((entry) => entry.type === "start");
  if (laterStarts.some((entry) => downstreamIds.has(entry.operationId))) return "Downstream work has started.";
  if (laterStarts.some((entry) => entry.machineId === machine.id && entry.operationId !== operation.id)) return "Other work has started on this machine.";
  if (laterStarts.some((entry) => entry.operationId === operation.id)) return "Correct the latest action instead.";
  if (job.operations.slice(operationIndex + 1).some((entry) => entry.startedAt || entry.status === "completed")) return "Downstream production has already started.";
  if (event.type === "start") {
    if (operation.status !== "running" || machine.queue[0] !== job.id) return "Only the effective Start of the currently running operation can be undone. Correct its Complete first if eligible.";
  } else {
    if (operation.status !== "completed") return "This Complete is no longer the effective completion of the operation.";
    if (state.events.slice(index + 1).some((entry) => entry.type === "complete" && entry.operationId === operation.id && !entry.undoneBy)) return "This operation has a later completion record.";
    const head = state.jobs.find((entry) => entry.id === machine.queue[0]);
    if (head?.operations.some((entry) => entry.machineId === machine.id && entry.status === "running")) return "The source machine is now running another operation.";
  }
  return null;
}

export function undoOperation(state, command, context) {
  const reason = getUndoReason(state, command.eventId);
  requireValue(reason === null, reason);
  const event = state.events.find((entry) => entry.id === command.eventId);
  const job = state.jobs.find((entry) => entry.id === event.jobId);
  const operation = job.operations.find((entry) => entry.id === event.operationId);
  const machine = state.machines.find((entry) => entry.id === event.machineId);
  if (event.type === "start") {
    operation.status = "ready";
    operation.startedAt = null;
  } else {
    withdraw(state, job.id);
    for (const next of job.operations.slice(job.operations.indexOf(operation) + 1)) {
      next.status = "pending";
      next.startedAt = null;
      next.completedAt = null;
    }
    operation.status = "running";
    operation.completedAt = null;
    job.status = "active";
    job.productionCompletedAt = null;
    machine.queue.unshift(job.id);
  }
  const correction = addEvent(state, "undo", context, {
    job, operation, machine, correctedEventId: event.id, correctedType: event.type,
    detail: `${job.number}: corrected ${event.type === "start" ? "Start" : "Complete"} on ${event.machineName ?? machine.name}. ${event.type === "start" ? "Operation is ready again." : "Operation restored to running; unstarted handoff withdrawn."}`,
  });
  event.undoneBy = correction.id;
}
