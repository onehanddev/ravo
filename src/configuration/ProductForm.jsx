import { useState } from "react";
import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Dialog, DesignLink, Field } from "../ui/index.jsx";
import { readDesignFile } from "../persistence/index.js";

export function ProductForm({ state, product, onCommand, onClose }) {
  const [form, setForm] = useState(() => product ? structuredClone(product) : {
    name: "", standardSheet: { reelSize: 19, cuttingSize: 36 }, boxesPerStandardSheet: 4,
    numberOfColors: 0, specialColors: "", designId: null,
    route: state.processes.map((process) => ({ processId: process.id, machineId: null })),
  });
  const [attachment, setAttachment] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [processToAdd, setProcessToAdd] = useState("");
  const patch = (values) => setForm((current) => ({ ...current, ...values }));
  const setStep = (index, values) => patch({ route: form.route.map((step, at) => at === index ? { ...step, ...values } : step) });
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const reorderRoute = (from, to) => patch({ route: arrayMove(form.route, from, to) });
  async function upload(file) {
    setBusy(true);
    setError("");
    try { const design = await readDesignFile(file); setAttachment(design); patch({ designId: design.id }); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  function submit(event) {
    event.preventDefault();
    const result = onCommand({ type: "product.save", product: {
      ...form, standardSheet: { reelSize: Number(form.standardSheet.reelSize), cuttingSize: Number(form.standardSheet.cuttingSize) },
      boxesPerStandardSheet: Number(form.boxesPerStandardSheet), numberOfColors: Number(form.numberOfColors),
    }, ...(attachment && { attachment }) });
    if (result.ok) onClose(); else setError(result.error);
  }
  return <Dialog title={product ? "Edit product" : "New product"} onClose={onClose} wide>
    <form onSubmit={submit}>
      <Field label="Product name"><input required value={form.name} onChange={(event) => patch({ name: event.target.value })} autoFocus /></Field>
      <div className="form-grid">
        <Field label="Standard reel size"><input type="number" min="0.001" step="any" required value={form.standardSheet.reelSize} onChange={(event) => patch({ standardSheet: { ...form.standardSheet, reelSize: event.target.value } })} /></Field>
        <Field label="Standard cutting size"><input type="number" min="0.001" step="any" required value={form.standardSheet.cuttingSize} onChange={(event) => patch({ standardSheet: { ...form.standardSheet, cuttingSize: event.target.value } })} /></Field>
        <Field label="Boxes per standard sheet"><input type="number" min="1" step="1" required value={form.boxesPerStandardSheet} onChange={(event) => patch({ boxesPerStandardSheet: event.target.value })} /></Field>
        <Field label="Number of colors"><input type="number" min="0" step="1" required value={form.numberOfColors} onChange={(event) => patch({ numberOfColors: event.target.value })} /></Field>
      </div>
      <Field label="Special colors" hint="Record names independently of the color count."><input value={form.specialColors} placeholder="e.g. Red, Yellow" onChange={(event) => patch({ specialColors: event.target.value })} /></Field>
      <Field label="Design PDF" hint="Optional · maximum 750 KiB. Stored in this browser with the product."><input type="file" accept="application/pdf,.pdf" onChange={(event) => { if (event.target.files[0]) upload(event.target.files[0]); }} /></Field>
      <div className="button-row"><DesignLink attachment={attachment ?? state.attachments.find((item) => item.id === form.designId)} />{form.designId && <button type="button" className="ghost-button small" onClick={() => { setAttachment(null); patch({ designId: null }); }}>Remove design</button>}</div>
      <section className="route-editor" aria-label="Product route">
        <h3>Manufacturing route</h3>
        <p className="form-help">All factory processes are included in order. Drag to sequence, remove what this product skips.</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active, over }) => { if (over && active.id !== over.id) reorderRoute(form.route.findIndex((step) => step.processId === active.id), form.route.findIndex((step) => step.processId === over.id)); }}>
          <SortableContext items={form.route.map((step) => step.processId)} strategy={verticalListSortingStrategy}>
            {form.route.map((step, index) => <RouteStep key={step.processId} step={step} index={index} state={state} onMachineChange={(machineId) => setStep(index, { machineId })} onRemove={() => patch({ route: form.route.filter((_, at) => at !== index) })} />)}
          </SortableContext>
        </DndContext>
        <div className="route-add">
          <Field label="Add manufacturing process"><select value={processToAdd} onChange={(event) => setProcessToAdd(event.target.value)}><option value="">Choose a process</option>{state.processes.filter((process) => !form.route.some((step) => step.processId === process.id)).map((process) => <option key={process.id} value={process.id}>{process.name}</option>)}</select></Field>
          <button type="button" className="ghost-button" disabled={!processToAdd} onClick={() => { patch({ route: [...form.route, { processId: processToAdd, machineId: null }] }); setProcessToAdd(""); }}><Plus size={16} />Add process</button>
        </div>
      </section>
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="dialog-actions"><button type="button" className="ghost-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{busy ? "Reading PDF…" : "Save product"}</button></div>
    </form>
  </Dialog>;
}

function RouteStep({ step, index, state, onMachineChange, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.processId });
  const name = state.processes.find((process) => process.id === step.processId)?.name ?? "Unknown process";
  return <div ref={setNodeRef} className={`route-step ${isDragging ? "dragging" : ""}`} style={{ transform: CSS.Transform.toString(transform), transition }}>
    <button type="button" className="drag-handle" {...attributes} {...listeners} aria-label={`Reorder ${name} · position ${index + 1} of route`}><GripVertical size={16} /></button>
    <strong>{index + 1}. {name}</strong>
    <Field label={`Default machine for ${name}`}>
      <select value={step.machineId || ""} onChange={(event) => onMachineChange(event.target.value || null)}>
        <option value="">Assign when creating a job</option>
        {state.machines.filter((machine) => machine.processId === step.processId && !machine.retired && machine.availability === "available").map((machine) => <option key={machine.id} value={machine.id}>{machine.name}</option>)}
      </select>
    </Field>
    <button type="button" className="icon-button" aria-label={`Remove ${name}`} onClick={onRemove}><Trash2 size={17} /></button>
  </div>;
}
