import { currentOperation, findById } from "./validation.js";

export function getMachineView(state, machineId) {
  const machine = findById(state.machines, machineId, "Machine");
  const currentJob = state.jobs.find((job) => job.id === machine.queue[0]) ?? null;
  const operation = currentJob ? currentOperation(currentJob) : null;
  const status = machine.retired ? "retired" : machine.availability === "maintenance" ? "maintenance" : operation?.status === "running" ? "running" : currentJob ? "ready" : "idle";
  return {
    machine, status, currentJob, currentOperation: operation,
    waitingJobs: machine.queue.slice(1).map((id) => findById(state.jobs, id, "Waiting job")),
  };
}

export function getJobStatus(job) {
  if (job.status !== "active") return job.status;
  const operation = currentOperation(job);
  return operation?.status === "running" ? "running" : operation?.status === "ready" ? "ready" : "waiting";
}

// Pending route assignments are a planning projection, never executable queue
// entries. Reassignment, completion and correction update this view naturally.
export function getIncomingWork(state, machineId) {
  findById(state.machines, machineId, "Machine");
  return state.jobs.filter((job) => job.status === "active").flatMap((job) => {
    const current = currentOperation(job);
    const currentIndex = job.operations.indexOf(current);
    return job.operations.flatMap((operation, index) => operation.machineId === machineId && operation.status === "pending" && index > currentIndex
      ? [{ job, operation, currentOperation: current, operationsBeforeArrival: index - currentIndex }]
      : []);
  });
}
