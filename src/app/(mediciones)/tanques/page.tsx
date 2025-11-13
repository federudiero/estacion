'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { getOpenShift, listTanks, saveTankReading, ensureDefaultTanks } from '@/lib/firestore';
import type { Shift, Tank } from '@/lib/types';

type TankLocal = Tank & {
  lastVarillaCm?: number | null;
  lastTeleLitros?: number | null;
};

function Donut({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0;
  const stroke = 28;
  const r = 50 - stroke / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg viewBox="0 0 100 100" className="w-32 h-32">
      <circle cx="50" cy="50" r={r} stroke="#eee" strokeWidth={stroke} fill="none" />
      <circle
        cx="50" cy="50" r={r}
        stroke="currentColor" strokeWidth={stroke} fill="none"
        strokeDasharray={`${dash} ${circ - dash}`}
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="54" textAnchor="middle" className="text-sm fill-current">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

export default function TanquesPage() {
  const [shift, setShift] = useState<Shift | null>(null);
  const [tanks, setTanks] = useState<TankLocal[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [varilla, setVarilla] = useState<Record<string, number | ''>>({});
  const [tele, setTele] = useState<Record<string, number | ''>>({});

  useEffect(() => {
    (async () => {
      try {
        const s = await getOpenShift();
        setShift(s);
        const rows = await listTanks();
        setTanks(rows as TankLocal[]);
      } catch (e: any) {
        setErr(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function guardar(tankId: string) {
    try {
      const auth = getAuth();
      const u = auth.currentUser;
      if (!shift) throw new Error('No hay turno abierto');
      if (!u) throw new Error('Sesión inválida');

      const v = varilla[tankId];
      const t = tele[tankId];

      await saveTankReading({
        shiftId: shift.id,
        tankId,
        varillaCm: v === '' ? undefined : Number(v),
        teleLitros: t === '' ? undefined : Number(t),
        uid: u.uid,
        email: u.email ?? undefined,
      });

      // refresco optimista
      setTanks((old) =>
        old.map((x) =>
          x.id === tankId
            ? {
                ...x,
                lastVarillaCm: v === '' ? x.lastVarillaCm ?? null : Number(v),
                lastTeleLitros: t === '' ? x.lastTeleLitros ?? null : Number(t),
              }
            : x
        )
      );
      setVarilla((o) => ({ ...o, [tankId]: '' }));
      setTele((o) => ({ ...o, [tankId]: '' }));
      alert('Medición guardada');
    } catch (e: any) {
      alert(e.message || String(e));
    }
  }

  if (loading) return <div className="p-4">Cargando…</div>;
  if (err) return <div className="p-4 text-red-600">{err}</div>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-lg font-semibold">Medición de tanques</h2>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {tanks.map((t) => (
          <div key={t.id} className="bg-white rounded-2xl shadow p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{t.nombre}</h3>
                <p className="text-xs opacity-70">{t.producto}</p>
              </div>
              <Donut value={t.stockLitros} total={t.capacidadLitros} />
            </div>

            <div className="text-sm">
              <p>Capacidad: <b>{t.capacidadLitros.toLocaleString('es-AR')} L</b></p>
              <p>Stock actual: <b>{t.stockLitros.toLocaleString('es-AR')} L</b></p>
              <p className="opacity-70">
                Última varilla: {t.lastVarillaCm ?? '-'} cm · Tele: {t.lastTeleLitros ?? '-'} L
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                placeholder="Varilla (cm)"
                className="rounded-lg border px-3 py-2"
                value={varilla[t.id] ?? ''}
                onChange={(e) =>
                  setVarilla((o) => ({ ...o, [t.id]: e.target.value === '' ? '' : Number(e.target.value) }))
                }
              />
              <input
                type="number"
                placeholder="Telemedición (L)"
                className="rounded-lg border px-3 py-2"
                value={tele[t.id] ?? ''}
                onChange={(e) =>
                  setTele((o) => ({ ...o, [t.id]: e.target.value === '' ? '' : Number(e.target.value) }))
                }
              />
              <button className="rounded-lg border px-3 py-2 text-sm" onClick={() => guardar(t.id)}>
                Guardar
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl shadow p-4 flex items-center justify-between">
  <h2 className="text-lg font-semibold">Medición de tanques</h2>
  {tanks.length < 4 && (
    <button
      className="rounded-lg border px-3 py-2 text-sm"
      onClick={async () => {
        await ensureDefaultTanks();
        const rows = await listTanks();
        setTanks(rows as any);
      }}
    >
      Crear tanques por defecto
    </button>
  )}
</div>
    </div>
  );
}
