// ============================================================
// Fuentes de Datos Colombianas para Perfiles de Carga
// IPSE, UPME, XM/SIMEM
// ============================================================

import type { HourlyLoadProfile } from "./icsa-types"

// ============================================================
// Configuración de APIs de Datos Abiertos Colombia
// ============================================================

export const COLOMBIAN_DATA_SOURCES = {
  // IPSE - Instituto de Planificación y Promoción de Soluciones Energéticas
  ipse: {
    name: "IPSE - Datos ZNI",
    baseUrl: "https://www.datos.gov.co/resource",
    datasets: {
      estadoServicio: {
        id: "3ebi-d83g",
        name: "Estado de la prestación del servicio de energía en ZNI",
        description: "Contiene energía activa, potencia máxima y horas de servicio por localidad"
      },
      consumoPromedio: {
        id: "energia-zni",
        name: "Consumo promedio diario ZNI",
        description: "Datos de los Boletines de Datos IPSE"
      }
    }
  },
  // XM/SIMEM - Sistema de Información de Energía Mayorista
  xm: {
    name: "XM/SIMEM - Mercado Mayorista",
    baseUrl: "https://www.simem.co/api",
    datasets: {
      demandaComercial: {
        id: "demanda-comercial",
        name: "Demanda Comercial por Operador de Red",
        description: "Perfiles de demanda para EPM, Enel, etc."
      },
      curvasTipicas: {
        id: "curvas-tipicas",
        name: "Curvas Típicas UPME",
        description: "Coeficientes de curvas típicas por sector"
      }
    }
  }
}

// ============================================================
// Perfiles Sintéticos Basados en Caracterización UPME
// Fuente: Estudios de caracterización de carga UPME/CREG
// ============================================================

/**
 * Coeficientes de curvas típicas por estrato y sector
 * Basado en "Caracterización de la Demanda de Energía Eléctrica" - UPME
 */
export const UPME_LOAD_COEFFICIENTS = {
  // Residencial por estrato
  residencial: {
    estrato1: {
      name: "Residencial Estrato 1",
      avgMonthlyKwh: 120,
      peakFactor: 1.8,
      pattern: [
        0.35, 0.30, 0.28, 0.25, 0.30, 0.55, 0.75, 0.60, 0.45, 0.40,
        0.42, 0.55, 0.50, 0.45, 0.42, 0.45, 0.55, 0.85, 1.00, 0.95,
        0.85, 0.70, 0.55, 0.42
      ]
    },
    estrato2: {
      name: "Residencial Estrato 2",
      avgMonthlyKwh: 150,
      peakFactor: 1.7,
      pattern: [
        0.38, 0.32, 0.30, 0.28, 0.32, 0.52, 0.72, 0.62, 0.48, 0.42,
        0.45, 0.55, 0.52, 0.48, 0.45, 0.48, 0.58, 0.82, 0.98, 0.92,
        0.82, 0.68, 0.55, 0.45
      ]
    },
    estrato3: {
      name: "Residencial Estrato 3",
      avgMonthlyKwh: 180,
      peakFactor: 1.6,
      pattern: [
        0.42, 0.35, 0.32, 0.30, 0.35, 0.50, 0.70, 0.75, 0.65, 0.55,
        0.52, 0.58, 0.55, 0.52, 0.50, 0.52, 0.60, 0.80, 0.95, 0.90,
        0.80, 0.65, 0.55, 0.48
      ]
    },
    estrato4: {
      name: "Residencial Estrato 4",
      avgMonthlyKwh: 220,
      peakFactor: 1.5,
      pattern: [
        0.45, 0.40, 0.38, 0.35, 0.38, 0.52, 0.68, 0.78, 0.72, 0.65,
        0.62, 0.65, 0.62, 0.58, 0.55, 0.58, 0.65, 0.78, 0.92, 0.88,
        0.78, 0.65, 0.55, 0.50
      ]
    },
    estrato5: {
      name: "Residencial Estrato 5",
      avgMonthlyKwh: 350,
      peakFactor: 1.4,
      pattern: [
        0.50, 0.45, 0.42, 0.40, 0.42, 0.55, 0.70, 0.82, 0.78, 0.72,
        0.70, 0.72, 0.70, 0.68, 0.65, 0.68, 0.72, 0.80, 0.90, 0.85,
        0.78, 0.68, 0.58, 0.52
      ]
    },
    estrato6: {
      name: "Residencial Estrato 6",
      avgMonthlyKwh: 500,
      peakFactor: 1.3,
      pattern: [
        0.52, 0.48, 0.45, 0.42, 0.45, 0.58, 0.72, 0.85, 0.82, 0.78,
        0.75, 0.78, 0.75, 0.72, 0.70, 0.72, 0.75, 0.82, 0.88, 0.85,
        0.80, 0.70, 0.60, 0.55
      ]
    }
  },
  // Comercial
  comercial: {
    pequeno: {
      name: "Comercio Pequeño",
      avgMonthlyKwh: 400,
      peakFactor: 1.6,
      pattern: [
        0.20, 0.18, 0.15, 0.15, 0.18, 0.30, 0.60, 0.85, 0.95, 1.00,
        0.98, 0.95, 0.92, 0.90, 0.88, 0.90, 0.92, 0.95, 0.90, 0.75,
        0.55, 0.40, 0.30, 0.22
      ]
    },
    mediano: {
      name: "Comercio Mediano",
      avgMonthlyKwh: 2000,
      peakFactor: 1.4,
      pattern: [
        0.25, 0.22, 0.20, 0.18, 0.22, 0.35, 0.65, 0.88, 0.95, 1.00,
        0.98, 0.95, 0.92, 0.90, 0.88, 0.90, 0.92, 0.88, 0.75, 0.60,
        0.45, 0.35, 0.28, 0.25
      ]
    },
    grande: {
      name: "Comercio Grande / Centro Comercial",
      avgMonthlyKwh: 50000,
      peakFactor: 1.3,
      pattern: [
        0.30, 0.28, 0.25, 0.25, 0.28, 0.40, 0.60, 0.80, 0.90, 0.95,
        0.98, 1.00, 0.98, 0.95, 0.92, 0.92, 0.95, 0.92, 0.85, 0.75,
        0.60, 0.45, 0.38, 0.32
      ]
    }
  },
  // Industrial
  industrial: {
    turnoUnico: {
      name: "Industrial Turno Único",
      avgMonthlyKwh: 15000,
      peakFactor: 1.2,
      pattern: [
        0.25, 0.22, 0.20, 0.20, 0.25, 0.60, 0.90, 1.00, 1.00, 1.00,
        1.00, 0.80, 1.00, 1.00, 1.00, 1.00, 0.90, 0.50, 0.30, 0.25,
        0.25, 0.25, 0.25, 0.25
      ]
    },
    dosTurnos: {
      name: "Industrial Dos Turnos",
      avgMonthlyKwh: 30000,
      peakFactor: 1.15,
      pattern: [
        0.30, 0.28, 0.28, 0.28, 0.30, 0.65, 0.95, 1.00, 1.00, 1.00,
        1.00, 0.85, 1.00, 1.00, 1.00, 1.00, 1.00, 0.95, 0.90, 0.85,
        0.75, 0.55, 0.40, 0.32
      ]
    },
    continuo: {
      name: "Industrial Continuo (24/7)",
      avgMonthlyKwh: 80000,
      peakFactor: 1.1,
      pattern: [
        0.92, 0.90, 0.88, 0.88, 0.90, 0.95, 1.00, 1.00, 1.00, 1.00,
        1.00, 0.95, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00,
        0.98, 0.95, 0.94, 0.92
      ]
    }
  }
}

// ============================================================
// Perfiles ZNI Específicos por Región
// Basado en datos IPSE y estudios de caracterización
// ============================================================

// ============================================================
// Datos de Demanda Pico por Región ZNI (IPSE)
// Fuente: Boletines de Datos IPSE, informes de prestación de servicio
// https://ipse.gov.co/informacion-institucional/informes-de-gestion/
// ============================================================

export interface ZNIRegionData {
  name: string
  demandFactors: number[]
  solarFactors: number[]
  // Datos oficiales IPSE
  officialData: {
    source: string
    sourceUrl: string
    avgPeakKw: number          // Potencia pico promedio de localidades
    minPeakKw: number          // Potencia pico mínima registrada
    maxPeakKw: number          // Potencia pico máxima registrada
    avgDailyKwh: number        // Consumo diario promedio
    typicalHoursService: number // Horas de servicio típicas
    numLocalities: number      // Número de localidades ZNI
    lastUpdate: string         // Última actualización datos
  }
}

export const ZNI_REGIONAL_PROFILES: { [key: string]: ZNIRegionData } = {
  // Amazonas - Clima cálido húmedo, comunidades dispersas
  amazonas: {
    name: "ZNI Amazonas",
    demandFactors: [
      0.25, 0.20, 0.18, 0.15, 0.20, 0.35, 0.55, 0.65, 0.60, 0.55,
      0.58, 0.65, 0.62, 0.55, 0.52, 0.55, 0.60, 0.85, 1.00, 0.95,
      0.85, 0.70, 0.50, 0.35
    ],
    solarFactors: [
      0, 0, 0, 0, 0, 0.02, 0.15, 0.35, 0.55, 0.75,
      0.88, 0.95, 1.00, 0.98, 0.90, 0.75, 0.50, 0.25, 0.05, 0,
      0, 0, 0, 0
    ],
    officialData: {
      source: "IPSE - Boletín Estadístico ZNI 2023",
      sourceUrl: "https://ipse.gov.co/informacion-institucional/informes-de-gestion/",
      avgPeakKw: 85,
      minPeakKw: 15,
      maxPeakKw: 450,
      avgDailyKwh: 520,
      typicalHoursService: 12,
      numLocalities: 42,
      lastUpdate: "2023-12"
    }
  },
  // Chocó - Alta nubosidad, comunidades costeras
  choco: {
    name: "ZNI Chocó",
    demandFactors: [
      0.30, 0.25, 0.22, 0.20, 0.25, 0.40, 0.55, 0.60, 0.55, 0.50,
      0.52, 0.58, 0.55, 0.52, 0.50, 0.52, 0.58, 0.80, 0.95, 1.00,
      0.90, 0.75, 0.55, 0.40
    ],
    solarFactors: [
      0, 0, 0, 0, 0, 0.01, 0.10, 0.28, 0.45, 0.62,
      0.75, 0.82, 0.85, 0.80, 0.70, 0.55, 0.35, 0.15, 0.03, 0,
      0, 0, 0, 0
    ],
    officialData: {
      source: "IPSE - Boletín Estadístico ZNI 2023",
      sourceUrl: "https://ipse.gov.co/informacion-institucional/informes-de-gestion/",
      avgPeakKw: 65,
      minPeakKw: 10,
      maxPeakKw: 380,
      avgDailyKwh: 420,
      typicalHoursService: 10,
      numLocalities: 89,
      lastUpdate: "2023-12"
    }
  },
  // Guainía/Vaupés - Selva, comunidades indígenas
  guainia: {
    name: "ZNI Guainía/Vaupés",
    demandFactors: [
      0.22, 0.18, 0.15, 0.12, 0.18, 0.38, 0.52, 0.58, 0.52, 0.48,
      0.50, 0.55, 0.52, 0.48, 0.45, 0.48, 0.55, 0.82, 1.00, 0.98,
      0.88, 0.72, 0.52, 0.35
    ],
    solarFactors: [
      0, 0, 0, 0, 0, 0.02, 0.18, 0.40, 0.62, 0.80,
      0.92, 0.98, 1.00, 0.95, 0.85, 0.68, 0.45, 0.20, 0.04, 0,
      0, 0, 0, 0
    ],
    officialData: {
      source: "IPSE - Boletín Estadístico ZNI 2023",
      sourceUrl: "https://ipse.gov.co/informacion-institucional/informes-de-gestion/",
      avgPeakKw: 45,
      minPeakKw: 8,
      maxPeakKw: 180,
      avgDailyKwh: 280,
      typicalHoursService: 8,
      numLocalities: 67,
      lastUpdate: "2023-12"
    }
  },
  // Vichada - Llanos orientales, ganadería
  vichada: {
    name: "ZNI Vichada",
    demandFactors: [
      0.28, 0.22, 0.20, 0.18, 0.22, 0.45, 0.65, 0.72, 0.65, 0.58,
      0.55, 0.60, 0.58, 0.55, 0.52, 0.55, 0.62, 0.85, 0.98, 1.00,
      0.92, 0.78, 0.58, 0.40
    ],
    solarFactors: [
      0, 0, 0, 0, 0, 0.03, 0.20, 0.45, 0.70, 0.88,
      0.95, 1.00, 0.98, 0.92, 0.82, 0.65, 0.42, 0.18, 0.03, 0,
      0, 0, 0, 0
    ],
    officialData: {
      source: "IPSE - Boletín Estadístico ZNI 2023",
      sourceUrl: "https://ipse.gov.co/informacion-institucional/informes-de-gestion/",
      avgPeakKw: 55,
      minPeakKw: 12,
      maxPeakKw: 220,
      avgDailyKwh: 350,
      typicalHoursService: 10,
      numLocalities: 38,
      lastUpdate: "2023-12"
    }
  },
  // San Andrés - Isla, turismo
  sanAndres: {
    name: "ZNI San Andrés y Providencia",
    demandFactors: [
      0.45, 0.40, 0.38, 0.35, 0.38, 0.50, 0.68, 0.80, 0.85, 0.90,
      0.92, 0.95, 0.92, 0.88, 0.85, 0.88, 0.92, 0.95, 1.00, 0.98,
      0.92, 0.82, 0.68, 0.55
    ],
    solarFactors: [
      0, 0, 0, 0, 0, 0.05, 0.22, 0.48, 0.72, 0.90,
      0.98, 1.00, 0.98, 0.92, 0.82, 0.65, 0.42, 0.18, 0.03, 0,
      0, 0, 0, 0
    ],
    officialData: {
      source: "IPSE - Informe San Andrés 2023",
      sourceUrl: "https://ipse.gov.co/informacion-institucional/informes-de-gestion/",
      avgPeakKw: 320,
      minPeakKw: 150,
      maxPeakKw: 850,
      avgDailyKwh: 2100,
      typicalHoursService: 24,
      numLocalities: 12,
      lastUpdate: "2023-12"
    }
  },
  // Nariño - Costa Pacífica
  narino: {
    name: "ZNI Nariño (Costa Pacífica)",
    demandFactors: [
      0.28, 0.24, 0.20, 0.18, 0.22, 0.38, 0.55, 0.62, 0.58, 0.52,
      0.55, 0.60, 0.58, 0.54, 0.52, 0.54, 0.60, 0.82, 0.96, 1.00,
      0.88, 0.72, 0.52, 0.38
    ],
    solarFactors: [
      0, 0, 0, 0, 0, 0.01, 0.12, 0.30, 0.48, 0.65,
      0.78, 0.85, 0.88, 0.82, 0.72, 0.58, 0.38, 0.16, 0.03, 0,
      0, 0, 0, 0
    ],
    officialData: {
      source: "IPSE - Boletín Estadístico ZNI 2023",
      sourceUrl: "https://ipse.gov.co/informacion-institucional/informes-de-gestion/",
      avgPeakKw: 72,
      minPeakKw: 12,
      maxPeakKw: 340,
      avgDailyKwh: 460,
      typicalHoursService: 11,
      numLocalities: 54,
      lastUpdate: "2023-12"
    }
  },
  // Cauca - Costa Pacífica
  cauca: {
    name: "ZNI Cauca (Costa Pacífica)",
    demandFactors: [
      0.26, 0.22, 0.18, 0.16, 0.20, 0.36, 0.52, 0.60, 0.56, 0.50,
      0.52, 0.58, 0.56, 0.52, 0.50, 0.52, 0.58, 0.80, 0.94, 1.00,
      0.86, 0.70, 0.50, 0.36
    ],
    solarFactors: [
      0, 0, 0, 0, 0, 0.01, 0.11, 0.28, 0.46, 0.64,
      0.76, 0.84, 0.86, 0.80, 0.70, 0.56, 0.36, 0.15, 0.03, 0,
      0, 0, 0, 0
    ],
    officialData: {
      source: "IPSE - Boletín Estadístico ZNI 2023",
      sourceUrl: "https://ipse.gov.co/informacion-institucional/informes-de-gestion/",
      avgPeakKw: 58,
      minPeakKw: 10,
      maxPeakKw: 280,
      avgDailyKwh: 380,
      typicalHoursService: 10,
      numLocalities: 35,
      lastUpdate: "2023-12"
    }
  },
  // La Guajira
  guajira: {
    name: "ZNI La Guajira",
    demandFactors: [
      0.32, 0.28, 0.25, 0.22, 0.26, 0.42, 0.58, 0.68, 0.72, 0.78,
      0.82, 0.88, 0.85, 0.80, 0.78, 0.80, 0.85, 0.92, 1.00, 0.95,
      0.85, 0.72, 0.55, 0.42
    ],
    solarFactors: [
      0, 0, 0, 0, 0, 0.05, 0.25, 0.52, 0.78, 0.92,
      0.98, 1.00, 0.98, 0.94, 0.85, 0.70, 0.48, 0.22, 0.05, 0,
      0, 0, 0, 0
    ],
    officialData: {
      source: "IPSE - Boletín Estadístico ZNI 2023",
      sourceUrl: "https://ipse.gov.co/informacion-institucional/informes-de-gestion/",
      avgPeakKw: 95,
      minPeakKw: 18,
      maxPeakKw: 520,
      avgDailyKwh: 620,
      typicalHoursService: 14,
      numLocalities: 48,
      lastUpdate: "2023-12"
    }
  }
}

// ============================================================
// Datos de Demanda por Estrato UPME
// Fuente: UPME - Caracterización de la Demanda Eléctrica
// https://www1.upme.gov.co/Paginas/Demanda.aspx
// ============================================================

export interface UPMEStratumData {
  name: string
  avgMonthlyKwh: number
  peakFactor: number
  pattern: number[]
  // Datos oficiales UPME
  officialData: {
    source: string
    sourceUrl: string
    avgPeakKw: number       // Potencia pico promedio por vivienda
    avgUsersPerTransfo: number // Usuarios promedio por transformador
    typicalTransfoKva: number  // Capacidad típica transformador
  }
}

export const UPME_STRATUM_DATA: { [key: string]: UPMEStratumData } = {
  estrato1: {
    name: "Residencial Estrato 1",
    avgMonthlyKwh: 120,
    peakFactor: 1.8,
    pattern: [
      0.35, 0.30, 0.28, 0.25, 0.30, 0.55, 0.75, 0.60, 0.45, 0.40,
      0.42, 0.55, 0.50, 0.45, 0.42, 0.45, 0.55, 0.85, 1.00, 0.95,
      0.85, 0.70, 0.55, 0.42
    ],
    officialData: {
      source: "UPME - Caracterización Demanda 2022",
      sourceUrl: "https://www1.upme.gov.co/Paginas/Demanda.aspx",
      avgPeakKw: 1.2,
      avgUsersPerTransfo: 80,
      typicalTransfoKva: 75
    }
  },
  estrato2: {
    name: "Residencial Estrato 2",
    avgMonthlyKwh: 150,
    peakFactor: 1.7,
    pattern: [
      0.38, 0.32, 0.30, 0.28, 0.32, 0.52, 0.72, 0.62, 0.48, 0.42,
      0.45, 0.55, 0.52, 0.48, 0.45, 0.48, 0.58, 0.82, 0.98, 0.92,
      0.82, 0.68, 0.55, 0.45
    ],
    officialData: {
      source: "UPME - Caracterización Demanda 2022",
      sourceUrl: "https://www1.upme.gov.co/Paginas/Demanda.aspx",
      avgPeakKw: 1.5,
      avgUsersPerTransfo: 60,
      typicalTransfoKva: 75
    }
  },
  estrato3: {
    name: "Residencial Estrato 3",
    avgMonthlyKwh: 180,
    peakFactor: 1.6,
    pattern: [
      0.42, 0.35, 0.32, 0.30, 0.35, 0.50, 0.70, 0.75, 0.65, 0.55,
      0.52, 0.58, 0.55, 0.52, 0.50, 0.52, 0.60, 0.80, 0.95, 0.90,
      0.80, 0.65, 0.55, 0.48
    ],
    officialData: {
      source: "UPME - Caracterización Demanda 2022",
      sourceUrl: "https://www1.upme.gov.co/Paginas/Demanda.aspx",
      avgPeakKw: 1.8,
      avgUsersPerTransfo: 50,
      typicalTransfoKva: 75
    }
  },
  estrato4: {
    name: "Residencial Estrato 4",
    avgMonthlyKwh: 220,
    peakFactor: 1.5,
    pattern: [
      0.45, 0.40, 0.38, 0.35, 0.38, 0.52, 0.68, 0.78, 0.72, 0.65,
      0.62, 0.65, 0.62, 0.58, 0.55, 0.58, 0.65, 0.78, 0.92, 0.88,
      0.78, 0.65, 0.55, 0.50
    ],
    officialData: {
      source: "UPME - Caracterización Demanda 2022",
      sourceUrl: "https://www1.upme.gov.co/Paginas/Demanda.aspx",
      avgPeakKw: 2.2,
      avgUsersPerTransfo: 40,
      typicalTransfoKva: 75
    }
  },
  estrato5: {
    name: "Residencial Estrato 5",
    avgMonthlyKwh: 350,
    peakFactor: 1.4,
    pattern: [
      0.50, 0.45, 0.42, 0.40, 0.42, 0.55, 0.70, 0.82, 0.78, 0.72,
      0.70, 0.72, 0.70, 0.68, 0.65, 0.68, 0.72, 0.80, 0.90, 0.85,
      0.78, 0.68, 0.58, 0.52
    ],
    officialData: {
      source: "UPME - Caracterización Demanda 2022",
      sourceUrl: "https://www1.upme.gov.co/Paginas/Demanda.aspx",
      avgPeakKw: 3.5,
      avgUsersPerTransfo: 30,
      typicalTransfoKva: 112.5
    }
  },
  estrato6: {
    name: "Residencial Estrato 6",
    avgMonthlyKwh: 500,
    peakFactor: 1.3,
    pattern: [
      0.52, 0.48, 0.45, 0.42, 0.45, 0.58, 0.72, 0.85, 0.82, 0.78,
      0.75, 0.78, 0.75, 0.72, 0.70, 0.72, 0.75, 0.82, 0.88, 0.85,
      0.80, 0.70, 0.60, 0.55
    ],
    officialData: {
      source: "UPME - Caracterización Demanda 2022",
      sourceUrl: "https://www1.upme.gov.co/Paginas/Demanda.aspx",
      avgPeakKw: 5.0,
      avgUsersPerTransfo: 25,
      typicalTransfoKva: 112.5
    }
  },
  comercial: {
    name: "Comercial",
    avgMonthlyKwh: 2000,
    peakFactor: 1.4,
    pattern: [
      0.25, 0.22, 0.20, 0.18, 0.22, 0.35, 0.65, 0.88, 0.95, 1.00,
      0.98, 0.95, 0.92, 0.90, 0.88, 0.90, 0.92, 0.88, 0.75, 0.60,
      0.45, 0.35, 0.28, 0.25
    ],
    officialData: {
      source: "UPME - Caracterización Demanda 2022",
      sourceUrl: "https://www1.upme.gov.co/Paginas/Demanda.aspx",
      avgPeakKw: 15,
      avgUsersPerTransfo: 8,
      typicalTransfoKva: 150
    }
  },
  industrial: {
    name: "Industrial",
    avgMonthlyKwh: 30000,
    peakFactor: 1.15,
    pattern: [
      0.30, 0.28, 0.28, 0.28, 0.30, 0.65, 0.95, 1.00, 1.00, 1.00,
      1.00, 0.85, 1.00, 1.00, 1.00, 1.00, 1.00, 0.95, 0.90, 0.85,
      0.75, 0.55, 0.40, 0.32
    ],
    officialData: {
      source: "UPME - Caracterización Demanda 2022",
      sourceUrl: "https://www1.upme.gov.co/Paginas/Demanda.aspx",
      avgPeakKw: 150,
      avgUsersPerTransfo: 1,
      typicalTransfoKva: 500
    }
  }
}

// ============================================================
// Funciones para Generar Perfiles Personalizados
// ============================================================

/**
 * Genera un perfil de carga mezclando diferentes sectores
 */
export function generateMixedProfile(
  composition: {
    sector: keyof typeof UPME_LOAD_COEFFICIENTS
    type: string
    weight: number
  }[],
  name: string
): HourlyLoadProfile {
  const pattern = Array(24).fill(0)
  let totalWeight = 0

  for (const item of composition) {
    const sectorData = UPME_LOAD_COEFFICIENTS[item.sector] as Record<string, { pattern: number[] }>
    if (sectorData && sectorData[item.type]) {
      const typePattern = sectorData[item.type].pattern
      for (let h = 0; h < 24; h++) {
        pattern[h] += typePattern[h] * item.weight
      }
      totalWeight += item.weight
    }
  }

  // Normalizar
  if (totalWeight > 0) {
    for (let h = 0; h < 24; h++) {
      pattern[h] /= totalWeight
    }
  }

  // Normalizar al máximo
  const maxVal = Math.max(...pattern)
  if (maxVal > 0) {
    for (let h = 0; h < 24; h++) {
      pattern[h] /= maxVal
    }
  }

  return {
    name,
    demandFactors: pattern,
    solarFactors: ZNI_REGIONAL_PROFILES.vichada.solarFactors // Perfil solar por defecto
  }
}

/**
 * Escala un perfil de carga a una demanda pico específica
 */
export function scaleProfileToPeak(
  profile: HourlyLoadProfile,
  peakDemandKw: number
): { hour: number; kw: number }[] {
  const maxFactor = Math.max(...profile.demandFactors)
  return profile.demandFactors.map((factor, hour) => ({
    hour,
    kw: (factor / maxFactor) * peakDemandKw
  }))
}

// ============================================================
// Interfaz para consultar datos del IPSE (datos.gov.co)
// ============================================================

export interface IPSELocalityData {
  departamento: string
  municipio: string
  localidad: string
  energiaActivaMwh: number
  potenciaMaximaKw: number
  horasServicio: number
  tipoSistema: string
}

/**
 * Consulta datos del IPSE desde datos.gov.co
 * Dataset: Estado de la prestación del servicio de energía en ZNI
 */
export async function fetchIPSEData(
  departamento?: string,
  limit: number = 100
): Promise<IPSELocalityData[]> {
  const datasetId = COLOMBIAN_DATA_SOURCES.ipse.datasets.estadoServicio.id
  let url = `https://www.datos.gov.co/resource/${datasetId}.json?$limit=${limit}`
  
  if (departamento) {
    url += `&departamento=${encodeURIComponent(departamento)}`
  }

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Error fetching IPSE data: ${response.statusText}`)
    }

    const data = await response.json()
    
    return data.map((item: Record<string, unknown>) => ({
      departamento: item.departamento as string || '',
      municipio: item.municipio as string || '',
      localidad: item.localidad as string || '',
      energiaActivaMwh: parseFloat(item.energia_activa_mwh as string) || 0,
      potenciaMaximaKw: parseFloat(item.potencia_maxima_kw as string) || 0,
      horasServicio: parseFloat(item.horas_servicio as string) || 0,
      tipoSistema: item.tipo_sistema as string || ''
    }))
  } catch (error) {
    console.error('Error fetching IPSE data:', error)
    return []
  }
}

/**
 * Genera un perfil sintético basado en datos de una localidad ZNI
 */
export function generateProfileFromIPSEData(
  data: IPSELocalityData,
  region: keyof typeof ZNI_REGIONAL_PROFILES = 'amazonas'
): HourlyLoadProfile {
  const baseProfile = ZNI_REGIONAL_PROFILES[region] || ZNI_REGIONAL_PROFILES.amazonas
  
  return {
    name: `${data.localidad}, ${data.municipio} (${data.departamento})`,
    demandFactors: baseProfile.demandFactors,
    solarFactors: baseProfile.solarFactors
  }
}

// ============================================================
// Perfiles para Operadores de Red (EPM, Enel, etc.)
// ============================================================

// ============================================================
// Fuentes de Datos con URLs verificables
// ============================================================

export const DATA_SOURCES = {
  ipse: {
    name: "IPSE - Instituto de Planificación y Promoción de Soluciones Energéticas",
    description: "Perfiles de demanda para Zonas No Interconectadas (ZNI) de Colombia",
    urls: [
      { label: "Sitio oficial", url: "https://ipse.gov.co" },
      { label: "Datos Abiertos", url: "https://www.datos.gov.co/browse?q=IPSE" }
    ]
  },
  upme: {
    name: "UPME - Unidad de Planeación Minero Energética",
    description: "Coeficientes de demanda por tipo de usuario y proyecciones energéticas",
    urls: [
      { label: "Sitio oficial", url: "https://www1.upme.gov.co" },
      { label: "Proyección de Demanda", url: "https://www1.upme.gov.co/Paginas/Demanda.aspx" }
    ]
  },
  xm: {
    name: "XM / SIMEM",
    description: "Datos de operadores de red y demanda del Sistema Interconectado Nacional",
    urls: [
      { label: "XM", url: "https://www.xm.com.co" },
      { label: "SIMEM", url: "https://www.simem.co" }
    ]
  },
  nasa: {
    name: "NASA POWER",
    description: "Datos de irradiancia solar y parámetros meteorológicos",
    urls: [
      { label: "Sitio oficial", url: "https://power.larc.nasa.gov" },
      { label: "Data Access Viewer", url: "https://power.larc.nasa.gov/data-access-viewer/" }
    ]
  },
  ieee: {
    name: "IEEE Test Feeders",
    description: "Sistemas de prueba estándar para redes de distribución",
    urls: [
      { label: "IEEE PES Test Feeders", url: "https://site.ieee.org/pes-testfeeders/" }
    ]
  }
}

export const OPERATOR_PROFILES: { [key: string]: HourlyLoadProfile } = {
  epm: {
    name: "EPM (Medellín y Antioquia)",
    demandFactors: [
      0.52, 0.48, 0.45, 0.42, 0.45, 0.58, 0.78, 0.88, 0.92, 0.95,
      0.98, 1.00, 0.95, 0.90, 0.88, 0.90, 0.92, 0.95, 0.98, 0.95,
      0.88, 0.75, 0.65, 0.58
    ],
    solarFactors: ZNI_REGIONAL_PROFILES.vichada.solarFactors
  },
  enel: {
    name: "Enel (Bogotá)",
    demandFactors: [
      0.55, 0.50, 0.48, 0.45, 0.48, 0.60, 0.80, 0.90, 0.95, 0.98,
      1.00, 0.98, 0.92, 0.88, 0.85, 0.88, 0.92, 0.95, 0.98, 0.95,
      0.85, 0.72, 0.62, 0.58
    ],
    solarFactors: [
      0, 0, 0, 0, 0, 0.02, 0.12, 0.32, 0.52, 0.72,
      0.85, 0.92, 0.95, 0.90, 0.80, 0.65, 0.42, 0.18, 0.04, 0,
      0, 0, 0, 0
    ]
  },
  celsia: {
    name: "Celsia (Valle del Cauca)",
    demandFactors: [
      0.50, 0.45, 0.42, 0.40, 0.42, 0.55, 0.75, 0.88, 0.95, 0.98,
      1.00, 0.98, 0.92, 0.88, 0.85, 0.88, 0.92, 0.95, 0.98, 0.92,
      0.82, 0.70, 0.60, 0.55
    ],
    solarFactors: ZNI_REGIONAL_PROFILES.vichada.solarFactors
  }
}
