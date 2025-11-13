'use client';

import { useState } from 'react';
import type { CardsBreakdownItem } from '@/lib/types';

interface Props {
  value: Record<string, CardsBreakdownItem>;
  onChange: (v: Record<string, CardsBreakdownItem>) => void;
}

export default function CardBreakdownForm({ value, onChange }: Props) {
  const [marca, setMarca] = useState('Visa');
  const [tickets, setTickets] = useState<number>(0);
  const [monto, setMonto] = useState<number>(0);

  function addItem() {
    const next = { ...value, [marca]: { tickets, monto } };
    onChange(next);
    setTickets(0);
    setMonto(0);
  }

  return (
    <div>
      <h3 className="font-medium mb-2">Detalle por tarjeta</h3>
      <div className="grid grid-cols-3 gap-2">
        <input className="w-full rounded-lg border px-3 py-2" value={marca} onChange={e=>setMarca(e.target.value)} placeholder="Marca" />
        <input className="w-full rounded-lg border px-3 py-2" type="number" value={tickets} onChange={e=>setTickets(Number(e.target.value))} placeholder="# tickets" />
        <input className="w-full rounded-lg border px-3 py-2" type="number" value={monto} onChange={e=>setMonto(Number(e.target.value))} placeholder="$ monto" />
      </div>
      <button className="mt-2 rounded-lg border px-3 py-2 text-sm" type="button" onClick={addItem}>Agregar</button>
      <ul className="text-sm mt-3 space-y-1">
        {Object.entries(value).map(([k, v]) => (
          <li key={k} className="flex justify-between">
            <span>{k} ({v.tickets})</span>
            <b>${v.monto.toFixed(2)}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}
