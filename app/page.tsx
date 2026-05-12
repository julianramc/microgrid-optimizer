"use client"

import { useReducer, useCallback, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { StepNavigation } from "@/components/microgrid/step-navigation"
import { StepSolar } from "@/components/microgrid/step-solar"

const StepLocation = dynamic(() => import("@/components/microgrid/step-location").then(m => ({ default: m.StepLocation })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">Cargando mapa...</div>,
})
import { StepLoad } from "@/components/microgrid/step-load"
import { StepParameters } from "@/components/microgrid/step-parameters"
import { StepICSA } from "@/components/microgrid/step-icsa"
import { AIAssistant, AIAssistantButton } from "@/components/microgrid/ai-assistant"
import { initialState, reducer, STEPS } from "@/lib/microgrid/store"
import type { WorkflowStep, SiteConfig, HourlyData, LoadProfile } from "@/lib/microgrid/types"
import type { PVParams, BatteryParams, InverterParams, DieselParams, FinancialParams, OptimizerConfig, DecisionBounds } from "@/lib/microgrid/types"

export default function Page() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [showAI, setShowAI] = useState(false)
  const [showIntro, setShowIntro] = useState(true)

  const completedSteps = useMemo(() => {
    const completed = new Set<WorkflowStep>()
    if (state.site) completed.add("location")
    if (state.solarData) completed.add("solar")
    if (state.loadProfile) completed.add("load")
    // parameters always "complete" since they have defaults
    if (state.site && state.solarData && state.loadProfile) completed.add("parameters")
    if (state.result) {
      completed.add("optimize")
    }
    return completed
  }, [state.site, state.solarData, state.loadProfile, state.result])

  const goTo = useCallback((step: WorkflowStep) => dispatch({ type: "SET_STEP", step }), [])

  const stepIndex = STEPS.findIndex((s) => s.key === state.step)
  const nextStep = () => {
    if (stepIndex < STEPS.length - 1) goTo(STEPS[stepIndex + 1].key)
  }
  const prevStep = () => {
    if (stepIndex > 0) goTo(STEPS[stepIndex - 1].key)
  }

  // Handler para iniciar prueba IEEE directamente
  const handleStartIEEETest = useCallback((system: "33" | "69") => {
    // Configurar sitio como prueba IEEE
    dispatch({
      type: "SET_SITE",
      site: {
        lat: 4.711,
        lon: -74.072,
        name: `Prueba IEEE ${system} Nodos`,
        timezone: "America/Bogota",
        isIEEETest: true,
        ieeeSystem: system,
      }
    })
    // Ir directamente al paso de optimizacion ICSA
    goTo("optimize")
  }, [goTo])

  // Handler para aplicar parametros desde Gemini
  const handleApplyAIParameters = useCallback((params: any) => {
    if (params.numGDs !== undefined || params.maxPvKw !== undefined || params.populationSize !== undefined || params.maxIterations !== undefined) {
      dispatch({
        type: "SET_OPTIMIZER_CONFIG",
        config: {
          ...state.optimizerConfig,
          populationSize: params.populationSize !== undefined ? params.populationSize : state.optimizerConfig.populationSize,
          generations: params.maxIterations !== undefined ? params.maxIterations : state.optimizerConfig.generations,
        }
      });
      // Updating bounds (if relevant keys exist)
      dispatch({
        type: "SET_BOUNDS",
        bounds: {
          ...state.bounds,
          numPanelsMax: params.numGDs !== undefined ? params.numGDs * 10 : state.bounds.numPanelsMax, // Aproximacion temporal, asumiendo 1 gd = 10 panels
          inverterKwMax: params.maxPvKw !== undefined ? params.maxPvKw : state.bounds.inverterKwMax,
        }
      });
    }

    if (params.pvCostPerKw !== undefined) {
      dispatch({
        type: "SET_PV_PARAMS",
        params: {
          ...state.pvParams,
          costPerWatt: params.pvCostPerKw / 1000 // Convert from $/kW to $/W
        }
      });
    }

    if (params.hourly_demand_factors && Array.isArray(params.hourly_demand_factors) && params.hourly_demand_factors.length === 24) {
      dispatch({
        type: "SET_LOAD_PROFILE",
        profile: {
          name: "Perfil Generado por IA",
          source: "synthetic",
          data: params.hourly_demand_factors.map((kw: number, i: number) => ({ hour: i, kw }))
        }
      });
    }
  }, [state.optimizerConfig, state.bounds, state.pvParams]);

  if (showIntro) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black overflow-hidden">
        <video
          src="/crow_halo.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        <div className="relative z-10 flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
          <div className="flex flex-col items-center">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-primary via-primary/80 to-teal-800 drop-shadow-[0_0_15px_rgba(45,212,191,0.5)]">
              MicroGrid
            </h1>
            <p className="text-xl md:text-2xl font-light tracking-widest text-muted-foreground mt-2 uppercase">
              Optimizer
            </p>
          </div>
          <p className="text-sm text-center max-w-md text-slate-300 font-light px-4">
            Optimización algorítmica de redes de distribución para Zonas No Interconectadas usando Improved Crow Search Algorithm.
          </p>
          <Button
            size="lg"
            className="mt-8 px-12 py-6 text-lg rounded-full shadow-[0_0_20px_rgba(45,212,191,0.3)] hover:shadow-[0_0_30px_rgba(45,212,191,0.6)] transition-all"
            onClick={() => setShowIntro(false)}
          >
            Iniciar Simulador
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 1L14 5V11L8 15L2 11V5L8 1Z" fill="currentColor" className="text-primary-foreground" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground tracking-tight">MicroGrid Optimizer</h1>
              <p className="text-[10px] text-muted-foreground">ZNI Colombia | ICSA (Improved Crow Search Algorithm)</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            {state.site && (
              <span className="rounded bg-muted px-2 py-1 font-mono">
                {state.site.name} ({state.site.lat.toFixed(2)}, {state.site.lon.toFixed(2)})
              </span>
            )}
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4">
          <StepNavigation
            currentStep={state.step}
            onStepClick={goTo}
            completedSteps={completedSteps}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        {state.step === "location" && (
          <StepLocation
            site={state.site}
            onSiteSelect={(site: SiteConfig) => dispatch({ type: "SET_SITE", site })}
            onNext={nextStep}
            onStartIEEETest={handleStartIEEETest}
          />
        )}

        {state.step === "solar" && state.site && (
          <StepSolar
            site={state.site}
            solarData={state.solarData}
            onDataFetched={(data: HourlyData[]) => dispatch({ type: "SET_SOLAR_DATA", data })}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {state.step === "load" && (
          <StepLoad
            site={state.site}
            loadProfile={state.loadProfile}
            solarData={state.solarData}
            onLoadSet={(profile: LoadProfile) => dispatch({ type: "SET_LOAD_PROFILE", profile })}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {state.step === "parameters" && (
          <StepParameters
            pvParams={state.pvParams}
            batteryParams={state.batteryParams}
            inverterParams={state.inverterParams}
            dieselParams={state.dieselParams}
            financialParams={state.financialParams}
            optimizerConfig={state.optimizerConfig}
            bounds={state.bounds}
            onPvChange={(p: PVParams) => dispatch({ type: "SET_PV_PARAMS", params: p })}
            onBatteryChange={(p: BatteryParams) => dispatch({ type: "SET_BATTERY_PARAMS", params: p })}
            onInverterChange={(p: InverterParams) => dispatch({ type: "SET_INVERTER_PARAMS", params: p })}
            onDieselChange={(p: DieselParams) => dispatch({ type: "SET_DIESEL_PARAMS", params: p })}
            onFinancialChange={(p: FinancialParams) => dispatch({ type: "SET_FINANCIAL_PARAMS", params: p })}
            onOptimizerChange={(p: OptimizerConfig) => dispatch({ type: "SET_OPTIMIZER_CONFIG", config: p })}
            onBoundsChange={(p: DecisionBounds) => dispatch({ type: "SET_BOUNDS", bounds: p })}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {state.step === "optimize" && (
          <StepICSA
            onBack={prevStep}
            isIEEETest={state.site?.isIEEETest}
            ieeeSystem={state.site?.ieeeSystem}
            globalLoadProfile={state.loadProfile}
            globalOptimizerConfig={state.optimizerConfig}
            globalBounds={state.bounds}
            globalEconomics={state.financialParams}
          />
        )}

        {/* Fallback for missing data */}
        {state.step === "solar" && !state.site && (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm text-muted-foreground">Primero seleccione una ubicacion en el mapa.</p>
            <button onClick={() => goTo("location")} className="mt-4 text-sm text-primary underline">
              Ir a Ubicacion
            </button>
          </div>
        )}

        {state.step === "optimize" && !state.site?.isIEEETest && (!state.solarData || !state.loadProfile) && (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm text-muted-foreground">Complete los pasos anteriores primero.</p>
            <button onClick={() => goTo("location")} className="mt-4 text-sm text-primary underline">
              Ir al inicio
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4">
        <div className="mx-auto max-w-7xl px-4">
          <p className="text-center text-[10px] text-muted-foreground">
            MicroGrid Optimizer v2.0 | ICSA (Improved Crow Search Algorithm) | Datos: NASA POWER, IPSE, UPME
          </p>
        </div>
      </footer>

      {/* AI Assistant */}
      <AIAssistantButton onClick={() => setShowAI(true)} />
      <AIAssistant
        isOpen={showAI}
        onClose={() => setShowAI(false)}
        initialContext={state.site ? `Estoy trabajando en un proyecto para ${state.site.name || "una ubicacion"} en las coordenadas (${state.site.lat.toFixed(2)}, ${state.site.lon.toFixed(2)}). Ayudame con la optimizacion de mi microrred.` : undefined}
        onApplyParameters={handleApplyAIParameters}
      />
    </div>
  )
}
