# Packaging Factory Operations

The domain is production work in a packaging factory, with visibility for the factory owner and operational updates from the factory floor.

## Language

**Factory owner**:
The person responsible for the packaging factory who needs visibility into its processes, machines, active jobs, and waiting work.

**Job**:
An end-to-end production task for a packaging product, using sales-order metadata together with a production specification, process route, and machine plan.

**Sales order**:
The source of a job's customer-order information, including the requested product and box quantity. A job adds the production-specific details needed to carry out that order.

**Process**:
A manufacturing operation needed to produce a packaging product, such as printing or punching.

**Department**:
A factory work area corresponding to exactly one process in the agreed model. Department and process are treated as a one-to-one pairing even if the physical factory groups work differently.

**Product**:
A reusable specification for a type of packaging box manufactured by the factory, including its standard dimensions, design, sheet yield, and production route.
_Avoid_: Article (the same concept; use Product in the application)

**Product route**:
The configured, ordered path of processes used to produce a product, together with its machine plan.

**Job route**:
The product route and machine plan retained for an individual job when it is created. Later product configuration changes do not alter it; the owner can override a machine assignment before that operation starts.

**Machine**:
A physical production resource on which manufacturing work is performed.

**Machine queue**:
The ordered collection of jobs waiting to run on a particular machine.

**Incoming work**:
Jobs whose retained machine plan includes a future operation on a particular machine, but which are still at an earlier operation. Incoming work is visible for planning before the preceding operation finishes and becomes ready or waiting work only when its turn in the route arrives.

**Standard sheet size**:
The reference sheet dimensions in a product specification, associated with the product's standard boxes-per-sheet yield.

**Job sheet size**:
The actual sheet dimensions selected for an individual production job, which may differ from the product's standard sheet size.

**Boxes per standard sheet**:
The number of boxes produced from one sheet of the product's standard sheet size.

**Actual boxes per sheet**:
The job-specific number of boxes produced from one actual job sheet, supplied during job entry and used to calculate required sheets. Job entry may suggest an area-scaled estimate when the job sheet size changes; the entered value remains authoritative.

**Required sheets**:
The minimum whole-sheet quantity needed for a job's ordered box quantity at its entered actual boxes-per-sheet yield. This is a calculated requirement, not measured material consumption.

**Dispatch**:
The machine-free final stage of a job, where completed manufacturing work awaits explicit dispatch confirmation before entering finished-job history.

**Production receipt**:
A job's production document containing its identity, product name, ordered quantity, sheet dimensions, calculated required sheets, job-entry details, and production/dispatch dates.

**Workstation view**:
The operational view through which a department supervisor or worker updates the status of production work or a machine.
