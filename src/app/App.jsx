import { useEffect, useState } from "react";
import { Factory, ListChecks, Plus, Settings2, Truck, X } from "lucide-react";
import { useFactory } from "./useFactory.js";
import { ConfigurationView } from "../configuration/index.jsx";
import { JobForm } from "../jobs/JobForm.jsx";
import { JobDetails } from "../jobs/JobDetails.jsx";
import { MachinesView, WorkstationView } from "../production/index.jsx";
import { MachineHistoryDialog } from "../production/History.jsx";
import { DispatchView } from "../dispatch/index.jsx";

const tabs = [
  { id: "machines", title: "Machines", heading: "Machine floor", icon: Factory },
  { id: "workstation", title: "Workstation", heading: "Workstation", icon: ListChecks },
  { id: "configuration", title: "Configuration", heading: "Factory configuration", icon: Settings2 },
  { id: "dispatch", title: "Dispatch & history", heading: "Dispatch & finished jobs", icon: Truck },
];
function readView() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view") ?? (params.get("variant") === "D" ? "workstation" : "machines");
  return tabs.some((tab) => tab.id === view) ? view : "machines";
}

export function App() {
  const factory = useFactory();
  const [view, setView] = useState(readView);
  const [role, setRole] = useState("worker");
  const [jobForm, setJobForm] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [historyMachine, setHistoryMachine] = useState(null);
  const owner = view !== "workstation";
  const tab = tabs.find((item) => item.id === view);
  useEffect(() => {
    const listener = () => setView(readView());
    window.addEventListener("popstate", listener);
    return () => window.removeEventListener("popstate", listener);
  }, []);
  function navigate(next) {
    const params = new URLSearchParams(window.location.search);
    params.delete("variant");
    params.set("view", next);
    window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
    setView(next);
    setSelectedJob(null);
    setHistoryMachine(null);
  }
  const command = (action) => factory.command(action, owner ? "owner" : role);
  const onOpenJob = (id) => { setHistoryMachine(null); setSelectedJob(id); };
  if (factory.loadError) return <main className="app-shell"><section className="feature-panel storage-error"><h1>Factory data could not be loaded</h1><p role="alert">{factory.loadError}</p><button className="primary-button" onClick={() => window.location.reload()}>Retry loading</button></section></main>;
  const state = factory.state;
  return <main className="app-shell">
    <header className="topbar"><div><p className="eyebrow">Packaging factory / {owner ? "Owner workspace" : "Floor operations"}</p><h1>{tab.heading}</h1></div><div className="header-actions">{owner && <button className="primary-button new-job-button" onClick={() => setJobForm({})}><Plus size={19} />New job</button>}</div></header>
    <div className="monitor-toolbar"><nav className="view-tabs" aria-label="Factory views">{tabs.map(({ id, title, icon: Icon }) => <button key={id} className={view === id ? "active" : ""} aria-label={title} aria-current={view === id ? "page" : undefined} onClick={() => navigate(id)}><Icon size={18} />{title}{id === "dispatch" && state.jobs.some((job) => job.status === "ready-for-dispatch") && <span className="tab-count" aria-hidden="true">{state.jobs.filter((job) => job.status === "ready-for-dispatch").length}</span>}</button>)}</nav></div>
    <div className="save-status" role="status" aria-live="polite">{factory.message || "Configuration, jobs and history are retained locally."}</div>
    {factory.error && <div className="global-error" role="alert"><span>{factory.error}</span><button className="icon-button" aria-label="Dismiss error" onClick={factory.dismissError}><X size={18} /></button></div>}
    {view === "machines" && <MachinesView state={state} onCommand={command} onOpenJob={onOpenJob} onMachineHistory={setHistoryMachine} onConfigure={() => navigate("configuration")} onNewJob={() => setJobForm({})} />}
    {view === "workstation" && <WorkstationView state={state} onCommand={command} onOpenJob={onOpenJob} role={role} onRoleChange={setRole} />}
    {view === "configuration" && <ConfigurationView state={state} onCommand={command} onMachineHistory={setHistoryMachine} />}
    {view === "dispatch" && <DispatchView state={state} onCommand={command} onOpenJob={onOpenJob} />}
    {jobForm && <JobForm key={jobForm.id ?? "new"} state={state} job={jobForm.id ? state.jobs.find((job) => job.id === jobForm.id) : null} onCommand={command} onClose={(created) => { setJobForm(null); if (created && !jobForm.id) { navigate("machines"); setSelectedJob(created.id); } }} />}
    {selectedJob && <JobDetails state={state} jobId={selectedJob} owner={owner} onCommand={command} onClose={() => setSelectedJob(null)} onEdit={(job) => { setSelectedJob(null); setJobForm(job); }} />}
    {historyMachine && <MachineHistoryDialog state={state} machineId={historyMachine} onClose={() => setHistoryMachine(null)} onCommand={command} onOpenJob={onOpenJob} />}
  </main>;
}
