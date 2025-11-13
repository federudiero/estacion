'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';

export function DailyChart({ data }: { data: { date: string; total: number }[] }) {
  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h3 className="font-semibold mb-2">Ventas diarias ($)</h3>
      <LineChart width={600} height={260} data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="total" />
      </LineChart>
    </div>
  );
}

export function FuelBars({ data }: { data: { fuel: string; liters: number }[] }) {
  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h3 className="font-semibold mb-2">Litros por combustible</h3>
      <BarChart width={600} height={260} data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="fuel" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="liters" />
      </BarChart>
    </div>
  );
}
