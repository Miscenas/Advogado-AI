import { GoogleGenAI, Type } from "@google/genai";
import { PetitionFormData, PetitionFilingMetadata, PetitionParty } from "../types";

// --- CONFIGURAÇÃO MANUAL ---
const FIXED_API_KEY = ""; 

const getEnv = (key: string) => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      const env = (import.meta as any).env;
      const candidates = [key, `VITE_${key}`, 'VITE_GOOGLE_API_KEY', 'VITE_GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GEMINI_API_KEY'];
      for (const candidate of candidates) if (env[candidate]) return env[candidate];
  }
  if (typeof process !== 'undefined' && process.env) {
      const candidates = [key, `VITE_${key}`, 'GOOGLE_API_KEY', 'GEMINI_API_KEY'];
      for (const candidate of candidates) if (process.env[candidate]) return process.env[candidate];
  }
  return undefined;
};

const getStored = (key: string) => typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem(key) : null;

export const hasAiKey = (): boolean => {
    const key = FIXED_API_KEY || getStored('custom_gemini_api_key') || getEnv('API_KEY');
    return !!(key && key.length > 10 && !key.includes('YOUR_API_KEY'));
};

const getAiClient = (): GoogleGenAI | null => {
  const apiKey = FIXED_API_KEY || getStored('custom_gemini_api_key') || getEnv('API_KEY');
  if (!apiKey || apiKey.length < 10 || apiKey.includes('YOUR_API_KEY')) return null;
  return new GoogleGenAI({ apiKey });
};

const runGenAIWithRetry = async (callback: (ai: GoogleGenAI) => Promise<any>, retries = 3): Promise<any> => {
    const ai = getAiClient();
    if (!ai) return null; 

    for (let i = 0; i < retries; i++) {
        try {
            return await callback(ai);
        } catch (error: any) {
            const msg = error.message || JSON.stringify(error);
            const isQuota = msg.includes('429') || msg.includes('Quota') || error.status === 429;
            const isLastAttempt = i === retries - 1;
            
            if (isQuota && !isLastAttempt) {
                const waitTime = (i + 1) * 2000; 
                console.warn(`[Advogado IA] Cota (429). Tentativa ${i + 1}.`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }
            throw error;
        }
    }
};

// --- MOCKS ---
const mockAnalysisResult = (errorMessage?: string) => {
    const summaryMsg = "O sistema não identificou o arquivo automaticamente. Prossiga com o preenchimento manual.";
    const factsMsg = "A leitura automática não foi possível. Por favor, descreva os fatos manualmente.";
    return {
        docType: "Leitura Manual Necessária",
        summary: summaryMsg,
        extractedData: { area: "civel", actionType: "", jurisdiction: "", plaintiffs: [], defendants: [], facts: factsMsg, value: "" }
    };
};

const mockMetadata = (data: PetitionFormData): PetitionFilingMetadata => {
  const jur = (data.jurisdiction || "").toLowerCase();
  let url = "https://www.cnj.jus.br/sistemas/pje-processo-judicial-eletronico/";
  
  if (jur.includes("são paulo") || jur.includes("sp") || jur.includes("tjsp")) url = "https://esaj.tjsp.jus.br/esaj/portal.do?servico=190090";
  else if (jur.includes("rio") || jur.includes("rj") || jur.includes("tjrj")) url = "http://www.tjrj.jus.br/web/guest/servicos/peticionamento-eletronico";
  else if (jur.includes("trf3")) url = "https://pje1g.trf3.jus.br/pje/login.seam";
  else if (jur.includes("trabalhista") || data.area === "trabalhista") url = "https://pje.jt.jus.br/pjekz/login";

  return {
    competence: data.jurisdiction || "Juízo Competente",
    class: data.actionType || "Procedimento Comum",
    subject: data.area === 'criminal' ? 'Direito Penal' : 'Direito Civil',
    filingUrl: url
  };
};

// --- FUNÇÕES PRINCIPAIS ---

export const extractDataFromDocument = async (base64Data: string, mimeType: string): Promise<{
  docType: string;
  summary: string;
  extractedData: Partial<PetitionFormData>;
}> => {
  try {
    const result = await runGenAIWithRetry(async (ai) => {
        const prompt = `Analise o documento jurídico. Retorne JSON: { docType, summary, extractedData: { area, actionType, jurisdiction, plaintiffs: [{name, doc, type}], defendants: [{name, doc, type}], facts, value } }`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ inlineData: { mimeType: mimeType, data: base64Data } }, { text: prompt }] },
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
    });
    return result || mockAnalysisResult();
  } catch (error) { return mockAnalysisResult(); }
};

export const transcribeAudio = async (base64Data: string, mimeType: string): Promise<string> => {
  try {
    const text = await runGenAIWithRetry(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ inlineData: { mimeType: mimeType, data: base64Data } }, { text: "Transcreva o áudio para português." }] }
        });
        return response.text;
    });
    return text || "Erro na transcrição.";
  } catch (error) { return "Erro na transcrição."; }
};

export const searchJurisprudence = async (query: string, scope: string): Promise<string> => {
  try {
    const html = await runGenAIWithRetry(async (ai) => {
        const prompt = `Pesquisa jurídica sobre: "${query}". HTML com Tribunal, Processo, Ementa.`;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text;
    });
    return (html || "Sem resultados.").replace(/```html/g, '').replace(/```/g, '');
  } catch (error) { return "Erro na busca."; }
};

export const generateLegalPetition = async (data: PetitionFormData): Promise<string> => {
  try {
    const content = await runGenAIWithRetry(async (ai) => {
        const prompt = `ATUE COMO ADVOGADO SÊNIOR. Redija uma ${data.actionType} completa em HTML (Endereçamento, Qualificação, Fatos, Direito, Pedidos). DADOS: Jurisdição=${data.jurisdiction}, Fatos=${data.facts}, Pedidos=${data.requests.join(';')}.`;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text;
    });
    return (content || "").replace(/```html/g, '').replace(/```/g, '');
  } catch (error) { return "Erro ao gerar petição."; }
};

export const generateLegalDefense = async (data: PetitionFormData): Promise<string> => {
    try {
        const content = await runGenAIWithRetry(async (ai) => {
            const prompt = `ATUE COMO ADVOGADO DE DEFESA. Redija CONTESTAÇÃO em HTML para: ${data.facts}.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            return response.text;
        });
        return (content || "").replace(/```html/g, '').replace(/```/g, '');
    } catch (e) { return "Erro ao gerar defesa."; }
};

/**
 * FUNÇÃO ATUALIZADA: Sugere metadados e o LINK DO TRIBUNAL
 */
export const suggestFilingMetadata = async (data: PetitionFormData): Promise<PetitionFilingMetadata> => {
  try {
      const result = await runGenAIWithRetry(async (ai) => {
          const prompt = `
            Com base na ação "${data.actionType}" e na jurisdição "${data.jurisdiction}", 
            identifique qual o Tribunal competente e o link oficial do portal de peticionamento eletrônico (PJe, e-SAJ, e-Proc, etc).
            
            Retorne um JSON rigoroso:
            { 
              "competence": "Nome da Vara/Tribunal sugerido",
              "class": "Classe Processual CNJ",
              "subject": "Assunto Principal CNJ",
              "filingUrl": "https://... (link direto do login do portal)"
            }
          `;
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
              config: { responseMimeType: "application/json" }
          });
          return JSON.parse(response.text || "{}");
      });
      return result || mockMetadata(data);
  } catch (e) { return mockMetadata(data); }
};

export const refineLegalPetition = async (currentContent: string, instructions: string): Promise<string> => {
    try {
        const content = await runGenAIWithRetry(async (ai) => {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Editor Jurídico. Alterar: "${instructions}" no HTML: ${currentContent}.`
            });
            return response.text;
        });
        return (content || currentContent).replace(/```html/g, '').replace(/```/g, '');
    } catch (e) { return currentContent; }
};