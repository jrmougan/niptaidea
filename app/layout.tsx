import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { MAX_ATTEMPTS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "NiPtAIdea — ¿Puedes adivinar lo que piensa la IA?",
  description: `Juego de adivinanza con IA sarcástica. Tienes ${MAX_ATTEMPTS} preguntas para descubrir el concepto secreto.`,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
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
      {process.env.NEXT_PUBLIC_UMAMI_URL && process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
        <Script
          src={`${process.env.NEXT_PUBLIC_UMAMI_URL}/script.js`}
          data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
          strategy="afterInteractive"
        />
      )}
    </html>
  );
}
