import { useEffect } from "react";

// Keyboard-only users expect Escape to close any modal/sheet — a common
// accessibility gap when a dialog only offers a backdrop click or X button.
export function useEscapeKey(onClose, active = true) {
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, active]);
}
