// ============================================================
// Core Types for Microgrid Optimization
// ============================================================

export interface SiteConfig {
  lat: number
  lon: number
  name?: string
  timezone: string // e.g. "America/Bogota"
  isIEEETest?: boolean
  ieeeSystem?: "33" | "69"
}

export interface PVParams {
  panelPowerSTC: number     // W per panel (STC)
  efficiency: number        // base efficiency 0-1
  NOCT: number             // Nominal Operating Cell Temperature (°C)
  tempCoeff: number        // %/°C power temperature coefficient (negative)
  losses: number           // system losses 0-1 (wiring, soiling, mismatch)
  costPerWatt: number      // $/W installed
  bosPercent: number       // Balance of System as fraction of panel cost
  omAnnualPercent: number  // O&M as fraction of CAPEX per year
  tiltAngle: number        // degrees
  azimuth: number          // degrees (180 = south-facing)
  degradationRate: number  // annual degradation %
}

export interface BatteryParams {
  type: 'li-ion' | 'lead-acid'
  efficiencyRoundTrip: number  // 0-1
  dodMax: number              // max depth of discharge 0-1
  socMin: number              // minimum SOC fraction
  socMax: number              // maximum SOC fraction
  cRateMaxCharge: number      // max C-rate for charging
  cRateMaxDischarge: number   // max C-rate for discharging
  costPerKwh: number          // $/kWh capacity
  lifetimeCycles: number      // cycle life at DOD max
  degradationAnnual: number   // annual capacity degradation %
  omAnnualPercent: number     // O&M as fraction of CAPEX per year
}

export interface InverterParams {
  efficiency: number    // 0-1
  costPerKw: number     // $/kW
  omAnnualPercent: number
}

export interface DieselParams {
  enabled: boolean
  costPerKw: number     // $/kW installed capacity
  fuelCostPerLiter: number  // $/L
  consumptionA: number  // L/h intercept coefficient (at idle)
  consumptionB: number  // L/h slope coefficient
  minLoadFraction: number // minimum load fraction (0.3-0.4 typical)
  omPerHour: number     // $/operating hour
  maxStartsPerHour: number
}

export interface FinancialParams {
  discountRate: number  // annual, 0-1
  horizonYears: number  // project lifetime
  inflationRate: number // annual inflation
}

export interface OptimizerConfig {
  populationSize: number  // 80-150
  generations: number     // 50-150
  crossoverProb: number   // 0.9
  mutationProb: number    // 1/num_vars
  seed: number            // for reproducibility
  dispatchStrategy: 'load-following' | 'cycle-charging'
}

export interface DecisionVariables {
  numPanels: number      // integer
  batteryCapKwh: number  // continuous
  inverterKw: number     // continuous
  dieselKw: number       // continuous (0 if disabled)
}

export interface DecisionBounds {
  numPanelsMax: number
  batteryCapMax: number
  inverterKwMin: number
  inverterKwMax: number
  dieselKwMax: number
}

export interface HourlyData {
  datetime: string
  ghi: number           // W/m²
  temperature: number   // °C
  loadKw: number        // kW demand
}

export interface SimulationStep {
  hour: number
  pvPowerKw: number
  loadKw: number
  batteryChargeKw: number
  batteryDischargeKw: number
  dieselPowerKw: number
  deficitKw: number
  curtailmentKw: number
  soc: number
  inverterOutputKw: number
  fuelLiters: number
}

export interface SimulationResult {
  steps: SimulationStep[]
  totalEnergyPv: number
  totalEnergyDiesel: number
  totalEnergyDeficit: number
  totalEnergyDemand: number
  totalEnergyCurtailed: number
  totalFuelLiters: number
  hoursWithDeficit: number
  totalHours: number
  lpsp: number           // energy-based
  lolp: number           // time-based
  reliability: number    // 1 - lpsp
  dieselRunHours: number
  renewableFraction: number
}

export interface EconomicResult {
  capexPv: number
  capexBattery: number
  capexInverter: number
  capexDiesel: number
  totalCapex: number
  annualOpex: number
  totalFuelCost: number
  batteryReplacements: number
  totalReplacementCost: number
  salvageValue: number
  npc: number
  lcoe: number          // $/kWh
  annualizedCost: number
}

export interface ParetoPoint {
  id: number
  variables: DecisionVariables
  npc: number
  lpsp: number
  lolp: number
  reliability: number
  renewableFraction: number
  simulation: SimulationResult
  economics: EconomicResult
  co2Tons: number
}

export interface OptimizationResult {
  paretoPoints: ParetoPoint[]
  bestCost: ParetoPoint | null
  bestReliability: ParetoPoint | null
  bestCompromise: ParetoPoint | null
  totalGenerations: number
  computeTimeMs: number
  hypervolume: number
}

export type WorkflowStep = 'location' | 'solar' | 'load' | 'parameters' | 'optimize'

export interface NasaPowerResponse {
  properties: {
    parameter: {
      ALLSKY_SFC_SW_DWN: Record<string, number>
      T2M: Record<string, number>
    }
  }
}

export interface LoadProfile {
  name: string
  data: { hour: number; kw: number }[]
  source: 'csv' | 'synthetic' | 'colombian'
}

export interface ProjectState {
  step: WorkflowStep
  site: SiteConfig | null
  solarData: HourlyData[] | null
  loadProfile: LoadProfile | null
  pvParams: PVParams
  batteryParams: BatteryParams
  inverterParams: InverterParams
  dieselParams: DieselParams
  financialParams: FinancialParams
  optimizerConfig: OptimizerConfig
  bounds: DecisionBounds
  result: OptimizationResult | null
  isOptimizing: boolean
  optimizationProgress: number
  selectedParetoPoint: ParetoPoint | null
}
