"use client"

import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { IEEE_33_NETWORK, IEEE_69_NETWORK, LOAD_PROFILES, DEFAULT_ECONOMIC_PARAMS, IEEE_33_LINES, IEEE_33_LOADS, IEEE_69_LINES, IEEE_69_LOADS } from "@/lib/microgrid/ieee-test-cases"
import { ZNI_REGIONAL_PROFILES, OPERATOR_PROFILES, DATA_SOURCES } from "@/lib/microgrid/colombian-data"
import type { NetworkData, HourlyLoadProfile, ICSAConfig, ICSAResult } from "@/lib/microgrid/icsa-types"
import type { LoadProfile, OptimizerConfig, DecisionBounds, FinancialParams } from "@/lib/microgrid/types"
import { ArrowLeft, ExternalLink, Database, FileText, Zap, Info, ChevronDown, ChevronUp, CheckCircle2, Download } from "lucide-react"
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts"
import { NetworkDiagram } from "./network-diagram"

interface StepICSAProps {
  onBack?: () => void
  isIEEETest?: boolean
  ieeeSystem?: "33" | "69"
  globalLoadProfile?: LoadProfile | null
  globalOptimizerConfig?: OptimizerConfig
  globalBounds?: DecisionBounds
  globalEconomics?: FinancialParams
}

const NETWORKS: { [key: string]: { name: string; network: NetworkData; description: string } } = {
  ieee33: {
    name: "IEEE 33 Nodos",
    network: IEEE_33_NETWORK,
    description: "Sistema radial de 33 nodos, ampliamente usado en literatura. Demanda total: 3,715 kW"
  },
  ieee69: {
    name: "IEEE 69 Nodos",
    network: IEEE_69_NETWORK,
    description: "Sistema radial de 69 nodos para redes mas complejas. Demanda total: 3,802 kW"
  },
}

// Convert ZNI profiles to HourlyLoadProfile format (exclude officialData)
const ZNI_AS_PROFILES: { [key: string]: HourlyLoadProfile } = Object.fromEntries(
  Object.entries(ZNI_REGIONAL_PROFILES).map(([key, data]) => [
    key,
    { name: data.name, demandFactors: data.demandFactors, solarFactors: data.solarFactors }
  ])
)

const ALL_PROFILES: { [key: string]: HourlyLoadProfile } = {
  ...LOAD_PROFILES,
  ...ZNI_AS_PROFILES,
  ...OPERATOR_PROFILES,
}

function AnimatedCounter({ end, duration = 2000, prefix = "", suffix = "", decimals = 0 }: { end: number, duration?: number, prefix?: string, suffix?: string, decimals?: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let startTime: number | null = null
    let animationFrameId: number
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = timestamp - startTime
      const percentage = Math.min(progress / duration, 1)
      // Ease out cubic
      const easePercentage = 1 - Math.pow(1 - percentage, 3)
      setCount(end * easePercentage)
      if (progress < duration) {
        animationFrameId = window.requestAnimationFrame(step)
      } else {
        setCount(end)
      }
    }
    animationFrameId = window.requestAnimationFrame(step)
    return () => window.cancelAnimationFrame(animationFrameId)
  }, [end, duration])

  return <span>{prefix}{count.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>
}

export function StepICSA({
  onBack,
  isIEEETest = false,
  ieeeSystem,
  globalLoadProfile,
  globalOptimizerConfig,
  globalBounds,
  globalEconomics,
}: StepICSAProps) {
  // Estado de la pestaña principal - si es prueba IEEE, ir directo a configuracion
  const [mainTab, setMainTab] = useState<string>("config")

  // Determinar el perfil inicial basándose en el estado global
  const initialProfileKey = useMemo(() => {
    if (globalLoadProfile?.source === "colombian" && globalLoadProfile?.name) {
      // Find the key in ALL_PROFILES that matches the name (ignoring prefixes like 'IPSE/ZNI - ')
      const entry = Object.entries(ALL_PROFILES).find(
        ([_, p]) => globalLoadProfile.name.includes(p.name) || p.name === globalLoadProfile.name
      )
      if (entry) return entry[0]
    }
    // Default fallback
    return "zni-rural"
  }, [globalLoadProfile])

  // Configuracion - preseleccionar sistema si es prueba IEEE
  const [selectedNetwork, setSelectedNetwork] = useState<string>(ieeeSystem ? `ieee${ieeeSystem}` : "ieee33")
  const [selectedProfile, setSelectedProfile] = useState<string>(initialProfileKey)

  // Parametros del algoritmo inicializados con el estado global
  const [numGDs, setNumGDs] = useState([3]) // Fixed in the frontend for now based on script
  const [maxPvKw, setMaxPvKw] = useState([globalBounds?.inverterKwMax || 2400])
  const [populationSize, setPopulationSize] = useState([globalOptimizerConfig?.populationSize || 100])
  const [maxIterations, setMaxIterations] = useState([globalOptimizerConfig?.generations || 2000])

  // Estado de visualizacion IEEE
  const [showIEEE33Lines, setShowIEEE33Lines] = useState(false)
  const [showIEEE33Loads, setShowIEEE33Loads] = useState(false)
  const [showIEEE69Lines, setShowIEEE69Lines] = useState(false)
  const [showIEEE69Loads, setShowIEEE69Loads] = useState(false)

  // Estado de ejecucion
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const [result, setResult] = useState<ICSAResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const startTimeRef = useRef<number>(0)

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev.slice(-100), `[${new Date().toLocaleTimeString()}] ${msg}`])
  }, [])

  // Configurar automaticamente cuando es prueba IEEE
  useEffect(() => {
    if (isIEEETest && ieeeSystem) {
      setSelectedNetwork(`ieee${ieeeSystem}`)
      setSelectedProfile("zni-rural") // Perfil ZNI por defecto
      setNumGDs([3])
      setMaxPvKw([2400])
      setPopulationSize([100])
      setMaxIterations([500])
      addLog(`Modo prueba IEEE ${ieeeSystem} activado. Datos precargados del algoritmo MATLAB.`)
    }
  }, [isIEEETest, ieeeSystem, addLog])

  const network = NETWORKS[selectedNetwork].network
  const profile = ALL_PROFILES[selectedProfile]

  // Estadisticas del sistema seleccionado
  const totalDemand = network.loads.reduce((s: number, l: any) => s + l.p, 0)
  const totalReactive = network.loads.reduce((s: number, l: any) => s + l.q, 0)
  const maxLoadNode = network.loads.reduce((max: any, l: any) => l.p > max.p ? l : max, network.loads[0])

  const handleRunICSA = useCallback(async () => {
    setError(null)
    setLogs([])
    setResult(null)
    setIsOptimizing(true)
    setProgress(0)
    startTimeRef.current = Date.now()

    addLog(`Iniciando optimizacion ICSA...`)
    addLog(`Sistema: ${network.name} (${network.nNodes} nodos)`)
    addLog(`Perfil de carga: ${profile.name}`)
    addLog(`Generadores a ubicar: ${numGDs[0]}`)
    addLog(`Tamano maximo por GD: ${maxPvKw[0]} kW`)
    addLog(`Poblacion: ${populationSize[0]}, Iteraciones: ${maxIterations[0]}`)

    const config: ICSAConfig = {
      numGDs: numGDs[0],
      populationSize: populationSize[0],
      maxIterations: maxIterations[0],
      flightLength: 2.0,
      maxPvKw: maxPvKw[0],
      seed: 42,
    }

    try {
      // Simulación de progreso más realista (empíricamente 1.2ms por individuo por iteración para IEEE 33/69)
      const estimatedTimeMs = Math.max((maxIterations[0] * populationSize[0]) * 1.2, 5000)
      // Ajustamos el tiempo por tick para tener ~100 actualizaciones fluidas
      const tickRate = estimatedTimeMs / 100;
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          // Incremento suave: avanza más rápido al principio, luego decelera
          const step = prev < 40 ? 1.5 : prev < 75 ? 1.0 : prev < 90 ? 0.5 : prev < 99 ? 0.1 : 0;
          return Number(Math.min(prev + step, 99).toFixed(1));
        })
      }, tickRate)

      // Cuando es prueba IEEE, se ignora el perfil de la UI y se inyecta el EXACTO de MATLAB (que corresponde a zni-rural en la base de datos local)
      const exactMatlabProfile = isIEEETest ? ALL_PROFILES["zni-rural"] : profile

      const economicsToUse = globalEconomics ? {
        discountRate: globalEconomics.discountRate,
        horizonYears: globalEconomics.horizonYears,
        energyInflation: globalEconomics.inflationRate, // mapped inflationRate -> energyInflation
        energyCost: DEFAULT_ECONOMIC_PARAMS.energyCost,
        pvCostPerKw: DEFAULT_ECONOMIC_PARAMS.pvCostPerKw,
        omCostPerKwh: DEFAULT_ECONOMIC_PARAMS.omCostPerKwh,
        daysPerYear: DEFAULT_ECONOMIC_PARAMS.daysPerYear,
        deltaH: DEFAULT_ECONOMIC_PARAMS.deltaH,
      } : DEFAULT_ECONOMIC_PARAMS

      const res = await fetch("/api/icsa-optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          network,
          loadProfile: exactMatlabProfile,
          economics: economicsToUse,
          config,
        }),
      })

      clearInterval(progressInterval)

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Error en optimizacion")
      }

      setProgress(100)
      const elapsed = ((Date.now() - startTimeRef.current) / 1000).toFixed(1)
      addLog(`Optimizacion completada en ${elapsed}s`)
      addLog(`Costo optimizado: $${data.fitness?.toFixed(2)} USD/ano`)
      addLog(`Ahorro: ${data.savingsPercent?.toFixed(1)}%`)
      addLog(`Nodos optimos: ${data.optimalNodes?.join(", ")}`)

      setResult(data)
      setMainTab("results")
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido"
      setError(msg)
      addLog(`ERROR: ${msg}`)
      setIsOptimizing(false)
    }
  }, [network, profile, numGDs, maxPvKw, populationSize, maxIterations, addLog])

  const handleExportJSON = () => {
    if (!result) return
    const dataStr = JSON.stringify(result, null, 2)
    const blob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `microgrid_results_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    URL.revokeObjectURL(url)
  }

  const roiData = useMemo(() => {
    if (!result || !globalEconomics) return []
    const infl = globalEconomics.inflationRate || 0.05
    const baseCostYear1 = result.baseCost || 0
    const optCostYear1 = (result.f1_energyCost || 0) + (result.f3_omCost || 0)

    let accBase = 0
    let accOpt = result.f2_investmentCost || 0 // CAPEX en año 0

    const data = []
    for (let year = 1; year <= 20; year++) {
      accBase += baseCostYear1 * Math.pow(1 + infl, year - 1)
      accOpt += optCostYear1 * Math.pow(1 + infl, year - 1)
      data.push({
        year,
        "Costo Base Acumulado": Math.round(accBase),
        "Costo FV Acumulado": Math.round(accOpt),
      })
    }
    return data
  }, [result, globalEconomics])

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Optimizacion ICSA</h2>
          <p className="text-sm text-muted-foreground">
            Improved Crow Search Algorithm para ubicacion optima de generacion distribuida
          </p>
        </div>
        {onBack && (
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        )}
      </div>

      {/* Banner para Prueba IEEE */}
      {isIEEETest && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/20 p-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-primary">Modo Prueba IEEE {ieeeSystem} Nodos</p>
                  <p className="text-sm text-muted-foreground">
                    Datos precargados del algoritmo MATLAB. Listo para ejecutar y validar resultados.
                  </p>
                </div>
              </div>
              <Button onClick={handleRunICSA} disabled={isOptimizing} size="lg">
                {isOptimizing ? "Optimizando..." : "Ejecutar Prueba IEEE"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ieee-verification">Casos IEEE</TabsTrigger>
          <TabsTrigger value="data-sources">Fuentes de Datos</TabsTrigger>
          <TabsTrigger value="config">Configurar</TabsTrigger>
          <TabsTrigger value="results" disabled={!result}>Resultados</TabsTrigger>
        </TabsList>

        {/* ============================================ */}
        {/* TAB: CASOS IEEE BASE PARA VERIFICACION */}
        {/* ============================================ */}
        <TabsContent value="ieee-verification" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Casos Base IEEE para Verificacion
              </CardTitle>
              <CardDescription>
                Datos estandar de redes de distribucion IEEE usados para validar el algoritmo ICSA.
                Estos datos provienen del codigo MATLAB original y son consistentes con la literatura.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* IEEE 33 NODOS */}
              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-600" />
                      IEEE 33 Nodos
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Vbase = 12.66 kV | Sbase = 100 MVA | 32 lineas
                    </p>
                  </div>
                  <Badge variant="secondary">33 Nodos</Badge>
                </div>

                {/* Resumen IEEE 33 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground">Demanda P Total</p>
                    <p className="font-semibold">3,715 kW</p>
                  </div>
                  <div className="rounded bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground">Demanda Q Total</p>
                    <p className="font-semibold">2,300 kVAr</p>
                  </div>
                  <div className="rounded bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground">Nodo Max Carga</p>
                    <p className="font-semibold">Nodo 24 (420 kW)</p>
                  </div>
                  <div className="rounded bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground">Lineas</p>
                    <p className="font-semibold">32</p>
                  </div>
                </div>

                {/* Tabla de Lineas IEEE 33 */}
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowIEEE33Lines(!showIEEE33Lines)}
                    className="w-full justify-between"
                  >
                    <span>Ver Datos de Lineas (R, X en ohms)</span>
                    {showIEEE33Lines ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  {showIEEE33Lines && (
                    <div className="mt-2 max-h-64 overflow-auto rounded border">
                      <table className="w-full text-xs">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            <th className="p-2 text-left">De</th>
                            <th className="p-2 text-left">A</th>
                            <th className="p-2 text-left">R (ohm)</th>
                            <th className="p-2 text-left">X (ohm)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {IEEE_33_LINES.map((line, i) => (
                            <tr key={i} className="border-t">
                              <td className="p-2">{line.from}</td>
                              <td className="p-2">{line.to}</td>
                              <td className="p-2 font-mono">{line.r.toFixed(4)}</td>
                              <td className="p-2 font-mono">{line.x.toFixed(4)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Tabla de Cargas IEEE 33 */}
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowIEEE33Loads(!showIEEE33Loads)}
                    className="w-full justify-between"
                  >
                    <span>Ver Datos de Cargas (P, Q)</span>
                    {showIEEE33Loads ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  {showIEEE33Loads && (
                    <div className="mt-2 max-h-64 overflow-auto rounded border">
                      <table className="w-full text-xs">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            <th className="p-2 text-left">Nodo</th>
                            <th className="p-2 text-left">P (kW)</th>
                            <th className="p-2 text-left">Q (kVAr)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {IEEE_33_LOADS.map((load, i) => (
                            <tr key={i} className="border-t">
                              <td className="p-2">{load.node}</td>
                              <td className="p-2 font-mono">{load.p}</td>
                              <td className="p-2 font-mono">{load.q}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* IEEE 69 NODOS */}
              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <Zap className="h-4 w-4 text-blue-600" />
                      IEEE 69 Nodos
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Vbase = 12.66 kV | Sbase = 100 MVA | 68 lineas
                    </p>
                  </div>
                  <Badge variant="secondary">69 Nodos</Badge>
                </div>

                {/* Resumen IEEE 69 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground">Demanda P Total</p>
                    <p className="font-semibold">3,802 kW</p>
                  </div>
                  <div className="rounded bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground">Demanda Q Total</p>
                    <p className="font-semibold">2,695 kVAr</p>
                  </div>
                  <div className="rounded bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground">Nodo Max Carga</p>
                    <p className="font-semibold">Nodo 61 (1244 kW)</p>
                  </div>
                  <div className="rounded bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground">Lineas</p>
                    <p className="font-semibold">68</p>
                  </div>
                </div>

                {/* Tabla de Lineas IEEE 69 */}
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowIEEE69Lines(!showIEEE69Lines)}
                    className="w-full justify-between"
                  >
                    <span>Ver Datos de Lineas (R, X en ohms)</span>
                    {showIEEE69Lines ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  {showIEEE69Lines && (
                    <div className="mt-2 max-h-64 overflow-auto rounded border">
                      <table className="w-full text-xs">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            <th className="p-2 text-left">De</th>
                            <th className="p-2 text-left">A</th>
                            <th className="p-2 text-left">R (ohm)</th>
                            <th className="p-2 text-left">X (ohm)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {IEEE_69_LINES.map((line, i) => (
                            <tr key={i} className="border-t">
                              <td className="p-2">{line.from}</td>
                              <td className="p-2">{line.to}</td>
                              <td className="p-2 font-mono">{line.r.toFixed(4)}</td>
                              <td className="p-2 font-mono">{line.x.toFixed(4)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Tabla de Cargas IEEE 69 */}
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowIEEE69Loads(!showIEEE69Loads)}
                    className="w-full justify-between"
                  >
                    <span>Ver Datos de Cargas (P, Q)</span>
                    {showIEEE69Loads ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  {showIEEE69Loads && (
                    <div className="mt-2 max-h-64 overflow-auto rounded border">
                      <table className="w-full text-xs">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            <th className="p-2 text-left">Nodo</th>
                            <th className="p-2 text-left">P (kW)</th>
                            <th className="p-2 text-left">Q (kVAr)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {IEEE_69_LOADS.map((load, i) => (
                            <tr key={i} className="border-t">
                              <td className="p-2">{load.node}</td>
                              <td className="p-2 font-mono">{load.p}</td>
                              <td className="p-2 font-mono">{load.q}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Perfil de Carga ZNI */}
              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-600" />
                      Perfil de Carga ZNI Rural (24h)
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Curva tipica de demanda e irradiancia para zonas no interconectadas
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Grafico de Demanda */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Factor de Demanda (p.u.)</p>
                    <div className="flex items-end gap-[2px] h-24">
                      {LOAD_PROFILES["zni-rural"].demandFactors.map((f, h) => (
                        <div
                          key={h}
                          className="flex-1 bg-primary rounded-t transition-all hover:bg-primary/80"
                          style={{ height: `${f * 100}%` }}
                          title={`Hora ${h + 1}: ${(f * 100).toFixed(1)}%`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                      <span>1h</span>
                      <span>12h</span>
                      <span>24h</span>
                    </div>
                  </div>

                  {/* Grafico Solar */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Factor Solar (p.u.)</p>
                    <div className="flex items-end gap-[2px] h-24">
                      {LOAD_PROFILES["zni-rural"].solarFactors.map((f, h) => (
                        <div
                          key={h}
                          className="flex-1 bg-yellow-500 rounded-t transition-all hover:bg-yellow-400"
                          style={{ height: `${f * 100}%` }}
                          title={`Hora ${h + 1}: ${(f * 100).toFixed(1)}%`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                      <span>1h</span>
                      <span>12h</span>
                      <span>24h</span>
                    </div>
                  </div>
                </div>

                {/* Tabla de valores */}
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Ver valores exactos del codigo MATLAB
                  </summary>
                  <div className="mt-2 grid grid-cols-4 md:grid-cols-6 gap-1 font-mono">
                    {LOAD_PROFILES["zni-rural"].demandFactors.map((d, h) => (
                      <div key={h} className="rounded bg-muted p-1 text-center">
                        <span className="text-muted-foreground">h{h + 1}:</span> {d.toFixed(3)}
                      </div>
                    ))}
                  </div>
                </details>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setMainTab("config")}>
                  Continuar a Configuracion
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================ */}
        {/* TAB: FUENTES DE DATOS */}
        {/* ============================================ */}
        <TabsContent value="data-sources" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                Fuentes de Datos y Referencias
              </CardTitle>
              <CardDescription>
                Informacion sobre el origen de los perfiles de carga, datos tecnicos y parametros economicos utilizados en la optimizacion.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* IPSE */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">IPSE - Instituto de Planificacion y Promocion de Soluciones Energeticas</h3>
                    <p className="text-sm text-muted-foreground">
                      Perfiles de demanda para Zonas No Interconectadas (ZNI) de Colombia
                    </p>
                  </div>
                  <Badge>Oficial</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="https://ipse.gov.co"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    ipse.gov.co
                  </a>
                  <a
                    href="https://www.datos.gov.co/browse?q=IPSE&sortBy=relevance"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Datos Abiertos IPSE
                  </a>
                </div>
                <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                  Los perfiles ZNI regionales (Amazonas, Choco, Guainia, Vichada, San Andres) estan basados en
                  caracterizaciones de demanda del IPSE para localidades aisladas.
                </p>
              </div>

              {/* UPME */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">UPME - Unidad de Planeacion Minero Energetica</h3>
                    <p className="text-sm text-muted-foreground">
                      Coeficientes de demanda por tipo de usuario y proyecciones energeticas
                    </p>
                  </div>
                  <Badge>Oficial</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="https://www1.upme.gov.co"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    upme.gov.co
                  </a>
                  <a
                    href="https://www1.upme.gov.co/Paginas/Demanda.aspx"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Proyeccion de Demanda
                  </a>
                </div>
                <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                  Los coeficientes UPME por estrato (1-6), comercial e industrial provienen de estudios
                  de caracterizacion de la demanda electrica residencial y comercial.
                </p>
              </div>

              {/* XM / SIMEM */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">XM / SIMEM - Sistema de Informacion Minero Energetico</h3>
                    <p className="text-sm text-muted-foreground">
                      Datos de operadores de red y demanda del Sistema Interconectado Nacional
                    </p>
                  </div>
                  <Badge>Oficial</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="https://www.xm.com.co"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    xm.com.co
                  </a>
                  <a
                    href="https://www.simem.co"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    simem.co
                  </a>
                </div>
                <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                  Los perfiles de operadores de red (EPM, Enel, Celsia) estan basados en curvas de carga
                  tipicas publicadas por XM para el mercado electrico colombiano.
                </p>
              </div>

              {/* NASA POWER */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">NASA POWER</h3>
                    <p className="text-sm text-muted-foreground">
                      Datos de irradiancia solar y parametros meteorologicos
                    </p>
                  </div>
                  <Badge variant="outline">Internacional</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="https://power.larc.nasa.gov"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    power.larc.nasa.gov
                  </a>
                  <a
                    href="https://power.larc.nasa.gov/data-access-viewer/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Data Access Viewer
                  </a>
                </div>
                <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                  Los datos de radiacion solar (GHI, DNI, DHI) y temperatura utilizados en el paso de
                  Recurso Solar provienen de la API de NASA POWER con resolucion horaria.
                </p>
              </div>

              {/* IEEE Test Cases */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">IEEE Test Feeders</h3>
                    <p className="text-sm text-muted-foreground">
                      Sistemas de prueba estandar para redes de distribucion
                    </p>
                  </div>
                  <Badge variant="outline">Academico</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="https://site.ieee.org/pes-testfeeders/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    IEEE PES Test Feeders
                  </a>
                </div>
                <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                  Los sistemas IEEE 33 y 69 nodos son casos de prueba estandar ampliamente utilizados
                  en la literatura para validar algoritmos de optimizacion de redes de distribucion.
                </p>
              </div>

              {/* Parametros Economicos */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">Parametros Economicos</h3>
                    <p className="text-sm text-muted-foreground">
                      Costos de energia, inversion PV y tasas financieras para Colombia
                    </p>
                  </div>
                  <Badge variant="outline">2024-2026</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                  <div className="rounded bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Costo Energia ZNI</p>
                    <p className="font-semibold">$0.139 USD/kWh</p>
                  </div>
                  <div className="rounded bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Costo PV Instalado</p>
                    <p className="font-semibold">$1,036 USD/kWp</p>
                  </div>
                  <div className="rounded bg-muted p-3">
                    <p className="text-xs text-muted-foreground">O&M PV</p>
                    <p className="font-semibold">$0.0019 USD/kWh</p>
                  </div>
                  <div className="rounded bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Tasa Descuento</p>
                    <p className="font-semibold">10%</p>
                  </div>
                  <div className="rounded bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Inflacion Energia</p>
                    <p className="font-semibold">2%</p>
                  </div>
                  <div className="rounded bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Horizonte</p>
                    <p className="font-semibold">20 anos</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setMainTab("config")}>
                  Continuar a Configuracion
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================ */}
        {/* TAB: CONFIGURACION */}
        {/* ============================================ */}
        <TabsContent value="config" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Seleccion de Red */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Sistema de Distribucion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Red de prueba IEEE</Label>
                  <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(NETWORKS).map(([key, { name, description }]) => (
                        <SelectItem key={key} value={key}>
                          <div>
                            <span className="font-medium">{name}</span>
                            <p className="text-xs text-muted-foreground">{description}</p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Nodos" value={network.nNodes.toString()} />
                  <StatCard label="Lineas" value={network.lines.length.toString()} />
                  <StatCard label="Demanda P" value={`${totalDemand.toFixed(0)} kW`} />
                  <StatCard label="Demanda Q" value={`${totalReactive.toFixed(0)} kVAr`} />
                </div>

                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">
                    Nodo con mayor carga: <span className="font-medium text-foreground">Nodo {maxLoadNode.node}</span> ({maxLoadNode.p} kW)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Seleccion de Perfil de Carga */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Perfil de Carga</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Perfil de demanda horaria</Label>
                  <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="header-zni" disabled className="font-semibold">
                        -- Perfiles ZNI --
                      </SelectItem>
                      {Object.entries(ZNI_REGIONAL_PROFILES).map(([key, prof]) => (
                        <SelectItem key={key} value={key}>
                          {prof.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="header-base" disabled className="font-semibold">
                        -- Perfiles Base --
                      </SelectItem>
                      {Object.entries(LOAD_PROFILES).map(([key, prof]) => (
                        <SelectItem key={key} value={key}>
                          {prof.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="header-ops" disabled className="font-semibold">
                        -- Operadores de Red --
                      </SelectItem>
                      {Object.entries(OPERATOR_PROFILES).map(([key, prof]) => (
                        <SelectItem key={key} value={key}>
                          {prof.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Mini grafico del perfil */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Perfil de Demanda (24h)</p>
                  <div className="flex items-end gap-[1px] h-16">
                    {profile.demandFactors.map((f, h) => (
                      <div
                        key={h}
                        className="flex-1 bg-primary rounded-t"
                        style={{ height: `${f * 100}%` }}
                        title={`Hora ${h}: ${(f * 100).toFixed(0)}%`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                    <span>0h</span>
                    <span>12h</span>
                    <span>24h</span>
                  </div>
                </div>

                {/* Mini grafico solar */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Perfil Solar (24h)</p>
                  <div className="flex items-end gap-[1px] h-12">
                    {profile.solarFactors.map((f, h) => (
                      <div
                        key={h}
                        className="flex-1 bg-yellow-500 rounded-t"
                        style={{ height: `${f * 100}%` }}
                        title={`Hora ${h}: ${(f * 100).toFixed(0)}%`}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Parametros del Optimizador */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Parametros del Algoritmo ICSA</CardTitle>
              <CardDescription>
                Improved Crow Search Algorithm basado en Diaz et al. (2018)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Generadores FV a ubicar: {numGDs[0]}
                  </Label>
                  <Slider
                    value={numGDs}
                    onValueChange={setNumGDs}
                    min={1}
                    max={5}
                    step={1}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Tamano maximo por GD: {maxPvKw[0]} kW
                  </Label>
                  <Slider
                    value={maxPvKw}
                    onValueChange={setMaxPvKw}
                    min={100}
                    max={5000}
                    step={100}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Poblacion de cuervos: {populationSize[0]}
                  </Label>
                  <Slider
                    value={populationSize}
                    onValueChange={setPopulationSize}
                    min={20}
                    max={200}
                    step={10}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Iteraciones maximas: {maxIterations[0]}
                  </Label>
                  <Slider
                    value={maxIterations}
                    onValueChange={setMaxIterations}
                    min={100}
                    max={2000}
                    step={100}
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    El ICSA optimizara la ubicacion (nodo) y dimensionamiento (kW) de {numGDs[0]} generadores FV
                    para minimizar el costo total anual del sistema, incluyendo compra de energia, inversion y O&M.
                  </p>
                </div>

                <Button
                  onClick={handleRunICSA}
                  disabled={isOptimizing}
                  size="lg"
                  className="min-w-[200px] text-base font-semibold"
                >
                  {isOptimizing ? "Optimizando..." : "Ejecutar ICSA"}
                </Button>
              </div>

              {isOptimizing && (
                <div className="mt-4 flex flex-col gap-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-center text-xs text-muted-foreground animate-pulse">
                    Optimizando... {progress.toFixed(0)}%
                  </p>
                </div>
              )}

              {error && (
                <div className="mt-4 rounded bg-destructive/10 p-3">
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Logs */}
          {logs.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Log de Ejecucion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-48 overflow-y-auto rounded bg-muted p-3 font-mono text-[11px] leading-5 text-muted-foreground">
                  {logs.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ============================================ */}
        {/* TAB: RESULTADOS */}
        {/* ============================================ */}
        <TabsContent value="results" className="space-y-6">
          {result && (
            <>
              {/* Resumen de Resultados */}
              {/* Resumen de Resultados Premium */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <ResultCard
                  label="Costo Optimizado"
                  value={<AnimatedCounter end={result.optimizedCost ?? result.f1_energyCost + result.f2_investmentCost + result.f3_omCost} prefix="$" decimals={0} />}
                  unit="USD/año"
                  highlight
                />
                <ResultCard
                  label="Ahorro Anual"
                  value={<><AnimatedCounter end={result.savingsPercent} decimals={1} />%</>}
                  unit={<span className={result.savings > 0 ? "text-success" : "text-destructive"}>
                    {result.savings > 0 ? "+" : "-"}$<AnimatedCounter end={Math.abs(result.savings)} decimals={0} /> USD
                  </span>}
                  positive={result.savings > 0}
                />
                <ResultCard
                  label="Reducción Pérdidas"
                  value={<><AnimatedCounter end={result.lossReduction} decimals={1} />%</>}
                  unit="Menos disipación térmica"
                  positive
                />

                {/* CO2 Emissions Card (Fina Coquetería) */}
                <Card className="flex flex-col items-start justify-between rounded-lg border p-3 shadow-sm bg-success/5 border-success/20">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="M12 16v-4" /><path d="M12 8h.01" /><path d="M6 12h.01" /><path d="M18 12h.01" /></svg>
                    Huella CO2 Evitada
                  </span>
                  <div className="flex flex-col mt-2">
                    <span className="text-2xl font-bold tracking-tight text-success flex items-baseline gap-1">
                      <AnimatedCounter end={(result.totalSolarDispatched || 0) * 0.45} decimals={1} />
                      <span className="text-sm font-normal">t</span>
                    </span>
                    <span className="text-xs font-mono text-success/70">
                      Toneladas anuales
                    </span>
                  </div>
                </Card>

                <ResultCard
                  label="Recorte Solar FV"
                  value={<><AnimatedCounter end={result.curtailmentPercent} decimals={1} />%</>}
                  unit="Energía desperdiciada"
                />
              </div>

              {/* Ubicacion Optima */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Ubicacion y Dimensionamiento Optimo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2 text-left font-medium">GD</th>
                          <th className="py-2 text-left font-medium">Nodo</th>
                          <th className="py-2 text-left font-medium">Tamano (kW)</th>
                          <th className="py-2 text-left font-medium">% del Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.optimalNodes?.map((node, i) => {
                          const size = result.optimalSizes?.[i] ?? 0
                          const totalSize = result.optimalSizes?.reduce((a, b) => a + b, 0) ?? 1
                          return (
                            <tr key={i} className="border-b border-muted">
                              <td className="py-2 font-medium">FV-{i + 1}</td>
                              <td className="py-2">{node}</td>
                              <td className="py-2">{size.toFixed(1)} kW</td>
                              <td className="py-2">{((size / totalSize) * 100).toFixed(1)}%</td>
                            </tr>
                          )
                        })}
                        <tr className="font-semibold bg-muted/50">
                          <td className="py-2" colSpan={2}>Total Instalado</td>
                          <td className="py-2">{result.optimalSizes?.reduce((a, b) => a + b, 0).toFixed(1)} kW</td>
                          <td className="py-2">100%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Desglose de Costos */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Desglose de Costos Anuales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <CostBar
                        label="Compra de Energia (f1)"
                        value={result.f1_energyCost ?? 0}
                        total={(result.optimizedCost ?? result.f1_energyCost + result.f2_investmentCost + result.f3_omCost) || 1}
                        color="bg-blue-500"
                      />
                      <CostBar
                        label="Inversion PV (f2)"
                        value={result.f2_investmentCost ?? 0}
                        total={(result.optimizedCost ?? result.f1_energyCost + result.f2_investmentCost + result.f3_omCost) || 1}
                        color="bg-yellow-500"
                      />
                      <CostBar
                        label="O&M PV (f3)"
                        value={result.f3_omCost ?? 0}
                        total={(result.optimizedCost ?? result.f1_energyCost + result.f2_investmentCost + result.f3_omCost) || 1}
                        color="bg-green-500"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Comparacion con Caso Base</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Costo Base (sin FV)</span>
                        <span className="font-semibold">${result.baseCost?.toFixed(0)} USD/ano</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Costo Optimizado (con FV)</span>
                        <span className={`font-semibold ${result.savings > 0 ? "text-green-600" : "text-destructive"}`}>
                          ${(result.optimizedCost ?? result.f1_energyCost + result.f2_investmentCost + result.f3_omCost)?.toFixed(0)} USD/ano
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1 border-t pt-2">
                        <div className="flex justify-between">
                          <span>f1 (Compra energia):</span>
                          <span>${result.f1_energyCost?.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>f2 (Inversion PV):</span>
                          <span>${result.f2_investmentCost?.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>f3 (O&M):</span>
                          <span>${result.f3_omCost?.toFixed(0)}</span>
                        </div>
                      </div>
                      <div className="border-t pt-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {result.savings > 0 ? "Ahorro Total" : "Costo Adicional"}
                          </span>
                          <span className={`text-lg font-bold ${result.savings > 0 ? "text-green-600" : "text-destructive"}`}>
                            {result.savings > 0 ? "" : "-"}${Math.abs(result.savings)?.toFixed(0)} USD/ano ({result.savingsPercent?.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Diagrama Topológico Interactivo (Fina Coquetería) */}
              <Card className="mt-8 border-muted-foreground/20 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-1000">
                <CardHeader className="pb-3 border-b border-muted bg-gradient-to-r from-primary/5 to-transparent">
                  <CardTitle className="text-base flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><circle cx="12" cy="5" r="3" /><line x1="12" y1="22" x2="12" y2="8" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Topología de Red Óptima
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex justify-center bg-black/50">
                  <NetworkDiagram network={network} result={result} />
                </CardContent>
              </Card>

              {/* Reporte Detallado estilo MATLAB */}
              <Card className="mt-8 border-muted-foreground/20">
                <CardHeader className="pb-3 border-b border-muted">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Reporte Detallado (Formato MATLAB)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 overflow-x-auto">
                  <pre className="text-[11px] font-mono leading-[1.6] text-muted-foreground">
                    {`================================================================================
                           RESULTADOS ÓPTIMOS (ICSA)
================================================================================
${result.optimalNodes?.map((node, i) => `Generador FV ${i + 1}: Ubicado en Nodo ${node}, Tamaño Nominal: ${result.optimalSizes[i]?.toFixed(2)} kW`).join("\n")}
--------------------------------------------------------------------------------
Demanda Activa Total del Sistema:   ${(totalDemand * 24).toFixed(2)} kWh/día (Aprox)
Demanda Reactiva Total del Sistema: ${(totalReactive * 24).toFixed(2)} kVArh/día
Energía Comprada a Subestación:     ${(totalDemand * 24 + result.totalLossesKwh - result.totalSolarDispatched).toFixed(2)} kWh/día (Base: ${(totalDemand * 24 + result.baselineLossesKwh).toFixed(2)} kWh/día)
Energía Inyectada por FV a la Red:  ${result.totalSolarDispatched?.toFixed(2)} kWh/día
--------------------------------------------------------------------------------
Energía Solar DISPONIBLE Total:     ${result.totalSolarAvailable?.toFixed(2)} kWh/día
Energía Solar DESPACHADA Total:     ${result.totalSolarDispatched?.toFixed(2)} kWh/día
Recorte Solar (Curtailment):        ${result.curtailmentPercent?.toFixed(2)} %
Energía Total Perdida (Red):        ${result.totalLossesKwh?.toFixed(4)} kWh/día
Pérdidas Base (Sin FV):             ${result.baselineLossesKwh?.toFixed(4)} kWh/día
Tensión Mínima Absoluta:            ${result.vMin?.toFixed(4)} p.u.
Tensión Máxima Absoluta:            ${result.vMax?.toFixed(4)} p.u.
--------------------------------------------------------------------------------
Costo Base (Sin FV):                $${result.baseCost?.toFixed(2)} USD/año
Costo Optimizado (Con FV):          $${(result.optimizedCost ?? result.f1_energyCost + result.f2_investmentCost + result.f3_omCost)?.toFixed(2)} USD/año
  -> f1 (Compra Energía):           $${result.f1_energyCost?.toFixed(2)} USD/año
  -> f2 (Inversión FV):             $${result.f2_investmentCost?.toFixed(2)} USD/año
  -> f3 (Mantenimiento FV):         $${result.f3_omCost?.toFixed(2)} USD/año
Ahorro Anual Logrado:               $${result.savings?.toFixed(2)} USD/año (${result.savingsPercent?.toFixed(2)}%)
================================================================================`}
                  </pre>
                </CardContent>
              </Card>

              {/* Gráficos */}

              {/* Gráfico ROI (Fina Coquetería) */}
              <Card className="mt-6 mb-6 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                    Retorno de Inversión (Flujo de Caja a 20 Años)
                  </CardTitle>
                  <CardDescription>
                    Comparación del costo acumulado del sistema incluyendo CAPEX y la inflación energética anual del {((globalEconomics?.inflationRate ?? 0.05) * 100).toFixed(1)}%
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={roiData} margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
                      <defs>
                        <linearGradient id="colorBase" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorOpt" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                      <XAxis dataKey="year" fontSize={11} tickFormatter={(tick) => `Año ${tick}`} />
                      <YAxis
                        fontSize={11}
                        tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`}
                        width={80}
                      />
                      <Tooltip
                        contentStyle={{ fontSize: 13, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: 'rgba(15,23,42,0.9)', color: '#fff' }}
                        formatter={(value: number) => [`$${value.toLocaleString()} USD`, undefined]}
                        labelFormatter={(label) => `Año ${label}`}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
                      <Area type="monotone" dataKey="Costo Base Acumulado" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorBase)" />
                      <Area type="monotone" dataKey="Costo FV Acumulado" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorOpt)" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 mb-6">
                <Card className="animate-in fade-in zoom-in-95 duration-700 delay-150">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Demanda vs Sol vs Pérdidas</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={result.hourlyResults?.map((hr, i) => ({
                        hour: i + 1,
                        Demanda: totalDemand * profile.demandFactors[i],
                        Solar: result.solarProfiles[i]?.dispatched || 0,
                        Pérdidas: hr.pLoss
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="hour" fontSize={11} tickMargin={10} />
                        <YAxis yAxisId="left" fontSize={11} />
                        <YAxis yAxisId="right" orientation="right" fontSize={11} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", backgroundColor: '#1e293b', color: '#fff' }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Area yAxisId="left" type="monotone" dataKey="Demanda" fill="#3b82f6" stroke="#2563eb" fillOpacity={0.1} />
                        <Bar yAxisId="left" dataKey="Solar" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                        <Line yAxisId="right" type="monotone" dataKey="Pérdidas" stroke="#ef4444" strokeWidth={2} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2"><Info className="h-4 w-4 text-primary" /> Perfil de Tensión</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="node" type="number" domain={[1, network.nNodes]} fontSize={11} tickMargin={10} />
                        <YAxis domain={[0.90, 1.05]} fontSize={11} ticks={[0.90, 0.95, 1.0, 1.05]} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", backgroundColor: '#1e293b', color: '#fff' }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line
                          data={result.voltageProfiles[12]?.map((v, i) => ({ node: i + 1, v }))}
                          name="Hora 13 (Pico Solar)"
                          dataKey="v"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          data={result.voltageProfiles[19]?.map((v, i) => ({ node: i + 1, v }))}
                          name="Hora 20 (Pico Doméstico)"
                          dataKey="v"
                          stroke="#ef4444"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Convergencia del Algoritmo</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={result.convergenceCurve?.map((fit, i) => ({ iter: i + 1, cost: fit }))}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="iter" fontSize={11} tickMargin={10} />
                        <YAxis domain={['auto', 'auto']} fontSize={11} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", backgroundColor: '#1e293b', color: '#fff' }} formatter={(value: number) => [`$${value.toFixed(0)}`, 'Costo Total']} />
                        <Line type="monotone" dataKey="cost" name="Costo Total" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2"><Database className="h-4 w-4 text-primary" /> Disponibilidad vs Despacho Solar</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={result.solarProfiles?.map(s => ({
                        hour: s.hour + 1,
                        Disponible: s.available,
                        Despachada: s.dispatched
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="hour" fontSize={11} />
                        <YAxis fontSize={11} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", backgroundColor: '#1e293b', color: '#fff' }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Area type="monotone" dataKey="Disponible" stroke="none" fill="#10b981" fillOpacity={0.2} />
                        <Bar dataKey="Despachada" fill="#10b981" radius={[2, 2, 0, 0]} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-between mt-6 print:hidden">
                <Button variant="outline" onClick={() => setMainTab("config")}>
                  Nueva Optimizacion
                </Button>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={handleExportJSON} className="flex items-center gap-2">
                    <Download className="h-4 w-4" /> Exportar JSON
                  </Button>
                  <Button onClick={() => window.print()} className="gap-2">
                    <FileText className="h-4 w-4" /> Imprimir PDF
                  </Button>
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Componentes auxiliares
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-muted p-3 text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  )
}

function ResultCard({
  label,
  value,
  unit,
  highlight,
  positive
}: {
  label: string
  value: React.ReactNode
  unit: React.ReactNode
  highlight?: boolean
  positive?: boolean
}) {
  return (
    <Card className={highlight ? "border-primary" : ""}>
      <CardContent className="p-4 text-center">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className={`text-2xl font-bold ${positive ? "text-green-600" : ""}`}>{value}</div>
        <div className="text-xs text-muted-foreground">{unit}</div>
      </CardContent>
    </Card>
  )
}

function CostBar({
  label,
  value,
  total,
  color
}: {
  label: string
  value: number
  total: number
  color: string
}) {
  const percent = (value / total) * 100
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span>{label}</span>
        <span className="font-medium">${value.toFixed(0)} ({percent.toFixed(1)}%)</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
