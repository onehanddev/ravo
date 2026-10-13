import { useState } from "react";
import { Dialog, DesignLink, Field, SheetFacts, formatDate } from "../ui/index.jsx";

export function JobForm({ state, job, onCommand, onClose }) {
  const [productId, setProductId] = useState(job?.productId ?? state.products[0]?.id ?? "");
  const product = job?.specification ?? state.products.find((item) => item.id === productId);
  const [form, setForm] = useState(() => ({
    quantity: job?.quantity ?? 10000,
    sheet: { ...(job?.sheet ?? product?.standardSheet ?? { reelSize: "", cuttingSize: "" }) },
    boxesPerSheet: job?.boxesPerSheet ?? product?.boxesPerStandardSheet ?? "",
    orderReference: job?.orderReference ?? "", customer: job?.customer ?? "", notes: job?.notes ?? "",
    assignments: job ? job.operations.map((operation) => operation.machineId) : product?.route.map((step) => step.machineId ?? "") ?? [],
  }));
  const [error, setError] = useState("");
  const locked = job && state.events.some((event) => event.jobId === job.id && event.type === "start");
  const patch = (values) => setForm((current) => ({ ...current, ...values }));
  function changeProduct(id) {
    setProductId(id);
    const selected = state.products.find((item) => item.id === id);
    patch({ sheet: { ...selected.standardSheet }, boxesPerSheet: selected.boxesPerStandardSheet, assignments: selected.route.map((step) => step.machineId ?? "") });
  }
  function submit(event) {
    event.preventDefault();
    const values = { ...form, quantity: Number(form.quantity), sheet: { reelSize: Number(form.sheet.reelSize), cuttingSize: Number(form.sheet.cuttingSize) }, boxesPerSheet: Number(form.boxesPerSheet) };
    const result = onCommand(job ? { type: "job.edit", jobId: job.id, changes: values } : { type: "job.create", productId, ...values });
    if (result.ok) onClose(result.state.jobs.at(-1)); else setError(result.error);
  }
  return <Dialog title={job ? `Edit ${job.number}` : "New job"} onClose={() => onClose()} wide>
    {!product ? <p>Create a product in Configuration before releasing a job.</p> : <form onSubmit={submit}>
      <Field label="Product"><select value={productId} disabled={Boolean(job)} onChange={(event) => changeProduct(event.target.value)}>
        {job ? <option value={job.productId}>{job.specification.name} · retained specification</option> : state.products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></Field>
      <div className="form-grid">
        <Field label="Sales order reference"><input value={form.orderReference} onChange={(event) => patch({ orderReference: event.target.value })} /></Field>
        <Field label="Customer"><input value={form.customer} onChange={(event) => patch({ customer: event.target.value })} /></Field>
      </div>
      {locked && <p className="info-note">Production started. Only notes and unstarted assignments can change.</p>}
      <div className="form-grid">
        <Field label="Ordered boxes"><input type="number" min="1" step="1" required disabled={locked} value={form.quantity} onChange={(event) => patch({ quantity: event.target.value })} /></Field>
        <Field label="Actual boxes per sheet" hint="Entered yield controls the calculation, not the area ratio."><input type="number" min="1" step="1" required disabled={locked} value={form.boxesPerSheet} onChange={(event) => patch({ boxesPerSheet: event.target.value })} /></Field>
        <Field label="Job reel size"><input type="number" min="0.001" step="any" required disabled={locked} value={form.sheet.reelSize} onChange={(event) => patch({ sheet: { ...form.sheet, reelSize: event.target.value } })} /></Field>
        <Field label="Job cutting size"><input type="number" min="0.001" step="any" required disabled={locked} value={form.sheet.cuttingSize} onChange={(event) => patch({ sheet: { ...form.sheet, cuttingSize: event.target.value } })} /></Field>
      </div>
      <section className="calculation-panel" aria-label="Sheet requirement"><h3>Sheet requirement</h3><SheetFacts job={{ specification: product, quantity: Number(form.quantity), sheet: { reelSize: Number(form.sheet.reelSize), cuttingSize: Number(form.sheet.cuttingSize) }, boxesPerSheet: Number(form.boxesPerSheet) }} /></section>
      <DesignLink attachment={state.attachments.find((item) => item.id === product.designId)} />
      <section className="route-editor" aria-label="Job machine plan"><h3>Machine plan</h3>
        {product.route.map((step, index) => {
          const operation = job?.operations[index];
          const fixed = Boolean(operation?.startedAt || operation?.status === "completed");
          const processName = step.processName ?? state.processes.find((process) => process.id === step.processId)?.name;
          const candidates = state.machines.filter((machine) => machine.processId === step.processId && ((!machine.retired && machine.availability === "available") || machine.id === form.assignments[index]));
          const history = state.events.filter((event) => event.type === "complete" && !event.undoneBy && event.processId === step.processId && state.jobs.find((entry) => entry.id === event.jobId)?.productId === productId);
          return <div className="assignment-step" key={step.processId}>
            <Field label={`${index + 1}. ${processName} machine`}><select required value={form.assignments[index] ?? ""} disabled={fixed} onChange={(event) => patch({ assignments: form.assignments.map((id, at) => at === index ? event.target.value : id) })}><option value="">Choose a machine</option>{candidates.map((machine) => <option key={machine.id} value={machine.id}>{machine.name}{machine.retired ? " (retired)" : ""}</option>)}</select></Field>
            {fixed && <p className="form-help">{operation.status === "completed" ? "Completed" : "Running"}</p>}
            {history.length > 0 && <details className="assignment-history"><summary>Previously processed on {new Set(history.map((event) => event.machineId)).size} machine(s)</summary>{history.slice(-5).reverse().map((event) => <p key={event.id}><strong>{event.machineName}</strong> · {event.jobNumber} · {formatDate(event.at)}</p>)}</details>}
          </div>;
        })}
      </section>
      <Field label="Job notes"><textarea rows="3" value={form.notes} onChange={(event) => patch({ notes: event.target.value })} /></Field>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="dialog-actions"><button type="button" className="ghost-button" onClick={() => onClose()}>Cancel</button><button type="submit" className="primary-button">{job ? "Save job" : "Create & release job"}</button></div>
    </form>}
  </Dialog>;
}
