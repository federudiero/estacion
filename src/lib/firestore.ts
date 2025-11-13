// src/lib/firestore.ts
import { db } from "./firebase";
import type { Shift, Tank, Combustible } from "./types";
import { turnoActual } from "./time";

import {
  // lectura
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  // escritura
  addDoc,
  updateDoc,
  setDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";

/* ===========================
   TURNOS
   =========================== */

export async function getOpenShift(): Promise<Shift | null> {
  const q = query(
    collection(db, "shifts"),
    where("estado", "==", "abierto"),
    orderBy("openedAt", "desc"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<Shift, "id">) };
}

export async function openShift(
  creadoPorUid: string,
  creadoPorEmail?: string | null
): Promise<string> {
  // si ya hay uno, no duplica
  const q = query(
    collection(db, "shifts"),
    where("estado", "==", "abierto"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (!snap.empty) return snap.docs[0].id;

  const ref = await addDoc(collection(db, "shifts"), {
    estado: "abierto",
    turno: turnoActual(),
    openedAt: serverTimestamp(),
    creadoPorUid,
    creadoPorEmail: creadoPorEmail ?? null,
    // 👇 ya lo dejamos preparado para stats por operario
    operarioUid: creadoPorUid,
    operarioEmail: creadoPorEmail ?? null,
  });

  await updateDoc(ref, { id: ref.id });
  return ref.id;
}

export async function closeShift(shiftId: string, cerradoPorUid: string) {
  const now = new Date();
  const fechaStr = now.toISOString().slice(0, 10); // yyyy-MM-dd

  await updateDoc(doc(db, "shifts", shiftId), {
    estado: "cerrado",
    closedAt: serverTimestamp(),
    cerradoPorUid,
    fechaStr,
  });
}

/* ===========================
   MANGUERAS: definiciones + lecturas por turno
   =========================== */

export type HoseDef = { id: string; nombre: string; combustible: Combustible };

/** Crea/normaliza 16 mangueras por defecto (4 islas x 4 mangueras). */
export async function ensureDefaultHoses() {
  const fuels: Combustible[] = [
    "nafta_super",
    "nafta_premium",
    "gasoil",
    "gasoil_premium",
  ];
  const defs: HoseDef[] = [];
  for (let island = 1; island <= 4; island++) {
    for (let i = 1; i <= 4; i++) {
      defs.push({
        id: `I${island}M${i}`,
        nombre: `Isla ${island} – M${i}`,
        combustible: fuels[(i - 1) % 4],
      });
    }
  }
  await Promise.all(
    defs.map((h) =>
      setDoc(
        doc(db, "hoses", h.id),
        {
          nombre: h.nombre,
          combustible: h.combustible,
          id: h.id,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      )
    )
  );
}

/** Lista las mangueras definidas (hoses). */
export async function listHoses(): Promise<HoseDef[]> {
  const snap = await getDocs(collection(db, "hoses"));
  return snap.docs.map((d) => {
    const x = d.data() as any;
    return {
      id: d.id,
      nombre: String(x.nombre ?? ""),
      combustible: (x.combustible ?? "nafta_super") as Combustible,
    };
  });
}

/** Setea lectura inicial (L) por manguera y turno. */
export async function setHoseStart(p: {
  shiftId: string;
  hoseId: string;
  combustible: Combustible;
  litros: number;
}) {
  const id = `${p.shiftId}_${p.hoseId}`;
  await setDoc(
    doc(db, "hose_shift", id),
    {
      shiftId: p.shiftId,
      hoseId: p.hoseId,
      combustible: p.combustible,
      lecturaInicialLitros: p.litros,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/** Setea lectura final (L) por manguera y turno. */
export async function setHoseEnd(p: {
  shiftId: string;
  hoseId: string;
  litros: number;
}) {
  const id = `${p.shiftId}_${p.hoseId}`;
  await setDoc(
    doc(db, "hose_shift", id),
    { lecturaFinalLitros: p.litros, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/** Lee una fila de hose_shift (si existe) para una manguera/turno. */
export async function getHoseShiftRow(shiftId: string, hoseId: string) {
  const id = `${shiftId}_${hoseId}`;
  const d = await getDoc(doc(db, "hose_shift", id));
  return d.exists() ? d.data() : null;
}

/** Mapa hoseId -> { lecturaInicialLitros, lecturaFinalLitros, combustible } para un shift. */
export async function getHoseShiftMap(shiftId: string) {
  const qs = await getDocs(
    query(collection(db, "hose_shift"), where("shiftId", "==", shiftId))
  );
  const map: Record<string, any> = {};
  qs.forEach((d) => (map[d.id.split(`${shiftId}_`)[1]] = d.data()));
  return map as Record<
    string,
    {
      lecturaInicialLitros?: number;
      lecturaFinalLitros?: number;
      combustible: Combustible;
    }
  >;
}

/** Calcula litros vendidos por combustible para un turno a partir de hose_shift. */
export async function calcularVentasLitrosPorShift(
  shiftId: string
): Promise<{
  ventasPorComb: Record<Combustible, number>;
  totalLitros: number;
  hayLecturas: boolean;
}> {
  const qs = await getDocs(
    query(collection(db, "hose_shift"), where("shiftId", "==", shiftId))
  );

  const ventasPorComb: Record<Combustible, number> = {
    nafta_super: 0,
    nafta_premium: 0,
    gasoil: 0,
    gasoil_premium: 0,
  };
  let totalLitros = 0;

  qs.forEach((d) => {
    const x: any = d.data();
    if (x.lecturaInicialLitros != null && x.lecturaFinalLitros != null) {
      const v = Math.max(
        0,
        Number(x.lecturaFinalLitros) - Number(x.lecturaInicialLitros)
      );
      const comb = x.combustible as Combustible;
      if (ventasPorComb[comb] == null) ventasPorComb[comb] = 0;
      ventasPorComb[comb] += v;
      totalLitros += v;
    }
  });

  return {
    ventasPorComb,
    totalLitros,
    hayLecturas: !qs.empty,
  };
}

/* ===========================
   TANQUES
   =========================== */

export async function listTanks(): Promise<Tank[]> {
  const snap = await getDocs(collection(db, "tanques"));
  return snap.docs.map((d) => {
    const x = d.data() as Partial<Tank> & Record<string, any>;
    return {
      id: d.id,
      nombre: String(x.nombre ?? ""),
      producto: (x.producto ?? "nafta_super") as Combustible,
      capacidadLitros: Number(x.capacidadLitros ?? 0),
      stockLitros: Number(x.stockLitros ?? 0),
      nivelMinimo: x.nivelMinimo != null ? Number(x.nivelMinimo) : undefined,
      // extras que usamos en la UI
      lastVarillaCm: x.lastVarillaCm ?? null,
      lastTeleLitros: x.lastTeleLitros ?? null,
      ultimaActualizacion: x.ultimaActualizacion ?? null,
    } as Tank & {
      lastVarillaCm?: number | null;
      lastTeleLitros?: number | null;
      ultimaActualizacion?: any;
    };
  });
}

/** Crea/normaliza 4 tanques por defecto: t1..t4 */
export async function ensureDefaultTanks() {
  const defaults = [
    {
      id: "t1",
      nombre: "Tanque 1 – Súper",
      producto: "nafta_super",
      capacidadLitros: 21000,
      stockLitros: 0,
    },
    {
      id: "t2",
      nombre: "Tanque 2 – Premium",
      producto: "nafta_premium",
      capacidadLitros: 21000,
      stockLitros: 0,
    },
    {
      id: "t3",
      nombre: "Tanque 3 – Gasoil",
      producto: "gasoil",
      capacidadLitros: 21000,
      stockLitros: 0,
    },
    {
      id: "t4",
      nombre: "Tanque 4 – Gasoil Premium",
      producto: "gasoil_premium",
      capacidadLitros: 21000,
      stockLitros: 0,
    },
  ] as const;

  await Promise.all(
    defaults.map((t) =>
      setDoc(
        doc(db, "tanques", t.id),
        {
          nombre: t.nombre,
          producto: t.producto,
          capacidadLitros: t.capacidadLitros,
          stockLitros: t.stockLitros,
          createdAt: serverTimestamp(),
          id: t.id,
        },
        { merge: true }
      )
    )
  );
}

/** Guarda medición de tanque y actualiza "últimos" en el tanque. */
export async function saveTankReading(params: {
  shiftId: string;
  tankId: string;
  varillaCm?: number;
  teleLitros?: number;
  uid: string;
  email?: string | null;
}) {
  const { shiftId, tankId, varillaCm, teleLitros, uid, email } = params;

  const ref = await addDoc(collection(db, "tank_readings"), {
    shiftId,
    tankId,
    varillaCm: varillaCm ?? null,
    teleLitros: teleLitros ?? null,
    tomadaPorUid: uid,
    tomadaPorEmail: email ?? null,
    takenAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "tanques", tankId), {
    lastVarillaCm: varillaCm ?? null,
    lastTeleLitros: teleLitros ?? null,
    ultimaLecturaAt: serverTimestamp(),
  });

  return ref.id;
}

/* ===========================
   RECEPCIÓN DE CAMIÓN
   =========================== */

type RecepcionInput = {
  tanqueId: string;
  producto: Combustible;
  litrosFactura: number;
  litros15C?: number;
  tempC?: number;
  varillaPreLitros?: number;
  varillaPostLitros?: number;
  proveedor?: string;
  oc?: string;
  remito?: string;
  factura?: string;
  creadoPorUid: string;
  creadoPorEmail?: string;
  [k: string]: any;
};

export async function registrarRecepcionCamion(data: RecepcionInput) {
  const ref = await addDoc(collection(db, "recepciones_camion"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  await updateDoc(ref, { id: ref.id });

  const litros = Number(data.litros15C ?? data.litrosFactura ?? 0);
  if (data.tanqueId && litros > 0) {
    await updateDoc(doc(db, "tanques", data.tanqueId), {
      stockLitros: increment(litros),
      ultimaActualizacion: serverTimestamp(),
    });
  }
  return ref.id;
}

/* ===========================
   CIERRE DE TURNO con pagos y recargos + ajuste de tanques
   =========================== */

export async function closeShiftWithPayments(params: {
  shiftId: string;
  efectivo: number;
  tarjetas: Array<{ ult4?: string; monto: number; recargoPct?: number }>;
  transferencias: Array<{ ref?: string; monto: number; recargoPct?: number }>;
  cerradoPorUid: string;
  combustibleToTank?: Partial<Record<Combustible, string>>; // map opcional
}) {
  const {
    shiftId,
    efectivo,
    tarjetas,
    transferencias,
    cerradoPorUid,
    combustibleToTank = {
      nafta_super: "t1",
      nafta_premium: "t2",
      gasoil: "t3",
      gasoil_premium: "t4",
    },
  } = params;

  const pct = (x?: number) => (x ?? 0) / 100;
  const totalTarjetas = tarjetas.reduce(
    (a, t) => a + t.monto * (1 + pct(t.recargoPct)),
    0
  );
  const totalTransf = transferencias.reduce(
    (a, t) => a + t.monto * (1 + pct(t.recargoPct)),
    0
  );
  const totalTurno = efectivo + totalTarjetas + totalTransf;

  // 1) calcular litros vendidos por mangueras
  const { ventasPorComb, totalLitros, hayLecturas } =
    await calcularVentasLitrosPorShift(shiftId);

  if (!hayLecturas) {
    // Evitamos cerrar un turno sin lecturas de mangueras
    throw new Error(
      "No hay lecturas de mangueras para este turno. Registrá inicio y fin antes de cerrar."
    );
  }

  const now = new Date();
  const fechaStr = now.toISOString().slice(0, 10); // yyyy-MM-dd

  // 2) guardar pagos + info de litros en shift
  await updateDoc(doc(db, "shifts", shiftId), {
    estado: "cerrado",
    closedAt: serverTimestamp(),
    cerradoPorUid,
    fechaStr,
    pagos: {
      efectivo,
      tarjetas,
      transferencias,
      totalTarjetas,
      totalTransf,
      totalTurno,
    },
    // NUEVO: litros por combustible y totales
    ventasLitrosPorCombustible: ventasPorComb,
    litrosTotalesTurno: totalLitros,
  });

  // 3) restar ventas a stock de tanques
  await Promise.all(
    (Object.keys(ventasPorComb) as Combustible[]).map((comb) => {
      const litros = Math.max(0, ventasPorComb[comb] ?? 0);
      const tankId = combustibleToTank[comb];
      if (!tankId || litros <= 0) return Promise.resolve();
      return updateDoc(doc(db, "tanques", tankId), {
        stockLitros: increment(-litros),
        ultimaActualizacion: serverTimestamp(),
      });
    })
  );
}

/* ===========================
   CIERRE DIARIO (resumen por fecha)
   =========================== */

export type DailyTankRow = {
  tankId: string;
  nombre: string;
  producto: Combustible;
  lecturaInicioLitros?: number | null;
  lecturaFinLitros?: number | null;
  entradasLitros: number;
  ventasLitros: number;
  teoricoFinLitros?: number | null;
  diferenciaLitros?: number | null; // realFin - teorico
  nivelMinimo?: number | null;      // 👈 NUEVO
};


export type DailyClosure = {
  fechaStr: string;
  totalTurno: number;
  ventasLitrosPorCombustible: Record<Combustible, number>;
  litrosTotales: number;
  shifts: Array<{
    id: string;
    turno?: string;
    openedAt?: any;
    closedAt?: any;
    pagosTotalTurno: number;
    litrosTotalesTurno: number;
  }>;
  tanks: DailyTankRow[];
};

export async function getDailyClosure(
  fechaStr: string
): Promise<DailyClosure> {
  // Ventana horaria del día
  const start = new Date(`${fechaStr}T00:00:00`);
  const end = new Date(`${fechaStr}T23:59:59.999`);
  const startMs = start.getTime();
  const endMs = end.getTime();

  // --- 1) Shifts cerrados en esa fecha ---
  const qs = await getDocs(
    query(
      collection(db, "shifts"),
      where("estado", "==", "cerrado"),
      where("fechaStr", "==", fechaStr)
    )
  );

  const ventasLitrosPorCombustible: Record<Combustible, number> = {
    nafta_super: 0,
    nafta_premium: 0,
    gasoil: 0,
    gasoil_premium: 0,
  };
  let litrosTotales = 0;
  let totalTurno = 0;

  const shifts: DailyClosure["shifts"] = [];

  qs.forEach((d) => {
    const x: any = d.data();
    const pagos = x.pagos || {};
    const total = Number(pagos.totalTurno ?? 0);
    const litrosTurno = Number(x.litrosTotalesTurno ?? 0);
    const ventasComb = (x.ventasLitrosPorCombustible ||
      {}) as Record<string, number>;

    totalTurno += Number.isFinite(total) ? total : 0;
    litrosTotales += Number.isFinite(litrosTurno) ? litrosTurno : 0;

    // acumular por combustible
    (Object.keys(ventasComb) as Combustible[]).forEach((c) => {
      const v = Number(ventasComb[c] ?? 0);
      if (!Number.isFinite(v)) return;
      if (ventasLitrosPorCombustible[c] == null)
        ventasLitrosPorCombustible[c] = 0;
      ventasLitrosPorCombustible[c] += v;
    });

    shifts.push({
      id: d.id,
      turno: x.turno,
      openedAt: x.openedAt ?? null,
      closedAt: x.closedAt ?? null,
      pagosTotalTurno: Number.isFinite(total) ? total : 0,
      litrosTotalesTurno: Number.isFinite(litrosTurno) ? litrosTurno : 0,
    });
  });

  // --- 2) Lecturas de tanques del día (inicio / fin reales) ---
  const readingsSnap = await getDocs(collection(db, "tank_readings"));
  type TankReadState = {
    startTime?: number;
    startLitros?: number;
    endTime?: number;
    endLitros?: number;
  };
  const readingsByTank: Record<string, TankReadState> = {};

  readingsSnap.forEach((d) => {
    const x: any = d.data();
    const ts = x.takenAt;
    if (!ts || typeof ts.toMillis !== "function") return;
    const tMs = ts.toMillis();
    if (tMs < startMs || tMs > endMs) return;

    const tankId = String(x.tankId ?? "");
    if (!tankId) return;
    const tele = x.teleLitros != null ? Number(x.teleLitros) : NaN;
    if (!Number.isFinite(tele)) return;

    const prev = readingsByTank[tankId] || {};
    if (prev.startTime == null || tMs < prev.startTime) {
      prev.startTime = tMs;
      prev.startLitros = tele;
    }
    if (prev.endTime == null || tMs > prev.endTime) {
      prev.endTime = tMs;
      prev.endLitros = tele;
    }
    readingsByTank[tankId] = prev;
  });

  // --- 3) Recepciones de camión del día (entradas a cada tanque) ---
  const recepSnap = await getDocs(collection(db, "recepciones_camion"));
  const entradasByTank: Record<string, number> = {};

  recepSnap.forEach((d) => {
    const x: any = d.data();
    const ts = x.createdAt;
    if (!ts || typeof ts.toMillis !== "function") return;
    const tMs = ts.toMillis();
    if (tMs < startMs || tMs > endMs) return;

    const tankId = String(x.tanqueId ?? "");
    if (!tankId) return;

    const litros = Number(x.litros15C ?? x.litrosFactura ?? 0);
    if (!Number.isFinite(litros)) return;

    entradasByTank[tankId] = (entradasByTank[tankId] ?? 0) + litros;
  });

  // --- 4) Armar filas por tanque ---
  const tanksList = await listTanks();

  const tanks: DailyTankRow[] = tanksList.map((tank) => {
    const tankId = tank.id;
    const producto = tank.producto;
    const ventasLitros = ventasLitrosPorCombustible[producto] ?? 0;
    const lect = readingsByTank[tankId] || {};
    const entradasLitros = entradasByTank[tankId] ?? 0;

    const lecturaInicioLitros =
      lect.startLitros != null && Number.isFinite(lect.startLitros)
        ? lect.startLitros
        : null;
    const lecturaFinLitros =
      lect.endLitros != null && Number.isFinite(lect.endLitros)
        ? lect.endLitros
        : null;

    let teoricoFinLitros: number | null = null;
    let diferenciaLitros: number | null = null;

    if (lecturaInicioLitros != null) {
      // Teórico = inicio + entradas - ventas
      teoricoFinLitros =
        lecturaInicioLitros + entradasLitros - ventasLitros;

      if (lecturaFinLitros != null) {
        diferenciaLitros = lecturaFinLitros - teoricoFinLitros;
      }
    }

 return {
  tankId,
  nombre: tank.nombre,
  producto,
  lecturaInicioLitros,
  lecturaFinLitros,
  entradasLitros,
  ventasLitros,
  teoricoFinLitros,
  diferenciaLitros,
  nivelMinimo: tank.nivelMinimo ?? null, // 👈 NUEVO
};
  });

  return {
    fechaStr,
    totalTurno,
    ventasLitrosPorCombustible,
    litrosTotales,
    shifts,
    tanks,
  };
}


/* ===========================
   FICHADAS (asistencia de operarios)
   =========================== */

export type FichadaTipo = "entrada" | "salida";

export async function registrarFichada(params: {
  uid: string;
  email?: string | null;
  tipo: FichadaTipo;
  shiftId?: string | null;
}) {
  const now = new Date();
  const fechaStr = now.toISOString().slice(0, 10); // yyyy-MM-dd

  await addDoc(collection(db, "fichadas"), {
    uid: params.uid,
    email: params.email ?? null,
    tipo: params.tipo,         // "entrada" | "salida"
    shiftId: params.shiftId ?? null,
    fechaStr,
    createdAt: serverTimestamp(),
  });
}