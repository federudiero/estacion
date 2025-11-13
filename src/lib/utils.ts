// Coeficiente lineal de expansión volumétrica aproximado (naftas ~0.001, gasoil ~0.0008)
export function coefAlpha(producto: string) {
  if (producto.startsWith('gasoil')) return 0.00080;
  return 0.00100; // naftas
}

// Normaliza litros a 15°C: L15 = Lobs * (1 - α * (T - 15))
export function litrosA15C(litrosObs: number, tempC: number|undefined, producto: string) {
  if (tempC == null || Number.isNaN(tempC)) return litrosObs;
  const alpha = coefAlpha(producto);
  const corr = 1 - alpha * (tempC - 15);
  return Math.max(0, Number((litrosObs * corr).toFixed(2)));
}
