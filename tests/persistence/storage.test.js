import { test } from "node:test";
import assert from "node:assert/strict";
import { loadState, saveState, STORAGE_KEY } from "../../src/persistence/index.js";
import { applyCommand } from "../../src/domain/index.js";

function memoryStorage(initial = null) {
  let value = initial;
  return { getItem: () => value, setItem: (key, next) => { assert.equal(key, STORAGE_KEY); value = next; } };
}

test("first load seeds once and subsequent loads preserve edits and identities", () => {
  const storage = memoryStorage();
  const initial = loadState(storage);
  const updated = applyCommand(initial, { type: "machine.save", machine: { name: "Extra cutter", processId: initial.processes[0].id } });
  saveState(updated, storage);
  assert.deepEqual(loadState(storage), updated);
  assert.equal(loadState(storage).machines.at(-1).name, "Extra cutter");
});

test("unreadable or unsupported saved data is not replaced by defaults", () => {
  for (const raw of ["{broken", JSON.stringify({ version: 99 }), JSON.stringify({ version: 1, revision: 0 })]) {
    const storage = memoryStorage(raw);
    assert.throws(() => loadState(storage), /not been overwritten/);
    assert.equal(storage.getItem(STORAGE_KEY), raw);
  }
});

test("failed writes preserve the last saved dataset", () => {
  const storage = memoryStorage();
  const initial = loadState(storage);
  const previous = storage.getItem(STORAGE_KEY);
  storage.setItem = () => { throw new Error("QuotaExceededError"); };
  assert.throws(() => saveState({ ...initial, revision: 1 }, storage), /change was not applied/);
  assert.equal(storage.getItem(STORAGE_KEY), previous);
});
