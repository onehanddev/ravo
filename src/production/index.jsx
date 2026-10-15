import { Fragment, useState } from "react";
import { CheckCircle2, Factory, History, Play } from "lucide-react";
import { getIncomingWork, getMachineView } from "../domain/index.js";
import { JobLink, StatusPill, SheetFacts, Field } from "../ui/index.jsx";
import { MachineQueue } from "./MachineQueue.jsx";
import { IncomingWork } from "./IncomingWork.jsx";
import { CompletionCorrection } from "./CompletionCorrection.jsx";

export function OperationAction({ view, onCommand, worker = false }) {
  if (!view.currentJob || !["running", "ready"].includes(view.status)) return null;
  const running = view.status === "running";
  return <button className={worker ? running ? "worker-done" : "worker-start" : "primary-button"} onClick={() => onCommand({ type: running ? "operation.complete" : "operation.start", jobId: view.currentJob.id })} aria-label={`${running ? "Complete" : "Start"} ${view.currentJob.number} on ${view.machine.name}`}>
    {running ? <CheckCircle2 size={18} /> : <Play size={18} />}{running ? "Mark done" : "Start job"}
  </button>;
}

export function MachinesView({ state, onCommand, onOpenJob, onMachineHistory, onConfigure, onNewJob }) {
  const [open, setOpen] = useState(null);
  const views = state.machines.filter((machine) => !machine.retired).map((machine) => getMachineView(state, machine.id));
  return <>
    <section className="capacity-strip" aria-label="Machine status summary">
      <div><strong>{views.length}</strong><span>Machines</span></div><div className="summary-running"><strong>{views.filter((view) => view.status === "running").length}</strong><span>Running</span></div><div className="summary-ready"><strong>{views.filter((view) => ["ready", "idle"].includes(view.status)).length}</strong><span>Ready / available</span></div><div className="summary-waiting"><strong>{views.reduce((sum, view) => sum + view.waitingJobs.length, 0)}</strong><span>Waiting jobs</span></div><div className="summary-maintenance"><strong>{views.filter((view) => view.status === "maintenance").length}</strong><span>Unavailable</span></div>
    </section>
    {!state.jobs.length && <section className="onboarding-strip"><h2>From product setup to dispatch</h2><div className="button-row"><button className="ghost-button" onClick={onConfigure}>Configure factory</button><button className="primary-button" onClick={onNewJob}>Create first job</button></div></section>}
    <section className="machine-groups" aria-label="Processes and machines">{state.processes.map((process) => {
      const units = views.filter((view) => view.machine.processId === process.id);
      return <section key={process.id} className="dispatch-group">
        <header className="dispatch-group-header"><div className="type-heading"><Factory size={24} /><h2>{process.name}</h2></div><div className="type-counts"><strong>{units.length} {units.length === 1 ? "machine" : "machines"}</strong><span>{units.filter((view) => view.status === "running").length} running</span></div></header>
        <div className="table-head"><span>Machine</span><span>Status</span><span>Current job</span><span>Waiting</span><span>Actions</span></div>
        {units.length === 0 && <p className="empty-state">No active machines. Add a machine in Configuration.</p>}
        {units.map((view) => <Fragment key={view.machine.id}>
          <div className={`table-row row-${view.status}`} data-testid={`machine-${view.machine.name}`}>
            <div className="unit-identity"><button className="machine-name-button" aria-label={`View ${view.machine.name} planning`} aria-expanded={open === view.machine.id} onClick={() => setOpen(open === view.machine.id ? null : view.machine.id)}>{view.machine.name}</button></div><div><StatusPill status={view.status} /></div><div className="job-cell">{view.currentJob ? <><JobLink job={view.currentJob} onOpen={onOpenJob} /><small>{view.currentJob.specification.name}</small></> : <span className="muted">No current job</span>}</div><div className="waiting-cell"><strong>{view.waitingJobs.length}</strong><span>jobs</span></div>
            <div className="machine-actions"><OperationAction view={view} onCommand={onCommand} /><button className="ghost-button small" aria-expanded={open === view.machine.id} onClick={() => setOpen(open === view.machine.id ? null : view.machine.id)}>Queue & details</button></div>
          </div>
          {open === view.machine.id && <div className="queue-panel">
            <div className="section-heading"><h3>{view.machine.name}</h3><button className="ghost-button" onClick={() => onMachineHistory(view.machine.id)}><History size={17} />Machine history</button></div>
            {view.currentJob && <NextStep state={state} job={view.currentJob} />}
            {process.name === "Corrugation" && view.currentJob && <SheetFacts job={view.currentJob} />}
            <CompletionCorrection state={state} event={state.events.findLast((event) => event.machineId === view.machine.id && event.type === "complete" && !event.undoneBy)} onCommand={onCommand} label="Undo last completion" />
            <MachineQueue state={state} machine={view.machine} onCommand={onCommand} onOpenJob={onOpenJob} canReorder />
            <IncomingWork state={state} machine={view.machine} onOpenJob={onOpenJob} />
          </div>}
        </Fragment>)}
      </section>;
    })}</section>
  </>;
}

function NextStep({ state, job }) {
  const index = job.operations.findIndex((operation) => operation.status !== "completed");
  const next = job.operations[index + 1];
  return <p className="next-step"><strong>Next:</strong> {next ? `${state.processes.find((process) => process.id === next.processId)?.name} · ${state.machines.find((machine) => machine.id === next.machineId)?.name}` : "Ready for dispatch after this operation"}</p>;
}

export function WorkstationView({ state, onCommand, onOpenJob, role, onRoleChange }) {
  const [department, setDepartment] = useState(state.processes.find((process) => process.name === "Printing")?.id ?? state.processes[0].id);
  const [queue, setQueue] = useState(null);
  const process = state.processes.find((item) => item.id === department);
  const views = state.machines.filter((machine) => machine.processId === department && !machine.retired).map((machine) => getMachineView(state, machine.id));
  return <section className="workstation-operations">
    <header className="operations-heading"><div className="department-picker"><Field label="Department"><select value={department} onChange={(event) => setDepartment(event.target.value)}>{state.processes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Workstation role"><select value={role} onChange={(event) => onRoleChange(event.target.value)}><option value="worker">Worker · start / complete</option><option value="supervisor">Supervisor · queue priority</option></select></Field></div><dl className="workstation-summary"><div><dt>Machines</dt><dd>{views.length}</dd></div><div className="summary-running"><dt>Running</dt><dd>{views.filter((view) => view.status === "running").length}</dd></div><div><dt>Waiting</dt><dd>{views.reduce((sum, view) => sum + view.waitingJobs.length, 0)}</dd></div></dl></header>
    <div className="workstation-units">{views.map((view) => {
      const incomingCount = getIncomingWork(state, view.machine.id).length;
      return <Fragment key={view.machine.id}>
      <section className={`workstation-unit worker-${view.status}`} aria-label={view.machine.name}>
        <header className="workstation-identity"><h3><button className="machine-name-button" aria-label={`View ${view.machine.name} planning`} aria-expanded={queue === view.machine.id} onClick={() => setQueue(queue === view.machine.id ? null : view.machine.id)}>{view.machine.name}</button></h3></header>
        <div className="workstation-current"><span className="operation-label">{view.status === "ready" ? "Next job · ready to start" : "Current job"}</span>{view.currentJob ? <><JobLink job={view.currentJob} onOpen={onOpenJob} /><p>{view.currentJob.specification.name}</p><NextStep state={state} job={view.currentJob} /></> : <p>{view.status === "maintenance" ? "Unavailable for assignment" : "Available for the next job"}</p>}</div>
        <div className="workstation-process"><StatusPill status={view.status} /></div><div className="workstation-action"><OperationAction view={view} onCommand={onCommand} worker /></div>
        {process.name === "Corrugation" && view.currentJob && <section className="corrugation-facts"><h3>Corrugation sheet requirement</h3><SheetFacts job={view.currentJob} /></section>}
        <button className="ghost-button small workstation-queue-toggle" aria-expanded={queue === view.machine.id} onClick={() => setQueue(queue === view.machine.id ? null : view.machine.id)}>Queue & incoming work · {view.waitingJobs.length} waiting · {incomingCount} incoming</button>
      </section>
      {queue === view.machine.id && <div className="queue-panel"><MachineQueue state={state} machine={view.machine} onCommand={onCommand} onOpenJob={onOpenJob} canReorder={role === "supervisor"} /><IncomingWork state={state} machine={view.machine} onOpenJob={onOpenJob} /></div>}
      </Fragment>;
    })}</div>
    {!views.length && <p className="empty-state">No active machines in this department. Ask the owner to configure a machine.</p>}
  </section>;
}
