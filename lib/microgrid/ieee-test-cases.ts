// ============================================================
// Casos de Prueba IEEE para Redes de Distribución
// IEEE 33 Nodos y IEEE 69 Nodos
// ============================================================

import type { NetworkData, HourlyLoadProfile, EconomicParams, IEEETestCase } from "./icsa-types"

// ============================================================
// IEEE 33 NODOS
// Sistema de prueba estándar para redes de distribución radiales
// Vbase = 12.66 kV, Sbase = 100 MVA
// ============================================================

export const IEEE_33_LINES: { from: number; to: number; r: number; x: number }[] = [
  { from: 1, to: 2, r: 0.0922, x: 0.0477 },
  { from: 2, to: 3, r: 0.4930, x: 0.2511 },
  { from: 3, to: 4, r: 0.3660, x: 0.1864 },
  { from: 4, to: 5, r: 0.3811, x: 0.1941 },
  { from: 5, to: 6, r: 0.8190, x: 0.7070 },
  { from: 6, to: 7, r: 0.1872, x: 0.6188 },
  { from: 7, to: 8, r: 1.7114, x: 1.2351 },
  { from: 8, to: 9, r: 1.0300, x: 0.7400 },
  { from: 9, to: 10, r: 1.0400, x: 0.7400 },
  { from: 10, to: 11, r: 0.1966, x: 0.0650 },
  { from: 11, to: 12, r: 0.3744, x: 0.1238 },
  { from: 12, to: 13, r: 1.4680, x: 1.1550 },
  { from: 13, to: 14, r: 0.5416, x: 0.7129 },
  { from: 14, to: 15, r: 0.5910, x: 0.5260 },
  { from: 15, to: 16, r: 0.7463, x: 0.5450 },
  { from: 16, to: 17, r: 1.2890, x: 1.7210 },
  { from: 17, to: 18, r: 0.7320, x: 0.5740 },
  { from: 2, to: 19, r: 0.1640, x: 0.1565 },
  { from: 19, to: 20, r: 1.5042, x: 1.3554 },
  { from: 20, to: 21, r: 0.4095, x: 0.4784 },
  { from: 21, to: 22, r: 0.7089, x: 0.9373 },
  { from: 3, to: 23, r: 0.4512, x: 0.3083 },
  { from: 23, to: 24, r: 0.8980, x: 0.7091 },
  { from: 24, to: 25, r: 0.8960, x: 0.7011 },
  { from: 6, to: 26, r: 0.2030, x: 0.1034 },
  { from: 26, to: 27, r: 0.2842, x: 0.1447 },
  { from: 27, to: 28, r: 1.0590, x: 0.9337 },
  { from: 28, to: 29, r: 0.8042, x: 0.7006 },
  { from: 29, to: 30, r: 0.5075, x: 0.2585 },
  { from: 30, to: 31, r: 0.9744, x: 0.9630 },
  { from: 31, to: 32, r: 0.3105, x: 0.3619 },
  { from: 32, to: 33, r: 0.3410, x: 0.5302 },
]

export const IEEE_33_LOADS: { node: number; p: number; q: number }[] = [
  { node: 1, p: 0, q: 0 },
  { node: 2, p: 100, q: 60 },
  { node: 3, p: 90, q: 40 },
  { node: 4, p: 120, q: 80 },
  { node: 5, p: 60, q: 30 },
  { node: 6, p: 60, q: 20 },
  { node: 7, p: 200, q: 100 },
  { node: 8, p: 200, q: 100 },
  { node: 9, p: 60, q: 20 },
  { node: 10, p: 60, q: 20 },
  { node: 11, p: 45, q: 30 },
  { node: 12, p: 60, q: 35 },
  { node: 13, p: 60, q: 35 },
  { node: 14, p: 120, q: 80 },
  { node: 15, p: 60, q: 10 },
  { node: 16, p: 60, q: 20 },
  { node: 17, p: 60, q: 20 },
  { node: 18, p: 90, q: 40 },
  { node: 19, p: 90, q: 40 },
  { node: 20, p: 90, q: 40 },
  { node: 21, p: 90, q: 40 },
  { node: 22, p: 90, q: 40 },
  { node: 23, p: 90, q: 50 },
  { node: 24, p: 420, q: 200 },
  { node: 25, p: 420, q: 200 },
  { node: 26, p: 60, q: 25 },
  { node: 27, p: 60, q: 25 },
  { node: 28, p: 60, q: 20 },
  { node: 29, p: 120, q: 70 },
  { node: 30, p: 200, q: 600 },
  { node: 31, p: 150, q: 70 },
  { node: 32, p: 210, q: 100 },
  { node: 33, p: 60, q: 40 },
]

// ============================================================
// IEEE 69 NODOS
// Sistema de prueba más grande para redes de distribución radiales
// Vbase = 12.66 kV, Sbase = 100 MVA
// ============================================================

export const IEEE_69_LINES: { from: number; to: number; r: number; x: number }[] = [
  { from: 1, to: 2, r: 0.0005, x: 0.0012 },
  { from: 2, to: 3, r: 0.0005, x: 0.0012 },
  { from: 3, to: 4, r: 0.0015, x: 0.0036 },
  { from: 4, to: 5, r: 0.0251, x: 0.0294 },
  { from: 5, to: 6, r: 0.3660, x: 0.1864 },
  { from: 6, to: 7, r: 0.3811, x: 0.1941 },
  { from: 7, to: 8, r: 0.0922, x: 0.0470 },
  { from: 8, to: 9, r: 0.0493, x: 0.0251 },
  { from: 9, to: 10, r: 0.8190, x: 0.2707 },
  { from: 10, to: 11, r: 0.1872, x: 0.0619 },
  { from: 11, to: 12, r: 0.7114, x: 0.2351 },
  { from: 12, to: 13, r: 1.0300, x: 0.3400 },
  { from: 13, to: 14, r: 1.0440, x: 0.3450 },
  { from: 14, to: 15, r: 1.0580, x: 0.3496 },
  { from: 15, to: 16, r: 0.1966, x: 0.0650 },
  { from: 16, to: 17, r: 0.3744, x: 0.1238 },
  { from: 17, to: 18, r: 0.0047, x: 0.0016 },
  { from: 18, to: 19, r: 0.3276, x: 0.1083 },
  { from: 19, to: 20, r: 0.2106, x: 0.0690 },
  { from: 20, to: 21, r: 0.3416, x: 0.1129 },
  { from: 21, to: 22, r: 0.0140, x: 0.0046 },
  { from: 22, to: 23, r: 0.1591, x: 0.0526 },
  { from: 23, to: 24, r: 0.3463, x: 0.1145 },
  { from: 24, to: 25, r: 0.7488, x: 0.2475 },
  { from: 25, to: 26, r: 0.3089, x: 0.1021 },
  { from: 26, to: 27, r: 0.1732, x: 0.0572 },
  { from: 3, to: 28, r: 0.0044, x: 0.0108 },
  { from: 28, to: 29, r: 0.0640, x: 0.1565 },
  { from: 29, to: 30, r: 0.3978, x: 0.1315 },
  { from: 30, to: 31, r: 0.0702, x: 0.0232 },
  { from: 31, to: 32, r: 0.3510, x: 0.1160 },
  { from: 32, to: 33, r: 0.8390, x: 0.2816 },
  { from: 33, to: 34, r: 1.7080, x: 0.5646 },
  { from: 34, to: 35, r: 1.4740, x: 0.4873 },
  { from: 3, to: 36, r: 0.0044, x: 0.0108 },
  { from: 36, to: 37, r: 0.0640, x: 0.1565 },
  { from: 37, to: 38, r: 0.1053, x: 0.1230 },
  { from: 38, to: 39, r: 0.0304, x: 0.0355 },
  { from: 39, to: 40, r: 0.0018, x: 0.0021 },
  { from: 40, to: 41, r: 0.7283, x: 0.8509 },
  { from: 41, to: 42, r: 0.3100, x: 0.3623 },
  { from: 42, to: 43, r: 0.0410, x: 0.0478 },
  { from: 43, to: 44, r: 0.0092, x: 0.0116 },
  { from: 44, to: 45, r: 0.1089, x: 0.1373 },
  { from: 45, to: 46, r: 0.0009, x: 0.0012 },
  { from: 4, to: 47, r: 0.0034, x: 0.0084 },
  { from: 47, to: 48, r: 0.0851, x: 0.2083 },
  { from: 48, to: 49, r: 0.2898, x: 0.7091 },
  { from: 49, to: 50, r: 0.0822, x: 0.2011 },
  { from: 8, to: 51, r: 0.0928, x: 0.0473 },
  { from: 51, to: 52, r: 0.3319, x: 0.1140 },
  { from: 9, to: 53, r: 0.1740, x: 0.0886 },
  { from: 53, to: 54, r: 0.2030, x: 0.1034 },
  { from: 54, to: 55, r: 0.2842, x: 0.1447 },
  { from: 55, to: 56, r: 0.2813, x: 0.1433 },
  { from: 56, to: 57, r: 1.5900, x: 0.5337 },
  { from: 57, to: 58, r: 0.7837, x: 0.2630 },
  { from: 58, to: 59, r: 0.3042, x: 0.1006 },
  { from: 59, to: 60, r: 0.3861, x: 0.1172 },
  { from: 60, to: 61, r: 0.5075, x: 0.2585 },
  { from: 61, to: 62, r: 0.0974, x: 0.0496 },
  { from: 62, to: 63, r: 0.1450, x: 0.0738 },
  { from: 63, to: 64, r: 0.7105, x: 0.3619 },
  { from: 64, to: 65, r: 1.0410, x: 0.5302 },
  { from: 11, to: 66, r: 0.2012, x: 0.0611 },
  { from: 66, to: 67, r: 0.0047, x: 0.0014 },
  { from: 12, to: 68, r: 0.7394, x: 0.2444 },
  { from: 68, to: 69, r: 0.0047, x: 0.0016 },
]

export const IEEE_69_LOADS: { node: number; p: number; q: number }[] = [
  { node: 1, p: 0, q: 0 },
  { node: 2, p: 0, q: 0 },
  { node: 3, p: 0, q: 0 },
  { node: 4, p: 0, q: 0 },
  { node: 5, p: 0, q: 0 },
  { node: 6, p: 2.6, q: 2.2 },
  { node: 7, p: 40.4, q: 30 },
  { node: 8, p: 75, q: 54 },
  { node: 9, p: 30, q: 22 },
  { node: 10, p: 28, q: 19 },
  { node: 11, p: 145, q: 104 },
  { node: 12, p: 145, q: 104 },
  { node: 13, p: 8, q: 5 },
  { node: 14, p: 8, q: 5 },
  { node: 15, p: 0, q: 0 },
  { node: 16, p: 45, q: 30 },
  { node: 17, p: 60, q: 35 },
  { node: 18, p: 60, q: 35 },
  { node: 19, p: 0, q: 0 },
  { node: 20, p: 1, q: 0.6 },
  { node: 21, p: 114, q: 81 },
  { node: 22, p: 5, q: 3.5 },
  { node: 23, p: 0, q: 0 },
  { node: 24, p: 28, q: 20 },
  { node: 25, p: 0, q: 0 },
  { node: 26, p: 14, q: 10 },
  { node: 27, p: 14, q: 10 },
  { node: 28, p: 26, q: 18.6 },
  { node: 29, p: 26, q: 18.6 },
  { node: 30, p: 0, q: 0 },
  { node: 31, p: 0, q: 0 },
  { node: 32, p: 0, q: 0 },
  { node: 33, p: 10, q: 10 },
  { node: 34, p: 14, q: 14 },
  { node: 35, p: 4, q: 4 },
  { node: 36, p: 26, q: 18.55 },
  { node: 37, p: 26, q: 18.55 },
  { node: 38, p: 0, q: 0 },
  { node: 39, p: 24, q: 17 },
  { node: 40, p: 24, q: 17 },
  { node: 41, p: 102, q: 1 },
  { node: 42, p: 0, q: 0 },
  { node: 43, p: 6, q: 4.3 },
  { node: 44, p: 0, q: 0 },
  { node: 45, p: 39.22, q: 26.3 },
  { node: 46, p: 39.22, q: 26.3 },
  { node: 47, p: 0, q: 0 },
  { node: 48, p: 79, q: 56.4 },
  { node: 49, p: 384.7, q: 274.5 },
  { node: 50, p: 384.7, q: 274.5 },
  { node: 51, p: 40.5, q: 28.3 },
  { node: 52, p: 3.6, q: 2.7 },
  { node: 53, p: 4.35, q: 3.5 },
  { node: 54, p: 26.4, q: 19 },
  { node: 55, p: 24, q: 17.2 },
  { node: 56, p: 0, q: 0 },
  { node: 57, p: 0, q: 0 },
  { node: 58, p: 0, q: 0 },
  { node: 59, p: 100, q: 72 },
  { node: 60, p: 0, q: 0 },
  { node: 61, p: 1244, q: 888 },
  { node: 62, p: 32, q: 23 },
  { node: 63, p: 0, q: 0 },
  { node: 64, p: 227, q: 162 },
  { node: 65, p: 59, q: 42 },
  { node: 66, p: 18, q: 13 },
  { node: 67, p: 18, q: 13 },
  { node: 68, p: 28, q: 20 },
  { node: 69, p: 28, q: 20 },
]

// ============================================================
// Perfiles de Carga Típicos para Colombia
// ============================================================

/**
 * Perfil de carga típico para ZNI (Zonas No Interconectadas)
 * Basado en datos del IPSE y caracterizaciones de la Universidad de La Salle
 */
export const LOAD_PROFILE_ZNI_RURAL: HourlyLoadProfile = {
  name: "ZNI Rural Típico",
  demandFactors: [
    0.318840579710145,  // 01:00
    0.231884057971015,  // 02:00
    0.217391304347826,  // 03:00
    0.173913043478261,  // 04:00
    0.188405797101449,  // 05:00
    0.246376811594203,  // 06:00
    0.318840579710145,  // 07:00
    0.463768115942029,  // 08:00
    0.666666666666667,  // 09:00
    0.782608695652174,  // 10:00
    0.884057971014493,  // 11:00
    0.942028985507247,  // 12:00
    0.985507246376812,  // 13:00
    0.898550724637681,  // 14:00
    0.913043478260870,  // 15:00
    0.927536231884058,  // 16:00
    0.927536231884058,  // 17:00
    0.927536231884058,  // 18:00
    0.884057971014493,  // 19:00
    1.0,                // 20:00 - PICO
    1.0,                // 21:00 - PICO
    0.898550724637681,  // 22:00
    0.739130434782609,  // 23:00
    0.565217391304348,  // 24:00
  ],
  solarFactors: [
    0,                  // 01:00
    0,                  // 02:00
    0,                  // 03:00
    0,                  // 04:00
    0,                  // 05:00
    0,                  // 06:00
    0.0000545808966861599,  // 07:00
    0.0564569539791508,     // 08:00
    0.264300133909653,      // 09:00
    0.540005078396474,      // 10:00
    0.763240803457920,      // 11:00
    0.935183605390287,      // 12:00
    0.952899120264429,      // 13:00 - PICO SOLAR
    0.954615842020510,      // 14:00 - PICO SOLAR
    0.833914155436902,      // 15:00
    0.693488790575473,      // 16:00
    0.388850607678617,      // 17:00
    0.181085807271803,      // 18:00
    0.0244781964573269,     // 19:00
    0,                  // 20:00
    0,                  // 21:00
    0,                  // 22:00
    0,                  // 23:00
    0,                  // 24:00
  ]
}

/**
 * Perfil de carga urbano típico (ciudades intermedias)
 * Basado en datos de XM/SIMEM para operadores de red
 */
export const LOAD_PROFILE_URBAN: HourlyLoadProfile = {
  name: "Urbano Típico",
  demandFactors: [
    0.45,  // 01:00
    0.40,  // 02:00
    0.38,  // 03:00
    0.35,  // 04:00
    0.38,  // 05:00
    0.55,  // 06:00
    0.75,  // 07:00
    0.85,  // 08:00
    0.90,  // 09:00
    0.92,  // 10:00
    0.95,  // 11:00
    1.00,  // 12:00 - PICO MEDIODÍA
    0.92,  // 13:00
    0.88,  // 14:00
    0.85,  // 15:00
    0.82,  // 16:00
    0.80,  // 17:00
    0.85,  // 18:00
    0.92,  // 19:00
    0.98,  // 20:00 - PICO NOCHE
    0.90,  // 21:00
    0.75,  // 22:00
    0.60,  // 23:00
    0.50,  // 24:00
  ],
  solarFactors: LOAD_PROFILE_ZNI_RURAL.solarFactors // Mismo perfil solar
}

/**
 * Perfil de carga industrial
 */
export const LOAD_PROFILE_INDUSTRIAL: HourlyLoadProfile = {
  name: "Industrial",
  demandFactors: [
    0.30,  // 01:00
    0.30,  // 02:00
    0.30,  // 03:00
    0.30,  // 04:00
    0.30,  // 05:00
    0.50,  // 06:00
    0.90,  // 07:00
    1.00,  // 08:00 - INICIO TURNO
    1.00,  // 09:00
    1.00,  // 10:00
    1.00,  // 11:00
    0.80,  // 12:00 - ALMUERZO
    1.00,  // 13:00
    1.00,  // 14:00
    1.00,  // 15:00
    1.00,  // 16:00
    0.90,  // 17:00 - FIN TURNO
    0.50,  // 18:00
    0.35,  // 19:00
    0.30,  // 20:00
    0.30,  // 21:00
    0.30,  // 22:00
    0.30,  // 23:00
    0.30,  // 24:00
  ],
  solarFactors: LOAD_PROFILE_ZNI_RURAL.solarFactors
}

// ============================================================
// Parámetros Económicos por Defecto (Colombia 2024-2026)
// ============================================================

export const DEFAULT_ECONOMIC_PARAMS: EconomicParams = {
  energyCost: 0.1390,       // USD/kWh - Costo promedio ZNI Colombia
  pvCostPerKw: 1036.49,     // USD/kWp - Costo de inversión PV (incluye instalación)
  omCostPerKwh: 0.0019,     // USD/kWh - Costo O&M PV
  discountRate: 0.10,       // 10% - Tasa de interés
  energyInflation: 0.02,    // 2% - Inflación energía
  horizonYears: 20,         // 20 años horizonte
  daysPerYear: 365,         // Días del año
  deltaH: 1                 // Delta tiempo (1 hora)
}

// ============================================================
// Construcción de NetworkData para IEEE
// ============================================================

const VBASE_KV = 12.66
const SBASE_KVA = 100000 // 100 MVA
const ZBASE = (VBASE_KV * 1000) ** 2 / (SBASE_KVA * 1000) // Ohms

export const IEEE_33_NETWORK: NetworkData = {
  name: "IEEE 33 Nodos",
  nNodes: 33,
  Sbase: SBASE_KVA,
  Vbase: VBASE_KV,
  Zbase: ZBASE,
  lines: IEEE_33_LINES,
  loads: IEEE_33_LOADS
}

export const IEEE_69_NETWORK: NetworkData = {
  name: "IEEE 69 Nodos",
  nNodes: 69,
  Sbase: SBASE_KVA,
  Vbase: VBASE_KV,
  Zbase: ZBASE,
  lines: IEEE_69_LINES,
  loads: IEEE_69_LOADS
}

// ============================================================
// Exportar casos de prueba completos
// ============================================================

export const IEEE_TEST_CASES: IEEETestCase[] = [
  {
    name: "IEEE 33 Nodos",
    description: "Sistema de prueba estándar de 33 nodos para redes de distribución radiales. Demanda total: 3,715 kW, 2,300 kVAr.",
    network: IEEE_33_NETWORK
  },
  {
    name: "IEEE 69 Nodos",
    description: "Sistema de prueba de 69 nodos para redes de distribución radiales más complejas. Demanda total: 3,802 kW, 2,695 kVAr.",
    network: IEEE_69_NETWORK
  }
]

export const LOAD_PROFILES: { [key: string]: HourlyLoadProfile } = {
  "zni-rural": LOAD_PROFILE_ZNI_RURAL,
  "urban": LOAD_PROFILE_URBAN,
  "industrial": LOAD_PROFILE_INDUSTRIAL
}

// ============================================================
// Formato alternativo para compatibilidad con step-icsa
// ============================================================

export const IEEE_33_NODE = {
  nNodes: 33,
  Vbase_kV: VBASE_KV,
  Sbase_kVA: SBASE_KVA,
  lines: IEEE_33_LINES.map(l => [l.from, l.to, l.r, l.x] as [number, number, number, number]),
  loads: IEEE_33_LOADS.map(l => [l.node, l.p, l.q] as [number, number, number])
}

export const IEEE_69_NODE = {
  nNodes: 69,
  Vbase_kV: VBASE_KV,
  Sbase_kVA: SBASE_KVA,
  lines: IEEE_69_LINES.map(l => [l.from, l.to, l.r, l.x] as [number, number, number, number]),
  loads: IEEE_69_LOADS.map(l => [l.node, l.p, l.q] as [number, number, number])
}
