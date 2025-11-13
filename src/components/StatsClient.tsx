'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import StatCards from '@/components/StatCards';
import { DailyChart, FuelBars } from '@/components/StatsCharts';
import StockSummary from '@/components/StockSummary';

// ─── Helpers ────────────────────────────────────────────────────────────────────
function toMs(v: unknown): number {
  // Firestore Timestamp
  if (v && typeof v === 'object' && typeof (v as any).toMillis === 'function') {
    return Number((v as any).toMillis());
  }
  // Date
  if (v instanceof Date) return v.getTime();
  // number-like
  if (typeof v === 'number') return v;
  // ISO/string
  if (typeof v === 'string') {
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : NaN;
  }
  return NaN;
}

type ShiftRow = {
  id: string;
  openedAt?: unknown; // number | Timestamp | string | Date
  closedAt?: unknown;
  estado?: 'abierto' | 'cerrado' | 'open' | 'closed';
  totalEfectivo?: number | string;
  totalTarjeta?: number | string;
  totalTransferencia?: number | string;
  montoEfectivo?: number | string;
  montoTarjeta?: number | string;
  montoTransferencia?: number | string;
  montoTransferencia10?: number | string;
  consumptionMoney?: number | string;
  totalVentas?: number | string;
  // otros campos
  [k: string]: unknown;
};

type HoseShiftRow = {
  id: string;
  shiftId: string;
  hoseId: string;
  combustible: string;
  lecturaInicialLitros?: number;
  lecturaFinalLitros?: number;
};

function sumMoneyFields(s: ShiftRow): number {
  const nums: Array<number | string | undefined> = [
    s.totalEfectivo,
    s.totalTarjeta,
    s.totalTransferencia,
    s.montoEfectivo,
    s.montoTarjeta,
    s.montoTransferencia,
    s.montoTransferencia10,
    s.consumptionMoney,
    s.totalVentas,
  ];

  return nums.reduce<number>((acc, v) => {
    const n = typeof v === 'string' ? Number(v) : v;
    return acc + (Number.isFinite(n as number) ? Number(n) : 0);
  }, 0);
}

// ─── Componente ────────────────────────────────────────────────────────────────
export default function StatsClient({ nowMs }: { nowMs: number }) {
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [hoseRows, setHoseRows] = useState<HoseShiftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>('');

  // ventana de 60 días
  const sixtyDaysAgo = useMemo(() => {
    const d = new Date(nowMs);
    d.setDate(d.getDate() - 60);
    return d.getTime();
  }, [nowMs]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr('');

        // --- SHIFTS
        let rows: ShiftRow[] = [];
        try {
          const qs = query(
            collection(db, 'shifts'),
            orderBy('openedAt', 'desc')
          );
          const snap = await getDocs(qs);
          rows = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          })) as ShiftRow[];
        } catch {
          try {
            const qs2 = query(
              collection(db, 'shifts'),
              orderBy('closedAt', 'desc')
            );
            const snap2 = await getDocs(qs2);
            rows = snap2.docs.map((d) => ({
              id: d.id,
              ...(d.data() as any),
            })) as ShiftRow[];
          } catch {
            const snap3 = await getDocs(collection(db, 'shifts'));
            rows = snap3.docs.map((d) => ({
              id: d.id,
              ...(d.data() as any),
            })) as ShiftRow[];
            rows.sort((a, b) => {
              const ta = toMs(a.closedAt ?? a.openedAt);
              const tb = toMs(b.closedAt ?? b.openedAt);
              return Number(tb) - Number(ta);
            });
          }
        }

        const filtered: ShiftRow[] = rows.filter((r) => {
          const t = toMs(r.openedAt ?? r.closedAt);
          return Number.isFinite(t) ? t >= sixtyDaysAgo : true;
        });

        // --- HOSE_SHIFTS
        const hsSnap = await getDocs(collection(db, 'hose_shift'));
        const hs: HoseShiftRow[] = hsSnap.docs.map((d) => {
          const data = d.data() as any;
          const li = Number(data.lecturaInicialLitros);
          const lf = Number(data.lecturaFinalLitros);
          return {
            id: d.id,
            shiftId: String(data.shiftId ?? ''),
            hoseId: String(data.hoseId ?? ''),
            combustible: String(data.combustible ?? 'desconocido'),
            lecturaInicialLitros: Number.isFinite(li) ? li : undefined,
            lecturaFinalLitros: Number.isFinite(lf) ? lf : undefined,
          };
        });

        if (!alive) return;
        setShifts(filtered);
        setHoseRows(hs);
      } catch (e: any) {
        if (!alive) return;
        console.error(e);
        setErr(e?.message || 'Error inesperado al leer Firestore.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [sixtyDaysAgo]);

  // === KPIs (hoy / 7 / 30 / cerrados)
  const todayStart = useMemo(() => {
    const d = new Date(nowMs);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, [nowMs]);

  const weekAgo = todayStart - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = todayStart - 30 * 24 * 60 * 60 * 1000;

  const totals = useMemo(() => {
    const sumFrom = (fromMs: number) =>
      shifts.reduce<number>((acc, r) => {
        const t = toMs(r.openedAt ?? r.closedAt);
        return Number.isFinite(t) && t >= fromMs
          ? acc + sumMoneyFields(r)
          : acc;
      }, 0);

    const cerrados = shifts.reduce<number>(
      (n, r) =>
        n + (r.estado === 'cerrado' || r.estado === 'closed' ? 1 : 0),
      0
    );

    return {
      'Hoy $': sumFrom(todayStart),
      '7 días $': sumFrom(weekAgo),
      '30 días $': sumFrom(monthAgo),
      'Turnos cerrados': cerrados,
    };
  }, [shifts, todayStart, weekAgo, monthAgo]);

  // === Serie diaria ($)
  const dailyData = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const s of shifts as ShiftRow[]) {
      const t = toMs(s.closedAt ?? s.openedAt);
      if (!Number.isFinite(t)) continue;
      const key = new Date(t).toISOString().slice(0, 10); // yyyy-mm-dd
      const prev = byDay.get(key) ?? 0;
      byDay.set(key, prev + sumMoneyFields(s));
    }
    return Array.from(byDay.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [shifts]);

  // === Litros por combustible
  const fuelData = useMemo(() => {
    const acc = new Map<string, number>();
    for (const r of hoseRows as HoseShiftRow[]) {
      const li = Number(r.lecturaInicialLitros ?? 0);
      const lf = Number(r.lecturaFinalLitros ?? 0);
      const liters = Number.isFinite(li) && Number.isFinite(lf) ? lf - li : 0;
      const key = r.combustible || 'desconocido';
      acc.set(
        key,
        (acc.get(key) ?? 0) + (Number.isFinite(liters) ? liters : 0)
      );
    }
    return Array.from(acc.entries()).map(([fuel, liters]) => ({
      fuel,
      liters,
    }));
  }, [hoseRows]);

  if (loading) {
    return (
      <div className="rounded-2xl p-4 bg-white shadow text-sm text-gray-500">
        Cargando estadísticas…
      </div>
    );
  }
  if (err) {
    return (
      <div className="rounded-2xl p-4 bg-red-50 text-red-700 shadow">
        <div className="font-semibold mb-1">
          No pude cargar las estadísticas
        </div>
        <div className="text-sm break-words">{err}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <StatCards stats={totals} />

      <div className="grid lg:grid-cols-2 gap-4">
        <DailyChart data={dailyData} />
        <FuelBars data={fuelData} />
      </div>

      {/* 🔹 Nuevo panel: stock actual por tanque */}
      <StockSummary />
    </div>
  );
}
