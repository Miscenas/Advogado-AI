
import { GoogleGenAI, Type } from "@google/genai";
import { PetitionFormData, PetitionFilingMetadata, PetitionParty } from "../types";

/**
 * Verifica se a chave de API está configurada no ambiente.
 */
export const hasAiKey = (): boolean => {
  return !!(process.env.API_KEY && process.env.API_KEY.length > 10);
};

const SHIELD_PROTOCOL = `
PROTOCOLO DE BLINDAGEM E EXCELÊNCIA JURÍDICA:
1. Você é um ADVOGADO SÊNIOR BRASILEIRO com mais de 20 anos de prática jurídica.
2. Identidade: Rigorosa, técnica, polida e estratégica. Utilize o "juridiquês" de alto nível.
3. Fundamentação: Utilize CPC/2015 para cível e CLT para trabalhista.
4. Estrutura de Peça Sênior: Endereçamento, Preâmbulo, Fatos, Direito e Pedidos.
`;

/**
 * Runner para chamadas ao Gemini. 
 * Inicializa um novo cliente a cada chamada para garantir o uso da chave de ambiente atualizada.
 */
const runGenAI = async (callback: (ai: GoogleGenAI) => Promise<any>): Promise<any> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY_MISSING: A variável de ambiente API_KEY não foi configurada no servidor de deploy.");
    }
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
        return await callback(ai);
    } catch (error: any) {
        console.error("Gemini API Error:", error);
        const msg = error.message || "";
        
        if (msg.includes('429') || msg.includes('Quota')) {
            throw new Error("LIMITE_EXCEDIDO: Cota da API atingida. Tente novamente em breve.");
        }
        if (msg.includes('403') || msg.includes('not valid')) {
            throw new Error("CHAVE_INVALIDA: A chave de API (API_KEY) configurada é inválida.");
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
      Extraia dados cadastrais e IDENTIFIQUE a classificação processual correta (CNJ).
      
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
            systemInstruction: "Você é um perito em análise processual brasileira."
          }
      });
      
      const text = response.text || "{}";
      try {
          return JSON.parse(text);
      } catch (e) {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) return JSON.parse(jsonMatch[0]);
          throw new Error("Falha ao interpretar resposta da IA.");
      }
  });
};

export const generateLegalPetition = async (data: PetitionFormData): Promise<string> => {
    return await runGenAI(async (ai) => {
        const prompt = `REDIJA UMA PETIÇÃO INICIAL SÊNIOR. 
        DADOS: ${JSON.stringify(data)}
        ÁREA: ${data.area.toUpperCase()}
        AÇÃO: ${data.actionType}`;
        
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
        const prompt = `REDIJA UMA CONTESTAÇÃO/DEFESA TÉCNICA SÊNIOR. 
        DADOS: ${JSON.stringify(data)}`;
        
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
        const prompt = `Sugira Competência, Classe e Assunto (CNJ) para: ${data.area}, ${data.actionType}. 
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
        const prompt = `Busque jurisprudência relevante sobre: "${query}". Retorne ementas formatadas em HTML.`;
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
            contents: `Aperfeiçoe tecnicamente este texto jurídico: "${instructions}". Texto original: ${currentContent}`,
            config: { systemInstruction: SHIELD_PROTOCOL }
        });
        return response.text || currentContent;
    });
};

export const transcribeAudio = async (base64Data: string, mimeType: string): Promise<string> => {
    return await runGenAI(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: { mimeType, data: base64Data } }, { text: "Transcreva este relato jurídico mantendo o rigor técnico." }] }
        });
        return response.text || "";
    });
};
