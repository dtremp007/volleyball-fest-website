import type { Viewport } from "@xyflow/react";
import { useCallback, useState } from "react";

function isViewport(value: unknown): value is Viewport {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<Viewport>;
  return (
    typeof candidate.x === "number" &&
    Number.isFinite(candidate.x) &&
    typeof candidate.y === "number" &&
    Number.isFinite(candidate.y) &&
    typeof candidate.zoom === "number" &&
    Number.isFinite(candidate.zoom)
  );
}

function readViewport(storageKey: string) {
  if (typeof window === "undefined") return null;

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    if (!rawValue) return null;

    const parsedValue: unknown = JSON.parse(rawValue);
    return isViewport(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

export function useGraphViewportStorage(storageKey: string) {
  const [initialViewport] = useState(() => readViewport(storageKey));

  const saveViewport = useCallback(
    (viewport: Viewport) => {
      if (typeof window === "undefined") return;

      window.localStorage.setItem(storageKey, JSON.stringify(viewport));
    },
    [storageKey],
  );

  return {
    initialViewport,
    saveViewport,
    hasStoredViewport: Boolean(initialViewport),
  };
}
