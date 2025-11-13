'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type TankDoc = {
  id: string;
  nombre?: string;
  producto?: string;
  combustible?: string;
  stockActualLitros?: number;
  stockLitros?: number;
  stockMinimoLitros?: number;
};

function resolveStock(d: TankDoc): number | undefined {
  if (typeof d.stockActualLitros === 'number') return d.stockActualLitros;
  if (typeof d.stockLitros === 'number') return d.stockLitros;
  return undefined;
}

export default function StockSummary() {
  const [tanks, setTanks] = useState<TankDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr('');
        const snap = await getDocs(collection(db, 'tanks'));
        if (!alive) return;
        const rows: TankDoc[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            nombre: data.nombre ?? data.name ?? d.id,
            producto: data.producto,
            combustible: data.combustible,
            stockActualLitros:
              typeof data.stockActualLitros === 'number'
                ? data.stockActualLitros
                : undefined,
            stockLitros:
              typeof data.stockLitros === 'number'
                ? data.stockLitros
                : undefined,
            stockMinimoLitros:
              typeof data.stockMinimoLitros === 'number'
                ? data.stockMinimoLitros
                : undefined,
          };
        });

        setTanks(rows);
      } catch (e: any) {
        console.error(e);
        if (!alive) return;
        setErr(e?.message || 'Error al leer tanques');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl p-4 bg-white shadow text-sm text-gray-500">
        Cargando stock de tanques…
      </div>
    );
  }

  if (err) {
    return (
      <div className="rounded-2xl p-4 bg-red-50 text-red-700 shadow">
        <div className="font-semibold mb-1">No pude cargar los tanques</div>
        <div className="text-sm break-words">{err}</div>
      </div>
    );
  }

  if (!tanks.length) {
    return (
      <div className="rounded-2xl p-4 bg-white shadow text-sm text-gray-500">
        No hay tanques registrados todavía.
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-4 bg-white shadow space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Stock actual por tanque</h2>
        <span className="text-xs text-gray-500">
          Origen: campo stockActualLitros / stockLitros en colección
          &nbsp;<code>tanks</code>
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-2 px-2">Tanque</th>
              <th className="text-left py-2 px-2">Producto</th>
              <th className="text-right py-2 px-2">Stock actual (L)</th>
              <th className="text-right py-2 px-2">Stock mínimo (L)</th>
              <th className="text-right py-2 px-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {tanks.map((t) => {
              const stock = resolveStock(t);
              const min = t.stockMinimoLitros;
              const isCritical =
                typeof stock === 'number' &&
                typeof min === 'number' &&
                stock <= min;

              return (
                <tr
                  key={t.id}
                  className="border-b last:border-0 hover:bg-gray-50/60"
                >
                  <td className="py-2 px-2">
                    {t.nombre || t.id}
                    {t.combustible && (
                      <span className="ml-1 text-[10px] uppercase text-gray-500">
                        ({t.combustible})
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    {t.producto || t.combustible || '—'}
                  </td>
                  <td className="py-2 px-2 text-right">
                    {typeof stock === 'number'
                      ? stock.toLocaleString('es-AR', {
                          maximumFractionDigits: 0,
                        })
                      : '—'}
                  </td>
                  <td className="py-2 px-2 text-right">
                    {typeof min === 'number'
                      ? min.toLocaleString('es-AR', {
                          maximumFractionDigits: 0,
                        })
                      : '—'}
                  </td>
                  <td className="py-2 px-2 text-right">
                    {isCritical ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-[11px] font-medium text-red-700">
                        Crítico
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-[11px] font-medium text-emerald-700">
                        OK
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
