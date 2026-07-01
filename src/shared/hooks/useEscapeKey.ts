import { useEffect } from "react";

export function useEscapeKey(onEscape: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onEscape();
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [enabled, onEscape]);
}
