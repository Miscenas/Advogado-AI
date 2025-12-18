import { GoogleGenAI, Type } from "@google/genai";
import { PetitionFormData, PetitionFilingMetadata, PetitionParty } from "../types";

// Helper seguro para obter a chave do ambiente conforme as diretrizes
const getApiKey = (): string => {
  try {
    // A chave deve vir exclusivamente de process.env.API_KEY
    const key = process.env.API_KEY;
    if (!key) return "";
    return key;
  } catch (e) {
    return "";
  }
};

// Added hasAiKey to verify if API_KEY is available in the environment
export const hasAiKey = (): boolean => {
  return !!getApiKey();
};

const SHIELD_PROTOCOL = `
PROTOCOLO DE BLINDAGEM E EXCELÊNCIA JURÍDICA:
1. Você é um ADVOGADO SÊNIOR BRASILEIRO com mais de 20 anos de prática jurídica.
2. Identidade: Rigorosa, técnica, polida e estratégica.
3. Fundamentação: Utilize CPC/2015 para cível e CLT para trabalhista.
4. Estrutura: Endereçamento, Preâmbulo, Fatos, Direito e Pedidos.
`;

const runGenAI = async (callback: (ai: GoogleGenAI) => Promise<any>): Promise<any> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("API_KEY_MISSING: A variável de ambiente API_KEY não foi configurada no servidor/deploy.");
    }
    const ai = new GoogleGenAI({ apiKey });
    try {
        return await callback(ai);
    } catch (error: any) {
        console.error("Gemini API Error:", error);
        const msg = error.message || "";
        if (msg.includes('429') || msg.includes('Quota')) {
            throw new Error("LIMITE_EXCEDIDO: A cota da API foi atingida. Tente novamente em instantes.");
        }
        if (msg.includes('API key not valid') || msg.includes('403')) {
            throw new Error("CHAVE_INVALIDA: A chave de API configurada no ambiente é inválida.");
        }
        throw error;
    }
};

export const extractDataFromDocument = async (base64Data: string, mimeType: string): Promise<{
  docType: string;
  summary: string;
  extractedData: Partial<PetitionFormData> & { cnjClass?: string, cnjSubject?: string };
}> => {
  return await runGenAI(async (ai) => {
      const prompt = `Analise este documento jurídico. Extraia dados cadastrais e IDENTIFIQUE a classificação processual (CNJ).
      Retorne APENAS JSON: { 
        "docType": string, 
        "summary": string, 
        "extractedData": { 
          "area": string, "actionType": string, "jurisdiction": string, "cnjClass": string, "cnjSubject": string,
          "plaintiffs": [{"name": string, "type": "pf"|"pj", "doc": string}], 
          "defendants": [{"name": string, "type": "pf"|"pj", "doc": string}], 
          "facts": string, "value": string 
        } 
      }`;
      
      const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: { parts: [{ inlineData: { mimeType, data: base64Data } }, { text: prompt }] },
          config: { 
            responseMimeType: "application/json",
            systemInstruction: "Você é um perito em análise processual e tabelas unificadas do CNJ."
          }
      });
      
      const text = response.text || "{}";
      try {
          return JSON.parse(text);
      } catch (e) {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) return JSON.parse(jsonMatch[0]);
          throw new Error("A IA retornou um formato inválido. Tente novamente.");
      }
  });
};

export const generateLegalPetition = async (data: PetitionFormData): Promise<string> => {
    return await runGenAI(async (ai) => {
        const prompt = `REDIJA UMA PETIÇÃO INICIAL SÊNIOR. AREA: ${data.area}. DADOS: ${JSON.stringify(data)}`;
        const response = await ai.models.generateContent({ 
            model: 'gemini-3-pro-preview', 
            contents: prompt,
            config: { systemInstruction: SHIELD_PROTOCOL }
        });
        return response.text || "";
    });
};

export const generateLegalDefense = async (data: PetitionFormData): Promise<string> => {
    return await runGenAI(async (ai) => {
        const prompt = `REDIJA UMA CONTESTAÇÃO TÉCNICA. DADOS: ${JSON.stringify(data)}`;
        const response = await ai.models.generateContent({ 
            model: 'gemini-3-pro-preview', 
            contents: prompt,
            config: { systemInstruction: SHIELD_PROTOCOL }
        });
        return response.text || "";
    });
};

export const suggestFilingMetadata = async (data: PetitionFormData): Promise<PetitionFilingMetadata> => {
    return await runGenAI(async (ai) => {
        const prompt = `Sugira Competência, Classe e Assunto (CNJ) para: ${data.area}, ${data.actionType}. Retorne JSON { "competence": string, "class": string, "subject": string }`;
        const response = await ai.models.generateContent({ 
            model: 'gemini-3-flash-preview', 
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
    });
};

export const searchJurisprudence = async (query: string, scope: string): Promise<string> => {
    return await runGenAI(async (ai) => {
        const prompt = `Busque jurisprudência relevante sobre: "${query}". Retorne ementas em HTML.`;
        const response = await ai.models.generateContent({ 
            model: 'gemini-3-flash-preview', 
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] }
        });
        
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const links = chunks.map((c: any) => c.web?.uri).filter(Boolean);
        let text = response.text || "";
        
        if (links.length > 0) {
            const uniqueLinks = Array.from(new Set(links));
            text += `<div class='mt-4 p-4 bg-slate-50 border-t'><strong>Referências:</strong><ul class='list-disc ml-4'>`;
            uniqueLinks.forEach(link => { text += `<li><a href='${link}' target='_blank' class='text-blue-600 break-all'>${link}</a></li>`; });
            text += `</ul></div>`;
        }
        return text;
    });
};

export const refineLegalPetition = async (currentContent: string, instructions: string): Promise<string> => {
    return await runGenAI(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Refine esta petição: "${instructions}". Peça: ${currentContent}`,
            config: { systemInstruction: SHIELD_PROTOCOL }
        });
        return response.text || currentContent;
    });
};

export const transcribeAudio = async (base64Data: string, mimeType: string): Promise<string> => {
    return await runGenAI(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: { mimeType, data: base64Data } }, { text: "Transcreva este relato jurídico com precisão técnica." }] }
        });
        return response.text || "";
    });
};