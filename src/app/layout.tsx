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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
