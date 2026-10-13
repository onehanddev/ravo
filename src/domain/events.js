export function newId() {
  return globalThis.crypto.randomUUID();
}

export function addEvent(state, type, context, details = {}) {
  const { job, operation, machine, ...extra } = details;
  const process = operation && state.processes.find((entry) => entry.id === operation.processId);
  const event = {
    id: newId(), type, at: context.now, actor: context.actor, undoneBy: null,
    ...(job && { jobId: job.id, jobNumber: job.number, productName: job.specification.name }),
    ...(operation && { operationId: operation.id, processId: operation.processId, processName: process?.name }),
    ...(machine && { machineId: machine.id, machineName: machine.name }),
    ...extra,
  };
  state.events.push(event);
  return event;
}
