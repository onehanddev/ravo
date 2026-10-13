import { useState } from "react";
import { CheckCircle2, Download, Printer, Truck } from "lucide-react";
import { JobLink, StatusPill, formatDate, formatNumber, Field } from "../ui/index.jsx";
import { calculateSheets } from "../domain/index.js";
import { downloadReceipt, printReceipt } from "../receipts/index.js";

export function DispatchView({ state, onCommand, onOpenJob }) {
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const ready = state.jobs.filter((job) => job.status === "ready-for-dispatch");
  const history = state.jobs.filter((job) => job.status === "dispatched" && `${job.number} ${job.specification.name} ${job.orderReference} ${job.customer}`.toLowerCase().includes(search.toLowerCase())).reverse();
  async function exportDocument(jobId, print) {
    try { await (print ? printReceipt : downloadReceipt)(state, jobId); setError(""); }
    catch (failure) { setError(failure.message); }
  }
  return <div className="feature-content">
    {error && <p className="form-error" role="alert">{error}</p>}
    <section className="feature-panel"><div className="section-heading"><div><h2><Truck size={23} />Ready for dispatch</h2><p>Manufacturing is complete. Confirm when the goods are dispatched.</p></div><strong>{ready.length} jobs</strong></div>
      {!ready.length && <p className="empty-state">No jobs awaiting dispatch. Completed manufacturing work will appear here.</p>}
      {ready.map((job) => <div className="dispatch-job" key={job.id}><div><JobLink job={job} onOpen={onOpenJob} /><h3>{job.specification.name}</h3><p>{formatNumber(job.quantity)} boxes · {formatNumber(calculateSheets({ ...job, standardSheet: job.specification.standardSheet }).requiredSheets)} required sheets</p><small>Production completed {formatDate(job.productionCompletedAt)}</small></div><StatusPill status="ready-for-dispatch" /><button className="primary-button" onClick={() => onCommand({ type: "job.dispatch", jobId: job.id })}><CheckCircle2 size={18} />Mark dispatched</button></div>)}
    </section>
    <section className="feature-panel"><div className="section-heading"><div><h2>Finished-job history</h2><p>Retained production specifications and PDF receipts for confirmed dispatches.</p></div><Field label="Search finished jobs"><input type="search" placeholder="Job, product, order or customer" value={search} onChange={(event) => setSearch(event.target.value)} /></Field></div>
      {!history.length && <p className="empty-state">{search ? "No finished jobs match this search." : "No dispatched jobs yet."}</p>}
      {history.map((job) => <article className="dispatch-job" key={job.id}><div><JobLink job={job} onOpen={onOpenJob} /><h3>{job.specification.name}</h3><p>{formatNumber(job.quantity)} boxes · {job.sheet.reelSize} × {job.sheet.cuttingSize} job sheet</p><small>Dispatched {formatDate(job.dispatchedAt)}</small></div><StatusPill status="dispatched" /><div className="button-row"><button className="primary-button" onClick={() => exportDocument(job.id, false)} aria-label={`Download ${job.number} PDF`}><Download size={17} />PDF receipt</button><button className="ghost-button" onClick={() => exportDocument(job.id, true)} aria-label={`Print ${job.number} receipt`}><Printer size={17} />Print</button></div></article>)}
    </section>
  </div>;
}
