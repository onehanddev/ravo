import { useState } from "react";
import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, CheckCircle2, Factory, GripVertical } from "lucide-react";
import { getDepartmentView, getJobStatus } from "../domain/index.js";
import { JobLink, StatusPill, formatDate, formatNumber } from "../ui/index.jsx";

const departmentTabs = [
  { id: "queued", title: "Queued" },
  { id: "running", title: "In progress" },
  { id: "done", title: "Done" },
];

export function DepartmentsView({ state, onCommand, onOpenJob }) {
  return <section className="machine-groups" aria-label="Departments and jobs">
    {state.processes.map((process) => <DepartmentSection key={process.id} state={state} process={process} onCommand={onCommand} onOpenJob={onOpenJob} />)}
  </section>;
}

function DepartmentSection({ state, process, onCommand, onOpenJob }) {
  const [tab, setTab] = useState("queued");
  const view = getDepartmentView(state, process.id);
  return <section className="dispatch-group" data-testid={`dept-${process.name}`} aria-label={`${process.name} jobs`}>
    <header className="dispatch-group-header">
      <div className="type-heading"><Factory size={24} /><h2>{process.name}</h2></div>
      <div className="type-counts"><strong>{view.machines.length} {view.machines.length === 1 ? "machine" : "machines"}</strong><span>{view.running.length} running</span></div>
    </header>
    <div className="view-tabs dept-tabs" role="group" aria-label={`${process.name} job status`}>
      {departmentTabs.map(({ id, title }) => {
        const count = id === "queued" ? view.queued.length : id === "running" ? view.running.length : view.completed.length;
        return <button key={id} type="button" aria-pressed={tab === id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{title} · {count}</button>;
      })}
    </div>
    <div className="dept-body">
    {tab === "queued" && <DepartmentQueue state={state} view={view} onCommand={onCommand} onOpenJob={onOpenJob} />}
    {tab === "running" && <RunningList view={view} onOpenJob={onOpenJob} />}
    {tab === "done" && <DoneList view={view} onOpenJob={onOpenJob} />}
    </div>
  </section>;
}

function reorderableIds(state, machineId) {
  const machine = state.machines.find((unit) => unit.id === machineId);
  if (!machine) return [];
  const jobs = machine.queue.map((id) => state.jobs.find((job) => job.id === id)).filter(Boolean);
  const running = jobs[0] && getJobStatus(jobs[0]) === "running";
  return (running ? jobs.slice(1) : jobs).map((job) => job.id);
}

function DepartmentQueue({ state, view, onCommand, onOpenJob }) {
  const entries = view.queued;
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const positionByJob = new Map();
  for (const machine of view.machines) reorderableIds(state, machine.id).forEach((id, index) => positionByJob.set(id, index + 1));

  function dispatchReorder(machineId, ids) {
    const machine = state.machines.find((unit) => unit.id === machineId);
    const head = machine.queue[0] && state.jobs.find((job) => job.id === machine.queue[0]);
    const running = head && getJobStatus(head) === "running";
    onCommand({ type: "queue.reorder", machineId, jobIds: running ? [head.id, ...ids] : ids });
  }

  function move(entry, direction) {
    const ids = reorderableIds(state, entry.machine.id);
    const index = ids.indexOf(entry.job.id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= ids.length) return;
    dispatchReorder(entry.machine.id, arrayMove(ids, index, next));
  }

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    const from = entries.find((entry) => entry.job.id === active.id);
    const to = entries.find((entry) => entry.job.id === over.id);
    if (!from || !to || from.machine.id !== to.machine.id) return;
    const ids = reorderableIds(state, from.machine.id);
    dispatchReorder(from.machine.id, arrayMove(ids, ids.indexOf(from.job.id), ids.indexOf(to.job.id)));
  }

  return <div className="machine-queue">
    <div className="queue-panel-heading"><strong>Ready & waiting queue</strong><span>{entries.length} jobs · priority order</span></div>
    <p className="form-help dept-hint">One list per department. Drag or move jobs within the same machine to reprioritize; order across different machines has no effect.</p>
    {!entries.length
      ? <p className="empty-queue">No queued jobs in this department.</p>
      : <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={entries.map((entry) => entry.job.id)} strategy={verticalListSortingStrategy}>
          <div className="queue-list">{entries.map((entry) => <DepartmentQueueItem key={entry.job.id} entry={entry} position={positionByJob.get(entry.job.id) ?? 1} total={reorderableIds(state, entry.machine.id).length} onOpenJob={onOpenJob} onMove={(direction) => move(entry, direction)} />)}</div>
        </SortableContext>
      </DndContext>}
    <details className="incoming-work">
      <summary>Incoming work · {view.incoming.length}</summary>
      {!view.incoming.length && <p className="empty-queue">None planned.</p>}
      <div className="incoming-list">{view.incoming.map(({ job, currentOperation, operationsBeforeArrival, upstreamPosition, machine }) => <article className="incoming-job" key={`${job.id}-${machine?.id ?? "unassigned"}`}>
        <div><JobLink job={job} onOpen={onOpenJob} /><strong>{job.specification.name}</strong><small>{formatNumber(job.quantity)} boxes · upstream #{upstreamPosition} · {operationsBeforeArrival} {operationsBeforeArrival === 1 ? "operation" : "operations"} before arrival</small></div>
        <div><span className="operation-label">Currently at</span><strong>{currentOperation ? state.processes.find((process) => process.id === currentOperation.processId)?.name : "—"}</strong><small>Planned · {machine?.name ?? "Removed machine"}</small></div>
        <StatusPill status={getJobStatus(job)} />
      </article>)}</div>
    </details>
  </div>;
}

function DepartmentQueueItem({ entry, position, total, onOpenJob, onMove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.job.id });
  const { job, machine } = entry;
  return <div ref={setNodeRef} className={`queue-entry ${isDragging ? "dragging" : ""}`} style={{ transform: CSS.Transform.toString(transform), transition }}>
    <strong className="priority-number">{position}</strong>
    <div><JobLink job={job} onOpen={onOpenJob} /><p>{job.specification.name} · {job.quantity.toLocaleString()} boxes</p><span className="machine-badge">{machine.name}</span></div>
    <StatusPill status={getJobStatus(job)} />
    <div className="button-row queue-controls"><button type="button" className="icon-button" disabled={position <= 1} aria-label={`Move ${job.number} up`} onClick={() => onMove(-1)}><ArrowUp size={16} /></button><button type="button" className="icon-button" disabled={position >= total} aria-label={`Move ${job.number} down`} onClick={() => onMove(1)}><ArrowDown size={16} /></button><button type="button" className="drag-handle" {...attributes} {...listeners} aria-label={`Reorder ${job.number}`}><GripVertical size={16} /></button></div>
  </div>;
}

function RunningList({ view, onOpenJob }) {
  if (!view.running.length) return <p className="empty-state">No jobs in progress in this department.</p>;
  return <>
    <p className="form-help dept-hint">Running work only. Start and Complete stay in the machine view.</p>
    <div className="queue-list">{view.running.map(({ job, machine, operation }) => <div className="queue-entry dept-static" key={job.id}>
    <span className="running-marker" aria-hidden="true" />
    <div><JobLink job={job} onOpen={onOpenJob} /><p>{job.specification.name} · {job.quantity.toLocaleString()} boxes</p><span className="machine-badge">{machine.name}</span><small className="dept-date">Started {formatDate(operation.startedAt)}</small></div>
    <StatusPill status="running" />
  </div>)}</div>
  </>;
}

function DoneList({ view, onOpenJob }) {
  if (!view.completed.length) return <p className="empty-state">No completed work in this department yet.</p>;
  return <div className="queue-list">{view.completed.map(({ job, operation, machine }) => <div className="queue-entry dept-static" key={operation.id}>
    <span className="dept-done-marker"><CheckCircle2 size={20} aria-hidden="true" /></span>
    <div><JobLink job={job} onOpen={onOpenJob} /><p>{job.specification.name} · {job.quantity.toLocaleString()} boxes</p><span className="machine-badge">{machine?.name ?? "Removed machine"}</span><small className="dept-date">Completed {formatDate(operation.completedAt)}</small></div>
    <StatusPill status={getJobStatus(job)} />
  </div>)}</div>;
}
