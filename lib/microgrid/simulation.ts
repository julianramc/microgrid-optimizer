// ============================================================
// Chronological Simulation Engine (Hourly Time-Step)
// ============================================================

import type {
  DecisionVariables,
  HourlyData,
  PVParams,
  BatteryParams,
  InverterParams,
  DieselParams,
  SimulationStep,
  SimulationResult,
} from "./types"

/**
 * Calculate PV cell temperature using NOCT model
 */
function cellTemperature(ambientTemp: number, ghi: number, noct: number): number {
  return ambientTemp + ((noct - 20) / 800) * ghi
}

/**
 * Calculate PV power output for given conditions
 */
function pvPower(
  numPanels: number,
  ghi: number,
  ambientTemp: number,
  pv: PVParams
): number {
  if (ghi <= 0 || numPanels <= 0) return 0

  const tCell = cellTemperature(ambientTemp, ghi, pv.NOCT)
  const tempFactor = 1 + (pv.tempCoeff / 100) * (tCell - 25)
  const irradianceFactor = ghi / 1000 // STC is at 1000 W/m²

  const powerPerPanel =
    (pv.panelPowerSTC / 1000) * // kW per panel at STC
    irradianceFactor *
    Math.max(0, tempFactor) *
    (1 - pv.losses)

  return numPanels * powerPerPanel
}

/**
 * Calculate diesel fuel consumption (L/h) for a given output power
 */
function dieselFuelConsumption(
  outputKw: number,
  ratedKw: number,
  diesel: DieselParams
): number {
  if (outputKw <= 0 || ratedKw <= 0) return 0
  return diesel.consumptionA * ratedKw + diesel.consumptionB * outputKw
}

/**
 * Run chronological simulation for one year/period
 */
export function runSimulation(
  vars: DecisionVariables,
  hourlyData: HourlyData[],
  pv: PVParams,
  battery: BatteryParams,
  inverter: InverterParams,
  diesel: DieselParams,
  dispatchStrategy: "load-following" | "cycle-charging"
): SimulationResult {
  const steps: SimulationStep[] = []

  // Battery state
  const battCapUsable = vars.batteryCapKwh * (battery.socMax - battery.socMin)
  let soc = (battery.socMin + battery.socMax) / 2 // Start at mid SOC
  const maxChargeRate = vars.batteryCapKwh * battery.cRateMaxCharge
  const maxDischargeRate = vars.batteryCapKwh * battery.cRateMaxDischarge
  const effCharge = Math.sqrt(battery.efficiencyRoundTrip)
  const effDischarge = Math.sqrt(battery.efficiencyRoundTrip)

  let totalEnergyPv = 0
  let totalEnergyDiesel = 0
  let totalEnergyDeficit = 0
  let totalEnergyDemand = 0
  let totalEnergyCurtailed = 0
  let totalFuelLiters = 0
  let hoursWithDeficit = 0
  let dieselRunHours = 0

  for (let i = 0; i < hourlyData.length; i++) {
    const data = hourlyData[i]
    const loadKw = data.loadKw
    totalEnergyDemand += loadKw

    // PV production (DC side)
    const pvProd = pvPower(vars.numPanels, data.ghi, data.temperature, pv)
    const pvAc = pvProd * inverter.efficiency
    totalEnergyPv += pvAc

    let battCharge = 0
    let battDischarge = 0
    let dieselPow = 0
    let deficit = 0
    let curtail = 0
    let fuel = 0

    if (dispatchStrategy === "load-following") {
      // --- Load Following Strategy ---
      const netLoad = loadKw - pvAc

      if (netLoad <= 0) {
        // Surplus PV: charge battery
        const surplus = -netLoad
        const maxCharge = Math.min(
          maxChargeRate,
          ((battery.socMax - soc) * vars.batteryCapKwh) / effCharge
        )
        battCharge = Math.min(surplus, maxCharge)
        curtail = surplus - battCharge
        totalEnergyCurtailed += curtail
      } else {
        // Deficit: discharge battery first
        const maxDisch = Math.min(
          maxDischargeRate,
          (soc - battery.socMin) * vars.batteryCapKwh * effDischarge
        )
        battDischarge = Math.min(netLoad, maxDisch)
        const remaining = netLoad - battDischarge

        // Then diesel if available
        if (remaining > 0 && diesel.enabled && vars.dieselKw > 0) {
          const minDiesel = vars.dieselKw * diesel.minLoadFraction
          dieselPow = Math.min(vars.dieselKw, Math.max(remaining, minDiesel))
          fuel = dieselFuelConsumption(dieselPow, vars.dieselKw, diesel)
          totalFuelLiters += fuel
          totalEnergyDiesel += dieselPow
          dieselRunHours++

          // If diesel overproduces, charge battery
          const dieselSurplus = dieselPow - remaining
          if (dieselSurplus > 0) {
            const extraCharge = Math.min(
              dieselSurplus,
              maxChargeRate - battCharge,
              ((battery.socMax - soc) * vars.batteryCapKwh) / effCharge
            )
            battCharge += extraCharge
          }

          deficit = Math.max(0, remaining - dieselPow)
        } else {
          deficit = remaining
        }

        if (deficit > 0) {
          hoursWithDeficit++
          totalEnergyDeficit += deficit
        }
      }
    } else {
      // --- Cycle Charging Strategy ---
      const netLoad = loadKw - pvAc

      if (netLoad <= 0) {
        const surplus = -netLoad
        const maxCharge = Math.min(
          maxChargeRate,
          ((battery.socMax - soc) * vars.batteryCapKwh) / effCharge
        )
        battCharge = Math.min(surplus, maxCharge)
        curtail = surplus - battCharge
        totalEnergyCurtailed += curtail
      } else {
        // In cycle charging, if diesel runs, it runs at rated power
        // and charges battery with surplus
        if (soc > battery.socMin + 0.05) {
          // Battery has charge: use it
          const maxDisch = Math.min(
            maxDischargeRate,
            (soc - battery.socMin) * vars.batteryCapKwh * effDischarge
          )
          battDischarge = Math.min(netLoad, maxDisch)
          const remaining = netLoad - battDischarge

          if (remaining > 0) {
            if (diesel.enabled && vars.dieselKw > 0) {
              // Run diesel at FULL power, charge battery with surplus
              dieselPow = vars.dieselKw
              fuel = dieselFuelConsumption(dieselPow, vars.dieselKw, diesel)
              totalFuelLiters += fuel
              totalEnergyDiesel += dieselPow
              dieselRunHours++

              const dieselSurplus = dieselPow - remaining
              if (dieselSurplus > 0) {
                const extraCharge = Math.min(
                  dieselSurplus,
                  maxChargeRate,
                  ((battery.socMax - soc) * vars.batteryCapKwh) / effCharge
                )
                battCharge += extraCharge
              }
              deficit = Math.max(0, remaining - dieselPow)
            } else {
              deficit = remaining
            }
          }
        } else {
          // Battery low: start diesel at rated, charge battery
          if (diesel.enabled && vars.dieselKw > 0) {
            dieselPow = vars.dieselKw
            fuel = dieselFuelConsumption(dieselPow, vars.dieselKw, diesel)
            totalFuelLiters += fuel
            totalEnergyDiesel += dieselPow
            dieselRunHours++

            const available = dieselPow - netLoad
            if (available > 0) {
              const maxCharge = Math.min(
                maxChargeRate,
                ((battery.socMax - soc) * vars.batteryCapKwh) / effCharge
              )
              battCharge = Math.min(available, maxCharge)
            } else {
              deficit = -available
            }
          } else {
            const maxDisch = Math.min(
              maxDischargeRate,
              (soc - battery.socMin) * vars.batteryCapKwh * effDischarge
            )
            battDischarge = Math.min(netLoad, maxDisch)
            deficit = netLoad - battDischarge
          }
        }

        if (deficit > 0) {
          hoursWithDeficit++
          totalEnergyDeficit += deficit
        }
      }
    }

    // Update SOC
    if (vars.batteryCapKwh > 0) {
      soc += (battCharge * effCharge - battDischarge / effDischarge) / vars.batteryCapKwh
      soc = Math.max(battery.socMin, Math.min(battery.socMax, soc))
    }

    steps.push({
      hour: i,
      pvPowerKw: pvAc,
      loadKw,
      batteryChargeKw: battCharge,
      batteryDischargeKw: battDischarge,
      dieselPowerKw: dieselPow,
      deficitKw: deficit,
      curtailmentKw: curtail,
      soc,
      inverterOutputKw: pvAc,
      fuelLiters: fuel,
    })
  }

  const lpsp = totalEnergyDemand > 0 ? totalEnergyDeficit / totalEnergyDemand : 0
  const lolp = hourlyData.length > 0 ? hoursWithDeficit / hourlyData.length : 0
  const totalServed = totalEnergyPv + totalEnergyDiesel - totalEnergyCurtailed
  const renewableFraction = totalServed > 0 ? totalEnergyPv / (totalEnergyPv + totalEnergyDiesel) : 1

  return {
    steps,
    totalEnergyPv,
    totalEnergyDiesel,
    totalEnergyDeficit,
    totalEnergyDemand,
    totalEnergyCurtailed,
    totalFuelLiters,
    hoursWithDeficit,
    totalHours: hourlyData.length,
    lpsp,
    lolp,
    reliability: 1 - lpsp,
    dieselRunHours,
    renewableFraction,
  }
}
