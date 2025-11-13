'use client';

'use client';
import { useEffect, useState } from 'react';
import { getOpenShift } from '@/lib/firestore';
import HoseBulkReadings from '@/components/HoseBulkReadings';
import type { Shift } from '@/lib/types';

export default function ManguerasPage() {
  const [shift, setShift] = useState<Shift | null>(null);
  useEffect(() => { getOpenShift().then(setShift); }, []);
  if (!shift) return <div className="bg-white rounded-2xl shadow p-4">Abrí un turno para registrar lecturas.</div>;
  return <HoseBulkReadings shiftId={shift.id} />;
}