import { GoogleGenAI, Type } from '@google/genai';

const apiKey = "AIzaSyC4xHtQgInsSN4ba1zVKOZS8n0ZG_fvyfY";
const ai = new GoogleGenAI({ apiKey });

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        text_response: { type: Type.STRING },
        has_parameters: { type: Type.BOOLEAN },
    },
    required: ["text_response", "has_parameters"]
};

async function test() {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: [{ role: 'user', parts: [{ text: 'Hola' }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                tools: [{ googleSearch: {} }],
            }
        });
        console.log("SUCCESS");
        console.log(response.text);
    } catch (e: any) {
        console.error("ERROR MESSAGE:", e.message);
    }
}

test();
