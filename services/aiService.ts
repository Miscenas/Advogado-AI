
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
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'undefined' || apiKey.length < 10) {
    throw new Error("ERRO_CHAVE_API: Chave API_KEY não encontrada ou inválida.");
  }
  return new GoogleGenAI({ apiKey });
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const extractRawStringsFromBinary = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  let rawText = "";
  for (let i = 0; i < uint8.length; i++) {
    const charCode = uint8[i];
    if ((charCode >= 32 && charCode <= 126) || (charCode >= 160 && charCode <= 255) || charCode === 10 || charCode === 13) {
      rawText += String.fromCharCode(charCode);
    } else {
      rawText += " ";
    }
  }
  return rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ').replace(/\s{2,}/g, ' ').trim();
};

const cleanAiHtmlResponse = (text: string): string => {
  if (!text) return "";
  return text.replace(/^[ \t]*[`']{3}(?:html|)\s*/i, '').replace(/\s*[`']{3}[ \t]*$/i, '').trim();
};

const handleAiError = (error: any) => {
  console.error("Erro na Chamada Gemini API:", error);
  let message = error.message || "";
  if (message.includes("429")) throw new Error("Limite de requisições atingido. Aguarde 60 segundos.");
  if (message.includes("safety")) throw new Error("Conteúdo bloqueado pelos filtros de segurança.");
  throw new Error("Falha na comunicação com a IA.");
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
    return cleanAiHtmlResponse(response.text || "");
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
            filingUrl: { type: Type.STRING, description: "URL literal da lista oficial de portais fornecida no prompt." },
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
    return cleanAiHtmlResponse(response.text || "");
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
    return cleanAiHtmlResponse(response.text || "");
  } catch (error) { return handleAiError(error); }
};

export const chatRefinePetition = async (currentContent: string, userMessage: string, history: any[]): Promise<string> => {
  try {
    const ai = getAiClient();
    const chat = ai.chats.create({ model: 'gemini-3-flash-preview', config: { systemInstruction: SHIELD_PROTOCOL } });
    const contextPrompt = `CONTEÚDO ATUAL:\n${currentContent}\n\nINSTRUÇÃO: ${userMessage}\n\nResponda APENAS com o código HTML completo.`;
    const response = await chat.sendMessage({ message: contextPrompt });
    return cleanAiHtmlResponse(response.text || currentContent);
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
    return cleanAiHtmlResponse(response.text || "");
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
    return cleanAiHtmlResponse(response.text || "");
  } catch (error) { return handleAiError(error); }
};

export const searchDJE = async (name: string, oab: string, tribunal: string, dateRange: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const prompt = `Busque movimentações no DJE para: ${name}, OAB: ${oab}, Tribunal: ${tribunal}, Período: ${dateRange}. Retorne em HTML.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] }
    });
    return cleanAiHtmlResponse(response.text || "");
  } catch (error) { return handleAiError(error); }
};

export const transcribeAudio = async (base64Data: string, mimeType: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      contents: { parts: [{ inlineData: { mimeType, data: base64Data } }, { text: "Transcreva detalhadamente." }] }
    });
    return response.text || "";
  } catch (error) { return handleAiError(error); }
};

export const extractDataFromDocument = async (file: File): Promise<any> => {
  try {
    const ai = getAiClient();
    const mimeType = file.type;
    const supportedNativeTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
    let contentPart: any;
    if (supportedNativeTypes.includes(mimeType)) {
      const base64Data = await fileToBase64(file);
      contentPart = { inlineData: { mimeType, data: base64Data } };
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const arrayBuffer = await file.arrayBuffer();
      const result = await (window as any).mammoth.extractRawText({ arrayBuffer });
      contentPart = { text: result.value };
    } else if (mimeType === 'text/plain') {
      contentPart = { text: await file.text() };
    } else {
      contentPart = { text: await extractRawStringsFromBinary(file) };
    }
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [contentPart, { text: "Extraia dados do documento em JSON: plaintiffs (array de nomes), defendants (array de nomes), actionType, facts (resumo), area." }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            plaintiffs: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING } } } },
            defendants: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING } } } },
            actionType: { type: Type.STRING },
            facts: { type: Type.STRING },
            area: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) { return handleAiError(error); }
};
