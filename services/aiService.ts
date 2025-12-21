
import { GoogleGenAI, Type } from "@google/genai";
import { PetitionFormData, PetitionFilingMetadata } from "../types";

// Fix: escaped backticks to prevent early termination of template literal which was causing a "not callable" error on subsequent lines.
const SYSTEM_INSTRUCTION = `
Você é um Advogado Sênior Brasileiro especializado em Direito Cível e Trabalhista.
Suas petições seguem o padrão de excelência: técnica apurada, fundamentação em súmulas e doutrina.
Retorne SEMPRE o conteúdo em HTML puro, sem blocos de código markdown (\`\`\`html).
Use tabelas HTML para dados estruturados.
`;

// Fix: Utility function to clean HTML from possible markdown wrappers
const cleanHtml = (text: string | undefined): string => {
  if (!text) return "";
  // Remove invólucros de markdown caso a IA os gere por engano
  // Fix: ensuring regex backticks don't interfere with template literal parsing if the lexer gets confused
  return text.replace(/^[ \t]*[`']{3}(?:html|)\s*/i, '').replace(/\s*[`']{3}[ \t]*$/i, '').trim();
};

/**
 * Retorna uma instância limpa do SDK usando a chave disponível no escopo global.
 * O SDK exige que a chave esteja em process.env.API_KEY.
 */
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'undefined') {
    throw new Error("SISTEMA_OFFLINE: Chave de API não configurada.");
  }
  return new GoogleGenAI({ apiKey });
};

export const searchJurisprudence = async (query: string, scope: string): Promise<string> => {
  const response = await getAI().models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Pesquise jurisprudência recente: "${query}". Escopo: ${scope}.`,
    config: { tools: [{ googleSearch: {} }], systemInstruction: SYSTEM_INSTRUCTION }
  });
  return cleanHtml(response.text);
};

export const suggestFilingMetadata = async (content: string): Promise<PetitionFilingMetadata> => {
  try {
    const response = await getAI().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analise esta petição e sugira os metadados de protocolo: ${content}`,
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
  const response = await getAI().models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Redija uma Petição Inicial completa com base nos dados: ${JSON.stringify(data)}`,
    config: { systemInstruction: SYSTEM_INSTRUCTION, thinkingConfig: { thinkingBudget: 16000 } }
  });
  return cleanHtml(response.text);
};

export const generateLegalDefense = async (data: PetitionFormData): Promise<string> => {
  const response = await getAI().models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Redija uma Contestação técnica: ${JSON.stringify(data)}`,
    config: { systemInstruction: SYSTEM_INSTRUCTION, thinkingConfig: { thinkingBudget: 16000 } }
  });
  return cleanHtml(response.text);
};

export const chatRefinePetition = async (currentContent: string, userMessage: string, history: any[]): Promise<string> => {
  const chat = getAI().chats.create({ 
    model: 'gemini-3-flash-preview', 
    config: { systemInstruction: SYSTEM_INSTRUCTION } 
  });
  const response = await chat.sendMessage({ 
    message: `Ajuste esta petição conforme instrução: "${userMessage}". \nConteúdo atual: ${currentContent}` 
  });
  return cleanHtml(response.text);
};

export const interpretCNJMetadata = async (processNumber: string): Promise<string> => {
  const response = await getAI().models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Explique detalhadamente o número CNJ: ${processNumber}.`,
    config: { tools: [{ googleSearch: {} }] }
  });
  return cleanHtml(response.text);
};

export const searchCNJTabelasUnificadas = async (query: string): Promise<string> => {
  const response = await getAI().models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Busque na TPU do CNJ o termo: ${query}.`,
    config: { tools: [{ googleSearch: {} }] }
  });
  return cleanHtml(response.text);
};

export const searchDJE = async (name: string, oab: string, tribunal: string, dateRange: string): Promise<string> => {
  const response = await getAI().models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Busque intimações no DJE para: Nome ${name}, OAB ${oab}, Tribunal ${tribunal}.`,
    config: { tools: [{ googleSearch: {} }] }
  });
  return cleanHtml(response.text);
};

export const extractDataFromDocument = async (file: File): Promise<any> => {
  const reader = new FileReader();
  const base64 = await new Promise<string>((resolve) => {
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  const response = await getAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { text: "Extraia os dados estruturados deste documento para preencher uma petição." },
        { inlineData: { mimeType: file.type, data: base64 } }
      ]
    },
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text || "{}");
};

export const transcribeAudio = async (base64Data: string, mimeType: string): Promise<string> => {
  const response = await getAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { text: "Transcreva este áudio jurídico fielmente." },
        { inlineData: { mimeType, data: base64Data } }
      ]
    }
  });
  return response.text || "";
};
