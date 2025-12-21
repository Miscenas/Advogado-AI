
import { GoogleGenAI, Type } from "@google/genai";
import { PetitionFormData, PetitionFilingMetadata } from "../types";

const SHIELD_PROTOCOL = `
Você é um ADVOGADO SÊNIOR BRASILEIRO com 20 anos de experiência.
Foque em profundidade doutrinária e jurisprudencial brasileira.
Retorne APENAS o conteúdo HTML, sem blocos de código markdown.
`;

/**
 * Inicializa o cliente garantindo que a chave injetada pelo index.tsx seja usada.
 */
const getAiClient = () => {
  // O process.env.API_KEY é garantido pelo polyfill no index.tsx
  const apiKey = (window as any).process?.env?.API_KEY || process.env.API_KEY;
  
  if (!apiKey || apiKey === "undefined" || apiKey === "" || apiKey.length < 10) {
    throw new Error("CHAVE_AUSENTE: A variável de ambiente VITE_API_KEY não foi detectada. Verifique as configurações do seu projeto no Vercel e faça um novo deploy.");
  }
  
  return new GoogleGenAI({ apiKey });
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = () => reject(new Error("Erro ao ler arquivo."));
    reader.readAsDataURL(file);
  });
};

const cleanAiHtmlResponse = (text: string | undefined): string => {
  if (!text) return "";
  return text.replace(/^[ \t]*[`']{3}(?:html|)\s*/i, '').replace(/\s*[`']{3}[ \t]*$/i, '').trim();
};

const handleAiError = (error: any) => {
  console.error("JurisPet AI Service Error:", error);
  const message = error.message || "";
  
  if (message.includes("CHAVE_AUSENTE")) {
    throw new Error(message);
  }
  
  if (message.includes("401") || message.includes("API key not valid")) {
    throw new Error("ERRO DE AUTENTICAÇÃO: A chave de API fornecida é inválida. Gere uma nova no Google AI Studio.");
  }

  if (message.includes("429")) {
    throw new Error("LIMITE ATINGIDO: Muitas requisições. Aguarde um momento.");
  }

  throw new Error(`FALHA NA IA: ${message || "Erro de comunicação com o servidor Gemini."}`);
};

export const searchJurisprudence = async (query: string, scope: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Pesquise jurisprudência recente: "${query}". Escopo: ${scope}. Retorne HTML técnico.`,
      config: { tools: [{ googleSearch: {} }], systemInstruction: SHIELD_PROTOCOL }
    });
    return cleanAiHtmlResponse(response.text);
  } catch (error) { return handleAiError(error); }
};

export const suggestFilingMetadata = async (content: string): Promise<PetitionFilingMetadata> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analise a petição e sugira metadados (Competência, Classe, Assunto). Petição:\n${content}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            competence: { type: Type.STRING },
            class: { type: Type.STRING },
            subject: { type: Type.STRING },
            filingUrl: { type: Type.STRING },
          },
          required: ["competence", "class", "subject"],
        },
      },
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    return { competence: "Verificar", class: "Verificar", subject: "Verificar" };
  }
};

export const generateLegalPetition = async (data: PetitionFormData): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Redija Petição Inicial Sênior: ${JSON.stringify(data)}`,
      config: { systemInstruction: SHIELD_PROTOCOL, thinkingConfig: { thinkingBudget: 16000 } }
    });
    return cleanAiHtmlResponse(response.text);
  } catch (error) { return handleAiError(error); }
};

export const generateLegalDefense = async (data: PetitionFormData): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Redija Contestação Sênior: ${JSON.stringify(data)}`,
      config: { systemInstruction: SHIELD_PROTOCOL, thinkingConfig: { thinkingBudget: 16000 } }
    });
    return cleanAiHtmlResponse(response.text);
  } catch (error) { return handleAiError(error); }
};

export const chatRefinePetition = async (currentContent: string, userMessage: string, history: any[]): Promise<string> => {
  try {
    const ai = getAiClient();
    const chat = ai.chats.create({ 
      model: 'gemini-3-flash-preview', 
      config: { systemInstruction: SHIELD_PROTOCOL } 
    });
    const response = await chat.sendMessage({ 
      message: `Conteúdo atual: ${currentContent}\n\nInstrução: ${userMessage}. Retorne HTML.` 
    });
    return cleanAiHtmlResponse(response.text);
  } catch (error) { return handleAiError(error); }
};

export const interpretCNJMetadata = async (processNumber: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Explique o número CNJ: ${processNumber}.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    return cleanAiHtmlResponse(response.text);
  } catch (error) { return handleAiError(error); }
};

export const searchCNJTabelasUnificadas = async (query: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Busque na TPU do CNJ: ${query}.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    return cleanAiHtmlResponse(response.text);
  } catch (error) { return handleAiError(error); }
};

export const searchDJE = async (name: string, oab: string, tribunal: string, dateRange: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Busque intimações para ${name}, OAB ${oab}, tribunal ${tribunal}.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    return cleanAiHtmlResponse(response.text);
  } catch (error) { return handleAiError(error); }
};

export const extractDataFromDocument = async (file: File): Promise<any> => {
  try {
    const ai = getAiClient();
    const base64 = await fileToBase64(file);
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { text: "Extraia dados deste documento jurídico para JSON." },
          { inlineData: { mimeType: file.type, data: base64 } }
        ]
      },
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) { return handleAiError(error); }
};

export const transcribeAudio = async (base64Data: string, mimeType: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { text: "Transcreva este áudio." },
          { inlineData: { mimeType, data: base64Data } }
        ]
      }
    });
    return response.text || "";
  } catch (error) { return handleAiError(error); }
};
