// ============================================================
// Economic Analysis Module - NPC, LCOE, CAPEX/OPEX breakdown
// ============================================================

import type {
  DecisionVariables,
  PVParams,
  BatteryParams,
  InverterParams,
  DieselParams,
  FinancialParams,
  SimulationResult,
  EconomicResult,
} from "./types"

/**
 * Calculate Net Present Cost (NPC) and all economic metrics
 */
export function calculateEconomics(
  vars: DecisionVariables,
  pv: PVParams,
  battery: BatteryParams,
  inverter: InverterParams,
  diesel: DieselParams,
  financial: FinancialParams,
  simResult: SimulationResult
): EconomicResult {
  const T = financial.horizonYears
  const r = financial.discountRate

  // --- CAPEX ---
  const pvTotalWatts = vars.numPanels * pv.panelPowerSTC
  const capexPv = pvTotalWatts * pv.costPerWatt * (1 + pv.bosPercent)
  const capexBattery = vars.batteryCapKwh * battery.costPerKwh
  const capexInverter = vars.inverterKw * inverter.costPerKw
  const capexDiesel = diesel.enabled ? vars.dieselKw * diesel.costPerKw : 0
  const totalCapex = capexPv + capexBattery + capexInverter + capexDiesel

  // --- Annual O&M ---
  const omPv = capexPv * pv.omAnnualPercent
  const omBattery = capexBattery * battery.omAnnualPercent
  const omInverter = capexInverter * inverter.omAnnualPercent
  const omDiesel = diesel.enabled ? simResult.dieselRunHours * diesel.omPerHour : 0
  const annualOpex = omPv + omBattery + omInverter + omDiesel

  // --- Annual Fuel Cost ---
  const annualFuelCost = simResult.totalFuelLiters * diesel.fuelCostPerLiter

  // --- Battery replacements ---
  // Estimate cycles per year based on average daily DOD
  const avgDailyCycles = simResult.steps.length > 0
    ? simResult.steps.reduce((sum, s) => sum + s.batteryDischargeKw, 0) /
      (vars.batteryCapKwh > 0 ? vars.batteryCapKwh * battery.dodMax : 1) /
      (simResult.steps.length / 8760)
    : 0

  const annualCycles = avgDailyCycles
  const batteryLifeYears = annualCycles > 0
    ? Math.min(battery.lifetimeCycles / annualCycles, 15)
    : 15

  let batteryReplacements = 0
  if (vars.batteryCapKwh > 0 && batteryLifeYears < T) {
    batteryReplacements = Math.floor(T / batteryLifeYears)
  }
  const totalReplacementCost = batteryReplacements * capexBattery

  // --- Salvage Value ---
  // Linear depreciation for remaining life at end of horizon
  const pvLifetime = 25
  const pvSalvage = capexPv * Math.max(0, (pvLifetime - T) / pvLifetime)
  const battAge = batteryLifeYears > 0 ? T % batteryLifeYears : T
  const battSalvage = capexBattery * Math.max(0, (batteryLifeYears - battAge) / batteryLifeYears)
  const salvageValue = pvSalvage + battSalvage

  // --- NPC Calculation ---
  let npc = totalCapex // Year 0

  for (let year = 1; year <= T; year++) {
    const discountFactor = Math.pow(1 + r, year)
    const yearOpex = annualOpex
    const yearFuel = annualFuelCost
    const yearReplacement =
      batteryLifeYears > 0 && year % Math.ceil(batteryLifeYears) === 0 && year < T
        ? capexBattery
        : 0

    npc += (yearOpex + yearFuel + yearReplacement) / discountFactor
  }

  // Subtract salvage at end of horizon
  npc -= salvageValue / Math.pow(1 + r, T)

  // --- LCOE ---
  const totalEnergyServed = simResult.totalEnergyDemand - simResult.totalEnergyDeficit
  const crf = (r * Math.pow(1 + r, T)) / (Math.pow(1 + r, T) - 1) // Capital Recovery Factor
  const annualizedCost = npc * crf
  const lcoe = totalEnergyServed > 0 ? annualizedCost / totalEnergyServed : 0

  return {
    capexPv,
    capexBattery,
    capexInverter,
    capexDiesel,
    totalCapex,
    annualOpex,
    totalFuelCost: annualFuelCost * T,
    batteryReplacements,
    totalReplacementCost,
    salvageValue,
    npc,
    lcoe,
    annualizedCost,
  }
}

/**
 * Estimate CO2 emissions (tons/year) from diesel consumption
 */
export function estimateCO2(fuelLitersPerYear: number): number {
  // Diesel emission factor: ~2.68 kg CO2 per liter
  return (fuelLitersPerYear * 2.68) / 1000
}
