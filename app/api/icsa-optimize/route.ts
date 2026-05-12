import { NextResponse } from "next/server"
import { runICSA } from "@/lib/microgrid/icsa-optimizer"
import type { NetworkData, HourlyLoadProfile, EconomicParams, ICSAConfig } from "@/lib/microgrid/icsa-types"

export const maxDuration = 60 // Permitir hasta 60 segundos de ejecución

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      network,
      loadProfile,
      economics,
      config
    }: {
      network: NetworkData
      loadProfile: HourlyLoadProfile
      economics: EconomicParams
      config: ICSAConfig
    } = body

    // Validaciones básicas
    if (!network || !network.lines || !network.loads) {
      return NextResponse.json(
        { error: "Datos de red inválidos" },
        { status: 400 }
      )
    }

    if (!loadProfile || !loadProfile.demandFactors || !loadProfile.solarFactors) {
      return NextResponse.json(
        { error: "Perfil de carga inválido" },
        { status: 400 }
      )
    }

    if (loadProfile.demandFactors.length !== 24 || loadProfile.solarFactors.length !== 24) {
      return NextResponse.json(
        { error: "Los perfiles deben tener exactamente 24 valores (uno por hora)" },
        { status: 400 }
      )
    }

    // Ejecutar optimización ICSA
    const result = runICSA(
      network,
      loadProfile,
      economics,
      config
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error en optimización ICSA:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno en optimización" },
      { status: 500 }
    )
  }
}
