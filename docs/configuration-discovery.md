# Product Configuration and Job Workflow Discovery

This extends [workflow-discovery.md](workflow-discovery.md) and records accepted answers Q14–Q29. The calculation and dispatch questions below are resolved. Implementation choices and detailed form rules not explicitly agreed remain unspecified. Application behavior has not been changed.

The subsequent specification request explicitly replaces server-side persistence with localStorage for this demonstration prototype. The consolidated implementation scope is [end-to-end-prototype-spec.md](end-to-end-prototype-spec.md); cross-device server persistence remains a requirement for the future real application.

## Confirmed requirements from the walkthrough

### Reusable products

- Use **Product** in the application; Article means the same thing.
- The owner can create multiple reusable product specifications through configuration.
- For a repeat order, select the existing product rather than creating another product.
- Product specifications include:
  - Product name.
  - Standard reel/sheet size.
  - Cutting size.
  - Number of colors.
  - Special colors.
  - A design PDF attachment.
  - Manufacturing process route, configurable per product; a default route may be offered.
  - Boxes produced per standard sheet.
- Example: XYZ, standard sheet 19 × 36, six colors, special colors Red and Yellow, attached design PDF, four boxes per standard sheet.
- Store dimensions without introducing a unit system for this prototype. Reel size and cutting size represent the two sheet dimensions; the precise width/height labeling has not been specified. Do not build layout inference or unit conversion.
- Whether special colors are included in the color count and required-versus-optional fields remain form details to resolve.

### Jobs

- Select a product and enter the job card information for the production run.
- Enter the ordered number of boxes and actual job sheet size, with job-specific overrides.
- A job sheet size can differ from the product standard without changing the reusable product specification.
- Use a shared create/edit form pattern for jobs. Q23 accepts retaining job-specific production specifications and limiting routine running-job edits to references/notes and unstarted machine assignments; changes to already-used specifications require explicit correction.
- Sales orders supply the metadata entered into a job, including product and quantity. Jobs add production-specific details such as machine assignments. A separate sales-order CRUD/import/integration workflow and order-to-job cardinality have not been requested or established.
- Product-route machine defaults are optional. A job must have a complete machine plan before release to production; defaults prefill it and the owner fills any gaps (Q14).

### Sheet calculation supplied by the user

Agreed calculation (Q18 and Q26):

```text
actual boxes per sheet = value entered for this job
required sheets = ceil(ordered boxes / actual boxes per sheet)
box capacity = required sheets × actual boxes per sheet
sheet area multiplier = actual job sheet area / standard sheet area
```

For 10,000 boxes, a 19 × 36 standard sheet, and four boxes per standard sheet:

| Actual job sheet | Multiplier | Boxes per actual sheet | Required sheets |
| --- | --- | --- | --- |
| 19 × 36 | 1 | 4 | 2,500 |
| 38 × 36 | 2 | 8 | 1,250 |

Q17 states that reel/cutting dimensions and yield information are supplied during job entry. Q26 confirms that entered actual boxes per sheet is authoritative. The area multiplier is supporting information only: it must not override entered yield. This supersedes the original proposal to derive actual yield automatically from area. The application does not need to infer cutting layouts.

Q18 accepts rounding required sheets upward, displaying resulting box capacity, and initially calculating the minimum without wastage allowance. For 10,001 boxes at eight boxes per sheet: 1,251 sheets and capacity for 10,008 boxes.

Calculated sheet quantities are production requirements, not evidence of actual material consumption. Q28 confirms that the initial receipt reports dimensions and calculated required sheets, not an actual-consumption count.

### Process screens and corrugation

- Process/machine views should share a consistent structure.
- Corrugation needs additional job-specific production information, including sheet size and calculated quantities.
- The supplied example process list is Cutting, Printing, Corrugation, Pasting, Punching, Window, Box Pasting, Dispatch.
- Q19 accepts displaying ordered boxes, standard and actual sheet dimensions, standard and actual boxes per sheet, multiplier, and required whole sheets, prominently in Corrugation. No additional corrugation-specific material/layer fields have been requested.
- Q20 says to use the available process information and allow optional processes per product rather than expand unspecified UV-related operations. The supplied pasted list does not name additional UV operations; the existing catalog has UV coating. Do not invent further UV processes.
- Q27 confirms a machine-free final Dispatch stage: completion of the last manufacturing operation makes the job **Ready for dispatch**. An explicit **Mark dispatched** action moves it to finished-job history. Production completion is not itself dispatch confirmation.

### Production receipt

- Use **Production receipt** for the requested document, as the user delegated the label choice.
- Include product/box name (`box_name` if a structured export uses that key), quantity, sheet information, and the other details entered for the job.
- Q28 confirms sheet dimensions and clearly labelled **Calculated required sheets**. Do not label the planned count as actual consumption; no actual-used input is required initially.
- Q29 confirms a downloadable, printable **PDF Production receipt**, including job ID, product name, ordered quantity, sheet details, entered job information, and production/dispatch dates. CSV export is not part of the initial agreed scope.
- The basic finished-job history and receipt are now in scope, superseding their earlier blanket deferral. Do not infer actual consumption from planned requirements.

### Machine history

- Provide an on-demand history view for each machine within its process; history should not dominate the default monitoring screen.
- Show products previously processed on that machine to help choose machines for similar future work and reuse setup where practical.
- The user supplied a scenario with no configured default machine: assign a machine to a job, then consult that machine's history for future assignment decisions.
- Q21 accepts a collapsed History section with completed jobs, product, completion date, and the production specification used. History informs the owner's choice; it does not prove that an old setup is still installed or compatible.

### Corrections

- Users should be able to undo mistakes, including mistaken process/machine execution records.
- Jobs should be editable, including when running.
- Q22 accepts owner-only undo of an erroneous Start or Complete when no dependent work has started, preserving correction history. Corrections involving already-started downstream work are deferred. This corrects records, not physical manufacturing.
- Q23 accepts retaining dimensions, yield, colors, design, route, and machine plan per job. Later product changes do not rewrite existing job specifications or historical operations.

### Machine configuration

- The owner can add, edit, and delete machines as the factory setup changes.
- Configuration remains editable after initial setup.
- Q24 accepts permanently deleting unused machines and retiring machines with production history while preserving that history. Reassign queued work and product defaults before retirement; prevent retirement while work is running.

### Prototype persistence — latest decision supersedes Q25

- Q25 originally required shared server-side persistence. In the specification request, the user explicitly changed the prototype scope to localStorage for a single-browser demonstration.
- Retain configuration, job state/specifications, attachments, histories, and corrections across reloads and browser restarts using localStorage. Owner and workstation views operate on the same local dataset.
- Cross-device synchronization and server-side persistence are future real-application requirements, not deliverables for this prototype. Authentication and server/storage architecture remain future implementation topics.

## Resolved earlier conflicts

1. **Q11 superseded by Q14:** product machine defaults are optional; complete assignments are required before a job enters production.
2. **Q12 clarified by Q22:** owner correction of mistaken records is allowed with dependency limits; physical mid-operation transfers remain out of scope.
3. **Q13 extended by Q23:** retain all job production specifications, not only the route and machine plan.
4. **Receipt deferral superseded by Q20:** basic dispatch history and production receipt are in scope; detailed resource-consumption accounting remains unspecified.
5. **Q25 superseded for the prototype:** use localStorage for the demonstration. Shared server-side persistence remains the intended real-application behavior.

## Final calculation/dispatch answers

- **Q26 accepted:** entered actual boxes per sheet drives the rounded-up requirement; area multiplier is informational.
- **Q27 accepted:** Ready for dispatch → explicit Mark dispatched → finished-job history, without a dispatch machine.
- **Q28 accepted:** receipt shows sheet dimensions and calculated required sheets, not measured consumption.
- **Q29 accepted:** downloadable/printable PDF Production receipt with the agreed job, quantity, sheet, and date information.

## Agreed end-to-end workflow

1. The owner configures machines and reusable products, including specifications, design PDF, ordered process route, and optional default machines.
2. The owner creates a job using sales-order metadata, selecting an existing product and entering the actual sheet dimensions and actual boxes per sheet.
3. The application calculates whole required sheets and resulting box capacity. The owner completes the machine plan before release to production.
4. The job retains its production specification and route independently of future product edits. Each manufacturing operation follows its assigned machine queue, with manual Start and Complete actions and whole-job handoffs.
5. The owner can override unstarted machine assignments. Permitted record corrections retain history; no physical mid-operation transfer or pause/resume workflow is introduced.
6. Machines accumulate on-demand production history containing the specification used. Owner and workstation views share a locally persisted dataset in the demo browser.
7. The last manufacturing completion makes the job Ready for dispatch. Mark dispatched places it in finished-job history with a downloadable, printable PDF Production receipt.

## Additional requirements during implementation

- The owner/operator can click a machine and inspect an on-demand **Incoming work** list before upstream operations finish. Derive this from all active job plans: a job may still be several processes away, running upstream, or waiting upstream. Show count, job/product, current location/status, and remaining operations before arrival.
- Keep incoming planned work distinct from ready/waiting work. Only a completed preceding operation makes the downstream assignment executable. No predicted arrival time or automatic schedule is implied.
- Make owner completion correction discoverable: **Undo previous completion** on job details and **Undo last completion** in the previous machine's details. Eligible correction restores the previous operation to Running and withdraws its unstarted handoff. Downstream/source-machine dependency checks and retained correction history still apply.

Detailed form validation, color-count semantics, and replacement-machine selection rules are addressed or identified as unresolved details in the consolidated spec. Production authentication, server/storage architecture, and cross-device update transport are outside this prototype's scope.
