import { useState } from "react";
import { Boxes, Pencil, Plus, Settings2 } from "lucide-react";
import { Dialog, DesignLink, Field, StatusPill } from "../ui/index.jsx";
import { ProductForm } from "./ProductForm.jsx";

export function ConfigurationView({ state, onCommand, onMachineHistory }) {
  const [product, setProduct] = useState(null);
  const [machine, setMachine] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [error, setError] = useState("");
  return <div className="feature-content">
    <section className="feature-panel">
      <div className="section-heading"><h2><Boxes size={21} />Reusable products</h2><button className="primary-button" onClick={() => setProduct({})}><Plus size={18} />New product</button></div>
      <div className="config-grid">{state.products.map((item) => <article className="product-card" key={item.id}>
        <div className="section-heading"><h3>{item.name}</h3><button className="icon-button" aria-label={`Edit ${item.name}`} onClick={() => setProduct(item)}><Pencil size={17} /></button></div>
        <p>{item.standardSheet.reelSize} × {item.standardSheet.cuttingSize} · {item.boxesPerStandardSheet} boxes / standard sheet</p>
        <p>{item.numberOfColors} colors{item.specialColors ? ` · ${item.specialColors}` : ""}</p>
        <ol className="compact-route">{item.route.map((step) => <li key={step.processId}><strong>{state.processes.find((process) => process.id === step.processId)?.name}</strong><span>{state.machines.find((unit) => unit.id === step.machineId)?.name ?? "Assign per job"}</span></li>)}</ol>
        <DesignLink attachment={state.attachments.find((design) => design.id === item.designId)} />
      </article>)}</div>
    </section>
    <section className="feature-panel">
      <div className="section-heading"><h2><Settings2 size={21} />Machines by process</h2><button className="primary-button" onClick={() => setMachine({})}><Plus size={18} />New machine</button></div>
      {state.processes.map((process) => <section className="machine-setup-group" key={process.id}><h3>{process.name}</h3>
        {state.machines.filter((item) => item.processId === process.id).map((item) => <div className="compact-row" key={item.id}>
          <div><strong>{item.name}</strong><p><StatusPill status={item.retired ? "retired" : item.availability === "maintenance" ? "maintenance" : "idle"} /></p></div>
          <div className="button-row"><button className="ghost-button small" onClick={() => onMachineHistory(item.id)}>History</button>{!item.retired && <><button className="ghost-button small" onClick={() => setMachine(item)} aria-label={`Edit ${item.name}`}>Edit</button><button className="ghost-button small danger-text" onClick={() => { setRemoving(item); setError(""); }} aria-label={`Remove ${item.name}`}>Remove</button></>}</div>
        </div>)}
        {!state.machines.some((item) => item.processId === process.id) && <p className="empty-state">No machines. Add one to plan jobs for this process.</p>}
      </section>)}
    </section>
    {product && <ProductForm key={product.id ?? "new"} state={state} product={product.id ? product : null} onCommand={onCommand} onClose={() => setProduct(null)} />}
    {machine && <MachineForm key={machine.id ?? "new"} state={state} machine={machine.id ? machine : null} onCommand={onCommand} onClose={() => setMachine(null)} />}
    {removing && <Dialog title={`Remove ${removing.name}?`} onClose={() => setRemoving(null)}><p>Retired machines stay in history.</p>{error && <p className="form-error" role="alert">{error}</p>}<div className="dialog-actions"><button className="ghost-button" onClick={() => setRemoving(null)}>Cancel</button><button className="primary-button" onClick={() => { const result = onCommand({ type: "machine.remove", machineId: removing.id }); if (result.ok) setRemoving(null); else setError(result.error); }}>Confirm removal</button></div></Dialog>}
  </div>;
}

function MachineForm({ state, machine, onCommand, onClose }) {
  const [form, setForm] = useState(machine ?? { name: "", processId: state.processes[0].id, availability: "available" });
  const [error, setError] = useState("");
  const patch = (values) => setForm((current) => ({ ...current, ...values }));
  return <Dialog title={machine ? "Edit machine" : "New machine"} onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); const result = onCommand({ type: "machine.save", machine: form }); if (result.ok) onClose(); else setError(result.error); }}>
    <Field label="Machine name"><input value={form.name} required autoFocus onChange={(event) => patch({ name: event.target.value })} /></Field>
    <Field label="Process / department"><select value={form.processId} onChange={(event) => patch({ processId: event.target.value })}>{state.processes.map((process) => <option key={process.id} value={process.id}>{process.name}</option>)}</select></Field>
    <Field label="Availability"><select value={form.availability} onChange={(event) => patch({ availability: event.target.value })}><option value="available">Available for assignment</option><option value="maintenance">Unavailable / maintenance</option></select></Field>
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="dialog-actions"><button type="button" className="ghost-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit">Save machine</button></div>
  </form></Dialog>;
}
