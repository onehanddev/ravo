import { Pencil } from "lucide-react";
import { getJobStatus } from "../domain/index.js";
import { Dialog, StatusPill, SheetFacts, DesignLink, formatDate } from "../ui/index.jsx";
import { EventHistory } from "../production/History.jsx";
import { CompletionCorrection } from "../production/CompletionCorrection.jsx";

export function JobDetails({ state, jobId, owner, onClose, onEdit, onCommand }) {
  const job = state.jobs.find((item) => item.id === jobId);
  return <Dialog title={`${job.number} · ${job.specification.name}`} onClose={onClose} wide>
    <div className="section-heading"><StatusPill status={getJobStatus(job)} />{owner && job.status !== "dispatched" && <button className="ghost-button" onClick={() => onEdit(job)}><Pencil size={16} />Edit job</button>}</div>
    {owner && <CompletionCorrection state={state} event={state.events.findLast((event) => event.jobId === job.id && event.type === "complete" && !event.undoneBy)} onCommand={onCommand} />}
    <SheetFacts job={job} />
    <dl className="job-facts"><div><dt>Sales order reference</dt><dd>{job.orderReference || "—"}</dd></div><div><dt>Customer</dt><dd>{job.customer || "—"}</dd></div><div><dt>Created</dt><dd>{formatDate(job.createdAt)}</dd></div><div><dt>Colors</dt><dd>{job.specification.numberOfColors}{job.specification.specialColors ? ` · ${job.specification.specialColors}` : ""}</dd></div><div><dt>Manufacturing completed</dt><dd>{formatDate(job.productionCompletedAt)}</dd></div><div><dt>Dispatched</dt><dd>{formatDate(job.dispatchedAt)}</dd></div></dl>
    {job.notes && <p className="job-notes">{job.notes}</p>}
    <DesignLink attachment={state.attachments.find((item) => item.id === job.specification.designId)} />
    <section className="job-route-detail"><h3>Retained job route</h3><ol>{job.operations.map((operation, index) => {
      const route = job.specification.route[index];
      const completed = state.events.findLast((event) => event.operationId === operation.id && event.type === "complete" && !event.undoneBy);
      return <li key={operation.id} className={["ready", "running"].includes(operation.status) ? "current-step" : ""}><span className="step-number">{index + 1}</span><div><strong>{route.processName}</strong><small>{completed?.machineName ?? state.machines.find((machine) => machine.id === operation.machineId)?.name}</small></div><StatusPill status={operation.status} /></li>;
    })}<li><span className="step-number">{job.operations.length + 1}</span><strong>Dispatch · no machine</strong><StatusPill status={job.status === "active" ? "pending" : job.status} /></li></ol></section>
    <details className="history-section"><summary>Job activity & corrections</summary><EventHistory state={state} events={state.events.filter((event) => event.jobId === job.id)} owner={owner} onCommand={onCommand} /></details>
  </Dialog>;
}
