import test from "node:test";
import assert from "node:assert/strict";
import { applyCommand, calculateSheets, createInitialState, getJobStatus, getMachineView, getUndoReason } from "../../src/domain/index.js";

const now = "2026-10-13T10:00:00.000Z";

function factory() {
  let state = createInitialState();
  const go = (command, actor = "owner", at = now) => {
    state = applyCommand(state, command, { actor, now: at });
    return state;
  };
  const product = (steps = [0, 2], extra = {}) => {
    const seed = state.products[0];
    go({ type: "product.save", product: {
      ...seed, id: undefined, name: "Test product",
      route: steps.map((index) => ({ processId: state.processes[index].id, machineId: state.machines.find((machine) => machine.processId === state.processes[index].id && machine.availability === "available").id })),
      ...extra,
    } });
    return state.products.at(-1).id;
  };
  const create = (productId = state.products[0].id, extra = {}) => {
    const specification = state.products.find((entry) => entry.id === productId);
    go({ type: "job.create", productId, quantity: 10001, sheet: { reelSize: 100, cuttingSize: 70 }, boxesPerSheet: 8,
      assignments: specification.route.map((step) => step.machineId), orderReference: "SO-42", customer: "Acme", notes: "Keep dry", ...extra });
    return state.jobs.at(-1).id;
  };
  return { get state() { return state; }, go, product, create,
    job: (id) => state.jobs.find((entry) => entry.id === id),
    event: (type, jobId) => state.events.findLast((event) => event.type === type && (!jobId || event.jobId === jobId)),
    start: (jobId, actor = "worker") => go({ type: "operation.start", jobId }, actor),
    complete: (jobId, actor = "worker") => go({ type: "operation.complete", jobId }, actor),
    undo: (eventId) => go({ type: "operation.undo", eventId }),
  };
}

function rejectUndo(f, eventId, pattern) {
  const reason = getUndoReason(f.state, eventId);
  assert.match(reason, pattern);
  const before = structuredClone(f.state);
  assert.throws(() => f.undo(eventId), (error) => error.message === reason);
  assert.deepEqual(f.state, before);
}

function freeze(value) {
  if (value && typeof value === "object") {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
}

test("seed is an empty factory with eight processes, 11 machines and three usable products", () => {
  const state = createInitialState();
  assert.equal(state.processes.length, 8);
  assert.equal(state.machines.length, 11);
  assert.equal(state.products.length, 3);
  assert.deepEqual(state.jobs, []);
  assert.deepEqual(state.events, []);
  assert.ok(state.machines.every((machine) => !machine.queue.length));
  const ids = [...state.processes, ...state.machines, ...state.products].map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => /^[a-f0-9-]{36}$/.test(id)));
  for (const product of state.products) {
    assert.doesNotThrow(() => applyCommand(state, { type: "job.create", productId: product.id, quantity: 1, sheet: product.standardSheet, boxesPerSheet: product.boxesPerStandardSheet, assignments: product.route.map((step) => step.machineId) }));
  }
});

test("sheet yield is authoritative, whole sheets round upward, invalid arithmetic is refused", () => {
  const input = { sheet: { reelSize: 200, cuttingSize: 70 }, standardSheet: { reelSize: 100, cuttingSize: 70 } };
  assert.deepEqual(calculateSheets({ ...input, quantity: 10000, boxesPerSheet: 4 }), { requiredSheets: 2500, boxCapacity: 10000, multiplier: 2 });
  assert.equal(calculateSheets({ ...input, quantity: 10000, boxesPerSheet: 8 }).requiredSheets, 1250);
  assert.deepEqual(calculateSheets({ ...input, quantity: 10001, boxesPerSheet: 8 }), { requiredSheets: 1251, boxCapacity: 10008, multiplier: 2 });
  for (const value of [0, -1, 1.5, Infinity, NaN, "8", null]) {
    assert.throws(() => calculateSheets({ ...input, quantity: 100, boxesPerSheet: value }));
    assert.throws(() => calculateSheets({ ...input, quantity: value, boxesPerSheet: 4 }));
  }
  assert.throws(() => calculateSheets({ ...input, quantity: Number.MAX_SAFE_INTEGER, boxesPerSheet: 2 }), /range/);
  assert.throws(() => calculateSheets({ ...input, quantity: 1, boxesPerSheet: 1, sheet: { reelSize: Number.MAX_VALUE, cuttingSize: 2 } }), /range/);
});

test("public commands are immutable, atomic, serializable and revisioned", () => {
  const state = freeze(createInitialState());
  const input = freeze({ type: "job.create", productId: state.products[0].id, quantity: 10, boxesPerSheet: 4, sheet: { reelSize: 50, cuttingSize: 40 }, assignments: state.products[0].route.map((step) => step.machineId) });
  const next = applyCommand(state, input, { now });
  assert.equal(state.jobs.length, 0);
  assert.equal(next.jobs.length, 1);
  assert.equal(next.revision, 1);
  assert.equal(next.jobs[0].createdAt, now);
  assert.deepEqual(JSON.parse(JSON.stringify(next)), next);
  const before = structuredClone(next);
  assert.throws(() => applyCommand(next, { type: "job.edit", jobId: next.jobs[0].id, changes: { quantity: 0 } }));
  assert.deepEqual(next, before);
});

test("job release rejects incomplete, missing, foreign-process and maintenance assignments", () => {
  const f = factory();
  const product = f.state.products[0];
  const assignments = product.route.map((step) => step.machineId);
  for (const invalid of [undefined, [], assignments.slice(1), [null, ...assignments.slice(1)], ["missing", ...assignments.slice(1)], [assignments[1], ...assignments.slice(1)]]) {
    assert.throws(() => f.create(product.id, { assignments: invalid }));
  }
  const maintenance = f.state.machines.find((machine) => machine.availability === "maintenance");
  assert.throws(() => f.create(product.id, { assignments: assignments.map((id, index) => index === 2 ? maintenance.id : id) }), /unavailable/);
  assert.equal(f.state.jobs.length, 0);
});

test("owner, supervisor and worker policy is enforced at command time", () => {
  const f = factory();
  const id = f.create();
  const machineId = f.job(id).operations[0].machineId;
  const commands = [
    { type: "product.save", product: f.state.products[0] },
    { type: "machine.save", machine: f.state.machines[0] },
    { type: "machine.remove", machineId },
    { type: "job.create" }, { type: "job.edit", jobId: id, changes: { notes: "x" } },
    { type: "operation.undo", eventId: "missing" }, { type: "job.dispatch", jobId: id },
  ];
  for (const actor of ["worker", "supervisor"]) {
    for (const command of commands) assert.throws(() => f.go(command, actor), /Only the owner/);
  }
  assert.throws(() => f.go({ type: "queue.reorder", machineId, jobIds: [id] }, "worker"), /Only the owner/);
  f.go({ type: "queue.reorder", machineId, jobIds: [id] }, "supervisor");
  f.start(id, "supervisor");
  f.complete(id, "worker");
  f.start(id, "owner");
  assert.throws(() => f.go({ type: "operation.complete", jobId: id }, "guest"), /role/);
});

test("queue reprioritization changes ready head, never displaces running work or loses jobs", () => {
  const f = factory();
  const a = f.create();
  const b = f.create();
  const c = f.create();
  const machineId = f.job(a).operations[0].machineId;
  assert.equal(getJobStatus(f.job(a)), "ready");
  assert.equal(getJobStatus(f.job(b)), "waiting");
  assert.throws(() => f.start(b), /first/);
  f.go({ type: "queue.reorder", machineId, jobIds: [b, a, c] }, "supervisor");
  assert.equal(getJobStatus(f.job(a)), "waiting");
  f.start(b);
  for (const jobIds of [[a, b, c], [b, a], [b, a, a], [b, a, "missing"]]) assert.throws(() => f.go({ type: "queue.reorder", machineId, jobIds }));
  f.go({ type: "queue.reorder", machineId, jobIds: [b, c, a] });
  f.complete(b);
  const view = getMachineView(f.state, machineId);
  assert.equal(view.currentJob.id, c);
  assert.equal(view.status, "ready");
  assert.deepEqual(view.waitingJobs.map((job) => job.id), [a]);
});

test("different product routes hand off to their own destinations, with explicit Start", () => {
  const f = factory();
  const first = f.product([0, 2]);
  const second = f.product([0, 5]);
  const a = f.create(first);
  const b = f.create(second);
  f.start(a); f.complete(a);
  f.start(b); f.complete(b);
  assert.equal(getMachineView(f.state, f.job(a).operations[1].machineId).currentJob.id, a);
  assert.equal(getMachineView(f.state, f.job(b).operations[1].machineId).currentJob.id, b);
  assert.equal(getJobStatus(f.job(a)), "ready");
  assert.equal(getJobStatus(f.job(b)), "ready");
  assert.throws(() => f.complete(a), /Start/);
  assert.equal(getMachineView(f.state, f.job(a).operations[0].machineId).status, "idle");
});

test("completion appends to a busy destination without executing future work early", () => {
  const f = factory();
  const direct = f.product([2]);
  const routed = f.product([0, 2]);
  const a = f.create(direct);
  const b = f.create(routed);
  f.start(a);
  const destination = f.job(a).operations[0].machineId;
  assert.deepEqual(getMachineView(f.state, destination).waitingJobs, []);
  f.start(b); f.complete(b);
  assert.equal(getJobStatus(f.job(b)), "waiting");
  assert.equal(getMachineView(f.state, destination).currentJob.id, a);
  f.complete(a);
  assert.equal(getJobStatus(f.job(b)), "ready");
});

test("dispatch is explicit, dated, retained, nonrepeatable, and never reuses job numbers", () => {
  const f = factory();
  const product = f.product([0]);
  const a = f.create(product);
  const number = f.job(a).number;
  assert.throws(() => f.go({ type: "job.dispatch", jobId: a }), /all manufacturing/);
  f.start(a); f.complete(a);
  assert.equal(f.job(a).status, "ready-for-dispatch");
  assert.equal(f.job(a).productionCompletedAt, now);
  assert.equal(f.job(a).dispatchedAt, null);
  const date = "2026-10-14T10:00:00.000Z";
  f.go({ type: "job.dispatch", jobId: a }, "owner", date);
  assert.equal(f.job(a).dispatchedAt, date);
  assert.throws(() => f.go({ type: "job.dispatch", jobId: a }), /awaiting dispatch/);
  assert.throws(() => f.go({ type: "job.edit", jobId: a, changes: { notes: "changed" } }), /history/);
  const b = f.create(product);
  assert.notEqual(f.job(b).number, number);
  assert.notEqual(a, b);
  assert.equal(f.state.jobs.length, 2);
  rejectUndo(f, f.event("complete", a).id, /Dispatched/);
});

test("product specifications, design content and event machine names survive configuration edits", () => {
  const f = factory();
  const product = f.product([0]);
  const pdf = { id: "pdf-original", name: "original.pdf", size: 14, dataUrl: "data:application/pdf;base64,JVBERi0xLjQKJSVFT0YK" };
  f.go({ type: "product.save", product: { ...f.state.products.find((entry) => entry.id === product), designId: pdf.id }, attachment: pdf });
  const a = f.create(product);
  const original = structuredClone(f.job(a).specification);
  f.start(a); f.complete(a);
  const event = structuredClone(f.event("complete", a));
  const machine = f.state.machines.find((entry) => entry.id === event.machineId);
  f.go({ type: "machine.save", machine: { ...machine, name: "Renamed cutter" } });
  const replacement = { ...pdf, id: "pdf-new", name: "replacement.pdf", dataUrl: "data:application/pdf;base64,JVBERi0xLjUKJSVFT0YK" };
  f.go({ type: "product.save", product: { ...f.state.products.find((entry) => entry.id === product), name: "New product name", designId: replacement.id, standardSheet: { reelSize: 10, cuttingSize: 20 } }, attachment: replacement });
  assert.deepEqual(f.job(a).specification, original);
  assert.deepEqual(f.event("complete", a), event);
  assert.equal(f.state.attachments.length, 2);
  assert.match(event.detail, /Test product.*Reel cutting.*Reel cutter 1/);
  assert.equal(event.processName, "Reel cutting");
  assert.equal(f.event("start", a).machineName, "Reel cutter 1");
  const b = f.create(product);
  assert.equal(f.job(b).specification.name, "New product name");
  assert.equal(f.job(b).specification.route[0].machineName, "Renamed cutter");
  assert.throws(() => f.go({ type: "product.save", product: f.state.products[0], attachment: { ...pdf, dataUrl: replacement.dataUrl } }), /cannot be replaced/);
});

test("job edits reassign ready and future work only, preserving defaults and other jobs", () => {
  const f = factory();
  const a = f.create();
  const b = f.create();
  const defaults = structuredClone(f.state.products[0]);
  const oldMachine = f.job(a).operations[0].machineId;
  const alternative = f.state.machines.find((machine) => machine.processId === f.job(a).operations[0].processId && machine.id !== oldMachine);
  let assignments = f.job(a).operations.map((operation) => operation.machineId);
  assignments[0] = alternative.id;
  f.go({ type: "job.edit", jobId: a, changes: { assignments, quantity: 123, boxesPerSheet: 3 } });
  assert.equal(getMachineView(f.state, oldMachine).currentJob.id, b);
  assert.equal(getMachineView(f.state, alternative.id).currentJob.id, a);
  assert.deepEqual(f.state.products[0], defaults);
  f.start(a);
  assert.throws(() => f.go({ type: "job.edit", jobId: a, changes: { quantity: 124 } }), /specification/);
  assignments = [...assignments]; assignments[0] = oldMachine;
  assert.throws(() => f.go({ type: "job.edit", jobId: a, changes: { assignments } }), /cannot be reassigned/);
  assignments[0] = alternative.id;
  assignments[1] = f.state.machines.find((machine) => machine.processId === f.job(a).operations[1].processId && machine.id !== assignments[1]).id;
  f.go({ type: "job.edit", jobId: a, changes: { assignments, notes: "Updated", quantity: 123, boxesPerSheet: 3 } });
  assert.equal(f.job(a).notes, "Updated");
  f.complete(a);
  assert.equal(getMachineView(f.state, assignments[1]).currentJob.id, a);
  assert.equal(f.job(b).operations[1].machineId, defaults.route[1].machineId);
});

test("eligible Start correction survives serialization and leaves an explicit correction history", () => {
  const f = factory();
  const a = f.create(); f.start(a);
  const event = f.event("start", a);
  assert.equal(getUndoReason(f.state, event.id), null);
  const state = applyCommand(JSON.parse(JSON.stringify(f.state)), { type: "operation.undo", eventId: event.id }, { now });
  assert.equal(getJobStatus(state.jobs[0]), "ready");
  assert.equal(state.jobs[0].operations[0].startedAt, null);
  const correction = state.events.at(-1);
  assert.equal(correction.type, "undo");
  assert.equal(correction.correctedEventId, event.id);
  assert.equal(state.events.find((entry) => entry.id === event.id).undoneBy, correction.id);
  assert.match(getUndoReason(state, event.id), /already/);
  assert.throws(() => applyCommand(state, { type: "job.edit", jobId: a, changes: { quantity: 2 } }), /specification/);
});

test("eligible Complete correction withdraws a waiting handoff and restores running source ahead of ready work", () => {
  const f = factory();
  const route = f.product([0, 2]);
  const direct = f.product([2]);
  const busy = f.create(direct); f.start(busy);
  const a = f.create(route);
  const b = f.create(route);
  f.start(a); f.complete(a);
  const event = f.event("complete", a);
  assert.equal(getJobStatus(f.job(a)), "waiting");
  assert.equal(getUndoReason(f.state, event.id), null);
  f.undo(event.id);
  assert.equal(getJobStatus(f.job(a)), "running");
  assert.equal(getJobStatus(f.job(b)), "waiting");
  assert.equal(f.job(a).operations[1].status, "pending");
  assert.equal(f.state.machines.flatMap((machine) => machine.queue).filter((id) => id === a).length, 1);
  assert.equal(getMachineView(f.state, f.job(busy).operations[0].machineId).currentJob.id, busy);
  assert.deepEqual(getMachineView(f.state, f.job(busy).operations[0].machineId).waitingJobs, []);
  rejectUndo(f, event.id, /already/);
  f.complete(a);
  assert.equal(f.job(a).operations[0].status, "completed");
});

test("final Complete can be corrected before dispatch and Start can then be corrected", () => {
  const f = factory();
  const a = f.create(f.product([0]));
  f.start(a); const start = f.event("start", a);
  f.complete(a); const complete = f.event("complete", a);
  rejectUndo(f, start.id, /currently running/);
  f.undo(complete.id);
  assert.equal(f.job(a).productionCompletedAt, null);
  assert.equal(f.job(a).status, "active");
  assert.equal(getUndoReason(f.state, start.id), null);
  f.undo(start.id);
  assert.equal(getJobStatus(f.job(a)), "ready");
});

for (const dependentState of ["running", "completed", "undone"]) {
  test(`source-machine dependency blocks earlier Complete undo even when later work is ${dependentState}`, () => {
    const f = factory();
    const product = f.product([0]);
    const a = f.create(product); const b = f.create(product);
    f.start(a); f.complete(a); const original = f.event("complete", a);
    f.start(b);
    if (dependentState === "completed") f.complete(b);
    if (dependentState === "undone") f.undo(f.event("start", b).id);
    rejectUndo(f, original.id, /started on this machine/);
  });

  test(`downstream dependency blocks earlier Complete undo even when later work is ${dependentState}`, () => {
    const f = factory();
    const a = f.create(f.product([0, 2]));
    f.start(a); f.complete(a); const original = f.event("complete", a);
    f.start(a);
    if (dependentState === "completed") f.complete(a);
    if (dependentState === "undone") f.undo(f.event("start", a).id);
    rejectUndo(f, original.id, /Downstream work/);
  });
}

test("machine deletion, process edits, maintenance and retirement honor all retained references", () => {
  const f = factory();
  const processId = f.state.processes[0].id;
  f.go({ type: "machine.save", machine: { name: "Temporary cutter", processId } });
  const temporary = f.state.machines.at(-1);
  f.go({ type: "machine.save", machine: { ...temporary, processId: f.state.processes[1].id } });
  f.go({ type: "machine.remove", machineId: temporary.id });
  assert.ok(!f.state.machines.some((machine) => machine.id === temporary.id));
  const product = f.product([0]);
  const a = f.create(product);
  const machineId = f.job(a).operations[0].machineId;
  const machine = f.state.machines.find((entry) => entry.id === machineId);
  assert.throws(() => f.go({ type: "machine.remove", machineId }), /Reassign/);
  assert.throws(() => f.go({ type: "machine.save", machine: { ...machine, processId: f.state.processes[1].id } }), /referenced/);
  assert.throws(() => f.go({ type: "machine.save", machine: { ...machine, availability: "maintenance" } }), /Resolve/);
  f.start(a);
  assert.throws(() => f.go({ type: "machine.remove", machineId }), /running/);
  f.complete(a);
  assert.throws(() => f.go({ type: "machine.remove", machineId }), /default/);
  for (const entry of [...f.state.products]) {
    f.go({ type: "product.save", product: { ...entry, route: entry.route.map((step) => step.machineId === machineId ? { ...step, machineId: null } : step) } });
  }
  f.go({ type: "machine.remove", machineId });
  assert.equal(getMachineView(f.state, machineId).status, "retired");
  assert.equal(f.job(a).operations[0].machineId, machineId);
  assert.equal(f.event("complete", a).machineName, machine.name);
  rejectUndo(f, f.event("complete", a).id, /retired/);
  assert.throws(() => f.create(product, { assignments: [machineId] }), /unavailable/);
});

test("future machine plans block removal even if the machine currently has no queue", () => {
  const f = factory();
  const a = f.create();
  const machineId = f.job(a).operations[1].machineId;
  assert.equal(getMachineView(f.state, machineId).status, "idle");
  for (const product of [...f.state.products]) f.go({ type: "product.save", product: { ...product, route: product.route.map((step) => step.machineId === machineId ? { ...step, machineId: null } : step) } });
  assert.throws(() => f.go({ type: "machine.remove", machineId }), /future/);
});

test("malformed restored routes cannot be mistaken for manufacturing completion", () => {
  const f = factory(); const id = f.create(); f.start(id);
  const corrupted = structuredClone(f.state);
  corrupted.jobs[0].operations = [];
  assert.throws(() => applyCommand(corrupted, { type: "operation.complete", jobId: id }), /queue|route/i);
  const missingPlan = structuredClone(f.state);
  missingPlan.jobs[0].operations.pop();
  assert.throws(() => applyCommand(missingPlan, { type: "operation.complete", jobId: id }), /route/);
});

test("configuration rejects invalid dimensions, routes, counts and attachment payloads", () => {
  const f = factory();
  const product = f.state.products[0];
  for (const changes of [{ name: " " }, { route: [] }, { route: [product.route[0], product.route[0]] }, { boxesPerStandardSheet: 0 }, { numberOfColors: -1 }, { standardSheet: { reelSize: 0, cuttingSize: 10 } }, { designId: "missing" }]) {
    assert.throws(() => f.go({ type: "product.save", product: { ...product, ...changes } }));
  }
  assert.throws(() => f.go({ type: "product.save", product, attachment: { id: "bad", name: "bad.pdf", size: 5, dataUrl: "blob:memory-only" } }), /PDF/);
  assert.throws(() => f.go({ type: "product.save", product, attachment: { id: "large", name: "large.pdf", size: 750 * 1024 + 1, dataUrl: "data:application/pdf;base64,JVBERi0x" } }), /750/);
});
