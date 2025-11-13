'use client';

import { useState } from 'react';
import { closeShiftWithPayments } from '@/lib/firestore';

type Tarjeta = { ult4?: string; monto: number; recargoPct?: number };
type Transfer = { ref?: string; monto: number; recargoPct?: number };

export default function ShiftCloseForm({ shiftId, userUid }: { shiftId: string; userUid: string }) {
  const [efectivo, setEfectivo] = useState<number | ''>('');
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([]);
  const [transfer, setTransfer] = useState<Transfer[]>([]);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  function addTarjeta() { setTarjetas((a) => [...a, { ult4: '', monto: 0, recargoPct: 0 }]); }
  function addTransfer() { setTransfer((a) => [...a, { ref: '', monto: 0, recargoPct: 0 }]); }

  async function cerrar() {
    try {
      setErr(''); setOk('');
      await closeShiftWithPayments({
        shiftId,
        efectivo: Number(efectivo || 0),
        tarjetas,
        transferencias: transfer,
        cerradoPorUid: userUid,
      });
      setOk('Turno cerrado. Pagos registrados y stock ajustado.');
    } catch (e: any) {
      setErr(e.message || String(e));
    }
  }

  const totalTar = tarjetas.reduce((a, t) => a + (t.monto || 0) * (1 + (t.recargoPct || 0) / 100), 0);
  const totalTra = transfer.reduce((a, t) => a + (t.monto || 0) * (1 + (t.recargoPct || 0) / 100), 0);
  const total = Number(efectivo || 0) + totalTar + totalTra;

  return (
    <div className="bg-white rounded-2xl shadow p-4 space-y-4">
      <h2 className="text-lg font-semibold">Cerrar turno</h2>

      {ok && <p className="text-green-600 text-sm">{ok}</p>}
      {err && <p className="text-red-600 text-sm">{err}</p>}

      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <label className="text-sm text-gray-600">Efectivo</label>
          <input
            type="number"
            className="w-full rounded-lg border px-3 py-2"
            value={efectivo}
            onChange={(e) => setEfectivo(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>

        <div className="md:col-span-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-600">Tarjetas</label>
            <button className="rounded-lg border px-3 py-1 text-sm" onClick={addTarjeta}>+ Tarjeta</button>
          </div>
          <div className="space-y-2 mt-2">
            {tarjetas.map((t, i) => (
              <div key={i} className="grid md:grid-cols-3 gap-2">
                <input
                  className="rounded-lg border px-3 py-2" placeholder="Últimos 4"
                  value={t.ult4 ?? ''} onChange={(e) => {
                    const v = e.target.value; setTarjetas((a) => a.map((x, j) => j === i ? { ...x, ult4: v } : x));
                  }}
                />
                <input
                  type="number" className="rounded-lg border px-3 py-2" placeholder="Monto"
                  value={t.monto ?? 0} onChange={(e) => {
                    const v = Number(e.target.value); setTarjetas((a) => a.map((x, j) => j === i ? { ...x, monto: v } : x));
                  }}
                />
                <input
                  type="number" className="rounded-lg border px-3 py-2" placeholder="Recargo %"
                  value={t.recargoPct ?? 0} onChange={(e) => {
                    const v = Number(e.target.value); setTarjetas((a) => a.map((x, j) => j === i ? { ...x, recargoPct: v } : x));
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-3">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-600">Transferencias</label>
            <button className="rounded-lg border px-3 py-1 text-sm" onClick={addTransfer}>+ Transferencia</button>
          </div>
          <div className="space-y-2 mt-2">
            {transfer.map((t, i) => (
              <div key={i} className="grid md:grid-cols-3 gap-2">
                <input
                  className="rounded-lg border px-3 py-2" placeholder="Referencia"
                  value={t.ref ?? ''} onChange={(e) => {
                    const v = e.target.value; setTransfer((a) => a.map((x, j) => j === i ? { ...x, ref: v } : x));
                  }}
                />
                <input
                  type="number" className="rounded-lg border px-3 py-2" placeholder="Monto"
                  value={t.monto ?? 0} onChange={(e) => {
                    const v = Number(e.target.value); setTransfer((a) => a.map((x, j) => j === i ? { ...x, monto: v } : x));
                  }}
                />
                <input
                  type="number" className="rounded-lg border px-3 py-2" placeholder="Recargo %"
                  value={t.recargoPct ?? 0} onChange={(e) => {
                    const v = Number(e.target.value); setTransfer((a) => a.map((x, j) => j === i ? { ...x, recargoPct: v } : x));
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-base-100 rounded-xl p-3 text-sm">
        <div>Total tarjetas (c/recargo): <b>{totalTar.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</b></div>
        <div>Total transferencias (c/recargo): <b>{totalTra.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</b></div>
        <div className="mt-1">TOTAL TURNO: <b>{total.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</b></div>
      </div>

      <div className="flex justify-end">
        <button className="rounded-lg border px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700" onClick={cerrar}>
          Confirmar cierre
        </button>
      </div>
    </div>
  );
}
