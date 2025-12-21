
import { GoogleGenAI, Type } from "@google/genai";
import { PetitionFormData, PetitionFilingMetadata } from "../types";

const SHIELD_PROTOCOL = `
Você é um ADVOGADO SÊNIOR BRASILEIRO com 20 anos de experiência.
Sua escrita deve ser prolixa mas sem "encher linguiça", focando em profundidade doutrinária e jurisprudencial.
Retorne APENAS o conteúdo HTML atualizado, sem blocos de marcação de código.
`;

const COURT_PORTALS_MAP = `
MAPA DE URLS OFICIAIS:
- TJSP: https://esaj.tjsp.jus.br/esaj/portal.do?servico=190090
- TJRJ: https://www4.tjrj.jus.br/pje/
- TJMG: https://pje.tjmg.jus.br/pje/login.seam
- TRF3: https://pje1g.trf3.jus.br/pje/
- PJe Geral: https://pje.cnj.jus.br/
`;

/**
 * Inicializa o cliente seguindo estritamente as diretrizes do SDK.
 * A variável process.env.API_KEY é injetada pelo polyfill no index.tsx.
 */
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "undefined" || apiKey.length < 10) {
    throw new Error("CONFIG_MISSING: Chave de API (VITE_API_KEY) não configurada no ambiente.");
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
  // Remove marcações de código markdown se o modelo ignorar as instruções do sistema
  return text.replace(/^[ \t]*[`']{3}(?:html|)\s*/i, '').replace(/\s*[`']{3}[ \t]*$/i, '').trim();
};

const handleAiError = (error: any) => {
  console.error("JurisPet AI Service Error:", error);
  const message = error.message || "";
  
  if (message.includes("CONFIG_MISSING")) {
    throw new Error("Atenção: O sistema está sem a chave de acesso à IA. Verifique as variáveis de ambiente VITE_API_KEY.");
  }
  
  if (message.includes("401") || message.includes("API key not valid")) {
    throw new Error("Chave de IA Inválida: A chave fornecida no Vercel foi recusada pelo Google.");
  }

  if (message.includes("429")) {
    throw new Error("Limite de Uso: Muitas requisições simultâneas. Aguarde 1 minuto.");
  }

  throw new Error(`Falha na IA: ${message || "Erro de comunicação com o servidor."}`);
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
      contents: `Analise a petição e sugira metadados: Competência, Classe e Assunto do CNJ. Use estas URLs se possível: ${COURT_PORTALS_MAP}\n\nPetição:\n${content}`,
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
      message: `Conteúdo atual: ${currentContent}\n\nInstrução do usuário: ${userMessage}. Retorne o HTML completo.` 
    });
    return cleanAiHtmlResponse(response.text);
  } catch (error) { return handleAiError(error); }
};

export const interpretCNJMetadata = async (processNumber: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Explique o número CNJ: ${processNumber}. Retorne HTML.`,
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
      contents: `Busque na TPU do CNJ: ${query}. Retorne HTML.`,
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
      contents: `Busque intimações DJE para ${name}, OAB ${oab}, no tribunal ${tribunal} em ${dateRange}. Retorne HTML com tabelas.`,
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
          { text: "Extraia os dados deste documento jurídico para preencher um formulário (area, actionType, jurisdiction, plaintiffs, defendants, facts, requests, value). Retorne apenas JSON." },
          { inlineData: { mimeType: file.type, data: base64 } }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
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
          { text: "Transcreva este áudio jurídico." },
          { inlineData: { mimeType, data: base64Data } }
        ]
      }
    });
    return response.text || "";
  } catch (error) { return handleAiError(error); }
};
