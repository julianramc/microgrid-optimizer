"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Sparkles, ChevronDown, ExternalLink, Settings2, DollarSign, Cpu, Loader2 } from "lucide-react"
import type {
  PVParams,
  BatteryParams,
  InverterParams,
  DieselParams,
  FinancialParams,
  OptimizerConfig,
  DecisionBounds,
} from "@/lib/microgrid/types"

// Parametros economicos del algoritmo MATLAB (lineas 135-143)
const MATLAB_ECONOMIC_PARAMS = {
  C_kWh: 0.1390,      // USD/kWh Costo de energia
  C_pv: 1036.49,      // USD/kWp Costo de inversion PV
  C_OM: 0.0019,       // USD/kWh Costo O&M PV
  t_a: 0.10,          // 10% Tasa de interes
  t_e: 0.02,          // 2% Inflacion energia
  N_t: 20,            // Anos horizonte de planeacion
  T: 365,             // Dias del ano
  dh: 1,              // Delta h (1 hora)
}

// Parametros ICSA del algoritmo MATLAB (lineas 147-160)
const MATLAB_ICSA_PARAMS = {
  num_GDs: 3,           // Numero de generadores distribuidos
  N: 100,               // Poblacion de cuervos
  max_iter: 2000,       // Iteraciones maximas
  fl: 2.0,              // Flight length
  node_min: 2,          // Nodo minimo
  size_min: 0,          // Tamano minimo kW
  size_max: 2400,       // Tamano maximo kW
  dispatch_min: 0,      // Despacho minimo
  dispatch_max: 1,      // Despacho maximo
}

interface StepParametersProps {
  pvParams: PVParams
  batteryParams: BatteryParams
  inverterParams: InverterParams
  dieselParams: DieselParams
  financialParams: FinancialParams
  optimizerConfig: OptimizerConfig
  bounds: DecisionBounds
  onPvChange: (p: PVParams) => void
  onBatteryChange: (p: BatteryParams) => void
  onInverterChange: (p: InverterParams) => void
  onDieselChange: (p: DieselParams) => void
  onFinancialChange: (p: FinancialParams) => void
  onOptimizerChange: (p: OptimizerConfig) => void
  onBoundsChange: (p: DecisionBounds) => void
  onNext: () => void
  onBack: () => void
}

function NumField({
  label,
  value,
  onChange,
  unit,
  step = "any",
  min,
  max,
  disabled,
  highlight,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  unit?: string
  step?: string
  min?: number
  max?: number
  disabled?: boolean
  highlight?: boolean
}) {
  return (
    <div>
      <Label className={`text-[11px] ${highlight ? "text-primary font-medium" : "text-muted-foreground"}`}>
        {label} {unit && <span className="font-mono opacity-60">({unit})</span>}
      </Label>
      <Input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={`mt-1 h-8 font-mono text-xs ${highlight ? "border-primary/50 bg-primary/5" : ""}`}
        disabled={disabled}
      />
    </div>
  )
}

export function StepParameters({
  pvParams,
  batteryParams,
  inverterParams,
  dieselParams,
  financialParams,
  optimizerConfig,
  bounds,
  onPvChange,
  onBatteryChange,
  onInverterChange,
  onDieselChange,
  onFinancialChange,
  onOptimizerChange,
  onBoundsChange,
  onNext,
  onBack,
}: StepParametersProps) {
  const [activeTab, setActiveTab] = useState("icsa")
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<{ source: string; url: string } | null>(null)
  const [showMatlabRef, setShowMatlabRef] = useState(true)

  const updatePv = (key: keyof PVParams, val: number) =>
    onPvChange({ ...pvParams, [key]: val })
  const updateFin = (key: keyof FinancialParams, val: number) =>
    onFinancialChange({ ...financialParams, [key]: val })
  const updateOpt = (key: keyof OptimizerConfig, val: number | string) =>
    onOptimizerChange({ ...optimizerConfig, [key]: val })
  const updateBounds = (key: keyof DecisionBounds, val: number) =>
    onBoundsChange({ ...bounds, [key]: val })

  // Aplicar parametros MATLAB por defecto
  const applyMatlabDefaults = () => {
    onFinancialChange({
      ...financialParams,
      discountRate: MATLAB_ECONOMIC_PARAMS.t_a,
      inflationRate: MATLAB_ECONOMIC_PARAMS.t_e,
      horizonYears: MATLAB_ECONOMIC_PARAMS.N_t,
    })
    onPvChange({
      ...pvParams,
      costPerWatt: MATLAB_ECONOMIC_PARAMS.C_pv / 1000, // USD/kWp a USD/W
    })
    onOptimizerChange({
      ...optimizerConfig,
      populationSize: MATLAB_ICSA_PARAMS.N,
      generations: MATLAB_ICSA_PARAMS.max_iter,
    })
    onBoundsChange({
      ...bounds,
      numPanelsMax: Math.ceil(MATLAB_ICSA_PARAMS.size_max / 0.4), // Asumiendo paneles de 400W
    })
  }

  // Buscar parametros con IA
  const searchWithAI = async () => {
    setIsLoadingAI(true)
    // Simular busqueda - en produccion esto llamaria al endpoint de IA
    await new Promise(resolve => setTimeout(resolve, 2000))
    setAiSuggestions({
      source: "Catalogo Jinko Solar 2024",
      url: "https://www.jinkosolar.com/uploads/JKM-535-550M-72HL4-V-F1-EN.pdf"
    })
    setIsLoadingAI(false)
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="icsa" className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Config. ICSA
          </TabsTrigger>
          <TabsTrigger value="economic" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Economicos
          </TabsTrigger>
          <TabsTrigger value="equipment" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Equipos
          </TabsTrigger>
        </TabsList>

        {/* ICSA Configuration Tab */}
        <TabsContent value="icsa" className="mt-4 space-y-4">
          {/* MATLAB Reference */}
          <Collapsible open={showMatlabRef} onOpenChange={setShowMatlabRef}>
            <Card className="border-primary/30">
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Badge variant="default" className="text-[10px]">MATLAB</Badge>
                      Parametros de Referencia del Algoritmo
                    </CardTitle>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showMatlabRef ? "rotate-180" : ""}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono bg-muted/30 rounded-lg p-3">
                    <div>
                      <span className="text-muted-foreground">num_GDs:</span>
                      <span className="ml-2 text-primary font-bold">{MATLAB_ICSA_PARAMS.num_GDs}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">N:</span>
                      <span className="ml-2 text-primary font-bold">{MATLAB_ICSA_PARAMS.N}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">max_iter:</span>
                      <span className="ml-2 text-primary font-bold">{MATLAB_ICSA_PARAMS.max_iter}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">fl:</span>
                      <span className="ml-2 text-primary font-bold">{MATLAB_ICSA_PARAMS.fl}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">size_max:</span>
                      <span className="ml-2 text-primary font-bold">{MATLAB_ICSA_PARAMS.size_max} kW</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">C_pv:</span>
                      <span className="ml-2 text-primary font-bold">${MATLAB_ECONOMIC_PARAMS.C_pv}/kWp</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">t_a:</span>
                      <span className="ml-2 text-primary font-bold">{MATLAB_ECONOMIC_PARAMS.t_a * 100}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">N_t:</span>
                      <span className="ml-2 text-primary font-bold">{MATLAB_ECONOMIC_PARAMS.N_t} años</span>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3 w-full"
                    onClick={applyMatlabDefaults}
                  >
                    Aplicar Valores MATLAB por Defecto
                  </Button>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* ICSA Parameters */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Configuracion ICSA (Improved Crow Search Algorithm)</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <NumField 
                  label="Poblacion (N)" 
                  value={optimizerConfig.populationSize} 
                  onChange={(v) => updateOpt("populationSize", v)} 
                  step="10"
                  highlight
                />
                <NumField 
                  label="Iteraciones" 
                  value={optimizerConfig.generations} 
                  onChange={(v) => updateOpt("generations", v)} 
                  step="100"
                  highlight
                />
                <NumField 
                  label="Num. GDs" 
                  value={3} 
                  onChange={() => {}} 
                  step="1"
                  disabled
                />
                <NumField 
                  label="Flight Length (fl)" 
                  value={MATLAB_ICSA_PARAMS.fl} 
                  onChange={() => {}} 
                  step="0.1"
                  disabled
                />
                <NumField 
                  label="Semilla" 
                  value={optimizerConfig.seed} 
                  onChange={(v) => updateOpt("seed", v)} 
                  step="1" 
                />
                <div>
                  <Label className="text-[11px] text-muted-foreground">Tolerancia PF</Label>
                  <Input
                    type="text"
                    value="1e-10"
                    disabled
                    className="mt-1 h-8 font-mono text-xs bg-muted/50"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Decision Bounds */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Limites de Variables de Decision</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <NumField 
                  label="Nodo Min" 
                  value={MATLAB_ICSA_PARAMS.node_min} 
                  onChange={() => {}} 
                  disabled 
                />
                <NumField 
                  label="Tamano Max GD" 
                  value={MATLAB_ICSA_PARAMS.size_max} 
                  onChange={() => {}} 
                  unit="kW"
                  disabled 
                />
                <NumField 
                  label="Despacho Min" 
                  value={MATLAB_ICSA_PARAMS.dispatch_min} 
                  onChange={() => {}} 
                  unit="0-1"
                  disabled 
                />
                <NumField 
                  label="Despacho Max" 
                  value={MATLAB_ICSA_PARAMS.dispatch_max} 
                  onChange={() => {}} 
                  unit="0-1"
                  disabled 
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Economic Parameters Tab */}
        <TabsContent value="economic" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Financial Parameters from MATLAB */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Parametros Financieros</CardTitle>
                  <Badge variant="outline" className="text-[10px]">MATLAB Ref</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <NumField 
                  label="Tasa de Interes (t_a)" 
                  value={financialParams.discountRate} 
                  onChange={(v) => updateFin("discountRate", v)} 
                  unit="0-1" 
                  step="0.01"
                  highlight
                />
                <NumField 
                  label="Inflacion Energia (t_e)" 
                  value={financialParams.inflationRate} 
                  onChange={(v) => updateFin("inflationRate", v)} 
                  unit="0-1" 
                  step="0.01"
                  highlight
                />
                <NumField 
                  label="Horizonte (N_t)" 
                  value={financialParams.horizonYears} 
                  onChange={(v) => updateFin("horizonYears", v)} 
                  unit="años" 
                  step="1"
                  highlight
                />
                <NumField 
                  label="Dias/Año (T)" 
                  value={365} 
                  onChange={() => {}} 
                  disabled
                />
              </CardContent>
            </Card>

            {/* Energy Costs */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Costos de Energia</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <NumField 
                  label="Costo Energia (C_kWh)" 
                  value={MATLAB_ECONOMIC_PARAMS.C_kWh} 
                  onChange={() => {}} 
                  unit="USD/kWh"
                  disabled
                />
                <NumField 
                  label="Costo PV (C_pv)" 
                  value={MATLAB_ECONOMIC_PARAMS.C_pv} 
                  onChange={() => {}} 
                  unit="USD/kWp"
                  disabled
                />
                <NumField 
                  label="O&M PV (C_OM)" 
                  value={MATLAB_ECONOMIC_PARAMS.C_OM} 
                  onChange={() => {}} 
                  unit="USD/kWh"
                  disabled
                />
                <div className="col-span-2">
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Estos valores provienen del algoritmo MATLAB (lineas 135-143) y son usados 
                    en la funcion de fitness economica.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Equipment Parameters Tab */}
        <TabsContent value="equipment" className="mt-4 space-y-4">
          {/* AI Assistant for Equipment */}
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Asistente IA para Parametros de Equipos
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                La IA puede buscar en la web catalogos de paneles solares, inversores y baterias 
                para llenar automaticamente estos parametros basados en tu perfil de carga.
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={searchWithAI}
                  disabled={isLoadingAI}
                >
                  {isLoadingAI ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Buscando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Buscar Paneles Solares
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  disabled={isLoadingAI}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Buscar Inversores
                </Button>
              </div>
              {aiSuggestions && (
                <div className="rounded-lg bg-background p-3 border">
                  <p className="text-xs font-medium">Fuente encontrada:</p>
                  <a 
                    href={aiSuggestions.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {aiSuggestions.source}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* PV Parameters */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Panel Fotovoltaico</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <NumField label="Potencia STC" value={pvParams.panelPowerSTC} onChange={(v) => updatePv("panelPowerSTC", v)} unit="W" step="10" />
                <NumField label="Eficiencia" value={pvParams.efficiency} onChange={(v) => updatePv("efficiency", v)} unit="0-1" step="0.01" />
                <NumField label="NOCT" value={pvParams.NOCT} onChange={(v) => updatePv("NOCT", v)} unit="C" />
                <NumField label="Coef. Temp." value={pvParams.tempCoeff} onChange={(v) => updatePv("tempCoeff", v)} unit="%/C" step="0.01" />
                <NumField label="Perdidas" value={pvParams.losses} onChange={(v) => updatePv("losses", v)} unit="0-1" step="0.01" />
                <NumField label="Costo" value={pvParams.costPerWatt} onChange={(v) => updatePv("costPerWatt", v)} unit="$/W" step="0.01" />
              </CardContent>
            </Card>

            {/* System Parameters */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Parametros del Sistema</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <NumField 
                  label="Sbase" 
                  value={100000} 
                  onChange={() => {}} 
                  unit="kVA"
                  disabled
                />
                <NumField 
                  label="Vbase" 
                  value={12.66} 
                  onChange={() => {}} 
                  unit="kV"
                  disabled
                />
                <NumField 
                  label="Max Iter PF" 
                  value={400} 
                  onChange={() => {}} 
                  disabled
                />
                <NumField 
                  label="Delta h" 
                  value={1} 
                  onChange={() => {}} 
                  unit="hora"
                  disabled
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>Atras</Button>
        <Button onClick={onNext}>Siguiente: Optimizar con ICSA</Button>
      </div>
    </div>
  )
}
