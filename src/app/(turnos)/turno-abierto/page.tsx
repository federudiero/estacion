'use client';

import { useEffect, useState } from 'react';
import { getOpenShift } from '@/lib/firestore';
import ShiftOpenBanner from '@/components/ShiftOpenBanner';
import type { Shift } from '@/lib/types';

export default function TurnoAbiertoPage() {
  const [shift, setShift] = useState<Shift | null>(null);
  useEffect(() => { getOpenShift().then(setShift); }, []);
  if (!shift) return <ShiftOpenBanner />;

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h1 className="text-xl font-semibold">Turno abierto</h1>
      <p className="text-sm mt-2">Abierto: {new Date(shift.openedAt).toLocaleString()}</p>
      <p className="text-sm">ID: {shift.id}</p>
    </div>
  );
}
