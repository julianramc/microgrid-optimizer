import {
  convertToModelMessages,
  streamText,
  UIMessage,
  tool,
} from 'ai'
import { z } from 'zod'
import { IEEE_33_NODE, IEEE_69_NODE } from '@/lib/microgrid/ieee-test-cases'
import { ZNI_REGIONAL_PROFILES, UPME_STRATUM_DATA, OPERATOR_PROFILES } from '@/lib/microgrid/colombian-data'

export const maxDuration = 60

// Contexto del sistema para el asistente
const SYSTEM_PROMPT = `Eres un asistente experto en optimización de microrredes y sistemas de distribución eléctrica para Colombia, especialmente para Zonas No Interconectadas (ZNI).

Tu conocimiento incluye:
1. **Algoritmo ICSA (Improved Crow Search Algorithm)**: Optimización metaheurística para ubicación y dimensionamiento de generación solar FV.
2. **Casos de prueba IEEE**: Redes de 33 y 69 nodos para simulación de redes de distribución radiales.
3. **Fuentes de datos colombianas**: IPSE, UPME, XM/SIMEM para perfiles de carga y caracterización.
4. **Perfiles de carga**: ZNI rural, urbano, industrial, por estratos y por operador de red.
5. **Parámetros económicos**: Costos de energía, inversión PV, O&M, tasas de descuento para Colombia.

Capacidades especiales:
- Puedes extraer información de documentos PDF sobre especificaciones técnicas de equipos.
- Puedes buscar catálogos de paneles solares, inversores y baterías.
- Puedes ayudar a configurar perfiles de carga personalizados.
- Puedes explicar los resultados de optimización y sugerir mejoras.

Contexto de datos disponibles:
- IEEE 33 Nodos: ${IEEE_33_NODE.loads.reduce((s, l) => s + l[1], 0).toFixed(0)} kW de demanda total
- IEEE 69 Nodos: ${IEEE_69_NODE.loads.reduce((s, l) => s + l[1], 0).toFixed(0)} kW de demanda total
- Perfiles ZNI: ${Object.keys(ZNI_REGIONAL_PROFILES).join(', ')}
- Perfiles Urbanos: ${Object.keys(OPERATOR_PROFILES).join(', ')}
- Sectores UPME: ${Object.keys(UPME_STRATUM_DATA).join(', ')}

Responde siempre en español. Sé técnico pero claro. Usa unidades del SI.`

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  const result = streamText({
    model: 'google/gemini-2.5-flash-preview-05-20',
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    abortSignal: req.signal,
    tools: {
      searchPanelCatalog: tool({
        description: 'Busca información sobre paneles solares disponibles en el mercado colombiano',
        inputSchema: z.object({
          potenciaMinKw: z.number().nullable().describe('Potencia mínima en kW'),
          tecnologia: z.string().nullable().describe('Tipo de tecnología: monocristalino, policristalino, bifacial'),
          marca: z.string().nullable().describe('Marca específica del panel'),
        }),
        execute: async ({ potenciaMinKw, tecnologia, marca }) => {
          // Catálogo simulado de paneles populares en Colombia
          const panels = [
            { marca: 'JA Solar', modelo: 'JAM72S30-550/MR', potencia: 550, tecnologia: 'Monocristalino PERC', eficiencia: 21.3, precio: 0.22 },
            { marca: 'LONGi', modelo: 'Hi-MO 5', potencia: 545, tecnologia: 'Monocristalino PERC', eficiencia: 21.1, precio: 0.23 },
            { marca: 'Canadian Solar', modelo: 'HiKu7', potencia: 670, tecnologia: 'Bifacial', eficiencia: 21.8, precio: 0.25 },
            { marca: 'Trina Solar', modelo: 'Vertex S+', potencia: 505, tecnologia: 'Monocristalino', eficiencia: 21.5, precio: 0.21 },
            { marca: 'Jinko Solar', modelo: 'Tiger Neo', potencia: 580, tecnologia: 'N-Type TOPCon', eficiencia: 22.3, precio: 0.24 },
          ]
          
          let filtered = panels
          if (potenciaMinKw && potenciaMinKw > 0) {
            filtered = filtered.filter(p => p.potencia / 1000 >= potenciaMinKw)
          }
          if (tecnologia) {
            filtered = filtered.filter(p => p.tecnologia.toLowerCase().includes(tecnologia.toLowerCase()))
          }
          if (marca) {
            filtered = filtered.filter(p => p.marca.toLowerCase().includes(marca.toLowerCase()))
          }
          
          return { panels: filtered, totalEncontrados: filtered.length }
        },
      }),
      
      searchInverterCatalog: tool({
        description: 'Busca información sobre inversores solares disponibles',
        inputSchema: z.object({
          potenciaMinKw: z.number().nullable().describe('Potencia mínima en kW'),
          tipo: z.string().nullable().describe('Tipo: string, microinversor, híbrido'),
          marca: z.string().nullable().describe('Marca específica'),
        }),
        execute: async ({ potenciaMinKw, tipo, marca }) => {
          const inverters = [
            { marca: 'Fronius', modelo: 'Symo 20.0-3-M', potencia: 20, tipo: 'String trifásico', eficiencia: 98.1, precio: 2500 },
            { marca: 'SMA', modelo: 'Sunny Tripower 25000TL', potencia: 25, tipo: 'String trifásico', eficiencia: 98.4, precio: 3200 },
            { marca: 'Huawei', modelo: 'SUN2000-36KTL', potencia: 36, tipo: 'String trifásico', eficiencia: 98.6, precio: 2800 },
            { marca: 'Growatt', modelo: 'MOD 10KTL3-X', potencia: 10, tipo: 'String trifásico', eficiencia: 98.0, precio: 1200 },
            { marca: 'Victron', modelo: 'MultiPlus-II 5000', potencia: 5, tipo: 'Híbrido', eficiencia: 96.0, precio: 2000 },
          ]
          
          let filtered = inverters
          if (potenciaMinKw && potenciaMinKw > 0) {
            filtered = filtered.filter(i => i.potencia >= potenciaMinKw)
          }
          if (tipo) {
            filtered = filtered.filter(i => i.tipo.toLowerCase().includes(tipo.toLowerCase()))
          }
          if (marca) {
            filtered = filtered.filter(i => i.marca.toLowerCase().includes(marca.toLowerCase()))
          }
          
          return { inverters: filtered, totalEncontrados: filtered.length }
        },
      }),
      
      getNetworkInfo: tool({
        description: 'Obtiene información detallada sobre las redes de prueba IEEE disponibles',
        inputSchema: z.object({
          network: z.enum(['ieee33', 'ieee69']).describe('Red de prueba a consultar'),
        }),
        execute: async ({ network }) => {
          const net = network === 'ieee33' ? IEEE_33_NODE : IEEE_69_NODE
          const totalP = net.loads.reduce((s, l) => s + l[1], 0)
          const totalQ = net.loads.reduce((s, l) => s + l[2], 0)
          const maxLoad = Math.max(...net.loads.map(l => l[1]))
          const maxLoadNode = net.loads.find(l => l[1] === maxLoad)?.[0]
          
          return {
            nombre: `IEEE ${net.nNodes} Nodos`,
            nodos: net.nNodes,
            lineas: net.lines.length,
            demandaActivaTotal: `${totalP.toFixed(1)} kW`,
            demandaReactivaTotal: `${totalQ.toFixed(1)} kVAr`,
            nodoMayorCarga: maxLoadNode,
            cargaMaxima: `${maxLoad.toFixed(1)} kW`,
            voltajeBase: `${net.Vbase_kV} kV`,
            potenciaBase: `${(net.Sbase_kVA / 1000).toFixed(0)} MVA`,
          }
        },
      }),
      
      getLoadProfile: tool({
        description: 'Obtiene un perfil de carga específico para análisis',
        inputSchema: z.object({
          tipo: z.enum(['amazonas', 'choco', 'guainia', 'vichada', 'sanAndres', 'narino', 'cauca', 'guajira', 'epm', 'enel', 'celsia'])
            .describe('Tipo de perfil de carga'),
        }),
        execute: async ({ tipo }) => {
          let profile = null
          
          if (tipo in ZNI_REGIONAL_PROFILES) {
            profile = ZNI_REGIONAL_PROFILES[tipo as keyof typeof ZNI_REGIONAL_PROFILES]
          } else if (tipo in OPERATOR_PROFILES) {
            profile = OPERATOR_PROFILES[tipo as keyof typeof OPERATOR_PROFILES]
          }
          
          if (!profile) {
            return { error: 'Perfil no encontrado' }
          }
          
          const maxDemand = Math.max(...profile.demandFactors)
          const avgDemand = profile.demandFactors.reduce((a: number, b: number) => a + b, 0) / 24
          const peakHour = profile.demandFactors.indexOf(maxDemand)
          const maxSolar = Math.max(...profile.solarFactors)
          const solarPeakHour = profile.solarFactors.indexOf(maxSolar)
          
          return {
            nombre: profile.name,
            horaPico: peakHour,
            factorPico: maxDemand.toFixed(3),
            factorPromedio: avgDemand.toFixed(3),
            horaPicoSolar: solarPeakHour,
            factorPicoSolar: maxSolar.toFixed(3),
            perfilDemanda: profile.demandFactors.map((f: number, h: number) => ({ hora: h, factor: f.toFixed(3) })),
          }
        },
      }),
      
      calculateEconomics: tool({
        description: 'Calcula parámetros económicos para un sistema FV',
        inputSchema: z.object({
          potenciaPvKw: z.number().describe('Potencia instalada del sistema FV en kW'),
          costoKwh: z.number().nullable().describe('Costo de la energía en USD/kWh (default: 0.139)'),
          horasSolPico: z.number().nullable().describe('Horas sol pico diarias (default: 4.5)'),
          horizonte: z.number().nullable().describe('Años de horizonte (default: 20)'),
        }),
        execute: async ({ potenciaPvKw, costoKwh, horasSolPico, horizonte }) => {
          const cKwh = costoKwh ?? 0.139
          const hsp = horasSolPico ?? 4.5
          const years = horizonte ?? 20
          const pvCostPerKw = 1036.49
          const omCostPerKwh = 0.0019
          const discountRate = 0.10
          
          const dailyProduction = potenciaPvKw * hsp
          const annualProduction = dailyProduction * 365
          const totalInvestment = potenciaPvKw * pvCostPerKw
          
          // Factor de recuperación de capital
          const crf = (discountRate * Math.pow(1 + discountRate, years)) / 
                      (Math.pow(1 + discountRate, years) - 1)
          const annualizedCapex = totalInvestment * crf
          const annualOm = annualProduction * omCostPerKwh
          const annualSavings = annualProduction * cKwh
          const netAnnualSaving = annualSavings - annualizedCapex - annualOm
          const simplePayback = totalInvestment / (annualSavings - annualOm)
          
          // LCOE
          let npvProduction = 0
          for (let t = 1; t <= years; t++) {
            npvProduction += annualProduction / Math.pow(1 + discountRate, t)
          }
          const lcoe = totalInvestment / npvProduction
          
          return {
            potenciaInstalada: `${potenciaPvKw} kW`,
            produccionDiaria: `${dailyProduction.toFixed(1)} kWh/día`,
            produccionAnual: `${annualProduction.toFixed(0)} kWh/año`,
            inversionTotal: `$${totalInvestment.toFixed(0)} USD`,
            costoAnualizadoCapex: `$${annualizedCapex.toFixed(0)} USD/año`,
            costoAnualOyM: `$${annualOm.toFixed(0)} USD/año`,
            ahorroAnualBruto: `$${annualSavings.toFixed(0)} USD/año`,
            ahorroAnualNeto: `$${netAnnualSaving.toFixed(0)} USD/año`,
            paybackSimple: `${simplePayback.toFixed(1)} años`,
            lcoe: `$${(lcoe * 100).toFixed(2)} centavos/kWh`,
          }
        },
      }),
    },
  })

  return result.toUIMessageStreamResponse()
}
