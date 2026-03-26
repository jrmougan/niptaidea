"use client";

import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { LuBrain, LuSend, LuTimer, LuClapperboard, LuTv, LuMusic, LuUsers, LuGlobe, LuPawPrint, LuUtensils, LuShuffle, LuCircleHelp } from "react-icons/lu";
import type { IconType } from "react-icons";
import ChatMessage from "@/components/ChatMessage";
import ResultScreen from "@/components/ResultScreen";
import { MAX_ATTEMPTS, MAX_ATTEMPTS_BY_DIFFICULTY, GAME_SIGNALS, DIFFICULTIES } from "@/lib/constants";
import { formatTime, getMessageText } from "@/lib/utils";
import { CATEGORIES } from "@/lib/categories";
import { useGameTimer } from "@/hooks/useGameTimer";
import { useTaunts } from "@/hooks/useTaunts";
import { getSeenConcepts, addSeenConcept } from "@/lib/seenConcepts";
import { trackEvent } from "@/lib/analytics";


const CATEGORY_ICONS: Record<string, IconType> = {
  película:  LuClapperboard,
  serie:     LuTv,
  canción:   LuMusic,
  personaje: LuUsers,
  país:      LuGlobe,
  animal:    LuPawPrint,
  plato:     LuUtensils,
};


async function fetchGameResponse(
  messages: { role: string; content: string }[],
  token?: string,
): Promise<string> {
  const uiMessages = messages.map((m, i) => ({
    id: `plain-${i}`,
    role: m.role,
    parts: [{ type: "text" as const, text: m.content }],
  }));
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: uiMessages, ...(token && { token }) }),
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.text();
}

function GameSession({ onRestart, token, category, difficulty }: { onRestart: () => void; token: string; category: string; difficulty: string }) {
  const transport = useMemo(
    () => new TextStreamChatTransport({ api: "/api/chat", body: { token } }),
    [token],
  );

  const maxAttempts = MAX_ATTEMPTS_BY_DIFFICULTY[difficulty] ?? MAX_ATTEMPTS;
  const [inputValue, setInputValue] = useState("");
  const [attempts, setAttempts] = useState(maxAttempts);
  const [lastPlayerMessage, setLastPlayerMessage] = useState<string>("");
  const [gameOver, setGameOver] = useState<"win" | "lose" | null>(null);
  const [revealedConcept, setRevealedConcept] = useState<string>("");
  const [isStarting, setIsStarting] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const startedRef = useRef(false);
  const loseTriggeredRef = useRef(false);
  const finalTimeRef = useRef(0);

  const { elapsed: elapsedSeconds, elapsedRef, idle: idleSeconds, start: startTimer, stop: stopTimer, resetIdle } = useGameTimer();

  const { messages, setMessages, sendMessage, status } = useChat({
    transport,
    onFinish({ message }) {
      const content = getMessageText(message);

      if (/CORRECTO:/i.test(content)) {
        stopTimer();
        finalTimeRef.current = elapsedRef.current;
        const match = content.match(/CORRECTO:\s*(.+)/i);
        if (match) { setRevealedConcept(match[1].trim()); addSeenConcept(match[1].trim()); }
        trackEvent("game_win", { category, difficulty, attempts: maxAttempts - attempts, time_seconds: elapsedRef.current });
        setGameOver("win");
      } else if (/ERA:/i.test(content)) {
        stopTimer();
        finalTimeRef.current = elapsedRef.current;
        const match = content.match(/ERA:\s*(.+)/i);
        if (match) { setRevealedConcept(match[1].trim()); addSeenConcept(match[1].trim()); }
        trackEvent("game_lose", { category, difficulty, attempts: maxAttempts - attempts });
        setGameOver("lose");
      }
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  const { reset: resetTaunts } = useTaunts(idleSeconds, !isStarting && !gameOver, setMessages);

  // Auto-start on mount (once)
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    fetchGameResponse([{ role: "user", content: GAME_SIGNALS.START }], token)
      .then((intro) => {
        setMessages([
          { id: "msg-start", role: "user", parts: [{ type: "text", text: GAME_SIGNALS.START }] },
          { id: "msg-intro", role: "assistant", parts: [{ type: "text", text: intro }] },
        ]);
        setIsStarting(false);
        startTimer();
        trackEvent("game_start", { category, difficulty });
      })
      .catch(() => setIsStarting(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync --app-height CSS variable with visual viewport (handles iOS Safari keyboard)
  useEffect(() => {
    document.documentElement.classList.add("game-active");
    const vv = window.visualViewport;
    const sync = () => {
      const h = vv?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--app-height", `${h}px`);
      window.scrollTo(0, 0);
    };
    sync();
    vv?.addEventListener("resize", sync);
    return () => {
      vv?.removeEventListener("resize", sync);
      document.documentElement.classList.remove("game-active");
      document.documentElement.style.removeProperty("--app-height");
    };
  }, []);

  // Restore focus to input after each AI response
  useEffect(() => {
    if (!isLoading && !isStarting && !gameOver) {
      inputRef.current?.focus();
    }
  }, [isLoading, isStarting, gameOver]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isStarting]);

  // Trigger lose when attempts hit 0
  useEffect(() => {
    if (
      attempts === 0 &&
      !isLoading &&
      !gameOver &&
      !loseTriggeredRef.current &&
      messages.length > 2
    ) {
      const lastMsg = messages[messages.length - 1];
      const isRealAIResponse = lastMsg?.role === "assistant" && !lastMsg.id.startsWith("taunt-");
      if (!isRealAIResponse) return;

      loseTriggeredRef.current = true;

      const history = messages
        .filter((m) => {
          const t = getMessageText(m);
          return t !== GAME_SIGNALS.START && t !== GAME_SIGNALS.PLAYER_LOST && !t.startsWith(GAME_SIGNALS.HINT_REQUESTED);
        })
        .map((m) => ({ role: m.role as string, content: getMessageText(m) }));

      fetchGameResponse(
        [...history, { role: "user", content: GAME_SIGNALS.PLAYER_LOST }],
        token,
      )
        .then((response) => {
          stopTimer();
          finalTimeRef.current = elapsedRef.current;
          const match = response.match(/ERA:\s*(.+)/i);
          if (match) { setRevealedConcept(match[1].trim()); addSeenConcept(match[1].trim()); }
          trackEvent("game_lose", { category, difficulty, attempts: maxAttempts });
          setMessages((prev) => [
            ...prev,
            { id: "msg-game-over", role: "assistant" as const, parts: [{ type: "text" as const, text: response }] },
          ]);
          setGameOver("lose");
        })
        .catch(() => setGameOver("lose"));
    }
  }, [attempts, isLoading, messages, gameOver, token, elapsedSeconds, stopTimer, setMessages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || gameOver || attempts === 0) return;

    const msg = inputValue.trim();
    setInputValue("");
    setLastPlayerMessage(msg);
    setAttempts((prev) => prev - 1);
    resetIdle();
    resetTaunts();
    sendMessage({ text: msg });
  };

  const handleHint = () => {
    if (isLoading || gameOver || attempts <= 1 || isStarting) return;
    const remaining = attempts - 1;
    setAttempts((prev) => prev - 1);
    resetIdle();
    resetTaunts();
    trackEvent("hint_used", { difficulty, attempts_remaining: remaining });
    sendMessage({ text: `${GAME_SIGNALS.HINT_REQUESTED}:${remaining}` });
  };

  if (gameOver) {
    return (
      <ResultScreen
        result={gameOver}
        concept={revealedConcept}
        attemptsUsed={maxAttempts - attempts}
        timeSeconds={finalTimeRef.current}
        difficulty={difficulty}
        onRestart={onRestart}
        lastPlayerGuess={lastPlayerMessage}
      />
    );
  }

  const progressPct = ((maxAttempts - attempts) / maxAttempts) * 100;
  const visibleMessages = messages.filter((m) => {
    const text = getMessageText(m);
    return text !== GAME_SIGNALS.START && text !== GAME_SIGNALS.PLAYER_LOST && !text.startsWith(GAME_SIGNALS.HINT_REQUESTED);
  });

  return (
    <div className="flex flex-col bg-bg-primary fixed inset-x-0 top-0 overflow-hidden h-[var(--app-height,100dvh)]">
      <div className="scanlines fixed inset-0 z-0 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-border-default bg-bg-primary">
        <Link href="/" className="text-accent-orange font-bold text-sm tracking-wide text-glow-orange">
          NiPt<span className="text-accent-teal [text-shadow:none]">AI</span>dea
        </Link>

        <div className="flex items-center gap-4 text-xs font-mono text-content-muted">
          <span>
            {"// q: "}
            <span className="text-content-primary">{String(maxAttempts - attempts).padStart(2, "0")}</span>
            {"/"}<span className="text-accent-orange">{maxAttempts}</span>
          </span>
          <span className="flex items-center gap-1">
            <LuTimer size={12} className={elapsedSeconds > 0 && !isStarting ? "text-accent-teal" : "text-content-dim"} />
            <span className={elapsedSeconds > 0 && !isStarting ? "text-accent-teal" : "text-content-dim"}>
              {formatTime(elapsedSeconds)}
            </span>
          </span>
        </div>

        <button
          onClick={onRestart}
          className="px-3 py-1 border border-accent-orange text-accent-orange text-xs font-mono tracking-widest hover:bg-accent-orange hover:text-bg-primary transition-all"
        >
          [ restart ]
        </button>
      </header>

      {/* Category badge */}
      {!isStarting && (() => {
        const Icon = CATEGORY_ICONS[category.toLowerCase()];
        return (
          <div className="relative z-10 flex justify-center py-2 border-b border-border-default/50">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-teal/10 border border-accent-teal/30 text-accent-teal text-[11px] font-bold font-mono tracking-widest uppercase leading-none">
              {Icon && <span className="flex items-center"><Icon size={11} /></span>}
              <span>{category}</span>
            </span>
          </div>
        );
      })()}

      {/* Messages */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isStarting ? (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full border border-accent-teal/50 bg-bg-secondary flex items-center justify-center text-accent-teal brain-pulse">
              <LuBrain size={16} />
            </div>
            <div className="bg-bg-secondary border border-border-default rounded-sm px-4 py-3 text-sm text-content-muted">
              <span className="cursor-blink">inicializando</span>
            </div>
          </div>
        ) : (
          visibleMessages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
        )}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full border border-accent-teal/50 bg-bg-secondary flex items-center justify-center text-accent-teal brain-pulse">
              <LuBrain size={16} />
            </div>
            <div className="bg-bg-secondary border border-border-default rounded-sm px-4 py-3 text-sm text-content-muted">
              <span className="cursor-blink">pensando</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Progress bar */}
      <div className="relative z-10 px-4 pt-2">
        <div className="flex justify-between text-[10px] text-content-dim mb-1">
          <span>intentos</span>
          <span className={attempts <= 3 ? "text-accent-orange" : "text-content-muted"}>
            {attempts} restantes
          </span>
        </div>
        <div className="h-1 bg-border-default rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${attempts <= 3 ? "bg-accent-orange" : "bg-accent-teal"}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Input */}
      <div className="relative z-10 border-t border-border-default bg-bg-primary px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <button
            type="button"
            onClick={handleHint}
            disabled={isLoading || attempts <= 1 || isStarting || !!gameOver}
            title="Pedir pista (-1 intento)"
            aria-label="Pedir pista (cuesta 1 intento)"
            className="px-3 py-2 border border-accent-teal text-accent-teal text-xs font-mono disabled:opacity-30 hover:bg-accent-teal hover:text-bg-primary transition-all flex items-center gap-1"
          >
            <LuCircleHelp size={14} />
            <span className="hidden sm:inline text-[10px] tracking-wider">NptAIdea(-1)</span>
          </button>
          <div className="flex-1 flex items-center gap-2 bg-bg-secondary border border-border-default rounded-sm px-3 py-2 focus-within:border-accent-teal transition-colors">
            <span className="text-content-dim text-xs select-none">{"//"}</span>
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="pregunta o adivina directamente..."
              disabled={isLoading || attempts === 0 || isStarting}
              className="flex-1 bg-transparent text-[16px] md:text-sm text-content-primary placeholder-content-muted outline-none font-mono"
              aria-label="Escribe una pregunta o tu respuesta"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim() || attempts === 0 || isStarting}
            className="px-4 py-2 bg-accent-orange text-bg-primary text-xs font-bold font-mono tracking-wider disabled:opacity-40 hover:bg-accent-orange-hover transition-colors"
          aria-label="Enviar"
          >
            <LuSend size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}

async function initGame(category?: string, difficulty?: string): Promise<{ token: string; category: string }> {
  const r = await fetch("/api/game/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      seenConcepts: getSeenConcepts(),
      ...(category && { category }),
      ...(difficulty && { difficulty }),
    }),
  });
  const data = await r.json();
  return { token: data.token ?? "", category: data.category ?? "" };
}

const RANDOM_CATEGORY = "__random__";

export default function GamePage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState("medio");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<{ key: number; token: string; category: string; difficulty: string } | null>(null);

  const startGame = () => {
    setLoading(true);
    const categoryArg = selectedCategory && selectedCategory !== RANDOM_CATEGORY ? selectedCategory : undefined;
    initGame(categoryArg, selectedDifficulty)
      .then(({ token, category }) =>
        setSession((s) => ({ key: (s?.key ?? 0) + 1, token, category, difficulty: selectedDifficulty }))
      )
      .catch(() =>
        setSession((s) => ({ key: (s?.key ?? 0) + 1, token: "", category: "", difficulty: selectedDifficulty }))
      );
  };

  // Category + difficulty selector
  if (!loading && !session) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-bg-primary px-4 py-8">
        <div className="scanlines fixed inset-0 z-0 pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-6 font-mono text-center w-full max-w-md">

          {/* Logo */}
          <div className="flex flex-col items-center gap-1">
            <h1 className="text-2xl font-bold text-accent-orange neon-flicker tracking-wide">
              NiPt<span className="text-accent-teal [text-shadow:none]">AI</span>dea
            </h1>
            <p className="text-[11px] text-content-dim tracking-[0.25em]">// select_category</p>
          </div>

          <p className="text-xs text-content-muted leading-relaxed max-w-xs">
            Elige qué quiere que adivine la IA,<br />luego intenta descubrirlo en {MAX_ATTEMPTS} preguntas o menos.
          </p>

          {/* Category grid */}
          <div className="grid grid-cols-4 gap-2 w-full">
            {Object.entries(CATEGORIES).map(([name]) => {
              const Icon = CATEGORY_ICONS[name.toLowerCase()];
              const isSelected = selectedCategory === name;
              return (
                <button
                  key={name}
                  onClick={() => setSelectedCategory(isSelected ? null : name)}
                  className={`flex flex-col items-center gap-2 px-2 py-3 border transition-all ${
                    isSelected
                      ? "border-accent-orange bg-accent-orange/10 text-accent-orange"
                      : "border-border-default bg-bg-secondary text-content-muted hover:border-border-default/80 hover:text-content-primary"
                  }`}
                >
                  {Icon && <Icon size={18} />}
                  <span className="text-[10px] tracking-wider uppercase leading-none">{name}</span>
                </button>
              );
            })}
            {/* Sorpréndeme — ocupa el espacio restante en la última fila */}
            <button
              onClick={() => setSelectedCategory(selectedCategory === RANDOM_CATEGORY ? null : RANDOM_CATEGORY)}
              className={`col-span-3 flex items-center justify-center gap-2 px-3 py-3 border transition-all text-xs tracking-wider ${
                selectedCategory === RANDOM_CATEGORY
                  ? "border-accent-orange bg-accent-orange/10 text-accent-orange"
                  : "border-border-default bg-bg-secondary text-content-muted hover:text-content-primary"
              }`}
            >
              <LuShuffle size={14} />
              Sorpréndeme
            </button>
          </div>

          {/* Difficulty */}
          <div className="w-full flex flex-col gap-3">
            <p className="text-[11px] text-content-dim tracking-[0.25em]">// difficulty_level</p>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTIES.map(({ key, label, desc }) => (
                <button
                  key={key}
                  onClick={() => setSelectedDifficulty(key)}
                  className={`flex flex-col items-center gap-1 px-2 py-3 border transition-all ${
                    selectedDifficulty === key
                      ? "border-accent-teal text-accent-teal bg-accent-teal/5"
                      : "border-border-default text-content-muted hover:border-border-default/80 hover:text-content-primary"
                  }`}
                >
                  <span className="text-[11px] font-bold tracking-widest">[{label}]</span>
                  <span className="text-[9px] text-content-dim leading-tight">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Start button */}
          <button
            onClick={startGame}
            disabled={!selectedCategory}
            className="w-full py-3 bg-accent-orange text-bg-primary text-sm font-bold tracking-wider disabled:opacity-30 hover:bg-accent-orange-hover transition-colors"
          >
            {`> start_game(${!selectedCategory || selectedCategory === RANDOM_CATEGORY ? "random" : selectedCategory.toLowerCase()}, ${selectedDifficulty})`}
          </button>
        </div>
      </div>
    );
  }

  // Loading screen
  if (!session) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-bg-primary">
        <div className="scanlines fixed inset-0 z-0 pointer-events-none" />
        <div className="flex flex-col items-center gap-6 font-mono text-center px-4">
          <div className="w-16 h-16 rounded-full border border-accent-teal/40 bg-bg-secondary text-accent-teal brain-pulse flex items-center justify-center">
            <LuBrain size={28} />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs text-accent-teal tracking-[0.3em] uppercase">concepto seleccionado</p>
            <p className="text-2xl font-bold text-accent-orange neon-flicker tracking-widest">[ 🤔 ]</p>
            <p className="text-xs text-content-dim mt-1">¡No leas mi mente!</p>
          </div>
          <span className="text-content-muted text-sm cursor-blink">preparando partida</span>
        </div>
      </div>
    );
  }

  const handleRestart = () => {
    setSession(null);
    setSelectedCategory(null);
    setLoading(false);
  };

  return (
    <GameSession
      key={session.key}
      token={session.token}
      category={session.category}
      difficulty={session.difficulty}
      onRestart={handleRestart}
    />
  );
}
