import { useState } from "react";
import { Undo2 } from "lucide-react";
import { getUndoReason } from "../domain/index.js";
import { Dialog, formatDate } from "../ui/index.jsx";

export function CompletionCorrection({ state, event, onCommand, label = "Undo previous completion" }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  if (!event) return null;
  const reason = getUndoReason(state, event.id);
  return <section className="completion-correction" aria-label="Correct previous completion">
    <div><strong>Last completed: {event.processName} · {event.machineName}</strong><p>{event.jobNumber} · {formatDate(event.at)}</p>{reason && <small>{reason}</small>}</div>
    <button className="ghost-button" disabled={Boolean(reason)} onClick={() => { setOpen(true); setError(""); }}><Undo2 size={17} />{label}</button>
    {open && <Dialog title="Undo previous completion?" onClose={() => setOpen(false)}>
      <p>Return <strong>{event.jobNumber}</strong> to <strong>{event.machineName}</strong>?</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="dialog-actions"><button className="ghost-button" onClick={() => setOpen(false)}>Cancel</button><button className="primary-button" onClick={() => { const result = onCommand({ type: "operation.undo", eventId: event.id }); if (result.ok) setOpen(false); else setError(result.error); }}>Confirm correction</button></div>
    </Dialog>}
  </section>;
}
