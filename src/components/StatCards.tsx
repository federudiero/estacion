export default function StatCards({ stats }: { stats: Record<string, number> }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {Object.entries(stats).map(([k, v]) => (
        <div key={k} className="bg-white rounded-2xl shadow p-4">
          <div className="text-sm text-gray-500">{k}</div>
          <div className="text-2xl font-semibold">{v.toFixed(2)}</div>
        </div>
      ))}
    </div>
  );
}
