# Manufacturing prototype architecture

## The main rule

**All production changes go through `applyCommand` in `src/domain/index.js`.** Screens collect intent and display projections. They do not move queue entries, advance routes, rewrite histories, or save storage themselves.

```text
Configuration / Job forms / Machines / Workstation / Dispatch
                           |
                       onCommand
                           |
                   app/useFactory.js
                           |
          domain.applyCommand(current, command, actor)
                           |
                  persistence.saveState(next)
                           |
           publish next state to every mounted view
```

The candidate state is saved before it becomes visible. A failed validation or storage write returns an error and preserves the last valid state and the user's form inputs.

## Module map

| Module | Responsibility | Public interface |
| --- | --- | --- |
| `src/domain/` | Manufacturing rules and immutable state transitions | `index.js`: commands, validation, calculations, projections, correction eligibility |
| `src/persistence/` | Versioned browser persistence and durable PDF attachment loading | `loadState`, `saveState`, `readDesignFile` |
| `src/app/` | Composition, navigation, demo role selection, durable command execution | `App`, `useFactory` |
| `src/configuration/` | Reusable products, ordered routes and machine lifecycle forms | `ConfigurationView` |
| `src/jobs/` | Shared job create/edit form and retained job details | `JobForm`, `JobDetails` |
| `src/production/` | Machines, Workstation, sortable queues, incoming planning, history and correction controls | View exports, plus local presentation modules |
| `src/dispatch/` | Dispatch confirmation and searchable finished-job history | `DispatchView` |
| `src/receipts/` | Read-only PDF download and printable receipt projection | `downloadReceipt`, `printReceipt` |
| `src/ui/` | Native dialogs, labelled fields, status, sheets and design presentation | `index.jsx` |

The existing visual conventions are retained in `src/styles.css`. New feature styles are in `src/features.css`. The application entry point only mounts the app and imports those stylesheets.

## Domain internals

- `configuration.js`: products, route defaults, machines, references and retirement.
- `jobs.js`: job release, retained product specification, machine plans and permitted edits.
- `lifecycle.js`: Start, Complete and Dispatch.
- `queues.js`: queue normalization, priority and removal of active assignments.
- `corrections.js`: dependency-aware eligibility and Undo. Both UI reasons and execution use the same rule.
- `selectors.js`: current machine/job status and incoming-work projections.
- `events.js`: UUID identities and retained activity records.
- `validation.js`: data/reference invariants and sheet arithmetic.
- `seed.js`: initial factory configuration without fabricated production history.

Other modules import the domain through its entry point. See [module-contract.md](module-contract.md) for payloads and field shapes.

## Important invariants

1. A job occupies at most one executable machine queue. Its current operation follows its retained route; future operations remain Pending.
2. A machine queue contains its ready/running head followed by waiting jobs. A running head cannot be displaced. An idle machine receiving work immediately has a Ready job, requiring explicit Start.
3. Incoming work is a read-only projection of Pending future assignments. It does not reserve executable queue positions or imply an arrival ETA. Reassignment, handoff and Undo automatically change the projection.
4. Actual boxes per sheet is entered and authoritative. Required sheets rounds upward; the sheet-area multiplier never changes yield. Job entry may suggest an area-scaled whole-yield estimate with its ratio shown, but only the entered value is retained.
5. Jobs retain the product specification and design identity present at creation. Operation assignments can change before Start, without changing product defaults. Recorded completion events retain the process/machine names used at that time.
6. Production fields remain locked after any recorded Start, including a corrected Start. Notes/references and unstarted assignments can still change. Dispatched jobs are retained history.
7. Undo is record correction, not physical production reversal. Later Starts on the downstream route or source machine prevent an earlier Complete from being undone, even if that later work was itself completed or corrected. This is deliberately conservative.
8. A permitted Undo Complete removes the unstarted downstream placement and restores the original source operation as Running. Existing unstarted source work returns behind it in the queue. No whole-application snapshot rollback is used.
9. Machines with retained references are retired, not deleted. All current/future assignments and product defaults must be resolved first; a running operation blocks retirement.
10. Completion of manufacturing is distinct from dispatch. Receipts read retained state and never perform a transition.

## Persistence

The single localStorage key is exported as `STORAGE_KEY`. The saved value is a versioned complete state with a revision counter and retained job-number sequence. Attachments contain serializable PDF data, not temporary object URLs. Old designs are retained while jobs reference them.

Absent storage seeds the initial factory once. Malformed or unsupported saved data produces a load error without being replaced. `setItem` is the atomic save point; quota/permission failures do not commit the new UI state. Simultaneous independent tabs/devices are not a supported synchronization model.

Changing the saved shape requires an explicit version/migration decision. Never silently seed over unrecognized saved data. To build the real server-backed application, replace the persistence/execution flow and define concurrency semantics; do not add networking inside the domain rules.

## Adding behavior

1. Read the glossary and spec to preserve domain meaning.
2. Add or extend a command in the domain handler table, with validation and role rules. Keep UI-independent logic behind the domain interface.
3. Add a projection if multiple views need derived information. Do not store redundant counts or incoming lists that can drift from the job plan.
4. Connect the relevant feature view using `onCommand`. Keep dialogs open on `{ ok: false }` and show the supplied message.
5. Extend the browser scenario at the highest observable seam. Use focused public-domain tests for complex correction dependencies and invalid transitions that are cumbersome to establish in the browser. Do not test private helper structure.

The current browser coverage includes the full workflow, PDF text assertions, product/design snapshots, reprioritization/reassignment, owner corrections, machine retirement, storage failure, persistent-profile restart, mobile layout, and incoming planning with visible Undo. The framework-free domain tests cover more dependency permutations.

## Interface copy

UI labels stay minimal and self-evident from context. Behavioral detail lives here and in the specification, not in paragraphs inside the interface: incoming-work ordering and queue-joining rules, retained specifications, undo eligibility and restoration semantics, retirement rules, and the calculated-versus-measured sheet distinction. Validation and correction messages stay short in the UI and actionable where the user must resolve something.

## Prototype boundaries

Role selection is a demonstration interface, not authentication. Unit conversion, partial output, resource-consumption accounting, physical pause/transfer, detailed maintenance management, cross-device persistence, and generic undo are outside scope. No issue tracker or Git repository is required to run or extend this local prototype.
