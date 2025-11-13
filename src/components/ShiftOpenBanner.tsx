'use client';

import { openShift } from '@/lib/firestore';
import { auth } from '@/lib/firebase';

export default function ShiftOpenBanner() {
  async function handleOpen() {
    const uid = auth.currentUser?.uid ?? 'system';
    await openShift(uid);
    location.reload();
  }
  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h2 className="text-lg font-semibold mb-2">Abrir nuevo turno</h2>
      <p className="text-sm">Al abrir un turno, se asociarán las mediciones y ventas hasta su cierre.</p>
      <button className="mt-3 rounded-lg border px-3 py-2 text-sm" onClick={handleOpen}>Abrir turno</button>
    </div>
  );
}
