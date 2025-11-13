// src/components/Navbar.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  return (
    <header className="bg-white border-b">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold">
            ⛽ Estación
          </Link>

          <nav className="hidden md:flex gap-3 text-sm">
            <Link href="/tanques">Tanques</Link>
            <Link href="/mangueras">Mangueras</Link>
            <Link href="/turno-abierto">Turno abierto</Link>
            <Link href="/cerrar">Cerrar turno</Link>
            <Link href="/cerrados">Historial</Link>
            <Link href="/estadisticas">Estadísticas</Link>
            {/* 🧾 Nuevo link: Cierre diario */}
            <Link href="/cierre-diario">Cierre diario</Link>
            <Link href="/recepcion-camion" className="font-semibold text-blue-600">
              🚛 Recepción
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="text-sm">{user.email}</span>
              <button
                className="rounded-lg border px-3 py-2 text-sm"
                onClick={() => signOut(auth)}
              >
                Salir
              </button>
            </>
          ) : (
            <Link href="/login" className="rounded-lg border px-3 py-2 text-sm">
              Ingresar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
