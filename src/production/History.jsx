import { useState } from "react";
import { Undo2 } from "lucide-react";
import { getUndoReason } from "../domain/index.js";
import { Dialog, JobLink, SheetFacts, DesignLink, formatDate } from "../ui/index.jsx";

export function EventHistory({ state, events, owner = false, onCommand, onOpenJob }) {
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState("");
  return <>
    {!events.length && <p className="empty-state">No production records yet.</p>}
    <ol className="event-history">{[...events].reverse().map((event) => {
      const job = state.jobs.find((entry) => entry.id === event.jobId);
      const correctable = ["start", "complete"].includes(event.type);
      const reason = correctable ? getUndoReason(state, event.id) : null;
      return <li className={event.undoneBy ? "corrected-event" : ""} key={event.id}>
        <div className="section-heading"><div><strong>{event.type === "undo" ? "Correction" : event.type === "complete" ? "Operation completed" : event.type === "start" ? "Operation started" : event.type === "dispatch" ? "Dispatched" : "Job updated"}{event.undoneBy ? " · corrected" : ""}</strong><p>{formatDate(event.at)} · {event.actor}</p></div>{job && onOpenJob && <JobLink job={job} onOpen={onOpenJob} />}</div>
        <p>{event.detail}</p>
        {event.type === "complete" && job && <details><summary>Production specification used</summary><SheetFacts job={job} /><p>{job.specification.name} · {job.specification.numberOfColors} colors · {job.specification.specialColors || "No special colors"}</p><DesignLink attachment={state.attachments.find((item) => item.id === job.specification.designId)} /></details>}
        {owner && correctable && !event.undoneBy && <div className="undo-row"><button type="button" className="ghost-button small" disabled={Boolean(reason)} onClick={() => { setConfirm(event); setError(""); }}><Undo2 size={15} />Undo {event.type === "start" ? "Start" : "Complete"}</button>{reason && <small>{reason}</small>}</div>}
      </li>;
    })}</ol>
    {confirm && <Dialog title={`Correct mistaken ${confirm.type === "start" ? "Start" : "Complete"}?`} onClose={() => setConfirm(null)}>
      <p>{confirm.detail}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="dialog-actions"><button className="ghost-button" onClick={() => setConfirm(null)}>Cancel</button><button className="primary-button" onClick={() => { const result = onCommand({ type: "operation.undo", eventId: confirm.id }); if (result.ok) setConfirm(null); else setError(result.error); }}>Confirm correction</button></div>
    </Dialog>}
  </>;
}

export function MachineHistoryDialog({ state, machineId, onClose, onCommand, onOpenJob }) {
  const machine = state.machines.find((item) => item.id === machineId);
  return <Dialog title={`${machine.name} · History`} onClose={onClose} wide><EventHistory state={state} events={state.events.filter((event) => event.machineId === machineId)} owner onCommand={onCommand} onOpenJob={onOpenJob} /></Dialog>;
}
