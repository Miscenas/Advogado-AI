import { GoogleGenAI, Type } from "@google/genai";
import { PetitionFormData, PetitionFilingMetadata, PetitionParty } from "../types";

/**
 * Protocolo de Identidade Jurídica para a IA
 */
const SHIELD_PROTOCOL = `
Você é um ADVOGADO SÊNIOR BRASILEIRO.
Responda com rigor técnico, polidez e fundamentação no CPC/2015 ou CLT.
Estrutura: Endereçamento, Preâmbulo, Fatos, Direito e Pedidos.
`;

/**
 * Obtém a chave de API de forma resiliente em ambientes Vite/Vercel.
 * No Vite, variáveis precisam do prefixo VITE_ para serem expostas ao cliente.
 */
const getApiKey = (): string | undefined => {
  // 1. Tenta o padrão do Vite (exposto ao navegador)
  const viteKey = (import.meta as any).env?.VITE_API_KEY;
  if (viteKey) return viteKey;

  // 2. Tenta o padrão process.env (comum em Vercel/Node)
  const processKey = process.env.API_KEY;
  if (processKey) return processKey;

  // 3. Tenta a variável sem prefixo no import.meta (caso de define customizado)
  return (import.meta as any).env?.API_KEY;
};

/**
 * Helper para instanciar o SDK e validar a chave
 */
const getAiClient = () => {
  const apiKey = getApiKey();
  if (!apiKey || apiKey.length < 10) {
    throw new Error("API_KEY_MISSING: A chave do Gemini não foi encontrada no navegador. Em projetos Vite/Vercel, você deve nomear a variável como VITE_API_KEY para que ela fique visível no frontend.");
  }
  return new GoogleGenAI({ apiKey });
};

export const hasAiKey = (): boolean => {
  const key = getApiKey();
  return !!(key && key.length > 10);
};

export const extractDataFromDocument = async (base64Data: string, mimeType: string): Promise<{
  docType: string;
  summary: string;
  extractedData: Partial<PetitionFormData> & { cnjClass?: string, cnjSubject?: string };
}> => {
  const ai = getAiClient();
  const prompt = `Analise este documento jurídico brasileiro. 
  Extraia o resumo dos fatos, nomes das partes e CPFs/CNPJs.
  
  RETORNE ESTRITAMENTE JSON: 
  { 
    "docType": "Petição Inicial|Sentença|Contrato|Outro", 
    "summary": "Resumo técnico dos fatos", 
    "extractedData": { 
      "area": "civel|trabalhista|etc", 
      "actionType": "Nome da Ação", 
      "jurisdiction": "Vara/Comarca",
      "plaintiffs": [{"name": "string", "type": "pf|pj", "doc": "string"}], 
      "defendants": [{"name": "string", "type": "pf|pj", "doc": "string"}], 
      "facts": "Texto detalhado dos fatos", 
      "value": "R$ 0,00" 
    } 
  }`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { 
        parts: [
          { inlineData: { mimeType, data: base64Data } }, 
          { text: prompt }
        ] 
      },
      config: { 
        responseMimeType: "application/json",
        systemInstruction: "Você é um perito em análise processual brasileira."
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Erro na extração:", error);
    throw new Error(error.message || "Falha na comunicação com a IA.");
  }
};

export const generateLegalPetition = async (data: PetitionFormData): Promise<string> => {
  const ai = getAiClient();
  const prompt = `REDIJA UMA PETIÇÃO INICIAL SÊNIOR COM BASE NESTES DADOS: ${JSON.stringify(data)}`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { systemInstruction: SHIELD_PROTOCOL }
  });
  
  return response.text || "";
};

export const generateLegalDefense = async (data: PetitionFormData): Promise<string> => {
  const ai = getAiClient();
  const prompt = `REDIJA UMA CONTESTAÇÃO/DEFESA TÉCNICA SÊNIOR COM BASE NESTES DADOS: ${JSON.stringify(data)}`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { systemInstruction: SHIELD_PROTOCOL }
  });
  
  return response.text || "";
};

export const suggestFilingMetadata = async (data: PetitionFormData): Promise<PetitionFilingMetadata> => {
  const ai = getAiClient();
  const prompt = `Sugira Classe e Assunto CNJ para: ${data.area}, ${data.actionType}. Retorne JSON { "competence": string, "class": string, "subject": string }`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });
  
  return JSON.parse(response.text || "{}");
};

export const searchJurisprudence = async (query: string, scope: string): Promise<string> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Busque jurisprudência sobre: "${query}". Formate ementas em HTML.`,
    config: { tools: [{ googleSearch: {} }] }
  });

  let text = response.text || "";
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const links = chunks.map((c: any) => c.web?.uri).filter(Boolean);
  
  if (links.length > 0) {
    const uniqueLinks = Array.from(new Set(links));
    text += `<div class='mt-4 p-4 bg-slate-100 rounded-xl border border-slate-200 text-sm font-sans'><strong>Fontes Oficiais:</strong><ul class='list-disc ml-5 mt-2'>`;
    uniqueLinks.forEach(link => { text += `<li><a href='${link}' target='_blank' class='text-blue-600 underline'>${link}</a></li>`; });
    text += `</ul></div>`;
  }
  return text;
};

export const refineLegalPetition = async (currentContent: string, instructions: string): Promise<string> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Aperfeiçoe este texto jurídico seguindo: "${instructions}". Texto atual: ${currentContent}`,
    config: { systemInstruction: SHIELD_PROTOCOL }
  });
  return response.text || currentContent;
};

export const transcribeAudio = async (base64Data: string, mimeType: string): Promise<string> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { 
      parts: [
        { inlineData: { mimeType, data: base64Data } }, 
        { text: "Transcreva este relato jurídico mantendo o rigor técnico." }
      ] 
    }
  });
  return response.text || "";
};