// ============================================================
// Types for ICSA Optimizer - Distribution Network Optimization
// ============================================================

export interface NetworkLine {
  from: number        // Nodo origen (1-indexed)
  to: number          // Nodo destino (1-indexed)
  r: number           // Resistencia (Ohms)
  x: number           // Reactancia (Ohms)
}

export interface NetworkLoad {
  node: number        // Nodo (1-indexed)
  p: number           // Potencia activa (kW)
  q: number           // Potencia reactiva (kVAr)
}

export interface NetworkData {
  name: string
  nNodes: number
  Sbase: number       // Potencia base (kVA)
  Vbase: number       // Voltaje base (kV)
  Zbase: number       // Impedancia base (Ohms) = Vbase²/Sbase
  lines: NetworkLine[]
  loads: NetworkLoad[]
}

export interface HourlyLoadProfile {
  name: string
  demandFactors: number[]   // 24 valores, factor de demanda por hora
  solarFactors: number[]    // 24 valores, factor de irradiancia por hora
}

export interface EconomicParams {
  energyCost: number        // USD/kWh - Costo de energía
  pvCostPerKw: number       // USD/kWp - Costo de inversión PV
  omCostPerKwh: number      // USD/kWh - Costo O&M PV
  discountRate: number      // Tasa de descuento anual (0.10 = 10%)
  energyInflation: number   // Inflación energía anual (0.02 = 2%)
  horizonYears: number      // Años horizonte de planeación
  daysPerYear: number       // Días del año (típicamente 365)
  deltaH: number            // Delta tiempo (horas, típicamente 1)
}

export interface ICSAConfig {
  numGDs: number            // Número de generadores distribuidos (típicamente 3)
  populationSize: number    // Tamaño de población (80-100)
  maxIterations: number     // Iteraciones máximas (500-2000)
  flightLength: number      // Longitud de vuelo (típicamente 2.0)
  maxPvKw: number           // Tamaño máximo de cada GD en kW
  seed: number              // Semilla para reproducibilidad
}

export interface ICSACrow {
  position: number[]
  memory: number[]
  fitness: number
  memoryFitness: number
}

export interface ICSAHourlyResult {
  hour: number
  pLoss: number             // Pérdidas activas (kW)
  qLoss: number             // Pérdidas reactivas (kVAr)
  vMin: number              // Voltaje mínimo (p.u.)
  vMax: number              // Voltaje máximo (p.u.)
}

export interface SolarProfile {
  hour: number
  available: number         // Potencia solar disponible (kW)
  dispatched: number        // Potencia solar despachada (kW)
}

export interface ICSAResult {
  optimalNodes: number[]          // Nodos óptimos para ubicar GDs
  optimalSizes: number[]          // Tamaños óptimos de cada GD (kW)
  fitness: number                 // Valor de función objetivo
  f1_energyCost: number           // Componente: costo de energía (USD/año)
  f2_investmentCost: number       // Componente: inversión PV (USD/año)
  f3_omCost: number               // Componente: O&M (USD/año)
  baseCost: number                // Costo base sin FV (USD/año)
  optimizedCost: number           // Costo optimizado con FV = f1+f2+f3 (USD/año)
  savings: number                 // Ahorro anual = baseCost - optimizedCost (USD/año)
  savingsPercent: number          // Porcentaje de ahorro
  totalLossesKwh: number          // Pérdidas totales diarias (kWh/día)
  baselineLossesKwh: number       // Pérdidas base sin FV (kWh/día)
  lossReduction: number           // Reducción de pérdidas (%)
  totalSolarAvailable: number     // Energía solar disponible (kWh/día)
  totalSolarDispatched: number    // Energía solar despachada (kWh/día)
  curtailmentPercent: number      // Recorte solar (%)
  vMin: number                    // Voltaje mínimo absoluto (p.u.)
  vMax: number                    // Voltaje máximo absoluto (p.u.)
  hourlyResults: ICSAHourlyResult[]
  solarProfiles: SolarProfile[]
  voltageProfiles: number[][]     // [nodo][hora]
  convergenceCurve: number[]      // Historia de convergencia
  computeTimeMs: number           // Tiempo de cómputo (ms)
  totalGenerations: number        // Iteraciones totales
}

// ============================================================
// Casos de Prueba IEEE
// ============================================================

export interface IEEETestCase {
  name: string
  description: string
  network: NetworkData
}
