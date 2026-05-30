import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

const SHOW_DELAY_MS = 120;
const COMPLETE_HIDE_MS = 250;
const TICK_MS = 180;

function randomInRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function selectIsNavigating(state: {
  isLoading: boolean;
  matches: Array<{ status: string }>;
}) {
  return state.isLoading || state.matches.some((match) => match.status === "pending");
}

export function NavigationProgress() {
  const isPending = useRouterState({ select: selectIsNavigating });

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const showDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasBeenIdleRef = useRef(false);

  useEffect(() => {
    const clearShowDelay = () => {
      if (showDelayRef.current) {
        clearTimeout(showDelayRef.current);
        showDelayRef.current = null;
      }
    };

    const clearTick = () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };

    const clearHide = () => {
      if (hideRef.current) {
        clearTimeout(hideRef.current);
        hideRef.current = null;
      }
    };

    if (!isPending) {
      if (!hasBeenIdleRef.current) {
        hasBeenIdleRef.current = true;
        return;
      }

      clearShowDelay();
      clearTick();

      setProgress(100);
      clearHide();
      hideRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, COMPLETE_HIDE_MS);

      return () => {
        clearHide();
      };
    }

    if (!hasBeenIdleRef.current) {
      return;
    }

    clearHide();
    clearShowDelay();
    clearTick();

    showDelayRef.current = setTimeout(() => {
      setVisible(true);
      setProgress((current) => (current > 0 ? current : randomInRange(18, 32)));

      tickRef.current = setInterval(() => {
        setProgress((current) => {
          if (current >= 90) return current;
          return Math.min(90, current + randomInRange(2, 8));
        });
      }, TICK_MS);
    }, SHOW_DELAY_MS);

    return () => {
      clearShowDelay();
      clearTick();
    };
  }, [isPending]);

  if (!visible && progress === 0) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden"
      aria-hidden
    >
      <div
        className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.65)] transition-[width] duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
