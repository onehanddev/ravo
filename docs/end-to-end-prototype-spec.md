# Packaging Factory: End-to-End Manufacturing Prototype

## Problem Statement

The factory owner needs to understand what is happening across a packaging factory: which processes and machines are working, which jobs are running, what is waiting, and what has finished. Supervisors and workers need a straightforward way to update production so the owner can trust that view.

The current prototype starts with hard-coded machines, products, routes, and jobs. It demonstrates monitoring but not where production data comes from. There is no functional configuration workflow, job-specific sheet calculation, durable history, dispatch confirmation, or production receipt. Refreshing loses operational changes, and the owner and workstation completion actions route work differently.

The owner needs a coherent demonstration from reusable product setup through job creation, manufacturing, dispatch, and retained history. The demo must also handle common recording mistakes without misrepresenting physical production.

## Solution

Provide a locally persisted, end-to-end prototype in which the owner configures machines and reusable Products, creates Jobs from sales-order information, completes their machine plans, and monitors execution. Workers use Workstation to start and complete operations. Both views share the same workflow and local dataset.

Each job retains its production specification and route. Its entered actual boxes per sheet determines the required whole-sheet quantity, with additional visibility in Corrugation. The owner can adjust unstarted machine assignments, inspect machine history, and correct eligible mistaken actions. After manufacturing, an explicit dispatch confirmation places the job in finished history with a printable/downloadable PDF Production receipt.

Use localStorage to retain the demonstration across refreshes and browser restarts. Cross-device server persistence is intended for the real application, but is explicitly excluded from this prototype.

## User Stories

1. As a factory owner, I want a configuration screen, so that I can establish the factory setup before demonstrating production.
2. As a factory owner, I want to create multiple reusable products, so that repeated orders do not require reentering product specifications.
3. As a factory owner, I want the application to use the term Product, so that the same concept has a consistent name throughout the workflow.
4. As a factory owner, I want to enter a product name and standard sheet dimensions, so that its production specification is recognizable and reusable.
5. As a factory owner, I want reel and cutting dimensions captured without unit conversion, so that I can demonstrate the factory's supplied measurements simply.
6. As a factory owner, I want to record the number of colors and special colors, so that production staff can see the printing requirements.
7. As a factory owner, I want to attach and reopen a design PDF, so that the product design is available during planning and production.
8. As a factory owner, I want to record boxes per standard sheet, so that the product's reference yield is available for later jobs.
9. As a factory owner, I want to select and order a product's manufacturing processes, so that different products follow their required routes.
10. As a factory owner, I want to omit unnecessary processes from a product route, so that simpler products do not pass through irrelevant operations.
11. As a factory owner, I want optional default machines for route steps, so that common assignments can be reused without preventing incomplete product setup.
12. As a factory owner, I want to edit a product configuration, so that future jobs use updated specifications and machine defaults.
13. As a factory owner, I want existing jobs to retain their specifications after product edits, so that ongoing production and historical records remain accurate.
14. As a factory owner, I want to add machines to their processes, so that the demonstration reflects the available factory resources.
15. As a factory owner, I want to edit machine details, so that the configured factory can evolve after initial setup.
16. As a factory owner, I want to delete unused machines, so that mistaken configuration entries can be removed.
17. As a factory owner, I want to retire machines with history, so that they stop receiving new work without erasing prior production.
18. As a factory owner, I want unresolved machine references and running work identified before retirement, so that jobs and product defaults are not left pointing at unavailable resources.
19. As a factory owner, I want to select an existing product when creating a job, so that repeat sales orders reuse its specification.
20. As a factory owner, I want to enter sales-order metadata and ordered box quantity, so that a job reflects the customer's production requirement.
21. As a factory owner, I want to choose actual job sheet dimensions independently of the product standard, so that one production run can use a different sheet.
22. As a factory owner, I want to enter actual boxes per sheet, so that required sheets reflect the supplied production yield rather than an assumed layout.
23. As a factory owner, I want required sheets rounded upward, so that the planned quantity can cover the ordered boxes.
24. As a factory owner, I want to see resulting box capacity, so that excess capacity from whole-sheet rounding is visible.
25. As a factory owner, I want to see the sheet-area multiplier as supporting information, so that I can compare standard and actual dimensions without overriding the entered yield.
26. As a factory owner, I want product machine defaults to prefill a job's plan, so that creating repeat work is efficient.
27. As a factory owner, I want to fill missing machine assignments before releasing a job, so that every manufacturing operation has a destination.
28. As a factory owner, I want a newly assigned job on an empty available machine to become ready, so that it can be started without becoming stuck in a waiting queue.
29. As a factory owner, I want to see processes, machines, current jobs, and ordered queues together, so that I can understand the factory's workload at a glance.
30. As a factory owner, I want job details accessible from the machine view, so that I can inspect a job without relying on the old Jobs board.
31. As a factory owner or supervisor, I want to change machine queue priority, so that production can follow operational priorities.
32. As a worker, I want to view the machines in my department, so that I can act on the relevant work.
33. As a worker, I want to start the first ready job explicitly, so that queued work is not reported as running before production begins.
34. As a worker, I want to mark an operation complete, so that the whole job can advance to its next planned machine.
35. As a factory owner, I want the same Start and Complete controls, so that I can update production when necessary.
36. As a factory owner, I want completion to follow the same routing rules from either view, so that job destinations do not depend on who clicked Complete.
37. As a factory owner, I want to move an unstarted operation to another suitable machine in its process, so that work can continue when the planned machine is unavailable.
38. As a factory owner, I want a job-specific reassignment to leave product defaults and other jobs unchanged, so that an exception does not become a permanent configuration change.
39. As a corrugation worker, I want ordered boxes, standard and actual sheet details, yields, multiplier, and required sheets displayed prominently, so that I know the job's production requirement.
40. As a factory owner, I want an on-demand history section for each machine, so that completed work is available without overwhelming the monitoring screen.
41. As a factory owner, I want machine history to show products, completion dates, and the specifications used, so that I can judge whether a machine is a useful choice for similar work.
42. As a factory owner, I want to undo an erroneous Start when no dependent work has begun, so that an accidental click can be corrected.
43. As a factory owner, I want to undo an erroneous Complete when dependencies permit, so that a mistaken handoff can be corrected without duplicating or losing the job.
44. As a factory owner, I want corrections to remain visible in history, so that the current state does not erase the fact that a correction occurred.
45. As a factory owner, I want one consistent create/edit job form, so that entering and maintaining job information feels familiar.
46. As a factory owner, I want to update running-job references or notes and unstarted assignments, so that routine edits do not rewrite already-used production specifications.
47. As a factory owner, I want finished manufacturing work to wait in Ready for dispatch, so that manufacturing completion is distinguished from shipping confirmation.
48. As an authorized dispatch user, I want an explicit Mark dispatched action, so that finished history reflects confirmed dispatch rather than automatic manufacturing completion.
49. As a factory owner, I want a retained list of dispatched jobs, so that I can find completed work after it leaves the factory floor.
50. As a factory owner, I want to download and print a Production receipt, so that a job has a readable production and dispatch document.
51. As a factory owner, I want the receipt to show job identity, product name, ordered quantity, sheet information, entered job details, and production/dispatch dates, so that the document contains the relevant production record.
52. As a factory owner, I want calculated required sheets clearly labelled, so that a planned requirement is not mistaken for measured material consumption.
53. As a demonstrator, I want configuration, attachments, jobs, queues, histories, and corrections to survive refresh and browser restart, so that I can continue a demonstration without recreating its data.
54. As a demonstrator, I want switching between owner and workstation views to use the same locally retained state, so that operational changes are immediately visible within the demo.
55. As a demonstrator, I want the old Jobs tab and alternative dashboard removed, so that the presentation focuses on the agreed workflow.
56. As a factory owner or machine operator, I want to open a machine's incoming-work list before upstream operations finish, so that I can anticipate all jobs planned to reach that machine.
57. As a machine operator, I want incoming work to show its current process, machine and running/ready/waiting status, so that I can distinguish work already underway from work waiting upstream.
58. As a factory owner, I want a clearly visible Undo previous completion action on a job and Undo last completion in the previous machine's details, so that I can move an incorrectly completed operation back without searching through history.

## Implementation Decisions

### Scope and existing application

- Extend the existing React/Vite prototype and its established styling, icons, dialogs, and sortable machine queues. Preserve useful existing UI rather than create an unrelated application.
- Retain Machines and Workstation, with job details accessible from Machines. Remove the old process-lane Jobs tab and URL-only alternative dashboard. Add owner configuration, Dispatch, and finished-job/receipt access; these need not each be separate top-level tabs.
- Department and Process are a one-to-one pairing. Use the current process catalog as the starting point: Reel cutting, Corrugation, Printing, UV coating, Sheet pasting, Punching, Window patching, and Box pasting. Product routes select and order applicable operations. Do not invent additional UV operations from the informal reference to them.
- Dispatch is a machine-free terminal stage, not a configurable manufacturing machine. Manufacturing routes must not demand a dispatch-machine assignment.
- Owner/head owns configuration and job creation, and may execute production actions. Workstation supports production updates for supervisors/workers. Present these responsibilities in the demo views without introducing a production authentication system.

### Logical modules and interfaces

- Establish one shared application-level workflow model used by both owner and workstation views. It owns configuration, job creation/editing, assignments, queue ordering, Start, Complete, eligible Undo, and Dispatch transitions. Views must not implement divergent handoff rules.
- Add a local persistence boundary for loading and saving that model, including durable attachment content. Keep storage mechanics separate from manufacturing rules so a future application can replace local persistence without redefining the workflow.
- Add a receipt projection/export capability that reads the retained job specification and recorded dates. Export is read-only and must not mark a job dispatched as a side effect.
- Model stable identities independently of labels and queue positions. Product, machine, job, operation/history, and attachment identities must remain unique even when records leave active queues or machines are retired.
- No server API, database schema, synchronization service, or production deployment architecture is required by this specification.

### Product and machine configuration

- Products store name, standard sheet dimensions represented by reel/cutting inputs, standard boxes-per-sheet yield, color count, special colors, design PDF, and an ordered manufacturing route with optional default-machine assignments.
- Store dimensions as numeric values without unit conversion. Do not invent a width/height mapping beyond the agreed two dimensions; use Reel size and Cutting size as input labels where appropriate. Calculations use their product for area.
- Standard boxes per sheet and color count are distinct fields. Record special colors independently; the conversation did not settle whether they are included in the total color count, so do not infer or auto-adjust that count.
- A route step has at most one default machine, belonging to that process. A blank default is allowed for a product. Do not add configured lists of eligible alternatives or capability-matching logic.
- The owner can select a different available, non-retired machine within the same process for an unstarted job operation. Assigning a running machine adds waiting work; it does not replace its current job. Preserve the existing exclusion of machines marked unavailable/maintenance without expanding maintenance into a new lifecycle feature.
- Permit deletion only when no retained references need the machine. Retire machines with production history; preserve their identity and history, reassign queued/ready work and product defaults, and resolve outstanding future job-plan references before retirement. A running operation prevents retirement.
- Editing a machine must not silently change the meaning of its existing history or strand assigned operations in a different process.

### Job entry, retained specification, and calculation

- A Job adds production-specific details to sales-order metadata. Use a product selection, ordered box quantity, job sheet dimensions, actual boxes per sheet, and complete manufacturing machine plan as the required production inputs. Preserve any supplied order references/notes in the job and receipt; do not require a separate sales-order application or external integration.
- Product defaults prefill the job specification and machine plan. Any missing assignments must be resolved before release to production. A separate draft-management feature is not required.
- Retain a job-specific copy/version of its product name, standard specification, design reference/content, route, actual sheet details, yield, and machine plan. Later product edits must not retroactively alter existing jobs or their receipts. Replacing a product design must not destroy the design used by an existing job.
- Actual boxes per sheet is entered by the user and is authoritative. Required sheets equals ordered box quantity divided by actual boxes per sheet, rounded upward. Box capacity equals required sheets multiplied by actual boxes per sheet. No wastage allowance is included initially.
- Sheet-area multiplier equals job sheet area divided by standard sheet area and is informational only. Do not calculate or overwrite the entered yield from area, infer layout fit, or calculate tooling/trim efficiency.
- Validate positive, finite dimensions and positive whole ordered quantities/yields before releasing work or calculating a valid requirement. Prevent division by zero and invalid calculated output. This is an implementation validation proposal, not a new unit or manufacturing-layout model.
- Example acceptance values: 10,000 boxes at four boxes per sheet require 2,500 sheets; at eight boxes per sheet require 1,250 sheets; 10,001 boxes at eight boxes per sheet require 1,251 sheets with capacity for 10,008 boxes.
- Corrugation prominently displays ordered boxes, standard/job dimensions, standard/actual yield, informational multiplier, and required sheets. These fields remain available in job details for other processes.

### Execution, queues, and reassignment

- Manufacturing operations follow the retained sequential job route. Release the first operation to its planned machine. Each Complete transfers the whole job to the next planned machine; there is no default unassigned department pool.
- When work reaches an empty available machine, it becomes Ready. Otherwise it appends to the waiting queue. Start is always explicit; completion promotes the source machine's next waiting job to Ready, or makes the machine Idle if nothing waits.
- Workers follow the first ready job. Owners/supervisors can reprioritize waiting work using the existing queue interaction. Unstarted job operations can be reassigned by the owner; running operations cannot be physically transferred.
- Keep one current operation per machine and one active route position per job. A running job must not simultaneously appear in another active machine queue. Future machine assignments are plans, not prematurely executable downstream work.
- **Incoming-work planning (added during implementation):** clicking a machine exposes an on-demand Incoming work list and count, derived from all active jobs with a pending future operation assigned to it. Include upstream running, ready, and waiting jobs, regardless of how many operations remain before arrival. Show job identity/product, quantity, current process/machine/status, and operations before arrival. This is available in Machines and Workstation, not forced onto the default overview.
- Incoming work is separate from the executable ready/waiting queue. It cannot be started prematurely and is not included in waiting-queue counts. It follows current job-level assignments, refreshes after reassignments/completions/corrections, and uses job-entry order rather than inventing an arrival schedule or ETA.
- Revalidate job, process, and machine at action time so an old selection cannot send the next product to the previous product's destination. A malformed or missing route must not be interpreted as successful completion.
- There is no pause, stop, resume, split-lot, partial transfer, parallel route execution, or physical mid-operation breakdown recovery.
- Existing progress and ETA values are demonstration placeholders, not measured production. The new workflow must not present them as measured facts; calculating real progress or scheduling ETAs is outside scope.

### Editing, correction, and machine history

- Reuse the job-entry interaction for editing. Once work is running, routine edits are limited to references/notes and unstarted machine assignments. Retained production specifications and completed operations must not be silently rewritten by the edit form.
- Owner-only Undo may correct an erroneous Start or Complete when no dependent work has started. Preserve an explicit correction record and restore a coherent machine/job/queue state.
- Expose completion correction directly on owner job details and in the source machine's expanded details, as well as in the detailed activity history. Explain in the confirmation that the job returns to the previous machine as Running and its unstarted downstream handoff is withdrawn. Display a disabled action with the eligibility reason when dependent work prevents undo.
- Evaluate dependencies on both the job's downstream operations and the source machine: undoing a completion must not overwrite another job that has since started on that source machine. If affected subsequent work has started, refuse the simple undo with an understandable explanation.
- Restoring a mistaken completion must withdraw any unstarted downstream handoff and restore the source operation consistently, without duplicate queues or a false successful history entry. Undo Start corrects an erroneous record; it is not a production Pause action.
- General undo of every configuration change, queue reorder, dispatch, or historical edit is not implied. More complex corrections to already-used production specifications require explicit design and are not implemented as unrestricted editing in this scope.
- Record actual operation completion dates and the specification used. Machine history is initially collapsed and exposes completed jobs/products and relevant details. Preserve correction history while distinguishing corrected records from effective completions.
- Machine history informs assignment; it does not automatically guarantee that an old setup remains installed or compatible.

### Dispatch, history, and receipt

- Completing the last manufacturing operation places the job in Ready for dispatch. An explicit Mark dispatched action records dispatch and moves it into finished-job history. At minimum the owner can perform this action; extending it to floor roles is not specified.
- Machine operation history is independent of final dispatch: a machine's completed work can appear in its history while the job continues through later operations.
- Finished jobs remain retained and inspectable. Their PDF Production receipts include job ID, product/box name, ordered quantity, actual sheet dimensions, calculated required sheets, entered job details, and recorded production/dispatch dates.
- Label the sheet count as Calculated required sheets. It is not measured consumption and must not be presented as such. No actual-used sheet entry, wastage tracking, or comprehensive material-consumption accounting is included.
- Support PDF download and print using retained job information after reload. CSV is not required. Receipt generation does not require embedding the full design PDF; the design remains accessible with the job.

### LocalStorage persistence

- The user's final scope change supersedes the earlier server-side requirement for this prototype. Persist one coherent, versioned local dataset with configuration, jobs and their retained specifications, queues, histories, corrections, dispatch state, and serializable design attachments.
- Durable PDF content must survive reload; an in-memory object URL alone is insufficient. Retain attachment content once by stable identity where practical so repeated jobs can reference the original retained design without needless duplication.
- Load saved data before initializing demonstration defaults. Seed only when no saved dataset exists; refreshing must never repopulate removed work or replace saved configuration.
- LocalStorage has finite capacity, particularly for PDF attachments. Set an explicit supported attachment limit during implementation and report save/quota failures visibly rather than claiming data was saved or discarding the last valid dataset. No exact upload size was agreed in discovery.
- Owner and workstation views in the same demo browser use the same live model. Independent devices, browser profiles, and simultaneous multi-tab conflict resolution are outside this prototype's synchronization contract.
- No automatic deletion occurs at job completion or dispatch. No reset-demo control was agreed; adding one is not required by this spec.

## Testing Decisions

- **Primary proposed seam:** browser-level acceptance tests at the application UI, covering the persisted workflow from configuration through dispatch. This is the highest existing integration boundary and exercises the same controls used in the demonstration. It is proposed for user confirmation, not represented as already approved.
- A good test asserts externally observable behavior: displayed calculations, job location, allowed actions, visible history, persisted documents, and generated receipt contents. It must not depend on component names, hook state, private functions, or internal storage-object layouts.
- Exercise configuration, job entry/editing, machine queues, workstation execution, correction rules, local persistence, and receipt export through this single seam. Use two views of the same browser session for owner/worker demonstrations; a backend or cross-device test harness is unnecessary.
- There is no existing authored test suite, test runner configuration, or test script in the current prototype. Existing interaction patterns—product selection, job dialog, department selection, machine queues, and drag ordering—provide behavior to extend but no automated-test prior art. A browser harness such as Playwright is a proposed implementation tool, not an installed dependency or an already-made tooling decision.
- Create products and machines through the UI, leave product defaults blank, and verify that job release requires the missing machine assignments. Create another job using an existing product and verify no duplicate product is required.
- Verify the three numerical examples above, invalid inputs, and a case where entered yield differs from the area-derived suggestion. The entered value must win, including after save/reload and in the PDF.
- Verify a released job on an idle machine is Ready and startable; a busy destination queues it; manual completion follows the same path from Machines and Workstation; queue ordering determines the next ready job.
- Run two products with different next processes consecutively on the same machine to guard against the existing stale-destination defect. Verify unrelated operations cannot be started before their predecessors finish.
- Change product dimensions, route defaults, and design after creating a job. Verify the existing job/history/receipt retain their original information while a new job receives the new specification.
- Reassign an unstarted operation and verify its old queue/plan no longer contains the assignment, its new destination is correct, and product defaults/other jobs are unchanged. Verify physical reassignment is unavailable once that operation is running.
- Test eligible Undo Start and Undo Complete, including reload afterward. Verify corrected histories, no duplicate job, and restored queue/machine state. Test refusal after either downstream work or another affected source-machine job has started.
- Verify restricted running-job edits cannot rewrite a used specification, while permitted notes/reference and future assignment edits remain available.
- Verify multiple upstream jobs appear in a downstream machine's Incoming work view before any reaches that machine, with accurate current status and no Start action. Verify reassignment updates the projection, arrival removes the job from incoming and makes it ready/waiting, and eligible Undo restores the incoming projection and previous-machine Running state. Verify both owner and workstation access.
- Verify machine deletion/retirement preserves histories and references and cannot strand queued work or remove a running machine.
- Complete manufacturing and verify Ready for dispatch without automatic entry into finished history. Mark dispatched, reload, and verify the retained job and downloadable PDF with the correct dates and calculated-sheet label. Repeated dispatch must not create duplicate records.
- Upload a small design PDF, close/reopen the browser using the same persistent profile, and verify the configuration, attachment, active jobs, queues, corrected history, and dispatched receipt remain accessible. Refresh alone is not sufficient to prove attachment durability.
- Exercise storage failure with a browser-controlled failure condition and verify the user sees a failed save rather than false persistence success. Inspect the visible receipt and its text, not byte-for-byte PDF output or pixel-perfect layout snapshots.
- Do not create additional low-level test seams by default. Introduce focused tests only if an externally observable failure cannot reasonably be covered at this seam.

## Out of Scope

- Server-side persistence, cross-device synchronization, production database/API design, concurrent multi-user operation, and production authentication. These remain future real-application requirements.
- A separate sales-order management system, ERP integration, import pipeline, or assumed multi-product order model.
- Automatic sheet-layout inference, geometric nesting, unit conversion, actual consumption measurement, setup wastage allowances, and detailed material inventory accounting.
- Partial job quantities, split lots, parallel processes, rework routes, pause/resume, and physical transfers after an operation starts.
- Unrestricted rollback after dependent production has begun, silent rewriting of historical specifications, and a generic undo engine for all application changes.
- CSV export, unspecified additional UV operations, detailed corrugation material/layer calculations, automatic setup-compatibility matching, and automatic machine scheduling.
- A new maintenance/breakdown management workflow, computed live progress percentages, or real ETA prediction.
- Restoring the old Jobs board or alternative dashboard, and an unrequested reset-demo feature.

## Further Notes

- This specification consolidates the completed discovery conversation. It takes precedence where historical answers conflict, particularly optional product machine defaults, supplied actual yield, constrained corrections, explicit Dispatch, PDF receipts, and the final switch to localStorage for the prototype.
- The current implementation is a frontend-only React/Vite prototype with hard-coded data and in-memory transitions. Existing source-derived gaps include stranded work on idle machines, stale next-machine selection, and job IDs calculated from only part of the active dataset. The acceptance scenarios above require these to be resolved as part of the end-to-end workflow.
- The project domain glossary supplies the canonical terms. No architecture decision records or configured issue tracker/triage vocabulary were found during this synthesis.
- The user accepted a local specification and authorized implementation without an issue tracker. No publication or applied tracker label is required or claimed.
- Implementation uses browser-level acceptance scenarios as the primary workflow seam, with focused public-domain tests for correction dependencies and persistence failure tests. The original test-plan wording above records the planning baseline; current interfaces and commands are documented in the architecture and module-contract documents.
- Implementation added lint, domain/persistence test, browser-test, and production-build checks. The initial absence of tooling has been resolved.
