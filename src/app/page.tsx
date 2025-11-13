'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getOpenShift } from '../lib/firestore';
import type { Shift } from '@/lib/types';

export default function HomePage() {
  const [shift, setShift] = useState<Shift | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await getOpenShift();
      setShift(s);
      setReady(true);
    })();
  }, []);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Estado del turno */}
      <div className="card bg-white rounded-2xl shadow p-4">
        <h2 className="text-lg font-semibold mb-2">Estado del turno</h2>

        {!ready ? (
          <div className="h-16 rounded-lg bg-gray-100 animate-pulse" />
        ) : shift ? (
          <>
            <p className="text-sm">
              Turno abierto desde:{' '}
              {new Date(shift.openedAt).toLocaleString()}
            </p>
            <Link href="/(turnos)/cerrar" className="btn mt-3 rounded-lg border px-3 py-2 text-sm">
              Ir a Cerrar Turno
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm">No hay turno abierto.</p>
            <Link href="/(turnos)/turno-abierto" className="btn mt-3 rounded-lg border px-3 py-2 text-sm">
              Abrir turno nuevo
            </Link>
          </>
        )}
      </div>

      {/* Atajos */}
      <div className="card bg-white rounded-2xl shadow p-4">
        <h2 className="text-lg font-semibold mb-2">Atajos</h2>
        <div className="flex flex-wrap gap-2">
          <Link className="btn rounded-lg border px-3 py-2 text-sm" href="/(mediciones)/tanques">
            Medir Tanques
          </Link>
          <Link className="btn rounded-lg border px-3 py-2 text-sm" href="/(mediciones)/mangueras">
            Medir Mangueras
          </Link>
          <Link className="btn rounded-lg border px-3 py-2 text-sm" href="/(reportes)/estadisticas">
            Ver Estadísticas
          </Link>
        </div>
      </div>
    </div>
  );
}
