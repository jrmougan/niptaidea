import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex flex-col flex-1 items-center justify-center min-h-screen overflow-hidden">
      {/* Scanlines overlay */}
      <div className="scanlines fixed inset-0 z-0 pointer-events-none" />

      {/* Subtle grid background */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#26a69a 1px, transparent 1px), linear-gradient(90deg, #26a69a 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 px-4 text-center max-w-2xl w-full">
        {/* Brain icon */}
        <div className="flex items-center justify-center w-16 h-16 rounded-full border border-[#26a69a]/40 bg-[#1e1e1e] text-[#26a69a] text-3xl glow-teal">
          🧠
        </div>

        {/* Title */}
        <div className="flex flex-col gap-2">
          <h1 className="text-5xl font-bold tracking-tight text-glow-orange" style={{ color: "#e05a2b" }}>
            NiP_t_aIdea
          </h1>
          <p className="text-sm text-[#888] font-mono tracking-widest">
            // can you guess what the AI is thinking?
          </p>
        </div>

        {/* CTA Button */}
        <Link
          href="/game"
          className="px-8 py-3 border-2 border-[#e05a2b] text-[#e05a2b] font-mono text-sm tracking-widest uppercase hover:bg-[#e05a2b] hover:text-[#141414] transition-all duration-200 glow-orange"
        >
          [ start_game ]
        </Link>

        {/* How to play */}
        <div className="mt-4 w-full">
          <p className="text-xs text-[#26a69a] tracking-[0.3em] uppercase mb-6 text-glow-teal">
            HOW_TO_PLAY
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                num: "01",
                icon: "🧠",
                text: "AI thinks of something",
              },
              {
                num: "02",
                icon: "💬",
                text: "You ask yes/no questions",
              },
              {
                num: "03",
                icon: "❓",
                text: "Guess before 15 questions run out",
              },
            ].map((step) => (
              <div
                key={step.num}
                className="flex flex-col items-center gap-2 p-4 border border-[#2e2e2e] bg-[#1e1e1e] rounded-sm"
              >
                <span className="text-[#e05a2b] text-lg font-bold">{step.num}</span>
                <span className="text-2xl">{step.icon}</span>
                <p className="text-[#888] text-xs leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-[#555] mt-4">
          © NiP_t_aIdea — powered by Gemini 1.5 Flash
        </p>
      </div>
    </main>
  );
}
