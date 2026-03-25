"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useGameTimer() {
  const [elapsed, setElapsed] = useState(0);
  const [idle, setIdle] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setElapsed((s) => s + 1);
      setIdle((s) => s + 1);
    }, 1000);
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetIdle = useCallback(() => setIdle(0), []);

  // Always-current ref — safe to read inside async callbacks (avoids stale closure)
  const elapsedRef = useRef(0);
  useEffect(() => { elapsedRef.current = elapsed; }, [elapsed]);

  // Cleanup on unmount
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return { elapsed, elapsedRef, idle, start, stop, resetIdle };
}
