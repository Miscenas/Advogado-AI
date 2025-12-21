
import { GoogleGenAI, Type } from "@google/genai";
import { PetitionFormData, PetitionFilingMetadata } from "../types";

const SHIELD_PROTOCOL = `
Você é um ADVOGADO SÊNIOR BRASILEIRO com 20 anos de experiência.
Sua escrita deve ser prolixa mas sem "encher linguiça", focando em profundidade doutrinária e jurisprudencial.

DIRETRIZES DE FORMATAÇÃO (CRÍTICO):
1. Retorne APENAS o conteúdo HTML atualizado.
2. NUNCA envolva o código em blocos de marcação como \`\`\`html. 
3. Mantenha a estrutura de títulos <h2> e <h3>.
`;

const COURT_PORTALS_MAP = `
MAPA DE URLS OFICIAIS (USE APENAS ESTAS SE IDENTIFICAR O TRIBUNAL):
- TJSP: https://esaj.tjsp.jus.br/esaj/portal.do?servico=190090
- TJRJ: https://www4.tjrj.jus.br/pje/
- TJMG: https://pje.tjmg.jus.br/pje/login.seam
- TJRS: https://www.tjrs.jus.br/novo/processo-eletronico/
- TJPR: https://projudi.tjpr.jus.br/projudi/
- TRF1: https://pje1g.trf1.jus.br/pje/
- TRF3: https://pje1g.trf3.jus.br/pje/
- STJ: https://www.stj.jus.br/peticionamento-eletronico/
- STF: https://portal.stf.jus.br/processos/peticionamento.asp
- PJe Geral: https://pje.cnj.jus.br/
`;

const getAiClient = () => {
  // O SDK exige o uso de process.env.API_KEY. 
  // O polyfill no index.tsx garante que este valor exista em produção.
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = () => reject(new Error("Falha ao converter arquivo em Base64."));
    reader.readAsDataURL(file);
  });
};

const cleanAiHtmlResponse = (text: string | undefined): string => {
  if (!text) return "";
  return text.replace(/^[ \t]*[`']{3}(?:html|)\s*/i, '').replace(/\s*[`']{3}[ \t]*$/i, '').trim();
};

const handleAiError = (error: any) => {
  console.error("Erro na Chamada Gemini API:", error);
  const message = error.message || "Erro desconhecido";
  if (message.includes("429")) throw new Error("Limite de requisições atingido. Aguarde um momento.");
  if (message.includes("API Key") || message.includes("apiKey")) {
    throw new Error("Erro de Autenticação: A chave de API não foi reconhecida pelo Google ou não foi injetada no ambiente.");
  }
  throw new Error(`Falha no processamento: ${message}`);
};

export const searchJurisprudence = async (query: string, scope: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const prompt = `Pesquise jurisprudência recente sobre: "${query}". Escopo: ${scope}. Retorne relatório HTML rico com ementas e tribunais.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
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
      contents: `Com base nesta petição, sugira metadados do CNJ. 
      IMPORTANTÍSSIMO: Para o campo 'filingUrl', use OBRIGATORIAMENTE uma URL desta lista se o tribunal for compatível:\n${COURT_PORTALS_MAP}\n\nCONTEÚDO:\n\n${content}`,
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
    return { competence: "Não identificada", class: "Não identificada", subject: "Não identificado" };
  }
};

export const generateLegalPetition = async (data: PetitionFormData): Promise<string> => {
  try {
    const ai = getAiClient();
    const prompt = `REDIJA UMA PETIÇÃO INICIAL SÊNIOR COMPLETA COM BASE NESTES DADOS: ${JSON.stringify(data)}. Retorne em HTML rico.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { systemInstruction: SHIELD_PROTOCOL, thinkingConfig: { thinkingBudget: 16000 } }
    });
    return cleanAiHtmlResponse(response.text);
  } catch (error) { return handleAiError(error); }
};

export const generateLegalDefense = async (data: PetitionFormData): Promise<string> => {
  try {
    const ai = getAiClient();
    const prompt = `REDIJA UMA CONTESTAÇÃO JURÍDICA SÊNIOR COM BASE NESTES DADOS: ${JSON.stringify(data)}. Retorne em HTML rico.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
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
    const contextPrompt = `CONTEÚDO ATUAL:\n${currentContent}\n\nINSTRUÇÃO: ${userMessage}\n\nResponda APENAS com o código HTML completo.`;
    const response = await chat.sendMessage({ message: contextPrompt });
    return cleanAiHtmlResponse(response.text);
  } catch (error) { return handleAiError(error); }
};

export const interpretCNJMetadata = async (processNumber: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const prompt = `Analise o número do processo CNJ: "${processNumber}". Retorne um relatório em HTML.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] }
    });
    return cleanAiHtmlResponse(response.text);
  } catch (error) { return handleAiError(error); }
};

export const searchCNJTabelasUnificadas = async (query: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const prompt = `Busque na TPU do CNJ por: "${query}". Retorne um relatório técnico em HTML.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] }
    });
    return cleanAiHtmlResponse(response.text);
  } catch (error) { return handleAiError(error); }
};

export const searchDJE = async (name: string, oab: string, tribunal: string, dateRange: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const prompt = `Busque movimentações no DJE para: ${name}, OAB: ${oab}, Tribunal: ${tribunal}, Período: ${dateRange}. Retorne em HTML rico.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
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
          { text: "Analise este documento jurídico. Extraia: area, actionType, jurisdiction, summary, plaintiffs (nome, doc, endereço), defendants (nome, doc, endereço), fatos, pedidos, valor da causa. Retorne em JSON." },
          { inlineData: { mimeType: file.type, data: base64 } }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            area: { type: Type.STRING },
            actionType: { type: Type.STRING },
            jurisdiction: { type: Type.STRING },
            summary: { type: Type.STRING },
            plaintiffs: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, doc: { type: Type.STRING }, address: { type: Type.STRING } } } },
            defendants: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, doc: { type: Type.STRING }, address: { type: Type.STRING } } } },
            facts: { type: Type.STRING },
            requests: { type: Type.ARRAY, items: { type: Type.STRING } },
            value: { type: Type.STRING }
          }
        }
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
          { text: "Transcreva este áudio jurídico detalhadamente." },
          { inlineData: { mimeType, data: base64Data } }
        ]
      }
    });
    return response.text || "";
  } catch (error) { return handleAiError(error); }
};
