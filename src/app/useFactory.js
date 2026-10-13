import { useRef, useState } from "react";
import { applyCommand } from "../domain/index.js";
import { loadState, saveState } from "../persistence/index.js";

export function useFactory() {
  const [initial] = useState(() => {
    try { return { state: loadState(), error: null }; }
    catch (error) { return { state: null, error: error.message }; }
  });
  const [state, setState] = useState(initial.state);
  const current = useRef(initial.state);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("");

  function command(action, actor = "owner") {
    try {
      const next = applyCommand(current.current, action, { actor });
      saveState(next);
      // Commit UI state only after a durable save. No effect-driven partial save.
      current.current = next;
      setState(next);
      setError(null);
      setMessage("Changes saved in this browser.");
      return { ok: true, state: next };
    } catch (failure) {
      setError(failure.message);
      setMessage("");
      return { ok: false, error: failure.message };
    }
  }
  return { state, command, error, message, loadError: initial.error, dismissError: () => setError(null) };
}
