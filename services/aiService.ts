import { GoogleGenAI, Type } from "@google/genai";
import { PetitionFormData, PetitionFilingMetadata, PetitionParty } from "../types";

/**
 * Tenta obter a chave de API de diversas fontes de ambiente comuns.
 */
const getApiKey = (): string => {
  // 1. Tenta process.env (Padrão Node/Vercel/Netlify)
  try {
    if (typeof process !== 'undefined' && process.env?.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {}

  // 2. Tenta import.meta.env (Padrão Vite)
  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv?.VITE_API_KEY) return metaEnv.VITE_API_KEY;
    if (metaEnv?.API_KEY) return metaEnv.API_KEY;
  } catch (e) {}

  // 3. Tenta window.ENV (Injeção manual)
  try {
    if (typeof window !== 'undefined' && (window as any).API_KEY) {
      return (window as any).API_KEY;
    }
  } catch (e) {}

  return "";
};

export const hasAiKey = (): boolean => {
  const key = getApiKey();
  return !!(key && key.length > 20);
};

const SHIELD_PROTOCOL = `
PROTOCOLO DE BLINDAGEM E EXCELÊNCIA JURÍDICA:
1. Você é um ADVOGADO SÊNIOR BRASILEIRO com vasta experiência.
2. Identidade: Rigorosa, técnica, polida e estratégica. Use terminologia jurídica precisa.
3. Fundamentação: Baseie-se no CPC/2015 para cível e CLT para trabalhista.
4. Estrutura: Endereçamento, Preâmbulo, Fatos, Direito e Pedidos.
`;

const runGenAI = async (callback: (ai: GoogleGenAI) => Promise<any>): Promise<any> => {
    const apiKey = getApiKey();
    
    if (!apiKey) {
        throw new Error("API_KEY_MISSING: A chave do Gemini não foi encontrada. Configure a variável de ambiente 'API_KEY' no seu servidor de deploy ou no arquivo .env local.");
    }
    
    const ai = new GoogleGenAI({ apiKey });
    
    try {
        return await callback(ai);
    } catch (error: any) {
        console.error("Gemini API Error:", error);
        const msg = error.message || "";
        if (msg.includes('429') || msg.includes('Quota')) {
            throw new Error("LIMITE_EXCEDIDO: Cota de uso da IA atingida. Tente novamente em alguns minutos.");
        }
        if (msg.includes('403') || msg.includes('not valid')) {
            throw new Error("CHAVE_INVALIDA: A chave de API configurada é inválida ou expirou.");
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
      const prompt = `Analise este documento jurídico brasileiro. 
      Extraia dados cadastrais e identifique a classificação processual (CNJ).
      
      RETORNE APENAS JSON: 
      { 
        "docType": string, 
        "summary": string, 
        "extractedData": { 
          "area": string, 
          "actionType": string, 
          "jurisdiction": string, 
          "cnjClass": string,
          "cnjSubject": string,
          "plaintiffs": [{"name": string, "type": "pf"|"pj", "doc": string}], 
          "defendants": [{"name": string, "type": "pf"|"pj", "doc": string}], 
          "facts": string, 
          "value": string 
        } 
      }`;
      
      const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: { parts: [{ inlineData: { mimeType, data: base64Data } }, { text: prompt }] },
          config: { 
            responseMimeType: "application/json",
            systemInstruction: "Você é um perito em análise de documentos jurídicos."
          }
      });
      
      const text = response.text || "{}";
      try {
          return JSON.parse(text);
      } catch (e) {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) return JSON.parse(jsonMatch[0]);
          throw new Error("A IA retornou um formato inesperado. Tente novamente.");
      }
  });
};

export const generateLegalPetition = async (data: PetitionFormData): Promise<string> => {
    return await runGenAI(async (ai) => {
        const prompt = `REDIJA UMA PETIÇÃO INICIAL SÊNIOR COMPLETA. 
        DADOS PARA ELABORAÇÃO: ${JSON.stringify(data)}`;
        
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
        const prompt = `REDIJA UMA CONTESTAÇÃO TÉCNICA SÊNIOR. 
        DADOS DA DEFESA: ${JSON.stringify(data)}`;
        
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
        const prompt = `Sugira Classe e Assunto CNJ para: ${data.area}, ${data.actionType}. 
        Retorne JSON: { "competence": string, "class": string, "subject": string }`;
        
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
        const prompt = `Busque jurisprudência sobre: "${query}". Formate como ementas em HTML.`;
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
            text += `<div class='mt-4 p-4 bg-slate-100 rounded-xl border border-slate-200'><strong>Fontes Oficiais:</strong><ul class='list-disc ml-5 mt-2'>`;
            uniqueLinks.forEach(link => { text += `<li><a href='${link}' target='_blank' class='text-blue-600 underline'>${link}</a></li>`; });
            text += `</ul></div>`;
        }
        return text;
    });
};

export const refineLegalPetition = async (currentContent: string, instructions: string): Promise<string> => {
    return await runGenAI(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Refine este texto jurídico: "${instructions}". Texto atual: ${currentContent}`,
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