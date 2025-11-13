export type Turno = 'manana' | 'tarde' | 'noche';

export function turnoActual(d: Date = new Date()): Turno {
  const h = d.getHours();
  if (h >= 6 && h < 14) return 'manana';
  if (h >= 14 && h < 22) return 'tarde';
  return 'noche';
}