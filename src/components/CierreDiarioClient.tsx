// src/components/CierreDiarioClient.tsx
'use client';

import { useEffect, useState } from 'react';
import type { DailyClosure } from '@/lib/firestore';
import { getDailyClosure } from '@/lib/firestore';

const hoyYmd = () => new Date().toISOString().slice(0, 10);

export default function CierreDiarioClient() {
  const [fechaStr, setFechaStr] = useState<string>(hoyYmd);
  const [data, setData] = useState<DailyClosure | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr('');
        const res = await getDailyClosure(fechaStr);
        if (!alive) return;
        setData(res);
      } catch (e: any) {
        if (!alive) return;
        console.error(e);
        setErr(e?.message || 'Error al obtener el cierre diario.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [fechaStr]);

  const resumenComb = data?.ventasLitrosPorCombustible ?? {
    nafta_super: 0,
    nafta_premium: 0,
    gasoil: 0,
    gasoil_premium: 0,
  };

  return (
    <div className="space-y-4">
      {/* Filtro de fecha */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold">Cierre diario</h1>
        <div className="flex items-center gap-2 text-sm">
          <span>Fecha:</span>
          <input
            type="date"
            value={fechaStr}
            onChange={(e) => setFechaStr(e.target.value)}
            className="input input-bordered input-sm"
          />
        </div>
      </div>

      {/* Mensajes de estado */}
      {loading && (
        <div className="rounded-2xl p-4 bg-white shadow text-sm text-gray-500">
          Calculando cierre de {fechaStr}…
        </div>
      )}

      {err && (
        <div className="rounded-2xl p-4 bg-red-50 text-red-700 shadow">
          <div className="font-semibold mb-1">Error</div>
          <div className="text-sm break-words">{err}</div>
        </div>
      )}

      {!loading && !err && data && (
        <>
          {/* Resumen dinero + litros */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-white shadow p-3">
              <div className="text-xs uppercase text-gray-500">
                Total facturado
              </div>
              <div className="text-xl font-semibold">
                $
                {' '}
                {data.totalTurno.toLocaleString('es-AR', {
                  maximumFractionDigits: 0,
                })}
              </div>
            </div>

            <div className="rounded-2xl bg-white shadow p-3">
              <div className="text-xs uppercase text-gray-500">
                Litros totales
              </div>
              <div className="text-xl font-semibold">
                {data.litrosTotales.toLocaleString('es-AR', {
                  maximumFractionDigits: 0,
                })}
                {' '}
                L
              </div>
            </div>

            <div className="rounded-2xl bg-white shadow p-3">
              <div className="text-xs uppercase text-gray-500">
                Turnos cerrados
              </div>
              <div className="text-xl font-semibold">
                {data.shifts.length}
              </div>
            </div>

            <div className="rounded-2xl bg-white shadow p-3 text-xs space-y-1">
              <div className="uppercase text-gray-500">
                Litros por combustible
              </div>
              <div className="flex flex-col gap-0.5">
                <span>
                  Súper:
                  {' '}
                  <b>
                    {resumenComb.nafta_super.toLocaleString('es-AR', {
                      maximumFractionDigits: 0,
                    })}
                    {' '}
                    L
                  </b>
                </span>
                <span>
                  Premium:
                  {' '}
                  <b>
                    {resumenComb.nafta_premium.toLocaleString('es-AR', {
                      maximumFractionDigits: 0,
                    })}
                    {' '}
                    L
                  </b>
                </span>
                <span>
                  Gasoil:
                  {' '}
                  <b>
                    {resumenComb.gasoil.toLocaleString('es-AR', {
                      maximumFractionDigits: 0,
                    })}
                    {' '}
                    L
                  </b>
                </span>
                <span>
                  Gasoil Prem.:
                  {' '}
                  <b>
                    {resumenComb.gasoil_premium.toLocaleString('es-AR', {
                      maximumFractionDigits: 0,
                    })}
                    {' '}
                    L
                  </b>
                </span>
              </div>
            </div>
          </div>

          {/* Tabla de turnos del día */}
          <div className="rounded-2xl bg-white shadow p-4">
            <h2 className="text-sm font-semibold mb-2">
              Turnos incluidos en el cierre
            </h2>
            {data.shifts.length === 0 ? (
              <div className="text-xs text-gray-500">
                No hay turnos cerrados en esta fecha.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-2">Turno</th>
                      <th className="text-left py-2 px-2">ID</th>
                      <th className="text-left py-2 px-2">Apertura</th>
                      <th className="text-left py-2 px-2">Cierre</th>
                      <th className="text-right py-2 px-2">Litros turno</th>
                      <th className="text-right py-2 px-2">Total $</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.shifts.map((s) => (
                      <tr key={s.id} className="border-b last:border-0">
                        <td className="py-1 px-2">{s.turno ?? '—'}</td>
                        <td className="py-1 px-2">{s.id}</td>
                        <td className="py-1 px-2">
                          {s.openedAt?.toDate
                            ? s.openedAt.toDate().toLocaleTimeString('es-AR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td className="py-1 px-2">
                          {s.closedAt?.toDate
                            ? s.closedAt.toDate().toLocaleTimeString('es-AR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td className="py-1 px-2 text-right">
                          {s.litrosTotalesTurno.toLocaleString('es-AR', {
                            maximumFractionDigits: 0,
                          })}
                        </td>
                        <td className="py-1 px-2 text-right">
                          {s.pagosTotalTurno.toLocaleString('es-AR', {
                            maximumFractionDigits: 0,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
