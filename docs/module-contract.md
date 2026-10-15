# Manufacturing module contract

Implemented public interfaces for the end-to-end prototype. The domain glossary and end-to-end spec define the product behavior. See [architecture.md](architecture.md) for module ownership and extension guidance.

## Shared state

`version: 1`, `revision: number`, `nextJobNumber: number`, and arrays `processes`, `machines`, `products`, `jobs`, `attachments`, `events`.

- Process: `{ id, name }`.
- Machine: `{ id, name, processId, availability: 'available' | 'maintenance', retired: boolean, queue: jobId[] }`. Queue includes the ready/running head; all later jobs are waiting. Future planned work is not in a queue.
- Product: `{ id, name, standardSheet: { reelSize, cuttingSize }, boxesPerStandardSheet, numberOfColors, specialColors: string, designId: string | null, route: [{ processId, machineId: string | null }] }`.
- Attachment: `{ id, name, dataUrl, size }`. Durable PDF content, deduplicated by ID; old job references survive product changes.
- Job: `{ id, number, productId, specification: Product, quantity, sheet: { reelSize, cuttingSize }, boxesPerSheet, orderReference, customer, notes, createdAt, productionCompletedAt: string | null, dispatchedAt: string | null, status: 'active' | 'ready-for-dispatch' | 'dispatched', operations: Operation[] }`.
- Operation: `{ id, processId, machineId, status: 'pending' | 'waiting' | 'ready' | 'running' | 'completed', startedAt: string | null, completedAt: string | null }`.
- Event: `{ id, type, at, actor, jobId?, operationId?, machineId?, undoneBy?: string | null, ...domain-owned correction metadata }`. Start/Complete event types are `start` and `complete`; Undo is `undo`; Dispatch is `dispatch`.

## Domain public interface (`src/domain/index.js`)

- `createInitialState()` supplies processes, available machines and three sample products; no fictitious production history. Seed jobs may be created using commands only.
- `validateState(state)` verifies the version, shapes, references, retained designs, calculations and execution/queue invariants when loading, saving and executing commands. Invalid data throws and is not overwritten.
- `applyCommand(state, command, { actor = 'owner', now = ISO timestamp } = {})` returns a new valid state or throws an Error with a user-facing message. It never mutates its input, reads browser storage, or calls React. IDs use UUIDs; job numbers use a retained monotonic sequence or the entire retained job collection.
- `calculateSheets({ quantity, boxesPerSheet, sheet, standardSheet })` returns `{ requiredSheets, boxCapacity, multiplier }`, throwing for invalid inputs.
- `suggestBoxesPerSheet({ boxesPerStandardSheet, sheet, standardSheet })` returns an area-scaled whole-yield estimate (or `null` for incomplete sizes) for job-entry assistance only; it never throws and never overrides entered values. `areaRatio(...)` returns the numeric ratio; `formatAreaRatio(...)` returns it as text (e.g. `4×`).
- `getMachineView(state, machineId)` returns `{ machine, status, currentJob, currentOperation, waitingJobs }`; status is running/ready/idle/maintenance/retired.
- `getJobStatus(job)` returns running/ready/waiting/ready-for-dispatch/dispatched.
- `getIncomingWork(state, machineId)` returns `[{ job, operation, currentOperation, operationsBeforeArrival, upstreamPosition }]` for future pending assignments, ordered by arrival: closest arrival first, running work before queued work, then upstream machine queue priority. This read-only projection must never insert downstream work into executable queues.
- `getDepartmentView(state, processId)` returns `{ machines, queued, running, completed, incoming }` grouped by the job's current operation; its incoming projection shares the arrival ordering and upstream positions above.
- `getUndoReason(state, eventId)` returns `null` when eligible, otherwise an explanation. It includes downstream and source-machine dependencies.

Commands:

- `{ type: 'product.save', product, attachment? }` creates when product.id absent, edits otherwise. Optional new attachment already has ID and validated PDF content.
- `{ type: 'machine.save', machine }` creates when ID absent; editing cannot change referenced process identity.
- `{ type: 'machine.remove', machineId }` deletes only unreferenced machines; retires history-bearing machines after active/future/default references are resolved. Running work blocks removal.
- `{ type: 'job.create', productId, quantity, sheet, boxesPerSheet, assignments: machineId[], orderReference, customer, notes }` releases immediately with all assignments required.
- `{ type: 'job.edit', jobId, changes: { quantity?, sheet?, boxesPerSheet?, assignments?: machineId[], orderReference?, customer?, notes? } }`. Specification changes prohibited after production starts; only unstarted assignments can change.
- `{ type: 'operation.start', jobId }`, `{ type: 'operation.complete', jobId }` validate current operation and queue position at action time.
- `{ type: 'queue.reorder', machineId, jobIds: jobId[] }` accepts full queue order but cannot displace a running head. Ready head can change before starting.
- `{ type: 'operation.undo', eventId }` owner-only, preserves correction history.
- `{ type: 'job.dispatch', jobId }` owner-only, final manufacturing complete required.

## UI interfaces

`ConfigurationView({ state, onCommand, onMachineHistory })` and `JobForm({ state, job?, onCommand, onClose })` are feature modules. `onCommand(command)` returns `{ ok: true, state }` or `{ ok: false, error }`; forms keep input and display errors on failure, close only after successful durable save. It does not throw.

`JobForm` is a full dialog and is keyed externally by job ID or `new`. New and edit share one form. Modules import domain functions only through the domain entry point.

Shared UI exports from `src/ui/index.jsx`: `Dialog({ title, onClose, children, wide? })`, `StatusPill({ status })`, `JobLink({ job, onOpen })`, `SheetFacts({ job })`, `DesignLink({ attachment })`, `Field({ label, children, hint? })`, `formatDate(value)`, `formatNumber(value)`. Dialog has native focus trapping and Escape handling; Field associates a label and optional description with its input. Shared classes follow existing stylesheet conventions; additive styles live in `src/features.css`.

## Persistence and receipts

`src/persistence/index.js`: `loadState()` (seed only on absent storage), `saveState(state)` (throws on failure), `readDesignFile(file)` (async validated PDF, 750 KiB maximum), `STORAGE_KEY`. Never replace unreadable/unknown-version saved data with seed.

`src/receipts/index.js`: async `downloadReceipt(state, jobId)` lazily loads the PDF library and generates/downloads a PDF for a dispatched job; synchronous `printReceipt(state, jobId)` opens a printable receipt in response to a user gesture. Both are read-only and throw on failure. Receipt uses snapshot specification and real recorded dates.
