// ============================================================
// Application State Store (React Context)
// ============================================================

import type {
  ProjectState,
  WorkflowStep,
  SiteConfig,
  HourlyData,
  LoadProfile,
  PVParams,
  BatteryParams,
  InverterParams,
  DieselParams,
  FinancialParams,
  OptimizerConfig,
  DecisionBounds,
  OptimizationResult,
  ParetoPoint,
} from "./types"
import {
  DEFAULT_PV,
  DEFAULT_BATTERY_LION,
  DEFAULT_INVERTER,
  DEFAULT_DIESEL,
  DEFAULT_FINANCIAL,
  DEFAULT_OPTIMIZER,
  DEFAULT_BOUNDS,
} from "./defaults"

export const initialState: ProjectState = {
  step: "location",
  site: null,
  solarData: null,
  loadProfile: null,
  pvParams: DEFAULT_PV,
  batteryParams: DEFAULT_BATTERY_LION,
  inverterParams: DEFAULT_INVERTER,
  dieselParams: DEFAULT_DIESEL,
  financialParams: DEFAULT_FINANCIAL,
  optimizerConfig: DEFAULT_OPTIMIZER,
  bounds: DEFAULT_BOUNDS,
  result: null,
  isOptimizing: false,
  optimizationProgress: 0,
  selectedParetoPoint: null,
}

export type Action =
  | { type: "SET_STEP"; step: WorkflowStep }
  | { type: "SET_SITE"; site: SiteConfig }
  | { type: "SET_SOLAR_DATA"; data: HourlyData[] }
  | { type: "SET_LOAD_PROFILE"; profile: LoadProfile }
  | { type: "SET_PV_PARAMS"; params: PVParams }
  | { type: "SET_BATTERY_PARAMS"; params: BatteryParams }
  | { type: "SET_INVERTER_PARAMS"; params: InverterParams }
  | { type: "SET_DIESEL_PARAMS"; params: DieselParams }
  | { type: "SET_FINANCIAL_PARAMS"; params: FinancialParams }
  | { type: "SET_OPTIMIZER_CONFIG"; config: OptimizerConfig }
  | { type: "SET_BOUNDS"; bounds: DecisionBounds }
  | { type: "SET_OPTIMIZING"; isOptimizing: boolean; progress?: number }
  | { type: "SET_RESULT"; result: OptimizationResult }
  | { type: "SET_SELECTED_PARETO"; point: ParetoPoint | null }

export function reducer(state: ProjectState, action: Action): ProjectState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.step }
    case "SET_SITE":
      return { ...state, site: action.site }
    case "SET_SOLAR_DATA":
      return { ...state, solarData: action.data }
    case "SET_LOAD_PROFILE":
      return { ...state, loadProfile: action.profile }
    case "SET_PV_PARAMS":
      return { ...state, pvParams: action.params }
    case "SET_BATTERY_PARAMS":
      return { ...state, batteryParams: action.params }
    case "SET_INVERTER_PARAMS":
      return { ...state, inverterParams: action.params }
    case "SET_DIESEL_PARAMS":
      return { ...state, dieselParams: action.params }
    case "SET_FINANCIAL_PARAMS":
      return { ...state, financialParams: action.params }
    case "SET_OPTIMIZER_CONFIG":
      return { ...state, optimizerConfig: action.config }
    case "SET_BOUNDS":
      return { ...state, bounds: action.bounds }
    case "SET_OPTIMIZING":
      return {
        ...state,
        isOptimizing: action.isOptimizing,
        optimizationProgress: action.progress ?? state.optimizationProgress,
      }
    case "SET_RESULT":
      return { ...state, result: action.result, isOptimizing: false }
    case "SET_SELECTED_PARETO":
      return { ...state, selectedParetoPoint: action.point }
    default:
      return state
  }
}

export const STEPS: { key: WorkflowStep; label: string; description: string }[] = [
  { key: "location", label: "Ubicacion", description: "Seleccionar sitio en el mapa" },
  { key: "solar", label: "Recurso Solar", description: "Datos satelitales de irradiancia" },
  { key: "load", label: "Perfil de Carga", description: "Demanda horaria de energia" },
  { key: "parameters", label: "Parametros", description: "Tecnologia, costos y restricciones" },
  { key: "optimize", label: "ICSA", description: "Optimizacion con Improved Crow Search Algorithm" },
]
