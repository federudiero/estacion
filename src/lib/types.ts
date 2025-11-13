export type Combustible =
  | 'nafta_super'
  | 'nafta_premium'
  | 'gasoil'
  | 'gasoil_premium';

export type Shift = {
  id: string;
  openedAt: number;
  openedBy: string;
  closedAt?: number;
  closedBy?: string;
  estado: 'abierto'|'cerrado';
};

export type Tank = {
  id: string;
  nombre: string;
  producto: Combustible;
  capacidadLitros: number;
  // stock técnico “teórico” (se ajusta con recepciones y ventas)
  stockLitros: number;
  // umbrales / referencias
  nivelMinimo?: number;
};

export type TruckIntake = {
  id: string;
  proveedor: string;
  oc?: string;
  remito?: string;
  factura?: string;

  tanqueId: string;            // destino
  producto: Combustible;

  tempC?: number;              // temperatura observada
  litrosFactura: number;       // litros “a la vista” del remito/factura
  litros15C: number;           // litros normalizados a 15 °C (calculado)

  // Varillaje previo/posterior (opcional pero recomendado)
  varillaPreLitros?: number;
  varillaPostLitros?: number;

  // Resultados
  mermaLitros: number;         // +ganancia / -merma respecto a varilla
  creadoPorUid: string;
  creadoPorEmail?: string;
  ts: number;                  // Date.now()
  adjuntos?: string[];         // URLs de fotos (opcional)
};
