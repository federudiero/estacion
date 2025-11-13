import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import Navbar from "../components/Navbar";

export const metadata: Metadata = {
  title: "Estación de Servicio",
  description: "Control de stock, turnos y ventas",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // Podés alternar entre "theme-ink" (índigo) y "theme-emerald" (verde elegante)
  const theme = "theme-emerald";

  return (
    <html lang="es">
      <body>
        {/* 🔹 Este div aplica el tema global */}
        <div className={theme}>
          {/* 🔹 .surface define el fondo, tipografía y antialias */}
          <div className="surface min-h-screen">
            <Navbar />
            <main className="container py-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
