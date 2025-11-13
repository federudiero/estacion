'use client';

import { useEffect, useMemo, useState } from 'react';
import { listTanks, registrarRecepcionCamion } from '@/lib/firestore';

import type { Tank, Combustible } from '@/lib/types';
import { getAuth } from 'firebase/auth';
import { litrosA15C } from '@/lib/utils';

const PRODUCTOS: { key: Combustible; label: string }[] = [
  { key: 'nafta_super', label: 'Nafta Súper' },
  { key: 'nafta_premium', label: 'Nafta Premium' },
  { key: 'gasoil', label: 'Gasoil' },
  { key: 'gasoil_premium', label: 'Gasoil Premium' },
];

export default function TruckIntakeForm() {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>('');
  const [ok, setOk] = useState<string>('');

  // form
  const [proveedor, setProveedor] = useState('');
  const [oc, setOc] = useState('');
  const [remito, setRemito] = useState('');
  const [factura, setFactura] = useState('');
  const [producto, setProducto] = useState<Combustible>('nafta_super');
  const [tanqueId, setTanqueId] = useState('');
  const [litrosFactura, setLitrosFactura] = useState<number>(0);
  const [tempC, setTempC] = useState<number | undefined>(undefined);
  const [preVarilla, setPreVarilla] = useState<number | undefined>(undefined);
  const [postVarilla, setPostVarilla] = useState<number | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = (await listTanks()) as Tank[];
        if (!alive) return;
        setTanks(data);
        if (data.length && !tanqueId) setTanqueId(data[0].id);
      } catch (e: any) {
        setErr(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const litros15C = useMemo(
    () => litrosA15C(litrosFactura || 0, tempC, producto),
    [litrosFactura, tempC, producto]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setOk('');
    try {
      if (!tanqueId) throw new Error('Elegí un tanque');
      if (!litrosFactura || litrosFactura <= 0)
        throw new Error('Ingresá litros de factura');

      const auth = getAuth();
      const u = auth.currentUser;
      if (!u) throw new Error('Sesión inválida');

      await registrarRecepcionCamion({
        proveedor,
        oc: oc || undefined,
        remito: remito || undefined,
        factura: factura || undefined,
        tanqueId,
        producto,
        litrosFactura: Number(litrosFactura),
        litros15C: Number(litros15C || litrosFactura || 0),
        tempC: tempC ?? undefined,
        varillaPreLitros: preVarilla ?? undefined,
        varillaPostLitros: postVarilla ?? undefined,
        creadoPorUid: u.uid,
        creadoPorEmail: u.email || undefined,
      });

      setOk('Recepción registrada y stock actualizado');

      // limpiar
      setProveedor('');
      setOc('');
      setRemito('');
      setFactura('');
      setLitrosFactura(0);
      setTempC(undefined);
      setPreVarilla(undefined);
      setPostVarilla(undefined);
    } catch (e: any) {
      setErr(e.message || String(e));
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h2 className="text-lg font-semibold mb-3">Recepción de camión</h2>

      {loading && <p>Cargando tanques…</p>}
      {err && <p className="text-red-600 text-sm mb-2">{err}</p>}
      {ok && <p className="text-green-600 text-sm mb-2">{ok}</p>}

      <form onSubmit={onSubmit} className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm text-gray-600">Proveedor</label>
          <input
            className="input input-bordered w-full"
            value={proveedor}
            onChange={(e) => setProveedor(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-600">
            Orden de compra (opcional)
          </label>
          <input
            className="input input-bordered w-full"
            value={oc}
            onChange={(e) => setOc(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-600">
            Remito (opcional)
          </label>
          <input
            className="input input-bordered w-full"
            value={remito}
            onChange={(e) => setRemito(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-600">
            Factura (opcional)
          </label>
          <input
            className="input input-bordered w-full"
            value={factura}
            onChange={(e) => setFactura(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-600">Producto</label>
          <select
            className="select select-bordered w-full"
            value={producto}
            onChange={(e) => setProducto(e.target.value as any)}
          >
            {PRODUCTOS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-600">Tanque destino</label>
          <select
            className="select select-bordered w-full"
            value={tanqueId}
            onChange={(e) => setTanqueId(e.target.value)}
          >
            {tanks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre} • {t.producto}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-600">
            Litros (según factura/remito)
          </label>
          <input
            type="number"
            className="input input-bordered w-full"
            value={litrosFactura || ''}
            onChange={(e) => setLitrosFactura(Number(e.target.value))}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-600">
            Temperatura °C (opcional)
          </label>
          <input
            type="number"
            className="input input-bordered w-full"
            value={tempC ?? ''}
            onChange={(e) =>
              setTempC(
                e.target.value === '' ? undefined : Number(e.target.value),
              )
            }
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-600">
            Varilla antes (L) (opcional)
          </label>
          <input
            type="number"
            className="input input-bordered w-full"
            value={preVarilla ?? ''}
            onChange={(e) =>
              setPreVarilla(
                e.target.value === '' ? undefined : Number(e.target.value),
              )
            }
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-600">
            Varilla después (L) (opcional)
          </label>
          <input
            type="number"
            className="input input-bordered w-full"
            value={postVarilla ?? ''}
            onChange={(e) =>
              setPostVarilla(
                e.target.value === '' ? undefined : Number(e.target.value),
              )
            }
          />
        </div>

        <div className="md:col-span-2 bg-base-100 rounded-xl p-3">
          <p className="text-sm">
            Estimación a 15 °C:{' '}
            <b>{litros15C.toLocaleString('es-AR')} L</b>
            {tempC != null && (
              <span className="opacity-70"> (usando α según producto)</span>
            )}
          </p>
        </div>

        <div className="md:col-span-2">
          <button className="btn btn-primary">Registrar recepción</button>
        </div>
      </form>
    </div>
  );
}
