import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk, Sora, Orbitron } from "next/font/google";
import { Providers } from "@/core/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Syncronize — Plataforma SaaS para tu negocio",
  description:
    "Gestiona ventas, inventario, compras, RRHH y tu tienda online desde una sola plataforma. Empieza gratis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${sora.variable} ${orbitron.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
