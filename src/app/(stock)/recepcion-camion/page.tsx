// NO pongas 'use client' acá; esta page puede ser Server Component
import AuthGate from '@/components/AuthGate';
import TruckIntakeForm from '@/components/TruckIntakeForm';

export default function Page() {
  return (
    <AuthGate>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Stock • Recepción de camión</h1>
        <TruckIntakeForm /> {/* <- este sí es Client Component y está ok */}
      </div>
    </AuthGate>
  );
}
