# Packaging Factory Monitor

A React/Vite demonstration of packaging production, from reusable product configuration to machine queues, dispatch and PDF production receipts. Data is retained in **localStorage in the same browser and origin**. The future real application's shared server storage is outside this prototype.

## Run

```sh
npm install
npm run dev
```

Open the URL printed by Vite. Restart an already-running development server after installing dependencies or changing the Vite configuration.

## Demonstrate the workflow

1. **Configuration:** inspect or edit the three sample products, or create your own. Set standard reel/cutting dimensions, standard yield, colors, optional design PDF, ordered processes and optional default machines. Add/edit machines by process.
2. **New job:** choose a product and enter sales-order information, ordered boxes, actual sheet dimensions and actual boxes per sheet. Complete every machine assignment and release the job.
3. **Machines / Workstation:** explicitly Start and Mark done. Both views use identical domain transitions. Workers follow queue order; the owner and workstation supervisor can reprioritize unstarted work.
4. **Incoming work:** click a machine name or its queue/details control, then expand **Incoming work**. Jobs still at earlier processes are shown with their current location/status. They are not startable until they reach that operation.
5. **Correct a mistaken completion:** open the job and use **Undo previous completion**, or open the source machine's details and use **Undo last completion**. The job returns to the previous machine as Running, and its unstarted downstream handoff is removed. The button explains when later work prevents correction. Undo Start remains in job activity/machine history.
6. **Dispatch & history:** manufacturing completion places the job in Ready for dispatch. Mark dispatched explicitly, then download the PDF receipt or print it. The receipt labels the sheet quantity as a calculated requirement, not consumption.

Job specifications and designs are retained independently of later product edits. The initial dataset has eight processes, 11 machines, three products and **no invented jobs**. Configuration and production survive refresh and browser restart. Clearing this site's browser storage removes the local demo data.

Design attachments must be PDFs, at most **750 KiB each**. The app reports storage-capacity failures and leaves the previous saved state intact. It never reports an unsaved command as successful.

## Checks

```sh
yarn run lint --fix
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

- Domain/persistence tests exercise public interfaces using Node's test runner.
- Browser tests exercise configuration through receipts, incoming planning, correction dependencies, mobile layout, storage failures and a real browser-profile restart.
- Playwright starts a dedicated Vite server on port **4185** and keeps failure traces under `test-results/`.

## Extend the application

- [Domain glossary](CONTEXT.md)
- [Consolidated specification](docs/end-to-end-prototype-spec.md)
- [Module architecture and change guide](docs/architecture.md)
- [Public interface and state contract](docs/module-contract.md)
- [Discovery decisions](docs/configuration-discovery.md)
