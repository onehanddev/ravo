# Packaging Factory Workflow Discovery

## Status

Discovery interview started on 2026-10-13. Answers Q1–Q13 are recorded below as the initial baseline. [configuration-discovery.md](configuration-discovery.md) records Q14–Q29 and takes precedence where later answers revise that baseline: optional product machine defaults, constrained owner corrections, retained job specifications, entered sheet yield, explicit dispatch confirmation, PDF receipts, and shared server-side persistence. Recommendations and unanswered questions are not accepted requirements.

**Latest scope correction:** the user subsequently chose localStorage for the demonstration prototype. Shared server-side persistence applies to the future real app. See [end-to-end-prototype-spec.md](end-to-end-prototype-spec.md) for the consolidated current scope; it takes precedence over historical interview answers.

**Implementation follow-up:** machines must expose future assigned **Incoming work** before upstream completion, separately from their executable queues. Completion Undo must be visible from job details and the source machine's expanded details. These additions are specified in the consolidated spec and configuration discovery document.

The source review was read-only; the behaviors below were traced in code, not verified in a browser. This session has not changed application behavior.

## Confirmed by the user

- The application is a prototype for a specific packaging-factory owner, used to demonstrate and agree on the eventual workflow.
- The owner needs an at-a-glance view of processes, machines, the jobs on those machines, and their queues.
- A job is an end-to-end production task. Different packaging products require different processes.
- The workstation audience is department supervisors and/or workers who update production status.
- Starting queued work is part of the desired operational workflow. The initial mention of stopping was explicitly superseded in answer Q7: there will be no pause or stop action for now.
- The next demonstration should explain the end-to-end workflow, including how its data is introduced, beginning with an owner-facing configuration screen. Product routes and their machine assignments belong in configuration; the detailed screen workflow is still to come.
- Remove the Jobs tab and older URL-only dashboard, retaining Machines, Workstation, and access to job details.

See [CONTEXT.md](../CONTEXT.md) for agreed domain terminology. A department corresponds to one process. The owner/head is responsible for configuration and job creation; customer/order fields have not yet been agreed.

## Observed implementation

All application logic and seed data live in `src/main.jsx`; presentation lives in `src/styles.css`.

### Views

| View | URL | Current behavior |
| --- | --- | --- |
| Machines | `?variant=B` (default) | Machine groups, active jobs, per-machine queues, queue reordering, start/complete actions, assignment of unassigned work, job creation |
| Jobs | `?variant=C` (second tab) | Jobs grouped by process plus a completed lane; shared job-detail dialog |
| Workstation | `?variant=D` | Department selection and machine cards with Start job or Mark done |
| Older Packaging floor dashboard | `?variant=A` (no tab) | Alternative machine layout, product-route preview, static Product Setup summary |

Sources: `src/main.jsx:222-312`, `390-625`.

### Factory and product data

- Eight hard-coded process groups: Reel cutting, Corrugation, Printing, UV coating, Sheet pasting, Punching, Window patching, and Box pasting.
- Eleven machines, initially containing nine running jobs and 21 queued jobs; one machine is idle and another is in maintenance.
- A machine group also serves as a department and a process. These are not independently modeled.
- Three hard-coded products have fixed sequential routes:
  - Printed folding carton: Reel cutting → Printing → Punching → Box pasting.
  - Window carton: Reel cutting → Printing → UV coating → Punching → Window patching → Box pasting.
  - Corrugated mailer: Corrugation → Sheet pasting → Punching → Box pasting.
- There is no functional configuration editor. The older dashboard's Product Setup section is display-only.
- Some groups have a `required` flag, but it is unused and does not establish a manufacturing rule.

Sources: `src/main.jsx:25-107`, `280-308`.

### Job creation and execution

1. New job asks for an existing product, quantity, and a machine for its first process.
2. Creation appends the job to that machine's queue.
3. A ready current job can be started manually.
4. Completion moves the whole job onward and promotes the source machine's queue head to ready, or leaves the source machine idle if its queue is empty.
5. Completion at the final process puts the job in the completed collection.

Two different handoff policies currently coexist:

- **Machines:** completion sends work directly to a selected next-process machine's queue.
- **Workstation:** completion sends work to an unassigned next-department pool. Assignment happens later in Machines.

Queue order can be changed within a machine. There is no cross-machine queue move. Workstation displays waiting counts but does not let operators select a waiting job or assign department work.

Sources: `src/main.jsx:135-220`, `315-349`, `445-575`.

### Limits of the demonstration

- Start and Mark done exist; pause, resume, breakdown reporting, and maintenance transitions do not.
- Completion transfers the entire quantity unchanged. There is no partial output, scrap, remaining quantity, or batch splitting.
- Routes have no per-job edits, branches, repeated processes, or recorded rework.
- There is no role enforcement or operator identification.
- Production data lives in memory and resets on refresh; there is no backend or shared multiuser state.
- Progress and ETA values are placeholders rather than measurements.
- Earlier route steps are displayed as completed based on the current route position, not a recorded operation history.
- WIP counts are inconsistent across views and primarily describe waiting work rather than all unfinished production.
- Customer/order references, due dates, and priorities are absent from job creation.

Sources: `src/main.jsx:114-220`, `315-384`, `390-625`.

## Source-derived defects to revisit during implementation

These are observed code problems, not proposed domain rules:

- **Idle machine cannot start an enqueued job:** creating work on an idle machine adds a queue item without making it the ready current job. The UI exposes no action to promote it. Direct downstream machine assignment has the same issue (`src/main.jsx:156-220`, `494-495`, `539-545`).
- **Downstream selection can become stale:** the selected destination in an open queue panel is not reset when the promoted job needs a different next process. Completion can therefore send it to the wrong process (`src/main.jsx:156-170`, `528-543`).
- **Job IDs can be reused:** new IDs consider jobs on machines but exclude unassigned and completed jobs (`src/main.jsx:209-215`).

## First interview: confirmed decisions

### Q1 — Views

Accepted the recommendation: retain Machines and Workstation, remove the Jobs tab and older `?variant=A` dashboard, and preserve job details accessible from Machines. A future finished-job/receipt view is a separate, deferred requirement.

### Q2 — Departments and processes

Keep one process per department. Treat the two as equivalent groupings for this application, even if a physical department might perform multiple processes. Do not introduce a separate multi-process department hierarchy.

### Q3 — Product routes

Different products require different routes. Define and change those routes in the forthcoming configuration screen, after this discovery session. Q13 confirms that configuration changes affect new jobs only. General per-job process-route editing has not been requested; the agreed job-level override is machine reassignment before an operation starts.

### Q4 — Configuration and creation ownership

Although anyone can currently create a job, the intended workflow gives configuration and job creation to the owner/head. Retain a separate view for the people performing production work. Customer/order references, due dates, authentication, and detailed role enforcement have not been decided.

### Q5 — Configured machine path

Configure each product's required processes and associated machine assignments in advance. For example, product ABC can specify which machine handles its first process, and which machines handle subsequent processes. Normal routing should follow this configured path rather than require a fresh assignment at every handoff.

The user did not accept the proposed default unassigned department pool. Q11 confirms exactly one designated machine per product-route step, with an owner override when necessary.

### Q6 — Queue discipline and owner rerouting

Generally accept the recommendation: workers start the first queued job; the owner or supervisor can change priority; the first assigned job on an empty, available machine becomes ready and requires an explicit Start action.

Follow the configured product-machine path normally. The owner can move unstarted work to another machine when the planned machine is not working. Q12 excludes mid-operation transfers. Q13 distinguishes a job-specific override from a permanent product configuration change. Detailed replacement-machine selection rules remain part of the configuration/assignment walkthrough.

### Q7 — No pause or stop

For now, once a job starts a process on a machine, it remains running until done. Do not add pause, stop, or resume actions. This supersedes the initial description that workers could stop work. Q12 explicitly excludes mid-operation machine failure handling and transfers from this prototype's scope.

### Q8 — Whole-job handoffs

Accepted the recommendation to keep whole-job handoffs for the first end-to-end prototype. Do not introduce partial transfers or overlapping production of portions of the same job in this scope. Detailed consumption/output accounting has not been decided.

### Q9 — Owner production controls

The owner must retain the ability to start and complete work, even though floor staff will usually perform these actions. Machines is therefore both a monitoring and control surface. No pause/stop action is implied by this decision.

### Q10 — Data continuity and eventual production receipts

Retain configuration and production data throughout the workflow, through job completion. The user also wants a future view of finished jobs and their production receipts, potentially including resources consumed, but explicitly deferred designing this feature.

Completion must not be interpreted as permission to discard the job's production information. Browser-local versus shared persistence, refresh/restart guarantees, reset behavior, and receipt contents remain undecided. The earlier suggestion of local storage plus Reset demo was not explicitly accepted.

## Routing follow-up: confirmed decisions

### Q11 — Exactly one machine per step

Each product-route step designates exactly one machine, such as Printer 1. The owner can override that assignment when necessary. Do not introduce a configured list of eligible alternatives as an accepted requirement.

**Superseded by Q14:** product machine defaults are optional; complete job assignments are required before release to production.

### Q12 — Running-job transfers are out of scope

Machine failure after an operation starts is an exception outside this prototype's scope. Owner reassignment applies to work that has not started its current operation. No pause, stop, partial-progress transfer, or mid-operation recovery workflow is required.

**Clarified by Q22–Q23:** owner corrections of erroneous Start/Complete actions are allowed when no dependent work has started, with correction history retained. Routine running-job edits are limited to references/notes and unstarted machine assignments. Physical mid-operation transfer remains out of scope.

### Q13 — Existing jobs retain their plan

A job retains the product route and machine plan established when it is created. Later product configuration changes apply to newly created jobs, not existing jobs.

The owner can explicitly override an existing job's machine assignment before that operation starts. For a permanent change to the product's route or machine plan, the owner edits product configuration. A job-specific override does not itself change the product configuration or other jobs.

## Remaining topics for the workflow walkthrough

- **Configuration walkthrough:** See [configuration-discovery.md](configuration-discovery.md) for the supplied product fields, sheet examples, machine history, undo/edit requests, and current interview questions.
- **Replacement selection:** Detail which machines can be selected for an owner override; do not infer a configured eligibility list.
- **Persistence superseded after Q29:** localStorage is sufficient for this demonstration prototype. Shared server-side persistence across devices remains a future real-app requirement.

## Explicitly deferred

- Mid-operation machine failure handling and transfers are outside the current prototype scope.
- Detailed resource-consumption accounting beyond the basic receipt requested in Q20.

**Q20 and Q27–Q29 scope update:** finished-job history follows explicit, machine-free dispatch confirmation. A downloadable/printable PDF Production receipt includes job ID, product/box name, ordered quantity, sheet dimensions, calculated required sheets, entered job details, and production/dispatch dates. Actual material consumption tracking is not part of the initial receipt.

## Documentation practice

- Record confirmed retain/change decisions here as the interview progresses.
- Add resolved domain terms to `CONTEXT.md`, keeping that file a glossary only.
- Create an ADR only for an agreed, costly-to-reverse decision with a meaningful trade-off; none has been established yet.

## Tooling observation

`package.json` currently defines `dev`, `build`, and `preview`, but no lint or test script. The global instruction to run `yarn run lint --fix` therefore has no matching project script.
