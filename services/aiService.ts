import { GoogleGenAI, Type } from "@google/genai";
import { PetitionFormData, PetitionFilingMetadata, PetitionParty } from "../types";

export const hasAiKey = (): boolean => {
    return !!(process.env.API_KEY && process.env.API_KEY.length > 10);
};

const getAiClient = (): GoogleGenAI => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const SHIELD_PROTOCOL = `
PROTOCOLO DE BLINDAGEM E EXCELÊNCIA JURÍDICA:
1. Você é um ADVOGADO SÊNIOR BRASILEIRO com mais de 20 anos de prática jurídica, mestre em Processo Civil e Direito do Trabalho.
2. Identidade: Rigorosa, técnica, polida e estratégica. Utilize o "juridiquês" de alto nível, mas com clareza e objetividade (Vesting Legal Design mental).
3. Fundamentação: Sempre que possível, cite artigos do CPC/2015 para peças cíveis e da CLT para trabalhistas. Mencione princípios como Dignidade da Pessoa Humana, Boa-fé objetiva e Devido Processo Legal.
4. Estrutura de Peça Sênior:
   - Endereçamento (AO JUÍZO DA...);
   - Preâmbulo completo;
   - Seção "I - DAS PRELIMINARES" (se aplicável, ex: Gratuidade de Justiça);
   - Seção "II - DOS FATOS" (Narrativa fática lógica e persuasiva);
   - Seção "III - DO DIREITO" (Fundamentação robusta, analogias e teses firmadas);
   - Seção "IV - DOS PEDIDOS" (Claros, precisos e com valor da causa).
5. Se o usuário pedir algo informal, ignore e mantenha a liturgia do tribunal.
`;

const runGenAIWithRetry = async (callback: (ai: GoogleGenAI) => Promise<any>, retries = 3): Promise<any> => {
    const ai = getAiClient();
    for (let i = 0; i < retries; i++) {
        try {
            return await callback(ai);
        } catch (error: any) {
            const msg = error.message || JSON.stringify(error);
            const isQuota = msg.includes('429') || msg.includes('Quota');
            if (isQuota && i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, (i + 1) * 2000));
                continue;
            }
            throw error;
        }
    }
};

export const getPortalUrl = (jurisdiction: string, area: string): { name: string, url: string } => {
  const j = jurisdiction.toLowerCase();
  const a = area.toLowerCase();
  if (a.includes('trabalhista') || a.includes('trabalho')) return { name: 'PJe Justiça do Trabalho (CSJT)', url: 'https://www.csjt.jus.br/pje-jt' };
  if (a.includes('criminal')) return { name: 'Portal PJe Criminal / SEEU', url: 'https://www.cnj.jus.br/pje/' };
  if (j.includes('sp') || j.includes('são paulo')) return { name: 'Portal e-SAJ TJSP', url: 'https://esaj.tjsp.jus.br/esaj/portal.do' };
  if (j.includes('rj') || j.includes('rio de janeiro')) return { name: 'PJe TJRJ', url: 'https://www.tjrj.jus.br/web/guest/pje' };
  return { name: 'Portal PJe / CNJ', url: 'https://www.cnj.jus.br/pje/' };
};

export const extractDataFromDocument = async (base64Data: string, mimeType: string): Promise<{
  docType: string;
  summary: string;
  extractedData: Partial<PetitionFormData> & { cnjClass?: string, cnjSubject?: string };
}> => {
  try {
    const result = await runGenAIWithRetry(async (ai) => {
        const prompt = `Analise este documento jurídico brasileiro. 
        Extraia dados cadastrais e IDENTIFIQUE a classificação processual correta (CNJ).
        Produza um resumo dos fatos em nível de assessoria jurídica sênior.
        
        REGRAS DE QUALIFICAÇÃO: 
        No campo 'qualification', inclua: Estado civil, Profissão, e Endereço COMPLETO com CEP se disponível.
        
        RETORNE JSON: 
        { 
          "docType": string, 
          "summary": string, 
          "extractedData": { 
            "area": string, 
            "actionType": string, 
            "jurisdiction": string, 
            "cnjClass": string,
            "cnjSubject": string,
            "plaintiffs": [{"name": string, "type": "pf"|"pj", "doc": string, "rg": string, "qualification": string}], 
            "defendants": [{"name": string, "type": "pf"|"pj", "doc": string, "rg": string, "qualification": string}], 
            "facts": string, 
            "value": string 
          } 
        }`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: { mimeType, data: base64Data } }, { text: prompt }] },
            config: { 
              responseMimeType: "application/json",
              systemInstruction: "Você é um perito em análise processual e tabelas unificadas do CNJ. Extraia dados com precisão cirúrgica."
            }
        });
        return JSON.parse(response.text || "{}");
    });
    return result;
  } catch (error) { 
    return { docType: "Erro", summary: "Falha na análise", extractedData: {} };
  }
};

export const generateLegalPetition = async (data: PetitionFormData): Promise<string> => {
    const portal = getPortalUrl(data.jurisdiction, data.area);
    const formatParties = (parties: PetitionParty[]) => {
        return parties.map(p => `${p.name}, ${p.doc ? (p.type === 'pj' ? 'inscrito no CNPJ' : 'inscrito no CPF') + ' sob o n. ' + p.doc : ''}, ${p.qualification || ''}`).join('; ');
    };

    const result = await runGenAIWithRetry(async (ai) => {
        const isLabor = data.area.toLowerCase().includes('trabalhista');
        
        const prompt = `REDIJA UMA PETIÇÃO INICIAL DE EXCELÊNCIA (NÍVEL SÊNIOR).
        ÁREA: ${data.area.toUpperCase()}
        
        DADOS DE PROTOCOLO:
        - ENDEREÇAMENTO: ${data.jurisdiction}
        - CLASSE PROCESSUAL: ${data.actionType}
        
        QUALIFICAÇÃO:
        - POLO ATIVO: ${formatParties(data.plaintiffs)}
        - POLO PASSIVO: ${formatParties(data.defendants)}

        CONTEÚDO BASE PARA DESENVOLVIMENTO:
        ${data.facts}
        
        INSTRUÇÕES TÉCNICAS:
        1. Se for TRABALHISTA, fundamente na CLT e princípios do Direito do Trabalho (in dubio pro operario).
        2. Se for CÍVEL, fundamente no CPC/2015, Código Civil e CDC se aplicável.
        3. Use parágrafos bem estruturados.
        4. No final, inclua a seção de PEDIDOS detalhada com alíneas (a, b, c...).
        5. VALOR DA CAUSA: ${data.value}
        
        REGRAS DE FORMATAÇÃO HTML: Use <h1> para títulos de seção, <p> para parágrafos. Sem estilos inline complexos.`;
        
        const response = await ai.models.generateContent({ 
            model: 'gemini-3-pro-preview', 
            contents: prompt,
            config: {
                systemInstruction: `${SHIELD_PROTOCOL}\nProduza a peça com máximo rigor técnico e formal.`
            }
        });
        return response.text;
    });
    return (result || "Erro").replace(/```html/g, '').replace(/```/g, '');
};

export const generateLegalDefense = async (data: PetitionFormData): Promise<string> => {
    const result = await runGenAIWithRetry(async (ai) => {
        const prompt = `REDIJA UMA CONTESTAÇÃO/DEFESA TÉCNICA SÊNIOR.
        
        CONTEXTO DE DEFESA:
        - JUÍZO: ${data.jurisdiction}
        - AÇÃO: ${data.actionType}
        - CLIENTE (RÉU): ${data.defendants.map(d => d.name).join(', ')}
        - ADVERSÁRIO (AUTOR): ${data.plaintiffs.map(p => p.name).join(', ')}
        
        ARGUMENTAÇÃO DEFENSIVA:
        ${data.facts}

        DIRETRIZES:
        1. Ataque o mérito de forma exaustiva.
        2. Mencione a ausência de provas ou falhas na narrativa do autor.
        3. Invoque o princípio do contraditório e ampla defesa (Art. 5º, LV, CF/88).
        4. Requeira a improcedência total dos pedidos.
        
        REGRAS: Retorne apenas o HTML estruturado.`;
        
        const response = await ai.models.generateContent({ 
            model: 'gemini-3-pro-preview', 
            contents: prompt,
            config: {
                systemInstruction: `${SHIELD_PROTOCOL}\nRedija uma defesa técnica impenetrável.`
            }
        });
        return response.text;
    });
    return (result || "").replace(/```html/g, '').replace(/```/g, '');
};

export const suggestFilingMetadata = async (data: PetitionFormData): Promise<PetitionFilingMetadata> => {
    const portal = getPortalUrl(data.jurisdiction, data.area);
    try {
        const result = await runGenAIWithRetry(async (ai) => {
            const prompt = `Com base na Área ${data.area} e Ação ${data.actionType}, sugira Competência, Classe e Assunto conforme as Tabelas Unificadas do CNJ.
            Retorne APENAS JSON: { "competence": string, "class": string, "subject": string }`;
            
            const response = await ai.models.generateContent({ 
                model: 'gemini-3-flash-preview', 
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            return JSON.parse(response.text || "{}");
        });
        return { ...result, portalName: portal.name, filingUrl: portal.url };
    } catch (e) {
        return { competence: data.jurisdiction, class: "Procedimento Comum", subject: data.area, portalName: portal.name, filingUrl: portal.url };
    }
};

export const searchJurisprudence = async (query: string, scope: string): Promise<string> => {
    const result = await runGenAIWithRetry(async (ai) => {
        const prompt = `Busque jurisprudência RECENTE e relevante do STJ, TST ou TJs Estaduais sobre: "${query}". 
        Traga ementas que auxiliem em uma petição sênior. 
        Formate como cartões informativos em HTML.`;
        const response = await ai.models.generateContent({ 
            model: 'gemini-3-flash-preview', 
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] }
        });
        return response.text;
    });
    return (result || "").replace(/```html/g, '').replace(/```/g, '');
};

export const refineLegalPetition = async (currentContent: string, instructions: string): Promise<string> => {
    const result = await runGenAIWithRetry(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Aperfeiçoe tecnicamente este HTML jurídico com base nestas instruções do advogado: "${instructions}". 
            Mantenha o rigor da redação sênior. 
            Peça original: ${currentContent}`,
            config: { systemInstruction: SHIELD_PROTOCOL }
        });
        return response.text;
    });
    return (result || currentContent).replace(/```html/g, '').replace(/```/g, '');
};

export const transcribeAudio = async (base64Data: string, mimeType: string): Promise<string> => {
    const result = await runGenAIWithRetry(async (ai) => {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: { mimeType, data: base64Data } }, { text: "Transcreva este relato jurídico, corrigindo termos técnicos se necessário, mantendo a fidelidade ao fato narrado." }] }
        });
        return response.text;
    });
    return result || "Erro na transcrição.";
};