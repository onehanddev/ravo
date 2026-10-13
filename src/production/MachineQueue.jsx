import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { getJobStatus } from "../domain/index.js";
import { JobLink, StatusPill } from "../ui/index.jsx";

export function MachineQueue({ state, machine, onCommand, onOpenJob, canReorder }) {
  const jobs = machine.queue.map((id) => state.jobs.find((job) => job.id === id));
  const running = jobs[0] && getJobStatus(jobs[0]) === "running";
  const reorderable = running ? jobs.slice(1) : jobs;
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  function reorder(from, to) {
    const ids = arrayMove(reorderable.map((job) => job.id), from, to);
    onCommand({ type: "queue.reorder", machineId: machine.id, jobIds: running ? [jobs[0].id, ...ids] : ids });
  }
  return <div className="machine-queue">
    <div className="queue-panel-heading"><strong>{running ? "Waiting queue" : "Ready & waiting queue"}</strong><span>{reorderable.length} jobs · priority order</span></div>
    {!reorderable.length ? <p className="empty-queue">No waiting jobs.</p> : <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active, over }) => { if (canReorder && over && active.id !== over.id) reorder(reorderable.findIndex((job) => job.id === active.id), reorderable.findIndex((job) => job.id === over.id)); }}>
      <SortableContext items={reorderable.map((job) => job.id)} strategy={verticalListSortingStrategy}>
        <div className="queue-list">{reorderable.map((job, index) => <QueueItem key={job.id} job={job} index={index} total={reorderable.length} onOpenJob={onOpenJob} canReorder={canReorder} onMove={(direction) => reorder(index, index + direction)} />)}</div>
      </SortableContext>
    </DndContext>}
  </div>;
}

function QueueItem({ job, index, total, onOpenJob, canReorder, onMove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: job.id, disabled: !canReorder });
  return <div ref={setNodeRef} className={`queue-entry ${isDragging ? "dragging" : ""}`} style={{ transform: CSS.Transform.toString(transform), transition }}>
    <strong className="priority-number">{index + 1}</strong><div><JobLink job={job} onOpen={onOpenJob} /><p>{job.specification.name} · {job.quantity.toLocaleString()} boxes</p></div><StatusPill status={getJobStatus(job)} />
    {canReorder && <div className="button-row queue-controls"><button type="button" className="icon-button" disabled={index === 0} aria-label={`Move ${job.number} up`} onClick={() => onMove(-1)}><ArrowUp size={16} /></button><button type="button" className="icon-button" disabled={index === total - 1} aria-label={`Move ${job.number} down`} onClick={() => onMove(1)}><ArrowDown size={16} /></button><button type="button" className="drag-handle" {...attributes} {...listeners} aria-label={`Reorder ${job.number}`}><GripVertical size={16} /></button></div>}
  </div>;
}
