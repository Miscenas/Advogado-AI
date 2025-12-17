import { GoogleGenAI, Type } from "@google/genai";
import { PetitionFormData, PetitionFilingMetadata, PetitionParty } from "../types";

// --- CONFIGURAÇÃO MANUAL (MÉTODO INFALÍVEL) ---
// Se a configuração via menu não funcionar, cole sua chave entre as aspas abaixo:
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

// --- HELPER DE RETRY (MITIGAÇÃO DA API GRATUITA) ---
const runGenAIWithRetry = async (callback: (ai: GoogleGenAI) => Promise<any>, retries = 3): Promise<any> => {
    const ai = getAiClient();
    if (!ai) return null; // Sem chave, falha imediatamente para mock

    for (let i = 0; i < retries; i++) {
        try {
            return await callback(ai);
        } catch (error: any) {
            // Verifica erro de Cota (429) ou erro genérico de rede que vale a pena tentar de novo
            const msg = error.message || JSON.stringify(error);
            const isQuota = msg.includes('429') || msg.includes('Quota') || error.status === 429;
            const isLastAttempt = i === retries - 1;
            
            if (isQuota && !isLastAttempt) {
                const waitTime = (i + 1) * 2000; // 2s, 4s, 6s...
                console.warn(`[Advogado IA] Cota atingida (429). Tentativa ${i + 1}/${retries}. Aguardando ${waitTime}ms...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }
            throw error; // Se não for cota ou for a última tentativa, lança erro
        }
    }
};

// --- MOCKS ---
const mockAnalysisResult = (errorMessage?: string) => {
    const summaryMsg = "O sistema não identificou o arquivo como uma petição ou documento legível. Prossiga com o preenchimento manual.";
    const factsMsg = "A leitura automática não foi possível para este arquivo.\n\nIsso ocorre quando:\n1. O documento não é uma peça jurídica padrão (ex: é uma foto, planta, recibo).\n2. O texto está ilegível ou manuscrito.\n3. O sistema de análise está momentaneamente indisponível.\n\n➡️ Por favor, descreva os fatos do caso neste campo manualmente.";

    return {
        docType: "Leitura Manual Necessária",
        summary: summaryMsg,
        extractedData: {
            area: "civel", actionType: "", jurisdiction: "", plaintiffs: [], defendants: [], facts: factsMsg, value: ""
        }
    };
};

const mockTranscription = "Transcrição indisponível no momento. Por favor, digite o conteúdo do áudio.";

const mockGeneration = (data: PetitionFormData, showWarning = false) => {
  const warning = showWarning ? 
    `<div style="background:#fff7ed; border:1px solid #ffedd5; color:#9a3412; padding:15px; margin-bottom:20px; border-radius:8px; text-align:center; font-size: 0.9em;">
        <strong>Nota:</strong> O sistema de IA está temporariamente indisponível. Esta é uma minuta modelo baseada nos dados inseridos. Recomendamos revisão manual atenta.
    </div>` : '';
  const isCriminal = data.area === 'criminal';
  if (isCriminal) {
      return `${warning}<h3 style="text-align:center;">EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA VARA CRIMINAL DA COMARCA DE ${data.jurisdiction?.toUpperCase() || '...'}</h3><br><br><p><b>${data.plaintiffs[0]?.name || 'NOME'}</b>, qualificado, vem respeitosamente...</p><h3 style="text-align:center;">I - DOS FATOS</h3><p>${data.facts || 'Narrativa dos fatos.'}</p><br><h3 style="text-align:center;">II - DOS PEDIDOS</h3><p>Ante o exposto, requer a procedência.</p><br><p style="text-align:center;">${data.jurisdiction}, ${new Date().toLocaleDateString()}.</p>`;
  }
  return `${warning}<h3 style="text-align:center;">EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA VARA CÍVEL DA COMARCA DE ${data.jurisdiction?.toUpperCase() || '...'}</h3><br><br><p><b>${data.plaintiffs[0]?.name || 'AUTOR'}</b>, vem propor a presente AÇÃO em face de <b>${data.defendants[0]?.name || 'RÉU'}</b>.</p><h3 style="text-align:center;">I - DOS FATOS</h3><p>${data.facts || 'Narrativa.'}</p><br><h3 style="text-align:center;">II - DOS PEDIDOS</h3><p>Requer a procedência total.</p><br><p style="text-align:center;">${data.jurisdiction}, ${new Date().toLocaleDateString()}.</p>`;
};

const mockMetadata = (data: PetitionFormData): PetitionFilingMetadata => {
  return {
    competence: data.jurisdiction || (data.area === 'criminal' ? 'Juízo Criminal' : 'Juízo Cível'),
    class: data.actionType || 'Procedimento Comum',
    subject: data.area === 'criminal' ? 'Direito Penal' : 'Direito Civil'
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
        const prompt = `Analise o documento jurídico. Se não for peça jurídica, docType="Inválido". JSON: { docType, summary, extractedData: { area, actionType, jurisdiction, plaintiffs: [{name, doc, type}], defendants: [{name, doc, type}], facts, value } }`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ inlineData: { mimeType: mimeType, data: base64Data } }, { text: prompt }] },
            config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { docType: {type:Type.STRING}, summary: {type:Type.STRING}, extractedData: { type: Type.OBJECT, properties: { area: {type:Type.STRING}, actionType: {type:Type.STRING}, jurisdiction: {type:Type.STRING}, plaintiffs: {type:Type.ARRAY, items: {type:Type.OBJECT, properties: {name:{type:Type.STRING},doc:{type:Type.STRING},type:{type:Type.STRING}}}}, defendants: {type:Type.ARRAY, items: {type:Type.OBJECT, properties: {name:{type:Type.STRING},doc:{type:Type.STRING},type:{type:Type.STRING}}}}, facts: {type:Type.STRING}, value: {type:Type.STRING} } } } } }
        });
        return JSON.parse(response.text || "{}");
    });

    if (!result || result.docType === 'Inválido' || !result.extractedData || (result.extractedData?.facts?.length || 0) < 5) {
        return mockAnalysisResult("Documento não reconhecido.");
    }
    return result;
  } catch (error) { return mockAnalysisResult(); }
};

export const transcribeAudio = async (base64Data: string, mimeType: string): Promise<string> => {
  try {
    const text = await runGenAIWithRetry(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ inlineData: { mimeType: mimeType, data: base64Data } }, { text: "Transcreva o áudio anexo para texto corrido em português." }] }
        });
        return response.text;
    });
    return text || mockTranscription;
  } catch (error) { return mockTranscription; }
};

export const searchJurisprudence = async (query: string, scope: string): Promise<string> => {
  try {
    const html = await runGenAIWithRetry(async (ai) => {
        const prompt = `ATUE COMO UM PESQUISADOR JURÍDICO. Busque jurisprudência sobre: "${query}". Escopo: ${scope}. Retorne 3 julgados em HTML (div class='juris-card'), com Tribunal, Processo, Relator, Data, Ementa.`;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { temperature: 0.4 } });
        return response.text;
    });
    return (html || "Sem resultados.").replace(/```html/g, '').replace(/```/g, '');
  } catch (error) { return `<p class="text-red-500">Erro na busca. Tente novamente.</p>`; }
};

export const generateLegalPetition = async (data: PetitionFormData): Promise<string> => {
  try {
    const content = await runGenAIWithRetry(async (ai) => {
        const isCriminal = data.area === 'criminal';
        const prompt = `
          ATUE COMO UM ADVOGADO SÊNIOR. Redija uma ${data.actionType?.toUpperCase() || 'PETIÇÃO'} completa em HTML.
          DADOS: Área=${data.area}, Foro=${data.jurisdiction}, Autor=${data.plaintiffs.map(p=>p.name).join(',')}, Réu=${data.defendants.map(d=>d.name).join(',')}, Fatos=${data.facts}, Pedidos=${data.requests.join(';')}.
          ESTRUTURA: Endereçamento, Qualificação, Fatos, Direito (Legislação/Jurisprudência), Pedidos, Fechamento.
          Sem tags <html> externas.
        `;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text;
    });
    if (!content) throw new Error("Empty generation");
    return content.replace(/```html/g, '').replace(/```/g, '');
  } catch (error) { return mockGeneration(data, true); }
};

export const generateLegalDefense = async (data: PetitionFormData): Promise<string> => {
    try {
        const content = await runGenAIWithRetry(async (ai) => {
            const prompt = `ATUE COMO ADVOGADO DE DEFESA. Redija CONTESTAÇÃO em HTML. Caso: ${data.facts}. Pedidos: ${data.requests.join(';')}. Estrutura: Preliminares, Mérito, Pedidos.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            return response.text;
        });
        if (!content) throw new Error("Empty");
        return content.replace(/```html/g, '').replace(/```/g, '');
    } catch (e) { return mockGeneration(data, true); }
};

export const suggestFilingMetadata = async (data: PetitionFormData): Promise<PetitionFilingMetadata> => {
  try {
      const json = await runGenAIWithRetry(async (ai) => {
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: `Classifique para protocolo CNJ: Ação="${data.actionType}", Área="${data.area}". JSON: { competence, class, subject }`,
              config: { responseMimeType: "application/json" }
          });
          return JSON.parse(response.text || "{}");
      });
      return json || mockMetadata(data);
  } catch (e) { return mockMetadata(data); }
};

export const refineLegalPetition = async (currentContent: string, instructions: string): Promise<string> => {
    try {
        const content = await runGenAIWithRetry(async (ai) => {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Editor Jurídico. Aplique alteração: "${instructions}" no HTML: ${currentContent}. Retorne apenas HTML.`
            });
            return response.text;
        });
        return (content || currentContent).replace(/```html/g, '').replace(/```/g, '');
    } catch (e) { return currentContent; }
};