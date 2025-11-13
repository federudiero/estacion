"use client";

import AuthGate from "@/components/AuthGate";
import StatsClient from "@/components/StatsClient";

export default function EstadisticasPage() {
  return (
    <AuthGate>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Estadísticas</h1>
        <StatsClient nowMs={Date.now()} />
      </div>
    </AuthGate>
  );
}