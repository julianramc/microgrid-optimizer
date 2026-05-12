"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import type { SiteConfig, HourlyData } from "@/lib/microgrid/types"

interface StepSolarProps {
  site: SiteConfig
  solarData: HourlyData[] | null
  onDataFetched: (data: HourlyData[]) => void
  onNext: () => void
  onBack: () => void
}

export function StepSolar({ site, solarData, onDataFetched, onNext, onBack }: StepSolarProps) {
  const [year, setYear] = useState("2022")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<Record<string, string | number> | null>(null)

  const handleFetch = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/irradiance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: site.lat, lon: site.lon, year: parseInt(year) }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Error fetching data")
      onDataFetched(result.data)
      setSummary(result.summary)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  // Monthly averages for visualization
  const monthlyData = useMemo(() => {
    if (!solarData) return null
    const months: { ghi: number[]; temp: number[] }[] = Array.from({ length: 12 }, () => ({
      ghi: [],
      temp: [],
    }))
    for (const d of solarData) {
      const dt = new Date(d.datetime)
      const m = dt.getMonth()
      if (d.ghi > 0) months[m].ghi.push(d.ghi)
      months[m].temp.push(d.temperature)
    }
    return months.map((m, idx) => ({
      month: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][idx],
      avgGhi: m.ghi.length > 0 ? m.ghi.reduce((a, b) => a + b, 0) / m.ghi.length : 0,
      avgTemp: m.temp.length > 0 ? m.temp.reduce((a, b) => a + b, 0) / m.temp.length : 0,
      maxGhi: m.ghi.length > 0 ? Math.max(...m.ghi) : 0,
    }))
  }, [solarData])

  const peakGhi = monthlyData ? Math.max(...monthlyData.map((m) => m.maxGhi)) : 1000

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Descarga de Datos Satelitales</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <p className="text-xs text-muted-foreground">
                Sitio: {site.name} ({site.lat.toFixed(4)}, {site.lon.toFixed(4)})
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Ano de referencia</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2019, 2020, 2021, 2022, 2023].map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Fuente: NASA POWER (GHI diario + temperatura). Se genera perfil horario usando geometria solar.
            </p>
            <Button onClick={handleFetch} disabled={loading} className="w-full">
              {loading ? "Descargando..." : "Descargar Datos NASA POWER"}
            </Button>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </CardContent>
        </Card>

        {summary && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resumen del Recurso Solar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard label="GHI Promedio" value={`${summary.avgGhiWm2} W/m2`} />
                <StatCard label="GHI Pico" value={`${summary.peakGhiWm2} W/m2`} />
                <StatCard label="Temp. Media" value={`${summary.avgTempC} C`} />
                <StatCard label="Irrad. Diaria" value={`${summary.avgDailyKwhM2} kWh/m2`} />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {summary.daysOfData} dias de datos ({summary.totalHours} horas)
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {monthlyData && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Irradiancia y Temperatura Mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6">
              {/* GHI Chart */}
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">GHI Promedio (W/m2) por hora de sol</p>
                <div className="flex items-end gap-1 h-40">
                  {monthlyData.map((m) => (
                    <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {Math.round(m.avgGhi)}
                      </span>
                      <div
                        className="w-full rounded-t bg-primary transition-all"
                        style={{ height: `${(m.avgGhi / (peakGhi || 1)) * 120}px` }}
                      />
                      <span className="text-[10px] text-muted-foreground">{m.month}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Temperature Chart */}
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Temperatura Media (C)</p>
                <div className="flex items-end gap-1 h-32">
                  {monthlyData.map((m) => (
                    <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {m.avgTemp.toFixed(1)}
                      </span>
                      <div
                        className="w-full rounded-t bg-accent transition-all"
                        style={{ height: `${((m.avgTemp + 5) / 45) * 100}px` }}
                      />
                      <span className="text-[10px] text-muted-foreground">{m.month}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Atras
        </Button>
        <Button onClick={onNext} disabled={!solarData}>
          Siguiente
        </Button>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold text-foreground">{value}</p>
    </div>
  )
}
