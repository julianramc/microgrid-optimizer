import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || "AIzaSyC4xHtQgInsSN4ba1zVKOZS8n0ZG_fvyfY";
const ai = new GoogleGenAI({ apiKey });

// Definimos la estructura del JSON que el modelo debe devolver si va a inyectar parámetros.
// Obligamos al modelo a adherirse a este schema estructurado.
// La respuesta será parseada por el frontend para alimentar el Optimizador ICSA.
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    text_response: {
      type: Type.STRING,
      description: "Tu respuesta conversacional habitual en español, explicando el por qué de los parámetros, las fuentes (IPSE/UPME), etc."
    },
    has_parameters: {
      type: Type.BOOLEAN,
      description: "Debe ser true SOLO si en el texto estás recomendando parámetros técnicos específicos que el usuario puede inyectar a la app."
    },
    parameters_to_inject: {
      type: Type.OBJECT,
      description: "Los valores numéricos específicos que estás recomendando. Solo llena los que correspondan, ignora el resto.",
      properties: {
        // Parámetros ICSA
        numGDs: { type: Type.INTEGER, description: "Número de generadores FV a ubicar" },
        maxPvKw: { type: Type.INTEGER, description: "Tamaño máximo por generador FV en kW" },
        populationSize: { type: Type.INTEGER, description: "Población de cuervos ICSA" },
        maxIterations: { type: Type.INTEGER, description: "Iteraciones máximas ICSA" },

        // Económicos
        pvCostPerKw: { type: Type.INTEGER, description: "Costo de inversión PV en USD/kWp" },
        omCostPerKwh: { type: Type.NUMBER, description: "Costo de O&M PV en USD/kWh" },
        energyCost: { type: Type.NUMBER, description: "Costo de energía en USD/kWh" },

        // Perfiles (Bonus extra)
        hourly_demand_factors: {
          type: Type.ARRAY,
          items: { type: Type.NUMBER },
          description: "Un arreglo de (exactamente) 24 números (0 a 1) representando un perfil horario de consumo sintético que estimaste."
        }
      }
    }
  },
  required: ["text_response", "has_parameters"]
};

const systemInstruction = `Eres un "Agente Activo" experto en ingeniería eléctrica, especializado en Microredes, Zonas No Interconectadas (ZNI) en Colombia, y el algoritmo de optimización ICSA.
TIENES ACCESO A INTERNET mediante Google Search para buscar catálogos de paneles solares (Jinko, Trina, etc.), inversores, y regulaciones (IPSE, UPME, SIMEM de XM, CREG).

REGLAS DE ACTUACIÓN:
1. Siempre que sea relevante, USA TU CAPACIDAD DE BUSCAR EN INTERNET (Google Search) para dar precios actualizados, especificaciones técnicas de datasheets o validar información.
2. Si el usuario te pide un "perfil de demanda ZNI" o "perfil rural", y no hay datos, constrúyelo sintéticamente basado en documentos IPSE o similares y EXPLICA detalladamente de qué reporte o tesis (ej: U. La Salle) lo inferiste.
3. ESTRICTO: NO respondas con Markdown JSON. Tu respuesta DEBE ser un objeto JSON válido acorde al 'responseSchema'.
4. La propiedad 'text_response' debe contener la respuesta legible para el usuario.
5. Si encuentras parámetros útiles para configurar el Optimizador ICSA (ej. costo por kWp, tamaño de panel, O&M) o un perfil de demanda de 24 horas, pon 'has_parameters: true' e inyecta esos valores concretos en 'parameters_to_inject'.`;

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    if (!message && !history?.at(-1)?.file) {
      return NextResponse.json({ error: 'Message or file is required' }, { status: 400 });
    }

    // Construir el array de contenidos interactuando con el history
    const contents = [];

    for (const h of history || []) {
      const parts = [];

      if (h.role === 'user') {
        parts.push({ text: h.content || "Analiza el documento adjunto." });
        if (h.file?.inlineData) {
          parts.push({
            inlineData: {
              data: h.file.inlineData.data,
              mimeType: h.file.inlineData.mimeType
            }
          });
        }
      } else {
        let txt = h.content;
        try {
          const o = JSON.parse(txt);
          txt = o.text_response || txt;
        } catch (e) { }
        parts.push({ text: txt });
      }

      contents.push({ role: h.role, parts });
    }

    // Agregar el mensaje actual del usuario (ya viene parseado en el history si la app lo empuja antes, pero por seguridad lo manejamos)
    // Nota: El frontend actual de ai-assistant ya empuja el nuevo mensaje al history *antes* de enviarlo.
    // Así que contents ya tiene el { role: 'user', parts: [...] } más reciente.
    // Solo agregamos una instrucción estricta final en el sistema o simulamos el context.
    const finalContents = contents.length > 0 ? contents : [{ role: 'user', parts: [{ text: message }] }];

    // Realizar llamada con JSON Structured Outputs + Grounding + System Instructions
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: finalContents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        tools: [{ googleSearch: {} }], // Habilitar Grounding with Google Search!
      }
    });

    const responseText = response.text;

    // El frontend espera 'response' que ahora será un string JSON validado por el schema.
    return NextResponse.json({ response: responseText });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: 'Error generating response from Gemini API', details: error.message },
      { status: 500 }
    );
  }
}
