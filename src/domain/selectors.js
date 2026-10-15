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

// Department (process) view groups active work by the job's current operation,
// not by machine. Queued/running derive from the current operation; completed
// lists every job with a completed operation in this department, including jobs
// already downstream or dispatched. Incoming projects future pending operations.
export function getDepartmentView(state, processId) {
  findById(state.processes, processId, "Process");
  const machines = state.machines.filter((machine) => machine.processId === processId && !machine.retired);
  const machineById = new Map(state.machines.map((machine) => [machine.id, machine]));
  const queued = [];
  const running = [];
  for (const job of state.jobs) {
    if (job.status !== "active") continue;
    const operation = currentOperation(job);
    if (!operation || operation.processId !== processId) continue;
    const machine = machineById.get(operation.machineId);
    if (!machine) continue;
    if (operation.status === "running") running.push({ job, operation, machine });
    else if (operation.status === "ready" || operation.status === "waiting") queued.push({ job, operation, machine });
  }
  const orderByQueue = (a, b) => {
    const machineIndex = machines.findIndex((machine) => machine.id === a.machine.id) - machines.findIndex((machine) => machine.id === b.machine.id);
    if (machineIndex !== 0) return machineIndex;
    return machineById.get(a.machine.id).queue.indexOf(a.job.id) - machineById.get(b.machine.id).queue.indexOf(b.job.id);
  };
  queued.sort(orderByQueue);
  running.sort(orderByQueue);
  const completed = [];
  for (const job of state.jobs) {
    for (const operation of job.operations) {
      if (operation.processId === processId && operation.status === "completed") {
        completed.push({ job, operation, machine: machineById.get(operation.machineId) ?? null });
      }
    }
  }
  completed.sort((a, b) => Date.parse(b.operation.completedAt) - Date.parse(a.operation.completedAt));
  const incoming = state.jobs.filter((job) => job.status === "active").flatMap((job) => {
    const current = currentOperation(job);
    const currentIndex = job.operations.indexOf(current);
    return job.operations.flatMap((operation, index) => operation.processId === processId && operation.status === "pending" && index > currentIndex
      ? [{ job, operation, currentOperation: current, operationsBeforeArrival: index - currentIndex, upstreamPosition: upstreamPosition(machineById, job), machine: machineById.get(operation.machineId) ?? null }]
      : []);
  });
  incoming.sort(compareIncoming);
  return { machines, queued, running, completed, incoming };
}

export function getJobStatus(job) {
  if (job.status !== "active") return job.status;
  const operation = currentOperation(job);
  return operation?.status === "running" ? "running" : operation?.status === "ready" ? "ready" : "waiting";
}

// Incoming lists mirror the order work will actually arrive: closest arrival
// first, running work before queued work, then the upstream machine queue
// priority, so a reprioritized upstream queue is reflected downstream.
function upstreamPosition(machineById, job) {
  const current = currentOperation(job);
  const index = (machineById.get(current?.machineId)?.queue ?? []).indexOf(job.id);
  return index < 0 ? Number.MAX_SAFE_INTEGER : index + 1;
}

function compareIncoming(a, b) {
  return a.operationsBeforeArrival - b.operationsBeforeArrival
    || (a.currentOperation?.status === "running" ? 0 : 1) - (b.currentOperation?.status === "running" ? 0 : 1)
    || a.upstreamPosition - b.upstreamPosition
    || String(a.job.number).localeCompare(String(b.job.number));
}

// Pending route assignments are a planning projection, never executable queue
// entries. Reassignment, completion and correction update this view naturally.
export function getIncomingWork(state, machineId) {
  findById(state.machines, machineId, "Machine");
  const machineById = new Map(state.machines.map((machine) => [machine.id, machine]));
  const incoming = state.jobs.filter((job) => job.status === "active").flatMap((job) => {
    const current = currentOperation(job);
    const currentIndex = job.operations.indexOf(current);
    return job.operations.flatMap((operation, index) => operation.machineId === machineId && operation.status === "pending" && index > currentIndex
      ? [{ job, operation, currentOperation: current, operationsBeforeArrival: index - currentIndex, upstreamPosition: upstreamPosition(machineById, job) }]
      : []);
  });
  incoming.sort(compareIncoming);
  return incoming;
}
