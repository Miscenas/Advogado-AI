import { GoogleGenAI, Type } from "@google/genai";
import { PetitionFormData, PetitionFilingMetadata, PetitionParty } from "../types";

/**
 * PROTOCOLO DE BLINDAGEM E EXCELÊNCIA JURÍDICA:
 * 1. Identidade: Advogado Sênior Brasileiro.
 * 2. Fundamentação: CPC/2015 e CLT.
 */
const SHIELD_PROTOCOL = `
Você é um ADVOGADO SÊNIOR BRASILEIRO com 20 anos de prática.
Responda com rigor técnico, polidez e estratégia.
Utilize CPC/2015 para cível e CLT para trabalhista.
Estrutura: Endereçamento, Preâmbulo, Fatos, Direito e Pedidos.
`;

/**
 * Verifica se a variável de ambiente está disponível.
 */
export const hasAiKey = (): boolean => {
  return typeof process !== 'undefined' && !!process.env.API_KEY;
};

/**
 * Função centralizada para chamadas à API Gemini.
 * Sempre cria uma nova instância para garantir o uso da chave de ambiente mais recente.
 */
const getModelResponse = async (modelName: string, prompt: string | any, systemInstruction?: string, isJson: boolean = false) => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY_MISSING: A variável de ambiente API_KEY não foi configurada no servidor.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: typeof prompt === 'string' ? prompt : { parts: prompt.parts || prompt },
      config: {
        systemInstruction: systemInstruction || SHIELD_PROTOCOL,
        responseMimeType: isJson ? "application/json" : undefined,
      },
    });

    return response;
  } catch (error: any) {
    console.error("Erro Gemini API:", error);
    if (error.message?.includes('403') || error.message?.includes('API key not valid')) {
      throw new Error("CHAVE_INVALIDA: A API_KEY configurada no Vercel é inválida.");
    }
    throw error;
  }
};

export const extractDataFromDocument = async (base64Data: string, mimeType: string): Promise<{
  docType: string;
  summary: string;
  extractedData: Partial<PetitionFormData> & { cnjClass?: string, cnjSubject?: string };
}> => {
  const parts = [
    { inlineData: { mimeType, data: base64Data } },
    { text: "Analise este documento jurídico brasileiro e extraia os dados em JSON. Identifique Classe e Assunto CNJ." }
  ];
  
  const response = await getModelResponse('gemini-3-flash-preview', { parts }, "Você é um perito em análise de documentos jurídicos.", true);
  return JSON.parse(response.text || "{}");
};

export const generateLegalPetition = async (data: PetitionFormData): Promise<string> => {
  const prompt = `REDIJA UMA PETIÇÃO INICIAL SÊNIOR. AREA: ${data.area}. DADOS: ${JSON.stringify(data)}`;
  const response = await getModelResponse('gemini-3-pro-preview', prompt);
  return response.text || "";
};

export const generateLegalDefense = async (data: PetitionFormData): Promise<string> => {
  const prompt = `REDIJA UMA CONTESTAÇÃO TÉCNICA. DADOS: ${JSON.stringify(data)}`;
  const response = await getModelResponse('gemini-3-pro-preview', prompt);
  return response.text || "";
};

export const suggestFilingMetadata = async (data: PetitionFormData): Promise<PetitionFilingMetadata> => {
  const prompt = `Sugira Classe e Assunto CNJ para: ${data.area}, ${data.actionType}. Retorne JSON { "competence": string, "class": string, "subject": string }`;
  const response = await getModelResponse('gemini-3-flash-preview', prompt, "Especialista em tabelas unificadas do CNJ.", true);
  return JSON.parse(response.text || "{}");
};

export const searchJurisprudence = async (query: string, scope: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
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
    text += `<div class='mt-4 p-4 bg-slate-100 rounded-xl border border-slate-200'><strong>Fontes Oficiais:</strong><ul class='list-disc ml-5 mt-2'>`;
    uniqueLinks.forEach(link => { text += `<li><a href='${link}' target='_blank' class='text-blue-600 underline'>${link}</a></li>`; });
    text += `</ul></div>`;
  }
  return text;
};

export const refineLegalPetition = async (currentContent: string, instructions: string): Promise<string> => {
  const prompt = `Refine este texto jurídico seguindo as instruções: "${instructions}". Texto atual: ${currentContent}`;
  const response = await getModelResponse('gemini-3-flash-preview', prompt);
  return response.text || currentContent;
};

export const transcribeAudio = async (base64Data: string, mimeType: string): Promise<string> => {
  const parts = [
    { inlineData: { mimeType, data: base64Data } },
    { text: "Transcreva este relato jurídico mantendo o rigor técnico." }
  ];
  const response = await getModelResponse('gemini-3-flash-preview', { parts });
  return response.text || "";
};