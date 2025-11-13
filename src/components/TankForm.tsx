'use client';

import { useState } from 'react';
import { getAuth } from 'firebase/auth';
import { saveTankReading } from '@/lib/firestore';

interface TankOpt {
  id: string;
  nombre: string;
}

export default function TankForm({
  shiftId,
  tanks,
}: {
  shiftId: string;
  tanks: TankOpt[];
}) {
  const [tankId, setTankId] = useState<string>(tanks[0]?.id ?? '');
  const [manualStickCM, setStick] = useState<number | ''>('');
  const [telemetryLiters, setTele] = useState<number | ''>('');

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  async function handleSave() {
    setErr('');
    setOk('');

    try {
      if (!shiftId) throw new Error('Turno inválido');
      if (!tankId) throw new Error('Elegí un tanque');
      if (manualStickCM === '' && telemetryLiters === '') {
        throw new Error('Ingresá al menos un valor (varilla o telemedición)');
      }

      const auth = getAuth();
      const u = auth.currentUser;
      if (!u) throw new Error('Sesión inválida');

      setSaving(true);

      await saveTankReading({
        shiftId,
        tankId,
        varillaCm: manualStickCM === '' ? undefined : Number(manualStickCM),
        teleLitros:
          telemetryLiters === '' ? undefined : Number(telemetryLiters),
        uid: u.uid,
        email: u.email ?? undefined,
      });

      setOk('Medición guardada');
      setStick('');
      setTele('');
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h2 className="text-lg font-semibold mb-2">Medición de tanques</h2>

      {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
      {ok && <p className="text-sm text-green-600 mb-2">{ok}</p>}

      <div className="grid md:grid-cols-3 gap-3">
        <select
          className="select select-bordered w-full"
          value={tankId}
          onChange={(e) => setTankId(e.target.value)}
        >
          {tanks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>

        <input
          className="input input-bordered w-full"
          placeholder="Varilla (cm)"
          type="number"
          value={manualStickCM}
          onChange={(e) =>
            setStick(e.target.value === '' ? '' : Number(e.target.value))
          }
        />

        <input
          className="input input-bordered w-full"
          placeholder="Telemedición (L)"
          type="number"
          value={telemetryLiters}
          onChange={(e) =>
            setTele(e.target.value === '' ? '' : Number(e.target.value))
          }
        />
      </div>

      <button
        type="button"
        className="btn btn-sm btn-primary mt-3"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Guardando…' : 'Guardar'}
      </button>
    </div>
  );
}
