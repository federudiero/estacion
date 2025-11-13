'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, getAuth } from 'firebase/auth';
import { getOpenShift } from '@/lib/firestore';
import ShiftCloseForm from '@/components/ShiftCloseForm';
import type { Shift } from '@/lib/types';

export default function CerrarTurnoPage() {
  const [shift, setShift] = useState<Shift | null>(null);
  const [uid, setUid] = useState<string>('');

  useEffect(() => {
    getOpenShift().then(setShift);
    const unsub = onAuthStateChanged(getAuth(), (u) => setUid(u?.uid || ''));
    return () => unsub();
  }, []);

  if (!shift) return <div className="bg-white rounded-2xl shadow p-4">No hay turno abierto.</div>;
  if (!uid) return <div className="bg-white rounded-2xl shadow p-4">Ingresá para cerrar.</div>;

  return <ShiftCloseForm shiftId={shift.id} userUid={uid} />;
}
