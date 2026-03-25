"use client";

import { useCallback, useEffect, useRef } from "react";
import type { UIMessage } from "ai";
import { TAUNT_THRESHOLDS } from "@/lib/constants";

type SetMessages = (updater: (prev: UIMessage[]) => UIMessage[]) => void;

export function useTaunts(idleSeconds: number, active: boolean, setMessages: SetMessages) {
  const shownRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!active) return;
    for (const taunt of TAUNT_THRESHOLDS) {
      if (idleSeconds >= taunt.seconds && !shownRef.current.has(taunt.seconds)) {
        shownRef.current.add(taunt.seconds);
        setMessages((prev) => [
          ...prev,
          {
            id: `taunt-${taunt.seconds}-${Date.now()}`,
            role: "assistant" as const,
            parts: [{ type: "text" as const, text: taunt.message }],
          },
        ]);
      }
    }
  }, [idleSeconds, active, setMessages]);

  const reset = useCallback(() => {
    shownRef.current = new Set();
  }, []);

  return { reset };
}
