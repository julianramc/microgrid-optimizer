// ============================================================
// NASA POWER API Data Fetcher (satellite irradiance + temperature)
// ============================================================

import type { HourlyData } from "./types"

// Cache for fetched data
const solarCache = new Map<string, HourlyData[]>()

function cacheKey(lat: number, lon: number, year: number): string {
  return `${lat.toFixed(3)}_${lon.toFixed(3)}_${year}`
}

/**
 * Fetch hourly solar irradiance & temperature from NASA POWER API
 * Uses daily data and generates synthetic hourly profiles
 */
export async function fetchSolarData(
  lat: number,
  lon: number,
  year: number = 2022
): Promise<HourlyData[]> {
  const key = cacheKey(lat, lon, year)
  if (solarCache.has(key)) {
    return solarCache.get(key)!
  }

  const startDate = `${year}0101`
  const endDate = `${year}1231`

  const url =
    `https://power.larc.nasa.gov/api/temporal/daily/point?` +
    `parameters=ALLSKY_SFC_SW_DWN,T2M,T2M_MAX,T2M_MIN&` +
    `community=RE&longitude=${lon}&latitude=${lat}&` +
    `start=${startDate}&end=${endDate}&format=JSON`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`NASA POWER API error: ${response.status}`)
  }

  const data = await response.json()
  const ghi = data.properties?.parameter?.ALLSKY_SFC_SW_DWN ?? {}
  const tempAvg = data.properties?.parameter?.T2M ?? {}
  const tempMax = data.properties?.parameter?.T2M_MAX ?? {}
  const tempMin = data.properties?.parameter?.T2M_MIN ?? {}

  // Convert daily data to hourly using solar geometry
  const hourlyData: HourlyData[] = []

  const dates = Object.keys(ghi).sort()
  for (const dateStr of dates) {
    const dailyGhi = ghi[dateStr] // kWh/m²/day
    const tAvg = tempAvg[dateStr] ?? 25
    const tMax = tempMax[dateStr] ?? tAvg + 5
    const tMin = tempMin[dateStr] ?? tAvg - 5

    if (dailyGhi < 0) continue // missing data flag

    // Parse date
    const yr = parseInt(dateStr.substring(0, 4))
    const mo = parseInt(dateStr.substring(4, 6)) - 1
    const dy = parseInt(dateStr.substring(6, 8))
    const dayOfYear = getDayOfYear(yr, mo, dy)

    // Generate 24-hour profile from daily total
    const hourlyProfile = generateHourlyIrradiance(lat, dayOfYear, dailyGhi)

    for (let h = 0; h < 24; h++) {
      // Sinusoidal temperature profile
      const tempHour = tAvg + ((tMax - tMin) / 2) * Math.sin(((h - 6) * Math.PI) / 12)

      const dt = new Date(yr, mo, dy, h)

      hourlyData.push({
        datetime: dt.toISOString(),
        ghi: hourlyProfile[h] * 1000, // Convert kW/m² to W/m²
        temperature: tempHour,
        loadKw: 0, // Will be filled separately
      })
    }
  }

  solarCache.set(key, hourlyData)
  return hourlyData
}

/**
 * Generate hourly irradiance profile from daily total
 * Using simplified clear-sky model with solar geometry
 */
function generateHourlyIrradiance(
  latDeg: number,
  dayOfYear: number,
  dailyKwhM2: number
): number[] {
  const lat = (latDeg * Math.PI) / 180
  const declination = 23.45 * Math.sin(((360 * (284 + dayOfYear)) / 365) * (Math.PI / 180))
  const decl = (declination * Math.PI) / 180

  // Hour angle for sunrise/sunset
  const cosOmega = -Math.tan(lat) * Math.tan(decl)
  const omegaSunset = Math.abs(cosOmega) >= 1
    ? (cosOmega > 0 ? 0 : Math.PI) // polar conditions
    : Math.acos(Math.max(-1, Math.min(1, cosOmega)))

  const sunriseHour = 12 - (omegaSunset * 180) / (15 * Math.PI)
  const sunsetHour = 12 + (omegaSunset * 180) / (15 * Math.PI)

  // Calculate unnormalized profile
  const profile = new Array(24).fill(0)
  let totalWeight = 0

  for (let h = 0; h < 24; h++) {
    if (h < sunriseHour || h > sunsetHour) continue
    const hourAngle = ((h - 12) * 15 * Math.PI) / 180
    const sinAlt =
      Math.sin(lat) * Math.sin(decl) +
      Math.cos(lat) * Math.cos(decl) * Math.cos(hourAngle)
    if (sinAlt > 0) {
      profile[h] = sinAlt
      totalWeight += sinAlt
    }
  }

  // Normalize to daily total (kWh/m²/day → kWh/m² per hour)
  if (totalWeight > 0) {
    for (let h = 0; h < 24; h++) {
      profile[h] = (profile[h] / totalWeight) * dailyKwhM2
    }
  }

  return profile
}

function getDayOfYear(year: number, month: number, day: number): number {
  const date = new Date(year, month, day)
  const start = new Date(year, 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

/**
 * Generate synthetic load profile
 */
export function generateSyntheticLoad(
  pattern: number[],
  baseKw: number,
  peakKw: number,
  numDays: number,
  randomVariation: number = 0.1
): { hour: number; kw: number }[] {
  const result: { hour: number; kw: number }[] = []

  for (let day = 0; day < numDays; day++) {
    // Weekend/weekday variation
    const dayOfWeek = day % 7
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6
    const dayFactor = isWeekend ? 0.85 : 1.0

    for (let h = 0; h < 24; h++) {
      const baseValue = baseKw + pattern[h] * (peakKw - baseKw)
      const variation = 1 + (Math.random() - 0.5) * 2 * randomVariation
      result.push({
        hour: day * 24 + h,
        kw: Math.max(0, baseValue * dayFactor * variation),
      })
    }
  }

  return result
}
