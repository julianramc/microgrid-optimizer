// ============================================================
// ICSA: Improved Crow Search Algorithm
// Optimización para Integración Solar FV en Redes de Distribución
// Basado en: Díaz et al., 2018 - Adaptado por Julián Oswaldo Ramírez Cabrera
// ============================================================

import type {
  ICSAConfig,
  ICSAResult,
  NetworkData,
  HourlyLoadProfile,
  EconomicParams,
  ICSACrow,
  ICSAHourlyResult,
  SolarProfile
} from "./icsa-types"

// --- PRNG (Xorshift32 para reproducibilidad) ---
class SeededRandom {
  private state: number
  constructor(seed: number) {
    this.state = seed | 0 || 1
  }
  next(): number {
    let x = this.state
    x ^= x << 13
    x ^= x >> 17
    x ^= x << 5
    this.state = x
    return (x >>> 0) / 4294967296
  }
  nextGaussian(): number {
    let u = 0, v = 0
    while (u === 0) u = this.next()
    while (v === 0) v = this.next()
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  }
}

/**
 * Construye la matriz de admitancia nodal (Ybus) del sistema
 */
function buildYbus(network: NetworkData): {
  Ybus: number[][],
  YbusImag: number[][],
  Y_dg: number[],
  Y_dg_imag: number[],
  IYdd: number[][],
  IYdd_imag: number[][]
} {
  const nNodes = network.nNodes
  const Ybus: number[][] = Array.from({ length: nNodes }, () => Array(nNodes).fill(0))
  const YbusImag: number[][] = Array.from({ length: nNodes }, () => Array(nNodes).fill(0))

  for (const line of network.lines) {
    const ni = line.from - 1
    const nj = line.to - 1
    const rPu = line.r / network.Zbase
    const xPu = line.x / network.Zbase

    // y = 1/(r + jx) = (r - jx)/(r² + x²)
    const denom = rPu * rPu + xPu * xPu
    const gReal = rPu / denom
    const gImag = -xPu / denom

    Ybus[ni][nj] -= gReal
    YbusImag[ni][nj] -= gImag
    Ybus[nj][ni] -= gReal
    YbusImag[nj][ni] -= gImag

    Ybus[ni][ni] += gReal
    YbusImag[ni][ni] += gImag
    Ybus[nj][nj] += gReal
    YbusImag[nj][nj] += gImag
  }

  // Extraer submatrices para flujo de potencia
  const Y_dg: number[] = []
  const Y_dg_imag: number[] = []
  for (let i = 1; i < nNodes; i++) {
    Y_dg.push(Ybus[i][0])
    Y_dg_imag.push(YbusImag[i][0])
  }

  // Y_dd es la submatriz de nodos de carga (excluyendo slack)
  const nLoads = nNodes - 1
  const Y_dd: number[][] = []
  const Y_dd_imag: number[][] = []
  for (let i = 1; i < nNodes; i++) {
    const row: number[] = []
    const rowImag: number[] = []
    for (let j = 1; j < nNodes; j++) {
      row.push(Ybus[i][j])
      rowImag.push(YbusImag[i][j])
    }
    Y_dd.push(row)
    Y_dd_imag.push(rowImag)
  }

  // Invertir Y_dd complejo
  const invYdd = invertComplexMatrix(Y_dd, Y_dd_imag, nLoads)
  const IYdd = invYdd.invReal
  const IYdd_imag = invYdd.invImag

  return { Ybus, YbusImag, Y_dg, Y_dg_imag, IYdd, IYdd_imag }
}

/**
 * Inversión de matriz compleja usando eliminación Gauss-Jordan
 */
function invertComplexMatrix(real: number[][], imag: number[][], n: number): { invReal: number[][], invImag: number[][] } {
  const augReal: number[][] = []
  const augImag: number[][] = []

  for (let i = 0; i < n; i++) {
    const rRow: number[] = [...real[i]]
    const iRow: number[] = [...imag[i]]
    for (let j = 0; j < n; j++) {
      rRow.push(i === j ? 1 : 0)
      iRow.push(0)
    }
    augReal.push(rRow)
    augImag.push(iRow)
  }

  // Eliminación Gauss-Jordan con pivoteo parcial
  for (let col = 0; col < n; col++) {
    // Encontrar pivote máximo
    let maxRow = col
    let maxMag2 = augReal[col][col] ** 2 + augImag[col][col] ** 2
    for (let row = col + 1; row < n; row++) {
      const mag2 = augReal[row][col] ** 2 + augImag[row][col] ** 2
      if (mag2 > maxMag2) {
        maxRow = row
        maxMag2 = mag2
      }
    }

    const tmpR = augReal[col]; augReal[col] = augReal[maxRow]; augReal[maxRow] = tmpR;
    const tmpI = augImag[col]; augImag[col] = augImag[maxRow]; augImag[maxRow] = tmpI;

    const pReal = augReal[col][col]
    const pImag = augImag[col][col]
    const pMag2 = pReal * pReal + pImag * pImag

    if (pMag2 < 1e-24) continue

    // Inverso del complejo
    const invPReal = pReal / pMag2
    const invPImag = -pImag / pMag2

    for (let j = col; j < 2 * n; j++) {
      const valReal = augReal[col][j]
      const valImag = augImag[col][j]
      augReal[col][j] = valReal * invPReal - valImag * invPImag
      augImag[col][j] = valReal * invPImag + valImag * invPReal
    }

    for (let row = 0; row < n; row++) {
      if (row !== col) {
        const factorReal = augReal[row][col]
        const factorImag = augImag[row][col]
        for (let j = col; j < 2 * n; j++) {
          const valReal = augReal[col][j]
          const valImag = augImag[col][j]
          augReal[row][j] -= (factorReal * valReal - factorImag * valImag)
          augImag[row][j] -= (factorReal * valImag + factorImag * valReal)
        }
      }
    }
  }

  const invReal: number[][] = []
  const invImag: number[][] = []
  for (let i = 0; i < n; i++) {
    invReal.push(augReal[i].slice(n))
    invImag.push(augImag[i].slice(n))
  }
  return { invReal, invImag }
}

/**
 * Ejecuta flujo de potencia usando aproximaciones sucesivas
 */
function runPowerFlow(
  network: NetworkData,
  loads: { node: number; p: number; q: number }[],
  pvInjections: { node: number; p: number }[],
  matrices: ReturnType<typeof buildYbus>,
  tol: number = 1e-10,
  maxIter: number = 400
): { V: number[], Vangle: number[], converged: boolean } {
  const nLoads = network.nNodes - 1
  const V = Array(network.nNodes).fill(1.0)
  const Vangle = Array(network.nNodes).fill(0)

  // Potencia neta en cada nodo de carga (en p.u.)
  const Snet: { real: number, imag: number }[] = []
  for (let i = 0; i < nLoads; i++) {
    const nodeIdx = i + 2 // Nodos 2 a N
    const load = loads.find(l => l.node === nodeIdx)
    const pv = pvInjections.find(p => p.node === nodeIdx)

    const pLoad = load ? load.p / network.Sbase : 0
    const qLoad = load ? load.q / network.Sbase : 0
    const pPv = pv ? pv.p / network.Sbase : 0

    Snet.push({ real: pLoad - pPv, imag: qLoad })
  }

  // Iteración de punto fijo
  const Vd_real = Array(nLoads).fill(1.0)
  const Vd_imag = Array(nLoads).fill(0.0)

  for (let iter = 0; iter < maxIter; iter++) {
    const Vd_old_real = [...Vd_real]
    const Vd_old_imag = [...Vd_imag]

    // Calcular corrientes inyectadas: I = conj(S/V)
    const I_real: number[] = []
    const I_imag: number[] = []
    for (let i = 0; i < nLoads; i++) {
      const Vmag2 = Vd_real[i] * Vd_real[i] + Vd_imag[i] * Vd_imag[i]
      if (Vmag2 < 1e-12) {
        I_real.push(0)
        I_imag.push(0)
      } else {
        // conj(S) / conj(V) = (P - jQ) / (Vr - jVi)
        // = (P - jQ)(Vr + jVi) / (Vr² + Vi²)
        // = (P*Vr + Q*Vi + j(P*Vi - Q*Vr)) / |V|²
        I_real.push((Snet[i].real * Vd_real[i] + Snet[i].imag * Vd_imag[i]) / Vmag2)
        I_imag.push((Snet[i].real * Vd_imag[i] - Snet[i].imag * Vd_real[i]) / Vmag2)
      }
    }

    // V_d = -IYdd * (I + Y_dg * V_g)
    // Como V_g = 1 + j0, Y_dg * V_g = Y_dg
    for (let i = 0; i < nLoads; i++) {
      let sumReal = 0
      let sumImag = 0
      for (let j = 0; j < nLoads; j++) {
        const termReal = I_real[j] + matrices.Y_dg[j]
        const termImag = I_imag[j] + matrices.Y_dg_imag[j]

        sumReal += matrices.IYdd[i][j] * termReal - matrices.IYdd_imag[i][j] * termImag
        sumImag += matrices.IYdd[i][j] * termImag + matrices.IYdd_imag[i][j] * termReal
      }
      Vd_real[i] = -sumReal
      Vd_imag[i] = -sumImag
    }

    // Verificar convergencia
    let maxDiff = 0
    for (let i = 0; i < nLoads; i++) {
      const diff = Math.sqrt(
        (Vd_real[i] - Vd_old_real[i]) ** 2 +
        (Vd_imag[i] - Vd_old_imag[i]) ** 2
      )
      maxDiff = Math.max(maxDiff, diff)
    }

    if (maxDiff < tol) {
      // Actualizar vector de voltajes
      V[0] = 1.0
      for (let i = 0; i < nLoads; i++) {
        V[i + 1] = Math.sqrt(Vd_real[i] ** 2 + Vd_imag[i] ** 2)
        Vangle[i + 1] = Math.atan2(Vd_imag[i], Vd_real[i])
      }
      return { V, Vangle, converged: true }
    }
  }

  // No convergió pero retornar último valor
  V[0] = 1.0
  for (let i = 0; i < nLoads; i++) {
    V[i + 1] = Math.sqrt(Vd_real[i] ** 2 + Vd_imag[i] ** 2)
    Vangle[i + 1] = Math.atan2(Vd_imag[i], Vd_real[i])
  }
  return { V, Vangle, converged: false }
}

/**
 * Calcula pérdidas de potencia en las líneas
 */
function calculateLosses(
  network: NetworkData,
  V: number[],
  Vangle: number[]
): { pLoss: number, qLoss: number } {
  let pLoss = 0
  let qLoss = 0

  for (const line of network.lines) {
    const ni = line.from - 1
    const nj = line.to - 1

    // Corriente por la línea: I = (Vi - Vj) / Z
    const Vi_real = V[ni] * Math.cos(Vangle[ni])
    const Vi_imag = V[ni] * Math.sin(Vangle[ni])
    const Vj_real = V[nj] * Math.cos(Vangle[nj])
    const Vj_imag = V[nj] * Math.sin(Vangle[nj])

    const dV_real = Vi_real - Vj_real
    const dV_imag = Vi_imag - Vj_imag

    const rPu = line.r / network.Zbase
    const xPu = line.x / network.Zbase
    const Zmag2 = rPu * rPu + xPu * xPu

    // I = dV / Z = dV * conj(Z) / |Z|²
    const I_real = (dV_real * rPu + dV_imag * xPu) / Zmag2
    const I_imag = (dV_imag * rPu - dV_real * xPu) / Zmag2
    const Imag2 = I_real * I_real + I_imag * I_imag

    // Pérdidas = |I|² * R (en p.u., luego convertir a kW)
    pLoss += Imag2 * rPu * network.Sbase
    qLoss += Imag2 * xPu * network.Sbase
  }

  return { pLoss, qLoss }
}

/**
 * Función de fitness del ICSA
 * Evalúa el costo total anual considerando despacho horario
 */
function fitnessFunction(
  crow: number[],
  network: NetworkData,
  loadProfile: HourlyLoadProfile,
  economics: EconomicParams,
  numGDs: number,
  horasSolIdx: number[],
  matrices: ReturnType<typeof buildYbus>
): {
  fitness: number,
  f1: number,
  f2: number,
  f3: number,
  hourlyResults: ICSAHourlyResult[],
  solarProfiles: SolarProfile[],
  voltages: number[][],
  pSlackTotal: number
} {
  // Decodificar posición del cuervo
  const gdNodes = crow.slice(0, numGDs).map(n => Math.round(n))
  const gdSizes = crow.slice(numGDs, 2 * numGDs) // kW
  const dispatchVector = crow.slice(2 * numGDs)

  // Reshape dispatch a matriz [GD x hora_sol]
  const numHSol = horasSolIdx.length
  const dispatchMatrix: number[][] = []
  for (let g = 0; g < numGDs; g++) {
    dispatchMatrix.push(dispatchVector.slice(g * numHSol, (g + 1) * numHSol))
  }

  // Penalizar nodos duplicados
  const uniqueNodes = new Set(gdNodes)
  if (uniqueNodes.size < numGDs) {
    return {
      fitness: 1e8,
      f1: 0, f2: 0, f3: 0,
      hourlyResults: [],
      solarProfiles: [],
      voltages: [],
      pSlackTotal: 0
    }
  }

  let totalLossesKwh = 0
  let penaltyVoltage = 0
  let pSlackTotal = 0
  let pFvTotalDisp = 0

  const hourlyResults: ICSAHourlyResult[] = []
  const solarProfiles: SolarProfile[] = []
  const voltages: number[][] = []

  // Cargas nominales
  const nominalLoads = network.loads.map(l => ({
    node: l.node,
    p: l.p,
    q: l.q
  }))

  for (let h = 0; h < 24; h++) {
    const factorDemanda = loadProfile.demandFactors[h]
    const factorSolar = loadProfile.solarFactors[h]

    // Escalar cargas por factor de demanda
    const hourlyLoads = nominalLoads.map(l => ({
      node: l.node,
      p: l.p * factorDemanda,
      q: l.q * factorDemanda
    }))

    // Calcular inyecciones PV
    let solarAvailH = 0
    let solarDispH = 0
    const pvInjections: { node: number, p: number }[] = []

    const idxSun = horasSolIdx.indexOf(h)

    for (let g = 0; g < numGDs; g++) {
      const nodo = gdNodes[g]
      const dispFactor = idxSun >= 0 ? dispatchMatrix[g][idxSun] : 0

      const pAvailKw = gdSizes[g] * factorSolar
      const pDispKw = gdSizes[g] * factorSolar * dispFactor

      pvInjections.push({ node: nodo, p: pDispKw })

      solarAvailH += pAvailKw
      solarDispH += pDispKw
    }

    solarProfiles.push({ hour: h, available: solarAvailH, dispatched: solarDispH })
    pFvTotalDisp += solarDispH

    // Ejecutar flujo de potencia
    const pfResult = runPowerFlow(network, hourlyLoads, pvInjections, matrices)
    voltages.push([...pfResult.V])

    // Verificar límites de voltaje
    const vMin = Math.min(...pfResult.V)
    const vMax = Math.max(...pfResult.V)

    if (vMin < 0.90) {
      penaltyVoltage += (0.90 - vMin) * 1e6
    }
    if (vMax > 1.10) {
      penaltyVoltage += (vMax - 1.10) * 1e6
    }

    // Calcular pérdidas
    const losses = calculateLosses(network, pfResult.V, pfResult.Vangle)
    totalLossesKwh += losses.pLoss

    hourlyResults.push({
      hour: h,
      pLoss: losses.pLoss,
      qLoss: losses.qLoss,
      vMin,
      vMax
    })

    // Calcular potencia del slack
    const pDemandaH = network.loads.reduce((sum, l) => sum + l.p, 0) * factorDemanda
    const pSlackH = pDemandaH + losses.pLoss - solarDispH

    // Penalizar flujo inverso
    if (pSlackH < 0) {
      penaltyVoltage += Math.abs(pSlackH) * 1e6
    }
    pSlackTotal += pSlackH
  }

  // Calcular función objetivo económica
  const pe = economics

  // Factor de anualidad con incremento (para f1)
  let sumT = 0
  for (let t = 1; t <= pe.horizonYears; t++) {
    sumT += Math.pow((1 + pe.energyInflation) / (1 + pe.discountRate), t)
  }
  const factorAF1 = (pe.discountRate / (1 - Math.pow(1 + pe.discountRate, -pe.horizonYears))) * sumT

  // Factor de anualidad PV
  const factorAPV = pe.discountRate / (1 - Math.pow(1 + pe.discountRate, -pe.horizonYears))

  // f1: Costo de compra de energía a la subestación
  const f1 = pe.energyCost * pe.daysPerYear * factorAF1 * pSlackTotal * pe.deltaH

  // f2: Inversión de los generadores solares (CAPEX anualizado)
  const totalPvKw = gdSizes.reduce((sum, s) => sum + s, 0)
  const f2 = pe.pvCostPerKw * factorAPV * totalPvKw

  // f3: Costo de mantenimiento (O&M)
  const f3 = pe.omCostPerKwh * pe.daysPerYear * pFvTotalDisp * pe.deltaH

  // Z_cost: Costo total anual
  const zCost = f1 + f2 + f3
  const fitness = zCost + penaltyVoltage

  return { fitness, f1, f2, f3, hourlyResults, solarProfiles, voltages, pSlackTotal }
}

/**
 * Algoritmo ICSA Principal
 */
export function runICSA(
  network: NetworkData,
  loadProfile: HourlyLoadProfile,
  economics: EconomicParams,
  config: ICSAConfig,
  onProgress?: (iter: number, total: number, bestFitness: number) => void
): ICSAResult {
  const startTime = performance.now()
  const rng = new SeededRandom(config.seed)

  // Identificar horas con sol
  const horasSolIdx = loadProfile.solarFactors
    .map((f, i) => f > 0 ? i : -1)
    .filter(i => i >= 0)
  const numHorasSol = horasSolIdx.length

  // Dimensión del problema
  // [nodos (enteros)] + [tamaños (continuos)] + [despachos (continuos)]
  const dim = 2 * config.numGDs + (config.numGDs * numHorasSol)

  // Límites
  const Lb: number[] = [
    ...Array(config.numGDs).fill(2), // Nodos: [2, nNodes]
    ...Array(config.numGDs).fill(0), // Tamaños: [0, maxPvKw]
    ...Array(config.numGDs * numHorasSol).fill(0) // Despachos: [0, 1]
  ]
  const Ub: number[] = [
    ...Array(config.numGDs).fill(network.nNodes),
    ...Array(config.numGDs).fill(config.maxPvKw),
    ...Array(config.numGDs * numHorasSol).fill(1)
  ]

  // Precalcular matrices del sistema
  const matrices = buildYbus(network)

  // Evaluar caso base (sin FV)
  // En el caso base: los tamaños son 0, por lo tanto f2=0 y f3=0
  // El costo base es SOLO f1 (compra de energia a la subestacion)
  const xBase = [
    ...Array.from({ length: config.numGDs }, (_, i) => i + 2),
    ...Array(config.numGDs).fill(0), // Tamanos = 0 (sin FV)
    ...Array(config.numGDs * numHorasSol).fill(0) // Despachos = 0
  ]
  const baseResult = fitnessFunction(xBase, network, loadProfile, economics, config.numGDs, horasSolIdx, matrices)
  // Costo base = f1 del caso sin FV (que es el costo de energia comprada)
  // f2 y f3 son 0 porque no hay FV instalado
  // Usamos f1 directamente (no fitness) para evitar incluir penalizaciones de voltaje
  const costoBase = baseResult.f1

  // Inicializar población de cuervos
  const population: ICSACrow[] = []
  for (let i = 0; i < config.populationSize; i++) {
    const position = Lb.map((lb, j) => lb + (Ub[j] - lb) * rng.next())
    // Redondear nodos a enteros
    for (let j = 0; j < config.numGDs; j++) {
      position[j] = Math.round(position[j])
    }
    population.push({
      position: [...position],
      memory: [...position],
      fitness: Infinity,
      memoryFitness: Infinity
    })
  }

  // Evaluar población inicial
  for (const crow of population) {
    const result = fitnessFunction(crow.position, network, loadProfile, economics, config.numGDs, horasSolIdx, matrices)
    crow.fitness = result.fitness
    crow.memoryFitness = result.fitness
  }

  // Mejor global
  let globalBest = [...population[0].position]
  let globalBestFit = population[0].fitness
  for (const crow of population) {
    if (crow.fitness < globalBestFit) {
      globalBestFit = crow.fitness
      globalBest = [...crow.position]
    }
  }

  const convergenceCurve: number[] = []

  // Ciclo principal ICSA
  for (let iter = 0; iter < config.maxIterations; iter++) {
    const wV = Math.max(...population.map(c => c.fitness))

    for (let i = 0; i < config.populationSize; i++) {
      const crow = population[i]

      // Probabilidad de detección adaptativa (DAP)
      const DAP = 0.9 * (crow.fitness / wV) + 0.1

      // Seleccionar cuervo aleatorio diferente
      let j = Math.floor(rng.next() * config.populationSize)
      while (j === i) j = Math.floor(rng.next() * config.populationSize)
      const crowJ = population[j]

      const ri = rng.next()
      let newPosition: number[]

      if (ri >= DAP) {
        // Movimiento normal hacia la memoria del cuervo j
        newPosition = crow.position.map((x, k) =>
          x + rng.next() * config.flightLength * (crowJ.memory[k] - x)
        )
      } else {
        // Vuelo de Lévy (exploración)
        const beta = 1.5
        const sigmaA = Math.pow(
          (gamma(1 + beta) * Math.sin(Math.PI * beta / 2)) /
          (gamma((1 + beta) / 2) * beta * Math.pow(2, (beta - 1) / 2)),
          1 / beta
        )

        const levy: number[] = []
        for (let k = 0; k < dim; k++) {
          const a = rng.nextGaussian() * sigmaA
          const b = rng.nextGaussian()
          const zi = a / Math.pow(Math.abs(b), 1 / beta)
          levy.push(0.01 * zi * (crow.position[k] - globalBest[k]))
        }

        newPosition = crow.position.map((x, k) => x + levy[k])
      }

      // Aplicar límites
      newPosition = newPosition.map((x, k) => Math.max(Lb[k], Math.min(Ub[k], x)))

      // Redondear nodos a enteros
      for (let k = 0; k < config.numGDs; k++) {
        newPosition[k] = Math.round(newPosition[k])
      }

      // Evaluar nueva posición
      const newResult = fitnessFunction(newPosition, network, loadProfile, economics, config.numGDs, horasSolIdx, matrices)
      const newFit = newResult.fitness

      // Actualizar memoria si mejora
      if (newFit < crow.memoryFitness) {
        crow.memory = [...newPosition]
        crow.memoryFitness = newFit
      }

      crow.position = newPosition
      crow.fitness = newFit

      // Actualizar mejor global
      if (newFit < globalBestFit) {
        globalBestFit = newFit
        globalBest = [...newPosition]
      }
    }

    convergenceCurve.push(globalBestFit)

    if (onProgress) {
      onProgress(iter + 1, config.maxIterations, globalBestFit)
    }
  }

  // Evaluar solución final con detalles completos
  const finalResult = fitnessFunction(globalBest, network, loadProfile, economics, config.numGDs, horasSolIdx, matrices)

  const computeTimeMs = performance.now() - startTime

  // Decodificar solución
  const gdNodes = globalBest.slice(0, config.numGDs).map(n => Math.round(n))
  const gdSizes = globalBest.slice(config.numGDs, 2 * config.numGDs)

  // Calcular métricas adicionales
  const totalLossesKwh = finalResult.hourlyResults.reduce((sum, h) => sum + h.pLoss, 0)
  const baselineLosses = baseResult.hourlyResults.reduce((sum, h) => sum + h.pLoss, 0)
  const totalSolarAvailable = finalResult.solarProfiles.reduce((sum, s) => sum + s.available, 0)
  const totalSolarDispatched = finalResult.solarProfiles.reduce((sum, s) => sum + s.dispatched, 0)
  const curtailment = totalSolarAvailable > 0 ? 100 * (1 - totalSolarDispatched / totalSolarAvailable) : 0

  const vMin = Math.min(...finalResult.hourlyResults.map(h => h.vMin))
  const vMax = Math.max(...finalResult.hourlyResults.map(h => h.vMax))

  // El ahorro se calcula como: Costo_Base - Costo_Optimizado
  // Donde Costo_Base = f1_base (solo compra de energia, sin FV)
  // Y Costo_Optimizado = f1_opt + f2_opt + f3_opt (con FV)
  // Si el ahorro es positivo, significa que instalar FV reduce costos
  // Si es negativo, significa que el FV no es economicamente viable
  const costoOptimizado = finalResult.f1 + finalResult.f2 + finalResult.f3
  const ahorroAnual = costoBase - costoOptimizado
  const ahorroPercent = costoBase > 0 ? 100 * ahorroAnual / costoBase : 0

  return {
    optimalNodes: gdNodes,
    optimalSizes: gdSizes,
    fitness: globalBestFit,
    f1_energyCost: finalResult.f1,
    f2_investmentCost: finalResult.f2,
    f3_omCost: finalResult.f3,
    baseCost: costoBase,
    optimizedCost: costoOptimizado,
    savings: ahorroAnual,
    savingsPercent: ahorroPercent,
    totalLossesKwh,
    baselineLossesKwh: baselineLosses,
    lossReduction: baselineLosses > 0 ? 100 * (baselineLosses - totalLossesKwh) / baselineLosses : 0,
    totalSolarAvailable,
    totalSolarDispatched,
    curtailmentPercent: curtailment,
    vMin,
    vMax,
    hourlyResults: finalResult.hourlyResults,
    solarProfiles: finalResult.solarProfiles,
    voltageProfiles: finalResult.voltages,
    convergenceCurve,
    computeTimeMs,
    totalGenerations: config.maxIterations
  }
}

/**
 * Función Gamma (aproximación Stirling para valores grandes)
 */
function gamma(z: number): number {
  if (z < 0.5) {
    return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z))
  }
  z -= 1
  const g = 7
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ]
  let x = c[0]
  for (let i = 1; i < g + 2; i++) {
    x += c[i] / (z + i)
  }
  const t = z + g + 0.5
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x
}
