'use client';

import { useEffect, useState } from 'react';
import { getHoseShiftRow, setHoseStart, setHoseEnd } from '@/lib/firestore';
import type { Combustible } from '@/lib/types';

interface HoseOpt { id: string; nombre: string; combustible: Combustible; }

export default function HoseReadingForm({
  shiftId,
  hoses,
}: {
  shiftId: string;
  hoses: HoseOpt[];
}) {
  const [hoseId, setHoseId] = useState<string>(hoses[0]?.id ?? '');
  const [info, setInfo] = useState<any>(null);
  const [valor, setValor] = useState<number | ''>('');
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');

  async function load() {
    setOk(''); setErr('');
    const row = hoseId ? await getHoseShiftRow(shiftId, hoseId) : null;
    setInfo(row);
    setValor('');
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [hoseId, shiftId]);

  async function save() {
    try {
      setOk(''); setErr('');
      const hose = hoses.find(h => h.id === hoseId);
      if (!hose) throw new Error('Seleccioná una manguera');
      if (valor === '' || Number(valor) < 0) throw new Error('Ingresá litros válidos');

      if (!info?.lecturaInicialLitros) {
        await setHoseStart({ shiftId, hoseId, combustible: hose.combustible, litros: Number(valor) });
        setOk('Lectura inicial guardada');
      } else if (info?.lecturaFinalLitros == null) {
        await setHoseEnd({ shiftId, hoseId, litros: Number(valor) });
        setOk('Lectura final guardada');
      } else {
        throw new Error('Esta manguera ya tiene inicio y fin en este turno');
      }
      await load();
    } catch (e: any) {
      setErr(e.message || String(e));
    }
  }

  const estado =
    !info?.lecturaInicialLitros ? 'inicial'
    : info?.lecturaFinalLitros == null ? 'final'
    : 'completo';

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h2 className="text-lg font-semibold mb-3">Lecturas de mangueras</h2>

      {ok && <p className="text-green-600 text-sm mb-2">{ok}</p>}
      {err && <p className="text-red-600 text-sm mb-2">{err}</p>}

      <div className="grid md:grid-cols-4 gap-3 items-center">
        <select
          className="w-full rounded-lg border px-3 py-2"
          value={hoseId}
          onChange={(e) => setHoseId(e.target.value)}
        >
          {hoses.map((h) => (
            <option key={h.id} value={h.id}>
              {h.nombre} – {h.combustible}
            </option>
          ))}
        </select>

        <input
          className="w-full rounded-lg border px-3 py-2"
          type="number"
          placeholder={estado === 'inicial' ? 'Lectura inicial (L)' : 'Lectura final (L)'}
          value={valor}
          onChange={(e) => setValor(e.target.value === '' ? '' : Number(e.target.value))}
        />

        <button className="rounded-lg border px-3 py-2 text-sm" onClick={save}>
          Guardar
        </button>

        <div className="text-sm opacity-70">
          {info?.lecturaInicialLitros != null && (
            <div>Inicio: <b>{info.lecturaInicialLitros}</b> L</div>
          )}
          {info?.lecturaFinalLitros != null && (
            <div>Fin: <b>{info.lecturaFinalLitros}</b> L</div>
          )}
          {info?.lecturaInicialLitros != null && info?.lecturaFinalLitros != null && (
            <div>
              Vendido: <b>{Math.max(0, info.lecturaFinalLitros - info.lecturaInicialLitros)}</b> L
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
