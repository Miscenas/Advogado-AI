
import { GoogleGenAI, Type } from "@google/genai";
import { PetitionFormData, PetitionFilingMetadata } from "../types";

const SYSTEM_INSTRUCTION = `
Você é um Advogado Sênior Brasileiro especializado em Direito Cível e Trabalhista.
Retorne SEMPRE o conteúdo em HTML puro, formatado para impressão em A4.
`;

const cleanHtml = (text: string | undefined): string => {
  if (!text) return "";
  return text.replace(/^[ \t]*[`']{3}(?:html|)\s*/i, '').replace(/\s*[`']{3}[ \t]*$/i, '').trim();
};

const getAI = () => {
  const win = window as any;
  const apiKey = win.process?.env?.API_KEY || win.process?.env?.VITE_API_KEY;
  
  if (!apiKey || apiKey === 'undefined' || apiKey.length < 10) {
    // Retorna um objeto "fake" para não quebrar a UI, avisando que está em modo demo
    return {
      models: {
        generateContent: async () => ({ 
          text: "<div class='p-10 border-2 border-dashed border-amber-300 bg-amber-50 rounded-3xl text-amber-800 font-bold text-center'>⚠️ MODO DEMO ATIVO: Sua Chave de IA ainda não foi detectada. Verifique as variáveis de ambiente no Vercel.</div>" 
        }),
        countTokens: async () => ({ totalTokens: 0 })
      },
      chats: {
        create: () => ({ sendMessage: async () => ({ text: "Modo Demo ativo." }) })
      }
    } as any;
  }
  return new GoogleGenAI({ apiKey });
};

export const searchJurisprudence = async (query: string, scope: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Pesquise jurisprudência: "${query}"`,
    config: { tools: [{ googleSearch: {} }], systemInstruction: SYSTEM_INSTRUCTION }
  });
  return cleanHtml(response.text);
};

export const suggestFilingMetadata = async (content: string): Promise<PetitionFilingMetadata> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Sugira metadados: ${content.substring(0, 1000)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            competence: { type: Type.STRING },
            class: { type: Type.STRING },
            subject: { type: Type.STRING },
          },
          required: ["competence", "class", "subject"],
        },
      },
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return { competence: "Verificar", class: "Verificar", subject: "Verificar" };
  }
};

export const generateLegalPetition = async (data: PetitionFormData): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Redija petição: ${JSON.stringify(data)}`,
    config: { systemInstruction: SYSTEM_INSTRUCTION }
  });
  return cleanHtml(response.text);
};

export const generateLegalDefense = async (data: PetitionFormData): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Redija defesa: ${JSON.stringify(data)}`,
    config: { systemInstruction: SYSTEM_INSTRUCTION }
  });
  return cleanHtml(response.text);
};

export const chatRefinePetition = async (currentContent: string, userMessage: string, history: any[]): Promise<string> => {
  const ai = getAI();
  const chat = ai.chats.create({ 
    model: 'gemini-3-flash-preview', 
    config: { systemInstruction: SYSTEM_INSTRUCTION } 
  });
  const response = await chat.sendMessage({ message: userMessage });
  return cleanHtml(response.text);
};

export const interpretCNJMetadata = async (processNumber: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `CNJ: ${processNumber}`,
    config: { tools: [{ googleSearch: {} }] }
  });
  return cleanHtml(response.text);
};

export const searchCNJTabelasUnificadas = async (query: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `TPU: ${query}`,
    config: { tools: [{ googleSearch: {} }] }
  });
  return cleanHtml(response.text);
};

export const searchDJE = async (name: string, oab: string, tribunal: string, dateRange: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `DJE: ${name}`,
    config: { tools: [{ googleSearch: {} }] }
  });
  return cleanHtml(response.text);
};

export const extractDataFromDocument = async (file: File): Promise<any> => {
  return { summary: "Extração desativada em modo local (Simulação)." };
};

export const transcribeAudio = async (base64Data: string, mimeType: string): Promise<string> => {
  return "Transcrição desativada em modo local (Simulação).";
};
