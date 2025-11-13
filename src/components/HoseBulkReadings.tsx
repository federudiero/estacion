'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getHoseShiftMap,
  listHoses,
  setHoseEnd,
  setHoseStart,
  ensureDefaultHoses,
  type HoseDef,
} from '@/lib/firestore';
import type { Combustible } from '@/lib/types';

type HoseState = {
  lecturaInicialLitros?: number;
  lecturaFinalLitros?: number;
  combustible: Combustible;
};

export default function HoseBulkReadings({ shiftId }: { shiftId: string }) {
  const [hoses, setHoses] = useState<HoseDef[]>([]);
  const [rows, setRows] = useState<Record<string, HoseState>>({});
  const [valores, setValores] = useState<Record<string, number | ''>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        let defs = await listHoses();
        if (!defs.length) {
          await ensureDefaultHoses();
          defs = await listHoses();
        }
        defs.sort((a, b) => {
          const [ia, ma] = parseIslandAndManga(a.id);
          const [ib, mb] = parseIslandAndManga(b.id);
          return ia !== ib ? ia - ib : ma - mb;
        });
        setHoses(defs);
        setRows(await getHoseShiftMap(shiftId));
      } catch (e: any) {
        setErr(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [shiftId]);

  const grouped = useMemo(() => groupByIsland(hoses), [hoses]);

  async function guardar(h: HoseDef) {
    const v = valores[h.id];
    const litros = v === '' ? 0 : Number(v);
    const ya = rows[h.id];

    if (!ya || ya.lecturaInicialLitros == null) {
      await setHoseStart({ shiftId, hoseId: h.id, combustible: h.combustible, litros });
      setRows(o => ({ ...o, [h.id]: { ...(o[h.id] || { combustible: h.combustible }), lecturaInicialLitros: litros } }));
    } else {
      await setHoseEnd({ shiftId, hoseId: h.id, litros });
      setRows(o => ({ ...o, [h.id]: { ...(o[h.id] || { combustible: h.combustible }), lecturaFinalLitros: litros } }));
    }
    setValores(o => ({ ...o, [h.id]: '' }));
  }

  if (loading) return <div className="bg-white rounded-2xl shadow p-4">Cargando…</div>;
  if (err) return <div className="bg-white rounded-2xl shadow p-4 text-red-600">{err}</div>;

  const islandColors: Record<number, string> = {
    1: 'border-blue-400 bg-blue-50/50',
    2: 'border-green-400 bg-green-50/50',
    3: 'border-yellow-400 bg-yellow-50/50',
    4: 'border-pink-400 bg-pink-50/50',
  };

  return (
    <div className="bg-white rounded-2xl shadow p-4 space-y-6">
      <h2 className="text-lg font-semibold mb-2">Lecturas de mangueras (L)</h2>

      {([1, 2, 3, 4] as const).map(isla => {
        const items = grouped[isla] || [];
        const color = islandColors[isla];
        return (
          <section key={isla} className={`rounded-xl border-2 ${color} p-4 space-y-3`}>
            <div className="flex items-center justify-between border-b border-gray-300 pb-1">
              <h3 className="font-semibold text-base">
                🏝️ Isla {isla}
              </h3>
              <span className="text-xs opacity-70">{items.length} mangueras</span>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
              {items.map(h => {
                const st = rows[h.id];
                const modo = !st || st.lecturaInicialLitros == null ? 'Inicial' : 'Final';
                const hint =
                  modo === 'Inicial'
                    ? 'Lectura inicial (L)'
                    : `Lectura final (L) • Inicial: ${st?.lecturaInicialLitros ?? '-'} L`;
                return (
                  <div key={h.id} className="rounded-xl border bg-white/80 p-3 space-y-2 shadow-sm hover:shadow transition">
                    <div className="text-sm">
                      <div className="font-medium">{h.nombre}</div>
                      <div className="opacity-70 capitalize">{labelComb(h.combustible)}</div>
                      {st && (
                        <div className="text-xs opacity-60">
                          Ini: {st.lecturaInicialLitros ?? '-'} · Fin: {st.lecturaFinalLitros ?? '-'}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder={hint}
                        className="w-full rounded-lg border px-3 py-2"
                        value={valores[h.id] ?? ''}
                        onChange={e =>
                          setValores(o => ({
                            ...o,
                            [h.id]: e.target.value === '' ? '' : Number(e.target.value),
                          }))
                        }
                      />
                      <button
                        className={`rounded-lg px-3 py-2 text-sm font-medium text-white ${
                          modo === 'Inicial' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-emerald-500 hover:bg-emerald-600'
                        }`}
                        onClick={() => guardar(h)}
                      >
                        Guardar {modo}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* ---------- helpers ---------- */

function parseIslandAndManga(hoseId: string): [number, number] {
  const m = /^I(\d+)M(\d+)$/.exec(hoseId.trim());
  return [m ? parseInt(m[1], 10) : 0, m ? parseInt(m[2], 10) : 0];
}

function groupByIsland(list: HoseDef[]): Record<number, HoseDef[]> {
  const grouped: Record<number, HoseDef[]> = {};
  for (const h of list) {
    const [isla] = parseIslandAndManga(h.id);
    if (!grouped[isla]) grouped[isla] = [];
    grouped[isla].push(h);
  }
  Object.values(grouped).forEach(arr =>
    arr.sort((a, b) => parseIslandAndManga(a.id)[1] - parseIslandAndManga(b.id)[1])
  );
  return grouped;
}

function labelComb(c: Combustible) {
  switch (c) {
    case 'nafta_super':
      return 'Nafta Súper';
    case 'nafta_premium':
      return 'Nafta Premium';
    case 'gasoil':
      return 'Gasoil';
    case 'gasoil_premium':
      return 'Gasoil Premium';
    default:
      return c;
  }
}
