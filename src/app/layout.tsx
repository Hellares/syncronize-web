import type { Metadata } from "next";
import { Orbitron } from "next/font/google";
import { Providers } from "@/core/providers";
import "./globals.css";

// Fuente principal de toda la web: Amazon Ember (definida vía @font-face +
// --font-sans en globals.css). Solo Orbitron se carga aparte (titulares landing).
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
        className={`${orbitron.variable} antialiased`}
      >
        {/*
          Las dos caras que usa TODA la interfaz, precargadas.

          🔴 Sin esto el .ttf recien se pide cuando algo lo necesita, y con
          `font-display: swap` ese texto se dibuja mientras tanto con la fuente
          del sistema. Se notaba sobre todo en los TITULOS de los dialogos: son
          `font-bold`, o sea la cara Bold (69 KB en woff2), que en una pantalla sin
          negritas todavia no estaba descargada y aparecia en Segoe UI.

          React 19 sube estos <link> al <head> solo. Van los dos pesos que
          cubren casi todo: Medium (350-599, el cuerpo) y Bold (600-1000).
        */}
        <link rel="preload" href="/fonts/AmazonEmber-Medium.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/AmazonEmber-Bold.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
