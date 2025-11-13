'use client';

import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import type { Shift } from '@/lib/types';

export default function CerradosPage() {
  const [rows, setRows] = useState<Shift[]>([]);

  useEffect(() => {
    (async () => {
      const qy = query(collection(db, 'shifts'), orderBy('openedAt', 'desc'));
      const snap = await getDocs(qy);
      const mapped: Shift[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Shift, 'id'>) }));
      setRows(mapped);
    })();
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h1 className="text-xl font-semibold mb-3">Turnos</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left"><th>Abierto</th><th>Cerrado</th><th>Estado</th><th>Total $</th></tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-t">
              <td>{new Date(r.openedAt).toLocaleString()}</td>
              <td>{r.closedAt ? new Date(r.closedAt).toLocaleString() : '-'}</td>
              <td>{r.status}</td>
              <td>{(r.consumptionMoney ?? 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
