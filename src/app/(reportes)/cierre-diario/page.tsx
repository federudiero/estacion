// src/app/(reportes)/cierre-diario/page.tsx
'use client';

import AuthGate from '@/components/AuthGate';
import CierreDiarioClient from '@/components/CierreDiarioClient';

export default function CierreDiarioPage() {
  return (
    <AuthGate>
      <div className="space-y-4">
        <CierreDiarioClient />
      </div>
    </AuthGate>
  );
}
