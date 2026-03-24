import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NiP_t_aIdea — ¿Puedes adivinar lo que piensa la IA?",
  description:
    "Juego de adivinanza con IA sarcástica. Tienes 15 preguntas para descubrir el concepto secreto.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col bg-[#141414] text-[#f0f0f0] font-mono">
        {children}
      </body>
    </html>
  );
}
