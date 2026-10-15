import { useState } from "react";
import { suggestBoxesPerSheet, formatAreaRatio } from "../domain/index.js";
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
  const [yieldTouched, setYieldTouched] = useState(Boolean(job));
  const locked = job && state.events.some((event) => event.jobId === job.id && event.type === "start");
  const patch = (values) => setForm((current) => ({ ...current, ...values }));
  const suggestion = product ? suggestBoxesPerSheet({ boxesPerStandardSheet: product.boxesPerStandardSheet, sheet: { reelSize: Number(form.sheet.reelSize), cuttingSize: Number(form.sheet.cuttingSize) }, standardSheet: product.standardSheet }) : null;
  const ratio = product ? formatAreaRatio({ sheet: { reelSize: Number(form.sheet.reelSize), cuttingSize: Number(form.sheet.cuttingSize) }, standardSheet: product.standardSheet }) : null;
  const enteredYield = Number(form.boxesPerSheet);
  const showSuggestion = product && !locked && suggestion !== null && Number.isSafeInteger(enteredYield) && enteredYield !== suggestion;
  function changeProduct(id) {
    setProductId(id);
    const selected = state.products.find((item) => item.id === id);
    setYieldTouched(false);
    patch({ sheet: { ...selected.standardSheet }, boxesPerSheet: selected.boxesPerStandardSheet, assignments: selected.route.map((step) => step.machineId ?? "") });
  }
  function changeSheet(values) {
    const next = { ...form.sheet, ...values };
    const patchValues = { sheet: next };
    if (!yieldTouched && product) {
      const nextSuggestion = suggestBoxesPerSheet({ boxesPerStandardSheet: product.boxesPerStandardSheet, sheet: { reelSize: Number(next.reelSize), cuttingSize: Number(next.cuttingSize) }, standardSheet: product.standardSheet });
      if (nextSuggestion !== null) patchValues.boxesPerSheet = nextSuggestion;
    }
    patch(patchValues);
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
        <Field label="Actual boxes per sheet" hint="Entered yield controls the calculation — estimates are suggestions only."><input type="number" min="1" step="1" required disabled={locked} value={form.boxesPerSheet} onChange={(event) => { setYieldTouched(true); patch({ boxesPerSheet: event.target.value }); }} /></Field>
        <Field label="Job reel size"><input type="number" min="0.001" step="any" required disabled={locked} value={form.sheet.reelSize} onChange={(event) => changeSheet({ reelSize: event.target.value })} /></Field>
        <Field label="Job cutting size"><input type="number" min="0.001" step="any" required disabled={locked} value={form.sheet.cuttingSize} onChange={(event) => changeSheet({ cuttingSize: event.target.value })} /></Field>
      </div>
      {showSuggestion && <div className="suggestion-nudge" role="status"><span>Suggested {suggestion} boxes per sheet from {ratio} sheet area vs standard.</span><button type="button" className="ghost-button small" onClick={() => { patch({ boxesPerSheet: suggestion }); setYieldTouched(false); }}>Apply suggestion</button></div>}
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
