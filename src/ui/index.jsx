import { cloneElement, useEffect, useId, useRef } from "react";
import { CheckCircle2, ChevronRight, CircleDot, Clock3, FileText, Wrench, X } from "lucide-react";
import { calculateSheets } from "../domain/index.js";

export const formatNumber = (value) => new Intl.NumberFormat("en", { maximumFractionDigits: 3 }).format(value);
export const formatDate = (value) => value ? new Date(value).toLocaleString() : "—";

export function Dialog({ title, onClose, children, wide = false }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} className={`job-dialog native-dialog ${wide ? "wide-dialog" : ""}`} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <header><h2 id={titleId}>{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20} /></button></header>
    {children}
  </dialog>;
}

export function StatusPill({ status }) {
  const labels = { ready: "Ready", idle: "Available", running: "Running", waiting: "Waiting", pending: "Planned", completed: "Completed", maintenance: "Maintenance", retired: "Retired", "ready-for-dispatch": "Ready for dispatch", dispatched: "Dispatched" };
  if (status === "running") return <span className="status running"><span className="running-marker" aria-hidden="true" />Running</span>;
  const Icon = ["completed", "dispatched", "idle"].includes(status) ? CheckCircle2 : ["retired", "maintenance"].includes(status) ? Wrench : status === "waiting" ? Clock3 : CircleDot;
  return <span className={`status ${status}`}><Icon size={16} aria-hidden="true" />{labels[status] ?? status}</span>;
}

export function JobLink({ job, onOpen }) {
  return <button type="button" className="job-link" onClick={() => onOpen(job.id)} aria-label={`View ${job.number}`}>{job.number}<ChevronRight size={16} aria-hidden="true" /></button>;
}

export function DesignLink({ attachment }) {
  if (!attachment) return <span className="muted">No design PDF attached</span>;
  return <a className="design-link" href={attachment.dataUrl} download={attachment.name}><FileText size={16} aria-hidden="true" />{attachment.name}</a>;
}

export function SheetFacts({ job }) {
  let calculation;
  try { calculation = calculateSheets({ ...job, standardSheet: job.specification.standardSheet }); }
  catch { return <p className="form-help">Enter positive dimensions, ordered boxes and actual boxes per sheet to calculate the requirement.</p>; }
  return <dl className="job-facts sheet-facts">
    <div><dt>Ordered boxes</dt><dd>{formatNumber(job.quantity)}</dd></div>
    <div><dt>Calculated required sheets</dt><dd>{formatNumber(calculation.requiredSheets)}</dd></div>
    <div><dt>Standard sheet · reel × cutting</dt><dd>{job.specification.standardSheet.reelSize} × {job.specification.standardSheet.cuttingSize}</dd></div>
    <div><dt>Job sheet · reel × cutting</dt><dd>{job.sheet.reelSize} × {job.sheet.cuttingSize}</dd></div>
    <div><dt>Boxes per standard sheet</dt><dd>{job.specification.boxesPerStandardSheet}</dd></div>
    <div><dt>Actual boxes per sheet</dt><dd>{job.boxesPerSheet}</dd></div>
    <div><dt>Area multiplier · information only</dt><dd>{formatNumber(calculation.multiplier)}×</dd></div>
    <div><dt>Box capacity</dt><dd>{formatNumber(calculation.boxCapacity)}</dd></div>
  </dl>;
}

export function Field({ label, children, hint }) {
  const generatedId = useId();
  const id = children.props.id ?? generatedId;
  return <div className="form-field"><label htmlFor={id}>{label}</label>{cloneElement(children, { id, "aria-describedby": hint ? `${id}-hint` : undefined })}{hint && <small id={`${id}-hint`} className="form-help">{hint}</small>}</div>;
}
