import { createInitialState, validateState } from "../domain/index.js";

export const STORAGE_KEY = "packaging-factory:v1";
export const MAX_DESIGN_BYTES = 750 * 1024;

export function loadState(storage = window.localStorage) {
  let raw;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    throw new Error("Browser storage is unavailable. Allow local storage and reload to continue.");
  }
  if (raw === null) {
    const initial = createInitialState();
    saveState(initial, storage);
    return initial;
  }
  try {
    const state = JSON.parse(raw);
    validateState(state);
    return state;
  } catch {
    throw new Error("The saved factory data cannot be read or uses an unsupported version. It has not been overwritten. Restore a valid browser backup before continuing.");
  }
}

export function saveState(state, storage = window.localStorage) {
  validateState(state);
  try {
    // A single setItem is atomic: a quota failure preserves the previous dataset.
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    throw new Error("Could not save to this browser. Storage may be full or blocked. Your previous saved data is intact; this change was not applied. Try a smaller design PDF or free browser storage.");
  }
}

export async function readDesignFile(file) {
  if (!file || file.size === 0 || file.size > MAX_DESIGN_BYTES) throw new Error("Choose a non-empty design PDF no larger than 750 KiB.");
  if (!file.name.toLowerCase().endsWith(".pdf")) throw new Error("The design attachment must be a PDF file.");
  const header = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
  if (header !== "%PDF-") throw new Error("This file does not contain a PDF document.");
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^;]*;/, "data:application/pdf;"));
    reader.onerror = () => reject(new Error("The design PDF could not be read. Please select it again."));
    reader.readAsDataURL(file);
  });
  return { id: crypto.randomUUID(), name: file.name, size: file.size, dataUrl };
}
