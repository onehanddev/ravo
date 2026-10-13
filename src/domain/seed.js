import { newId } from "./events.js";

export function createInitialState() {
  const catalog = [
    ["Reel cutting", ["Reel cutter 1", "Reel cutter 2"]],
    ["Corrugation", ["Corrugator 1"]],
    ["Printing", ["Printing press 1", "Printing press 2"]],
    ["UV coating", ["UV machine 1"]],
    ["Sheet pasting", ["Paster 1"]],
    ["Punching", ["Punch press 1", "Punch press 2"]],
    ["Window patching", ["Window machine 1"]],
    ["Box pasting", ["Box paster 1"]],
  ];
  const processes = catalog.map(([name]) => ({ id: newId(), name }));
  const machines = catalog.flatMap(([, names], index) => names.map((name) => ({
    id: newId(), name, processId: processes[index].id,
    availability: name === "Punch press 2" ? "maintenance" : "available", retired: false, queue: [],
  })));
  const samples = [
    { name: "Printed folding carton", standardSheet: { reelSize: 100, cuttingSize: 70 }, boxesPerStandardSheet: 4, numberOfColors: 4, steps: [0, 2, 5, 7] },
    { name: "Window carton", standardSheet: { reelSize: 90, cuttingSize: 65 }, boxesPerStandardSheet: 6, numberOfColors: 4, steps: [0, 2, 3, 5, 6, 7] },
    { name: "Corrugated mailer", standardSheet: { reelSize: 120, cuttingSize: 80 }, boxesPerStandardSheet: 2, numberOfColors: 0, steps: [1, 4, 5, 7] },
  ];
  const products = samples.map(({ steps, ...sample }) => ({
    id: newId(), ...sample, specialColors: "", designId: null,
    route: steps.map((index) => ({ processId: processes[index].id, machineId: machines.find((machine) => machine.processId === processes[index].id && machine.availability === "available").id })),
  }));
  return { version: 1, revision: 0, nextJobNumber: 1001, processes, machines, products, jobs: [], attachments: [], events: [] };
}
