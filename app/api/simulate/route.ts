import { NextResponse } from "next/server"
import { runSimulation } from "@/lib/microgrid/simulation"
import { calculateEconomics, estimateCO2 } from "@/lib/microgrid/economics"
import type {
  DecisionVariables,
  HourlyData,
  PVParams,
  BatteryParams,
  InverterParams,
  DieselParams,
  FinancialParams,
} from "@/lib/microgrid/types"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      variables,
      hourlyData,
      pvParams,
      batteryParams,
      inverterParams,
      dieselParams,
      financialParams,
      dispatchStrategy,
    } = body as {
      variables: DecisionVariables
      hourlyData: HourlyData[]
      pvParams: PVParams
      batteryParams: BatteryParams
      inverterParams: InverterParams
      dieselParams: DieselParams
      financialParams: FinancialParams
      dispatchStrategy: "load-following" | "cycle-charging"
    }

    const simResult = runSimulation(
      variables,
      hourlyData,
      pvParams,
      batteryParams,
      inverterParams,
      dieselParams,
      dispatchStrategy
    )

    const econResult = calculateEconomics(
      variables,
      pvParams,
      batteryParams,
      inverterParams,
      dieselParams,
      financialParams,
      simResult
    )

    const co2 = estimateCO2(simResult.totalFuelLiters)

    // Downsample steps for response (every 3rd hour for graphs)
    const downsampledSteps = simResult.steps.filter((_, i) => i % 3 === 0)

    return NextResponse.json({
      simulation: { ...simResult, steps: downsampledSteps },
      economics: econResult,
      co2Tons: co2,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Simulation failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
