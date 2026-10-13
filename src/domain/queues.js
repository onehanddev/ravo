import { currentOperation, findById, requireValue } from "./validation.js";

export function synchronizeQueues(state) {
  for (const machine of state.machines) {
    machine.queue.forEach((id, index) => {
      const operation = currentOperation(findById(state.jobs, id, "Queued job"));
      requireValue(operation && operation.machineId === machine.id, "Queue does not match the job plan.");
      if (operation.status !== "running") operation.status = index === 0 ? "ready" : "waiting";
    });
  }
}

export function withdraw(state, jobId) {
  for (const machine of state.machines) machine.queue = machine.queue.filter((id) => id !== jobId);
}

export function reorderQueue(state, command) {
  const machine = findById(state.machines, command.machineId, "Machine");
  const ids = command.jobIds;
  requireValue(Array.isArray(ids) && ids.length === machine.queue.length && new Set(ids).size === ids.length && ids.every((id) => machine.queue.includes(id)), "Queue order must contain every queued job exactly once.");
  const head = machine.queue[0] && findById(state.jobs, machine.queue[0], "Current job");
  requireValue(!head || currentOperation(head).status !== "running" || ids[0] === head.id, "A running job must remain at the front of its machine queue.");
  machine.queue = [...ids];
}
