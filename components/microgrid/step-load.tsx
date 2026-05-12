"use client"

import React from "react"
import { useState, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Database,
  FileUp,
  ExternalLink,
  ChevronDown,
  MapPin,
  Building2,
  Factory,
  Home,
  Sparkles,
  FileText,
  Info
} from "lucide-react"
import {
  ZNI_REGIONAL_PROFILES,
  OPERATOR_PROFILES,
  DATA_SOURCES,
  scaleProfileToPeak,
  UPME_STRATUM_DATA,
  type ZNIRegionData
} from "@/lib/microgrid/colombian-data"
import type { LoadProfile, HourlyData, SiteConfig } from "@/lib/microgrid/types"
import type { HourlyLoadProfile } from "@/lib/microgrid/icsa-types"

interface StepLoadProps {
  site?: SiteConfig | null
  loadProfile: LoadProfile | null
  solarData: HourlyData[] | null
  onLoadSet: (profile: LoadProfile) => void
  onNext: () => void
  onBack: () => void
}

// Use UPME_STRATUM_DATA directly
const UPME_PROFILES_LIST = Object.entries(UPME_STRATUM_DATA).map(([key, data]) => ({
  key,
  name: data.name,
  data
}))

export function StepLoad({ site, loadProfile, solarData, onLoadSet, onNext, onBack }: StepLoadProps) {
  const [activeTab, setActiveTab] = useState("colombian")
  const [selectedSource, setSelectedSource] = useState<string>("zni")

  // Try to find a matching ZNI region based on the site name
  const matchedZNI = useMemo(() => {
    if (!site?.name) return null
    const siteNameLower = site.name.toLowerCase()

    // Check if the site name contains the key or the profile name
    for (const [key, profile] of Object.entries(ZNI_REGIONAL_PROFILES)) {
      const profileNameLower = profile.name.toLowerCase()
      // Remove "zni " prefix for better matching (e.g., "ZNI Chocó" -> "chocó")
      const regionName = profileNameLower.replace('zni ', '').trim()

      // Matches "Capurgana, Choco" with key "choco" or regionName "chocó"
      if (
        profileNameLower === siteNameLower ||
        siteNameLower.includes(profileNameLower) ||
        siteNameLower.includes(key.toLowerCase()) ||
        // Also check unaccented versions
        siteNameLower.normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(regionName.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
      ) {
        return key
      }
    }
    return null
  }, [site?.name])

  const [selectedProfile, setSelectedProfile] = useState<string>("estrato3")
  const [selectedZNI, setSelectedZNI] = useState<string>(matchedZNI || "amazonas")
  const [selectedOperator, setSelectedOperator] = useState<string>("epm")
  const [peakDemandKw, setPeakDemandKw] = useState([85]) // Default from IPSE data
  const [useOfficialPeak, setUseOfficialPeak] = useState(true)
  const [csvLoading, setCsvLoading] = useState(false)
  const [csvError, setCsvError] = useState<string | null>(null)
  const [showSources, setShowSources] = useState(false)

  // Auto-update to ZNI if a match is found on mount
  React.useEffect(() => {
    if (matchedZNI) {
      setSelectedSource("zni")
      setSelectedZNI(matchedZNI)
      const data = ZNI_REGIONAL_PROFILES[matchedZNI]?.officialData
      if (data && useOfficialPeak) {
        setPeakDemandKw([data.avgPeakKw])
      }
    }
  }, [matchedZNI, useOfficialPeak])

  const numDays = solarData ? Math.round(solarData.length / 24) : 365

  // Get current official data for display
  const currentOfficialData = useMemo(() => {
    if (selectedSource === "zni") {
      return ZNI_REGIONAL_PROFILES[selectedZNI]?.officialData || null
    } else if (selectedSource === "upme") {
      return UPME_STRATUM_DATA[selectedProfile]?.officialData || null
    }
    return null
  }, [selectedSource, selectedZNI, selectedProfile])

  // Update peak demand when source/profile changes if using official data
  const handleSourceChange = useCallback((source: string) => {
    setSelectedSource(source)
    if (source === "zni" && useOfficialPeak) {
      const data = ZNI_REGIONAL_PROFILES[selectedZNI]?.officialData
      if (data) setPeakDemandKw([data.avgPeakKw])
    } else if (source === "upme" && useOfficialPeak) {
      const data = UPME_STRATUM_DATA[selectedProfile]?.officialData
      if (data) setPeakDemandKw([Math.round(data.avgPeakKw * 50)]) // Scale for typical community
    }
  }, [selectedZNI, selectedProfile, useOfficialPeak])

  const handleZNIChange = useCallback((zni: string) => {
    setSelectedZNI(zni)
    if (useOfficialPeak) {
      const data = ZNI_REGIONAL_PROFILES[zni]?.officialData
      if (data) setPeakDemandKw([data.avgPeakKw])
    }
  }, [useOfficialPeak])

  const handleUPMEChange = useCallback((profile: string) => {
    setSelectedProfile(profile)
    if (useOfficialPeak) {
      const data = UPME_STRATUM_DATA[profile]?.officialData
      if (data) setPeakDemandKw([Math.round(data.avgPeakKw * 50)]) // Scale for typical community
    }
  }, [useOfficialPeak])

  // Generate profile from Colombian data
  const handleGenerateColombianProfile = useCallback(() => {
    let profile: HourlyLoadProfile | null = null
    let profileName = ""

    if (selectedSource === "upme") {
      const upmeData = UPME_STRATUM_DATA[selectedProfile]
      if (upmeData) {
        profile = {
          name: upmeData.name,
          demandFactors: upmeData.pattern,
          solarFactors: ZNI_REGIONAL_PROFILES.vichada.solarFactors
        }
        profileName = `UPME - ${upmeData.name}`
      }
    } else if (selectedSource === "zni") {
      const zniData = ZNI_REGIONAL_PROFILES[selectedZNI]
      if (zniData) {
        profile = {
          name: zniData.name,
          demandFactors: zniData.demandFactors,
          solarFactors: zniData.solarFactors
        }
        profileName = `IPSE/ZNI - ${zniData.name}`
      }
    } else if (selectedSource === "operator") {
      profile = OPERATOR_PROFILES[selectedOperator]
      profileName = `XM/SIMEM - ${profile?.name || selectedOperator}`
    }

    if (!profile) return

    // Scale to peak demand and generate hourly data
    const scaledPattern = scaleProfileToPeak(profile, peakDemandKw[0])

    // Generate data for all days
    const data: { hour: number; kw: number }[] = []
    for (let day = 0; day < numDays; day++) {
      for (let h = 0; h < 24; h++) {
        // Add some daily variation (+/- 10%)
        const variation = 0.9 + Math.random() * 0.2
        data.push({
          hour: day * 24 + h,
          kw: scaledPattern[h].kw * variation
        })
      }
    }

    onLoadSet({
      name: profileName,
      data,
      source: "colombian",
    })
  }, [selectedSource, selectedProfile, selectedZNI, selectedOperator, peakDemandKw, numDays, onLoadSet])

  const handleCsvUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      setCsvLoading(true)
      setCsvError(null)

      try {
        const text = await file.text()
        const lines = text.trim().split("\n")
        const data: { hour: number; kw: number }[] = []

        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(",")
          if (parts.length < 2) continue
          const kw = parseFloat(parts[1])
          if (isNaN(kw)) continue
          data.push({ hour: i - 1, kw: Math.max(0, kw) })
        }

        if (data.length === 0) throw new Error("No se encontraron datos validos en el CSV")

        onLoadSet({ name: file.name, data, source: "csv" })
      } catch (err: unknown) {
        setCsvError(err instanceof Error ? err.message : "Error al leer CSV")
      } finally {
        setCsvLoading(false)
      }
    },
    [onLoadSet]
  )

  // 24h average profile for visualization
  const hourlyAvg = useMemo(() => {
    if (!loadProfile) return null
    const hourBins: number[][] = Array.from({ length: 24 }, () => [])
    for (const d of loadProfile.data) {
      hourBins[d.hour % 24].push(d.kw)
    }
    return hourBins.map((bin, h) => ({
      hour: h,
      avg: bin.length > 0 ? bin.reduce((a, b) => a + b, 0) / bin.length : 0,
      max: bin.length > 0 ? Math.max(...bin) : 0,
      min: bin.length > 0 ? Math.min(...bin) : 0,
    }))
  }, [loadProfile])

  const peakDemand = hourlyAvg ? Math.max(...hourlyAvg.map((h) => h.max)) : 1
  const avgDemand = hourlyAvg ? hourlyAvg.reduce((s, h) => s + h.avg, 0) / 24 : 0
  const dailyEnergy = hourlyAvg ? hourlyAvg.reduce((s, h) => s + h.avg, 0) : 0

  // Get current preview pattern
  const previewPattern = useMemo(() => {
    if (selectedSource === "upme") {
      return UPME_STRATUM_DATA[selectedProfile]?.pattern || []
    } else if (selectedSource === "zni") {
      return ZNI_REGIONAL_PROFILES[selectedZNI]?.demandFactors || []
    } else if (selectedSource === "operator") {
      return OPERATOR_PROFILES[selectedOperator]?.demandFactors || []
    }
    return []
  }, [selectedSource, selectedProfile, selectedZNI, selectedOperator])

  return (
    <div className="flex flex-col gap-6">
      {/* Data Sources Info */}
      <Collapsible open={showSources} onOpenChange={setShowSources}>
        <Card className="border-primary/20">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm">Fuentes de Datos Verificables</CardTitle>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showSources ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(DATA_SOURCES).map(([key, source]) => (
                  <div key={key} className="rounded-lg border border-border p-3 bg-muted/30">
                    <p className="font-medium text-sm text-foreground">{source.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{source.description}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {source.urls.map((link, idx) => (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {link.label}
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="colombian" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Perfiles Colombianos</span>
            <span className="sm:hidden">Colombia</span>
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <FileUp className="h-4 w-4" />
            <span className="hidden sm:inline">Cargar Archivo</span>
            <span className="sm:hidden">Archivo</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Asistente IA</span>
            <span className="sm:hidden">IA</span>
          </TabsTrigger>
        </TabsList>

        {/* Colombian Profiles Tab */}
        <TabsContent value="colombian" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Source Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Seleccionar Fuente de Datos</CardTitle>
                <CardDescription className="text-xs">
                  Perfiles basados en estudios oficiales colombianos
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {/* Source Type */}
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={selectedSource === "upme" ? "default" : "outline"}
                    className="flex flex-col h-auto py-3 gap-1"
                    onClick={() => handleSourceChange("upme")}
                  >
                    <Home className="h-4 w-4" />
                    <span className="text-xs">UPME</span>
                  </Button>
                  <Button
                    variant={selectedSource === "zni" ? "default" : "outline"}
                    className="flex flex-col h-auto py-3 gap-1"
                    onClick={() => handleSourceChange("zni")}
                  >
                    <MapPin className="h-4 w-4" />
                    <span className="text-xs">ZNI/IPSE</span>
                  </Button>
                  <Button
                    variant={selectedSource === "operator" ? "default" : "outline"}
                    className="flex flex-col h-auto py-3 gap-1"
                    onClick={() => handleSourceChange("operator")}
                  >
                    <Building2 className="h-4 w-4" />
                    <span className="text-xs">Operadores</span>
                  </Button>
                </div>

                {/* Profile Selection based on source */}
                {selectedSource === "upme" && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Tipo de Usuario (UPME)</Label>
                      <Select value={selectedProfile} onValueChange={handleUPMEChange}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UPME_PROFILES_LIST.map((prof) => (
                            <SelectItem key={prof.key} value={prof.key}>{prof.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Official Data Display */}
                    {UPME_STRATUM_DATA[selectedProfile]?.officialData && (
                      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                        <p className="text-[10px] font-medium text-primary mb-2">Datos Oficiales UPME</p>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div>
                            <span className="text-muted-foreground">Pico/vivienda:</span>
                            <span className="ml-1 font-medium">{UPME_STRATUM_DATA[selectedProfile].officialData.avgPeakKw} kW</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Consumo mes:</span>
                            <span className="ml-1 font-medium">{UPME_STRATUM_DATA[selectedProfile].avgMonthlyKwh} kWh</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Usuarios/transfo:</span>
                            <span className="ml-1 font-medium">{UPME_STRATUM_DATA[selectedProfile].officialData.avgUsersPerTransfo}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Transfo tipico:</span>
                            <span className="ml-1 font-medium">{UPME_STRATUM_DATA[selectedProfile].officialData.typicalTransfoKva} kVA</span>
                          </div>
                        </div>
                        <a
                          href={UPME_STRATUM_DATA[selectedProfile].officialData.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mt-2"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {UPME_STRATUM_DATA[selectedProfile].officialData.source}
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {selectedSource === "zni" && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Region ZNI (IPSE)</Label>
                      <Select value={selectedZNI} onValueChange={handleZNIChange}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ZNI_REGIONAL_PROFILES).map(([key, profile]) => (
                            <SelectItem key={key} value={key}>{profile.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Official Data Display */}
                    {ZNI_REGIONAL_PROFILES[selectedZNI]?.officialData && (
                      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                        <p className="text-[10px] font-medium text-primary mb-2">Datos Oficiales IPSE</p>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div>
                            <span className="text-muted-foreground">Pico promedio:</span>
                            <span className="ml-1 font-medium">{ZNI_REGIONAL_PROFILES[selectedZNI].officialData.avgPeakKw} kW</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Rango:</span>
                            <span className="ml-1 font-medium">{ZNI_REGIONAL_PROFILES[selectedZNI].officialData.minPeakKw}-{ZNI_REGIONAL_PROFILES[selectedZNI].officialData.maxPeakKw} kW</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Energia/dia:</span>
                            <span className="ml-1 font-medium">{ZNI_REGIONAL_PROFILES[selectedZNI].officialData.avgDailyKwh} kWh</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Horas servicio:</span>
                            <span className="ml-1 font-medium">{ZNI_REGIONAL_PROFILES[selectedZNI].officialData.typicalHoursService}h</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Localidades ZNI:</span>
                            <span className="ml-1 font-medium">{ZNI_REGIONAL_PROFILES[selectedZNI].officialData.numLocalities}</span>
                          </div>
                        </div>
                        <a
                          href={ZNI_REGIONAL_PROFILES[selectedZNI].officialData.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mt-2"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {ZNI_REGIONAL_PROFILES[selectedZNI].officialData.source}
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {selectedSource === "operator" && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Operador de Red (XM/SIMEM)</Label>
                    <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(OPERATOR_PROFILES).map(([key, profile]) => (
                          <SelectItem key={key} value={key}>{profile.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Perfiles de demanda del Sistema Interconectado Nacional
                    </p>
                  </div>
                )}

                {/* Peak Demand Scale */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">
                      Demanda Pico: <span className="font-medium text-foreground">{peakDemandKw[0]} kW</span>
                    </Label>
                    {currentOfficialData && (
                      <Badge
                        variant={useOfficialPeak ? "default" : "outline"}
                        className="text-[10px] cursor-pointer"
                        onClick={() => {
                          setUseOfficialPeak(!useOfficialPeak)
                          if (!useOfficialPeak && selectedSource === "zni") {
                            const data = ZNI_REGIONAL_PROFILES[selectedZNI]?.officialData
                            if (data) setPeakDemandKw([data.avgPeakKw])
                          }
                        }}
                      >
                        {useOfficialPeak ? "Dato Oficial" : "Personalizado"}
                      </Badge>
                    )}
                  </div>
                  <Slider
                    value={peakDemandKw}
                    onValueChange={(val) => {
                      setPeakDemandKw(val)
                      setUseOfficialPeak(false)
                    }}
                    min={5}
                    max={1000}
                    step={5}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>5 kW</span>
                    {currentOfficialData && selectedSource === "zni" && (
                      <span className="text-primary">
                        Oficial: {(currentOfficialData as ZNIRegionData["officialData"]).avgPeakKw} kW (rango {(currentOfficialData as ZNIRegionData["officialData"]).minPeakKw}-{(currentOfficialData as ZNIRegionData["officialData"]).maxPeakKw})
                      </span>
                    )}
                    <span>1000 kW</span>
                  </div>
                </div>

                <Button onClick={handleGenerateColombianProfile} className="w-full">
                  Aplicar Perfil
                </Button>
              </CardContent>
            </Card>

            {/* Preview Pattern */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Vista Previa del Patron</CardTitle>
                <CardDescription className="text-xs">
                  Curva tipica de demanda horaria normalizada
                </CardDescription>
              </CardHeader>
              <CardContent>
                {previewPattern.length > 0 && (
                  <>
                    <div className="flex items-end gap-[2px] h-32 mb-4">
                      {previewPattern.map((factor, hour) => (
                        <div key={hour} className="flex flex-1 flex-col items-center gap-1">
                          <div
                            className="w-full bg-primary/70 rounded-t"
                            style={{ height: `${factor * 100}%` }}
                          />
                          {hour % 4 === 0 && (
                            <span className="text-[8px] text-muted-foreground">{hour}h</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded bg-muted p-2">
                        <span className="text-muted-foreground">Pico estimado:</span>
                        <span className="ml-1 font-medium">{peakDemandKw[0]} kW</span>
                      </div>
                      <div className="rounded bg-muted p-2">
                        <span className="text-muted-foreground">Energia diaria:</span>
                        <span className="ml-1 font-medium">~{Math.round(peakDemandKw[0] * 12)} kWh</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Upload Tab */}
        <TabsContent value="upload" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CSV Upload */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Cargar Archivo CSV
                </CardTitle>
                <CardDescription className="text-xs">
                  Suba un archivo CSV con datos de demanda horaria
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="rounded-lg border border-dashed border-border p-4 bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-3">
                    <strong>Formato esperado:</strong>
                  </p>
                  <pre className="text-[10px] bg-background p-2 rounded font-mono">
                    {`datetime,kW
2024-01-01 00:00,25.5
2024-01-01 01:00,22.3
...`}
                  </pre>
                </div>
                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="csv-upload"
                    className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border px-4 py-8 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                  >
                    <FileUp className="h-5 w-5 mr-2" />
                    {csvLoading ? "Procesando..." : "Haga clic para seleccionar CSV"}
                  </Label>
                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    className="sr-only"
                  />
                  {csvError && <p className="text-xs text-destructive">{csvError}</p>}
                </div>
              </CardContent>
            </Card>

            {/* PDF Extraction Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Extraccion de PDF
                </CardTitle>
                <CardDescription className="text-xs">
                  Usa el Asistente IA para extraer datos de boletines tecnicos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs text-foreground mb-3">
                    El Asistente IA puede ayudarte a:
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <Badge variant="outline" className="text-[10px] h-5">1</Badge>
                      Extraer tablas de impedancias de PDFs tecnicos
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge variant="outline" className="text-[10px] h-5">2</Badge>
                      Buscar perfiles de carga en documentos IPSE/UPME
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge variant="outline" className="text-[10px] h-5">3</Badge>
                      Generar perfiles sinteticos basados en caracteristicas de tu zona
                    </li>
                  </ul>
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => setActiveTab("ai")}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Ir al Asistente IA
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Assistant Tab */}
        <TabsContent value="ai" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Asistente IA para Perfiles de Carga
              </CardTitle>
              <CardDescription className="text-xs">
                Obtén ayuda para encontrar, generar o extraer perfiles de carga
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-border p-4">
                  <h4 className="font-medium text-sm mb-2">Busqueda de Perfiles</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    La IA puede buscar en la web perfiles de carga para tu zona o tipo de proyecto.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-[10px]">Comunidad rural Choco</Badge>
                    <Badge variant="secondary" className="text-[10px]">Escuela ZNI</Badge>
                    <Badge variant="secondary" className="text-[10px]">Centro de salud</Badge>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-4">
                  <h4 className="font-medium text-sm mb-2">Extraccion de Documentos</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Sube un PDF o describe el documento y la IA extraera los datos.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-[10px]">Boletin IPSE</Badge>
                    <Badge variant="secondary" className="text-[10px]">Estudio UPME</Badge>
                    <Badge variant="secondary" className="text-[10px]">Factura operador</Badge>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-4">
                  <h4 className="font-medium text-sm mb-2">Catalogos de Equipos</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Busca especificaciones de paneles solares, inversores y baterias.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-[10px]">Paneles Jinko</Badge>
                    <Badge variant="secondary" className="text-[10px]">Inversores SMA</Badge>
                    <Badge variant="secondary" className="text-[10px]">Baterias BYD</Badge>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-4">
                  <h4 className="font-medium text-sm mb-2">Generacion Sintetica</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Describe tu proyecto y genera un perfil de carga personalizado.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-[10px]">50 familias</Badge>
                    <Badge variant="secondary" className="text-[10px]">Clinica pequeña</Badge>
                    <Badge variant="secondary" className="text-[10px]">Escuela rural</Badge>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-xs text-foreground text-center">
                  Haz clic en el boton del asistente (bombilla) en la esquina inferior derecha para iniciar una conversacion
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Profile Visualization */}
      {hourlyAvg && loadProfile && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Perfil de Carga: {loadProfile.name}
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {loadProfile.source === "csv" ? "CSV" : loadProfile.source === "colombian" ? "Colombia" : "Sintetico"} | {loadProfile.data.length} horas
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <StatCard label="Demanda Pico" value={`${peakDemand.toFixed(1)} kW`} />
              <StatCard label="Demanda Promedio" value={`${avgDemand.toFixed(1)} kW`} />
              <StatCard label="Energia Diaria" value={`${dailyEnergy.toFixed(1)} kWh`} />
            </div>

            <p className="mb-2 text-xs font-medium text-muted-foreground">Perfil Horario Promedio (kW)</p>
            <div className="flex items-end gap-[2px] h-40">
              {hourlyAvg.map((h) => (
                <div key={h.hour} className="flex flex-1 flex-col items-center gap-1">
                  <div className="relative w-full">
                    {/* Max range */}
                    <div
                      className="absolute bottom-0 left-0 w-full bg-primary/20 rounded-t"
                      style={{ height: `${(h.max / peakDemand) * 130}px` }}
                    />
                    {/* Average */}
                    <div
                      className="relative w-full bg-primary rounded-t"
                      style={{ height: `${(h.avg / peakDemand) * 130}px` }}
                    />
                  </div>
                  {h.hour % 3 === 0 && (
                    <span className="text-[9px] text-muted-foreground">{h.hour}h</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Atras
        </Button>
        <Button onClick={onNext} disabled={!loadProfile}>
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
