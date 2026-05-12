import type {
  PVParams,
  BatteryParams,
  InverterParams,
  DieselParams,
  FinancialParams,
  OptimizerConfig,
  DecisionBounds,
} from "./types"

export const DEFAULT_PV: PVParams = {
  panelPowerSTC: 550,
  efficiency: 0.21,
  NOCT: 45,
  tempCoeff: -0.35,
  losses: 0.14,
  costPerWatt: 1.03649, // C_pv: $1036.49/kWp
  bosPercent: 0.25,
  omAnnualPercent: 0.015,
  tiltAngle: 10,
  azimuth: 180,
  degradationRate: 0.5,
}

export const DEFAULT_BATTERY_LION: BatteryParams = {
  type: "li-ion",
  efficiencyRoundTrip: 0.92,
  dodMax: 0.9,
  socMin: 0.1,
  socMax: 1.0,
  cRateMaxCharge: 1.0,
  cRateMaxDischarge: 1.0,
  costPerKwh: 280,
  lifetimeCycles: 5000,
  degradationAnnual: 2.0,
  omAnnualPercent: 0.01,
}

export const DEFAULT_BATTERY_LEAD: BatteryParams = {
  type: "lead-acid",
  efficiencyRoundTrip: 0.8,
  dodMax: 0.5,
  socMin: 0.5,
  socMax: 1.0,
  cRateMaxCharge: 0.2,
  cRateMaxDischarge: 0.5,
  costPerKwh: 150,
  lifetimeCycles: 1500,
  degradationAnnual: 4.0,
  omAnnualPercent: 0.02,
}

export const DEFAULT_INVERTER: InverterParams = {
  efficiency: 0.96,
  costPerKw: 120,
  omAnnualPercent: 0.005,
}

export const DEFAULT_DIESEL: DieselParams = {
  enabled: false,
  costPerKw: 500,
  fuelCostPerLiter: 1.2,
  consumptionA: 0.246,
  consumptionB: 0.08145,
  minLoadFraction: 0.3,
  omPerHour: 0.05,
  maxStartsPerHour: 3,
}

export const DEFAULT_FINANCIAL: FinancialParams = {
  discountRate: 0.10, // t_a: 10%
  horizonYears: 20,   // N_t: 20 años
  inflationRate: 0.02, // t_e: 2%
}

export const DEFAULT_OPTIMIZER: OptimizerConfig = {
  populationSize: 100, // N: 100
  generations: 2000,   // max_iter: 2000
  crossoverProb: 0.9,
  mutationProb: 0.25,
  seed: 42,
  dispatchStrategy: "load-following",
}

export const DEFAULT_BOUNDS: DecisionBounds = {
  numPanelsMax: 6000,   // Assuming ~2400kW max capacity and 400W panels
  batteryCapMax: 500,
  inverterKwMin: 1,
  inverterKwMax: 2400,  // size_max: 2400 kW
  dieselKwMax: 100,
}

// ZNI locations in Colombia
export const ZNI_LOCATIONS = [
  { name: "San Andres", lat: 12.5847, lon: -81.7006 },
  { name: "Leticia, Amazonas", lat: -4.2153, lon: -69.9406 },
  { name: "Mitu, Vaupes", lat: 1.2536, lon: -70.2339 },
  { name: "Puerto Carreno, Vichada", lat: 6.1891, lon: -67.4858 },
  { name: "Inirida, Guainia", lat: 3.8653, lon: -67.9239 },
  { name: "Bahia Solano, Choco", lat: 6.2197, lon: -77.3942 },
  { name: "Nuqui, Choco", lat: 5.7167, lon: -77.2667 },
  { name: "Capurgana, Choco", lat: 8.6308, lon: -77.35 },
  { name: "Puerto Nare, Antioquia", lat: 6.1831, lon: -74.5883 },
  { name: "Vigía del Fuerte, Antioquia", lat: 6.5894, lon: -76.8903 },
]

export const SYNTHETIC_LOAD_PROFILES = {
  "rural-farm": {
    name: "Finca Rural Tipica",
    baseKw: 2.0,
    peakKw: 8.0,
    pattern: [
      0.3, 0.25, 0.2, 0.2, 0.25, 0.5, 0.8, 0.9, 0.7, 0.5, 0.4, 0.6, 0.8,
      0.5, 0.4, 0.4, 0.5, 0.9, 1.0, 0.9, 0.7, 0.5, 0.4, 0.35,
    ],
  },
  "school-clinic": {
    name: "Escuela + Puesto de Salud",
    baseKw: 3.0,
    peakKw: 15.0,
    pattern: [
      0.2, 0.15, 0.15, 0.15, 0.2, 0.3, 0.7, 0.9, 1.0, 0.95, 0.9, 0.8, 0.7,
      0.8, 0.9, 0.7, 0.5, 0.6, 0.8, 0.5, 0.3, 0.25, 0.2, 0.2,
    ],
  },
  "community": {
    name: "Comunidad Pequena (~50 familias)",
    baseKw: 10.0,
    peakKw: 45.0,
    pattern: [
      0.3, 0.25, 0.22, 0.2, 0.25, 0.45, 0.65, 0.7, 0.6, 0.5, 0.5, 0.55,
      0.6, 0.5, 0.45, 0.5, 0.6, 0.85, 1.0, 0.95, 0.8, 0.6, 0.45, 0.35,
    ],
  },
  "telecom-tower": {
    name: "Torre de Telecomunicaciones",
    baseKw: 1.5,
    peakKw: 3.0,
    pattern: [
      0.7, 0.65, 0.6, 0.6, 0.65, 0.75, 0.9, 1.0, 0.95, 0.85, 0.8, 0.85,
      0.9, 0.85, 0.8, 0.85, 0.9, 1.0, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7,
    ],
  },
}
