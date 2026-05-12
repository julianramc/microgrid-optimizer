import { NextResponse } from "next/server"
import { fetchSolarData } from "@/lib/microgrid/solar-data"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { lat, lon, year } = body

    if (lat == null || lon == null) {
      return NextResponse.json({ error: "lat and lon are required" }, { status: 400 })
    }

    const data = await fetchSolarData(lat, lon, year ?? 2022)

    // Compute summary stats
    const avgGhi =
      data.reduce((s, d) => s + d.ghi, 0) / data.length
    const avgTemp =
      data.reduce((s, d) => s + d.temperature, 0) / data.length
    const peakGhi = Math.max(...data.map((d) => d.ghi))
    const totalDailyKwh = data.reduce((s, d) => s + d.ghi / 1000, 0) / (data.length / 24)

    return NextResponse.json({
      data,
      summary: {
        avgGhiWm2: Math.round(avgGhi),
        avgTempC: avgTemp.toFixed(1),
        peakGhiWm2: Math.round(peakGhi),
        avgDailyKwhM2: totalDailyKwh.toFixed(2),
        totalHours: data.length,
        daysOfData: Math.round(data.length / 24),
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
