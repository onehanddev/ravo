import { getIncomingWork, getJobStatus } from "../domain/index.js";
import { JobLink, StatusPill, formatNumber } from "../ui/index.jsx";

export function IncomingWork({ state, machine, onOpenJob }) {
  const incoming = getIncomingWork(state, machine.id);
  return <details className="incoming-work">
    <summary>Incoming work · {incoming.length}</summary>
    {!incoming.length && <p className="empty-queue">None planned.</p>}
    <div className="incoming-list">{incoming.map(({ job, operation, currentOperation, operationsBeforeArrival, upstreamPosition }) => <article className="incoming-job" key={operation.id}>
      <div><JobLink job={job} onOpen={onOpenJob} /><strong>{job.specification.name}</strong><small>{formatNumber(job.quantity)} boxes · upstream #{upstreamPosition} · {operationsBeforeArrival} {operationsBeforeArrival === 1 ? "operation" : "operations"} before arrival</small></div>
      <div><span className="operation-label">Currently at</span><strong>{state.processes.find((process) => process.id === currentOperation.processId)?.name}</strong><small>{state.machines.find((unit) => unit.id === currentOperation.machineId)?.name}</small></div>
      <StatusPill status={getJobStatus(job)} />
    </article>)}</div>
  </details>;
}
